// 영상 생성 provider 어댑터 공용 계약.
// AETHON은 여러 영상 모델(Runway/Kling/Veo/… + SiliconFlow Wan)을 동일한
// submit → poll → fetchResult 3-스텝 인터페이스로 다룬다.
// 모든 어댑터는 apiKey를 주입식으로 받아 packages/ai의 플랫폼 독립성을 지킨다
// (process.env 직접 참조 금지 — 키 주입은 호출자(be-orchestrator)가 담당).

// 영상 생성 요청 — 씬 카드에서 뽑아내는 provider 중립 입력.
export interface VideoGenerationRequest {
  // 영상 프롬프트 (영어 권장).
  prompt: string;
  // 목표 길이(초). provider가 가변 길이를 지원할 때만 사용. 미지원 provider는 무시할 수 있다.
  durationSeconds?: number;
  // 화면비 ("16:9" | "9:16" | "1:1" 등). provider별 해상도 프리셋으로 매핑된다.
  aspectRatio?: string;
  // I2V(image-to-video)용 시작 이미지. 없으면 T2V(text-to-video)로 간주한다.
  imageUrl?: string;
  // provider 모델 식별자 (예: "Wan-AI/Wan2.2-T2V-A14B").
  model: string;
}

// poll이 반환하는 정규화된 작업 상태.
export type VideoJobState = "queued" | "running" | "succeeded" | "failed";

export interface VideoJobStatus {
  state: VideoJobState;
  // 0~1 진행률. provider가 제공하지 않으면 생략한다.
  progress?: number;
  // 실패 사유. state === "failed"일 때만 채워진다.
  error?: string;
}

// 영상 provider 어댑터 계약. submit → poll(반복) → fetchResult 순으로 호출한다.
export interface VideoProviderAdapter {
  // 생성 작업을 제출하고 폴링용 jobId를 반환한다.
  submit(request: VideoGenerationRequest): Promise<{ jobId: string }>;
  // 작업 상태를 조회한다.
  poll(jobId: string): Promise<VideoJobStatus>;
  // 완료된 작업의 결과 자산 URL(+ 가능하면 실제 비용)을 반환한다.
  fetchResult(jobId: string): Promise<{ assetUrl: string; actualCostUsd?: number }>;
}
