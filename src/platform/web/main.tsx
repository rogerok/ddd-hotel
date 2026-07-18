import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ReservationWorkbench } from "../../reservations/ui/ReservationWorkbench.tsx";
import "./styles.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Missing #root mount point");
}

createRoot(rootElement).render(
  <StrictMode>
    <ReservationWorkbench />
  </StrictMode>,
);
