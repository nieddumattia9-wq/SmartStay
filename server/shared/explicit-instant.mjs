// Provider-neutral comparison only, retained under the backend release closure.
// This never rewrites evidence, identity,
// free-form policy text or a caller's original timestamp.
export const EXPLICIT_INSTANT_COMPARISON_VERSION = 'stayopti.explicit-instant-comparison@1';
/** Bounded ISO calendar form: YYYY-MM-DD T HH:mm[:ss[.fraction]] followed by
 * Z or an explicit +/-HH:MM offset. No local timezone, named-zone inference,
 * Date.parse permissiveness, leap-second assumption or precision rounding. */
export function parseExplicitInstant(original) {
    const unknown = (reason) => ({ status: 'UNINTERPRETABLE', original, reason });
    if (typeof original !== 'string')
        return unknown('TIMESTAMP_NOT_STRING');
    const match = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?([Zz]|[+-]\d{2}:\d{2})$/.exec(original);
    if (!match)
        return unknown('EXPLICIT_ISO_OFFSET_FORMAT_REQUIRED');
    const [, y, m, d, hh, mm, ss = '0', fraction = '', zone] = match;
    const year = Number(y), month = Number(m), day = Number(d), hour = Number(hh), minute = Number(mm), second = Number(ss);
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59)
        return unknown('INVALID_CALENDAR_OR_CLOCK');
    // setUTCFullYear avoids Date.UTC's special interpretation of years 00..99.
    const calendar = new Date(0);
    calendar.setUTCFullYear(year, month - 1, day);
    calendar.setUTCHours(hour, minute, second, 0);
    if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day)
        return unknown('INVALID_CALENDAR_OR_CLOCK');
    if (zone === '-00:00')
        return unknown('UNKNOWN_LOCAL_OFFSET');
    const offsetHours = /^[Zz]$/.test(zone) ? 0 : Number(zone.slice(1, 3));
    const offsetMinutes = /^[Zz]$/.test(zone) ? 0 : Number(zone.slice(4, 6));
    if (offsetHours > 23 || offsetMinutes > 59)
        return unknown('INVALID_UTC_OFFSET');
    const offset = (offsetHours * 60 + offsetMinutes) * (zone.startsWith('-') ? -1 : 1);
    return { status: 'EXPLICIT_INSTANT', original, epochSecond: calendar.getTime() / 1000 - offset * 60,
        fractionalSecond: fraction.replace(/0+$/, ''), offsetMinutes: offset, reason: 'EXPLICIT_VALIDATED_CALENDAR_AND_OFFSET' };
}
export function compareExplicitInstants(before, after) {
    const a = parseExplicitInstant(before), b = parseExplicitInstant(after), sameRepresentation = Object.is(before, after);
    const comparable = a.status === 'EXPLICIT_INSTANT' && b.status === 'EXPLICIT_INSTANT';
    const sameInstant = comparable && a.epochSecond === b.epochSecond && a.fractionalSecond === b.fractionalSecond;
    return { version: EXPLICIT_INSTANT_COMPARISON_VERSION,
        status: comparable ? (sameInstant ? 'SAME_INSTANT' : 'DIFFERENT_INSTANT') : 'INSUFFICIENT_INFORMATION',
        // Identical unparsed data retains existing no-change behavior. It does not
        // receive a temporal-equivalence certificate: status stays insufficient.
        equivalent: sameInstant || sameRepresentation, sameRepresentation, before: a, after: b };
}
// Additive exact ordering/canonical projection for semantic consumers. The
// parser and historical equality comparator above retain their original rules.
// Fractional digits stay strings: Date/Number must never round them together.
export function orderExplicitInstants(before, after) {
    const a = parseExplicitInstant(before), b = parseExplicitInstant(after);
    if (a.status !== 'EXPLICIT_INSTANT' || b.status !== 'EXPLICIT_INSTANT')
        return null;
    if (a.epochSecond !== b.epochSecond)
        return a.epochSecond < b.epochSecond ? -1 : 1;
    const width = Math.max(a.fractionalSecond.length, b.fractionalSecond.length);
    const af = a.fractionalSecond.padEnd(width, '0'), bf = b.fractionalSecond.padEnd(width, '0');
    return af === bf ? 0 : af < bf ? -1 : 1;
}
export function canonicalExplicitInstant(original) {
    const parsed = parseExplicitInstant(original);
    if (parsed.status !== 'EXPLICIT_INSTANT')
        return null;
    // Date formats only the integer second; every significant fractional digit
    // comes from the validated source, including precision beyond milliseconds.
    return new Date(parsed.epochSecond * 1000).toISOString().replace(/\.000Z$/, (parsed.fractionalSecond ? '.' + parsed.fractionalSecond : '') + 'Z');
}
