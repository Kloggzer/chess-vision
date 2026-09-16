/**
 * Schreiben ueber eine Zwischenstufe: `writeFile` kuerzt zuerst, also ist die Datei zwischen
 * Kuerzen und letztem Byte halb da. `writeConfirmation` und `flagFrame` gehen aus diesem Grund
 * seit je ueber tmp+rename; dies ist dieselbe Bewegung als eine Funktion.
 */
import { rename, rm, writeFile } from "node:fs/promises";

export async function writeFileAtomic(file: string, body: string): Promise<void> {
  const tmp = `${file}.tmp`;
  try {
    await writeFile(tmp, body, "utf8");
    await rename(tmp, file);
  } catch (e) {
    await rm(tmp, { force: true }).catch(() => {});
    throw e;
  }
}
