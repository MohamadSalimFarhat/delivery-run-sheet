import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import Caption from '../components/Caption'
import { COLORS, FONT_STACK } from '../theme'
import type { TimedScene } from '../script'

/**
 * A motion graphic rather than a screenshot: the status pill turning from
 * pending to delivered, and the timestamp landing by itself.
 *
 * Deliberately drawn rather than screenshotted, so it reads as an illustration
 * of what happens rather than as a picture of a screen.
 */
export default function DeliveredScene({ scene }: { scene: TimedScene }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // The moment it flips.
  const flip = spring({
    frame: frame - 12,
    fps,
    config: { damping: 14, stiffness: 140 },
  })

  const stamp = spring({
    frame: frame - 26,
    fps,
    config: { damping: 200, stiffness: 90 },
  })

  const pillColour = flip < 0.5 ? COLORS.pending : COLORS.accent
  const label = flip < 0.5 ? 'pending' : 'delivered'

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: 56,
        padding: 120,
      }}
    >
      <Caption
        text={scene.caption}
        note={scene.note}
        align="center"
        size={92}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 26,
        }}
      >
        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 44,
            fontWeight: 600,
            color: COLORS.ink,
            backgroundColor: pillColour,
            padding: '16px 44px',
            borderRadius: 999,
            transform: `scale(${interpolate(flip, [0, 0.5, 1], [1, 1.18, 1])})`,
            boxShadow: `0 0 70px ${pillColour}55`,
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontFamily: FONT_STACK,
            fontSize: 32,
            color: COLORS.muted,
            opacity: stamp,
            transform: `translateY(${interpolate(stamp, [0, 1], [14, 0])}px)`,
          }}
        >
          18/09/2026, 11:04
        </div>
      </div>
    </AbsoluteFill>
  )
}
