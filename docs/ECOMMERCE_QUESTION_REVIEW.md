# Ecommerce question review

Astra editorial review completed 2026-09-16. Curriculum/browser acceptance is recorded separately in HANDOFF.md.

The eight existing ecommerce topics each contain 24 distinct questions, six in each reasoning category. Six concept groups per topic provide fresh scenarios for prediction, diagnosis, explanation and application. Changing option order does not create a new identity. The unchanged engine retires a revealed identity and selects an unseen equivalent, guarding the ten-credit reserve.

Luna drafted the banks; Astra reviewed scope, prerequisites, answer normalization, scenarios and alternatives. Corrections replaced open-ended explanations that accepted only one exact sentence with bounded choices; replaced generic distractors with separately authored misconceptions; balanced answer placement; rejected the incorrect cart alias for #/cart; specified two mugs for the quantity-2 example; clarified stock limits and explicit removal; removed untaught query-hash parsing; and restored query-normalization questions after catching a duplicate price-filter group. Final A/B ordering preserves the corresponding answer keys.

Content-only inspection: 8 banks, 192 records, 192 unique IDs, 192 unique prompts, 48 explanations split A=24/B=24, and no unbounded long-answer conceptual prompts. Progression tests independently exercise repeated reveals, missed answers, five-credit reload, ten distinct credits and sticky earned passes.

The catalog uses original Cedar & Thread fixtures with stable IDs, integer priceCents and stock bounds. The selected stack is vanilla ES modules after a three-stack comparison. Local hash routes do not imply server routing. Database/API/authentication/authorization questions teach boundaries, not implemented services.

Cart questions use `{version:1,items:[{productId,quantity}]}` and preserve corrupt data until explicit recovery. Checkout uses only fictional delivery choices, simulation consent and deterministic success/decline. It collects no customer, payment or credential data. The final independent wishlist is in-memory only and separate from the persisted cart.
