"""Render the approved guide lines with the locally installed Mandarin voice."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/world/music-guide/v001/voice'
OUTPUT = ROOT / 'public/assets/world/music-guide/v001'
SOURCE.mkdir(parents=True, exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)
lines = json.loads(subprocess.check_output([
    'node', '--import', 'tsx', '--input-type=module', '-e',
    "import { MUSIC_GUIDE_LINES } from './src/content/world/music-guide-v001.ts'; "
    'console.log(JSON.stringify(MUSIC_GUIDE_LINES))',
], cwd=ROOT))
manifest = {'voice': 'macOS Tingting zh_CN', 'rate': 225, 'lines': {}}
for name, line in lines.items():
    script, source = SOURCE / f'{name}.txt', SOURCE / f'{name}.aiff'
    output = OUTPUT / f'{name}.mp3'
    if any(path.exists() for path in (script, source, output)):
        raise SystemExit(f'Preserving existing guide voice files for {name}')
    script.write_text(line['text'] + '\n', encoding='utf-8')
    subprocess.run(['say', '-v', 'Tingting', '-r', '225', '-f', str(script), '-o', str(source)], check=True)
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-n', '-i', str(source),
                    '-af', 'loudnorm=I=-18:TP=-2:LRA=7', '-ar', '44100', '-ac', '1',
                    '-c:a', 'libmp3lame', '-b:a', '64k', str(output)], check=True)
    seconds = float(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', str(output),
    ]))
    manifest['lines'][name] = {'seconds': seconds, 'bytes': output.stat().st_size,
        'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}
(SOURCE / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps(manifest))
