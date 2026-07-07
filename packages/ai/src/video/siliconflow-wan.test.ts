import { describe, expect, it } from "vitest";
import {
  buildSiliconFlowSubmitPayload,
  createSiliconFlowWanAdapter,
  mapSiliconFlowStatus,
  SILICONFLOW_WAN_I2V_MODEL,
  SILICONFLOW_WAN_T2V_MODEL
} from "./siliconflow-wan";

describe("buildSiliconFlowSubmitPayload", () => {
  it("builds a T2V payload without an image field", () => {
    const payload = buildSiliconFlowSubmitPayload({
      prompt: "a foggy harbor at dawn",
      aspectRatio: "16:9",
      model: SILICONFLOW_WAN_T2V_MODEL
    });

    expect(payload.model).toBe("Wan-AI/Wan2.2-T2V-A14B");
    expect(payload.prompt).toBe("a foggy harbor at dawn");
    expect(payload.image_size).toBe("1280x720");
    expect("image" in payload).toBe(false);
  });

  it("adds the image field for I2V when imageUrl is present", () => {
    const payload = buildSiliconFlowSubmitPayload({
      prompt: "animate this",
      aspectRatio: "9:16",
      imageUrl: "data:image/png;base64,AAAA",
      model: SILICONFLOW_WAN_I2V_MODEL
    });

    expect(payload.model).toBe("Wan-AI/Wan2.2-I2V-A14B");
    expect(payload.image_size).toBe("720x1280");
    expect(payload.image).toBe("data:image/png;base64,AAAA");
  });

  it("falls back to the default image_size for unknown or missing aspect ratios", () => {
    expect(
      buildSiliconFlowSubmitPayload({ prompt: "p", model: "m" }).image_size
    ).toBe("1280x720");
    expect(
      buildSiliconFlowSubmitPayload({ prompt: "p", aspectRatio: "21:9", model: "m" }).image_size
    ).toBe("1280x720");
  });

  it("maps the 1:1 aspect ratio to the square preset", () => {
    const payload = buildSiliconFlowSubmitPayload({ prompt: "p", aspectRatio: "1:1", model: "m" });
    expect(payload.image_size).toBe("960x960");
  });
});

describe("mapSiliconFlowStatus", () => {
  it("normalizes the documented status enum", () => {
    expect(mapSiliconFlowStatus({ status: "Succeed" })).toEqual({ state: "succeeded" });
    expect(mapSiliconFlowStatus({ status: "InQueue" })).toEqual({ state: "queued" });
    expect(mapSiliconFlowStatus({ status: "InProgress" })).toEqual({ state: "running" });
  });

  it("carries the reason into the error for a Failed status", () => {
    const result = mapSiliconFlowStatus({ status: "Failed", reason: "content policy" });
    expect(result.state).toBe("failed");
    expect(result.error).toBe("content policy");
  });

  it("treats an unknown status as failed to avoid infinite polling", () => {
    const result = mapSiliconFlowStatus({ status: "Weird" });
    expect(result.state).toBe("failed");
    expect(result.error).toContain("Weird");
  });
});

// jobId 캡처용 fake fetch. submit/status 엔드포인트를 URL로 구분해 응답을 돌려준다.
function makeFakeFetch(handlers: {
  submit?: () => Response;
  status?: () => Response;
}): { fetchImpl: typeof fetch; calls: Array<{ url: string; init: RequestInit }> } {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith("/video/submit") && handlers.submit) {
      return handlers.submit();
    }
    if (url.endsWith("/video/status") && handlers.status) {
      return handlers.status();
    }
    return new Response("unexpected url", { status: 500, statusText: "Server Error" });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

describe("createSiliconFlowWanAdapter.submit", () => {
  it("posts to the submit endpoint with a bearer token and returns requestId as jobId", async () => {
    const { fetchImpl, calls } = makeFakeFetch({
      submit: () => jsonResponse({ requestId: "req-123" })
    });
    const adapter = createSiliconFlowWanAdapter({ apiKey: "test-key", fetchImpl });

    const { jobId } = await adapter.submit({
      prompt: "a foggy harbor",
      model: SILICONFLOW_WAN_T2V_MODEL
    });

    expect(jobId).toBe("req-123");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.siliconflow.com/v1/video/submit");
    expect(calls[0].init.method).toBe("POST");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    expect((calls[0].init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(calls[0].init.body as string)).toMatchObject({
      model: "Wan-AI/Wan2.2-T2V-A14B",
      prompt: "a foggy harbor",
      image_size: "1280x720"
    });
  });

  it("throws when the submit response has no requestId", async () => {
    const { fetchImpl } = makeFakeFetch({ submit: () => jsonResponse({}) });
    const adapter = createSiliconFlowWanAdapter({ apiKey: "k", fetchImpl });

    await expect(adapter.submit({ prompt: "p", model: "m" })).rejects.toThrow(/requestId/);
  });

  it("throws with the status code and body excerpt on a non-200 submit response", async () => {
    const { fetchImpl } = makeFakeFetch({
      submit: () => new Response("bad prompt detail", { status: 400, statusText: "Bad Request" })
    });
    const adapter = createSiliconFlowWanAdapter({ apiKey: "k", fetchImpl });

    await expect(adapter.submit({ prompt: "p", model: "m" })).rejects.toThrow(/400/);
    await expect(adapter.submit({ prompt: "p", model: "m" })).rejects.toThrow(/bad prompt detail/);
  });
});

describe("createSiliconFlowWanAdapter.poll", () => {
  it("posts the requestId to the status endpoint and normalizes the state", async () => {
    const { fetchImpl, calls } = makeFakeFetch({
      status: () => jsonResponse({ status: "InProgress" })
    });
    const adapter = createSiliconFlowWanAdapter({ apiKey: "k", fetchImpl });

    const status = await adapter.poll("req-123");

    expect(status).toEqual({ state: "running" });
    expect(calls[0].url).toBe("https://api.siliconflow.com/v1/video/status");
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ requestId: "req-123" });
  });
});

describe("createSiliconFlowWanAdapter.fetchResult", () => {
  it("returns the first video url and the flat cost when succeeded", async () => {
    const { fetchImpl } = makeFakeFetch({
      status: () =>
        jsonResponse({
          status: "Succeed",
          results: { videos: [{ url: "https://cdn.example/clip.mp4" }] }
        })
    });
    const adapter = createSiliconFlowWanAdapter({ apiKey: "k", fetchImpl });

    const result = await adapter.fetchResult("req-123");

    expect(result.assetUrl).toBe("https://cdn.example/clip.mp4");
    expect(result.actualCostUsd).toBe(0.29);
  });

  it("throws when the result has no video url yet", async () => {
    const { fetchImpl } = makeFakeFetch({
      status: () => jsonResponse({ status: "InProgress" })
    });
    const adapter = createSiliconFlowWanAdapter({ apiKey: "k", fetchImpl });

    await expect(adapter.fetchResult("req-123")).rejects.toThrow(/InProgress/);
  });
});
