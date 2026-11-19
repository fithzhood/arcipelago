// HD-2D, alla Octopath Traveler: un mondo 3D vero rivestito di piastrelle in pixel art, personaggi
// e alberi come sagome piatte sempre rivolte alla telecamera, luci calde, sfocatura da diorama.
import * as THREE from 'three';
import { Base3D, pianoGlifo } from './base3d.js';
import { casuale } from '../forme.js';
import { creaPost } from '../post.js';
import * as S from '../sprite.js';

const PAL = { T: '#2a64c8', R: '#d4780e', M: '#8a44c8', D: '#11906a', fantasma: '#8f99a3', fondo: '#fff8ea' };

const tex = (c) => { const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t; };

export function crea(renderer, gioco, anim) {
  const lam = (t, extra) => new THREE.MeshLambertMaterial({ map: t, ...extra });
  const T = { terra: tex(S.terra(3)), roccia: tex(S.roccia(5)), pietra: [tex(S.pietra(0)), tex(S.pietra(1))] };
  const erbe = [0, 1, 2, 3].map((i) => tex(S.erba(10 + i, i % 2)));
  const latoT = lam(T.terra), rocciaM = lam(T.roccia);
  const ombraM = new THREE.MeshBasicMaterial({ color: '#1a1020', transparent: true, opacity: 0.35, depthWrite: false });
  const ombra = (r) => { const o = new THREE.Mesh(new THREE.CircleGeometry(r, 16), ombraM); o.rotation.x = -Math.PI / 2; o.position.y = 0.012; return o; };
  const sagoma = (canvas, alto) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(canvas), alphaTest: 0.5 }));
    s.center.set(0.5, 0); s.scale.set(alto * canvas.width / canvas.height, alto, 1);
    return s;
  };
  const fiammeC = S.fiamme().map(tex);
  const conT = Object.fromEntries(Object.entries(S.coniglio()).map(([k, c]) => [k, tex(c)]));
  const geoS = new THREE.BoxGeometry(0.1, 0.1, 0.1);

  const cv = document.createElement('canvas'); cv.width = 8; cv.height = 128;
  const g2 = cv.getContext('2d'), gr = g2.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#2c3a78'); gr.addColorStop(0.55, '#c07a8a'); gr.addColorStop(1, '#ffcf96');
  g2.fillStyle = gr; g2.fillRect(0, 0, 8, 128);
  const fondale = new THREE.CanvasTexture(cv); fondale.colorSpace = THREE.SRGBColorSpace;

  return new Base3D(renderer, gioco, anim, {
    cielo: fondale, coloreNebbia: '#c88a8a', nebbia: [14, 46],
    camera: { alto: 6.6, dietro: 8.6, fov: 28 },
    luci(scene, centro) {
      scene.add(new THREE.HemisphereLight('#9aa8ff', '#5a3a40', 1.3));
      const s = new THREE.DirectionalLight('#ffd2a0', 2.6);
      s.position.set(centro.x - 14, 9, centro.z - 6); s.target.position.copy(centro);
      s.castShadow = true; s.shadow.mapSize.set(2048, 2048);
      Object.assign(s.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
      s.shadow.bias = -0.0006; s.shadow.normalBias = 0.02; scene.add(s, s.target);
    },
    isole(scene, liv) {
      const rnd = casuale(13), fiamme = [];
      for (const { x, y, c } of liv.celle) {
        const fissa = (o) => { o.position.set(x, 0, y); scene.add(o); };
        if ('#bt'.includes(c) || c === 'o' || c === 'p') {
          const piena = '#bt'.includes(c);
          const top = piena ? lam(erbe[(x * 7 + y * 3) % 4]) : rocciaM;
          const b = new THREE.Mesh(new THREE.BoxGeometry(piena ? 1 : 0.86, 0.3, piena ? 1 : 0.86), [latoT, latoT, top, latoT, latoT, latoT]);
          b.position.set(x, -0.15, y); b.castShadow = b.receiveShadow = true; scene.add(b);
          const h = 0.6 + rnd() * 1.2;
          const s = new THREE.Mesh(new THREE.ConeGeometry(piena ? 0.62 : 0.45, h, 4), rocciaM);
          s.rotation.set(Math.PI, Math.PI / 4 + rnd() * 0.3, 0); s.position.set(x, -0.3 - h / 2, y); s.castShadow = true; scene.add(s);
          if (c === 't') { const g = new THREE.Group(); g.add(ombra(0.38), sagoma(S.albero(), 1.25)); fissa(g); }
          if (c === 'b' || c === 'o') { const g = new THREE.Group(); g.add(ombra(0.3), sagoma(S.cespuglio(), 0.5)); fissa(g); }
          if (c === 'p') { const g = new THREE.Group(); g.add(ombra(0.32), sagoma(S.pilastro(), 1.4)); fissa(g); }
        } else if (c === 'f') {
          const br = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.14, 8), new THREE.MeshLambertMaterial({ color: '#3a2a30' }));
          br.position.set(x, -0.42, y); scene.add(br);
          const f = sagoma(fiammeC[0], 0.55); f.position.set(x, -0.36, y); f.userData.fotogrammi = true; scene.add(f); fiamme.push(f);
          const l = new THREE.PointLight('#ff8a3a', 3, 4, 1.4); l.position.set(x, 0.3, y); scene.add(l);
        }
      }
      return { fiamme };
    },
    lastra(a) {
      const g = new THREE.Group(), top = lam(T.pietra[a.alt]), lato = new THREE.MeshLambertMaterial({ color: '#b8a27c' });
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.24, 0.94), [lato, lato, top, lato, lato, lato]);
      b.position.y = -0.12; b.castShadow = b.receiveShadow = true; g.add(b);
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.4, 4), rocciaM); s.rotation.set(Math.PI, Math.PI / 4, 0); s.position.y = -0.44; g.add(s);
      return g;
    },
    glifo(g) {
      const o = pianoGlifo(tex(S.glifo(g, PAL, 16)), 0.8);
      if (!g.fantasma) { const l = new THREE.PointLight(g.tipo === 'R' ? '#ffb060' : g.tipo === 'M' ? '#c890ff' : '#80c8ff', 0.8, 2.2, 1.6); l.position.y = 0.4; o.add(l); o.userData.luce = l; }
      return o;
    },
    coniglio() {
      const g = new THREE.Group(), s = new THREE.Sprite(new THREE.SpriteMaterial({ map: conT.giu, alphaTest: 0.5 }));
      s.center.set(0.5, 0.05); s.scale.set(0.68, 0.68, 1);
      g.add(ombra(0.24), s); g.userData.sagoma = s;
      return g;
    },
    coniglioPosa(k, c) {
      const s = k.userData.sagoma; s.material.map = conT[S.lato(c.ry)]; s.material.rotation = c.rz;
      k.rotation.set(0, 0, 0); // la sagoma guarda sempre la telecamera; il lato lo sceglie la tessera
    },
    nuvola(rnd, sc, profonda) {
      const c = document.createElement('canvas'); c.width = 40; c.height = 18; const g = c.getContext('2d');
      for (let i = 0; i < 5; i++) {
        const cx = 8 + rnd() * 24, cy = 9 + (rnd() - 0.5) * 4, r = 5 + rnd() * 3;
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) {
          g.fillStyle = y > r * 0.3 ? (profonda ? '#c890a8' : '#f0d8e0') : profonda ? '#e0b0c0' : '#fff4f4';
          g.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
        }
      }
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), alphaTest: 0.5, fog: true }));
      s.scale.set(3.4 * sc, 1.5 * sc, 1);
      return s;
    },
    scheggia: (tipo) => new THREE.Mesh(geoS, new THREE.MeshBasicMaterial({ color: tipo === 'fuoco' ? '#ff8a30' : '#ebdfc0' })),
    ogniFotogramma(p) {
      const f = Math.floor(p.anim.tempo * 8) % 3;
      p.fiamme.forEach((s) => { s.scale.set(0.47, 0.55, 1); s.material.map = fiammeC[f]; });
    },
    post: (r) => creaPost(r, 'tilt'),
    dispose: () => { [T.terra, T.roccia, ...T.pietra, ...erbe, ...fiammeC, ...Object.values(conT), fondale].forEach((t) => t.dispose()); geoS.dispose(); ombraM.dispose(); },
  });
}
