// Ibrido scelto dai giudici: la base del cel morbido (forme lisce, luce a due toni, isole smussate)
// con i contorni a china della linea chiara, calcolati dove profondità e normali cambiano di colpo.
// Le tre correzioni chieste da tutti e tre i giudici:
//  - glifi pieni: disco del colore della famiglia, segno bianco, orlo d'inchiostro, ombra sotto
//    quando galleggiano (quelli spenti restano tratteggiati e trasparenti, quindi si distinguono);
//  - coniglio bianco su lastre di pietra grigio-azzurra, con l'ombra netta sotto: non sparisce più;
//  - un cielo che si legge come aria: azzurro freddo che sfuma in foschia sotto le isole.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Base3D, luciBase, pianoGlifo } from './base3d.js';
import { postChina } from './fumetto.js';
import { casuale, contorniIsole, eIsola } from '../forme.js';
import { texGlifo } from '../glifi.js';

const INK = '#243049';
const PAL = { T: '#2f6fe0', R: '#f08a10', M: '#9a45e0', D: '#0ea57a', fantasma: '#8f9db0', fondo: '#ffffff', pieno: true, bordo: INK };

export function crea(renderer, gioco, anim) {
  const rampa = new THREE.DataTexture(new Uint8Array([125, 125, 125, 255, 255, 255, 255, 255]), 2, 1);
  rampa.minFilter = rampa.magFilter = THREE.NearestFilter; rampa.needsUpdate = true;
  const cache = new Map();
  const mat = (c) => { if (!cache.has(c)) cache.set(c, new THREE.MeshToonMaterial({ color: c, gradientMap: rampa })); return cache.get(c); };
  const mesh = (geo, c, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, typeof c === 'string' ? mat(c) : c); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
  const palla = (r, seg = 24) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7));
  const geoS = new THREE.SphereGeometry(0.07, 8, 6);
  // trame: erba dipinta (generata con Gemini), terra, roccia e pietra (disegnate da texture/prepara.py)
  const trame = [], caricatore = new THREE.TextureLoader();
  const trama = (f, rx, ry = rx) => {
    const t = caricatore.load(new URL('../texture/' + f, import.meta.url).href);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
    trame.push(t); return t;
  };
  const TR = { erba: trama('erba-dipinta.jpg', 0.5), terra: trama('terra.jpg', 0.6, 1.5), roccia: trama('roccia-strati.jpg', 2, 1), pietra: trama('pietra-lastra.jpg', 1) };
  const conTrama = (map, col = '#ffffff') => { const k = map.uuid + col; if (!cache.has(k)) cache.set(k, new THREE.MeshToonMaterial({ color: col, map, gradientMap: rampa })); return cache.get(k); };
  const ombraM = () => new THREE.MeshBasicMaterial({ color: '#1a2440', transparent: true, opacity: 0.3, depthWrite: false });
  const disco = (r) => { const o = new THREE.Mesh(new THREE.CircleGeometry(r, 24), ombraM()); o.rotation.x = -Math.PI / 2; o.userData.nb = true; return o; };

  // cielo: azzurro freddo in alto, foschia chiara in basso (dove si guarda nel vuoto sotto le isole)
  const cv = document.createElement('canvas'); cv.width = 8; cv.height = 256;
  const g2 = cv.getContext('2d'), gr = g2.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#5aa8ec'); gr.addColorStop(0.55, '#8cc8f4'); gr.addColorStop(1, '#d8eefc');
  g2.fillStyle = gr; g2.fillRect(0, 0, 8, 256);
  const fondale = new THREE.CanvasTexture(cv); fondale.colorSpace = THREE.SRGBColorSpace;

  return new Base3D(renderer, gioco, anim, {
    cielo: fondale, coloreNebbia: '#bfe0f8', nebbia: [20, 62], glifiOpachi: true,
    luci: (scene, centro) => luciBase(scene, centro, { cielo: '#ffffff', terra: '#7d93b0', amb: 1.25, sole: '#fffaf0', forza: 2.6, dir: [-0.6, 1, 0.35] }),
    isole(scene, liv) {
      const rnd = casuale(9), fiamme = [];
      for (const pol of contorniIsole(liv)) {
        const forma = new THREE.Shape(pol.map(([x, z]) => new THREE.Vector2(x, -z)));
        const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelOffset: -0.1, bevelSegments: 5 });
        geo.rotateX(-Math.PI / 2); geo.translate(0, -0.42, 0);
        const isola = new THREE.Mesh(geo, [conTrama(TR.erba), conTrama(TR.terra)]);
        isola.castShadow = isola.receiveShadow = true; scene.add(isola);
      }
      for (const { x, y, c } of liv.celle) {
        if (!'#bt'.includes(c)) continue;
        let d = 0; while (d < 4 && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => eIsola(liv, x + a * (d + 1), y + b * (d + 1)))) d++;
        const sy = 1.1 + d * 0.5;
        const g = mesh(palla(0.62), conTrama(TR.roccia, rnd() < 0.5 ? '#ffffff' : '#e6d8ca'), x, -0.38 - 0.62 * sy * 0.8, y);
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
          scene.add(mesh(new RoundedBoxGeometry(0.86, 0.3, 0.86, 4, 0.1), conTrama(TR.roccia, '#f4e6d8'), x, -0.15, y));
          const s = mesh(palla(0.45), conTrama(TR.roccia), x, -0.55, y); s.scale.y = 1.4; scene.add(s);
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
      g.add(mesh(new RoundedBoxGeometry(0.9, 0.26, 0.9, 4, 0.08), conTrama(TR.pietra, a.alt ? '#e6ecf3' : '#ffffff'), 0, -0.13, 0));
      const s = mesh(palla(0.36, 16), conTrama(TR.roccia, '#a6b2c4'), 0, -0.32, 0); s.scale.y = 0.75; g.add(s);
      return g;
    },
    glifo(g) {
      const o = pianoGlifo(texGlifo(g, PAL), 0.8);
      if (!g.fantasma) { const om = disco(0.3); om.position.set(0.12, -0.6, 0.18); o.add(om); o.userData.ombra = om; }
      return o;
    },
    coniglio() {
      const g = new THREE.Group(), bianco = '#ffffff';
      const om = disco(0.24); om.position.y = 0.012; om.material.opacity = 0.35; g.add(om); g.userData.ombra = om;
      const corpo = mesh(palla(0.24), bianco, 0, 0.24, 0); corpo.scale.set(1, 0.92, 1.12); g.add(corpo);
      g.add(mesh(palla(0.185), bianco, 0, 0.48, 0.16));
      for (const s of [-1, 1]) {
        const o = new THREE.Group(); o.position.set(0.075 * s, 0.61, 0.1); o.rotation.set(-0.25, 0, 0.16 * s);
        o.add(mesh(new THREE.CapsuleGeometry(0.055, 0.26, 6, 12), bianco, 0, 0.17, 0));
        const dentro = mesh(new THREE.CapsuleGeometry(0.026, 0.18, 4, 8), '#ff9fb2', 0, 0.17, 0.04); dentro.scale.z = 0.4; o.add(dentro);
        g.add(o);
        const occhio = new THREE.Mesh(palla(0.038, 12), new THREE.MeshBasicMaterial({ color: INK })); occhio.scale.set(0.8, 1.2, 0.6);
        occhio.position.set(0.08 * s, 0.51, 0.32); g.add(occhio);
      }
      const naso = new THREE.Mesh(palla(0.027, 10), mat('#ff8fa6')); naso.position.set(0, 0.46, 0.35); g.add(naso);
      g.add(mesh(palla(0.085, 14), bianco, 0, 0.26, -0.27));
      return g;
    },
    // l'ombra resta a terra anche quando il coniglio salta o cade
    coniglioPosa(k, c) { const o = k.userData.ombra; o.position.y = 0.012 - c.y; o.visible = c.y > -0.3; o.scale.setScalar(1 - Math.min(0.4, Math.max(0, c.y))); },
    nuvola(rnd, s, profonda) {
      const g = new THREE.Group();
      if (profonda) return g; // con la china diventano palloni in mezzo al quadro: il vuoto lo dice già la foschia
      for (let i = 0, n = 4 + Math.floor(rnd() * 3); i < n; i++) {
        const b = new THREE.Mesh(palla((0.5 + rnd() * 0.5) * s, 14), mat(profonda ? '#e4f2fc' : i % 2 ? '#ffffff' : '#f6fbff'));
        b.position.set((rnd() - 0.5) * 2 * s, (rnd() - 0.2) * 0.35 * s, (rnd() - 0.5) * 1.2 * s); b.scale.y = 0.62; g.add(b);
      }
      return g;
    },
    scheggia: (tipo) => new THREE.Mesh(geoS, tipo === 'fuoco' ? mat('#ff7a20') : mat('#c4d1df')),
    post: (r, base) => postChina(r, base, { ink: INK, spess: 1.1 }),
    dispose: () => { cache.forEach((m) => m.dispose()); rampa.dispose(); geoS.dispose(); fondale.dispose(); trame.forEach((t) => t.dispose()); },
  });
}
