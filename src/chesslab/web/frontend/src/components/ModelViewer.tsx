import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Interactive 3D viewer for a prepared piece (OBJ + texture, rotatable/zoomable). */
export function ModelViewer({ piece, variant, textured = true, size = 320 }: {
  piece: string; variant: string; textured?: boolean; size?: number;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14141a);
    const cam = new THREE.PerspectiveCamera(35, 1, 0.01, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    el.appendChild(renderer.domElement);

    // Surround lighting so no side is dark: HemiLight (sky/ground) + Ambient +
    // Key/Fill/Rim from three directions. Previously the far side was too dark.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 1.1));
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 4, 2); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 1.1); fill.position.set(-3, 1, -1); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.8); rim.position.set(0, 2, -4); scene.add(rim);

    const controls = new OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;

    let raf = 0;
    let disposed = false;
    const loader = new OBJLoader();
    loader.load(`/api/scan/model/${piece}/${variant}.obj`, (obj) => {
      if (disposed) return;
      // Ensure normals exist (scan meshes may have missing/inconsistent normals).
      obj.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.isMesh) m.geometry.computeVertexNormals();
      });
      // Material: texture or clay. side=DoubleSide is MANDATORY for scanned meshes — otherwise
      // inward-facing normals get front-face culled and you look
      // through the piece ("wireframe" effect).
      const applyMat = (mat: THREE.Material) => applyMeshMaterial(obj, mat);
      if (textured) {
        new THREE.TextureLoader().load(`/api/scan/model/${piece}/${variant}.png`, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          applyMat(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
        }, undefined, () => applyMat(new THREE.MeshStandardMaterial({ color: 0xb0b0b8, roughness: 0.6 })));
      } else {
        applyMat(new THREE.MeshStandardMaterial({ color: 0xc0c0c6, roughness: 0.65 }));
      }

      // Center + set camera appropriately (piece is Z-up from isolate_piece -> rotate to Y-up).
      obj.rotation.x = -Math.PI / 2;
      const box = new THREE.Box3().setFromObject(obj);
      const c = box.getCenter(new THREE.Vector3());
      const sz = box.getSize(new THREE.Vector3());
      obj.position.sub(c);                       // Mesh-Mittelpunkt in den Ursprung
      scene.add(obj);
      const r = Math.max(sz.x, sz.y, sz.z);
      cam.position.set(r * 1.6, r * 0.6, r * 1.6);
      cam.near = r / 100; cam.far = r * 100; cam.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();
    });

    const loop = () => { controls.update(); renderer.render(scene, cam); raf = requestAnimationFrame(loop); };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [piece, variant, textured, size]);

  return <div ref={host} style={{ width: size, height: size }}
    className="rounded-lg border border-zinc-700 bg-zinc-950 [&>canvas]:rounded-lg" />;
}

/** Alle Meshes im Objekt auf das gegebene Material umstellen (DoubleSide). */
function applyMeshMaterial(obj: THREE.Group, mat: THREE.Material) {
  mat.side = THREE.DoubleSide;
  obj.traverse((c) => { if ((c as THREE.Mesh).isMesh) { (c as THREE.Mesh).material = mat; } });
}
