import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS, FONT_STACK } from '../theme'
import type { TimedScene } from '../script'

export default function OutroScene({ scene }: { scene: TimedScene }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const title = spring({ frame, fps, config: { damping: 200, stiffness: 90 } })
  const note = spring({
    frame: frame - 8,
    fps,
    config: { damping: 200, stiffness: 90 },
  })
  const url = spring({
    frame: frame - 20,
    fps,
    config: { damping: 200, stiffness: 90 },
  })

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        fontFamily: FONT_STACK,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 104,
          fontWeight: 800,
          color: COLORS.text,
          letterSpacing: -3,
          opacity: title,
          transform: `translateY(${interpolate(title, [0, 1], [24, 0])}px)`,
        }}
      >
        {scene.caption}
      </div>

      <div
        style={{
          fontSize: 40,
          fontWeight: 500,
          color: COLORS.muted,
          opacity: note,
          transform: `translateY(${interpolate(note, [0, 1], [18, 0])}px)`,
        }}
      >
        {scene.note}
      </div>

      <div
        style={{
          marginTop: 34,
          fontSize: 34,
          fontWeight: 600,
          color: COLORS.accent,
          border: `1px solid ${COLORS.accent}55`,
          borderRadius: 999,
          padding: '14px 36px',
          opacity: url,
          transform: `scale(${interpolate(url, [0, 1], [0.94, 1])})`,
        }}
      >
        delivery-run-sheet.vercel.app
      </div>
    </AbsoluteFill>
  )
}
