"""Synthesize the first-gallery unlock chime without external samples."""

from array import array
from math import exp, pi, sin
from pathlib import Path
from sys import byteorder
from wave import open as open_wave


def tone(age, frequency, weight, decay):
    if age < 0:
        return 0.0
    attack = 1 - exp(-age * 210)
    fundamental = sin(2 * pi * frequency * age) * exp(-age * decay)
    glint = 0.23 * sin(2 * pi * frequency * 2.01 * age) * exp(-age * (decay + 5))
    overtone = 0.07 * sin(2 * pi * frequency * 3.17 * age) * exp(-age * (decay + 12))
    return weight * attack * (fundamental + glint + overtone)


def main():
    rate, duration = 22050, 1.75
    strikes = (
        (0.00, 293.66, 0.36, 4.8),
        (0.07, 440.00, 0.30, 6.0),
        (0.14, 587.33, 0.35, 6.8),
        (0.22, 659.25, 0.23, 8.0),
        (0.31, 880.00, 0.29, 7.4),
        (0.39, 1174.66, 0.17, 9.4),
        (0.43, 146.83, 0.28, 3.8),
    )
    samples = []
    for i in range(round(rate * duration)):
        time = i / rate
        sound = sum(tone(time - start, note, weight, decay) for start, note, weight, decay in strikes)
        tail = max(0.0, min(1.0, (duration - time) / 0.17))
        samples.append(sound * tail)
    peak = max(abs(sample) for sample in samples)
    pcm = array('h', (round(sample * 0.48 * 32767 / peak) for sample in samples))
    if byteorder == 'big':
        pcm.byteswap()
    path = Path(__file__).resolve().parents[1] / 'public/assets/world/first-gallery/v001/portal-unlock.wav'
    with open_wave(str(path), 'wb') as output:
        output.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
        output.writeframes(pcm.tobytes())


if __name__ == '__main__':
    main()
