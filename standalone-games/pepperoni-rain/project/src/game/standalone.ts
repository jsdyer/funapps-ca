import { mountPepperoniRain } from "./pepperoni";

const host = document.getElementById("app");
const mute = document.getElementById("mute");
if (host && mute) {
  const api = mountPepperoniRain(host);
  let muted = false;
  mute.addEventListener("click", () => {
    muted = !muted;
    api.setMuted(muted);
    mute.setAttribute("aria-label", muted ? "Unmute" : "Mute");
    mute.setAttribute("aria-pressed", muted ? "true" : "false");
  });
}
