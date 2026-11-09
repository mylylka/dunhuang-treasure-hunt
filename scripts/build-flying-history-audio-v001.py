#!/usr/bin/env python3
"""Cut the supplied performances into the 23 clips used by the second gallery."""

import argparse
from contextlib import ExitStack
from dataclasses import dataclass
from hashlib import sha256
import json
import math
from pathlib import Path
import re
import subprocess

from asset_intake import AssetIntake, digest, publish_file, read_json, regular_file, staged_path, write_json


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = 'flying-history/v001/audio'
ARCHIVE = ROOT / 'art-source/world' / ASSET_DIR
RUNTIME = ROOT / 'public/assets/world' / ASSET_DIR
CONTENT = ROOT / 'src/content/world/flying-history-audio-v001.json'
DESIGN = ARCHIVE.parent / 'art/飞天壁画设计.txt'
SOURCE_NAMES = {
    'flying': '飞天壁画飞天配音全本',
    'guide': '飞天壁画小导游全本',
    'daily': '小导游初见面、换装完毕、二楼播报',
}
RUNTIME_FORMAT = {'format': 'MP3', 'channels': 1, 'sampleRate': 32000, 'bitrateKbps': 56, 'count': 23}
MARKER = re.compile(r'^分段[一二三四五六七八九十\d]+\s*[:：]\s*|\s*分段[一二三四五六七八九十\d]+\s*$')


@dataclass(frozen=True)
class Cut:
    first: int
    last: int
    start: float
    end: float


# Absolute times in decoded MP3 seconds. Speech alignment identifies each marker;
# the waveform supplies the boundary within the preceding and following pauses.
OPENING = Cut(1, 6, 1.462, 23.683)
FLYING = (
    Cut(7, 12, 25.001, 46.978),
    Cut(13, 19, 48.327, 74.293),
    # The recording places “分段五” inside cue 26, directly after “第428窟飞天”.
    Cut(20, 26, 75.623, 101.823),
    Cut(27, 32, 102.769, 125.485),
    Cut(33, 40, 126.766, 156.579),
    Cut(41, 48, 157.868, 188.241),
    Cut(49, 55, 189.539, 211.360),
    Cut(56, 64, 212.604, 246.812),
    Cut(65, 71, 248.212, 270.533),
)
GUIDE = (
    Cut(1, 6, 1.011, 20.033),
    Cut(7, 13, 21.105, 44.566),
    Cut(14, 20, 45.671, 69.666),
    Cut(21, 26, 70.873, 91.733),
    Cut(27, 34, 93.045, 120.166),
    Cut(35, 42, 121.312, 148.366),
    Cut(43, 49, 149.443, 169.800),
    Cut(50, 58, 170.794, 200.366),
    Cut(59, 65, 201.494, 221.033),
)
DAILY = {
    'welcome': Cut(1, 1, 1.013, 2.866),
    'intro': Cut(2, 5, 3.998, 14.733),
    'ready': Cut(6, 6, 15.852, 17.833),
    'upstairs': Cut(7, 7, 19.028, 38.166),
}


def timestamp(value: str) -> float:
    hours, minutes, seconds = value.split(':')
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds.replace(',', '.'))


def read_subtitles(path: Path) -> dict[int, tuple[float, float, str]]:
    cues = {}
    for paragraph in re.split(r'\n\s*\n', path.read_text(encoding='utf-8-sig').strip()):
        index, timing, *lines = paragraph.splitlines()
        start, end = map(timestamp, timing.split(' --> '))
        spoken = MARKER.sub('', ''.join(lines)).strip()
        cues[int(index)] = (start, end, spoken)
    return cues


def mp3_details(path: Path) -> tuple[dict, float]:
    result = subprocess.run([
        'ffprobe', '-v', 'error', '-select_streams', 'a:0', '-of', 'json',
        '-show_entries', 'stream=codec_name,channels,sample_rate:format=format_name,duration', str(path),
    ], capture_output=True, check=True, timeout=30)
    details = json.loads(result.stdout)
    streams = details.get('streams', [])
    container = details.get('format', {})
    duration = float(container.get('duration', 0))
    if (len(streams) != 1 or streams[0]['codec_name'] != 'mp3' or container.get('format_name') != 'mp3'
            or not math.isfinite(duration) or duration <= 0):
        raise ValueError(f'Invalid MP3 recording: {path}')
    return streams[0], duration


def opening_subtitles(subtitles: dict[int, tuple[float, float, str]]) -> list[tuple[float, float, str]]:
    text = re.findall(r'^飞天：(.+)$', DESIGN.read_text(encoding='utf-8-sig'), re.MULTILINE)
    # Each authored paragraph spans one or more consecutive cues in the recording.
    paragraphs = []
    for (first, last), paragraph in zip(((1, 1), (2, 4), (5, 6)), text, strict=True):
        spoken = ''.join(subtitles[index][2] for index in range(first, last + 1))
        if re.sub(r'[\W_]+', '', paragraph) != re.sub(r'[\W_]+', '', spoken):
            raise ValueError('Opening paragraph differs from the recording subtitles')
        start = subtitles[first][0]
        end = subtitles[last + 1][0] if last < OPENING.last else OPENING.end
        paragraphs.append((start, end, paragraph))
    return paragraphs


def archive_sources(intake: AssetIntake, import_from: Path | None, previous: dict) -> tuple[dict, dict]:
    sources = {}
    paths = {}
    for voice, stem in SOURCE_NAMES.items():
        sources[voice] = {}
        paths[voice] = {}
        for extension in ('mp3', 'srt'):
            file = f'{stem}.{extension}'
            old = previous.get(voice, {}).get(extension, {})
            legacy = str((ARCHIVE / file).relative_to(ROOT))
            original = intake.original(old.get('originalPath', legacy), expected=old.get('sha256'),
                                       local=import_from / file if import_from else None,
                                       validate=mp3_details if extension == 'mp3' else read_subtitles)
            row = {'file': file, 'bytes': original.path.stat().st_size, 'sha256': original.sha256}
            if old and any(row[key] != old[key] for key in row):
                raise ValueError(f'Archived recording differs from its record: {file}')
            if original.reference != legacy:
                row['originalPath'] = original.reference
            sources[voice][extension] = {**old, **row}
            paths[voice][extension] = original.path
    return sources, paths


def daily_subtitles(name: str, subtitles: list[tuple[float, float, str]]) -> list[tuple[float, float, str]]:
    # Keep the wording and punctuation already used by the gallery's interface.
    if name == 'upstairs':
        # The supplied cue runs over 20 seconds. These boundaries follow the recording's sentences.
        return [
            (19.028, 24.574, '这边是音乐坊，在敦煌壁画中，藏着数千件古代乐器的身影。'),
            (24.574, 31.535, '这里既有中原流传的筝、笙，也有沿丝绸之路传来的箜篌、筚篥，'),
            (31.535, 35.193, '不同地域的音乐在敦煌相遇、交融。'),
            (35.193, 38.166, '点点这些乐器，听听它们的声音吧！'),
        ]
    texts = {
        'welcome': ['您好，欢迎来到乐舞馆。'],
        'intro': [
            '这里有飞天、乐舞、乐器和服饰，',
            '藏着敦煌的千年生活与丝路故事。',
            '让我陪你逛逛吧！',
            '你也可以选一套敦煌记载的衣裳，帮我装扮。',
        ],
        'ready': ['我换好了，咱们去逛逛吧'],
    }[name]
    return [(start, end, text) for (start, end, _), text in zip(subtitles, texts, strict=True)]


def clip_metadata(voice: str, name: str, cut: Cut, subtitles: dict[int, tuple[float, float, str]]) -> dict:
    duration = round(cut.end - cut.start, 3)
    raw = [subtitles[index] for index in range(cut.first, cut.last + 1)]
    if name == 'opening':
        raw = opening_subtitles(subtitles)
    elif voice == 'daily':
        raw = daily_subtitles(name, raw)
    cues = [
        {'start': round(max(0, start - cut.start), 3), 'end': round(min(duration, end - cut.start), 3), 'text': text}
        for start, end, text in raw
    ]
    if any(not (0 <= cue['start'] < cue['end'] <= duration) or not cue['text'] or '分段' in cue['text'] for cue in cues):
        raise ValueError(f'Invalid timed subtitle in {name}')
    return {'path': f'{ASSET_DIR}/{name}.mp3', 'duration': duration, 'cues': cues}


def encode_clip(source: Path, destination: Path, cut: Cut, duration: float) -> None:
    fade_out = duration - .008
    trim = f'atrim=start={cut.start:.3f}:end={cut.end:.3f},asetpts=PTS-STARTPTS'
    fades = f'afade=t=in:st=0:d=0.008,afade=t=out:st={fade_out:.3f}:d=0.008'
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
        '-i', str(source), '-vn', '-af', f'{trim},{fades}',
        '-map_metadata', '-1', '-ac', '1', '-ar', '32000', '-codec:a', 'libmp3lame', '-b:a', '56k',
        '-f', 'mp3', str(destination),
    ], check=True)


def runtime_record(path: Path, duration: float) -> dict:
    stream, actual_duration = mp3_details(path)
    # A 32 kHz MP3 can include encoder delay and frame padding at the ends.
    if int(stream['sample_rate']) != 32000 or stream['channels'] != 1 or abs(actual_duration - duration) > .1:
        raise ValueError(f'Unexpected runtime MP3 encoding or duration: {path}')
    return {'bytes': path.stat().st_size, 'sha256': digest(path)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--import-from', type=Path, help='Optional directory with the 3 original MP3/SRT pairs')
    parser.add_argument('--check', action='store_true', help='Verify registered inputs and existing clips without writing')
    args = parser.parse_args()
    if args.check and args.import_from:
        parser.error('--check cannot import new originals')
    intake = AssetIntake(ROOT)
    with intake.transaction():
        prepare_audio(intake, args.import_from, args.check)


def prepare_audio(intake: AssetIntake, import_from: Path | None, check: bool) -> None:
    manifest_path = ARCHIVE / 'manifest.json'
    previous = read_json(manifest_path, {})
    old_content = read_json(CONTENT)
    old_sources = previous.get('sources', {})
    sources, paths = archive_sources(intake, import_from, old_sources)
    subtitles = {voice: read_subtitles(paths[voice]['srt']) for voice in SOURCE_NAMES}
    clips = []

    def add_clip(voice: str, name: str, cut: Cut) -> dict:
        metadata = clip_metadata(voice, name, cut, subtitles[voice])
        clips.append((voice, name, cut, metadata))
        return metadata

    def chapter_clips(voice: str, cuts: tuple[Cut, ...]) -> list[dict]:
        return [add_clip(voice, f'{voice}-{index:02d}', cut) for index, cut in enumerate(cuts, 1)]

    data = {
        'opening': add_clip('flying', 'opening', OPENING),
        'flying': chapter_clips('flying', FLYING),
        'guide': chapter_clips('guide', GUIDE),
        'daily': {name: add_clip('daily', name, cut) for name, cut in DAILY.items()},
    }
    old_runtime = previous.get('runtime', {})
    known = old_runtime.get('outputs', {})
    metadata_hash = sha256(json.dumps(data, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    matching_sources = all(old_sources.get(voice, {}).get(extension, {}).get('sha256') == row['sha256']
                           for voice, inputs in sources.items() for extension, row in inputs.items())
    matching_format = all(old_runtime.get(key) == value for key, value in RUNTIME_FORMAT.items())
    matching_records = old_content == data and matching_sources and matching_format
    if old_content is not None and old_content != data:
        raise ValueError('Published clip timings differ; use a new version.')
    if known and not (matching_sources and matching_format and old_runtime.get('metadataSha256') == metadata_hash):
        raise ValueError('Published clip hashes disagree with their recordings, cues or encoding record.')
    if check and not matching_records:
        raise ValueError('Published clip records do not match the source recordings.')

    outputs = {}
    missing = []
    for voice, name, cut, metadata in clips:
        filename = f'{name}.mp3'
        destination = RUNTIME / filename
        expected = known.get(filename)
        if not regular_file(destination):
            if check:
                raise FileNotFoundError(destination)
            missing.append((voice, cut, metadata['duration'], filename, destination, expected))
            continue
        if not (expected or matching_records):
            raise ValueError(f'Cannot verify an existing clip against its source records: {destination}')
        if expected:
            record = {'bytes': destination.stat().st_size, 'sha256': digest(destination)}
        else:
            record = runtime_record(destination, metadata['duration'])
        if expected and record != expected:
            raise ValueError(f'Published clip differs from its hash: {destination}')
        outputs[filename] = record

    if check:
        print(f'{len(outputs)} existing MP3 clips verified')
        return
    with ExitStack() as staging:
        publish = []
        for voice, cut, duration, filename, destination, expected in missing:
            staged = staging.enter_context(staged_path(RUNTIME))
            encode_clip(paths[voice]['mp3'], staged, cut, duration)
            record = runtime_record(staged, duration)
            if expected and record != expected:
                raise ValueError(f'Rebuilt clip differs from its hash: {destination}')
            outputs[filename] = record
            publish.append((staged, destination, record['sha256']))
        if missing and any(digest(paths[voice][extension]) != row['sha256']
                           for voice, inputs in sources.items() for extension, row in inputs.items()):
            raise ValueError('A source changed during clip encoding.')

        write_json(manifest_path, {
            'provenance': '用户提供的第二馆三组 MP3 及同名 SRT，原件字节保留。',
            'processing': '语音对齐与波形标定分段口令边界，原录音按段裁切，短淡入淡出，分别重算字幕时间。',
            **previous,
            'sources': sources,
            'runtime': {**old_runtime, **RUNTIME_FORMAT, 'metadataSha256': metadata_hash,
                        'outputs': dict(sorted(outputs.items()))},
        }, existing=previous)
        for staged, destination, recorded_sha in publish:
            publish_file(staged, destination, recorded_sha)
        write_json(CONTENT, data, existing=old_content)
    print(f'{len(outputs) - len(missing)} MP3 clips reused, {len(missing)} generated')


if __name__ == '__main__':
    main()
