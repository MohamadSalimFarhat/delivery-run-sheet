import { Composition } from 'remotion'
import Pitch from './Pitch'
import { FPS, TOTAL_FRAMES } from './script'

export const RemotionRoot = () => {
  return (
    <Composition
      id="Pitch"
      component={Pitch}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  )
}
