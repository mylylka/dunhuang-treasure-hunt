"""Rebuild the original, deterministic sound audition without external services.

Only the independent outputs/sound-audition/v001 delivery and audio recipe
archive are written. No game content, settings, or saves are changed.
"""
from array import array
from hashlib import sha256
import json
import math
from pathlib import Path
import random
import wave

ROOT = Path(__file__).resolve().parents[1]
DELIVERY = ROOT / "outputs/sound-audition/v001"
ARCHIVE = ROOT / "art-source/audio/sfx-audition/v001"
RATE = 44100
TAU = math.tau
EVENTS = [
    ("button", "按钮确认", "轻点一下", .055),
    ("rotate", "旋转图块", "轻巧拨动", .060),
    ("success", "找对／拼片归位", "短小、上行的肯定", .070),
    ("error", "点错／放错位置", "柔和低音，不惩罚", .045),
    ("fill", "填色成功", "轻刷落色", .035),
    ("hint", "使用提示", "稍明亮的提醒", .060),
    ("complete", "完成作品／通关", "收束的小乐句", .075),
]


def gate(t, duration, attack=.004, release=.024):
    entering = math.sin(min(1, max(0, t / attack)) * math.pi / 2) ** 2
    leaving = math.sin(min(1, max(0, (duration - t) / release)) * math.pi / 2) ** 2
    return entering * leaving


def modal(frequency, duration, decay, bright=False, glide=0):
    """Damped inharmonic modes: wood-like or light bell-like, not recordings."""
    ratios = [1, 2.01, 2.79, 4.03] if bright else [1, 1.49, 2.08, 3.31]
    weights = [1, .22, .075, .018] if bright else [1, .40, .16, .055]
    values = []
    for i in range(round(duration * RATE)):
        t = i / RATE
        # Slight upward change is reserved for rotation; no oscillator jump.
        phase_time = t + glide * t * t / (2 * duration)
        sample = sum(weight * math.sin(TAU * frequency * ratio * phase_time)
                     * math.exp(-t / (decay / (1 + index * .32)))
                     for index, (ratio, weight) in enumerate(zip(ratios, weights)))
        values.append(sample * gate(t, duration))
    return values


def brush(duration, seed, bright=False):
    """Band-limited noise with a soft body; no loud full-band white hiss."""
    rng = random.Random(seed)
    low, slow = 0., 0.
    values = []
    coefficient = .14 if bright else .075
    for i in range(round(duration * RATE)):
        t = i / RATE
        low += coefficient * (rng.uniform(-1, 1) - low)
        slow += .018 * (low - slow)
        band = low - slow
        envelope = math.sin(math.pi * t / duration) ** 1.4
        body = .025 * math.sin(TAU * (540 if bright else 370) * t) * math.exp(-t / .055)
        values.append((band * envelope + body) * gate(t, duration, .008, .035))
    return values


def mix_parts(duration, parts):
    values = [0.] * round(duration * RATE)
    for offset, signal, gain in parts:
        start = round(offset * RATE)
        for index, value in enumerate(signal):
            if start + index < len(values):
                values[start + index] += value * gain
    return values


def reflections(values, bright):
    # Very quiet, short reflections give a material impression without a long wash.
    original = values[:]
    for delay, gain in ([(.027, .055), (.053, .025)] if bright else [(.013, .035), (.029, .015)]):
        shift = round(delay * RATE)
        for index in range(shift, len(values)):
            values[index] += original[index - shift] * gain
    return values


def create_sound(style, event):
    bright = style == "bright"
    voice = lambda f, d, tau, gain=1, glide=0: [x * gain for x in modal(f, d, tau, bright, glide)]
    if event == "button":
        values = voice(780 if bright else 510, .21 if bright else .15, .039 if bright else .025)
    elif event == "rotate":
        duration = .27 if bright else .23
        values = mix_parts(duration, [(0, voice(640 if bright else 430, duration, .050, glide=.06), .85),
                                      (.025, brush(.15, 402, bright), .11)])
    elif event == "success":
        values = mix_parts(.52 if bright else .43, [
            (0, voice(587.33, .31, .067 if bright else .048), .82),
            (.105, voice(739.99, .39 if bright else .29, .080 if bright else .050), 1),
        ])
    elif event == "error":
        values = mix_parts(.27, [(0, voice(329.63 if bright else 293.66, .16, .028), .8),
                                  (.070, voice(261.63 if bright else 220.00, .18, .032), .7)])
    elif event == "fill":
        values = mix_parts(.28, [(0, brush(.24, 809, bright), 1),
                                 (.025, voice(659.25 if bright else 440, .20, .037), .07 if bright else .05)])
    elif event == "hint":
        values = mix_parts(.64 if bright else .47, [
            (0, voice(659.25 if bright else 493.88, .40, .077 if bright else .055), .65),
            (.105, voice(880 if bright else 659.25, .49 if bright else .33, .090 if bright else .057), .85),
        ])
    else:
        duration = 1.38 if bright else 1.12
        notes = [587.33, 659.25, 880, 1174.66] if bright else [440, 493.88, 659.25, 880]
        values = mix_parts(duration, [
            (offset, voice(frequency, duration - offset, .14 if bright else .095), gain)
            for offset, frequency, gain in zip([0, .13, .28, .46], notes, [.55, .58, .67, .72])
        ])
    values = reflections(values, bright)
    # Remove DC before the final gate. No limiter distortion or flat clipping.
    mean = sum(values) / len(values)
    duration = len(values) / RATE
    values = [(value - mean) * gate(i / RATE, duration, .003, .032) for i, value in enumerate(values)]
    target_rms = next(item[3] for item in EVENTS if item[0] == event)
    peak = max(abs(value) for value in values)
    active = [value for value in values if abs(value) >= peak * .01]
    rms = math.sqrt(sum(value * value for value in active) / len(active))
    gain = min(target_rms / rms, .40 / peak)
    # A short exact-zero tail avoids clicks in players and in sequence stitching.
    return [value * gain for value in values] + [0.] * round(.015 * RATE)


def db(value):
    return round(20 * math.log10(value), 2) if value > 0 else None


def write_audio(path, values):
    integers = array('h', [round(max(-1., min(1., value)) * 32767) for value in values])
    if __import__('sys').byteorder != 'little':
        integers.byteswap()
    with wave.open(str(path), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(integers.tobytes())
    pcm = [sample / 32768 for sample in integers]
    peak = max(abs(sample) for sample in pcm)
    active = [sample for sample in pcm if abs(sample) >= peak * .01]
    active_rms = math.sqrt(sum(sample * sample for sample in active) / len(active))
    record = {"file": path.name, "sampleRate": RATE, "channels": 1, "bits": 16,
              "durationSeconds": round(len(values) / RATE, 4), "peakDbfs": db(peak),
              "activeRmsDbfs": db(active_rms), "dcOffset": round(sum(pcm) / len(pcm), 7),
              "firstSample": integers[0], "lastSample": integers[-1],
              "lastFiveMsPeak": max(abs(value) for value in integers[-round(.005 * RATE):]),
              "sha256": sha256(path.read_bytes()).hexdigest()}
    if peak > .401 or record['firstSample'] or record['lastSample'] or record['lastFiveMsPeak']:
        raise RuntimeError(f"Audio safety validation failed: {path}")
    return record


def main():
    audio = DELIVERY / 'audio'
    audio.mkdir(parents=True, exist_ok=True)
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    records, timelines = [], {}
    for style, label in [('warm', '温润木石'), ('bright', '清亮铃玉')]:
        sequence = [0.] * round(.30 * RATE)
        timeline = []
        for event, title, description, _ in EVENTS:
            values = create_sound(style, event)
            filename = f'{style}-{event}.wav'
            record = write_audio(audio / filename, values)
            record.update(style=style, styleLabel=label, event=event, title=title, description=description,
                          path=f'audio/{filename}')
            records.append(record)
            timeline.append({"event": event, "title": title, "start": round(len(sequence) / RATE, 4),
                             "duration": record['durationSeconds']})
            sequence.extend(values)
            sequence.extend([0.] * round(.45 * RATE))
        demo = write_audio(audio / f'{style}-demo.wav', sequence)
        demo.update(style=style, styleLabel=label, event='demo', title=f'{label}整套试听', path=f'audio/{style}-demo.wav')
        records.append(demo)
        timelines[style] = timeline
    manifest = {"version": "sfx-audition-v001", "date": "2026-10-29", "purpose": "独立音效试听，未接入正式游戏",
                "provenance": "原创程序合成；无录音、外部采样、音乐API或第三方音效素材。不宣称真实乐器或敦煌古乐复原。",
                "events": [{"id": event, "title": title} for event, title, _, _ in EVENTS],
                "sounds": records, "demoTimelines": timelines}
    (DELIVERY / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (ARCHIVE / 'measurements.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    recipe = {"version": 1, "generator": "scripts/generate-sound-audition.py", "sampleRate": RATE,
              "methods": ["衰减非整数倍模态正弦叠加", "固定种子带限噪声", "柔和首尾包络", "低音量短反射", "同类主动RMS匹配及0.40FS峰值上限"],
              "brushSeeds": [402, 809], "rmsTargets": {event: rms for event, _, _, rms in EVENTS},
              "rebuild": "python3 scripts/generate-sound-audition.py", "oldVersionPolicy": "后续修订另建版本，不删除已交付试听。"}
    (ARCHIVE / 'recipe.json').write_text(json.dumps(recipe, ensure_ascii=False, indent=2) + '\n')
    for record in records:
        print(f"{record['file']}: {record['durationSeconds']:.3f}s, peak {record['peakDbfs']}dBFS, active RMS {record['activeRmsDbfs']}dBFS")


if __name__ == '__main__':
    main()
