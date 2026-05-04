export interface ClaudeAdviserRequestInput {
  model?: string;
  projectBible: Record<string, unknown>;
  characters: Array<Record<string, unknown>>;
  styleGuide: Record<string, unknown>;
  providerCatalogVersion: string;
  task: string;
  sceneFocus: Record<string, unknown>;
}

export interface ClaudeAdviserRequest {
  model: string;
  messages: Array<{
    role: "user";
    content: Array<
      | {
          type: "text";
          text: string;
          cache_control: { type: "ephemeral" };
        }
      | {
          type: "text";
          text: string;
        }
    >;
  }>;
  cacheBoundary: {
    stablePrefixHash: string;
    suffixHash: string;
  };
}

export function buildClaudeAdviserRequest(
  input: ClaudeAdviserRequestInput
): ClaudeAdviserRequest {
  const stablePrefix = stableStringify({
    projectBible: input.projectBible,
    characters: input.characters,
    styleGuide: input.styleGuide,
    providerCatalogVersion: input.providerCatalogVersion
  });
  const suffix = stableStringify({
    task: input.task,
    sceneFocus: input.sceneFocus,
    outputContract: {
      format: "json",
      requiresAlternatives: true,
      requiresCostRightsQualityConsistencyRisks: true,
      requiresApprovalStatus: "pending"
    }
  });

  return {
    model: input.model ?? "claude-sonnet-4.6",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: stablePrefix,
            cache_control: { type: "ephemeral" }
          },
          {
            type: "text",
            text: suffix
          }
        ]
      }
    ],
    cacheBoundary: {
      stablePrefixHash: hashText(stablePrefix),
      suffixHash: hashText(suffix)
    }
  };
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  return `{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(",")}}`;
}

function hashText(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}
