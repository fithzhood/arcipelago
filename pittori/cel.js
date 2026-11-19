// Cel morbido, alla Wind Waker: forme tonde e lisce, luce a due toni con il confine netto,
// isole in un pezzo solo col bordo smussato, contorno blu notte solo su coniglio e lastre.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Base3D, luciBase, pianoGlifo } from './base3d.js';
import { casuale, contorniIsole, eIsola } from '../forme.js';
import { texGlifo } from '../glifi.js';

const PAL = { T: '#1f6fe8', R: '#f08a00', M: '#9a3ee0', D: '#00a77a', fantasma: '#8f99a3', fondo: '#fffdf6' };
const INCHIOSTRO = '#25304e';

export function crea(renderer, gioco, anim) {
  const rampa = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 255, 255, 255, 255]), 2, 1);
  rampa.minFilter = rampa.magFilter = THREE.NearestFilter; rampa.needsUpdate = true;
  const cache = new Map();
  const mat = (c) => { if (!cache.has(c)) cache.set(c, new THREE.MeshToonMaterial({ color: c, gradientMap: rampa })); return cache.get(c); };
  const bordo = new THREE.MeshBasicMaterial({ color: INCHIOSTRO, side: THREE.BackSide });
  const mesh = (geo, c, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, typeof c === 'string' ? mat(c) : c); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
  const contorna = (radice, s = 1.06) => radice.traverse((o) => { if (o.isMesh && !o.userData.nb) { const b = new THREE.Mesh(o.geometry, bordo); b.scale.setScalar(s); b.userData.nb = true; o.add(b); } });
  const palla = (r, seg = 24) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7));
  const geoS = new THREE.SphereGeometry(0.07, 8, 6);

  return new Base3D(renderer, gioco, anim, {
    cielo: '#68c2ff', nebbia: [24, 74],
    luci: (scene, centro) => luciBase(scene, centro, { cielo: '#ffffff', terra: '#8aa0b8', amb: 1.25, sole: '#ffffff', forza: 2.6, dir: [-0.6, 1, 0.35] }),
    isole(scene, liv) {
      const rnd = casuale(9), fiamme = [];
      for (const pol of contorniIsole(liv)) {
        const forma = new THREE.Shape(pol.map(([x, z]) => new THREE.Vector2(x, -z)));
        const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelOffset: -0.1, bevelSegments: 5 });
        geo.rotateX(-Math.PI / 2); geo.translate(0, -0.42, 0);
        const isola = new THREE.Mesh(geo, [mat('#6fd14f'), mat('#c08a58')]);
        isola.castShadow = isola.receiveShadow = true; scene.add(isola);
      }
      // sotto: grosse gocce lisce, più profonde verso il centro dell'isola
      for (const { x, y, c } of liv.celle) {
        if (!'#bt'.includes(c)) continue;
        let d = 0; while (d < 4 && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => eIsola(liv, x + a * (d + 1), y + b * (d + 1)))) d++;
        const sy = 1.1 + d * 0.5;
        const g = mesh(palla(0.62), rnd() < 0.5 ? '#a87a52' : '#9a6e4a', x, -0.38 - 0.62 * sy * 0.8, y);
        g.scale.set(1, sy, 1); scene.add(g);
        if (c === 'b') for (let i = 0; i < 3; i++) scene.add(mesh(palla(0.2 + rnd() * 0.08), '#3fae3a', x + (rnd() - 0.5) * 0.4, 0.15, y + (rnd() - 0.5) * 0.4));
        if (c === 't') {
          scene.add(mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.6, 12), '#8a5a34', x, 0.3, y));
          const ch = mesh(palla(0.42), '#2f9e48', x, 0.82, y); ch.scale.set(1, 0.85, 1); scene.add(ch);
          scene.add(mesh(palla(0.26), '#43b85a', x + 0.15, 1.08, y - 0.06));
        }
      }
      for (const { x, y, c } of liv.celle) {
        if (c === 'o' || c === 'p') {
          scene.add(mesh(new RoundedBoxGeometry(0.86, 0.3, 0.86, 4, 0.1), '#b88e6a', x, -0.15, y));
          const s = mesh(palla(0.45), '#9a6e4a', x, -0.55, y); s.scale.y = 1.4; scene.add(s);
          if (c === 'o') for (let i = 0; i < 3; i++) scene.add(mesh(palla(0.2), '#3fae3a', x + (i - 1) * 0.17, 0.16, y + (i % 2) * 0.1));
          else {
            scene.add(mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.25, 24), '#e8e0d0', x, 0.62, y));
            scene.add(mesh(new RoundedBoxGeometry(0.72, 0.18, 0.72, 3, 0.06), '#e8e0d0', x, 1.3, y));
          }
        } else if (c === 'f') {
          scene.add(mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.14, 20), '#4a3a44', x, -0.42, y));
          for (const [dx, dz, h, col] of [[0, 0, 0.5, '#ff6a1a'], [0.12, 0.07, 0.32, '#ffd04a'], [-0.11, -0.06, 0.36, '#ffd04a']]) {
            const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, h, 16).translate(0, h / 2, 0), new THREE.MeshBasicMaterial({ color: col }));
            f.position.set(x + dx, -0.36, y + dz); scene.add(f); fiamme.push(f);
          }
        }
      }
      return { fiamme };
    },
    lastra(a) {
      const g = new THREE.Group();
      g.add(mesh(new RoundedBoxGeometry(0.9, 0.26, 0.9, 4, 0.08), a.alt ? '#f1e2c2' : '#f7ead0', 0, -0.13, 0));
      const s = mesh(palla(0.36, 16), '#d2b48c', 0, -0.32, 0); s.scale.y = 0.75; g.add(s);
      contorna(g, 1.05);
      return g;
    },
    glifo: (g) => pianoGlifo(texGlifo(g, PAL), 0.78),
    coniglio() {
      const g = new THREE.Group(), bianco = '#ffffff';
      const corpo = mesh(palla(0.22), bianco, 0, 0.22, 0); corpo.scale.set(1, 0.92, 1.12); g.add(corpo);
      g.add(mesh(palla(0.17), bianco, 0, 0.44, 0.15));
      for (const s of [-1, 1]) {
        const o = new THREE.Group(); o.position.set(0.07 * s, 0.56, 0.1); o.rotation.set(-0.25, 0, 0.16 * s);
        o.add(mesh(new THREE.CapsuleGeometry(0.05, 0.24, 6, 12), bianco, 0, 0.16, 0));
        g.add(o);
        const occhio = new THREE.Mesh(palla(0.035, 12), new THREE.MeshBasicMaterial({ color: INCHIOSTRO })); occhio.scale.set(0.8, 1.2, 0.6);
        occhio.position.set(0.075 * s, 0.47, 0.3); occhio.userData.nb = true; g.add(occhio);
      }
      const naso = new THREE.Mesh(palla(0.025, 10), mat('#ff8fa6')); naso.position.set(0, 0.42, 0.32); naso.userData.nb = true; g.add(naso);
      g.add(mesh(palla(0.08, 14), bianco, 0, 0.24, -0.25));
      contorna(g, 1.08);
      return g;
    },
    nuvola(rnd, s, profonda) {
      const g = new THREE.Group();
      for (let i = 0, n = 4 + Math.floor(rnd() * 3); i < n; i++) {
        const b = new THREE.Mesh(palla((0.5 + rnd() * 0.5) * s, 14), mat(profonda ? '#a9dcff' : i % 2 ? '#ffffff' : '#f6fbff'));
        b.position.set((rnd() - 0.5) * 2 * s, (rnd() - 0.2) * 0.35 * s, (rnd() - 0.5) * 1.2 * s); b.scale.y = 0.62; g.add(b);
      }
      return g;
    },
    scheggia: (tipo) => new THREE.Mesh(geoS, tipo === 'fuoco' ? mat('#ff7a20') : mat('#f1e2c2')),
    dispose: () => { cache.forEach((m) => m.dispose()); bordo.dispose(); rampa.dispose(); geoS.dispose(); },
  });
}
