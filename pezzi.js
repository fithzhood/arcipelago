// I pezzi della scena, tutti procedurali: isole, lastre, glifi, coniglio, nuvole, fuoco.
import * as THREE from 'three';
import { texGlifo, coloreGlifo } from './glifi.js';

export function casuale(seme) {
  let s = seme >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Fabbrica di materiali per uno stile: flat, toon; con o senza contorno. */
export function materiali(stile) {
  const cache = new Map();
  let rampa = null;
  if (stile.mat === 'toon') {
    rampa = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1);
    rampa.minFilter = rampa.magFilter = THREE.NearestFilter; rampa.needsUpdate = true;
  }
  const mat = (col, extra = {}) => {
    const k = col + JSON.stringify(extra);
    if (!cache.has(k)) {
      const m = stile.mat === 'toon'
        ? new THREE.MeshToonMaterial({ color: col, gradientMap: rampa, ...extra })
        : new THREE.MeshStandardMaterial({ color: col, flatShading: true, roughness: 0.92, metalness: 0, ...extra });
      cache.set(k, m);
    }
    return cache.get(k);
  };
  const bordo = stile.contorno ? new THREE.MeshBasicMaterial({ color: stile.contorno, side: THREE.BackSide }) : null;
  // le nuvole restano morbide anche negli stili a facce piatte
  const nube = stile.mat === 'toon'
    ? new THREE.MeshToonMaterial({ color: stile.col.nuvola, gradientMap: rampa })
    : new THREE.MeshStandardMaterial({ color: stile.col.nuvola, roughness: 1, metalness: 0 });
  return { mat, bordo, nube, dispose() { cache.forEach((m) => m.dispose()); bordo?.dispose(); nube.dispose(); rampa?.dispose(); } };
}

function mesh(geo, m, ombra = true) {
  const o = new THREE.Mesh(geo, m);
  o.castShadow = ombra; o.receiveShadow = true;
  return o;
}

/** Contorno a scafo rovesciato: una copia nera un po' più grande, vista da dietro. */
export function contorna(radice, bordo, spessore = 1.06) {
  if (!bordo) return;
  const lista = [];
  radice.traverse((o) => { if (o.isMesh && !o.userData.senzaBordo) lista.push(o); });
  for (const o of lista) {
    const b = new THREE.Mesh(o.geometry, bordo);
    b.scale.setScalar(spessore); b.userData.senzaBordo = true; b.castShadow = false;
    o.add(b);
  }
}

export function cellaIsola(x, y, M, C, rnd) {
  const g = new THREE.Group();
  const top = mesh(new THREE.BoxGeometry(1, 0.3, 1), M.mat((x + y) % 2 ? C.erba2 : C.erba));
  top.position.y = -0.15; g.add(top);
  const h = 0.7 + rnd() * 1.3;
  const sotto = mesh(new THREE.ConeGeometry(0.66, h, 5), M.mat(rnd() < 0.5 ? C.roccia : C.roccia2));
  sotto.rotation.x = Math.PI; sotto.rotation.y = rnd() * 6;
  sotto.position.y = -0.3 - h / 2; g.add(sotto);
  g.position.set(x, 0, y);
  return g;
}

export function cespuglio(M, C, rnd) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const b = mesh(new THREE.IcosahedronGeometry(0.2 + rnd() * 0.1, 0), M.mat(C.cespuglio));
    b.position.set((rnd() - 0.5) * 0.4, 0.18 + rnd() * 0.08, (rnd() - 0.5) * 0.4); g.add(b);
  }
  return g;
}

export function albero(M, C, rnd) {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.55, 5), M.mat(C.tronco)); t.position.y = 0.27; g.add(t);
  const c1 = mesh(new THREE.IcosahedronGeometry(0.38, 0), M.mat(C.chioma)); c1.position.y = 0.75; g.add(c1);
  const c2 = mesh(new THREE.IcosahedronGeometry(0.26, 0), M.mat(C.chioma)); c2.position.set(0.12, 1.02, -0.05); c2.rotation.y = rnd() * 3; g.add(c2);
  return g;
}

export function scoglio(x, y, M, C, rnd) {
  const g = new THREE.Group();
  const top = mesh(new THREE.BoxGeometry(0.86, 0.3, 0.86), M.mat(C.roccia)); top.position.y = -0.15; g.add(top);
  const s = mesh(new THREE.ConeGeometry(0.55, 1.1, 5), M.mat(C.roccia2)); s.rotation.x = Math.PI; s.position.y = -0.85; g.add(s);
  g.add(cespuglio(M, C, rnd));
  g.position.set(x, 0, y);
  return g;
}

export function pilastro(x, y, M, C) {
  const g = new THREE.Group();
  const base = mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8), M.mat(C.roccia)); base.position.y = -0.15; g.add(base);
  const s = mesh(new THREE.ConeGeometry(0.5, 0.9, 5), M.mat(C.roccia2)); s.rotation.x = Math.PI; s.position.y = -0.75; g.add(s);
  const fusto = mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.25, 7), M.mat(C.pilastro)); fusto.position.y = 0.62; g.add(fusto);
  const cap = mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.25, 7), M.mat(C.pilastro)); cap.position.set(0.04, 1.32, 0); cap.rotation.z = 0.18; g.add(cap);
  g.position.set(x, 0, y);
  return g;
}

export function fuoco(x, y, M, C) {
  const g = new THREE.Group();
  const brace = mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.14, 6), M.mat(C.brace)); brace.position.y = -0.42; g.add(brace);
  const fiamme = [];
  [[0, 0, 0.5, C.fuoco], [0.13, 0.08, 0.34, C.fuoco2], [-0.12, -0.06, 0.38, C.fuoco2], [0.02, -0.14, 0.3, C.fuoco]].forEach(([fx, fz, h, col]) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.11, h, 5).translate(0, h / 2, 0), new THREE.MeshBasicMaterial({ color: col }));
    f.position.set(fx, -0.35, fz); f.userData.h = h; f.userData.senzaBordo = true;
    g.add(f); fiamme.push(f);
  });
  g.userData.fiamme = fiamme;
  g.position.set(x, 0, y);
  return g;
}

export function cellaLastra(M, C, alt) {
  const g = new THREE.Group();
  const top = mesh(new THREE.BoxGeometry(0.92, 0.24, 0.92), M.mat(alt ? C.lastra2 : C.lastra)); top.position.y = -0.12; g.add(top);
  const s = mesh(new THREE.ConeGeometry(0.42, 0.42, 4), M.mat(C.lastraSotto)); s.rotation.set(Math.PI, Math.PI / 4, 0); s.position.y = -0.45; g.add(s);
  return g;
}

export function glifo(g, stile) {
  const pal = stile.glifo;
  const o = new THREE.Group();
  const tex = texGlifo(g, pal);
  const piano = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 1 }));
  piano.rotation.x = -Math.PI / 2; piano.userData.senzaBordo = true; piano.renderOrder = 2;
  o.add(piano);
  o.userData.piano = piano;
  if (pal.alone && !g.fantasma) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, coloreGlifo(g, pal) + 'aa'); gr.addColorStop(1, coloreGlifo(g, pal) + '00');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const alone = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    alone.rotation.x = -Math.PI / 2; alone.position.y = -0.01; alone.userData.senzaBordo = true; alone.renderOrder = 1;
    o.add(alone); o.userData.alone = alone;
  }
  o.position.set(g.x, 0.015, g.y);
  return o;
}

export function coniglio(M, C) {
  const g = new THREE.Group();
  const corpo = mesh(new THREE.SphereGeometry(0.22, 7, 5), M.mat(C.coniglio)); corpo.scale.set(1, 0.9, 1.15); corpo.position.y = 0.22; g.add(corpo);
  const testa = mesh(new THREE.SphereGeometry(0.16, 7, 5), M.mat(C.coniglio)); testa.position.set(0, 0.42, 0.17); g.add(testa);
  const orecchie = [];
  for (const s of [-1, 1]) {
    const o = new THREE.Group(); o.position.set(0.065 * s, 0.53, 0.12); o.rotation.set(-0.25, 0, 0.18 * s);
    const est = mesh(new THREE.CapsuleGeometry(0.045, 0.24, 2, 6), M.mat(C.coniglio)); est.position.y = 0.15; o.add(est);
    const int = mesh(new THREE.CapsuleGeometry(0.022, 0.18, 2, 5), M.mat(C.orecchie), false); int.position.set(0, 0.15, 0.03); int.userData.senzaBordo = true; o.add(int);
    g.add(o); orecchie.push(o);
  }
  const coda = mesh(new THREE.IcosahedronGeometry(0.075, 0), M.mat(C.coniglio)); coda.position.set(0, 0.24, -0.25); g.add(coda);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 4), M.mat(C.occhi)); e.position.set(0.075 * s, 0.46, 0.3); e.userData.senzaBordo = true; g.add(e);
  }
  const naso = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), M.mat(C.orecchie)); naso.position.set(0, 0.4, 0.33); naso.userData.senzaBordo = true; g.add(naso);
  g.userData.orecchie = orecchie;
  return g;
}

export function nuvola(M, C, rnd, scala = 1) {
  const g = new THREE.Group();
  const m = M.nube;
  const n = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const r = (0.5 + rnd() * 0.6) * scala;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), m);
    b.position.set((rnd() - 0.5) * 2.2 * scala, (rnd() - 0.3) * 0.4 * scala, (rnd() - 0.5) * 1.4 * scala);
    b.scale.y = 0.55; b.userData.senzaBordo = true;
    g.add(b);
  }
  return g;
}
