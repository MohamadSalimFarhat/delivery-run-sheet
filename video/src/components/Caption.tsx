import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS, FONT_STACK } from '../theme'

/**
 * The words on screen. They rise into place rather than cutting in, which is
 * what stops a sequence of screenshots feeling like a slideshow.
 */
export default function Caption({
  text,
  note,
  delay = 0,
  align = 'left',
  size = 64,
}: {
  text: string
  note?: string
  delay?: number
  align?: 'left' | 'center'
  size?: number
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const rise = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 90 },
  })

  const noteRise = spring({
    frame: frame - delay - 6,
    fps,
    config: { damping: 200, stiffness: 90 },
  })

  return (
    <div
      style={{
        fontFamily: FONT_STACK,
        textAlign: align,
        alignSelf: align === 'center' ? 'center' : 'flex-start',
      }}
    >
      <div
        style={{
          color: COLORS.text,
          fontSize: size,
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: -1.5,
          opacity: rise,
          transform: `translateY(${interpolate(rise, [0, 1], [26, 0])}px)`,
        }}
      >
        {text}
      </div>

      {note && (
        <div
          style={{
            color: COLORS.muted,
            fontSize: size * 0.44,
            fontWeight: 500,
            lineHeight: 1.35,
            marginTop: 16,
            maxWidth: 1100,
            opacity: noteRise,
            transform: `translateY(${interpolate(noteRise, [0, 1], [18, 0])}px)`,
          }}
        >
          {note}
        </div>
      )}
    </div>
  )
}
