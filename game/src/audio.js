// Sound for Ridge Runner, synthesized live with WebAudio: no audio files,
// no network, nothing to load. The engine hums with the throttle, the wind
// rises with speed, a ring chimes, a crash thuds. It starts only after the
// first user gesture, as browsers require, and M mutes it.
export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    engine: null,
    engineGain: null,
    wind: null,
    windGain: null,
    muted: false,
    started: false,
  };

  audio.ensure = () => {
    if (audio.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);

      // Engine: two detuned sawtooths through a low-pass filter.
      audio.engine = audio.ctx.createOscillator();
      audio.engine.type = 'sawtooth';
      audio.engine.frequency.value = 70;
      const engine2 = audio.ctx.createOscillator();
      engine2.type = 'sawtooth';
      engine2.frequency.value = 71.5;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0.0;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      audio.engine.connect(filter);
      engine2.connect(filter);
      filter.connect(audio.engineGain);
      audio.engineGain.connect(audio.master);
      audio.engine.start();
      engine2.start();
      audio.engine2 = engine2;

      // Wind: looped filtered noise, built once from a buffer.
      const len = audio.ctx.sampleRate * 2;
      const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const noise = audio.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const windFilter = audio.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 700;
      windFilter.Q.value = 0.6;
      audio.windGain = audio.ctx.createGain();
      audio.windGain.gain.value = 0.0;
      noise.connect(windFilter);
      windFilter.connect(audio.windGain);
      audio.windGain.connect(audio.master);
      noise.start();
      audio.wind = noise;

      audio.started = true;
    } catch {
      // No audio is a playable game; silence is a graceful failure.
      audio.started = false;
    }
  };

  // Called every frame with the plane's state; the hum follows the throttle.
  audio.update = (plane) => {
    if (!audio.started || audio.muted) return;
    const t = plane.throttle;
    audio.engine.frequency.value = 55 + t * 75 + plane.speed * 0.25;
    audio.engine2.frequency.value = 56.5 + t * 75 + plane.speed * 0.25;
    audio.engineGain.gain.value = 0.05 + t * 0.075;
    audio.windGain.gain.value = Math.max(0, (plane.speed - 25) / 90) * 0.11;
  };

  audio.setMuted = (muted) => {
    audio.muted = muted;
    if (audio.master) audio.master.gain.value = muted ? 0 : 0.5;
  };

  // A short chime: two sine notes, the second a fifth above the first.
  audio.chime = (centred) => {
    if (!audio.started || audio.muted) return;
    const notes = centred ? [880, 1318.5, 1760] : [659.25, 987.77];
    notes.forEach((freq, i) => {
      const osc = audio.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = audio.ctx.createGain();
      const start = audio.ctx.currentTime + i * 0.07;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      osc.connect(gain);
      gain.connect(audio.master);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  };

  // A crash: a low thud that falls away.
  audio.thud = () => {
    if (!audio.started || audio.muted) return;
    const osc = audio.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, audio.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(28, audio.ctx.currentTime + 0.4);
    const gain = audio.ctx.createGain();
    gain.gain.setValueAtTime(0.5, audio.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start();
    osc.stop(audio.ctx.currentTime + 0.5);
  };

  return audio;
}
