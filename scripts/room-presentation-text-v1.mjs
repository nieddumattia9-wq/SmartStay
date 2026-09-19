// Pure bounded presentation interpretation: no DOM, script execution, CSS,
// network or HTML rendering. Original bytes/spans remain the evidence.
export const ROOM_PRESENTATION_VERSION='stayopti.room-presentation-text@1';
const MAX_TEXT_LENGTH=262144,MAX_TAG_LENGTH=4096;
const inline=new Set(['b','strong','em','i','u','span','small','a','code','sup','sub']);
const block=new Set(['p','div','ul','ol','li','section','article','h1','h2','h3','h4','h5','h6','dl','dt','dd']);
const voids=new Set(['br','hr']);
const named=new Map(Object.entries({nbsp:' ',amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',ndash:'–',mdash:'—'}));
const attributes=/^(?:\s+[A-Za-z_:][\w:.-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?\s*$/;
function tagAt(text,start){
 let quote=null;
 for(let i=start+1;i<Math.min(text.length,start+MAX_TAG_LENGTH);i++){
  const char=text[i];if(quote){if(char===quote)quote=null;continue;}
  if(char==='"'||char==="'"){quote=char;continue;}
  if(char==='<')return null;
  if(char==='>')return {end:i+1,raw:text.slice(start,i+1)};
 }return null;
}
function entity(text,start){
 const m=/^&(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+);/i.exec(text.slice(start));
 if(!m)return null;
 const key=m[0].slice(1,-1),numeric=key[0]==='#';let decoded;
 if(numeric){const hex=/^#x/i.test(key),n=Number.parseInt(key.slice(hex?2:1),hex?16:10);
  if(n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)&&!(n<32&&!['9','10','13'].includes(String(n))))decoded=String.fromCodePoint(n);
 }else decoded=named.get(key.toLowerCase());
 return {end:start+m[0].length,decoded:decoded??m[0],supported:decoded!==undefined};
}

/** Common balanced presentation tags/attributes are inert separators only.
 * Unknown/malformed/active markup is explicit uncertainty, not silently erased.
 * CSS is never used to hide evidence. Even styled hidden text is retained.
 * UTF-16 spans reference the original, not decoded output. */
export function interpretRoomPresentation(value){
 const originalText=typeof value==='string'?value:null,fragments=[],issues=[],stack=[];
 const result={version:ROOM_PRESENTATION_VERSION,originalText,fragments,issues,
  text:null,supported:false,executedMarkup:false,attributesUsedAsFacts:false,visibilityCertified:false,
  limits:{maximumTextLength:MAX_TEXT_LENGTH,maximumTagLength:MAX_TAG_LENGTH,unsupportedContentRetained:true}};
 if(originalText===null){issues.push('NOT_TEXT');return result;}
 if(value.length>MAX_TEXT_LENGTH){issues.push('PRESENTATION_LENGTH_EXCEEDS_BOUND');return result;}
 const hasMarkup=/<\/?[a-z!]/i.test(value);
 let text='',start=0,last=0;
 const flush=end=>{const interpreted=text.replace(/\s+/g,' ').trim().replace(/;$/,'').trim();if(interpreted)fragments.push({start,end,originalFragment:value.slice(start,end),text:interpreted,unsupportedMarkup:false});text='';start=end;};
 for(let i=0;i<value.length;){
  const c=value[i];
  if(c==='<'&&/^<\/?[a-z!]/i.test(value.slice(i))){
   const token=tagAt(value,i),match=token&&/^<(\/?)([a-z][a-z0-9-]*)([\s\S]*)>$/i.exec(token.raw);
   if(!match){issues.push('MALFORMED_OR_UNSUPPORTED_MARKUP');text+=c;i++;last=i;continue;}
   const [,closing,name,attrs]=match,tag=name.toLowerCase(),selfClosing=/\/\s*$/.test(attrs);
   const known=inline.has(tag)||block.has(tag)||voids.has(tag);
   if(!known||!attributes.test(attrs)||closing&&attrs.trim()||/\s(?:on[\w-]+)\s*=/i.test(attrs)){
    issues.push('UNSUPPORTED_MARKUP:'+tag);text+=token.raw;i=token.end;last=i;continue;
   }
   if(closing){if(stack.at(-1)!==tag)issues.push('UNBALANCED_MARKUP:'+tag);else stack.pop();}
   else if(!voids.has(tag)&&!selfClosing)stack.push(tag);
   else if(selfClosing&&!voids.has(tag))issues.push('UNSUPPORTED_SELF_CLOSING_MARKUP:'+tag);
   if(block.has(tag)||voids.has(tag)){flush(i);start=token.end;}
   i=token.end;last=i;continue;
  }
  const decoded=c==='&'?entity(value,i):null;
  if(decoded){if(!decoded.supported)issues.push('UNSUPPORTED_ENTITY');text+=decoded.decoded;i=decoded.end;last=i;continue;}
  text+=c;i++;last=i;
  if(c===';'||!hasMarkup&&/[\r\n]/.test(c)||/[.!?]/.test(c)&&(/\s|$/.test(value[i]??'')||value[i]==='<'))flush(i);
 }
 flush(last);if(stack.length)issues.push('UNCLOSED_MARKUP:'+stack.join(','));
 result.issues=[...new Set(issues)];result.supported=!result.issues.length;
 if(!result.supported)for(const fragment of fragments)fragment.unsupportedMarkup=true;
 result.text=fragments.map(f=>f.text).join('; ');
 return result;
}
