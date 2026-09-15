import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import preserved from './fixtures/phase4-checkout-preserved.json';

it('preserves Phase 4 content, runtime, schema and lockfile across Git checkout line endings', () => {
  for (const file of preserved) {
    // The immutable manifest was captured from a CRLF checkout. Git may check
    // these text files out as LF; normalize only line endings, never content.
    const source = readFileSync(file.path, 'utf8').replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    expect(createHash('sha256').update(source).digest('hex'), file.path).toBe(file.sha256);
  }
});
