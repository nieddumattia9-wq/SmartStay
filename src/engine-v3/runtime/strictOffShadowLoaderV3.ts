import type {
  RunFrontendIndependentShadowRuntimeInputV3,
  StayOptiFrontendShadowRuntimeModeV3,
} from "./frontendIndependentShadowRuntimeV3";

import type {
  RunIndependentDecisionShadowResultV3,
} from "../orchestrator/independentDecisionEngineV3";

export interface StayOptiFrontendShadowRuntimeModuleV3 {
  runFrontendIndependentShadowRuntimeV3: (
    input:
      RunFrontendIndependentShadowRuntimeInputV3
  ) => RunIndependentDecisionShadowResultV3;
}

export type StayOptiFrontendShadowRuntimeImporterV3 =
  () => Promise<
    StayOptiFrontendShadowRuntimeModuleV3
  >;

const importFrontendShadowRuntimeV3:
  StayOptiFrontendShadowRuntimeImporterV3 =
  () =>
    import(
      "./frontendIndependentShadowRuntimeV3"
    );

export async function loadFrontendIndependentShadowRuntimeV3(
  mode:
    StayOptiFrontendShadowRuntimeModeV3,
  importer:
    StayOptiFrontendShadowRuntimeImporterV3 =
      importFrontendShadowRuntimeV3
): Promise<
  StayOptiFrontendShadowRuntimeModuleV3 |
  null
> {
  if (
    mode !==
      "shadow"
  ) {
    return null;
  }

  return importer();
}

export const STAYOPTI_STRICT_OFF_SHADOW_LOADER_AUDIT_V3 =
  Object.freeze({
    offImportsRuntime:
      false as const,
    shadowImportsRuntime:
      true as const,
    publicServingEngine:
      "v2" as const,
    splitEnabled:
      false as const,
  });
