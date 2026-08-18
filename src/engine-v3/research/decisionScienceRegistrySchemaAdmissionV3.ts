import {
  loadDecisionScienceRegistryOnlyV3,
  type StayOptiDecisionScienceOpaqueRegistryV3,
  type StayOptiDecisionScienceRegistryImporterV3,
} from "./decisionScienceRegistryOnlyV3";

import {
  loadDecisionScienceSchemaAdmissionV3,
  type DecisionScienceSchemaAdmissionIssueV3,
  type DecisionScienceSchemaAdmissionServiceV3,
  type DecisionScienceSchemaImporterV3,
} from "./decisionScienceSchemaAdmissionV3";

import type {
  DecisionScienceSchemaWorkerFactoryV3,
} from "./decisionScienceSchemaWorkerV3";

import {
  deepFreezeQualifiedClaimValueV3,
} from "./qualifiedClaimIdentityV3";

export interface DecisionScienceRegistrySchemaAdmissionOptionsV3 {
  mode?: unknown;
  registryImporter?: StayOptiDecisionScienceRegistryImporterV3;
  schemaImporter?: DecisionScienceSchemaImporterV3;
  workerFactory?: DecisionScienceSchemaWorkerFactoryV3;
  compileHardMs?: number;
  validationHardMs?: number;
}

export interface DecisionScienceRegistrySchemaAdmissionReadyV3 {
  registry: Readonly<StayOptiDecisionScienceOpaqueRegistryV3>;
  schemaAdmission: Readonly<DecisionScienceSchemaAdmissionServiceV3>;
}

export interface DecisionScienceRegistrySchemaAdmissionResultV3 {
  requestedMode: unknown;
  resolvedMode: "off" | "registry-only";
  status: "off" | "ready" | "blocked";
  value: Readonly<DecisionScienceRegistrySchemaAdmissionReadyV3> | null;
  schemaIssues: readonly DecisionScienceSchemaAdmissionIssueV3[];
  registryIssueCodes: readonly string[];
  rankingInfluence: "none";
  decisionUse: "forbidden";
  decisionCoreChanged: false;
  publicV2Changed: false;
  publicV3Enabled: false;
  splitEnabled: false;
  traceEnabled: false;
  goldenIncrement: 0;
  adversarialIncrement: 0;
  counterfactualIncrement: 0;
  humanJudgmentIncrement: 0;
  expertJudgmentIncrement: 0;
  aiJudgmentIncrement: 0;
}

function result(
  requestedMode: unknown,
  resolvedMode: "off" | "registry-only",
  status: "off" | "ready" | "blocked",
  value: Readonly<DecisionScienceRegistrySchemaAdmissionReadyV3> | null,
  schemaIssues: readonly DecisionScienceSchemaAdmissionIssueV3[],
  registryIssueCodes: readonly string[]
): DecisionScienceRegistrySchemaAdmissionResultV3 {
  return deepFreezeQualifiedClaimValueV3({
    requestedMode,
    resolvedMode,
    status,
    value,
    schemaIssues,
    registryIssueCodes,
    rankingInfluence: "none" as const,
    decisionUse: "forbidden" as const,
    decisionCoreChanged: false as const,
    publicV2Changed: false as const,
    publicV3Enabled: false as const,
    splitEnabled: false as const,
    traceEnabled: false as const,
    goldenIncrement: 0 as const,
    adversarialIncrement: 0 as const,
    counterfactualIncrement: 0 as const,
    humanJudgmentIncrement: 0 as const,
    expertJudgmentIncrement: 0 as const,
    aiJudgmentIncrement: 0 as const,
  });
}

export async function loadDecisionScienceRegistrySchemaAdmissionV3(
  options: DecisionScienceRegistrySchemaAdmissionOptionsV3 = {}
): Promise<DecisionScienceRegistrySchemaAdmissionResultV3> {
  if (options.mode === undefined || options.mode === "off") {
    return result(options.mode, "off", "off", null, Object.freeze([]), Object.freeze([]));
  }
  if (
    options.mode !== "registry-only" ||
    typeof options.registryImporter !== "function" ||
    typeof options.schemaImporter !== "function"
  ) {
    return result(
      options.mode,
      "off",
      "blocked",
      null,
      Object.freeze([]),
      Object.freeze(["composition-input-invalid"])
    );
  }
  try {
    const registry = await loadDecisionScienceRegistryOnlyV3({
      mode: "registry-only",
      importer: options.registryImporter,
    });
    if (registry.status !== "ready" || registry.registry === null) {
      return result(
        options.mode,
        "registry-only",
        "blocked",
        null,
        Object.freeze([]),
        Object.freeze(registry.issues.map((entry) => entry.code))
      );
    }
    const schema = await loadDecisionScienceSchemaAdmissionV3({
      mode: "registry-only",
      importer: options.schemaImporter,
      workerFactory: options.workerFactory,
      compileHardMs: options.compileHardMs,
      validationHardMs: options.validationHardMs,
    });
    if (schema.status !== "ready" || schema.service === null) {
      return result(
        options.mode,
        "registry-only",
        "blocked",
        null,
        schema.issues,
        Object.freeze([])
      );
    }
    return result(
      options.mode,
      "registry-only",
      "ready",
      Object.freeze({
        registry: registry.registry,
        schemaAdmission: schema.service,
      }),
      Object.freeze([]),
      Object.freeze([])
    );
  } catch {
    return result(
      options.mode,
      "registry-only",
      "blocked",
      null,
      Object.freeze([]),
      Object.freeze(["composition-internal-failure"])
    );
  }
}
