/* Rain Window generates its sound layers locally with Web Audio. */
(() => {
  'use strict';

  const info = {
    id: 'rain-window',
    title: 'Rain Window',
    description: 'Mix roof rain, lake waves and a crackling fire for a quiet break.',
    tag: 'SOUNDSCAPE',
    icon: '🌧️',
    category: 'explore'
  };

  const layers = [
    { name: 'Roof rain', sample: rainSample, seconds: 8 },
    { name: 'Lake waves', sample: waveSample, seconds: 12 },
    { name: 'Wood fire', sample: fireSample, seconds: 9 }
  ];
  const presets = {
    rain: { name: 'Rainy cabin', levels: [78, 0, 38] },
    shore: { name: 'At the lakeshore', levels: [24, 85, 0] },
    fire: { name: 'By the hearth', levels: [18, 0, 92] }
  };

  const noise = () => Math.random() * 2 - 1;

  function rainSample() {
    let low = 0;
    let drop = 0;
    return () => {
      const white = noise();
      low += (white - low) * .08;
      drop *= .988;
      if (Math.random() < .006) drop += .26;
      return low * .57 + white * (.08 + drop * .58);
    };
  }

  function waveSample() {
    let low = 0;
    let rumble = 0;
    return position => {
      const white = noise();
      low += (white - low) * .026;
      rumble += (low - rumble) * .004;
      const tide = .19 + .81 * ((1 + Math.sin(position * 4 * Math.PI)) / 2) ** 2;
      return (low * 1.25 + rumble * 1.3 + white * .03) * tide;
    };
  }

  function fireSample() {
    let low = 0;
    let spark = 0;
    return () => {
      const white = noise();
      low += (white - low) * .012;
      spark *= .97;
      if (Math.random() < .0014) spark = .1 + Math.random() * .6;
      return low * .85 + white * (.015 + spark);
    };
  }

  function makeTrack(context, master, layer) {
    const length = Math.floor(layer.seconds * context.sampleRate);
    const buffer = context.createBuffer(2, length, context.sampleRate);
    const blendLength = Math.floor(context.sampleRate * .12);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      const sample = layer.sample();
      for (let index = 0; index < length; index++) {
        data[index] = Math.max(-.7, Math.min(.7, sample(index / length)));
      }
      // Blend the tail into the opening so the loop does not click.
      for (let index = 0; index < blendLength; index++) {
        const fraction = index / blendLength;
        const end = length - blendLength + index;
        data[end] = data[end] * (1 - fraction) + data[index] * fraction;
      }
    }

    const source = context.createBufferSource();
    const volume = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = blendLength / context.sampleRate;
    source.connect(volume);
    volume.connect(master);
    return { source, volume };
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function selectField(title, choices, initial) {
    const label = element('label', 'rain-window-field', title);
    const select = element('select', 'rain-window-select');
    for (const [value, name] of choices) {
      const option = element('option', '', name);
      option.value = value;
      select.append(option);
    }
    select.value = initial;
    label.append(select);
    return { label, select };
  }

  function slider(title, initial) {
    const label = element('label', 'rain-window-slider');
    const heading = element('span', 'rain-window-slider-heading');
    const name = element('span', '', title);
    const reading = element('span', '', initial + '%');
    reading.setAttribute('aria-hidden', 'true');
    heading.append(name, reading);

    const input = element('input');
    input.type = 'range';
    input.min = 0;
    input.max = 100;
    input.value = initial;
    label.append(heading, input);
    return {
      label, input,
      read() {
        reading.textContent = input.value + '%';
        return Number(input.value) / 100;
      }
    };
  }

  function mount(container) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audio = null;
    let timer = null;
    let deadline = null;
    let disposed = false;

    const app = element('section', 'rain-window');
    const scene = element('div', 'rain-window-scene');
    scene.setAttribute('aria-hidden', 'true');
    scene.append(element('div', 'rain-window-weather'));
    const intro = element('p', 'fg-intro', 'Settle in by the window. Pick a mix or adjust the sounds one at a time.');

    const fields = element('div', 'rain-window-fields');
    const preset = selectField('Mix preset', [
      ...Object.entries(presets).map(([value, mix]) => [value, mix.name]),
      ['custom', 'Custom mix']
    ], 'rain');
    const sleep = selectField('Sleep timer', [
      ['0', 'Off'], ['5', '5 minutes'], ['15', '15 minutes'], ['30', '30 minutes']
    ], '0');
    fields.append(preset.label, sleep.label);

    const mixer = element('fieldset', 'rain-window-mixer');
    mixer.append(element('legend', '', 'Sound layers'));
    const sliders = layers.map((layer, index) => slider(layer.name, presets.rain.levels[index]));
    for (const item of sliders) mixer.append(item.label);
    const master = slider('Overall volume', 42);
    master.label.classList.add('rain-window-master');

    const actions = element('div', 'fg-actions rain-window-actions');
    const play = element('button', 'fg-button', 'Start sound');
    play.type = 'button';
    play.disabled = !AudioContext;
    const notice = element('p', 'fg-status', AudioContext ? '' : 'Sound mixing is unavailable in this browser.');
    notice.setAttribute('role', 'status');
    actions.append(play, notice);
    app.append(scene, intro, fields, mixer, master.label, actions);
    container.append(app);

    function applyLevels() {
      const levels = sliders.map(item => item.read());
      // A conservative gain ceiling leaves room for all three layers together.
      const overall = master.read() * .46;
      if (!audio) return;
      const time = audio.context.currentTime;
      for (const [index, track] of audio.tracks.entries()) {
        track.volume.gain.setTargetAtTime(levels[index], time, .06);
      }
      audio.master.gain.setTargetAtTime(overall, time, .06);
    }

    function releaseAudio() {
      const current = audio;
      audio = null;
      clearTimeout(timer);
      timer = null;
      deadline = null;
      if (!current) return;
      for (const track of current.tracks) {
        if (track.started) track.source.stop();
        track.source.disconnect();
        track.volume.disconnect();
      }
      current.master?.disconnect();
      if (current.context.state !== 'closed') void current.context.close().catch(() => {});
    }

    function stop(message) {
      releaseAudio();
      if (disposed) return;
      play.textContent = 'Start sound';
      play.disabled = false;
      scene.classList.remove('is-playing');
      notice.textContent = message;
    }

    function expireTimer() {
      if (deadline !== null && Date.now() >= deadline) stop('The sleep timer ended. Sound stopped.');
    }

    function resetTimer() {
      clearTimeout(timer);
      timer = null;
      deadline = null;
      const minutes = Number(sleep.select.value);
      if (!minutes) {
        notice.textContent = 'Sound playing.';
        return;
      }
      const duration = minutes * 60_000;
      deadline = Date.now() + duration;
      timer = setTimeout(expireTimer, duration);
      notice.textContent = 'Sound playing. Timer set for ' + minutes + ' minutes.';
    }

    async function start() {
      play.disabled = true;
      notice.textContent = 'Starting sound…';
      let current;
      try {
        const context = new AudioContext();
        current = { context, master: null, tracks: [], playing: false };
        audio = current;
        // Request playback while the original click still has user activation.
        await context.resume();
        if (disposed || audio !== current) return;

        current.master = context.createGain();
        current.master.gain.value = 0;
        current.master.connect(context.destination);
        for (const layer of layers) current.tracks.push(makeTrack(context, current.master, layer));

        applyLevels();
        for (const track of current.tracks) {
          track.source.start();
          track.started = true;
        }
        current.playing = true;
        play.disabled = false;
        play.textContent = 'Stop sound';
        scene.classList.add('is-playing');
        resetTimer();
      } catch {
        if (!disposed && (!current || audio === current)) stop('Sound could not start. Try starting it again.');
      }
    }

    play.addEventListener('click', () => {
      if (audio?.playing) stop('Sound stopped.');
      else if (!audio) void start();
    });
    for (const item of sliders) {
      item.input.addEventListener('input', () => {
        preset.select.value = 'custom';
        applyLevels();
      });
    }
    master.input.addEventListener('input', applyLevels);
    preset.select.addEventListener('change', () => {
      const mix = presets[preset.select.value];
      if (!mix) return;
      sliders.forEach((item, index) => { item.input.value = mix.levels[index]; });
      applyLevels();
    });
    sleep.select.addEventListener('change', () => {
      if (audio?.playing) resetTimer();
    });
    document.addEventListener('visibilitychange', expireTimer);

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', expireTimer);
      releaseAudio();
    };
  }

  window.RainWindow = { info, mount };
})();
