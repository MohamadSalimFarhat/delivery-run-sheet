import { Img, staticFile } from 'remotion'
import { COLORS } from '../theme'

const TITLE_BAR = 30

/**
 * Wraps a screenshot in a browser chrome so it reads as a real product rather
 * than a floating rectangle.
 *
 * The window is sized in pixels rather than left to the layout, because a
 * screenshot has a shape of its own and the two ways CSS could handle that are
 * both wrong: letterboxing leaves bands of white, and covering crops the
 * bottom off the page. Given the space available, the largest window of the
 * right shape is worked out here and used exactly.
 */
export default function BrowserFrame({
  src,
  label,
  aspect,
  maxWidth,
  maxHeight,
  style,
}: {
  src: string
  label?: string
  aspect: number
  maxWidth: number
  maxHeight: number
  style?: React.CSSProperties
}) {
  const room = maxHeight - TITLE_BAR
  const height = Math.min(room, maxWidth / aspect)
  const width = height * aspect

  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {label && (
        <div
          style={{
            color: COLORS.muted,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          {label}
        </div>
      )}

      <div
        style={{
          width,
          height: height + TITLE_BAR,
          borderRadius: 14,
          overflow: 'hidden',
          border: `1px solid ${COLORS.line}`,
          boxShadow: '0 40px 90px rgba(0,0,0,0.55)',
          backgroundColor: COLORS.inkSoft,
        }}
      >
        {/* The title bar, with the three dots people read as "a browser". */}
        <div
          style={{
            height: TITLE_BAR,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 14,
            borderBottom: `1px solid ${COLORS.line}`,
          }}
        >
          {['#ef4444', '#eab308', '#22c55e'].map((colour) => (
            <div
              key={colour}
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                backgroundColor: colour,
                opacity: 0.85,
              }}
            />
          ))}
        </div>

        <Img
          src={staticFile(src)}
          style={{ width, height, display: 'block' }}
        />
      </div>
    </div>
  )
}
