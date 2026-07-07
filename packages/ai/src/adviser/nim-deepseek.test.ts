import { describe, expect, it } from "vitest";
import {
  buildNimAdviserRequest,
  parseNimAdviserResponse,
  requestNimAdviserCompletion
} from "./nim-deepseek";

describe("buildNimAdviserRequest", () => {
  it("uses the DeepSeek model id and disables thinking at the top level", () => {
    const request = buildNimAdviserRequest({
      sceneTitle: "새벽 항구",
      sceneDescription: "안개 낀 항구를 걷는 인물"
    });

    expect(request.model).toBe("deepseek-ai/deepseek-v4-pro");
    expect(request.chat_template_kwargs).toEqual({ thinking: false });
    expect(request.messages[0].role).toBe("system");
    expect(request.messages[1].role).toBe("user");
    expect(request.messages[1].content).toContain("새벽 항구");
  });

  it("does not include an extra_body field (raw HTTP 400 guard)", () => {
    const request = buildNimAdviserRequest({ sceneTitle: "a", sceneDescription: "b" });
    expect("extra_body" in request).toBe(false);
  });

  it("falls back to the default max_tokens for invalid values", () => {
    const request = buildNimAdviserRequest({
      sceneTitle: "a",
      sceneDescription: "b",
      maxTokens: -5
    });
    expect(request.max_tokens).toBe(1024);
  });

  it("includes optional scene fields in the user message when present", () => {
    const request = buildNimAdviserRequest({
      sceneTitle: "a",
      sceneDescription: "b",
      durationSeconds: 6,
      emotion: "tense",
      cameraAngle: "low-angle"
    });
    const userMessage = request.messages[1].content;
    expect(userMessage).toContain("길이(초): 6");
    expect(userMessage).toContain("tense");
    expect(userMessage).toContain("low-angle");
  });
});

describe("parseNimAdviserResponse", () => {
  it("parses plain JSON", () => {
    const result = parseNimAdviserResponse('{"sceneComposition":"ok"}');
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ sceneComposition: "ok" });
  });

  it("strips a json code fence before parsing", () => {
    const result = parseNimAdviserResponse('```json\n{"a":1}\n```');
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ a: 1 });
  });

  it("falls back to raw text for non-JSON content", () => {
    const result = parseNimAdviserResponse("죄송하지만 JSON 형식이 아닙니다.");
    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
    expect(result.rawText).toContain("죄송");
  });
});

describe("requestNimAdviserCompletion", () => {
  it("posts to the NIM endpoint with a bearer token and maps usage", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"sceneComposition":"ok"}' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const request = buildNimAdviserRequest({ sceneTitle: "a", sceneDescription: "b" });
    const result = await requestNimAdviserCompletion({
      apiKey: "test-key",
      request,
      fetchImpl: fakeFetch
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("integrate.api.nvidia.com");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    expect(result.content).toContain("sceneComposition");
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 20, totalTokens: 30 });
  });

  it("throws with the status code and body excerpt on a non-200 response", async () => {
    const fakeFetch = (async () =>
      new Response("bad request detail", {
        status: 400,
        statusText: "Bad Request"
      })) as unknown as typeof fetch;

    const request = buildNimAdviserRequest({ sceneTitle: "a", sceneDescription: "b" });
    await expect(
      requestNimAdviserCompletion({ apiKey: "k", request, fetchImpl: fakeFetch })
    ).rejects.toThrow(/400/);
  });
});
