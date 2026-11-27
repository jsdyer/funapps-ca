export type Art = {
  pan?: HTMLImageElement;
  dough?: HTMLImageElement;
  ball?: HTMLImageElement;
  meatA?: HTMLImageElement;
  meatB?: HTMLImageElement;
  tomato?: HTMLImageElement;
  onion?: HTMLImageElement;
  cheese?: HTMLImageElement;
};

const SOURCES: Record<keyof Art, string> = {
  pan: "/game/pan.png",
  dough: "/game/dough.png",
  ball: "/game/dough-ball.png",
  meatA: "/game/meat-a.png",
  meatB: "/game/meat-b.png",
  tomato: "/game/tomato.png",
  onion: "/game/onion.png",
  cheese: "/game/cheese.png",
};

export function loadArt(onUpdate: (art: Art) => void) {
  const art: Art = {};
  let alive = true;
  (Object.keys(SOURCES) as (keyof Art)[]).forEach((key) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (!alive) return;
      art[key] = img;
      onUpdate({ ...art });
    };
    img.src = SOURCES[key];
  });
  return () => {
    alive = false;
  };
}
