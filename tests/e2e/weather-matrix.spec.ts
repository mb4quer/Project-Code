import { expect, test, type Page } from '@playwright/test';
import type { Files } from '../../src/contracts';

type Fixture = { id: string; starterFiles: Files; referenceSolution: Files };
const weatherTopicsModule = '/src/content/weather.ts';
const graderModule = '/src/lesson/grader.ts';

async function fixtures(page: Page): Promise<Fixture[]> {
  return page.evaluate(async ({ weatherTopicsModule }) => {
    const { weatherTopics } = await import(weatherTopicsModule);
    return weatherTopics.flatMap((topic: { activities: Array<{ kind: string; id: string; starterFiles?: Files; referenceSolution?: Files }>; challenges: Array<{ id: string; starterFiles: Files; referenceSolution?: Files }> }) => [
      ...topic.activities.filter(activity => activity.kind === 'guided-coding').map(activity => ({ id: activity.id, starterFiles: activity.starterFiles!, referenceSolution: activity.referenceSolution! })),
      ...topic.challenges.map(challenge => ({ id: challenge.id, starterFiles: challenge.starterFiles, referenceSolution: challenge.referenceSolution! })),
    ]);
  }, { weatherTopicsModule });
}

async function grade(page: Page, files: Files, assessmentId: string) {
  return page.evaluate(async ({ files, assessmentId, graderModule }) => {
    const { createChallengeGrader } = await import(graderModule);
    const container = document.createElement('div');
    container.className = 'grading-sandbox'; container.setAttribute('aria-hidden', 'true');
    document.body.append(container);
    const grader = createChallengeGrader(container, () => {});
    try { return await grader.grade(files, assessmentId); }
    finally { grader.dispose(); container.remove(); }
  }, { files, assessmentId, graderModule });
}

const replace = (files: Files, file: string, from: string, to: string): Files => {
  const next = { ...files, [file]: files[file].replace(from, to) };
  if (next[file] === files[file]) throw new Error(`Missing matrix mutation anchor: ${from}`);
  return next;
};

test.describe('Phase 4 Async Weather behavioral matrix', () => {
  test.setTimeout(240_000);
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('all eight topics have passing references and 40 unfinished starters', async ({ page }) => {
    const entries = await fixtures(page);
    expect(entries).toHaveLength(40);
    for (const entry of entries) {
      await expect.soft(grade(page, entry.referenceSolution, entry.id), entry.id).resolves.toMatchObject({ assessmentId: entry.id, passed: true });
      await expect.soft(grade(page, entry.starterFiles, entry.id), entry.id).resolves.toMatchObject({ assessmentId: entry.id, passed: false });
    }
  });

  test('observable mutations fail their matching full contracts', async ({ page }) => {
    const entries = await fixtures(page);
    const ref = (topic: string) => entries.find(entry => entry.id === `${topic}-combine`)!.referenceSolution;
    const mutations: Array<[string, string, Files]> = [
      ['scope loses the fixture boundary', 'weather-scope-and-data-contract', replace(ref('weather-scope-and-data-contract'), 'index.html', 'deterministic fixtures', 'unbounded network')],
      ['module form hides malformed normalization', 'weather-modules-and-request-stack', replace(ref('weather-modules-and-request-stack'), 'main.js', "input.value.trim() === 'Malformed'", 'false')],
      ['setup allows 81 characters', 'weather-setup-and-search-form', replace(ref('weather-setup-and-search-form'), 'main.js', 'city.length >= 2 && city.length <= 80', 'city.length >= 1')],
      ['promises do not expose pending state', 'weather-promises-and-async-control-flow', replace(ref('weather-promises-and-async-control-flow'), 'main.js', "status.textContent = 'Loading preview…';", "status.textContent = 'Preview loaded.';")],
      ['fetch renders the wrong literal condition', 'weather-fetch-and-render', replace(ref('weather-fetch-and-render'), 'main.js', 'weather.condition', "'Wrong'")],
      ['states turn no match into success', 'weather-loading-empty-and-error-states', replace(ref('weather-loading-empty-and-error-states'), 'weather.js', 'if (value === null) return null;', "if (value === null) return { city: 'Empty', temperatureC: 0, condition: 'Clear' };")],
      ['stale completion guard disappears', 'weather-stale-responses-and-validation', replace(ref('weather-stale-responses-and-validation'), 'main.js', 'if (request !== newest) return;', '')],
      ['stale rejection guard disappears', 'weather-stale-responses-and-validation', replace(ref('weather-stale-responses-and-validation'), 'main.js', 'catch (error) { if (request !== newest) return;', 'catch (error) {')],
      ['invalid input fails to retire old work', 'weather-stale-responses-and-validation', replace(ref('weather-stale-responses-and-validation'), 'main.js', 'const request = ++newest;', 'const request = input.value.trim().length < 2 ? newest : ++newest;')],
      ['mode changes retain pending request ownership', 'weather-stale-responses-and-validation', replace(ref('weather-stale-responses-and-validation'), 'main.js', 'function resetForMode(message) { newest += 1;', 'function resetForMode(message) {')],
      ['offline rejection looks like success', 'weather-loading-empty-and-error-states', replace(ref('weather-loading-empty-and-error-states'), 'main.js', "'Weather could not load. Check your connection and try again.'", "'Weather loaded successfully.'")],
      ['smoke becomes a print-only control', 'weather-testing-and-export', replace(ref('weather-testing-and-export'), 'main.js', "window.weatherApi.setMode('fixture'); input.value = 'London';", "smokeStatus.textContent = 'Smoke test passed.'; return;")],
    ];
    for (const [name, topic, files] of mutations) expect((await grade(page, files, `${topic}-combine`)).passed, name).toBe(false);
  });

  test('each first increment accepts its partial contract while full checks reject it', async ({ page }) => {
    const entries = await fixtures(page);
    const ref = (topic: string) => entries.find(entry => entry.id === `${topic}-combine`)!.referenceSolution;
    const partials: Array<[string, Files]> = [
      ['weather-scope-and-data-contract', replace(ref('weather-scope-and-data-contract'), 'index.html', 'Success data: city, temperatureC, and condition.', 'Success data: city and temperatureC.')],
      ['weather-modules-and-request-stack', replace(ref('weather-modules-and-request-stack'), 'main.js', "input.value.trim() === 'Malformed'", 'false')],
      ['weather-setup-and-search-form', replace(ref('weather-setup-and-search-form'), 'main.js', "mode.disabled = !optIn.checked;", 'mode.disabled = true;')],
      ['weather-promises-and-async-control-flow', replace(ref('weather-promises-and-async-control-flow'), 'main.js', "city === 'Offline' ? reject(new Error('preview offline'))", "false ? reject(new Error('preview offline'))")],
      ['weather-fetch-and-render', replace(ref('weather-fetch-and-render'), 'weather.js', 'if (!response || !response.ok)', 'if (false)')],
      ['weather-loading-empty-and-error-states', replace(ref('weather-loading-empty-and-error-states'), 'weather.js', 'if (!response || !response.ok)', 'if (false)')],
      ['weather-stale-responses-and-validation', replace(ref('weather-stale-responses-and-validation'), 'main.js', 'if (request !== newest) return;', '')],
      ['weather-testing-and-export', replace(ref('weather-testing-and-export'), 'main.js', "result.textContent !== 'London: 18°C, Cloudy'", 'false')],
    ];
    for (const [topic, files] of partials) {
      expect((await grade(page, files, `${topic}-guided-1`)).passed, `${topic} first increment`).toBe(true);
      expect((await grade(page, files, `${topic}-combine`)).passed, `${topic} full contract`).toBe(false);
    }
  });
});

