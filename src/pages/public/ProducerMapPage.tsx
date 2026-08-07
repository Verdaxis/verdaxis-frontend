import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import type { Popup as LeafletPopup } from 'leaflet';
import { Search, ArrowRight, Calendar, Factory, Zap, MapPin, Clock, Mail } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import {
  producerProjects,
  fuelTypeColors,
  type FuelType,
  type ProjectStatus,
  type ProducerProject,
} from '../../data/producerProjects';
import { useNamespace } from '../../hooks/useNamespace';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ALL_FUEL_TYPES: FuelType[] = ['E-Methanol', 'Bio Methanol', 'Green Methanol'];
const ALL_STATUSES: (ProjectStatus | 'All')[] = ['All', 'Operational', 'Under Construction', 'Engineering', 'Pre-Feasibility'];

const fuelTypeKeys: Record<FuelType, string> = {
  'E-Methanol': 'producerMap.fuelTypes.eMethanol',
  'Bio Methanol': 'producerMap.fuelTypes.bioMethanol',
  'Green Methanol': 'producerMap.fuelTypes.greenMethanol',
};

const statusKeys: Record<ProjectStatus | 'All', string> = {
  All: 'producerMap.statuses.all',
  Operational: 'producerMap.statuses.operational',
  'Under Construction': 'producerMap.statuses.underConstruction',
  Engineering: 'producerMap.statuses.engineering',
  'Pre-Feasibility': 'producerMap.statuses.preFeasibility',
};

const pathwayKeys: Record<string, string> = {
  Biomass: 'producerMap.pathways.biomass',
  'Biomass + H2 (renewable)': 'producerMap.pathways.biomassRenewableHydrogen',
  Biomethane: 'producerMap.pathways.biomethane',
  'Biomethane + Natural gas': 'producerMap.pathways.biomethaneNaturalGas',
  'Black liquor': 'producerMap.pathways.blackLiquor',
  'CO2 + H2 (non-renewable)': 'producerMap.pathways.nonRenewableHydrogen',
  'CO2 + H2 (renewable)': 'producerMap.pathways.renewableHydrogen',
  'Natural gas': 'producerMap.pathways.naturalGas',
  'Residual waste': 'producerMap.pathways.residualWaste',
  'Residual waste + Biomass': 'producerMap.pathways.residualWasteBiomass',
  'Residual waste + H2 (low-carbon)': 'producerMap.pathways.residualWasteLowCarbonHydrogen',
};

const statusColors: Record<ProjectStatus, string> = {
  Operational: '#4CAF50',
  'Under Construction': '#FF9800',
  Engineering: '#2196F3',
  'Pre-Feasibility': '#9E9E9E',
};

const minCodYear = Math.min(...producerProjects.map((p) => p.codYear));
const maxCodYear = Math.max(...producerProjects.map((p) => p.codYear));

function getMarkerRadius(capacity: number): number {
  if (capacity > 500) return 10;
  if (capacity >= 50) return 7;
  return 5;
}

function formatCapacity(ktpa: number): string {
  return ktpa.toLocaleString();
}

function formatCapacityShort(ktpa: number): string {
  if (ktpa >= 1_000) return `${(ktpa / 1_000).toFixed(1)}K`;
  return ktpa.toLocaleString();
}

function setPopupCloseButtonLabel(popup: LeafletPopup | null, label: string) {
  const closeButton = popup
    ?.getElement()
    ?.querySelector<HTMLAnchorElement>('.leaflet-popup-close-button');

  if (!closeButton) return;
  closeButton.setAttribute('aria-label', label);
  closeButton.setAttribute('title', label);
}

/* ------------------------------------------------------------------ */
/*  Summary stats (static)                                             */
/* ------------------------------------------------------------------ */

const totalProjects = producerProjects.length;
const uniqueCountries = new Set(producerProjects.map((p) => p.country)).size;
const totalCapacityKtpa = producerProjects.reduce((sum, p) => sum + p.capacityKtpa, 0);
const totalCapacityFormatted = formatCapacityShort(totalCapacityKtpa);

const futureProjects = producerProjects.filter((p) => p.status !== 'Operational');
const futureCapacity = futureProjects.reduce((sum, p) => sum + p.capacityKtpa, 0);

type TabId = 'map' | 'futures';

/* ------------------------------------------------------------------ */
/*  FutureProjectCard                                                  */
/* ------------------------------------------------------------------ */

const FutureProjectCard: React.FC<{
  project: ProducerProject;
  labels: {
    imminent: string;
    capacity: string;
    expectedCod: string;
    location: string;
    pathway: string;
    expressInterest: string;
    fuelType: string;
    status: string;
    projectPathway: string;
    emailSubject: string;
    emailBody: string;
  };
}> = ({ project, labels }) => {
  const fuelColor = fuelTypeColors[project.fuelType];
  const statusColor = statusColors[project.status];
  const isImminent = project.codYear <= new Date().getFullYear() + 1;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1px solid ${isImminent ? '#FFE082' : '#E2E8F0'}`,
        borderRadius: 12,
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {isImminent && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            background: '#FF9800',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '0 12px 0 8px',
            letterSpacing: '0.05em',
          }}
        >
          {labels.imminent}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: 6,
            background: `${fuelColor}12`,
            border: `1px solid ${fuelColor}30`,
            fontSize: 12,
            fontWeight: 600,
            color: fuelColor,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: fuelColor }} />
          {labels.fuelType}
        </span>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 6,
            background: `${statusColor}15`,
            border: `1px solid ${statusColor}30`,
            fontSize: 12,
            fontWeight: 600,
            color: statusColor,
          }}
        >
          {labels.status}
        </span>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 4, lineHeight: 1.3 }}>
        {project.name}
      </h3>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
        {project.company}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Factory size={12} color="#5DADE2" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{labels.capacity}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
            {formatCapacity(project.capacityKtpa)} <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>ktpa</span>
          </div>
        </div>
        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Calendar size={12} color="#FF9800" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{labels.expectedCod}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Q1 {project.codYear}</div>
        </div>
        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <MapPin size={12} color="#4CAF50" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{labels.location}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
            {project.city ? `${project.city}, ${project.country}` : project.country}
          </div>
        </div>
        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Zap size={12} color="#9C27B0" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{labels.pathway}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', lineHeight: 1.3 }}>
            {labels.projectPathway.length > 30 ? labels.projectPathway.slice(0, 30) + '...' : labels.projectPathway}
          </div>
        </div>
      </div>

      <a
        href={`mailto:info@verdaxis.exchange?subject=${encodeURIComponent(labels.emailSubject)}&body=${encodeURIComponent(labels.emailBody)}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          width: '100%',
          padding: '10px 16px',
          background: '#0F172A',
          color: '#fff',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'background 0.2s',
          border: 'none',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#1E293B'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#0F172A'; }}
      >
        <Mail size={14} />
        {labels.expressInterest}
      </a>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Project Marker Sub-component                                       */
/* ------------------------------------------------------------------ */

const ProjectMarker: React.FC<{
  project: ProducerProject;
  popupLabels: { capacity: string; cod: string; city: string; country: string; close: string };
  displayLabels: { fuelType: string; status: string; pathway: string };
}> = ({ project, popupLabels, displayLabels }) => {
  const color = fuelTypeColors[project.fuelType];
  const radius = getMarkerRadius(project.capacityKtpa);
  const popupRef = useRef<LeafletPopup>(null);
  const updateCloseButtonLabel = useCallback(
    (popup: LeafletPopup | null) => setPopupCloseButtonLabel(popup, popupLabels.close),
    [popupLabels.close],
  );

  useEffect(() => {
    updateCloseButtonLabel(popupRef.current);
  }, [updateCloseButtonLabel]);

  return (
    <CircleMarker
      center={[project.lat, project.lng]}
      radius={radius}
      pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
    >
      <Popup
        ref={popupRef}
        eventHandlers={{
          add: (event) => updateCloseButtonLabel(event.target as LeafletPopup),
        }}
      >
        <div style={{ minWidth: 220, fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{project.name}</div>
          <div style={{ color: '#64748B', marginBottom: 6 }}>{project.company}</div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6 }} />
            {displayLabels.fuelType} &mdash; {displayLabels.pathway}
          </div>
          <div style={{ marginBottom: 6 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                background: statusColors[project.status] + '22',
                color: statusColors[project.status],
                border: `1px solid ${statusColors[project.status]}44`,
              }}
            >
              {displayLabels.status}
            </span>
          </div>
          <div><strong>{popupLabels.capacity}:</strong> {formatCapacity(project.capacityKtpa)} ktpa</div>
          <div><strong>{popupLabels.cod}:</strong> {project.codYear}</div>
          {project.city && <div><strong>{popupLabels.city}:</strong> {project.city}</div>}
          <div><strong>{popupLabels.country}:</strong> {project.country}</div>
        </div>
      </Popup>
    </CircleMarker>
  );
};

/* ================================================================== */
/*  ProducerMapPage                                                    */
/* ================================================================== */

export const ProducerMapPage: React.FC = () => {
  const { t, ready } = useNamespace('public');
  const { i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [search, setSearch] = useState('');
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<Set<FuelType>>(new Set(ALL_FUEL_TYPES));
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | 'All'>('All');
  const [codMin, setCodMin] = useState(minCodYear);
  const [codMax, setCodMax] = useState(maxCodYear);
  const [futuresSearch, setFuturesSearch] = useState('');
  const [futuresFuelFilter, setFuturesFuelFilter] = useState<FuelType | 'All'>('All');
  const [futuresSortBy, setFuturesSortBy] = useState<'codYear' | 'capacity'>('codYear');
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;

  const filteredProjects = useMemo(() => {
    const q = search.toLowerCase();
    return producerProjects.filter((p) => {
      if (!selectedFuelTypes.has(p.fuelType)) return false;
      if (selectedStatus !== 'All' && p.status !== selectedStatus) return false;
      if (p.codYear < codMin || p.codYear > codMax) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.company.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, selectedFuelTypes, selectedStatus, codMin, codMax]);

  const filteredFutures = useMemo(() => {
    const q = futuresSearch.toLowerCase();
    return futureProjects
      .filter((p) => {
        if (futuresFuelFilter !== 'All' && p.fuelType !== futuresFuelFilter) return false;
        if (q && !p.name.toLowerCase().includes(q) && !p.company.toLowerCase().includes(q) && !p.country.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (futuresSortBy === 'codYear') return a.codYear - b.codYear;
        return b.capacityKtpa - a.capacityKtpa;
      });
  }, [futuresSearch, futuresFuelFilter, futuresSortBy]);

  const futuresByYear = useMemo(() => {
    const grouped: Record<number, ProducerProject[]> = {};
    filteredFutures.forEach((p) => {
      if (!grouped[p.codYear]) grouped[p.codYear] = [];
      grouped[p.codYear].push(p);
    });
    return Object.entries(grouped)
      .map(([year, projects]) => ({ year: Number(year), projects }))
      .sort((a, b) => a.year - b.year);
  }, [filteredFutures]);

  const toggleFuelType = (ft: FuelType) => {
    setSelectedFuelTypes((prev) => {
      const next = new Set(prev);
      if (next.has(ft)) { next.delete(ft); } else { next.add(ft); }
      return next;
    });
  };

  if (!ready) return null;

  const cardLabels = {
    imminent: t('producerMap.futures.imminent'),
    capacity: t('producerMap.futures.capacity'),
    expectedCod: t('producerMap.futures.expectedCod'),
    location: t('producerMap.futures.location'),
    pathway: t('producerMap.futures.pathway'),
    expressInterest: t('producerMap.futures.expressInterest'),
  };

  const popupLabels = {
    capacity: t('producerMap.popup.capacity'),
    cod: t('producerMap.popup.cod'),
    city: t('producerMap.popup.city'),
    country: t('producerMap.popup.country'),
    close: t('producerMap.controls.closePopup'),
  };

  const translatedProjectLabels = (project: ProducerProject) => ({
    fuelType: fuelTypeKeys[project.fuelType] ? t(fuelTypeKeys[project.fuelType]) : project.fuelType,
    status: t(statusKeys[project.status]),
    pathway: pathwayKeys[project.pathway] ? t(pathwayKeys[project.pathway]) : project.pathway,
  });

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {/* ---- Header Bar ---- */}
      <section
        style={{
          background: '#0F172A',
          color: '#fff',
          padding: '48px 24px 0',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>{t('producerMap.header.title')}</h1>
        <p style={{ fontSize: 16, color: '#94A3B8', marginTop: 12, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
          {t('producerMap.header.subtitle')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: '#CBD5E1' }}>
            <strong style={{ color: '#5DADE2', fontSize: 18 }}>{totalProjects}</strong> {t('producerMap.header.projects', { count: totalProjects })}
          </span>
          <span style={{ fontSize: 14, color: '#CBD5E1' }}>
            <strong style={{ color: '#5DADE2', fontSize: 18 }}>{uniqueCountries}</strong> {t('producerMap.header.countries')}
          </span>
          <span style={{ fontSize: 14, color: '#CBD5E1' }}>
            <strong style={{ color: '#5DADE2', fontSize: 18 }}>{totalCapacityFormatted}</strong> {t('producerMap.header.ktpaCapacity')}
          </span>
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 28 }}>
          {([
            { id: 'map' as TabId, label: t('producerMap.tabs.projectMap'), icon: <MapPin size={15} /> },
            { id: 'futures' as TabId, label: t('producerMap.tabs.futureProduction'), icon: <Calendar size={15} /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? '#fff' : '#94A3B8',
                background: activeTab === tab.id ? 'rgba(93,173,226,0.15)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #5DADE2' : '2px solid transparent',
                cursor: 'pointer',
                borderRadius: '8px 8px 0 0',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'futures' && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: '#FF9800',
                    color: '#fff',
                    padding: '1px 6px',
                    borderRadius: 8,
                    marginLeft: 4,
                  }}
                >
                  {futureProjects.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ---- Tab Content ---- */}
      {activeTab === 'map' ? (
        <>
          {/* ---- Map + Sidebar ---- */}
          <section style={{ display: 'flex', minHeight: 600 }}>
            {/* Sidebar */}
            <aside
              style={{
                width: 300,
                minWidth: 300,
                borderRight: '1px solid #E2E8F0',
                padding: 20,
                background: '#F8FAFC',
                overflowY: 'auto',
                maxHeight: 600,
              }}
            >
              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder={t('producerMap.sidebar.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Fuel Type Checkboxes */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('producerMap.sidebar.fuelType')}
                </h4>
                {ALL_FUEL_TYPES.map((ft) => (
                  <label key={ft} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: 14, color: '#334155' }}>
                    <input type="checkbox" checked={selectedFuelTypes.has(ft)} onChange={() => toggleFuelType(ft)} style={{ accentColor: fuelTypeColors[ft] }} />
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: fuelTypeColors[ft] }} />
                    {t(fuelTypeKeys[ft])}
                  </label>
                ))}
              </div>

              {/* Status Filter */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('producerMap.sidebar.status')}
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedStatus(s)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 16,
                        border: selectedStatus === s ? '2px solid #5DADE2' : '1px solid #CBD5E1',
                        background: selectedStatus === s ? '#EBF5FB' : '#fff',
                        color: selectedStatus === s ? '#0F172A' : '#64748B',
                        fontSize: 13,
                        fontWeight: selectedStatus === s ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {t(statusKeys[s])}
                    </button>
                  ))}
                </div>
              </div>

              {/* COD Year Range */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('producerMap.sidebar.codYearRange')}
                </h4>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number" min={minCodYear} max={maxCodYear} value={codMin}
                    onChange={(e) => setCodMin(Number(e.target.value))}
                    style={{ width: 72, padding: '6px 8px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 13, textAlign: 'center' }}
                  />
                  <span style={{ color: '#94A3B8', fontSize: 13 }}>{t('producerMap.sidebar.to')}</span>
                  <input
                    type="number" min={minCodYear} max={maxCodYear} value={codMax}
                    onChange={(e) => setCodMax(Number(e.target.value))}
                    style={{ width: 72, padding: '6px 8px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 13, textAlign: 'center' }}
                  />
                </div>
              </div>

              {/* Project Count */}
              <div
                style={{
                  padding: '10px 14px',
                  background: '#EBF5FB',
                  borderRadius: 8,
                  fontSize: 14,
                  color: '#0F172A',
                  fontWeight: 500,
                  marginBottom: 20,
                }}
              >
                {t('producerMap.sidebar.showingProjects', { shown: filteredProjects.length, count: producerProjects.length })}
              </div>

              {/* Legend */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('producerMap.sidebar.legend')}
                </h4>
                {ALL_FUEL_TYPES.map((ft) => (
                  <div key={ft} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 13, color: '#475569' }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: fuelTypeColors[ft] }} />
                    {t(fuelTypeKeys[ft])}
                  </div>
                ))}
                <div style={{ marginTop: 10, fontSize: 12, color: '#94A3B8' }}>
                  {t('producerMap.sidebar.markerSizeNote')}
                </div>
              </div>
            </aside>

            {/* Map */}
            <div style={{ flex: 1, minHeight: 600 }}>
              <MapContainer
                center={[20, 0]}
                zoom={2}
                zoomControl={false}
                style={{ height: '100%', width: '100%', minHeight: 600 }}
                scrollWheelZoom={true}
              >
                <ZoomControl
                  key={currentLanguage}
                  zoomInTitle={t('producerMap.controls.zoomIn')}
                  zoomOutTitle={t('producerMap.controls.zoomOut')}
                />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filteredProjects.map((project) => (
                  <ProjectMarker
                    key={project.id}
                    project={project}
                    popupLabels={popupLabels}
                    displayLabels={translatedProjectLabels(project)}
                  />
                ))}
              </MapContainer>
            </div>
          </section>
        </>
      ) : (
        /* ---- Future Production Marketplace ---- */
        <section style={{ background: '#F8FAFC', minHeight: 600 }}>
          {/* Futures Header */}
          <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '24px 32px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={20} color="#FF9800" />
                    {t('producerMap.futures.title')}
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748B', marginTop: 6 }}>
                    {t('producerMap.futures.subtitle')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ padding: '6px 14px', background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#E65100' }}>
                    {futureProjects.length} {t('producerMap.futures.upcomingProjects', { count: futureProjects.length })}
                  </div>
                  <div style={{ padding: '6px 14px', background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#2E7D32' }}>
                    {formatCapacityShort(futureCapacity)} {t('producerMap.futures.ktpaPipeline')}
                  </div>
                </div>
              </div>

              {/* Filters row */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder={t('producerMap.futures.searchPlaceholder')}
                    value={futuresSearch}
                    onChange={(e) => setFuturesSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <select
                  value={futuresFuelFilter}
                  onChange={(e) => setFuturesFuelFilter(e.target.value as FuelType | 'All')}
                  style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 13, color: '#334155', background: '#fff', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="All">{t('producerMap.futures.allFuelTypes')}</option>
                  {ALL_FUEL_TYPES.map((ft) => (
                    <option key={ft} value={ft}>{t(fuelTypeKeys[ft])}</option>
                  ))}
                </select>

                <select
                  value={futuresSortBy}
                  onChange={(e) => setFuturesSortBy(e.target.value as 'codYear' | 'capacity')}
                  style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 13, color: '#334155', background: '#fff', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="codYear">{t('producerMap.futures.sortByTimeline')}</option>
                  <option value="capacity">{t('producerMap.futures.sortByCapacity')}</option>
                </select>

                <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginLeft: 'auto' }}>
                  {t('producerMap.futures.showingProjects', { shown: filteredFutures.length, count: futureProjects.length })}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline View */}
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px 64px' }}>
            {futuresByYear.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 24px', color: '#94A3B8' }}>
                <Calendar size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
                <p style={{ fontSize: 16, fontWeight: 600 }}>{t('producerMap.futures.noResults')}</p>
                <p style={{ fontSize: 14 }}>{t('producerMap.futures.tryAdjusting')}</p>
              </div>
            ) : (
              futuresByYear.map(({ year, projects }) => (
                <div key={year} style={{ marginBottom: 40 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 18px',
                        background: year <= new Date().getFullYear() + 1 ? '#0F172A' : '#334155',
                        color: '#fff',
                        borderRadius: 8,
                        fontSize: 18,
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      <Clock size={16} />
                      {year <= new Date().getFullYear() ? `${year} (${t('producerMap.futures.imminent')})` : year}
                    </div>
                    <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                    <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
                      {projects.length} {t('producerMap.header.projects', { count: projects.length })} &middot;{' '}
                      {formatCapacityShort(projects.reduce((s, p) => s + p.capacityKtpa, 0))} ktpa
                    </span>
                  </div>

                  <div
                    className="futures-card-grid"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}
                  >
                    {projects.map((project) => {
                      const displayLabels = translatedProjectLabels(project);
                      return (
                        <FutureProjectCard
                          key={project.id}
                          project={project}
                          labels={{
                            ...cardLabels,
                            fuelType: displayLabels.fuelType,
                            status: displayLabels.status,
                            projectPathway: displayLabels.pathway,
                            emailSubject: t('producerMap.email.subject', { project: project.name }),
                            emailBody: t('producerMap.email.body', {
                              project: project.name,
                              fuelType: displayLabels.fuelType,
                              capacity: formatCapacity(project.capacityKtpa),
                              year: project.codYear,
                            }),
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* ---- CTA ---- */}
      <section
        style={{
          textAlign: 'center',
          padding: '64px 24px',
          background: activeTab === 'futures' ? '#FFFFFF' : '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
          {activeTab === 'futures' ? t('producerMap.cta.titleFutures') : t('producerMap.cta.titleMap')}
        </h2>
        <p style={{ fontSize: 16, color: '#64748B', marginBottom: 24, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          {activeTab === 'futures' ? t('producerMap.cta.subtitleFutures') : t('producerMap.cta.subtitleMap')}
        </p>
        <Link
          to="/pilot"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '14px 32px',
            background: '#5DADE2',
            color: '#fff',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          {activeTab === 'futures' ? t('producerMap.cta.buttonFutures') : t('producerMap.cta.buttonMap')}
          <ArrowRight size={18} />
        </Link>
      </section>

      {/* Responsive */}
      <style>{`
        @media (max-width: 768px) {
          .futures-card-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
