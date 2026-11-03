"""User supplied introduction; one full paragraph, replaceable temporary local elder recording."""
from pathlib import Path
import json,subprocess,hashlib
R=Path(__file__).resolve().parents[1];A=R/'art-source/world/deer-introduction/v001';O=R/'public/assets/world/story/v003'
for p in (A,O):p.mkdir(parents=True,exist_ok=True)
text='此画名为《九色鹿王本生》，现于257窟西壁中段，这组壁画曾由上海美术制片厂制作成动画片，可谓家喻户晓。画面采用横卷连环画的表现形式，按两头开始、中间结束的特殊顺序布局绘制。'
f=A/'introduction.txt';f.write_text(text+'\n');raw=A/'introduction.aiff';out=O/'deer-introduction.mp3'
if not raw.exists():subprocess.run(['say','-v','Grandpa (中文（中国大陆）)','-r','175','-f',str(f),'-o',str(raw)],check=True)
if not out.exists():subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(raw),'-af','loudnorm=I=-18:TP=-2:LRA=7','-ar','44100','-ac','1','-c:a','libmp3lame','-b:a','128k',str(out)],check=True)
duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(out)]))
config={'id':'deer-introduction','text':text,'file':out.name,'duration':duration,'status':'temporary-local-elder-voice','voice':'macOS Grandpa zh_CN 175','sha256':hashlib.sha256(out.read_bytes()).hexdigest()}
for p in [A/'manifest.json',R/'src/content/world/deer-introduction-v001.json']:p.write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
print(duration)
