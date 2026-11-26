import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LastBoat } from "./last-boat";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LastBoat />
  </StrictMode>,
);
