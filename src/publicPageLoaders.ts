import type { ComponentType } from 'react';

export interface PreparedPublicPage {
  pathname: string;
  Component: ComponentType;
}

type PublicPageModule = { default: ComponentType };
type PublicPageLoader = () => Promise<PublicPageModule>;

export const publicPageLoaders = {
  landing: () => import('./pages/public/LandingPage').then(({ LandingPage }) => ({ default: LandingPage })),
  howItWorks: () => import('./pages/public/HowItWorksPage').then(({ HowItWorksPage }) => ({ default: HowItWorksPage })),
  fuelCoverage: () => import('./pages/public/FuelCoveragePage').then(({ FuelCoveragePage }) => ({ default: FuelCoveragePage })),
  compliance: () => import('./pages/public/ComplianceInfoPage').then(({ ComplianceInfoPage }) => ({ default: ComplianceInfoPage })),
  producers: () => import('./pages/public/ProducerUseCasePage').then(({ ProducerUseCasePage }) => ({ default: ProducerUseCasePage })),
  buyers: () => import('./pages/public/BuyerUseCasePage').then(({ BuyerUseCasePage }) => ({ default: BuyerUseCasePage })),
  traders: () => import('./pages/public/TraderUseCasePage').then(({ TraderUseCasePage }) => ({ default: TraderUseCasePage })),
  financiers: () => import('./pages/public/FinancierUseCasePage').then(({ FinancierUseCasePage }) => ({ default: FinancierUseCasePage })),
  governance: () => import('./pages/public/GovernancePage').then(({ GovernancePage }) => ({ default: GovernancePage })),
  pilot: () => import('./pages/public/PilotPage').then(({ PilotPage }) => ({ default: PilotPage })),
  partners: () => import('./pages/public/PartnersPage').then(({ PartnersPage }) => ({ default: PartnersPage })),
  education: () => import('./pages/public/EducationPage').then(({ EducationPage }) => ({ default: EducationPage })),
  educationArticle: () => import('./pages/public/EducationArticlePage').then(({ EducationArticlePage }) => ({ default: EducationArticlePage })),
  roadmap: () => import('./pages/public/RoadmapPage').then(({ RoadmapPage }) => ({ default: RoadmapPage })),
  energyCalculator: () => import('./pages/public/EnergyCalculatorPage').then(({ EnergyCalculatorPage }) => ({ default: EnergyCalculatorPage })),
  producerMap: () => import('./pages/public/ProducerMapPage').then(({ ProducerMapPage }) => ({ default: ProducerMapPage })),
  privacy: () => import('./pages/public/PrivacyPage').then(({ PrivacyPage }) => ({ default: PrivacyPage })),
  terms: () => import('./pages/public/TermsPage').then(({ TermsPage }) => ({ default: TermsPage })),
} satisfies Record<string, PublicPageLoader>;

const routeLoaders: Record<string, PublicPageLoader> = {
  '': publicPageLoaders.landing,
  'how-it-works': publicPageLoaders.howItWorks,
  fuels: publicPageLoaders.fuelCoverage,
  compliance: publicPageLoaders.compliance,
  'for-producers': publicPageLoaders.producers,
  'for-buyers': publicPageLoaders.buyers,
  'for-traders': publicPageLoaders.traders,
  'for-financiers': publicPageLoaders.financiers,
  governance: publicPageLoaders.governance,
  pilot: publicPageLoaders.pilot,
  partners: publicPageLoaders.partners,
  education: publicPageLoaders.education,
  'education/:slug': publicPageLoaders.educationArticle,
  roadmap: publicPageLoaders.roadmap,
  'tools/energy-calculator': publicPageLoaders.energyCalculator,
  'map/producers': publicPageLoaders.producerMap,
  privacy: publicPageLoaders.privacy,
  terms: publicPageLoaders.terms,
};

export function getPublicPageLoader(pathname: string): PublicPageLoader | undefined {
  const routeKey = pathname
    .replace(/^\/(?:en|zh)\/?/, '')
    .replace(/\/$/, '');
  if (routeKey.startsWith('fuels/')) return routeLoaders.fuels;
  if (routeKey.startsWith('education/')) return routeLoaders['education/:slug'];
  return routeLoaders[routeKey];
}
