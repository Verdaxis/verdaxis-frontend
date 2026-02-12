import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';

/* ── Reveal on scroll ── */
export const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, y = 36, className, style }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
};

/* ── Spring-hover card wrapper ── */
export const HoverCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}> = ({ children, style, className }) => (
  <motion.div
    whileHover={{ y: -6, boxShadow: '0 12px 40px rgba(15,23,42,0.08)' }}
    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    style={style}
    className={className}
  >
    {children}
  </motion.div>
);

/* ── Spring-hover button ── */
export const HoverButton: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <motion.div
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.97 }}
    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    style={{ display: 'inline-block', ...style }}
  >
    {children}
  </motion.div>
);

/* ── Staggered grid children ── */
export const StaggerGrid: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}> = ({ children, style, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
      }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}> = ({ children, style, className }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 30 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
    }}
    style={style}
    className={className}
  >
    {children}
  </motion.div>
);

/* ── Decorative SVG elements ── */

/** Abstract leaf / organic shape — used for greenery feel */
export const LeafDecor: React.FC<{ style?: React.CSSProperties; color?: string }> = ({
  style,
  color = 'rgba(76,175,80,0.06)',
}) => (
  <svg
    viewBox="0 0 200 200"
    fill="none"
    style={{ position: 'absolute', pointerEvents: 'none', ...style }}
  >
    <path
      d="M100 10C140 10 180 40 190 80C200 120 180 170 140 190C100 210 50 190 20 150C-10 110 10 50 50 20C70 6 85 10 100 10Z"
      fill={color}
    />
  </svg>
);

/** Dotted grid pattern */
export const DotGrid: React.FC<{ style?: React.CSSProperties; color?: string }> = ({
  style,
  color = 'rgba(15,23,42,0.04)',
}) => (
  <svg
    width="120"
    height="120"
    viewBox="0 0 120 120"
    style={{ position: 'absolute', pointerEvents: 'none', ...style }}
  >
    {Array.from({ length: 36 }, (_, i) => (
      <circle
        key={i}
        cx={10 + (i % 6) * 20}
        cy={10 + Math.floor(i / 6) * 20}
        r="2"
        fill={color}
      />
    ))}
  </svg>
);

/** Abstract circuit / connection lines */
export const CircuitLines: React.FC<{ style?: React.CSSProperties; color?: string }> = ({
  style,
  color = 'rgba(93,173,226,0.08)',
}) => (
  <svg
    viewBox="0 0 200 160"
    fill="none"
    style={{ position: 'absolute', pointerEvents: 'none', ...style }}
  >
    <path d="M10 80 L60 80 L80 40 L140 40 L160 80 L190 80" stroke={color} strokeWidth="2" />
    <path d="M10 120 L50 120 L70 80 L120 80 L140 120 L190 120" stroke={color} strokeWidth="2" />
    <circle cx="80" cy="40" r="4" fill={color} />
    <circle cx="140" cy="40" r="4" fill={color} />
    <circle cx="70" cy="80" r="4" fill={color} />
    <circle cx="120" cy="80" r="4" fill={color} />
  </svg>
);

/** Gradient orb for backgrounds */
export const GradientOrb: React.FC<{
  style?: React.CSSProperties;
  color?: string;
  size?: number;
}> = ({ style, color = 'rgba(76,175,80,0.06)', size = 400 }) => (
  <div
    style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      pointerEvents: 'none',
      ...style,
    }}
  />
);
