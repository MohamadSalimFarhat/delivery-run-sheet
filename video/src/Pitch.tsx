import { AbsoluteFill, Audio, Series, staticFile } from 'remotion'
import Backdrop from './components/Backdrop'
import DeliveredScene from './scenes/DeliveredScene'
import OutroScene from './scenes/OutroScene'
import ScreensScene from './scenes/ScreensScene'
import TitleScene from './scenes/TitleScene'
import { TIMED_SCENES } from './script'
import type { TimedScene } from './script'

function SceneBody({ scene }: { scene: TimedScene }) {
  switch (scene.kind) {
    case 'title':
      return <TitleScene scene={scene} />
    case 'delivered':
      return <DeliveredScene scene={scene} />
    case 'outro':
      return <OutroScene scene={scene} />
    default:
      return <ScreensScene scene={scene} />
  }
}

export default function Pitch() {
  return (
    <AbsoluteFill>
      {/* One backdrop across the whole video, so its drift is continuous
          rather than restarting at every cut. */}
      <Backdrop />

      <Series>
        {TIMED_SCENES.map((scene, index) => (
          <Series.Sequence
            key={index}
            durationInFrames={scene.durationInFrames}
          >
            <SceneBody scene={scene} />
            {/* Each line starts when its scene does. The scene outlasts the
                line by a beat, which is the pause between sentences. */}
            <Audio src={staticFile(scene.audio)} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  )
}
