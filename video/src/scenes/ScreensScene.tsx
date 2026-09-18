import { interpolate, spring, useCurrentFrame, useVideoConfig, AbsoluteFill } from 'remotion'
import BrowserFrame from '../components/BrowserFrame'
import Caption from '../components/Caption'
import type { TimedScene } from '../script'

const STAGE = { width: 1920, height: 1080 }
const LABEL_HEIGHT = 32

/** One screenshot, rising into place and then drifting very slowly. */
function Shot({
  src,
  label,
  aspect,
  maxWidth,
  maxHeight,
  delay,
}: {
  src: string
  label?: string
  aspect: number
  maxWidth: number
  maxHeight: number
  delay: number
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 70 },
  })

  // A slow push in, so a still image never sits completely dead on screen.
  const drift = interpolate(frame, [0, 200], [1, 1.03], {
    extrapolateRight: 'clamp',
  })

  return (
    <BrowserFrame
      src={src}
      label={label}
      aspect={aspect}
      maxWidth={maxWidth}
      maxHeight={maxHeight - (label ? LABEL_HEIGHT : 0)}
      style={{
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [50, 0])}px) scale(${drift})`,
      }}
    />
  )
}

export default function ScreensScene({ scene }: { scene: TimedScene }) {
  const shots = scene.shots ?? []

  // A portrait screenshot beside the words uses the width a 16:9 frame has
  // going spare. A landscape one is better full width, under them.
  const sideBySide = shots.length === 1 && shots[0].aspect < 1.2

  if (sideBySide) {
    const padX = 110
    const padY = 70
    const gap = 70
    const textWidth = 620
    const shot = shots[0]

    return (
      <AbsoluteFill
        style={{
          padding: `${padY}px ${padX}px`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap,
        }}
      >
        <div style={{ width: textWidth, flexShrink: 0 }}>
          <Caption text={scene.caption} note={scene.note} size={62} />
        </div>

        <Shot
          src={shot.src}
          aspect={shot.aspect}
          maxWidth={STAGE.width - padX * 2 - textWidth - gap}
          maxHeight={STAGE.height - padY * 2}
          delay={8}
        />
      </AbsoluteFill>
    )
  }

  const padX = 90
  const padY = 64
  const gap = 24
  const captionHeight = scene.note ? 150 : 96
  const available = STAGE.height - padY * 2 - captionHeight - gap
  const perShot = (available - gap * (shots.length - 1)) / shots.length

  return (
    <AbsoluteFill
      style={{
        padding: `${padY}px ${padX}px`,
        display: 'flex',
        flexDirection: 'column',
        gap,
      }}
    >
      <div style={{ height: captionHeight }}>
        <Caption
          text={scene.caption}
          note={scene.note}
          size={shots.length > 1 ? 54 : 60}
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap,
        }}
      >
        {shots.map((shot, index) => (
          <Shot
            key={shot.src}
            src={shot.src}
            label={shot.label}
            aspect={shot.aspect}
            maxWidth={STAGE.width - padX * 2}
            maxHeight={perShot}
            delay={8 + index * 7}
          />
        ))}
      </div>
    </AbsoluteFill>
  )
}
