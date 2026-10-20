# /// script
# dependencies = ["numpy", "scipy"]
# ///
"""Synthesizes the reel soundtrack from out/events.json (written by render.mjs).

Run from web: uv run tools/showreel/audio.py
"""
import json
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

HERE = Path(__file__).parent
SR = 48000
cues = json.loads((HERE / "out/events.json").read_text())
DUR = cues["duration"]
N = int(SR * DUR)
rng = np.random.default_rng(7)

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))
send = np.zeros((N, 2))

BAR0 = 2.5
BEAT = 0.5
DROP = 19.75


def tt(dur):
	return np.arange(int(dur * SR)) / SR


def noise(dur):
	return rng.standard_normal(int(dur * SR))


def decay(n, seconds):
	return np.exp(-np.arange(n) / SR / seconds)


def filt(sig, kind, freq, order=2):
	return sosfilt(butter(order, freq, btype=kind, fs=SR, output="sos"), sig)


def saw(freq, dur, detune=0.0):
	phase = (np.arange(int(dur * SR)) * freq * (1 + detune) / SR + rng.random()) % 1.0
	return 2 * phase - 1


def sine(freq, dur):
	return np.sin(2 * np.pi * freq * tt(dur))


def sweep(f0, f1, dur):
	t = tt(dur)
	return np.sin(2 * np.pi * np.cumsum(f0 * (f1 / f0) ** (t / dur)) / SR)


def svf_band(sig, freqs, q=1.2):
	low = band = 0.0
	out = []
	damp = 1 / q
	for x, f in zip(sig.tolist(), freqs.tolist()):
		k = 2 * np.sin(np.pi * min(f, SR / 6) / SR)
		high = x - low - damp * band
		band += k * high
		low += k * band
		out.append(band)
	return np.array(out)


def add(bus, t, sig, gain=1.0, pan=0.0):
	start = int(t * SR)
	if start >= N or len(sig) == 0:
		return
	if sig.ndim == 1:
		angle = (np.clip(pan, -1, 1) + 1) * np.pi / 4
		sig = np.stack([sig * np.cos(angle), sig * np.sin(angle)], axis=1) * np.sqrt(2)
	if start < 0:
		sig = sig[-start:]
		start = 0
	end = min(N, start + len(sig))
	bus[start:end] += sig[: end - start] * gain


# ---------------- sound design ----------------
def whoosh(dur=0.5, lo=250, hi=5000):
	p = tt(dur) / dur
	body = svf_band(noise(dur), lo * (hi / lo) ** (p**1.4), q=1.6)
	env = np.where(p < 0.7, (p / 0.7) ** 2, np.exp(-(p - 0.7) * 14))
	return body * env * 0.9


def impact(size=1.0):
	dur = 0.6 + size * 0.9
	sub = sweep(95, 34, dur) * decay(int(dur * SR), 0.25 + size * 0.35)
	body = filt(noise(dur), "low", 2600) * decay(int(dur * SR), 0.07 + size * 0.1)
	click = filt(noise(0.02), "high", 3000) * decay(int(0.02 * SR), 0.003)
	out = sub * 0.7 + body * 0.8
	out[: len(click)] += click * 0.6
	return out


def riser(dur):
	p = tt(dur) / dur
	air = svf_band(noise(dur), 350 * (18 ** p), q=2.2) * p**2.2
	tone = sweep(160, 960, dur) * p**2.5 * 0.25
	return air + tone


def tick(pitch=3000):
	dur = 0.03
	return sine(pitch, dur) * decay(int(dur * SR), 0.008) + filt(noise(dur), "high", 4000) * decay(int(dur * SR), 0.002) * 0.5


def pop(pitch=1.0):
	dur = 0.12
	return sweep(260 * pitch, 1150 * pitch, dur) * decay(int(dur * SR), 0.035)


def key_click():
	dur = 0.04
	return filt(noise(dur), "high", 1800) * decay(int(dur * SR), 0.005) * 0.8 + sine(170, dur) * decay(int(dur * SR), 0.01) * 0.4


def ping(freq, length=0.25):
	return sine(freq, length) * decay(int(length * SR), length / 4)


def bell(freq, length=2.0):
	partials = [(1, 1.0), (2.01, 0.45), (3.02, 0.22), (4.2, 0.12)]
	out = sum(sine(freq * ratio, length) * amp * decay(int(length * SR), length / (2 + ratio)) for ratio, amp in partials)
	out[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
	return out


def counter_value(t):
	def prog(x, a, b):
		return min(1.0, max(0.0, (x - a) / (b - a)))

	if t < 6.35:
		return 3128 * (1 - 2 ** (-10 * prog(t, 4.62, 5.85))) / (1 - 2**-10)
	p = prog(t, 6.35, 7.2)
	eased = 1 - (-2 * p + 2) ** 3 / 2
	if p < 0.5:
		eased = 4 * p**3
	return 3128 + (9222 - 3128) * eased


def roll(start, dur, gain):
	step = 97
	last_bucket = int(counter_value(start) // step)
	last_time = -1.0
	for t in np.arange(start, start + dur + 0.2, 1 / 240):
		bucket = int(counter_value(t) // step)
		if bucket != last_bucket and t - last_time > 0.022:
			pitch = 2200 + (bucket % 12) * 90
			add(sfx, t, tick(pitch), 0.22 * gain, rng.uniform(-0.25, 0.25))
			last_time = t
		last_bucket = bucket


for cue in cues["events"]:
	t, kind, v, d = cue["t"], cue["type"], cue["v"], cue["d"]
	if kind == "whoosh":
		sig = whoosh(0.5)
		add(sfx, t - 0.3, sig, 0.55 * v, rng.uniform(-0.4, 0.4))
		add(send, t - 0.3, sig, 0.15 * v)
	elif kind == "zip":
		add(sfx, t - 0.05, whoosh(0.3, 1200, 7500), 0.2 * v, rng.uniform(-0.5, 0.5))
	elif kind == "impact":
		sig = impact(0.6)
		add(sfx, t, sig, 0.75 * v)
		add(send, t, sig, 0.2 * v)
	elif kind == "boom":
		sig = impact(1.6)
		add(sfx, t, sig, 1.0 * v)
		crash = filt(noise(2.5), "band", [500, 9000]) * decay(int(2.5 * SR), 0.55)
		add(sfx, t, crash, 0.28 * v, -0.1)
		add(send, t, crash, 0.5 * v)
		for i, freq in enumerate([880, 1318.5, 1760]):
			add(sfx, t + 0.02 + i * 0.09, bell(freq, 2.2), 0.13, (i - 1) * 0.4)
			add(send, t + 0.02 + i * 0.09, bell(freq, 2.2), 0.2)
	elif kind == "riser":
		sig = riser(d)
		add(sfx, t, sig, 0.5 * v)
		add(send, t, sig, 0.2 * v)
	elif kind == "swell":
		p = tt(d) / d
		sig = filt(noise(d), "low", 900) * p**3
		add(sfx, t, sig, 0.25 * v)
		add(send, t, sig, 0.3 * v)
	elif kind == "tick":
		add(sfx, t, tick(rng.uniform(2600, 3600)), 0.3 * v, rng.uniform(-0.3, 0.3))
	elif kind == "pop":
		sig = pop(rng.uniform(0.85, 1.25))
		add(sfx, t, sig, 0.38 * v, rng.uniform(-0.4, 0.4))
		add(send, t, sig, 0.12 * v)
	elif kind == "type":
		add(sfx, t, key_click(), 0.3 * v * rng.uniform(0.7, 1.0), rng.uniform(-0.2, 0.2))
	elif kind == "roll":
		roll(t, d, v)
	elif kind == "draw":
		wobble = 0.55 + 0.45 * np.sin(2 * np.pi * np.cumsum(rng.uniform(7, 15, int(d * SR))) / SR)
		sig = filt(noise(d), "band", [1800, 6500]) * wobble * np.sin(np.pi * tt(d) / d) ** 0.5
		add(sfx, t, sig, 0.07 * v, 0.1)
	elif kind == "shimmer":
		for _ in range(12):
			at = t + rng.uniform(0, d)
			sig = ping(rng.uniform(2600, 6500), 0.3)
			add(sfx, at, sig, 0.05 * v, rng.uniform(-0.8, 0.8))
			add(send, at, sig, 0.12 * v)
	elif kind == "blip":
		add(sfx, t, ping(988, 0.08), 0.18 * v)
		add(sfx, t + 0.06, ping(1480, 0.1), 0.18 * v)
	elif kind == "ding":
		sig = bell(1318.5, 0.9) + bell(1975.5, 0.9) * 0.6
		add(sfx, t, sig, 0.14 * v, 0.2)
		add(send, t, sig, 0.2 * v)
	elif kind == "stamp":
		thud = sine(72, 0.3) * decay(int(0.3 * SR), 0.08) + filt(noise(0.3), "low", 1400) * decay(int(0.3 * SR), 0.03)
		add(sfx, t, thud, 1.0 * v)
		add(sfx, t, filt(noise(0.02), "high", 2500) * decay(int(0.02 * SR), 0.003), 0.5 * v)
	elif kind == "confetti":
		burst = filt(noise(0.2), "band", [700, 4500]) * decay(int(0.2 * SR), 0.035)
		add(sfx, t, burst, 0.5 * v)
		for _ in range(42):
			at = t + rng.exponential(0.22)
			add(sfx, at, tick(rng.uniform(3500, 7500)), 0.07 * v, rng.uniform(-0.9, 0.9))
		add(send, t, burst, 0.3 * v)

# ---------------- music (120 BPM, A minor) ----------------
CHORDS = {
	"Am": (55.0, [220.0, 261.63, 329.63, 392.0], [440.0, 523.25, 659.25, 880.0]),
	"F": (43.65, [174.61, 220.0, 261.63, 329.63], [349.23, 440.0, 523.25, 659.25]),
	"C": (65.41, [196.0, 261.63, 329.63, 392.0], [523.25, 659.25, 783.99, 1046.5]),
	"G": (49.0, [196.0, 246.94, 293.66, 440.0], [392.0, 493.88, 587.33, 783.99]),
	"E": (41.2, [207.65, 246.94, 329.63, 493.88], [415.3, 493.88, 659.25, 987.77]),
	"Amadd9": (55.0, [110.0, 164.81, 220.0, 246.94, 261.63, 329.63], [880.0, 987.77, 1318.5, 1760.0]),
}
SECTIONS = [(0.0, BAR0, "Am")]
for i in range(8):
	SECTIONS.append((BAR0 + i * 2, BAR0 + i * 2 + 2, ["Am", "F", "C", "G"][i % 4]))
SECTIONS += [(18.5, DROP, "E"), (DROP, DUR, "Amadd9")]


def chord_at(t):
	for start, end, name in SECTIONS:
		if start <= t < end:
			return CHORDS[name]
	return CHORDS["Amadd9"]


KICKS = [BAR0 + i * BEAT for i in range(int((18.5 - BAR0) / BEAT))]
sidechain = np.ones(N)
for k in KICKS + [DROP]:
	i = int(k * SR)
	n = min(N - i, int(0.35 * SR))
	sidechain[i : i + n] = np.minimum(sidechain[i : i + n], 1 - 0.7 * np.exp(-np.arange(n) / SR / 0.09))


def kick():
	dur = 0.4
	t = tt(dur)
	body = np.sin(2 * np.pi * np.cumsum(45 + 110 * np.exp(-t / 0.03)) / SR) * decay(int(dur * SR), 0.16)
	body[: int(0.004 * SR)] += filt(noise(0.004), "high", 2000) * 0.5
	return np.tanh(body * 1.6)


def snare():
	dur = 0.25
	return filt(noise(dur), "band", [1200, 7000]) * decay(int(dur * SR), 0.06) * 0.9 + sine(190, dur) * decay(int(dur * SR), 0.04) * 0.5


def hat(length=0.022):
	dur = 0.15
	return filt(noise(dur), "high", 7000) * decay(int(dur * SR), length)


for k in KICKS:
	add(music, k, kick(), 0.55)
add(music, DROP, kick(), 0.7)
for i in range(int((18.5 - 5.0) / 1.0)):
	at = 5.0 + i
	add(music, at, snare(), 0.42, 0.05)
	add(send, at, snare(), 0.12)
for i in range(int((18.5 - 4.5) / BEAT)):
	length = 0.022
	if i % 4 == 3:
		length = 0.08
	add(music, 4.5 + i * BEAT + 0.25, hat(length), 0.16, 0.25)
for i in range(int((18.5 - 12.5) / 0.125)):
	if i % 2 == 1:
		add(music, 12.5 + i * 0.125, hat(), 0.07, -0.25)
# snare roll into the drop
roll_times = [18.75 + i * 0.125 for i in range(4)] + [19.25 + i * 0.0625 for i in range(8)]
for i, at in enumerate(roll_times):
	add(music, at, snare(), 0.12 + 0.3 * i / len(roll_times), 0.05)

# bass: pumping 8ths
for i in range(int((18.5 - BAR0) / 0.25)):
	at = BAR0 + i * 0.25
	root = chord_at(at + 0.01)[0]
	freq = root * 2 * (1 + i % 2)
	dur = 0.24
	note = (saw(freq, dur) + saw(freq, dur, 0.004)) * 0.5
	env = np.minimum(1, tt(dur) / 0.005) * np.exp(-tt(dur) / 0.2)
	add(music, at, filt(note * env, "low", 900), 0.32)
bass_hold = saw(41.2, DROP - 18.5) * 0.5 + saw(41.2, DROP - 18.5, 0.005) * 0.5
add(music, 18.5, filt(bass_hold * np.linspace(0.2, 0.7, len(bass_hold)), "low", 300), 0.5)
tail = DUR - DROP
sub_tail = (saw(55, tail) + saw(110, tail) * 0.4) * np.exp(-tt(tail) / 1.2)
add(music, DROP, filt(sub_tail, "low", 260), 0.55)

# pad with filter-opening crossfade
pad_dark = np.zeros((N, 2))
for start, end, name in SECTIONS:
	dur = end - start + 0.08
	_, notes, _ = CHORDS[name]
	for j, freq in enumerate(notes):
		voice = saw(freq, dur, -0.0015) + saw(freq, dur, 0.0015)
		fade = np.minimum(1, np.minimum(tt(dur) / 0.04, (dur - tt(dur)) / 0.04))
		add(pad_dark, start, voice * fade, 0.1, (j / max(1, len(notes) - 1)) * 1.2 - 0.6)
dark = np.stack([filt(pad_dark[:, c], "low", 900) for c in range(2)], axis=1)
bright = np.stack([filt(pad_dark[:, c], "low", 3200) for c in range(2)], axis=1)
time = np.arange(N) / SR
openness = np.clip(time / 2.5, 0, 1) ** 2 * 0.65 + np.clip((time - 12.5) / 6, 0, 1) * 0.25 + (time >= DROP) * 0.1
level = np.clip(time / 2.2, 0, 1) ** 1.5 * (1 - 0.35 * (time > 18.5) * (time < DROP)) * np.where(time >= DROP, np.exp(-(time - DROP) / 1.6) * 1.3, 1)
pad = (dark * (1 - openness)[:, None] + bright * openness[:, None]) * level[:, None]
music += pad * sidechain[:, None]
send += pad * 0.35

# arp plucks
for i in range(int((18.5 - 8.0) / 0.125)):
	at = 8.0 + i * 0.125
	arp = chord_at(at + 0.01)[2]
	freq = arp[[0, 1, 2, 3, 2, 1, 0, 2][i % 8]]
	dur = 0.22
	pluck = sum(np.sin(2 * np.pi * freq * h * tt(dur)) / h**1.4 for h in (1, 2, 3, 5)) * decay(int(dur * SR), 0.07)
	gain = 0.085 + 0.04 * (at > 12.5)
	add(music, at, pluck, gain, (i % 2) * 0.7 - 0.35)
	add(send, at, pluck, gain * 1.6)

# chord stabs on every downbeat
for start, end, name in SECTIONS[1:9]:
	_, notes, _ = CHORDS[name]
	dur = 0.35
	stab = sum(saw(freq * 2, dur, 0.002) + saw(freq * 2, dur, -0.002) for freq in notes[:3])
	stab = filt(stab * decay(int(dur * SR), 0.09), "band", [300, 3500])
	add(music, start, stab, 0.06)
	add(send, start, stab, 0.08)

# ---------------- mix ----------------
ir_len = int(1.8 * SR)
ir = rng.standard_normal((ir_len, 2)) * np.exp(-np.arange(ir_len) / SR / 0.42)[:, None]
ir = np.stack([filt(ir[:, c], "low", 5000) for c in range(2)], axis=1)
ir /= np.abs(ir).sum(axis=0).max() / 40
reverb = np.stack([fftconvolve(send[:, c], ir[:, c])[:N] for c in range(2)], axis=1)

mix = music * 0.6 + sfx * 0.85 + reverb * 0.4
mix = np.stack([filt(mix[:, c], "high", 35) for c in range(2)], axis=1)
fade = np.clip((DUR - 0.05 - time) / 0.5, 0, 1)
mix *= fade[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix *= 0.93 / np.abs(mix).max()

out = HERE / "out/soundtrack.wav"
with wave.open(str(out), "wb") as file:
	file.setnchannels(2)
	file.setsampwidth(2)
	file.setframerate(SR)
	file.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"Wrote {out}")
