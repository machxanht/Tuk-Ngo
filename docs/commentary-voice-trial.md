# Reference-conditioned commentary trial

This is a six-line experiment, separate from the game's original 72 broadcast
cuts and the 40 stock Azure script samples. It tests whether the user's requested
Vietnamese and Khmer commentator timbres/delivery can be approximated from the
specified broadcast. The listening page is the existing audio library's
`?view=voice` tab. Each row has the same authored sentence in stock Azure and
AI-converted form, plus a short original reference **with different words**.

Actual result: **not approved for race playback**. All six style-converted files
were generated, as was one Vietnamese close-race timbre-only control. Whisper
recognizes the stock Vietnamese sentences substantially more faithfully than the
converted sentences. The specialist Khmer recognizer also reports substantial
changes after conversion. Even the timbre-only control fails the source-wording
comparison. These are machine warnings, not a human listening judgement. No claim
is made that the two commentator identities or the requested excitement have
been reproduced. The public page keeps this failed trial explicit for comparison.

The engine is [Seed-VC](https://github.com/Plachtaa/seed-vc), pinned to commit
`51383efd921027683c89e5348211d93ff12ac2a8`, using its reference-conditioned
style-conversion path. This is **not** two trained RVC models, a recording of the
commentators speaking the new scripts, or a verified recreation of their emotion.
The upstream project is archived; it is an isolated offline experiment, not a new
game dependency. Its code/models stay outside Git and the web deployment.

All voice references are from the user's
[2025 broadcast](https://www.youtube.com/watch?v=crZF3hghbgQ), SHA-256
`2c443d23b71fe92cc191baca5bbc45ec12704d79a2ef1b31492839cd04654ed5`.
The original automatic CC hash is checked before cutting. CC identifies language
and rough phrase context, not a verified speaker identity or emotional intensity.
No additional seasons or speakers are mixed into this trial.

| Trial | Stock source cue | Original reference, seconds |
| --- | --- | --- |
| Vietnamese introduction | `intro-tum-nup` | 5472.9–5486.0 |
| Vietnamese close race | `close-race` | 5557.6–5565.0 |
| Vietnamese sprint | `final` | 5586.44–5597.7 |
| Khmer introduction | `intro-tum-nup` | 11285.14–11293.0 |
| Khmer close race | `close-race` | 11323.64–11335.8 |
| Khmer sprint | `final` | 11337.72–11355.4 |

The input sentences/WAVs are reused from the existing authenticated Azure trial;
there are no new Azure requests. References receive a 70–9000 Hz filter, light
spectral denoising and loudness adjustment. This does **not** fully isolate voice
from broadcast music, drums or crowd noise. The labels describe the requested
game situations, not a measured guarantee of three emotional levels.

`scripts/fetch-commentary-models.py` fetches only 18 required files (2.61 GB)
from official model repositories, records exact revisions, and verifies LFS
SHA-256 or Git blob hashes. Downloads use bounded HTTP ranges with four concurrent
ranges at most; ordered writes allow interruption/resume. The isolated runtime
uses Python 3.10, PyTorch/Torchaudio 2.5.1 CPU, Transformers 4.46.3,
Librosa 0.10.2, NumPy 1.26.4 and Hydra 1.3.2. Other applications' Python installs
are preserved. Models, runtime and temporary files are on drive E.

`scripts/build-commentary-voice-trial.py` provides three explicit steps:

- `--prepare`: verify source/CC/stock WAV hashes and cut six references to an
  external work directory, storing exact source times and CC context.
- `--convert --seed <private-checkout>`: run the pinned model offline, with style
  conversion enabled, 30 diffusion steps and fixed seed 712. Results record
  actual elapsed conversion time, output hash, duration, peak and RMS. Cached
  results are tied to the complete request; no paid service is called.
- `--publish`: require all six current converted WAVs before writing the listening
  pack. Encode six AI MP3s and six original-reference MP3s; decode/check all files.
  Only whitelisted public provenance is exported, with explicit AI/review flags.

Shared arguments are `--out <external-work-dir>` and `--ffmpeg <executable>`.
Preparation additionally requires `--source`, `--captions` and `--stock-wavs`.
The model fetcher takes `--cache <external-work-dir>/../voice-cache/huggingface/hub`.
The model checkout/runtime are used only while baking, never by a tablet.
One bounded `--timbre-only --only contest-vi` diagnostic uses a separate external
`timbre` work folder and `--cache-root` to reuse the same verified model store.
Its single extra listen button is labelled as a control, not a second sample set.

The upstream BigVGAN output normally hard-clamps its waveform to [-1, 1]. A trial
close-race output had 4.03% of PCM samples at its normalized rail. The runner's
output-layer hook now applies downward peak gain **before** that clamp, retaining
the waveform instead of hiding clipping by reducing an already clipped signal.
The processing policy is included in request hashes, invalidating the preceding
cached outputs. Per-file raw peak/gain/over-range statistics remain in local QA
results. Network weights, model architecture and scripts are otherwise unchanged.

The existing library's single audio element plays only on a user gesture, with
no automatic MP3 downloads. Filtering/resizing does not start audio requests.
The AI trial manifest has `runtimeEnabled: false`; the game's audio director,
team history/registration matching, volumes, drum timing and gameplay are unchanged.

Acceptance requires human comparison for timbre, complete and correct wording,
Khmer pronunciation and appropriate intensity. Successful inference, ASR, matching
hashes and browser playback do not establish any of those subjective/native
criteria. Speaker permission and identity have not been independently verified.
The page labels AI speech explicitly; no claim is made that the commentators
recorded or endorsed it. Do not move these samples into race playback on the
strength of technical checks alone.

Verification uses `scripts/test-commentary-trial.py`, the affected browser checks
in `scripts/check-broadcast-library.py`, and the repository regression/build gate.
Evidence for the voice experiment belongs under `docs/qa/commentary-voice-trial/`.
The local browser played all six generated samples, the timbre-only control,
stock/reference comparisons and original regressions at three tablet viewports.
Nine offline provenance/isolation tests and the original-audio check passed;
the repository lint/test/build gate passed. These technical checks do not change
the negative content-fidelity result above.
