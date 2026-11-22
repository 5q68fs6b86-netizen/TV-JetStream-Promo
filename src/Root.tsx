import React from 'react';
import {AbsoluteFill, Composition, Sequence} from 'remotion';
import {Bento, Cinema, End, Features, Intro, Montage, Showcase, Statement, Wordmark} from './scenes';

// 120 BPM: 1 bar = 2 s = 120 frames. Cuts sit on the score: drop 8 s, breakdown 28 s, build 36 s, full 40 s, stop 55.4 s, hit 56 s.
export const TIMELINE = [
  {id: 'intro', from: 0, dur: 480, C: Intro},
  {id: 'wordmark', from: 480, dur: 120, C: Wordmark},
  {id: 'showcase', from: 600, dur: 1080, C: Showcase},
  {id: 'cinema', from: 1680, dur: 480, C: Cinema},
  {id: 'bento', from: 2160, dur: 240, C: Bento},
  {id: 'features', from: 2400, dur: 480, C: Features},
  {id: 'montage', from: 2880, dur: 360, C: Montage},
  {id: 'statement', from: 3240, dur: 120, C: Statement},
  {id: 'end', from: 3360, dur: 480, C: End},
];
export const TOTAL = 3840;

const Promo: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    {TIMELINE.map(({id, from, dur, C}) => (
      <Sequence key={id} name={id} from={from} durationInFrames={dur}>
        <C />
      </Sequence>
    ))}
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <Composition id="Promo" component={Promo} durationInFrames={TOTAL} fps={60} width={1920} height={1080} />
);
