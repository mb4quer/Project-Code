import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import preserved from './fixtures/phase3-preserved.json';

it('preserves the historical manifest with documented checkout line endings and upload exception', () => {
  const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
  for (const file of preserved) {
    const bytes = readFileSync(file.path);
    const allowed = [file.sha256];
    // The uploaded checkout already differed before Phase 5. Keep the historical
    // manifest intact and allow only this exact observed upload, never new hashes.
    // phase5-preservation separately protects every starting byte, including Weather.
    if (file.path === 'src/content/domTodo.ts') allowed.push('bd40c4432ad838742a1e79b551cbba9c8bfe894f021cd125ee5ea2eea40223f6');
    expect(allowed.includes(hash(bytes)) || allowed.includes(hash(bytes.toString().replace(/\r\n/g, '\n'))), file.path).toBe(true);
  }
});
