/** Browser-only checks for weather. The grader installs weatherApi first. */
export function weatherAssessmentBody(assessmentId: string): string | undefined {
  if (!/-(guided-[12]|apply|debug|combine)$/.test(assessmentId)) return undefined;
  const topic = assessmentId.replace(/-(guided-[12]|apply|debug|combine)$/, '');
  if (!topic.startsWith('weather-')) return undefined;
  const first = assessmentId.endsWith('-guided-1') || assessmentId.endsWith('-apply');
  const full = !first;
  return String.raw`
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const wait = (milliseconds = 0) => new Promise(resolve => setTimeout(resolve, milliseconds));
const form = document.querySelector('#weather-form');
const input = document.querySelector('#city-input');
const status = document.querySelector('#weather-status');
const result = document.querySelector('#weather-result');
const api = globalThis.weatherApi;
const text = node => node?.textContent || '';
const calls = () => Array.isArray(api?.calls) ? api.calls : [];
const contract = () => assert(form && input && status && result, 'Use form#weather-form, input#city-input, p#weather-status, and div#weather-result.');
const has = (city, temperature, condition) => text(result).toLowerCase().includes((city + ': ' + temperature + '°c, ' + condition).toLowerCase());
const submit = async (city, settle = 40) => {
  input.value = city;
  const event = new Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(event);
  assert(event.defaultPrevented, 'Prevent the weather form from navigating on submit.');
  await wait(settle);
  return event;
};
const assertLondon = async () => {
  contract();
  assert(api && typeof api.fetch === 'function', 'Use the injected weatherApi fixture contract.');
  const before = calls().length;
  await submit('London');
  assert(has('London', '18', 'Cloudy'), 'Render London as 18°C, Cloudy.');
  assert(calls().length === before + 1, 'A valid city must use weatherApi once.');
  assert(calls().at(-1).jsonReads === 1, 'Read JSON exactly once for a successful response.');
  assert(/loaded/i.test(text(status)), 'Report that the weather loaded.');
};
const validate = async (value = ' x ') => {
  const before = calls().length;
  await submit(value);
  assert(/2\s*to\s*80|city/i.test(text(status)), 'Explain the 2 to 80 character city requirement.');
  assert(!text(result).trim(), 'Invalid input must clear old weather output.');
  assert(calls().length === before, 'Invalid input must not issue a weatherApi request.');
};
const assertModeReset = async () => {
  const optIn = document.querySelector('#live-opt-in');
  const mode = document.querySelector('#weather-mode');
  assert(optIn && mode, 'Provide #live-opt-in and #weather-mode.');
  assert(mode.disabled && mode.value === 'fixture', 'Start in disabled Fixture mode.');
  optIn.checked = true; optIn.dispatchEvent(new Event('change', { bubbles: true }));
  assert(!mode.disabled, 'Checking live opt-in should enable the mode selector.');
  input.value = 'Slow'; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await wait(1); mode.value = 'live'; mode.dispatchEvent(new Event('change', { bubbles: true }));
  await wait(100);
  assert(mode.value === 'fixture' && !text(result).trim() && /fixture|live/i.test(text(status)), 'A refused Live selection must return to Fixture and clear pending UI.');
};
const stateChecks = async () => {
  await assertLondon();
  await submit('Empty');
  assert(/no weather|no match|not found/i.test(text(status)) && !text(result).trim(), 'Empty must be a no-match result with no weather fields.');
  await submit('Error');
  assert(/unavailable|503|try again/i.test(text(status)) && !text(result).trim(), 'HTTP 503 needs a visible unavailable state.');
  assert(calls().at(-1).jsonReads === 0, 'Check response.ok before reading an HTTP-error body.');
  await submit('Malformed');
  assert(/shape|invalid|unavailable/i.test(text(status)) && !text(result).trim(), 'Malformed JSON must not render weather.');
  await submit('Offline');
  assert(/connection|could not load|try again/i.test(text(status)) && !text(result).trim(), 'Offline rejection needs recovery feedback.');
};
const staleChecks = async () => {
  input.value = 'Slow'; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await wait(1); input.value = 'Fast'; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await wait(115); assert(has('Fast', '25', 'Clear'), 'Fast must remain visible after Slow settles.');
  input.value = 'SlowError'; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await wait(1); input.value = 'Fast'; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await wait(115); assert(has('Fast', '25', 'Clear'), 'A stale SlowError must not overwrite Fast.');
  assert(/loaded.*Fast/i.test(text(status)), 'A stale SlowError must not replace Fast success status.');
  input.value = 'Slow'; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await wait(1); await validate(); await wait(100);
  assert(/2\s*to\s*80|city/i.test(text(status)) && !text(result).trim(), 'An invalid later submission must retire pending Slow UI.');
};
if (${JSON.stringify(topic)} === 'weather-scope-and-data-contract') {
  contract();
  const scope = document.querySelector('#weather-scope');
  const fields = Array.from(document.querySelectorAll('#weather-data-contract li')).map(item => text(item)).join(' ');
  assert(scope && /fixture|deterministic/i.test(text(scope)) && /city|temperature|condition/i.test(text(scope)), 'Describe the bounded fixture lookup and visible fields.');
  await submit('London');
  ${full ? "assert(/city/i.test(fields) && /temperatureC/i.test(fields) && /condition/i.test(fields) && /null|no match|offline|malformed/i.test(fields), 'Document success and unavailable outcomes.');" : ''}
}
else if (${JSON.stringify(topic)} === 'weather-modules-and-request-stack') {
  contract();
  const rows = Array.from(document.querySelectorAll('#weather-file-plan li')).map(item => text(item));
  const row = name => rows.find(value => value.includes(name)) || '';
  for (const name of ['index.html', 'styles.css', 'weather.js', 'main.js']) assert(row(name), '#weather-file-plan must name ' + name);
  assert(/semantic|form|result/i.test(row('index.html')) && /visual|style/i.test(row('styles.css')) && /request|normal/i.test(row('weather.js')) && /event|render/i.test(row('main.js')), 'Give each file a distinct responsibility.');
  ${full ? "await submit('Plan'); assert(has('Plan', '0', 'Draft'), 'Run the normalizer through the Plan form path.'); await submit('Malformed'); assert(/shape|invalid/i.test(text(status)) && !text(result).trim(), 'Run malformed data through the form and report an invalid shape.');" : ''}
}
else if (${JSON.stringify(topic)} === 'weather-setup-and-search-form') {
  contract();
  assert(document.querySelector('label[for=\"city-input\"]'), 'Connect a visible City label to input#city-input.');
  assert(status.getAttribute('role') === 'status' && status.getAttribute('aria-live') === 'polite', 'Make #weather-status a polite status region.');
  await validate('x'.repeat(81));
  ${full ? "const optIn = document.querySelector('#live-opt-in'); const mode = document.querySelector('#weather-mode'); optIn.checked = true; optIn.dispatchEvent(new Event('change', { bubbles: true })); assert(!mode.disabled, 'Live opt-in should only enable the source selector in this setup lesson.');" : ''}
}
else if (${JSON.stringify(topic)} === 'weather-promises-and-async-control-flow') {
  await submit('Paris', 1); assert(/loading/i.test(text(status)), 'Show Loading before the preview Promise settles.');
  await wait(35); assert(has('Paris', '18', 'Preview'), 'Await the fulfilled local preview before rendering.');
  ${full ? "await submit('Offline', 35); assert(/failed/i.test(text(status)) && !text(result).trim(), 'Catch the rejected local preview Promise.');" : ''}
  await validate();
}
else if (${JSON.stringify(topic)} === 'weather-fetch-and-render') {
  await assertLondon();
  ${full ? "await submit('Paris'); assert(has('Paris', '22', 'Clear'), 'Render Paris as 22°C, Clear.'); await submit('Literal'); assert(text(result) === '<img src=x onerror=alert(1)>: 0°C, <b>Cold</b>', 'Render literal 0°C fixture data as text.'); await submit('Error'); assert(/unavailable|503/i.test(text(status)) && calls().at(-1).jsonReads === 0, 'Guard HTTP errors before json().');" : ''}
}
else if (${JSON.stringify(topic)} === 'weather-loading-empty-and-error-states') {
  await assertLondon();
  input.value = 'Slow'; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  assert(/loading/i.test(text(status)) && !text(result).trim(), 'Clear old output and show Loading while a valid request is pending.');
  await wait(100); await submit('Empty');
  assert(/no weather|no match|not found/i.test(text(status)) && !text(result).trim(), 'Empty must be distinct from success.');
  ${full ? 'await stateChecks();' : ''}
}
else if (${JSON.stringify(topic)} === 'weather-stale-responses-and-validation') {
  await validate();
  ${full ? 'await assertModeReset(); await staleChecks();' : ''}
}
else if (${JSON.stringify(topic)} === 'weather-testing-and-export') {
  await assertLondon();
  const smoke = document.querySelector('#run-weather-smoke'); const smokeStatus = document.querySelector('#weather-smoke-status');
  assert(smoke && smokeStatus, 'Add #run-weather-smoke and #weather-smoke-status.');
  const before = { input: input.value, status: text(status), result: text(result), mode: document.querySelector('#weather-mode').value, note: text(document.querySelector('#mode-note')), calls: calls().length };
  smoke.click(); await wait(120);
  assert(/passed/i.test(text(smokeStatus)), 'Smoke must report pass only after real assertions.');
  assert(calls().length >= before.calls + 2, 'Smoke must exercise real success and failure fixture requests, not only print passed.');
  assert(input.value === before.input && text(status) === before.status && text(result) === before.result && document.querySelector('#weather-mode').value === before.mode && text(document.querySelector('#mode-note')) === before.note, 'Smoke must restore form, output, source mode, and note.');
  ${full ? "const originalApi = globalThis.weatherApi; const falseFixture = { mode: 'fixture', calls: [], setMode() {}, async fetch(city) { falseFixture.calls.push({ city }); if (city !== 'London') return originalApi.fetch(city); return { ok: true, status: 200, json: async () => ({ city: 'London', temperatureC: 99, condition: 'Wrong' }) }; } }; Object.defineProperty(globalThis, 'weatherApi', { configurable: true, value: falseFixture }); smoke.click(); await wait(120); Object.defineProperty(globalThis, 'weatherApi', { configurable: true, value: originalApi }); assert(/failed/i.test(text(smokeStatus)), 'Smoke must fail when the fixture returns the wrong visible weather, rather than printing a hardcoded pass.'); const handoff = document.querySelector('section:last-of-type'); assert(/Open-Meteo/i.test(text(handoff)) && /GeoNames/i.test(text(handoff)) && /source/i.test(text(handoff)) && /root|compiled/i.test(text(handoff)) && /server/i.test(text(handoff)) && /export again|re.export|rebuild/i.test(text(handoff)), 'Document export and Open-Meteo/GeoNames live attribution.');" : ''}
}
else throw new Error('Unknown weather assessment: ' + ${JSON.stringify(topic)});
`;
}
export default weatherAssessmentBody;
