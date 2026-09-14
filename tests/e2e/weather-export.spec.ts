import { test, expect, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { testFiles } from '../../src/content/weatherReferences';
import { curriculum } from '../../src/content/curriculum';
import { createInitialSession } from '../../src/data/demos';
import { completeActivity, initializeProjectWorkspace, recordBlankAttempt, recordChallengeResult, submitQuestionAnswer, setLearningLocation } from '../../src/lesson/engine';

async function seedWeather(page: Page) {
  let seed = initializeProjectWorkspace(createInitialSession(), 'async-weather', { ...testFiles, 'notes.txt': 'Weather export notes' });
  for (const topic of curriculum.topics.slice(0, 15)) {
    for (const activity of topic.activities) seed = completeActivity(seed, topic.id, activity.id);
    for (const blank of topic.blanks) seed = recordBlankAttempt(seed, topic, blank, blank.acceptedAnswers[0]).session;
    for (const question of topic.assessmentQuestions.slice(0, 10)) seed = submitQuestionAnswer(seed, topic, question, question.acceptedAnswers[0]).session;
    for (const challenge of topic.challenges) seed = recordChallengeResult(seed, topic.id, challenge.id, true);
  }
  seed = setLearningLocation(seed, { view: 'topic', projectId: 'async-weather', topicId: 'weather-testing-and-export', stepId: 'weather-testing-and-export-guided-2' });
  await page.addInitScript(seed => { if (!sessionStorage.getItem('weather-export-seeded')) { localStorage.setItem('project-code.session.v1', JSON.stringify(seed)); sessionStorage.setItem('weather-export-seeded', 'yes'); } }, seed);
  await page.goto('/');
}

test('host live consent is explicit and resets after reload; fixtures work with network unavailable', async ({ page }) => {
  await seedWeather(page); let requests = 0;
  await page.route('https://geocoding-api.open-meteo.com/**', route => { requests++; return route.fulfill({ json: { results: [{ name: 'Live Paris', latitude: 48.8, longitude: 2.3 }] } }); });
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { current: { temperature_2m: 23, weather_code: 0 } } }));
  await expect(page.locator('#allow-live-weather')).not.toBeChecked(); await page.locator('#run').click();
  const app = () => page.frameLocator('iframe[title="Learner preview"]');
  await expect(app().locator('#weather-mode')).toHaveValue('fixture'); await app().locator('#live-opt-in').check(); await app().locator('#weather-mode').selectOption('live');
  await expect(app().locator('#weather-mode')).toHaveValue('fixture'); expect(requests).toBe(0);
  await page.locator('#allow-live-weather').check(); await page.locator('#run').click();
  await app().locator('#live-opt-in').check(); await app().locator('#weather-mode').selectOption('live'); await app().locator('#city-input').fill('Paris'); await app().locator('#weather-form button').click();
  await expect(app().locator('#weather-result')).toContainText('Live Paris'); expect(requests).toBe(1);
  await page.reload(); await expect(page.locator('iframe')).toHaveCount(0); await expect(page.locator('#allow-live-weather')).not.toBeChecked();
  await page.route('https://**/*', route => route.abort()); await page.locator('#run').click();
  await expect(app().locator('#weather-mode')).toHaveValue('fixture'); await app().locator('#city-input').fill('London'); await app().locator('#weather-form button').click();
  await expect(app().locator('#weather-result')).toContainText('18');
});

test('Weather ZIP preserves exact source and runs fixtures, races and repeatable smoke checks independently', async ({ page, context }) => {
  test.setTimeout(60000); await seedWeather(page);
  const pending = page.waitForEvent('download'); await page.locator('#export-project').click(); const download = await pending;
  const bytes = await readFile((await download.path())!); await writeFile('test-results/weather-export.zip', bytes);
  const files: Record<string, string> = {}; let pos = 0;
  while (bytes.readUInt32LE(pos) === 0x04034b50) { const size = bytes.readUInt32LE(pos + 18), n = bytes.readUInt16LE(pos + 26), x = bytes.readUInt16LE(pos + 28); const name = bytes.subarray(pos + 30, pos + 30 + n).toString(); const start = pos + 30 + n + x; files[name] = bytes.subarray(start, start + size).toString(); pos = start + size; }
  for (const [name, source] of Object.entries(testFiles)) expect(files['source/' + name]).toBe(source);
  expect(files['source/notes.txt']).toBe('Weather export notes'); expect(files['README.md']).toContain('Open-Meteo'); expect(files['index.html']).not.toContain('writerId');
  const exported = await context.newPage(); await exported.route('http://weather-export.test/**', route => route.fulfill({ contentType: 'text/html', body: files['index.html'] }));
  await exported.route('https://**/*', route => route.abort()); await exported.goto('http://weather-export.test/');
  const submit = async (city: string) => { await exported.locator('#city-input').fill(city); await exported.locator('#weather-form button').click(); };
  await expect(exported.locator('#weather-mode')).toHaveValue('fixture'); await submit('Paris'); await expect(exported.locator('#weather-result')).toContainText('22');
  await exported.evaluate(() => { const form = document.querySelector('#weather-form')!, input = document.querySelector<HTMLInputElement>('#city-input')!; for (const city of ['SlowError', 'Fast']) { input.value = city; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); } });
  await expect(exported.locator('#weather-result')).toContainText('Fast'); await exported.waitForTimeout(140); await expect(exported.locator('#weather-status')).toContainText('Fast');
  for (const city of ['Empty', 'Error', 'Offline', 'Malformed']) { await submit(city); await expect(exported.locator('#weather-status')).not.toContainText('Loading'); await expect(exported.locator('#weather-result')).toBeEmpty(); }
  await submit('Paris'); await expect(exported.locator('#weather-result')).toContainText('22');
  await exported.locator('#city-input').fill('Keep this draft'); const result = await exported.locator('#weather-result').textContent(), status = await exported.locator('#weather-status').textContent();
  for (let i = 0; i < 2; i++) { await exported.locator('#run-weather-smoke').click(); await expect(exported.locator('#weather-smoke-status')).toContainText('passed'); await expect(exported.locator('#city-input')).toHaveValue('Keep this draft'); await expect(exported.locator('#weather-result')).toHaveText(result!); await expect(exported.locator('#weather-status')).toHaveText(status!); }
  await exported.evaluate(() => { const input = document.querySelector<HTMLInputElement>('#city-input')!; input.value = 'Slow'; document.querySelector('#weather-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); document.querySelector<HTMLButtonElement>('#run-weather-smoke')!.click(); });
  await expect(exported.locator('#weather-smoke-status')).toContainText('waits'); await expect(exported.locator('#weather-result')).toContainText('Slow');
  let liveCalls = 0;
  await exported.route('https://geocoding-api.open-meteo.com/**', route => { liveCalls++; return route.fulfill({ json: { results: [{ name: 'Export Paris', latitude: 48.8, longitude: 2.3 }] } }); });
  await exported.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { current: { temperature_2m: 24, weather_code: 0 } } }));
  await exported.locator('#live-opt-in').check(); await exported.locator('#weather-mode').selectOption('live'); await submit('Paris'); await expect(exported.locator('#weather-result')).toContainText('Export Paris: 24');
  await exported.locator('#run-weather-smoke').click(); await expect(exported.locator('#weather-smoke-status')).toContainText('passed'); await expect(exported.locator('#weather-mode')).toHaveValue('live'); await expect(exported.locator('#live-opt-in')).toBeChecked(); await expect(exported.locator('#weather-result')).toContainText('Export Paris: 24');
  await submit('Paris'); await expect.poll(() => liveCalls).toBe(2); await expect(exported.locator('#weather-result')).toContainText('Export Paris: 24');
  await exported.reload(); await expect(exported.locator('#weather-mode')).toHaveValue('fixture');
  await exported.setViewportSize({ width: 390, height: 844 }); expect(await exported.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await exported.screenshot({ path: 'test-results/weather-export-mobile.png', fullPage: true });
});
