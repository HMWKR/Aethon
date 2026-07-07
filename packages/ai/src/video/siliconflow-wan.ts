// SiliconFlow Wan2.2 영상 생성 어댑터.
// 제출(/v1/video/submit) → 상태 폴링(/v1/video/status) 2단계 비동기 API를
// VideoProviderAdapter 계약으로 감싼다. 순수 함수(페이로드 빌드/상태 매핑)와
// fetch 호출(부작용)을 분리해 테스트 가능성을 유지한다(adviser/nim-deepseek.ts 컨벤션).
//
// 공식 문서(2026-07-06 확인):
//   submit: https://docs.siliconflow.com/en/api-reference/videos/videos_submit
//   status: https://docs.siliconflow.com/en/api-reference/videos/get_videos_status

import type {
  VideoGenerationRequest,
  VideoJobStatus,
  VideoProviderAdapter
} from "./types";

const SUBMIT_ENDPOINT = "https://api.siliconflow.com/v1/video/submit";
const STATUS_ENDPOINT = "https://api.siliconflow.com/v1/video/status";

// Wan2.2 모델 id (공식 문서 확인). 호출자가 T2V/I2V 중 하나를 request.model로 전달한다.
export const SILICONFLOW_WAN_T2V_MODEL = "Wan-AI/Wan2.2-T2V-A14B";
export const SILICONFLOW_WAN_I2V_MODEL = "Wan-AI/Wan2.2-I2V-A14B";

// 화면비 → SiliconFlow image_size 프리셋. 문서상 허용값: 1280x720 / 720x1280 / 960x960.
const IMAGE_SIZE_BY_ASPECT: Record<string, string> = {
  "16:9": "1280x720",
  "9:16": "720x1280",
  "1:1": "960x960"
};
const DEFAULT_IMAGE_SIZE = "1280x720";

// Wan2.2 T2V/I2V 정액 단가 (siliconflow.com/pricing, 2026-07 확인).
// status API는 실제 비용을 응답하지 않으므로 fetchResult가 이 정액값을 반환한다.
const WAN_FLAT_COST_USD = 0.29;

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_ERROR_BODY_CHARS = 500;

// /v1/video/submit 제출 페이로드 (문서 스키마). T2V는 image 없음, I2V는 image 필수.
export interface SiliconFlowSubmitPayload {
  model: string;
  prompt: string;
  image_size: string;
  image?: string;
}

// /v1/video/submit 응답. requestId가 이후 폴링 키가 된다.
interface SiliconFlowSubmitResponse {
  requestId?: string;
}

// /v1/video/status 응답 (문서 스키마).
interface SiliconFlowStatusResponse {
  status?: string;
  reason?: string;
  results?: {
    videos?: Array<{ url?: string }>;
  };
}

// 제출 페이로드를 조립한다(순수 함수).
export function buildSiliconFlowSubmitPayload(
  request: VideoGenerationRequest
): SiliconFlowSubmitPayload {
  const payload: SiliconFlowSubmitPayload = {
    model: request.model,
    prompt: request.prompt,
    image_size: resolveImageSize(request.aspectRatio)
  };
  // imageUrl이 있으면 I2V로 간주해 image 필드를 채운다.
  // 문서는 base64 data URI("data:image/png;base64,XXX")를 예시로 든다. 공개 URL 허용
  // 여부는 실 호출로 검증하지 못해 값을 그대로 전달한다.
  // TODO: 공식 문서 재확인 필요 — 공개 URL 대신 base64 인코딩이 필요할 수 있다 [미확인]
  if (request.imageUrl) {
    payload.image = request.imageUrl;
  }
  return payload;
}

// SiliconFlow status 문자열 → 정규화 상태(순수 함수).
// 문서상 상태 enum: Succeed | InQueue | InProgress | Failed.
export function mapSiliconFlowStatus(response: SiliconFlowStatusResponse): VideoJobStatus {
  switch (response.status) {
    case "Succeed":
      return { state: "succeeded" };
    case "InProgress":
      return { state: "running" };
    case "InQueue":
      return { state: "queued" };
    case "Failed":
      return { state: "failed", error: response.reason ?? "SiliconFlow reported Failed" };
    default:
      // 문서 enum 밖의 값은 계약 위반으로 보고 폴링 무한 루프를 막기 위해 실패 처리한다.
      return { state: "failed", error: `Unexpected SiliconFlow status: ${response.status ?? "missing"}` };
  }
}

// SiliconFlow Wan2.2 어댑터 인스턴스를 만든다. apiKey/fetchImpl은 주입식.
export function createSiliconFlowWanAdapter(params: {
  apiKey: string;
  fetchImpl?: typeof fetch;
}): VideoProviderAdapter {
  const { apiKey, fetchImpl = fetch } = params;

  async function submit(request: VideoGenerationRequest): Promise<{ jobId: string }> {
    const payload = buildSiliconFlowSubmitPayload(request);
    const body = (await postJson(SUBMIT_ENDPOINT, payload, apiKey, fetchImpl)) as SiliconFlowSubmitResponse;
    if (!body.requestId) {
      throw new Error("SiliconFlow submit response missing requestId.");
    }
    return { jobId: body.requestId };
  }

  async function poll(jobId: string): Promise<VideoJobStatus> {
    return mapSiliconFlowStatus(await requestStatus(jobId));
  }

  async function fetchResult(jobId: string): Promise<{ assetUrl: string; actualCostUsd?: number }> {
    const body = await requestStatus(jobId);
    const assetUrl = body.results?.videos?.[0]?.url;
    if (!assetUrl) {
      throw new Error(
        `SiliconFlow result not ready or missing video url (status: ${body.status ?? "unknown"}).`
      );
    }
    return { assetUrl, actualCostUsd: WAN_FLAT_COST_USD };
  }

  function requestStatus(jobId: string): Promise<SiliconFlowStatusResponse> {
    return postJson(STATUS_ENDPOINT, { requestId: jobId }, apiKey, fetchImpl) as Promise<SiliconFlowStatusResponse>;
  }

  return { submit, poll, fetchResult };
}

// POST + JSON + Bearer + 타임아웃 + 비-200 에러(상태코드/본문 발췌) 공통 처리(부작용).
async function postJson(
  url: string,
  payload: unknown,
  apiKey: string,
  fetchImpl: typeof fetch
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`SiliconFlow request to ${url} timed out after ${REQUEST_TIMEOUT_MS}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const bodyExcerpt = (await safeReadText(response)).slice(0, MAX_ERROR_BODY_CHARS);
    throw new Error(
      `SiliconFlow request to ${url} failed: ${response.status} ${response.statusText} — ${bodyExcerpt}`
    );
  }

  return response.json();
}

function resolveImageSize(aspectRatio: string | undefined): string {
  if (aspectRatio && aspectRatio in IMAGE_SIZE_BY_ASPECT) {
    return IMAGE_SIZE_BY_ASPECT[aspectRatio];
  }
  return DEFAULT_IMAGE_SIZE;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
