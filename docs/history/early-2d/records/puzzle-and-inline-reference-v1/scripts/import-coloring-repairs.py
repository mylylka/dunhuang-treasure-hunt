"""Adopt reviewed local AI-repair composites, preserve originals, rebuild ID maps.

The full AI output is archived, never used wholesale. Reviewed scope masks and
registration recipes document the only pixels adopted into the v001 artwork.
"""
from pathlib import Path
import json, hashlib, importlib.util
import cv2
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'work/coloring-analysis'
GENERATED=Path('/Users/liujing/.codex/generated_images/01a1805f-011b-77e1-b0bf-997d74222e35')
spec=importlib.util.spec_from_file_location('coloring_import',ROOT/'scripts/import-coloring-assets.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
ITEMS=[
    {'id':'coloring-three-rabbits','generated':'exec-0875f2a5-d961-4543-8208-5fe253b76b1d.png',
     'composite':'rabbits-repaired-composite-prototype.png','scope':'rabbits-repair-scope-prototype.png',
     'recipe':{'type':'local-affine-plus-elliptical-mask','affine':[[0.9825174808502197,0,6.199300765991211],[0,0.9929577708244324,2.3591549396514893]],'center':[607.15,616.25],'radii':[139,140],'innerFeatherRatio':0.02},
     'limitations':['颈背断口已修复，兔身与周围圆内背景不再连通。','三兔通过真实共用耳形相连，联动着色；不声称三只兔身均为独立区域。','外圈未采用AI重描，保留原稿现有开放边缘。'],
     'probes':{'leftRabbit':[530,590],'upperRabbit':[670,550],'lowerRabbit':[640,690],'circleBackground':[600,520]}},
    {'id':'coloring-grape-lotus','generated':'exec-f14dc407-889c-49e3-9ce6-970db55e7d21.png',
     'composite':'grape-lotus-repaired-composite-prototype.png','scope':'grape-lotus-repair-scope-prototype.png',
     'recipe':{'type':'four-side-local-affine-and-normal-axis-compression-plus-generated-frame',
       'bands':{'top':{'xRanges':[[180,480],[730,1035]],'yRange':[21,72]},'bottom':{'xRanges':[[165,485],[725,1045]],'yRange':[1128,1192]},'left':{'xRange':[19,72],'yRanges':[[170,490],[720,1045]]},'right':{'xRange':[1122,1192],'yRanges':[[165,495],[720,1050]]}},
       'targetFrame':{'left':22,'right':1188,'top':24,'bottom':1188,'samplingMargin':3},'sourceFrame':{'left':23,'right':1231,'top':24,'bottom':1198},'joiningFeatherPixels':2},
     'limitations':['新增方框闭合，外围白区不再直接漏向纸外。','部分四角带在原稿中真实连通，采用联动着色；未强行拆成独立小带。','右侧及底侧部分原线端仍止于框前，未继续扩大替换或伪造补线。','右侧窄带使用独立仿射配准及法向压缩，主体和花朵保留原稿。'],
     'probes':{'upperLeftBand':[380,52],'rightBand':[1160,730],'lowerBand':[472,1148],'outsidePaper':[5,5]}},
]


def sha(data):return hashlib.sha256(data).hexdigest()


def preserve(source,target):
    data=source.read_bytes() if source.exists() else target.read_bytes()
    if target.exists() and target.read_bytes()!=data:raise RuntimeError(f'归档内容不同，不覆盖：{target}')
    if not target.exists():target.write_bytes(data)
    return data


def main():
    WORK.mkdir(parents=True,exist_ok=True)
    prompts_path=ROOT/'work/coloring-repair-prompts.json'
    prompts=json.loads(prompts_path.read_text()) if prompts_path.exists() else None
    assets=[];reports=[]
    for item in ITEMS:
        level_id=item['id'];archive=ROOT/'art-source/levels'/level_id/'v002';archive.mkdir(parents=True,exist_ok=True)
        previous_path=archive/'source-notes.json'
        previous=json.loads(previous_path.read_text()) if previous_path.exists() else {}
        runtime=ROOT/'public/assets/levels'/level_id
        ai_data=preserve(GENERATED/item['generated'],archive/'ai-repair-full-output.png')
        composite_data=preserve(WORK/item['composite'],archive/'reviewed-local-composite.png')
        preserve(WORK/item['scope'],archive/'repair-scope-mask.png')
        original_path=runtime/f'{level_id}-line-v001.png'
        original=np.array(Image.open(original_path).convert('RGB'))
        composite=np.array(Image.open(archive/'reviewed-local-composite.png').convert('RGB'))
        scope=np.array(Image.open(archive/'repair-scope-mask.png').convert('L'))>0
        assert original.shape==composite.shape
        differences=np.any(original!=composite,axis=2)
        assert not np.any(differences & ~scope),'修复范围外出现像素改变'
        line_path=runtime/f'{level_id}-line-v002.png';Image.fromarray(composite).save(line_path,optimize=True)
        ids,regions,details,_=base.segment(cv2.cvtColor(composite,cv2.COLOR_RGB2GRAY))
        encoded=np.stack([ids&255,(ids>>8)&255,(ids>>16)&255],axis=-1).astype(np.uint8)
        map_path=runtime/f'{level_id}-regions-v002.png';Image.fromarray(encoded).save(map_path,optimize=True)
        line_hash=sha(line_path.read_bytes());map_hash=sha(map_path.read_bytes());version=f'v002-{line_hash[:12]}-{map_hash[:12]}'
        level_path=ROOT/'src/content/levels'/f'{level_id}.json';level=json.loads(level_path.read_text());level['artworkVersion']=version;level['regions']=regions
        level_path.write_text(json.dumps(level,ensure_ascii=False,indent=2)+'\n')
        width,height=Image.open(line_path).size
        for role,path in [('line',line_path),('regions',map_path)]:
            assets.append({'id':f'{level_id}-{role}','path':'/'+str(path.relative_to(ROOT/'public')),'width':width,'height':height,
                'kind':'level','placeholder':False,'version':version,
                'sourceNote':f'开发者授权使用内置image_gen局部补线；完整AI候选仅按登记范围配准合入原稿，修复范围外像素不变。{"RGB24区域ID蒙版，0不可填；真实相连区域联动着色。" if role=="regions" else "原稿、完整AI输出与局部合成结果均保留。"} 记录见art-source/levels/{level_id}/v002/source-notes.json。'})
        probe_ids={name:{'pixel':point,'regionId':int(ids[point[1],point[0]])} for name,point in item['probes'].items()}
        if level_id=='coloring-three-rabbits':
            assert probe_ids['leftRabbit']['regionId']!=probe_ids['circleBackground']['regionId']
        if level_id=='coloring-grape-lotus':
            assert probe_ids['outsidePaper']['regionId']==0
            assert all(probe_ids[name]['regionId']>0 for name in ['upperLeftBand','rightBand','lowerBand'])
        for region,sample in zip(regions,details):
            x,y=sample['samplePixel'];assert int(ids[y,x])==region['id']
        assert not np.any(ids[0]) and not np.any(ids[-1]) and not np.any(ids[:,0]) and not np.any(ids[:,-1])
        palette=level['palette'];base.preview(Image.fromarray(composite),ids,palette).save(WORK/f'{level_id}-v002-final-preview.png')
        recipe=item['recipe']
        if level_id=='coloring-grape-lotus':
            recipe['sideAffines']={side:json.loads((WORK/f'lotus-register-{side}-matrix.json').read_text()) if (WORK/f'lotus-register-{side}-matrix.json').exists() else previous['recipe']['sideAffines'][side] for side in ['top','bottom','left','right']}
            if (WORK/'prototype-lotus-repair.py').exists() or (archive/'technical-composite-recipe.py').exists():
                preserve(WORK/'prototype-lotus-repair.py',archive/'technical-composite-recipe.py')
        record={'version':2,'originalVersion':'v001','originalLinePath':str(original_path.relative_to(ROOT)),
            'originalSourceRecord':f'../v001/source-notes.json','originalLineSha256':sha(original_path.read_bytes()),
            'tool':prompts['tool'] if prompts else previous['tool'],
            'transparentBackground':prompts['transparentBackground'] if prompts else previous['transparentBackground'],
            'prompt':prompts['prompts'][level_id] if prompts else previous['prompt'],
            'generatedOriginalName':item['generated'],'generatedArchive':'ai-repair-full-output.png','generatedSha256':sha(ai_data),'generatedSize':list(Image.open(archive/'ai-repair-full-output.png').size),
            'adoptedComposite':'reviewed-local-composite.png','compositeSha256':sha(composite_data),'scopeMask':'repair-scope-mask.png',
            'fullGeneratedImageUsed':False,'recipe':recipe,'scopePixelCount':int(scope.sum()),'changedPixelCount':int(differences.sum()),'outsideScopeChangedPixelCount':int((differences&~scope).sum()),
            'regionCount':len(regions),'artworkVersion':version,'linePath':'/'+str(line_path.relative_to(ROOT/'public')),'regionMapPath':'/'+str(map_path.relative_to(ROOT/'public')),
            'lineSha256':line_hash,'regionMapSha256':map_hash,'probeResults':probe_ids,'limitations':item['limitations'],
            'technicalProcessing':'只从已生成图配准、重采样和局部蒙版合成，未用PIL/OpenCV绘制新内容线条；区域分割参数沿用v001，无补线闭运算或膨胀。'}
        (archive/'source-notes.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
        (archive/'processing.json').write_text(json.dumps({'parameters':base.PARAMETERS,'regions':details,'probeResults':probe_ids},ensure_ascii=False,indent=2)+'\n')
        reports.append({'id':level_id,'regionCount':len(regions),'version':version,'probeResults':probe_ids,'outsideScopeChangedPixels':0,'limitations':item['limitations']})
        print(level_id,len(regions),probe_ids)
    (ROOT/'work/repaired-coloring-assets.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2)+'\n')
    (WORK/'v002-repair-import-report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':main()
