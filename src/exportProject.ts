import { weatherExportScript } from './runtime/weatherApi';
import type { Files } from './contracts';
import { validateFiles } from './runtime';

const encoder = new TextEncoder();
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}
/** Standard uncompressed ZIP, UTF-8 names; no dependency or executable archive paths. */
export function zipFiles(files: Files): Uint8Array {
  const local: Uint8Array[] = [], central: Uint8Array[] = []; let offset = 0, centralSize = 0;
  for (const [path, text] of Object.entries(files)) {
    if (!/^[a-zA-Z0-9_./ -]+$/.test(path) || path.startsWith('/') || path.split('/').some(p => !p || p === '.' || p === '..')) throw new Error(`Unsupported export path: ${path}`);
    const name = encoder.encode(path), data = encoder.encode(text), crc = crc32(data);
    const header = new Uint8Array(30 + name.length), h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); header.set(name, 30);
    const entry = new Uint8Array(46 + name.length), c = new DataView(entry.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true); entry.set(name, 46);
    local.push(header, data); central.push(entry); offset += header.length + data.length; centralSize += entry.length;
  }
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, central.length, true); e.setUint16(10, central.length, true); e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
  const result = new Uint8Array(offset + centralSize + end.length); let cursor = 0;
  for (const part of [...local, ...central, end]) { result.set(part, cursor); cursor += part.length; }
  return result;
}

export function exportDocument(html: string, head: string, namespace: string): string {
  const prefix = JSON.stringify(`project-code-export.${namespace}.`).replaceAll('<', '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${head}${/^(async-weather|weather-)/.test(namespace) ? weatherExportScript() : ''}<script>
(() => {
let ticks = 0; globalThis.__learnerRuntimeTick = () => { if (++ticks > 100000) throw new Error('Loop exceeded 100000 iterations. Reload to recover.'); };
const prefix = ${prefix};
const key = value => { if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(value) || ['constructor','prototype','__proto__'].includes(value)) throw new Error('Invalid storage key.'); return prefix + value; };
window.trainingStorage = Object.freeze({
getItem: async name => localStorage.getItem(key(name)),
setItem: async (name, value) => { if (typeof value !== 'string' || value.length > 16384) throw new Error('Invalid storage value.'); localStorage.setItem(key(name), value); },
removeItem: async name => localStorage.removeItem(key(name))
});
})();</script></head><body>${html}</body></html>`;
}

export async function buildProjectZip(input: Files, namespace: string): Promise<Uint8Array> {
  const files = validateFiles(input);
  const compiled = await new Promise<{ html: string; head: string }>((resolve, reject) => {
    const worker = new Worker(new URL('./runtime/compiler.worker.ts', import.meta.url), { type: 'module' });
    const finish = () => { clearTimeout(timer); worker.terminate(); };
    const timer = setTimeout(() => { finish(); reject(new Error('Export compilation timed out.')); }, 12000);
    worker.onmessage = event => { finish(); const d = event.data; d.ok && typeof d.html === 'string' ? resolve({ html: d.html, head: d.head ?? '' }) : reject(new Error(d.error ?? 'Export compilation failed.')); };
    worker.onerror = () => { finish(); reject(new Error('Export compiler failed.')); };
    worker.postMessage({ type: 'compile', id: 1, files });
  });
  return zipFiles({
    'index.html': exportDocument(compiled.html, compiled.head, namespace),
    ...Object.fromEntries(Object.entries(files).map(([name, text]) => [`source/${name}`, text])),
    'README.md': `# Your exported project\n\nThe root index.html is a runnable browser bundle compiled from your current draft, including local styles and imported assets. Export compiles code; it does not certify that behavior checks pass.\n\n## Run locally\nExtract the ZIP. In this folder run \`python -m http.server 8080\` (Python required), then open http://localhost:8080. Stop with Ctrl+C. You may also use any static HTTP server. Direct file opening can restrict browser storage; use HTTP for persistence.\n\n## Continue editing\nsource/ contains your exact original files. Continue editing these files in Project Code and export again to rebuild root index.html. Changes inside source/ do not rebuild the bundle automatically. Weather source files depend on the weatherApi adapter supplied in the compiled root; provide an equivalent adapter if serving those original files directly. Native HTML/CSS/JS modules can also be served separately with your own build setup; this export does not include a package manager or Node runtime.\n\n## Storage\nThe bundled window.trainingStorage adapter uses namespaced localStorage on YOUR exported site's origin. It contains no host account credentials, learner progress, or saved preview tasks. Data starts empty, stays in this browser, and is not synced. Storage can fail; keep the app's recovery UI. The exported app runs as an ordinary webpage, outside Project Code's iframe sandbox.\n\n## Weather mode\nWeather exports start in deterministic fixture mode and include the fixture adapter without an external dependency. The explicit in-app Live option contacts Open-Meteo geocoding and forecast endpoints with the searched city, without credentials. Data: https://open-meteo.com/ ; locations: https://www.geonames.org/ . The free service is for noncommercial use and has limits and no uptime guarantee; review https://open-meteo.com/en/pricing before deployment. Live checks are separate from deterministic grading. Test London/Paris, Empty, Error, Offline, Malformed, Slow/Fast and SlowError/Fast; verify latest searches win, run smoke checks twice, then reload and confirm fixture mode.\n\n## Test and deploy\nFor Todo, run add/blank-input/literal-text, duplicate toggle/delete, all/active/completed filters, empty states, reload persistence and malformed/save-failure checks. Test keyboard access and a narrow viewport. Serve the root index.html using a static host; verify the deployed URL, reload, browser console, and assets. No backend or real payments are included. Publish only after your own behavior and content review.\n`,
  });
}
