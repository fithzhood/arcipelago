// Illustrato a mano: inchiostro e acquerello su carta. Ogni tratto è una spezzata ricampionata che
// trema con un rumore che cambia solo 8 volte al secondo (il disegno "vibra" come un cartone fatto
// a mano); le campiture sono velature d'acquerello sovrapposte, coi bordi irregolari e più scuri.
import { Base2D } from './base2d.js';
import { texGlifo } from '../glifi.js';
import { casuale, contorniIsole } from '../forme.js';

const PAL = { T: '#2f6ad0', R: '#e8781a', M: '#8a44c8', D: '#14a070', fantasma: '#9a948a', fondo: '#fbf6ea', pieno: true, bordo: '#2a2430' };
const INK = '#2a2430';
const tre = (s, i) => { const v = Math.sin(s * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v) - 0.5; };

export function crea(tela, gioco, anim) {
  let carta = null, scala = 1;
  const glifi = new Map();
  const posa = () => Math.floor(anim.tempo * 8);

  /** Ricampiona un percorso ogni `passo` pixel e lo fa tremare. */
  function trema(pts, chiuso, seme, amp, passo = 7 * scala) {
    const out = [], n = pts.length, lati = chiuso ? n : n - 1;
    let k = 0;
    for (let i = 0; i < lati; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n], L = Math.hypot(x1 - x0, y1 - y0), m = Math.max(1, Math.round(L / passo));
      for (let j = 0; j < m; j++) { const t = j / m; out.push([x0 + (x1 - x0) * t + tre(seme, k) * amp, y0 + (y1 - y0) * t + tre(seme + 7, k++) * amp]); }
    }
    if (!chiuso) out.push([pts[n - 1][0] + tre(seme, k) * amp, pts[n - 1][1] + tre(seme + 7, k) * amp]);
    return out;
  }
  function percorso(g, pts, chiuso) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (chiuso) g.closePath(); }
  function tratto(g, pts, chiuso, seme, spess = 1.5) {
    g.strokeStyle = INK; g.lineWidth = spess * scala; g.lineJoin = g.lineCap = 'round';
    percorso(g, trema(pts, chiuso, seme + posa() * 131, 1.6 * scala), chiuso); g.stroke();
  }
  function acquerello(g, pts, colore, seme, passate = 3) {
    g.save(); g.globalCompositeOperation = 'multiply';
    for (let p = 0; p < passate; p++) {
      g.globalAlpha = 0.32; g.fillStyle = colore;
      percorso(g, trema(pts, true, seme + p * 17, 4 * scala, 10 * scala), true); g.fill();
    }
    g.globalAlpha = 0.25; g.strokeStyle = colore; g.lineWidth = 2.2 * scala;
    percorso(g, trema(pts, true, seme + 5, 3 * scala, 10 * scala), true); g.stroke();
    g.restore();
  }
  const ovale = (cx, cy, rx, ry, n = 14) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * 6.283) * rx, cy + Math.sin((i / n) * 6.283) * ry]);
  const tratteggio = (g, x0, y0, w, h, seme, dens = 5) => {
    for (let x = x0 + 3 * scala; x < x0 + w; x += dens * scala) tratto(g, [[x, y0 + 2 * scala], [x - 2 * scala, y0 + h * (0.55 + tre(seme, x) * 0.5)]], false, seme + x, 0.9);
  };

  return new Base2D(tela, gioco, anim, {
    K: 0.8, HY: 0.8,
    dimensioni(b) {
      scala = tela.width / b.w;
      carta = document.createElement('canvas'); carta.width = tela.width; carta.height = tela.height;
      const c = carta.getContext('2d'), rnd = casuale(3);
      c.fillStyle = '#f3ead6'; c.fillRect(0, 0, carta.width, carta.height);
      for (let i = 0; i < carta.width * carta.height / 90; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(120,100,70,0.06)' : 'rgba(255,255,255,0.25)'; c.fillRect(rnd() * carta.width, rnd() * carta.height, 1 + rnd() * 2, 1); }
      const gr = c.createLinearGradient(0, 0, 0, carta.height); gr.addColorStop(0, 'rgba(80,150,225,0.62)'); gr.addColorStop(0.6, 'rgba(110,175,232,0.42)'); gr.addColorStop(1, 'rgba(150,200,240,0.3)');
      c.fillStyle = gr; c.fillRect(0, 0, carta.width, carta.height);
    },
    sfondo(b, g) {
      if (carta) g.drawImage(carta, 0, 0);
      // l'acquerello del prato si stende su tutta l'isola in una volta, poi la griglia a matita
      contorniIsole(gioco.liv).forEach((pol, i) => {
        const pts = pol.map(([x, z]) => b.P(x, 0, z));
        g.fillStyle = '#fbf6ea'; percorso(g, pts, true); g.fill();
        acquerello(g, pts, '#86cc5c', 50 + i, 3);
      });
      g.save(); g.strokeStyle = 'rgba(90,120,70,0.35)'; g.lineWidth = 0.9 * scala;
      for (const { x, y, c } of gioco.liv.celle) {
        if (!'#bt'.includes(c)) continue;
        const v = b.vicini(x, y), [sx, sy] = b.P(x, 0, y), T = b.T, h = T * b.K;
        g.beginPath();
        if (v.dx) { g.moveTo(sx + T / 2, sy - h / 2 + 2); g.lineTo(sx + T / 2 + tre(x, y) * 2, sy + h / 2 - 2); }
        if (v.giu) { g.moveTo(sx - T / 2 + 2, sy + h / 2); g.lineTo(sx + T / 2 - 2, sy + h / 2 + tre(y, x) * 2); }
        g.stroke();
      }
      g.restore();
    },
    isola(b, g, x, y, c, v) {
      const T = b.T, [sx, sy] = b.P(x, 0, y), h = T * b.K, X = sx - T / 2, Y = sy - h / 2, piena = c !== 'o' && c !== 'p', s = x * 97 + y * 13;
      if (!piena || !v.giu) {
        const p = T * 0.3, rnd = casuale(s);
        const sotto = [[X + T * 0.1, Y + h + p], [X + T * 0.9, Y + h + p], [sx + (rnd() - 0.5) * T * 0.3, Y + h + p + T * (0.5 + rnd() * 0.7)]];
        g.fillStyle = '#fbf6ea'; percorso(g, sotto, true); g.fill(); acquerello(g, sotto, '#b89484', s + 3, 2); tratto(g, sotto, true, s + 4, 1.2);
        const parete = [[X, Y + h], [X + T, Y + h], [X + T, Y + h + p], [X, Y + h + p]];
        g.fillStyle = '#fbf6ea'; percorso(g, parete, true); g.fill(); acquerello(g, parete, '#d8a06a', s + 1, 2); tratteggio(g, X, Y + h, T, p, s);
        tratto(g, [[X, Y + h + p], [X + T, Y + h + p]], false, s + 2, 1.3);
      }
      if (!piena) { const q = [[X, Y], [X + T, Y], [X + T, Y + h], [X, Y + h]]; g.fillStyle = '#fbf6ea'; percorso(g, q, true); g.fill(); acquerello(g, q, '#d0ac90', s, 2); }
      // contorno solo dove l'isola finisce
      if (!piena || !v.su) tratto(g, [[X, Y], [X + T, Y]], false, s + 11);
      if (!piena || !v.giu) tratto(g, [[X, Y + h], [X + T, Y + h]], false, s + 12);
      if (!piena || !v.sx) tratto(g, [[X, Y], [X, Y + h + (v.giu && piena ? 0 : T * 0.3)]], false, s + 13);
      if (!piena || !v.dx) tratto(g, [[X + T, Y], [X + T, Y + h + (v.giu && piena ? 0 : T * 0.3)]], false, s + 14);
    },
    lastra(b, g, a) {
      const f = b.forma(a, 0.45, 0.24), s = a.id * 31;
      g.globalAlpha = 1 - a.brucia;
      g.fillStyle = '#fbf6ea'; percorso(g, f.inviluppo, true); g.fill();
      acquerello(g, f.inviluppo, '#8a9eb8', s, 2);
      g.fillStyle = '#fffaf0'; percorso(g, f.sopra, true); g.fill();
      acquerello(g, f.sopra, a.alt ? '#b4c4d6' : '#c2d0e0', s + 9, 2);
      tratto(g, f.inviluppo, true, s + 1, 1.4); tratto(g, f.sopra, true, s + 2, 1.1);
      g.globalAlpha = 1;
    },
    glifo(b, g, q) {
      if (!glifi.has(q.g)) glifi.set(q.g, texGlifo({ ...q.g }, { ...PAL, fondo: '#ffffff' }).image);
      const [sx, sy] = b.P(q.g.x, q.alt, q.g.y), w = b.T * 0.74 * (1 + q.imp * 0.3), h = w * b.K;
      if (!q.g.fantasma && q.cop < 0.5) { const [ox, oy] = b.P(q.g.x + 0.12, -0.55, q.g.y + 0.18); g.save(); g.globalAlpha = 0.25; g.fillStyle = '#3a4a6a'; g.beginPath(); g.ellipse(ox, oy, w * 0.38, h * 0.38, 0, 0, 7); g.fill(); g.restore(); }
      g.save(); g.globalAlpha = q.g.fantasma ? 0.5 : 1;
      g.drawImage(glifi.get(q.g), sx - w / 2, sy - h / 2, w, h); g.restore();
      if (!q.g.fantasma) tratto(g, ovale(sx, sy, w * 0.47, h * 0.47), true, q.g.x * 7 + q.g.y, 1);
    },
    decoro(b, g, d) {
      const T = b.T, [sx, sy] = b.P(d.x, 0, d.y), s = d.x * 41 + d.y * 3;
      if (d.c === 't') {
        tratto(g, [[sx - T * 0.05, sy], [sx - T * 0.04, sy - T * 0.6]], false, s, 1.4); tratto(g, [[sx + T * 0.06, sy], [sx + T * 0.04, sy - T * 0.6]], false, s + 1, 1.4);
        const ch = ovale(sx, sy - T * 0.88, T * 0.42, T * 0.38, 18);
        acquerello(g, ch, '#5a9a52', s + 2, 3); tratto(g, ch, true, s + 3);
      }
      if (d.c === 'b' || d.c === 'o') { const p = ovale(sx, sy - T * 0.12, T * 0.3, T * 0.2, 12); acquerello(g, p, '#5a9a52', s, 2); tratto(g, p, true, s + 1, 1.2); }
      if (d.c === 'p') {
        const p = [[sx - T * 0.24, sy], [sx - T * 0.24, sy - T * 1.1], [sx + T * 0.24, sy - T * 1.1], [sx + T * 0.24, sy]];
        acquerello(g, p, '#e2d6c0', s, 1); tratteggio(g, sx + T * 0.04, sy - T * 1.1, T * 0.2, T * 1.1, s, 4); tratto(g, p, true, s + 1, 1.4);
      }
      if (d.c === 'f') {
        const t = anim.tempo, br = ovale(sx, sy + T * 0.28, T * 0.3, T * 0.1, 10);
        acquerello(g, br, '#5a4a52', s, 1); tratto(g, br, true, s + 1, 1.1);
        const hh = T * 0.55 * (1 + Math.sin(t * 9) * 0.12);
        const fi = [[sx - T * 0.14, sy + T * 0.26], [sx - T * 0.08, sy - hh * 0.4], [sx, sy - hh], [sx + T * 0.1, sy - hh * 0.4], [sx + T * 0.14, sy + T * 0.26]];
        acquerello(g, fi, '#f08040', s + 2, 2); acquerello(g, fi.map(([x, y]) => [sx + (x - sx) * 0.5, y + (sy + T * 0.26 - y) * 0.45]), '#f8c84a', s + 3, 2);
        tratto(g, fi, true, s + 4, 1.1);
      }
    },
    coniglio(b, g, c) {
      const T = b.T, [gx, gy] = b.P(c.x, 0, c.z), [sx, sy] = b.P(c.x, c.y, c.z), s = 777;
      const lato = Math.sin(c.ry), fronte = Math.cos(c.ry), dir = Math.abs(lato) > 0.3 ? Math.sign(lato) : 0, hx = dir * T * 0.1;
      if (c.y > -0.5) { g.save(); g.globalAlpha = 0.18; g.fillStyle = '#4a4060'; g.beginPath(); g.ellipse(gx, gy, T * 0.24, T * 0.08, 0, 0, 7); g.fill(); g.restore(); }
      g.save(); g.translate(sx, sy); g.rotate(c.rz); g.translate(-sx, -sy);
      for (const k of [-1, 1]) {
        const o = ovale(sx + hx + k * T * 0.07, sy - T * 0.6, T * 0.055, T * 0.17, 10);
        g.fillStyle = '#fbf6ea'; percorso(g, o, true); g.fill(); tratto(g, o, true, s + k, 1.2);
      }
      const corpo = ovale(sx, sy - T * 0.2, T * 0.22, T * 0.18, 16), testa = ovale(sx + hx, sy - T * 0.4, T * 0.15, T * 0.14, 14);
      g.fillStyle = '#fbf6ea'; percorso(g, corpo, true); g.fill(); percorso(g, testa, true); g.fill();
      acquerello(g, ovale(sx + T * 0.05, sy - T * 0.15, T * 0.15, T * 0.1, 10), '#c8d0e0', s + 5, 1);
      tratto(g, corpo, true, s + 2, 1.4); tratto(g, testa, true, s + 3, 1.4);
      if (fronte > -0.3) {
        g.fillStyle = INK;
        const occhi = dir === 0 ? [-1, 1].map((k) => sx + k * T * 0.06) : [sx + hx + dir * T * 0.07];
        for (const ox of occhi) { g.beginPath(); g.arc(ox, sy - T * 0.42, T * 0.022, 0, 7); g.fill(); }
      }
      g.restore();
    },
    scheggia(b, g, s) {
      const [sx, sy] = b.P(s.x, s.y, s.z), r = b.T * 0.05;
      tratto(g, [[sx - r, sy], [sx + r, sy - r], [sx + r * 0.5, sy + r]], true, Math.floor(s.giro * 10), 1);
    },
    nuvola(b, g, n) {
      const T = b.T, [sx, sy] = b.P(n.x, -0.4, n.z), rnd = casuale(n.seme), R = n.r * T;
      const pts = [];
      for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; pts.push([sx + Math.cos(a) * R * 1.1, sy + Math.sin(a) * R * (0.5 + rnd() * 0.25)]); }
      g.fillStyle = '#f3ead6'; percorso(g, pts, true); g.fill();
      acquerello(g, pts, '#bcd6ee', n.seme, 1);
      // contorno a riccioli
      const ricci = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], mx = (x0 + x1) / 2, my = (y0 + y1) / 2, r = Math.hypot(x1 - x0, y1 - y0) / 2;
        const a0 = Math.atan2(y0 - my, x0 - mx);
        for (let k = 0; k <= 5; k++) { const a = a0 + (k / 5) * Math.PI; ricci.push([mx + Math.cos(a) * r, my + Math.sin(a) * r * 0.8]); }
      }
      tratto(g, ricci, false, n.seme, 1.2);
    },
  });
}
