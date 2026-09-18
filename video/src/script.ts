import timings from './timings.json'

/**
 * The whole pitch lives here: what is said, and what is on screen while it is
 * said.
 *
 * Scene lengths are not chosen by hand. Each one is however long its line
 * actually takes to say, measured by ElevenLabs when the audio was generated,
 * plus a beat of silence afterwards so lines do not run into each other.
 */

export const FPS = 30

/** Silence after each line, so the video breathes. */
const BEAT_SECONDS = 1

export type SceneKind = 'title' | 'screens' | 'delivered' | 'outro'

export type Scene = {
  kind: SceneKind
  /** Shown on screen. Shorter than what is spoken. */
  caption: string
  /** Sub-line under the caption, where one helps. */
  note?: string
  /**
   * Screenshots from public/screens. `aspect` is the image's own width over
   * height, so its frame can be cut to the same shape instead of sitting in a
   * band of white.
   */
  shots?: { src: string; label?: string; aspect: number }[]
}

const SCENES: Scene[] = [
  {
    kind: 'title',
    caption: 'An order comes in.',
    note: 'Who takes it out, and where exactly is it going?',
  },
  {
    kind: 'screens',
    caption: 'The dispatcher adds it.',
    note: 'Pins the address. Picks a driver.',
    shots: [{ src: 'screens/create.png', aspect: 1445 / 812 }],
  },
  {
    kind: 'screens',
    caption: 'Drivers see only their own.',
    shots: [
      { src: 'screens/table.png', label: 'Dispatcher', aspect: 1595 / 587 },
      { src: 'screens/driver-list.png', label: 'Driver', aspect: 1303 / 411 },
    ],
  },
  {
    kind: 'screens',
    caption: 'One tap to WhatsApp.',
    note: 'One tap to navigate — to the exact door, not the street.',
    shots: [{ src: 'screens/detail-driver.png', aspect: 659 / 888 }],
  },
  {
    kind: 'delivered',
    caption: 'Delivered.',
    note: 'The time records itself.',
  },
  {
    kind: 'outro',
    caption: 'Delivery Run Sheet',
    note: 'Every drop, on the right van, at the right door.',
  },
]

export type TimedScene = Scene & {
  audio: string
  /** Frames this scene occupies, including its trailing beat. */
  durationInFrames: number
  /** Frames of speech, before the beat. */
  speechInFrames: number
}

export const TIMED_SCENES: TimedScene[] = SCENES.map((scene, index) => {
  const spoken = timings.scenes[index]?.seconds ?? 3
  return {
    ...scene,
    audio: `audio/${timings.scenes[index]?.file ?? ''}`,
    speechInFrames: Math.round(spoken * FPS),
    durationInFrames: Math.round((spoken + BEAT_SECONDS) * FPS),
  }
})

export const TOTAL_FRAMES = TIMED_SCENES.reduce(
  (total, scene) => total + scene.durationInFrames,
  0,
)
