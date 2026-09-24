import {mkdtempSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {documentaryFixture} from './liteApiDocumentarySyntheticV1.mjs';
import {COMPARISON_PLAN,CONTROLS,comparisonRequest,hash,sha,canonical} from '../../../scripts/liteapi-comparison-plan-v1.mjs';
import {comparisonJournal,sealComparisonSelection,comparisonPrebookStop} from '../../../scripts/liteapi-comparison-capture-v1.mjs';
export const comparisonSyntheticProtector={protectionClass:'SYNTHETIC_TEST_ONLY',protectDataKey:x=>x,unprotectDataKey:x=>x};
const clone=structuredClone;
export function comparisonFixture(options={}){
 const base=mkdtempSync(join(tmpdir(),'stayopti-d0075-synthetic-')),registryRoot=join(base,'registry');
 const documented={status:'DOCUMENTED',reference:'invented-contract-not-production-authority',sha256:'b'.repeat(64)};
 const config={version:COMPARISON_PLAN,origin:'SYNTHETIC_LOCAL_TRANSPORT',protocol:options.protocol??'LITEAPI_DOCUMENTARY@1',caseId:'SYNTHETIC_COMPARISON_'+(options.count??3),
  scenario:{city:'Invented Alpine City',country:'AT',checkin:'2099-10-10',checkout:'2099-10-17',currency:'EUR',guestNationality:'FR',adults:2,childAges:[6,11],units:1,budget:1800,preference:'balanced-manual',distance:'NOT_REQUESTED'},
  selection:{version:'HASHED_PROVIDER_IDS_AUDIT_ONLY@1',seed:'invented-offline-fixed-seed',maximumHotels:5},controls:clone(CONTROLS),
  externalConditions:{accountReference:'SYNTHETIC_NOT_AN_ACCOUNT',maximumUsageCostEur:0,publicPriceBasis:clone(documented),permittedUse:clone(documented),retentionPermission:clone(documented)},
  retention:{directory:registryRoot,days:14,responsible:'Synthetic operator',access:'WINDOWS_CURRENT_USER_DPAPI',noAutomaticDeletionAcknowledged:true}};
 options.configure?.(config);
 const old=documentaryFixture({count:options.count??3});
 const response=q=>{
  const b=old.responseForIntent(q);
  if(q.kind==='SEARCH')for(const h of b.data)for(const o of h.roomTypes){o.rates[0].childrenAges=[...config.scenario.childAges];o.rates[0].adultCount=config.scenario.adults;o.rates[0].childCount=config.scenario.childAges.length;o.suggestedSellingPrice={amount:700,currency:'EUR'};}
  if(q.kind==='HOTEL_DETAIL'){b.data.childAllowed=true;}
  if(q.kind==='PREBOOK'){const i=Number(q.hotelId.split('-').at(-1));b.data.roomTypes[0].rates[0].rateId='SEARCH_RATE_'+i;
   b.data.roomTypes[0].rates[0].childrenAges=[...config.scenario.childAges];b.data.roomTypes[0].rates[0].childCount=config.scenario.childAges.length;b.data.roomTypes[0].rates[0].adultCount=config.scenario.adults;
   b.data.roomTypes[0].suggestedSellingPrice={amount:700,currency:'EUR'};b.data.termsAndConditions='Payment: pay now';}
  options.mutate?.(b,q);
  if(config.protocol==='SYNTHETIC_ATTESTED_QUOTE@1'){
   if(q.kind==='PREBOOK'){const quote=clone(b.data);delete quote.prebookId;
    const envelope={format:'invented-observation-and-attestation@1',operation:'ATTEST_QUOTE',quote,verification:{kind:'COMMERCIAL_VERIFICATION',id:'INVENTED_ATTESTATION_'+q.hotelId,offerToken:q.offerId,property:q.hotelId}};
    options.mutateEnvelope?.(envelope,q,config);return envelope;
   }
   return {format:'invented-observation-and-attestation@1',operation:q.kind,document:b};
  }
  return b;
 };
 const pack=q=>{const raw=Buffer.from(canonical(response(q)));return {status:200,headers:{'content-type':'application/json'},body:{base64:raw.toString('base64'),sha256:sha(raw),byteLength:raw.length}};};
 const q=comparisonRequest(config,'SEARCH'),r={ordinal:1,kind:q.kind,intent:q,outcome:'SUCCEEDED',completedAt:'2099-09-01T12:00:00.000Z',response:pack(q)};
 const selection=sealComparisonSelection(config,r),targets=selection.selected.filter(t=>t.offerId);
 const requests=[q,...(targets.length>=2?targets.map(t=>comparisonRequest(config,'HOTEL_DETAIL',t)):[]),...(targets.length>=2&&!options.noVerification?targets.map(t=>comparisonRequest(config,'PREBOOK',t)):[])];
 const simulation={origin:'SYNTHETIC_ONLY',responses:requests.map(q=>({method:q.method,path:q.path+(Object.keys(q.query).length?'?'+new URLSearchParams(q.query):''),body:q.body,response:response(q)}))};
 return {base,registryRoot,config,selection,requests,simulation,response,pack,checkpoint:{head:'a'.repeat(40),branch:'codex/evaluation-d0036-d0041',inventorySha256:'b'.repeat(64)}};
}
export function authenticatedComparisonFixture(options={}){
 const f=comparisonFixture(options);let ms=Date.parse('2099-09-01T12:00:00Z');const now=()=>new Date(ms+=100).toISOString();
 const input={root:join(f.registryRoot,'cases',f.config.caseId),registryRoot:f.registryRoot,caseId:f.config.caseId,mode:'SYNTHETIC_ONLY',bindingSha256:hash({config:f.config,checkpoint:f.checkpoint}),authorizationSha256:'c'.repeat(64),now,context:{config:f.config,checkpoint:f.checkpoint},...(options.dpapi?{}:{protector:comparisonSyntheticProtector})};
 const journal=comparisonJournal.create(input);
 for(const q of f.requests){const {ordinal}=journal.reserve({kind:q.kind,hotelId:q.hotelId,offerId:q.offerId??null,requestBytes:Buffer.from(canonical(q)),checkpointSha256:input.bindingSha256});
  const r={ordinal,kind:q.kind,intent:q,outcome:'SUCCEEDED',completedAt:now(),response:f.pack(q)};
  journal.complete({ordinal,state:'SUCCEEDED',statusCode:200,responseBytes:Buffer.from(canonical(r))});if(q.kind==='SEARCH')journal.sealSelection(sealComparisonSelection(f.config,r));
 }
 if(!options.unfinished)journal.finish({status:'COMPLETED'});
 return {...f,input,journal,locator:{root:input.root,registryRoot:input.registryRoot,...(options.dpapi?{}:{syntheticProtector:comparisonSyntheticProtector})}};
}
export function syntheticOriginalTree(root){return readdirSync(root,{withFileTypes:true}).flatMap(x=>x.isDirectory()?syntheticOriginalTree(join(root,x.name)):[{path:join(root,x.name),sha256:sha(readFileSync(join(root,x.name))),mtime:statSync(join(root,x.name)).mtimeMs}]);}
