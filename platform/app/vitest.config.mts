import path from "node:path";
import { defineConfig } from "vitest/config";

// Der Worker (`lib/py/worker.ts`) sucht das venv neben CHESSLAB_DATA_DIR; die Tests legen ihre
// Daten nach tmp, also nennt die Suite das venv des Repos ausdruecklich.
const venv = path.resolve(import.meta.dirname, "..", "..", ".venv");
const python = process.platform === "win32" ? path.join(venv, "Scripts", "python.exe") : path.join(venv, "bin", "python");

// Auch fuer den globalSetup-Prozess, der den geteilten Worker startet (`test.env` gilt nur den Dateien).
process.env.CHESSLAB_PYTHON ??= python;

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    env: { CHESSLAB_PYTHON: python },
    // EIN echter Python-Worker fuer alle Dateien; die Dateien reden ueber ein Node-Relais mit ihm.
    globalSetup: ["lib/py/shared-worker.setup.ts"],
  },
});
