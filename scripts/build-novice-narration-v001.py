"""Temporary local elder voice; one replaceable file per full paragraph."""
from pathlib import Path
import json,subprocess,hashlib
R=Path(__file__).resolve().parents[1];A=R/'art-source/world/novice-story/v001/audio';O=R/'public/assets/world/novice-story/v001';A.mkdir(parents=True,exist_ok=True)
c=json.loads((R/'src/content/world/novice-story-v001.json').read_text());tracks={}
for e in [c['introduction'],*c['segments'],c['ending']]:
 id=e['id'];txt=A/(id+'.txt');txt.write_text(e['text']+'\n');raw=A/(id+'.aiff');out=O/e['audio']
 if not raw.exists():subprocess.run(['say','-v','Grandpa (中文（中国大陆）)','-r','175','-f',str(txt),'-o',str(raw)],check=True)
 if not out.exists():subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(raw),'-af','loudnorm=I=-18:TP=-2:LRA=7','-ar','44100','-ac','1','-c:a','libmp3lame','-b:a','128k',str(out)],check=True)
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(out)]));tracks[id]={'file':out.name,'duration':duration,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()};print(id,duration,flush=True)
m={'status':'temporary-local-elder-voice','voice':'macOS Grandpa zh_CN, 175 words/min','tracks':tracks};(R/'src/content/world/novice-audio-v001.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');(A/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
