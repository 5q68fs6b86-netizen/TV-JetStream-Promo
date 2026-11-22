import React from 'react';
import {FONTS} from './fonts.generated';
import {AbsoluteFill, Easing, Img, OffthreadVideo, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import assets from './assets.json';

/* ------------------------------------------------------------------ */
/* Design tokens — Apple keynote language                              */
/* ------------------------------------------------------------------ */
export const K = {
  black: '#000000',
  white: '#F5F5F7',
  grey: '#86868B',
  grey2: '#6E6E73',
  tile: '#161617',
  hair: 'rgba(255,255,255,0.10)',
  // Apple TV+-like spectrum, used sparingly for key words
  grad: 'linear-gradient(92deg, #7EB6FF 0%, #A08BFF 38%, #E987C3 68%, #FFB38A 100%)',
};
export const SANS = '"Inter Display", "MiSans", "PingFang SC", sans-serif';

/* ------------------------------------------------------------------ */
/* Fonts (embedded, block until ready)                                  */
/* ------------------------------------------------------------------ */
if (typeof window !== 'undefined' && typeof document !== 'undefined' && !(window as any).__fonts) {
  (window as any).__fonts = true;
  const style = document.createElement('style');
  style.textContent = FONTS.map(
    (f) => `@font-face{font-family:'${f.family}';src:url('${f.url}') format('${f.format}');font-weight:${f.weight};font-style:normal;font-display:block;}`,
  ).join('\n');
  document.head.appendChild(style);
  const h = delayRender('fonts', {timeoutInMilliseconds: 600000});
  let done = false;
  const finish = () => {
    if (!done) {
      done = true;
      continueRender(h);
    }
  };
  Promise.all(FONTS.map((f) => (document as any).fonts.load(`${f.weight} 40px "${f.family}"`, '看电视 JetStream')))
    .then(finish)
    .catch(finish);
  setTimeout(finish, 30000);
}

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */
export const EASE = Easing.bezier(0.25, 0.1, 0.25, 1); // Apple default
export const OUT = Easing.bezier(0.16, 1, 0.3, 1); // soft settle
export const INOUT = Easing.bezier(0.65, 0, 0.35, 1);
export const IN = Easing.bezier(0.5, 0, 0.75, 0);

export const io = (f: number, a: number, b: number, from = 0, to = 1, e: (t: number) => number = OUT) =>
  interpolate(f, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e});

/* ------------------------------------------------------------------ */
/* Assets                                                              */
/* ------------------------------------------------------------------ */
type ClipMeta = {duration: number; marks: {t: number; label: string}[]};
const CLIPS = (assets as any).clips as Record<string, ClipMeta>;
const SHOTS = ((assets as any).shots || []) as string[];
export const RELEASE = (assets as any).release as string;
export const mark = (clip: string, label: string, fb = 0) => CLIPS[clip]?.marks.find((m) => m.label === label)?.t ?? fb;

export const Footage: React.FC<{clip?: string; from?: number; still?: string; style?: React.CSSProperties}> = ({clip, from = 0, still, style}) => {
  const s: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style};
  if (clip && CLIPS[clip]) {
    const st = Math.min(from, Math.max(0, CLIPS[clip].duration - 1));
    return <OffthreadVideo src={staticFile(`clips/${clip}.mp4`)} startFrom={Math.round(st * 60)} muted style={s} />;
  }
  const n = still && SHOTS.includes(still) ? still : SHOTS[0];
  return <Img src={staticFile(`shots/${n}.png`)} style={s} />;
};

export const Film: React.FC<{name: string; from?: number}> = ({name, from = 0}) => (
  <OffthreadVideo src={staticFile(`films/${name}.mp4`)} startFrom={Math.round(from * 60)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
);

/* ------------------------------------------------------------------ */
/* Type                                                                */
/* ------------------------------------------------------------------ */
/** Apple reveal: fade + 24px rise + soft blur; leaves with a quick fade. */
export const Reveal: React.FC<{
  at: number;
  out?: number;
  dur?: number;
  rise?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({at, out, dur = 42, rise = 26, children, style}) => {
  const f = useCurrentFrame();
  const p = io(f, at, at + dur, 0, 1, OUT);
  const q = out === undefined ? 0 : io(f, out, out + 18, 0, 1, EASE);
  const o = p * (1 - q);
  if (o <= 0.001) return null;
  return (
    <div
      style={{
        opacity: o,
        transform: `translateY(${(1 - p) * rise - q * 10}px)`,
        filter: p < 0.999 || q > 0 ? `blur(${(1 - p) * 10 + q * 6}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const H: React.FC<{size?: number; children: React.ReactNode; grad?: boolean; style?: React.CSSProperties; weight?: number}> = ({
  size = 120,
  children,
  grad,
  style,
  weight = 600,
}) => (
  <div
    style={{
      fontFamily: SANS,
      fontWeight: weight,
      fontSize: size,
      lineHeight: 1.08,
      letterSpacing: '-0.02em',
      color: K.white,
      ...(grad ? {backgroundImage: K.grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'} : {}),
      ...style,
    }}
  >
    {children}
  </div>
);

export const Sub: React.FC<{size?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({size = 34, children, style}) => (
  <div style={{fontFamily: SANS, fontWeight: 500, fontSize: size, lineHeight: 1.45, letterSpacing: '0.01em', color: K.grey, ...style}}>{children}</div>
);

export const Eyebrow: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 28, letterSpacing: '0.02em', color: K.grey, marginBottom: 18, ...style}}>{children}</div>
);

/* ------------------------------------------------------------------ */
/* Device: slim floating TV with soft screen glow + floor reflection   */
/* ------------------------------------------------------------------ */
export const TV: React.FC<{w: number; children: React.ReactNode; glow?: string; glowOpacity?: number; reflection?: boolean; power?: number}> = ({
  w,
  children,
  glow,
  glowOpacity = 0.55,
  reflection = true,
  power = 1,
}) => {
  const h = (w * 9) / 16;
  const bez = Math.max(3, w * 0.006);
  const r = w * 0.008;
  const screen = (
    <div style={{position: 'absolute', inset: bez, borderRadius: r * 0.6, overflow: 'hidden', background: '#000'}}>
      <div style={{position: 'absolute', inset: 0, opacity: power}}>{children}</div>
      {/* glass: faint top-left sheen */}
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,.045) 0%, rgba(255,255,255,0) 38%)'}} />
    </div>
  );
  return (
    <div style={{position: 'relative', width: w, height: h}}>
      {glow ? (
        <Img
          src={staticFile(glow)}
          style={{
            position: 'absolute',
            left: w * 0.04,
            top: h * 0.06,
            width: w * 0.92,
            height: h * 0.92,
            objectFit: 'cover',
            filter: `blur(${w * 0.06}px) saturate(1.4)`,
            opacity: glowOpacity * power,
            transform: 'scale(1.08)',
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: r,
          background: 'linear-gradient(180deg, #2a2a2c 0%, #0b0b0c 8%, #070707 92%, #1d1d1f 100%)',
          boxShadow: `0 ${w * 0.03}px ${w * 0.08}px rgba(0,0,0,.8), inset 0 0 0 1px rgba(255,255,255,.08)`,
        }}
      >
        {screen}
      </div>
      {reflection ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: h + w * 0.012,
            width: w,
            height: h * 0.35,
            overflow: 'hidden',
            opacity: 0.14 * power,
            transform: 'scaleY(-1)',
            transformOrigin: 'top',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)',
          }}
        >
          <div style={{position: 'absolute', left: 0, bottom: 0, width: w, height: h, filter: 'blur(3px)'}}>
            <div style={{position: 'absolute', inset: bez, overflow: 'hidden'}}>{children}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* App icon — rebuilt from ic_launcher_foreground.xml, Apple squircle    */
/* ------------------------------------------------------------------ */
const squircle = (s: number) => {
  // superellipse n≈5, sampled
  const n = 5,
    pts: string[] = [];
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const c = Math.cos(t),
      sn = Math.sin(t);
    const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const y = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
    pts.push(`${((x + 1) * s) / 2},${((y + 1) * s) / 2}`);
  }
  return `M${pts.join('L')}Z`;
};

export const AppIcon: React.FC<{size: number; sheen?: number}> = ({size, sheen = -1}) => {
  const id = `ic${size}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{overflow: 'visible', filter: `drop-shadow(0 ${size * 0.08}px ${size * 0.16}px rgba(0,0,0,.6))`}}>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBF8F2" />
          <stop offset="1" stopColor="#E9E4DA" />
        </linearGradient>
        <clipPath id={`${id}clip`}>
          <path d={squircle(size)} />
        </clipPath>
        <linearGradient id={`${id}sh`} x1="0" y1="0" x2="1" y2="1">
          <stop offset={Math.max(0, sheen - 0.15)} stopColor="#fff" stopOpacity="0" />
          <stop offset={Math.min(1, Math.max(0, sheen))} stopColor="#fff" stopOpacity="0.55" />
          <stop offset={Math.min(1, sheen + 0.15)} stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}clip)`}>
        <rect width={size} height={size} fill={`url(#${id}bg)`} />
        <g transform={`scale(${size / 160}) translate(80 80) scale(0.86) translate(-80 -80)`}>
          <path fill="#24221F" d="M31,27h68l30,30v76H61l-30,-30V27Z" />
          <path fill="#F3EFE7" d="M54,51h34l18,18v40H72L54,91V51Z" />
          <path fill="#C75B3F" d="M99,27h30v30L99,27Z" />
          <path fill="#C75B3F" d="M31,103h30v30l-30,-30Z" />
        </g>
        {sheen >= 0 && sheen <= 1.2 ? <rect width={size} height={size} fill={`url(#${id}sh)`} style={{mixBlendMode: 'soft-light'}} /> : null}
      </g>
      <path d={squircle(size)} fill="none" stroke="rgba(0,0,0,.08)" strokeWidth={1} />
    </svg>
  );
};

/** soft top spotlight on black */
export const Stage: React.FC<{light?: number; tint?: string}> = ({light = 1, tint = '255,255,255'}) => (
  <AbsoluteFill style={{background: K.black}}>
    <AbsoluteFill style={{background: `radial-gradient(55% 45% at 50% 38%, rgba(${tint},${0.07 * light}) 0%, rgba(${tint},0) 70%)`}} />
  </AbsoluteFill>
);
