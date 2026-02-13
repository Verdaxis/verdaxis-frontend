import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Search, ArrowRight, Calendar, Factory, Zap, MapPin, Clock, Mail } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import {
  producerProjects,
  fuelTypeColors,
  type FuelType,
  type ProjectStatus,
  type ProducerProject,
} from '../../data/producerProjects';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ALL_FUEL_TYPES: FuelType[] = ['Methanol', 'Ethanol', 'SAF', 'Ammonia', 'Biofuel', 'Biomethane'];
const ALL_STATUSES: (ProjectStatus | 'All')[] = ['All', 'Operational', 'Under Construction', 'Planned'];

const statusColors: Record<ProjectStatus, string> = {
  Operational: '#4CAF50',
  'Under Construction': '#FF9800',
  Planned: '#9E9E9E',
};

const minCodYear = Math.min(...producerProjects.map((p) => p.codYear));
const maxCodYear = Math.max(...producerProjects.map((p) => p.codYear));

function getMarkerRadius(capacity: number): number {
  if (capacity > 500000) return 10;
  if (capacity >= 50000) return 7;
  return 5;
}

function formatCapacity(mtpa: number): string {
  return mtpa.toLocaleString();
}

function formatCapacityShort(mtpa: number): string {
  if (mtpa >= 1_000_000) return `${(mtpa / 1_000_000).toFixed(1)}M`;
  if (mtpa >= 1_000) return `${(mtpa / 1_000).toFixed(0)}K`;
  return mtpa.toLocaleString();
}

/* ------------------------------------------------------------------ */
/*  Summary stats (static)                                             */
/* ------------------------------------------------------------------ */

const totalProjects = producerProjects.length;
const uniqueCountries = new Set(producerProjects.map((p) => p.country)).size;
const totalCapacityMtpa = producerProjects.reduce((sum, p) => sum + p.capacityMtpa, 0);
const totalCapacityFormatted =
  totalCapacityMtpa >= 1_000_000
    ? `${(totalCapacityMtpa / 1_000_000).toFixed(1)}M`
    : `${(totalCapacityMtpa / 1000).toFixed(0)}K`;

// Future production stats
const futureProjects = producerProjects.filter(
  (p) => p.status === 'Under Construction' || p.status === 'Planned'
);
const futureCapacity = futureProjects.reduce((sum, p) => sum + p.capacityMtpa, 0);

type TabId = 'map' | 'futures';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const ProducerMapPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [search, setSearch] = useState('');
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<Set<FuelType>>(new Set(ALL_FUEL_TYPES));
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | 'All'>('All');
  const [codMin, setCodMin] = useState(minCodYear);
  const [codMax, setCodMax] = useState(maxCodYear);
  const [futuresSearch, setFuturesSearch] = useState('');
  const [futuresFuelFilter, setFuturesFuelFilter] = useState<FuelType | 'All'>('All');
  const [futuresSortBy, setFuturesSortBy] = useState<'codYear' | 'capacity'>('codYear');

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
        return b.capacityMtpa - a.capacityMtpa;
      });
  }, [futuresSearch, futuresFuelFilter, futuresSortBy]);

  // Group futures by COD year for timeline display
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
      if (next.has(ft)) {
        next.delete(ft);
      } else {
        next.add(ft);
      }
      return next;
    });
  };

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
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>Producer & Project Map</h1>
        <p style={{ fontSize: 16, color: '#94A3B8', marginTop: 12, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
          Explore low-carbon fuel production facilities worldwide. Filter by fuel type, project status,
          and timeline.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 32,
            marginTop: 20,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 14, color: '#CBD5E1' }}>
            <strong style={{ color: '#5DADE2', fontSize: 18 }}>{totalProjects}</strong> projects
          </span>
          <span style={{ fontSize: 14, color: '#CBD5E1' }}>
            <strong style={{ color: '#5DADE2', fontSize: 18 }}>{uniqueCountries}</strong> countries
          </span>
          <span style={{ fontSize: 14, color: '#CBD5E1' }}>
            <strong style={{ color: '#5DADE2', fontSize: 18 }}>{totalCapacityFormatted}</strong> mtpa total
            capacity
          </span>
        </div>

        {/* Tab Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 4,
            marginTop: 28,
          }}
        >
          {([
            { id: 'map' as TabId, label: 'Project Map', icon: <MapPin size={15} /> },
            { id: 'futures' as TabId, label: 'Future Production', icon: <Calendar size={15} /> },
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
                <Search
                  size={16}
                  style={{ position: 'absolute', left: 10, top: 10, color: '#94A3B8' }}
                />
                <input
                  type="text"
                  placeholder="Search by name or company"
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
                  Fuel Type
                </h4>
                {ALL_FUEL_TYPES.map((ft) => (
                  <label
                    key={ft}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                      color: '#334155',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFuelTypes.has(ft)}
                      onChange={() => toggleFuelType(ft)}
                      style={{ accentColor: fuelTypeColors[ft] }}
                    />
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: fuelTypeColors[ft],
                      }}
                    />
                    {ft}
                  </label>
                ))}
              </div>

              {/* Status Filter */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
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
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* COD Year Range */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  COD Year Range
                </h4>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    min={minCodYear}
                    max={maxCodYear}
                    value={codMin}
                    onChange={(e) => setCodMin(Number(e.target.value))}
                    style={{
                      width: 72,
                      padding: '6px 8px',
                      border: '1px solid #CBD5E1',
                      borderRadius: 4,
                      fontSize: 13,
                      textAlign: 'center',
                    }}
                  />
                  <span style={{ color: '#94A3B8', fontSize: 13 }}>to</span>
                  <input
                    type="number"
                    min={minCodYear}
                    max={maxCodYear}
                    value={codMax}
                    onChange={(e) => setCodMax(Number(e.target.value))}
                    style={{
                      width: 72,
                      padding: '6px 8px',
                      border: '1px solid #CBD5E1',
                      borderRadius: 4,
                      fontSize: 13,
                      textAlign: 'center',
                    }}
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
                Showing {filteredProjects.length} of {producerProjects.length} projects
              </div>

              {/* Legend */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Legend
                </h4>
                {ALL_FUEL_TYPES.map((ft) => (
                  <div key={ft} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 13, color: '#475569' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: fuelTypeColors[ft],
                      }}
                    />
                    {ft}
                  </div>
                ))}
                <div style={{ marginTop: 10, fontSize: 12, color: '#94A3B8' }}>
                  Marker size indicates capacity (small &lt;50K, medium 50K-500K, large &gt;500K mt/year)
                </div>
              </div>
            </aside>

            {/* Map */}
            <div style={{ flex: 1, minHeight: 600 }}>
              <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: '100%', width: '100%', minHeight: 600 }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filteredProjects.map((project) => (
                  <ProjectMarker key={project.id} project={project} />
                ))}
              </MapContainer>
            </div>
          </section>
        </>
      ) : (
        /* ---- Future Production Marketplace ---- */
        <section style={{ background: '#F8FAFC', minHeight: 600 }}>
          {/* Futures Header */}
          <div
            style={{
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              padding: '24px 32px',
            }}
          >
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={20} color="#FF9800" />
                    Future Production Marketplace
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748B', marginTop: 6 }}>
                    Upcoming production capacity available for off-take agreements. Contact producers directly to secure future supply.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Summary chips */}
                  <div style={{ padding: '6px 14px', background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#E65100' }}>
                    {futureProjects.length} upcoming projects
                  </div>
                  <div style={{ padding: '6px 14px', background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#2E7D32' }}>
                    {formatCapacityShort(futureCapacity)} mtpa pipeline
                  </div>
                </div>
              </div>

              {/* Filters row */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Search projects, companies, countries..."
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

                {/* Fuel filter */}
                <select
                  value={futuresFuelFilter}
                  onChange={(e) => setFuturesFuelFilter(e.target.value as FuelType | 'All')}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    fontSize: 13,
                    color: '#334155',
                    background: '#fff',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="All">All Fuel Types</option>
                  {ALL_FUEL_TYPES.map((ft) => (
                    <option key={ft} value={ft}>{ft}</option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  value={futuresSortBy}
                  onChange={(e) => setFuturesSortBy(e.target.value as 'codYear' | 'capacity')}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    fontSize: 13,
                    color: '#334155',
                    background: '#fff',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="codYear">Sort by Timeline</option>
                  <option value="capacity">Sort by Capacity</option>
                </select>

                <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginLeft: 'auto' }}>
                  Showing {filteredFutures.length} of {futureProjects.length} future projects
                </div>
              </div>
            </div>
          </div>

          {/* Timeline View */}
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px 64px' }}>
            {futuresByYear.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 24px', color: '#94A3B8' }}>
                <Calendar size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
                <p style={{ fontSize: 16, fontWeight: 600 }}>No future projects match your filters</p>
                <p style={{ fontSize: 14 }}>Try adjusting your search or fuel type filter</p>
              </div>
            ) : (
              futuresByYear.map(({ year, projects }) => (
                <div key={year} style={{ marginBottom: 40 }}>
                  {/* Year header */}
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
                      {year <= new Date().getFullYear() ? `${year} (Imminent)` : year}
                    </div>
                    <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                    <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
                      {projects.length} project{projects.length > 1 ? 's' : ''} &middot;{' '}
                      {formatCapacityShort(projects.reduce((s, p) => s + p.capacityMtpa, 0))} mtpa
                    </span>
                  </div>

                  {/* Project cards */}
                  <div
                    className="futures-card-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                      gap: 16,
                    }}
                  >
                    {projects.map((project) => (
                      <FutureProjectCard key={project.id} project={project} />
                    ))}
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
          {activeTab === 'futures'
            ? 'Have future production to offer?'
            : 'Want to list your project on the map?'}
        </h2>
        <p style={{ fontSize: 16, color: '#64748B', marginBottom: 24, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          {activeTab === 'futures'
            ? 'List your upcoming production capacity on the Verdaxis marketplace to connect with buyers and secure off-take agreements before COD.'
            : 'Join our pilot programme to showcase your low-carbon fuel production facility to buyers, traders, and financiers worldwide.'}
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
          {activeTab === 'futures' ? 'List Your Production' : 'Apply for Pilot'}
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

/* ------------------------------------------------------------------ */
/*  Future Project Card                                                */
/* ------------------------------------------------------------------ */

const FutureProjectCard: React.FC<{ project: ProducerProject }> = ({ project }) => {
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
      {/* Imminent badge */}
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
          IMMINENT
        </div>
      )}

      {/* Top row: fuel type + status */}
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
          {project.fuelType}
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
          {project.status}
        </span>
      </div>

      {/* Project name & company */}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 4, lineHeight: 1.3 }}>
        {project.name}
      </h3>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
        {project.company}
      </p>

      {/* Key metrics grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Factory size={12} color="#5DADE2" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Capacity</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
            {formatCapacity(project.capacityMtpa)} <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>mt/yr</span>
          </div>
        </div>
        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Calendar size={12} color="#FF9800" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected COD</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
            Q1 {project.codYear}
          </div>
        </div>
        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <MapPin size={12} color="#4CAF50" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
            {project.country}
          </div>
        </div>
        <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Zap size={12} color="#9C27B0" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pathway</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', lineHeight: 1.3 }}>
            {project.pathway.length > 30 ? project.pathway.slice(0, 30) + '...' : project.pathway}
          </div>
        </div>
      </div>

      {/* CI and certifications */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {project.ci !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#E8F5E9', color: '#2E7D32', border: '1px solid #C8E6C9' }}>
            CI: {project.ci.toFixed(1)} gCO{'\u2082'}e/MJ
          </span>
        )}
        {project.certifications?.map((cert) => (
          <span key={cert} style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: '#EBF5FB', color: '#1E88E5' }}>
            {cert}
          </span>
        ))}
        {project.offtakeCommitted && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#FFF3E0', color: '#E65100', border: '1px solid #FFE0B2' }}>
            Offtake Committed
          </span>
        )}
      </div>

      {/* Express Interest CTA */}
      <a
        href={`mailto:info@verdaxis.exchange?subject=Off-take Interest: ${encodeURIComponent(project.name)}&body=${encodeURIComponent(`I am interested in discussing off-take arrangements for the ${project.name} project (${project.fuelType}, ${formatCapacity(project.capacityMtpa)} mt/yr, COD ${project.codYear}).`)}`}
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
        Express Interest
      </a>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Project Marker Sub-component                                       */
/* ------------------------------------------------------------------ */

const ProjectMarker: React.FC<{ project: ProducerProject }> = ({ project }) => {
  const color = fuelTypeColors[project.fuelType];
  const radius = getMarkerRadius(project.capacityMtpa);

  return (
    <CircleMarker
      center={[project.lat, project.lng]}
      radius={radius}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.7,
        weight: 2,
      }}
    >
      <Popup>
        <div style={{ minWidth: 220, fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{project.name}</div>
          <div style={{ color: '#64748B', marginBottom: 6 }}>{project.company}</div>

          <div style={{ marginBottom: 4 }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                marginRight: 6,
              }}
            />
            {project.fuelType} &mdash; {project.pathway}
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
              {project.status}
            </span>
          </div>

          <div><strong>Capacity:</strong> {formatCapacity(project.capacityMtpa)} mt/year</div>
          <div><strong>COD:</strong> {project.codYear}</div>
          <div><strong>Country:</strong> {project.country}</div>

          {project.ci !== undefined && (
            <div><strong>CI:</strong> {project.ci.toFixed(1)} gCO&#x2082;e/MJ</div>
          )}

          {project.certifications && project.certifications.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {project.certifications.map((cert) => (
                <span
                  key={cert}
                  style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    background: '#EBF5FB',
                    color: '#1E88E5',
                    borderRadius: 4,
                    fontSize: 11,
                    marginRight: 4,
                    fontWeight: 500,
                  }}
                >
                  {cert}
                </span>
              ))}
            </div>
          )}

          {project.offtakeCommitted && (
            <div style={{ marginTop: 4 }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  background: '#E8F5E9',
                  color: '#2E7D32',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                Offtake Committed
              </span>
            </div>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
};
