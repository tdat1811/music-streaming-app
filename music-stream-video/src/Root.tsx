import {Composition} from 'remotion';
import {MusicStreamPromo} from './MusicStreamPromo';

export const Root: React.FC = () => (
  <Composition
    id="MusicStreamPromo"
    component={MusicStreamPromo}
    durationInFrames={2310}
    fps={30}
    width={1080}
    height={1920}
  />
);
