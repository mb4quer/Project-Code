import { expect, test, type Page } from '@playwright/test';
import type { Files } from '../../src/contracts';
import { ecommerceBasicReferenceByTopic, ecommerceReferenceByTopic, ecommerceStarter } from '../../src/content/ecommerceReferences';

const graderModule = '/src/lesson/grader.ts';
const topics = Object.keys(ecommerceReferenceByTopic);
const suffixes = ['guided-1', 'guided-2', 'apply', 'debug', 'combine'] as const;
async function grade(page: Page, files: Files, assessmentId: string) {
  return page.evaluate(async ({ files, assessmentId, graderModule }) => {
    const { createChallengeGrader } = await import(graderModule); const container = document.createElement('div'); document.body.append(container); const grader = createChallengeGrader(container, () => {});
    try { return await grader.grade(files, assessmentId); } finally { grader.dispose(); container.remove(); }
  }, { files, assessmentId, graderModule });
}
function replace(files: Files, file: string, from: string, to: string): Files { const next = { ...files, [file]: files[file].replace(from, to) }; if (next[file] === files[file]) throw new Error('Missing ecommerce mutation anchor: ' + from); return next; }

test.describe('Phase 6 Cedar & Thread behavioral matrix', () => {
  test.setTimeout(360_000); test.beforeEach(async ({ page }) => { await page.goto('/'); });
  test('all eight topics accept 40 references and reject 40 unfinished starters', async ({ page }) => {
    for (const topic of topics) for (const suffix of suffixes) { const id = `${topic}-${suffix}`; await expect.soft(grade(page, ecommerceReferenceByTopic[topic], id), id).resolves.toMatchObject({ assessmentId:id, passed:true }); const kind = suffix === 'guided-1' || suffix === 'apply' ? 'apply' : suffix === 'guided-2' || suffix === 'debug' ? 'debug' : 'combine'; await expect.soft(grade(page, ecommerceStarter(topic, kind), id), id + ' starter').resolves.toMatchObject({ assessmentId:id, passed:false }); }
  });
  test('early references pass only their early contracts', async ({ page }) => {
    for (const topic of topics) { for (const suffix of ['guided-1','apply'] as const) await expect.soft(grade(page, ecommerceBasicReferenceByTopic[topic], `${topic}-${suffix}`)).resolves.toMatchObject({ passed:true }); for (const suffix of ['guided-2','debug','combine'] as const) await expect.soft(grade(page, ecommerceBasicReferenceByTopic[topic], `${topic}-${suffix}`)).resolves.toMatchObject({ passed:false }); }
  });
  test('observable regressions fail the relevant complete contract', async ({ page }) => {
    const ref = ecommerceReferenceByTopic; const mutations: Array<[string,string,Files]> = [
      ['scope permits copied branding','shop-scope-catalog-and-originality',replace(ref['shop-scope-catalog-and-originality'],'index.html','real payment collection','real payments')],
      ['route plan omits checkout','shop-stack-data-and-route-plan',replace(ref['shop-stack-data-and-route-plan'],'index.html','#/checkout','#/confirm')],
      ['catalog loses product identity','shop-setup-navigation-and-catalog',replace(ref['shop-setup-navigation-and-catalog'],'main.js','data-product-id','data-card')],
      ['detail unknown route is treated as a product','shop-product-details-and-client-server-boundaries',replace(ref['shop-product-details-and-client-server-boundaries'],'main.js','id="product-not-found"','id="missing-product"')],
      ['search ignores user input','shop-product-search-and-filters',replace(ref['shop-product-search-and-filters'],'main.js',"$('#shop-search').value.trim().toLowerCase()","''")],
      ['cart save failure claims success','shop-cart-quantity-and-persistence',replace(ref['shop-cart-quantity-and-persistence'],'main.js','cart = prior; renderCart();','')],
      ['declined checkout clears cart','shop-checkout-validation-and-failure-states',replace(ref['shop-checkout-validation-and-failure-states'],'main.js',"if (outcome === 'decline')","if (false)")],
      ['smoke prints a pass only','shop-testing-export-and-handoff',replace(ref['shop-testing-export-and-handoff'],'main.js',"await commit([...cart, {productId:'ember-mug', quantity:1}]);","$('#shop-smoke-status').textContent='Smoke test passed.'; return;")],
    ];
    for (const [name, topic, files] of mutations) expect((await grade(page, files, `${topic}-combine`)).passed, name).toBe(false);
  });
});
