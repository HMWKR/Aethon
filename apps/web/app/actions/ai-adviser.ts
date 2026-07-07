"use server";

import {
  buildNimAdviserRequest,
  parseNimAdviserResponse,
  requestNimAdviserCompletion,
  type NimAdviserInput,
  type NimUsage
} from "@aethon/ai";

// 씬 어드바이스 결과 — 파싱된 JSON(실패 시 raw 텍스트 폴백) + 토큰 사용량.
export interface SceneAdvice {
  parsed: unknown | null;
  rawText: string;
  usage: NimUsage | null;
}

export type SceneAdviceResult =
  | { ok: true; advice: SceneAdvice }
  | { ok: false; error: string };

export async function requestSceneAdvice(input: unknown): Promise<SceneAdviceResult> {
  let adviserInput: NimAdviserInput;
  try {
    adviserInput = parseSceneAdviceInput(input);
  } catch (error) {
    // 입력 검증 오류는 필드 경로만 담고 있어 그대로 노출해도 안전하다.
    return { ok: false, error: toValidationMessage(error) };
  }

  let apiKey: string;
  try {
    apiKey = getRequiredEnv("NVIDIA_NIM_API_KEY");
  } catch {
    // 키 이름·값을 클라이언트로 흘리지 않는다.
    return { ok: false, error: "AI 어드바이저 자격 증명이 설정되지 않았습니다." };
  }

  try {
    const request = buildNimAdviserRequest(adviserInput);
    const completion = await requestNimAdviserCompletion({ apiKey, request });
    const parsed = parseNimAdviserResponse(completion.content);
    return {
      ok: true,
      advice: {
        parsed: parsed.data,
        rawText: parsed.rawText,
        usage: completion.usage
      }
    };
  } catch (error) {
    // 프로바이더 응답 본문에 키 흔적·과다 정보가 있을 수 있어 마스킹한다.
    // 상세 원인은 서버 로그로만 남긴다.
    console.error("[ai-adviser] 씬 어드바이스 호출 실패:", error);
    return { ok: false, error: "AI 어드바이저 호출에 실패했습니다." };
  }
}

function parseSceneAdviceInput(input: unknown): NimAdviserInput {
  const record = requireRecord(input, "input");
  return {
    sceneTitle: requireString(record.sceneTitle, "input.sceneTitle"),
    sceneDescription: requireString(record.sceneDescription, "input.sceneDescription"),
    durationSeconds: optionalNonNegativeNumber(record.durationSeconds, "input.durationSeconds"),
    emotion: optionalString(record.emotion, "input.emotion"),
    cameraAngle: optionalString(record.cameraAngle, "input.cameraAngle"),
    shotType: optionalString(record.shotType, "input.shotType")
  };
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${path}.`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid ${path}.`);
  }
  return value;
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return requireString(value, path);
}

function optionalNonNegativeNumber(value: unknown, path: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${path}.`);
  }
  return value;
}

// getRequiredEnv 패턴(app/lib/supabase/server.ts)을 따르되, 그 함수는 모듈 로컬이라
// 공유 유틸이 아니므로 동일 규약으로 복제한다.
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for the AI adviser.`);
  }
  return value;
}

function toValidationMessage(error: unknown): string {
  return error instanceof Error ? error.message : "입력이 올바르지 않습니다.";
}
