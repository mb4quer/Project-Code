import { afterEach, describe, expect, it, vi } from 'vitest';
import { runInNewContext } from 'node:vm';
import { acceptedWeatherRequest, fetchFixtureWeather, fetchLiveWeather, weatherFixtureScript, weatherExportScript } from '../src/runtime/weatherApi';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('Weather capability boundaries and deterministic data', () => {
  it('returns independent fixtures, HTTP failure, empty and malformed shapes without networking', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const first = await fetchFixtureWeather(' London ');
    expect(first).toEqual({ ok: true, status: 200, data: { city: 'London', temperatureC: 18, condition: 'Cloudy' } });
    (first.data as { city: string }).city = 'Changed';
    expect((await fetchFixtureWeather('London')).data).toMatchObject({ city: 'London' });
    expect(await fetchFixtureWeather('Error')).toMatchObject({ ok: false, status: 503 });
    expect((await fetchFixtureWeather('Unknown')).data).toBeNull();
    expect((await fetchFixtureWeather('Malformed')).data).toMatchObject({ temperatureC: 'warm' });
    await expect(fetchFixtureWeather('Offline')).rejects.toThrow('Offline'); expect(fetch).not.toHaveBeenCalled();
  });
  it('finishes Fast before Slow and independently rejects SlowError', async () => {
    const order: string[] = [];
    await Promise.all([fetchFixtureWeather('Slow').then(() => order.push('slow')), fetchFixtureWeather('Fast').then(() => order.push('fast')), fetchFixtureWeather('SlowError').catch(() => order.push('error'))]);
    expect(order[0]).toBe('fast'); expect(order).toContain('error');
  });
  it('injects a usable Response-like fixture API; reveals no live capability in graders', async () => {
    const context: any = { setTimeout, structuredClone };
    runInNewContext(weatherFixtureScript().replace(/^<script>|<\/script>$/g, ''), context);
    expect(context.weatherApi.mode).toBe('fixture'); expect(() => context.weatherApi.setMode('live')).toThrow('disabled');
    const response = await context.weatherApi.fetch('Paris'); expect(response.ok).toBe(true); expect(await response.json()).toMatchObject({ temperatureC: 22 });
    const calls = context.weatherApi.calls; calls.length = 0; expect(context.weatherApi.calls).toHaveLength(1);
    await expect(context.weatherApi.fetch('x')).rejects.toThrow('2–80');
  });
  it('export adapter is self-contained and begins in fixtures without calling the service', async () => {
    const fetch = vi.fn(); const context: any = { setTimeout, clearTimeout, structuredClone, AbortController, fetch };
    runInNewContext(weatherExportScript().replace(/^<script>|<\/script>$/g, ''), context);
    expect(context.weatherApi.mode).toBe('fixture'); await context.weatherApi.fetch('London'); expect(fetch).not.toHaveBeenCalled();
  });
  it('accepts only active frame/run/nonce identities and bounded city requests', () => {
    const source = {}, frame = { contentWindow: source } as HTMLIFrameElement, run = { id: 'run', nonce: 'secret', stopped: false };
    const data = { type: 'weather-request', runId: 'run', nonce: 'secret', requestId: 1, city: 'London' };
    const check = (d = data, s = source, r = run) => acceptedWeatherRequest({ source: s, data: d } as MessageEvent, frame, r);
    expect(check()).toBe(true);
    for (const bad of [{ ...data, city: 'x' }, { ...data, city: 'x'.repeat(81) }, { ...data, city: 'ab\ncd' }, { ...data, requestId: 0 }, { ...data, nonce: 'forged' }, { ...data, runId: 'old' }]) expect(check(bad)).toBe(false);
    expect(check(data, {})).toBe(false); expect(check(data, source, { ...run, stopped: true })).toBe(false);
  });
  it('live requests normalize two fixed endpoints, encode names, and omit credentials', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ results: [{ name: 'Paris', latitude: 48.86, longitude: 2.35 }] })).mockResolvedValueOnce(Response.json({ current: { temperature_2m: 21, weather_code: 0 } }));
    vi.stubGlobal('fetch', fetch);
    expect(await fetchLiveWeather('Paris & France')).toEqual({ ok: true, status: 200, data: { city: 'Paris', temperatureC: 21, condition: 'Clear' } });
    expect(fetch.mock.calls[0][0]).toContain('name=Paris%20%26%20France');
    expect(fetch.mock.calls[1][0]).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast\?/);
    for (const call of fetch.mock.calls) expect(call[1]).toMatchObject({ credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' });
  });
  it('live empty and HTTP failures stay distinct; invalid coordinates cannot build a URL', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({})).mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(Response.json({ results: [{ name: 'Bad', latitude: 'https://evil.test', longitude: 4 }] }));
    vi.stubGlobal('fetch', fetch);
    expect((await fetchLiveWeather('Empty')).data).toBeNull();
    expect(await fetchLiveWeather('Error')).toMatchObject({ ok: false, status: 503 });
    await expect(fetchLiveWeather('Bad')).rejects.toThrow('Invalid location'); expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('bounds streamed response size and rejects malformed weather data', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('x'.repeat(65537))).mockResolvedValueOnce(Response.json({ results: [{ name: 'Valid', latitude: 1, longitude: 2 }] })).mockResolvedValueOnce(Response.json({ current: { temperature_2m: 'warm', weather_code: 0 } }));
    vi.stubGlobal('fetch', fetch);
    await expect(fetchLiveWeather('Large')).rejects.toThrow('too large'); await expect(fetchLiveWeather('Bad')).rejects.toThrow('Invalid weather');
  });
  it('propagates cancellation and times out stalled live requests', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => { if (options.signal.aborted) reject(new Error('aborted')); else options.signal.addEventListener('abort', () => reject(new Error('aborted'))); })));
    const controller = new AbortController(); const pending = expect(fetchLiveWeather('London', controller.signal)).rejects.toThrow('aborted'); controller.abort(); await pending;
    const timeout = expect(fetchLiveWeather('Paris')).rejects.toThrow('aborted'); await vi.advanceTimersByTimeAsync(6000); await timeout;
  });
});
