import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Ambient, C, Chars, Chip, EXPO, FONT, IN, INOUT, Kicker, Line, Logo, Particles, io, life} from './lib';
import assets from './assets.json';

/* ------------------------------------------------------------------ */
/* asset helpers                                                       */
/* ------------------------------------------------------------------ */
type ClipMeta = {duration: number; marks: {t: number; label: string}[]};
const CLIPS = (assets as any).clips as Record<string, ClipMeta>;
const SHOTS = (assets as any).shots as string[];
const FILMS = (assets as any).films as string[];
const POSTERS = (assets as any).posters as string[];

export const hasClip = (n: string) => !!CLIPS[n];
export const mark = (clip: string, label: string, fallback = 0) => {
  const m = CLIPS[clip]?.marks.find((x) => x.label === label);
  return m ? m.t : fallback;
};
const shot = (n: string, fb?: string) => (SHOTS.includes(n) ? `shots/${n}.png` : fb ? `shots/${fb}.png` : `shots/${SHOTS[0]}.png`);

/** A real capture: clip (sec offset) if present, otherwise a still with slow push-in. */
export const Footage: React.FC<{clip?: string; from?: number; still?: string; rate?: number; style?: React.CSSProperties}> = ({
  clip,
  from = 0,
  still,
  rate = 1,
  style,
}) => {
  const f = useCurrentFrame();
  const s: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style};
  if (clip && hasClip(clip)) {
    const max = Math.max(0, CLIPS[clip].duration - 0.5);
    return <OffthreadVideo src={staticFile(`clips/${clip}.mp4`)} startFrom={Math.round(Math.min(from, max) * 60)} playbackRate={rate} muted style={s} />;
  }
  return <Img src={staticFile(shot(still || clip || ''))} style={{...s, transform: `scale(${1.02 + f / 6000})`}} />;
};

export const Film: React.FC<{name: string; from?: number; style?: React.CSSProperties}> = ({name, from = 0, style}) => {
  const n = FILMS.includes(name) ? name : FILMS[0];
  return (
    <OffthreadVideo
      src={staticFile(`films/${n}.mp4`)}
      startFrom={Math.round(from * 60)}
      muted
      style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style}}
    />
  );
};

const H1: React.CSSProperties = {fontFamily: FONT, fontWeight: 600, color: C.cream, letterSpacing: 2, lineHeight: 1.12};
const SUB: React.CSSProperties = {fontFamily: FONT, fontWeight: 400, color: C.dim, fontSize: 32, lineHeight: 1.6, letterSpacing: 1};

/* TV panel with bezel, glare and reflection */
const Panel: React.FC<{w: number; children: React.ReactNode; glare?: number; reflect?: boolean; radius?: number}> = ({
  w,
  children,
  glare = -100,
  reflect = true,
  radius,
}) => {
  const h = (w * 9) / 16;
  const r = radius ?? w * 0.016;
  const body = (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        overflow: 'hidden',
        position: 'relative',
        background: '#000',
        boxShadow: `0 ${w * 0.035}px ${w * 0.09}px rgba(0,0,0,.7), 0 0 0 ${Math.max(1.5, w / 700)}px rgba(243,239,231,.16)`,
      }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(112deg, transparent ${glare - 16}%, rgba(255,255,255,.07) ${glare}%, transparent ${glare + 16}%)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
  return (
    <div style={{position: 'relative', width: w, height: h}}>
      {body}
      {reflect ? (
        <div
          style={{
            position: 'absolute',
            top: h + 14,
            left: 0,
            width: w,
            height: h,
            transform: 'scaleY(-1)',
            opacity: 0.2,
            overflow: 'hidden',
            borderRadius: r,
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,0) 32%)',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,0) 32%)',
            filter: 'blur(2px)',
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
};

const useExit = (dur: number, len = 22) => {
  const f = useCurrentFrame();
  const p = io(f, dur - len, dur, 0, 1, IN);
  return {opacity: 1 - p, transform: `scale(${1 + p * 0.05})`, filter: p > 0.001 ? `blur(${p * 14}px)` : undefined} as React.CSSProperties;
};

/* ================================================================== */
/* 1 · Intro 0–480                                                     */
/* ================================================================== */
export const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const flare = io(f, 30, 150);
  const lift = io(f, 205, 265);
  const exit = io(f, 448, 480, 0, 1, IN);
  // poster rain behind the logo (real posters captured from the app)
  return (
    <AbsoluteFill>
      <Ambient warm={io(f, 0, 220)} cool={io(f, 80, 300) * 0.8} />
      <AbsoluteFill style={{opacity: 0.22 * io(f, 120, 300) * (1 - exit), filter: 'blur(1.5px)'}}>
        {POSTERS.slice(0, 18).map((p, i) => {
          const col = i % 9;
          const row = Math.floor(i / 9);
          const sp = 0.35 + (col % 3) * 0.12;
          const y = -380 + row * 640 + ((f * sp + col * 140) % 1300) - 200;
          return (
            <Img
              key={p + i}
              src={staticFile(p)}
              style={{position: 'absolute', left: col * 218 - 20, top: y, width: 190, height: 285, objectFit: 'cover', borderRadius: 14}}
            />
          );
        })}
        <AbsoluteFill style={{background: 'radial-gradient(60% 60% at 50% 50%, rgba(10,9,8,.2), rgba(10,9,8,.95) 80%)'}} />
      </AbsoluteFill>
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
          <div style={{...SUB, fontSize: 40, marginTop: 26, letterSpacing: 6}}>
            <Chars text="让大屏回归内容，让遥控器操作更顺手。" start={318} stagger={2} dur={34} rise={0.4} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2 · Hero 480–960 : real home screen in a floating TV                */
/* ================================================================== */
export const Hero: React.FC = () => {
  const f = useCurrentFrame();
  const enter = io(f, 0, 80);
  const push = io(f, 250, 420, 0, 1, INOUT);
  const rotY = interpolate(enter, [0, 1], [-38, -16]) * (1 - push);
  const w = interpolate(push, [0, 1], [1180, 1920]);
  const x = interpolate(push, [0, 1], [700 + (1 - enter) * 300, 0]);
  const y = interpolate(push, [0, 1], [250, 0]);
  const textOut = io(f, 232, 262, 0, 1, IN);
  return (
    <AbsoluteFill>
      <Ambient warm={0.8} cool={1} />
      <Particles seed="hero" count={40} opacity={0.6 * (1 - push)} />
      <AbsoluteFill style={{perspective: 2400, perspectiveOrigin: '30% 50%'}}>
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y,
            transformStyle: 'preserve-3d',
            transform: `rotateY(${rotY}deg) rotateX(${4 * (1 - push)}deg)`,
            opacity: enter,
            filter: enter < 1 ? `blur(${(1 - enter) * 16}px)` : undefined,
          }}
        >
          <Panel w={w} glare={io(f, 40, 240, -40, 160, INOUT)} reflect={push < 0.5} radius={interpolate(push, [0, 1], [19, 0])}>
            <Footage clip="home" from={mark('home', 'start', 0.3)} still="home-hero" />
          </Panel>
        </div>
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 130, top: 360, width: 600, opacity: 1 - textOut, transform: `translateX(${-textOut * 60}px)`}}>
        <Kicker start={18}>JETSTREAM 大屏界面</Kicker>
        <div style={{...H1, fontSize: 124, marginTop: 26}}>
          <Chars text="为大屏而生" start={28} stagger={4} />
        </div>
        <Line start={64} style={{...SUB, marginTop: 22}}>
          原生 Compose 界面 · 遥控焦点
        </Line>
        <Line start={72} style={SUB}>
          海报、Tab、侧栏，处处是过渡动画
        </Line>
      </div>
      {/* lower third once full screen */}
      <div
        style={{
          position: 'absolute',
          left: 90,
          bottom: 80,
          opacity: life(f, 400, 430, 462, 480),
          padding: '18px 30px',
          borderRadius: 20,
          background: 'rgba(12,11,10,.55)',
          backdropFilter: 'blur(18px)',
          boxShadow: 'inset 0 0 0 1.5px rgba(243,239,231,.14)',
        }}
      >
        <div style={{...H1, fontSize: 44}}>
          <Chars text="TMDB 编辑推荐 · 主视觉轮播" start={404} stagger={1} dur={22} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3 · Browse 960–1680 : three real screens                            */
/* ================================================================== */
const BEATS = [
  {clip: 'home', from: () => mark('home', 'down-row0', 9), still: 'home-row', kicker: '首页与推荐', title: '一眼，好片', sub: '国产电影 · 剧集 · 今日热门趋势，分类海报墙一屏看全'},
  {clip: 'detail', from: () => mark('detail', 'open', 0.2) + 0.6, still: 'detail', kicker: '媒体库详情', title: '沉浸式详情页', sub: '沉浸背景 · 演职员 · 季集与剧照 · 一键追剧'},
  {clip: 'tab-calendar', from: () => 0.4, still: 'calendar', kicker: '追更日历', title: '不错过每一集', sub: '剧集、动漫、综艺每日排期 · 前后周切换 · 我的追更'},
];
export const Browse: React.FC = () => {
  const f = useCurrentFrame();
  const exit = useExit(720, 20);
  return (
    <AbsoluteFill style={exit}>
      <Ambient warm={0.7} cool={1.1} />
      {BEATS.map((b, i) => {
        const s = i * 240;
        const local = f - s;
        if (local < -30 || local > 260) return null;
        const inP = io(local, -24, 26, 0, 1, EXPO);
        const outP = i === 2 ? 0 : io(local, 222, 258, 0, 1, INOUT);
        const side = i % 2 === 0 ? 1 : -1;
        return (
          <AbsoluteFill key={i} style={{perspective: 2200}}>
            <div
              style={{
                position: 'absolute',
                left: side > 0 ? 620 : 120,
                top: 170,
                transformStyle: 'preserve-3d',
                transform: `translateX(${(1 - inP) * side * 900 - outP * side * 1100}px) rotateY(${side * (-14 + 10 * inP) + outP * side * 30}deg) scale(${0.94 + 0.06 * inP})`,
                opacity: Math.min(1, inP * 1.4) * (1 - outP * 0.9),
              }}
            >
              <Panel w={1180} glare={io(local, 0, 240, -50, 170, INOUT)}>
                <Sequence from={s - 30} layout="none">
                  <Footage clip={b.clip} from={b.from()} still={b.still} />
                </Sequence>
              </Panel>
            </div>
            <div
              style={{
                position: 'absolute',
                left: side > 0 ? 130 : 1370,
                top: 380,
                width: 440,
                opacity: life(local, 10, 40, 206, 230),
              }}
            >
              <Kicker start={s + 14} out={s + 206}>{b.kicker}</Kicker>
              <div style={{...H1, fontSize: 88, marginTop: 22}}>
                <Chars text={b.title} start={s + 20} stagger={3} out={i === 2 ? undefined : s + 204} />
              </div>
              <Line start={s + 40} out={i === 2 ? undefined : s + 204} style={{...SUB, fontSize: 30, marginTop: 18}}>
                {b.sub}
              </Line>
            </div>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4 · Cinema 1680–2640                                                */
/* ================================================================== */
const Callout: React.FC<{start: number; end: number; n: string; title: string; sub: string; x?: number; y?: number}> = ({
  start,
  end,
  n,
  title,
  sub,
  x = 120,
  y = 720,
}) => {
  const f = useCurrentFrame();
  const o = life(f, start, start + 24, end - 18, end);
  if (o <= 0) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: o, transform: `translateY(${(1 - io(f, start, start + 30)) * 30}px)`}}>
      <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 24, letterSpacing: 6, color: C.clayHi}}>{n}</div>
      <div style={{...H1, fontSize: 86, marginTop: 8, textShadow: '0 6px 40px rgba(0,0,0,.6)'}}>
        <Chars text={title} start={start + 2} stagger={2} dur={24} />
      </div>
      <div style={{...SUB, fontSize: 30, color: 'rgba(243,239,231,.8)', textShadow: '0 4px 20px rgba(0,0,0,.8)'}}>
        <Chars text={sub} start={start + 12} stagger={0.6} dur={20} rise={0.3} blur={6} />
      </div>
    </div>
  );
};

const Letterbox: React.FC<{p: number}> = ({p}) => (
  <>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 120 * p, background: '#000'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 * p, background: '#000'}} />
  </>
);

const Spec: React.FC<{start: number}> = ({start}) => {
  const f = useCurrentFrame();
  const items = ['1080p', 'H.264', 'SDR', '立体声', '全年龄'];
  const open = io(f, start, start + 30);
  return (
    <div
      style={{
        position: 'absolute',
        left: 120,
        top: 150,
        height: 62,
        borderRadius: 62,
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        background: 'rgba(20,18,16,.6)',
        backdropFilter: 'blur(14px)',
        boxShadow: 'inset 0 0 0 1.5px rgba(243,239,231,.22), 0 12px 40px rgba(0,0,0,.4)',
        overflow: 'hidden',
        maxWidth: 80 + open * 720,
        opacity: io(f, start - 6, start + 6),
      }}
    >
      {items.map((t, i) => {
        const p = io(f, start + 10 + i * 6, start + 30 + i * 6);
        return (
          <div
            key={t}
            style={{
              fontFamily: FONT,
              fontWeight: i === 0 ? 600 : 500,
              fontSize: 28,
              color: i === 4 ? '#1a1311' : C.cream,
              background: i === 4 ? C.gold : 'transparent',
              borderRadius: 40,
              padding: i === 4 ? '4px 16px' : '0 18px',
              margin: i === 4 ? '0 6px' : 0,
              opacity: p,
              transform: `translateY(${(1 - p) * 18}px)`,
              whiteSpace: 'nowrap',
              borderLeft: i > 0 && i < 4 ? '1.5px solid rgba(243,239,231,.2)' : 'none',
            }}
          >
            {t}
          </div>
        );
      })}
    </div>
  );
};

const SkipBar: React.FC<{start: number}> = ({start}) => {
  const f = useCurrentFrame() - start;
  const W = 760;
  const a = 0.06,
    b = 0.16;
  const jump = io(f, 50, 64);
  const pos = f < 50 ? io(f, 0, 50, 0.02, a, (t) => t) : a + (b - a) * jump + io(f, 64, 140, 0, 0.04, (t) => t);
  const hot = io(f, 34, 42) * (1 - io(f, 60, 74));
  return (
    <div style={{position: 'absolute', right: 120, bottom: 330, width: W, opacity: io(f, 0, 16)}}>
      <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: 26}}>
        <div
          style={{
            padding: '14px 30px',
            borderRadius: 999,
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 30,
            color: hot > 0.5 ? '#1a1311' : C.cream,
            background: `rgba(243,239,231,${0.14 + 0.86 * hot})`,
            boxShadow: `0 0 ${50 * hot}px rgba(226,122,92,.8), inset 0 0 0 1.5px rgba(243,239,231,.3)`,
            backdropFilter: 'blur(12px)',
          }}
        >
          {f < 60 ? '跳过片头  ⏭' : '已跳过片头 ✓'}
        </div>
      </div>
      <div style={{position: 'relative', height: 12, borderRadius: 12, background: 'rgba(243,239,231,.2)'}}>
        <div style={{position: 'absolute', left: a * W, width: (b - a) * W, top: 0, bottom: 0, borderRadius: 12, background: C.clay, boxShadow: '0 0 20px rgba(199,91,63,.8)'}} />
        <div style={{position: 'absolute', left: 0.92 * W, width: 0.06 * W, top: 0, bottom: 0, borderRadius: 12, background: C.clay, opacity: 0.85}} />
        <div style={{position: 'absolute', left: 0, width: pos * W, top: 0, bottom: 0, borderRadius: 12, background: 'rgba(243,239,231,.7)'}} />
        <div style={{position: 'absolute', left: pos * W - 12, top: -6, width: 24, height: 24, borderRadius: 24, background: '#fff', boxShadow: '0 0 18px rgba(255,255,255,.8)'}} />
      </div>
    </div>
  );
};

const Subtitle: React.FC<{start: number}> = ({start}) => {
  const f = useCurrentFrame() - start;
  const en = "I've been looking for you for so long.";
  const zh = '我找了你好久好久。';
  const nEn = Math.floor(io(f, 6, 46, 0, en.length, (t) => t));
  const nZh = Math.floor(io(f, 30, 60, 0, zh.length, (t) => t));
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 170, textAlign: 'center', opacity: io(f, 0, 10)}}>
      <div style={{fontFamily: FONT, fontWeight: 600, fontSize: 52, color: '#fff', textShadow: '0 0 3px #000, 0 3px 14px rgba(0,0,0,.9)'}}>{zh.slice(0, nZh)}&nbsp;</div>
      <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 34, color: 'rgba(255,255,255,.78)', marginTop: 6, textShadow: '0 0 3px #000, 0 2px 10px rgba(0,0,0,.9)'}}>
        {en.slice(0, nEn)}&nbsp;
      </div>
      <div style={{display: 'inline-flex', gap: 10, marginTop: 22}}>
        {['AI 实时识别', '七种语言', '双语显示'].map((t, i) => (
          <Chip key={t} p={io(f, 20 + i * 6, 40 + i * 6)} style={{fontSize: 22, padding: '8px 18px', background: 'rgba(20,18,16,.55)'}}>
            {t}
          </Chip>
        ))}
      </div>
    </div>
  );
};

export const Cinema: React.FC = () => {
  const f = useCurrentFrame();
  // 0-240: film full-bleed with letterbox; 240-480: real app playback w/ danmaku; 480-960: OSD + feature callouts
  const lb = io(f, 100, 140) * (1 - io(f, 220, 250));
  const appIn = io(f, 228, 262, 0, 1, INOUT);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {/* A0. real detail page of the demo title, push into the play button */}
      <Sequence from={0} durationInFrames={110} layout="none">
        <AbsoluteFill
          style={{
            transformOrigin: '82% 44%',
            transform: `scale(${1 + 1.6 * io(f, 40, 108, 0, 1, IN)})`,
            opacity: 1 - io(f, 92, 110),
            filter: f > 80 ? `blur(${io(f, 80, 110, 0, 10)}px)` : undefined,
          }}
        >
          <Footage clip="vod-detail" from={0.3} still="vod-0" />
        </AbsoluteFill>
      </Sequence>
      {/* A. cinematic film footage */}
      <Sequence from={96} durationInFrames={170} layout="none">
        <AbsoluteFill style={{transform: `scale(${1.1 - 0.08 * io(f, 96, 262, 0, 1, (t) => t)})`, opacity: io(f, 96, 116) * (1 - appIn)}}>
          <Film name="sintel" from={0} />
        </AbsoluteFill>
      </Sequence>
      <Letterbox p={lb} />
      <Callout start={8} end={84} n="演示片库 · 辛特尔" title="选好片，按下播放" sub="海报详情 · 播放来源 · 选集一目了然" x={120} y={830} />
      <Callout start={120} end={226} n="播放" title="影院级观感" sub="Exo / Media3 与 MPV 双内核 · 软硬解自由切换" y={700} />
      {/* B. real app playback with danmaku */}
      <Sequence from={228} durationInFrames={300} layout="none">
        <AbsoluteFill style={{opacity: appIn, transform: `scale(${1.06 - 0.06 * appIn})`}}>
          <Footage clip="player-live" from={mark('player-live', 'playing', 1) + 2} still="player-danmaku" />
        </AbsoluteFill>
      </Sequence>
      <Callout start={262} end={480} n="全屏播放" title="大屏，沉浸" sub="倍速 · 画面比例 · 章节 · 选集续播 · 弹幕可调" y={760} />
      {/* C. OSD and specs */}
      <Sequence from={480} durationInFrames={480} layout="none">
        <AbsoluteFill style={{opacity: io(f, 480, 506)}}>
          <Footage clip="player-osd" from={mark('player-osd', 'osd', 0.3)} still="player-osd" />
        </AbsoluteFill>
      </Sequence>
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(0,0,0,.65), rgba(0,0,0,0) 55%)', opacity: io(f, 490, 520)}} />
      <Sequence from={500} durationInFrames={150} layout="none">
        <Spec start={0} />
      </Sequence>
      <Callout start={500} end={650} n="规格胶囊" title="开播即知规格" sub="分辨率 · 编码 · 动态范围 · 声道 · 年龄分级" y={300} />
      <Callout start={650} end={800} n="字幕" title="AI 实时字幕" sub="本地语音识别 · 在线字幕搜索 · libass 样式" y={300} />
      <Sequence from={660} durationInFrames={140} layout="none">
        <Subtitle start={0} />
      </Sequence>
      <Callout start={800} end={960} n="片头片尾" title="一键跳过片头" sub="社区区间 · 保留片头前剧情与片尾彩蛋" y={300} />
      <Sequence from={806} durationInFrames={154} layout="none">
        <SkipBar start={0} />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5 · Live 2640–3000                                                  */
/* ================================================================== */
export const Live: React.FC = () => {
  const f = useCurrentFrame();
  const enter = io(f, 0, 50);
  const exit = useExit(360, 20);
  return (
    <AbsoluteFill style={exit}>
      <Ambient warm={0.8} cool={1.2} />
      <AbsoluteFill style={{perspective: 2200, perspectiveOrigin: '70% 50%'}}>
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: 190,
            transformStyle: 'preserve-3d',
            transform: `translateX(${(1 - enter) * -500}px) rotateY(${16 - 6 * enter - io(f, 0, 360, 0, 5, INOUT)}deg)`,
            opacity: enter,
          }}
        >
          <Panel w={1160} glare={io(f, 20, 340, -40, 170, INOUT)}>
            <Footage clip="live" from={mark('live', 'list', 3) - 0.6} still="live-list" />
          </Panel>
        </div>
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 1330, top: 330, width: 520}}>
        <Kicker start={16}>直播</Kicker>
        <div style={{...H1, fontSize: 100, marginTop: 22}}>
          <Chars text="直播与时移" start={22} stagger={3} />
        </div>
        <Line start={46} style={{...SUB, marginTop: 20}}>
          频道分组 · EPG 节目表
        </Line>
        <Line start={54} style={SUB}>
          线路切换 · 回看与时移
        </Line>
        <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 30}}>
          {['M3U', 'TXT', 'JSON', 'catchup'].map((c, i) => (
            <Chip key={c} p={io(f, 70 + i * 6, 96 + i * 6)} style={{fontSize: 24, padding: '9px 20px'}}>
              {c}
            </Chip>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6 · Wall 3000–3480 : library + themes + poster wall                 */
/* ================================================================== */
export const Wall: React.FC = () => {
  const f = useCurrentFrame();
  const exit = useExit(480, 24);
  const tiles = [
    {clip: 'library', still: 'library', from: 0.6},
    {clip: 'themes', still: 'theme-a', from: mark('themes', 'B站粉', 0.8)},
    {clip: '', still: 'light-home', from: 0},
    {clip: 'vod-detail', still: 'vod-0', from: 0.4},
    {clip: 'home', still: 'home-row', from: mark('home', 'down-row2', 19)},
    {clip: '', still: 'mine', from: 0},
  ];
  const zoom = io(f, 0, 480, 0, 1, INOUT);
  return (
    <AbsoluteFill style={exit}>
      <Ambient warm={0.6} cool={0.9} />
      <AbsoluteFill style={{perspective: 2600}}>
        <div
          style={{
            position: 'absolute',
            left: 960,
            top: 560,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${18 - 10 * zoom}deg) rotateZ(${-8 + 4 * zoom}deg) translateZ(${-600 + 380 * zoom}px)`,
          }}
        >
          {tiles.map((t, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const p = io(f, 6 + i * 8, 50 + i * 8);
            const x = (col - 1) * 820 - 380;
            const y = (row - 0.5) * 480 - 230;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y + (1 - p) * 200,
                  opacity: p,
                  transform: `translateZ(${(1 - p) * -400}px)`,
                }}
              >
                <Panel w={760} reflect={false}>
                  <Footage clip={t.clip} from={t.from} still={t.still} />
                </Panel>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(70% 60% at 50% 50%, rgba(10,9,8,0) 30%, rgba(10,9,8,.85) 100%)'}} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 360,
          height: 340,
          background: 'radial-gradient(50% 50% at 50% 50%, rgba(10,9,8,.88) 0%, rgba(10,9,8,.6) 55%, rgba(10,9,8,0) 100%)',
          opacity: io(f, 30, 70),
        }}
      />
      <div style={{position: 'absolute', top: 430, width: '100%', textAlign: 'center'}}>
        <div style={{...H1, fontSize: 104, textShadow: '0 10px 60px rgba(0,0,0,.9)'}}>
          <Chars text="一个应用，整个片库" start={40} stagger={3} />
        </div>
        <Line start={70} style={{...SUB, fontSize: 34, color: 'rgba(243,239,231,.85)'}}>
          点播 · 直播 · 搜索选源 · 多主题 · 多设备同步
        </Line>
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 7 · Outro 3480–3840                                                 */
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
        <div style={{...H1, fontSize: 58, fontWeight: 500, marginTop: 22}}>
          <Chars text="下一部好戏，现在开始。" start={72} stagger={3} />
        </div>
        <div style={{display: 'flex', gap: 14, marginTop: 44}}>
          {['Android TV', '电视盒子', 'ARM64 · ARMv7', '开源 GPL-3.0'].map((t, i) => (
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
          bottom: 40,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONT,
          fontSize: 19,
          lineHeight: 1.7,
          color: 'rgba(243,239,231,.42)',
          opacity: io(f, 150, 190),
        }}
      >
        界面为最新 Release（{(assets as any).release}）在 GitHub Actions 模拟器中实录 · 推荐海报与资料由应用内 TMDB 数据显示，版权归各自权利人
        <br />
        演示播放内容：Sintel · Tears of Steel · Big Buck Bunny · Spring · Caminandes 等 © Blender Foundation / Blender Studio（CC BY）· 应用不提供影视资源 · 原创合成配乐
      </div>
    </AbsoluteFill>
  );
};
