import { createFileRoute } from "@tanstack/react-router";
import { DonairRush } from "@/components/DonairRush";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <DonairRush />;
}
