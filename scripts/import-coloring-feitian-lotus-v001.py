"""Archive the delivered line/reference and derive a conservative native-size ID mask.

The illustration is cropped, so components touching the image edge are valid.
No stroke closure, added line, dilation, or change to the source images is performed.
"""
from pathlib import Path
import hashlib
import json
import shutil

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
LEVEL = 'coloring-feitian-lotus'
ARCHIVE = ROOT / 'art-source/levels' / LEVEL / 'v001'
RUNTIME = ROOT / 'public/assets/levels' / LEVEL
WORK = ROOT / 'work'
TEMP = Path('/var/folders/v4/5w5w475926b0_g74_gftn8mr0000gn/T')
FILES = {'line': 'codex-clipboard-939bcf99-1e33-4c1b-b344-2a510df7cb44.png',
         'reference': 'codex-clipboard-09caf8fa-278a-4f2e-b09a-6b22625899dc.png'}
PARAMS = {'grayThreshold': 200, 'backgroundSigma': 5, 'minimumLocalContrast': 12,
          'strongInkGray': 125, 'minimumStrokeArea': 18, 'barrierConnectivity': 8,
          'regionConnectivity': 4, 'minimumRegionArea': 80, 'minimumSafeRadius': 2.2,
          'closingPixels': 0, 'dilationPixels': 0, 'includeImageEdgeComponents': True}

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def copy_original(src, dst):
    if dst.exists() and src.read_bytes() != dst.read_bytes():
        raise RuntimeError(f'已有文件内容不同，不能覆盖：{dst}')
    if not dst.exists(): shutil.copyfile(src, dst)

def main():
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    RUNTIME.mkdir(parents=True, exist_ok=True)
    originals = []
    for role, filename in FILES.items():
        src = TEMP / filename
        archive = ARCHIVE / filename
        if not src.exists(): src = archive
        copy_original(src, archive)
        target = RUNTIME / f'{LEVEL}-{role}-v001.png'
        copy_original(archive, target)
        with Image.open(archive) as im:
            originals.append({'role': role, 'originalFilename': filename, 'sha256': sha(archive),
                              'size': list(im.size), 'mode': im.mode,
                              'runtimePath': '/' + str(target.relative_to(ROOT / 'public')),
                              'processing': '原字节直接复制，未裁切、缩放、绘制或变色。'})
    image = Image.open(RUNTIME / f'{LEVEL}-line-v001.png').convert('RGB')
    rgb = np.asarray(image)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    background = cv2.GaussianBlur(gray.astype(np.float32), (0, 0), 5)
    ink = (((gray < 200) & (background-gray > 12)) | (gray < 125)).astype(np.uint8)
    _, ink_labels, ink_stats, _ = cv2.connectedComponentsWithStats(ink, connectivity=8)
    keep = ink_stats[:, cv2.CC_STAT_AREA] >= 18
    keep[0] = False
    white = 1 - keep[ink_labels].astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(white, connectivity=4)
    padded = np.pad(white, 1)
    distance = cv2.distanceTransform(padded, cv2.DIST_L2, cv2.DIST_MASK_PRECISE)[1:-1, 1:-1]
    h, w = gray.shape
    region_map = np.zeros((h,w), np.uint32)
    regions, details = [], []
    for source_id in range(1, count):
        x,y,rw,rh,area = map(int, stats[source_id])
        if area < 80: continue
        local = labels[y:y+rh,x:x+rw] == source_id
        values = np.where(local, distance[y:y+rh,x:x+rw], -1)
        sy,sx = np.unravel_index(np.argmax(values), values.shape)
        radius = float(values[sy,sx])
        if radius < 2.2: continue
        region_id = len(regions)+1
        region_map[labels == source_id] = region_id
        point = [x+int(sx),y+int(sy)]
        regions.append({'id':region_id, 'label':f'纹样区域 {region_id}',
            'region':{'x':x/w,'y':y/h,'width':rw/w,'height':rh/h},
            'point':{'x':(point[0]+0.5)/w,'y':(point[1]+0.5)/h},'pixelCount':area})
        details.append({'id':region_id,'sourceComponentId':source_id,'bboxPixels':[x,y,rw,rh],
            'samplePixel':point,'safeRadiusPixels':round(radius,3),
            'touchesImageEdge':x==0 or y==0 or x+rw==w or y+rh==h})
    encoded = np.stack([region_map & 255,(region_map >> 8) & 255,(region_map >> 16) & 255],axis=-1).astype(np.uint8)
    mask_path = RUNTIME / f'{LEVEL}-regions-v001.png'
    # A pre-existing mask is never silently replaced by a different result.
    import io
    buffer = io.BytesIO()
    Image.fromarray(encoded).save(buffer,format='PNG',optimize=True)
    if mask_path.exists() and mask_path.read_bytes() != buffer.getvalue():
        raise RuntimeError(f'已有蒙版不同，不能覆盖：{mask_path}')
    if not mask_path.exists(): mask_path.write_bytes(buffer.getvalue())
    decoded = encoded[:,:,0].astype(np.uint32) + encoded[:,:,1].astype(np.uint32)*256 + encoded[:,:,2].astype(np.uint32)*65536
    assert np.array_equal(decoded, region_map)
    counts=np.bincount(decoded.ravel())
    for region, detail in zip(regions, details):
        x,y=detail['samplePixel']
        assert decoded[y,x]==region['id'] and int(counts[region['id']])==region['pixelCount']
    artwork_version = f'v001-{sha(RUNTIME / (LEVEL+"-line-v001.png"))[:12]}-{sha(mask_path)[:12]}'
    processing={'version':1, 'parameters':PARAMS,'regionCount':len(regions),
        'edgeRegionCount':sum(i['touchesImageEdge'] for i in details),
        'lineSha256':sha(RUNTIME / (LEVEL+'-line-v001.png')),'regionMapSha256':sha(mask_path),
        'artworkVersion':artwork_version,'encoding':'id=R+G*256+B*65536; 0 unpaintable',
        'limitations':['图片是裁切构图，接触画幅边缘的独立色块可填。',
          '未增加线条；线稿实际连通的部分仍归同一区，不声称可独立填色。',
          '少于80像素或安全半径不足2.2像素的细碎区域不纳入。'], 'regions':details}
    (ARCHIVE/'processing.json').write_text(json.dumps(processing,ensure_ascii=False,indent=2)+'\n')
    (ARCHIVE/'source-notes.json').write_text(json.dumps({'version':1,'receivedOn':'2026-11-04',
        'originals':originals,'status':'用户提供线稿与配色参考；保留完整裁切构图。',
        'authorship':'开发者提供；未推测具体洞窟、年代或历史配色。','processingRecord':'processing.json'},ensure_ascii=False,indent=2)+'\n')
    (WORK/'feitian-lotus-regions-v001.json').write_text(json.dumps({'regions':regions,'artworkVersion':artwork_version,
         'regionCount':len(regions),'edgeRegionCount':processing['edgeRegionCount']},ensure_ascii=False,indent=2)+'\n')
    rng=np.random.default_rng(444)
    palette=np.vstack([np.array([[255,255,255]],np.uint8),rng.integers(70,230,size=(len(regions),3),dtype=np.uint8)])
    preview=Image.fromarray((rgb.astype(float)*palette[region_map]/255).astype(np.uint8)); draw=ImageDraw.Draw(preview)
    for detail, region in zip(details,regions):
        if region['pixelCount'] < 250: continue
        x,y=detail['samplePixel'];draw.text((x,y),str(detail['id']),fill='black',stroke_width=3,stroke_fill='white')
    preview.save(WORK/'feitian-lotus-segmentation-final.png')
    print(json.dumps({'size':[w,h],'regions':len(regions),'edgeRegions':processing['edgeRegionCount'],
          'artworkVersion':artwork_version,'lineSha256':processing['lineSha256'],
          'regionMapSha256':processing['regionMapSha256'],'referenceSha256':sha(RUNTIME / (LEVEL+'-reference-v001.png'))},ensure_ascii=False))

if __name__ == '__main__': main()
