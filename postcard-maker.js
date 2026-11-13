/* Browser-local postcard editor and PNG renderer. */
(() => {
  'use strict';

  const WIDTH = 1200;
  const HEIGHT = 760;
  const themes = {
    pacific: { label: 'Pacific coast', title: 'Greetings from the coast', draw: drawCoast },
    prairie: { label: 'Prairie skies', title: 'Greetings from the Prairies', draw: drawPrairie },
    lakeside: { label: 'Lakeside cabin', title: 'Greetings from the lake', draw: drawLake },
    atlantic: { label: 'Atlantic harbour', title: 'Greetings from the harbour', draw: drawHarbour }
  };
  const palettes = {
    morning: { label: 'Mint & ochre', sky: '#dce8cd', sun: '#f6d17b', far: '#80a38a', near: '#335c4b', water: '#609087', accent: '#ad4935', paper: '#f6eedc', ink: '#2a433b' },
    evening: { label: 'Peach & plum', sky: '#f3ccb5', sun: '#ffe6ac', far: '#b9828c', near: '#5e405d', water: '#9a7182', accent: '#a93f43', paper: '#f8ebdf', ink: '#483347' },
    fog: { label: 'Blue & mist', sky: '#dce9ed', sun: '#fff0c8', far: '#90aab7', near: '#38546b', water: '#6b8ea1', accent: '#a9513d', paper: '#f3f1e7', ink: '#263d50' }
  };
  const stamps = {
    maple: { label: 'Maple leaf', draw: drawMaple },
    canoe: { label: 'Canoe', draw: drawCanoe },
    beacon: { label: 'Lighthouse', draw: drawBeacon }
  };

  const info = {
    id: 'postcard-maker',
    title: 'Postcard Maker',
    description: 'Make a postcard from a favourite place, then save it as an image to share.',
    tag: 'CREATIVE TOOL',
    icon: '📮',
    category: 'explore'
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function labelledSelect(name, choices) {
    const label = element('label', 'postcard-field', name);
    const select = element('select', 'postcard-control');
    for (const [id, choice] of Object.entries(choices)) {
      const option = element('option', '', choice.label);
      option.value = id;
      select.append(option);
    }
    label.append(select);
    return { label, select };
  }

  function labelledText(name, value, maxLength, multiline = false) {
    const label = element('label', 'postcard-field', name);
    const input = element(multiline ? 'textarea' : 'input', 'postcard-control');
    input.value = value;
    input.maxLength = maxLength;
    if (multiline) input.rows = 3;
    label.append(input);
    return { label, input };
  }

  function path(ctx, colour, points) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  }

  function circle(ctx, colour, x, y, radius) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function line(ctx, colour, width, x1, y1, x2, y2) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function evergreen(ctx, colour, x, y, height) {
    const width = height * .29;
    path(ctx, colour, [[x, y - height], [x + width * .58, y - height * .58], [x + width * .3, y - height * .58],
      [x + width, y - height * .16], [x + width * .13, y - height * .16], [x + width * .13, y],
      [x - width * .13, y], [x - width * .13, y - height * .16], [x - width, y - height * .16],
      [x - width * .3, y - height * .58], [x - width * .58, y - height * .58]]);
  }

  function water(ctx, palette, horizon) {
    ctx.fillStyle = palette.water;
    ctx.fillRect(0, horizon, 552, 545 - horizon);
    ctx.globalAlpha = .6;
    for (const [x, y, length] of [[34, 30, 120], [330, 38, 160], [139, 80, 145], [380, 112, 105], [62, 157, 160], [236, 180, 190]]) {
      line(ctx, palette.paper, 3, x, horizon + y, x + length, horizon + y);
    }
    ctx.globalAlpha = 1;
  }

  function drawCoast(ctx, palette) {
    circle(ctx, palette.sun, 404, 152, 60);
    water(ctx, palette, 294);
    path(ctx, palette.far, [[0, 322], [0, 186], [83, 240], [166, 223], [235, 278], [290, 301], [328, 321]]);
    path(ctx, palette.near, [[0, 442], [0, 255], [73, 278], [142, 315], [175, 365], [244, 411]]);
    for (const [x, y, height] of [[17, 304, 111], [49, 333, 104], [83, 345, 82], [115, 363, 66], [146, 382, 45]]) {
      evergreen(ctx, palette.near, x, y, height);
    }
    path(ctx, palette.near, [[552, 413], [461, 448], [377, 498], [351, 545], [552, 545]]);
    evergreen(ctx, palette.near, 513, 488, 127);
    evergreen(ctx, palette.near, 472, 507, 92);
    evergreen(ctx, palette.near, 543, 492, 155);
  }

  function drawPrairie(ctx, palette) {
    circle(ctx, palette.sun, 132, 174, 71);
    path(ctx, palette.far, [[0, 315], [142, 277], [273, 303], [406, 265], [552, 281], [552, 545], [0, 545]]);
    path(ctx, palette.sun, [[0, 360], [166, 319], [317, 346], [444, 305], [552, 327], [552, 545], [0, 545]]);
    path(ctx, palette.near, [[0, 443], [159, 408], [325, 394], [552, 349], [552, 545], [0, 545]]);
    path(ctx, palette.far, [[245, 545], [323, 419], [384, 397], [326, 545]]);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(350, 304, 55, 54);
    ctx.fillRect(413, 278, 37, 76);
    path(ctx, palette.accent, [[341, 307], [379, 276], [416, 307]]);
    path(ctx, palette.near, [[410, 280], [432, 261], [453, 280]]);
    ctx.fillStyle = palette.paper;
    ctx.fillRect(370, 328, 17, 30);
    ctx.fillRect(426, 286, 9, 15);
    for (let index = 0; index < 8; index++) {
      const x = 17 + index * 28;
      const y = 532 - index * 3;
      line(ctx, palette.sun, 3, x, y, x - 14, y - 51);
      line(ctx, palette.sun, 3, x - 10, y - 31, x + 1, y - 47);
    }
  }

  function drawLake(ctx, palette) {
    circle(ctx, palette.sun, 287, 160, 55);
    path(ctx, palette.far, [[0, 324], [106, 168], [165, 256], [250, 148], [367, 300], [457, 189], [552, 294], [552, 370], [0, 370]]);
    path(ctx, palette.paper, [[224, 184], [250, 148], [284, 192], [254, 180], [242, 192]]);
    water(ctx, palette, 320);
    path(ctx, palette.near, [[0, 349], [103, 360], [203, 403], [198, 448], [68, 494], [0, 504]]);
    evergreen(ctx, palette.near, 36, 399, 141);
    evergreen(ctx, palette.near, 88, 398, 118);
    ctx.fillStyle = palette.accent;
    ctx.fillRect(114, 367, 64, 53);
    path(ctx, palette.ink, [[102, 371], [147, 335], [190, 371]]);
    ctx.fillStyle = palette.sun;
    ctx.fillRect(139, 384, 15, 15);
    ctx.save();
    ctx.translate(407, 430);
    ctx.scale(.72, .72);
    drawCanoe(ctx, palette.accent);
    ctx.restore();
  }

  function drawHarbour(ctx, palette) {
    circle(ctx, palette.sun, 349, 162, 61);
    water(ctx, palette, 296);
    path(ctx, palette.far, [[0, 310], [58, 259], [112, 274], [178, 249], [247, 311]]);
    path(ctx, palette.near, [[552, 310], [484, 325], [418, 374], [355, 394], [383, 437], [510, 451], [552, 435]]);
    ctx.save();
    ctx.translate(465, 278);
    ctx.scale(1.9, 1.9);
    drawBeacon(ctx, palette.paper, palette.accent);
    ctx.restore();
    path(ctx, palette.accent, [[75, 406], [178, 406], [161, 426], [97, 426]]);
    line(ctx, palette.ink, 4, 126, 405, 126, 331);
    path(ctx, palette.paper, [[121, 336], [121, 398], [83, 398]]);
    path(ctx, palette.sun, [[132, 347], [163, 398], [132, 398]]);
  }

  function drawMaple(ctx, ink) {
    path(ctx, ink, [[0, -38], [11, -17], [22, -21], [18, -5], [38, -9], [32, 8], [42, 12], [17, 26],
      [19, 32], [4, 29], [4, 41], [-4, 41], [-4, 29], [-19, 32], [-17, 26], [-42, 12], [-32, 8], [-38, -9],
      [-18, -5], [-22, -21], [-11, -17]]);
  }

  function drawCanoe(ctx, ink) {
    path(ctx, ink, [[-46, 1], [-32, 14], [31, 14], [46, 1], [36, 5], [-36, 5]]);
    line(ctx, ink, 4, -10, 15, 17, -20);
    line(ctx, ink, 8, 11, -12, 18, -21);
  }

  function drawBeacon(ctx, ink, accent = ink) {
    path(ctx, ink, [[-16, 32], [-10, -14], [10, -14], [16, 32]]);
    path(ctx, accent, [[-14, -17], [0, -31], [14, -17]]);
    ctx.fillStyle = accent;
    ctx.fillRect(-10, -10, 20, 9);
    ctx.fillRect(-5, 17, 10, 15);
    line(ctx, ink, 4, -29, -11, -21, -11);
    line(ctx, ink, 4, 21, -11, 29, -11);
  }

  function wrapText(ctx, text, maxWidth) {
    const lines = [];
    for (const paragraph of text.split('\n')) {
      let current = '';
      for (const word of paragraph.trim().split(/\s+/u)) {
        const next = current ? current + ' ' + word : word;
        if (ctx.measureText(next).width <= maxWidth) {
          current = next;
          continue;
        }
        if (current) lines.push(current);
        current = '';
        for (const character of word) {
          if (current && ctx.measureText(current + character).width > maxWidth) {
            lines.push(current);
            current = '';
          }
          current += character;
        }
      }
      lines.push(current);
    }
    return lines;
  }

  function drawMessage(ctx, message, colour) {
    const maxLines = 9;
    let fontSize = 34;
    let lines;
    do {
      ctx.font = 'italic ' + fontSize + 'px Georgia, serif';
      lines = wrapText(ctx, message, 460);
      if (lines.length <= maxLines || fontSize === 23) break;
      fontSize--;
    } while (true);
    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines) visible[maxLines - 1] += '…';
    ctx.fillStyle = colour;
    visible.forEach((lineText, index) => {
      ctx.fillText(lineText, 664, 280 + index * (fontSize + 10), 460);
    });
    return lines.length > maxLines;
  }

  function paint(ctx, data) {
    const { theme, palette, stamp, title, message, signature } = data;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = palette.far;
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, WIDTH - 36, HEIGHT - 36);

    ctx.save();
    ctx.translate(38, 38);
    ctx.beginPath();
    ctx.rect(0, 0, 552, 545);
    ctx.clip();
    ctx.fillStyle = palette.sky;
    ctx.fillRect(0, 0, 552, 545);
    theme.draw(ctx, palette);
    ctx.restore();

    ctx.fillStyle = palette.near;
    ctx.fillRect(38, 583, 552, 139);
    ctx.fillStyle = palette.paper;
    let titleSize = 42;
    let titleLines;
    do {
      ctx.font = 'italic ' + titleSize + 'px Georgia, serif';
      titleLines = wrapText(ctx, title, 476);
      if (titleLines.length <= 2 || titleSize === 18) break;
      titleSize--;
    } while (true);
    const lineHeight = titleSize + 7;
    const titleBaseline = 652 - (titleLines.length - 1) * lineHeight / 2 + titleSize * .35;
    titleLines.forEach((lineText, index) => {
      ctx.fillText(lineText, 73, titleBaseline + index * lineHeight, 476);
    });
    line(ctx, palette.far, 2, 625, 38, 625, 722);

    ctx.fillStyle = palette.ink;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('POSTCARD', 664, 96);
    line(ctx, palette.far, 2, 664, 116, 845, 116);

    ctx.save();
    ctx.translate(1074, 121);
    ctx.rotate(.09);
    ctx.fillStyle = palette.sky;
    ctx.fillRect(-64, -70, 128, 140);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-56, -62, 112, 124);
    ctx.setLineDash([]);
    stamp.draw(ctx, palette.accent);
    ctx.restore();

    const truncated = drawMessage(ctx, message, palette.ink);
    if (signature.trim()) {
      line(ctx, palette.far, 2, 664, 674, 1124, 674);
      ctx.fillStyle = palette.ink;
      ctx.font = 'italic 29px Georgia, serif';
      ctx.fillText('From ' + signature.trim(), 664, 712, 460);
    }
    return truncated;
  }

  function shuffleSelect(control) {
    const next = Math.floor(Math.random() * (control.options.length - 1)) + 1;
    control.selectedIndex = (control.selectedIndex + next) % control.options.length;
  }

  function mount(root) {
    const intro = element('p', 'fg-intro', 'Make a digital postcard with an illustrated scene, a stamp and your own note. Save it as a PNG to send to someone.');
    const canvas = element('canvas', 'postcard-canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.setAttribute('role', 'img');
    canvas.textContent = 'Postcard preview';
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      root.append(element('p', 'fg-status', 'This browser could not start the postcard editor.'));
      return;
    }

    const scene = labelledSelect('Scene', themes);
    const colour = labelledSelect('Colours', palettes);
    const stamp = labelledSelect('Stamp', stamps);
    const title = labelledText('Title', themes.pacific.title, 48);
    const message = labelledText('Message (up to 220 characters)', 'Wish you were here. I took the slow road today and stopped whenever the view asked nicely.', 220, true);
    const signature = labelledText('Sign your name', '', 32);
    const options = element('div', 'postcard-options');
    options.append(scene.label, colour.label, stamp.label);
    const textFields = element('div', 'postcard-text');
    textFields.append(title.label, message.label, signature.label);

    const actions = element('div', 'fg-actions postcard-actions');
    const download = element('button', 'fg-button', 'Download PNG');
    download.type = 'button';
    const shuffle = element('button', 'fg-button fg-button-secondary', 'Shuffle design');
    shuffle.type = 'button';
    const status = element('p', 'fg-status');
    status.setAttribute('role', 'status');
    const warning = element('p', 'postcard-warning');
    warning.setAttribute('role', 'status');
    actions.append(download, shuffle);
    root.append(intro, canvas, options, textFields, warning, actions, status);

    let currentTitle = themes[scene.select.value].title;
    let disposed = false;
    function draw() {
      const theme = themes[scene.select.value];
      const palette = palettes[colour.select.value];
      const chosenStamp = stamps[stamp.select.value];
      const shownTitle = title.input.value.trim() || theme.title;
      const trimmedMessage = message.input.value.trim();
      const trimmedSignature = signature.input.value.trim();
      const truncated = paint(ctx, { theme, palette, stamp: chosenStamp, title: shownTitle, message: trimmedMessage, signature: trimmedSignature });
      canvas.setAttribute('aria-label', [shownTitle, theme.label + ' illustration', chosenStamp.label + ' stamp', trimmedMessage, trimmedSignature && 'From ' + trimmedSignature].filter(Boolean).join('. '));
      const notice = truncated ? 'The message does not fit. Shorten it or remove a few line breaks before downloading.' : '';
      if (warning.textContent !== notice) warning.textContent = notice;
      download.disabled = truncated;
    }

    function applyDesign() {
      const nextTitle = themes[scene.select.value].title;
      if (title.input.value === currentTitle || !title.input.value.trim()) title.input.value = nextTitle;
      currentTitle = nextTitle;
      draw();
    }

    scene.select.addEventListener('change', applyDesign);
    [colour.select, stamp.select].forEach(select => select.addEventListener('change', draw));
    [title.input, message.input, signature.input].forEach(input => input.addEventListener('input', draw));
    shuffle.addEventListener('click', () => {
      [scene.select, colour.select, stamp.select].forEach(shuffleSelect);
      applyDesign();
      status.textContent = 'New design selected.';
    });

    download.addEventListener('click', () => {
      status.textContent = '';
      canvas.toBlob(blob => {
        if (disposed) return;
        if (!blob) {
          status.textContent = 'The image could not be created. Try again.';
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = element('a');
        link.href = url;
        link.download = 'my-funapps-postcard.png';
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        status.textContent = 'Postcard downloaded as a PNG.';
      }, 'image/png');
    });

    draw();
    return () => { disposed = true; };
  }

  window.PostcardMaker = { info, mount };
})();
