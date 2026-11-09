"""Export the locally archived OFL title font as a five-character web subset."""
from pathlib import Path
import hashlib
import json
from shutil import copy2
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT=Path(__file__).resolve().parent.parent
ARCHIVE=ROOT/'art-source/shared/fonts/v001'
TARGET=ROOT/'public/assets/shared/fonts'
ARCHIVE.mkdir(parents=True,exist_ok=True)
TARGET.mkdir(parents=True,exist_ok=True)
for original,name in [('lxgw-wenkai-regular.ttf','lxgw-wenkai-source.ttf'),('ofl.txt','ofl.txt')]:
    target=ARCHIVE/name
    temporary=ROOT/'work/title-font-source'/original
    if not target.exists():
        if not temporary.exists(): raise RuntimeError(f'Original font is missing: {target}')
        copy2(temporary,target)
    elif temporary.exists() and hashlib.sha256(target.read_bytes()).digest()!=hashlib.sha256(temporary.read_bytes()).digest():
        raise RuntimeError('Existing v001 original differs; use a new version')
font=TTFont(ARCHIVE/'lxgw-wenkai-source.ttf')
original_version=font['name'].getDebugName(5)
options=subset.Options()
options.flavor='woff'
options.name_IDs=['*']
options.name_legacy=True
options.name_languages=['*']
subsetter=subset.Subsetter(options=options)
subsetter.populate(text='敦煌寻宝记')
subsetter.subset(font)
for name_id,value in {1:'Dunhuang Title',2:'Regular',3:'DunhuangTitle-Subset-v001',4:'Dunhuang Title Regular',6:'DunhuangTitle-Regular',16:'Dunhuang Title',17:'Regular'}.items():
    font['name'].removeNames(nameID=name_id)
    font['name'].setName(value,name_id,3,1,0x409)
    font['name'].setName(value,name_id,1,0,0)
font.flavor='woff'
path=TARGET/'dunhuang-title-v001.woff'
font.save(path)
copy2(ARCHIVE/'ofl.txt',TARGET/'ofl.txt')
notes={
 'family':'Dunhuang Title','originalFamily':'LXGW WenKai / 霞鹜文楷',
 'originalVersion':original_version,
 'projectUrl':'https://github.com/lxgw/LxgwWenKai',
 'downloadUrl':'https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/fonts/TTF/LXGWWenKai-Regular.ttf',
 'license':'SIL Open Font License 1.1','retrievedOn':'2026-10-28',
 'originalSha256':hashlib.sha256((ARCHIVE/'lxgw-wenkai-source.ttf').read_bytes()).hexdigest(),
 'subsetCharacters':'敦煌寻宝记','output':str(path.relative_to(ROOT)),
 'outputBytes':path.stat().st_size,'outputSha256':hashlib.sha256(path.read_bytes()).hexdigest(),
 'processing':'Only glyph subsetting and internal-family rename; font copyright and license retained. WOFF uses zlib; no system font installation.'}
(ARCHIVE/'source-notes.json').write_text(json.dumps(notes,ensure_ascii=False,indent=2)+'\n')
print(f'Title font exported: {path.stat().st_size} bytes; {original_version}')
