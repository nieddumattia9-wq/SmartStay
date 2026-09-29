// Canonical provider-neutral source; .mjs is its checked offline build.
export const STAY_PRICE_BAND_VERSION='stayopti.eur-single-unit-stay-price-band@1' as const;
export type BandMoney={amount:number;currency:string};
export function exactEuroCents(m:BandMoney|null|undefined):bigint|null {
 if(!m||m.currency!=='EUR'||typeof m.amount!=='number'||!Number.isFinite(m.amount))return null;
 const s=String(m.amount);if(!/^\d+(?:\.\d{1,2})?$/.test(s))return null;
 const [a,b='']=s.split('.');const value=BigInt(a)*100n+BigInt(b.padEnd(2,'0'));
 return value<=BigInt(Number.MAX_SAFE_INTEGER)?value:null;
}
export function euroMoney(c:bigint):BandMoney {
 if(c<0n||c>BigInt(Number.MAX_SAFE_INTEGER))throw Error('PRICE_MINOR_UNIT_RANGE');
 const value=Number(`${c/100n}.${String(c%100n).padStart(2,'0')}`);
 if(exactEuroCents({amount:value,currency:'EUR'})!==c)throw Error('PRICE_MINOR_UNIT_NOT_REPRESENTABLE');
 return {amount:value,currency:'EUR'};
}
/** Caller must qualify SAME total stay / one offer / one unit and all SSPs.
 * This policy never authenticates a source or waives continuity/complete cost. */
export function qualifyStayPriceBand(s:BandMoney|null|undefined,p:BandMoney|null|undefined){
 const lo=exactEuroCents(s),price=exactEuroCents(p);
 const status=lo===null||price===null?'NOT_COMPARABLE':price<lo?'BELOW_MINIMUM':price>lo+500n?'ABOVE_COMMERCIAL_BAND':'WITHIN_COMMERCIAL_BAND';
 return {version:STAY_PRICE_BAND_VERSION,status,scope:'TOTAL_STAY_SINGLE_OFFER_SINGLE_UNIT',currency:'EUR',
  minimumMinorUnits:lo?.toString()??null,maximumMinorUnits:lo===null?null:(lo+500n).toString(),
  observedMinorUnits:price?.toString()??null,calculationObjective:lo===null?null:euroMoney(lo+100n),
  commercialUpperBoundOrigin:'MATTIA_DECISION_NOT_PROVIDER_RULE',providerPriceRewritten:false,thresholdToleranceMinorUnits:0};
}
