import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  continueRender,
  delayRender,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
} from 'remotion';

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */
export const C = {
  bg: '#0A0908',
  ink: '#24221F',
  cream: '#F3EFE7',
  clay: '#C75B3F',
  clayHi: '#E27A5C',
  gold: '#E9C08A',
  dim: 'rgba(243,239,231,0.62)',
  faint: 'rgba(243,239,231,0.38)',
};
export const FONT = 'MiSans, "PingFang SC", "Noto Sans CJK SC", sans-serif';

/* ------------------------------------------------------------------ */
/* Fonts (block rendering until MiSans is ready)                       */
/* ------------------------------------------------------------------ */
if (typeof window !== 'undefined' && typeof document !== 'undefined' && !(window as any).__misans) {
  (window as any).__misans = true;
  const faces: [string, number][] = [
    ['misans_regular.ttf', 400],
    ['misans_medium.ttf', 500],
    ['misans_semibold.ttf', 600],
  ];
  const style = document.createElement('style');
  style.textContent = faces
    .map(([f, w]) => `@font-face{font-family:'MiSans';src:url('${staticFile('fonts/' + f)}') format('truetype');font-weight:${w};font-style:normal;font-display:block;}`)
    .join('\n');
  document.head.appendChild(style);
  const h = delayRender('MiSans', {timeoutInMilliseconds: 90000});
  let done = false;
  const finish = (why: string) => {
    if (done) return;
    done = true;
    console.log('[fonts] ' + why);
    continueRender(h);
  };
  Promise.all(faces.map(([, w]) => (document as any).fonts.load(`${w} 40px MiSans`, '大屏回归内容 JetStream')))
    .then((r: any[]) => finish('loaded ' + r.map((x) => x.length).join(',')))
    .catch((e: any) => finish('error ' + e));
  setTimeout(() => finish('timeout-guard'), 30000);
}

/* ------------------------------------------------------------------ */
/* Motion helpers                                                      */
/* ------------------------------------------------------------------ */
export const EXPO = Easing.bezier(0.16, 1, 0.3, 1);
export const INOUT = Easing.bezier(0.65, 0, 0.35, 1);
export const IN = Easing.bezier(0.55, 0, 1, 0.45);

export const io = (
  f: number,
  a: number,
  b: number,
  from = 0,
  to = 1,
  ease: (t: number) => number = EXPO,
) =>
  interpolate(f, [a, b], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

/** 0..1 in, hold, 1..0 out */
export const life = (f: number, inA: number, inB: number, outA: number, outB: number) =>
  Math.min(io(f, inA, inB), 1 - io(f, outA, outB, 0, 1, IN));

/* ------------------------------------------------------------------ */
/* Kinetic text                                                        */
/* ------------------------------------------------------------------ */
export const Chars: React.FC<{
  text: string;
  start: number;
  stagger?: number;
  dur?: number;
  rise?: number;
  blur?: number;
  out?: number; // frame where chars start leaving
  style?: React.CSSProperties;
}> = ({text, start, stagger = 2, dur = 30, rise = 0.55, blur = 14, out, style}) => {
  const f = useCurrentFrame();
  const chars = Array.from(text);
  return (
    <span style={{display: 'inline-block', whiteSpace: 'pre', ...style}}>
      {chars.map((c, i) => {
        const p = io(f, start + i * stagger, start + i * stagger + dur);
        const q = out === undefined ? 0 : io(f, out + i * 1, out + i * 1 + 16, 0, 1, IN);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: p * (1 - q),
              transform: `translateY(${(1 - p) * rise - q * 0.35}em)`,
              filter: `blur(${(1 - p) * blur + q * 10}px)`,
            }}
          >
            {c}
          </span>
        );
      })}
    </span>
  );
};

/** Whole-line rise with mask */
export const Line: React.FC<{
  start: number;
  out?: number;
  dur?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({start, out, dur = 34, style, children}) => {
  const f = useCurrentFrame();
  const p = io(f, start, start + dur);
  const q = out === undefined ? 0 : io(f, out, out + 18, 0, 1, IN);
  return (
    <div style={{overflow: 'hidden', paddingBottom: '0.08em', ...style}}>
      <div
        style={{
          transform: `translateY(${(1 - p) * 105 - q * 60}%)`,
          opacity: Math.min(1, p * 1.4) * (1 - q),
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Logo — rebuilt from app/src/main/res/drawable/ic_launcher_foreground */
/* ------------------------------------------------------------------ */
export const Logo: React.FC<{size: number; start: number}> = ({size, start}) => {
  const f = useCurrentFrame() - start;
  const tile = io(f, 0, 34);
  const mark = io(f, 14, 46);
  const inner = io(f, 30, 58);
  const tri = io(f, 40, 70);
  const shine = io(f, 60, 110, -60, 160, INOUT);
  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        transform: `scale(${0.55 + 0.45 * tile}) rotate(${(1 - tile) * -12}deg)`,
        opacity: tile,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: size * 0.27,
          background: `linear-gradient(160deg, #FFFCF6 0%, ${C.cream} 55%, #E3DDD2 100%)`,
          boxShadow: `0 ${size * 0.12}px ${size * 0.4}px rgba(0,0,0,.55), 0 0 ${size * 0.6}px rgba(199,91,63,${0.25 * tile})`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(115deg, transparent ${shine - 18}%, rgba(255,255,255,.75) ${shine}%, transparent ${shine + 18}%)`,
            mixBlendMode: 'soft-light',
          }}
        />
      </div>
      <svg viewBox="22 18 116 124" width={size} height={size} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(80 80) scale(${0.82 + 0.18 * mark}) translate(-80 -80)`} opacity={mark}>
          <path fill={C.ink} d="M31,27h68l30,30v76H61l-30,-30V27Z" />
        </g>
        <g transform={`translate(80 80) scale(${inner}) translate(-80 -80)`}>
          <path fill={C.cream} d="M54,51h34l18,18v40H72L54,91V51Z" />
        </g>
        <path
          fill={C.clay}
          d="M99,27h30v30L99,27Z"
          transform={`translate(${(1 - tri) * 26} ${(1 - tri) * -26})`}
          opacity={tri}
        />
        <path
          fill={C.clay}
          d="M31,103h30v30l-30,-30Z"
          transform={`translate(${(1 - tri) * -26} ${(1 - tri) * 26})`}
          opacity={tri}
        />
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Screen: a floating TV panel showing a real capture                  */
/* ------------------------------------------------------------------ */
export const Screen: React.FC<{
  src: string;
  w: number;
  glare?: number; // -50..150
  style?: React.CSSProperties;
  children?: React.ReactNode;
  radius?: number;
}> = ({src, w, glare = -100, style, children, radius}) => {
  const h = (w * 9) / 16;
  const r = radius ?? w * 0.018;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        position: 'relative',
        background: '#000',
        boxShadow: `0 ${w * 0.04}px ${w * 0.1}px rgba(0,0,0,.65), 0 0 0 ${Math.max(1, w / 900)}px rgba(243,239,231,.14)`,
        overflow: 'hidden',
        ...style,
      }}
    >
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />
      {children}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(112deg, transparent ${glare - 14}%, rgba(255,255,255,.085) ${glare}%, transparent ${glare + 14}%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: r,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)',
        }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Background: warm void, drifting glows, particles, grain, vignette   */
/* ------------------------------------------------------------------ */
export const Ambient: React.FC<{plate?: string; plateOpacity?: number; warm?: number; cool?: number}> = ({
  plate,
  plateOpacity = 0,
  warm = 1,
  cool = 1,
}) => {
  const f = useCurrentFrame();
  const t = f / 60;
  const x1 = 22 + Math.sin(t * 0.21) * 8;
  const y1 = 78 + Math.cos(t * 0.17) * 6;
  const x2 = 80 + Math.cos(t * 0.13) * 9;
  const y2 = 18 + Math.sin(t * 0.19) * 7;
  return (
    <AbsoluteFill style={{background: C.bg}}>
      {plate ? (
        <Img
          src={staticFile(plate)}
          style={{
            position: 'absolute',
            inset: -40,
            width: 2000,
            height: 1160,
            objectFit: 'cover',
            opacity: plateOpacity,
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 70% at ${x1}% ${y1}%, rgba(199,91,63,${0.28 * warm}) 0%, rgba(199,91,63,0) 60%),
                       radial-gradient(55% 60% at ${x2}% ${y2}%, rgba(92,120,190,${0.2 * cool}) 0%, rgba(92,120,190,0) 62%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Particles: React.FC<{count?: number; seed?: string; opacity?: number}> = ({
  count = 70,
  seed = 'p',
  opacity = 1,
}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{opacity}}>
      {new Array(count).fill(0).map((_, i) => {
        const x0 = random(seed + 'x' + i) * 1920;
        const y0 = random(seed + 'y' + i) * 1080;
        const sp = 0.15 + random(seed + 's' + i) * 0.5;
        const sz = 1.2 + random(seed + 'z' + i) * 3.2;
        const y = (((y0 - f * sp) % 1180) + 1180) % 1180 - 50;
        const x = x0 + Math.sin(f / 90 + i) * 18;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(f / (40 + i) + i));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: sz,
              height: sz,
              borderRadius: sz,
              background: i % 5 === 0 ? C.clayHi : C.cream,
              opacity: 0.12 + 0.35 * tw * (sz / 4.4),
              boxShadow: `0 0 ${sz * 4}px ${i % 5 === 0 ? 'rgba(226,122,92,.7)' : 'rgba(243,239,231,.5)'}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.07}) => {
  const f = useCurrentFrame();
  const ox = Math.floor(random('gx' + (f % 97)) * 160);
  const oy = Math.floor(random('gy' + (f % 89)) * 110);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Img
        src={staticFile('grain.png')}
        style={{
          position: 'absolute',
          left: -ox,
          top: -oy,
          width: 2100,
          height: 1200,
          opacity,
          mixBlendMode: 'overlay',
        }}
      />
      <AbsoluteFill
        style={{
          background: 'radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Small UI atoms                                                      */
/* ------------------------------------------------------------------ */
export const Kicker: React.FC<{start: number; out?: number; children: string; color?: string}> = ({
  start,
  out,
  children,
  color = C.clayHi,
}) => {
  const f = useCurrentFrame();
  const p = io(f, start, start + 30);
  const q = out === undefined ? 0 : io(f, out, out + 16);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity: p * (1 - q),
        transform: `translateX(${(1 - p) * -30}px)`,
        fontFamily: FONT,
        fontWeight: 500,
        fontSize: 26,
        letterSpacing: 6,
        color,
      }}
    >
      <div style={{width: 44 * p, height: 3, borderRadius: 2, background: color}} />
      {children}
    </div>
  );
};

export const Chip: React.FC<{
  children: React.ReactNode;
  p: number;
  style?: React.CSSProperties;
  hot?: boolean;
}> = ({children, p, style, hot}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '12px 26px',
      borderRadius: 999,
      fontFamily: FONT,
      fontWeight: 500,
      fontSize: 28,
      color: hot ? '#1a1311' : C.cream,
      background: hot ? C.cream : 'rgba(243,239,231,.08)',
      boxShadow: hot ? `0 10px 40px rgba(199,91,63,.35)` : 'inset 0 0 0 1.5px rgba(243,239,231,.16)',
      opacity: p,
      transform: `translateY(${(1 - p) * 24}px) scale(${0.9 + 0.1 * p})`,
      filter: `blur(${(1 - p) * 8}px)`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);

/** Impact flash + punch, centered on an absolute frame */
export const Flash: React.FC<{at: number[]}> = ({at}) => {
  const f = useCurrentFrame();
  let o = 0;
  for (const a of at) {
    const d = f - a;
    if (d >= -2 && d < 26) o = Math.max(o, d < 0 ? (d + 2) / 2 : Math.exp(-d / 6));
  }
  if (o <= 0.001) return null;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(70% 70% at 50% 50%, rgba(255,240,225,${0.55 * o}) 0%, rgba(226,122,92,${0.25 * o}) 45%, rgba(0,0,0,0) 80%)`,
        mixBlendMode: 'screen',
      }}
    />
  );
};
