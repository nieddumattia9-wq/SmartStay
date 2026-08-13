function compareStrings(
  first:
    string,
  second:
    string
) {
  if (first < second) {
    return -1;
  }

  if (first > second) {
    return 1;
  }

  return 0;
}

export function stableSerializeV3(
  value:
    unknown
): string {
  if (value === null) {
    return "null";
  }

  if (
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(
      value
    );
  }

  if (
    typeof value === "number"
  ) {
    if (
      !Number.isFinite(
        value
      )
    ) {
      throw new Error(
        "Stable V3 serialization does not accept non-finite numbers."
      );
    }

    return JSON.stringify(
      Object.is(
        value,
        -0
      )
        ? 0
        : value
    );
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return [
      "[",
      value.map(
        stableSerializeV3
      ).join(
        ","
      ),
      "]",
    ].join(
      ""
    );
  }

  if (
    typeof value === "object"
  ) {
    const record =
      value as Record<
        string,
        unknown
      >;

    const prototype =
      Object.getPrototypeOf(
        value
      );

    if (
      prototype !==
        Object.prototype &&
      prototype !==
        null
    ) {
      throw new Error(
        "Stable V3 serialization accepts only plain objects."
      );
    }

    return [
      "{",
      Object.keys(
        record
      )
        .sort(
          compareStrings
        )
        .map(
          (key) =>
            `${JSON.stringify(key)}:${stableSerializeV3(record[key])}`
        )
        .join(
          ","
        ),
      "}",
    ].join(
      ""
    );
  }

  throw new Error(
    `Stable V3 serialization does not accept ${typeof value}.`
  );
}

function createFnv1a32(
  value:
    string
) {
  let hash =
    0x811c9dc5;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^=
      value.charCodeAt(
        index
      );

    hash =
      Math.imul(
        hash,
        0x01000193
      ) >>>
      0;
  }

  return hash
    .toString(
      16
    )
    .padStart(
      8,
      "0"
    );
}

export function createStableHashV3(
  value:
    unknown,
  namespace =
    "stayopti-v3"
) {
  const payload = [
    namespace,
    stableSerializeV3(
      value
    ),
  ].join(
    "\n"
  );

  return `fnv1a32-${createFnv1a32(payload)}`;
}

export function isStableHashV3(
  value:
    unknown
) {
  return typeof value ===
      "string" &&
    /^fnv1a32-[0-9a-f]{8}$/.test(
      value
    );
}
