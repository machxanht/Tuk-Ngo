"""Six clearly labelled reference-conditioned voice trials, outside race playback.

Prepare/publish use the standard library and FFmpeg. Conversion additionally
requires a private Seed-VC checkout/runtime; no model or credential enters Git.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import wave

REPO = Path(__file__).resolve().parents[1]
PUBLIC = REPO / 'public/assets/race-audio'
SOURCE_ID = 'crZF3hghbgQ'
SOURCE_SHA = '2c443d23b71fe92cc191baca5bbc45ec12704d79a2ef1b31492839cd04654ed5'
ENGINE_COMMIT = '51383efd921027683c89e5348211d93ff12ac2a8'
CASES = [
    ('intro-vi', 'intro-tum-nup', 'vi', 'Giới thiệu', 5472.9, 5486.0),
    ('contest-vi', 'close-race', 'vi', 'Giằng co', 5557.6, 5565.0),
    ('sprint-vi', 'final', 'vi', 'Nước rút', 5586.44, 5597.7),
    ('intro-km', 'intro-tum-nup', 'km', 'Giới thiệu', 11285.14, 11293.0),
    ('contest-km', 'close-race', 'km', 'Giằng co', 11323.64, 11335.8),
    ('sprint-km', 'final', 'km', 'Nước rút', 11337.72, 11355.4),
]
PARAMS = dict(diffusion_steps=30, length_adjust=1.0,
              intelligebility_cfg_rate=0.7, similarity_cfg_rate=0.7,
              top_p=0.9, temperature=0.8, repetition_penalty=1.1,
              convert_style=True, anonymization_only=False)
FILTER = 'highpass=f=70,lowpass=f=9000,afftdn=nf=-25:nt=w:tn=1,loudnorm=I=-20:TP=-2:LRA=11'
PROCESSING = dict(vocoderOutputPeakLimit=0.9, gainBeforeClamp=True)


def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def outside_repo(path):
    path = Path(path).resolve()
    if path == REPO or REPO in path.parents:
        raise ValueError('Sources/models/work directory must remain outside the repository')
    return path


def ffmpeg(executable, *args):
    subprocess.run([str(executable), '-nostdin', '-hide_banner', '-loglevel', 'error',
                    '-y', *map(str, args)], check=True)


def wav_check(path):
    from array import array
    with wave.open(str(path), 'rb') as f:
        if f.getnchannels() != 1 or f.getsampwidth() != 2:
            raise ValueError(f'Expected mono PCM16: {path.name}')
        sr = f.getframerate()
        data = array('h', f.readframes(f.getnframes()))
    duration = len(data) / sr
    peak = max(map(abs, data), default=0) / 32768
    rms = (sum((x / 32768) ** 2 for x in data) / max(1, len(data))) ** 0.5
    if not 0.4 < duration < 30 or not 0.0005 < rms or peak >= 0.999:
        raise ValueError(f'Invalid/silent/clipped output {path.name}: {duration}, {rms}, {peak}')
    return dict(duration=round(duration, 5), sampleRate=sr, peak=round(peak, 6), rms=round(rms, 6))


def prepare(args):
    source = outside_repo(args.source)
    if sha(source) != SOURCE_SHA:
        raise ValueError('Original broadcast SHA mismatch')
    captions = outside_repo(args.captions)
    recipe = read_json(REPO / 'docs/broadcast-audio-cuts.json')
    if sha(captions) != recipe['source']['captions']['sha256']:
        raise ValueError('Original CC SHA mismatch')
    events = read_json(captions)['events']
    draft = read_json(PUBLIC / 'commentary-script.json')
    stock = read_json(PUBLIC / 'commentary-trial/manifest.json')
    entries = []
    for id, cue_id, lang, level, start, end in CASES:
        cue = next(c for c in draft['cues'] if c['id'] == cue_id)
        sample = next(s for s in stock['samples'] if s['id'] == cue_id + '-' + lang)
        if sample['text'] != cue['text'][lang]:
            raise ValueError('Stock sample no longer matches script')
        input_path = outside_repo(args.stock_wavs) / (sample['id'] + '.wav')
        if sha(input_path) != sample['sourceWavSha256']:
            raise ValueError('Stock WAV SHA mismatch: ' + input_path.name)
        reference = args.out / (id + '-reference.wav')
        ffmpeg(args.ffmpeg, '-ss', start, '-t', end - start, '-i', source,
               '-af', FILTER, '-ac', 1, '-ar', 22050, '-c:a', 'pcm_s16le', reference)
        evidence = []
        for event in events:
            t = event.get('tStartMs', 0) / 1000
            if start - 3 < t < end:
                text = ''.join(s.get('utf8', '') for s in event.get('segs', [])).strip()
                if text:
                    evidence.append(dict(start=t, text=text))
        entries.append(dict(id=id, cueId=cue_id, language=lang, level=level,
                            stage=cue['stage'], text=cue['text'][lang],
                            inputFile=str(input_path), inputSha256=sha(input_path),
                            stockFile=sample['file'], stockSha256=sample['sha256'],
                            referenceFile=str(reference), referenceSha256=sha(reference),
                            sourceId=SOURCE_ID, sourceStart=start, sourceEnd=end,
                            captionEvidence=evidence))
    write_json(args.out / 'plan.json', dict(schema=1, engine='Seed-VC reference-conditioned style conversion',
               engineCommit=ENGINE_COMMIT, parameters=PARAMS, sourceSha256=SOURCE_SHA,
               referenceFilter=FILTER, processing=PROCESSING,
               scriptSha256=sha(PUBLIC / 'commentary-script.json'),
               speakerIdentityVerified=False, independentListeningVerified=False,
               emotionVerified=False, speakerPermissionVerified=False,
               runtimeEnabled=False, samples=entries))
    print('Prepared six references and cached stock inputs; no new Azure requests', flush=True)


def convert(args):
    seed = outside_repo(args.seed)
    commit = subprocess.check_output(['git', '-C', str(seed), 'rev-parse', 'HEAD'], text=True).strip()
    if commit != ENGINE_COMMIT:
        raise ValueError('Seed-VC checkout changed; review it before using new code')
    plan = read_json(args.out / 'plan.json')
    if plan['parameters'] != PARAMS or plan.get('processing') != PROCESSING:
        raise ValueError('Plan parameters changed')
    cache_root = outside_repo(args.cache_root) if args.cache_root else args.out.parent / 'voice-cache'
    for key, folder in [('HF_HOME', 'huggingface'), ('TORCH_HOME', 'torch'),
                        ('MPLCONFIGDIR', 'matplotlib'), ('NUMBA_CACHE_DIR', 'numba')]:
        os.environ[key] = str(cache_root / folder)
    os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
    os.environ['HF_HUB_DISABLE_XET'] = '1'
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['TRANSFORMERS_OFFLINE'] = '1'
    os.environ['TOKENIZERS_PARALLELISM'] = 'false'
    os.environ['PATH'] = str(Path(args.ffmpeg).parent) + os.pathsep + os.environ['PATH']
    if not (cache_root / 'huggingface/model-inventory.json').exists():
        raise ValueError('Run fetch-commentary-models.py and verify all models first')
    os.chdir(seed)
    sys.path.insert(0, str(seed))
    import torch
    import numpy as np
    import soundfile as sf
    import yaml
    import hf_utils
    from huggingface_hub import hf_hub_download
    from hydra.utils import instantiate
    from omegaconf import DictConfig
    inventory_path = cache_root / 'huggingface/model-inventory.json'
    inventory = read_json(inventory_path)

    def cached_model(repo_id, model_filename='pytorch_model.bin', config_filename=None):
        def get(filename):
            entry = next(e for e in inventory if e['repo'] == repo_id and e['file'] == filename)
            return hf_hub_download(repo_id=repo_id, filename=filename,
                                   revision=entry['revision'], local_files_only=True,
                                   cache_dir=str(cache_root / 'huggingface/hub'))
        model_path = get(model_filename)
        return (model_path, get(config_filename)) if config_filename else model_path

    # Upstream otherwise overrides HF_HOME with a separate ./checkpoints cache.
    # Adapt file lookup only; use the already verified, pinned offline snapshots.
    hf_utils.load_custom_model_from_hf = cached_model
    torch.set_num_threads(args.threads)
    torch.manual_seed(712)
    np.random.seed(712)
    device = torch.device(args.device)
    dtype = torch.float32
    print(f'Loading reference-conditioned model on {device}; this is NOT RVC training', flush=True)
    config = DictConfig(yaml.safe_load((seed / 'configs/v2/vc_wrapper.yaml').read_text()))
    wrapper = instantiate(config)
    wrapper.load_checkpoints()
    wrapper.to(device).eval()
    wrapper.setup_ar_caches(max_batch_size=1, max_seq_len=2048, dtype=dtype, device=device)
    if wrapper.vocoder.use_tanh_at_final:
        raise ValueError('Unexpected vocoder output activation; review headroom adapter')
    gain_reports = []

    def output_headroom(module, inputs, output):
        peak = float(output.detach().abs().max())
        gain = min(1.0, PROCESSING['vocoderOutputPeakLimit'] / max(peak, 1e-9))
        gain_reports.append(dict(rawPeak=peak, gain=gain,
                           rawOverRangeFraction=float((output.detach().abs() >= 1).float().mean())))
        # BigVGAN otherwise hard-clamps these values. Attenuate before the clamp
        # so raised/excited delivery retains its waveform instead of flat peaks.
        return output * gain

    wrapper.vocoder.conv_post.register_forward_hook(output_headroom)
    result_path = args.out / 'results.json'
    results = read_json(result_path) if result_path.exists() else dict(schema=1, samples=[])
    selected = [s for s in plan['samples'] if not args.only or s['id'] == args.only]
    if not selected:
        raise ValueError('Unknown sample')
    for sample in selected:
        for key in ['input', 'reference']:
            if sha(sample[key + 'File']) != sample[key + 'Sha256']:
                raise ValueError(key + ' changed: ' + sample['id'])
        request_sha = hashlib.sha256(json.dumps(dict(sample=sample, parameters=PARAMS, processing=PROCESSING,
                                      engineCommit=ENGINE_COMMIT), sort_keys=True).encode()).hexdigest()
        output_path = args.out / (sample['id'] + '.wav')
        old = next((r for r in results['samples'] if r['id'] == sample['id']), None)
        if old and old['requestSha256'] == request_sha and output_path.exists() and sha(output_path) == old['sha256']:
            print('Cached ' + sample['id'], flush=True)
            continue
        torch.manual_seed(712)
        started = time.monotonic()
        print('Converting ' + sample['id'], flush=True)
        gain_reports.clear()
        final_audio = None
        for _, full in wrapper.convert_voice_with_streaming(
                source_audio_path=sample['inputFile'], target_audio_path=sample['referenceFile'],
                device=device, dtype=dtype, stream_output=True, **PARAMS):
            if full is not None:
                final_audio = full
        if final_audio is None:
            raise RuntimeError('Model returned no final audio')
        sr, data = final_audio
        if not np.isfinite(data).all() or not len(data):
            raise ValueError('Non-finite/empty converted audio')
        # Apply only downward gain to give PCM/MP3 encoding headroom.
        data = data * min(1.0, 0.9 / max(float(np.max(np.abs(data))), 1e-9))
        sf.write(str(output_path), data, sr, subtype='PCM_16')
        check = wav_check(output_path)
        row = dict(id=sample['id'], requestSha256=request_sha, sha256=sha(output_path),
                   secondsToConvert=round(time.monotonic()-started, 2), device=str(device),
                   modelInventorySha256=sha(inventory_path),
                   vocoderHeadroom=list(gain_reports),
                   **check)
        results['samples'] = [r for r in results['samples'] if r['id'] != row['id']] + [row]
        write_json(result_path, results)
        print(json.dumps(row), flush=True)


def publish(args):
    plan = read_json(args.out / 'plan.json')
    results = read_json(args.out / 'results.json')
    if plan['scriptSha256'] != sha(PUBLIC / 'commentary-script.json'):
        raise ValueError('Script changed; regenerate trial')
    verified = []
    for sample in plan['samples']:
        result = next(r for r in results['samples'] if r['id'] == sample['id'])
        path = args.out / (sample['id'] + '.wav')
        expected_request = hashlib.sha256(json.dumps(dict(sample=sample, parameters=PARAMS, processing=PROCESSING,
                                          engineCommit=ENGINE_COMMIT), sort_keys=True).encode()).hexdigest()
        if result['requestSha256'] != expected_request:
            raise ValueError('Converted sample is stale: ' + sample['id'])
        if sha(path) != result['sha256'] or sha(sample['referenceFile']) != sample['referenceSha256']:
            raise ValueError('Converted/reference WAV changed')
        wav_check(path)
        lang = sample['language']
        backend = 'local-whisper' if lang == 'vi' else 'khmer-service'
        review_file = args.out / ('asr/vi-review.json' if lang == 'vi' else 'asr/km-review.json')
        baseline_file = args.out / ('asr/stock-review.json' if lang == 'vi' else 'asr/khmer-stock-review.json')
        asr = read_json(review_file)['results']['converted-' + sample['id'] + ':' + backend]
        baseline = read_json(baseline_file)['results']['stock-' + sample['id'] + ':' + backend]
        if (asr.get('status') != 'transcribed' or baseline.get('status') != 'transcribed'
                or asr.get('sourceWavSha256') != result['sha256']
                or asr.get('expectedText') != sample['text'] or baseline.get('expectedText') != sample['text']):
            raise ValueError('Current source-bound ASR comparison required: ' + sample['id'])
        review = dict(backend=backend, text=asr['text'].strip(), baselineText=baseline['text'].strip(),
                      detectedLanguage=asr.get('detectedLanguage'), nativeReviewed=False,
                      note='Machine transcript only; neither voice identity nor emotion is verified.')
        verified.append((sample, result, path, review))
    if len(verified) != 6:
        raise ValueError('Require all six converted samples before publication')
    dest = PUBLIC / 'voice-trial'
    dest.mkdir(exist_ok=True)
    public_samples = []
    for sample, result, path, review in verified:
        output = dest / (sample['id'] + '.mp3')
        reference = dest / (sample['id'] + '-reference.mp3')
        for source, target in [(path, output), (sample['referenceFile'], reference)]:
            ffmpeg(args.ffmpeg, '-i', source, '-ac', 1, '-ar', 24000,
                   '-af', 'alimiter=limit=0.90:level=false', '-c:a', 'libmp3lame', '-b:a', '96k', target)
            decoded = args.out / 'decode-check.wav'
            ffmpeg(args.ffmpeg, '-i', target, '-c:a', 'pcm_s16le', decoded)
            wav_check(decoded)
        public_samples.append(dict(id=sample['id'], cueId=sample['cueId'], language=sample['language'],
            level=sample['level'], stage=sample['stage'], text=sample['text'],
            file='voice-trial/' + output.name, sha256=sha(output), bytes=output.stat().st_size,
            duration=result['duration'], stockFile=sample['stockFile'], stockSha256=sample['stockSha256'],
            sourceWavSha256=result['sha256'], requestSha256=result['requestSha256'],
            asr=review,
            referenceFile='voice-trial/' + reference.name, referenceSha256=sha(reference),
            sourceId=SOURCE_ID, sourceStart=sample['sourceStart'], sourceEnd=sample['sourceEnd']))
    control = None
    diagnostic = args.out / 'timbre'
    if (diagnostic / 'asr-review.json').exists():
        dplan = read_json(diagnostic / 'plan.json')
        dsample = next(s for s in dplan['samples'] if s['id'] == 'contest-vi')
        dresult = next(r for r in read_json(diagnostic / 'results.json')['samples'] if r['id'] == 'contest-vi')
        dparams = dict(PARAMS, convert_style=False)
        request = hashlib.sha256(json.dumps(dict(sample=dsample, parameters=dparams,
                    processing=PROCESSING, engineCommit=ENGINE_COMMIT), sort_keys=True).encode()).hexdigest()
        dwav = diagnostic / 'contest-vi.wav'
        dasr = read_json(diagnostic / 'asr-review.json')['results']['control-contest-vi:local-whisper']
        if (dplan['parameters'] != dparams or dplan['scriptSha256'] != plan['scriptSha256']
                or dresult['requestSha256'] != request or sha(dwav) != dresult['sha256']
                or dasr.get('sourceWavSha256') != dresult['sha256'] or dasr.get('status') != 'transcribed'):
            raise ValueError('Timbre-only diagnostic changed or lacks current ASR')
        output = dest / 'timbre-contest-vi.mp3'
        ffmpeg(args.ffmpeg, '-i', dwav, '-ac', 1, '-ar', 24000,
               '-af', 'alimiter=limit=0.90:level=false', '-c:a', 'libmp3lame', '-b:a', '96k', output)
        ffmpeg(args.ffmpeg, '-i', output, '-c:a', 'pcm_s16le', args.out / 'decode-check.wav')
        wav_check(args.out / 'decode-check.wav')
        control = dict(id='control-contest-vi', cueId=dsample['cueId'], language='vi',
            level='Giằng co · chỉ đổi chất giọng', text=dsample['text'],
            file='voice-trial/' + output.name, sha256=sha(output), bytes=output.stat().st_size,
            duration=dresult['duration'], sourceWavSha256=dresult['sha256'],
            requestSha256=request, parameters=dparams, sourceId=SOURCE_ID,
            sourceStart=dsample['sourceStart'], sourceEnd=dsample['sourceEnd'],
            asrText=dasr['text'].strip(), independentListeningVerified=False)
    write_json(dest / 'manifest.json', dict(schema=1, sourceType='ai-reference-voice-conversion',
        engine='Seed-VC', engineCommit=ENGINE_COMMIT, parameters=PARAMS,
        scriptSha256=plan['scriptSha256'], sourceSha256=SOURCE_SHA, processing=PROCESSING,
        trainedSpeakerModels=False, runtimeEnabled=False, independentListeningVerified=False,
        speakerIdentityVerified=False, emotionVerified=False, khmerPronunciationVerified=False,
        speakerPermissionVerified=False, referenceFilter=FILTER,
        status='unapproved-content-fidelity',
        sourceUrl='https://www.youtube.com/watch?v=' + SOURCE_ID, samples=public_samples, control=control))
    print('Published six AI trials + six short original references; race audio unchanged', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--ffmpeg', required=True, type=Path)
    parser.add_argument('--source', type=Path)
    parser.add_argument('--captions', type=Path)
    parser.add_argument('--stock-wavs', type=Path)
    parser.add_argument('--seed', type=Path)
    parser.add_argument('--cache-root', type=Path, help='Optional shared external model cache')
    parser.add_argument('--device', choices=['cpu', 'cuda'], default='cpu')
    parser.add_argument('--threads', type=int, default=6)
    parser.add_argument('--only')
    parser.add_argument('--timbre-only', action='store_true', help='Diagnostic: preserve source delivery; convert timbre only')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--prepare', action='store_true')
    group.add_argument('--convert', action='store_true')
    group.add_argument('--publish', action='store_true')
    args = parser.parse_args()
    if args.timbre_only:
        PARAMS['convert_style'] = False
    args.out = outside_repo(args.out)
    args.out.mkdir(parents=True, exist_ok=True)
    if args.prepare:
        if not all([args.source, args.captions, args.stock_wavs]):
            parser.error('--prepare requires --source, --captions and --stock-wavs')
        prepare(args)
    elif args.convert:
        if not args.seed:
            parser.error('--convert requires --seed')
        convert(args)
    else:
        publish(args)


if __name__ == '__main__':
    main()
