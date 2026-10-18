"""Review bilingual scripts, then optionally bake Azure stock-voice WAV samples offline.

No game manifest is changed. No RVC training or commentator cloning is performed.
Credentials come from environment variables or an external, private JSON file.
"""
import argparse
import array
import hashlib
import io
import json
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.request
import wave
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'public/assets/race-audio/commentary-script.json'
FORMAT = 'riff-24khz-16bit-mono-pcm'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load_script(path=SCRIPT):
    script = json.loads(Path(path).read_text(encoding='utf-8'))
    if script['kind'] != 'authored-commentary-trial' or script['runtimeEnabled'] is not False:
        raise ValueError('Trial must remain separate from the game audio manifest')
    ids = set()
    for cue in script['cues']:
        if not re.fullmatch(r'[a-z]+(?:-[a-z]+)*', cue['id']) or cue['id'] in ids:
            raise ValueError('Invalid or duplicate cue ID')
        ids.add(cue['id'])
        if not 0 < cue['maxSeconds'] <= 10 or not -10 <= cue['rate'] <= 15:
            raise ValueError('Cue duration/rate outside trial bounds')
        for language in ('vi', 'km'):
            text = cue['text'][language]
            if not text.strip() or len(text) > 250 or any(c in text for c in '<>{}'):
                raise ValueError('Use complete, short sentences without placeholders/markup')
        if not any('\u1780' <= c <= '\u17ff' for c in cue['text']['km']):
            raise ValueError('Khmer line is missing Khmer writing')
        for ref in cue['referenceIds']:
            if ref not in script['references']:
                raise ValueError('Missing script reference')
    for item in script['sampleSequence']:
        if item['cueId'] not in ids or item['language'] not in ('vi', 'km'):
            raise ValueError('Invalid example sequence')
    return script


def ssml(script, cue, language):
    voice = script['voices'][language]
    rate = f"{cue['rate']:+d}%"
    return (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
            f'xml:lang="{voice["locale"]}"><voice name="{voice["name"]}">'
            f'<prosody rate="{rate}">{escape(cue["text"][language])}</prosody>'
            '</voice></speak>')


def make_plan(script):
    samples = []
    for cue in script['cues']:
        for language in ('vi', 'km'):
            xml = ssml(script, cue, language)
            samples.append({
                'id': cue['id'] + '-' + language, 'cueId': cue['id'], 'language': language,
                'provider': 'azure-stock-neural', 'voice': script['voices'][language]['name'],
                'text': cue['text'][language], 'ssml': xml, 'requestSha256': sha(xml.encode('utf-8')),
                'maxSeconds': cue['maxSeconds'], 'file': cue['id'] + '-' + language + '.wav',
            })
    return {
        'schema': 1, 'mode': 'authored-stock-voice-trial', 'runtimeEnabled': False,
        'scriptSha256': sha(SCRIPT.read_bytes()),
        'sampleCount': len(samples), 'textCharacters': sum(len(s['text']) for s in samples),
        'requestCharactersUpperBound': sum(len(s['ssml']) for s in samples),
        'samples': samples,
    }


def write_doc(script, plan):
    lines = [
        '# Kịch bản bình luận thử Việt–Khmer', '',
        'Nguồn biên soạn duy nhất: `public/assets/race-audio/commentary-script.json`.',
        'Tài liệu này được xuất bằng `python scripts/build-commentary-trial.py --write-doc`.', '',
        f"Có {len(script['cues'])} tình huống, {plan['sampleCount']} câu Việt–Khmer. Đây là kịch bản mới, không phải lời chép nguyên văn của hai BLV.",
        'Chưa tạo voice; chưa nhân bản hai BLV. Bản Khmer là bản nháp chờ người rành tiếng thẩm định, gồm cả tên riêng và cách đọc số.', '',
        '## Cách diễn đạt và thứ tự', '',
    ]
    lines.extend('- ' + value for value in script['direction'].values())
    lines += ['', 'Thứ tự dưới đây là ví dụ có nhánh theo diễn biến, không phải timeline phát cứng:', '']
    for i, item in enumerate(script['sampleSequence'], 1):
        lines.append(f"{i}. `{item['cueId']}` / {item['language']}: {item['note']}")
    lines += ['', '## Lời bình và điều kiện', '']
    for cue in script['cues']:
        lines += [f"### {cue['label']} (`{cue['id']}`)", '',
                  '- Việt: ' + cue['text']['vi'], '- Khmer (nháp): ' + cue['text']['km'],
                  '- Khi phát: ' + cue['whenVi'],
                  f"- Thời lượng tối đa mỗi câu: {cue['maxSeconds']} giây; tốc độ SSML thử: {cue['rate']:+d}%."]
        for ref_id in cue['referenceIds']:
            ref = script['references'][ref_id]
            lines.append(f"- Đối chiếu: [{ref_id}]({ref['url']}). {ref['basis']}.")
        lines.append('')
    lines += [
        '## Tạo mẫu Azure trước, RVC sau', '',
        'Chỉ dùng giọng stock `vi-VN-NamMinhNeural` và `km-KH-PisethNeural` để kiểm tra nội dung/cách đọc trước. Không gắn nhãn hai BLV thật cho mẫu Azure.',
        'Các giọng này không có style thể thao được xác minh; tăng tốc SSML không chứng minh có cảm xúc bình luận trực tiếp.', '',
        f"Kế hoạch: {plan['textCharacters']} ký tự lời đọc, tối đa {plan['requestCharactersUpperBound']} ký tự nếu tính cả toàn bộ XML. Đây là ước lượng cho bộ mẫu, không phải số quota Azure còn lại.",
        'Chạy không có `--synthesize` chỉ kiểm tra/xuất kế hoạch, không gọi mạng hay dùng quota.', '',
        '```powershell',
        'python scripts/build-commentary-trial.py --write-doc --out "E:/AI/Um Tuk/asset-studio/audio-references/commentary-trial"',
        'python scripts/build-commentary-trial.py --synthesize --config "E:/AI/Um Tuk/asset-studio/audio-references/azure-speech.json" --out "E:/AI/Um Tuk/asset-studio/audio-references/commentary-trial"',
        '```', '',
        'Cấu hình riêng nằm ngoài repo, gồm `key`, `region`, `tier: "F0"`; không đưa key vào chat, website hoặc Git. Cũng hỗ trợ `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `AZURE_SPEECH_TIER` trong môi trường tiến trình.',
        'Công cụ kiểm tra danh sách voice của resource, gửi từng câu qua REST, giới hạn khoảng 18 request/phút, lưu cache theo SHA của SSML và kiểm tra WAV mono 24 kHz/16 bit, tín hiệu khác 0, thời lượng. Không tự nâng gói hoặc gọi batch API. Không tự retry POST sau lỗi mạng để tránh nhân đôi lượt tính phí không xác định.',
        'Nhãn F0 trong cấu hình là khai báo của người dùng; phải đối chiếu SKU/quota còn lại trên resource trước khi chạy. Script không có quyền ARM để chứng nhận SKU hay mức sử dụng toàn tài khoản.', '',
        'RVC chưa được cài/huấn luyện trong thử nghiệm này. Bước tiếp theo cần hai bộ thu sạch, đúng một BLV mỗi bộ, quyền sử dụng/nhân bản giọng và hai model độc lập. Không dùng model nhận dạng Whisper thay cho model chuyển giọng. Chưa có bằng chứng cho phép của hai BLV.',
        'Chỉ đưa vào runtime sau khi nghe duyệt nội dung, phát âm Khmer/tên riêng, cảm xúc và đối chiếu người nói. Kiểm tra kỹ thuật không chứng minh các tiêu chí nghe này.', '',
        'Tài liệu kỹ thuật: [Azure REST TTS](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech), [Azure quotas](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits), [RVC chính thức](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI).', '',
    ]
    (ROOT / 'docs/commentary-script.md').write_text('\n'.join(lines), encoding='utf-8', newline='\n')


def credentials(config_path):
    config = {}
    if config_path:
        path = Path(config_path).resolve()
        if path.is_relative_to(ROOT):
            raise ValueError('Keep the private Azure credential file outside the repository')
        config = json.loads(path.read_text(encoding='utf-8-sig'))
    key = config.get('key') or os.environ.get('AZURE_SPEECH_KEY') or os.environ.get('SPEECH_KEY')
    region = config.get('region') or os.environ.get('AZURE_SPEECH_REGION') or os.environ.get('SPEECH_REGION')
    tier = config.get('tier') or os.environ.get('AZURE_SPEECH_TIER')
    if not key or not region:
        raise ValueError('Azure Speech key/region are not connected; no synthesis request was sent')
    if tier != 'F0':
        raise ValueError('This trial requires an explicitly identified F0 resource; no upgrade is performed')
    if not re.fullmatch(r'[a-z][a-z0-9]{1,39}', region):
        raise ValueError('Invalid Azure region; custom credential destinations are not accepted')
    return key, region


def inspect_wav(data, max_seconds):
    with wave.open(io.BytesIO(data), 'rb') as wav:
        if (wav.getnchannels(), wav.getframerate(), wav.getsampwidth()) != (1, 24000, 2):
            raise ValueError('Expected mono 24 kHz, 16-bit WAV')
        duration = wav.getnframes() / wav.getframerate()
        samples = array.array('h', wav.readframes(wav.getnframes()))
    if sys.byteorder != 'little':
        samples.byteswap()
    peak = max((abs(s) for s in samples), default=0) / 32768
    if not .15 <= duration <= max_seconds or not 0 < peak < 1:
        raise ValueError('Silent, clipped or over-duration sample; review text/rate before retrying')
    return {'duration': round(duration, 4), 'peak': round(peak, 6)}


def synthesize(script, plan, out, config_path, budget):
    key, region = credentials(config_path)
    if plan['requestCharactersUpperBound'] > budget:
        raise ValueError('Planned requests exceed this run character budget; no request was sent')
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = out / 'manifest.json'
    prior = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    entries = {s['id']: s for s in prior.get('samples', [])}
    # Persist request time before sending so an interrupted/restarted run also throttles.
    request_clock = out / 'last-request.json'
    last_request = json.loads(request_clock.read_text()).get('at', 0) if request_clock.exists() else 0

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    opener = urllib.request.build_opener(NoRedirect)

    def request(path, body=None):
        nonlocal last_request
        time.sleep(max(0, last_request + 3.4 - time.time()))
        last_request = time.time()
        request_clock.write_text(json.dumps({'at': last_request}), encoding='utf-8')
        headers = {'Ocp-Apim-Subscription-Key': key, 'User-Agent': 'Tuk-Ngo-commentary-trial'}
        if body is not None:
            headers.update({'Content-Type': 'application/ssml+xml; charset=utf-8', 'X-Microsoft-OutputFormat': FORMAT})
        req = urllib.request.Request(f'https://{region}.tts.speech.microsoft.com' + path, body, headers)
        try:
            with opener.open(req, timeout=60) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            raise ValueError(f'Azure returned HTTP {error.code}; stopped without automatic POST retries') from None
        except urllib.error.URLError:
            raise ValueError('Azure connection failed; request billing status is unknown. No automatic retry.') from None

    available = json.loads(request('/cognitiveservices/voices/list'))
    for language, voice in script['voices'].items():
        if not any(v.get('ShortName') == voice['name'] and v.get('Locale') == voice['locale'] for v in available):
            raise ValueError('Selected stock voice is unavailable on this resource')
    result = {**{k: v for k, v in plan.items() if k != 'samples'}, 'sourceType': 'azure-stock-neural',
              'review': script['review'], 'samples': []}
    for sample in plan['samples']:
        target = out / sample['file']
        old = entries.get(sample['id'])
        cached = (old and old.get('requestSha256') == sample['requestSha256'] and target.exists()
                  and sha(target.read_bytes()) == old.get('sha256'))
        data = target.read_bytes() if cached else request('/cognitiveservices/v1', sample['ssml'].encode('utf-8'))
        signal = inspect_wav(data, sample['maxSeconds'])
        if not cached:
            temporary = target.with_suffix('.wav.tmp')
            temporary.write_bytes(data)
            temporary.replace(target)
        entries[sample['id']] = {k: v for k, v in sample.items() if k != 'ssml'} | signal | {
            'sha256': sha(data), 'cached': bool(cached), 'listeningVerified': False}
        # Keep valid later cache entries when a resumed run stops partway through.
        result['samples'] = [entries[s['id']] for s in plan['samples'] if s['id'] in entries
                             and entries[s['id']].get('requestSha256') == s['requestSha256']]
        manifest_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
        print(json.dumps({'created': sample['id'], 'cached': bool(cached), **signal}), flush=True)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, help='Local trial directory, preferably outside the repository')
    parser.add_argument('--config', help='Private Azure JSON outside the repository; never printed')
    parser.add_argument('--write-doc', action='store_true')
    parser.add_argument('--synthesize', action='store_true', help='Actually call Azure; default is offline plan only')
    parser.add_argument('--max-characters', type=int, default=15000, help='Conservative SSML request-character cap')
    args = parser.parse_args()
    script = load_script()
    plan = make_plan(script)
    if args.write_doc:
        write_doc(script, plan)
    if args.out:
        args.out.mkdir(parents=True, exist_ok=True)
        (args.out / 'plan.json').write_text(json.dumps(plan, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({k: v for k, v in plan.items() if k != 'samples'}), flush=True)
    if args.synthesize:
        if not args.out:
            parser.error('--out is required for synthesis')
        synthesize(script, plan, args.out, args.config, args.max_characters)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, json.JSONDecodeError) as error:
        # Do not expose request headers, configuration content or service error bodies.
        print(f'Trial stopped: {type(error).__name__}: ' + (str(error) if isinstance(error, ValueError) else 'Check local file/connection configuration'), file=sys.stderr)
        raise SystemExit(1)
