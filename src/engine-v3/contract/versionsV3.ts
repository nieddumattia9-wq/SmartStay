export const SMARTSTAY_ENGINE_VERSION_V3_01 =
  "3.0.0-alpha.1" as const;

export const SMARTSTAY_ENGINE_VERSION_V3 =
  "3.0.0-alpha.2" as const;

export const SMARTSTAY_DECISION_SCHEMA_VERSION_V3_01 =
  "3.0.0-decision.1" as const;

export const SMARTSTAY_DECISION_SCHEMA_VERSION_V3 =
  "3.0.0-decision.2" as const;

export const SMARTSTAY_POLICY_VERSION_V3_01 =
  "3.0.0-policy.1" as const;

export const SMARTSTAY_POLICY_VERSION_V3 =
  "3.0.0-policy.2" as const;

export const SMARTSTAY_EVIDENCE_SCHEMA_VERSION_V3_01 =
  "3.0.0-evidence.1" as const;

export const SMARTSTAY_EVIDENCE_SCHEMA_VERSION_V3 =
  "3.0.0-evidence.2" as const;

export const SMARTSTAY_V2_ADAPTER_VERSION_V3_01 =
  "3.0.0-v2-adapter.1" as const;

export const SMARTSTAY_V2_ADAPTER_VERSION_V3 =
  "3.0.0-v2-adapter.2" as const;

export const SMARTSTAY_COMMERCIAL_FIREWALL_VERSION_V3 =
  "3.0.0-commercial-firewall.1" as const;

export const SMARTSTAY_STAY_INTEGRITY_VERSION_V3 =
  "3.0.0-stay-integrity.1" as const;

export const SMARTSTAY_V3_VERSIONS = {
  engine:
    SMARTSTAY_ENGINE_VERSION_V3,

  decisionSchema:
    SMARTSTAY_DECISION_SCHEMA_VERSION_V3,

  policy:
    SMARTSTAY_POLICY_VERSION_V3,

  evidenceSchema:
    SMARTSTAY_EVIDENCE_SCHEMA_VERSION_V3,

  v2Adapter:
    SMARTSTAY_V2_ADAPTER_VERSION_V3,

  commercialFirewall:
    SMARTSTAY_COMMERCIAL_FIREWALL_VERSION_V3,

  stayIntegrity:
    SMARTSTAY_STAY_INTEGRITY_VERSION_V3,
} as const;

export type SmartStayEngineVersionV3 =
  typeof SMARTSTAY_ENGINE_VERSION_V3;

export type SmartStayDecisionSchemaVersionV3 =
  typeof SMARTSTAY_DECISION_SCHEMA_VERSION_V3;

export type SmartStayPolicyVersionV3 =
  typeof SMARTSTAY_POLICY_VERSION_V3;

export type SmartStayEvidenceSchemaVersionV3 =
  typeof SMARTSTAY_EVIDENCE_SCHEMA_VERSION_V3;

export type SmartStayV2AdapterVersionV3 =
  typeof SMARTSTAY_V2_ADAPTER_VERSION_V3;
