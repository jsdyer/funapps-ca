import { createFileRoute } from "@tanstack/react-router";
import { LastSpot } from "../components/last-spot";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <LastSpot />;
}
