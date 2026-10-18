"""Offline content/provenance and safety checks; no claim of Azure success or listening."""
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import wave

spec = importlib.util.spec_from_file_location('commentary_trial', Path(__file__).with_name('build-commentary-trial.py'))
trial = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trial)


class CommentaryTrialChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.script = trial.load_script()
        cls.plan = trial.make_plan(cls.script)
        cls.original = json.loads((trial.ROOT / 'public/assets/race-audio/manifest.json').read_text(encoding='utf-8'))

    def test_complete_bilingual_plan_without_network(self):
        with patch('urllib.request.OpenerDirector.open', side_effect=AssertionError('Unexpected network')):
            plan = trial.make_plan(trial.load_script())
        self.assertEqual(plan['sampleCount'], 40)
        self.assertEqual({s['language'] for s in plan['samples']}, {'vi', 'km'})
        self.assertLessEqual(plan['requestCharactersUpperBound'], 15000)
        self.assertEqual(len({s['id'] for s in plan['samples']}), 40)
        for sample in plan['samples']:
            self.assertNotIn('express-as', sample['ssml'])
            self.assertEqual(sample['provider'], 'azure-stock-neural')

    def test_history_matches_existing_verified_registration(self):
        for cue in self.script['cues']:
            if 'history' not in cue:
                continue
            history = cue['history']
            facts = self.original['teamProfiles'][history['teamId']]['historyFacts']
            self.assertTrue(any(all(f.get(k) == history[k] for k in ('season', 'gender', 'result')) for f in facts))
            self.assertEqual(cue['conditions']['teamIds'], [history['teamId']])
            self.assertLess(cue['conditions']['maxDistance'], 950)
            self.assertIn('2024', cue['text']['vi'])

    def test_original_source_references_resolve(self):
        for ref in self.script['references'].values():
            if 'cutKey' not in ref:
                continue
            cut = self.original['clips'][ref['cutKey']]
            source = self.original['sources'][cut['sourceId']]
            self.assertTrue(ref['url'].startswith(source['url'] + '&t='))
            self.assertEqual(int(ref['url'].split('&t=')[1].rstrip('s')), int(cut['start']))

    def test_result_and_surge_are_not_unconditional(self):
        cues = {c['id']: c for c in self.script['cues']}
        self.assertEqual(cues['surge']['conditions']['surgeActive'], True)
        self.assertEqual(cues['surge']['conditions']['minDistance'], 950)
        for result in ('win', 'loss', 'tie', 'dnf'):
            cue = cues['finish-' + result]
            self.assertEqual(cue['conditions']['phases'], ['finished'])
            self.assertEqual(cue['conditions']['results'], [result])
            self.assertNotIn('vô địch', cue['text']['vi'])

    def test_missing_key_or_paid_resource_stops_before_requests(self):
        with patch.dict(os.environ, {}, clear=True), patch('urllib.request.OpenerDirector.open') as network:
            with self.assertRaisesRegex(ValueError, 'not connected'):
                trial.credentials(None)
            network.assert_not_called()
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / 'test-speech.json'
            config.write_text(json.dumps({'key': 'not-a-real-key', 'region': 'southeastasia', 'tier': 'S0'}))
            with self.assertRaisesRegex(ValueError, 'F0'):
                trial.credentials(config)
            config.write_text(json.dumps({'key': 'not-a-real-key', 'region': 'evil.example/path', 'tier': 'F0'}))
            with self.assertRaisesRegex(ValueError, 'region'):
                trial.credentials(config)

    def test_silent_and_overlong_audio_are_rejected(self):
        for seconds in (1, 11):
            buffer = io.BytesIO()
            with wave.open(buffer, 'wb') as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(24000)
                wav.writeframes(b'\x00\x00' * 24000 * seconds)
            with self.assertRaisesRegex(ValueError, 'Silent, clipped or over-duration'):
                trial.inspect_wav(buffer.getvalue(), 5)

    def test_public_samples_match_script_and_never_replace_broadcast_manifest(self):
        path = trial.ROOT / 'public/assets/race-audio/commentary-trial/manifest.json'
        published = json.loads(path.read_text(encoding='utf-8'))
        self.assertEqual(published['scriptSha256'], self.plan['scriptSha256'])
        self.assertFalse(published['runtimeEnabled'])
        self.assertEqual(published['sourceType'], 'azure-stock-neural')
        self.assertEqual(len(published['samples']), 40)
        self.assertEqual(len(self.original['clips']), 72)
        expected = {s['id']: s for s in self.plan['samples']}
        for sample in published['samples']:
            self.assertEqual(sample['requestSha256'], expected[sample['id']]['requestSha256'])
            self.assertEqual(sample['text'], expected[sample['id']]['text'])
            self.assertLessEqual(sample['duration'], sample['maxSeconds'] + .1)
            data = (trial.ROOT / 'public/assets/race-audio' / sample['file']).read_bytes()
            self.assertEqual(trial.sha(data), sample['sha256'])
        self.assertNotIn('key', published)
        self.assertNotIn('endpoint', published)

    def test_incomplete_synthesis_is_rejected_before_publication(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            (out / 'manifest.json').write_text(json.dumps({'sourceType': 'azure-stock-neural',
                'scriptSha256': self.plan['scriptSha256'], 'samples': []}))
            with self.assertRaisesRegex(ValueError, 'Complete, current'):
                trial.publish_samples(self.plan, out)

    def test_voice_experiment_is_unapproved_separate_and_source_bound(self):
        folder = trial.ROOT / 'public/assets/race-audio'
        voice = json.loads((folder / 'voice-trial/manifest.json').read_text(encoding='utf-8'))
        self.assertNotIn(b'\r', (folder / 'voice-trial/manifest.json').read_bytes(), 'Canonical LF bytes must match GitHub Pages')
        self.assertEqual(voice['sourceType'], 'ai-reference-voice-conversion')
        self.assertEqual(voice['status'], 'unapproved-content-fidelity')
        self.assertEqual(voice['scriptSha256'], self.plan['scriptSha256'])
        for key in ('runtimeEnabled', 'trainedSpeakerModels', 'independentListeningVerified',
                    'emotionVerified', 'speakerIdentityVerified', 'khmerPronunciationVerified'):
            self.assertFalse(voice[key])
        self.assertEqual(len(voice['samples']), 6)
        stock = {s['id']: s for s in json.loads((folder / 'commentary-trial/manifest.json').read_text(encoding='utf-8'))['samples']}
        self.assertEqual({s['language'] for s in voice['samples']}, {'vi', 'km'})
        for s in voice['samples']:
            source = stock[s['cueId'] + '-' + s['language']]
            self.assertEqual(s['text'], source['text'])
            self.assertEqual(s['stockSha256'], source['sha256'])
            self.assertFalse(s['asr']['nativeReviewed'])
            for file, digest in [(s['file'], s['sha256']), (s['referenceFile'], s['referenceSha256'])]:
                self.assertEqual(trial.sha((folder / file).read_bytes()), digest)
        control = voice['control']
        self.assertFalse(control['parameters']['convert_style'])
        self.assertEqual(trial.sha((folder / control['file']).read_bytes()), control['sha256'])
        self.assertEqual(len(self.original['clips']), 72)


if __name__ == '__main__':
    unittest.main()
