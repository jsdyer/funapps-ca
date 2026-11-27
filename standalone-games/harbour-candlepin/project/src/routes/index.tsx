import { createFileRoute } from "@tanstack/react-router";
import { CandlepinApp } from "@/components/CandlepinApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <CandlepinApp />;
}
