import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { testExportFiles } from '../../src/content/todoPhase3References';

const source = `const output = document.createElement('p'); output.id = 'storage-result'; document.body.append(output);
(async () => {
try { output.textContent = await trainingStorage.getItem('tasks') ?? 'empty'; } catch(error) { output.textContent = error.message; }
})();
const save = document.createElement('button'); save.textContent = 'Save training'; document.body.append(save);
save.onclick = async () => { try { await trainingStorage.setItem('tasks', 'stored task'); output.textContent = 'saved'; } catch(error) { output.textContent = error.message; } };
const probe = document.createElement('button'); probe.textContent = 'Probe boundaries'; document.body.append(probe);
probe.onclick = async () => {
try { await trainingStorage.setItem('__proto__', 'bad'); } catch { console.info('unsafe key rejected'); }
console.info('host key: ' + await trainingStorage.getItem('project-code.session.v1'));
try { localStorage.getItem('project-code.session.v1'); } catch { console.info('direct storage blocked'); }
};`;
test('preview storage survives Run/reload, isolates workspaces, and clears only selected data', async ({ page }) => {
  await page.goto('/');
  await page.locator('#file-tree').getByRole('button', { name: 'main.js', exact: true }).click(); await page.locator('#code').fill(source);
  await page.locator('#run').click();
  const frame = () => page.frameLocator('iframe[title="Learner preview"]');
  await expect(frame().locator('#storage-result')).toHaveText('empty');
  await frame().getByText('Save training', { exact: true }).click(); await expect(frame().locator('#storage-result')).toHaveText('saved');
  await page.locator('#run').click(); await expect(frame().locator('#storage-result')).toHaveText('stored task');
  await page.reload(); await expect(page.locator('iframe')).toHaveCount(0);
  await page.locator('#run').click(); await expect(frame().locator('#storage-result')).toHaveText('stored task');
  await frame().getByText('Probe boundaries', { exact: true }).click();
  await expect(page.locator('#console-output')).toContainText('unsafe key rejected'); await expect(page.locator('#console-output')).toContainText('host key: null'); await expect(page.locator('#console-output')).toContainText('direct storage blocked');
  await page.getByRole('button', { name: 'React + JSX', exact: true }).click();
  await page.locator('#file-tree').getByRole('button', { name: 'main.jsx', exact: true }).click(); await page.locator('#code').fill(source); await page.locator('#run').click();
  await expect(frame().locator('#storage-result')).toHaveText('empty');
  await page.getByRole('button', { name: 'Vanilla JavaScript', exact: true }).click();
  const backupReady = page.waitForEvent('download'); await page.locator('#backup').click(); const backup = await backupReady;
  await page.locator('#clear-training').click(); await page.locator('#dialog-confirm').click(); await page.locator('#run').click();
  await expect(frame().locator('#storage-result')).toHaveText('empty'); await expect(page.locator('#code')).toHaveValue(source);
  await page.locator('#import-file').setInputFiles((await backup.path())!); await page.locator('#dialog-confirm').click();
  await expect(page.locator('iframe')).toHaveCount(0); await page.locator('#run').click(); await expect(frame().locator('#storage-result')).toHaveText('stored task');
});

test('failed saves reject training writes and retain previous saved data', async ({ page }) => {
  await page.goto('/'); await page.locator('#file-tree').getByRole('button', { name: 'main.js', exact: true }).click(); await page.locator('#code').fill(source); await page.locator('#run').click();
  const frame = page.frameLocator('iframe[title="Learner preview"]'); await expect(frame.locator('#storage-result')).toHaveText('empty');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await frame.getByText('Save training', { exact: true }).click(); await expect(frame.locator('#storage-result')).toContainText('not saved'); await expect(page.locator('#save-banner')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('project-code.session.v1')!).workspaces.vanilla.trainingData);
  expect(saved).toBeUndefined();
});

test('downloaded ZIP preserves sources and runs independently with real browser persistence', async ({ page, context }) => {
  await page.goto('/'); await page.locator('#file-tree').getByRole('button', { name: 'main.js', exact: true }).click(); await page.locator('#code').fill(source);
  const pending = page.waitForEvent('download'); await page.locator('#export-project').click(); const download = await pending;
  const bytes = await readFile((await download.path())!); const files: Record<string, string> = {}; let pos = 0;
  while (bytes.readUInt32LE(pos) === 0x04034b50) { const size = bytes.readUInt32LE(pos + 18), n = bytes.readUInt16LE(pos + 26), x = bytes.readUInt16LE(pos + 28); const name = bytes.subarray(pos + 30, pos + 30 + n).toString(); const start = pos + 30 + n + x; files[name] = bytes.subarray(start, start + size).toString(); pos = start + size; }
  expect(files['source/main.js']).toBe(source); expect(files['README.md']).toContain('python -m http.server'); expect(files['index.html']).not.toContain('writerId');
  const exported = await context.newPage(); await exported.route('http://exported.test/**', route => route.fulfill({ contentType: 'text/html', body: files['index.html'] }));
  await exported.goto('http://exported.test/'); await expect(exported.locator('#storage-result')).toHaveText('empty'); await exported.getByText('Save training', { exact: true }).click(); await expect(exported.locator('#storage-result')).toHaveText('saved'); await exported.reload(); await expect(exported.locator('#storage-result')).toHaveText('stored task');
});

test('finished Todo exports with filters, independent identities, persistence and repeatable smoke checks', async ({ page, context }) => {
  test.setTimeout(60000);
  await page.goto('/');
  for (const [name, value] of Object.entries(testExportFiles)) {
    await page.locator('#file-tree').getByRole('button', { name, exact: true }).click(); await page.locator('#code').fill(value);
  }
  const downloadReady = page.waitForEvent('download'); await page.locator('#export-project').click(); const download = await downloadReady;
  const bytes = await readFile((await download.path())!); let pos = 0; let html = '';
  await writeFile('test-results/todo-export.zip', bytes);
  while (bytes.readUInt32LE(pos) === 0x04034b50) {
    const size = bytes.readUInt32LE(pos + 18), n = bytes.readUInt16LE(pos + 26), x = bytes.readUInt16LE(pos + 28);
    const name = bytes.subarray(pos + 30, pos + 30 + n).toString(); const start = pos + 30 + n + x;
    if (name === 'index.html') html = bytes.subarray(start, start + size).toString(); pos = start + size;
  }
  expect(html).toContain('trainingStorage');
  const exported = await context.newPage(); await exported.route('http://todo-export.test/**', route => route.fulfill({ contentType: 'text/html', body: html }));
  await exported.goto('http://todo-export.test/');
  const add = async (label: string) => { await exported.locator('#task-input').fill(label); await exported.locator('#todo-form button').click(); await expect(exported.locator('#storage-status')).toContainText('Saved'); };
  await add('Same'); await add('Same');
  await exported.locator('#task-list input').nth(1).check(); await expect(exported.locator('#storage-status')).toContainText('Saved');
  await exported.reload(); await expect(exported.locator('#task-list li')).toHaveCount(2); await expect(exported.locator('#task-list input').nth(1)).toBeChecked();
  await add('Third'); await exported.locator('#task-list input').nth(2).check(); await expect(exported.locator('#task-count')).toHaveText('2 of 3 complete');
  await exported.locator('[data-filter="completed"]').click(); await expect(exported.locator('#task-list li')).toHaveCount(2);
  const saved = await exported.evaluate(() => JSON.stringify(localStorage));
  for (let i = 0; i < 2; i++) {
    await exported.locator('#run-smoke-test').click(); await expect(exported.locator('#test-results')).toContainText('Smoke test passed');
    await expect(exported.locator('#task-list li')).toHaveCount(2); await expect(exported.locator('#task-count')).toHaveText('2 of 3 complete');
    expect(await exported.evaluate(() => JSON.stringify(localStorage))).toBe(saved);
  }
  await exported.locator('#task-list .delete-task').first().click(); await exported.locator('[data-filter="all"]').click();
  await expect(exported.locator('#task-list li')).toHaveCount(2); await expect(exported.locator('#task-list .task-label').first()).toHaveText('Same'); await expect(exported.locator('#task-list input').first()).not.toBeChecked();
});
