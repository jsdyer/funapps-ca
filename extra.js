/* A self-contained, browser-local creative app for Fun Apps. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const palettes = {
    forest: { label: 'Forest greens', colours: ['#8af7be', '#4ed5a1', '#8ad6db'] },
    berry: { label: 'Berry skies', colours: ['#f0a2df', '#a588ea', '#74d9c5'] },
    frost: { label: 'Northern frost', colours: ['#a9f3e5', '#7abbea', '#c1abf2'] },
    sunrise: { label: 'Peach & mint', colours: ['#ffd0a3', '#f8a9bc', '#a0edca'] }
  };
  const skies = {
    midnight: { label: 'Midnight', colours: ['#152d45', '#254b5c', '#476c71'] },
    twilight: { label: 'Twilight', colours: ['#303353', '#5c5673', '#b07d87'] },
    bluehour: { label: 'Blue hour', colours: ['#1b3b64', '#3f6a86', '#81a7a6'] }
  };
  const landscapes = {
    mountains: { label: 'Mountains', art: '<path fill="#1a3542" d="M0 230 85 132l48 48 62-85 97 133 56-62 42 47 55-74 75 91v90H0z"/><path fill="#dbe9dd" opacity=".75" d="m195 95 29 40-19-8-10 7-10-7-15 4z"/><path fill="#284e53" d="M0 251c66-25 125-23 191 0 72-35 167-29 329 4v65H0z"/>' },
    forest: { label: 'Boreal forest', art: '<path fill="#274955" d="M0 224q66-37 142 0 76-36 144 0 105-38 234 3v93H0z"/><path fill="#173c3d" d="M0 253 26 192l12 27 19-49 26 67 19-38 19 38 29-79 27 75 16-36 22 49 22-59 23 49 19-55 25 60 15-38 23 47 25-73 29 70 17-45 25 50 20-44 20 49 20-39 23 46v64H0z"/>' },
    shore: { label: 'Quiet shore', art: '<path fill="#274955" d="M0 239q84-30 170-4 100-34 195-7 78-30 155 0v92H0z"/><path fill="#426e72" d="M0 251q99-12 202 1 124 15 318-3v71H0z"/><path stroke="#9ac2af" stroke-width="2" stroke-linecap="round" opacity=".7" d="M117 270h91m67 9h132m-204 13h74"/><path fill="#183b37" d="M0 283q76-20 150 37H0zm520-8q-75 5-112 45h112z"/>' }
  };
  const layouts = [
    'M-30 116C74 26 163 56 245 104s183 73 305-5',
    'M-30 52C84 139 164 111 255 67s177-25 295 57',
    'M-30 142C69 80 134 15 239 65s187 91 311 24'
  ];
  const stars = [[41,38],[78,81],[111,24],[151,58],[205,29],[258,72],[301,23],[344,51],[392,19],[442,58],[486,30],[470,111],[56,137],[131,111],[363,116],[416,95]];
  const metadata = { id: 'aurora', title: 'Northern Lights Studio', description: 'Paint a quiet northern sky, one colour at a time.', tag: 'CREATIVE PLAY', icon: '🌌', tone: 'blue' };
  const node = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  function makeSelect(labelText, options, initial, onChange) {
    const label = node('label', 'aurora-label', labelText);
    const select = node('select', 'aurora-select');
    Object.entries(options).forEach(([key, data]) => { const opt = document.createElement('option'); opt.value = key; opt.textContent = data.label; select.append(opt); });
    select.value = initial; select.addEventListener('change', () => onChange(select.value)); label.append(select); return { label, select };
  }
  function mount(root) {
    const state = { palette: 'forest', sky: 'midnight', landscape: 'mountains', stars: true, layout: 0 };
    const intro = node('div', 'aurora-intro');
    intro.append(node('p', 'fg-eyebrow', 'A LITTLE CREATIVE BREAK'), node('p', 'fg-intro', 'Make a little northern sky of your own. Choose your colours, shuffle the lights, and settle in—there’s no wrong way to make one.'));
    const preview = node('div', 'aurora-preview');
    const description = node('p', 'aurora-description');
    description.setAttribute('aria-live', 'polite');
    const controls = node('div', 'aurora-controls');
    const colour = makeSelect('Aurora colours', palettes, state.palette, v => { state.palette = v; draw(); });
    const sky = makeSelect('Sky', skies, state.sky, v => { state.sky = v; draw(); });
    const land = makeSelect('Landscape', landscapes, state.landscape, v => { state.landscape = v; draw(); });
    controls.append(colour.label, sky.label, land.label);
    const checkLabel = node('label', 'aurora-check');
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = true;
    check.addEventListener('change', () => { state.stars = check.checked; draw(); });
    checkLabel.append(check, document.createTextNode(' Add stars')); controls.append(checkLabel);
    const actions = node('div', 'aurora-actions');
    const shuffle = node('button', 'fg-button fg-button-secondary', 'Shuffle the sky'); shuffle.type = 'button';
    shuffle.addEventListener('click', () => {
      const pick = obj => { const keys = Object.keys(obj); return keys[Math.floor(Math.random() * keys.length)]; };
      state.palette = pick(palettes); state.sky = pick(skies); state.landscape = pick(landscapes); state.layout = (state.layout + 1 + Math.floor(Math.random() * (layouts.length - 1))) % layouts.length;
      colour.select.value = state.palette; sky.select.value = state.sky; land.select.value = state.landscape;
      draw();
    });
    const save = node('button', 'fg-button', 'Download artwork'); save.type = 'button';
    save.addEventListener('click', () => {
      const image = preview.querySelector('svg'); if (!image) return;
      const source = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(image);
      const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'my-northern-lights.svg'; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notice.textContent = 'Your artwork is downloading as an SVG image.';
    });
    actions.append(shuffle, save);
    const notice = node('p', 'fg-status'); notice.setAttribute('role', 'status');
    root.append(intro, preview, description, controls, actions, notice);
    function draw() {
      const p = palettes[state.palette], s = skies[state.sky], l = landscapes[state.landscape];
      const descriptionText = `${p.label} aurora in a ${s.label.toLowerCase()} sky over ${l.label.toLowerCase()}${state.stars ? ', with stars' : ''}.`;
      // SVG contents are composed exclusively from the trusted constants above.
      preview.innerHTML = `<svg xmlns="${NS}" viewBox="0 0 520 320" role="img" aria-label="${descriptionText}"><defs><linearGradient id="aurora-sky" x2="0" y2="1"><stop stop-color="${s.colours[0]}"/><stop offset=".64" stop-color="${s.colours[1]}"/><stop offset="1" stop-color="${s.colours[2]}"/></linearGradient><linearGradient id="aurora-ribbon" x2="0" y2="1"><stop stop-color="${p.colours[0]}" stop-opacity=".8"/><stop offset=".5" stop-color="${p.colours[1]}" stop-opacity=".5"/><stop offset="1" stop-color="${p.colours[2]}" stop-opacity=".03"/></linearGradient><filter id="aurora-glow" x="-30%" y="-70%" width="160%" height="240%"><feGaussianBlur stdDeviation="12"/></filter></defs><rect width="520" height="320" fill="url(#aurora-sky)"/>${state.stars ? stars.map(([x,y], i) => `<circle cx="${x}" cy="${y}" r="${i % 4 === 0 ? 1.8 : 1}" fill="#fff7dd" opacity=".85"/>`).join('') : ''}<path d="${layouts[state.layout]}" fill="none" stroke="${p.colours[0]}" stroke-width="40" opacity=".34" filter="url(#aurora-glow)"/><path d="${layouts[state.layout]}" fill="none" stroke="url(#aurora-ribbon)" stroke-width="50" opacity=".85"/><path d="${layouts[state.layout]}" fill="none" stroke="${p.colours[2]}" stroke-width="3" opacity=".55"/>${l.art}</svg>`;
      description.textContent = descriptionText;
    }
    draw();
  }
  window.FunExtra = { metadata, mount };
})();
