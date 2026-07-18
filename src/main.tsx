import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "leaflet/dist/leaflet.css"; // <-- Agrega esta línea
import RuterMapas from "./RuterMapas";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RuterMapas />
  </StrictMode>,
);
