import { createRoot } from "react-dom/client";
const classic = new URLSearchParams(location.search).get("mode") === "puzzles";
(classic ? import("./Classic") : import("./Quick")).then(({ default: App }) =>
  createRoot(document.getElementById("root")!).render(<App />),
);
