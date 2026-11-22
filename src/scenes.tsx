import React from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {AppIcon, EASE, Eyebrow, Film, Footage, H, IN, INOUT, K, OUT, RELEASE, Reveal, SANS, Stage, Sub, TV, io, mark} from './lib';

const glow = (n: string) => `glow/${n}.jpg`;

/* ================================================================== */
/* 1 · Intro  0–480                                                    */
/* ================================================================== */
export const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const show = io(f, 300, 400, 0, 1, OUT);
  const power = io(f, 372, 420, 0, 1, EASE);
  const cam = interpolate(f, [300, 480], [0.9, 1.0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: INOUT});
  return (
    <AbsoluteFill>
      <Stage light={io(f, 280, 420)} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
        <Reveal at={36} out={160}>
          <H size={150}>看电视。</H>
        </Reveal>
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
        <Reveal at={184} out={292}>
          <H size={150}>
            可以<span style={{backgroundImage: K.grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>更好看</span>。
          </H>
        </Reveal>
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{opacity: show, transform: `translateY(${(1 - show) * 70}px) scale(${cam})`}}>
          <TV w={1400} glow={glow('home-hero')} power={power}>
            {/* power-on bloom */}
            <AbsoluteFill style={{background: '#fff', opacity: io(f, 372, 380) * (1 - io(f, 380, 420))}} />
            <Sequence from={330} layout="none">
              <Footage clip="hero" from={mark('hero', 'start', 0.1)} still="home-hero" />
            </Sequence>
          </TV>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 2 · Wordmark 480–600                                                */
/* ================================================================== */
export const Wordmark: React.FC = () => {
  const f = useCurrentFrame();
  const track = interpolate(f, [0, 120], [0.06, -0.03], {extrapolateRight: 'clamp', easing: OUT});
  return (
    <AbsoluteFill style={{background: K.black, alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
      <Reveal at={2} dur={40} out={104}>
        <Eyebrow style={{fontSize: 40, marginBottom: 6, letterSpacing: '0.04em'}}>TV</Eyebrow>
        <H size={230} grad weight={700} style={{letterSpacing: `${track}em`, paddingBottom: 16}}>
          JetStream
        </H>
      </Reveal>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 3 · Showcase 600–1680 — one continuous device shot                  */
/* ================================================================== */
const BEATS = [
  {at: 0, clip: 'hero', from: () => mark('hero', 'start', 0.1) + 0.5, still: 'home-hero', eb: '全新 JetStream 界面', h: '为大屏而生。', sub: '原生 Compose 界面，遥控器的每一次按键都有回应。'},
  {at: 360, clip: 'rows', from: () => Math.max(0, mark('rows', 'down-row0', 0.6) - 0.3), still: 'home-row', eb: '首页', h: '好片，一眼就到。', sub: 'TMDB 编辑推荐 · 分类海报墙 · 继续观看'},
  {at: 600, clip: 'detail', from: () => mark('detail', 'open', 0.3) + 0.5, still: 'detail', eb: '详情', h: '每一部，都被认真介绍。', sub: '沉浸背景 · 演职员 · 剧照与季集'},
  {at: 840, clip: 'tab-calendar', from: () => 0.3, still: 'calendar', eb: '追更日历', h: '追剧，从不掉线。', sub: '剧集 · 动漫 · 综艺，每日排期一目了然'},
];
const GLOWS = ['home-hero', 'home-row', 'detail', 'calendar'];

export const Showcase: React.FC = () => {
  const f = useCurrentFrame();
  const W = 1240;
  const pull = io(f, 0, 150, 0, 1, INOUT);
  const s0 = 1920 / (W * 0.988);
  const scale = interpolate(pull, [0, 1], [s0, 1]);
  const ty = interpolate(pull, [0, 1], [0, 150]);
  const ry = interpolate(f, [0, 1080], [-5, 5]);
  const ex = io(f, 1060, 1080, 0, 1, EASE);
  return (
    <AbsoluteFill style={{opacity: 1 - ex}}>
      <Stage light={pull} />
      {/* ambient glow that follows the screen content */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        {BEATS.map((b, i) => {
          const o = io(f, b.at - 20, b.at + 10) * (i < BEATS.length - 1 ? 1 - io(f, BEATS[i + 1].at - 20, BEATS[i + 1].at + 10) : 1);
          return (
            <Img
              key={i}
              src={staticFile(glow(GLOWS[i]))}
              style={{
                position: 'absolute',
                width: W * 1.1,
                height: W * 0.62,
                top: 540 + ty - W * 0.31,
                objectFit: 'cover',
                filter: 'blur(90px) saturate(1.4)',
                opacity: 0.42 * o * pull,
              }}
            />
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', perspective: 2600}}>
        <div style={{transform: `translateY(${ty}px) scale(${scale}) rotateY(${ry * pull}deg)`}}>
          <TV w={W} reflection>
            {BEATS.map((b, i) => (
              <Sequence key={i} from={Math.max(0, b.at - 20)} durationInFrames={i < BEATS.length - 1 ? BEATS[i + 1].at - b.at + 40 : 2000} layout="none">
                <AbsoluteFill style={{opacity: i === 0 ? 1 : io(f, b.at - 20, b.at + 6, 0, 1, EASE), transform: `scale(${1.0 + 0.03 * io(f, b.at, b.at + 300, 0, 1, (t) => t)})`}}>
                  <Footage clip={b.clip} from={b.from()} still={b.still} />
                </AbsoluteFill>
              </Sequence>
            ))}
          </TV>
        </div>
      </AbsoluteFill>
      {BEATS.map((b, i) => {
        const start = i === 0 ? 130 : b.at + 14;
        const end = i < BEATS.length - 1 ? BEATS[i + 1].at - 22 : undefined;
        return (
          <div key={i} style={{position: 'absolute', top: 96, width: '100%', textAlign: 'center'}}>
            <Reveal at={start} out={end}>
              <Eyebrow>{b.eb}</Eyebrow>
              <H size={92}>{b.h}</H>
            </Reveal>
            <Reveal at={start + 10} out={end}>
              <Sub size={30} style={{marginTop: 14}}>
                {b.sub}
              </Sub>
            </Reveal>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 4 · Cinema 1680–2160                                                */
/* ================================================================== */
export const Cinema: React.FC = () => {
  const f = useCurrentFrame();
  const film = io(f, 0, 40, 0, 1, EASE) * (1 - io(f, 226, 240, 0, 1, EASE));
  const bars = 138;
  return (
    <AbsoluteFill style={{background: K.black}}>
      <Sequence from={0} durationInFrames={240} layout="none">
        <AbsoluteFill style={{opacity: film, transform: `scale(${1.06 - 0.05 * io(f, 0, 240, 0, 1, (t) => t)})`}}>
          <Film name="sintel" from={0.2} />
        </AbsoluteFill>
      </Sequence>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: bars, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: bars, background: '#000'}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: bars + 70, textAlign: 'center'}}>
        <Reveal at={44} out={120}>
          <H size={84} style={{textShadow: '0 4px 40px rgba(0,0,0,.5)'}}>影院级的观感，</H>
        </Reveal>
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: bars + 70, textAlign: 'center'}}>
        <Reveal at={130} out={214}>
          <H size={84} style={{textShadow: '0 4px 40px rgba(0,0,0,.5)'}}>就在你家客厅。</H>
        </Reveal>
      </AbsoluteFill>
      {/* the real player */}
      <Sequence from={240} durationInFrames={240} layout="none">
        <AbsoluteFill style={{opacity: io(f, 240, 262, 0, 1, EASE), transform: `scale(${1.0 + 0.04 * io(f, 240, 480, 0, 1, (t) => t)})`}}>
          <Footage still="player-ctrl" />
        </AbsoluteFill>
        <AbsoluteFill style={{background: 'linear-gradient(0deg, rgba(0,0,0,.78) 0%, rgba(0,0,0,0) 46%)'}} />
        <div style={{position: 'absolute', left: 120, bottom: 110}}>
          <Reveal at={276} out={460}>
            <Eyebrow>播放</Eyebrow>
            <H size={92}>Exo 与 MPV，双内核。</H>
          </Reveal>
          <Reveal at={286} out={460}>
            <Sub style={{marginTop: 14, color: 'rgba(245,245,247,.7)'}}>软硬解 · 倍速 · 画面比例 · 章节 · 选集续播</Sub>
          </Reveal>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 5 · Bento 2160–2400                                                 */
/* ================================================================== */
const TILES = [
  {n: 2, a: '个播放内核', b: 'Exo · MPV'},
  {n: 7, a: '种 AI 字幕语言', b: '本地实时识别 · 可选翻译'},
  {n: 3, a: '个片头片尾数据库', b: '社区区间 · 一键跳过'},
  {n: 5, a: '段均衡器', b: '对白 · 夜间 · 音乐'},
];
export const Bento: React.FC = () => {
  const f = useCurrentFrame();
  const out = io(f, 222, 240, 0, 1, EASE);
  return (
    <AbsoluteFill style={{background: K.black, opacity: 1 - out}}>
      <div style={{position: 'absolute', top: 150, width: '100%', textAlign: 'center'}}>
        <Reveal at={6}>
          <H size={96}>细节，全都想到了。</H>
        </Reveal>
      </div>
      <div style={{position: 'absolute', top: 400, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 28}}>
        {TILES.map((t, i) => {
          const p = io(f, 26 + i * 9, 76 + i * 9, 0, 1, OUT);
          const cnt = Math.round(io(f, 30 + i * 9, 90 + i * 9, 0, t.n, EASE));
          return (
            <div
              key={i}
              style={{
                width: 390,
                height: 440,
                borderRadius: 40,
                background: K.tile,
                boxShadow: `inset 0 0 0 1px ${K.hair}`,
                padding: '44px 40px',
                boxSizing: 'border-box',
                opacity: p,
                transform: `translateY(${(1 - p) * 50}px) scale(${0.97 + 0.03 * p})`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
              }}
            >
              <H size={210} grad weight={700} style={{lineHeight: 1, letterSpacing: '-0.04em'}}>
                {Math.max(cnt, p > 0.2 ? 1 : 0)}
              </H>
              <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 36, color: K.white, marginTop: 18}}>{t.a}</div>
              <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 26, color: K.grey, marginTop: 8}}>{t.b}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 6 · Split features 2400–2880                                        */
/* ================================================================== */
const Split: React.FC<{side: 'left' | 'right'; clip: string; from: number; still: string; eb: string; h: React.ReactNode; sub: string}> = ({side, clip, from, still, eb, h, sub}) => {
  const f = useCurrentFrame();
  const inP = io(f, 0, 50, 0, 1, OUT);
  const out = io(f, 222, 240, 0, 1, EASE);
  const sgn = side === 'left' ? 1 : -1;
  const ry = sgn * interpolate(f, [0, 240], [16, 9]);
  return (
    <AbsoluteFill style={{opacity: 1 - out}}>
      <Stage light={0.8} />
      <Img
        src={staticFile(glow(still))}
        style={{position: 'absolute', left: side === 'left' ? 60 : 760, top: 240, width: 1100, height: 620, objectFit: 'cover', filter: 'blur(90px) saturate(1.4)', opacity: 0.38 * inP}}
      />
      <AbsoluteFill style={{perspective: 2400, perspectiveOrigin: side === 'left' ? '75% 50%' : '25% 50%'}}>
        <div
          style={{
            position: 'absolute',
            left: side === 'left' ? 90 : 710,
            top: 230,
            transform: `translateX(${(1 - inP) * -sgn * 160}px) rotateY(${ry}deg)`,
            opacity: inP,
          }}
        >
          <TV w={1120}>
            <Footage clip={clip} from={from} still={still} />
          </TV>
        </div>
      </AbsoluteFill>
      <div style={{position: 'absolute', left: side === 'left' ? 1290 : 110, top: 370, width: 600}}>
        <Reveal at={18}>
          <Eyebrow>{eb}</Eyebrow>
          <H size={84}>{h}</H>
        </Reveal>
        <Reveal at={30}>
          <Sub size={30} style={{marginTop: 22}}>
            {sub}
          </Sub>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};

export const Features: React.FC = () => (
  <AbsoluteFill style={{background: K.black}}>
    <Sequence from={0} durationInFrames={240}>
      <Split side="left" clip="live" from={Math.max(0, mark('live', 'list', 5.2) - 0.4)} still="live-list" eb="直播" h={<>直播，<br />随心切换。</>} sub="频道分组 · 节目单 · 回看与时移" />
    </Sequence>
    <Sequence from={240} durationInFrames={240}>
      <Split side="right" clip="themes" from={mark('themes', 'B站粉', 0.8) - 0.3} still="theme-a" eb="个性化" h={<>七种主题色，<br />深浅随心。</>} sub="深色 · 浅色 · 跟随系统" />
    </Sequence>
  </AbsoluteFill>
);

/* ================================================================== */
/* 7 · Montage 2880–3240 — hard cuts on the beat                       */
/* ================================================================== */
const CUTS = [
  {clip: 'library', from: () => 0.6, still: 'library'},
  {clip: 'vod-detail', from: () => 0.5, still: 'vod-0'},
  {clip: 'rows', from: () => mark('rows', 'down-row2', 6.5) - 0.1, still: 'home-row'},
  {clip: 'detail', from: () => mark('detail', 'down-1', 5.6), still: 'detail'},
  {clip: 'tab-calendar', from: () => 4.2, still: 'calendar'},
  {clip: 'player-osd', from: () => mark('player-osd', 'osd', 0.1), still: 'player-osd'},
];
export const Montage: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: K.black}}>
      {CUTS.map((c, i) => (
        <Sequence key={i} from={i * 60} durationInFrames={60} layout="none">
          <AbsoluteFill style={{transform: `scale(${1.06 - 0.06 * io(f, i * 60, i * 60 + 60, 0, 1, OUT)})`}}>
            <Footage clip={c.clip} from={c.from()} still={c.still} />
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 8 · Statement 3240–3360 (music stops at 55.42 s = frame 3325)       */
/* ================================================================== */
export const Statement: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: K.black, alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
      {f < 85 ? (
        <Reveal at={4} dur={36}>
          <H size={140}>
            这，就是 <span style={{backgroundImage: K.grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>JetStream</span>。
          </H>
        </Reveal>
      ) : null}
    </AbsoluteFill>
  );
};

/* ================================================================== */
/* 9 · End card 3360–3840                                              */
/* ================================================================== */
export const End: React.FC = () => {
  const f = useCurrentFrame();
  const ic = io(f, 2, 70, 0, 1, OUT);
  const fade = io(f, 420, 480, 0, 1, EASE);
  return (
    <AbsoluteFill style={{opacity: 1 - fade}}>
      <Stage light={ic} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
        <div style={{opacity: ic, transform: `scale(${0.94 + 0.06 * ic})`, marginTop: -120}}>
          <AppIcon size={232} sheen={io(f, 40, 120, -0.2, 1.3, INOUT)} />
        </div>
        <Reveal at={34} style={{marginTop: 56}}>
          <H size={104} weight={600}>
            TV JetStream
          </H>
        </Reveal>
        <Reveal at={58} style={{marginTop: 18}}>
          <Sub size={36}>为 Android TV 与电视盒子打造。开源，免费。</Sub>
        </Reveal>
        <Reveal at={82} style={{marginTop: 44}}>
          <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 30, color: K.white, padding: '14px 34px', borderRadius: 999, boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,.28)`}}>
            github.com/wobuhui666/TV
          </div>
        </Reveal>
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          bottom: 44,
          width: '100%',
          textAlign: 'center',
          fontFamily: SANS,
          fontSize: 17,
          lineHeight: 1.7,
          color: K.grey2,
          opacity: io(f, 120, 160, 0, 1, EASE),
        }}
      >
        界面为最新 Release（{RELEASE}）实机录制 · 推荐海报与资料为应用内 TMDB 数据，版权归各自权利人
        <br />
        演示影片：Sintel 等 © Blender Foundation / Blender Studio（CC BY）· 应用不提供影视资源 · 原创配乐
      </div>
    </AbsoluteFill>
  );
};
