export type ArtName =
  | "boat"
  | "rival"
  | "buoy"
  | "buoyOther"
  | "trap"
  | "lobster"
  | "gull"
  | "light"
  | "wharf"
  | "rock"
  | "spruce"
  | "kelp";

export type ArtBook = Record<ArtName, HTMLImageElement>;

const FILES: Record<ArtName, string> = {
  boat: "boat.png",
  rival: "rival.png",
  buoy: "buoy.png",
  buoyOther: "buoy-other.png",
  trap: "trap.png",
  lobster: "lobster.png",
  gull: "gull.png",
  light: "light.png",
  wharf: "wharf.png",
  rock: "rock.png",
  spruce: "spruce.png",
  kelp: "kelp.png",
};

export function loadArt(onReady: () => void): ArtBook {
  const book = {} as ArtBook;
  let left = Object.keys(FILES).length;
  (Object.keys(FILES) as ArtName[]).forEach((name) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (--left === 0) onReady();
    };
    img.onerror = () => {
      if (--left === 0) onReady();
    };
    img.src = `${import.meta.env.BASE_URL}assets/bring/${FILES[name]}`;
    book[name] = img;
  });
  return book;
}

export function ready(img: HTMLImageElement | undefined): img is HTMLImageElement {
  return Boolean(img && img.complete && img.naturalWidth > 0);
}
