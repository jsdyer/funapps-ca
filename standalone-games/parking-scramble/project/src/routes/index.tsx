import { createFileRoute } from "@tanstack/react-router";
import { ParkingGame } from "@/components/ParkingGame";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <ParkingGame />;
}
