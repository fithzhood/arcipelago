// Ossatura comune agli stili 3D: scena, telecamera, nuvole, e ogni fotogramma copia le pose
// dell'animatore sugli oggetti. Ogni stile fornisce solo "come è fatto" ogni pezzo.
import * as THREE from 'three';
import { casuale } from '../forme.js';

export class Base3D {
  constructor(renderer, gioco, anim, cfg) {
    Object.assign(this, { r: renderer, gioco, anim, cfg });
    const liv = gioco.liv;
    this.scene = new THREE.Scene();
    const cam = cfg.camera || {};
    this.cam = { alto: cam.alto ?? 10.5, dietro: cam.dietro ?? 7.4 };
    this.camera = new THREE.PerspectiveCamera(cam.fov ?? 30, 1, 0.5, 220);
    this.centro = new THREE.Vector3(liv.W / 2 - 0.5, 0, liv.H / 2 - 0.5);
    this.scene.background = cfg.cielo instanceof THREE.Texture ? cfg.cielo : new THREE.Color(cfg.cielo);
    if (cfg.nebbia) this.scene.fog = new THREE.Fog(cfg.coloreNebbia ?? cfg.cielo, cfg.nebbia[0], cfg.nebbia[1]);
    cfg.luci(this.scene, this.centro);

    const out = cfg.isole(this.scene, liv) || {};
    this.fiamme = out.fiamme || [];

    this.celle = new Map();
    for (const a of anim.celle.values()) { const o = cfg.lastra(a); this.celle.set(a.id, o); this.scene.add(o); }
    this.glifi = anim.glifi.map((q) => { const o = cfg.glifo(q.g); this.scene.add(o); return o; });
    this.coniglio = cfg.coniglio(); this.scene.add(this.coniglio);

    // nuvole sull'inesplorato e nuvole profonde
    const rnd = casuale(23);
    this.profonde = [];
    if (cfg.nuvola) {
      for (let x = -7; x <= liv.W + 6; x += 1.1) for (let z = -7; z <= liv.H + 6; z += 1.0) {
        const fuori = Math.max(-1.6 - x, x - liv.W - 0.6, -1.6 - z, z - liv.H - 0.6);
        if (fuori < 0 || rnd() > 0.85) continue;
        const n = cfg.nuvola(rnd, Math.min(1.1, 0.42 + fuori * 0.12 + rnd() * 0.25));
        const giu = z > liv.H ? 1.2 : 0;
        n.position.set(x + (rnd() - 0.5) * 0.6, -0.9 - giu + rnd() * 0.45 + Math.min(fuori, 3) * 0.12, z + (rnd() - 0.5) * 0.6);
        this.scene.add(n);
      }
      for (let i = 0; i < 14; i++) {
        const n = cfg.nuvola(rnd, 1.3 + rnd() * 1.1, true);
        n.position.set(this.centro.x + (rnd() - 0.5) * 46, -11 - rnd() * 6, this.centro.z + (rnd() - 0.5) * 36);
        this.profonde.push(n); this.scene.add(n);
      }
    }
    this.schegge = [];
    this.post = cfg.post ? cfg.post(renderer, this) : null;
    this.ultimaPosa = -1;
  }

  /** Copia le pose dell'animatore sugli oggetti. Con `pose` (es. 12) lo fa a scatti, come il passo uno. */
  copiaPose() {
    const A = this.anim;
    if (this.cfg.pose) {
      const p = Math.floor(A.tempo * this.cfg.pose);
      if (p === this.ultimaPosa) return false;
      this.ultimaPosa = p;
    }
    for (const [id, o] of this.celle) {
      const a = A.celle.get(id);
      o.visible = a.vis;
      o.position.set(a.x, a.y, a.z); o.rotation.set(a.rx, a.ry, a.rz); o.scale.setScalar(a.s);
      this.cfg.lastraPosa?.(o, a);
    }
    const k = this.coniglio, c = A.con;
    k.visible = c.vis; k.position.set(c.x, c.y, c.z); k.rotation.set(0, c.ry, c.rz);
    this.cfg.coniglioPosa?.(k, c, A);
    A.glifi.forEach((q, i) => {
      const o = this.glifi[i], u = o.userData;
      o.position.set(q.g.x, 0.015 + q.alt, q.g.y);
      o.scale.setScalar(1 + q.imp * 0.35 - (1 - q.cop) * 0.08);
      if (u.piano) u.piano.material.opacity = q.g.fantasma ? 0.6 : this.cfg.glifiOpachi ? 1 : 0.62 + 0.38 * q.cop;
      if (u.ombra) { u.ombra.position.y = -0.55 - q.alt; u.ombra.material.opacity = (1 - q.cop) * 0.2; }
      if (u.alone) u.alone.material.opacity = 0.35 + 0.65 * q.cop + q.imp;
      if (u.luce) u.luce.intensity = 0.6 + 1.2 * q.cop + q.imp * 3;
    });
    // schegge: un oggetto per ciascuna, riusati
    while (this.schegge.length < A.schegge.length) { const s = this.cfg.scheggia('lastra'); this.scene.add(s); this.schegge.push(s); }
    this.schegge.forEach((m, i) => {
      const s = A.schegge[i];
      m.visible = !!s;
      if (!s) return;
      if (m.userData.tipo !== s.tipo) { m.material = this.cfg.scheggia(s.tipo).material; m.userData.tipo = s.tipo; }
      m.position.set(s.x, s.y, s.z); m.rotation.set(s.giro, s.giro * 0.7, 0); m.scale.setScalar(Math.max(0.01, s.vita / 0.7));
    });
    return true;
  }

  dimensioni(w, h) {
    // in verticale si allarga il campo, così la larghezza inquadrata resta quella dello schermo orizzontale
    const fov0 = this.cfg.camera?.fov ?? 30, a = w / h, rif = 1.25;
    this.camera.fov = a >= rif ? fov0 : (2 * Math.atan(Math.tan((fov0 * Math.PI) / 360) * (rif / a)) * 180) / Math.PI;
    this.camera.aspect = a; this.camera.updateProjectionMatrix(); this.post?.size(w, h); this.w = w; this.h = h; }

  rendi(dt) {
    const A = this.anim, T = A.tempo;
    this.copiaPose();
    this.fiamme.forEach((f, i) => { const s = 1 + Math.sin(T * 13 + i * 2.1) * 0.18 + Math.sin(T * 23 + i) * 0.08; f.scale.y = s; });
    this.profonde.forEach((n, i) => { n.position.x += dt * (0.12 + (i % 3) * 0.05); if (n.position.x > this.centro.x + 26) n.position.x -= 52; });
    this.cfg.ogniFotogramma?.(this, dt);
    const z = A.zoom, sx = (Math.random() - 0.5) * A.scossa, sy = (Math.random() - 0.5) * A.scossa;
    this.camera.position.set(A.mira.x + sx, this.cam.alto * z + sy, A.mira.z + this.cam.dietro * z);
    this.camera.lookAt(A.mira.x + sx, 0, A.mira.z + 0.3);
    if (this.post) this.post.render(this.scene, this.camera); else this.r.render(this.scene, this.camera);
  }

  dispose() {
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      const mm = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      mm.forEach((m) => { m.map?.dispose(); m.dispose(); });
    });
    this.post?.dispose();
    this.cfg.dispose?.();
  }
}

/** Disegno di un glifo appoggiato su un piano: lo usano quasi tutti gli stili 3D. */
export function pianoGlifo(tex, lato = 0.8) {
  const o = new THREE.Group();
  const piano = new THREE.Mesh(new THREE.PlaneGeometry(lato, lato), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  piano.rotation.x = -Math.PI / 2; piano.renderOrder = 2; piano.userData.senzaBordo = true;
  o.add(piano); o.userData.piano = piano;
  return o;
}

/** Luce di base: emisfero + sole con ombre che coprono il quadro. */
export function luciBase(scene, centro, { cielo, terra, amb, sole, forza, dir = [-0.55, 1, 0.4], mappa = 2048 }) {
  scene.add(new THREE.HemisphereLight(cielo, terra, amb));
  const s = new THREE.DirectionalLight(sole, forza);
  s.position.set(centro.x + dir[0] * 20, dir[1] * 20, centro.z + dir[2] * 20);
  s.target.position.copy(centro);
  s.castShadow = true; s.shadow.mapSize.set(mappa, mappa);
  Object.assign(s.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
  s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02;
  scene.add(s, s.target);
  return s;
}
