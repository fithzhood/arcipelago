// Linea chiara, alla Moebius: campiture piatte a due toni su un cielo color carta, e la china
// che nasce da sola dove la profondità o la normale cambiano di colpo (un passaggio a parte
// rende le normali, un altro legge la profondità). Niente sfumature, grana di stampa sopra.
import * as THREE from 'three';
import { Base3D, pianoGlifo } from './base3d.js';
import { casuale } from '../forme.js';
import { texGlifo } from '../glifi.js';

const PAL = { T: '#2f5fa8', R: '#d2603a', M: '#7a4aa0', D: '#2f8a72', fantasma: '#a8a090', fondo: '#fbf3df' };
const INK = '#2a2230';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = `
uniform sampler2D tCol, tNor, tDep; uniform vec2 res; uniform float near, far, spess; uniform vec3 ink;
varying vec2 vUv;
float lin(float d){ float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 px = spess / res;
  float dc = lin(texture2D(tDep, vUv).r);
  vec3 nc = texture2D(tNor, vUv).rgb;
  float e = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 o = i == 0 ? vec2(px.x, 0.0) : i == 1 ? vec2(-px.x, 0.0) : i == 2 ? vec2(0.0, px.y) : vec2(0.0, -px.y);
    float d = lin(texture2D(tDep, vUv + o).r);
    e = max(e, smoothstep(0.025, 0.05, (d - dc) / dc));
    e = max(e, smoothstep(0.3, 0.5, length(texture2D(tNor, vUv + o).rgb - nc)));
  }
  vec3 c = pow(texture2D(tCol, vUv).rgb, vec3(1.0 / 2.2));
  c = mix(c, ink, e);
  c += (hash(floor(gl_FragCoord.xy)) - 0.5) * 0.03;
  gl_FragColor = vec4(c, 1.0);
}`;

export function postChina(renderer, base, { ink = INK, spess = 0.9 } = {}) {
  const col = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
  col.depthTexture = new THREE.DepthTexture(2, 2);
  const nor = new THREE.WebGLRenderTarget(2, 2);
  const normali = new THREE.MeshNormalMaterial();
  const mat = new THREE.ShaderMaterial({
    uniforms: { tCol: { value: col.texture }, tNor: { value: nor.texture }, tDep: { value: col.depthTexture },
      res: { value: new THREE.Vector2(2, 2) }, near: { value: 0.5 }, far: { value: 220 }, spess: { value: 1 }, ink: { value: new THREE.Color(ink) } },
    vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat), sq = new THREE.Scene(); sq.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    size(w, h) {
      const pr = renderer.getPixelRatio(), W = Math.floor(w * pr), H = Math.floor(h * pr);
      col.setSize(W, H); nor.setSize(W, H); mat.uniforms.res.value.set(W, H); mat.uniforms.spess.value = Math.max(1, pr * spess);
    },
    render(scene, camera) {
      renderer.setRenderTarget(col); renderer.render(scene, camera);
      // le normali senza i glifi (sono piani trasparenti: farebbero un quadrato di china)
      const vis = base.glifi.map((g) => g.visible); base.glifi.forEach((g) => { g.visible = false; });
      const sf = scene.background; scene.background = null; scene.overrideMaterial = normali;
      renderer.setRenderTarget(nor); renderer.setClearColor(0x8080ff, 1); renderer.clear(); renderer.render(scene, camera);
      scene.overrideMaterial = null; scene.background = sf; renderer.setClearColor(0x000000, 1);
      base.glifi.forEach((g, i) => { g.visible = vis[i]; });
      renderer.setRenderTarget(null); renderer.render(sq, cam);
    },
    dispose() { col.dispose(); col.depthTexture.dispose(); nor.dispose(); normali.dispose(); mat.dispose(); quad.geometry.dispose(); },
  };
}

export function crea(renderer, gioco, anim) {
  const rampa = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 255, 255, 255, 255]), 2, 1);
  rampa.minFilter = rampa.magFilter = THREE.NearestFilter; rampa.needsUpdate = true;
  const cache = new Map();
  const mat = (c) => { if (!cache.has(c)) cache.set(c, new THREE.MeshToonMaterial({ color: c, gradientMap: rampa })); return cache.get(c); };
  const mesh = (geo, c, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, mat(c)); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
  const geoS = new THREE.TetrahedronGeometry(0.1);

  return new Base3D(renderer, gioco, anim, {
    cielo: '#f3e6c4', nebbia: [26, 80],
    luci(scene, centro) {
      scene.add(new THREE.HemisphereLight('#ffffff', '#c0a890', 1.5));
      const s = new THREE.DirectionalLight('#ffffff', 2.2);
      s.position.set(centro.x + 12, 18, centro.z + 4); s.target.position.copy(centro);
      s.castShadow = true; s.shadow.mapSize.set(2048, 2048);
      Object.assign(s.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
      s.shadow.bias = -0.0005; scene.add(s, s.target);
    },
    isole(scene, liv) {
      const rnd = casuale(31), fiamme = [];
      for (const { x, y, c } of liv.celle) {
        if ('#bt'.includes(c) || c === 'o' || c === 'p') {
          const piccola = c === 'o' || c === 'p';
          scene.add(mesh(new THREE.BoxGeometry(piccola ? 0.86 : 1, 0.3, piccola ? 0.86 : 1), piccola ? '#e2a27a' : '#a9cf9a', x, -0.15, y));
          const h = 0.7 + rnd() * 1.3;
          const s = mesh(new THREE.CylinderGeometry(piccola ? 0.42 : 0.6, 0.05, h, 6), rnd() < 0.5 ? '#df8e68' : '#cf7c5c', x, -0.3 - h / 2, y);
          s.rotation.y = rnd() * 3; scene.add(s);
          if (c === 'b' || c === 'o') scene.add(mesh(new THREE.DodecahedronGeometry(0.28), '#5fae9c', x, 0.2, y));
          if (c === 't') {
            scene.add(mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.7, 6), '#8a5a44', x, 0.35, y));
            const ch = mesh(new THREE.SphereGeometry(0.4, 10, 8), '#5fae9c', x, 0.95, y); ch.scale.set(1, 1.25, 1); scene.add(ch);
          }
          if (c === 'p') {
            scene.add(mesh(new THREE.CylinderGeometry(0.26, 0.3, 1.3, 8), '#f1dcb4', x, 0.65, y));
            scene.add(mesh(new THREE.BoxGeometry(0.7, 0.16, 0.7), '#f1dcb4', x, 1.36, y));
          }
        } else if (c === 'f') {
          scene.add(mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.14, 8), '#5a4048', x, -0.42, y));
          for (const [dx, dz, h, col] of [[0, 0, 0.5, '#f0603a'], [0.12, 0.07, 0.32, '#ffc84a'], [-0.11, -0.06, 0.36, '#ffc84a']]) {
            const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, h, 6).translate(0, h / 2, 0), new THREE.MeshBasicMaterial({ color: col }));
            f.position.set(x + dx, -0.36, y + dz); scene.add(f); fiamme.push(f);
          }
        }
      }
      return { fiamme };
    },
    lastra(a) {
      const g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(0.92, 0.24, 0.92), a.alt ? '#f6ead0' : '#fbf1da', 0, -0.12, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.36, 0.08, 0.4, 4).rotateY(Math.PI / 4), '#d9b48c', 0, -0.44, 0));
      return g;
    },
    glifo: (g) => pianoGlifo(texGlifo(g, PAL), 0.78),
    coniglio() {
      const g = new THREE.Group(), b = '#fffaf0';
      const corpo = mesh(new THREE.SphereGeometry(0.22, 14, 10), b, 0, 0.22, 0); corpo.scale.set(1, 0.92, 1.12); g.add(corpo);
      g.add(mesh(new THREE.SphereGeometry(0.16, 14, 10), b, 0, 0.44, 0.15));
      for (const s of [-1, 1]) {
        const o = new THREE.Group(); o.position.set(0.07 * s, 0.56, 0.1); o.rotation.set(-0.25, 0, 0.16 * s);
        o.add(mesh(new THREE.CapsuleGeometry(0.05, 0.24, 3, 8), b, 0, 0.16, 0)); g.add(o);
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), new THREE.MeshBasicMaterial({ color: INK })).translateX(0.075 * s).translateY(0.47).translateZ(0.29));
      }
      g.add(mesh(new THREE.SphereGeometry(0.08, 10, 8), b, 0, 0.24, -0.25));
      return g;
    },
    nuvola(rnd, s, profonda) {
      const g = new THREE.Group();
      if (profonda) return g; // con la china farebbero solo confusione
      for (let i = 0, n = 3 + Math.floor(rnd() * 3); i < n; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry((0.55 + rnd() * 0.45) * s, 12, 8), mat(profonda ? '#e9d8b0' : '#fffaf0'));
        b.position.set((rnd() - 0.5) * 2 * s, (rnd() - 0.2) * 0.3 * s, (rnd() - 0.5) * 1.1 * s); b.scale.y = 0.55; g.add(b);
      }
      return g;
    },
    scheggia: (tipo) => new THREE.Mesh(geoS, mat(tipo === 'fuoco' ? '#f0603a' : '#f6ead0')),
    post: (r, base) => postChina(r, base),
    dispose: () => { cache.forEach((m) => m.dispose()); rampa.dispose(); geoS.dispose(); },
  });
}
