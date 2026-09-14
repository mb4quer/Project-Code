/** Fixed educational data. This is deliberately not today's weather. */
export interface WeatherReply { ok: boolean; status: number; data: unknown }
export type WeatherCapability = (city: string, signal: AbortSignal) => Promise<WeatherReply>;

// Self-contained functions are also serialized into the isolated frame/export.
export async function fetchFixtureWeather(city: string): Promise<WeatherReply> {
  const name = city.trim().toLowerCase();
  await new Promise(resolve => setTimeout(resolve, name.startsWith('slow') ? 80 : name === 'fast' ? 5 : 15));
  if (name === 'offline' || name === 'slowerror') throw new Error('Offline fixture: request unavailable.');
  if (name === 'error' || name === 'error503') return { ok: false, status: 503, data: { error: 'Service unavailable fixture' } };
  if (name === 'malformed') return { ok: true, status: 200, data: { city: 'Malformed', temperatureC: 'warm', condition: null } };
  const records: Record<string, unknown> = {
    london: { city: 'London', temperatureC: 18, condition: 'Cloudy' },
    paris: { city: 'Paris', temperatureC: 22, condition: 'Clear' },
    slow: { city: 'Slow', temperatureC: 10, condition: 'Rain' },
    fast: { city: 'Fast', temperatureC: 25, condition: 'Clear' },
    literal: { city: '<img src=x onerror=alert(1)>', temperatureC: 0, condition: '<b>Cold</b>' },
  };
  return { ok: true, status: 200, data: Object.hasOwn(records, name) ? records[name] : null };
}

/** Only two fixed HTTPS services, no cookies/referrer/redirects or learner URLs. */
export async function fetchLiveWeather(city: string, signal?: AbortSignal): Promise<WeatherReply> {
  if (typeof city !== 'string' || city.trim().length < 2 || city.trim().length > 80 || /[\u0000-\u001f]/.test(city)) throw new Error('Enter a city of 2–80 characters.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 6000);
  const read = async (url: string) => {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store' });
    if (!response.ok) { await response.body?.cancel(); return { status: response.status, data: null }; }
    if (!response.body) throw new Error('Weather service returned no body.');
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let text = '', size = 0;
    try {
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 65536) throw new Error('Weather response is too large.'); text += decoder.decode(part.value, { stream: true }); }
      text += decoder.decode(); return { status: response.status, data: JSON.parse(text) };
    } finally { await reader.cancel().catch(() => {}); }
  };
  try {
    const geo = await read('https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=' + encodeURIComponent(city.trim()));
    if (geo.status !== 200) return { ok: false, status: geo.status, data: null };
    if (!geo.data || typeof geo.data !== 'object' || Array.isArray(geo.data) || (geo.data.results !== undefined && !Array.isArray(geo.data.results))) throw new Error('Invalid location response.');
    const place = geo.data.results?.[0];
    if (!place) return { ok: true, status: 200, data: null };
    if (typeof place.name !== 'string' || !place.name.trim() || place.name.length > 160 || !Number.isFinite(place.latitude) || Math.abs(place.latitude) > 90 || !Number.isFinite(place.longitude) || Math.abs(place.longitude) > 180) throw new Error('Invalid location response.');
    const forecast = await read('https://api.open-meteo.com/v1/forecast?latitude=' + place.latitude + '&longitude=' + place.longitude + '&current=temperature_2m,weather_code&temperature_unit=celsius');
    if (forecast.status !== 200) return { ok: false, status: forecast.status, data: null };
    const current = forecast.data?.current;
    if (!current || !Number.isFinite(current.temperature_2m) || Math.abs(current.temperature_2m) > 100 || ![0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99].includes(current.weather_code)) throw new Error('Invalid weather response.');
    const code = current.weather_code;
    const condition = code === 0 ? 'Clear' : code <= 3 ? 'Cloudy' : code <= 48 ? 'Fog' : code <= 67 ? 'Rain' : code <= 77 ? 'Snow' : code <= 82 ? 'Showers' : code <= 86 ? 'Snow showers' : 'Thunderstorm';
    return { ok: true, status: 200, data: { city: place.name, temperatureC: current.temperature_2m, condition } };
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

function installWeatherApi(fixture: typeof fetchFixtureWeather, live?: (city: string) => Promise<WeatherReply>) {
  let mode = 'fixture'; const calls: Array<{ city: string; mode: string; jsonReads: number }> = [];
  Object.defineProperty(globalThis, 'weatherApi', { configurable: true, value: Object.freeze({
    get mode() { return mode; }, get calls() { return calls.map(item => ({ ...item })); },
    setMode(next: string) { if (next !== 'fixture' && next !== 'live') throw new Error('Unknown weather mode.'); if (next === 'live' && !live) throw new Error('Optional live weather is disabled. Enable it in the host, then Run again.'); mode = next; },
    async fetch(city: string) {
      const call = { city: typeof city === 'string' ? city.slice(0, 100) : '[invalid]', mode, jsonReads: 0 };
      calls.push(call); if (calls.length > 200) calls.shift();
      if (typeof city !== 'string' || city.trim().length < 2 || city.trim().length > 80 || /[\u0000-\u001f]/.test(city)) throw new Error('Enter a city of 2–80 characters.');
      const reply = await (mode === 'live' ? live!(city) : fixture(city));
      return Object.freeze({ ok: reply.ok, status: reply.status, json: async () => { call.jsonReads++; return structuredClone(reply.data); } });
    },
  }) });
}

export function weatherFixtureScript(): string {
  return `<script>(${installWeatherApi.toString()})(${fetchFixtureWeather.toString()});</script>`;
}

export function weatherExportScript(): string {
  return `<script>(${installWeatherApi.toString()})(${fetchFixtureWeather.toString()},${fetchLiveWeather.toString()});</script>`;
}

export function weatherBridgeScript(runId: string, nonce: string, live: boolean): string {
  const request = `city => new Promise((resolve, reject) => {
    if (pending.size >= 4) { reject(new Error('Wait for pending weather requests.')); return; }
    const requestId = ++sequence;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error('Live weather timed out. Try fixture mode.')); }, 7000);
    pending.set(requestId, { resolve, reject, timer });
    parent.postMessage({ type: 'weather-request', runId, nonce, requestId, city }, '*');
  })`;
  return `<script>(() => { const runId = ${JSON.stringify(runId)}, nonce = ${JSON.stringify(nonce)}; let sequence = 0; const pending = new Map();
  addEventListener('message', event => { const d = event.data;
    if (event.source !== parent || !d || d.type !== 'weather-result' || d.runId !== runId || d.nonce !== nonce || !Number.isSafeInteger(d.requestId)) return;
    const item = pending.get(d.requestId); if (!item) return;
    if (d.ok === true && (!d.value || typeof d.value.ok !== 'boolean' || !Number.isInteger(d.value.status) || JSON.stringify(d.value).length > 2048)) return;
    if (d.ok !== true && (d.ok !== false || typeof d.error !== 'string' || d.error.length > 300)) return;
    clearTimeout(item.timer); pending.delete(d.requestId); d.ok ? item.resolve(d.value) : item.reject(new Error(d.error));
  });
  (${installWeatherApi.toString()})(${fetchFixtureWeather.toString()}, ${live ? request : 'undefined'});
  })();</script>`;
}

export function acceptedWeatherRequest(event: MessageEvent, frame: HTMLIFrameElement, run: { id: string; nonce: string; stopped: boolean }): event is MessageEvent<{ type: 'weather-request'; runId: string; nonce: string; requestId: number; city: string }> {
  const d = event.data;
  return Boolean(!run.stopped && event.source === frame.contentWindow && d && !Array.isArray(d) && d.type === 'weather-request' && d.runId === run.id && d.nonce === run.nonce && Number.isSafeInteger(d.requestId) && d.requestId > 0 && typeof d.city === 'string' && d.city.trim().length >= 2 && d.city.trim().length <= 80 && d.city.length <= 100 && !/[\u0000-\u001f]/.test(d.city));
}
