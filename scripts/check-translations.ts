import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../src/locales');
const LANGS = ['en', 'zh'];
const BASE_LANG = 'en';

let errors = 0;

function leafKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return prefix ? [prefix] : [];

  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

const namespaceFiles = (lang: string) => fs.readdirSync(path.join(LOCALES_DIR, lang))
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace('.json', ''));
const namespaces = namespaceFiles(BASE_LANG);

for (const lang of LANGS) {
  if (lang === BASE_LANG) continue;
  const extraNamespaces = namespaceFiles(lang).filter(ns => !namespaces.includes(ns));
  if (extraNamespaces.length) {
    console.error(`${lang} has ${extraNamespaces.length} EXTRA namespace files:`, extraNamespaces);
    errors += extraNamespaces.length;
  }
}

for (const ns of namespaces) {
  const basePath = path.join(LOCALES_DIR, BASE_LANG, `${ns}.json`);
  const baseKeys = leafKeys(JSON.parse(fs.readFileSync(basePath, 'utf-8')));

  for (const lang of LANGS) {
    if (lang === BASE_LANG) continue;
    const langPath = path.join(LOCALES_DIR, lang, `${ns}.json`);
    if (!fs.existsSync(langPath)) {
      console.error(`MISSING FILE: ${lang}/${ns}.json`);
      errors++;
      continue;
    }
    const langKeys = leafKeys(JSON.parse(fs.readFileSync(langPath, 'utf-8')));
    const missing = baseKeys.filter(k => !langKeys.includes(k));
    const extra = langKeys.filter(k => !baseKeys.includes(k));
    if (missing.length) {
      console.error(`${lang}/${ns}.json MISSING ${missing.length} keys:`, missing);
      errors += missing.length;
    }
    if (extra.length) {
      console.error(`${lang}/${ns}.json has ${extra.length} EXTRA keys:`, extra);
      errors += extra.length;
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} translation parity issue(s) found.`);
  process.exit(1);
} else {
  console.log('All translations complete.');
}
