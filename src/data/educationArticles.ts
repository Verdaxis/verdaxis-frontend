import i18n from '../i18n';

export interface EducationArticle {
  slug: string;
  title: string;
  summary: string;
  category: 'Fundamentals' | 'Compliance' | 'Market';
  readTime: number; // minutes
  content: string; // Plain text with paragraph breaks
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
  }));
}

// Legacy export for backwards compatibility during migration — callers that
// can't easily call a function (e.g. module-level constants) may still use
// this, but it will always be in the initialisation language (en).
export const educationArticles: EducationArticle[] = getEducationArticles();
