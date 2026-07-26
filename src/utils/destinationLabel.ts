function normalizeText(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function splitDestinationParts(
  value: unknown
) {
  return normalizeText(value)
    .split(",")
    .map(
      (part) =>
        part.trim()
    )
    .filter(
      Boolean
    );
}

export function normalizeDestinationLabel(
  value: unknown
) {
  const parts =
    splitDestinationParts(
      value
    );

  const seen =
    new Set<string>();

  const uniqueParts =
    parts.filter(
      (part) => {
        const normalizedPart =
          part.toLocaleLowerCase(
            "en"
          );

        if (
          seen.has(
            normalizedPart
          )
        ) {
          return false;
        }

        seen.add(
          normalizedPart
        );

        return true;
      }
    );

  const lastPart =
    uniqueParts[
      uniqueParts.length - 1
    ];

  if (
    uniqueParts.length >= 3 &&
    lastPart &&
    /^[A-Z]{2}$/i.test(
      lastPart
    )
  ) {
    uniqueParts.pop();
  }

  return uniqueParts.join(
    ", "
  );
}

export function normalizeDestinationCountry(
  value: unknown
) {
  const parts =
    splitDestinationParts(
      value
    );

  const lastPart =
    parts[
      parts.length - 1
    ];

  if (
    parts.length >= 2 &&
    lastPart &&
    /^[A-Z]{2}$/i.test(
      lastPart
    )
  ) {
    parts.pop();
  }

  return normalizeDestinationLabel(
    parts.join(", ")
  );
}

export function formatDestinationLabel(
  nameOrLabel: unknown,
  country?: unknown
) {
  const name =
    normalizeText(
      nameOrLabel
    );

  const countryLabel =
    normalizeText(
      country
    );

  return normalizeDestinationLabel(
    countryLabel
      ? `${name}, ${countryLabel}`
      : name
  );
}
