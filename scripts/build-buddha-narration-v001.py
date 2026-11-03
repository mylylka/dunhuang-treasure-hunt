"""Replaceable full-paragraph local elder narration, no online voice service."""
from pathlib import Path
import json,subprocess,hashlib
R=Path(__file__).resolve().parents[1];A=R/'art-source/world/buddha-narration/v001';O=R/'public/assets/world/buddha-narration/v001'
for p in (A,O):p.mkdir(parents=True,exist_ok=True)
text='在敦煌的“九层楼”，即第96窟，里面供奉的是莫高窟第一大佛——弥勒佛坐像。通高35.5米，是敦煌莫高窟最大的塑像，也是中国国内仅次于乐山大佛、荣县大佛的第三大坐佛。其右手上扬施无畏印，左手平伸与愿印。当前雕像为游戏中的仿制品，并非对原像的精准还原。'
source=A/'narration.txt';source.write_text(text+'\n');raw=A/'narration.aiff';out=O/'buddha-narration.mp3'
if not raw.exists():subprocess.run(['say','-v','Grandpa (中文（中国大陆）)','-r','175','-f',str(source),'-o',str(raw)],check=True)
if not out.exists():subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(raw),'-af','loudnorm=I=-18:TP=-2:LRA=7','-ar','44100','-ac','1','-c:a','libmp3lame','-b:a','128k',str(out)],check=True)
duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(out)]))
config={'id':'buddha-narration','text':text,'audioPath':'buddha-narration/v001/buddha-narration.mp3','duration':duration,'status':'temporary-local-elder-voice','voice':'macOS Grandpa zh_CN 175','source':'User supplied narration; https://www.dha.ac.cn/info/1425/3648.htm','sha256':hashlib.sha256(out.read_bytes()).hexdigest()}
for p in [A/'manifest.json',R/'src/content/world/buddha-narration-v001.json']:p.write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
print(duration)
