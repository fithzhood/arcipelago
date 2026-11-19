// Ossatura comune agli stili 2D: vista dall'alto a tre quarti (le facce davanti si vedono, quelle
// di lato no), ordine di disegno per righe, nuvole sull'inesplorato. Ogni stile fornisce solo i pennelli.
import { casuale, eIsola } from '../forme.js';

export class Base2D {
  constructor(tela, gioco, anim, cfg) {
    Object.assign(this, { tela, gioco, anim, cfg, liv: gioco.liv });
    this.g = tela.getContext('2d');
    this.K = cfg.K ?? 0.8;   // schiacciamento delle righe
    this.HY = cfg.HY ?? 0.8; // quanto sale sullo schermo un'unità di altezza
    // anello di nuvole attorno al quadro
    const rnd = casuale(23), L = this.liv;
    this.nuvole = [];
    for (let x = -6; x <= L.W + 5; x += 1.3) for (let z = -6; z <= L.H + 5; z += 1.15) {
      const fuori = Math.max(-1.4 - x, x - L.W - 0.4, -1.4 - z, z - L.H - 0.4);
      if (fuori < 0 || rnd() > 0.85) continue;
      this.nuvole.push({ x: x + (rnd() - 0.5) * 0.6, z: z + (rnd() - 0.5) * 0.6, r: Math.min(1.2, 0.55 + fuori * 0.15 + rnd() * 0.3), seme: Math.floor(rnd() * 1e6) });
    }
    this.nuvole.sort((a, b) => a.z - b.z);
    this.decori = L.celle.filter((c) => 'btopf'.includes(c.c));
    cfg.prepara?.(this);
  }

  dimensioni(w, h) { this.w = w; this.h = h; this.cfg.dimensioni?.(this, w, h); }

  /** Da coordinate del mondo a pixel della tela di disegno. */
  P(x, y, z) { return [this.ox + (x - this.cx) * this.T, this.oy + (z - this.cz) * this.T * this.K - y * this.T * this.HY]; }

  vicini(x, y) { const L = this.liv; return { su: eIsola(L, x, y - 1), giu: eIsola(L, x, y + 1), sx: eIsola(L, x - 1, y), dx: eIsola(L, x + 1, y) }; }

  /** La faccia di sopra di una casella di lastra (ruotata e rimpicciolita come dice la posa) e il suo spessore. */
  forma(a, mezzo = 0.46, spess = 0.24) {
    const co = Math.cos(-a.ry), si = Math.sin(-a.ry), h = mezzo * a.s;
    const sopra = [[-h, -h], [h, -h], [h, h], [-h, h]].map(([u, v]) => this.P(a.x + u * co - v * si, a.y, a.z + u * si + v * co));
    const sotto = sopra.map(([px, py]) => [px, py + spess * a.s * this.T * this.HY]);
    return { sopra, inviluppo: inviluppo([...sopra, ...sotto]) };
  }

  rendi() {
    const A = this.anim, cfg = this.cfg;
    const disegno = cfg.tela ? cfg.tela(this) : { g: this.g, w: this.tela.width, h: this.tela.height, scala: this.tela.width / this.w };
    const g = disegno.g, W = disegno.w, H = disegno.h;
    this.T = cfg.lato ? cfg.lato(this, disegno) : Math.min(this.w / 13, this.h / 9.5) * (1.45 / A.zoom) * disegno.scala;
    const sc = A.scossa * this.T;
    this.cx = A.mira.x; this.cz = A.mira.z + 0.4;
    this.ox = W / 2 + (Math.random() - 0.5) * sc; this.oy = H / 2 + (Math.random() - 0.5) * sc;
    if (cfg.intero) { this.ox = Math.round(this.ox); this.oy = Math.round(this.oy); }
    g.save();
    cfg.sfondo(this, g, W, H);

    // 1. il piano: isole, lastre, bracieri, ordinati per riga
    const piano = [];
    for (const { x, y, c } of this.liv.celle) if ('#bt'.includes(c) || c === 'o' || c === 'p') piano.push({ z: y, k: 0, f: () => cfg.isola(this, g, x, y, c, this.vicini(x, y)) });
    for (const a of A.celle.values()) if (a.vis) piano.push({ z: a.z + 0.01 - a.y * 0.3, k: 1, f: () => cfg.lastra(this, g, a) });
    piano.sort((p, q) => p.z - q.z || p.k - q.k);
    for (const p of piano) p.f();
    // 2. i glifi sopra il piano
    for (const q of A.glifi) cfg.glifo(this, g, q);
    // 3. le cose in piedi, per riga
    const piedi = this.decori.map((d) => ({ z: d.y, f: () => cfg.decoro(this, g, d) }));
    if (A.con.vis) piedi.push({ z: A.con.z + 0.02, f: () => cfg.coniglio(this, g, A.con) });
    piedi.sort((p, q) => p.z - q.z);
    for (const p of piedi) p.f();
    for (const s of A.schegge) cfg.scheggia(this, g, s);
    // 4. le nuvole sull'inesplorato, davanti a tutto
    for (const n of this.nuvole) cfg.nuvola(this, g, n);
    cfg.sopra?.(this, g, W, H);
    g.restore();
    cfg.presenta?.(this, disegno);
  }

  dispose() { this.cfg.dispose?.(); }
}

/** Inviluppo convesso (catena monotona). */
export function inviluppo(punti) {
  const p = punti.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const x = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const giu = [], su = [];
  for (const q of p) { while (giu.length >= 2 && x(giu[giu.length - 2], giu[giu.length - 1], q) <= 0) giu.pop(); giu.push(q); }
  for (const q of p.reverse()) { while (su.length >= 2 && x(su[su.length - 2], su[su.length - 1], q) <= 0) su.pop(); su.push(q); }
  return giu.slice(0, -1).concat(su.slice(0, -1));
}

export function poligono(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
