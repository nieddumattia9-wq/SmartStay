// Raw HTTPS primitive shared by bounded evaluation acquisition profiles.
// Callers validate operation allowlists and durably reserve BEFORE invoking.
// No redirects, retries, proxy, caller headers or arbitrary live transport injection.
import http from 'node:http';
import https from 'node:https';
import {canonical} from './liteapi-controlled-plan-v1.mjs';
export function sendBoundedAcquisitionHttp(request,{credential,loopbackPort,timeoutMs,signal}){
 return new Promise((resolve,reject)=>{
  let received=null;const chunks=[];
  const rejectWithPartial=error=>{if(received)error.partialResponse={...received,bodyBytes:Buffer.concat(chunks)};reject(error);};
  const synthetic=Number.isInteger(loopbackPort),query=new URLSearchParams(request.query).toString();
  const bytes=request.body===null?null:Buffer.from(canonical(request.body));
  const headers={'accept':'application/json',...(bytes?{'content-type':'application/json','content-length':bytes.length}:{})};
  if(!synthetic)headers['X-API-Key']=credential;
  const req=(synthetic?http:https).request({hostname:synthetic?'127.0.0.1':request.host,port:synthetic?loopbackPort:443,
   method:request.method,path:request.path+(query?'?'+query:''),headers,agent:false,rejectUnauthorized:true},res=>{
   received={status:res.statusCode,headers:Object.fromEntries(Object.entries(res.headers).filter(([k])=>['content-type','date'].includes(k)))};
   let n=0;res.on('data',b=>{chunks.push(b);n+=b.length;if(n>32*1024*1024){req.destroy(Object.assign(Error('RESPONSE_TOO_LARGE'),{code:'RESPONSE_TOO_LARGE'}));return;}});
   res.on('end',()=>resolve({status:res.statusCode,headers:Object.fromEntries(Object.entries(res.headers).filter(([k])=>['content-type','date'].includes(k))),bodyBytes:Buffer.concat(chunks)}));
   res.on('error',rejectWithPartial);
  });
  const timer=setTimeout(()=>req.destroy(Object.assign(Error('TIMEOUT'),{code:'ETIMEDOUT'})),timeoutMs);
  const abort=()=>req.destroy(Object.assign(Error('INTERRUPTED'),{code:'ABORTED'}));signal?.addEventListener('abort',abort,{once:true});
  req.on('error',rejectWithPartial);req.on('close',()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);});
  if(bytes)req.write(bytes);req.end();
 });
}
