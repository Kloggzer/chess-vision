import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { Button } from "./ui";
import { api, post } from "../api";
import { Crop, RotateCcw, Wand2, Loader2, Move, RotateCw, Maximize2 } from "lucide-react";

type AABB = { min: number[]; max: number[] };
type Mode = "translate" | "rotate" | "scale";

const MODE_LABELS: Record<Mode, string> = {
  translate: "Verschieben (W)",
  rotate: "Drehen (E)",
  scale: "Skalieren (R)",
};
const MODE_ICONS: Record<Mode, typeof Move> = {
  translate: Move,
  rotate: RotateCw,
  scale: Maximize2,
};

/** Interaktiver 3D OBB-Crop-Viewer: positioniere/rotiere/skaliere eine Box um die Figur,
 *  schneide sie aus und bereite sie vor. */
export function CropViewer({ dir, onDone }: { dir: string; onDone: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("translate");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Refs für drei.js-Objekte, die die UI-Steuerung braucht
  const boxRef = useRef<THREE.Mesh | null>(null);
  const tcRef = useRef<TransformControls | null>(null);
  const ocRef = useRef<OrbitControls | null>(null);
  const rafRef = useRef(0);

  const resetBox = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    // Zurück zur Identität (AABB-initialisierung wird beim Laden gesetzt)
    box.position.set(0, 0, 0);
    box.quaternion.identity();
    box.scale.set(1, 1, 1);
    if (tcRef.current) tcRef.current.detach();
    fetchAABB(dir).then((aabb) => {
      if (aabb) applyAABB(box, aabb);
      if (tcRef.current) tcRef.current.attach(box);
    });
  }, [dir]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let disposed = false;

    // --- Scene ---------------------------------------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14141a);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const cam = new THREE.PerspectiveCamera(35, 1, 0.001, 5000);

    // Z-up Beleuchtung (wie ModelViewer)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 1.1));
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 4, 2); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 1.1); fill.position.set(-3, 1, -1); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.8); rim.position.set(0, 2, -4); scene.add(rim);

    // OrbitControls — Z-up
    const controls = new OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    (controls as any).up = new THREE.Vector3(0, 0, 1);  // Z-up für Scan-Meshes
    ocRef.current = controls;

    // TransformControls — für die Crop-Box
    const tc = new TransformControls(cam, renderer.domElement);
    tc.space = "local";
    tc.size = 0.8;
    tcRef.current = tc;
    // three r169+: TransformControls ist KEIN Object3D mehr → den Helper adden
    scene.add(tc.getHelper());

    // Box-Dragging pausiert OrbitControls
    tc.addEventListener("dragging-changed", (ev: any) => {
      controls.enabled = !ev.value;
    });

    // --- Crop-Box (semi-transparent wireframe) -------------------------------
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const boxMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.45,
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.name = "crop-box";
    boxRef.current = box;

    // --- Grid-Helfer (Z=0 Ebene, X-Y ground) -----------------------------------
    const grid = new THREE.GridHelper(5, 20, 0x444466, 0x222233);
    scene.add(grid);

    // --- Mesh laden ----------------------------------------------------------
    const loader = new GLTFLoader();
    const url = `/api/scan/preview-mesh/${dir}.glb`;

    // AABB für initiale Box-Positionierung laden
    fetchAABB(dir).then((aabb) => {
      if (aabb && !disposed) applyAABB(box, aabb);
    });

    loader.load(url, (gltf) => {
      if (disposed) return;
      const meshGroup = gltf.scene;
      // Optional: Normalen berechnen
      meshGroup.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.isMesh) {
          m.material = new THREE.MeshStandardMaterial({
            map: (m.material as THREE.MeshStandardMaterial).map || null,
            roughness: 0.7,
            side: THREE.DoubleSide,
          });
          m.geometry.computeVertexNormals();
        }
      });

      // Zentrieren für guten Kamera-Start
      const bbox = new THREE.Box3().setFromObject(meshGroup);
      const center = bbox.getCenter(new THREE.Vector3());
      meshGroup.position.sub(center);
      scene.add(meshGroup);

      const sz = bbox.getSize(new THREE.Vector3());
      const r = Math.max(sz.x, sz.y, sz.z);
      cam.position.set(r * 1.6, r * 0.6, r * 1.6);
      cam.near = r / 100; cam.far = r * 100; cam.updateProjectionMatrix();
      controls.target.set(0, 0, 0);

      // Box an TransformControls anhängen, sobald Mesh geladen
      tc.attach(box);
      scene.add(box);
      controls.update();
    }, undefined, () => {
      if (!disposed) setError("Mesh konnte nicht geladen werden.");
    });

    // --- Resize-Handler ------------------------------------------------------
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      cam.aspect = w / Math.max(h, 1);
      cam.updateProjectionMatrix();
    };
    onResize();
    window.addEventListener("resize", onResize);

    // --- Render-Loop ---------------------------------------------------------
    const loop = () => {
      controls.update();
      renderer.render(scene, cam);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    // --- Keyboard: Modus wechseln --------------------------------------------
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W") setMode("translate");
      else if (e.key === "e" || e.key === "E") setMode("rotate");
      else if (e.key === "r" || e.key === "R") setMode("scale");
    };
    window.addEventListener("keydown", onKey);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      controls.dispose();
      tc.detach();
      scene.remove(tc.getHelper());
      tc.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [dir]);

  // Modus-Änderung an TransformControls weiterreichen
  useEffect(() => {
    const tc = tcRef.current;
    if (!tc) return;
    tc.setMode(mode);
  }, [mode]);

  // --- Aktionen -------------------------------------------------------------
  async function doCrop() {
    const box = boxRef.current;
    if (!box) return;
    setBusy(true);
    setError("");
    setStatus("Zuschneiden…");

    // Box-Parameter in Weltkoordinaten lesen (Z-up, natives Mesh-Frame)
    const worldPos = new THREE.Vector3();
    box.getWorldPosition(worldPos);
    const worldQuat = new THREE.Quaternion();
    box.getWorldQuaternion(worldQuat);

    // half_extents = BoxGeometry-Extents (1×1×1 * scale / 2) in lokalen Einheiten,
    // dann mit worldScale multiplizieren
    const worldScale = new THREE.Vector3();
    box.getWorldScale(worldScale);
    const halfExtents = [
      Math.abs(worldScale.x) / 2,
      Math.abs(worldScale.y) / 2,
      Math.abs(worldScale.z) / 2,
    ];

    try {
      const r = await post<{ ok: boolean; path: string; faces_kept: number; faces_total: number }>(
        "/api/scan/crop",
        {
          dir,
          center: [worldPos.x, worldPos.y, worldPos.z],
          half_extents: halfExtents,
          quaternion: [worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w],
        },
      );
      setStatus(`Cropped (${r.faces_kept}/${r.faces_total} faces). Bereite vor…`);

      // Auto-Prepare mit isolate=false (das Mesh ist bereits freigestellt)
      const pieceName = dir.match(/^([wb]?)([PNBRQK])$/i)
        ? (dir[0].toLowerCase() === dir[0] ? dir[0].toLowerCase() + dir.slice(1).toUpperCase() : dir.toUpperCase())
        : dir;
      await post("/api/scan/prepare", {
        dir,
        piece: pieceName.length === 1 ? "w" + pieceName : pieceName,
        target_tris: 20000,
        smooth_iters: 10,
        isolate: false,
      });
      setStatus("Fertig!");
      onDone();
    } catch (e: any) {
      setError(e.message || String(e));
    }
    setBusy(false);
  }

  const btnCls = "flex items-center gap-1.5 rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium hover:border-zinc-400 disabled:opacity-40";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={(e) => { if (e.target === e.currentTarget) onDone(); }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-3 py-2">
        <span className="mr-2 text-sm font-medium text-zinc-200">Zuschneiden: {dir}</span>
        {(["translate", "rotate", "scale"] as Mode[]).map((m) => {
          const Icon = MODE_ICONS[m];
          return (
            <button key={m} onClick={() => setMode(m)}
              className={`${btnCls} ${mode === m ? "border-sky-500 bg-sky-500/15 text-sky-300" : "text-zinc-400"}`}>
              <Icon className="h-3.5 w-3.5" /> {MODE_LABELS[m]}
            </button>
          );
        })}
        <div className="mx-2 h-5 w-px bg-zinc-700" />
        <button onClick={resetBox} className={`${btnCls} text-zinc-400`}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset Box
        </button>
        <button onClick={doCrop} disabled={busy}
          className={`${btnCls} border-sky-600 bg-sky-600/20 text-sky-300 hover:border-sky-400`}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crop className="h-3.5 w-3.5" />}
          Croppen &amp; Vorbereiten
        </button>
        <button onClick={onDone} className={`${btnCls} ml-auto text-zinc-400`}>Schließen</button>
      </div>

      {/* Fehler / Status */}
      {error && <div className="mx-4 mt-2 rounded bg-red-900/50 px-3 py-1.5 text-xs text-red-300">{error}</div>}
      {status && !error && <div className="mx-4 mt-2 rounded bg-sky-900/30 px-3 py-1.5 text-xs text-sky-300">{status}</div>}

      {/* 3D Canvas */}
      <div ref={host} className="flex-1" />
    </div>
  );
}

// --- Hilfsfunktionen (außerhalb der Komponente, keine React-Abhängigkeiten) ---

async function fetchAABB(dir: string): Promise<AABB | null> {
  try {
    return await api<AABB>(`/api/scan/preview-info/${dir}`);
  } catch {
    return null;
  }
}

function applyAABB(box: THREE.Mesh, aabb: AABB) {
  const min = new THREE.Vector3(aabb.min[0], aabb.min[1], aabb.min[2]);
  const max = new THREE.Vector3(aabb.max[0], aabb.max[1], aabb.max[2]);
  const size = max.clone().sub(min);
  const center = min.clone().add(size.clone().multiplyScalar(0.5));

  box.position.copy(center);
  box.scale.set(size.x * 0.85, size.y * 0.85, size.z * 0.85);  // etwas enger als AABB
  box.quaternion.identity();
}
