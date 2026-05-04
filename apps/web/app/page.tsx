import {
  DEFAULT_AI_PREFERENCES,
  INITIAL_EXPORT_MANIFEST,
  INITIAL_MEDIA_SOURCES,
  INITIAL_SCENES,
  INITIAL_SCENE_SPECS,
  INITIAL_SUGGESTIONS,
  INITIAL_VALIDATION_REPORTS,
  INITIAL_WORKSPACE
} from "@aethon/core";
import { StudioClient } from "./studio-client";

export default function StudioPage() {
  return (
    <StudioClient
      initialPreferences={DEFAULT_AI_PREFERENCES}
      initialExportManifest={INITIAL_EXPORT_MANIFEST}
      initialMediaSources={INITIAL_MEDIA_SOURCES}
      initialScenes={INITIAL_SCENES}
      initialSceneSpecs={INITIAL_SCENE_SPECS}
      initialSuggestions={INITIAL_SUGGESTIONS}
      initialValidationReports={INITIAL_VALIDATION_REPORTS}
      initialWorkspace={INITIAL_WORKSPACE}
    />
  );
}
