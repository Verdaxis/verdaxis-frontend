import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Search, ArrowRight } from 'lucide-react';
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const ProducerMapPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<Set<FuelType>>(new Set(ALL_FUEL_TYPES));
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | 'All'>('All');
  const [codMin, setCodMin] = useState(minCodYear);
  const [codMax, setCodMax] = useState(maxCodYear);

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
          padding: '48px 24px 32px',
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
      </section>

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

      {/* ---- CTA ---- */}
      <section
        style={{
          textAlign: 'center',
          padding: '64px 24px',
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
          Want to list your project on the map?
        </h2>
        <p style={{ fontSize: 16, color: '#64748B', marginBottom: 24, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          Join our pilot programme to showcase your low-carbon fuel production facility to buyers,
          traders, and financiers worldwide.
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
          Apply for Pilot
          <ArrowRight size={18} />
        </Link>
      </section>
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
