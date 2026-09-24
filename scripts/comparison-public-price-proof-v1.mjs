// Explicit synthetic protocol extension, not a newly claimed LiteAPI field.
// Called ONLY after the fixed comparison reader authenticates the full journal.
import {readDocumentaryResponse} from './liteapi-documentary-wire-v1.mjs';
const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:null;
const text=x=>typeof x==='string'?x:'';
const one=(x,values,unknown='UNKNOWN')=>values.includes(x)?x:unknown;
export function readComparisonPublicPriceProof(record,protocol,source){
 if(!record||protocol!=='SYNTHETIC_ATTESTED_QUOTE@1')return null;
 const raw=readDocumentaryResponse(record),p=raw.publicPriceVerification;
 if(p===undefined)return null;
 if(!p||p.version!=='invented-public-price-quote@1'||!p.scope||!Array.isArray(p.components))throw Error('PUBLIC_PRICE_PROOF_SCHEMA');
 const s=p.scope;
 return {version:'stayopti.public-price-verification@1',scope:{propertyId:text(s.propertyId),offerId:text(s.offerId),roomId:s.roomId==null?null:String(s.roomId),
  checkIn:text(s.checkIn),checkOut:text(s.checkOut),adults:s.adults,children:s.children,childAges:Array.isArray(s.childAges)?structuredClone(s.childAges):null,units:s.units,currency:text(s.currency)},
  money:number(p.money?.amount)===null?null:{amount:p.money.amount,currency:text(p.money.currency)},source:{...source,pointer:'publicPriceVerification',transformation:'AUTHENTICATED_INVENTED_PUBLIC_PRICE_QUOTE@1'},
  coverage:p.mandatoryCoverage==='enumerated-all-compulsory-stay-charges'?'DOCUMENTED_EXHAUSTIVE_COMPONENTS':'UNKNOWN',
  components:p.components.map(c=>({id:text(c.id),amount:number(c.amount),currency:typeof c.currency==='string'?c.currency:null,
   kind:one(c.kind,['MANDATORY','OPTIONAL','REFUNDABLE_DEPOSIT']),category:one(c.category,['TAX','FEE','OTHER']),
   inclusion:one(c.inclusion,['INCLUDED','EXCLUDED']),basis:one(c.basis,['TOTAL_STAY_ALL_GUESTS']),payable:one(c.payable,['NOW','AT_PROPERTY'])})),
  issues:[...(['error','errors'].filter(k=>Object.hasOwn(p,k)&&p[k]!=null&&p[k]!==false&&!(Array.isArray(p[k])&&!p[k].length)).map(k=>'PUBLIC_PRICE_PROOF_ERROR:'+k)),
   ...(Array.isArray(p.contraryObservations)?p.contraryObservations.map(x=>'CONTRARY:'+String(x)):['PUBLIC_PRICE_CONTRARY_OBSERVATIONS_UNREPRESENTABLE'])]};
}
