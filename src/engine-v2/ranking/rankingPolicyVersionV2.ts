/** Explicit replay boundary; an unversioned saved order belongs to legacy. */
export const LEGACY_RANKING_POLICY_V2 = 'provider-diversity@1' as const;
export const NEUTRAL_RANKING_POLICY_V2 = 'traveler-relevant@1' as const;
export type SmartStayRankingPolicyVersionV2 = typeof LEGACY_RANKING_POLICY_V2 | typeof NEUTRAL_RANKING_POLICY_V2;
export function resolveRankingPolicyV2(version?: SmartStayRankingPolicyVersionV2): SmartStayRankingPolicyVersionV2 {
 if (version === undefined) return NEUTRAL_RANKING_POLICY_V2;
 if (version !== LEGACY_RANKING_POLICY_V2 && version !== NEUTRAL_RANKING_POLICY_V2) throw new Error('RANKING_POLICY_VERSION_UNSUPPORTED');
 return version;
}
export function readRankingOrderV2(raw: string | null, availableIds: string[], policyVersion: SmartStayRankingPolicyVersionV2) {
 let value: unknown; try { value=raw===null?null:JSON.parse(raw); } catch { return {hotelIds:[],status:'invalid' as const}; }
 if (value===null) return {hotelIds:[],status:'absent' as const};
 const record=Array.isArray(value)?{policyVersion:LEGACY_RANKING_POLICY_V2,hotelIds:value}:value as {policyVersion?:unknown;hotelIds?:unknown};
 if (!record || typeof record!=='object' || !Array.isArray(record.hotelIds) || !record.hotelIds.every(x=>typeof x==='string')) return {hotelIds:[],status:'invalid' as const};
 if (record.policyVersion!==policyVersion) return {hotelIds:[],status:'policy-mismatch' as const};
 return {hotelIds:[...new Set(record.hotelIds.filter(x=>availableIds.includes(x)))],status:'same-policy' as const};
}
export function writeRankingOrderV2(hotelIds: string[], policyVersion: SmartStayRankingPolicyVersionV2) {
 return JSON.stringify({policyVersion:resolveRankingPolicyV2(policyVersion),hotelIds});
}
