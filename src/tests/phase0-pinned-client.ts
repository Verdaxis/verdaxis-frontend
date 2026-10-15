import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as analytics from '../services/analytics';
import * as authToken from '../services/authToken';
import * as backendAvailability from '../services/backendAvailability';
import * as config from '../services/config';
import * as support from '../services/marketSupportContextStore';
import * as readCache from '../services/readCache';

// Execute the immutable production wrapper, not a rewritten imitation of its calls.
export function pinnedProductionClient() {
  const source = execFileSync('git', ['show', '3f16cabba6424ef08250b32f8f8e4b9a621c4379:src/services/api.ts'], { encoding: 'utf8' });
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const dependencies: Record<string, unknown> = {
    './analytics': analytics, './authToken': authToken, './backendAvailability': backendAvailability,
    './config': config, './marketSupportContextStore': support, './readCache': readCache,
  };
  const exports: Record<string, any> = {};
  runInNewContext(compiled, {
    exports, require: (name: string) => {
      if (!(name in dependencies)) throw new Error(`Unreviewed pinned dependency: ${name}`);
      return dependencies[name];
    },
    fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
    window, document, localStorage, sessionStorage, Headers, URLSearchParams,
    AbortController, DOMException, CustomEvent, setTimeout, clearTimeout, console,
  });
  return exports.api;
}
