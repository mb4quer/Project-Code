import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { testFiles } from '../../src/content/ecommerceReferences';
import { curriculum } from '../../src/content/curriculum';
import { createInitialSession } from '../../src/data/demos';
import { completeActivity, initializeProjectWorkspace, recordBlankAttempt, recordChallengeResult, setLearningLocation, submitQuestionAnswer } from '../../src/lesson/engine';
function unzip(bytes: Buffer): Record<string,string> {
  const out:Record<string,string>={};let p=0;
  while(bytes.readUInt32LE(p)===0x04034b50){const size=bytes.readUInt32LE(p+18),n=bytes.readUInt16LE(p+26),x=bytes.readUInt16LE(p+28),name=bytes.subarray(p+30,p+30+n).toString(),start=p+30+n+x;out[name]=bytes.subarray(start,start+size).toString();p=start+size}return out;
}
test('Cedar & Thread host export runs independently with routes, persistence, checkout recovery, repeatable smoke and narrow keyboard access',async({page,context})=>{
  test.setTimeout(120_000);
  let seed=initializeProjectWorkspace(createInitialSession(),'amazon-inspired-ecommerce',{...testFiles,'notes.txt':'Cedar export note'});
  for(const topic of curriculum.topics.slice(0,21)){
    for(const a of topic.activities)seed=completeActivity(seed,topic.id,a.id);
    for(const b of topic.blanks)seed=recordBlankAttempt(seed,topic,b,b.acceptedAnswers[0]).session;
    for(const q of topic.assessmentQuestions.slice(0,10))seed=submitQuestionAnswer(seed,topic,q,q.acceptedAnswers[0]).session;
    for(const c of topic.challenges)seed=recordChallengeResult(seed,topic.id,c.id,true);
  }
  seed.learning!.projectWorkspaces['amazon-inspired-ecommerce'].trainingData={cart:'PRIVATE COURSE CART'};
  seed.learning!.projectWorkspaces['amazon-inspired-ecommerce'].checkpoint={files:{'notes.txt':'PRIVATE CHECKPOINT'},createdAt:'2026-09-16T00:00:00Z'};
  seed=setLearningLocation(seed,{view:'topic',projectId:'amazon-inspired-ecommerce',topicId:'shop-testing-export-and-handoff',stepId:'shop-testing-export-and-handoff-guided-2'});
  await page.addInitScript(s=>{if(!sessionStorage.getItem('shop-export-seed')){localStorage.setItem('project-code.session.v1',JSON.stringify(s));sessionStorage.setItem('shop-export-seed','1');}},seed);
  await page.goto('/');const pending=page.waitForEvent('download');await page.locator('#export-project').click();const download=await pending;
  await download.saveAs('test-results/ecommerce-store.zip');const files=unzip(await readFile((await download.path())!));
  for(const [name,source]of Object.entries(testFiles))expect(files['source/'+name]).toBe(source);
  expect(files['source/notes.txt']).toBe('Cedar export note');expect(files['README.md']).toContain('python -m http.server');
  expect(files['index.html']).not.toMatch(/PRIVATE COURSE CART|PRIVATE CHECKPOINT|creditedQuestionIds|writerId/);
  const app=await context.newPage();const errors:string[]=[];app.on('pageerror',error=>errors.push(error.message));
  await app.route('http://ecommerce-export.test/**',r=>r.fulfill({contentType:'text/html',body:files['index.html']}));
  await app.goto('http://ecommerce-export.test/#/product/cedar-throw');
  await expect(app.locator('#product-detail')).toContainText('<strong>literal</strong>');await expect(app.locator('#product-detail strong')).toHaveCount(0);
  const nav=app.locator('#shop-nav');await nav.locator('a[href="#/catalog"]').click();
  await app.locator('#shop-search').fill('  mUg ');await expect(app.locator('#catalog-grid [data-product-id]')).toHaveCount(1);
  await app.locator('#shop-search').fill('');await app.locator('#category-filter').selectOption('textile');await app.locator('#price-filter').selectOption('25');await expect(app.locator('#empty-results')).toContainText(/no.*match/i);
  await app.locator('#category-filter').selectOption('all');await app.locator('#price-filter').selectOption('all');
  await app.locator('#catalog-grid a[href="#/product/ember-mug"]').click();await expect(app.locator('[data-product-detail="ember-mug"]')).toBeVisible();
  await app.locator('#product-detail [data-cart-add="ember-mug"]').click();await nav.locator('a[href="#/cart"]').click();
  await expect(app.locator('#cart-list')).toContainText('Ember Mug');await app.locator('[data-cart-quantity="ember-mug"]').fill('2');await app.locator('[data-cart-quantity="ember-mug"]').dispatchEvent('change');
  await expect(app.locator('#cart-status')).toContainText(/saved locally/i);await app.reload();await expect(app.locator('[data-cart-quantity="ember-mug"]')).toHaveValue('2');await expect(app.locator('#cart-total')).toContainText('48.00');
  await app.evaluate(()=>{location.hash='#/checkout';});await expect(app.locator('#checkout-form')).toBeVisible();
  expect(await app.locator('#checkout-form input').evaluateAll(nodes=>nodes.every(n=>(n as HTMLInputElement).type==='checkbox'))).toBe(true);
  await app.locator('#checkout-submit').click();await expect(app.locator('#checkout-confirmation')).toBeEmpty();
  await app.locator('#checkout-delivery').selectOption('pickup-demo');await app.locator('#checkout-consent').check();await app.locator('#checkout-outcome').selectOption('decline');
  await app.locator('#checkout-submit').click();await expect(app.locator('#checkout-status')).toContainText('declined');
  const before=await app.evaluate(()=>JSON.stringify(localStorage));
  await app.evaluate(()=>{const w=window as any;w.__originalStorage=w.trainingStorage;w.trainingStorage={...w.trainingStorage,setItem:async()=>{throw Error('Failed clear')}};});
  await app.locator('#checkout-outcome').selectOption('success');await app.locator('#checkout-submit').click();await expect(app.locator('#checkout-status')).toContainText(/could not|failed|not saved/i);
  await expect(app.locator('#checkout-confirmation')).toBeEmpty();expect(await app.evaluate(()=>JSON.stringify(localStorage))).toBe(before);
  await app.evaluate(()=>{const w=window as any;w.trainingStorage=w.__originalStorage;});
  await app.locator('#checkout-submit').click();await expect(app.locator('#checkout-confirmation')).toContainText(/confirmed/i);
  await nav.locator('a[href="#/catalog"]').click();await app.locator('#catalog-grid [data-cart-add="field-notebook"]').click();await expect(app.locator('#cart-status')).toContainText(/saved locally/i);
  await app.locator('[data-wishlist-toggle="ember-mug"]').click();await expect(app.locator('#wishlist-count')).toHaveText('1');await app.reload();await expect(app.locator('#wishlist-count')).toHaveText('0');
  await app.locator('#shop-search').fill('notebook');
  const snapshot=await app.evaluate(()=>JSON.stringify(localStorage));
  for(let n=0;n<2;n++){
    await app.locator('#run-shop-smoke').click();await expect(app.locator('#shop-smoke-status')).toContainText('passed');
    expect(await app.evaluate(()=>JSON.stringify(localStorage))).toBe(snapshot);await expect(app.locator('#shop-search')).toHaveValue('notebook');await expect(app.locator('[data-cart-quantity="field-notebook"]')).toHaveValue('1');
  }
  await app.evaluate(()=>{const w=window as any;w.__originalStorage=w.trainingStorage;w.trainingStorage={...w.trainingStorage,getItem:async()=>{throw Error('Snapshot read failure')}};});
  await app.locator('#run-shop-smoke').click();await expect(app.locator('#shop-smoke-status')).toContainText('failed');expect(await app.evaluate(()=>JSON.stringify(localStorage))).toBe(snapshot);
  await app.evaluate(()=>{const w=window as any;w.trainingStorage=w.__originalStorage;});
  // Reject the first smoke write only. Its finally cleanup must still restore the raw record.
  await app.evaluate(()=>{const w=window as any,original=w.trainingStorage;let first=true;w.trainingStorage={...original,setItem:async(k:string,v:string)=>{if(first){first=false;throw Error('Smoke write failure')}return original.setItem(k,v)}};});
  await app.locator('#run-shop-smoke').click();await expect(app.locator('#shop-smoke-status')).toContainText('failed');expect(await app.evaluate(()=>JSON.stringify(localStorage))).toBe(snapshot);
  await app.evaluate(()=>{const w=window as any;w.trainingStorage=w.__originalStorage;});
  await app.locator('#shop-search').fill('');
  await app.setViewportSize({width:390,height:844});expect(await app.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await nav.locator('a[href="#/catalog"]').focus();await app.keyboard.press('Enter');await expect(app.locator('#catalog-grid')).toBeVisible();
  for(const id of ['shop-search','category-filter','price-filter'])expect(await app.locator('#'+id).evaluate(n=>Boolean((n as HTMLInputElement).labels?.length))).toBe(true);
  await app.screenshot({path:'test-results/ecommerce-export-mobile.png',fullPage:true});
  await app.setViewportSize({width:1440,height:1000});await app.screenshot({path:'test-results/ecommerce-export-desktop.png',fullPage:true});
  expect(errors).toEqual([]);
});
