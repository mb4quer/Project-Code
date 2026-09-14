const extensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.json', '.svg', '.txt'];

export function normalizeVirtualPath(path: string): string | undefined {
  const pieces: string[] = [];
  for (const part of path.replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') return undefined;
    pieces.push(part);
  }
  return `/${pieces.join('/')}`;
}

/** Resolves only project-local module paths; package and network imports fail. */
export function resolveProjectFile(path: string, importer: string, files: Map<string, string>): string | undefined {
  if (/^(?:https?:|data:|\/\/)/i.test(path)) return undefined;
  const base = path.startsWith('/') ? path : `${importer.slice(0, importer.lastIndexOf('/') + 1)}${path}`;
  const candidate = normalizeVirtualPath(base);
  if (!candidate) return undefined;
  const choices = [candidate, ...extensions.map((extension) => `${candidate}${extension}`), ...extensions.map((extension) => `${candidate}/index${extension}`)];
  return choices.find((item) => files.has(item));
}
