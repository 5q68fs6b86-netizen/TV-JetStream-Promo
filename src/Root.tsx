import React from 'react';
import {AbsoluteFill, Composition, Sequence} from 'remotion';
import {Flash, Grain} from './lib';
import {Browse, Cinema, Hero, Intro, Live, Outro, Wall} from './scenes';

// 120 BPM → 1 bar = 120 frames @ 60 fps. Cuts land on the score's impacts (bars 4, 8, 14, 22, 29).
export const TIMELINE = [
  {id: 'intro', from: 0, dur: 480, C: Intro},
  {id: 'hero', from: 480, dur: 480, C: Hero},
  {id: 'browse', from: 960, dur: 720, C: Browse},
  {id: 'cinema', from: 1680, dur: 960, C: Cinema},
  {id: 'live', from: 2640, dur: 360, C: Live},
  {id: 'wall', from: 3000, dur: 480, C: Wall},
  {id: 'outro', from: 3480, dur: 360, C: Outro},
];
export const TOTAL = 3840;

const Promo: React.FC = () => (
  <AbsoluteFill style={{background: '#0A0908'}}>
    {TIMELINE.map(({id, from, dur, C}) => (
      <Sequence key={id} name={id} from={from} durationInFrames={dur}>
        <C />
      </Sequence>
    ))}
    <Flash at={[480, 960, 1680, 2640, 3000, 3480]} />
    <Grain opacity={0.06} />
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Promo" component={Promo} durationInFrames={TOTAL} fps={60} width={1920} height={1080} />
    <Composition id="Still" component={Promo} durationInFrames={TOTAL} fps={60} width={1920} height={1080} />
  </>
);
