"""Generate PickleParty's sound effects from scratch (no third-party audio, no licensing).

Run: python3 scripts/make_sounds.py   (needs numpy). Writes assets/sounds/*.wav.
"""
import os
import wave

import numpy as np

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
rng = np.random.default_rng(7)


def t(seconds):
    return np.arange(int(RATE * seconds)) / RATE


def env(n, attack=0.01, release=0.08):
    e = np.ones(n)
    a, r = int(RATE * attack), int(RATE * release)
    e[:a] = np.linspace(0, 1, a)
    e[-r:] = np.linspace(1, 0, r)
    return e


def saw(freq, x):
    phase = np.cumsum(np.broadcast_to(freq, x.shape) / RATE)
    return 2 * (phase % 1) - 1


def square(freq, x):
    return np.sign(np.sin(2 * np.pi * np.cumsum(np.broadcast_to(freq, x.shape) / RATE)))


def lowpass(sig, alpha):
    out = np.empty_like(sig)
    acc = 0.0
    for i, v in enumerate(sig):
        acc += alpha * (v - acc)
        out[i] = acc
    return out


def silence(seconds):
    return np.zeros(int(RATE * seconds))


def write(name, sig):
    sig = sig / (np.max(np.abs(sig)) + 1e-9) * 0.7
    data = (sig * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(data.tobytes())


def airhorn():
    def blast(d):
        x = t(d)
        vib = 1 + 0.01 * np.sin(2 * np.pi * 6 * x)
        s = sum(saw(f * vib, x) for f in (311, 392, 466))
        return lowpass(s, 0.35) * env(len(x), 0.02, 0.05)
    return np.concatenate([blast(0.22), silence(0.06), blast(0.22), silence(0.06), blast(0.75)])


def fanfare():
    notes = [(523, 0.12), (659, 0.12), (784, 0.12), (1047, 0.6)]
    parts = []
    for f, d in notes:
        x = t(d)
        s = 0.6 * square(f, x) + 0.4 * np.sin(2 * np.pi * f * x)
        parts.append(lowpass(s, 0.3) * env(len(x), 0.005, 0.05) * np.exp(-x * 1.5))
    return np.concatenate(parts)


def sad_trombone():
    parts = []
    for f, d in [(392, 0.32), (370, 0.32), (349, 0.32), (330, 1.0)]:
        x = t(d)
        wobble = 1 + (0.03 * np.sin(2 * np.pi * 5 * x) if d > 0.5 else 0)
        bend = np.linspace(1, 0.97, len(x)) if d > 0.5 else 1
        s = lowpass(saw(f * wobble * bend, x), 0.12)
        parts.append(s * env(len(x), 0.03, 0.12))
    return np.concatenate(parts)


def ding():
    x = t(0.9)
    s = np.sin(2 * np.pi * 1320 * x) + 0.4 * np.sin(2 * np.pi * 2640 * x) + 0.2 * np.sin(2 * np.pi * 3960 * x)
    return s * np.exp(-x * 5) * env(len(x), 0.002, 0.05)


def buzzer():
    x = t(0.7)
    return lowpass(square(110, x) + 0.5 * square(112, x), 0.4) * env(len(x), 0.01, 0.06)


def whoosh():
    x = t(0.5)
    noise = rng.standard_normal(len(x))
    sweep = np.concatenate([lowpass(noise[i:i + 512], 0.02 + 0.5 * i / len(x)) for i in range(0, len(x), 512)])[: len(x)]
    return sweep * np.sin(np.pi * x / x[-1]) ** 2


def drumroll():
    hits = []
    for i in range(22):
        d = 0.045
        x = t(d)
        hits.append(rng.standard_normal(len(x)) * np.exp(-x * 60) * (0.4 + 0.6 * i / 22))
    x = t(0.6)
    crash = rng.standard_normal(len(x)) * np.exp(-x * 5)
    return np.concatenate(hits + [crash])


def zap():
    x = t(0.3)
    f = np.linspace(1800, 200, len(x))
    return square(f, x) * np.exp(-x * 8) * env(len(x), 0.002, 0.03)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, fn in [
        ('airhorn', airhorn),
        ('fanfare', fanfare),
        ('sadtrombone', sad_trombone),
        ('ding', ding),
        ('buzzer', buzzer),
        ('whoosh', whoosh),
        ('drumroll', drumroll),
        ('zap', zap),
    ]:
        write(name, fn())
        print('wrote', name)
