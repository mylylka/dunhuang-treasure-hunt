"""Two user-requested local speech auditions; preserve all older voice assets."""
from pathlib import Path
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'art-source/world/traveler-voice/v001';OUT=ROOT/'public/assets/world/traveler-voice/v001'
LINES={'music-question':'哪里来的音乐声？','mural-admiration':'好美的飞天啊！'}
SOURCE.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
if (SOURCE/'manifest.json').exists():raise SystemExit('Existing v001 preserved; use a new version to regenerate.')
entries=[]
for name,text in LINES.items():
 raw=SOURCE/(name+'.aiff');script=SOURCE/(name+'.txt');audio=OUT/(name+'.mp3')
 if raw.exists() or script.exists() or audio.exists():raise SystemExit('Existing audition files preserved.')
 script.write_text(text+'\n');subprocess.run(['say','-v','Tingting','-r','190','-f',str(script),'-o',str(raw)],check=True)
 subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(raw),'-af','loudnorm=I=-18:TP=-2:LRA=7','-ar','44100','-ac','1','-c:a','libmp3lame','-b:a','128k',str(audio)],check=True)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size','-of','json',str(audio)]))
 entries.append({'id':name,'text':text,'duration':float(probe['format']['duration']),'sha256':hashlib.sha256(audio.read_bytes()).hexdigest()})
manifest={'status':'local-voice-audition-not-final','source':'macOS installed Tingting, rate 190; no pitch or timbre alteration','authorization':'User selected local voice audition, then requested these two spoken lines.','entries':entries}
(SOURCE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print(json.dumps(manifest,ensure_ascii=False))
