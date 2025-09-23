import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeCustomTooltips } from './lib/tooltip-handler.ts'

createRoot(document.getElementById("root")!).render(<App />);

// Initialize custom tooltips
initializeCustomTooltips()