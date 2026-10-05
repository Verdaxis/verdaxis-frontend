import React from 'react';
import { renderToString } from 'react-dom/server';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Route, Routes, StaticRouter } from 'react-router-dom';

import { producerProjects } from '../data/producerProjects';
import i18n, { loadNamespace } from '../i18n';
import { PublicLayout } from '../components/public/PublicLayout';
import { BuyerUseCasePage } from '../pages/public/BuyerUseCasePage';
import { ComplianceInfoPage } from '../pages/public/ComplianceInfoPage';
import { EducationArticlePage } from '../pages/public/EducationArticlePage';
import { EducationPage } from '../pages/public/EducationPage';
import { EnergyCalculatorPage } from '../pages/public/EnergyCalculatorPage';
import { FinancierUseCasePage } from '../pages/public/FinancierUseCasePage';
import { FuelCoveragePage } from '../pages/public/FuelCoveragePage';
import { GovernancePage } from '../pages/public/GovernancePage';
import { HowItWorksPage } from '../pages/public/HowItWorksPage';
import { LandingPage } from '../pages/public/LandingPage';
import { PartnersPage } from '../pages/public/PartnersPage';
import { PilotPage } from '../pages/public/PilotPage';
import { PrivacyPage } from '../pages/public/PrivacyPage';
import { ProducerUseCasePage } from '../pages/public/ProducerUseCasePage';
import { RoadmapPage } from '../pages/public/RoadmapPage';
import { TermsPage } from '../pages/public/TermsPage';
import { TraderUseCasePage } from '../pages/public/TraderUseCasePage';

type PublicLanguage = 'en' | 'zh';

function StaticProducerMapPage() {
  const { t } = useTranslation('public');
  const totalCapacity = producerProjects.reduce((sum, project) => sum + project.capacityKtpa, 0);
  const countryCount = new Set(producerProjects.map((project) => project.country)).size;

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <section style={{ background: '#0F172A', color: '#fff', padding: '48px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>{t('producerMap.header.title')}</h1>
        <p style={{ color: '#94A3B8', fontSize: 16, lineHeight: 1.6, margin: '12px auto 0', maxWidth: 640 }}>
          {t('producerMap.header.subtitle')}
        </p>
        <p style={{ color: '#CBD5E1', fontSize: 14, marginTop: 20 }}>
          {producerProjects.length} {t('producerMap.header.projects', { count: producerProjects.length })}
          {' · '}{countryCount} {t('producerMap.header.countries')}
          {' · '}{totalCapacity.toLocaleString()} {t('producerMap.header.ktpaCapacity')}
        </p>
      </section>
      <section style={{ margin: '0 auto', maxWidth: 1100, padding: '48px 24px' }}>
        <h2 style={{ color: '#0F172A', fontSize: 26, margin: '0 0 8px' }}>{producerProjects.length} {t('producerMap.header.projects', { count: producerProjects.length })}</h2>
        <ul style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', listStyle: 'none', margin: 0, padding: 0 }}>
          {producerProjects.map((project) => (
            <li key={`${project.name}-${project.country}`} style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: '#0F172A', fontSize: 17, margin: '0 0 6px' }}>{project.name}</h3>
              <p style={{ color: '#475569', fontSize: 14, margin: '0 0 12px' }}>{project.company}</p>
              <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                {project.city ? `${project.city}, ` : ''}{project.country}<br />
                {t('producerMap.popup.capacity')}: {project.capacityKtpa.toLocaleString()} ktpa
                {' · '}{t('producerMap.popup.cod')}: {project.codYear}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PublicRouteTree() {
  return (
    <Routes>
      <Route path="/:lang" element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="fuels" element={<FuelCoveragePage />} />
        <Route path="fuels/:sector" element={<FuelCoveragePage />} />
        <Route path="compliance" element={<ComplianceInfoPage />} />
        <Route path="for-producers" element={<ProducerUseCasePage />} />
        <Route path="for-buyers" element={<BuyerUseCasePage />} />
        <Route path="for-traders" element={<TraderUseCasePage />} />
        <Route path="for-financiers" element={<FinancierUseCasePage />} />
        <Route path="governance" element={<GovernancePage />} />
        <Route path="pilot" element={<PilotPage />} />
        <Route path="partners" element={<PartnersPage />} />
        <Route path="education" element={<EducationPage />} />
        <Route path="education/:slug" element={<EducationArticlePage />} />
        <Route path="roadmap" element={<RoadmapPage />} />
        <Route path="tools/energy-calculator" element={<EnergyCalculatorPage />} />
        <Route path="map/producers" element={<StaticProducerMapPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
      </Route>
    </Routes>
  );
}

export async function renderPublicRoute(pathname: string): Promise<string> {
  const language: PublicLanguage = pathname.split('/')[1] === 'zh' ? 'zh' : 'en';
  await Promise.all([loadNamespace('public'), loadNamespace('education')]);
  await i18n.changeLanguage(language);

  return renderToString(
    <I18nextProvider i18n={i18n}>
      <StaticRouter location={pathname}>
        <PublicRouteTree />
      </StaticRouter>
    </I18nextProvider>,
  );
}
