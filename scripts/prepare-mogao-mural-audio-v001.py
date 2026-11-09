#!/usr/bin/env python3
"""Prepare the supplied third-gallery narration, retaining the original recordings."""

import argparse
from dataclasses import dataclass
from hashlib import sha256
import json
from pathlib import Path
import re
import shutil
import subprocess


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = Path('mogao-mural-audio/v001')
ARCHIVE = ROOT / 'art-source/world' / ASSET_DIR
RUNTIME = ROOT / 'public/assets/world' / ASSET_DIR
CONTENT = ROOT / 'src/content/world'
MARKER = re.compile(r'分段[0-9]+\s*[:：]?')


@dataclass(frozen=True)
class Cut:
    id: str
    first: int
    last: int
    start: float
    end: float


@dataclass(frozen=True)
class Source:
    folder: str
    audio: str
    cuts: tuple[Cut, ...]
    alternative: str | None = None


# Boundaries are in decoded source seconds. The supplied cue ranges identify
# the spoken text, while the waveform fixes cuts around the segment markers.
SOURCES = {
    'nine-colored-deer-v002': Source('九色鹿', '九色鹿.mp3', (
        Cut('deer-introduction', 1, 6, 1.460, 23.530),
        Cut('rescue-and-promise', 8, 10, 25.710, 38.650),
        Cut('queen-and-betrayal', 11, 13, 40.350, 52.480),
        Cut('hunt-and-sleep', 14, 16, 54.270, 64.660),
        Cut('appeal-to-the-king', 17, 21, 66.550, 84.780),
        Cut('broken-oath', 22, 23, 86.550, 92.280),
    )),
    'novice-precepts': Source('沙弥守戒', '沙弥守戒.mp3', (
        Cut('introduction', 1, 3, 1.460, 11.420),
        Cut('ordination', 4, 11, 13.130, 44.540),
        # In these three cues the next marker is spoken directly after the final word.
        Cut('novice-and-girl', 12, 18, 46.230, 69.240),
        Cut('confession', 19, 20, 70.610, 77.750),
        Cut('fine', 21, 26, 79.140, 100.810),
        Cut('cremation', 27, 29, 101.960, 112.980),
    )),
    'bandits': Source('500强盗皈依', '500强盗皈依(1).mp3', (
        Cut('overview', 1, 2, 1.400, 8.170),
        Cut('defeat', 8, 11, 27.490, 44.450),
        Cut('captured', 12, 13, 46.150, 51.560),
        Cut('trial', 14, 15, 53.330, 62.650),
        Cut('punishment', 16, 18, 64.410, 75.570),
        Cut('restored-sight', 19, 28, 77.120, 117.250),
        Cut('ordained', 29, 30, 119.220, 127.640),
        Cut('forest', 31, 33, 129.360, 140.260),
        # The supplied recording includes the existing summary in its opening.
        Cut('ending', 3, 7, 8.850, 25.830),
    ), alternative='500强盗皈依.mp3'),
    'burning-house': Source('火宅喻', '火宅喻.mp3', (
        Cut('overview', 1, 2, 1.440, 11.250),
        Cut('fire', 3, 6, 13.080, 27.710),
        Cut('three-carts', 7, 8, 29.490, 38.650),
        Cut('ending', 9, 13, 40.470, 56.260),
    )),
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def write_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def digest(path: Path):
    return sha256(path.read_bytes()).hexdigest()


def timestamp(value: str):
    hours, minutes, seconds = value.split(':')
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds.replace(',', '.'))


def read_subtitles(path: Path):
    subtitles = {}
    for paragraph in re.split(r'\n\s*\n', path.read_text(encoding='utf-8-sig').strip()):
        index, timing, *lines = paragraph.splitlines()
        start, _ = map(timestamp, timing.split(' --> '))
        subtitles[int(index)] = (start, MARKER.sub('', ''.join(lines)).strip())
    return subtitles


def manuscript():
    deer = read_json(CONTENT / 'nine-colored-deer-v002.json')
    intro = read_json(CONTENT / 'deer-introduction-v001.json')
    novice = read_json(CONTENT / 'novice-story-v001.json')
    text = {
        deer['id']: {part['id']: part['text'] for part in [intro, *deer['segments']]},
        novice['id']: {part['id']: part['text'] for part in [novice['introduction'], *novice['segments']]},
    }
    # These are the two places where the supplied audio differs from the old manuscript.
    text[deer['id']]['rescue-and-promise'] = text[deer['id']]['rescue-and-promise'].replace('溺水人因之许诺', '溺水人许诺')
    text[deer['id']]['broken-oath'] = text[deer['id']]['broken-oath'].replace('生疮而死', '生疮死')
    for story in read_json(CONTENT / 'mogao-hall-a-v001.json')['stories']:
        text[story['id']] = {
            'overview': story['overview'],
            **{segment['id']: segment['text'] for segment in story['segments']},
            'ending': story['ending'],
        }
    return text


def align_subtitles(text: str, phrases: list[str]):
    def normalize(value: str):
        return ''.join(char for char in value if char.isalnum())

    normalized = [normalize(phrase) for phrase in phrases]
    if not all(normalized) or ''.join(normalized) != normalize(text):
        raise ValueError(f'Subtitles differ from the narration manuscript: {text!r}, {phrases!r}')
    locations = [index for index, char in enumerate(text) if char.isalnum()]
    total = 0
    start = 0
    for phrase in normalized:
        total += len(phrase)
        end = locations[total] if total < len(locations) else len(text)
        yield text[start:end].strip()
        start = end


def track_cues(cut: Cut, subtitles: dict, text: str, duration: float):
    raw = [subtitles[index] for index in range(cut.first, cut.last + 1)]
    phrases = list(align_subtitles(text, [phrase for _, phrase in raw]))
    # Closing summaries appear at once, as in the existing gallery.
    if cut.id == 'ending':
        return [{'start': 0, 'end': duration, 'text': text}]
    boundaries = [0, *(round(start - cut.start, 3) for start, _ in raw[1:]), duration]
    cues = []
    for i, phrase in enumerate(phrases):
        start, end = boundaries[i:i+2]
        if not (0 <= start < end <= duration):
            raise ValueError(f'Invalid subtitle bounds for {cut.id}: {start}, {end}')
        cues.append({'start': start, 'end': end, 'text': phrase})
    return cues


def archive(source: Source, import_from: Path | None):
    names = [source.audio, f'{source.folder}.srt']
    if source.alternative:
        names.append(source.alternative)
    assets = {}
    folder = ARCHIVE / source.folder
    folder.mkdir(parents=True, exist_ok=True)
    for name in names:
        target = folder / name
        if import_from:
            original = import_from / source.folder / name
            if not target.exists():
                shutil.copy2(original, target)
            if digest(target) != digest(original):
                raise ValueError(f'Archived source differs from supplied file: {original}')
        assets[name] = {'bytes': target.stat().st_size, 'sha256': digest(target)}
    return assets


def write_track(story: str, source: Source, cut: Cut, subtitles: dict, text: str):
    duration = round(cut.end - cut.start, 3)
    cues = track_cues(cut, subtitles, text, duration)
    target = RUNTIME / story / f'{cut.id}.mp3'
    target.parent.mkdir(parents=True, exist_ok=True)
    trim = f'atrim=start={cut.start:.3f}:end={cut.end:.3f},asetpts=PTS-STARTPTS'
    fade = f'afade=t=in:st=0:d=0.008,afade=t=out:st={duration-.008:.3f}:d=0.008'
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
        '-i', str(ARCHIVE / source.folder / source.audio), '-vn', '-af', f'{trim},{fade}',
        '-map_metadata', '-1', '-ac', '1', '-ar', '32000', '-codec:a', 'libmp3lame', '-b:a', '56k', str(target),
    ], check=True)
    return {
        'path': (ASSET_DIR / story / target.name).as_posix(),
        'duration': duration,
        'text': text,
        'cues': cues,
    }, target.stat().st_size


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--import-from', type=Path, help='Directory containing the four supplied story folders')
    args = parser.parse_args()
    text = manuscript()
    runtime = {}
    provenance = {}
    total_bytes = 0
    for story, source in SOURCES.items():
        assets = archive(source, args.import_from)
        subtitles = read_subtitles(ARCHIVE / source.folder / f'{source.folder}.srt')
        runtime[story] = {}
        for cut in source.cuts:
            track, size = write_track(story, source, cut, subtitles, text[story][cut.id])
            runtime[story][cut.id] = track
            total_bytes += size
        provenance[story] = {
            'folder': source.folder,
            'usedAudio': source.audio,
            'unusedAudio': source.alternative,
            'files': assets,
            'cuts': {cut.id: {'start': cut.start, 'end': cut.end, 'srt': [cut.first, cut.last]} for cut in source.cuts},
        }
    count = sum(len(tracks) for tracks in runtime.values())
    write_json(CONTENT / 'mogao-mural-audio-v001.json', runtime)
    write_json(ARCHIVE / 'manifest.json', {
        'source': '用户供稿《第三馆壁画配音》。保留全部原始录音和 SRT。',
        'processing': '用供稿字幕和波形对齐，裁去分段口令，段首段尾短淡入淡出。',
        'stories': provenance,
        'runtime': {'format': 'MP3', 'channels': 1, 'sampleRate': 32000, 'bitrateKbps': 56, 'count': count, 'bytes': total_bytes},
    })
    print(f'Prepared {count} narration clips ({total_bytes:,} bytes).')


if __name__ == '__main__':
    main()
