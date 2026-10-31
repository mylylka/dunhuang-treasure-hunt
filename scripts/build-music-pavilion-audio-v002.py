"""Original temporary plucked phrase, not an instrument recording or reconstruction."""
from pathlib import Path
import json, wave, hashlib
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/world/music-pavilion/v002/arrival-plucks.wav'
SOURCE=ROOT/'art-source/world/music-pavilion/v002'
sr=24000;duration=24;audio=np.zeros(sr*duration,dtype=np.float64)
# An original sparse D pentatonic phrase. The loop contains its own wrapped
# decays, so entering the next cycle has no artificial silent seam.
score=[(0,62,.80),(.75,69,.48),(1.5,72,.65),(2.5,74,.50),(3.75,69,.43),
       (5,67,.70),(5.75,65,.43),(6.5,62,.62),(8,57,.45),(9.5,62,.65),(10.25,65,.45),
       (11.5,69,.61),(12.5,74,.48),(14,72,.60),(15,69,.43),(16,67,.63),
       (17.5,65,.54),(18.25,62,.43),(20,57,.45),(21.5,62,.64)]
for onset,midi,velocity in score:
    frequency=440*2**((midi-69)/12);t=np.arange(sr*4.5)/sr
    pluck=np.zeros_like(t)
    for harmonic in range(1,11):
        pluck+=np.sin(2*np.pi*frequency*harmonic*(1+.00013*harmonic**2)*t)*np.exp(-t*(1.7+harmonic*.38))/harmonic**1.35
    pluck*=np.minimum(1,t/.004)*velocity
    # Short reflected tails give a little body; the direct phrase stays clear.
    for delay,gain in [(0,1),(.087,.12),(.173,.07)]:
        indices=(np.arange(len(pluck))+int((onset+delay)*sr))%len(audio)
        np.add.at(audio,indices,pluck*gain)
audio-=audio.mean();audio*=.68/np.max(np.abs(audio))
OUT.parent.mkdir(parents=True,exist_ok=True);SOURCE.mkdir(parents=True,exist_ok=True)
with wave.open(str(OUT),'wb') as output:
    output.setnchannels(1);output.setsampwidth(2);output.setframerate(sr)
    output.writeframes(np.round(audio*32767).astype('<i2').tobytes())
manifest={'status':'temporary original arrival cue; user approved for spatial timing audition only',
    'not':'No claim of authentic pipa recording, ancient Dunhuang music or completed music content',
    'sampleRate':sr,'durationSeconds':duration,'channels':1,'scoreSecondsMidiVelocity':score,
    'peak':float(np.max(np.abs(audio))),'rms':float(np.sqrt(np.mean(audio**2))),
    'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'bytes':OUT.stat().st_size}
(SOURCE/'audio-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(manifest))
