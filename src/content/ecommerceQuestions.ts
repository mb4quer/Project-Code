import type { AssessmentQuestion } from './schema';

type Category = AssessmentQuestion['reasoningCategory'];
type Kind = AssessmentQuestion['kind'];
type Spec = { category: Category; prompt: string; answers: string[]; feedback: string; kind?: Kind };

const make = (topicId: string, group: string, s: Spec): AssessmentQuestion => {
  const id = `ecommerce-${topicId.replace(/^shop-/, '')}-${group}-${s.category}`;
  return { id, identity: id, path: `projects/amazon-inspired-ecommerce/topics/${topicId}/questions/${id}`, prompt: s.prompt, kind: s.kind ?? 'conceptual', reasoningCategory: s.category, equivalenceGroup: `ecommerce-${group}`, acceptedAnswers: s.answers, misconceptionFeedback: s.feedback, reviewed: true };
};
const group = (topicId: string, name: string, specs: Spec[]) => specs.map(spec => make(topicId, name, spec));
const p = (prompt: string, answers: string[], feedback: string): Spec => ({ category: 'prediction', prompt, answers, feedback });
let debuggingIndex = 0;
const balanceChoice = (prompt: string, answers: string[], index: number): [string, string[]] => {
  if (!prompt.includes('A)') || !prompt.includes('B)') || answers.length !== 1 || !['A', 'B'].includes(answers[0])) return [prompt, answers];
  if (index % 2 === 0) return [prompt, answers];
  return [prompt.replaceAll('A)', '__B__)').replaceAll('B)', 'A)').replaceAll('__B__)', 'B)'), [answers[0] === 'A' ? 'B' : 'A']];
};
const d = (prompt: string, answers: string[], feedback: string): Spec => { const [nextPrompt, nextAnswers] = balanceChoice(prompt, answers, debuggingIndex++); return { category: 'debugging', prompt: nextPrompt, answers: nextAnswers, feedback }; };
let explanationIndex = 0;
const explanationDistractors = [
  'copied marketplace branding is acceptable when the layout is familiar', 'the cart should own every brand decision',
  'a loyalty program is required before catalog browsing works', 'a product name is always a unique database key',
  'a live inventory service is required for fixed local fixtures', 'a decorative slogan is a substitute for a heading',
  'a full-stack framework is required for every browser route', 'cart lines should copy and trust the displayed price',
  'every view should parse and render the hash independently', 'a route parameter is a literal product id named “:id”',
  'search text should be stored inside every product record', 'the browser build configuration authorizes stock changes',
  'the catalog shell should be duplicated inside every card', 'a route can change without changing the rendered view',
  'the first fixture is an acceptable replacement for any selected id', 'formatted dollars should replace integer cents in source data',
  'an empty source and a filtered projection are the same state', 'a decorative wrapper is more accessible than a semantic landmark',
  'the browser can guarantee a server inventory reservation', 'a local array is automatically a durable database',
  'authentication and authorization are interchangeable terms', 'saving a password in browser storage creates secure auth',
  'a filter should delete records that do not match', 'the total catalog count is always the visible result count',
  'no matches means the fixture service is necessarily unavailable', 'a query must be sent to a remote search endpoint',
  'zero quantity is a valid persisted cart line', 'visible labels are safer cart keys than stable product ids',
  'a stale total is acceptable if each row looks correct', 'corrupt storage should be replaced silently with empty data',
  'a cart reload should invent missing products', 'checkout can succeed without a bounded delivery choice',
  'an unchecked consent box has no effect on a simulation', 'the review may collect real customer details',
  'a decline should clear the cart before offering retry', 'every submit click should create another pending attempt',
  'a private state variable proves the rendered page is correct', 'remote catalog order is a valid deterministic fixture',
  'the third div is a stable behavior contract', 'editing source files automatically rebuilds an export',
  'wishlist membership should be copied into cart quantities', 'reloading should make an in-memory wishlist durable',
  'a product title is a safer wishlist key than its stable id', 'an export is verified by compilation alone',
  'a failed smoke test should leave its fixture changes behind', 'checkout payment fields are required for a useful demo',
  'a copied product route should always show the first item', 'a static export needs a server-side rewrite for every hash',
 ];
const e = (prompt: string, answers: string[], feedback: string): Spec => {
  const correct = explanationIndex++ % 2 === 0 ? 'A' : 'B';
  const answer = answers[0];
  const distractor = explanationDistractors[explanationIndex - 1];
  const choices = correct === 'A'
    ? `A) ${answer}; B) ${distractor}`
    : `A) ${distractor}; B) ${answer}`;
  return { category: 'explanation', prompt: `${prompt} Choose: ${choices}`, answers: [correct], feedback };
};
let applicationChoiceIndex = 0;
const a = (prompt: string, answers: string[], feedback: string, kind: Kind = 'conceptual'): Spec => { const choiceIndex = prompt.includes('A)') && prompt.includes('B)') && answers.length === 1 ? applicationChoiceIndex++ : -1; const [nextPrompt, nextAnswers] = balanceChoice(prompt, answers, choiceIndex); return { category: 'application', prompt: nextPrompt, answers: nextAnswers, feedback, kind }; };

const topics: Record<string, AssessmentQuestion[]> = {};
const add = (topicId: string, groups: Array<[string, Spec[]]>) => { topics[topicId] = groups.flatMap(([name, specs]) => group(topicId, name, specs)); };

add('shop-scope-catalog-and-originality', [
 ['brand-boundary', [
  p('Cedar & Thread needs a recognizable storefront identity. Which choice fits the originality rule? A) original Cedar & Thread wordmark; B) copied marketplace logo.', ['A'], 'The milestone requires an original brand identity.'),
  d('A fixture description repeats a competitor listing word for word. Choose the repair: A) rewrite it as Cedar & Thread copy; B) preserve it because product categories overlap.', ['A'], 'Original catalog copy is required even when the merchandise category is familiar.'),
  e('Why can a storefront borrow a cart pattern while using Cedar & Thread names and copy?', ['interaction patterns are general; brand assets and content must be original'], 'The distinction protects an original product identity.'),
  a('Which catalog title belongs in the original fixture? A) Cedar & Thread Linen Wrap; B) Marketplace Prime Linen Wrap.', ['A'], 'The fixture should use original product naming.', 'conceptual'),
 ]],
 ['mvp-boundary', [
  p('The milestone lists catalog, search, cart, and simulated checkout. Should a seller analytics console be required now?', ['no'], 'Analytics is outside the stated shopper milestone.'),
  d('A plan adds reviews, subscriptions, and seller payouts before the listed shopper flows work. Choose the repair: A) finish the four stated flows first; B) expand the milestone.', ['A'], 'Scope should stay anchored to the learner-facing requirements.'),
  e('Why defer a loyalty program when the requirement is only browse to simulated checkout?', ['it adds a new workflow and data contract beyond the milestone'], 'New workflows should be planned as later scope.'),
  a('Which acceptance sequence matches the current scope? A) catalog → search → cart → simulated checkout; B) seller payout → analytics.', ['A'], 'The first sequence exercises every stated milestone flow.'),
 ]],
 ['record-contract', [
  p('A product sample defines id, name, priceCents, category, and stock. Which value should identify it after its name changes?', ['id', 'product id'], 'Stable identity survives ordinary display edits.'),
  d('Two products share a name and the UI deletes both when that name is clicked. Choose the repair: A) use product id; B) use displayed name.', ['A'], 'Names are display values and may collide.'),
  e('Why keep priceCents as an integer in a product fixture?', ['integer cents avoid ambiguous floating-point money arithmetic'], 'Money calculations need a precise bounded representation.'),
  a('A fixture has `{id:"mug-1", name:"Mug", priceCents:1800, category:"home", stock:3}`. Which field should a cart item retain? A) `productId`; B) the full product object.', ['A'], 'Cart entries reference the stable product identity.'),
 ]],
 ['shopper-flow', [
  p('After selecting a catalog card, which screen should the planned flow reach? A) its product detail; B) an unrelated admin page.', ['A'], 'The card should lead to the matching shopper detail.'),
  d('The cart link opens checkout while the cart still has no review screen. Choose the repair: A) route to cart first; B) skip cart review.', ['A'], 'Cart review is an explicit step before checkout.'),
  e('Why model browse, detail, cart, and checkout as separate flow states?', ['each state has a distinct user goal and observable contract'], 'Distinct goals make routing and acceptance checks clear.'),
  a('Which next action completes a product-detail acceptance path? A) add the chosen product, then open cart; B) edit brand CSS only.', ['A'], 'The action exercises the shopper path from detail into cart.'),
 ]],
 ['fixture-determinism', [
  p('A test starts with the same three local products each run. Should its expected first product be stable?', ['yes'], 'Fixed fixtures make the expected result reproducible.'),
  d('Catalog order changes because code uses a random shuffle. Choose the repair: A) preserve a deterministic fixture order; B) update the expected answer randomly.', ['A'], 'Tests and lessons need repeatable local data.'),
  e('Why use local fixtures for this milestone?', ['they make behavior predictable without depending on a live catalog service'], 'A deterministic fixture isolates the lesson behavior.'),
  a('Which setup is appropriate for a repeatable search example? A) define the sample products in the prompt; B) rely on whatever a remote API returns today.', ['A'], 'Independent samples avoid unknown external values.'),
 ]],
 ['accessible-content', [
  p('A text-only product card names the item and exposes its action. Which property should the action label include? A) the product identity; B) an unrelated color value.', ['A'], 'A specific label should communicate which item the action affects.'),
  d('A navigation control is a styled div and cannot receive keyboard focus. Choose the repair: A) use a link or button; B) add more color.', ['A'], 'Semantic controls provide keyboard behavior.'),
  e('Why should the catalog have a clear heading?', ['it gives the page and assistive technology a meaningful structure'], 'Headings make the content hierarchy understandable.'),
  a('Which control label is bounded and useful? A) “Add Cedar & Thread Mug to cart”; B) “Click here”.', ['A'], 'A specific label communicates the action and item.'),
 ]],
]);

add('shop-stack-data-and-route-plan', [
 ['stack-fit', [
  p('For this client-only storefront milestone, which starting stack has the smallest fit? A) vanilla ES modules; B) a full backend framework.', ['A'], 'Plain modules meet the client-only requirement with less setup.'),
  d('The plan installs a server and database solely to render local catalog fixtures. Choose the repair: A) use vanilla ES modules first; B) require infrastructure now.', ['A'], 'The stack should match the current client-only scope.'),
  e('Why compare plain JavaScript, Vite, React, and full-stack frameworks before choosing?', ['their setup, rendering, and deployment tradeoffs differ'], 'A deliberate comparison keeps tooling proportional to the requirement.'),
  a('Which implementation choice follows the plan? A) browser-ready vanilla ES modules; B) server-only templates for every local fixture.', ['A'], 'The selected stack is client-side vanilla modules.'),
 ]],
 ['data-shape', [
  p('A cart line represents product `mug-1` quantity 2. Should it duplicate the full product title and price as its identity?', ['no'], 'The cart line needs a product reference and quantity; display data can come from the catalog.'),
  d('Cart rows store visible names as keys, so renaming a product creates a second line. Choose the repair: A) key by stable productId; B) keep name keys.', ['A'], 'Stable product identity prevents duplicate lines after display edits.'),
  e('Why distinguish a catalog product from a cart item?', ['the catalog describes merchandise while the cart records the shopper quantity'], 'Their contracts serve different responsibilities.'),
  a('Given product `{id:"lamp-2", name:"Lamp"}` and quantity 3, which cart shape is appropriate? A) `{productId:"lamp-2", quantity:3}`; B) `{name:"Lamp"}`.', ['A'], 'The cart entry preserves identity and quantity explicitly.'),
 ]],
 ['route-map', [
  p('A shopper returns from detail to browse. Which hash should the router select? A) `#/catalog`; B) `/server/catalog-db`.', ['A'], 'The planned client route is `#/catalog`.'),
  d('A product link drops the id and every detail link shows the same item. Choose the repair: A) use `#/product/:id`; B) use one fixed detail hash.', ['A'], 'The detail route must carry the selected product identity.'),
  e('Why map each route to a defined UI state before coding?', ['it makes navigation behavior and not-found cases testable'], 'A route map turns navigation into explicit contracts.'),
  a('Which hash should the checkout link target? A) `#/checkout`; B) `#/product/checkout`.', ['A'], 'Checkout is a top-level shopper route in this plan.'),
 ]],
 ['state-boundary', [
  p('Which value is derived from cart items rather than stored as an independent source? A) subtotal; B) the selected product id.', ['A'], 'Totals are projections of current cart records.'),
  d('Search input and result list keep different query values. Choose the repair: A) establish one query owner; B) let each copy drift.', ['A'], 'One source of truth keeps the route and results aligned.'),
  e('Why keep catalog fixtures separate from temporary search text?', ['fixtures are source data while the query is view state'], 'Separating them prevents a filter from mutating catalog records.'),
  a('Where should the selected hash route be read? A) the navigation/router boundary; B) every product card independently.', ['A'], 'One route boundary should coordinate the current view.'),
 ]],
 ['hash-navigation', [
  p('A copied link is `#/product/mug-1`. Which value should the detail lookup receive?', ['mug-1'], 'The hash parameter carries the product id.'),
  d('The app treats `#/unknown` as catalog content and renders a blank page. Choose the repair: A) render a defined not-found or fallback state; B) silently show stale detail.', ['A'], 'Unknown routes need an explicit recoverable state.'),
  e('Why use deterministic hash routes in a static export?', ['they work without assuming server-side route rewrites'], 'Hash navigation keeps the client-only export portable.'),
  a('Complete the route mapping: cart link → `#____`.', ['/cart'], 'The cart route is `#/cart`.' , 'code'),
 ]],
 ['dependency-config', [
  p('What does a bundler configuration primarily control? A) how source modules become browser-ready output; B) the shopper’s cart identity.', ['A'], 'Build configuration concerns transformation and delivery.'),
  d('The handoff serves untransformed module syntax where the chosen setup requires a build. Choose the repair: A) serve the browser-ready output; B) change product ids.', ['A'], 'Deployment must match the selected module/build contract.'),
  e('Why should a project avoid adding dependencies with no current behavior to support?', ['extra setup increases maintenance without serving the milestone'], 'Dependencies should have a clear role in the plan.'),
  a('Which source boundary is consistent with the selected stack? A) import catalog data from a local ES module; B) require an unplanned remote service.', ['A'], 'Local module imports keep the fixture boundary deterministic.'),
 ]],
]);

add('shop-setup-navigation-and-catalog', [
 ['shell', [
  p('Which shell element should remain available across catalog and cart views? A) Cedar & Thread navigation; B) a page-specific debug dump.', ['A'], 'Shared navigation supports the shopper journey.'),
  d('The catalog renders without a main landmark. Choose the repair: A) add a semantic main region; B) add another decorative div.', ['A'], 'Landmarks make the shell structurally usable.'),
  e('Why keep shell layout separate from product-card rendering?', ['global navigation and one-record presentation have different responsibilities'], 'Clear boundaries make changes safer.'),
  a('Which shell includes the required navigation targets? A) catalog, cart, and checkout links; B) only a logo image.', ['A'], 'The shell must expose the planned shopper routes.'),
 ]],
 ['navigation-contract', [
  p('Clicking a product card should update the hash to which kind of route? A) that product’s detail route; B) an unrelated admin route.', ['A'], 'The card should navigate to that product’s detail.'),
  d('A cart link changes the hash but leaves the old catalog view visible. Choose the repair: A) render from the current hash; B) ignore route changes.', ['A'], 'The view must follow the route state.'),
  e('Why make navigation links real links or keyboard-operable controls?', ['they provide predictable activation and accessible route changes'], 'Navigation is an observable interaction contract.'),
  a('Which route transition tests the catalog navigation contract? A) click Cart and observe `#/cart`; B) resize the logo.', ['A'], 'The first transition checks the declared route.'),
 ]],
 ['catalog-render', [
  p('A fixture contains three products. How many product cards should the initial catalog render?', ['3', 'three'], 'Each fixture product should have one stable card.'),
  d('Only the first fixture item appears because rendering returns inside the loop. Choose the repair: A) render after mapping all items; B) keep the early return.', ['A'], 'The catalog must project the whole fixture collection.'),
  e('Why should each card receive a stable product id?', ['actions and links must target the intended record even when names repeat'], 'Stable identity protects interactions.'),
  a('A sample has products `mug-1` and `lamp-2`. Which card href is correct for the lamp? A) `#/product/lamp-2`; B) `#/product/mug-1`.', ['A'], 'The card route includes the lamp’s id.'),
 ]],
 ['normalization', [
  p('If a product has priceCents 1800, should the display treat it as eighteen dollars under a cents contract?', ['yes'], 'The declared money contract is integer cents.'),
  d('A card prints `undefined` because it reads `title` while the sample defines `name`. Choose the repair: A) use the declared sample field; B) invent a second field silently.', ['A'], 'Rendering must follow the data contract actually defined.'),
  e('Why normalize product display values at one boundary?', ['it keeps cards consistent and localizes shape differences'], 'A single adapter prevents scattered field assumptions.'),
  a('For `{name:"Mug", priceCents:1800}`, which label is bounded? A) “Mug — $18.00”; B) “undefined — NaN”.', ['A'], 'The display should format the defined sample values.'),
 ]],
 ['catalog-state', [
  p('A local catalog has loaded but contains zero records. Which state is appropriate? A) an empty catalog message; B) a successful checkout confirmation.', ['A'], 'An empty source needs an explicit empty state.'),
  d('The page says “No matches” before any catalog exists. Choose the repair: A) distinguish unavailable/empty source from filtered results; B) use one message for all states.', ['A'], 'State messages should describe the actual condition.'),
  e('Why define empty and unavailable states even with local fixtures?', ['the UI contract remains clear when data is absent or a fixture fails'], 'Explicit states make recovery and tests predictable.'),
  a('Which message fits a loaded zero-product catalog? A) “No Cedar & Thread products yet.”; B) “Payment declined.”', ['A'], 'The message describes the catalog condition.'),
 ]],
 ['accessible-cards', [
  p('A product name is the destination control. Which semantic element is most suitable?', ['a link'], 'A link communicates navigation to product detail.'),
  d('A card image is the only way to identify the item and has empty alt text. Choose the repair: A) provide meaningful alt text or mark it decorative when the name is adjacent; B) leave ambiguity.', ['A'], 'Image alternatives must match their information role.'),
  e('Why associate a visible product name with its detail link?', ['shoppers can identify and activate the intended item'], 'The card should expose both identity and action.'),
  a('Which card control label is clearer? A) “View Linen Wrap”; B) “Open”.', ['A'], 'The label names the destination item.'),
 ]],
]);

add('shop-product-details-and-client-server-boundaries', [
 ['detail-lookup', [
  p('For `#/product/mug-1`, should the detail lookup use `mug-1` or the visible name?', ['mug-1'], 'The route carries the stable product id.'),
  d('Every detail link shows the same product because the lookup ignores the route parameter. Choose the repair: A) pass the parsed id; B) use the first fixture.', ['A'], 'The selected route must determine the record.'),
  e('Why is a route parameter part of the detail view contract?', ['it connects one navigation target to one product record'], 'The parameter preserves navigation identity.'),
  a('A sample route is `#/product/lamp-2`. Which record should render? A) the record with id lamp-2; B) the first record alphabetically.', ['A'], 'Detail rendering follows the route id.'),
 ]],
 ['not-found', [
  p('What should an unknown product id produce? A) a clear not-found state; B) an unrelated product silently.', ['A'], 'Unknown records need an honest recoverable state.'),
  d('A missing id crashes while reading `.name`. Choose the repair: A) check lookup result before rendering; B) hide the error with a random fallback.', ['A'], 'The missing-record branch must be explicit.'),
  e('Why provide a catalog link from a not-found detail view?', ['it gives the shopper a recoverable next action'], 'A not-found state should preserve navigation recovery.'),
  a('Which action belongs in a not-found state? A) “Back to catalog”; B) “Submit payment again”.', ['A'], 'The catalog is the safe recovery destination.'),
 ]],
 ['fixture-adapter', [
  p('A local fixture adapter returns a product record. Should it be labeled as a live API?', ['no'], 'Local fixtures must be clearly identified.'),
  d('A UI imports fixture arrays directly from every component. Choose the repair: A) centralize an adapter; B) duplicate and edit arrays in each view.', ['A'], 'One boundary keeps fixture replacement manageable.'),
  e('Why keep a local fixture adapter replaceable?', ['the UI contract can later receive remote data without rewriting every component'], 'A boundary isolates the data source.'),
  a('Which description is accurate for the milestone adapter? A) deterministic local catalog fixture; B) production inventory authority.', ['A'], 'The adapter does not claim server authority.'),
 ]],
 ['server-trust', [
  p('Can a browser-only price check be the final authority for an order price?', ['no'], 'A client display check can be altered and is not authoritative.'),
  d('The client alone decides that stock is available at checkout. Choose the repair: A) describe the check as a fixture simulation; B) call it secure inventory validation.', ['A'], 'The milestone has no authoritative server.'),
  e('Why would final price, stock, and authorization checks require a server in a real store?', ['the server controls trusted data and cannot rely on mutable client code'], 'Trust-sensitive decisions belong at an authoritative boundary.'),
  a('Which statement fits this client-only lesson? A) “Stock is simulated from local fixtures”; B) “The browser guarantees stock.”', ['A'], 'The lesson must label its simulation honestly.'),
 ]],
 ['database-role', [
  p('What is a database primarily responsible for? A) durable records; B) styling a product card.', ['A'], 'Databases persist and query application records.'),
  d('A lesson says a local array is a production database. Choose the repair: A) call it a fixture; B) claim durability.', ['A'], 'An in-memory/local fixture is not a database.'),
  e('Why defer database implementation here?', ['the current client-only milestone can teach data shape without adding durable backend infrastructure'], 'The topic explains the boundary while respecting scope.'),
  a('Which future server responsibility is correctly named? A) store and query authoritative products; B) format a button label in the browser.', ['A'], 'Persistence and queries are database-facing responsibilities.'),
 ]],
 ['auth-scope', [
  p('Does a product detail page need durable account authentication in this milestone?', ['no'], 'The current scope does not require durable auth.'),
  d('A sample asks the learner to collect passwords for simulated checkout. Choose the repair: A) remove credential collection; B) save passwords in local storage.', ['A'], 'The storefront must not collect credentials or personal data.'),
  e('What is the difference between authentication and authorization?', ['authentication establishes who someone is; authorization decides what they may do'], 'The concepts are related but distinct server concerns.'),
  a('Which plan is within scope? A) explain auth concepts and defer durable auth to Phase 7; B) implement account passwords in Phase 6.', ['A'], 'Only the conceptual boundary belongs here.'),
 ]],
]);

add('shop-product-search-and-filters', [
 ['query-normalization', [
  p('Should searches for ` mug ` and `MUG` match a case-insensitive trimmed catalog search?', ['yes'], 'Normalization removes surrounding spaces and case differences.'),
  d('A query with leading spaces returns no match. Choose the repair: A) trim before matching; B) alter product names.', ['A'], 'The query boundary should normalize user input.'),
  e('Why normalize the query before filtering?', ['equivalent user input should produce equivalent results'], 'Normalization makes search behavior predictable.'),
  a('For a case-insensitive search, what normalized query does `  Wrap ` become?', ['wrap'], 'Trimming and case folding produce `wrap`.'),
 ]],
 ['filter-composition', [
  p('A category filter is Home and the query is “lamp”. Should a result satisfy both active conditions?', ['yes'], 'Composed filters narrow results by every active criterion.'),
  d('The category selector resets the text query whenever it changes. Choose the repair: A) compose independent filters; B) erase unrelated state.', ['A'], 'Independent controls should retain their stated values.'),
  e('Why define filter order and composition explicitly?', ['it prevents ambiguous result sets when multiple controls are active'], 'A predictable projection is easier to use and test.'),
  a('Products are `[Home Lamp, Garden Lamp, Home Mug]`; category Home plus query lamp yields what count?', ['1', 'one'], 'Only Home Lamp satisfies both conditions.'),
 ]],
 ['derived-results', [
  p('Should applying a filter delete nonmatching products from the catalog source?', ['no'], 'Filtering should derive a view and preserve source records.'),
  d('After clearing a filter, deleted products cannot return. Choose the repair: A) keep the source catalog and derive visible results; B) mutate the source.', ['A'], 'A reversible view must not destroy source data.'),
  e('Why are search results called a derived view?', ['they are calculated from source products and current controls'], 'The source remains intact while the projection changes.'),
  a('If the source has four products and the query matches two, which collection should the grid render? A) the two-item filtered projection; B) the untouched four-item source.', ['A'], 'The visible grid renders derived matches.'),
 ]],
 ['result-counts', [
  p('A query matches two of five products. Which visible result count is correct?', ['2', 'two'], 'The count describes the active projection.'),
  d('The header always says “5 products” while two matches are shown. Choose the repair: A) label the active result count; B) leave the misleading count.', ['A'], 'Counts should correspond to what the shopper sees.'),
  e('Why might total catalog count and filtered count both be useful?', ['they answer different questions and should be labeled distinctly'], 'Clear labels prevent count ambiguity.'),
  a('Which message is precise for two matches out of five? A) “2 results (5 in catalog)”; B) “5 results” alone.', ['A'], 'The first message distinguishes projection and source.'),
 ]],
 ['empty-results', [
  p('The catalog has products but the active query matches none. Which state is correct? A) “No products match this search”; B) “No products exist yet”.', ['A'], 'The source exists; only the projection is empty.'),
  d('The app says “No products yet” for a nonempty catalog with zero matches. Choose the repair: A) use a filter-specific message; B) claim the source is empty.', ['A'], 'The message should describe the active filter.'),
  e('Why distinguish an empty catalog from empty search results?', ['the recovery actions differ: add data versus clear or change the query'], 'Different causes need different guidance.'),
  a('Which recovery action fits zero search matches? A) clear filters; B) enter payment consent.', ['A'], 'Clearing the query can restore the projection.'),
 ]],
 ['price-boundary', [
  p('A product costs 1299 cents. Should the source price remain an integer while the UI formats dollars?', ['yes'], 'The lesson keeps integer cents in source data.'),
  d('A filter compares the formatted string “$18.00” to a numeric maximum. Choose the repair: A) compare priceCents numerically; B) compare display strings.', ['A'], 'Filtering uses the integer cents contract.'),
  e('Why keep priceCents separate from its formatted label?', ['integer source data supports precise comparison while the label serves display'], 'The source contract and presentation format have different jobs.'),
  a('Products cost 1800 and 2500 cents; the maximum is 2000. Which result remains? A) the 1800-cent product; B) the 2500-cent product.', ['A'], 'The numeric maximum keeps only the 1800-cent product.'),
 ]],
]);

add('shop-cart-quantity-and-persistence', [
 ['cart-identity', [
  p('Two lines display the same name but have ids mug-1 and mug-2. What should distinguish them?', ['product id', 'productId'], 'Stable product identity distinguishes equal labels.'),
  d('Removing a cart line by visible index removes the wrong item after filtering. Choose the repair: A) pass productId; B) pass the index.', ['A'], 'Cart transitions should target stable identity.'),
  e('Why should cart entries use productId instead of product name?', ['names can change or collide while ids identify records'], 'Identity must survive display changes.'),
  a('Complete the sample cart line for product lamp-2, quantity 3: `{ productId: "____", quantity: 3 }`.', ['lamp-2'], 'The cart stores the product id.', 'code'),
 ]],
 ['quantity-bounds', [
  p('Which quantity is valid when stock is 3? A) 1, 2, or 3; B) 0 or 4.', ['A'], 'A quantity must be a positive integer no greater than stock.'),
  d('The decrement button creates quantity 0 rows. Choose the repair: A) reject zero and offer explicit Remove; B) persist a zero-quantity line.', ['A'], 'Zero is invalid; removal is an explicit action.'),
  e('Why cap quantity by the declared stock fixture?', ['it prevents the simulated cart from claiming more available units than the fixture allows'], 'The bound follows the local stock contract.'),
  a('A line has quantity 2 and stock 3. What should increment produce?', ['3'], 'The next valid quantity is three.'),
 ]],
 ['cart-transitions', [
  p('Should adding a product mutate the original catalog fixture?', ['no'], 'The cart transition should create or update cart state separately.'),
  d('A remove action calls `splice` on the shared catalog array. Choose the repair: A) update cart state immutably; B) mutate catalog records.', ['A'], 'Cart operations must not destroy source catalog data.'),
  e('Why make cart transitions explicit actions?', ['each action can enforce identity and quantity rules consistently'], 'Central transitions reduce contradictory behavior.'),
  a('Which sequence preserves a cart contract? A) add mug → increment → decrement → remove; B) delete the catalog on decrement.', ['A'], 'The first sequence exercises reversible cart actions.'),
 ]],
 ['derived-totals', [
  p('Two items cost 1800 cents each and one item costs 500 cents. What subtotal is shown?', ['4100', '4100 cents'], 'The subtotal is the sum of line price times quantity.'),
  d('The total stays at the old value after quantity changes. Choose the repair: A) derive totals from current items; B) edit a stale displayed number.', ['A'], 'Totals must follow current cart state.'),
  e('Why should totals be derived instead of independently edited?', ['one source of cart state avoids drift between rows and summary'], 'Derived values remain consistent after every transition.'),
  a('For `{priceCents:1200, quantity:2}`, complete line total: `1200 * 2 = ____`.', ['2400'], 'The line total is 2400 cents.', 'code'),
 ]],
 ['saved-envelope', [
  p('What persisted cart shape is required? A) `{version:1,items:[{productId,quantity}]}`; B) an unversioned array of display labels.', ['A'], 'The versioned envelope is the declared storage contract.'),
  d('The loader replaces corrupt saved text with an empty cart immediately. Choose the repair: A) preserve it until explicit recovery; B) discard it silently.', ['A'], 'Unknown or corrupt data must remain recoverable.'),
  e('Why version the cart envelope?', ['future loaders can distinguish known formats and migrate safely'], 'An explicit version supports controlled evolution.'),
  a('Complete the storage example for two mugs: `{ version: 1, items: [{ productId: "mug-1", quantity: ____ }] }`.', ['2'], 'The quantity is an explicit positive integer.', 'code'),
 ]],
 ['reload-recovery', [
  p('After a reload with a valid saved envelope, should the cart restore its saved items?', ['yes'], 'Valid persisted cart state should be recovered.'),
  d('A missing storage key throws instead of starting with an empty cart. Choose the repair: A) treat missing data as empty; B) invent a cart line.', ['A'], 'Missing data has a safe empty-state meaning.'),
  e('Why preserve malformed cart text before explicit recovery?', ['the learner can inspect or retry recovery instead of losing evidence silently'], 'Recovery should be deliberate and reversible.'),
  a('Which recovery distinction is correct? A) missing key → empty cart; corrupt envelope → preserved recovery state; B) both → random cart.', ['A'], 'The two storage conditions have different contracts.'),
 ]],
]);

add('shop-checkout-validation-and-failure-states', [
 ['delivery-choice', [
  p('Which delivery value is valid in this checkout simulation?', ['pickup-demo', 'post-demo'], 'The permitted choices are pickup-demo and post-demo.'),
  d('The form accepts `drone-live` as a delivery mode. Choose the repair: A) reject it; B) treat every string as valid.', ['A'], 'Validation must use the bounded delivery choices.'),
  e('Why keep delivery choices as explicit demo values?', ['they make the simulated checkout deterministic and avoid real fulfillment claims'], 'Bounded values define the simulation clearly.'),
  a('Which choice should a valid form submit? A) `pickup-demo`; B) `overnight-real`.', ['A'], 'Only the declared demo choices are allowed.'),
 ]],
 ['consent', [
  p('Should simulated checkout succeed when the simulation-consent checkbox is unchecked?', ['no'], 'Consent is a required gate for the simulation.'),
  d('The submit handler ignores the consent checkbox. Choose the repair: A) validate it before success; B) mark success regardless.', ['A'], 'The checkbox must participate in the validation contract.'),
  e('Why use a simulation consent checkbox?', ['it makes clear that the flow does not process real payment or personal data'], 'The control communicates the boundary to the learner.'),
  a('Which state is valid for a successful demo submission? A) delivery selected and consent checked; B) no delivery and unchecked consent.', ['A'], 'Both declared prerequisites are satisfied.'),
 ]],
 ['review-summary', [
  p('Should checkout review totals come from the current cart?', ['yes'], 'Review must reflect the current cart projection.'),
  d('The review uses a stale total after the shopper changes quantity. Choose the repair: A) recompute from cart state; B) retain the old total.', ['A'], 'The review summary must stay synchronized.'),
  e('Why show a review step before simulated success?', ['the shopper can verify items, delivery, and total before committing the demo transition'], 'Review makes the transition observable and recoverable.'),
  a('Which review values are within scope? A) cart items, total, and delivery choice; B) unrequested customer details.', ['A'], 'The simulation keeps review values limited to the cart and demo choice.'),
 ]],
 ['simulated-outcome', [
  p('Should a simulated decline show the success confirmation?', ['no'], 'Decline and success are separate outcomes.'),
  d('The UI shows “Order confirmed” before the simulated outcome resolves. Choose the repair: A) wait for the outcome; B) show success on submit click.', ['A'], 'Confirmation follows simulated success only.'),
  e('Why label success and decline as simulated outcomes?', ['the demo describes state transitions without representing a real payment transaction'], 'Clear labeling prevents a false production claim.'),
  a('Which outcome is correct for a simulated decline? A) show a recoverable decline and keep cart state; B) erase the cart and claim success.', ['A'], 'Failure should preserve recovery and avoid false confirmation.'),
 ]],
 ['failure-retry', [
  p('After a simulated failure, should the cart remain available for retry?', ['yes'], 'A failure should not destroy the shopper’s work.'),
  d('Retry starts with an empty cart because failure reset all state. Choose the repair: A) preserve cart and inputs; B) clear everything.', ['A'], 'Recoverable failure keeps the prior state.'),
  e('Why make checkout failure recoverable?', ['the shopper can correct the choice or retry without rebuilding the cart'], 'Recovery is part of the checkout contract.'),
  a('Which retry path is valid? A) change delivery or consent, submit again; B) reload until success without preserving state.', ['A'], 'The first path uses explicit recovery.'),
 ]],
 ['submit-guard', [
  p('Should two rapid clicks create two simulated submissions?', ['no'], 'Duplicate submission should be prevented.'),
  d('The submit button remains active while an outcome is pending. Choose the repair: A) disable or guard repeat submits; B) enqueue unlimited attempts.', ['A'], 'A pending guard keeps state transitions deterministic.'),
  e('Why guard duplicate checkout submissions?', ['one user action should produce one bounded outcome'], 'Idempotent behavior prevents contradictory confirmations.'),
  a('Which pending-state label is appropriate? A) “Simulating…”; B) “Payment captured”.', ['A'], 'The label reflects the simulated pending state.'),
 ]],
]);

add('shop-testing-export-and-handoff', [
 ['visible-flow', [
  p('What should a smoke test observe after adding a fixture product to cart? A) the cart shows that product and quantity; B) only a private variable changed.', ['A'], 'The test should assert visible shopper behavior.'),
  d('A test passes by reading a private cart variable while the cart page is blank. Choose the repair: A) assert rendered cart rows; B) keep the private assertion.', ['A'], 'User-facing behavior catches rendering failures.'),
  e('Why test catalog → detail → cart → checkout as a flow?', ['it verifies the route and state contracts work together'], 'A flow catches integration errors between views.'),
  a('Which assertion belongs after clicking `#/cart`? A) the intended cart item is visible; B) the source filename is spelled correctly.', ['A'], 'The first assertion checks the user flow.'),
 ]],
 ['deterministic-tests', [
  p('Should a fixed catalog fixture produce the same search count on every run?', ['yes'], 'Deterministic fixtures make expectations stable.'),
  d('A test depends on remote catalog ordering and flakes. Choose the repair: A) use fixed local samples; B) widen the expected count.', ['A'], 'Tests should control their data.'),
  e('Why capture and restore cart storage around a smoke test?', ['the test should be repeatable without damaging learner state'], 'Isolation makes verification safe and deterministic.'),
  a('Which test setup is bounded? A) save cart snapshot, use fixed items, restore it; B) overwrite the learner’s cart permanently.', ['A'], 'The first setup isolates the test.'),
 ]],
 ['selector-contract', [
  p('Which selector is more stable for a cart row? A) an authored `data-cart-row`; B) the third div.', ['A'], 'An explicit semantic contract survives layout changes.'),
  d('A test breaks after a wrapper div is added because it selects `div:nth-child(3)`. Choose the repair: A) use a role or test id; B) add another wrapper.', ['A'], 'Layout position is a brittle selector.'),
  e('Why should selectors follow authored behavior contracts?', ['tests remain focused on meaningful UI behavior rather than incidental markup'], 'Stable contracts reduce false failures.'),
  a('Complete the query for the authored row contract: `document.querySelectorAll("[data-____]")`.', ['cart-row'], 'The selector uses the declared `data-cart-row` contract.', 'code'),
 ]],
 ['export-handoff', [
  p('Which file should a static server open from an extracted build? A) the compiled root `index.html`; B) a lesson transcript.', ['A'], 'The root compiled entry starts the exported app.'),
  d('The handoff contains JSX source as the hosted entry and shows a parse error. Choose the repair: A) serve compiled output; B) rename a product.', ['A'], 'The host needs browser-ready output.'),
  e('Why include source and continuation instructions in an export?', ['the recipient can run the app and understand how to continue development'], 'A handoff needs both runnable output and context.'),
  a('Which command can serve an extracted static export for verification? A) `python -m http.server 8080`; B) `npm uninstall react`.', ['A'], 'A static HTTP server exercises the handoff environment.'),
 ]],
 ['wishlist-feature', [
  p('Should the independent wishlist feature persist to storage in this phase?', ['no'], 'The wishlist is explicitly in-memory only.'),
  d('A wishlist implementation writes items to the cart envelope. Choose the repair: A) keep separate in-memory wishlist state; B) merge wishlist into cart persistence.', ['A'], 'Wishlist and cart have independent state contracts.'),
  e('Why is wishlist a suitable final independent feature?', ['it extends product identity and interaction without changing checkout'], 'The feature exercises planning while preserving existing flows.'),
  a('Which wishlist contract is in scope? A) add/remove product ids during the session; B) durable account wishlist across browsers.', ['A'], 'Only the in-memory session feature is required.'),
 ]],
 ['wishlist-integration', [
  p('Adding a product to the wishlist should it remove the product from cart?', ['no'], 'Wishlist and cart are independent shopper choices.'),
  d('A wishlist button stops catalog navigation because it submits the checkout form. Choose the repair: A) isolate the button action; B) let it submit checkout.', ['A'], 'The new feature must not hijack existing flow controls.'),
  e('Why test wishlist alongside existing catalog and cart flows?', ['the feature must integrate without regressing established behavior'], 'Independent work still needs regression coverage.'),
  a('Which acceptance sequence fits the new feature? A) add product to wishlist, remove it, then add product to cart; B) collect payment details.', ['A'], 'The sequence verifies independent in-memory behavior and cart continuity.'),
 ]],
]);

export const ecommerceQuestions: Record<string, AssessmentQuestion[]> = topics;
export default ecommerceQuestions;
