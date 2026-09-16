import { expect, test, type Page } from '@playwright/test';
import type { Files } from '../../src/contracts';
import { ecommerceBasicReferenceByTopic, ecommerceReferenceByTopic, ecommerceStarter } from '../../src/content/ecommerceReferences';
const graderModule='/src/lesson/grader.ts';
const topics=Object.keys(ecommerceReferenceByTopic), suffixes=['guided-1','guided-2','apply','debug','combine'] as const;
async function grade(page:Page,files:Files,assessmentId:string){
  return page.evaluate(async({files,assessmentId,graderModule})=>{
    const {createChallengeGrader}=await import(graderModule);const container=document.createElement('div');container.className='grading-sandbox';document.body.append(container);const grader=createChallengeGrader(container,()=>{});
    try{return await grader.grade(files,assessmentId)}finally{grader.dispose();container.remove()}
  },{files,assessmentId,graderModule});
}
const mutate=(files:Files,program:string):Files=>({...files,'main.js':files['main.js']+'\n'+program});
function replace(files:Files,file:string,from:string,to:string){if(!files[file].includes(from))throw Error('Missing mutant anchor: '+from);return{...files,[file]:files[file].replace(from,to)}}
test.describe('Phase 6 Cedar & Thread behavioral matrix',()=>{
  test.setTimeout(360_000);test.beforeEach(async({page})=>{await page.goto('/')});
  test('all eight topics accept 40 references and reject 40 unfinished starters',async({page})=>{
    for(const topic of topics)for(const suffix of suffixes){
      const id=`${topic}-${suffix}`,result=await grade(page,ecommerceReferenceByTopic[topic],id);
      expect.soft(result,id+': '+result.message).toMatchObject({assessmentId:id,passed:true});
      const kind=suffix==='guided-1'||suffix==='apply'?'apply':suffix==='guided-2'||suffix==='debug'?'debug':'combine';
      const starterResult=await grade(page,ecommerceStarter(topic,kind),id);
      expect.soft(starterResult,id+' starter: '+starterResult.message).toMatchObject({assessmentId:id,passed:false});
    }
  });
  test('each early reference passes its taught increment and fails later requirements',async({page})=>{
    for(const topic of topics)for(const suffix of suffixes){const result=await grade(page,ecommerceBasicReferenceByTopic[topic],`${topic}-${suffix}`);expect.soft(result,`${topic}-${suffix}: ${result.message}`).toMatchObject({passed:suffix==='guided-1'||suffix==='apply'});}
  });
  test('twelve representative incorrect programs fail by observed behavior',async({page})=>{
    const refs=ecommerceReferenceByTopic, mutations:Array<[string,string,Files]>=[
      ['scope omits original identity',topics[0],replace(refs[topics[0]],'index.html','id="catalog-identity"','id="other-identity"')],
      ['route map loses product identity',topics[1],replace(refs[topics[1]],'index.html','#/product/:id','#/product')],
      ['catalog omits a product',topics[2],mutate(refs[topics[2]],"document.querySelector('#catalog-grid').firstElementChild.remove();")],
      ['detail fails unknown-product recovery',topics[3],mutate(refs[topics[3]],"window.addEventListener('hashchange',()=>document.querySelector('#product-not-found')?.remove());")],
      ['search never handles input',topics[4],mutate(refs[topics[4]],"document.addEventListener('input',e=>{if(e.target.id==='shop-search')e.stopImmediatePropagation()},true);")],
      ['price filter resets instead of intersecting',topics[4],mutate(refs[topics[4]],"document.addEventListener('change',e=>{if(e.target.id==='price-filter')e.target.value='all'},true);")],
      ['cart ignores add clicks',topics[5],mutate(refs[topics[5]],"document.addEventListener('click',e=>{if(e.target.matches('[data-cart-add]'))e.stopImmediatePropagation()},true);")],
      ['cart ignores quantity changes',topics[5],mutate(refs[topics[5]],"document.addEventListener('change',e=>{if(e.target.matches('[data-cart-quantity]')){e.target.value='1';e.stopImmediatePropagation()}},true);")],
      // Mutate cart state: clearing DOM in capture is repaired by the normal render.
      ['cart remove targets every row',topics[5],replace(refs[topics[5]],'main.js','commit(cart.filter(row=>row.productId!==target.dataset.cartRemove))','commit([])')],
      ['checkout confirms without validation',topics[6],mutate(refs[topics[6]],"document.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();document.querySelector('#checkout-confirmation').textContent='Demo order confirmed';},true);")],
      ['smoke prints success without testing',topics[7],mutate(refs[topics[7]],"document.addEventListener('click',e=>{if(e.target.id==='run-shop-smoke'){e.stopImmediatePropagation();document.querySelector('#shop-smoke-status').textContent='Smoke test passed';}},true);")],
      ['wishlist has no reversible action',topics[7],mutate(refs[topics[7]],"document.addEventListener('click',e=>{if(e.target.matches('[data-wishlist-toggle]'))e.stopImmediatePropagation()},true);")],
    ];
    for(const[name,topic,files]of mutations){const result=await grade(page,files,`${topic}-combine`);expect.soft(result.passed,name+': '+result.message).toBe(false);}
  });
});
