import assert from 'node:assert/strict';
import test from 'node:test';
import {liteApiGovernorFixture} from './fixtures/liteApiDiagnosticGovernorSyntheticV3';

// D-0061: all payloads and clocks invented; no provider/network implementation.
test('LAG01 fixed plan performs exactly 17 stub attempts with nontransferable endpoint budgets',async()=>{
 const f=await liteApiGovernorFixture(),capture=await f.run();assert.equal(capture.mode,'SYNTHETIC_ONLY');
 assert.deepEqual(capture.counts,{SEARCH:1,HOTEL_DETAIL:5,FACILITIES:1,PREBOOK:5,PREBOOK_GET:5,total:17});
 assert.equal(f.calls.length,17);assert.equal(capture.networkEnabled,false);assert.equal(capture.status,'COMPLETE');
 const v=f.verify(capture);assert.equal(v.valid,true);assert.equal(v.externalHttpRequests,0);assert.equal(v.kernelInvocations,0);assert.equal(v.policyInvocations,0);
});
test('LAG02 selection is sealed from exact source bytes before details, not from caller pool',async()=>{
 const f=await liteApiGovernorFixture(),g=f.create();await assert.rejects(g.send(f.detail({hotelId:'SYNTHETIC_HOTEL_0'}),f.transport),/SEARCH_SELECTION_REQUIRED/);
 await g.send(f.search(),f.transport);assert.throws(()=>g.sealSelection([{hotelId:'arbitrary',offerId:'arbitrary'}]),/CALLER_SELECTION_POOL_MISMATCH/);
 const s=g.sealSelection();assert.equal(s.selected.length,5);assert.equal(new Set(s.selected.map((x:any)=>x.hotelId)).size,5);
 assert.equal(s.searchResponseSha256,g.snapshot().requests[0].response.body.sha256);assert.equal(s.meritSelection,false);assert.equal(s.providerOrderUsed,false);
});
test('LAG03 provider order and nonidentity merit fields do not influence sampled IDs',async()=>{
 const a=await liteApiGovernorFixture(),b=await liteApiGovernorFixture();b.pool.data.reverse();
 b.pool.data.forEach((h:any)=>{h.roomTypes.reverse();h.name='Changed synthetic name';h.rating=10;h.price=1;});
 const first=(await a.prime()).selected,second=(await b.prime()).selected;assert.deepEqual(first,second);
});
test('LAG04 original response bytes and original request bytes survive capture and reopen byte-identically',async()=>{
 const f=await liteApiGovernorFixture(),original=JSON.stringify(f.pool),request=f.search().bodyBytes,c=await f.run();
 const reopened=f.verify(JSON.parse(JSON.stringify(c))).capture;
 assert.equal(Buffer.from(reopened.requests[0].response.body.base64,'base64').toString(),original);
 assert.equal(Buffer.from(reopened.requests[0].request.body.base64,'base64').toString(),request);
 assert.deepEqual(f.pool,JSON.parse(original));assert.equal(reopened.captureSha256,c.captureSha256);
});
for(const field of ['branch','head','inventorySha256'])test('LAG05 checkpoint '+field+' mismatch before first stub call',async()=>{
 const f=await liteApiGovernorFixture();(f.checkpoint as any)[field]=field==='branch'?'codex/wrong':field==='head'?'c'.repeat(40):'d'.repeat(64);
 assert.throws(()=>f.create(),/CHECKPOINT_MISMATCH/);assert.equal(f.calls.length,0);
});
test('LAG06 code/checkpoint changed after search rejects further attempts',async()=>{
 const f=await liteApiGovernorFixture(),{g,selected}=await f.prime();f.checkpoint.inventorySha256='c'.repeat(64);
 await assert.rejects(g.send(f.detail(selected[0]),f.transport),/CHECKPOINT_MISMATCH/);assert.equal(f.calls.length,1);
});
test('LAG07 changed scenario or pre-result selection policy cannot silently reseal',async()=>{
 const a=await liteApiGovernorFixture(),ag=a.create();a.scenario.searchRequest.currency='GBP';
 await assert.rejects(ag.send(a.search(),a.transport),/SEALED_INPUT_CHANGED/);assert.equal(a.calls.length,0);
 const b=await liteApiGovernorFixture(),bg=b.create();b.selectionPolicy.seed='ChangedSeed';
 await assert.rejects(bg.send(b.search(),b.transport),/SEALED_INPUT_CHANGED/);assert.equal(b.calls.length,0);
});
for(const attempt of [{host:'evil.invalid'},{host:'api.liteapi.travel:443'},{path:'/v3.0/hotels/rates?key=bad'},{method:'GET'},
 {query:{offset:20}},{retryOrdinal:1},{redirectCount:1},{concurrency:2}])test('LAG08 disallowed intent '+JSON.stringify(attempt)+' never reaches stub',async()=>{
 const f=await liteApiGovernorFixture(),g=f.create();await assert.rejects(g.send({...f.search(),...attempt},f.transport),/LITEAPI_DIAGNOSTIC_/);
 assert.equal(f.calls.length,0);assert.equal(g.snapshot().counts.total,0);
});
test('LAG09 ordinary function or live-shaped transport is not accepted as explicit synthetic stub',async()=>{
 const f=await liteApiGovernorFixture(),g=f.create();await assert.rejects(g.send(f.search(),{mode:'LIVE',request:f.transport.request}),/SYNTHETIC_STUB_REQUIRED/);
 assert.equal(f.calls.length,0);
});
test('LAG10 duplicate search and duplicate selected detail cannot consume unused budgets',async()=>{
 const f=await liteApiGovernorFixture(),{g,selected}=await f.prime();await assert.rejects(g.send(f.search(),f.transport),/DUPLICATE_REQUEST/);
 await g.send(f.detail(selected[0]),f.transport);await assert.rejects(g.send(f.detail(selected[0]),f.transport),/DUPLICATE_REQUEST/);
 assert.equal(g.snapshot().counts.total,2);
});
test('LAG11 unselected sixth hotel and substitute offer are refused',async()=>{
 const f=await liteApiGovernorFixture(),{g,selected}=await f.prime(),other=f.pool.data.find((h:any)=>!selected.some((s:any)=>s.hotelId===h.hotelId))!;
 await assert.rejects(g.send(f.detail(other),f.transport),/HOTEL_NOT_SELECTED/);
 await assert.rejects(g.send(f.prebook({...selected[0],offerId:'UNSELECTED_OFFER'}),f.transport),/OFFER_NOT_SELECTED/);assert.equal(f.calls.length,1);
});
test('LAG12 counter and in-flight reservation precede stub transmission; concurrency remains one',async()=>{
 const f=await liteApiGovernorFixture(),g=f.create();let release:any,seen=0;
 const pending=g.send(f.search(),{mode:'SYNTHETIC_STUB',async request(r:any){seen=g.snapshot().counts.total;assert.equal(r.ordinal,1);
  await new Promise(resolve=>{release=resolve;});return f.transport.request(r);}});
 assert.equal(seen,1);await assert.rejects(g.send(f.search(),f.transport),/CONCURRENCY_PROHIBITED/);assert.throws(()=>g.finish(),/IN_FLIGHT_REQUEST/);
 release();await pending;assert.equal(g.snapshot().counts.total,1);
});
test('LAG13 timeout consumes an attempt; same request cannot be retried and independent hotel can proceed',async()=>{
 const f=await liteApiGovernorFixture(),{g,selected}=await f.prime();const timeout={mode:'SYNTHETIC_STUB',request:async()=>{throw Object.assign(Error('synthetic'),{code:'ETIMEDOUT'});}};
 const r=await g.send(f.detail(selected[0]),timeout);assert.equal(r.state,'FAILED');assert.equal(r.failureClass,'TIMEOUT');assert.equal(g.snapshot().counts.total,2);
 await assert.rejects(g.send(f.detail(selected[0]),f.transport),/DUPLICATE_REQUEST/);await g.send(f.detail(selected[1]),f.transport);
 assert.equal(f.verify(g.finish()).actualStubRequests,3);
});
test('LAG14 search timeout aborts and permits no subsequent call',async()=>{
 const f=await liteApiGovernorFixture(),g=f.create();await g.send(f.search(),{mode:'SYNTHETIC_STUB',request:async()=>{throw Object.assign(Error(),{code:'ETIMEDOUT'});}});
 assert.equal(g.snapshot().status,'ABORTED');assert.throws(()=>g.sealSelection(),/CAPTURE_NOT_OPEN/);
 await assert.rejects(g.send(f.facilities(),f.transport),/CAPTURE_NOT_OPEN/);assert.equal(f.verify(g.finish()).actualStubRequests,1);
});
for(const status of [401,403,302])test('LAG15 fatal provider response '+status+' causes deterministic abort and no later request',async()=>{
 const f=await liteApiGovernorFixture(),{g,selected}=await f.prime();await g.send(f.detail(selected[0]),{mode:'SYNTHETIC_STUB',request:async()=>({status,headers:{'content-type':'application/json'},bodyBytes:'{}'})});
 await assert.rejects(g.send(f.detail(selected[1]),f.transport),/CAPTURE_NOT_OPEN/);assert.equal(f.verify(g.finish()).actualStubRequests,2);
});
test('LAG16 prebook GET needs exact returned id; no inferred id and no repeated polling',async()=>{
 const f=await liteApiGovernorFixture(),{g,selected}=await f.prime(),s=selected[0];
 await assert.rejects(g.send(f.get(s,'invented_wrong'),f.transport),/PREBOOK_ID_NOT_RETURNED/);
 const p=await g.send(f.prebook(s),f.transport),pid=f.m.readSyntheticLiteApiBody(p.response.body).data.prebookId;
 await assert.rejects(g.send(f.get(s,'invented_wrong'),f.transport),/PREBOOK_ID_NOT_RETURNED/);
 await g.send(f.get(s,pid),f.transport);await assert.rejects(g.send(f.get(s,pid),f.transport),/DUPLICATE_REQUEST/);
 assert.equal(f.verify(g.finish()).actualStubRequests,3);
});
test('LAG17 missing prebook id does not trigger a GET or replacement offer',async()=>{
 const f=await liteApiGovernorFixture(),request=f.transport.request;f.transport.request=async r=>r.kind==='PREBOOK'?{status:200,headers:{'content-type':'application/json'},bodyBytes:'{"data":{}}'}:request(r);
 const c=await f.run();assert.equal(c.counts.PREBOOK,5);assert.equal(c.counts.PREBOOK_GET,0);assert.equal(c.counts.total,12);assert.equal(f.verify(c).valid,true);
});
for(const field of ['usePaymentSdk','voucher','margin'])test('LAG18 prohibited prebook extension '+field+' refuses before sending',async()=>{
 const f=await liteApiGovernorFixture(),{g,selected}=await f.prime(),r=f.prebook(selected[0]);r.bodyBytes=JSON.stringify({offerId:selected[0].offerId,usePaymentSdk:false,[field]:field==='usePaymentSdk'?true:'bad'});
 await assert.rejects(g.send(r,f.transport),/LITEAPI_DIAGNOSTIC_/);assert.equal(f.calls.length,1);
});
test('LAG19 eighteenth request is impossible after full capture; all endpoint budgets exhausted individually',async()=>{
 const f=await liteApiGovernorFixture(),g=f.create();await g.send(f.search(),f.transport);const selected=g.sealSelection().selected;
 for(const s of selected)await g.send(f.detail(s),f.transport);await g.send(f.facilities(),f.transport);
 for(const s of selected){const p=await g.send(f.prebook(s),f.transport);await g.send(f.get(s,f.m.readSyntheticLiteApiBody(p.response.body).data.prebookId),f.transport);}
 await assert.rejects(g.send(f.facilities(),f.transport),/DUPLICATE_REQUEST|CAP_EXCEEDED/);assert.equal(f.calls.length,17);assert.equal(f.verify(g.finish()).actualStubRequests,17);
});
test('LAG20 saved capture is immutable evidence, not an executable resume token',async()=>{
 const f=await liteApiGovernorFixture(),capture=await f.run();assert.throws(()=>f.m.createSyntheticLiteApiDiagnosticGovernor({...f.options,previousCapture:capture}),/RESUME_NOT_SUPPORTED/);
 const g=f.create();await g.send(f.search(),f.transport);g.sealSelection();g.finish();await assert.rejects(g.send(f.facilities(),f.transport),/CAPTURE_NOT_OPEN/);
});
test('LAG21 capture tampering, raw tampering and chain tampering cannot pass pure verification',async()=>{
 const f=await liteApiGovernorFixture(),c=await f.run();for(const mutate of[(x:any)=>x.requests[0].response.body.base64='e30=',
  (x:any)=>x.requests[1].previousSha256='0'.repeat(64),(x:any)=>x.selection.selected[0].offerId='wrong',(x:any)=>x.counts.total=1]){
  const changed=structuredClone(c);mutate(changed);assert.throws(()=>f.verify(changed),/CAPTURE_INTEGRITY/);
 }
});
test('LAG22 rehashed capture with altered raw bytes still fails original byte fingerprint',async()=>{
 const f=await liteApiGovernorFixture(),c=await f.run();c.requests[0].response.body.base64='e30=';
 const{captureSha256,...material}=c;c.captureSha256=f.m.hashLiteApiDiagnosticValue(material);
 assert.throws(()=>f.verify(c),/LEDGER_CHAIN|RAW_INTEGRITY/);
});
test('LAG23 complete capture and selection are deterministic for identical inputs and clocks',async()=>{
 const a=await liteApiGovernorFixture(),b=await liteApiGovernorFixture();assert.deepEqual(await a.run(),await b.run());
});
test('LAG24 duplicated inconsistent hotel identity refuses selection and preserves source bytes',async()=>{
 const f=await liteApiGovernorFixture(),g=f.create();f.pool.data.push({...structuredClone(f.pool.data[0]),name:'Contradictory invented identity record'});
 await g.send(f.search(),f.transport);assert.throws(()=>g.sealSelection(),/DUPLICATE_HOTEL_CONFLICT/);assert.equal(g.snapshot().counts.total,1);
 assert.equal(f.m.readSyntheticLiteApiBody(g.snapshot().requests[0].response.body).data.length,8);
});
test('LAG25 selected hotel without unambiguous offer remains in sample and is not replaced',async()=>{
 const f=await liteApiGovernorFixture(),a=await f.prime(),target=a.selected[0].hotelId,g=f.create();
 f.pool.data.find((h:any)=>h.hotelId===target)!.roomTypes=[];await g.send(f.search(),f.transport);const selected=g.sealSelection().selected;
 assert.equal(selected.length,5);assert.equal(selected.find((s:any)=>s.hotelId===target).offerId,null);
 assert.deepEqual(selected.map((s:any)=>s.hotelId),a.selected.map((s:any)=>s.hotelId));
});
test('LAG26 wrong occupancy or multiple component rates never authorize prebook',async()=>{
 const f=await liteApiGovernorFixture();for(const h of f.pool.data)for(const o of h.roomTypes)o.rates[0].occupancy.children=[7,12];
 const c=await f.run();assert.equal(c.counts.SEARCH,1);assert.equal(c.counts.HOTEL_DETAIL,5);assert.equal(c.counts.PREBOOK,0);
 assert.equal(c.selection.selected.length,5);assert.equal(c.selection.selected.every((s:any)=>s.reason==='OFFER_OCCUPANCY_NOT_BINDABLE'),true);
 assert.equal(f.verify(c).valid,true);
 const b=await liteApiGovernorFixture();for(const h of b.pool.data)for(const o of h.roomTypes)o.rates.push(structuredClone(o.rates[0]));
 const bc=await b.run();assert.equal(bc.counts.PREBOOK,0);assert.equal(b.verify(bc).valid,true);
});
test('LAG27 malformed search pool returns abort capture with original source retained',async()=>{
 const f=await liteApiGovernorFixture(),body='{"unexpected":["synthetic"]}';
 f.transport.request=async()=>({status:200,headers:{'content-type':'application/json'},bodyBytes:body});
 const c=await f.run();assert.equal(c.status,'ABORTED');assert.equal(c.abortReason,'LITEAPI_DIAGNOSTIC_SEARCH_POOL_SCHEMA');
 assert.equal(c.counts.total,1);assert.equal(Buffer.from(c.requests[0].response.body.base64,'base64').toString(),body);assert.equal(f.verify(c).valid,true);
});
test('LAG28 invalid JSON prebook abort preserves bytes and cannot cause untracked GET',async()=>{
 const f=await liteApiGovernorFixture(),original=f.transport.request,body='synthetic malformed { response';
 f.transport.request=async r=>r.kind==='PREBOOK'?{status:200,headers:{'content-type':'application/json'},bodyBytes:body}:original(r);
 const c=await f.run(),last=c.requests.at(-1);assert.equal(c.status,'ABORTED');assert.equal(c.counts.PREBOOK,1);assert.equal(c.counts.PREBOOK_GET,0);
 assert.equal(last.failureClass,'RAW_JSON_INVALID');assert.equal(Buffer.from(last.response.body.base64,'base64').toString(),body);
 assert.equal(Buffer.from(last.rejectedResponse.body.base64,'base64').toString(),body);assert.equal(f.verify(c).valid,true);
});
for(const variant of [{status:302,headers:{'content-type':'application/json'},expected:'REDIRECT_RESPONSE'},
 {status:200,headers:{'x-unexpected':'synthetic'},expected:'RESPONSE_HEADER_NOT_ALLOWED'},
 {status:999,headers:{},expected:'RESPONSE_SCHEMA'}])test('LAG29 rejected response '+variant.expected+' retains raw body without accepting semantics',async()=>{
 const f=await liteApiGovernorFixture(),body='{"preserved":"invented source"}';f.transport.request=async()=>({...variant,bodyBytes:body});
 const c=await f.run();assert.equal(c.status,'ABORTED');assert.equal(c.requests[0].response,null);assert.equal(c.requests[0].failureClass,variant.expected);
 assert.equal(Buffer.from(c.requests[0].rejectedResponse.body.base64,'base64').toString(),body);assert.equal(f.verify(c).valid,true);
});
test('LAG30 constructing a governor is not a captured observation or valid final session',async()=>{
 const f=await liteApiGovernorFixture(),g=f.create();assert.throws(()=>g.finish(),/NO_CAPTURED_ATTEMPT/);assert.throws(()=>f.verify(g.snapshot()),/CAPTURE_SCHEMA/);
 assert.equal(f.calls.length,0);assert.equal(g.snapshot().counts.total,0);
});
test('LAG31 missing optional occupancy echo retains only documented slot/request linkage',async()=>{
 const f=await liteApiGovernorFixture();for(const h of f.pool.data)for(const o of h.roomTypes){delete (o.rates[0] as any).children;delete (o.rates[0] as any).occupancy;}
 const c=await f.run();assert.equal(c.counts.total,17);assert.equal(f.verify(c).valid,true);
 for(const h of f.m.readSyntheticLiteApiBody(c.requests[0].response.body).data)for(const o of h.roomTypes){
  assert.equal(Object.hasOwn(o.rates[0],'children'),false);assert.equal(Object.hasOwn(o.rates[0],'occupancy'),false);
 }
});
test('LAG32 missing occupancy counts does not authorize prebook despite one numeric slot',async()=>{
 const f=await liteApiGovernorFixture();for(const h of f.pool.data)for(const o of h.roomTypes)delete (o.rates[0] as any).childCount;
 const c=await f.run();assert.equal(c.counts.PREBOOK,0);assert.equal(c.selection.selected.length,5);assert.equal(f.verify(c).valid,true);
});
