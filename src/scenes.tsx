import React from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {
  Ambient,
  C,
  Chars,
  Chip,
  EXPO,
  FONT,
  IN,
  INOUT,
  Kicker,
  Line,
  Logo,
  Particles,
  Screen,
  io,
  life,
} from './lib';

const H1: React.CSSProperties = {fontFamily: FONT, fontWeight: 600, color: C.cream, letterSpacing: 2, lineHeight: 1.12};
const SUB: React.CSSProperties = {fontFamily: FONT, fontWeight: 400, color: C.dim, fontSize: 32, lineHeight: 1.6, letterSpacing: 1};

/** shared exit: blur + scale out over the last frames of a scene */
const useExit = (dur: number, len = 22) => {
  const f = useCurrentFrame();
  const p = io(f, dur - len, dur, 0, 1, IN);
  return {
    opacity: 1 - p,
    transform: `scale(${1 + p * 0.06})`,
    filter: p > 0.001 ? `blur(${p * 16}px)` : undefined,
  } as React.CSSProperties;
};

const Reflection: React.FC<{children: React.ReactNode; gap?: number}> = ({children, gap = 18}) => (
  <div
    style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: gap,
      transform: 'scaleY(-1)',
      opacity: 0.22,
      WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,0) 38%)',
      maskImage: 'linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,0) 38%)',
      pointerEvents: 'none',
    }}
  >
    {children}
  </div>
);

/* ================================================================== */
/* 1 · Intro  (0 – 480)                                                */
/* ================================================================== */
export const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const flare = io(f, 30, 150);
  const lift = io(f, 205, 265);
  const exit = io(f, 448, 480, 0, 1, IN);
  return (
    <AbsoluteFill>
      <Ambient warm={io(f, 0, 220)} cool={io(f, 80, 300) * 0.8} />
      <Particles seed="intro" opacity={io(f, 0, 140)} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div
          style={{
            width: 1900 * flare,
            height: 3,
            borderRadius: 3,
            background: 'linear-gradient(90deg, rgba(0,0,0,0), rgba(255,220,198,.95), rgba(0,0,0,0))',
            boxShadow: '0 0 40px 6px rgba(226,122,92,.55)',
            opacity: flare * (1 - io(f, 150, 250)),
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${1 + 0.05 * io(f, 280, 480, 0, 1, INOUT) + exit * 0.3})`,
          opacity: 1 - exit,
          filter: exit > 0 ? `blur(${exit * 20}px)` : undefined,
        }}
      >
        <div style={{transform: `translateY(${-150 * lift}px) scale(${1 - 0.24 * lift})`}}>
          <Logo size={250} start={70} />
        </div>
        <div style={{position: 'absolute', top: 545, width: '100%', textAlign: 'center'}}>
          <div style={{...H1, fontSize: 132, letterSpacing: 6}}>
            <Chars text="TV" start={232} stagger={4} />
            <Chars text=" · " start={244} style={{color: C.clay}} />
            <Chars text="JetStream" start={252} stagger={3} style={{fontWeight: 500}} />
          </div>
          <div style={{...SUB, fontSize: 40, marginTop: 26, color: C.dim, letterSpacing: 6}}>
            <Chars text="让大屏回归内容，让遥控器操作更顺手。" start={318} stagger={2} dur={34} rise={0.4} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2 · Hero  (480 – 960)                                               */
/* ================================================================== */
export const Hero: React.FC = () => {
  const f = useCurrentFrame();
  const enter = io(f, 0, 70);
  const swap = io(f, 238, 272, 0, 1, INOUT);
  const rotY = interpolate(enter, [0, 1], [-46, -20]) + io(f, 0, 480, 0, 9, INOUT);
  const tx = (1 - enter) * 420 - io(f, 0, 480, 0, 40, INOUT);
  const glare = io(f, 30, 200, -40, 160, INOUT) + io(f, 250, 430, -200, 0, INOUT);
  const exit = useExit(480);
  return (
    <AbsoluteFill style={exit}>
      <Ambient plate={swap < 0.5 ? 'plates/home.jpg' : 'plates/cards.jpg'} plateOpacity={0.34 * enter} warm={0.8} cool={1} />
      <Particles seed="hero" count={40} opacity={0.6} />
      <AbsoluteFill style={{perspective: 2200, perspectiveOrigin: '30% 50%'}}>
        <div
          style={{
            position: 'absolute',
            left: 700,
            top: 240,
            transformStyle: 'preserve-3d',
            transform: `translateX(${tx}px) rotateY(${rotY}deg) rotateX(4deg)`,
            opacity: enter,
            filter: enter < 1 ? `blur(${(1 - enter) * 18}px)` : undefined,
          }}
        >
          <Screen src="shots/home.png" w={1180} glare={glare}>
            <Img
              src={staticFile('shots/cards.png')}
              style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: swap, transform: `scale(${1.06 - 0.06 * swap})`}}
            />
          </Screen>
          <Reflection>
            <Screen src={swap < 0.5 ? 'shots/home.png' : 'shots/cards.png'} w={1180} />
          </Reflection>
        </div>
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 130, top: 360, width: 640}}>
        <Kicker start={18} out={222}>全新 JetStream 大屏界面</Kicker>
        <div style={{...H1, fontSize: 124, marginTop: 26}}>
          <Chars text="为大屏而生" start={28} stagger={4} out={224} />
        </div>
        <Line start={64} out={222} style={{...SUB, marginTop: 22}}>
          原生 Compose 界面 · 遥控焦点
        </Line>
        <Line start={72} out={224} style={SUB}>
          触摸轻点与长按 · 海报与侧栏过渡动画
        </Line>
      </div>
      <div style={{position: 'absolute', left: 130, top: 360, width: 640}}>
        <Kicker start={256}>首页与发现</Kicker>
        <div style={{...H1, fontSize: 124, marginTop: 26}}>
          <Chars text="一眼，好片" start={262} stagger={4} />
        </div>
        <Line start={292} style={{...SUB, marginTop: 22}}>
          TMDB / 豆瓣推荐 · 栏目大卡
        </Line>
        <Line start={300} style={SUB}>
          继续观看 · 收藏片单 · 主视觉轮播
        </Line>
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3 · Carousel  (960 – 1680)                                          */
/* ================================================================== */
const CAROUSEL = [
  {src: 'modes', title: '三种模式，随心切换', sub: '媒体库 · 简洁 · 经典 —— 按你的习惯浏览'},
  {src: 'calendar', title: '追更日历，不错过每一集', sub: '剧集 · 动漫 · 综艺每日排期 · 前后周 · 个人追更'},
  {src: 'follow', title: '媒体库详情，沉浸选集', sub: '沉浸背景 · 季集切换 · 播放 / 追剧 / 资源操作'},
];
export const Carousel: React.FC = () => {
  const f = useCurrentFrame();
  const idx = io(f, 226, 266, 0, 1, INOUT) + io(f, 466, 506, 0, 1, INOUT);
  const enter = io(f, 0, 60);
  const exit = useExit(720);
  const cur = Math.round(idx);
  return (
    <AbsoluteFill style={exit}>
      <Ambient plate={`plates/${CAROUSEL[cur].src}.jpg`} plateOpacity={0.32} warm={0.7} />
      <AbsoluteFill style={{perspective: 2000}}>
        {CAROUSEL.map((it, i) => {
          const off = i - idx;
          const a = Math.abs(off);
          const x = off * 1010;
          const z = -a * 460 + (1 - enter) * -900;
          const ry = off * -34;
          const op = Math.max(0, 1 - a * 0.5) * enter;
          const glare = interpolate(off, [-1, 0, 1], [160, 40, -60]);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 960 - 560,
                top: 300,
                transformStyle: 'preserve-3d',
                transform: `translateX(${x}px) translateZ(${z}px) rotateY(${ry}deg)`,
                opacity: op,
                zIndex: 10 - Math.round(a * 3),
                filter: `brightness(${1 - Math.min(a, 1) * 0.45})`,
              }}
            >
              <Screen src={`shots/${it.src}.png`} w={1120} glare={glare} />
              <Reflection>
                <Screen src={`shots/${it.src}.png`} w={1120} />
              </Reflection>
            </div>
          );
        })}
      </AbsoluteFill>
      {CAROUSEL.map((it, i) => {
        const s = i * 240;
        const o = life(f, s + (i ? 250 - 240 + 12 : 18), s + (i ? 250 - 240 + 52 : 58), s + 216, s + 236);
        if (o <= 0) return null;
        const start = i === 0 ? 18 : s + 22;
        return (
          <div key={i} style={{position: 'absolute', top: 92, width: '100%', textAlign: 'center', opacity: i === 2 ? 1 : o}}>
            <div style={{...H1, fontSize: 78}}>
              <Chars text={it.title} start={start} stagger={2} out={i === 2 ? undefined : s + 214} />
            </div>
            <Line start={start + 18} out={i === 2 ? undefined : s + 212} style={{...SUB, fontSize: 30, marginTop: 6}}>
              {it.sub}
            </Line>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4 · Feature cards (1680 – 2400), 6 × 120 frames                     */
/* ================================================================== */
const Card: React.FC<{n: number; title: string; sub: string[]; children: React.ReactNode}> = ({n, title, sub, children}) => {
  const f = useCurrentFrame();
  const inP = io(f, 0, 22);
  const outP = io(f, 104, 120, 0, 1, IN);
  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(1, inP * 1.5) * (1 - outP),
        transform: `translateX(${(1 - inP) * 160 - outP * 160}px) skewX(${(1 - inP) * -6 + outP * 6}deg)`,
        filter: inP < 1 || outP > 0 ? `blur(${(1 - inP) * 14 + outP * 14}px)` : undefined,
      }}
    >
      <div style={{position: 'absolute', left: 130, top: 330, width: 760}}>
        <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 26, letterSpacing: 6, color: C.clayHi, opacity: io(f, 4, 24)}}>
          {String(n).padStart(2, '0')} <span style={{color: C.faint}}>/ 06</span>
        </div>
        <div style={{...H1, fontSize: 100, marginTop: 18}}>
          <Chars text={title} start={4} stagger={2} dur={24} />
        </div>
        {sub.map((s, i) => (
          <Line key={i} start={16 + i * 6} dur={28} style={{...SUB, fontSize: 31, marginTop: i ? 0 : 22}}>
            {s}
          </Line>
        ))}
      </div>
      <div style={{position: 'absolute', left: 960, top: 210, width: 860, height: 660}}>{children}</div>
    </AbsoluteFill>
  );
};

const Panel: React.FC<{children?: React.ReactNode; src?: string; dim?: number; style?: React.CSSProperties}> = ({children, src, dim = 0.35, style}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 100,
      width: 860,
      height: 484,
      borderRadius: 22,
      overflow: 'hidden',
      background: '#121110',
      boxShadow: '0 40px 100px rgba(0,0,0,.6), 0 0 0 1.5px rgba(243,239,231,.12)',
      ...style,
    }}
  >
    {src ? <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', opacity: 1 - dim}} /> : null}
    {children}
  </div>
);

const G1Cores: React.FC = () => {
  const f = useCurrentFrame();
  const m = io(f, 8, 70, 0, 1, INOUT);
  const d = 250 - 105 * m;
  const pulse = 1 + 0.04 * Math.max(0, Math.cos(((f - 6) / 30) * Math.PI * 2)) * io(f, 40, 60);
  const ring = (label: string, x: number, color: string, delay: number) => {
    const p = io(f, delay, delay + 30);
    return (
      <div
        style={{
          position: 'absolute',
          left: 430 + x - 220,
          top: 330 - 220,
          width: 440,
          height: 440,
          borderRadius: 440,
          background: `radial-gradient(circle at 50% 50%, ${color}55 0%, ${color}22 55%, ${color}00 72%)`,
          boxShadow: `inset 0 0 0 2px ${color}aa, 0 0 80px ${color}44`,
          mixBlendMode: 'screen',
          opacity: p,
          transform: `scale(${(0.7 + 0.3 * p) * pulse})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: x < 0 ? 'flex-start' : 'flex-end',
          padding: '0 54px',
          boxSizing: 'border-box',
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 44,
          color: C.cream,
        }}
      >
        {label}
      </div>
    );
  };
  return (
    <>
      {ring('Exo', -d, '#E27A5C', 2)}
      {ring('MPV', d, '#7E9BEA', 8)}
      <div
        style={{
          position: 'absolute',
          left: 430 - 60,
          top: 330 - 60,
          width: 120,
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 64,
          color: '#fff',
          opacity: io(f, 50, 70),
          transform: `scale(${io(f, 50, 74, 0.4, 1)})`,
          textShadow: '0 0 30px rgba(255,220,200,.9)',
        }}
      >
        ×
      </div>
      <div style={{position: 'absolute', left: 0, top: 590, width: 860, display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap'}}>
        {['Media3', '软硬解', '倍速', '章节', '选集续播'].map((t, i) => (
          <Chip key={t} p={io(f, 40 + i * 5, 64 + i * 5)} style={{fontSize: 24, padding: '9px 22px'}}>
            {t}
          </Chip>
        ))}
      </div>
    </>
  );
};

const G2Capsule: React.FC = () => {
  const f = useCurrentFrame();
  const items = ['2160p', 'HEVC', 'HDR10', '5.1 声道', '12+'];
  const open = io(f, 16, 46);
  return (
    <Panel src="shots/vod.png" dim={0.25}>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,0) 45%)'}} />
      <div
        style={{
          position: 'absolute',
          left: 36,
          top: 34,
          height: 62,
          borderRadius: 62,
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          padding: '0 10px',
          background: 'rgba(20,18,16,.62)',
          backdropFilter: 'blur(14px)',
          boxShadow: 'inset 0 0 0 1.5px rgba(243,239,231,.22), 0 12px 40px rgba(0,0,0,.4)',
          overflow: 'hidden',
          maxWidth: 70 + open * 720,
          opacity: io(f, 8, 20),
        }}
      >
        {items.map((t, i) => {
          const p = io(f, 26 + i * 7, 46 + i * 7);
          return (
            <div
              key={t}
              style={{
                display: 'flex',
                alignItems: 'center',
                fontFamily: FONT,
                fontWeight: i === 0 ? 600 : 500,
                fontSize: 28,
                color: i === 4 ? '#1a1311' : C.cream,
                background: i === 4 ? C.gold : 'transparent',
                borderRadius: 40,
                padding: i === 4 ? '4px 16px' : '0 16px',
                margin: i === 4 ? '0 6px' : 0,
                opacity: p,
                transform: `translateY(${(1 - p) * 20}px)`,
                whiteSpace: 'nowrap',
                borderLeft: i > 0 && i < 4 ? '1.5px solid rgba(243,239,231,.2)' : 'none',
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 40, bottom: 40, right: 40}}>
        <div style={{fontFamily: FONT, fontWeight: 600, fontSize: 34, color: C.cream}}>深空回声：第 5 集</div>
        <div style={{marginTop: 18, height: 6, borderRadius: 6, background: 'rgba(255,255,255,.2)'}}>
          <div style={{width: `${18 + io(f, 0, 120, 0, 14, (t) => t)}%`, height: '100%', borderRadius: 6, background: C.cream}} />
        </div>
      </div>
    </Panel>
  );
};

const G3Subs: React.FC = () => {
  const f = useCurrentFrame();
  const en = "I've been waiting for this moment.";
  const zh = '这一刻，我等了很久。';
  const nEn = Math.floor(io(f, 14, 60, 0, en.length, (t) => t));
  const nZh = Math.floor(io(f, 40, 76, 0, zh.length, (t) => t));
  const langs = ['普通话', '粤语', 'English', '日本語', 'Deutsch', 'Français', 'Español'];
  const hot = Math.floor(io(f, 20, 110, 0, 6.99, (t) => t));
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: 60, width: 860, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7}}>
        {new Array(52).fill(0).map((_, i) => {
          const env = Math.sin((i / 51) * Math.PI);
          const v = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.9 + f * 0.21) * Math.cos(i * 0.37 - f * 0.13)) * env;
          const p = io(f, i * 0.6, 20 + i * 0.6);
          return (
            <div
              key={i}
              style={{
                width: 9,
                height: 18 + 180 * v * p,
                borderRadius: 9,
                background: `linear-gradient(180deg, ${C.clayHi}, #7E9BEA)`,
                opacity: 0.55 + 0.45 * v,
              }}
            />
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 0, top: 320, width: 860, textAlign: 'center'}}>
        <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 40, color: C.dim, height: 56}}>
          {en.slice(0, nEn)}
          <span style={{opacity: nEn < en.length && Math.floor(f / 8) % 2 ? 1 : 0}}>▏</span>
        </div>
        <div style={{fontFamily: FONT, fontWeight: 600, fontSize: 52, color: C.cream, marginTop: 10, height: 70, textShadow: '0 4px 24px rgba(0,0,0,.6)'}}>
          {zh.slice(0, nZh)}
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, top: 520, width: 860, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap'}}>
        {langs.map((t, i) => (
          <Chip key={t} p={io(f, 10 + i * 4, 34 + i * 4)} hot={i === hot} style={{fontSize: 24, padding: '9px 20px'}}>
            {t}
          </Chip>
        ))}
      </div>
    </>
  );
};

const DANMAKU = [
  '前方高能！', '这个转场太丝滑了', '遥控器操作好顺手', '画质绝了', '片头已自动跳过 ✓', '名场面打卡',
  '字幕好清晰', '大屏党狂喜', '这配色好高级', '一起看真香', '弹幕密度刚刚好', '收藏了！',
  '比原版顺滑多了', '倍速长按好评', 'HDR 太震撼', '追更日历救我',
];
const G4Danmaku: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Panel src="shots/vod.png" dim={0.35}>
      {DANMAKU.map((t, i) => {
        const row = i % 6;
        const speed = 7 + (i % 4) * 1.6;
        const start = (i * 23) % 70 - 20;
        const x = 900 - (f - start) * speed;
        const colors = [C.cream, C.cream, C.gold, C.cream, '#9CC3FF', C.cream];
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: 30 + row * 56,
              fontFamily: FONT,
              fontWeight: 500,
              fontSize: 32,
              whiteSpace: 'nowrap',
              color: colors[i % colors.length],
              textShadow: '0 0 2px #000, 0 2px 6px rgba(0,0,0,.9)',
              opacity: 0.95,
            }}
          >
            {t}
          </div>
        );
      })}
    </Panel>
  );
};

const G5Skip: React.FC = () => {
  const f = useCurrentFrame();
  const a = 0.08,
    b = 0.17,
    c = 0.9,
    d = 0.97;
  let pos = io(f, 8, 46, 0.02, a, (t) => t);
  const jump = io(f, 60, 74, 0, 1, EXPO);
  if (f >= 60) pos = a + (b - a) * jump + io(f, 74, 120, 0, 0.05, (t) => t);
  const btnHot = io(f, 44, 52) * (1 - io(f, 70, 84));
  const press = f >= 56 && f < 62 ? 0.94 : 1;
  const W = 780;
  return (
    <>
      <Panel src="shots/player.png" dim={0.55} style={{top: 40}}>
        <div
          style={{
            position: 'absolute',
            right: 40,
            bottom: 40,
            padding: '16px 30px',
            borderRadius: 999,
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 30,
            color: btnHot > 0.5 ? '#1a1311' : C.cream,
            background: `rgba(243,239,231,${0.12 + 0.88 * btnHot})`,
            boxShadow: `0 0 ${60 * btnHot}px rgba(226,122,92,.8), inset 0 0 0 1.5px rgba(243,239,231,.3)`,
            transform: `scale(${(0.96 + 0.06 * btnHot) * press})`,
            opacity: io(f, 36, 46),
          }}
        >
          {f < 70 ? '跳过片头  ⏭' : '已跳过片头 ✓'}
        </div>
      </Panel>
      <div style={{position: 'absolute', left: 40, top: 580, width: W}}>
        <div style={{position: 'relative', height: 14, borderRadius: 14, background: 'rgba(243,239,231,.14)'}}>
          <div style={{position: 'absolute', left: a * W, width: (b - a) * W, top: 0, bottom: 0, borderRadius: 14, background: C.clay, boxShadow: '0 0 24px rgba(199,91,63,.8)'}} />
          <div style={{position: 'absolute', left: c * W, width: (d - c) * W, top: 0, bottom: 0, borderRadius: 14, background: C.clay, opacity: 0.8}} />
          <div style={{position: 'absolute', left: 0, width: pos * W, top: 0, bottom: 0, borderRadius: 14, background: 'rgba(243,239,231,.55)'}} />
          <div style={{position: 'absolute', left: pos * W - 13, top: -6, width: 26, height: 26, borderRadius: 26, background: '#fff', boxShadow: '0 0 20px rgba(255,255,255,.8)'}} />
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 18, fontFamily: FONT, fontSize: 22, color: C.faint}}>
          <span>剧情</span>
          <span style={{marginLeft: -300, color: C.clayHi}}>片头</span>
          <span style={{marginRight: 20, color: C.clayHi}}>片尾 · 彩蛋保留</span>
        </div>
      </div>
    </>
  );
};

const G6Audio: React.FC = () => {
  const f = useCurrentFrame();
  const bands = ['60', '230', '910', '3.6k', '14k'];
  const presets = ['对白', '夜间', '音乐', '自定义'];
  const pi = Math.min(3, Math.floor(io(f, 10, 110, 0, 3.99, (t) => t)));
  const targets = [
    [0.35, 0.55, 0.85, 0.75, 0.4],
    [0.3, 0.45, 0.6, 0.5, 0.3],
    [0.8, 0.6, 0.45, 0.6, 0.75],
    [0.6, 0.7, 0.5, 0.8, 0.65],
  ];
  return (
    <>
      <div style={{position: 'absolute', left: 90, top: 40, width: 680, height: 420, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
        {bands.map((b, i) => {
          const prev = targets[Math.max(0, pi - 1)][i];
          const tgt = targets[pi][i];
          const segStart = 10 + pi * 25;
          const v = pi === 0 ? tgt * io(f, 4, 30) : prev + (tgt - prev) * io(f, segStart, segStart + 16);
          const wob = 0.03 * Math.sin(f * 0.3 + i);
          const h = 380 * Math.max(0.05, v + wob);
          return (
            <div key={b} style={{width: 92, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              <div style={{position: 'relative', width: 14, height: 380, borderRadius: 14, background: 'rgba(243,239,231,.1)'}}>
                <div style={{position: 'absolute', bottom: 0, width: 14, height: h, borderRadius: 14, background: `linear-gradient(0deg, #7E9BEA, ${C.clayHi})`}} />
                <div style={{position: 'absolute', bottom: h - 22, left: -15, width: 44, height: 44, borderRadius: 44, background: C.cream, boxShadow: '0 6px 20px rgba(0,0,0,.5)'}} />
              </div>
              <div style={{fontFamily: FONT, fontSize: 22, color: C.faint, marginTop: 20}}>{b}</div>
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 0, top: 520, width: 860, display: 'flex', gap: 14, justifyContent: 'center'}}>
        {presets.map((t, i) => (
          <Chip key={t} p={io(f, 6 + i * 4, 28 + i * 4)} hot={i === pi} style={{fontSize: 26}}>
            {t}
          </Chip>
        ))}
      </div>
      <div style={{position: 'absolute', left: 0, top: 610, width: 860, textAlign: 'center', fontFamily: FONT, fontWeight: 500, fontSize: 24, letterSpacing: 3, color: C.faint, opacity: io(f, 30, 54)}}>
        MPV · GPU NEXT · VULKAN · HDR · ANIME4K
      </div>
    </>
  );
};

export const Features: React.FC = () => {
  const f = useCurrentFrame();
  const cards: [string, string[], React.ReactNode][] = [
    ['双播放内核', ['Exo / Media3 与 MPV 自由切换', '音视频与字幕轨道 · 清晰度 · 倍速'], <G1Cores />],
    ['开播即知规格', ['分辨率 · 编码 · 动态范围 · 声道', '明确的年龄分级，一枚胶囊看全'], <G2Capsule />],
    ['AI 实时字幕', ['本地实时语音识别 · 七种语言', '双语或仅译文显示'], <G3Subs />],
    ['弹幕，随你调', ['来源弹幕 · 自定义 API · 自动匹配', '字号 · 透明度 · 速度 · 密度'], <G4Danmaku />],
    ['片头片尾，一键跳过', ['TheIntroDB · IntroDB · TheOtherDB', '保留片头前剧情与片尾彩蛋'], <G5Skip />],
    ['听得清，看得真', ['五段 EQ · 中置增强 · 响度归一化', '对白 / 夜间 / 音乐预设'], <G6Audio />],
  ];
  return (
    <AbsoluteFill>
      <Ambient warm={0.9 + 0.3 * Math.max(0, Math.cos((f / 30) * Math.PI * 2))} cool={0.9} />
      <Particles seed="feat" count={50} opacity={0.5} />
      {cards.map(([t, s, g], i) => (
        <Sequence key={i} from={i * 120} durationInFrames={120} layout="none">
          <Card n={i + 1} title={t} sub={s}>
            {g}
          </Card>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5 · Devices (2400 – 2640)                                           */
/* ================================================================== */
export const Devices: React.FC = () => {
  const f = useCurrentFrame();
  const zoom = 1 + io(f, 0, 240, 0, 0.06, (t) => t);
  const exit = useExit(240, 18);
  const tv = {x: 960, y: 610};
  const phone = {x: 380, y: 660};
  const laptop = {x: 1540, y: 660};
  const link = (from: {x: number; y: number}, to: {x: number; y: number}, delay: number, label: string, ly: number) => {
    const p = io(f, delay, delay + 50);
    const mx = (from.x + to.x) / 2;
    const path = `M${from.x},${from.y} Q${mx},${ly} ${to.x},${to.y}`;
    return (
      <g key={label} opacity={p}>
        <path d={path} stroke="rgba(243,239,231,.28)" strokeWidth={2.5} fill="none" strokeDasharray="8 12" strokeDashoffset={-f * 1.2} />
        {[0, 0.33, 0.66].map((o) => {
          const t = ((f / 70 + o) % 1);
          const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * mx + t * t * to.x;
          const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * ly + t * t * to.y;
          return <circle key={o} cx={x} cy={y} r={7} fill={C.clayHi} opacity={Math.sin(t * Math.PI)} style={{filter: 'drop-shadow(0 0 8px rgba(226,122,92,.9))'}} />;
        })}
      </g>
    );
  };
  const labels = [
    {x: 640, y: 470, t: 'DLNA 投放', d: 40},
    {x: 1290, y: 470, t: 'Syncplay 一起看', d: 56},
    {x: 640, y: 860, t: '局域网推送', d: 72},
    {x: 1290, y: 860, t: 'WebDAV 同步', d: 88},
  ];
  return (
    <AbsoluteFill style={exit}>
      <Ambient warm={0.6} cool={1.2} />
      <Particles seed="dev" count={60} opacity={0.7} />
      <AbsoluteFill style={{transform: `scale(${zoom})`}}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          {link(phone, tv, 30, 'a', 470)}
          {link(tv, laptop, 46, 'b', 470)}
          {link(phone, tv, 62, 'c', 860)}
          {link(tv, laptop, 78, 'd', 860)}
        </svg>
        <div style={{position: 'absolute', left: tv.x - 300, top: tv.y - 169, opacity: io(f, 0, 40), transform: `translateY(${(1 - io(f, 0, 50)) * 40}px)`}}>
          <Screen src="shots/home.png" w={600} glare={io(f, 20, 200, -40, 160)} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: phone.x - 85,
            top: phone.y - 170,
            width: 170,
            height: 340,
            borderRadius: 34,
            background: 'linear-gradient(160deg,#1d1b19,#121110)',
            boxShadow: 'inset 0 0 0 2px rgba(243,239,231,.25), 0 30px 80px rgba(0,0,0,.6)',
            opacity: io(f, 14, 50),
            transform: `translateY(${(1 - io(f, 14, 60)) * 40}px)`,
            overflow: 'hidden',
          }}
        >
          <div style={{margin: '40px 18px 0', height: 76, borderRadius: 14, background: 'linear-gradient(135deg,#2d3a66,#5a3a4a)'}} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{margin: '14px 18px 0', height: 18, width: 134 - (i % 2) * 40, borderRadius: 9, background: 'rgba(243,239,231,.14)'}} />
          ))}
          <div style={{margin: '26px auto 0', width: 72, height: 72, borderRadius: 72, background: C.clay, boxShadow: '0 0 30px rgba(199,91,63,.7)'}} />
        </div>
        <div style={{position: 'absolute', left: laptop.x - 190, top: laptop.y - 130, opacity: io(f, 22, 56), transform: `translateY(${(1 - io(f, 22, 66)) * 40}px)`}}>
          <div style={{width: 380, height: 238, borderRadius: 16, background: '#121110', boxShadow: 'inset 0 0 0 2px rgba(243,239,231,.25), 0 30px 80px rgba(0,0,0,.6)', overflow: 'hidden', padding: 16, boxSizing: 'border-box'}}>
            <div style={{display: 'flex', gap: 10}}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{flex: 1, height: 120, borderRadius: 10, background: ['linear-gradient(160deg,#2b3b6e,#151b33)', 'linear-gradient(160deg,#2e5a4f,#14241f)', 'linear-gradient(160deg,#6a3a44,#26161a)'][i]}} />
              ))}
            </div>
            <div style={{marginTop: 16, height: 16, width: 220, borderRadius: 8, background: 'rgba(243,239,231,.16)'}} />
            <div style={{marginTop: 10, height: 16, width: 150, borderRadius: 8, background: 'rgba(243,239,231,.1)'}} />
          </div>
          <div style={{width: 460, height: 16, marginLeft: -40, borderRadius: '0 0 16px 16px', background: '#24221f', boxShadow: 'inset 0 2px 0 rgba(243,239,231,.2)'}} />
        </div>
        {labels.map((l) => (
          <div key={l.t} style={{position: 'absolute', left: l.x - 160, top: l.y - 26, width: 320, display: 'flex', justifyContent: 'center'}}>
            <Chip p={io(f, l.d, l.d + 30)} style={{fontSize: 26, background: 'rgba(20,18,16,.7)'}}>
              {l.t}
            </Chip>
          </div>
        ))}
      </AbsoluteFill>
      <div style={{position: 'absolute', top: 120, width: '100%', textAlign: 'center'}}>
        <div style={{...H1, fontSize: 84}}>
          <Chars text="每一块屏，都连在一起" start={6} stagger={3} />
        </div>
        <Line start={36} style={{...SUB, marginTop: 8}}>
          手机推送、电脑控制、多台设备同步进度
        </Line>
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6 · Live / Sources / Themes  (2640 – 3480)                          */
/* ================================================================== */
const SideShot: React.FC<{src: string; side: 'left' | 'right'; dur: number}> = ({src, side, dur}) => {
  const f = useCurrentFrame();
  const enter = io(f, 0, 60);
  const sgn = side === 'left' ? 1 : -1;
  const rotY = sgn * (24 - 8 * enter - io(f, 0, dur, 0, 7, INOUT));
  return (
    <AbsoluteFill style={{perspective: 2200, perspectiveOrigin: side === 'left' ? '70% 50%' : '30% 50%'}}>
      <div
        style={{
          position: 'absolute',
          left: side === 'left' ? 60 : 720,
          top: 240,
          transformStyle: 'preserve-3d',
          transform: `translateX(${(1 - enter) * -sgn * 380}px) rotateY(${rotY}deg) rotateX(4deg)`,
          opacity: enter,
          filter: enter < 1 ? `blur(${(1 - enter) * 16}px)` : undefined,
        }}
      >
        <Screen src={src} w={1140} glare={io(f, 20, dur, -40, 170, INOUT)} />
        <Reflection>
          <Screen src={src} w={1140} />
        </Reflection>
      </div>
    </AbsoluteFill>
  );
};

const SideText: React.FC<{x: number; kicker: string; title: string; sub: string[]; chips?: string[]}> = ({x, kicker, title, sub, chips}) => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: x, top: 340, width: 660}}>
      <Kicker start={16}>{kicker}</Kicker>
      <div style={{...H1, fontSize: 104, marginTop: 24}}>
        <Chars text={title} start={22} stagger={3} />
      </div>
      {sub.map((s, i) => (
        <Line key={i} start={48 + i * 8} style={{...SUB, marginTop: i ? 0 : 22}}>
          {s}
        </Line>
      ))}
      {chips ? (
        <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 34}}>
          {chips.map((c, i) => (
            <Chip key={c} p={io(f, 70 + i * 6, 96 + i * 6)} style={{fontSize: 24, padding: '9px 20px'}}>
              {c}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const THEMES: {src: string; color: string; name: string}[] = [
  {src: 'theme-0', color: '#5C7CFA', name: '星际蓝'},
  {src: 'theme-1', color: '#7C6CF2', name: '跟随壁纸'},
  {src: 'theme-2', color: '#FB7299', name: 'B站粉'},
  {src: 'theme-3', color: '#27B07A', name: '翡翠绿'},
  {src: 'theme-4', color: '#F2A93B', name: '琥珀金'},
  {src: 'theme-5', color: '#A86CF0', name: '暮光紫'},
  {src: 'theme-6', color: '#E5533D', name: '赤焰红'},
  {src: 'modes-light', color: '#F3EFE7', name: '浅色'},
  {src: 'cards-light', color: '#F3EFE7', name: '浅色'},
];
const Themes: React.FC = () => {
  const f = useCurrentFrame();
  const STEP = 36;
  const t0 = 34;
  const k = Math.max(0, Math.min(THEMES.length - 1, Math.floor((f - t0) / STEP) + 1));
  const local = f - t0 - (k - 1) * STEP;
  const r = k === 0 ? 0 : io(local, 0, 26, 0, 1, INOUT);
  const enter = io(f, 0, 50);
  const exit = useExit(360, 24);
  const W = 1120;
  const H = (W * 9) / 16;
  const cx = 0.3 * W;
  const cy = 0.92 * H;
  const radius = r * 1.25 * W;
  const prev = THEMES[Math.max(0, k - 1)];
  const cur = THEMES[k];
  const glowColor = k > 0 ? cur.color : THEMES[0].color;
  return (
    <AbsoluteFill style={exit}>
      <Ambient warm={0.5} cool={0.7} />
      <AbsoluteFill style={{background: `radial-gradient(60% 55% at 50% 62%, ${glowColor}40 0%, ${glowColor}00 70%)`}} />
      <div style={{position: 'absolute', left: 960 - W / 2, top: 330, transform: `scale(${0.86 + 0.14 * enter}) translateY(${(1 - enter) * 60}px)`, opacity: enter}}>
        <div style={{position: 'relative', width: W, height: H}}>
          <Screen src={`shots/${(k === 0 ? cur : prev).src}.png`} w={W} glare={io(f, 0, 360, -60, 180, (t) => t)}>
            {k > 0 ? (
              <>
                <Img
                  src={staticFile(`shots/${cur.src}.png`)}
                  style={{position: 'absolute', inset: 0, width: '100%', height: '100%', clipPath: `circle(${radius}px at ${cx}px ${cy}px)`}}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: cx - radius,
                    top: cy - radius,
                    width: radius * 2,
                    height: radius * 2,
                    borderRadius: '50%',
                    boxShadow: `0 0 0 ${4 * (1 - r) + 1}px ${cur.color}, 0 0 60px ${cur.color}`,
                    opacity: 1 - r,
                  }}
                />
              </>
            ) : null}
          </Screen>
        </div>
      </div>
      <div style={{position: 'absolute', top: 100, width: '100%', textAlign: 'center'}}>
        <div style={{...H1, fontSize: 80}}>
          <Chars text="换一种色彩，换一种心情" start={8} stagger={2} />
        </div>
        <Line start={30} style={{...SUB, marginTop: 6}}>
          深色 · 浅色 · 跟随系统 · 多种主题色 · 跟随海报的内容氛围
        </Line>
      </div>
      <div style={{position: 'absolute', top: 980, width: '100%', display: 'flex', justifyContent: 'center', gap: 18}}>
        {THEMES.slice(0, 7).map((t, i) => {
          const on = k === i || (i === 0 && k === 0);
          return (
            <div
              key={t.src}
              style={{
                width: on ? 46 : 26,
                height: 26,
                borderRadius: 26,
                background: t.color,
                opacity: io(f, 20 + i * 4, 40 + i * 4) * (on ? 1 : 0.55),
                boxShadow: on ? `0 0 24px ${t.color}` : 'none',
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Showcase: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={240}>
        <AbsoluteFill style={{opacity: 1 - io(f, 222, 240, 0, 1, IN)}}>
          <Ambient plate="plates/live.jpg" plateOpacity={0.3} warm={0.8} />
          <SideShot src="shots/live.png" side="left" dur={240} />
          <SideText
            x={1240}
            kicker="直播"
            title="直播与时移"
            sub={['频道分组 · EPG 节目表 · 线路切换', '节目回看 · 时移时间轴 · 返回直播']}
            chips={['M3U', 'TXT', 'JSON', 'catchup']}
          />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={240} durationInFrames={240}>
        <AbsoluteFill style={{opacity: 1 - io(f, 462, 480, 0, 1, IN)}}>
          <Ambient plate="plates/login.jpg" plateOpacity={0.3} warm={1} />
          <SideShot src="shots/login.png" side="right" dur={240} />
          <SideText
            x={130}
            kicker="来源扩展"
            title="来源，自由组合"
            sub={['新旧源 API 兼容 · 内置 WASM 解释器', '输入 · 密码 · 列表 · 二维码登录交互']}
            chips={['Java JAR', 'QuickJS', 'Python', 'WASM']}
          />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={480} durationInFrames={360}>
        <Themes />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7 · Outro (3480 – 3840)                                             */
/* ================================================================== */
export const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const fade = io(f, 290, 360, 0, 1, INOUT);
  return (
    <AbsoluteFill style={{opacity: 1 - fade}}>
      <Ambient warm={1.1} cool={0.7} />
      <Particles seed="outro" count={80} />
      <AbsoluteFill style={{alignItems: 'center', transform: `scale(${1.04 - 0.04 * io(f, 0, 300, 0, 1, (t) => t)})`}}>
        <div style={{marginTop: 150}}>
          <Logo size={190} start={4} />
        </div>
        <div style={{...H1, fontSize: 108, letterSpacing: 6, marginTop: 44}}>
          <Chars text="TV" start={30} stagger={4} />
          <Chars text=" · " start={38} style={{color: C.clay}} />
          <Chars text="JetStream" start={44} stagger={3} style={{fontWeight: 500}} />
        </div>
        <div style={{...H1, fontSize: 58, fontWeight: 500, marginTop: 22, color: C.cream}}>
          <Chars text="下一部好戏，现在开始。" start={72} stagger={3} />
        </div>
        <div style={{display: 'flex', gap: 14, marginTop: 44}}>
          {['Android TV', '电视盒子', 'Android 7.0+', 'ARM64 · ARMv7', '开源 GPL-3.0'].map((t, i) => (
            <Chip key={t} p={io(f, 100 + i * 6, 126 + i * 6)} style={{fontSize: 24, padding: '9px 22px'}}>
              {t}
            </Chip>
          ))}
        </div>
        <div style={{marginTop: 40, opacity: io(f, 130, 160), transform: `translateY(${(1 - io(f, 130, 166)) * 20}px)`}}>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 40,
              letterSpacing: 2,
              color: '#1a1311',
              background: C.cream,
              padding: '16px 44px',
              borderRadius: 999,
              boxShadow: '0 16px 60px rgba(199,91,63,.45)',
            }}
          >
            github.com/wobuhui666/TV
          </div>
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          bottom: 46,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONT,
          fontSize: 19,
          lineHeight: 1.7,
          color: 'rgba(243,239,231,.4)',
          opacity: io(f, 150, 190),
        }}
      >
        界面画面为 GitHub Actions 模拟器实录，使用演示片库与演示数据 · 演示影片片段见仓库 docs/media/CREDITS.md（含 Sintel © Blender Foundation，CC BY 3.0）
        <br />
        应用为播放与配置工具，不提供影视资源 · 原创合成配乐 · 字体 MiSans
      </div>
    </AbsoluteFill>
  );
};
