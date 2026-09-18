import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import Caption from '../components/Caption'
import { COLORS, FONT_STACK } from '../theme'
import type { TimedScene } from '../script'

/** The opening: the shop's problem, before the product is named. */
export default function TitleScene({ scene }: { scene: TimedScene }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const badge = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 120 },
  })

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: 120,
        gap: 40,
      }}
    >
      <div
        style={{
          fontFamily: FONT_STACK,
          color: COLORS.muted,
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: 6,
          textTransform: 'uppercase',
          opacity: badge,
          transform: `translateY(${interpolate(badge, [0, 1], [-16, 0])}px)`,
        }}
      >
        Delivery Run Sheet
      </div>

      <Caption
        text={scene.caption}
        note={scene.note}
        delay={10}
        align="center"
        size={92}
      />
    </AbsoluteFill>
  )
}
