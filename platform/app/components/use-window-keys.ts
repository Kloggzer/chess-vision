import { useEffect, useRef } from "react";

/** EIN Listener fuer die ganze Seite, der den Handler des letzten Renders liest — ihn je
 *  Zustandswechsel neu zu binden verliert Tasten. */
export function useWindowKeys(onKey: (event: KeyboardEvent) => void) {
  const handler = useRef(onKey);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => handler.current(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    handler.current = onKey;
  });
}
