const DEFAULT_PREFERENCE_INDEX = 2;
const MIN_PREFERENCE_INDEX = 0;
const MAX_PREFERENCE_INDEX = 4;

export type SmartStayPreference = {
  selectedIndex: number;
};

export type SmartStayPreferenceSource =
  | "automatic"
  | "manual";

export type SmartStaySearchProfile = {
  automaticPreference:
    SmartStayPreference;

  manualPreference:
    SmartStayPreference | null;

  effectivePreference:
    SmartStayPreference;

  preferenceSource:
    SmartStayPreferenceSource;

  explanation: string;

  calculationVersion: string;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function clampPreferenceIndex(
  value: number
) {
  return Math.min(
    Math.max(
      Math.round(value),
      MIN_PREFERENCE_INDEX
    ),
    MAX_PREFERENCE_INDEX
  );
}

function normalizePreferenceCandidate(
  value: unknown
): SmartStayPreference | null {
  if (!isRecord(value)) {
    return null;
  }

  const selectedIndex =
    Number(
      value.selectedIndex
    );

  if (!Number.isFinite(selectedIndex)) {
    return null;
  }

  return {
    selectedIndex:
      clampPreferenceIndex(
        selectedIndex
      ),
  };
}

function normalizeText(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function copyPreference(
  value: SmartStayPreference
): SmartStayPreference {
  return {
    selectedIndex:
      value.selectedIndex,
  };
}

export function normalizeSmartPreference(
  value: unknown
): SmartStayPreference {
  return (
    normalizePreferenceCandidate(
      value
    ) ?? {
      selectedIndex:
        DEFAULT_PREFERENCE_INDEX,
    }
  );
}

export function normalizeSmartStaySearchProfile(
  value: unknown,
  fallbackPreference: SmartStayPreference
): SmartStaySearchProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  const automaticPreference =
    normalizePreferenceCandidate(
      value.automaticPreference
    ) ??
    copyPreference(
      fallbackPreference
    );

  const manualPreference =
    value.manualPreference === null
      ? null
      : normalizePreferenceCandidate(
          value.manualPreference
        );

  const requestedSource =
    value.preferenceSource === "manual"
      ? "manual"
      : "automatic";

  const preferenceSource:
    SmartStayPreferenceSource =
      requestedSource === "manual" &&
      manualPreference !== null
        ? "manual"
        : "automatic";

  const effectivePreference =
    preferenceSource === "manual" &&
    manualPreference !== null
      ? copyPreference(
          manualPreference
        )
      : copyPreference(
          automaticPreference
        );

  return {
    automaticPreference:
      copyPreference(
        automaticPreference
      ),

    manualPreference:
      manualPreference
        ? copyPreference(
            manualPreference
          )
        : null,

    effectivePreference,

    preferenceSource,

    explanation:
      normalizeText(
        value.explanation
      ),

    calculationVersion:
      normalizeText(
        value.calculationVersion
      ) || "unknown",
  };
}
