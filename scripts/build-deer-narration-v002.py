"""Local temporary elder narration with measured per-phrase subtitle timing."""
from pathlib import Path
import json,subprocess,wave,hashlib
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/world/nine-colored-deer/v002/audio'
OUT=ROOT/'public/assets/world/story/v002'
CONFIG=ROOT/'src/content/world/nine-colored-deer-v002.json'
MANIFEST=ROOT/'src/content/world/story-audio-v002.json'
if MANIFEST.exists():raise SystemExit('Existing narration preserved; use a new version for voice changes.')
SOURCE.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
story=json.loads(CONFIG.read_text());entries={}
for segment in [*story['segments'],story['ending']]:
 id=segment['id'];frames=[];cues=[];elapsed=0
 for i,text in enumerate(segment['cues']):
  path=SOURCE/f'{id}-{i+1}';script=path.with_suffix('.txt');aiff=path.with_suffix('.aiff');wav=path.with_suffix('.wav')
  if not aiff.exists():
   script.write_text(text+'\n');subprocess.run(['say','-v','Grandpa (中文（中国大陆）)','-r','175','-f',str(script),'-o',str(aiff)],check=True)
  if not wav.exists():subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(aiff),'-ar','44100','-ac','1','-c:a','pcm_s16le',str(wav)],check=True)
  with wave.open(str(wav),'rb') as w:
   count=w.getnframes();frames.append(w.readframes(count));duration=count/44100
  cues.append({'start':round(elapsed,4),'end':round(elapsed+duration,4),'text':text});elapsed+=duration
 raw=SOURCE/f'{id}.wav'
 if not raw.exists():
  with wave.open(str(raw),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(44100);w.writeframes(b''.join(frames))
 audio=OUT/segment['audio']
 if not audio.exists():subprocess.run(['ffmpeg','-nostdin','-v','error','-n','-i',str(raw),'-af','loudnorm=I=-18:TP=-2:LRA=7','-ar','44100','-ac','1','-c:a','libmp3lame','-b:a','128k',str(audio)],check=True)
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(audio)]))
 entries[id]={'file':segment['audio'],'duration':duration,'cues':cues,'sha256':hashlib.sha256(audio.read_bytes()).hexdigest()}
 print(id,duration,flush=True)
manifest={'status':'temporary-synthetic-elder-narration','voice':'macOS installed Grandpa (zh_CN), rate175, no voice cloning','processing':'per-phrase speech concatenated, measured PCM timecodes, -18LUFS mono MP3; replace with user recording later','tracks':entries}
MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(SOURCE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
