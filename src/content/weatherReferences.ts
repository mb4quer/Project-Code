import type { Files } from '../contracts';

/** Reference implementations use only the host-provided deterministic weatherApi. */
export const weatherCss = String.raw`
:root { color: #172033; background: #f4f7fb; font-family: system-ui, sans-serif; }
body { margin: 0; }
main { max-width: 42rem; margin: 2rem auto; padding: 1.25rem; background: white; }
* { box-sizing: border-box; }
fieldset { min-width: 0; }
input, select { max-width: 100%; }
form, .mode { display: flex; flex-wrap: wrap; gap: .6rem; align-items: end; }
label { display: grid; gap: .25rem; }
input, select, button { padding: .5rem; font: inherit; }
#weather-status { min-height: 1.4em; }
#weather-result { min-height: 2.5em; padding: .7rem; border: 1px solid #d5dce8; border-radius: .4rem; overflow-wrap: anywhere; }
.hint { color: #526176; }
`;

const shell = (extra = '') => String.raw`<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Weather window</title><link rel="stylesheet" href="./styles.css"></head>
<body><main><h1>Weather window</h1>${extra}
<form id="weather-form"><label for="city-input">City <input id="city-input" autocomplete="off" aria-describedby="weather-help"></label><button type="submit">Look up weather</button></form>
<p id="weather-help" class="hint">Use a fixture city such as London or Paris.</p><p id="weather-status" role="status" aria-live="polite">Enter a city to start.</p><div id="weather-result" aria-live="polite"></div>
</main><script type="module" src="./main.js"></script></body></html>`;

const modeControl = String.raw`<fieldset class="mode"><legend>Data source</legend><label><input id="live-opt-in" type="checkbox"> I understand that Live uses Open-Meteo with GeoNames attribution</label><label for="weather-mode">Mode <select id="weather-mode" disabled><option value="fixture">Fixture data (default)</option><option value="live">Live data (optional)</option></select></label></fieldset><p id="mode-note" class="hint">Fixture mode is deterministic. Live requires app opt-in; course previews also require host permission.</p>`;
const contractPlan = String.raw`<section aria-labelledby="contract-title"><h2 id="contract-title">Lookup contract</h2><p id="weather-scope">Search one city and show its city, temperature in Celsius, or a clear unavailable message. This browser lesson uses deterministic fixtures; it does not need accounts, a key, or saved searches.</p><ul id="weather-data-contract"><li>Request: a trimmed city string with 2 to 80 characters.</li><li>Success data: city, temperatureC, and condition.</li><li>Failure data: no match, a response error, an offline rejection, or malformed data receives visible feedback.</li></ul></section>`;
const modulePlan = String.raw`<section aria-labelledby="module-title"><h2 id="module-title">File plan</h2><ul id="weather-file-plan"><li>index.html: semantic form and result regions</li><li>styles.css: visual layout and readable feedback</li><li>weather.js: request and response normalization</li><li>main.js: form events, current request, and rendering</li></ul></section>`;

const normalizer = String.raw`
export function normalizeWeather(value) {
  if (value === null) return null;
  if (!value || typeof value.city !== 'string' || !value.city.trim() || typeof value.temperatureC !== 'number' || !Number.isFinite(value.temperatureC) || typeof value.condition !== 'string' || !value.condition.trim()) {
    throw new Error('Weather data has the wrong shape.');
  }
  return { city: value.city, temperatureC: value.temperatureC, condition: value.condition };
}`;

export const scopeFiles: Files = {
  'index.html': shell(contractPlan), 'styles.css': weatherCss,
  'main.js': String.raw`const form = document.querySelector('#weather-form'); const status = document.querySelector('#weather-status'); form.addEventListener('submit', event => { event.preventDefault(); status.textContent = 'The lookup flow is planned before requests are added.'; });`,
};

export const moduleFiles: Files = {
  'index.html': shell(contractPlan + modulePlan), 'styles.css': weatherCss, 'weather.js': normalizer,
  'main.js': String.raw`
import { normalizeWeather } from './weather.js';
const form = document.querySelector('#weather-form'); const input = document.querySelector('#city-input'); const status = document.querySelector('#weather-status'); const result = document.querySelector('#weather-result');
form.addEventListener('submit', event => {
  event.preventDefault(); result.textContent = '';
  const draft = input.value.trim() === 'Malformed' ? { city: 'Malformed', temperatureC: 'warm', condition: null } : { city: 'Plan', temperatureC: 0, condition: 'Draft' };
  try { const weather = normalizeWeather(draft); result.textContent = weather.city + ': ' + weather.temperatureC + '°C, ' + weather.condition; status.textContent = 'The request module normalized the draft.'; }
  catch (error) { status.textContent = error instanceof Error ? error.message : 'Weather data is invalid.'; }
});`,
};

export const setupFiles: Files = {
  'index.html': shell(contractPlan + modulePlan + modeControl), 'styles.css': weatherCss, 'weather.js': normalizer,
  'main.js': String.raw`
const form = document.querySelector('#weather-form'); const input = document.querySelector('#city-input'); const status = document.querySelector('#weather-status'); const result = document.querySelector('#weather-result'); const optIn = document.querySelector('#live-opt-in'); const mode = document.querySelector('#weather-mode');
optIn.addEventListener('change', () => { mode.disabled = !optIn.checked; });
form.addEventListener('submit', event => { event.preventDefault(); result.textContent = ''; const city = input.value.trim(); status.textContent = city.length >= 2 && city.length <= 80 ? 'The page is ready for an asynchronous lookup.' : 'Enter a city using 2 to 80 characters.'; });`,
};

export const promisesFiles: Files = {
  'index.html': shell(contractPlan + modulePlan + modeControl), 'styles.css': weatherCss, 'weather.js': normalizer,
  'main.js': String.raw`
const form = document.querySelector('#weather-form'); const input = document.querySelector('#city-input'); const status = document.querySelector('#weather-status'); const result = document.querySelector('#weather-result'); const optIn = document.querySelector('#live-opt-in'); const mode = document.querySelector('#weather-mode');
optIn.addEventListener('change', () => { mode.disabled = !optIn.checked; });
function delayedPreview(city) { return new Promise((resolve, reject) => setTimeout(() => city === 'Offline' ? reject(new Error('preview offline')) : resolve({ city, temperatureC: 18, condition: 'Preview' }), 15)); }
form.addEventListener('submit', async event => { event.preventDefault(); const city = input.value.trim(); if (city.length < 2 || city.length > 80) { result.textContent = ''; status.textContent = 'Enter a city using 2 to 80 characters.'; return; } result.textContent = ''; status.textContent = 'Loading preview…'; try { const weather = await delayedPreview(city); result.textContent = weather.city + ': ' + weather.temperatureC + '°C, ' + weather.condition; status.textContent = 'Preview loaded.'; } catch { result.textContent = ''; status.textContent = 'Preview failed.'; } });`,
};

const requestModule = String.raw`
export function normalizeWeather(value) {
  if (value === null) return null;
  if (!value || typeof value.city !== 'string' || !value.city.trim() || typeof value.temperatureC !== 'number' || !Number.isFinite(value.temperatureC) || typeof value.condition !== 'string' || !value.condition.trim()) throw new Error('Weather data has the wrong shape.');
  return { city: value.city, temperatureC: value.temperatureC, condition: value.condition };
}
export async function requestWeather(city) {
  const response = await window.weatherApi.fetch(city);
  if (!response || !response.ok) throw new Error('Weather service returned ' + (response?.status ?? 'an invalid response') + '.');
  return normalizeWeather(await response.json());
}`;

const weatherMain = (guardStale: boolean) => String.raw`
import { requestWeather } from './weather.js';
const form = document.querySelector('#weather-form'); const input = document.querySelector('#city-input'); const status = document.querySelector('#weather-status'); const result = document.querySelector('#weather-result'); const optIn = document.querySelector('#live-opt-in'); const mode = document.querySelector('#weather-mode'); const note = document.querySelector('#mode-note');
let newest = 0;
function validCity(value) { const city = value.trim(); return city.length >= 2 && city.length <= 80 ? city : null; }
function showWeather(weather) { result.textContent = weather.city + ': ' + weather.temperatureC + '°C, ' + weather.condition; }
function resetForMode(message) { newest += 1; result.textContent = ''; status.textContent = message; }
optIn.addEventListener('change', () => { mode.disabled = !optIn.checked; if (!optIn.checked) { mode.value = 'fixture'; try { window.weatherApi.setMode('fixture'); } catch {} note.textContent = 'Fixture mode is deterministic.'; resetForMode('Fixture mode is ready.'); } });
mode.addEventListener('change', () => { if (!optIn.checked) return; resetForMode('Changing data source…'); try { window.weatherApi.setMode(mode.value); note.textContent = mode.value === 'live' ? 'Live mode was selected by you.' : 'Fixture mode is deterministic.'; status.textContent = mode.value === 'live' ? 'Live mode is ready.' : 'Fixture mode is ready.'; } catch (error) { mode.value = 'fixture'; try { window.weatherApi.setMode('fixture'); } catch {} note.textContent = error instanceof Error ? error.message : 'Live mode is unavailable.'; status.textContent = 'Fixture mode is ready.'; } });
form.addEventListener('submit', async event => {
  event.preventDefault(); const request = ++newest; const city = validCity(input.value);
  if (!city) { result.textContent = ''; status.textContent = 'Enter a city using 2 to 80 characters.'; return; }
  result.textContent = ''; status.textContent = 'Loading weather for ' + city + '…';
  try { const weather = await requestWeather(city); ${guardStale ? 'if (request !== newest) return;' : ''} if (weather === null) { status.textContent = 'No weather match was found for ' + city + '.'; return; } showWeather(weather); status.textContent = 'Weather loaded for ' + weather.city + '.'; }
  catch (error) { ${guardStale ? 'if (request !== newest) return;' : ''} result.textContent = ''; status.textContent = error instanceof Error && /503/.test(error.message) ? 'Weather service is unavailable. Try again.' : error instanceof Error && /shape/.test(error.message) ? 'Weather data was unavailable because its shape was invalid.' : 'Weather could not load. Check your connection and try again.'; }
});`;

export const fetchFiles: Files = { 'index.html': shell(contractPlan + modulePlan + modeControl), 'styles.css': weatherCss, 'weather.js': requestModule, 'main.js': weatherMain(false) };
export const statesFiles: Files = { 'index.html': shell(contractPlan + modulePlan + modeControl), 'styles.css': weatherCss, 'weather.js': requestModule, 'main.js': weatherMain(false) };
export const staleFiles: Files = { 'index.html': shell(contractPlan + modulePlan + modeControl), 'styles.css': weatherCss, 'weather.js': requestModule, 'main.js': weatherMain(true) };

const smokeMain = String.raw`${weatherMain(true)}
const smoke = document.querySelector('#run-weather-smoke'); const smokeStatus = document.querySelector('#weather-smoke-status'); let smokeRunning = false; const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
smoke.addEventListener('click', async () => {
  if (smokeRunning) return;
  if (/loading/i.test(status.textContent)) { smokeStatus.textContent = 'Smoke test waits for the current lookup to finish.'; return; }
  smokeRunning = true;
  const submitButton = form.querySelector('[type="submit"]');
  const prior = { input: input.value, status: status.textContent, result: result.textContent, note: note.textContent, optIn: optIn.checked, mode: mode.value, apiMode: window.weatherApi.mode, inputDisabled: input.disabled, submitDisabled: submitButton.disabled, optInDisabled: optIn.disabled, modeDisabled: mode.disabled };
  newest += 1; input.disabled = true; submitButton.disabled = true; optIn.disabled = true; mode.disabled = true; smoke.disabled = true; smokeStatus.textContent = 'Running weather smoke test…';
  try {
    window.weatherApi.setMode('fixture'); input.value = 'London'; const london = new Event('submit', { bubbles: true, cancelable: true }); form.dispatchEvent(london); await wait(35);
    if (!london.defaultPrevented || result.textContent !== 'London: 18°C, Cloudy') throw new Error('London fixture did not render its literal visible result.');
    const beforeInvalid = window.weatherApi.calls.length; input.value = 'x'; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    if (window.weatherApi.calls.length !== beforeInvalid || !/2 to 80/.test(status.textContent)) throw new Error('Invalid city did not remain a local validation error.');
    input.value = 'Error'; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await wait(35);
    if (!/unavailable|503|try again/i.test(status.textContent) || result.textContent) throw new Error('The HTTP failure did not clear weather output and report a failure state.');
    smokeStatus.textContent = 'Smoke test passed: success, invalid input, and HTTP failure were observed.';
  } catch (error) { smokeStatus.textContent = 'Smoke test failed: ' + (error instanceof Error ? error.message : String(error)); }
  finally {
    newest += 1; try { window.weatherApi.setMode(prior.apiMode); } catch { window.weatherApi.setMode('fixture'); }
    input.value = prior.input; status.textContent = prior.status; result.textContent = prior.result; note.textContent = prior.note; optIn.checked = prior.optIn; mode.value = prior.mode;
    input.disabled = prior.inputDisabled; submitButton.disabled = prior.submitDisabled; optIn.disabled = prior.optInDisabled; mode.disabled = prior.modeDisabled; smoke.disabled = false; smokeRunning = false;
  }
});`;

export const testFiles: Files = {
  'index.html': shell(contractPlan + modulePlan + modeControl + String.raw`<section><h2>Smoke check and handoff</h2><button type="button" id="run-weather-smoke">Run weather smoke test</button><p id="weather-smoke-status" aria-live="polite"></p><p>Export produces a compiled root index.html and the exact source files. Edit source in the course and export again to rebuild the root. Serve the extracted root with a static server, for example python -m http.server 8080. Fixture mode remains reproducible. In course previews, optional live weather requires host opt-in, then app opt-in and Live selection. In the standalone export, use the app opt-in and Live selection. Credit Open-Meteo and GeoNames in a live handoff, and follow their noncommercial-use terms.</p></section>`),
  'styles.css': weatherCss, 'weather.js': requestModule, 'main.js': smokeMain,
};

export const weatherReferenceByTopic: Record<string, Files> = {
  'weather-scope-and-data-contract': scopeFiles, 'weather-modules-and-request-stack': moduleFiles, 'weather-setup-and-search-form': setupFiles, 'weather-promises-and-async-control-flow': promisesFiles, 'weather-fetch-and-render': fetchFiles, 'weather-loading-empty-and-error-states': statesFiles, 'weather-stale-responses-and-validation': staleFiles, 'weather-testing-and-export': testFiles,
};
