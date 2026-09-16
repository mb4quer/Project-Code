# Ecommerce question review

Status: draft, awaiting Astra review. Root acceptance has not been claimed.

`src/content/ecommerceQuestions.ts` contains 24 reviewed question records for each of the eight ecommerce topics. Each topic has six equivalence groups, and each group has one prediction, debugging, explanation, and application question. Questions use explicit sample values where a fixture contract is not yet confirmed.

The content is scoped to the Cedar & Thread original storefront and client-only hash routes: `#/catalog`, `#/product/:id`, `#/cart`, and `#/checkout`. The stack group teaches the vanilla ES module choice after comparing plain JavaScript, Vite, React, and full-stack options. Product detail boundaries explain APIs, databases, authentication, and authorization without requiring durable auth in this phase.

Cart questions use the persisted envelope `{version:1,items:[{productId,quantity}]}` and require unknown or corrupt data to remain available until explicit recovery. Checkout questions use only `pickup-demo` or `post-demo`, a simulation-consent checkbox, and simulated success/decline outcomes. They do not ask for names, addresses, email, payment details, credentials, or other personal data. The final topic’s independent wishlist feature is in-memory only and remains separate from cart persistence.

Revision note: explanation prompts are now explicit A/B choices with balanced correct-option placement across the bank, and the cart route application answer is the exact `/cart` segment. Originality and route scenarios use distinct fixture-copy and return-navigation cases. This remains a draft pending final Astra review and root acceptance.

Validation still belongs to the root integration pass: confirm the final product fixture contract, import wiring, curriculum attachment, and Astra’s content review before publication.
