import i18n from '../i18n';

export interface EducationArticle {
  slug: string;
  title: string;
  summary: string;
  category: 'Fundamentals' | 'Compliance' | 'Market';
  readTime: number; // minutes
  content: string; // Plain text with paragraph breaks
  maintainer: string;
  sourcesCheckedOn: string;
  references: EducationReference[];
}

export interface EducationReference {
  title: string;
  url: string;
}

export const EDUCATION_CATEGORY_KEYS = {
  All: 'all',
  Fundamentals: 'fundamentals',
  Compliance: 'compliance',
  Market: 'market',
} as const;

export type EducationCategoryFilter = keyof typeof EDUCATION_CATEGORY_KEYS;

const SLUGS = [
  'what-is-carbon-intensity',
  'physical-vs-book-and-claim',
  'compliance-vs-credits',
  'scope-3-claims',
  'energy-content-matters',
  'fueleu-maritime-guide',
];

const READ_TIMES = [4, 3, 3, 5, 4, 5];

const REFERENCE_URLS: readonly (readonly string[])[] = [
  [
    'https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MEPCDocuments/MEPC.391%2881%29.pdf',
    'https://eur-lex.europa.eu/eli/reg/2023/1805/oj',
  ],
  [
    'https://rsb.org/wp-content/uploads/2023/04/rsb-pro-20-002-rsb-procedure-for-book-and-claim-4.2.pdf',
    'https://eur-lex.europa.eu/eli/reg/2023/1805/oj',
  ],
  [
    'https://eur-lex.europa.eu/eli/reg/2023/1805/oj',
    'https://climate.ec.europa.eu/areas-action/transport-decarbonisation/reducing-emissions-shipping-sector/faq-maritime-transport-eu-emissions-trading-system-ets_en',
  ],
  [
    'https://ghgprotocol.org/corporate-value-chain-scope-3-standard',
    'https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/ifrs-s2-climate-related-disclosures/',
  ],
  [
    'https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MEPCDocuments/MEPC.391%2881%29.pdf',
    'https://eur-lex.europa.eu/eli/reg/2023/1805/oj',
  ],
  [
    'https://eur-lex.europa.eu/eli/reg/2023/1805/oj',
    'https://emsa.europa.eu/reducing-emissions/webinars_and_tutorials/fueleu-webinars.html',
  ],
];

// Category values must stay as English literals since they are used as filter keys
// and as CSS color-map keys. We expose a separate translated display if needed.
const CATEGORIES: EducationArticle['category'][] = [
  'Fundamentals',
  'Fundamentals',
  'Compliance',
  'Compliance',
  'Market',
  'Compliance',
];

export function getEducationArticles(): EducationArticle[] {
  const t = i18n.getFixedT(null, 'education');
  return SLUGS.map((slug, i) => ({
    slug,
    title: t(`articles.${i}.title`),
    summary: t(`articles.${i}.summary`),
    category: CATEGORIES[i],
    readTime: READ_TIMES[i],
    content: t(`articles.${i}.content`),
    maintainer: 'Verdaxis',
    sourcesCheckedOn: '2026-10-06',
    references: REFERENCE_URLS[i].map((url, referenceIndex) => ({
      title: t(`articles.${i}.references.${referenceIndex}`),
      url,
    })),
  }));
}

// Legacy export for backwards compatibility during migration — callers that
// can't easily call a function (e.g. module-level constants) may still use
// this, but it will always be in the initialisation language (en).
export const educationArticles: EducationArticle[] = getEducationArticles();
