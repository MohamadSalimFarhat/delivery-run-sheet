/**
 * Generates the voice-over, one audio file per scene.
 *
 * Per scene rather than one long file, because each scene then holds for
 * exactly as long as its line takes to say. ElevenLabs is asked for timestamps
 * alongside the audio, so the exact duration is known rather than guessed, and
 * written to src/timings.json for the composition to read.
 *
 * Run with: npm run voiceover
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const VIDEO_DIR = join(HERE, '..')
const REPO_ROOT = join(VIDEO_DIR, '..')

// Roger: male, laid-back, casual, resonant. To use a different voice, change
// this id - `npm run voices` prints the full list with ids.
const VOICE_ID = 'CwhRBWXzGAHq8TQ4Fs17'
const MODEL_ID = 'eleven_multilingual_v2'

function readApiKey() {
  const env = readFileSync(join(REPO_ROOT, '.env'), 'utf8')
  const match = env.match(/^ELEVENLABS_API_KEY=(.+)$/m)
  if (!match) {
    throw new Error('ELEVENLABS_API_KEY not found in the repo root .env')
  }
  return match[1].trim()
}

/** The lines, in order. Kept in step with src/script.ts. */
const LINES = [
  "A shop takes an order. Who's taking it out? Where exactly is it going?",
  'Delivery Run Sheet. The dispatcher adds it, pins the address, picks a driver.',
  'The driver sees only their own.',
  'One tap to message the customer on WhatsApp. One tap to navigate. To the exact door, not the street.',
  'Delivered. The time records itself.',
  'Delivery Run Sheet. Every drop, on the right van, at the right door.',
]

async function speak(apiKey, text) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          // A pitch wants a little lift, but not a hard sell.
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    },
  )

  if (!response.ok) {
    throw new Error(
      `ElevenLabs returned ${response.status}: ${await response.text()}`,
    )
  }

  const body = await response.json()
  const endTimes = body.alignment?.character_end_times_seconds ?? []
  const seconds = endTimes.length > 0 ? endTimes[endTimes.length - 1] : null

  return {
    audio: Buffer.from(body.audio_base64, 'base64'),
    seconds,
  }
}

const apiKey = readApiKey()
mkdirSync(join(VIDEO_DIR, 'public', 'audio'), { recursive: true })

const timings = []
let total = 0

for (const [index, text] of LINES.entries()) {
  process.stdout.write(`scene ${index + 1}/${LINES.length}… `)

  const { audio, seconds } = await speak(apiKey, text)
  const file = `scene-${index + 1}.mp3`
  writeFileSync(join(VIDEO_DIR, 'public', 'audio', file), audio)

  timings.push({ file, seconds })
  total += seconds ?? 0
  console.log(`${seconds?.toFixed(2)}s  (${(audio.length / 1024) | 0}KB)`)
}

writeFileSync(
  join(VIDEO_DIR, 'src', 'timings.json'),
  JSON.stringify({ voice: VOICE_ID, scenes: timings }, null, 2),
)

console.log(`\nspoken total: ${total.toFixed(2)}s`)
console.log('written: src/timings.json')
