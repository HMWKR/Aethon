// NVIDIA NIM 호스티드 DeepSeek V4 Pro를 AETHON "AI 어드바이저" LLM으로 호출한다.
// OpenAI 호환 chat/completions 엔드포인트를 사용하며, 순수 함수(요청 빌드/응답 파싱)와
// fetch 호출(부작용)을 분리해 테스트 가능성을 유지한다.

const NIM_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const NIM_MODEL_ID = "deepseek-ai/deepseek-v4-pro";
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.4;
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_ERROR_BODY_CHARS = 500;

const ADVISER_SYSTEM_PROMPT = [
  "당신은 AETHON 영상 편집 스튜디오의 AI 어드바이저입니다.",
  "사용자가 최종 결정을 내리도록 돕는 조언자이며, 자동 실행자가 아닙니다.",
  "주어진 씬 정보를 바탕으로 다음을 제안하세요:",
  "1. 씬 구성 제안 (구도/연출/연속성 관점)",
  "2. 영상 생성 프롬프트 후보 1~2개 (영어 프롬프트, 각 후보 한 문장 이상)",
  "3. 추천 영상 모델과 근거 (runway/kling/veo3/seedance/grok/luma/pika/hailuo/sora2 중 택1)",
  "4. 리스크 (비용/권리/일관성 관점)",
  "",
  "반드시 아래 JSON 스키마만 반환하세요. 마크다운 코드펜스나 설명 문장 없이 순수 JSON만 출력합니다.",
  "{",
  '  "sceneComposition": string,',
  '  "promptCandidates": string[],',
  '  "recommendedModel": { "model": string, "reason": string },',
  '  "risks": [{ "type": "cost" | "rights" | "consistency", "detail": string }]',
  "}"
].join("\n");

// 씬 어드바이저 입력 — 씬 카드에서 뽑아내는 최소 컨텍스트 필드.
export interface NimAdviserInput {
  sceneTitle: string;
  sceneDescription: string;
  durationSeconds?: number;
  emotion?: string;
  cameraAngle?: string;
  shotType?: string;
  maxTokens?: number;
}

// OpenAI 호환 chat.completions 요청 페이로드.
// 주의: raw HTTP에서는 extra_body 필드가 400을 유발한다. thinking 비활성화는
// 최상위 chat_template_kwargs 로만 전달한다.
export interface NimChatCompletionRequest {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  chat_template_kwargs: { thinking: boolean };
  max_tokens: number;
  temperature: number;
}

export interface NimUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface NimCompletionResult {
  content: string;
  usage: NimUsage | null;
}

export interface NimAdviserParsed {
  ok: boolean;
  data: unknown | null;
  rawText: string;
}

interface NimRawCompletion {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export function buildNimAdviserRequest(input: NimAdviserInput): NimChatCompletionRequest {
  return {
    model: NIM_MODEL_ID,
    messages: [
      { role: "system", content: ADVISER_SYSTEM_PROMPT },
      { role: "user", content: buildSceneContext(input) }
    ],
    chat_template_kwargs: { thinking: false },
    max_tokens: resolveMaxTokens(input.maxTokens),
    temperature: DEFAULT_TEMPERATURE
  };
}

export function parseNimAdviserResponse(raw: string): NimAdviserParsed {
  const cleaned = stripCodeFence(raw);
  try {
    const data = JSON.parse(cleaned);
    return { ok: true, data, rawText: cleaned };
  } catch {
    // 비 JSON 응답은 원본 텍스트를 폴백으로 보존한다.
    return { ok: false, data: null, rawText: raw };
  }
}

export async function requestNimAdviserCompletion(params: {
  apiKey: string;
  request: NimChatCompletionRequest;
  fetchImpl?: typeof fetch;
}): Promise<NimCompletionResult> {
  const { apiKey, request, fetchImpl = fetch } = params;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchImpl(NIM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`NIM adviser request timed out after ${REQUEST_TIMEOUT_MS}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const bodyExcerpt = (await safeReadText(response)).slice(0, MAX_ERROR_BODY_CHARS);
    throw new Error(
      `NIM adviser request failed: ${response.status} ${response.statusText} — ${bodyExcerpt}`
    );
  }

  const payload = (await response.json()) as NimRawCompletion;
  const content = payload.choices?.[0]?.message?.content ?? "";
  const usage = payload.usage
    ? {
        promptTokens: payload.usage.prompt_tokens ?? 0,
        completionTokens: payload.usage.completion_tokens ?? 0,
        totalTokens: payload.usage.total_tokens ?? 0
      }
    : null;

  return { content, usage };
}

function buildSceneContext(input: NimAdviserInput): string {
  const lines = [`씬 제목: ${input.sceneTitle}`, `씬 설명: ${input.sceneDescription}`];
  if (input.durationSeconds !== undefined) {
    lines.push(`길이(초): ${input.durationSeconds}`);
  }
  if (input.emotion) {
    lines.push(`감정: ${input.emotion}`);
  }
  if (input.cameraAngle) {
    lines.push(`카메라 앵글: ${input.cameraAngle}`);
  }
  if (input.shotType) {
    lines.push(`샷 타입: ${input.shotType}`);
  }
  return lines.join("\n");
}

function resolveMaxTokens(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_MAX_TOKENS;
  }
  return Math.floor(value);
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
