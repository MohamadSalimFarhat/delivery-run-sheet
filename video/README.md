# The 30-second pitch

The marketing video for Delivery Run Sheet, built with
[Remotion](https://remotion.dev) — a video written as React components and
rendered frame by frame into an MP4.

## How it fits together

- `src/script.ts` — the whole pitch: what is said, what is on screen, and in
  what order. Scene lengths are not typed in by hand; each is however long its
  line actually takes to say.
- `scripts/voiceover.mjs` — sends each line to ElevenLabs and saves the audio
  to `public/audio`. It asks for timestamps alongside the audio, so the exact
  duration of every line is known and written to `src/timings.json`. That is
  what keeps the pictures in step with the words.
- `src/scenes/` — one component per kind of scene.
- `screens/` — the original screenshots, as taken.
- `public/screens/` — the same images under short names, which is where
  Remotion reads them from.

## Running it

    npm install
    npm run voiceover     # needs ELEVENLABS_API_KEY in the repo root .env
    npm run render        # writes out/delivery-run-sheet.mp4

`npm run studio` opens Remotion's editor, where the video can be scrubbed
through and edited live.

The rendered MP4 is not committed — it is a build output, and at 7.7MB it
does not belong in git history.
