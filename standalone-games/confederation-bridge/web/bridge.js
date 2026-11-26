"use strict";
(() => {
  // src/game/audio.ts
  function createMixer() {
    let ctx = null;
    let master = null;
    let windGain = null;
    let engineGain = null;
    let muted = false;
    let hornCd = 0;
    function unlock() {
      if (!ctx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        ctx = new Ctor({ latencyHint: "interactive" });
        master = ctx.createGain();
        master.gain.value = 0.85;
        master.connect(ctx.destination);
        const seconds = 1;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 420;
        filter.Q.value = 0.7;
        windGain = ctx.createGain();
        windGain.gain.value = 0;
        src.connect(filter);
        filter.connect(windGain);
        windGain.connect(master);
        src.start();
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = 74;
        const osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.value = 41;
        engineGain = ctx.createGain();
        engineGain.gain.value = 0;
        osc.connect(engineGain);
        osc2.connect(engineGain);
        engineGain.connect(master);
        osc.start();
        osc2.start();
      }
      if (ctx.state === "suspended") void ctx.resume();
    }
    function blip(freq, dur, type, gain, slide = 0) {
      if (!ctx || !master || muted) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ctx.currentTime + dur);
      g.gain.setValueAtTime(1e-4, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + dur);
      osc.connect(g);
      g.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
      osc.onended = () => {
        osc.disconnect();
        g.disconnect();
      };
    }
    return {
      unlock,
      update(wind, speed, weather, playing) {
        if (!ctx || !windGain || !engineGain) return;
        if (ctx.state === "suspended") return;
        hornCd = Math.max(0, hornCd - 0.016);
        const storm = weather === "fog" || weather === "snow" || weather === "ice" ? 0.09 : 0.04;
        const targetWind = playing ? storm + Math.min(0.18, Math.abs(wind) * 0.08) : 0.02;
        windGain.gain.setTargetAtTime(muted ? 0 : targetWind, ctx.currentTime, 0.08);
        const eng = playing ? 0.018 + speed * 0.02 : 0;
        engineGain.gain.setTargetAtTime(muted ? 0 : eng, ctx.currentTime, 0.05);
      },
      scrape() {
        blip(180 + Math.random() * 40, 0.18, "sawtooth", 0.08, -90);
      },
      knock() {
        blip(90, 0.22, "square", 0.07, -40);
      },
      chime() {
        blip(520 + Math.random() * 40, 0.14, "sine", 0.06, 180);
      },
      horn() {
        if (hornCd > 0) return;
        hornCd = 1.4;
        blip(196, 0.28, "square", 0.045, -20);
      },
      setMuted(next) {
        muted = next;
        if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.03);
      }
    };
  }

  // src/game/draw.ts
  function mix(a, b, t) {
    return a + (b - a) * t;
  }
  function project(z, x, camX, km, w, h) {
    const t = Math.max(0, Math.min(1, z / 46));
    const u = Math.pow(t, 0.82);
    const sy = h * 0.9 - u * h * 0.6;
    const half = mix(w * 0.7, w * 0.05, u);
    const curve = (Math.sin(km * 1.15) * 0.55 + Math.sin(km * 0.4) * 0.2) * w * u * u * 0.22;
    const cx = w * 0.5 + curve - camX * mix(w * 0.58, w * 0.02, u);
    return { sx: cx + x * half, sy, t: u, half };
  }
  var PEEK = 0;
  function draw(ctx, sim, w, h, now) {
    PEEK = sim.phase === "title" ? 0 : sim.peek || 0;
    const camX = sim.phase === "title" ? Math.sin(now * 0.28) * 0.05 : sim.carX;
    const km = sim.phase === "title" ? 0.35 : sim.km;
    const weather = sim.weather;
    const sk = sim.reduced ? sim.trauma * 0.2 : sim.trauma * sim.trauma;
    const ox = Math.sin(now * 43) * 14 * sk;
    const oy = Math.cos(now * 31) * 8 * sk;
    ctx.save();
    ctx.translate(ox, oy);
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.42);
    const storm = weather === "snow" || weather === "ice" || weather === "fog";
    sky.addColorStop(0, storm ? "#8b969c" : "#6f8388");
    sky.addColorStop(1, storm ? "#d5dcde" : "#d7e2df");
    ctx.fillStyle = sky;
    ctx.fillRect(-40, -40, w + 80, h * 0.55);
    const hy = h * 0.3;
    const sea = ctx.createLinearGradient(0, hy, 0, h * 0.75);
    sea.addColorStop(0, storm ? "#a9b8b7" : "#2b7f83");
    sea.addColorStop(1, storm ? "#8d9d9c" : "#14535a");
    ctx.fillStyle = sea;
    ctx.fillRect(-40, hy, w + 80, h * 0.5);
    if (!storm && PEEK > 0.05) {
      ctx.strokeStyle = `rgba(240, 248, 244, ${0.45 * PEEK})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 26; i++) {
        const yy = hy + 6 + (i * 37 % 100) / 100 * h * 0.3;
        const xx = (i * 173 + now * (12 + i % 4 * 6)) % (w + 60) - 30;
        const len = 8 + (yy - hy) * 0.12;
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx + len, yy);
        ctx.stroke();
      }
      ctx.fillStyle = km > 6.45 ? "#b04a32" : "#5f7d4a";
      ctx.fillRect(-40, hy - 4, w + 80, 5);
      const lh = (w * 0.86 - camX * w * 0.1);
      ctx.fillStyle = "#f4efe4";
      ctx.fillRect(lh, hy - 22, 5, 18);
      ctx.fillStyle = "#d85a32";
      ctx.fillRect(lh - 1, hy - 25, 7, 4);
    }
    const gapL = project(40, -1, camX, km, w, h);
    const gapR = project(40, 1, camX, km, w, h);
    const water = ctx.createLinearGradient(0, h * 0.16, 0, gapL.sy + 8);
    water.addColorStop(0, storm ? "#9eb0b0" : "#1f6f74");
    water.addColorStop(1, storm ? "#c5d0cf" : "#7ec3bb");
    ctx.fillStyle = water;
    ctx.globalAlpha = Math.max(0, 1 - PEEK * 1.6);
    ctx.fillRect(gapL.sx, h * 0.16, Math.max(8, gapR.sx - gapL.sx), gapL.sy - h * 0.16 + 10);
    ctx.globalAlpha = 1;
    if (km > 11.1) {
      ctx.fillStyle = "#b04a32";
      ctx.fillRect(w * 0.46, h * 0.18, w * 0.08, 10);
    }
    const slices = 18;
    for (let i = slices; i >= 1; i--) {
      const z0 = i / slices * 44 + 1.2;
      const z1 = (i - 1) / slices * 44 + 1.2;
      const alt = i % 2 === 0;
      road(ctx, z0, z1, camX, km, w, h, alt);
      wall(ctx, z0, z1, -1, camX, km, w, h, alt, i);
      wall(ctx, z0, z1, 1, camX, km, w, h, alt, i);
    }
    const things = [...sim.entities].filter((e) => e.z > 1 && e.z < 46).sort((a, b) => b.z - a.z);
    for (const e of things) {
      if ((weather === "fog" || weather === "snow") && e.z > 24) continue;
      if (e.kind === "ice") ice(ctx, e.x, e.z, e.w, camX, km, w, h);
      else if (e.kind === "glimpse" && !e.hit) glimpse(ctx, e.x, e.z, e.label, camX, km, w, h, now);
      else if (e.kind === "truck") truck(ctx, e.x, e.z, e.flavor, camX, km, w, h);
    }
    for (const s of sim.sparks) {
      const p = project(s.z, s.x, camX, km, w, h);
      ctx.fillStyle = `rgba(244, 239, 228, ${Math.max(0, s.life)})`;
      ctx.fillRect(p.sx, p.sy, 4, 3);
    }
    if ((weather === "snow" || weather === "ice") && !sim.reduced) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 40; i++) {
        const fx = (i * 91 + now * (30 + i % 6 * 16)) % (w + 30) - 10;
        const fy = (i * 47 + now * (70 + i % 5 * 22)) % (h * 0.78);
        ctx.fillRect(fx, fy, 2, 2);
      }
    }
    if (weather === "fog" || weather === "snow") {
      const fog = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.72);
      fog.addColorStop(0, "rgba(220,226,226,0)");
      fog.addColorStop(0.5, weather === "fog" ? "rgba(214,220,218,0.55)" : "rgba(236,240,242,0.28)");
      fog.addColorStop(1, "rgba(214,220,218,0)");
      ctx.fillStyle = fog;
      ctx.fillRect(-20, 0, w + 40, h);
    }
    hood(ctx, w, h, sim.yaw, now, sim.speed);
    ctx.restore();
    if (sim.phase === "play" && sim.nerves > 68) {
      ctx.fillStyle = `rgba(216, 90, 50, ${Math.min(0.28, (sim.nerves - 68) / 180)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
  function road(ctx, z0, z1, camX, km, w, h, alt) {
    const a = project(z0, -1, camX, km, w, h);
    const b = project(z0, 1, camX, km, w, h);
    const c = project(z1, 1, camX, km, w, h);
    const d = project(z1, -1, camX, km, w, h);
    const shade = alt ? 86 : 74;
    const k = 0.55 + (1 - a.t) * 0.45;
    const g = Math.round(shade * k);
    ctx.fillStyle = `rgb(${g + 8},${g + 8},${g + 6})`;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.lineTo(c.sx, c.sy);
    ctx.lineTo(d.sx, d.sy);
    ctx.closePath();
    ctx.fill();
    const edge = (x) => {
      const p0 = project(z0, x, camX, km, w, h);
      const p1 = project(z1, x, camX, km, w, h);
      ctx.beginPath();
      ctx.moveTo(p0.sx, p0.sy);
      ctx.lineTo(p1.sx, p1.sy);
      ctx.stroke();
    };
    ctx.strokeStyle = "rgba(214, 206, 176, 0.55)";
    ctx.lineWidth = Math.max(1, (1 - a.t) * 3);
    edge(-0.86);
    edge(0.86);
  }
  function wall(ctx, z0, z1, side, camX, km, w, h, alt, index) {
    const b0 = project(z0, side, camX, km, w, h);
    const b1 = project(z1, side, camX, km, w, h);
    const ratio = mix(1.55, 0.72, PEEK);
    const height = (p) => Math.max(4, (p.sy - h * 0.3) * ratio + h * 0.15 * p.t * (1 - PEEK));
    const top0 = b0.sy - height(b0);
    const top1 = b1.sy - height(b1);
    const k = 0.62 + (1 - b0.t) * 0.4;
    const base = alt ? 158 : 142;
    const c = Math.round(base * k);
    ctx.fillStyle = `rgb(${c},${c + 2},${c - 6})`;
    ctx.beginPath();
    ctx.moveTo(b0.sx, b0.sy);
    ctx.lineTo(b1.sx, b1.sy);
    ctx.lineTo(b1.sx, top1);
    ctx.lineTo(b0.sx, top0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgb(${Math.round(c * 0.86)},${Math.round(c * 0.88)},${Math.round(c * 0.8)})`;
    const cap = Math.max(3, (1 - b1.t) * 14);
    ctx.beginPath();
    ctx.moveTo(b0.sx, top0);
    ctx.lineTo(b1.sx, top1);
    ctx.lineTo(b1.sx + side * cap, top1 - cap * 0.3);
    ctx.lineTo(b0.sx + side * cap * 0.4, top0 - cap * 0.15);
    ctx.closePath();
    ctx.fill();
    if (index % 3 === 0) {
      const mid = project((z0 + z1) / 2, side, camX, km, w, h);
      const s = Math.max(3, (1 - mid.t) * 10);
      ctx.fillStyle = "#e07a4a";
      ctx.fillRect(mid.sx - s / 2, mid.sy - height(mid) * 0.28, s, s * 0.55);
    }
    ctx.fillStyle = "rgba(20, 28, 25, 0.18)";
    ctx.fillRect(Math.min(b0.sx, b1.sx), Math.min(top0, top1), Math.abs(b1.sx - b0.sx), 2);
  }
  function truck(ctx, x, z, flavor, camX, km, w, h) {
    const half = 0.34;
    const rear = project(z, x, camX, km, w, h);
    const nose = project(Math.max(1.1, z - 5.2), x, camX, km, w, h);
    const rw = rear.half * half;
    const nw = nose.half * half;
    const rh = mix(h * 0.34, h * 0.05, rear.t);
    const nh = mix(h * 0.34, h * 0.05, nose.t);
    const body = flavor.includes("potato") ? "#c4552a" : flavor.includes("reefer") ? "#e7eee6" : flavor.includes("tandem") ? "#24302b" : "#31404a";
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(rear.sx - rw, rear.sy);
    ctx.lineTo(nose.sx - nw, nose.sy);
    ctx.lineTo(nose.sx - nw, nose.sy - nh);
    ctx.lineTo(rear.sx - rw, rear.sy - rh);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(rear.sx + rw, rear.sy);
    ctx.lineTo(nose.sx + nw, nose.sy);
    ctx.lineTo(nose.sx + nw, nose.sy - nh);
    ctx.lineTo(rear.sx + rw, rear.sy - rh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = flavor.includes("reefer") ? "#c5d0c6" : "#141c19";
    ctx.beginPath();
    ctx.moveTo(rear.sx - rw, rear.sy);
    ctx.lineTo(rear.sx + rw, rear.sy);
    ctx.lineTo(rear.sx + rw, rear.sy - rh);
    ctx.lineTo(rear.sx - rw, rear.sy - rh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(190, 224, 220, 0.7)";
    ctx.fillRect(nose.sx - nw * 0.82, nose.sy - nh, nw * 1.64, nh * 0.28);
    ctx.fillStyle = "#1c2420";
    ctx.fillRect(rear.sx - rw, rear.sy - 4, rw * 2, 4);
  }
  function glimpse(ctx, x, z, label, camX, km, w, h, now) {
    const p = project(z, x, camX, km, w, h);
    const pulse = 0.65 + Math.sin(now * 5 + z) * 0.35;
    const rw = Math.max(10, p.half * 0.16);
    const rh = mix(h * 0.16, h * 0.035, p.t);
    ctx.save();
    ctx.translate(p.sx, p.sy - rh);
    ctx.fillStyle = `rgba(47, 143, 138, ${0.35 * pulse})`;
    ctx.beginPath();
    ctx.ellipse(0, rh * 0.2, rw * 1.3, rh * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4efe4";
    ctx.fillRect(-rw * 0.22, -rh * 0.15, rw * 0.44, rh);
    ctx.fillStyle = "#14756f";
    ctx.fillRect(-rw * 0.08, -rh * 0.05, rw * 0.16, rh * 0.8);
    if (z < 20) {
      ctx.font = `650 ${Math.max(11, rw * 0.85)}px Outfit, sans-serif`;
      ctx.fillStyle = "#1c2420";
      ctx.textAlign = "center";
      ctx.fillText(label, 0, -rh * 0.28);
    }
    ctx.restore();
  }
  function ice(ctx, x, z, width, camX, km, w, h) {
    const a = project(z, x - width, camX, km, w, h);
    const b = project(z, x + width, camX, km, w, h);
    const c = project(Math.max(1, z - 7), x + width, camX, km, w, h);
    const d = project(Math.max(1, z - 7), x - width, camX, km, w, h);
    ctx.fillStyle = "rgba(210, 236, 238, 0.62)";
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.lineTo(c.sx, c.sy);
    ctx.lineTo(d.sx, d.sy);
    ctx.closePath();
    ctx.fill();
  }
  function hood(ctx, w, h, yaw, now, speed) {
    ctx.save();
    ctx.translate(w * 0.5, h * 1.01);
    ctx.rotate(-yaw * 0.22);
    ctx.translate(0, Math.sin(now * (5 + speed * 3)) * (1 + speed));
    ctx.fillStyle = "#121a17";
    ctx.beginPath();
    ctx.moveTo(-w * 0.62, 0);
    ctx.lineTo(-w * 0.2, -h * 0.15);
    ctx.lineTo(w * 0.2, -h * 0.15);
    ctx.lineTo(w * 0.62, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2f6f68";
    ctx.fillRect(-w * 0.15, -h * 0.132, w * 0.3, h * 0.028);
    ctx.fillStyle = "#d85a32";
    ctx.fillRect(w * 0.02, -h * 0.126, w * 0.07, h * 0.016);
    ctx.fillStyle = "#f4efe4";
    ctx.font = `650 ${Math.max(10, w * 0.011)}px Outfit, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("TOLL: LATER", w * 0.055, -h * 0.114);
    ctx.restore();
    ctx.fillStyle = "#101614";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.28);
    ctx.lineTo(0, h);
    ctx.lineTo(w * 0.11, h);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w, h * 0.28);
    ctx.lineTo(w, h);
    ctx.lineTo(w * 0.89, h);
    ctx.closePath();
    ctx.fill();
  }

  // src/game/sim.ts
  var SPAN_KM = 12.9;
  var LINES = [
    "Good morning. You're on the Confederation Bridge, where the brochure used a drone.",
    "If you wanted a view, you should have brought a ladder.",
    "Ocean sold separately. Concrete included.",
    "The shoulder is a theoretical concept.",
    "PEI is allegedly at the end of this hallway.",
    "New Brunswick called. They can't see the water either.",
    "Wind: personal. Lane: a suggestion.",
    "Guardrail height: ambitious. Vacation photos: grey.",
    "Someone spent the scenery budget on another metre of concrete.",
    "The guardrail has a better view than you do.",
    "A truck is not a landmark. It is, however, the landmark.",
    "Twelve point nine kilometres. Feels longer in a squall.",
    "No toll yet. They bill you on the way off the Island.",
    "The Strait is right there. The wall would like a word.",
    "Stay between the concrete opinions.",
    "Winter lives on this bridge. You are visiting.",
    "Remember the ferry? You could see the water from the ferry.",
    "No passing for 12.9 km. Get comfortable with that mudflap.",
    "Getting onto the Island is free. Leaving is where they get you.",
    "Sit up straight. Higher. No, higher. Still concrete.",
    "Fun fact: the best view of this bridge is from Cape Jourimain.",
    "Your passenger says it's beautiful out there. Your passenger is guessing.",
    "Somewhere beyond this wall, a lobster boat is having a lovely time.",
    "High-wind advisory: high-sided vehicles restricted. You're low-sided. Lucky you.",
    "Eleven thousand metres of guardrail, and every one of them is in your eyeline.",
    "Mainlanders call it scenic. Islanders call it Tuesday."
  ];
  var PEEK_LINES = [
    "You sat up for a peek. The Strait says hi. The lane says eyes front.",
    "Peeking. Steering is now more of a hope.",
    "Ooh, water. Big, blue, finally. Mind the wall.",
    "You can see it. You can also see the wall coming.",
    "That's the Northumberland Strait. Say goodbye, it's leaving."
  ];
  var FOG_PEEK = [
    "You peeked into fog. It's beige all the way down.",
    "Sat up for the view. The view is out sick.",
    "Peeked over the wall. Found more weather."
  ];
  function weatherAt(km) {
    if (km < 2.4) return "clear";
    if (km < 4.8) return "wind";
    if (km < 7.4) return "fog";
    if (km < 10.3) return "snow";
    return "ice";
  }
  function weatherLabel(w) {
    switch (w) {
      case "clear":
        return "Clear-ish";
      case "wind":
        return "Personal wind";
      case "fog":
        return "Fog, allegedly";
      case "snow":
        return "Snow in the hallway";
      case "ice":
        return "Ice, the local hobby";
    }
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function createSim(seed = Date.now()) {
    return {
      phase: "title",
      result: null,
      km: 0,
      speed: 0,
      carX: 0,
      carV: 0,
      yaw: 0,
      nerves: 10,
      glimpses: 0,
      peek: 0,
      straitSecs: 0,
      peekLineCd: 0,
      humpSaid: false,
      scrapes: 0,
      knocks: 0,
      nears: 0,
      streak: 0,
      wind: 0,
      weather: "clear",
      viewWord: "CONCRETE",
      line: LINES[0],
      lineT: 0,
      trauma: 0,
      scrapeCd: 0,
      spawnIn: 1.15,
      gustIn: 2.2,
      gustAge: 99,
      gustDir: 1,
      gustPower: 0,
      entities: [],
      sparks: [],
      popups: [],
      nextId: 1,
      elapsed: 0,
      reduced: false,
      rng: mulberry32(seed)
    };
  }
  function tally(sim) {
    const finish = sim.result === "arrived" ? 500 : 0;
    const raw = sim.glimpses * 125 + Math.floor(sim.straitSecs * 60) + sim.nears * 45 + Math.floor(sim.km * 22) - sim.scrapes * 30 - sim.knocks * 20 + finish;
    return Math.max(0, raw);
  }
  function say(sim, line) {
    sim.line = line;
    sim.lineT = 0;
  }
  function pop(sim, text) {
    sim.popups.push({ text, life: 1.35 });
    if (sim.popups.length > 4) sim.popups.shift();
  }
  function spawn(sim, kind, x, z, flavor, label, w) {
    sim.entities.push({
      id: sim.nextId++,
      kind,
      flavor,
      label,
      x,
      z,
      w,
      hit: false,
      passed: false,
      closest: 99
    });
  }
  var GLIMPSES = [
    { flavor: "a sliver of the Strait", label: "STRAIT" },
    { flavor: "a gull doing reconnaissance", label: "GULL" },
    { flavor: "red dirt on the horizon", label: "RED DIRT" },
    { flavor: "a light that might be a lighthouse", label: "LIGHT" },
    { flavor: "someone's drone, rubbing it in", label: "DRONE" }
  ];
  var TRUCKS = ["a reefer with opinions", "a tandem load of nothing scenic", "a wall on wheels", "a potato hauler, ironically"];
  function trySpawn(sim) {
    const rng = sim.rng;
    const trucks = sim.entities.filter((e) => e.kind === "truck" && e.z > 0);
    const late = sim.km > SPAN_KM - 0.55;
    const truckChance = sim.weather === "clear" ? 0.38 : sim.weather === "fog" || sim.weather === "ice" ? 0.62 : 0.52;
    if (!late && trucks.length < 2 && rng() < truckChance) {
      const side2 = rng() < 0.5 ? -1 : 1;
      const x2 = side2 * (0.08 + rng() * 0.12);
      const crowded = trucks.some((t) => Math.abs(t.z - 48) < 16 && Math.sign(t.x) === Math.sign(x2));
      if (!crowded) {
        const flavor = TRUCKS[Math.floor(rng() * TRUCKS.length)];
        spawn(sim, "truck", x2, 50 + rng() * 6, flavor, "TRUCK", 0.4);
        return;
      }
    }
    if (sim.weather === "ice" || sim.weather === "snow") {
      if (rng() < 0.45) {
        spawn(sim, "ice", (rng() - 0.5) * 0.4, 46, "ice the colour of a bad decision", "ICE", 0.55);
        return;
      }
    }
    const g = GLIMPSES[Math.floor(rng() * GLIMPSES.length)];
    const side = rng() < 0.5 ? -1 : 1;
    const x = side * (0.58 + rng() * 0.16);
    spawn(sim, "glimpse", x, 42 + rng() * 8, g.flavor, g.label, 0.22);
  }
  function step(sim, input, dt) {
    if (sim.phase !== "play") return;
    sim.elapsed += dt;
    sim.lineT += dt;
    sim.scrapeCd = Math.max(0, sim.scrapeCd - dt);
    sim.trauma = Math.max(0, sim.trauma - dt * 1.4);
    for (const p of sim.popups) p.life -= dt;
    sim.popups = sim.popups.filter((p) => p.life > 0);
    for (const s of sim.sparks) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.z += s.vz * dt;
    }
    sim.sparks = sim.sparks.filter((s) => s.life > 0);
    sim.weather = weatherAt(sim.km);
    sim.peekLineCd = Math.max(0, sim.peekLineCd - dt);
    const peekTarget = input.peek ? 1 : 0;
    sim.peek += (peekTarget - sim.peek) * (1 - Math.exp(-(input.peek ? 6 : 9) * dt));
    const hump = sim.km > 6.1 && sim.km < 6.8;
    if (hump && !sim.humpSaid) {
      sim.humpSaid = true;
      say(sim, "The hump! Highest point on the bridge, built so ships fit underneath. Sit up \u2014 double view points.");
      pop(sim, "THE HUMP");
    }
    if (sim.peek > 0.6) {
      const murky = sim.weather === "fog" || sim.weather === "snow";
      const blocked = sim.entities.some((e) => e.kind === "truck" && e.z > 0 && e.z < 9 && Math.abs(sim.carX - e.x) < 0.5);
      const rate = blocked ? 0.15 : murky ? 0.3 : 1;
      sim.straitSecs += dt * rate * (hump ? 2 : 1);
      sim.nerves += 5.5 * dt;
      if (sim.peekLineCd <= 0) {
        sim.peekLineCd = 7;
        const pool = blocked ? ["You sat up to see the ocean. You saw a trailer door. Up close."] : murky ? FOG_PEEK : PEEK_LINES;
        say(sim, pool[Math.floor(sim.rng() * pool.length)]);
      }
    }
    const target = input.brake ? 0.62 : input.boost ? 1.22 : 1;
    sim.speed += (target - sim.speed) * (1 - Math.exp(-3.2 * dt));
    let wind = 0;
    if (sim.weather === "wind" || sim.weather === "snow" || sim.weather === "ice") {
      sim.gustIn -= dt;
      sim.gustAge += dt;
      if (sim.gustIn <= 0) {
        sim.gustDir = sim.rng() < 0.5 ? -1 : 1;
        sim.gustPower = 0.85 + sim.rng() * 0.7;
        sim.gustIn = sim.weather === "ice" ? 1.7 + sim.rng() * 1.3 : 2.3 + sim.rng() * 1.8;
        sim.gustAge = 0;
        say(sim, sim.gustDir < 0 ? "Gust from the Strait \u2014 it's shoving you at the wall." : "Gust from the Strait \u2014 other wall, same hobby.");
      }
      if (sim.gustAge > 0.48 && sim.gustAge < 1.05) {
        const u = Math.sin((sim.gustAge - 0.48) / 0.57 * Math.PI);
        wind = sim.gustDir * sim.gustPower * 2.15 * u;
      }
    } else {
      sim.gustAge = 99;
    }
    sim.wind = wind;
    const onIce = sim.entities.some(
      (e) => e.kind === "ice" && e.z < 9 && e.z > -1 && Math.abs(sim.carX - e.x) < e.w
    );
    const grip = onIce ? 1.25 : 5.4;
    const steer = Math.max(-1, Math.min(1, input.steer)) * (1 - sim.peek * 0.55);
    sim.carV += (-steer * 3.05 - sim.carV * grip) * dt + wind * (1 + sim.peek * 0.5) * dt;
    if (sim.peek > 0.3) sim.carV += Math.sin(sim.elapsed * 1.7) * 0.35 * sim.peek * dt;
    if (onIce) sim.carV += wind * 0.65 * dt;
    sim.carX += sim.carV * dt;
    sim.carX = Math.max(-1.08, Math.min(1.08, sim.carX));
    const speedFactor = Math.max(0.35, sim.speed);
    sim.yaw += steer * 2.55 * speedFactor * dt;
    sim.yaw *= Math.exp(-1.15 * dt);
    sim.yaw = Math.max(-0.7, Math.min(0.7, sim.yaw));
    const scroll = 19.5 * sim.speed * dt;
    sim.km = Math.min(SPAN_KM, sim.km + SPAN_KM / 80 * sim.speed * dt);
    for (const e of sim.entities) e.z -= scroll;
    if (Math.abs(sim.carX) > 0.83 && sim.scrapeCd <= 0) {
      sim.scrapes += 1;
      sim.streak = 0;
      sim.nerves = Math.min(100, sim.nerves + 15);
      sim.trauma = Math.min(1, sim.trauma + (sim.reduced ? 0.2 : 0.48));
      sim.scrapeCd = 0.9;
      sim.carV = -Math.sign(sim.carX || 1) * 0.95;
      sim.speed = Math.max(0.7, sim.speed * 0.86);
      say(sim, "Shoulder? That was a painted wish. The concrete is real.");
      pop(sim, "SCRAPE");
      for (let i = 0; i < 7; i++) {
        sim.sparks.push({
          x: sim.carX,
          z: 3 + sim.rng() * 2,
          vx: -Math.sign(sim.carX) * (0.4 + sim.rng()),
          vz: 2 + sim.rng() * 4,
          life: 0.45 + sim.rng() * 0.3
        });
      }
    }
    let view = "CONCRETE";
    let viewRank = 0;
    for (const e of sim.entities) {
      if (e.kind === "truck" && e.z > -2 && e.z < 26) {
        const align = 1 - Math.min(1, Math.abs(sim.carX - e.x) / 0.55);
        if (align > 0.35 && e.z < 20) {
          view = "TRAILER";
          viewRank = 2;
        }
        if (!e.hit && e.z < 6.4 && e.z > -0.4 && Math.abs(sim.carX - e.x) < e.w) {
          e.hit = true;
          sim.knocks += 1;
          sim.streak = 0;
          sim.nerves = Math.min(100, sim.nerves + 20);
          sim.trauma = Math.min(1, sim.trauma + (sim.reduced ? 0.25 : 0.62));
          sim.speed = Math.max(0.64, sim.speed * 0.72);
          const away = Math.sign(sim.carX - e.x) || (sim.rng() < 0.5 ? -1 : 1);
          sim.carV = away * 1.15;
          say(sim, `You kissed ${e.flavor}. The hallway kissed back.`);
          pop(sim, "TOO CLOSE");
        }
        if (!e.passed && e.z < 0) {
          e.passed = true;
          if (!e.hit && e.closest < 0.62) {
            sim.nears += 1;
            sim.nerves = Math.max(0, sim.nerves - 4);
            pop(sim, "THREADED");
            say(sim, "Threaded it. The shoulder filed a complaint anyway.");
          }
        }
        if (!e.passed) e.closest = Math.min(e.closest, Math.abs(sim.carX - e.x));
        if (e.z > 0 && e.z < 22) {
          const close = 1 - e.z / 22;
          sim.nerves += Math.max(0, align) * close * 14 * dt;
        }
      }
      if (e.kind === "glimpse" && !e.hit && e.z < 5.6 && e.z > -0.6 && Math.abs(sim.carX - e.x) < 0.26) {
        e.hit = true;
        sim.glimpses += 1;
        sim.streak += 1;
        sim.nerves = Math.max(0, sim.nerves - 13);
        pop(sim, e.label);
        say(
          sim,
          sim.streak >= 3 ? `${sim.streak} glimpses in a row. The ocean is persistent. The wall is too.` : `You caught ${e.flavor}. Don't get used to it.`
        );
      }
      if (e.kind === "glimpse" && !e.hit && e.z < 16 && e.z > 0 && viewRank < 2) {
        view = e.label;
        viewRank = 1;
      }
    }
    if (sim.peek > 0.6 && viewRank < 2) view = sim.weather === "fog" || sim.weather === "snow" ? "BEIGE" : "THE STRAIT!";
    sim.viewWord = view;
    sim.nerves += Math.abs(wind) * 4.2 * dt;
    if (onIce) sim.nerves += 3.5 * dt;
    const calm = sim.weather === "clear" ? 8 : sim.weather === "wind" ? 14 : 18;
    sim.nerves += (calm - sim.nerves) * (1 - Math.exp(-0.28 * dt));
    sim.nerves = Math.max(0, Math.min(100, sim.nerves));
    sim.entities = sim.entities.filter((e) => e.z > -8);
    sim.spawnIn -= dt;
    if (sim.spawnIn <= 0) {
      const base = sim.weather === "clear" ? 2.15 : sim.weather === "fog" ? 1.7 : 1.55;
      sim.spawnIn = base + sim.rng() * 0.7;
      trySpawn(sim);
    }
    if (sim.lineT > 5.4) {
      const next = LINES[Math.floor(sim.rng() * LINES.length)];
      say(sim, next);
    }
    if (sim.nerves >= 100) {
      sim.phase = "over";
      sim.result = "nerves";
      sim.speed = 0;
      say(sim, "You pulled into a shoulder that is mostly a rumour. A truck honks, sympathetically.");
      return;
    }
    if (sim.km >= SPAN_KM - 1e-3) {
      sim.km = SPAN_KM;
      sim.phase = "over";
      sim.result = "arrived";
      sim.speed = 0;
      sim.viewWord = "ISLAND";
      say(sim, "Welcome to PEI. The Island has views. The bridge kept its own. Toll's on the way back.");
    }
  }

  // src/game/mount.ts
  var BEST_KEY = "funapps-hemmed-in-best";
  function readBest() {
    try {
      const n = Number(localStorage.getItem(BEST_KEY) || 0);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }
  function writeBest(n) {
    try {
      localStorage.setItem(BEST_KEY, String(n));
    } catch {
    }
  }
  function mountGame(root2) {
    root2.innerHTML = `
    <div class="booth">
      <canvas aria-hidden="true"></canvas>
      <header class="hud">
        <div class="ticket-chip">
          <span class="kicker">Crossing</span>
          <div class="figure" data-km>0.0 km</div>
          <div class="sub" data-weather>Toll booth</div>
        </div>
        <div class="ticket-chip center">
          <span class="kicker">White knuckles</span>
          <div class="nerves" aria-hidden="true"><span data-nerves></span></div>
          <div class="sub" data-view>View: concrete</div>
        </div>
        <div class="ticket-chip right">
          <span class="kicker">Glimpses</span>
          <div class="figure" data-glimpses>0</div>
          <div class="sub" data-strait>Strait seen: 0.0s</div>
          <button type="button" class="icon-btn" data-mute>Sound on</button>
        </div>
      </header>
      <p class="radio"><strong data-band>Bridge radio</strong><span data-line>Free to get on. Scenery not included.</span></p>
      <div class="wheel" aria-label="Steering">
        <button type="button" data-hold="left">Left</button>
        <button type="button" class="brake" data-hold="brake">Ease off</button>
        <button type="button" class="peek" data-hold="peek">Sit up</button>
        <button type="button" data-hold="right">Right</button>
      </div>
      <div class="overlay" data-overlay>
        <article class="ticket">
          <div class="stamp">TOLL: LATER</div>
          <p class="where">New Brunswick \u2192 Prince Edward Island</p>
          <h1>Hemmed In</h1>
          <p class="lede">12.9 kilometres of Confederation Bridge. One lane each way. Concrete tall enough to edit the ocean out of the trip.</p>
          <p class="fine">The shoulder is a theory. The trucks are not. Hold <strong>Space</strong> (or <strong>Sit up</strong>) to crane over the wall and actually see the Strait \u2014 but your steering goes soft while you gawk.</p>
          <div class="actions">
            <button type="button" class="primary" data-start>Start the crossing</button>
            <button type="button" class="ghost" data-how>How to miss the wall</button>
          </div>
          <ul class="help" data-help hidden>
            <li>A / \u2190 drifts left. D / \u2192 drifts right. Drag the road with a finger.</li>
            <li>The car cruises. Hold S, \u2193, or Ease off when a trailer fills the lane.</li>
            <li>Hold Space or Sit up to peek over the concrete. Every second of real ocean scores. The hump in the middle counts double.</li>
            <li>Glimpses of water sit near the concrete. Grab them if you like living nervously.</li>
            <li>Three scrapes won't end it. A full case of white knuckles will.</li>
          </ul>
        </article>
      </div>
      <div class="overlay" data-end hidden>
        <article class="ticket">
          <div class="stamp" data-end-stamp>PULLED OVER</div>
          <p class="where">Confederation Bridge</p>
          <h1 data-end-title>That's the shoulder.</h1>
          <p class="lede" data-end-copy></p>
          <p class="scoreline" data-score>0</p>
          <p class="fine" data-best></p>
          <div class="actions">
            <button type="button" class="primary" data-again>Cross again</button>
          </div>
        </article>
      </div>
    </div>
  `;
    const booth = root2.querySelector(".booth");
    const canvas = booth.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => {
    };
    const sim = createSim();
    sim.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const keys = /* @__PURE__ */ new Set();
    let injected = false;
    let holdLeft = false;
    let holdRight = false;
    let holdBrake = false;
    let holdPeek = false;
    let pointerSteer = 0;
    let pointerOn = false;
    let muted = false;
    let best = readBest();
    let hornArmed = false;
    const mixer = createMixer();
    const el = {
      km: booth.querySelector("[data-km]"),
      weather: booth.querySelector("[data-weather]"),
      nerves: booth.querySelector("[data-nerves]"),
      view: booth.querySelector("[data-view]"),
      glimpses: booth.querySelector("[data-glimpses]"),
      strait: booth.querySelector("[data-strait]"),
      line: booth.querySelector("[data-line]"),
      band: booth.querySelector("[data-band]"),
      overlay: booth.querySelector("[data-overlay]"),
      end: booth.querySelector("[data-end]"),
      help: booth.querySelector("[data-help]"),
      mute: booth.querySelector("[data-mute]"),
      endStamp: booth.querySelector("[data-end-stamp]"),
      endTitle: booth.querySelector("[data-end-title]"),
      endCopy: booth.querySelector("[data-end-copy]"),
      score: booth.querySelector("[data-score]"),
      best: booth.querySelector("[data-best]")
    };
    function input() {
      let steer = 0;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) steer += 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) steer -= 1;
      if (holdLeft) steer += 1;
      if (holdRight) steer -= 1;
      if (pointerOn && steer === 0) steer = pointerSteer;
      steer = Math.max(-1, Math.min(1, steer));
      const boost = keys.has("KeyW") || keys.has("ArrowUp");
      const brake = keys.has("KeyS") || keys.has("ArrowDown") || holdBrake;
      const peek = keys.has("Space") || keys.has("ShiftLeft") || keys.has("ShiftRight") || holdPeek;
      return { steer, boost, brake, peek };
    }
    function paintHud() {
      el.km.textContent = `${sim.km.toFixed(1)} / ${SPAN_KM} km`;
      el.weather.textContent = sim.phase === "title" ? "Cape Jourimain, waiting" : weatherLabel(sim.weather);
      el.nerves.style.width = `${sim.nerves}%`;
      el.view.textContent = `View: ${sim.viewWord.toLowerCase()}`;
      el.glimpses.textContent = String(sim.glimpses);
      el.strait.textContent = `Strait seen: ${sim.straitSecs.toFixed(1)}s`;
      el.line.textContent = sim.line;
      if (sim.gustAge < 0.48 && (sim.weather === "wind" || sim.weather === "snow" || sim.weather === "ice")) {
        el.band.textContent = sim.gustDir < 0 ? "Gust \u2190 coming" : "Gust \u2192 coming";
      } else {
        el.band.textContent = "Bridge radio";
      }
    }
    function showEnd() {
      const score = tally(sim);
      if (score > best) {
        best = score;
        writeBest(best);
      }
      const arrived = sim.result === "arrived";
      el.endStamp.textContent = arrived ? "ISLAND" : "PULLED OVER";
      el.endTitle.textContent = arrived ? "You got across." : "That's the shoulder.";
      el.endCopy.textContent = arrived ? `Prince Edward Island. ${sim.glimpses} glimpse${sim.glimpses === 1 ? "" : "s"} of water, ${sim.nears} brave passes, ${sim.scrapes} arguments with the concrete. The potatoes can see the Strait. You saw ${sim.straitSecs.toFixed(1)} seconds of actual ocean. Getting on was free; leaving the Island is the part with the toll.` : `White knuckles won. ${sim.km.toFixed(1)} km into a 12.9 km hallway, with ${sim.glimpses} glimpse${sim.glimpses === 1 ? "" : "s"} to show for it. The emergency phone is also concrete. You saw ${sim.straitSecs.toFixed(1)} seconds of water. The old ferry showed you the whole crossing.`;
      el.score.textContent = `${score} pts`;
      el.best.textContent = `Best on this browser: ${best}. Scrapes ${sim.scrapes}, truck brushes ${sim.knocks}.`;
      el.end.hidden = false;
    }
    function begin() {
      mixer.unlock();
      const reduced = sim.reduced;
      const next = createSim();
      next.reduced = reduced;
      next.phase = "play";
      Object.assign(sim, next);
      sim.rng = next.rng;
      sim.entities = next.entities;
      sim.sparks = next.sparks;
      sim.popups = next.popups;
      el.overlay.hidden = true;
      el.end.hidden = true;
    }
    const onKeyDown = (e) => {
      if (e.code === "Space") e.preventDefault();
      if (!injected) keys.add(e.code);
      if ((e.code === "Enter" || e.code === "Space") && sim.phase !== "play") {
        if (sim.phase === "title" || !el.end.hidden) begin();
      }
    };
    const onKeyUp = (e) => {
      if (!injected) keys.delete(e.code);
    };
    const onBlur = () => {
      if (!injected) keys.clear();
      holdLeft = holdRight = holdBrake = holdPeek = false;
      pointerOn = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    booth.querySelector("[data-start]").addEventListener("click", begin);
    booth.querySelector("[data-again]").addEventListener("click", begin);
    booth.querySelector("[data-how]").addEventListener("click", () => {
      el.help.hidden = !el.help.hidden;
    });
    el.mute.addEventListener("click", () => {
      mixer.unlock();
      muted = !muted;
      mixer.setMuted(muted);
      el.mute.textContent = muted ? "Sound off" : "Sound on";
    });
    const bindHold = (name, set) => {
      const btn = booth.querySelector(`[data-hold="${name}"]`);
      const down = (e) => {
        e.preventDefault();
        btn.setPointerCapture(e.pointerId);
        set(true);
      };
      const up = () => set(false);
      btn.addEventListener("pointerdown", down);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointercancel", up);
      btn.addEventListener("lostpointercapture", up);
    };
    bindHold("left", (v) => holdLeft = v);
    bindHold("right", (v) => holdRight = v);
    bindHold("brake", (v) => holdBrake = v);
    bindHold("peek", (v) => holdPeek = v);
    canvas.addEventListener("pointerdown", (e) => {
      if (sim.phase !== "play") return;
      mixer.unlock();
      pointerOn = true;
      canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      pointerSteer = Math.max(-1, Math.min(1, (rect.left + rect.width / 2 - e.clientX) / (rect.width * 0.22)));
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!pointerOn) return;
      const rect = canvas.getBoundingClientRect();
      pointerSteer = Math.max(-1, Math.min(1, (rect.left + rect.width / 2 - e.clientX) / (rect.width * 0.22)));
    });
    const endPointer = () => {
      pointerOn = false;
      pointerSteer = 0;
    };
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    const qa = new URLSearchParams(location.search).has("qa");
    if (qa) {
      window.__controlsTest = {
        getYaw: () => sim.yaw,
        getSpeed: () => sim.speed,
        getCarX: () => sim.carX,
        setKeys: (codes) => {
          injected = true;
          keys.clear();
          for (const c of codes) keys.add(c);
        }
      };
    }
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1e3);
      last = now;
      acc += dt;
      const inp = input();
      while (acc >= 1 / 60) {
        const scrapes = sim.scrapes;
        const knocks = sim.knocks;
        const glimpses = sim.glimpses;
        const nears = sim.nears;
        step(sim, inp, 1 / 60);
        if (sim.scrapes > scrapes) mixer.scrape();
        if (sim.knocks > knocks) mixer.knock();
        if (sim.glimpses > glimpses || sim.nears > nears) mixer.chime();
        acc -= 1 / 60;
      }
      const closeTruck = sim.entities.some(
        (e) => e.kind === "truck" && e.z > 0 && e.z < 16 && Math.abs(sim.carX - e.x) < 0.45
      );
      if (closeTruck && !hornArmed) {
        mixer.horn();
        hornArmed = true;
      }
      if (!closeTruck) hornArmed = false;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      draw(ctx, sim, canvas.width / dpr, canvas.height / dpr, now / 1e3);
      paintHud();
      mixer.update(sim.wind, sim.speed, sim.weather, sim.phase === "play");
      if (sim.phase === "over" && el.end.hidden) showEnd();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    paintHud();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      delete window.__controlsTest;
      root2.innerHTML = "";
    };
  }

  // src/game/standalone.ts
  var root = document.getElementById("app");
  if (root) mountGame(root);
})();
