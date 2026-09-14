import { test, expect, type Page } from '@playwright/test';

const editor = (page: Page) => page.locator('#code');
const preview = (page: Page) => page.frameLocator('iframe[title="Learner preview"]');
async function edit(page: Page, file: string, value: string) {
  // File tree stays available when an overflowed tab is off screen.
  await page.locator('#file-tree').getByRole('button', { name: file, exact: true }).click();
  await editor(page).fill(value);
}
async function run(page: Page) { await page.locator('#run').click(); }
async function confirm(page: Page) { await page.locator('#dialog-confirm').click(); }
test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('vanilla modules, CSS, assets, DOM behavior and stop/restart execute', async ({ page }) => {
  await run(page);
  const frame = preview(page);
  await expect(frame.getByText('Add a task of your own', { exact: true })).toBeVisible();
  await frame.getByLabel('New task', { exact: true }).fill('Ship the runtime');
  await frame.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(frame.getByText('Ship the runtime', { exact: true })).toBeVisible();
  await frame.getByRole('checkbox', { name: /Ship the runtime/ }).check();
  await expect(frame.getByRole('checkbox', { name: /Ship the runtime/ })).toBeChecked();
  await frame.locator('li').filter({ hasText: 'Ship the runtime' }).getByRole('button', { name: 'Delete' }).click();
  await expect(frame.getByText('Ship the runtime', { exact: true })).toHaveCount(0);
  await expect(frame.locator('.mark')).toHaveJSProperty('complete', true);
  expect(await frame.locator('.mark').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(frame.locator('.app')).toHaveCSS('padding', '20px');
  await expect(page.locator('#console-output')).toContainText('Vanilla');
  await page.locator('#stop').click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await run(page);
  await expect(preview(page).getByRole('heading', { name: 'Todo list' })).toBeVisible();
});

test('React JSX imports mount and state updates work', async ({ page }) => {
  await page.getByRole('button', { name: 'React + JSX', exact: true }).click();
  await run(page);
  const frame = preview(page);
  await expect(frame.getByText('1 of 2 complete')).toBeVisible();
  await frame.getByRole('checkbox', { name: 'Finish this demo' }).check();
  await expect(frame.getByText('2 of 2 complete')).toBeVisible();
  await frame.getByLabel('New task', { exact: true }).fill('A new component');
  await frame.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(frame.getByText('2 of 3 complete')).toBeVisible();
});

test('edits resume after reload and resets preserve unrelated work and checkpoints', async ({ page }) => {
  const marker = 'console.info("unsaved idea resumed");';
  await edit(page, 'main.js', marker);
  await expect(page.locator('#save-state')).toHaveText('Saved locally · this browser');
  await page.locator('#checkpoint').click();
  await page.reload();
  await expect(editor(page)).toHaveValue(marker);
  await expect(page.locator('iframe')).toHaveCount(0); // Recovery must not rerun stored code.
  await page.getByRole('button', { name: 'React + JSX', exact: true }).click();
  await edit(page, 'App.jsx', 'export default function App(){return <h1>My independent React draft</h1>}');
  await page.getByRole('button', { name: 'Vanilla JavaScript', exact: true }).click();
  await page.locator('#reset').click(); await confirm(page);
  await page.locator('#file-tree').getByRole('button', { name: 'main.js', exact: true }).click();
  await expect(editor(page)).not.toHaveValue(marker);
  await page.locator('#restore').click(); await confirm(page);
  await page.locator('#file-tree').getByRole('button', { name: 'main.js', exact: true }).click();
  await expect(editor(page)).toHaveValue(marker);
  await page.getByRole('button', { name: 'React + JSX', exact: true }).click();
  await expect(editor(page)).toHaveValue(/My independent React draft/);
});

test('syntax errors, runtime errors, rejected imports and common infinite loops are recoverable', async ({ page }) => {
  await edit(page, 'main.js', 'const broken = ;'); await run(page);
  await expect(page.locator('#console-output')).toContainText(/Unexpected|Expected/);
  await edit(page, 'main.js', 'throw new Error("intentional failure");'); await run(page);
  await expect(page.locator('#console-output')).toContainText('intentional failure');
  await edit(page, 'main.js', 'import "https://example.com/blocked.js";'); await run(page);
  await expect(page.locator('#console-output')).toContainText('Only local project files');
  await edit(page, 'main.js', 'while (true) {}'); await run(page);
  await expect(page.locator('#console-output')).toContainText('100000 iterations');
  await edit(page, 'main.js', 'console.info("Recovered and running");'); await run(page);
  await expect(page.locator('#console-output')).toContainText('Recovered and running');
});

test('sandbox denies parent storage and fetch and ignores forged parent messages', async ({ page }) => {
  await edit(page, 'main.js', `try { parent.document.body; console.error('PARENT ACCESSIBLE'); } catch { console.info('parent blocked'); }
try { localStorage.getItem('project-code.session.v1'); console.error('STORAGE ACCESSIBLE'); } catch { console.info('storage blocked'); }
fetch('https://example.com/probe').then(() => console.error('FETCH ALLOWED')).catch(() => console.info('fetch blocked'));
parent.postMessage({type:'learner-runtime',runId:'fake',nonce:'fake',kind:'console',message:'FORGED'},'*');`);
  await run(page);
  await expect(page.locator('#console-output')).toContainText('parent blocked');
  await expect(page.locator('#console-output')).toContainText('storage blocked');
  await expect(page.locator('#console-output')).toContainText('fetch blocked');
  await expect(page.locator('#console-output')).not.toContainText('FORGED');
  await expect(page.locator('iframe')).toHaveAttribute('sandbox', 'allow-scripts allow-forms');
  // Form events work, but native submissions still cannot navigate or send data.
  await edit(page, 'main.js', `document.querySelector('form').action = 'https://example.com/blocked-submit';
addEventListener('securitypolicyviolation', event => console.info('policy blocked: ' + event.violatedDirective));`);
  await run(page);
  await preview(page).getByLabel('New task', { exact: true }).fill('synthetic test');
  await preview(page).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('#console-output')).toContainText('policy blocked: form-action');
});

test('new files, local text and SVG imports, and edited CSS execute', async ({ page }) => {
  await page.locator('#add-file').click();
  await page.locator('#new-file-name').fill('message.txt');
  await confirm(page);
  await editor(page).fill('Local text import works');
  await edit(page, 'styles.css', 'body { background-color: rgb(220, 240, 220); }');
  await edit(page, 'main.js', `import message from './message.txt';
import image from './assets/mark.svg';
import './styles.css';
document.body.innerHTML = '<h1></h1><img alt="Imported asset">';
document.querySelector('h1').textContent = message;
document.querySelector('img').src = image;`);
  await run(page);
  await expect(preview(page).getByRole('heading', { name: 'Local text import works' })).toBeVisible();
  await expect(preview(page).locator('body')).toHaveCSS('background-color', 'rgb(220, 240, 220)');
  await expect(preview(page).getByAltText('Imported asset')).toHaveJSProperty('complete', true);
  expect(await preview(page).getByAltText('Imported asset').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
});

test('stale tab shows a conflict and never overwrites the newer session', async ({ page, context }) => {
  await edit(page, 'main.js', 'console.log("first saved");');
  await expect(page.locator('#save-state')).toHaveText('Saved locally · this browser');
  const other = await context.newPage(); await other.goto('/');
  await edit(page, 'main.js', 'console.log("newer version");');
  await expect(page.locator('#save-state')).toHaveText('Saved locally · this browser');
  await expect(other.locator('#save-banner')).toBeVisible();
  await editor(other).fill('console.log("conflicting draft");');
  await other.locator('#retry-save').click();
  await expect(other.locator('#save-banner')).toBeVisible();
  await page.reload();
  await expect(editor(page)).toHaveValue('console.log("newer version");');
  await other.close();
});

test('backup restores real files and narrow screens remain usable', async ({ page }) => {
  await edit(page, 'main.js', 'console.log("backup marker");');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#backup').click();
  const download = await downloadPromise; const path = await download.path();
  await edit(page, 'main.js', 'console.log("changed after backup");');
  await page.locator('#import-file').setInputFiles(path!);
  await confirm(page);
  await expect(editor(page)).toHaveValue('console.log("backup marker");');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#run')).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});
