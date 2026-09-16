import type { Files } from '../contracts';

const ids = ['shop-scope-catalog-and-originality','shop-stack-data-and-route-plan','shop-setup-navigation-and-catalog','shop-product-details-and-client-server-boundaries','shop-product-search-and-filters','shop-cart-quantity-and-persistence','shop-checkout-validation-and-failure-states','shop-testing-export-and-handoff'];
const products = `export const products = [
  {id:'ember-mug',name:'Ember Mug',category:'table',priceCents:2400,stock:4,description:'A hand-glazed cedar-red mug for slow mornings.'},
  {id:'field-notebook',name:'Field Notebook',category:'paper',priceCents:1200,stock:8,description:'A cloth-bound notebook made for sketches and lists.'},
  {id:'cedar-throw',name:'Cedar Throw',category:'textile',priceCents:6800,stock:2,description:'A soft woven throw with a <strong>literal</strong> woodland stripe.'},
  {id:'brass-lamp',name:'Brass Reading Lamp',category:'home',priceCents:8400,stock:1,description:'A compact lamp for a bedside or reading corner.'}
];`;
const css = `:root{font-family:system-ui,sans-serif;color:#253c32;background:#f4f1e8;line-height:1.5}*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0}main{max-width:64rem;margin:auto;padding:clamp(1rem,4vw,3rem)}h1{font-family:Georgia,serif;font-size:clamp(2rem,5vw,3rem);line-height:1.1}h2{line-height:1.2}a{color:#175b4b}nav,.controls,.actions{display:flex;gap:.8rem;flex-wrap:wrap;margin-block:1rem}nav a{padding:.5rem}button,input,select{font:inherit;max-width:100%;padding:.6rem;border:1px solid #789183;border-radius:.25rem}button{cursor:pointer;background:#e2ede4;color:#183c2b}button:disabled{opacity:.6;cursor:wait}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #a65a20;outline-offset:3px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr));gap:1rem}.card{background:#fffef9;border:1px solid #c9d2c7;border-radius:.6rem;padding:1rem;min-width:0;overflow-wrap:anywhere}.card .category{text-transform:uppercase;font-size:.8rem;color:#466452}.price{font-weight:bold}label{display:block}form{display:grid;gap:1rem;max-width:34rem}#cart-list{padding:0;list-style:none}#cart-list li{display:flex;align-items:center;flex-wrap:wrap;gap:.6rem;padding:.8rem 0;border-bottom:1px solid #c9d2c7}#cart-list input{width:5rem}.note,details{font-size:.9rem;color:#40584a;margin-block:1rem}#cart-status,#checkout-status,#shop-smoke-status{min-height:1.5em}#product-detail{max-width:42rem}.controls label{min-width:0}summary{cursor:pointer}footer{border-top:1px solid #c9d2c7;margin-top:2rem;padding-top:1rem}`;
const scope = `<p id="shop-scope">Browse an original catalog, inspect product detail, search and filter, manage a cart and try simulated checkout.</p><p id="catalog-identity">Cedar &amp; Thread is an original home and stationery shop.</p><p id="originality-boundary">Original local fixtures and simulated checkout define this demonstration.</p><ol id="flow-map"><li>Catalog</li><li>Detail</li><li>Cart</li><li>Checkout</li></ol><p id="scope-exclusions">No copied marketplace branding or assets, accounts, server fulfillment, real payment collection or personal data.</p>`;
const stack = `<p id="shop-stack-plan">Plain JavaScript has a small setup; Vite React adds component/build conventions; a full-stack framework adds server conventions. We choose vanilla modules for this local store.</p><p id="data-plan">A deterministic local product fixture owns prices and names; cart lines own productId and quantity.</p><ul id="route-plan"><li>#/catalog</li><li>#/product/:id</li><li>#/cart</li><li>#/checkout</li></ul><p id="file-plan">index.html: semantic shell; styles.css: layout; main.js: events and rendering; catalog.js: local fixtures; cartStorage.js: later async serialization.</p><p id="boundary-plan">A future server owns database records, inventory, authentication, authorization and payments. Browser fixtures and storage are local and editable.</p>`;
const boundary = `<p id="client-server-boundary" class="note">Local fixture lookup is a simulation, not a deployed API. A server would enforce authoritative prices, inventory and authorization; a database would store durable records. Authentication identifies a caller; authorization permits an action. No account, payment or fulfillment service exists here.</p>`;
function html(stage:number,basic:boolean):string {
  let body = '<h1>Cedar &amp; Thread</h1><p>Considered goods for everyday rituals. Original local learning fixtures.</p>';
  if(stage===1) body += basic ? scope.replace(/<ol id="flow-map">[\s\S]*$/, '') : scope;
  else if(stage===2) body += basic ? stack.replace(/<ul id="route-plan">[\s\S]*$/, '') : scope+stack;
  else {
    body += '<nav id="shop-nav" aria-label="Shop navigation"><a data-route="catalog" href="#/catalog">Catalog</a>'+(stage>=6?'<a data-route="cart" href="#/cart">Cart (<span id="cart-count">0</span>)</a>':'')+(stage>=7?'<a data-route="checkout" href="#/checkout">Simulated checkout</a>':'')+'</nav>';
    body += '<section id="catalog-panel">';
    if(stage>=5) body += '<div class="controls"><label>Search products <input id="shop-search" type="search"></label><label>Category <select id="category-filter"><option value="all">All</option><option value="table">Table</option><option value="paper">Paper</option><option value="textile">Textile</option><option value="home">Home</option></select></label><label>Maximum price <select id="price-filter"><option value="all">Any</option><option value="25">$25</option><option value="70">$70</option></select></label></div><p id="empty-results" aria-live="polite"></p>';
    body += '<p id="results-status" role="status" aria-live="polite"></p><section id="catalog-grid" class="grid" aria-label="Products"></section></section>';
    if(stage>=4) body += '<section id="product-detail" tabindex="-1" hidden></section>'+boundary;
    if(stage>=6) body += '<p id="cart-status" role="status" aria-live="polite">Loading saved cart…</p><button id="recover-cart" type="button" hidden>Discard saved cart and start empty</button><button id="retry-cart" type="button" hidden>Retry saved cart</button><section id="cart-panel" hidden><h2>Cart</h2><ul id="cart-list"></ul><p id="cart-total">Total: $0.00</p></section>';
    if(stage>=7) body += '<section id="checkout-panel" hidden><h2>Simulated checkout</h2><p>No real order, customer details or payment information.</p><p id="checkout-review"></p><form id="checkout-form" novalidate><label>Fictional delivery <select id="checkout-delivery"><option value="">Choose a demo route</option><option value="pickup-demo">Cedar counter pickup demo</option><option value="post-demo">Thread post demo</option></select></label><label><input type="checkbox" id="checkout-consent"> I understand this is a simulation</label><label>Local outcome <select id="checkout-outcome"><option value="success">Approve simulation</option><option value="decline">Decline simulation</option></select></label><button id="checkout-submit" type="submit">Confirm simulated order</button></form><p id="checkout-status" role="status" aria-live="polite"></p><p id="checkout-confirmation" role="status"></p></section>';
    if(stage>=8) body += '<section><h2>Your local wishlist</h2><p>Saved products: <span id="wishlist-count">0</span></p><p id="wishlist-status" role="status" aria-live="polite">Wishlist is empty. In-memory only; reload resets it.</p><button id="run-shop-smoke" type="button">Run shop smoke test</button><p id="shop-smoke-status" role="status" aria-live="polite"></p>'+(basic?'':'<p id="shop-export-handoff" class="note">Export runnable ZIP: root index.html is compiled. Exact editable source/index.html, source/styles.css, source/main.js, source/catalog.js and source/cartStorage.js accompany it. Serve the extracted root with python -m http.server 8080. Editing source does not rebuild root; return to Project Code and export again. Export is not publication or account sync.</p>')+'</section>';
    body += '<details><summary>Scope and implementation plan</summary>'+scope+stack+'</details>';
  }
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cedar &amp; Thread</title><link rel="stylesheet" href="./styles.css"></head><body><main id="shop-app">'+body+'<footer>Original fixtures · local learning project</footer></main><script type="module" src="./main.js"></script></body></html>';
}
const storage = `export function validCart(value, products) {
  return Boolean(value && value.version === 1 && Array.isArray(value.items) && value.items.length <= products.length &&
    value.items.every(row => row && typeof row.productId === 'string' && Number.isInteger(row.quantity) && row.quantity > 0 && products.some(product => product.id === row.productId && row.quantity <= product.stock)) &&
    new Set(value.items.map(row => row.productId)).size === value.items.length);
}
export async function restoreCart(products) {
  const raw = await trainingStorage.getItem('cart');
  if (raw === null) return [];
  const value = JSON.parse(raw);
  if (!validCart(value, products)) throw new Error('Unrecognized cart snapshot');
  return value.items.map(({productId,quantity}) => ({productId,quantity}));
}
export async function writeCart(items) {
  await trainingStorage.setItem('cart', JSON.stringify({version:1,items}));
}`;
function main(stage:number,basic:boolean):string {
  if(stage<3)return '// Planning increment: describe the rendered contract before implementation.\n';
  const durable=stage>=6&&!(stage===6&&basic);
  return `import { products } from './catalog.js';
${durable?"import { restoreCart, writeCart } from './cartStorage.js';":''}
const $ = selector => document.querySelector(selector);
const money = cents => '$' + (cents / 100).toFixed(2);
const find = id => products.find(product => product.id === id);
const node = (tag, text, className) => { const element = document.createElement(tag); if(text !== undefined) element.textContent=text; if(className)element.className=className;return element; };
${stage>=6?`let cart=[],ready=false,pending=false,pendingWrites=0,lastSaveFailed=false,writes=Promise.resolve();
const copy = rows => rows.map(row=>({...row}));
const count = () => cart.reduce((sum,row)=>sum+row.quantity,0);
const total = () => cart.reduce((sum,row)=>sum+find(row.productId).priceCents*row.quantity,0);
`:''}
${stage>=8?'let wishes=new Set(),smoking=false,smokeDriving=false;':''}
function card(product, detail=false) {
  const article=node('article',undefined,'card'),heading=node('h2');
  if(detail){article.dataset.productDetail=product.id;heading.textContent=product.name;}
  else {article.dataset.productId=product.id;const link=node('a',product.name);link.href='#/product/'+product.id;heading.append(link);}
  article.append(heading,node('p',product.category,'category'),node('p',product.description));
  ${stage===3&&basic?'':"article.append(node('p',money(product.priceCents),'price'));"}
  ${stage>=6?`const add=node('button','Add '+product.name+' to cart');add.type='button';add.dataset.cartAdd=product.id;article.append(add);`:''}
  ${stage>=8?`const wish=node('button',(wishes.has(product.id)?'Remove ':'Save ')+product.name+' wish');wish.type='button';wish.dataset.wishlistToggle=product.id;wish.setAttribute('aria-pressed',String(wishes.has(product.id)));article.append(wish);`:''}
  return article;
}
function renderCatalog() {
  ${stage>=5?`const query=$('#shop-search').value.trim().toLowerCase(),category=$('#category-filter').value,maximum=$('#price-filter').value;
  const shown=products.filter(product=>(!query||product.name.toLowerCase().includes(query))${stage===5&&basic?'':"&&(category==='all'||product.category===category)&&(maximum==='all'||product.priceCents<=Number(maximum)*100)"});
  $('#empty-results').textContent=shown.length?'':'No products match these filters.';`:'const shown=products;'}
  $('#catalog-grid').replaceChildren(...shown.map(product=>card(product)));
  $('#results-status').textContent=shown.length+' products shown.';
}
${stage>=6?`function renderCart() {
  $('#cart-list').replaceChildren(...cart.map(row=>{
    const product=find(row.productId),li=node('li'),quantity=node('input'),remove=node('button','Remove '+product.name);
    li.dataset.cartRow=product.id;quantity.type='number';quantity.min='1';quantity.max=String(product.stock);quantity.value=String(row.quantity);quantity.dataset.cartQuantity=product.id;quantity.setAttribute('aria-label','Quantity for '+product.name);
    remove.type='button';remove.dataset.cartRemove=product.id;li.append(node('span',product.name),quantity,remove);return li;
  }));
  $('#cart-count').textContent=String(count());$('#cart-total').textContent='Total: '+money(total());
  ${stage>=7?"$('#checkout-review').textContent=cart.map(row=>find(row.productId).name+' × '+row.quantity).join(', ')+' — Total: '+money(total());":''}
}
const editable=()=>ready&&!pending${stage>=8?'&&(!smoking||smokeDriving)':''};
function toggleControls(){
  document.querySelectorAll('[data-cart-add],[data-cart-quantity],[data-cart-remove]').forEach(control=>control.disabled=!editable());
  ${stage>=7?"document.querySelectorAll('#checkout-form input,#checkout-form select,#checkout-submit').forEach(control=>control.disabled=!ready||pending"+(stage>=8?'||(smoking&&!smokeDriving)':'')+");":''}
  ${stage>=8?"document.querySelectorAll('#shop-search,#category-filter,#price-filter,[data-wishlist-toggle]').forEach(control=>control.disabled=smoking&&!smokeDriving);":''}
}
`:''}
function render() {
  renderCatalog();${stage>=6?'renderCart();':''}
  ${stage>=4?`const hash=location.hash||'#/catalog';
  $('#catalog-panel').hidden=hash!=='#/catalog';$('#product-detail').hidden=true;$('#product-detail').replaceChildren();
  ${stage>=6?"$('#cart-panel').hidden=hash!=='#/cart';":''}
  ${stage>=7?"$('#checkout-panel').hidden=hash!=='#/checkout';":''}
  const known=hash==='#/catalog'${stage>=6?"||hash==='#/cart'":''}${stage>=7?"||hash==='#/checkout'":''};
  if(!known){
    const area=$('#product-detail');area.hidden=false;const product=hash.startsWith('#/product/')?find(hash.slice(10)):undefined;
    if(product)area.append(card(product,true));
    else {const message=node('p',hash.startsWith('#/product/')?'Product not found.':'Unknown route.');${stage===4&&basic?"message.id='unavailable-product';":"message.id='product-not-found';"}message.setAttribute('role','alert');area.append(message);}
    const back=node('a','Back to catalog');back.href='#/catalog';area.append(back);
  }`:''}
  ${stage>=8?"$('#wishlist-count').textContent=String(wishes.size);":''}
  ${stage>=6?'toggleControls();':''}
}
window.addEventListener('hashchange',()=>{render();${stage>=4?"if(!$('#product-detail').hidden)$('#product-detail').focus();":''}});
${stage>=5?"['input','change'].forEach(type=>['#shop-search','#category-filter','#price-filter'].forEach(selector=>$(selector).addEventListener(type,render)));":''}
${stage>=6?`function save(snapshot) {
  ${durable?`const captured=copy(snapshot);pendingWrites++;
  writes=writes.catch(()=>undefined).then(()=>writeCart(captured));
  return writes.then(()=>{pendingWrites--;lastSaveFailed=false;return true;},()=>{pendingWrites--;lastSaveFailed=true;return false;});`:'return Promise.resolve(true);'}
}
async function commit(next) {
  cart=copy(next);render();$('#cart-status').textContent='Saving cart…';const ok=await save(cart);
  $('#cart-status').textContent=ok?(pendingWrites?'Saving cart…':'Cart saved locally.'):'Could not save cart; visible edits are still available.';return ok;
}
document.addEventListener('click',async event=>{
  const target=event.target;if(!(target instanceof HTMLElement)||!editable())return;
  if(target.dataset.cartAdd){const product=find(target.dataset.cartAdd);if(!product)return;const row=cart.find(row=>row.productId===product.id),quantity=(row?.quantity||0)+1;
    if(quantity>product.stock){$('#cart-status').textContent='Fixture stock limit reached.';return;}
    await commit(row?cart.map(row=>row.productId===product.id?{...row,quantity}:row):[...cart,{productId:product.id,quantity:1}]);
  }else if(target.dataset.cartRemove)await commit(cart.filter(row=>row.productId!==target.dataset.cartRemove));
});
document.addEventListener('change',async event=>{
  const target=event.target;if(!(target instanceof HTMLInputElement)||!target.dataset.cartQuantity||!editable())return;
  const product=find(target.dataset.cartQuantity),quantity=Number(target.value);
  if(!Number.isInteger(quantity)||quantity<1||quantity>product.stock){$('#cart-status').textContent='Choose a whole quantity from 1 to '+product.stock+'.';render();return;}
  await commit(cart.map(row=>row.productId===product.id?{...row,quantity}:row));
});
async function load(){
  ready=false;$('#cart-status').textContent='Loading saved cart…';render();
  ${durable?`try{cart=await restoreCart(products);ready=true;$('#recover-cart').hidden=true;$('#retry-cart').hidden=true;$('#cart-status').textContent='Saved cart restored.';}
  catch{ready=false;$('#recover-cart').hidden=false;$('#retry-cart').hidden=false;$('#cart-status').textContent='Saved cart is unavailable. Recover explicitly or retry.';}`:"ready=true;$('#cart-status').textContent='In-memory cart ready; persistence comes in the next increment.';"}
  render();
}
$('#retry-cart').addEventListener('click',load);
$('#recover-cart').addEventListener('click',async()=>{if(await save([])){cart=[];ready=true;$('#recover-cart').hidden=true;$('#retry-cart').hidden=true;$('#cart-status').textContent='Recovered with an empty cart.';}else $('#cart-status').textContent='Recovery could not be saved.';render();});
`:''}
${stage>=7?`$('#checkout-form').addEventListener('submit',event=>{
  event.preventDefault();if(pending${stage>=8?'||(smoking&&!smokeDriving)':''})return;
  $('#checkout-confirmation').textContent='';
  if(!ready||pendingWrites){$('#checkout-status').textContent='Wait for the saved cart before checkout.';return;}
  const delivery=$('#checkout-delivery').value,consent=$('#checkout-consent').checked,outcome=$('#checkout-outcome').value;
  if(!cart.length){$('#checkout-status').textContent='Add a fixture item before checkout.';return;}
  if(!['pickup-demo','post-demo'].includes(delivery)||!consent){$('#checkout-status').textContent='Choose a fictional delivery route and confirm the simulation.';return;}
  ${stage===7&&basic?"$('#checkout-status').textContent='Valid demo choices; asynchronous outcomes are the next increment.';":`pending=true;$('#checkout-status').textContent='Checking simulated order…';render();
  setTimeout(async()=>{
    if(outcome==='decline'){$('#checkout-status').textContent='Simulation declined. Your cart is still available.';}
    else if(await save([])){cart=[];$('#checkout-status').textContent='Simulation approved.';$('#checkout-confirmation').textContent='Demo order confirmed for '+delivery+'.';}
    else {$('#checkout-status').textContent='Could not save confirmation; your cart was retained.';}
    pending=false;render();
  },25);`}
});`:''}
${stage>=8?`document.addEventListener('click',event=>{
  const target=event.target;if(!(target instanceof HTMLElement)||!target.dataset.wishlistToggle||smoking)return;
  const id=target.dataset.wishlistToggle;wishes.has(id)?wishes.delete(id):wishes.add(id);
  $('#wishlist-status').textContent=wishes.size?'Saved in-memory only; reload resets the wishlist.':'Wishlist is empty. In-memory only; reload resets it.';render();
});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const quantity=id=>Number(document.querySelector('[data-cart-quantity="'+id+'"]')?.value||0);
function drive(action){smokeDriving=true;toggleControls();try{action();}finally{smokeDriving=false;toggleControls();}}
$('#run-shop-smoke').addEventListener('click',async()=>{
  if(smoking||pending||!ready||pendingWrites){$('#shop-smoke-status').textContent='Wait for current cart work before smoke testing.';return;}
  smoking=true;$('#run-shop-smoke').disabled=true;$('#shop-smoke-status').textContent='Running smoke checks…';toggleControls();
  let raw;
  try{raw=await trainingStorage.getItem('cart');}catch{$('#shop-smoke-status').textContent='Smoke test failed: snapshot could not be read.';smoking=false;$('#run-shop-smoke').disabled=false;toggleControls();return;}
  const snapshot={cart:copy(cart),hash:location.hash,query:$('#shop-search').value,category:$('#category-filter').value,maximum:$('#price-filter').value,delivery:$('#checkout-delivery').value,consent:$('#checkout-consent').checked,outcome:$('#checkout-outcome').value,wishes:new Set(wishes),wishStatus:$('#wishlist-status').textContent,cartStatus:$('#cart-status').textContent,checkoutStatus:$('#checkout-status').textContent,confirmation:$('#checkout-confirmation').textContent,failed:lastSaveFailed};
  let failure='';
  try{
    cart=[];$('#shop-search').value='';$('#category-filter').value='all';$('#price-filter').value='all';location.hash='#/catalog';render();
    drive(()=>$('#catalog-grid [data-cart-add="ember-mug"]').click());await writes;
    assert(!lastSaveFailed&&quantity('ember-mug')===1,'Add did not update and save a single visible item');
    drive(()=>{const field=$('[data-cart-quantity="ember-mug"]');field.value='2';field.dispatchEvent(new Event('change',{bubbles:true}));});await writes;
    assert(!lastSaveFailed&&quantity('ember-mug')===2&&$('#cart-total').textContent.includes('48.00'),'Quantity or total is incorrect');
    $('#shop-search').value='  MuG ';$('#shop-search').dispatchEvent(new Event('input',{bubbles:true}));
    assert($('#catalog-grid').children.length===1&&$('#catalog-grid').textContent.includes('Ember Mug'),'Search projection is incorrect');
    location.hash='#/checkout';render();$('#checkout-delivery').value='';$('#checkout-consent').checked=false;
    drive(()=>$('#checkout-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    assert(!$('#checkout-confirmation').textContent&&$('#checkout-status').textContent.includes('Choose'),'Invalid checkout was accepted');
    $('#checkout-delivery').value='pickup-demo';$('#checkout-consent').checked=true;$('#checkout-outcome').value='decline';
    drive(()=>$('#checkout-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    for(let attempt=0;attempt<100&&pending;attempt++)await wait(5);
    assert(!pending&&$('#checkout-status').textContent.includes('declined')&&quantity('ember-mug')===2,'Decline did not preserve the cart');
  }catch(error){failure='Smoke test failed: '+error.message;}
  finally{
    try{await writes;}catch{failure=failure||'Smoke test failed: cart write was rejected.';}
    cart=copy(snapshot.cart);wishes=snapshot.wishes;location.hash=snapshot.hash;$('#shop-search').value=snapshot.query;$('#category-filter').value=snapshot.category;$('#price-filter').value=snapshot.maximum;$('#checkout-delivery').value=snapshot.delivery;$('#checkout-consent').checked=snapshot.consent;$('#checkout-outcome').value=snapshot.outcome;
    $('#wishlist-status').textContent=snapshot.wishStatus;$('#cart-status').textContent=snapshot.cartStatus;$('#checkout-status').textContent=snapshot.checkoutStatus;$('#checkout-confirmation').textContent=snapshot.confirmation;lastSaveFailed=snapshot.failed;
    try{if(raw===null)await trainingStorage.removeItem('cart');else await trainingStorage.setItem('cart',raw);}catch{failure='Smoke test failed: cleanup could not restore saved cart.';}
    smoking=false;$('#run-shop-smoke').disabled=false;render();$('#shop-smoke-status').textContent=failure||'Smoke test passed: DOM interactions and cleanup verified.';
  }
});`:''}
${stage>=6?'load();':'render();'}
`;
}
function files(stage:number,basic=false):Files {
  return {'index.html':html(stage,basic),'styles.css':css,'main.js':main(stage,basic),...(stage>=3?{'catalog.js':products}:{}),...(stage>=6&&!(stage===6&&basic)?{'cartStorage.js':storage}:{})};
}
export const ecommerceReferenceByTopic:Record<string,Files>=Object.fromEntries(ids.map((id,index)=>[id,files(index+1)]));
export const ecommerceBasicReferenceByTopic:Record<string,Files>=Object.fromEntries(ids.map((id,index)=>[id,files(index+1,true)]));
export const testFiles=ecommerceReferenceByTopic[ids[7]];
function change(files:Files,file:string,from:string,to:string):Files {
  if(!files[file].includes(from))throw Error('Missing ecommerce starter anchor: '+from);
  return {...files,[file]:files[file].replace(from,to)};
}
export function ecommerceStarter(id:string,kind:'apply'|'debug'|'combine'):Files {
  const index=ids.indexOf(id),reference=ecommerceReferenceByTopic[id];if(!reference)throw Error('Unknown ecommerce topic: '+id);
  const early=kind==='apply';
  if(index===0)return change(reference,'index.html',early?'id="shop-scope"':kind==='debug'?'id="flow-map"':'id="scope-exclusions"','id="unfinished-plan"');
  if(index===1)return change(reference,'index.html',early?'id="shop-stack-plan"':kind==='debug'?'#/product/:id':'id="boundary-plan"','unfinished-plan');
  if(index===2)return change(reference,'main.js',early?'article.dataset.productId=product.id':kind==='debug'?"article.append(node('p',money(product.priceCents),'price'));":'product.description',early?'article.dataset.productId="same-id"':kind==='debug'?'// TODO: render prices':'"Description pending"');
  if(index===3)return change(reference,'main.js',early?'find(hash.slice(10))':kind==='debug'?"message.id='product-not-found'":"money(product.priceCents)",early?'undefined':kind==='debug'?"message.id='missing-product'":"money(0)");
  if(index===4)return change(reference,'main.js',early?"$('#shop-search').value.trim().toLowerCase()":kind==='debug'?"product.category===category":"product.priceCents<=Number(maximum)*100",early?"''":'true');
  if(index===5)return change(reference,'main.js',early?'quantity=Number(target.value)':kind==='debug'?'Number.isInteger(quantity)':'writeCart(captured)',early?'quantity=1':kind==='debug'?'Number.isFinite(quantity)':'Promise.resolve()');
  if(index===6)return change(reference,'main.js',early?"!['pickup-demo','post-demo'].includes(delivery)||!consent":kind==='debug'?"outcome==='decline'":'else if(await save([]))',early?'false':kind==='debug'?'false':'else if(true)');
  if(early)return change(reference,'main.js',"drive(()=>$('#catalog-grid [data-cart-add=\"ember-mug\"]').click());",'// TODO: exercise a real add');
  if(kind==='debug')return change(reference,'index.html','id="shop-export-handoff"','id="unfinished-handoff"');
  return change(reference,'main.js','wish.dataset.wishlistToggle=product.id','wish.dataset.wish=product.id');
}
export type EcommerceStorageScenario={mode:string;seed:string|null;failWrites?:boolean};
export const ecommerceStorageScenarios:EcommerceStorageScenario[]=[
 {mode:'valid',seed:JSON.stringify({version:1,items:[{productId:'ember-mug',quantity:2}]})},
 {mode:'reload',seed:null},{mode:'missing',seed:null},{mode:'malformed',seed:'{bad'},
 {mode:'invalid-version',seed:JSON.stringify({version:9,items:[]})},
 {mode:'invalid-shape',seed:JSON.stringify({version:1,items:[{productId:'unknown',quantity:1}]})},
 {mode:'invalid-null',seed:JSON.stringify({version:1,items:[null]})},
 {mode:'invalid-stock',seed:JSON.stringify({version:1,items:[{productId:'brass-lamp',quantity:2}]})},
 {mode:'duplicate-product',seed:JSON.stringify({version:1,items:[{productId:'ember-mug',quantity:1},{productId:'ember-mug',quantity:2}]})},
 {mode:'read-failure',seed:JSON.stringify({version:1,items:[]})},
 {mode:'save-failure',seed:JSON.stringify({version:1,items:[{productId:'ember-mug',quantity:1}]}),failWrites:true}
];
