import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import preserved from './fixtures/phase3-preserved.json';

it('preserves the exact published Todo content, mastery engine, store, compiler, storage and lockfile', () => {
  for (const file of preserved) expect(createHash('sha256').update(readFileSync(file.path)).digest('hex'), file.path).toBe(file.sha256);
});
