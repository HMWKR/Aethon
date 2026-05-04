import type { AiSuggestion, SceneDecision } from "./ai-control";
import {
  createLocalC2paAttachment,
  createRenderArtifactProof,
  type ExportManifest,
  type SceneSpec,
  type ValidationReport
} from "./production-readiness";
import { hydrateWorkspaceSourceDurations, type EditingWorkspace, type SourceMediaMetadata } from "./video-editing";

export const INITIAL_SCENES: SceneDecision[] = [
  {
    id: "scene-01",
    title: "골목 입구",
    durationSeconds: 6,
    status: "adviser-review",
    aiMode: "adviser",
    modelRecommendation: {
      primary: "Seedance",
      alternatives: ["Kling", "Runway"],
      reason: "외부 레퍼런스 2장과 짧은 카메라 이동이 있어 멀티 레퍼런스 강점이 중요합니다.",
      estimatedCostUsd: 0.42,
      risk: "의상 색이 이전 컷보다 밝아질 수 있습니다."
    },
    consistencyScore: 82
  },
  {
    id: "scene-02",
    title: "손을 뻗는 동작",
    durationSeconds: 5,
    status: "needs-choice",
    aiMode: "adviser",
    modelRecommendation: {
      primary: "Kling",
      alternatives: ["Veo", "Seedance"],
      reason: "첫 프레임과 마지막 프레임을 분리해 만들면 팔 동작이 더 자연스럽습니다.",
      estimatedCostUsd: 0.58,
      risk: "프롬프트 한 줄 생성만 쓰면 손가락 변형 가능성이 높습니다."
    },
    consistencyScore: 74
  },
  {
    id: "scene-03",
    title: "감정 클로즈업",
    durationSeconds: 4,
    status: "approved",
    aiMode: "off",
    modelRecommendation: {
      primary: "Manual edit",
      alternatives: ["Runway", "Pika"],
      reason: "사용자가 직접 편집 잠금을 걸었습니다. AI 제안은 비활성화됩니다.",
      estimatedCostUsd: 0,
      risk: "수동 컷이므로 export 전 품질 검사만 수행합니다."
    },
    consistencyScore: 91
  }
];

export const INITIAL_SUGGESTIONS: AiSuggestion[] = [
  {
    id: "suggestion-scene-01-model",
    sceneId: "scene-01",
    taskId: "model-selection",
    title: "Scene 01은 Seedance를 1순위 후보로 유지하세요.",
    summary:
      "짧은 컷이고 반복 생성 가능성이 높아 비용과 속도를 우선합니다. 캐릭터 얼굴이 중요한 클로즈업은 아니므로 Runway보다 Seedance가 낫습니다.",
    recommendedOptionId: "seedance-fast",
    decision: "pending",
    options: [
      {
        id: "seedance-fast",
        label: "Seedance fast pass",
        provider: "ByteDance",
        model: "Seedance",
        estimatedCostUsd: 0.42,
        qualityScore: 78,
        reason: "저비용/고속 초안에 적합합니다.",
        tradeoffs: ["시네마틱 질감은 Runway보다 약합니다.", "일관성 점수는 별도 검사해야 합니다."]
      },
      {
        id: "kling-detail",
        label: "Kling detail pass",
        provider: "Kuaishou",
        model: "Kling",
        estimatedCostUsd: 0.74,
        qualityScore: 84,
        reason: "배경 디테일과 긴 모션 안정성이 더 좋습니다.",
        tradeoffs: ["비용이 증가합니다.", "인물 움직임이 어색할 수 있습니다."]
      }
    ],
    riskFlags: [
      {
        id: "scene-01-color-drift",
        category: "consistency",
        severity: "medium",
        label: "의상 색 드리프트",
        detail: "고정 팔레트가 약하면 이전 컷보다 밝아질 수 있습니다."
      }
    ]
  },
  {
    id: "suggestion-scene-02-keyframe",
    sceneId: "scene-02",
    taskId: "partial-revision",
    title: "Scene 02는 2-keyframe 방식이 안전합니다.",
    summary:
      "손을 웅크린 시작 이미지와 손을 뻗은 끝 이미지를 분리하면 프롬프트 한 줄 생성보다 형태 붕괴 가능성이 줄어듭니다.",
    recommendedOptionId: "two-keyframe",
    decision: "pending",
    options: [
      {
        id: "two-keyframe",
        label: "시작/끝 이미지 2장 생성 후 영상화",
        provider: "Kling",
        model: "Kling image-to-video",
        estimatedCostUsd: 0.74,
        qualityScore: 88,
        reason: "손 동작의 시작/끝 자세를 명시해 형태 붕괴를 줄입니다.",
        tradeoffs: ["예상 비용이 $0.16 증가합니다.", "이미지 2장 검수 단계가 추가됩니다."]
      },
      {
        id: "single-prompt",
        label: "프롬프트 한 줄로 바로 생성",
        provider: "Kling",
        model: "Kling text-to-video",
        estimatedCostUsd: 0.58,
        qualityScore: 70,
        reason: "빠르지만 손가락 형태가 흐려질 가능성이 높습니다.",
        tradeoffs: ["재생성 가능성이 큽니다.", "동작 시작점이 불명확할 수 있습니다."]
      }
    ],
    riskFlags: [
      {
        id: "scene-02-hand-risk",
        category: "quality",
        severity: "high",
        label: "손 형태 붕괴",
        detail: "손가락이 겹치거나 개수가 어긋날 수 있습니다.",
        blocksAuto: true
      },
      {
        id: "scene-02-extra-cost",
        category: "cost",
        severity: "medium",
        label: "추가 비용",
        detail: "2-keyframe 전략은 이미지 후보 2장을 먼저 생성합니다."
      }
    ]
  },
  {
    id: "suggestion-scene-03-export",
    sceneId: "scene-03",
    taskId: "export-qc",
    title: "Scene 03은 수동 편집 잠금 상태이므로 export QC만 수행하세요.",
    summary:
      "사용자가 Off를 선택한 컷입니다. 생성/부분수정 제안은 숨기고, 최종 export 전 누락/무음/권리 manifest만 검사합니다.",
    recommendedOptionId: "local-qc",
    decision: "pending",
    options: [
      {
        id: "local-qc",
        label: "로컬 QC만 실행",
        provider: "local",
        model: "AETHON export checker",
        estimatedCostUsd: 0,
        qualityScore: 92,
        reason: "Off 의도를 존중하면서도 최종 산출물 결함은 확인합니다.",
        tradeoffs: ["생성 품질 개선 제안은 표시하지 않습니다."]
      }
    ],
    riskFlags: [
      {
        id: "scene-03-manual-risk",
        category: "quality",
        severity: "low",
        label: "수동 컷",
        detail: "AI 생성 이력 없이 사용자가 직접 편집한 컷입니다."
      }
    ]
  }
];

export const INITIAL_MEDIA_SOURCES: SourceMediaMetadata[] = [
  {
    id: "source-alley-entrance-render",
    label: "alley entrance render",
    sourceType: "generated-video",
    durationSeconds: 8,
    metadataSource: "provider-result",
    storageUri: "aethon://generated/scene-01/alley-entrance.mp4",
    tags: ["generated", "noir", "scene-01"],
    thumbnailLabel: "S01"
  },
  {
    id: "source-arm-extension-pass",
    label: "arm extension pass",
    sourceType: "generated-video",
    durationSeconds: 8,
    metadataSource: "provider-result",
    storageUri: "aethon://generated/scene-02/arm-extension.mp4",
    tags: ["generated", "qc-review", "scene-02"],
    thumbnailLabel: "S02"
  },
  {
    id: "source-manual-close-up",
    label: "manual close-up",
    sourceType: "uploaded-video",
    durationSeconds: 8,
    metadataSource: "file-probe",
    storageUri: "aethon://uploads/manual-close-up.mov",
    tags: ["uploaded", "close-up", "reference"],
    thumbnailLabel: "CU"
  },
  {
    id: "source-rain-room-tone",
    label: "rain room tone",
    sourceType: "uploaded-audio",
    durationSeconds: 14,
    metadataSource: "file-probe",
    storageUri: "aethon://uploads/rain-room-tone.wav",
    tags: ["uploaded", "audio", "ambience"],
    thumbnailLabel: "AUD"
  },
  {
    id: "source-breath-hit",
    label: "breath hit",
    sourceType: "uploaded-audio",
    durationSeconds: 8,
    metadataSource: "file-probe",
    storageUri: "aethon://uploads/breath-hit.wav",
    tags: ["uploaded", "audio", "foley"],
    thumbnailLabel: "FX"
  }
];

const INITIAL_WORKSPACE_DRAFT: EditingWorkspace = {
  activeTool: "select",
  playheadSeconds: 6.2,
  scrollSeconds: 0,
  zoom: 1,
  exportProfile: {
    id: "yt-1080p",
    label: "H.264 1080p Master",
    format: "mp4",
    width: 1920,
    height: 1080,
    fps: 24,
    videoBitrateMbps: 16,
    audioBitrateKbps: 320
  },
  tracks: [
    {
      id: "v3",
      type: "ai",
      label: "AI Pins",
      locked: false,
      muted: false,
      heightPx: 42
    },
    {
      id: "v2",
      type: "image",
      label: "Keyframes",
      locked: false,
      muted: false,
      heightPx: 54
    },
    {
      id: "v1",
      type: "video",
      label: "Video 1",
      locked: false,
      muted: false,
      heightPx: 66
    },
    {
      id: "a1",
      type: "audio",
      label: "Dialog / SFX",
      locked: false,
      muted: false,
      heightPx: 50
    }
  ],
  clips: [
    {
      id: "clip-ai-01",
      trackId: "v3",
      sceneId: "scene-02",
      sourceType: "text",
      label: "hand shape review pin",
      startSeconds: 6,
      durationSeconds: 2.5,
      inPointSeconds: 0,
      status: "needs-review",
      color: "#f0b35a",
      linkedClipIds: ["clip-video-02"]
    },
    {
      id: "clip-key-01",
      trackId: "v2",
      sceneId: "scene-02",
      sourceType: "generated-image",
      label: "start / end keyframes",
      startSeconds: 5.6,
      durationSeconds: 5,
      inPointSeconds: 0,
      status: "ready",
      color: "#71c7ec",
      linkedClipIds: ["clip-video-02"]
    },
    {
      id: "clip-video-01",
      trackId: "v1",
      sceneId: "scene-01",
      sourceAssetId: "source-alley-entrance-render",
      sourceType: "generated-video",
      label: "alley entrance",
      startSeconds: 0,
      durationSeconds: 5.6,
      inPointSeconds: 0,
      status: "rendered",
      color: "#5d8df5",
      linkedClipIds: ["clip-audio-01"]
    },
    {
      id: "clip-video-02",
      trackId: "v1",
      sceneId: "scene-02",
      sourceAssetId: "source-arm-extension-pass",
      sourceType: "generated-video",
      label: "arm extension pass",
      startSeconds: 5.6,
      durationSeconds: 5,
      inPointSeconds: 0,
      status: "needs-review",
      color: "#6fcf97",
      linkedClipIds: ["clip-key-01", "clip-ai-01", "clip-audio-01"]
    },
    {
      id: "clip-video-03",
      trackId: "v1",
      sceneId: "scene-03",
      sourceAssetId: "source-manual-close-up",
      sourceType: "uploaded-video",
      label: "manual close-up",
      startSeconds: 10.6,
      durationSeconds: 4,
      inPointSeconds: 0,
      status: "ready",
      color: "#b692f6",
      linkedClipIds: ["clip-audio-02"]
    },
    {
      id: "clip-audio-01",
      trackId: "a1",
      sceneId: "scene-01",
      sourceAssetId: "source-rain-room-tone",
      sourceType: "uploaded-audio",
      label: "rain room tone",
      startSeconds: 0,
      durationSeconds: 10.6,
      inPointSeconds: 0,
      status: "ready",
      color: "#95d5b2",
      linkedClipIds: ["clip-video-01", "clip-video-02"]
    },
    {
      id: "clip-audio-02",
      trackId: "a1",
      sceneId: "scene-03",
      sourceAssetId: "source-breath-hit",
      sourceType: "uploaded-audio",
      label: "breath hit",
      startSeconds: 10.6,
      durationSeconds: 4,
      inPointSeconds: 0,
      status: "draft",
      color: "#ffd166",
      linkedClipIds: ["clip-video-03"]
    }
  ],
  effects: [
    {
      id: "effect-contrast-01",
      clipId: "clip-video-02",
      label: "AI consistency guard",
      enabled: true,
      parameters: {
        characterLock: 86,
        backgroundLock: 91,
        styleDriftTolerance: 12
      }
    },
    {
      id: "effect-grade-01",
      clipId: "clip-video-01",
      label: "Noir blue grade",
      enabled: true,
      parameters: {
        exposure: -0.2,
        contrast: 12,
        saturation: -6
      }
    }
  ]
};

export const INITIAL_WORKSPACE: EditingWorkspace = hydrateWorkspaceSourceDurations(
  INITIAL_WORKSPACE_DRAFT,
  INITIAL_MEDIA_SOURCES
);

export const INITIAL_SCENE_SPECS: SceneSpec[] = [
  {
    id: "spec-scene-01",
    sceneId: "scene-01",
    userIntent: "Establish the alley world, keep the character silhouette readable, and avoid identity drift.",
    requestedBy: "editor-demo",
    decisionId: "suggestion-scene-01-model",
    approvalPolicy: {
      requiresEditorApproval: true,
      maxApprovedCostUsd: 0.5,
      externalProviderAllowed: true
    },
    cameraAngle: "wide",
    emotion: "tense",
    shotType: "establishing",
    budgetPriority: "balanced",
    isHighlight: false,
    targetAspectRatio: "16:9",
    providerInputMode: "image-to-video",
    imagePrompt: "Rain-soaked narrow alley, noir blue palette, consistent character silhouette.",
    videoPrompt: "Slow push-in through rain, subtle coat movement, no face morphing.",
    imageModel: "FLUX",
    videoModel: "Seedance",
    selectionMode: "ai-advised",
    sourceAssetIds: ["asset-character-mina", "asset-location-rain-alley"],
    referenceAssetIds: ["asset-character-mina", "asset-location-rain-alley", "asset-look-noir-blue"],
    constraints: {
      rights: ["Use generated character reference only"],
      safety: ["No real-person likeness claim"],
      continuity: ["Preserve silhouette", "Preserve noir blue palette"]
    },
    continuityLocks: {
      character: 86,
      background: 91,
      style: 88
    },
    createdAtIso: "2026-05-03T06:00:00.000Z",
    updatedAtIso: "2026-05-03T06:20:00.000Z"
  },
  {
    id: "spec-scene-02",
    sceneId: "scene-02",
    userIntent: "Show the arm extension clearly by approving two keyframes before any video generation.",
    requestedBy: "editor-demo",
    decisionId: "suggestion-scene-02-keyframe",
    approvalPolicy: {
      requiresEditorApproval: true,
      maxApprovedCostUsd: 0.8,
      externalProviderAllowed: true
    },
    cameraAngle: "medium",
    emotion: "urgent",
    shotType: "action",
    budgetPriority: "quality-first",
    isHighlight: true,
    targetAspectRatio: "16:9",
    providerInputMode: "first-last-frame",
    imagePrompt: "Same character, start pose with curled hand, end pose with arm fully extended.",
    videoPrompt: "Interpolate from start keyframe to end keyframe, preserve hand count and sleeve shape.",
    imageModel: "FLUX",
    videoModel: "Kling image-to-video",
    selectionMode: "ai-advised",
    sourceAssetIds: ["asset-character-mina", "asset-hand-pose-a", "asset-hand-pose-b"],
    referenceAssetIds: ["asset-character-mina", "asset-hand-pose-a", "asset-hand-pose-b"],
    constraints: {
      rights: ["Generated keyframes must remain project-owned"],
      safety: ["Avoid real celebrity likeness"],
      continuity: ["Keep hand count correct", "Preserve sleeve shape"]
    },
    continuityLocks: {
      character: 84,
      background: 87,
      style: 82
    },
    createdAtIso: "2026-05-03T06:00:00.000Z",
    updatedAtIso: "2026-05-03T06:25:00.000Z"
  },
  {
    id: "spec-scene-03",
    sceneId: "scene-03",
    userIntent: "Respect the editor's manual cut and run only final local QC before export.",
    requestedBy: "editor-demo",
    decisionId: "suggestion-scene-03-export",
    approvalPolicy: {
      requiresEditorApproval: false,
      maxApprovedCostUsd: 0,
      externalProviderAllowed: false
    },
    cameraAngle: "close-up",
    emotion: "quiet",
    shotType: "manual-cut",
    budgetPriority: "lowest-cost",
    isHighlight: false,
    targetAspectRatio: "16:9",
    providerInputMode: "local-qc",
    imagePrompt: "Manual footage, no image generation requested.",
    videoPrompt: "Manual cut, no video generation requested.",
    imageModel: "Manual edit",
    videoModel: "AETHON export checker",
    selectionMode: "locked",
    manualOverrideReason: "User intentionally turned generation off for this close-up.",
    sourceAssetIds: ["asset-manual-closeup"],
    referenceAssetIds: ["asset-manual-closeup"],
    constraints: {
      rights: ["Uploaded source needs editor confirmation"],
      safety: ["No model generation"],
      continuity: ["Keep manual cut unchanged"]
    },
    continuityLocks: {
      character: 92,
      background: 78,
      style: 90
    },
    createdAtIso: "2026-05-03T06:00:00.000Z",
    updatedAtIso: "2026-05-03T06:30:00.000Z"
  }
];

export const INITIAL_VALIDATION_REPORTS: ValidationReport[] = [
  {
    id: "validation-scene-01",
    sceneId: "scene-01",
    runId: "run-scene-01",
    generatedAtIso: "2026-05-03T06:20:00.000Z",
    checks: [
      {
        id: "scene-01-black-frame",
        label: "Black frame",
        status: "pass",
        severity: "blocking",
        detail: "No black frames detected in the rendered section.",
        metricValue: 0,
        threshold: 0,
        reviewer: "system",
        screenshotFrame: 0
      },
      {
        id: "scene-01-style-drift",
        label: "Style drift",
        status: "warn",
        severity: "warning",
        detail: "The blue grade is slightly brighter than the project look bible.",
        metricValue: "delta 12",
        threshold: "delta 10",
        reviewer: "qa-agent",
        screenshotFrame: 48
      }
    ]
  },
  {
    id: "validation-scene-02",
    sceneId: "scene-02",
    runId: "run-scene-02",
    generatedAtIso: "2026-05-03T06:25:00.000Z",
    checks: [
      {
        id: "scene-02-hand-count",
        label: "Hand anatomy",
        status: "fail",
        severity: "blocking",
        detail: "The motion pass needs editor review before export.",
        metricValue: "6 fingers",
        threshold: "5 fingers",
        blockingReason: "Anatomy mismatch can ship visible artifacts.",
        reviewer: "qa-agent",
        screenshotFrame: 83
      },
      {
        id: "scene-02-identity",
        label: "Identity lock",
        status: "warn",
        severity: "warning",
        detail: "Face similarity is under the target threshold during the final 12 frames.",
        metricValue: 0.78,
        threshold: 0.84,
        reviewer: "qa-agent",
        screenshotFrame: 112
      }
    ]
  }
];

const INITIAL_EXPORT_ASSET_IDS = [
  "source-alley-entrance-render",
  "source-arm-extension-pass",
  "source-manual-close-up",
  "source-rain-room-tone"
];
const INITIAL_EXPORT_MODEL_RUN_IDS = ["run-scene-01-seedance", "run-scene-02-kling"];
const INITIAL_EXPORT_RENDER_ARTIFACT = createRenderArtifactProof({
  manifestId: "export-manifest-01",
  projectId: "project-aethon-demo",
  assetIds: INITIAL_EXPORT_ASSET_IDS,
  modelRunIds: INITIAL_EXPORT_MODEL_RUN_IDS,
  generatedContentLabel: "mixed-source",
  durationSeconds: 15.5,
  frameRate: 24,
  renderedAtIso: "2026-05-03T06:36:00.000Z"
});
const INITIAL_EXPORT_C2PA_ATTACHMENT = createLocalC2paAttachment({
  manifestId: "export-manifest-01",
  renderArtifact: INITIAL_EXPORT_RENDER_ARTIFACT,
  generatedContentLabel: "mixed-source",
  attachedAtIso: "2026-05-03T06:36:00.000Z",
  signedBy: "aethon-local-export-gate"
});

export const INITIAL_EXPORT_MANIFEST: ExportManifest = {
  id: "export-manifest-01",
  projectId: "project-aethon-demo",
  previewRenderStatus: "ready",
  costLedger: [
    {
      id: "cost-scene-01",
      runId: "run-scene-01-seedance",
      sceneId: "scene-01",
      provider: "ByteDance",
      model: "Seedance",
      estimatedUsd: 0.42,
      approvedUsd: 0.5,
      approvedBy: "editor-demo",
      budgetId: "budget-loop-2",
      status: "estimated"
    },
    {
      id: "cost-scene-02",
      runId: "run-scene-02-kling",
      sceneId: "scene-02",
      provider: "Kuaishou",
      model: "Kling image-to-video",
      estimatedUsd: 0.74,
      approvedUsd: 0.8,
      approvedBy: "editor-demo",
      budgetId: "budget-loop-2",
      status: "approved"
    }
  ],
  rights: [
    {
      id: "rights-character-mina",
      assetId: "source-alley-entrance-render",
      sceneId: "scene-01",
      assetLabel: "@Mina character reference",
      source: "generated",
      status: "cleared",
      attributionRequired: false,
      licenseEvidenceAssetId: "evidence-generated-character-mina",
      provenancePayload: {
        generated: true,
        projectOwned: true
      }
    },
    {
      id: "rights-rain-tone",
      assetId: "source-rain-room-tone",
      sceneId: "scene-01",
      assetLabel: "Rain room tone",
      source: "uploaded",
      status: "needs-review",
      attributionRequired: true,
      licenseEvidenceAssetId: "evidence-rain-tone-upload",
      provenancePayload: {
        uploadedByEditor: true,
        commercialUseConfirmed: false
      }
    }
  ],
  assetIds: INITIAL_EXPORT_ASSET_IDS,
  modelRunIds: INITIAL_EXPORT_MODEL_RUN_IDS,
  validationReportIds: ["validation-scene-01", "validation-scene-02"],
  costLedgerEntryIds: ["cost-scene-01", "cost-scene-02"],
  rightsManifestEntryIds: ["rights-character-mina", "rights-rain-tone"],
  generatedContentLabel: "mixed-source",
  provenanceSummary: {
    generatedContentLabel: "mixed-source",
    validationReportIds: ["validation-scene-01", "validation-scene-02"],
    costLedgerEntryIds: ["cost-scene-01", "cost-scene-02"],
    rightsManifestEntryIds: ["rights-character-mina", "rights-rain-tone"],
    rightsEvidenceAssetIds: ["evidence-generated-character-mina", "evidence-rain-tone-upload"],
    renderArtifactId: INITIAL_EXPORT_RENDER_ARTIFACT.id,
    renderArtifactChecksum: INITIAL_EXPORT_RENDER_ARTIFACT.checksum,
    c2paStatus: "attached",
    c2paAttachmentId: INITIAL_EXPORT_C2PA_ATTACHMENT.id,
    exportPolicy: "blocked-until-qc-rights-review"
  },
  renderArtifact: INITIAL_EXPORT_RENDER_ARTIFACT,
  c2paAttachment: INITIAL_EXPORT_C2PA_ATTACHMENT,
  finalDecisionAudit: [
    {
      id: "audit-export-01",
      actorId: "editor-demo",
      decision: "Export remains blocked until Scene 02 QC and rain tone rights are reviewed.",
      createdAtIso: "2026-05-03T06:35:00.000Z"
    }
  ],
  c2paStatus: "attached"
};
