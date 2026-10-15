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


def kazoo(freq, x, vibrato=6.0, depth=0.025):
    """Buzzy kazoo-ish tone: a pulse wave with a wobble, slightly nasal."""
    f = freq * (1 + depth * np.sin(2 * np.pi * vibrato * x))
    phase = np.cumsum(np.broadcast_to(f, x.shape) / RATE) % 1
    pulse = np.where(phase < 0.18, 1.0, -0.22)
    return lowpass(pulse + 0.3 * saw(f, x), 0.25)


def kazoo_fanfare():
    """Ta-da on a kazoo: deliberately goofy."""
    parts = []
    for f, d in [(392, 0.13), (523, 0.13), (659, 0.13), (784, 0.65)]:
        x = t(d)
        parts.append(kazoo(f, x, vibrato=7 if d > 0.5 else 0, depth=0.03) * env(len(x), 0.01, 0.06))
        parts.append(silence(0.02))
    return np.concatenate(parts)


def sad_trombone():
    """Wah wah wah waaaah, extra wobbly."""
    parts = []
    for f, d in [(370, 0.34), (349, 0.34), (330, 0.34), (311, 1.1)]:
        x = t(d)
        long = d > 0.5
        bend = np.linspace(1, 0.93, len(x)) if long else np.linspace(1.02, 1, len(x))
        # The last note droops and wobbles in pitch: that's the joke.
        tone = kazoo(f * bend, x, vibrato=6 if long else 0, depth=0.045 if long else 0)
        parts.append(tone * env(len(x), 0.03, 0.15))
    return np.concatenate(parts)


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


def boing():
    """Cartoon spring."""
    x = t(0.7)
    f = 220 * (1 + 0.6 * np.exp(-x * 6) * np.sin(2 * np.pi * 14 * x)) + 120 * np.exp(-x * 3)
    return np.sin(2 * np.pi * np.cumsum(f) / RATE) * np.exp(-x * 4) * env(len(x), 0.003, 0.05)


def slide_whistle(up=True, d=0.6):
    x = t(d)
    lo, hi = 500, 1900
    f = np.linspace(lo, hi, len(x)) if up else np.linspace(hi, lo, len(x))
    f = f * (1 + 0.012 * np.sin(2 * np.pi * 9 * x))
    breath = 0.04 * rng.standard_normal(len(x))
    return (np.sin(2 * np.pi * np.cumsum(f) / RATE) + breath) * env(len(x), 0.04, 0.08)


def honk():
    """Clown horn, honk-honk."""
    def one(d):
        x = t(d)
        s = sum(saw(f, x) for f in (370, 554))
        return lowpass(s, 0.3) * env(len(x), 0.01, 0.04)
    return np.concatenate([one(0.16), silence(0.07), one(0.24)])


def bonk():
    """Hollow cartoon bonk."""
    x = t(0.35)
    f = 180 * np.exp(-x * 4) + 90
    body = np.sin(2 * np.pi * np.cumsum(f) / RATE) * np.exp(-x * 12)
    click = rng.standard_normal(len(x)) * np.exp(-x * 150) * 0.6
    return body + click


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, fn in [
        ('airhorn', airhorn),
        ('kazoo', kazoo_fanfare),
        ('sadtrombone', sad_trombone),
        ('boing', boing),
        ('slideup', lambda: slide_whistle(True)),
        ('slidedown', lambda: slide_whistle(False)),
        ('honk', honk),
        ('bonk', bonk),
        ('whoosh', whoosh),
        ('drumroll', drumroll),
    ]:
        write(name, fn())
        print('wrote', name)
