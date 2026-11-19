// Voxel: tutto è fatto di cubetti. Le isole sono un'unica griglia di blocchi (sei per lato di casella)
// con le facce interne tolte; sotto pendono colonne di roccia lunghe quanto si è lontani dal bordo.
import * as THREE from 'three';
import { Base3D, luciBase, pianoGlifo } from './base3d.js';
import { casuale, eIsola } from '../forme.js';
import { texGlifo } from '../glifi.js';

const V = 1 / 6;
const PAL = { T: '#2a64c8', R: '#d4780e', M: '#8a44c8', D: '#11906a', fantasma: '#8f99a3', fondo: '#fff8ea' };

const FACCE = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], o: 0.86 },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], o: 0.86 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], o: 1 },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], o: 0.6 },
  { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], o: 0.93 },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], o: 0.8 },
];

/** Blocchi → una sola geometria, con le facce fra due blocchi pieni tolte. mappa: "i,j,k" → colore. */
function geoVoxel(mappa, lato, ox = 0, oy = 0, oz = 0) {
  const pos = [], nor = [], col = [], c = new THREE.Color();
  for (const [k, hex] of mappa) {
    const [i, j, l] = k.split(',').map(Number);
    c.set(hex);
    for (const f of FACCE) {
      if (mappa.has(`${i + f.n[0]},${j + f.n[1]},${l + f.n[2]}`)) continue;
      const v = f.c.map(([a, b, d]) => [ox + (i + a) * lato, oy + (j + b) * lato, oz + (l + d) * lato]);
      for (const q of [v[0], v[1], v[2], v[0], v[2], v[3]]) { pos.push(...q); nor.push(...f.n); col.push(c.r * f.o, c.g * f.o, c.b * f.o); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

const varia = (hex, rnd, q = 0.07) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, (rnd() - 0.5) * q); return '#' + c.getHexString(); };
const sfera = (m, cx, cy, cz, r, colore, rnd) => {
  for (let i = Math.floor(cx - r); i <= cx + r; i++) for (let j = Math.floor(cy - r); j <= cy + r; j++) for (let k = Math.floor(cz - r); k <= cz + r; k++)
    if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 + (k + 0.5 - cz) ** 2 <= r * r) m.set(`${i},${j},${k}`, rnd ? varia(colore, rnd) : colore);
};

export function crea(renderer, gioco, anim) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const geoS = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  const matS = { lastra: new THREE.MeshLambertMaterial({ color: '#d9cdb4' }), fuoco: new THREE.MeshBasicMaterial({ color: '#ff7a20' }) };
  const vm = (geo, m = mat) => { const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = true; return o; };

  // una lastra: piano di pietra col bordo più scuro, sotto due gradini che si stringono
  const geoLastra = [0, 1].map((alt) => {
    const m = new Map(), rnd = casuale(5 + alt);
    for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) {
      const bordo = i === 0 || k === 0 || i === 5 || k === 5;
      m.set(`${i},-1,${k}`, varia(bordo ? '#c9b893' : alt ? '#e4d6b4' : '#ecdfbf', rnd, 0.05));
      if (i > 0 && i < 5 && k > 0 && k < 5) m.set(`${i},-2,${k}`, '#a8936e');
      if (i > 1 && i < 4 && k > 1 && k < 4) m.set(`${i},-3,${k}`, '#8a7656');
    }
    return geoVoxel(m, V, -0.5, 0, -0.5);
  });

  return new Base3D(renderer, gioco, anim, {
    cielo: '#8fcdf0', nebbia: [24, 72],
    luci: (scene, centro) => luciBase(scene, centro, { cielo: '#dff2ff', terra: '#6d5a48', amb: 1.5, sole: '#fff3df', forza: 2.3, dir: [-0.5, 1, 0.55] }),
    isole(scene, liv) {
      const m = new Map(), rnd = casuale(3), fiamme = [];
      // quanto è lontana una colonna dal bordo dell'isola, in blocchi
      const piena = (i, k) => eIsola(liv, Math.floor(i / 6), Math.floor(k / 6)) && i >= 0 && k >= 0;
      const distanza = (i, k) => { let d = 0; while (d < 14 && piena(i + d, k) && piena(i - d, k) && piena(i, k + d) && piena(i, k - d)) d++; return d; };
      for (const { x, y, c } of liv.celle) {
        if ('#bt'.includes(c)) {
          for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
            const i = x * 6 + a, k = y * 6 + b;
            m.set(`${i},-1,${k}`, varia((x + y) % 2 ? '#7fbf4a' : '#8ccb52', rnd));
            m.set(`${i},-2,${k}`, varia('#8a6440', rnd));
            const fondo = 2 + Math.round(distanza(i, k) * 1.25 + rnd() * 2);
            for (let j = 3; j <= fondo; j++) m.set(`${i},${-j},${k}`, varia(j % 3 ? '#8d7b6c' : '#7b6a5d', rnd));
          }
          if (c === 'b') sfera(m, x * 6 + 3, 1.6, y * 6 + 3, 2.4, '#4f9a3c', rnd);
          if (c === 't') {
            for (let j = 0; j < 5; j++) for (const [a, b] of [[2, 2], [3, 2], [2, 3], [3, 3]]) m.set(`${x * 6 + a},${j},${y * 6 + b}`, '#7a5432');
            sfera(m, x * 6 + 3, 7.5, y * 6 + 3, 3.6, '#3f8a3c', rnd);
          }
        } else if (c === 'o' || c === 'p') {
          for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
            const i = x * 6 + a, k = y * 6 + b, r = Math.max(Math.abs(a - 2.5), Math.abs(b - 2.5));
            m.set(`${i},-1,${k}`, varia('#9a8676', rnd));
            for (let j = 2; j <= 2 + Math.round((3 - r) * 2); j++) m.set(`${i},${-j},${k}`, varia('#7b6a5d', rnd));
          }
          if (c === 'o') sfera(m, x * 6 + 3, 1.4, y * 6 + 3, 2.2, '#4f9a3c', rnd);
          else for (let j = 0; j < 8; j++) for (let a = 1; a < 5; a++) for (let b = 1; b < 5; b++)
            if (j < 7 || a + b < 6) m.set(`${x * 6 + a},${j},${y * 6 + b}`, varia('#d0c6b4', rnd));
        } else if (c === 'f') {
          for (let a = 1; a < 5; a++) for (let b = 1; b < 5; b++) m.set(`${x * 6 + a},-3,${y * 6 + b}`, (a + b) % 2 ? '#3a2e2e' : '#4a3a38');
          const fm = new THREE.MeshBasicMaterial({ color: '#ff6a1a' }), fm2 = new THREE.MeshBasicMaterial({ color: '#ffd04a' });
          for (const [dx, dz, h, mm] of [[0, 0, 0.42, fm], [0.12, 0.06, 0.28, fm2], [-0.1, -0.08, 0.3, fm2]]) {
            const f = new THREE.Mesh(new THREE.BoxGeometry(0.14, h, 0.14).translate(0, h / 2, 0), mm);
            f.position.set(x + dx, -2 * V, y + dz); scene.add(f); fiamme.push(f);
          }
        }
      }
      scene.add(vm(geoVoxel(m, V, -0.5, 0, -0.5)));
      return { fiamme };
    },
    lastra: (a) => vm(geoLastra[a.alt]),
    glifo(g) {
      // il glifo ridisegnato a 28 pixel e ingrandito senza filtro: a blocchi come il resto
      const t = texGlifo(g, PAL), cv = document.createElement('canvas'); cv.width = cv.height = 28;
      cv.getContext('2d').drawImage(t.image, 0, 0, 28, 28); t.dispose();
      const tx = new THREE.CanvasTexture(cv); tx.magFilter = tx.minFilter = THREE.NearestFilter; tx.colorSpace = THREE.SRGBColorSpace;
      return pianoGlifo(tx, 0.82);
    },
    coniglio() {
      const m = new Map();
      for (let i = -3; i <= 3; i++) for (let j = 0; j <= 5; j++) for (let k = -4; k <= 3; k++)
        if ((i / 3.2) ** 2 + ((j - 2.6) / 2.8) ** 2 + ((k + 0.5) / 3.9) ** 2 <= 1) m.set(`${i},${j},${k}`, '#f4efe6');
      sfera(m, 0.5, 6.4, 3.2, 2.6, '#f4efe6');
      for (const s of [-1, 1]) for (let j = 8; j <= 12; j++) { m.set(`${s > 0 ? 1 : -1},${j},2`, '#f4efe6'); m.set(`${s > 0 ? 1 : -1},${j},3`, j > 8 ? '#f2a8b0' : '#f4efe6'); }
      for (const s of [-2, 2]) m.set(`${s + (s > 0 ? 0 : 1)},7,5`, '#2a2230');
      m.set('0,6,5', '#f08a9a'); m.set('1,6,5', '#f08a9a');
      sfera(m, 0.5, 3, -4.6, 1.3, '#ffffff');
      const o = new THREE.Group(); o.add(vm(geoVoxel(m, 0.062, -0.031, 0, -0.031)));
      return o;
    },
    nuvola(rnd, s) {
      const m = new Map(), n = 4 + Math.floor(rnd() * 4);
      for (let q = 0; q < n; q++) sfera(m, (rnd() - 0.5) * 6 * s, (rnd() - 0.3) * 1.2, (rnd() - 0.5) * 3.5 * s, (1.3 + rnd() * 1.4) * s, rnd() < 0.5 ? '#ffffff' : '#f2f6fa');
      const o = new THREE.Mesh(geoVoxel(m, 0.32), mat);
      return o;
    },
    scheggia: (tipo) => new THREE.Mesh(geoS, matS[tipo]),
    dispose: () => { mat.dispose(); geoS.dispose(); geoLastra.forEach((g) => g.dispose()); matS.lastra.dispose(); matS.fuoco.dispose(); },
  });
}
