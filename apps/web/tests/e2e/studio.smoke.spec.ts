import { Buffer } from "node:buffer";
import type { Locator } from "@playwright/test";
import { expect, test } from "./fixtures";

test.describe("AETHON studio smoke", () => {
  test("loads the editor workspace without console errors", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("AETHON Cut Workspace")).toBeVisible();
    await expect(page.getByText("Project Bin")).toBeVisible();
    await expect(page.getByText("Source Monitor")).toBeVisible();
    await expect(page.getByText("Program Monitor")).toBeVisible();
    await expect(page.getByText("Sequence 01")).toBeVisible();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  });

  test("keeps export blocked while adviser, QC, and rights blockers exist", async ({
    page
  }) => {
    await page.goto("/");
    await page
      .getByTestId("inspector-tabs")
      .getByRole("button", { name: "export", exact: true })
      .click();
    const inspector = page.locator(".inspector-column");

    await expect(inspector.getByText("Export Gate")).toBeVisible();
    await expect(inspector.getByText("Readiness")).toBeVisible();
    await expect(inspector.getByText("blocked", { exact: true })).toBeVisible();
    await expect(
      inspector.getByText("AI adviser decision(s) still need editor review")
    ).toBeVisible();
    await expect(
      inspector.getByText("validation reports contain blocking QC failures")
    ).toBeVisible();
    await expect(inspector.getByText("rights review")).toBeVisible();
    await expect(inspector.getByTestId("export-manifest-evidence")).toContainText(
      "source-alley-entrance-render"
    );
    await expect(inspector.getByTestId("export-manifest-evidence")).toContainText(
      "run-scene-02-kling"
    );
    await expect(inspector.getByTestId("export-manifest-evidence")).toContainText(
      "validation-scene-02"
    );
    await expect(inspector.getByTestId("export-manifest-evidence")).toContainText(
      "Generated label: mixed-source"
    );
    await expect(inspector.getByTestId("export-manifest-evidence")).toContainText(
      "Render artifact: render-export-manifest-01"
    );
    await expect(inspector.getByTestId("export-manifest-evidence")).toContainText(
      "Artifact URI: aethon-render://project-aethon-demo/export-manifest-01.mp4"
    );
    await expect(inspector.getByTestId("export-manifest-evidence")).toContainText(
      "C2PA attachment: attached"
    );
    await expect(inspector.getByTestId("export-manifest-evidence")).toContainText(
      "C2PA verification: verified"
    );
    await expect(inspector.getByTestId("export-manifest-evidence")).toContainText(
      "C2PA policy: local-provider-sim"
    );
    await expect(inspector.getByTestId("export-manifest-evidence")).toContainText(
      "C2PA signature: aethon-local-sha256-attestation-v1"
    );
    await expect(inspector.getByTestId("export-manifest-evidence")).not.toContainText(
      "Render checksum: missing"
    );
    const exportButton = inspector.getByRole("button", { name: "Export master" });
    await expect(exportButton).toBeDisabled();
    await expect(exportButton).toHaveCSS("cursor", "not-allowed");
    await expect(exportButton).toHaveCSS("border-style", "dashed");
    await expect(exportButton).not.toHaveCSS("background-color", "rgb(98, 214, 199)");
  });

  test("keeps source, program, inspector, and playhead in the selected clip context", async ({
    page
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("media-source-source-manual-close-up")).toContainText(
      "manual close-up"
    );
    await expect(page.getByTestId("media-source-source-manual-close-up")).toContainText(
      "file-probe / 00:00:08:00"
    );

    await page.getByTestId("timeline-clip-clip-video-03").click();
    await expect(page.getByTestId("timeline-clip-clip-video-03")).toHaveClass(/selected/);
    await expect(page.getByTestId("source-monitor").getByText("manual close-up")).toBeVisible();
    await expect(page.getByTestId("program-monitor").getByText("manual close-up")).toBeVisible();
    await expect(page.getByTestId("program-monitor").getByText("Playhead 00:00:10:14")).toBeVisible();
    await expect(page.locator(".session-readout").getByText("00:00:10:14")).toBeVisible();

    await page
      .getByTestId("inspector-tabs")
      .getByRole("button", { name: "clip", exact: true })
      .click();
    const inspector = page.getByTestId("inspector-panel");

    await expect(inspector.getByText("Clip Inspector")).toBeVisible();
    await expect(inspector.locator(".panel-title").getByText("manual close-up")).toBeVisible();
    await expect(inspector.getByTestId("clip-source-asset-readout")).toContainText(
      "manual close-up"
    );
    await expect(inspector.getByTestId("clip-source-duration-readout")).toContainText(
      "00:00:08:00"
    );
    await expect(inspector.getByTestId("clip-source-metadata-readout")).toContainText(
      "file-probe"
    );
    await expect(inspector.getByText("감정 클로즈업")).toBeVisible();

    await page.getByTestId("timeline-clip-clip-video-01").focus();
    await page.keyboard.press("Enter");

    await expect(page.getByTestId("timeline-clip-clip-video-01")).toHaveClass(/selected/);
    await expect(page.getByTestId("source-monitor").getByText("alley entrance")).toBeVisible();
    await expect(page.getByTestId("program-monitor").getByText("alley entrance")).toBeVisible();
    await expect(page.getByTestId("program-monitor").getByText("Playhead 00:00:00:00")).toBeVisible();
  });

  test("imports browser-local media metadata and persists project bin sources", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("media-import-input").setInputFiles({
      name: "noir-reference-take.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.from("aethon media fixture")
    });

    const importedTile = page.getByTestId("media-source-imported-noir-reference-take-20");
    await expect(importedTile).toContainText("noir reference take");
    await expect(importedTile).toContainText("file-probe / 00:00:08:00");
    await expect(importedTile).toContainText("imported / video / noir");
    await expect(importedTile).toHaveClass(/active/);
    await expect(page.getByTestId("media-import-readout")).toContainText(
      "1 browser-local import"
    );
    await expect(page.getByTestId("media-filter-readout")).toContainText("6 of 6 sources");
    await page.getByTestId("media-search-input").fill("noir");
    await expect(page.getByTestId("media-filter-readout")).toContainText("2 of 6 sources");
    await expect(importedTile).toBeVisible();
    await page.getByTestId("media-tag-filter").selectOption("imported");
    await expect(page.getByTestId("media-filter-readout")).toContainText("1 of 6 sources");
    await expect(importedTile).toBeVisible();
    await expect(page.getByTestId("media-source-source-alley-entrance-render")).toHaveCount(0);
    await page.getByTestId("media-search-input").fill("");
    await expect(page.getByTestId("media-filter-readout")).toContainText("1 of 6 sources");
    await expect(page.getByTestId("source-monitor").getByText("noir reference take")).toBeVisible();
    await expect(
      page.getByTestId("source-monitor").getByText("uploaded-video / 00:00:08:00")
    ).toBeVisible();
    await expect(page.getByTestId("source-monitor-source-duration")).toContainText(
      "00:00:08:00 / file-probe"
    );

    await page.reload();
    await expect(page.getByTestId("media-import-readout")).toContainText(
      "1 browser-local import"
    );
    await expect(page.getByTestId("media-filter-readout")).toContainText("6 of 6 sources");
    await page.getByTestId("media-source-imported-noir-reference-take-20").click();
    await expect(page.getByTestId("source-monitor").getByText("noir reference take")).toBeVisible();
    await expect(page.getByTestId("source-monitor-source-duration")).toContainText(
      "00:00:08:00 / file-probe"
    );
  });

  test("lets editors change AI modes without weakening approval and export gates", async ({
    page
  }) => {
    const remoteRequests: string[] = [];

    page.on("request", (request) => {
      const url = new URL(request.url());

      if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
        remoteRequests.push(request.url());
      }
    });

    await page.goto("/");
    remoteRequests.length = 0;

    await page.getByTestId("global-mode-off").click();
    await expect(page.getByTestId("global-mode-off")).toHaveClass(/active/);

    await page.getByTestId("task-mode-model-selection-off").click();
    await expect(page.getByTestId("task-mode-model-selection-off")).toHaveClass(/active/);

    await page
      .getByTestId("inspector-tabs")
      .getByRole("button", { name: "export", exact: true })
      .click();
    const inspector = page.getByTestId("inspector-panel");

    await expect(inspector.getByText("blocked", { exact: true })).toBeVisible();
    await expect(inspector.getByRole("button", { name: "Export master" })).toBeDisabled();
    expect(remoteRequests).toEqual([]);
  });

  test("records an explicit adviser decision and carries the remaining blockers into export", async ({
    page
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("ai-inspector").getByText("손을 뻗는 동작").first()).toBeVisible();
    await expect(page.getByTestId("metric-pending").getByText("3")).toBeVisible();
    await expect(page.getByTestId("metric-accepted").getByText("0")).toBeVisible();

    await page.getByTestId("suggestion-approve").click();

    await expect(page.getByTestId("metric-pending").getByText("2")).toBeVisible();
    await expect(page.getByTestId("metric-accepted").getByText("1")).toBeVisible();
    await expect(page.getByTestId("ai-inspector").getByText("No pending AI decision")).toBeVisible();
    await expect(page.getByTestId("ai-inspector").getByText("approved").first()).toBeVisible();

    await page.getByTestId("inspector-tab-export").click();
    const exportInspector = page.getByTestId("export-inspector");

    await expect(exportInspector.getByText("Pending decisions")).toBeVisible();
    await expect(exportInspector.getByText("2", { exact: true })).toBeVisible();
    await expect(
      exportInspector.getByText("AI adviser decision(s) still need editor review")
    ).toBeVisible();
    await expect(page.getByTestId("export-master-button")).toBeDisabled();
  });

  test("keeps export disabled after every AI suggestion has an editor decision", async ({
    page
  }) => {
    await page.goto("/");

    await page.getByTestId("suggestion-approve").click();

    await page.getByTestId("timeline-clip-clip-video-01").click();
    await page.getByTestId("inspector-tab-ai").click();
    await expect(page.getByTestId("ai-inspector").getByText("골목 입구").first()).toBeVisible();
    await page.getByTestId("suggestion-edit-apply").click();

    await page.getByTestId("timeline-clip-clip-video-03").click();
    await page.getByTestId("inspector-tab-ai").click();
    await expect(page.getByTestId("ai-inspector").getByText("감정 클로즈업").first()).toBeVisible();
    await page.getByTestId("suggestion-hold").click();

    await expect(page.getByTestId("metric-pending").getByText("0")).toBeVisible();
    await expect(page.getByTestId("ai-inspector").getByText("No pending AI decision")).toBeVisible();

    await page.getByTestId("inspector-tab-export").click();
    const exportInspector = page.getByTestId("export-inspector");

    await expect(exportInspector.getByText("Pending decisions")).toBeVisible();
    await expect(exportInspector.getByText("0", { exact: true })).toBeVisible();
    await expect(
      exportInspector.getByText("AI adviser decision(s) still need editor review")
    ).toHaveCount(0);
    await expect(exportInspector.getByText("validation reports contain blocking QC failures")).toBeVisible();
    await expect(exportInspector.getByText("rights review")).toBeVisible();
    await expect(exportInspector.getByText("Render artifact: render-export-manifest-01")).toBeVisible();
    await expect(exportInspector.getByText("C2PA attachment: attached")).toBeVisible();
    await expect(page.getByTestId("export-master-button")).toBeDisabled();
  });

  test("surfaces the risky generated clip validation context", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("timeline-clip-clip-video-02").click();
    const clipInspector = page.getByTestId("clip-inspector");

    await expect(page.getByTestId("selection-readout").getByText("arm extension pass")).toBeVisible();
    await expect(clipInspector.getByText("Clip Inspector")).toBeVisible();
    await expect(clipInspector.getByText("generated-video")).toBeVisible();
    await expect(clipInspector.getByText("SceneSpec")).toBeVisible();
    await expect(clipInspector.getByText("Provider capability")).toBeVisible();
    await expect(clipInspector.getByText("Validation reports")).toBeVisible();
    await expect(clipInspector.getByText("blocked")).toBeVisible();
    await expect(clipInspector.getByText("Anatomy mismatch can ship visible artifacts.")).toBeVisible();
  });

  test("moves the active editing tool without changing clip selection", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("timeline-clip-clip-video-02").click();
    await expect(page.getByTestId("selection-readout").getByText("arm extension pass")).toBeVisible();

    await page.getByTestId("tool-blade").click();
    await expect(page.getByTestId("tool-blade")).toHaveClass(/active/);
    await expect(page.getByTestId("tool-select")).not.toHaveClass(/active/);

    await page.getByTestId("tool-pin").click();
    await expect(page.getByTestId("tool-pin")).toHaveClass(/active/);
    await expect(page.getByTestId("selection-readout").getByText("arm extension pass")).toBeVisible();
    await expect(page.getByTestId("timeline-clip-clip-video-02")).toHaveClass(/selected/);
  });

  test("applies timeline split, ripple delete, undo, and redo commands", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("4 tracks / 7 clips")).toBeVisible();
    await page.getByTestId("timeline-clip-clip-video-02").click();

    await page.getByTestId("timeline-split-button").click();
    await expect(page.getByText("4 tracks / 8 clips")).toBeVisible();
    await expect(page.getByTestId("timeline-clip-clip-video-02-split-8100")).toBeVisible();
    await expect(page.getByTestId("timeline-undo-button")).toBeEnabled();
    await expect(page.getByTestId("timeline-redo-button")).toBeDisabled();

    await page.getByTestId("timeline-ripple-delete-button").click();
    await expect(page.getByText("4 tracks / 7 clips")).toBeVisible();
    await expect(page.getByTestId("timeline-clip-clip-video-02")).toHaveCount(0);

    await page.getByTestId("timeline-undo-button").click();
    await expect(page.getByText("4 tracks / 8 clips")).toBeVisible();
    await expect(page.getByTestId("timeline-clip-clip-video-02")).toBeVisible();
    await expect(page.getByTestId("timeline-clip-clip-video-02-split-8100")).toBeVisible();

    await page.getByTestId("timeline-undo-button").click();
    await expect(page.getByText("4 tracks / 7 clips")).toBeVisible();
    await expect(page.getByTestId("timeline-clip-clip-video-02-split-8100")).toHaveCount(0);

    await page.getByTestId("timeline-redo-button").click();
    await expect(page.getByText("4 tracks / 8 clips")).toBeVisible();
    await expect(page.getByTestId("timeline-clip-clip-video-02-split-8100")).toBeVisible();
  });

  test("applies timeline trim, snap, move, linked audio, and keyboard shortcuts", async ({
    page
  }) => {
    await page.goto("/");

    const videoClip = page.getByTestId("timeline-clip-clip-video-03");
    const linkedAudioClip = page.getByTestId("timeline-clip-clip-audio-02");

    await videoClip.click();
    await page.getByTestId("timeline-move-forward-button").click();

    await expect(videoClip).toHaveAttribute("data-start-seconds", "11.60");
    await expect(linkedAudioClip).toHaveAttribute("data-start-seconds", "11.60");
    await expect(videoClip).toHaveAttribute("data-in-point-seconds", "0.00");
    await expect(linkedAudioClip).toHaveAttribute("data-in-point-seconds", "0.00");

    await page.getByTestId("timeline-snap-button").click();
    await expect(videoClip).toHaveAttribute("data-start-seconds", "10.60");
    await expect(linkedAudioClip).toHaveAttribute("data-start-seconds", "10.60");

    await page.getByTestId("timeline-trim-in-button").click();
    await expect(videoClip).toHaveAttribute("data-start-seconds", "11.10");
    await expect(linkedAudioClip).toHaveAttribute("data-start-seconds", "11.10");
    await expect(videoClip).toHaveAttribute("data-duration-seconds", "3.50");
    await expect(linkedAudioClip).toHaveAttribute("data-duration-seconds", "3.50");
    await expect(videoClip).toHaveAttribute("data-in-point-seconds", "0.50");
    await expect(linkedAudioClip).toHaveAttribute("data-in-point-seconds", "0.50");

    await page.getByTestId("timeline-trim-out-button").click();
    await expect(videoClip).toHaveAttribute("data-duration-seconds", "3.00");
    await expect(linkedAudioClip).toHaveAttribute("data-duration-seconds", "3.00");

    await page.keyboard.press("b");
    await expect(page.getByTestId("tool-blade")).toHaveClass(/active/);

    await page.keyboard.press("t");
    await expect(page.getByTestId("tool-trim")).toHaveClass(/active/);

    await page.keyboard.press("Control+ArrowRight");
    await expect(videoClip).toHaveAttribute("data-start-seconds", "12.10");
    await expect(linkedAudioClip).toHaveAttribute("data-start-seconds", "12.10");
  });

  test("applies rolling edit, slip edit, and timeline zoom controls", async ({ page }) => {
    await page.goto("/");

    const previousVideoClip = page.getByTestId("timeline-clip-clip-video-02");
    const videoClip = page.getByTestId("timeline-clip-clip-video-03");
    const roomToneClip = page.getByTestId("timeline-clip-clip-audio-01");
    const linkedAudioClip = page.getByTestId("timeline-clip-clip-audio-02");

    await videoClip.click();
    await page.getByTestId("timeline-roll-forward-button").click();

    await expect(previousVideoClip).toHaveAttribute("data-duration-seconds", "5.50");
    await expect(roomToneClip).toHaveAttribute("data-duration-seconds", "11.10");
    await expect(videoClip).toHaveAttribute("data-start-seconds", "11.10");
    await expect(videoClip).toHaveAttribute("data-duration-seconds", "3.50");
    await expect(videoClip).toHaveAttribute("data-in-point-seconds", "0.50");
    await expect(linkedAudioClip).toHaveAttribute("data-start-seconds", "11.10");
    await expect(linkedAudioClip).toHaveAttribute("data-duration-seconds", "3.50");
    await expect(linkedAudioClip).toHaveAttribute("data-in-point-seconds", "0.50");

    await page.getByTestId("timeline-slip-forward-button").click();
    await expect(videoClip).toHaveAttribute("data-start-seconds", "11.10");
    await expect(videoClip).toHaveAttribute("data-duration-seconds", "3.50");
    await expect(videoClip).toHaveAttribute("data-in-point-seconds", "1.00");
    await expect(linkedAudioClip).toHaveAttribute("data-in-point-seconds", "1.00");

    await page.getByTestId("timeline-zoom-in-button").click();
    await expect(page.getByTestId("timeline-zoom-readout")).toHaveText("Zoom 125%");

    await page.getByTestId("timeline-zoom-out-button").click();
    await expect(page.getByTestId("timeline-zoom-readout")).toHaveText("Zoom 100%");

    await page.keyboard.press("s");
    await expect(page.getByTestId("tool-slip")).toHaveClass(/active/);

    await page.keyboard.press("=");
    await expect(page.getByTestId("timeline-zoom-readout")).toHaveText("Zoom 125%");
    await expect(page.getByTestId("timeline-scroll-readout")).toHaveText(
      "Window 00:00:00:00 - 00:00:11:16"
    );

    const scrollbar = page.getByTestId("timeline-scrollbar");
    const minimapWindow = page.getByTestId("timeline-minimap-window");

    await expect(page.getByTestId("timeline-navigator")).toBeVisible();
    await expect(page.getByTestId("timeline-minimap")).toBeVisible();
    await expect(scrollbar).toBeEnabled();
    await expect(scrollbar).toHaveAttribute("max", "2.92");
    await expect(scrollbar).toHaveValue("0");
    await expect(minimapWindow).toHaveAttribute("style", /left: 0%; width: 80%;/);

    await scrollbar.focus();
    await page.keyboard.press("End");
    await expect(page.getByTestId("timeline-scroll-readout")).toHaveText(
      "Window 00:00:02:22 - 00:00:14:14"
    );
    await expect(scrollbar).toHaveValue("2.92");
    await expect(minimapWindow).toHaveAttribute("style", /left: 20%; width: 80%;/);
    await expect(page.getByTestId("timeline-scroll-right-button")).toBeDisabled();

    await page.getByTestId("timeline-scroll-left-button").click();
    await expect(page.getByTestId("timeline-scroll-readout")).toHaveText(
      "Window 00:00:00:00 - 00:00:11:16"
    );
    await expect(scrollbar).toHaveValue("0");
    await expect(minimapWindow).toHaveAttribute("style", /left: 0%; width: 80%;/);

    await page.keyboard.press("Alt+ArrowRight");
    await expect(videoClip).toHaveAttribute("data-in-point-seconds", "1.50");
    await expect(linkedAudioClip).toHaveAttribute("data-in-point-seconds", "1.50");

    await page.getByTestId("timeline-scroll-right-button").click();
    await expect(page.getByTestId("timeline-scroll-readout")).toHaveText(
      "Window 00:00:02:22 - 00:00:14:14"
    );

    await page.reload();
    await expect(page.getByTestId("timeline-zoom-readout")).toHaveText("Zoom 125%");
    await expect(page.getByTestId("timeline-scroll-readout")).toHaveText(
      "Window 00:00:02:22 - 00:00:14:14"
    );
    await expect(page.getByTestId("timeline-scrollbar")).toHaveValue("2.92");
    await expect(page.getByTestId("timeline-minimap-window")).toHaveAttribute(
      "style",
      /left: 20%; width: 80%;/
    );
  });

  test("applies source and program monitor trim commands with source bounds", async ({
    page
  }) => {
    await page.goto("/");

    const previousVideoClip = page.getByTestId("timeline-clip-clip-video-02");
    const videoClip = page.getByTestId("timeline-clip-clip-video-03");
    const linkedAudioClip = page.getByTestId("timeline-clip-clip-audio-02");

    await videoClip.click();
    await page.getByTestId("source-monitor-slip-button").click();

    await expect(videoClip).toHaveAttribute("data-start-seconds", "10.60");
    await expect(videoClip).toHaveAttribute("data-duration-seconds", "4.00");
    await expect(videoClip).toHaveAttribute("data-in-point-seconds", "0.50");
    await expect(linkedAudioClip).toHaveAttribute("data-in-point-seconds", "0.50");

    await page.getByTestId("program-monitor-roll-button").click();

    await expect(previousVideoClip).toHaveAttribute("data-duration-seconds", "5.50");
    await expect(videoClip).toHaveAttribute("data-start-seconds", "11.10");
    await expect(videoClip).toHaveAttribute("data-duration-seconds", "3.50");
    await expect(videoClip).toHaveAttribute("data-in-point-seconds", "1.00");
    await expect(linkedAudioClip).toHaveAttribute("data-start-seconds", "11.10");
    await expect(linkedAudioClip).toHaveAttribute("data-duration-seconds", "3.50");
    await expect(linkedAudioClip).toHaveAttribute("data-in-point-seconds", "1.00");
  });

  test("moves and resizes timeline clips with pointer gestures", async ({ page }) => {
    await page.goto("/");

    const videoClip = page.getByTestId("timeline-clip-clip-video-03");
    const linkedAudioClip = page.getByTestId("timeline-clip-clip-audio-02");

    await videoClip.click();

    const initialBox = await videoClip.boundingBox();
    expect(initialBox).not.toBeNull();
    const initialDuration = Number(await videoClip.getAttribute("data-duration-seconds"));
    const pxPerSecond = initialBox!.width / initialDuration;

    await page.mouse.move(initialBox!.x + initialBox!.width / 2, initialBox!.y + initialBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      initialBox!.x + initialBox!.width / 2 + pxPerSecond,
      initialBox!.y + initialBox!.height / 2
    );
    await page.mouse.up();

    await expect(videoClip).toHaveAttribute("data-start-seconds", "11.60");
    await expect(linkedAudioClip).toHaveAttribute("data-start-seconds", "11.60");

    const movedBox = await videoClip.boundingBox();
    expect(movedBox).not.toBeNull();
    const movedDuration = Number(await videoClip.getAttribute("data-duration-seconds"));
    const movedPxPerSecond = movedBox!.width / movedDuration;
    const resizeHandle = page.getByTestId("timeline-clip-clip-video-03-resize-end");
    const handleBox = await resizeHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2 - movedPxPerSecond * 0.5,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.up();

    await expect(videoClip).toHaveAttribute("data-duration-seconds", "3.50");
    await expect(linkedAudioClip).toHaveAttribute("data-duration-seconds", "3.50");
  });

  test("trims clip starts with the timeline resize handle", async ({ page }) => {
    await page.goto("/");

    const videoClip = page.getByTestId("timeline-clip-clip-video-03");
    const linkedAudioClip = page.getByTestId("timeline-clip-clip-audio-02");

    await videoClip.click();

    const clipBox = await videoClip.boundingBox();
    expect(clipBox).not.toBeNull();
    const clipDuration = Number(await videoClip.getAttribute("data-duration-seconds"));
    const pxPerSecond = clipBox!.width / clipDuration;
    const resizeHandle = page.getByTestId("timeline-clip-clip-video-03-resize-start");
    const handleBox = await resizeHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2 + pxPerSecond * 0.5,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.up();

    await expect(videoClip).toHaveAttribute("data-start-seconds", "11.10");
    await expect(videoClip).toHaveAttribute("data-duration-seconds", "3.50");
    await expect(videoClip).toHaveAttribute("data-in-point-seconds", "0.50");
    await expect(linkedAudioClip).toHaveAttribute("data-start-seconds", "11.10");
    await expect(linkedAudioClip).toHaveAttribute("data-duration-seconds", "3.50");
    await expect(linkedAudioClip).toHaveAttribute("data-in-point-seconds", "0.50");
  });

  test("rolls timeline boundaries with pointer gestures", async ({ page }) => {
    await page.goto("/");

    const previousVideoClip = page.getByTestId("timeline-clip-clip-video-02");
    const videoClip = page.getByTestId("timeline-clip-clip-video-03");
    const roomToneClip = page.getByTestId("timeline-clip-clip-audio-01");
    const linkedAudioClip = page.getByTestId("timeline-clip-clip-audio-02");

    await videoClip.click();

    const clipBox = await videoClip.boundingBox();
    expect(clipBox).not.toBeNull();
    const clipDuration = Number(await videoClip.getAttribute("data-duration-seconds"));
    const pxPerSecond = clipBox!.width / clipDuration;
    const rollHandle = page.getByTestId("timeline-clip-clip-video-03-roll-start");
    const handleBox = await rollHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2 + pxPerSecond * 0.5,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.up();

    await expect(previousVideoClip).toHaveAttribute("data-duration-seconds", "5.50");
    await expect(roomToneClip).toHaveAttribute("data-duration-seconds", "11.10");
    await expect(videoClip).toHaveAttribute("data-start-seconds", "11.10");
    await expect(videoClip).toHaveAttribute("data-duration-seconds", "3.50");
    await expect(videoClip).toHaveAttribute("data-in-point-seconds", "0.50");
    await expect(linkedAudioClip).toHaveAttribute("data-start-seconds", "11.10");
    await expect(linkedAudioClip).toHaveAttribute("data-duration-seconds", "3.50");
    await expect(linkedAudioClip).toHaveAttribute("data-in-point-seconds", "0.50");
  });

  test("ripple trims timeline clip ends with pointer gestures", async ({ page }) => {
    await page.goto("/");

    const rippleClip = page.getByTestId("timeline-clip-clip-video-02");
    const roomToneClip = page.getByTestId("timeline-clip-clip-audio-01");
    const nextVideoClip = page.getByTestId("timeline-clip-clip-video-03");
    const linkedAudioClip = page.getByTestId("timeline-clip-clip-audio-02");

    await rippleClip.click();

    const clipBox = await rippleClip.boundingBox();
    expect(clipBox).not.toBeNull();
    const clipDuration = Number(await rippleClip.getAttribute("data-duration-seconds"));
    const pxPerSecond = clipBox!.width / clipDuration;
    const rippleHandle = page.getByTestId("timeline-clip-clip-video-02-ripple-end");
    await rippleHandle.scrollIntoViewIfNeeded();
    const handleBox = await rippleHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2 - pxPerSecond * 0.5,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.up();

    await expect(rippleClip).toHaveAttribute("data-duration-seconds", "4.50");
    await expect(roomToneClip).toHaveAttribute("data-duration-seconds", "10.10");
    await expect(nextVideoClip).toHaveAttribute("data-start-seconds", "10.10");
    await expect(nextVideoClip).toHaveAttribute("data-duration-seconds", "4.00");
    await expect(nextVideoClip).toHaveAttribute("data-in-point-seconds", "0.00");
    await expect(linkedAudioClip).toHaveAttribute("data-start-seconds", "10.10");
    await expect(linkedAudioClip).toHaveAttribute("data-duration-seconds", "4.00");
    await expect(linkedAudioClip).toHaveAttribute("data-in-point-seconds", "0.00");
  });

  test("ripple trims timeline clip starts with pointer gestures", async ({ page }) => {
    await page.goto("/");

    const rippleClip = page.getByTestId("timeline-clip-clip-video-02");
    const keyframeClip = page.getByTestId("timeline-clip-clip-key-01");
    const roomToneClip = page.getByTestId("timeline-clip-clip-audio-01");
    const nextVideoClip = page.getByTestId("timeline-clip-clip-video-03");
    const linkedAudioClip = page.getByTestId("timeline-clip-clip-audio-02");

    await rippleClip.click();

    const clipBox = await rippleClip.boundingBox();
    expect(clipBox).not.toBeNull();
    const clipDuration = Number(await rippleClip.getAttribute("data-duration-seconds"));
    const pxPerSecond = clipBox!.width / clipDuration;
    const rippleHandle = page.getByTestId("timeline-clip-clip-video-02-ripple-start");
    await rippleHandle.scrollIntoViewIfNeeded();
    const handleBox = await rippleHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2 + pxPerSecond * 0.5,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.up();

    await expect(rippleClip).toHaveAttribute("data-start-seconds", "5.60");
    await expect(rippleClip).toHaveAttribute("data-duration-seconds", "4.00");
    await expect(rippleClip).toHaveAttribute("data-in-point-seconds", "1.00");
    await expect(keyframeClip).toHaveAttribute("data-duration-seconds", "4.00");
    await expect(keyframeClip).toHaveAttribute("data-in-point-seconds", "1.00");
    await expect(roomToneClip).toHaveAttribute("data-duration-seconds", "9.60");
    await expect(nextVideoClip).toHaveAttribute("data-start-seconds", "9.60");
    await expect(linkedAudioClip).toHaveAttribute("data-start-seconds", "9.60");
  });

  test("keeps main editor panels and selected clips from overlapping", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("timeline-clip-clip-video-02").click();

    await expectNoOverlap(page.getByTestId("project-bin-panel"), page.getByTestId("monitor-stack"));
    await expectNoOverlap(page.getByTestId("monitor-stack"), page.getByTestId("inspector-panel"));
    await expectNoOverlap(page.getByTestId("inspector-panel"), page.getByTestId("timeline-area"));

    const selectedClip = page.getByTestId("timeline-clip-clip-video-02");
    const timeline = page.getByTestId("timeline-area");
    const clipBox = await selectedClip.boundingBox();
    const timelineBox = await timeline.boundingBox();

    expect(clipBox).not.toBeNull();
    expect(timelineBox).not.toBeNull();
    expect(clipBox!.x).toBeGreaterThanOrEqual(timelineBox!.x);
    expect(clipBox!.x + clipBox!.width).toBeLessThanOrEqual(timelineBox!.x + timelineBox!.width);
    expect(clipBox!.y).toBeGreaterThanOrEqual(timelineBox!.y);
    expect(clipBox!.y + clipBox!.height).toBeLessThanOrEqual(timelineBox!.y + timelineBox!.height);
  });
});

async function expectNoOverlap(first: Locator, second: Locator): Promise<void> {
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();

  const separated =
    firstBox!.x + firstBox!.width <= secondBox!.x ||
    secondBox!.x + secondBox!.width <= firstBox!.x ||
    firstBox!.y + firstBox!.height <= secondBox!.y ||
    secondBox!.y + secondBox!.height <= firstBox!.y;

  expect(separated).toBe(true);
}
