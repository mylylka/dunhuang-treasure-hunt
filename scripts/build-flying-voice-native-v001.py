"""Opt-in local speech audition. No network, package installation, or existing asset overwrite."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'art-source/world/flying-voice/v001'
RUNTIME = ROOT / 'public/assets/world/flying-voice/v001'
TEXT = '我没有翅膀，却能在天空中自由飞翔。你知道画师是怎样让我看起来像在飞吗？'
VOICE, RATE = 'Tingting', 165
SOURCE.mkdir(parents=True, exist_ok=True)
RUNTIME.mkdir(parents=True, exist_ok=True)
script = SOURCE / 'dialogue.txt'
raw = SOURCE / 'flying-question-native.aiff'
output = RUNTIME / 'flying-question-native.mp3'
manifest = SOURCE / 'manifest.json'
if any(path.exists() for path in [script, raw, output, manifest]):
    raise SystemExit('v001 files already exist; preserve them and use a new version for regeneration.')
script.write_text(TEXT + '\n', encoding='utf-8')
subprocess.run(['say', '-v', VOICE, '-r', str(RATE), '-f', str(script), '-o', str(raw)], check=True)
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-n', '-i', str(raw),
                '-af', 'loudnorm=I=-18:TP=-2:LRA=7', '-ar', '44100', '-ac', '1',
                '-c:a', 'libmp3lame', '-b:a', '128k', str(output)], check=True)
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
    'format=duration,size:stream=codec_name,sample_rate,channels', '-of', 'json', str(output)]))
data = {
    'id': 'flying-question-native-v001', 'status': 'local-voice-audition-not-final',
    'authorization': 'User explicitly selected local female voice audition on 2026-11-01.',
    'source': 'macOS built-in say / installed Tingting zh_CN voice',
    'scriptSource': 'User product plan, section 5.6 飞天提问',
    'text': TEXT, 'voice': VOICE, 'rate': RATE,
    'processing': 'Integrated loudness target -18 LUFS; true peak limit -2 dBTP; mono MP3, no reverb or pitch change.',
    'audio': str(output.relative_to(ROOT)), 'probe': probe,
    'files': {str(p.relative_to(ROOT)): {'bytes': p.stat().st_size,
        'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in [script, raw, output]},
}
manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'audio': str(output), 'duration': probe['format']['duration'], 'bytes': output.stat().st_size}))
