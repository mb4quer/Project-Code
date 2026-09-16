/** Deterministic DOM contracts. These checks are educational and client-visible. */
export function ecommerceAssessmentBody(assessmentId: string): string | undefined {
  if (!/^shop-.*-(guided-[12]|apply|debug|combine)$/.test(assessmentId)) return undefined;
  const topic = assessmentId.replace(/-(guided-[12]|apply|debug|combine)$/, '');
  const full = !/-(guided-1|apply)$/.test(assessmentId);
  const shared = String.raw`
const assert=(ok,message)=>{if(!ok)throw new Error(message)};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const eventually=async(check,message)=>{for(let i=0;i<180;i++){if(check())return;await wait(4)}throw new Error(message)};
const $=selector=>document.querySelector(selector), all=selector=>Array.from(document.querySelectorAll(selector)), text=node=>node?.textContent||'';
const visible=node=>Boolean(node&&!node.closest('[hidden]'));
const click=selector=>{const node=$(selector);assert(node,'Missing '+selector);assert(!node.disabled,'Disabled '+selector);node.click()};
const input=(selector,value,type='input')=>{const node=$(selector);assert(node,'Missing '+selector);node.value=value;node.dispatchEvent(new Event(type,{bubbles:true}))};
const navigate=async(hash)=>{location.hash=hash;window.dispatchEvent(new HashChangeEvent('hashchange'));await wait(8)};
const cards=()=>all('#catalog-grid [data-product-id]');
const ids=()=>cards().map(node=>node.dataset.productId);
const rows=()=>all('#cart-list [data-cart-row]');
const quantity=id=>Number($('[data-cart-quantity="'+id+'"]')?.value||0);
const snapshot=()=>rows().map(row=>[row.dataset.cartRow,quantity(row.dataset.cartRow)]);
const saved=()=>JSON.parse(globalThis.__gradeStorage.value||'{"version":1,"items":[]}');
const ready=async()=>eventually(()=>all('[data-cart-add]').some(node=>!node.disabled),'Finish guarded restore before enabling cart edits.');
const settled=async()=>{await wait(60)};
const submit=()=>{const event=new Event('submit',{bubbles:true,cancelable:true});$('#checkout-form').dispatchEvent(event);assert(event.defaultPrevented,'Prevent checkout navigation.');};
const live=selector=>{assert($(selector)?.getAttribute('aria-live')==='polite','Announce changes in '+selector)};
`;
  let body: string;
  if(topic==='shop-scope-catalog-and-originality') body=String.raw`
for(const word of ['browse','detail','search','filter','cart','checkout'])assert(text($('#shop-scope')).toLowerCase().includes(word),'Describe '+word+' in the shopper scope.');
assert(/Cedar.{0,8}Thread/.test(text($('#catalog-identity'))),'Name the original Cedar & Thread identity.');
for(const word of ['original','local','simulat'])assert(text($('#originality-boundary')).toLowerCase().includes(word),'Explain original local fixtures and simulated checkout.');
`+(full?String.raw`
for(const word of ['catalog','detail','cart','checkout'])assert(text($('#flow-map')).toLowerCase().includes(word),'Map the complete shopper flow.');
for(const word of ['branding','assets','accounts','server','payment','personal'])assert(text($('#scope-exclusions')).toLowerCase().includes(word),'Explicitly exclude '+word+' from this local milestone.');
assert(!/amazon/i.test(text(#shop-app)),'Use original storefront branding.');
`: '');
  else if(topic==='shop-stack-data-and-route-plan') body=String.raw`
const stack=text($('#shop-stack-plan'));assert(/plain javascript/i.test(stack)&&/vite react/i.test(stack)&&/full.stack/i.test(stack)&&/vanilla modules/i.test(stack),'Compare three stacks and choose vanilla modules.');
assert(/local.*fixture/i.test(text($('#data-plan'))),'Plan deterministic local product data.');
`+(full?String.raw`
for(const route of ['#/catalog','#/product/:id','#/cart','#/checkout'])assert(text($('#route-plan')).includes(route),'Map '+route+'.');
for(const word of ['server','database','inventory','auth','payment'])assert(text($('#boundary-plan')).toLowerCase().includes(word),'Explain future '+word+' responsibility.');
for(const name of ['index.html','styles.css','main.js','catalog.js','cartStorage.js'])assert(text($('#file-plan')).includes(name),'Assign a responsibility to '+name+'.');
`: '');
  else if(topic==='shop-setup-navigation-and-catalog') body=String.raw`
assert($('main#shop-app')&&$('#shop-nav a[href="#/catalog"]'),'Provide a main landmark and real catalog navigation.');
await eventually(()=>cards().length===4,'Render all four fixtures.');assert(new Set(ids()).size===4,'Keep card IDs unique.');
assert(/Cedar.{0,8}Thread/.test(text($('h1'))),'Use the original brand heading.');
`+(full?String.raw`
const expected=[['ember-mug','24.00'],['field-notebook','12.00'],['cedar-throw','68.00'],['brass-lamp','84.00']];
for(const [id,price] of expected){const card=$('[data-product-id="'+id+'"]');assert(text(card).includes(price),'Format the declared cents price for '+id);assert(card.querySelector('a[href="#/product/'+id+'"]'),'Give each product a named detail link.');}
assert(text($('[data-product-id="cedar-throw"]')).includes('<strong>literal</strong>')&&!$('[data-product-id="cedar-throw"] strong'),'Render fixture descriptions literally.');live('#results-status');assert(/4/.test(text($('#results-status'))),'Announce the catalog count.');
`: '');
  else if(topic==='shop-product-details-and-client-server-boundaries') body=String.raw`
await navigate('#/product/ember-mug');assert(visible($('#product-detail'))&&$('[data-product-detail="ember-mug"]')&&/Ember Mug/.test(text($('#product-detail'))),'Route to the matching Ember Mug detail.');
`+(full?String.raw`
assert(!visible($('#catalog-grid')),'A product route must show its view instead of the catalog.');
await navigate('#/product/cedar-throw');assert(text($('#product-detail')).includes('<strong>literal</strong>')&&!$('#product-detail strong'),'Render the selected literal description without parsing it.');assert(text($('#product-detail')).includes('68.00'),'Detail agrees with catalog price.');
await navigate('#/product/nope');assert(visible($('#product-not-found'))&&document.querySelector('a[href="#/catalog"]'),'Unknown product provides a catalog recovery path.');
await navigate('#/unrecognised');assert(/not found|unknown route/i.test(text(document.body)),'Unknown routes need explicit recovery.');await navigate('#/catalog');assert(visible($('#catalog-grid'))&&cards().length===4,'Return to the complete catalog.');
for(const word of ['local','server','api','database','authentication','authorization'])assert(text(#client-server-boundary).toLowerCase().includes(word),'Explain the '+word+' boundary.');
`: '');
  else if(topic==='shop-product-search-and-filters') body=String.raw`
await navigate('#/catalog');input('#shop-search','  MuG  ');assert(ids().join()==='ember-mug','Trim and case-fold the name query.');input('#shop-search','no-such-product');assert(cards().length===0&&/no.*match/i.test(text($('#empty-results'))),'Distinguish an empty search projection.');input('#shop-search','');assert(cards().length===4,'Clearing query restores the source catalog.');
`+(full?String.raw`
input('#category-filter','textile','change');input('#price-filter','25','change');assert(cards().length===0,'Category and maximum-price predicates intersect.');input('#price-filter','70','change');assert(ids().join()==='cedar-throw','Compare numeric cents at the selected price boundary.');input('#shop-search','mug');assert(cards().length===0,'Query intersects with both filters.');input('#shop-search','');input('#category-filter','all','change');input('#price-filter','25','change');assert(ids().join()==='ember-mug,field-notebook','Maximum price returns the deterministic affordable subset.');input('#price-filter','all','change');assert(ids().join()==='ember-mug,field-notebook,cedar-throw,brass-lamp','Filters never mutate the source catalog.');live('#results-status');assert(/4/.test(text($('#results-status'))),'Count the visible projection.');for(const id of ['shop-search','category-filter','price-filter'])assert($('#'+id).labels?.length,'Label '+id+'.');
`: '');
  else if(topic==='shop-cart-quantity-and-persistence') body=String.raw`
const mode=globalThis.__gradeStorage.mode, before=globalThis.__gradeStorage.value;
await navigate('#/catalog');live('#cart-status');
`+(full?String.raw`
if(/malformed|invalid|duplicate|read-failure/.test(mode)){
 await eventually(()=>visible($('#recover-cart'))||visible($('#retry-cart')),'Provide explicit saved-cart recovery.');await settled();assert(globalThis.__gradeStorage.value===before,'Preserve unreadable saved data before recovery.');assert(all('[data-cart-add]').every(node=>node.disabled),'Block edits while restore has failed.');
 input('#shop-search','mug');assert(all('[data-cart-add]').every(node=>node.disabled),'Rerender cannot bypass failed restore.');input('#shop-search','');click('#recover-cart');await ready();await settled();assert(saved().items.length===0,'Explicit recovery saves the empty envelope.');
}else{
 await ready();
 if(mode==='valid'||mode==='reload'){const old=JSON.parse(before);for(const row of old.items)assert(quantity(row.productId)===row.quantity,'Restore each exact saved identity and quantity before edits.');}
 const initial=quantity('field-notebook');click('#catalog-grid [data-cart-add="field-notebook"]');await settled();assert(quantity('field-notebook')===initial+1,'An addition retains prior records.');
 if(mode==='save-failure'){assert(/could not save|not saved/i.test(text($('#cart-status'))),'Report rejected saves honestly.');assert(globalThis.__gradeStorage.value===before,'Failed writes retain the prior saved record.');assert(quantity('field-notebook')===initial+1,'Keep unsaved edits visible on failure.');}
 else {
  click('#catalog-grid [data-cart-add="field-notebook"]');click('#catalog-grid [data-cart-add="field-notebook"]');await settled();assert(quantity('field-notebook')===initial+3,'Rapid additions compose by stable identity.');assert(saved().items.find(row=>row.productId==='field-notebook').quantity===initial+3,'Ordered writes persist the latest snapshot.');
  await navigate('#/cart');input('[data-cart-quantity="field-notebook"]','2','change');await settled();
  for(const bad of ['0','1.5','9']){input('[data-cart-quantity="field-notebook"]',bad,'change');await settled();assert(quantity('field-notebook')===2,'Reject invalid quantities without changing cart state.');}
  assert(rows().filter(row=>row.dataset.cartRow==='field-notebook').length===1,'Repeated adds merge into one line.');
  const expected=rows().reduce((sum,row)=>sum+({'ember-mug':2400,'field-notebook':1200,'cedar-throw':6800,'brass-lamp':8400}[row.dataset.cartRow])*quantity(row.dataset.cartRow),0);assert(text($('#cart-total')).includes((expected/100).toFixed(2)),'Derive total cents from current lines.');
  const other=rows().filter(row=>row.dataset.cartRow!=='field-notebook').map(row=>row.dataset.cartRow);click('[data-cart-remove="field-notebook"]');await settled();assert(quantity('field-notebook')===0&&other.every(id=>quantity(id)>0),'Remove only the selected line.');
  await navigate('#/catalog');click('#catalog-grid [data-cart-add="field-notebook"]');await settled();assert(saved().version===1&&saved().items.some(row=>row.productId==='field-notebook'),'Persist a versioned final snapshot for the reload check.');
 }
}
`:String.raw`
await ready();const previous=quantity('field-notebook');click('#catalog-grid [data-cart-add="field-notebook"]');await settled();assert(quantity('field-notebook')===previous+1,'Add a stable cart line.');await navigate('#/cart');input('[data-cart-quantity="field-notebook"]','2','change');await settled();assert(quantity('field-notebook')===2,'Change the selected quantity.');assert(text($('#cart-total')).includes('.00'),'Format a derived total.');click('[data-cart-remove="field-notebook"]');await settled();assert(quantity('field-notebook')===0,'Remove a selected cart line.');
`);
  else if(topic==='shop-checkout-validation-and-failure-states') body=String.raw`
await ready();await navigate('#/checkout');const before=globalThis.__gradeStorage.value;const original=JSON.stringify(snapshot());
assert(all('#checkout-form input').every(n=>n.type==='checkbox')&&!$('#checkout-form textarea'),'Collect no personal, password or payment text.');live('#checkout-status');submit();await wait(10);assert(!text($('#checkout-confirmation'))&&/choose|consent|simulation/i.test(text($('#checkout-status'))),'Reject missing delivery and consent.');assert(JSON.stringify(snapshot())===original,'Invalid input retains the cart.');
`+(full?String.raw`
$('#checkout-delivery').value='pickup-demo';$('#checkout-consent').checked=true;$('#checkout-outcome').value='decline';submit();assert(/checking|pending|simulat/i.test(text($('#checkout-status')))&&!text($('#checkout-confirmation')),'Announce pending without early confirmation.');assert($('#checkout-submit').disabled,'Block repeated submit while pending.');submit();await eventually(()=>/declined/i.test(text($('#checkout-status'))),'Decline is a recoverable outcome.');assert(JSON.stringify(snapshot())===original&&globalThis.__gradeStorage.value===before,'Decline preserves visible and saved cart.');
globalThis.__gradeStorage.failWrites=true;$('#checkout-outcome').value='success';submit();await eventually(()=>/could not|failed|not saved/i.test(text($('#checkout-status'))),'A rejected clear cannot confirm an order.');assert(!text($('#checkout-confirmation'))&&JSON.stringify(snapshot())===original&&globalThis.__gradeStorage.value===before,'Failed clear retains cart and saved data.');
globalThis.__gradeStorage.failWrites=false;submit();await eventually(()=>/confirmed/i.test(text($('#checkout-confirmation'))),'Retry confirms only after successful simulation and save.');assert(rows().length===0&&saved().items.length===0,'Successful simulated checkout clears saved cart.');submit();await wait(15);assert(/empty|add.*item|cart/i.test(text($('#checkout-status'))),'An empty cart cannot checkout again.');assert(!text($('#checkout-confirmation')),'Invalid next attempt clears stale confirmation.');
`: '');
  else if(topic==='shop-testing-export-and-handoff') body=String.raw`
await ready();await settled();await navigate('#/catalog');input('#shop-search','mug');const before=globalThis.__gradeStorage.value, cartBefore=JSON.stringify(snapshot());let adds=0,changes=0,submits=0;
document.addEventListener('click',event=>{if(event.target.closest?.('[data-cart-add]'))adds++},true);document.addEventListener('change',event=>{if(event.target.matches?.('[data-cart-quantity]'))changes++},true);$('#checkout-form').addEventListener('submit',()=>submits++);
click('#run-shop-smoke');await eventually(()=>/passed|failed/i.test(text($('#shop-smoke-status'))),'Smoke reports only after checking and cleaning up.');assert(/passed/i.test(text($('#shop-smoke-status'))),'The reference smoke flow passes.');assert(adds>0&&changes>0&&submits>0,'Smoke must exercise real add, quantity and checkout events.');assert(globalThis.__gradeStorage.value===before&&JSON.stringify(snapshot())===cartBefore&&$('#shop-search').value==='mug'&&location.hash==='#/catalog','Smoke restores prior saved cart, visible cart, query and route.');
`+(full?String.raw`
for(const term of ['index.html','source','http.server','export again'])assert(text($('#shop-export-handoff')).includes(term),'Explain '+term+' in the export handoff.');
$('#shop-smoke-status').textContent='';click('#run-shop-smoke');await eventually(()=>/passed|failed/i.test(text($('#shop-smoke-status'))),'A second smoke run finishes.');assert(/passed/i.test(text($('#shop-smoke-status')))&&globalThis.__gradeStorage.value===before,'Repeat smoke preserves the exact raw saved snapshot.');
const originalGet=trainingStorage.getItem;trainingStorage.getItem=async()=>{throw Error('snapshot failure')};const writes=globalThis.__gradeStorage.events.filter(e=>e==='set'||e==='remove').length;$('#shop-smoke-status').textContent='';click('#run-shop-smoke');await eventually(()=>/failed/i.test(text($('#shop-smoke-status'))),'Failed snapshot read reports failure.');assert(globalThis.__gradeStorage.events.filter(e=>e==='set'||e==='remove').length===writes&&globalThis.__gradeStorage.value===before,'Failed initial read must never overwrite or remove saved data.');trainingStorage.getItem=originalGet;
// Break an actual DOM add at the event boundary; a real smoke assertion must detect it.
const block=event=>{if(event.target.closest?.('[data-cart-add]'))event.stopImmediatePropagation()};document.addEventListener('click',block,true);$('#shop-smoke-status').textContent='';click('#run-shop-smoke');await eventually(()=>/passed|failed/i.test(text($('#shop-smoke-status'))),'Broken interaction smoke finishes.');document.removeEventListener('click',block,true);assert(/failed/i.test(text($('#shop-smoke-status'))),'Smoke detects a broken add instead of printing success.');assert(globalThis.__gradeStorage.value===before,'Failure cleanup preserves the saved snapshot.');
`: '')+(assessmentId.endsWith('-combine')?String.raw`
input('#shop-search','');const savedCart=JSON.stringify(snapshot());click('[data-wishlist-toggle="ember-mug"]');click('[data-wishlist-toggle="field-notebook"]');assert(text($('#wishlist-count')).trim()==='2','Wishlist adds distinct stable IDs.');click('[data-wishlist-toggle="ember-mug"]');assert(text($('#wishlist-count')).trim()==='1','Wishlist toggles only one product.');input('#shop-search','notebook');assert(/remove/i.test(text($('[data-wishlist-toggle="field-notebook"]'))),'Membership survives filtering by stable ID.');click('[data-wishlist-toggle="field-notebook"]');assert(text($('#wishlist-count')).trim()==='0'&&/empty|no.*wish/i.test(text($('#wishlist-status'))),'Wishlist restores its empty state.');assert(JSON.stringify(snapshot())===savedCart&&/memory|reload|session/i.test(text($('#wishlist-status'))),'Wishlist is in-memory and independent of the cart.');
`: '');
  else body="throw new Error('Unknown ecommerce assessment')";
  return shared + body;
}
export const isEcommerceAssessment=(id:string)=>/^shop-.*-(guided-[12]|apply|debug|combine)$/.test(id);
export const ecommerceAssessmentNeedsStorage=(id:string)=>/^shop-(cart-quantity-and-persistence|checkout-validation-and-failure-states|testing-export-and-handoff)-/.test(id);
export default ecommerceAssessmentBody;
