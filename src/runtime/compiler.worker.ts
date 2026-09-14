import * as esbuild from 'esbuild-wasm';
import type { Files } from '../contracts';
import { instrumentLoops } from './loopInstrumentation';
import { normalizeVirtualPath, resolveProjectFile } from './virtualFiles';

type CompileRequest = { type: 'compile'; id: number; files: Files };
type CompileResponse =
  | { id: number; ok: true; html: string; head: string }
  | { id: number; ok: false; error: string };

let ready: Promise<void> | undefined;
let vendor: Promise<string> | undefined;

function runtimeAsset(name: string): string {
  return new URL(`${import.meta.env.BASE_URL}runtime/${name}`, self.location.origin).href;
}

function extensionLoader(path: string): 'js' | 'jsx' | 'ts' | 'tsx' | 'css' | 'json' | 'dataurl' | 'text' {
  if (path.endsWith('.jsx')) return 'jsx';
  if (path.endsWith('.ts')) return 'ts';
  if (path.endsWith('.tsx')) return 'tsx';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.svg')) return 'dataurl';
  if (path.endsWith('.txt')) return 'text';
  return 'js';
}

function attribute(attributes: string, name: string): string | undefined {
  const expression = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = expression.exec(attributes);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function htmlScripts(html: string): Array<{ full: string; source?: string; inline?: string }> {
  const scripts: Array<{ full: string; source?: string; inline?: string }> = [];
  const expression = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(html))) {
    const src = attribute(match[1], 'src');
    scripts.push({ full: match[0], source: src, inline: src ? undefined : match[2] });
  }
  return scripts;
}

function inlineStyles(html: string, files: Map<string, string>): string {
  return html.replace(/<link\b([^>]*?)>/gi, (full, attributes: string) => {
    const rel = /\brel\s*=\s*["']stylesheet["']/i.test(attributes);
    const href = attribute(attributes, 'href');
    if (!rel || !href) return full;
    const path = resolveProjectFile(href, '/index.html', files);
    return path?.endsWith('.css') ? `<style>${files.get(path)}</style>` : full;
  });
}

function inlineHtmlAssets(html: string, files: Map<string, string>): string {
  return html.replace(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, (full, doubleQuoted: string | undefined, singleQuoted: string | undefined, unquoted: string | undefined) => {
    const source = doubleQuoted ?? singleQuoted ?? unquoted;
    if (!source) return full;
    const path = resolveProjectFile(source, '/index.html', files);
    if (!path?.endsWith('.svg')) return full;
    const contents = files.get(path);
    return contents === undefined ? full : `src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(contents)}"`;
  });
}

function normalizedBuildPath(path: string): string {
  return path.replace(/^learner:/, '').replaceAll('\\', '/').replace(/^\/+/, '');
}

async function compile(filesInput: Files): Promise<{ html: string; head: string }> {
  if (!ready) ready = esbuild.initialize({ wasmURL: runtimeAsset('esbuild.wasm'), worker: false });
  await ready;
  if (!vendor) vendor = fetch(runtimeAsset('react-vendor.js')).then(async (response) => {
    if (!response.ok) throw new Error('The local React runtime could not be loaded. Run prepare:runtime.');
    return response.text();
  });

  const files = new Map<string, string>();
  for (const [name, content] of Object.entries(filesInput)) {
    const normalized = normalizeVirtualPath(name);
    if (normalized) files.set(normalized, content);
  }
  const rawIndex = files.get('/index.html');
  if (rawIndex === undefined) throw new Error('index.html is required.');
  const index = rawIndex.replace(/<base\b[^>]*>/gi, '').replace(/<meta\b(?=[^>]*\bhttp-equiv\s*=\s*(?:"refresh"|'refresh'|refresh))[^>]*>/gi, '');

  const scriptTags = htmlScripts(index);
  const entries: string[] = [];
  const replacementKeys: string[] = [];
  for (let position = 0; position < scriptTags.length; position += 1) {
    const script = scriptTags[position];
    let entry: string | undefined;
    if (script.source) {
      entry = resolveProjectFile(script.source, '/index.html', files);
      if (!entry) throw new Error(`Only local project files may be used in HTML scripts: ${script.source}`);
    }
    else if (script.inline?.trim()) {
      entry = `/__inline/${position}.js`;
      files.set(entry, script.inline);
    }
    if (entry) {
      entries.push(entry);
      replacementKeys.push(entry);
    }
  }

  let html = inlineHtmlAssets(inlineStyles(index, files), files);
  const replacements: Array<[string, string]> = [];
  const generatedStyles: string[] = [];
  if (entries.length) {
    const vendorSource = await vendor;
    const result = await esbuild.build({
      entryPoints: entries,
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: 'es2020',
      jsx: 'automatic',
      jsxImportSource: 'react',
      outdir: '/out',
      write: false,
      metafile: true,
      logLevel: 'silent',
      plugins: [{
        name: 'learner-files',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.path === 'react') return { path: '/__vendor/react.js', namespace: 'learner' };
            if (args.path === 'react-dom/client') return { path: '/__vendor/react-dom-client.js', namespace: 'learner' };
            if (args.path === 'react/jsx-runtime') return { path: '/__vendor/jsx-runtime.js', namespace: 'learner' };
            if (args.path === 'react/jsx-dev-runtime') return { path: '/__vendor/jsx-dev-runtime.js', namespace: 'learner' };
            if (args.path === '/__vendor/react-vendor.js') return { path: args.path, namespace: 'learner' };
            const resolved = resolveProjectFile(args.path, args.importer || '/index.html', files);
            return resolved ? { path: resolved, namespace: 'learner' } : { errors: [{ text: `Only local project files may be imported: ${args.path}` }] };
          });
          build.onLoad({ filter: /.*/, namespace: 'learner' }, (args) => {
            const bridges: Record<string, string> = {
              '/__vendor/react.js': 'export { React as default, React } from "/__vendor/react-vendor.js"; export * from "/__vendor/react-vendor.js";',
              '/__vendor/react-dom-client.js': 'export { createRoot, hydrateRoot } from "/__vendor/react-vendor.js";',
              '/__vendor/jsx-runtime.js': 'export { jsx, jsxs, Fragment } from "/__vendor/react-vendor.js";',
              '/__vendor/jsx-dev-runtime.js': 'export { jsxDEV, Fragment } from "/__vendor/react-vendor.js";',
              '/__vendor/react-vendor.js': vendorSource,
            };
            const contents = bridges[args.path] ?? files.get(args.path);
            if (contents === undefined) return { errors: [{ text: `Missing file: ${args.path}` }] };
            return { contents, loader: extensionLoader(args.path) };
          });
        },
      }],
    });
    const outputs = result.outputFiles ?? [];
    const scriptsByEntry = new Map<string, string>();
    for (const output of outputs) {
      if (output.path.endsWith('.css')) generatedStyles.push(output.text);
      else if (output.path.endsWith('.js')) {
        const metadata = Object.entries(result.metafile?.outputs ?? {}).find(([path]) => normalizedBuildPath(path) === normalizedBuildPath(output.path))?.[1];
        if (metadata?.entryPoint) scriptsByEntry.set(`/${normalizedBuildPath(metadata.entryPoint)}`, instrumentLoops(output.text));
      }
    }
    for (let position = 0, keyIndex = 0; position < scriptTags.length; position += 1) {
      const script = scriptTags[position];
      if (!script.source && !script.inline?.trim()) { html = html.replace(script.full, ''); continue; }
      const key = replacementKeys[keyIndex];
      const code = key ? scriptsByEntry.get(key) : undefined;
      if (!code) throw new Error(`Compiler produced no script for ${key ?? 'entry'}.`);
      keyIndex += 1;
      const placeholder = `<!--compiled-entry-${position}-->`;
      html = html.replace(script.full, placeholder);
      replacements.push([placeholder, `<script data-runtime-compiled>${code.replace(/<\/script/gi, '<\\/script')}</script>`]);
    }
  }
  // Separate the learner's head while JavaScript is still represented by safe
  // placeholders. Keeping styles in head prevents body rendering from deleting them.
  let head = /<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(html)?.[1] ?? '';
  html = html.replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/i, '')
    .replace(/<!doctype[^>]*>/gi, '').replace(/<\/?(?:html|body)\b[^>]*>/gi, '');
  if (generatedStyles.length) head += `<style>${generatedStyles.join('\n')}</style>`;
  // Scripts execute after the document markup (module-style deferred semantics).
  // Never scan generated JavaScript with HTML regexes: React contains HTML strings.
  for (const [placeholder, script] of replacements) {
    head = head.replace(placeholder, '');
    html = html.replace(placeholder, '');
    html += script;
  }
  return { html, head };
}

self.addEventListener('message', (event: MessageEvent<CompileRequest>) => {
  const request = event.data;
  if (!request || request.type !== 'compile') return;
  void compile(request.files)
    .then((document) => self.postMessage({ id: request.id, ok: true, ...document } satisfies CompileResponse))
    .catch((error: unknown) => self.postMessage({ id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) } satisfies CompileResponse));
});
