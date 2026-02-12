import React, { useEffect, useRef } from 'react';

interface Dot {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  isPort: boolean;
  isAccent: boolean;
  pulseOffset: number;
}

const BLUE = [93, 173, 226] as const;   // #5DADE2
const GREEN = [76, 175, 80] as const;   // #4CAF50
const DOT_RADIUS = 1.5;
const PORT_RADIUS = 2.8;
const LINE_DISTANCE = 80;
const MOUSE_RADIUS = 180;
const MOUSE_STRENGTH = 24;
const WAVE_AMPLITUDE = 5;
const WAVE_SPEED = 0.0005;
const WAVE_FREQ_X = 0.014;
const WAVE_FREQ_Y = 0.018;

/* ─── Major ports as normalised (0-1) coordinates ─── */
/* Rough equirectangular: x = (lon+180)/360, y = (80-lat)/140 */
const PORTS: [number, number][] = [
  [0.51, 0.20],  // Rotterdam
  [0.51, 0.21],  // Antwerp
  [0.49, 0.31],  // Algeciras
  [0.59, 0.36],  // Suez / Port Said
  [0.61, 0.42],  // Jeddah
  [0.66, 0.39],  // Fujairah
  [0.70, 0.44],  // Mumbai
  [0.72, 0.52],  // Colombo
  [0.79, 0.56],  // Singapore
  [0.82, 0.41],  // Hong Kong
  [0.84, 0.35],  // Shanghai
  [0.86, 0.32],  // Busan
  [0.89, 0.32],  // Yokohama
  [0.92, 0.81],  // Sydney
  [0.51, 0.53],  // Lagos
  [0.55, 0.81],  // Cape Town
  [0.59, 0.79],  // Durban
  [0.24, 0.36],  // Houston
  [0.28, 0.51],  // Panama
  [0.17, 0.33],  // Los Angeles
  [0.37, 0.74],  // Santos
];

/* ─── Shipping routes (pairs of port indices) ─── */
const ROUTES: [number, number][] = [
  // Europe → Asia (Suez route)
  [0, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12],
  // Europe → West Africa
  [2, 14],
  // Africa cape route
  [14, 15], [15, 16], [16, 7],
  // Transatlantic
  [0, 17], [17, 18],
  // Americas
  [18, 19], [17, 20], [18, 20],
  // SE Asia → Oceania
  [8, 13],
  // Suez → Jeddah direct
  [3, 5],
  // Antwerp ↔ Rotterdam
  [0, 1],
  // Santos → Cape Town
  [20, 15],
];

/* ─── Simplified continent coastlines (normalised 0-1, same projection as ports) ─── */
const CONTINENTS: [number, number][][] = [
  // North America
  [
    [0.03, 0.11], [0.06, 0.07], [0.11, 0.09], [0.14, 0.07], [0.19, 0.09],
    [0.22, 0.07], [0.27, 0.10], [0.31, 0.13], [0.33, 0.18], [0.31, 0.22],
    [0.29, 0.26], [0.28, 0.30], [0.28, 0.37], [0.27, 0.41], [0.25, 0.44],
    [0.22, 0.46], [0.21, 0.43], [0.19, 0.39], [0.17, 0.35], [0.16, 0.30],
    [0.15, 0.26], [0.14, 0.22], [0.12, 0.19], [0.09, 0.16], [0.05, 0.14],
  ],
  // South America
  [
    [0.28, 0.49], [0.30, 0.50], [0.33, 0.51], [0.36, 0.53], [0.39, 0.56],
    [0.40, 0.60], [0.40, 0.65], [0.39, 0.70], [0.37, 0.74], [0.35, 0.78],
    [0.33, 0.82], [0.31, 0.86], [0.30, 0.90], [0.29, 0.86], [0.28, 0.80],
    [0.27, 0.74], [0.27, 0.68], [0.26, 0.62], [0.26, 0.57], [0.27, 0.52],
  ],
  // Europe
  [
    [0.47, 0.31], [0.48, 0.28], [0.47, 0.24], [0.48, 0.20], [0.49, 0.16],
    [0.50, 0.13], [0.51, 0.10], [0.52, 0.13], [0.53, 0.16], [0.54, 0.14],
    [0.55, 0.17], [0.54, 0.21], [0.53, 0.24], [0.52, 0.27], [0.54, 0.28],
    [0.56, 0.29], [0.55, 0.31], [0.53, 0.32], [0.51, 0.30], [0.49, 0.32],
  ],
  // Africa
  [
    [0.47, 0.33], [0.49, 0.34], [0.51, 0.33], [0.53, 0.34], [0.56, 0.35],
    [0.58, 0.36], [0.59, 0.39], [0.60, 0.43], [0.61, 0.47], [0.62, 0.51],
    [0.62, 0.55], [0.61, 0.60], [0.60, 0.65], [0.59, 0.70], [0.58, 0.75],
    [0.56, 0.79], [0.54, 0.82], [0.52, 0.82], [0.51, 0.78], [0.50, 0.73],
    [0.49, 0.68], [0.49, 0.62], [0.48, 0.57], [0.48, 0.52], [0.47, 0.47],
    [0.46, 0.42], [0.45, 0.38], [0.46, 0.35],
  ],
  // Asia (mainland)
  [
    [0.57, 0.29], [0.59, 0.27], [0.61, 0.25], [0.64, 0.22], [0.67, 0.19],
    [0.70, 0.16], [0.74, 0.13], [0.78, 0.11], [0.82, 0.12], [0.85, 0.14],
    [0.88, 0.17], [0.89, 0.21], [0.88, 0.25], [0.87, 0.29], [0.85, 0.32],
    [0.83, 0.35], [0.81, 0.38], [0.80, 0.42], [0.79, 0.46], [0.77, 0.49],
    [0.75, 0.47], [0.73, 0.44], [0.71, 0.46], [0.70, 0.50], [0.69, 0.47],
    [0.67, 0.44], [0.65, 0.41], [0.63, 0.38], [0.61, 0.36], [0.59, 0.34],
    [0.58, 0.31],
  ],
  // India (sub-shape)
  [
    [0.67, 0.41], [0.69, 0.42], [0.71, 0.44], [0.72, 0.47], [0.72, 0.50],
    [0.71, 0.53], [0.70, 0.50], [0.69, 0.47], [0.68, 0.44],
  ],
  // SE Asia / Indonesia (simplified)
  [
    [0.78, 0.50], [0.80, 0.52], [0.82, 0.54], [0.84, 0.56], [0.86, 0.58],
    [0.85, 0.60], [0.83, 0.58], [0.81, 0.56], [0.79, 0.54], [0.77, 0.52],
  ],
  // Australia
  [
    [0.82, 0.68], [0.85, 0.66], [0.88, 0.67], [0.91, 0.69], [0.93, 0.72],
    [0.93, 0.76], [0.92, 0.80], [0.90, 0.83], [0.87, 0.84], [0.85, 0.83],
    [0.83, 0.81], [0.82, 0.78], [0.81, 0.75], [0.81, 0.72],
  ],
  // Japan (simplified)
  [
    [0.87, 0.28], [0.88, 0.30], [0.89, 0.33], [0.90, 0.36], [0.89, 0.35],
    [0.88, 0.32], [0.87, 0.30],
  ],
];

/* ─── Generate dots along routes + port clusters ─── */
function buildShippingDots(w: number, h: number): Dot[] {
  const dots: Dot[] = [];
  const marginX = w * 0.04;
  const marginY = h * 0.06;
  const usableW = w - marginX * 2;
  const usableH = h - marginY * 2;

  const toScreen = (nx: number, ny: number): [number, number] => [
    marginX + nx * usableW,
    marginY + ny * usableH,
  ];

  const addDot = (bx: number, by: number, isPort: boolean) => {
    dots.push({
      baseX: bx,
      baseY: by,
      x: bx,
      y: by,
      isPort,
      isAccent: isPort || Math.random() < 0.06,
      pulseOffset: Math.random() * Math.PI * 2,
    });
  };

  // Port clusters — a tight cluster of dots around each port
  for (const [px, py] of PORTS) {
    const [sx, sy] = toScreen(px, py);
    // Central port dot
    addDot(sx, sy, true);
    // Surrounding cluster (5-8 dots)
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const r = 12 + Math.random() * 18;
      addDot(sx + Math.cos(angle) * r, sy + Math.sin(angle) * r, false);
    }
  }

  // Route dots — scatter dots along each shipping lane
  for (const [a, b] of ROUTES) {
    const [ax, ay] = toScreen(PORTS[a][0], PORTS[a][1]);
    const [bx, by] = toScreen(PORTS[b][0], PORTS[b][1]);
    const dist = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
    const count = Math.max(3, Math.floor(dist / 28));

    for (let i = 1; i < count; i++) {
      const t = i / count;
      // Slight curve offset for visual interest
      const perpX = -(by - ay) / dist;
      const perpY = (bx - ax) / dist;
      const curve = Math.sin(t * Math.PI) * (8 + Math.random() * 12);
      const scatter = (Math.random() - 0.5) * 10;

      const dx = ax + (bx - ax) * t + perpX * curve + (Math.random() - 0.5) * scatter;
      const dy = ay + (by - ay) * t + perpY * curve + (Math.random() - 0.5) * scatter;
      addDot(dx, dy, false);
    }
  }

  // Sparse ambient fill dots for the ocean areas (very low density)
  const fillSpacing = 60;
  const cols = Math.ceil(w / fillSpacing);
  const rows = Math.ceil(h / fillSpacing);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Only add ~15% of grid positions, and skip if too close to existing dots
      if (Math.random() > 0.15) continue;
      const fx = c * fillSpacing + (Math.random() - 0.5) * fillSpacing * 0.6;
      const fy = r * fillSpacing + (Math.random() - 0.5) * fillSpacing * 0.6;

      // Skip if close to an existing route/port dot
      let tooClose = false;
      for (let d = 0; d < dots.length; d++) {
        const ddx = dots[d].baseX - fx;
        const ddy = dots[d].baseY - fy;
        if (ddx * ddx + ddy * ddy < 900) { tooClose = true; break; }
      }
      if (!tooClose) {
        addDot(fx, fy, false);
      }
    }
  }

  return dots;
}

/* ─── Spatial grid for efficient neighbour lookups ─── */
function buildSpatialGrid(dots: Dot[], w: number, h: number, cellSize: number) {
  const cols = Math.ceil(w / cellSize);
  const rows = Math.ceil(h / cellSize);
  const grid: number[][] = new Array(cols * rows);
  for (let i = 0; i < grid.length; i++) grid[i] = [];

  for (let i = 0; i < dots.length; i++) {
    const cx = Math.floor(dots[i].x / cellSize);
    const cy = Math.floor(dots[i].y / cellSize);
    if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
      grid[cy * cols + cx].push(i);
    }
  }
  return { grid, cols, rows };
}

export const DataOcean: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const dotsRef = useRef<Dot[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      dotsRef.current = buildShippingDots(rect.width, rect.height);
    }

    // Track mouse on document level so it works even when cursor is
    // over the hero text content (which sits above the canvas in z-order)
    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    }

    function onMouseLeave() {
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    }

    function draw(time: number) {
      const rect = canvas!.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx!.clearRect(0, 0, w, h);

      // Draw faint continent outlines (behind everything)
      const mX = w * 0.04;
      const mY = h * 0.06;
      const uuW = w - mX * 2;
      const uuH = h - mY * 2;
      ctx!.strokeStyle = 'rgba(15, 23, 42, 0.045)';
      ctx!.fillStyle = 'rgba(15, 23, 42, 0.012)';
      ctx!.lineWidth = 0.8;
      for (const continent of CONTINENTS) {
        ctx!.beginPath();
        for (let i = 0; i < continent.length; i++) {
          const cx = mX + continent[i][0] * uuW;
          const cy = mY + continent[i][1] * uuH;
          if (i === 0) ctx!.moveTo(cx, cy);
          else ctx!.lineTo(cx, cy);
        }
        ctx!.closePath();
        ctx!.fill();
        ctx!.stroke();
      }

      const dots = dotsRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const t = time * WAVE_SPEED;

      // Update positions
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];

        const waveY =
          Math.sin(d.baseX * WAVE_FREQ_X + t) *
          Math.cos(d.baseY * WAVE_FREQ_Y + t * 0.7) *
          WAVE_AMPLITUDE;
        const waveX =
          Math.cos(d.baseY * WAVE_FREQ_X * 0.8 + t * 0.5) *
          WAVE_AMPLITUDE * 0.3;

        let pushX = 0;
        let pushY = 0;
        const dx = d.baseX - mx;
        const dy = d.baseY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_RADIUS) * MOUSE_STRENGTH;
          pushX = (dx / dist) * force;
          pushY = (dy / dist) * force;
        }

        d.x = d.baseX + waveX + pushX;
        d.y = d.baseY + waveY + pushY;
      }

      // Spatial grid for line drawing perf
      const cellSize = LINE_DISTANCE;
      const { grid, cols, rows } = buildSpatialGrid(dots, w, h, cellSize);

      // Draw lines between nearby dots
      ctx!.lineWidth = 0.5;
      for (let i = 0; i < dots.length; i++) {
        const cx = Math.floor(dots[i].x / cellSize);
        const cy = Math.floor(dots[i].y / cellSize);

        for (let ny = Math.max(0, cy - 1); ny <= Math.min(rows - 1, cy + 1); ny++) {
          for (let nx = Math.max(0, cx - 1); nx <= Math.min(cols - 1, cx + 1); nx++) {
            const cell = grid[ny * cols + nx];
            for (let k = 0; k < cell.length; k++) {
              const j = cell[k];
              if (j <= i) continue;
              const ddx = dots[i].x - dots[j].x;
              const ddy = dots[i].y - dots[j].y;
              const dd = Math.sqrt(ddx * ddx + ddy * ddy);
              if (dd < LINE_DISTANCE) {
                const alpha = (1 - dd / LINE_DISTANCE) * 0.14;
                ctx!.strokeStyle = `rgba(93,173,226,${alpha})`;
                ctx!.beginPath();
                ctx!.moveTo(dots[i].x, dots[i].y);
                ctx!.lineTo(dots[j].x, dots[j].y);
                ctx!.stroke();
              }
            }
          }
        }
      }

      // Draw dots
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];

        if (d.isPort) {
          // Port dots: larger, brighter, gentle pulse
          const pulse = 0.5 + 0.15 * Math.sin(time * 0.0015 + d.pulseOffset);
          const [cr, cg, cb] = GREEN;
          ctx!.fillStyle = `rgba(${cr},${cg},${cb},${pulse})`;
          ctx!.beginPath();
          ctx!.arc(d.x, d.y, PORT_RADIUS + 0.4 * Math.sin(time * 0.002 + d.pulseOffset), 0, Math.PI * 2);
          ctx!.fill();
          // Glow ring
          ctx!.strokeStyle = `rgba(${cr},${cg},${cb},${pulse * 0.3})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.arc(d.x, d.y, PORT_RADIUS + 4, 0, Math.PI * 2);
          ctx!.stroke();
        } else {
          const [cr, cg, cb] = d.isAccent ? GREEN : BLUE;
          const alpha = d.isAccent
            ? 0.3 + 0.15 * Math.sin(time * 0.002 + d.pulseOffset)
            : 0.22;
          ctx!.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
          ctx!.beginPath();
          ctx!.arc(d.x, d.y, DOT_RADIUS, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // Animated "packets" traveling along routes
      const mrgX = w * 0.04;
      const mrgY = h * 0.06;
      const uW = w - mrgX * 2;
      const uH = h - mrgY * 2;

      for (let r = 0; r < ROUTES.length; r++) {
        const [a, b] = ROUTES[r];
        const pax = mrgX + PORTS[a][0] * uW;
        const pay = mrgY + PORTS[a][1] * uH;
        const pbx = mrgX + PORTS[b][0] * uW;
        const pby = mrgY + PORTS[b][1] * uH;

        const speed = 0.00018 + (r % 5) * 0.00004;
        const progress = ((time * speed + r * 0.15) % 1);
        const px = pax + (pbx - pax) * progress;
        const py = pay + (pby - pay) * progress;

        const packetAlpha = 0.6 * Math.sin(progress * Math.PI);
        ctx!.fillStyle = `rgba(93,173,226,${packetAlpha})`;
        ctx!.beginPath();
        ctx!.arc(px, py, 2, 0, Math.PI * 2);
        ctx!.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    rafRef.current = requestAnimationFrame(draw);

    // Listen on document so mouse works even over overlaid content
    // Use the canvas parent (the hero section) for mouseleave
    const parent = canvas.parentElement;
    document.addEventListener('mousemove', onMouseMove);
    parent?.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener('mousemove', onMouseMove);
      parent?.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
};

