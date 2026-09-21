// Entirely invented journals. Never raw real captures relabelled as synthetic.
import {mkdtempSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {coverageFixture,syntheticProtector} from './liteApiCoverageSyntheticV1.mjs';
import {hotelDetailFixture,packDetailFixture} from './liteApiHotelDetailSyntheticV1.mjs';
import {createCoverageJournal} from '../../../scripts/liteapi-search-coverage-journal-v1.mjs';
import {readCoverageOriginals} from '../../../scripts/liteapi-search-coverage-capture-v1.mjs';
import {createHotelDetailsJournal} from '../../../scripts/liteapi-hotel-details-journal-v1.mjs';
import {createHotelDetailSourceBinding} from '../../../scripts/liteapi-room-detail-comparison-v1.mjs';
import {coverageRequest,hash} from '../../../scripts/liteapi-search-coverage-plan-v1.mjs';
import {detailsRequest} from '../../../scripts/liteapi-hotel-detail-plan-v1.mjs';
export function syntheticTree(root){return readdirSync(root,{withFileTypes:true}).flatMap(e=>{const p=join(root,e.name);return e.isDirectory()?syntheticTree(p):[{path:p,bytes:readFileSync(p).toString('base64'),mtime:statSync(p).mtimeMs}];});}
export function historicalJournalFixture({dpapi=false,mutateRates,mutateDetail,count=2,twoOffers=true}={}){
 const base=mkdtempSync(join(tmpdir(),'StayOpti-D0073-')),coverageRoot=join(base,'coverage'),detailsRoot=join(base,'details');
 const data=hotelDetailFixture({count,twoOffers,mutateRates,mutateDetail,directory:detailsRoot});
 const cov=coverageFixture({count,directory:coverageRoot,mutatePlan:c=>{c.caseId='SYNTHETIC_HISTORICAL_COVERAGE';c.scenario=data.config.scenario;}});
 const checkpoint={head:'a'.repeat(40),branch:'codex/evaluation-d0036-d0041',inventorySha256:'b'.repeat(64)};
 const make=(config,registryRoot)=>({root:join(registryRoot,'cases',config.caseId),registryRoot,caseId:config.caseId,mode:'SYNTHETIC_ONLY',
  ...(!dpapi?{protector:syntheticProtector}:{}),bindingSha256:hash({config,checkpoint}),authorizationSha256:'e'.repeat(64),
  context:{config,checkpoint,inventory:{synthetic:true},configFileSha256:hash(config)}});
 const input=make(cov.config,coverageRoot),journal=createCoverageJournal(input);
 const rows=[cov.catalog,JSON.parse(Buffer.from(data.authenticatedCoverage.records[0].response.response.body.base64,'base64')), {error:{code:2001,message:'Invented no availability'}}];
 for(const [i,kind]of ['CATALOG','CITY_RATES','ID_RATES'].entries()){
  const q=coverageRequest(kind,kind==='CATALOG'?null:cov.selection,cov.config);
  const {ordinal}=journal.reserve({kind,requestBytes:Buffer.from(JSON.stringify(q)),checkpointSha256:input.bindingSha256});
  const r={ordinal,kind,startedAt:'2099-08-01T12:00:01.000Z',completedAt:'2099-08-01T12:00:02.000Z',outcome:'SUCCEEDED',failureClass:null,
   response:{status:200,headers:{'content-type':'application/json'},body:packDetailFixture(rows[i])}};
  journal.complete({ordinal,state:'SUCCEEDED',statusCode:200,errorClass:null,responseBytes:Buffer.from(JSON.stringify(r))});
  if(kind==='CATALOG')journal.sealSelection(cov.selection);
 }
 journal.finish({status:'COMPLETED'});
 const authenticated=readCoverageOriginals(input),source=createHotelDetailSourceBinding(authenticated,{configuration:cov.config,resultSha256:'c'.repeat(64),
  configurationSha256:hash(cov.config),inventorySha256:'d'.repeat(64),sourceCheckpoint:checkpoint.head});
 const config={...data.config,source,scenario:source.scenario,targets:source.targets},di=make(config,detailsRoot),dj=createHotelDetailsJournal(di);
 for(const [index,target]of config.targets.entries()){
  const q=detailsRequest(index,config),{ordinal}=dj.reserve({kind:q.kind,hotelId:target.hotelId,requestBytes:Buffer.from(JSON.stringify(q)),checkpointSha256:di.bindingSha256});
  const response=data.capture.records.find(p=>p.request.hotelId===target.hotelId).response;
  dj.complete({ordinal,state:'SUCCEEDED',statusCode:200,errorClass:null,responseBytes:Buffer.from(JSON.stringify({...response,ordinal}))});
 }
 dj.finish({status:'COMPLETED'});
 return {base,locator:{coverage:{root:input.root,registryRoot:input.registryRoot},details:{root:di.root,registryRoot:di.registryRoot},...(!dpapi?{syntheticProtector}:{})},originals:syntheticTree(base)};
}
