import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Build output goes to ../static (served by FastAPI); assets referenced under /static/.
export default defineConfig({
  base: "/static/",
  plugins: [react(), tailwindcss()],
  build: { outDir: "../static", emptyOutDir: true },
});
