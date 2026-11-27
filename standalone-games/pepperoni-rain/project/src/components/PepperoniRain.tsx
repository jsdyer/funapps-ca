import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { mountPepperoniRain, type PepperoniApi } from "@/game/pepperoni";

export function PepperoniRain() {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<PepperoniApi | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const api = mountPepperoniRain(host);
    apiRef.current = api;
    api.setMuted(muted);
    return () => {
      api.destroy();
      apiRef.current = null;
    };
    // Mount once. Mute is pushed by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiRef.current?.setMuted(muted);
  }, [muted]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-bg text-fg select-none">
      <h1 className="sr-only">Pepperoni Rain</h1>
      <p className="sr-only">
        Slide sideways to catch the falling pepperoni. Charcoal lumps cost a stick. Arrows or A and D
        work too.
      </p>
      <div ref={hostRef} className="absolute inset-0 touch-none" />
      <button
        type="button"
        aria-label={muted ? "Unmute" : "Mute"}
        aria-pressed={muted}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setMuted((m) => !m)}
        className="absolute top-3 left-3 z-20 flex size-11 items-center justify-center rounded-full border border-paper/40 bg-bg/80 text-fg"
      >
        {muted ? <VolumeX size={20} aria-hidden /> : <Volume2 size={20} aria-hidden />}
      </button>
    </main>
  );
}
