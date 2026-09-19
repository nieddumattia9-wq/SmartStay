export const EXPLICIT_INSTANT_COMPARISON_VERSION: string;
export type ExplicitInstant = {
  status: 'EXPLICIT_INSTANT'; original: string; epochSecond: number;
  fractionalSecond: string; offsetMinutes: number; reason: string;
} | {status: 'UNINTERPRETABLE'; original: unknown; reason: string};
export function parseExplicitInstant(original: unknown): ExplicitInstant;
export function compareExplicitInstants(before: unknown, after: unknown): {
  version: string; status: 'SAME_INSTANT' | 'DIFFERENT_INSTANT' | 'INSUFFICIENT_INFORMATION';
  equivalent: boolean; sameRepresentation: boolean; before: ExplicitInstant; after: ExplicitInstant;
};
