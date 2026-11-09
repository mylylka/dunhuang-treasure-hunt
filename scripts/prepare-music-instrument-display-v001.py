"""Archive the supplied instrument display and derive its preview assets."""

import argparse
import hashlib
import io
import json
from pathlib import Path
import shutil
import struct
import subprocess

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source/world/music-instrument-display/v001'
PUBLIC = ROOT / 'public/assets/world/music-instrument-display/v001'
MODELS = {'strings': '弦乐组合', 'winds': '吹奏组合', 'percussion': '鼓乐组合'}
INSTRUMENTS = {
    'pipa': ('琵琶壁画.jpeg', '01_琵琶.wav'),
    'ruan': ('阮壁画.jpeg', '02_阮.wav'),
    'zheng': ('古筝壁画.jpeg', '03_筝.wav'),
    'konghou': ('箜篌壁画.jpeg', '04_竖箜篌（现代复原）.wav'),
    'xun': ('埙壁画.png', '08_埙.wav'),
    'sheng': ('笙壁画.png', '06_笙.wav'),
    'dizi': ('横笛壁画.jpeg', '05_横笛.wav'),
    'bili': ('筚篥壁画.png', '07_筚篥.wav'),
    'conch': ('海螺壁画.jpeg', '海螺.mp3'),
    'paiban': ('拍板壁画.jpeg', '拍板.mp3'),
    'jiegu': ('羯鼓壁画.jpeg', '羯鼓.mp3'),
    'cymbals': ('钹壁画.jpeg', '钹.mp3'),
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def archive(supplied, relative):
    original = supplied / relative
    target = SOURCE / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        if digest(target) != digest(original):
            raise ValueError(f'Archived original differs from the supplied version: {relative}')
    else:
        shutil.copyfile(original, target)


def glb_parts(raw):
    magic, version, size = struct.unpack_from('<4sII', raw)
    assert (magic, version, size) == (b'glTF', 2, len(raw))
    json_size, json_type = struct.unpack_from('<I4s', raw, 12)
    bin_size, bin_type = struct.unpack_from('<I4s', raw, 20 + json_size)
    assert (json_type, bin_type, 28 + json_size + bin_size) == (b'JSON', b'BIN\x00', len(raw))
    return json.loads(raw[20:20 + json_size]), raw[28 + json_size:]


def view_payload(binary, view):
    offset = view.get('byteOffset', 0)
    return binary[offset:offset + view['byteLength']]


def optimized_glb(original, output, max_edge, quality):
    document, binary = glb_parts(original.read_bytes())
    assert len(document['images']) == len(document['buffers']) == 1
    texture_index = document['images'][0]['bufferView']
    views = document['bufferViews']
    geometry = hashlib.sha256()
    packed = bytearray()
    for index, view in enumerate(views):
        assert view['buffer'] == 0
        payload = view_payload(binary, view)
        if index == texture_index:
            with Image.open(io.BytesIO(payload)) as source:
                texture = source.convert('RGB')
            texture.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
            jpeg = io.BytesIO()
            texture.save(jpeg, 'JPEG', quality=quality, optimize=True)
            payload = jpeg.getvalue()
            texture_size = texture.size
        else:
            geometry.update(payload)
        view['byteOffset'] = len(packed)
        view['byteLength'] = len(payload)
        packed.extend(payload)
        packed.extend(b'\x00' * (-len(packed) % 4))
    document['buffers'][0]['byteLength'] = len(packed)
    encoded = json.dumps(document, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    encoded += b' ' * (-len(encoded) % 4)
    output.write_bytes(struct.pack('<4sII', b'glTF', 2, len(encoded) + len(packed) + 28)
                       + struct.pack('<I4s', len(encoded), b'JSON') + encoded
                       + struct.pack('<I4s', len(packed), b'BIN\x00') + packed)
    roundtrip, roundtrip_bin = glb_parts(output.read_bytes())
    roundtrip_geometry = hashlib.sha256()
    for index, view in enumerate(roundtrip['bufferViews']):
        if index != texture_index:
            roundtrip_geometry.update(view_payload(roundtrip_bin, view))
    assert roundtrip_geometry.digest() == geometry.digest()
    return {'file': output.name, 'bytes': output.stat().st_size, 'texture': texture_size,
            'geometrySha256': geometry.hexdigest(), 'sha256': digest(output)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('supplied', type=Path, help='The user-provided 二楼乐器场景 directory')
    supplied = parser.parse_args().supplied
    source_files = ['README.md', '试听.html', '海螺壁画.png', '三维模型/各个组合中乐器的名字.txt']
    source_files += [name for pair in INSTRUMENTS.values() for name in pair]
    source_files += [f'三维模型/{name}.{suffix}' for name in MODELS.values() for suffix in ('glb', 'png')]
    for relative in source_files:
        archive(supplied, relative)

    for directory in (PUBLIC, PUBLIC / 'images', PUBLIC / 'audio'):
        directory.mkdir(parents=True, exist_ok=True)
    models = {}
    for group, name in MODELS.items():
        original = SOURCE / '三维模型' / f'{name}.glb'
        models[group] = {
            'original': f'三维模型/{name}.glb',
            'desktop': optimized_glb(original, PUBLIC / f'{group}.glb', 2048, 85),
            'mobile': optimized_glb(original, PUBLIC / f'{group}-mobile.glb', 1024, 82),
        }
    instruments = {}
    for key, (image_name, audio_name) in INSTRUMENTS.items():
        with Image.open(SOURCE / image_name) as source:
            image = ImageOps.exif_transpose(source).convert('RGB')
        image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        image_path = PUBLIC / 'images' / f'{key}.webp'
        image.save(image_path, 'WEBP', quality=86, method=6)
        audio_path = PUBLIC / 'audio' / f'{key}{Path(audio_name).suffix}'
        if key == 'dizi':
            # Decode the float WAV without trimming or changing sample rate or channel count.
            subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-i', str(SOURCE / audio_name),
                            '-c:a', 'pcm_s16le', str(audio_path)], check=True)
        else:
            shutil.copyfile(SOURCE / audio_name, audio_path)
        instruments[key] = {
            'image': {'original': image_name, 'path': f'images/{image_path.name}', 'size': image.size,
                      'bytes': image_path.stat().st_size, 'source': '用户供稿，单件出处未随文件提供'},
            'audio': {'original': audio_name, 'path': f'audio/{audio_path.name}', 'bytes': audio_path.stat().st_size,
                      'source': '供稿 README 所列 CCMusic 中国音乐数据库' if audio_path.suffix == '.wav' else '用户供稿，逐件出处未随文件提供',
                      'change': 'float WAV 转 16 位 PCM，不改采样率、声道或时长' if key == 'dizi' else '原文件'},
        }
    manifest = {'sources': {name: digest(SOURCE / name) for name in source_files},
                'models': models, 'instruments': instruments}
    (SOURCE / 'asset-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Runtime model bytes:', {key: sum(group[key]['bytes'] for group in models.values()) for key in ('desktop', 'mobile')})


if __name__ == '__main__':
    main()
