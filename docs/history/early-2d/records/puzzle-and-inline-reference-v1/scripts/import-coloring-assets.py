"""Archive four delivered pairs and derive conservative fill-region ID maps.

Only technical masks are generated. Original line art is never redrawn or closed.
Requires the already available Pillow, numpy and OpenCV; game runtime does not.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from datetime import date

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DELIVERY = Path('/Users/liujing/Downloads/填色游戏素材')
WORK = ROOT / 'work/coloring-analysis'
VERSION = 'v001'
PARAMETERS = {
    'method': 'local-contrast-dark-strokes', 'maximumGray': 200,
    'backgroundSigma': 5, 'minimumLocalContrast': 12, 'strongInkGray': 125,
    'minimumStrokeComponentArea': 18, 'barrierConnectivity': 8,
    'regionConnectivity': 4, 'dilationPixels': 0, 'closingPixels': 0,
    'minimumRegionArea': 180, 'minimumSafeRadius': 2.2,
    'excludeImageBoundaryConnected': True,
}
LEVELS = [
    {
        'id': 'coloring-three-rabbits', 'title': '三兔莲花', 'minutes': 5,
        'line': '三兔莲花纹线条稿.PNG', 'reference': '三兔莲花藻井颜色参考.png',
        'source': {'title': '敦煌研究院：三兔共耳纹样文化参考', 'url': 'https://www.dha.ac.cn/info/1425/3569.htm',
                   'note': '第407窟展示了三兔共耳与旋转构图的一例；此链接不用于认定本关交付图片的洞窟身份。'},
        'colors': [('青绿', '#279d88'), ('浅青绿', '#5ba893'), ('青蓝', '#256079'), ('赭红', '#a34a31'), ('深赭', '#834328'), ('暖赭', '#b47853'), ('暖黄', '#dbae82'), ('翠绿', '#367d56'), ('米白', '#f5ecd9'), ('白色', '#ffffff'), ('深褐', '#4f2214'), ('墨黑', '#302c29')],
        'limits': ['中心兔身笔画偏浅且存在可见断口，真实相连的白区合为同一区域；不声称三只兔身均能独立着色。', '外侧纹样含与图片外缘相连的开放线条，外连白区记为0，不做补线。'],
    },
    {
        'id': 'coloring-lotus-camellia', 'title': '莲花茶花', 'minutes': 6,
        'line': '莲花茶花纹线条稿.PNG', 'reference': '莲花茶花纹藻井.png',
        'source': {'title': '敦煌研究院：茶花纹藻井文化参考', 'url': 'https://www.dha.ac.cn/info/1425/3581.htm',
                   'note': '可比较中心花形与周围成组花叶的组织方式；不将本关自主配色认定为历史颜料或原貌。'},
        'colors': [('深绿', '#13493d'), ('翠绿', '#4d9c6d'), ('浅青', '#8eccc5'), ('青蓝', '#1e6673'), ('赭红', '#923f30'), ('陶红', '#b16d5c'), ('暖赭', '#da9e7e'), ('暖黄', '#d6ad61'), ('米白', '#f5ecd9'), ('白色', '#ffffff'), ('深褐', '#642e1d'), ('墨黑', '#302c29')],
        'limits': ['参考为1400×1388、线稿为1075×1075，保留各自完整比例，不拉伸配准。', '花瓣多重细线形成细窄白带，小碎区不纳入可点击区，不要求填满。'],
    },
    {
        'id': 'coloring-grape-pomegranate', 'title': '葡萄石榴', 'minutes': 8,
        'line': '葡萄石榴纹线条稿.PNG', 'reference': '葡萄石榴纹藻井颜色参考.png',
        'source': {'title': '敦煌图案：装饰部位与花叶组织', 'url': 'https://www.tup.tsinghua.edu.cn/booksCenter/bookpreface?id=00894801',
                   'note': '可从中心、成组花叶与连续边饰观察敦煌装饰图案；本关具体洞窟与年代尚未据交付资料认定。'},
        'colors': [('赭红', '#a85030'), ('红褐', '#733c29'), ('陶褐', '#9e7258'), ('暖赭', '#c89d7b'), ('浅赭', '#e6c4a2'), ('灰蓝', '#5a7783'), ('青蓝', '#376e82'), ('翠绿', '#4c775e'), ('米白', '#f5ecd9'), ('白色', '#ffffff'), ('深褐', '#421e15'), ('墨黑', '#302c29')],
        'limits': ['葡萄果粒和多层描线产生大量细区，精确点击可通过放大完成，不据区域数量规定完成度。', '部分浅线白区实际连通，保留一个区域，不手工补线拆分。'],
    },
    {
        'id': 'coloring-grape-lotus', 'title': '葡萄莲花', 'minutes': 7,
        'line': '葡萄莲花纹线条稿.PNG', 'reference': '葡萄莲花纹藻井颜色参考.png',
        'source': {'title': '敦煌图案：装饰部位与花叶组织', 'url': 'https://www.tup.tsinghua.edu.cn/booksCenter/bookpreface?id=00894801',
                   'note': '可观察莲花中心、连接花叶的曲线及重复排列；本关具体洞窟与年代尚未据交付资料认定。'},
        'colors': [('赭红', '#a65f41'), ('深红褐', '#853d2b'), ('陶褐', '#b98766'), ('暖赭', '#d8aa85'), ('浅赭', '#eac7a5'), ('灰绿', '#626b62'), ('青蓝', '#36626a'), ('青绿', '#59857c'), ('米白', '#f5ecd9'), ('白色', '#ffffff'), ('深褐', '#4d2e26'), ('墨黑', '#302c29')],
        'limits': ['四角飘带有明显开放端，与外缘连通的白区记为0；不将开放端封成假图案。', '自由配色不要求与参考图逐像素对应，线稿省略参考的外边饰。'],
    },
]


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def keep_original(source: Path, archive: Path) -> bytes:
    data = source.read_bytes() if source.exists() else archive.read_bytes()
    if archive.exists() and archive.read_bytes() != data:
        raise RuntimeError(f'原稿内容变化，须另建版本，不覆盖：{archive}')
    if not archive.exists():
        archive.write_bytes(data)
    return data


def segment(gray: np.ndarray):
    background = cv2.GaussianBlur(gray.astype(np.float32), (0, 0), PARAMETERS['backgroundSigma'])
    initial = (((gray < PARAMETERS['maximumGray']) & (background - gray > PARAMETERS['minimumLocalContrast'])) | (gray < PARAMETERS['strongInkGray'])).astype(np.uint8)
    _, black_labels, black_stats, _ = cv2.connectedComponentsWithStats(initial, connectivity=8)
    keep = black_stats[:, cv2.CC_STAT_AREA] >= PARAMETERS['minimumStrokeComponentArea']
    keep[0] = False
    obstacle = keep[black_labels].astype(np.uint8)
    white = 1 - obstacle
    count, labels, stats, _ = cv2.connectedComponentsWithStats(white, connectivity=4)
    outside = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])).tolist())
    outside.add(0)
    distance = cv2.distanceTransform(white, cv2.DIST_L2, cv2.DIST_MASK_PRECISE)
    h, w = gray.shape
    region_map = np.zeros((h, w), np.uint32)
    regions, details = [], []
    for source_id in range(1, count):
        if source_id in outside:
            continue
        x, y, rw, rh, area = map(int, stats[source_id])
        if area < PARAMETERS['minimumRegionArea']:
            continue
        local = labels[y:y+rh, x:x+rw] == source_id
        values = np.where(local, distance[y:y+rh, x:x+rw], -1)
        sy, sx = np.unravel_index(np.argmax(values), values.shape)
        radius = float(values[sy, sx])
        if radius < PARAMETERS['minimumSafeRadius']:
            continue
        region_id = len(regions) + 1
        region_map[labels == source_id] = region_id
        region = {'id': region_id, 'label': f'纹样区域 {region_id}',
                  'region': {'x': x/w, 'y': y/h, 'width': rw/w, 'height': rh/h},
                  'point': {'x': (x+int(sx)+0.5)/w, 'y': (y+int(sy)+0.5)/h}, 'pixelCount': area}
        regions.append(region)
        details.append({'id':region_id,'sourceComponentId':source_id,'bboxPixels':[x,y,rw,rh],
                        'samplePixel':[x+int(sx),y+int(sy)],'safeRadiusPixels':round(radius,3),
                        'largeArea':area>=600 and radius>=4})
    return region_map, regions, details, obstacle


def preview(original, region_map, palette):
    rng = np.random.default_rng(20261028)
    colors = np.array([[255,255,255]] + [list(bytes.fromhex(palette[int(rng.integers(len(palette)))]['color'][1:])) for _ in range(int(region_map.max()))], np.uint8)
    tint = colors[region_map]
    rgb = np.array(original.convert('RGB'))
    return Image.fromarray((rgb.astype(np.float32) * tint.astype(np.float32) / 255).astype(np.uint8))


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    assets, batch = [], []
    for definition in LEVELS:
        level_id = definition['id']
        archive = ROOT / 'art-source/levels' / level_id / VERSION
        runtime = ROOT / 'public/assets/levels' / level_id
        archive.mkdir(parents=True, exist_ok=True)
        runtime.mkdir(parents=True, exist_ok=True)
        originals = []
        for role in ['reference', 'line']:
            name = definition[role]
            data = keep_original(DELIVERY / name, archive / name)
            with Image.open(archive / name) as source:
                dimensions = source.size
                alpha = source.getchannel('A').getextrema() if 'A' in source.getbands() else None
                target = runtime / f'{level_id}-{role}-{VERSION}.png'
                source.convert('RGB').save(target, optimize=True)
            originals.append({'role':role,'originalFilename':name,'originalPath':str((archive/name).relative_to(ROOT)),
                              'width':dimensions[0],'height':dimensions[1],'mode':Image.open(archive/name).mode,
                              'alphaExtrema':alpha,'sha256':digest(data),'runtimePath':'/'+str(target.relative_to(ROOT/'public')),
                              'source':'开发者交付；原图文化出处、具体洞窟、年代及生成提示词未随本批提供。',
                              'processing':'原稿字节完整归档；运行版保持原尺寸、完整构图和RGB像素，仅转换为PNG。未裁切、拉伸、补画、调色或去水印。'})
            assets.append({'id':f'{level_id}-{role}','path':'/'+str(target.relative_to(ROOT/'public')),
                           'width':dimensions[0],'height':dimensions[1],'kind':'level','placeholder':False,'version':'user-art-v001',
                           'sourceNote':f'开发者交付的填色{"配色参考" if role=="reference" else "线稿"}，完整原稿归档；保持原尺寸和构图，仅格式转换。文化图源与技术处理见art-source/levels/{level_id}/v001/source-notes.json。'})
        line_path = runtime / f'{level_id}-line-{VERSION}.png'
        with Image.open(line_path) as line:
            original = line.convert('RGB')
        rgb = np.array(original)
        region_map, regions, details, obstacle = segment(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY))
        encoded = np.stack([region_map & 255, (region_map >> 8) & 255, (region_map >> 16) & 255], axis=-1).astype(np.uint8)
        mask_path = runtime / f'{level_id}-regions-{VERSION}.png'
        Image.fromarray(encoded).save(mask_path, optimize=True)
        width, height = original.size
        line_hash = next(p['sha256'] for p in originals if p['role']=='line')
        mask_hash = digest(mask_path.read_bytes())
        artwork_version = f'v001-{line_hash[:12]}-{mask_hash[:12]}'
        palette = [{'id':f'color-{i+1:02d}','label':name,'color':color} for i,(name,color) in enumerate(definition['colors'])]
        assets.append({'id':f'{level_id}-regions','path':'/'+str(mask_path.relative_to(ROOT/'public')),
                       'width':width,'height':height,'kind':'level','placeholder':False,'version':artwork_version,
                       'sourceNote':f'技术区域ID蒙版，从实际线稿边界提取；无补线、无闭运算、无膨胀。RGB编码R+G*256+B*65536，0不可填。{len(regions)}个候选区域，真实相连白区不强行拆分；详见同关原稿目录processing.json。'})
        level = {'schemaVersion':1,'id':level_id,'themeId':'patterns','gameType':'coloring','title':definition['title'],
                 'subtitle':'自由填色 · 配色参考','objective':'自由选择颜色，为纹样区域着色；可以查看配色参考，也可以创作自己的配色。',
                 'difficulty':'自由创作','estimatedMinutes':definition['minutes'],'thumbnailAssetId':f'{level_id}-reference',
                 'teachingNote':'配色参考与线稿由开发者提供，用于自由配色练习；不按参考图颜色评分，也不将自主配色认定为历史颜料结论。',
                 'source':definition['source'],'referenceAssetId':f'{level_id}-reference','lineAssetId':f'{level_id}-line',
                 'regionMapAssetId':f'{level_id}-regions','artworkVersion':artwork_version,'palette':palette,'regions':regions}
        (ROOT/'src/content/levels'/f'{level_id}.json').write_text(json.dumps(level,ensure_ascii=False,indent=2)+'\n')
        processing = {'version':1,'parameters':PARAMETERS,'lineSha256':line_hash,'regionMapSha256':mask_hash,
                      'artworkVersion':artwork_version,'regionCount':len(regions),'largeRegionCount':sum(d['largeArea'] for d in details),
                      'minimumWhiteRegionPixels':min(r['pixelCount'] for r in regions),'encoding':'id=R+G*256+B*65536; 0 unpaintable',
                      'runtimeBlend':'white base/region tint multiplied with original RGB; retain original strokes and paper texture',
                      'limitations':definition['limits'],'regions':details}
        (archive/'processing.json').write_text(json.dumps(processing,ensure_ascii=False,indent=2)+'\n')
        (archive/'source-notes.json').write_text(json.dumps({'version':1,'receivedOn':date.today().isoformat(),
            'originals':originals,'status':'配对对应已视觉核对；不要求线稿与配色参考逐像素配准；未见叠加水印。',
            'authorship':'开发者提供的参考与线稿；未推测其具体创作方式或考古出处。','processingRecord':'processing.json',
            'paletteNote':'运行色板是参考图附近的屏幕色候选，供自由创作，不标为历史颜料配方。'},ensure_ascii=False,indent=2)+'\n')
        diagnostic = preview(original,region_map,palette)
        diagnostic.save(WORK/f'{level_id}-final-preview.png')
        annotated=diagnostic.copy();draw=ImageDraw.Draw(annotated)
        for sample in sorted(details,key=lambda r:regions[r['id']-1]['pixelCount'],reverse=True)[:30]:
            x,y=sample['samplePixel'];draw.ellipse((x-4,y-4,x+4,y+4),fill='#fff5bd',outline='#542b1e');draw.text((x+6,y-6),str(sample['id']),fill='#251b16',stroke_width=2,stroke_fill='#fff5bd')
        annotated.save(WORK/f'{level_id}-sample-centers.png')
        # Validate the exact browser decoding contract against every safe sample and area.
        decoded=encoded[:,:,0].astype(np.uint32)+encoded[:,:,1].astype(np.uint32)*256+encoded[:,:,2].astype(np.uint32)*65536
        assert np.array_equal(decoded,region_map)
        counts=np.bincount(region_map.ravel())
        for region,sample in zip(regions,details):
            x,y=sample['samplePixel'];assert decoded[y,x]==region['id'];assert int(counts[region['id']])==region['pixelCount']
        assert not np.any(region_map[0]) and not np.any(region_map[-1]) and not np.any(region_map[:,0]) and not np.any(region_map[:,-1])
        entry={'id':level_id,'regionCount':len(regions),'largeRegionCount':processing['largeRegionCount'],'size':[width,height],
               'artworkVersion':artwork_version,'preview':str((WORK/f'{level_id}-final-preview.png').relative_to(ROOT)),
               'sampleRegion':max(regions,key=lambda r:r['pixelCount']),'limitations':definition['limits']}
        batch.append(entry)
        print(f'{level_id}: {len(regions)} regions, {processing["largeRegionCount"]} large, {width}×{height}')
    (ROOT/'work/new-coloring-assets.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2)+'\n')
    (WORK/'formal-import-report.json').write_text(json.dumps(batch,ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':
    main()
