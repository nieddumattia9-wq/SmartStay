import {frozenStaySuitabilityCases} from './staySuitabilitySyntheticV3';

// R1 cases are new, synthetic derivatives. The original D-0047 fixture is immutable.
export function privacyNegationInput(text:string, genericFeatures:string[]=[]) {
  const input=structuredClone(frozenStaySuitabilityCases().find(c=>c.id==='bath-unknown-required')!.input);
  input.caseId='SYNTHETIC_D0047_R1_PRIVACY';
  const hotel=input.search.hotels[0];hotel.amenities=[...genericFeatures];hotel.facilities=[];
  hotel.offers[0].roomName=text;
  return input;
}

export const PRIVACY_NEGATION_CASES = [
  {id:'reported-without-article',text:'Private room without a private bathroom',unit:'PRIVATE',bath:'NOT_PRIVATE'},
  {id:'reported-no-ensuite',text:'Double room with no en suite bathroom',unit:'UNKNOWN',bath:'NOT_PRIVATE'},
  {id:'reported-postposed',text:'Private bathroom not available',unit:'UNKNOWN',bath:'NOT_PRIVATE'},
  {id:'reported-no-room',text:'No private room',unit:'NOT_PRIVATE',bath:'UNKNOWN'},
  {id:'article-the',text:'Private room without the private bathroom',unit:'PRIVATE',bath:'NOT_PRIVATE'},
  {id:'article-an',text:'Private room without an en-suite bathroom',unit:'PRIVATE',bath:'NOT_PRIVATE'},
  {id:'postposed-is-not',text:'Private room, private bathroom is not available',unit:'PRIVATE',bath:'NOT_PRIVATE'},
  {id:'postposed-room',text:'Private room is not available; private bathroom',unit:'NOT_PRIVATE',bath:'PRIVATE'},
  {id:'italian',text:'Camera privata senza un bagno privato',unit:'PRIVATE',bath:'NOT_PRIVATE'},
  {id:'italian-postposed',text:'Camera privata; bagno privato non disponibile',unit:'PRIVATE',bath:'NOT_PRIVATE'},
  {id:'italian-no-room',text:'Nessuna camera privata; bagno privato',unit:'NOT_PRIVATE',bath:'PRIVATE'},
  {id:'non-private',text:'Non-private room; non-private bathroom',unit:'NOT_PRIVATE',bath:'NOT_PRIVATE'},
  {id:'shared-bath',text:'Private room with shared bathroom',unit:'PRIVATE',bath:'SHARED'},
  {id:'shared-and-denial',text:'Private room, no private bathroom, shared bathroom',unit:'PRIVATE',bath:'SHARED'},
  {id:'positive',text:'Private room with a private bathroom',unit:'PRIVATE',bath:'PRIVATE'},
  {id:'unrelated-breakfast',text:'Private room, no breakfast; private bathroom',unit:'PRIVATE',bath:'PRIVATE'},
  {id:'unrelated-parking',text:'No parking; private room with private bathroom',unit:'PRIVATE',bath:'PRIVATE'},
  {id:'unknown-bath',text:'Private room, bathroom not documented',unit:'PRIVATE',bath:'UNKNOWN'},
  {id:'unknown-all',text:'Room details unavailable',unit:'UNKNOWN',bath:'UNKNOWN'},
  {id:'conflicting-bath',text:'Private room; private bathroom and shared bathroom',unit:'PRIVATE',bath:'CONFLICTING'},
  {id:'conflicting-polarity',text:'Private room; private bathroom; private bathroom not available',unit:'PRIVATE',bath:'CONFLICTING'},
  {id:'conflicting-room',text:'Private room and shared room; private bathroom',unit:'CONFLICTING',bath:'PRIVATE'},
  {id:'conditional-bath',text:'Private room; private bathroom on request',unit:'PRIVATE',bath:'UNKNOWN'},
  {id:'uncertain-room',text:'Private room not guaranteed; private bathroom',unit:'UNKNOWN',bath:'PRIVATE'},
  {id:'uncertain-bath',text:'Private room; private bathroom availability unknown',unit:'PRIVATE',bath:'UNKNOWN'},
  {id:'no-shared-not-positive',text:'No shared room; no shared bathroom',unit:'UNKNOWN',bath:'UNKNOWN'},
] as const;
