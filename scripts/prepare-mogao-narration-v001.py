#!/usr/bin/env python3
"""Import and trim the replacement bandits passage and three third-gallery introductions."""

import argparse
from contextlib import ExitStack
import json
from pathlib import Path
import subprocess

from asset_intake import AssetIntake, VAULT_PREFIX, digest, publish_file, read_json, regular_file, staged_path, write_json


ROOT = Path(__file__).resolve().parents[1]
VERSION = Path('mogao-narration/v001')
RUNTIME = ROOT / 'public/assets/world' / VERSION
MANIFEST = ROOT / 'art-source/world' / VERSION / 'manifest.json'
CONTENT = ROOT / 'src/content/world/mogao-narration-v001.json'
SOURCES = {'bandits': '5百强盗第一张局部图配音', 'introductions': '第三馆其余配音'}
# SRT phrases and decoded waveform place the cuts between the spoken cues and labels.
CUTS = {
    'banditsDefeat': ('bandits', 'bandits-defeat', 1.490, 17.750),
    'hall-a': ('introductions', 'hall-a-introduction', 1.775, 26.945),
    'hall-b': ('introductions', 'hall-b-introduction', 28.675, 56.955),
    'buddha': ('introductions', 'buddha-introduction', 59.485, 84.025),
}


def mp3_duration(path):
    stream = read_probe(path)
    if stream['codec_name'] != 'mp3':
        raise ValueError(f'Expected an MP3 recording: {path}')
    return float(stream['duration'])


def read_probe(path):
    result = subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries',
        'stream=codec_name,duration,channels,sample_rate', '-of', 'json', str(path),
    ])
    return json.loads(result)['streams'][0]


def validate_srt(path):
    if ' --> ' not in path.read_text(encoding='utf-8-sig'):
        raise ValueError(f'Expected an SRT transcript: {path}')


def encode(path, destination, start, end):
    duration = end - start
    trim = f'atrim=start={start:.3f}:end={end:.3f},asetpts=PTS-STARTPTS'
    fade = f'afade=t=in:d=0.008,afade=t=out:st={duration - .008:.3f}:d=0.008'
    subprocess.run([
        'ffmpeg', '-v', 'error', '-nostdin', '-y', '-i', str(path), '-vn', '-af', f'{trim},{fade}',
        '-map_metadata', '-1', '-ac', '1', '-ar', '32000', '-c:a', 'libmp3lame', '-b:a', '56k',
        '-f', 'mp3', str(destination),
    ], check=True)


def prepare(intake, import_from):
    previous = read_json(MANIFEST)
    previous_content = read_json(CONTENT)
    originals = {}
    sources = []
    for source, folder in SOURCES.items():
        for extension, validate in (('mp3', mp3_duration), ('srt', validate_srt)):
            name = f'{folder}.{extension}'
            local = import_from / folder / name if import_from else None
            prior = next((row for row in (previous or {}).get('sources', []) if row['name'] == name), None)
            if not prior and local is None:
                raise FileNotFoundError('Specify --import-from for the first import.')
            reference = prior['originalPath'] if prior else VAULT_PREFIX + digest(local)
            original = intake.original(reference, expected=prior and prior['sha256'], local=local, validate=validate)
            originals[source, extension] = original
            sources.append({'name': name, 'originalPath': original.reference, 'sha256': original.sha256,
                            'bytes': original.path.stat().st_size})

    clips = {}
    tracks = {}
    with ExitStack() as staging:
        pending = []
        for key, (source, name, start, end) in CUTS.items():
            original = originals[source, 'mp3']
            duration = round(end - start, 3)
            if not 0 <= start < end <= mp3_duration(original.path):
                raise ValueError(f'Invalid source cut for {key}')
            destination = RUNTIME / f'{name}.mp3'
            sample = destination
            if not regular_file(destination):
                sample = staging.enter_context(staged_path(RUNTIME))
                encode(original.path, sample, start, end)
                pending.append((sample, destination))
            elif not previous:
                raise ValueError(f'Existing clip requires a provenance record: {destination}')
            stream = read_probe(sample)
            if (stream['codec_name'] != 'mp3' or stream['channels'] != 1 or stream['sample_rate'] != '32000'
                    or abs(float(stream['duration']) - duration) > .1):
                raise ValueError(f'Unexpected clip encoding or duration for {key}')
            clips[key] = {'path': (VERSION / destination.name).as_posix(), 'duration': duration}
            tracks[key] = {**clips[key], 'sourceSha256': original.sha256, 'start': start, 'end': end,
                           'sha256': digest(sample), 'bytes': sample.stat().st_size}
        manifest = {'provenance': '用户交付的两组 MP3 与 SRT。以转写及波形定位口令，裁切并加短淡入淡出。',
                    'encoding': 'MP3 · 32 kHz · mono · 56 kbps', 'sources': sources, 'clips': tracks}
        if (previous is not None and previous != manifest) or (previous_content is not None and previous_content != clips):
            raise ValueError('Published narration differs. Prepare a new version.')
        if any(digest(original.path) != original.sha256 for original in originals.values()):
            raise ValueError('An original changed during narration preparation.')
        write_json(MANIFEST, manifest, existing=previous)
        for sample, destination in pending:
            publish_file(sample, destination, digest(sample))
        write_json(CONTENT, clips, existing=previous_content)
    print(f'{len(sources)} verified originals, {len(clips)} verified clips')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--import-from', type=Path, help='Directory with both supplied recording folders')
    args = parser.parse_args()
    intake = AssetIntake(ROOT)
    with intake.transaction():
        prepare(intake, args.import_from)
