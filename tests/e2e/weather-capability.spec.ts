import { test, expect, type Page } from '@playwright/test';

async function mount(page: Page, live: boolean, source: string) {
  await page.evaluate(async ({ live, source }) => {
    const runtimePath = '/src/runtime/index.ts', weatherPath = '/src/runtime/weatherApi.ts';
    const { createRuntime } = await import(runtimePath); const { fetchLiveWeather } = await import(weatherPath);
    const prior = (window as any).weatherTestRuntime; prior?.dispose();
    const container = document.createElement('div'); document.body.append(container);
    const runtime = createRuntime(container, () => {}); (window as any).weatherTestRuntime = runtime;
    await runtime.run({ 'index.html': '<main><p id="result"></p></main><script type="module" src="./main.js"></script>', 'main.js': source }, undefined, { live: live ? fetchLiveWeather : undefined });
  }, { live, source });
}

const probe = `const output = document.querySelector('#result');
window.lookup = async city => { try { const response = await weatherApi.fetch(city); output.textContent = JSON.stringify({ok:response.ok,status:response.status,data:await response.json()}); } catch(error) { output.textContent = error.message; } };
output.textContent = weatherApi.mode;`;

test('weather fixtures execute offline and live remains denied without a host capability', async ({ page }) => {
  await page.goto('/'); let network = 0;
  await page.route('https://**/*', route => { network++; return route.abort(); });
  await mount(page, false, probe);
  await expect(page.frameLocator('iframe[title="Learner preview"]').locator('#result')).toHaveText('fixture');
  const frame = (await (await page.locator('iframe[title="Learner preview"]').elementHandle())!.contentFrame())!;
  await frame.evaluate(async () => { await (window as any).lookup('London'); });
  expect(await frame.locator('#result').textContent()).toContain('18');
  expect(await frame.evaluate(() => { try { (window as any).weatherApi.setMode('live'); return 'allowed'; } catch { return 'denied'; } })).toBe('denied');
  expect(network).toBe(0);
  expect(await frame.evaluate(async () => { try { await fetch('https://example.com'); return 'allowed'; } catch { return 'blocked'; } })).toBe('blocked');
});

test('opted-in weather uses real adapter against controlled HTTP responses and limits requests', async ({ page }) => {
  await page.goto('/'); let geoCalls = 0;
  await page.route('https://geocoding-api.open-meteo.com/**', route => { geoCalls++; return route.fulfill({ json: { results: [{ name: 'Live Paris', latitude: 48.8, longitude: 2.3 }] } }); });
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { current: { temperature_2m: 23, weather_code: 0 } } }));
  await mount(page, true, probe);
  await expect(page.frameLocator('iframe[title="Learner preview"]').locator('#result')).toHaveText('fixture');
  const frame = (await (await page.locator('iframe[title="Learner preview"]').elementHandle())!.contentFrame())!;
  expect(geoCalls).toBe(0);
  await frame.evaluate(async () => { (window as any).weatherApi.setMode('live'); await (window as any).lookup('Paris'); });
  expect(await frame.locator('#result').textContent()).toContain('Live Paris'); expect(geoCalls).toBe(1);
  await frame.evaluate(async () => { for (let n = 0; n < 6; n++) await (window as any).lookup('Paris'); });
  expect(await frame.locator('#result').textContent()).toContain('limit'); expect(geoCalls).toBe(6);
  await frame.evaluate(async () => { (window as any).weatherApi.setMode('fixture'); await (window as any).lookup('London'); });
  expect(await frame.locator('#result').textContent()).toContain('18'); expect(geoCalls).toBe(6);
});

test('Stop aborts a pending live capability and an old run cannot update the new frame', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const path = '/src/runtime/index.ts'; const { createRuntime } = await import(path);
    const container = document.createElement('div'); document.body.append(container);
    const runtime = createRuntime(container, () => {}); (window as any).weatherTestRuntime = runtime;
    (window as any).weatherAborted = false; (window as any).weatherStarted = false;
    const live = (_city: string, signal: AbortSignal) => new Promise((_resolve, reject) => { (window as any).weatherStarted = true; signal.addEventListener('abort', () => { (window as any).weatherAborted = true; reject(new Error('Stopped')); }); });
    await runtime.run({ 'index.html': '<p id="result">Waiting</p><script>weatherApi.setMode("live");weatherApi.fetch("London").catch(()=>{});</script>' }, undefined, { live });
  });
  await expect.poll(() => page.evaluate(() => (window as any).weatherStarted)).toBe(true);
  await page.evaluate(async () => { const runtime = (window as any).weatherTestRuntime; runtime.stop(); await runtime.run({ 'index.html': '<p id="result">New draft</p>' }, undefined, {}); });
  expect(await page.evaluate(() => (window as any).weatherAborted)).toBe(true);
  await expect(page.frameLocator('iframe[title="Learner preview"]').locator('#result')).toHaveText('New draft');
});
