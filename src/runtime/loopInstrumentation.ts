import { parse } from 'acorn';
import * as walk from 'acorn-walk';
import MagicString from 'magic-string';

/**
 * Adds a cooperative counter to ordinary JavaScript loops. This is a safety
 * valve for a preview, not a general JavaScript sandbox or a complete runtime
 * limit: recursion, async work, native calls, and code generated with eval are
 * intentionally outside its reach.
 */
export function instrumentLoops(source: string): string {
  let program: ReturnType<typeof parse>;
  try {
    program = parse(source, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true });
  } catch {
    // esbuild normally supplies parseable output. If it does not, leave it to
    // the browser to report the original syntax error instead of corrupting it.
    return source;
  }

  const edits = new MagicString(source);
  let changed = false;
  const visit = (node: { body: { type: string; start: number; end: number } }) => {
    const body = node.body;
    if (body.type === 'BlockStatement') {
      edits.appendLeft(body.start + 1, 'globalThis.__learnerRuntimeTick();');
    } else {
      edits.prependLeft(body.start, '{globalThis.__learnerRuntimeTick();');
      edits.appendRight(body.end, '}');
    }
    changed = true;
  };

  walk.simple(program as never, {
    ForStatement: visit,
    ForInStatement: visit,
    ForOfStatement: visit,
    WhileStatement: visit,
    DoWhileStatement: visit,
  } as never);

  return changed ? edits.toString() : source;
}
