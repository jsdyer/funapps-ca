import {
  createRun,
  startRun,
  pauseRun,
  resumeRun,
  stepRun,
  tideAt,
  TARGET,
  ROUND_SECONDS,
} from "./run-engine.js";
const crate = (x, y) =>
  `<g transform="translate(${x} ${y})"><circle class="crate-ring" r="31" fill="none" stroke="#ffe57b" stroke-width="3"/><rect x="-22" y="-21" width="44" height="42" rx="7" fill="#ffdc64" stroke="#744715" stroke-width="3"/><path d="M-20-9h40M-20 10h40M-8-20v40M9-20v40" stroke="#c48726" stroke-width="3"/><path d="M-9 0h18M0-9v18" stroke="#fff8cc" stroke-width="5"/></g>`;
const rock = (x, y, low) =>
  `<g transform="translate(${x} ${y})" opacity="${low ? 1 : 0.28}"><ellipse cy="16" rx="34" ry="12" fill="#d6ffff" opacity=".35"/><path d="M-29 12-17-12 3-24 26-5 34 16Z" fill="${low ? "#573e38" : "#146f84"}" stroke="${low ? "#fac3a4" : "#7bc8d2"}" stroke-width="3"/><path d="M-17-12 3-24 6 15" fill="none" stroke="#aa7764" stroke-width="3"/>${low ? '<text y="9" text-anchor="middle" fill="#fff3cc" font-size="22" font-weight="900">!</text>' : ""}</g>`;
class FundyRun extends HTMLElement {
  connectedCallback() {
    this.s = createRun();
    this.axis = 0;
    this.target = null;
    this.demo = 0;
    this.last = null;
    this.lastPhase = "";
    this.lastNotice = "";
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.best = 0;
    try {
      const n = Number(localStorage.getItem("fundy-run-best"));
      this.best = Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {}
    this.innerHTML = `<main class="run-shell"><div class="hud"><div><strong id="cargo">0 / ${TARGET}</strong> <span>CRATES</span></div><div class="tide-pill" id="tide">Tide coming in</div><div><strong id="clock">${ROUND_SECONDS}</strong> <span>SEC</span></div><div><strong id="score">0</strong> <span>PTS</span></div></div><div class="playfield" tabindex="0" role="application" aria-label="Fundy boat run. Move left and right to catch golden crates and avoid exposed rocks."><svg viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sea" x2="0" y2="1"><stop stop-color="#47c3cb"/><stop offset="1" stop-color="#09677e"/></linearGradient><pattern id="wave" width="100" height="110" patternUnits="userSpaceOnUse"><path d="M8 26q16-12 32 0t32 0M61 88q15-9 29 0" stroke="#9fe8e2" stroke-width="3" fill="none" opacity=".4"/></pattern></defs><rect width="1000" height="600" fill="url(#sea)"/><rect class="wave-line" x="-100" width="1200" height="600" fill="url(#wave)"/><path d="M0 0H1000V82L947 98 926 68 854 69 804 45 713 73 616 43 504 62 411 40 303 80 196 66 125 99 72 77 0 132Z" fill="#b45f3d"/><path d="M0 0H1000V46L945 59 895 27 805 24 720 38 614 15 502 36 401 17 302 49 200 33 126 67 70 42 0 83Z" fill="#376d4d"/><path d="M0 95 70 61 83 90 48 129 62 183 38 242 0 265ZM1000 97 952 85 926 140 951 184 932 234 971 281 1000 267Z" fill="#c97d53"/><path d="M0 268 40 246 56 185M1000 284 971 288 929 239" stroke="#f2d294" stroke-width="16" fill="none"/><g transform="translate(115 52)"><path class="light-beam" d="m0-18 133-34v39z" fill="#fff4bc" opacity=".45"/><path d="m-14 23 6-50h18l8 50z" fill="#fff7dd"/><path d="m-13 8h29l-2-12h-25z" fill="#ee7257"/><path d="m-13-28 15-16 15 16z" fill="#102e38"/><rect x="-4" y="-26" width="11" height="10" fill="#ffdf70"/></g><text x="500" y="42" text-anchor="middle" class="scene-text" font-size="17">BAY OF FUNDY</text><g id="items"></g><g id="boat"><ellipse cy="26" rx="52" ry="14" fill="#d5ffff" opacity=".4"/><path d="M-38-20Q0-52 38-20L29 34Q0 54-29 34Z" fill="#fff9e4" stroke="#0c3546" stroke-width="5"/><path d="M-31 7H31L26 34Q0 49-26 34Z" fill="#f36e4a"/><rect x="-22" y="-13" width="44" height="29" rx="7" fill="#16495a"/><rect x="-17" y="-10" width="34" height="13" rx="3" fill="#8ee1e3"/><circle cy="24" r="9" fill="#ffda65"/></g></svg><span class="demo-caption">CATCH THE GOLDEN CRATES</span><div class="feedback"></div><div class="overlay"></div></div><div class="controls"><button data-steer="-1" aria-label="Steer left">◀</button><p><b>Move to catch.</b> Mouse, touch or ← →<br>Golden crates ✓ &nbsp; Exposed rocks ✕</p><button data-steer="1" aria-label="Steer right">▶</button></div><footer class="run-footer"><a href="./puzzles.html">Route puzzles</a><span>SVG + Web Components</span><details><summary>About this coast</summary><p>A fictional arcade run inspired by Fundy's red cliffs and changing tides. <a href="https://parks.canada.ca/pn-np/nb/fundy/nature/environment/marees-tides" target="_blank" rel="noopener">Explore the real tides.</a></p></details></footer><p class="sr-only" role="status" aria-live="polite"></p></main>`;
    this.field = this.querySelector(".playfield");
    this.overlay = this.querySelector(".overlay");
    this.pauseButton = document.getElementById("pause");
    this.onActionClick = (e) => {
      if (e.target.closest("[data-start]")) this.start();
      if (e.target.closest("[data-resume]")) this.resume();
    };
    this.addEventListener("click", this.onActionClick);
    this.field.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      if (this.s.phase === "ready") this.start();
      if (this.s.phase !== "playing") return;
      this.field.setPointerCapture(e.pointerId);
      this.point(e);
    });
    this.field.addEventListener("pointermove", (e) => {
      if (
        this.s.phase === "playing" &&
        (e.pointerType === "mouse" || e.buttons)
      )
        this.point(e);
    });
    for (const b of this.querySelectorAll("[data-steer]")) {
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (this.s.phase === "ready") this.start();
        if (this.s.phase !== "playing") return;
        this.target = null;
        this.axis = Number(b.dataset.steer);
        b.setPointerCapture(e.pointerId);
      });
      for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
        b.addEventListener(event, () => (this.axis = 0));
      b.addEventListener("click", (e) => {
        if (e.detail === 0) {
          if (this.s.phase === "ready") this.start();
          this.target = Math.max(
            10,
            Math.min(90, this.s.x + Number(b.dataset.steer) * 16),
          );
        }
      });
    }
    this.keydown = (e) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.target.closest("input,textarea,select")
      )
        return;
      if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key)) {
        e.preventDefault();
        if (this.s.phase === "ready") this.start();
        if (this.s.phase !== "playing") return;
        this.target = null;
        this.axis = ["ArrowLeft", "a", "A"].includes(e.key) ? -1 : 1;
      }
      if (
        (e.code === "Space" && !e.target.closest("button,a,summary")) ||
        e.key.toLowerCase() === "p"
      ) {
        e.preventDefault();
        if (e.repeat) return;
        this.s.phase === "ready" ? this.start() : this.togglePause();
      }
    };
    this.keyup = (e) => {
      if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key))
        this.axis = 0;
    };
    this.onWindowBlur = () => this.pause();
    this.onVisibilityChange = () => {
      if (document.hidden) this.pause();
    };
    this.pauseClick = () => this.togglePause();
    document.addEventListener("keydown", this.keydown);
    document.addEventListener("keyup", this.keyup);
    window.addEventListener("blur", this.onWindowBlur);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.pauseButton.addEventListener("click", this.pauseClick);
    this.frame = (t) => {
      const dt = this.last === null ? 0 : Math.min((t - this.last) / 1000, 0.1);
      this.last = t;
      if (this.s.phase === "playing")
        this.s = stepRun(this.s, dt, { axis: this.axis, target: this.target });
      if (this.s.phase === "ready" && !this.reduced) this.demo += dt;
      this.paint();
      this.raf = requestAnimationFrame(this.frame);
    };
    this.raf = requestAnimationFrame(this.frame);
    this.paint();
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.raf);
    document.removeEventListener("keydown", this.keydown);
    document.removeEventListener("keyup", this.keyup);
    window.removeEventListener("blur", this.onWindowBlur);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.pauseButton?.removeEventListener("click", this.pauseClick);
  }
  point(e) {
    const r = this.field.getBoundingClientRect();
    this.target = Math.max(
      10,
      Math.min(90, ((e.clientX - r.left) / r.width) * 100),
    );
    this.axis = 0;
  }
  start() {
    this.s = startRun();
    this.axis = 0;
    this.target = null;
    this.last = null;
    this.field.focus({ preventScroll: true });
    this.paint();
  }
  pause() {
    this.s = pauseRun(this.s);
    this.axis = 0;
    this.target = null;
    this.paint();
  }
  resume() {
    this.s = resumeRun(this.s);
    this.axis = 0;
    this.target = null;
    this.last = null;
    this.field.focus({ preventScroll: true });
    this.paint();
  }
  togglePause() {
    if (this.s.phase === "paused") this.resume();
    else this.pause();
  }
  paint() {
    const s = this.s,
      ready = s.phase === "ready",
      t = ready ? this.demo : s.elapsed,
      low = tideAt(t) < 0.48;
    this.classList.toggle("paused", s.phase === "paused");
    this.querySelector("#cargo").textContent = `${s.caught} / ${TARGET}`;
    this.querySelector("#clock").textContent = Math.ceil(
      ROUND_SECONDS - s.elapsed,
    );
    this.querySelector("#score").textContent = s.score;
    this.querySelector("#tide").textContent = low
      ? "LOW TIDE · rocks exposed"
      : "HIGHER TIDE · rocks covered";
    this.querySelector("#boat").setAttribute(
      "transform",
      `translate(${(ready ? 50 + Math.sin(t * 0.7) * 23 : s.x) * 10} 480)`,
    );
    const items = ready
      ? [0, 1, 2, 3].map((v) => ({
          x: [30, 70, 45, 80][v],
          y: ((t * 18 + v * 27) % 115) - 8,
          kind: v === 3 ? "rock" : "crate",
        }))
      : s.items;
    this.querySelector("#items").innerHTML = items
      .map((i) =>
        i.kind === "crate"
          ? crate(i.x * 10, i.y * 6)
          : rock(i.x * 10, i.y * 6, low),
      )
      .join("");
    this.querySelector(".feedback").textContent = s.flash > 0 ? s.notice : "";
    this.pauseButton.disabled =
      ready || s.phase === "won" || s.phase === "ended";
    this.pauseButton.textContent = s.phase === "paused" ? "Resume" : "Pause";
    this.pauseButton.setAttribute(
      "aria-label",
      s.phase === "paused" ? "Resume game" : "Pause game",
    );
    if (s.notice !== this.lastNotice) {
      this.querySelector("[role=status]").textContent = s.notice;
      this.lastNotice = s.notice;
    }
    if (s.phase !== this.lastPhase) {
      this.lastPhase = s.phase;
      this.overlay.hidden = s.phase === "playing";
      if (s.phase === "ready")
        this.overlay.innerHTML =
          '<div class="card"><h2>Catch the tide.</h2><p>Steer your boat. Bring 10 golden crates home.</p><button data-start>Play boat run</button></div>';
      else if (s.phase === "paused")
        this.overlay.innerHTML =
          '<div class="card"><h2>Safe at anchor.</h2><p>Your run is paused.</p><button data-resume>Resume run</button></div>';
      else if (s.phase === "won" || s.phase === "ended") {
        this.best = Math.max(this.best, s.score);
        try {
          localStorage.setItem("fundy-run-best", String(this.best));
        } catch {}
        this.overlay.innerHTML = `<div class="card"><h2>${s.phase === "won" ? "Home with the haul!" : "A good bit of boating."}</h2><span class="result-num">${s.score} points</span><p>${s.caught} crates aboard · Best ${this.best}</p><button data-start>Play again</button></div>`;
      }
    }
  }
}
customElements.define("fundy-run", FundyRun);
