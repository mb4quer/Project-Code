import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import preserved from './fixtures/phase4-checkout-preserved.json';

it('preserves the actual Phase 4 checkout content, runtime, schema and dependency lockfile byte for byte', () => {
  for (const file of preserved) expect(createHash('sha256').update(readFileSync(file.path)).digest('hex'), file.path).toBe(file.sha256);
});
