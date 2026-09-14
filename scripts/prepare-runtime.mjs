import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import esbuild from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'public', 'runtime');
await mkdir(output, { recursive: true });
await copyFile(resolve(root, 'node_modules', 'esbuild-wasm', 'esbuild.wasm'), resolve(output, 'esbuild.wasm'));
const notices = await Promise.all(['react', 'react-dom', 'scheduler', 'esbuild-wasm'].map(async (name) => `${name}\n${await readFile(resolve(root, 'node_modules', name, name === 'esbuild-wasm' ? 'LICENSE.md' : 'LICENSE'), 'utf8')}`));
await writeFile(resolve(output, 'THIRD_PARTY_LICENSES.txt'), notices.join('\n\n---\n\n'));
await esbuild.build({
  stdin: {
    contents: `
      import React from 'react';
      export { React };
      export const {
        Children, Component, Profiler, PureComponent, StrictMode, Suspense,
        act, cache, cloneElement, createContext, createElement, createRef, forwardRef,
        isValidElement, lazy, memo, startTransition, use, useActionState, useCallback,
        useContext, useDebugValue, useDeferredValue, useEffect, useEffectEvent, useId,
        useImperativeHandle, useInsertionEffect, useLayoutEffect, useMemo, useOptimistic,
        useReducer, useRef, useState, useSyncExternalStore, useTransition, version,
      } = React;
      export { createRoot, hydrateRoot } from 'react-dom/client';
      export { jsx, jsxs, Fragment } from 'react/jsx-runtime';
      export { jsxDEV } from 'react/jsx-dev-runtime';
    `,
    resolveDir: root,
    sourcefile: 'runtime-react-vendor.ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  outfile: resolve(output, 'react-vendor.js'),
  legalComments: 'none',
});
