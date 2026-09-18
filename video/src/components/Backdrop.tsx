import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { COLORS } from '../theme'

/**
 * The background every scene sits on: near-black, with two soft pools of
 * colour drifting slowly so a still screenshot never looks like a frozen
 * frame.
 */
export default function Backdrop() {
  const frame = useCurrentFrame()
  const drift = Math.sin(frame / 90) * 40

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 50% at ${20 + drift / 8}% 15%, rgba(34,197,94,0.14), transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(55% 45% at ${85 - drift / 10}% 85%, rgba(56,189,248,0.12), transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  )
}
