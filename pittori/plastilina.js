// Plastilina a passo uno: pezzi bitorzoluti, impronte di polpastrelli nella normale, luce avvolgente
// da studio. Tutto ciò che si muove si aggiorna a 12 pose al secondo, e a ogni posa la superficie
// "bolle" un poco, come se qualcuno l'avesse toccata fra uno scatto e l'altro.
// Materiale ripreso dalla demo "plastilina" dell'atlante Stili.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Base3D, pianoGlifo } from './base3d.js';
import { casuale, eIsola } from '../forme.js';
import { texGlifo } from '../glifi.js';

const PAL = { T: '#2f6ad0', R: '#e07a18', M: '#8a48c8', D: '#169a6e', fantasma: '#9aa0a6', fondo: '#fbf4e4' };

const IMPRONTE = `
varying vec3 vOP;
uniform float uPosa, uBump, uScala; uniform vec3 uSSS;
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
vec3 h33(vec3 p){ return vec3(h31(p), h31(p + 17.3), h31(p + 41.7)); }
float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float polpastrello(vec3 q, float k, float sal){
  vec3 cell = floor(q * k), f = fract(q * k);
  vec3 r = h33(cell + sal);
  float d = length((f - (0.32 + r * 0.36)) * vec3(1.0, 1.4, 1.0));
  float mask = (1.0 - smoothstep(0.10, 0.24, d)) * step(0.4, r.x);
  float fr = d * 160.0;
  float aa = 1.0 - smoothstep(0.4, 1.2, fwidth(fr));
  return mask * (sin(fr + vn3(q * 9.0) * 5.0) * 0.5 * aa * 0.45 - 0.55);
}
float impronte(vec3 p){
  vec3 q = p + (h33(vec3(uPosa, 1.3, 7.1)) - 0.5) * 0.16;
  float h = (vn3(q * 2.3) - 0.5) * 0.9 + (vn3(q * 5.3 + 3.0) - 0.5) * 0.25 + (vn3(q * 13.0) - 0.5) * 0.04;
  h += (polpastrello(q, 1.7, 0.0) + polpastrello(q + 0.37, 2.3, 5.0) * 0.8) * 0.7;
  return h * 0.028;
}
vec3 perturbaNormale(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection){
  vec3 vSigmaX = dFdx(surf_pos), vSigmaY = dFdy(surf_pos), vN = surf_norm;
  vec3 R1 = cross(vSigmaY, vN), R2 = cross(vN, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDirection;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  vec3 n = abs(fDet) * surf_norm - vGrad;
  return dot(n, n) > 1e-24 ? normalize(n) : surf_norm;
}`;
const LUCI_CERA = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
  /float dotNL = saturate\( dot\( geometryNormal, directLight\.direction \) \);\s*vec3 irradiance = dotNL \* directLight\.color;/,
  `float nl = dot( geometryNormal, directLight.direction );
  float dotNL = saturate( ( nl + 0.45 ) / 1.45 );
  float fascia = smoothstep( -0.45, 0.0, nl ) * ( 1.0 - smoothstep( 0.0, 0.5, nl ) );
  vec3 irradiance = dotNL * directLight.color * mix( vec3( 1.0 ), uSSS, fascia );
  vec3 irrSpec = saturate( nl ) * directLight.color;`).replace(
  'reflectedLight.directSpecular += irradiance *', 'reflectedLight.directSpecular += irrSpec *');

// rumore per far bitorzoli veri sulla geometria (non solo nella luce)
const hh = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function rumore(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let xf = x - xi, yf = y - yi, zf = z - zi; xf *= xf * (3 - 2 * xf); yf *= yf * (3 - 2 * yf); zf *= zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hh(xi, yi, zi), hh(xi + 1, yi, zi), xf), L(hh(xi, yi + 1, zi), hh(xi + 1, yi + 1, zi), xf), yf),
    L(L(hh(xi, yi, zi + 1), hh(xi + 1, yi, zi + 1), xf), L(hh(xi, yi + 1, zi + 1), hh(xi + 1, yi + 1, zi + 1), xf), yf), zf);
}
function bitorzola(geo, amp, scala = 3, seme = 0) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = (rumore(x * scala + seme, y * scala, z * scala) - 0.5) * amp;
    p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
  }
  return geo;
}

export function crea(renderer, gioco, anim) {
  const POSA = { value: 0 }, materiali = [];
  const argilla = (colore, opz = {}) => {
    const m = new THREE.MeshStandardMaterial({ color: colore, roughness: opz.rough ?? 0.6, metalness: 0 });
    const u = { uPosa: POSA, uBump: { value: opz.bump ?? 1 }, uScala: { value: opz.scala ?? 1.4 }, uSSS: { value: new THREE.Color(opz.sss ?? 0xffa080).multiplyScalar(1.5) } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + IMPRONTE)
        .replace('#include <lights_physical_pars_fragment>', LUCI_CERA)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { float h = impronte(vOP * uScala);
            float fronte = smoothstep(0.08, 0.4, abs(dot(normal, normalize(vViewPosition))));
            vec2 dh = vec2(dFdx(h), dFdy(h)) * uBump * fronte;
            normal = perturbaNormale(-vViewPosition, normal, dh, faceDirection); }`);
    };
    m.customProgramCacheKey = () => 'argilla';
    materiali.push(m);
    return m;
  };
  const cache = new Map();
  const A = (c, o) => { const k = c + JSON.stringify(o || {}); if (!cache.has(k)) cache.set(k, argilla(c, o)); return cache.get(k); };
  const mesh = (geo, c, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, typeof c === 'string' ? A(c) : c); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
  const palla = (r, seg = 28) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7));
  const geoS = bitorzola(palla(0.08, 10), 0.03, 9);

  // fondale dipinto: cielo da teatrino, più chiaro in basso
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 256;
  const g2 = cv.getContext('2d'), gr = g2.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#5c93d1'); gr.addColorStop(0.6, '#a9cde8'); gr.addColorStop(1, '#efe3c6');
  g2.fillStyle = gr; g2.fillRect(0, 0, 16, 256);
  const fondale = new THREE.CanvasTexture(cv); fondale.colorSpace = THREE.SRGBColorSpace;

  return new Base3D(renderer, gioco, anim, {
    cielo: fondale, coloreNebbia: '#b8d4e8', nebbia: [22, 60], pose: 12,
    luci(scene, centro) {
      scene.add(new THREE.HemisphereLight('#fff4e4', '#6a5040', 1.1));
      const s = new THREE.DirectionalLight('#ffe8cc', 2.6);
      s.position.set(centro.x - 9, 16, centro.z + 6); s.target.position.copy(centro);
      s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.radius = 6;
      Object.assign(s.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
      s.shadow.bias = -0.0005; s.shadow.normalBias = 0.03;
      scene.add(s, s.target);
      const r = new THREE.DirectionalLight('#bcd4ff', 0.7); r.position.set(centro.x + 10, 6, centro.z - 8); scene.add(r);
    },
    isole(scene, liv) {
      const rnd = casuale(17), fiamme = [];
      const verdi = ['#6fb04a', '#78b852', '#66a642'];
      for (const { x, y, c } of liv.celle) {
        if ('#bt'.includes(c)) {
          // un pezzo di plastilina per casella, appena più largo: si schiacciano l'uno contro l'altro
          scene.add(mesh(bitorzola(new RoundedBoxGeometry(1.06, 0.34, 1.06, 5, 0.12), 0.06, 2.5, x * 7 + y), verdi[(x * 3 + y * 5) % 3], x, -0.17, y));
          let d = 0; while (d < 3 && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => eIsola(liv, x + a * (d + 1), y + b * (d + 1)))) d++;
          const sotto = mesh(bitorzola(palla(0.58), 0.18, 2.2, x + y * 9), rnd() < 0.5 ? '#9a6a48' : '#8a5e40', x, -0.36 - 0.58 * (1 + d * 0.45) * 0.85, y);
          sotto.scale.set(1, 1 + d * 0.45, 1); scene.add(sotto);
          if (c === 'b') for (let i = 0; i < 3; i++) scene.add(mesh(bitorzola(palla(0.2), 0.08, 6, i), '#3f8f3a', x + (rnd() - 0.5) * 0.35, 0.16, y + (rnd() - 0.5) * 0.35));
          if (c === 't') {
            scene.add(mesh(bitorzola(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 14, 4), 0.04, 6), '#7a4e30', x, 0.3, y));
            const ch = mesh(bitorzola(palla(0.42), 0.14, 3), '#3a8f44', x, 0.85, y); ch.scale.y = 0.85; scene.add(ch);
            for (let i = 0; i < 5; i++) scene.add(mesh(palla(0.05, 10), '#e04a3a', x + Math.cos(i * 1.3) * 0.36, 0.8 + (i % 2) * 0.15, y + Math.sin(i * 1.3) * 0.36));
          }
        } else if (c === 'o' || c === 'p') {
          scene.add(mesh(bitorzola(new RoundedBoxGeometry(0.88, 0.32, 0.88, 4, 0.12), 0.06, 3, x), '#a88464', x, -0.16, y));
          const s = mesh(bitorzola(palla(0.45), 0.15, 2.5, y), '#8a5e40', x, -0.6, y); s.scale.y = 1.3; scene.add(s);
          if (c === 'o') for (let i = 0; i < 3; i++) scene.add(mesh(bitorzola(palla(0.2), 0.08, 6, i + 4), '#3f8f3a', x + (i - 1) * 0.17, 0.16, y + (i % 2) * 0.1));
          else scene.add(mesh(bitorzola(new THREE.CylinderGeometry(0.28, 0.33, 1.3, 20, 6), 0.08, 3), '#ddd2be', x, 0.65, y));
        } else if (c === 'f') {
          scene.add(mesh(bitorzola(new THREE.CylinderGeometry(0.32, 0.25, 0.16, 20, 2), 0.05, 4), '#4a3a3e', x, -0.42, y));
          for (const [dx, dz, h, col] of [[0, 0, 0.5, '#ff6a1a'], [0.12, 0.07, 0.32, '#ffc040'], [-0.11, -0.06, 0.36, '#ffc040']]) {
            const f = mesh(bitorzola(new THREE.ConeGeometry(0.13, h, 16, 4).translate(0, h / 2, 0), 0.05, 6), A(col, { sss: 0xffe060 }), x + dx, -0.36, y + dz);
            scene.add(f); fiamme.push(f);
          }
        }
      }
      return { fiamme };
    },
    lastra(a) {
      const g = new THREE.Group();
      g.add(mesh(bitorzola(new RoundedBoxGeometry(0.92, 0.26, 0.92, 4, 0.1), 0.05, 3, a.id), a.alt ? '#e6d4b0' : '#eedfbe', 0, -0.13, 0));
      const s = mesh(bitorzola(palla(0.34, 16), 0.1, 4, a.id), '#c4a07a', 0, -0.33, 0); s.scale.y = 0.75; g.add(s);
      return g;
    },
    glifo: (g) => pianoGlifo(texGlifo(g, PAL), 0.76),
    coniglio() {
      const g = new THREE.Group(), bianco = '#f6f0e8', rosa = '#f2a3ae';
      const corpo = mesh(bitorzola(palla(0.23), 0.04, 6), bianco, 0, 0.22, 0); corpo.scale.set(1, 0.92, 1.12); g.add(corpo);
      g.add(mesh(bitorzola(palla(0.17), 0.03, 7), bianco, 0, 0.45, 0.15));
      for (const s of [-1, 1]) {
        const o = new THREE.Group(); o.position.set(0.07 * s, 0.57, 0.1); o.rotation.set(-0.25, 0, 0.16 * s);
        o.add(mesh(bitorzola(new THREE.CapsuleGeometry(0.052, 0.24, 6, 12), 0.025, 8, s), bianco, 0, 0.16, 0));
        const dentro = mesh(new THREE.CapsuleGeometry(0.025, 0.17, 4, 8), rosa, 0, 0.16, 0.035); dentro.scale.z = 0.5; o.add(dentro);
        g.add(o);
        g.add(mesh(palla(0.032, 12), '#1e1a22', 0.075 * s, 0.48, 0.3));
      }
      g.add(mesh(palla(0.028, 10), rosa, 0, 0.43, 0.32));
      g.add(mesh(bitorzola(palla(0.085, 14), 0.03, 9), '#ffffff', 0, 0.24, -0.26));
      return g;
    },
    nuvola(rnd, s, profonda) {
      const g = new THREE.Group(), col = profonda ? '#c6dcef' : '#fbfbf8';
      for (let i = 0, n = 4 + Math.floor(rnd() * 3); i < n; i++) {
        const b = new THREE.Mesh(bitorzola(palla((0.5 + rnd() * 0.5) * s, 20), 0.12 * s, 2, i), A(col, { sss: 0xffffff, bump: 0.6 }));
        b.position.set((rnd() - 0.5) * 2 * s, (rnd() - 0.2) * 0.35 * s, (rnd() - 0.5) * 1.2 * s); b.scale.y = 0.62; g.add(b);
      }
      return g;
    },
    scheggia: (tipo) => new THREE.Mesh(geoS, tipo === 'fuoco' ? A('#ff7a20') : A('#eedfbe')),
    ogniFotogramma(p) { POSA.value = p.ultimaPosa; },
    dispose: () => { materiali.forEach((m) => m.dispose()); geoS.dispose(); fondale.dispose(); },
  });
}
