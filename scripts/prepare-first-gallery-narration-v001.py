#!/usr/bin/env python3
"""Register the first-gallery narration sources and prepare the verified clips."""

import argparse
from contextlib import ExitStack
import json
from pathlib import Path
import re
import subprocess

from asset_intake import AssetIntake, VAULT_PREFIX, digest, publish_file, read_json, regular_file, staged_path, write_json


ROOT = Path(__file__).resolve().parents[1]
VERSION = Path('first-gallery-narration/v001')
RUNTIME = ROOT / 'public/assets/world' / VERSION
MANIFEST = ROOT / 'art-source/world' / VERSION / 'manifest.json'
CONTENT = ROOT / 'src/content/world/first-gallery-narration-v001.json'
SCRIPT = '第一馆提示、对话与人物语言.md'
PLAYER = '第一馆玩家音'
NARRATOR = '第一馆背景音'

# Source times in seconds. Align the SRT to the decoded speech and place each
# cut after its recorded 分段 / 背景音 cue and before the next cue.
PLAYER_CUTS = (
    ('mural-wall', 1.385, 4.690, '这面墙怎么都脱落了……原来画的是什么呢？'),
    ('mural-table', 6.015, 7.075, '这边有莲花……'),
    ('mural-bird', 8.415, 10.790, '这些东西会不会跟画有关呢？'),
    ('mural-return', 11.930, 13.335, '我再去看一眼壁画吧。'),
    ('mural-guess', 14.720, 19.230, '嗯，好像真的有关系。中间这个会不会是莲花？'),
    ('mural-missing', 20.490, 21.520, '还缺点什么呢……'),
    ('caisson-beauty', 22.860, 24.310, '哇，好美的藻井！'),
    ('caisson-rabbits', 25.530, 29.430, '等等，最上面的小方格里，好像有一些小兔子……'),
    ('caisson-ears', 30.780, 33.870, '原来这两只兔子共用一只耳朵！'),
    ('easel-discover', 35.250, 38.405, '咦，这儿还有一幅画？怎么一点颜色都没有啊？'),
    ('easel-pigments', 39.840, 43.095, '旁边还有颜料呢……要不我来试试？'),
    ('easel-hung', 44.365, 47.135, '哎？真的挂上去了！效果不错！'),
)

NARRATOR_CUTS = (
    ('mural-lotus-note', 1.065, 6.595, '莲花常常被画成围绕花心展开的纹样，既像真花，又比真花更整齐。'),
    ('mural-bird-note', 7.515, 11.905, '飞鸟纹常常会排进边饰里，和其他纹样一起重复出现。'),
    ('mural-grapes-note', 13.080, 18.260, '像葡萄藤、卷叶这样的纹样，常常顺着方向连续展开，组成一整条装饰。'),
    ('mural-summary', 19.340, 36.280, '敦煌壁画中的许多纹样，都从真实的花草、动物等形象中提炼而来，也有联珠、菱格等几何纹样。'
     '古代画师将这些图案加以美化，再通过重复、对称、旋转等方式巧妙组合，形成装饰在壁画和藻井上的精美纹样。'),
    ('caisson-summary', 37.625, 54.880, '恭喜你，发现了莫高窟最具有代表性的三兔共耳！'
     '画工巧妙地利用三只兔子的耳朵组成的等边三角形，画出莲花中三兔盘旋追逐的装饰图案，使静止的图案呈现出了动的情趣，构思之巧妙，令人赞叹。'),
    ('easel-color-note', 56.030, 75.379, '敦煌纹样的色彩丰富而鲜明，古代画师常用石青、石绿、朱砂、赭石等颜料，让青绿、朱红与土黄相互映衬，形成独特的敦煌色彩。'
     '再通过冷暖对比、深浅变化和层层设色，让莲花、飞鸟、卷草等纹样更加生动，也让整幅画面充满节奏与层次。'),
)


def probe_mp3(path):
    payload = subprocess.check_output([
        'ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries',
        'stream=codec_name,duration,channels,sample_rate', '-of', 'json', str(path),
    ])
    stream = json.loads(payload)['streams'][0]
    if stream['codec_name'] != 'mp3':
        raise ValueError(f'Expected an MP3 recording: {path}')
    return stream


def validate_srt(path):
    content = path.read_text(encoding='utf-8-sig')
    if not re.search(r'(?m)^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$', content):
        raise ValueError(f'Expected an SRT transcript: {path}')


def validate_script(path):
    content = path.read_text(encoding='utf-8-sig')
    for key, _, _, subtitle in (*PLAYER_CUTS, *NARRATOR_CUTS):
        if subtitle not in content:
            raise ValueError(f'Subtitle {key} differs from the supplied script: {path}')


def encode(source, destination, start, end):
    duration = end - start
    audio_filter = (f'atrim=start={start:.3f}:end={end:.3f},asetpts=PTS-STARTPTS,'
                    f'afade=t=in:d=0.008,afade=t=out:st={duration - .008:.3f}:d=0.008')
    subprocess.run([
        'ffmpeg', '-v', 'error', '-nostdin', '-y', '-i', str(source), '-vn', '-af', audio_filter,
        '-map_metadata', '-1', '-ac', '1', '-ar', '32000', '-c:a', 'libmp3lame', '-b:a', '56k',
        '-f', 'mp3', str(destination),
    ], check=True)


def prepare(intake, import_from, check):
    previous = read_json(MANIFEST)
    previous_content = read_json(CONTENT)
    if check and (previous is None or previous_content is None):
        raise FileNotFoundError('Missing first-gallery narration registration.')

    supplied = [(Path(SCRIPT), validate_script)]
    for folder in (PLAYER, NARRATOR):
        supplied.extend([
            (Path(folder) / f'{folder}.mp3', probe_mp3),
            (Path(folder) / f'{folder}.srt', validate_srt),
        ])

    originals = {}
    source_records = []
    for relative_path, validate in supplied:
        name = relative_path.as_posix()
        local = import_from / relative_path if import_from else None
        prior = next((row for row in (previous or {}).get('sources', []) if row['name'] == name), None)
        if not prior and local is None:
            raise FileNotFoundError('Specify --import-from for the first import.')
        reference = prior['originalPath'] if prior else VAULT_PREFIX + digest(local)
        original = intake.original(reference, expected=prior and prior['sha256'], local=local, validate=validate)
        originals[relative_path] = original
        source_records.append({
            'name': name, 'originalPath': original.reference, 'sha256': original.sha256,
            'bytes': original.path.stat().st_size,
        })

    clips = {}
    clip_records = {}
    with ExitStack() as staging:
        pending = []
        for folder, cuts in ((PLAYER, PLAYER_CUTS), (NARRATOR, NARRATOR_CUTS)):
            original = originals[Path(folder) / f'{folder}.mp3']
            source_duration = float(probe_mp3(original.path)['duration'])
            last_end = 0
            for key, start, end, subtitle in cuts:
                if not last_end <= start < end <= source_duration:
                    raise ValueError(f'Invalid source cut for {key}')
                last_end = end
                destination = RUNTIME / f'{key}.mp3'
                sample = destination
                if not regular_file(destination):
                    if check:
                        raise FileNotFoundError(f'Missing runtime clip: {destination}')
                    sample = staging.enter_context(staged_path(RUNTIME))
                    encode(original.path, sample, start, end)
                    pending.append((sample, destination))
                elif not previous:
                    raise ValueError(f'Existing clip requires a provenance record: {destination}')
                stream = probe_mp3(sample)
                duration = round(end - start, 3)
                if (stream['channels'] != 1 or stream['sample_rate'] != '32000'
                        or abs(float(stream['duration']) - duration) > .1):
                    raise ValueError(f'Unexpected runtime encoding or duration: {destination}')
                clips[key] = {'path': (VERSION / destination.name).as_posix(), 'duration': duration, 'text': subtitle}
                clip_records[key] = {
                    'path': clips[key]['path'], 'sourceSha256': original.sha256,
                    'start': start, 'end': end, 'sha256': digest(sample), 'bytes': sample.stat().st_size,
                }

        manifest = {
            'provenance': '用户交付的两组 MP3、SRT 和第一馆文字定稿。使用字幕、语音对齐及波形定位录音口令，剪切后加短淡入淡出。',
            'encoding': 'MP3 · 32 kHz · mono · 56 kbps',
            'sources': source_records,
            'clips': clip_records,
        }
        if (previous is not None and previous != manifest) or (previous_content is not None and previous_content != clips):
            raise ValueError('Published narration differs. Prepare a new version.')
        if any(digest(original.path) != original.sha256 for original in originals.values()):
            raise ValueError('An original changed during narration preparation.')
        if not check:
            write_json(MANIFEST, manifest, existing=previous)
            for sample, destination in pending:
                publish_file(sample, destination, digest(sample))
            write_json(CONTENT, clips, existing=previous_content)
    print(f'{len(source_records)} verified originals, {len(clips)} verified clips')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--import-from', type=Path, help='Directory with the supplied script and recording folders')
    mode.add_argument('--check', action='store_true', help='Verify registered sources and runtime clips')
    args = parser.parse_args()
    intake = AssetIntake(ROOT)
    with intake.transaction():
        prepare(intake, args.import_from, args.check)
