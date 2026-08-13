import {
  SMARTSTAY_COMMERCIAL_FIREWALL_VERSION_V3,
} from "./versionsV3";

export interface SmartStayCommercialFirewallViolationV3 {
  path:
    string;

  field:
    string;
}

export interface SmartStayCommercialFirewallEvaluationV3 {
  version:
    typeof SMARTSTAY_COMMERCIAL_FIREWALL_VERSION_V3;

  passed:
    boolean;

  violations:
    SmartStayCommercialFirewallViolationV3[];
}

const PROHIBITED_FIELD_NAMES_V3 =
  new Set([
    "affiliatecommission",
    "affiliateid",
    "affiliaterevenue",
    "commission",
    "commissionamount",
    "commissionpercent",
    "commercialpricing",
    "commercialpriority",
    "margin",
    "markup",
    "payout",
    "providerpriority",
    "requestedcommissionpercent",
    "requestedmarkup",
    "revenue",
    "sellercommission",
    "sellercommissionpercent",
  ]);

function normalizeFieldName(
  value:
    string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      ""
    );
}

function compareViolations(
  first:
    SmartStayCommercialFirewallViolationV3,
  second:
    SmartStayCommercialFirewallViolationV3
) {
  return first.path.localeCompare(
    second.path
  ) ||
    first.field.localeCompare(
      second.field
    );
}

export function evaluateCommercialFirewallV3(
  value:
    unknown
): SmartStayCommercialFirewallEvaluationV3 {
  const violations:
    SmartStayCommercialFirewallViolationV3[] =
      [];

  const visited =
    new Set<object>();

  function visit(
    current:
      unknown,
    path:
      string
  ) {
    if (
      current === null ||
      typeof current !==
        "object"
    ) {
      return;
    }

    if (
      visited.has(
        current
      )
    ) {
      return;
    }

    visited.add(
      current
    );

    if (
      Array.isArray(
        current
      )
    ) {
      current.forEach(
        (
          item,
          index
        ) =>
          visit(
            item,
            `${path}[${index}]`
          )
      );

      return;
    }

    for (
      const [
        key,
        nestedValue,
      ] of Object.entries(
        current
      )
    ) {
      const nestedPath =
        path
          ? `${path}.${key}`
          : key;

      if (
        PROHIBITED_FIELD_NAMES_V3.has(
          normalizeFieldName(
            key
          )
        )
      ) {
        violations.push({
          path:
            nestedPath,
          field:
            key,
        });
      }

      visit(
        nestedValue,
        nestedPath
      );
    }
  }

  visit(
    value,
    ""
  );

  violations.sort(
    compareViolations
  );

  return {
    version:
      SMARTSTAY_COMMERCIAL_FIREWALL_VERSION_V3,

    passed:
      violations.length ===
      0,

    violations,
  };
}

export function assertCommercialFirewallV3(
  value:
    unknown
) {
  const evaluation =
    evaluateCommercialFirewallV3(
      value
    );

  if (
    !evaluation.passed
  ) {
    throw new Error(
      `V3 commercial firewall rejected: ${evaluation.violations.map((violation) => violation.path).join(", ")}.`
    );
  }

  return evaluation;
}
