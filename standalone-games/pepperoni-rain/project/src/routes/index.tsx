import { createFileRoute } from "@tanstack/react-router";
import { PepperoniRain } from "@/components/PepperoniRain";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <PepperoniRain />;
}
