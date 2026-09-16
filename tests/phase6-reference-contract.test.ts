import { describe, expect, it } from 'vitest';
import { curriculum } from '../src/content/curriculum';
import { ecommerceBasicReferenceByTopic, ecommerceReferenceByTopic } from '../src/content/ecommerceReferences';

const topicIds = [
  'shop-scope-catalog-and-originality',
  'shop-stack-data-and-route-plan',
  'shop-setup-navigation-and-catalog',
  'shop-product-details-and-client-server-boundaries',
  'shop-product-search-and-filters',
  'shop-cart-quantity-and-persistence',
  'shop-checkout-validation-and-failure-states',
  'shop-testing-export-and-handoff',
];

function localImports(files: Record<string, string>) {
  return [...(files['main.js'] ?? '').matchAll(/from\s*['"]\.\/([^'"]+)['"]/g)].map(match => match[1]);
}

describe('Phase 6 storefront reference contract', () => {
  it('keeps the published ecommerce prerequisites and counts stable', () => {
    const project = curriculum.projects.find(item => item.id === 'amazon-inspired-ecommerce');
    const topics = curriculum.topics.filter(item => item.projectId === 'amazon-inspired-ecommerce');
    expect(project?.status).toBe('published');
    expect(project?.topicIds).toEqual(topicIds);
    expect(topics).toHaveLength(8);
    expect(topics.every(topic => topic.status === 'published')).toBe(true);
    expect(topics.map(topic => topic.prerequisiteTopicIds)).toEqual(['react-testing-and-export', ...topicIds.slice(0,-1)].map(id=>[id]));
  });

  it('has a complete, self-contained reference map with resolvable local modules', () => {
    for (const id of topicIds) {
      const files = ecommerceReferenceByTopic[id];
      expect(files, id).toBeDefined();
      expect(files['index.html'], id).toContain('main.js');
      for (const imported of localImports(files)) expect(files[imported], `${id} imports ${imported}`).toBeDefined();
    }
  });

  it('does not introduce a later feature before its teaching stage', () => {
    for (const [index, id] of topicIds.entries()) {
      // Planning prose may name future files and shared CSS may style future
      // selectors. Only executable feature code and actual controls count as use.
      const files = ecommerceReferenceByTopic[id];
      const text = files['main.js']+'\n'+files['index.html'];
      if (index < 5) {
        expect(files['main.js']).not.toMatch(/trainingStorage|data-cart-(?:add|quantity|remove)|cartStorage\.js/);
        expect(files['cartStorage.js']).toBeUndefined();
      }
      if (index < 6) expect(text).not.toMatch(/checkout-form|checkout-delivery|checkout-consent|checkout-outcome|checkout-submit/);
      if (index < 7) expect(text).not.toMatch(/run-shop-smoke|shop-smoke-status|wishlist/i);
    }
  });

  it('keeps catalog fixtures stable and suitable for cents-based stock validation', () => {
    const catalog = ecommerceReferenceByTopic[topicIds[2]]['catalog.js'];
    const records = [...catalog.matchAll(/\{id:'([^']+)',name:'([^']+)',category:'([^']+)',priceCents:(\d+),stock:(\d+),description:'([^']+)'\}/g)]
      .map(([, id, name, category, cents, stock, description]) => ({ id, name, category, cents: Number(cents), stock: Number(stock), description }));
    expect(records.map(record => record.id)).toEqual(['ember-mug', 'field-notebook', 'cedar-throw', 'brass-lamp']);
    expect(new Set(records.map(record => record.id)).size).toBe(records.length);
    expect(records.map(record => [record.id, record.cents, record.stock])).toEqual([
      ['ember-mug', 2400, 4], ['field-notebook', 1200, 8], ['cedar-throw', 6800, 2], ['brass-lamp', 8400, 1],
    ]);
    expect(records.every(record => Number.isInteger(record.cents) && record.cents > 0 && Number.isInteger(record.stock) && record.stock > 0)).toBe(true);
    expect(records.find(record => record.id === 'cedar-throw')?.description).toContain('<strong>literal</strong>');
  });

  it('keeps basic references as complete files at every stage', () => {
    for (const id of topicIds) {
      const files = ecommerceBasicReferenceByTopic[id];
      expect(files['index.html'], id).toContain('main.js');
      for (const imported of localImports(files)) expect(files[imported], `${id} imports ${imported}`).toBeDefined();
    }
  });
});
