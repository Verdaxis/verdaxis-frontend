import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PINS = {
  production: '3f16cabba6424ef08250b32f8f8e4b9a621c4379',
  staging: '3cfeac54e1aaf662cf4f48a3bf3243c445d8a087',
};
const transports = new Map([
  ['fetch', 0], ['fetchApi', 0], ['fetchWithTimeout', 0], ['readApi', 1],
  ['mutateApi', 1], ['sendBeacon', 0], ['EventSource', 0],
  // Pages through an admin list; its callers name the route.
  ['fetchAdminItems', 0],
]);

function property(node, name) {
  return node && ts.isObjectLiteralExpression(node)
    ? node.properties.find(item => item.name?.getText() === name)?.initializer : undefined;
}

// Resolve local URL variables, but never execute application code or make requests.
function resolve(node, source, seen = new Set()) {
  if (!node) return undefined;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return node.head.text + node.templateSpans.map(span => {
      const expression = span.expression.getText(source);
      const value = expression === 'API_URL' || expression === 'API_BASE_URL' ? '/api'
        : expression.includes('?') || expression.includes('toString') ? '?{query}' : '{id}';
      return value + span.literal.text;
    }).join('');
  }
  if (ts.isIdentifier(node) && !seen.has(node.text)) {
    seen.add(node.text);
    for (let scope = node.parent; scope; scope = scope.parent) {
      let initializer;
      const visit = child => {
        if (ts.isVariableDeclaration(child) && child.name.getText(source) === node.text) initializer = child.initializer;
        if (child !== scope && (ts.isFunctionLike(child) || ts.isArrowFunction(child))) return;
        ts.forEachChild(child, visit);
      };
      visit(scope);
      if (initializer) return resolve(initializer, source, seen);
    }
  }
  return undefined;
}

export function inventory(ref) {
  const files = execFileSync('git', ref === 'working'
    ? ['ls-files', '--cached', '--others', '--exclude-standard', 'src']
    : ['ls-tree', '-r', '--name-only', ref, 'src'], { encoding: 'utf8' })
    .trim().split('\n').filter(file => /\.[jt]sx?$/.test(file) && !/(__tests__|\/tests\/|\/archive\/)/.test(file));
  const calls = [];
  for (const file of files) {
    const text = ref === 'working' ? readFileSync(file, 'utf8')
      : execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8' });
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = node => {
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const name = ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : node.expression.getText(source);
        if (transports.has(name)) {
          const index = transports.get(name);
          const argument = node.arguments?.[index];
          const raw = resolve(argument, source);
          let options = node.arguments?.[index + 1];
          if (name === 'readApi') options = node.arguments?.[4];
          const method = resolve(property(options, 'method'), source) ?? (name === 'sendBeacon' ? 'POST' : 'GET');
          const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          if (raw?.startsWith('/') && raw !== '/api{id}') {
            const path = raw.split('?')[0].replace(/\/$/, '');
            const normalized = path.startsWith('/api/') ? path : `/api${path}`;
            const paths = normalized === '/api/stream/{id}'
              ? ['prices', 'orderbook', 'trades'].map(channel => `/api/stream/${channel}`)
              : normalized === '/api/admin/analytics/product-analytics/{id}'
                ? ['overview', 'acquisition', 'activation', 'engagement', 'marketplace', 'retention', 'reliability'].map(tab => `/api/admin/analytics/product-analytics/${tab}`)
                : [file.endsWith('DeploymentUpdateNotice.tsx') ? '/' : normalized];
            for (const path of paths) calls.push({ file, line, transport: name, method, path });
          } else {
            calls.push({ file, line, transport: name, method, dynamic: argument?.getText(source) ?? '' });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return calls;
}

export function requireClassified(calls, contract) {
  for (const call of calls) {
    const key = call.path ? `${call.method} ${call.path}` : `${call.file}:${call.transport}:${call.dynamic}`;
    if (!(key in (call.path ? contract.routes : contract.adapters))) throw new Error(`Unclassified request: ${key}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = Object.fromEntries(Object.entries({ ...PINS, working: 'working' }).map(([name, ref]) => [name, inventory(ref)]));
  if (process.argv[2] === '--write') writeFileSync('docs/phase0/request-manifest.json', JSON.stringify({ pins: PINS, ...manifest }, null, 2) + '\n');
  else {
    const contract = JSON.parse(readFileSync('docs/phase0/request-contract.json', 'utf8'));
    for (const calls of Object.values(manifest)) requireClassified(calls, contract);
    console.log(`Classified ${Object.values(manifest).flat().length} pinned and current request sites.`);
  }
}
