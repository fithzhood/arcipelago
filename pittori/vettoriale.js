// Vettoriale piatto: solo forme nette e colori pieni, angoli arrotondati dove l'isola finisce,
// ombre piatte e trasparenti invece delle sfumature, nuvole tagliate dritte sotto.
import { Base2D, poligono } from './base2d.js';
import { texGlifo } from '../glifi.js';
import { casuale } from '../forme.js';

const PAL = { T: '#2b6be0', R: '#f08a24', M: '#9b4fe0', D: '#13a07a', fantasma: '#9aa6b2', fondo: '#ffffff' };
const OMBRA = 'rgba(40,50,110,0.16)';

export function crea(tela, gioco, anim) {
  const glifi = new Map();
  return new Base2D(tela, gioco, anim, {
    K: 0.82, HY: 0.8,
    sfondo(b, g, W, H) {
      g.fillStyle = '#7fcbea'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#8fd4ef';
      for (const [u, v, r] of [[0.15, 0.8, 0.22], [0.85, 0.2, 0.28], [0.6, 0.95, 0.18]]) { g.beginPath(); g.arc(u * W, v * H, r * Math.max(W, H), 0, 7); g.fill(); }
    },
    isola(b, g, x, y, c, v) {
      const T = b.T, [sx, sy] = b.P(x, 0, y), h = T * b.K, X = sx - T / 2, Y = sy - h / 2;
      const piena = c !== 'o' && c !== 'p', r = T * 0.22;
      const tl = !v.su && !v.sx ? r : 0, tr = !v.su && !v.dx ? r : 0, br = !v.giu && !v.dx ? r : 0, bl = !v.giu && !v.sx ? r : 0;
      const parete = T * 0.32;
      if (!piena || !v.giu) {
        // sotto: due triangoli di roccia
        const rnd = casuale(x * 31 + y * 7), p = parete + h / 2;
        g.fillStyle = '#8a5f4a'; poligono(g, [[X + T * 0.08, sy + p], [X + T * 0.92, sy + p], [sx + T * (rnd() - 0.5) * 0.3, sy + p + T * (0.5 + rnd() * 0.6)]]); g.fill();
        g.fillStyle = '#6e4a3c'; poligono(g, [[sx, sy + p], [X + T * 0.92, sy + p], [sx + T * 0.1, sy + p + T * 0.5]]); g.fill();
        g.fillStyle = piena ? '#e0a062' : '#b88a6a'; g.beginPath(); g.roundRect(X, Y + h * 0.5, T, h / 2 + parete, [0, 0, br, bl]); g.fill();
        g.fillStyle = 'rgba(80,40,30,0.18)'; g.fillRect(X + T * 0.55, Y + h, T * 0.45 - (br ? r * 0.3 : 0), parete);
      }
      g.fillStyle = piena ? ((x + y) % 2 ? '#86cc62' : '#8fd36a') : '#c79a78';
      g.beginPath(); g.roundRect(X - 0.5, Y - 0.5, T + 1, h + 1, piena ? [tl, tr, br, bl] : r); g.fill();
    },
    lastra(b, g, a) {
      const f = b.forma(a, 0.45, 0.24);
      g.fillStyle = 'rgba(40,50,110,0.09)'; g.save(); g.translate(b.T * 0.15, b.T * 0.6); poligono(g, f.sopra); g.fill(); g.restore();
      g.globalAlpha = 1 - a.brucia;
      g.fillStyle = '#d4bc94'; poligono(g, f.inviluppo); g.fill();
      g.fillStyle = a.alt ? '#f6ecd6' : '#fdf5e4'; poligono(g, f.sopra); g.fill();
      g.globalAlpha = 1;
    },
    glifo(b, g, q) {
      if (!glifi.has(q.g)) glifi.set(q.g, texGlifo(q.g, PAL).image);
      const [sx, sy] = b.P(q.g.x, q.alt, q.g.y), w = b.T * 0.76 * (1 + q.imp * 0.3), h = w * b.K;
      g.globalAlpha = q.g.fantasma ? 0.6 : 0.7 + 0.3 * q.cop;
      g.drawImage(glifi.get(q.g), sx - w / 2, sy - h / 2, w, h);
      g.globalAlpha = 1;
    },
    decoro(b, g, d) {
      const T = b.T, [sx, sy] = b.P(d.x, 0, d.y);
      if (d.c === 't') {
        g.fillStyle = OMBRA; g.beginPath(); g.ellipse(sx + T * 0.2, sy + T * 0.08, T * 0.42, T * 0.16, 0, 0, 7); g.fill();
        g.fillStyle = '#9a6040'; g.fillRect(sx - T * 0.06, sy - T * 0.55, T * 0.12, T * 0.55);
        g.fillStyle = '#3fae6a'; g.beginPath(); g.arc(sx, sy - T * 0.85, T * 0.42, 0, 7); g.fill();
        g.save(); g.beginPath(); g.arc(sx, sy - T * 0.85, T * 0.42, 0, 7); g.clip();
        g.fillStyle = '#2f9458'; g.fillRect(sx, sy - T * 1.3, T, T); g.restore();
      }
      if (d.c === 'b' || d.c === 'o') {
        g.fillStyle = '#3fae6a'; g.beginPath(); g.arc(sx - T * 0.12, sy - T * 0.08, T * 0.2, 0, 7); g.arc(sx + T * 0.12, sy - T * 0.14, T * 0.24, 0, 7); g.fill();
        g.fillStyle = '#2f9458'; g.beginPath(); g.arc(sx + T * 0.12, sy - T * 0.14, T * 0.24, -1.2, 1.9); g.fill();
      }
      if (d.c === 'p') {
        g.fillStyle = OMBRA; g.beginPath(); g.ellipse(sx + T * 0.25, sy + T * 0.08, T * 0.36, T * 0.14, 0, 0, 7); g.fill();
        g.fillStyle = '#f0e6d6'; g.beginPath(); g.roundRect(sx - T * 0.26, sy - T * 1.15, T * 0.52, T * 1.15, T * 0.06); g.fill();
        g.fillStyle = '#d8ccb8'; g.fillRect(sx + T * 0.04, sy - T * 1.15, T * 0.22, T * 1.15);
      }
      if (d.c === 'f') {
        const t = anim.tempo;
        g.fillStyle = '#4a3a50'; g.beginPath(); g.ellipse(sx, sy + T * 0.3, T * 0.3, T * 0.1, 0, 0, 7); g.fill();
        for (const [dx, h, col, ph] of [[0, 0.55, '#ff6a2a', 0], [-0.1, 0.35, '#ffc23a', 1], [0.1, 0.38, '#ffc23a', 2]]) {
          const hh = T * h * (1 + Math.sin(t * 12 + ph) * 0.12), bx = sx + T * dx, by = sy + T * 0.28;
          g.fillStyle = col; g.beginPath(); g.moveTo(bx - T * 0.1, by); g.quadraticCurveTo(bx - T * 0.1, by - hh * 0.6, bx, by - hh); g.quadraticCurveTo(bx + T * 0.1, by - hh * 0.6, bx + T * 0.1, by); g.fill();
        }
      }
    },
    coniglio(b, g, c) {
      const T = b.T, [gx, gy] = b.P(c.x, 0, c.z), [sx, sy] = b.P(c.x, c.y, c.z);
      const lato = Math.sin(c.ry), fronte = Math.cos(c.ry), dir = Math.abs(lato) > 0.3 ? Math.sign(lato) : 0;
      if (c.y > -0.5) { g.fillStyle = OMBRA; g.beginPath(); g.ellipse(gx, gy, T * 0.24, T * 0.09, 0, 0, 7); g.fill(); }
      g.save(); g.translate(sx, sy); g.rotate(c.rz);
      const hx = dir * T * 0.1;
      g.fillStyle = '#ffffff';
      g.beginPath(); g.ellipse(0, -T * 0.2, T * 0.22, T * 0.19, 0, 0, 7); g.fill();
      for (const s of [-1, 1]) {
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(hx + s * T * 0.07, -T * 0.6, T * 0.055, T * 0.17, s * 0.15, 0, 7); g.fill();
        if (fronte > -0.3) { g.fillStyle = '#ffb0c0'; g.beginPath(); g.ellipse(hx + s * T * 0.07, -T * 0.58, T * 0.025, T * 0.11, s * 0.15, 0, 7); g.fill(); }
      }
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(hx, -T * 0.4, T * 0.15, 0, 7); g.fill();
      g.fillStyle = '#e6eaf2'; g.beginPath(); g.ellipse(T * 0.06, -T * 0.14, T * 0.15, T * 0.11, 0, 0, 7); g.fill();
      if (fronte > -0.3) {
        g.fillStyle = '#2a2a40';
        if (dir === 0) for (const s of [-1, 1]) { g.beginPath(); g.arc(s * T * 0.06, -T * 0.42, T * 0.022, 0, 7); g.fill(); }
        else { g.beginPath(); g.arc(hx + dir * T * 0.07, -T * 0.42, T * 0.022, 0, 7); g.fill(); }
        g.fillStyle = '#ff8aa0'; g.beginPath(); g.arc(hx + dir * T * 0.13, -T * 0.37, T * 0.02, 0, 7); g.fill();
      }
      g.restore();
    },
    scheggia(b, g, s) {
      const [sx, sy] = b.P(s.x, s.y, s.z), r = b.T * 0.06;
      g.fillStyle = s.tipo === 'fuoco' ? '#ff8a2a' : '#f2e4c6'; g.beginPath(); g.roundRect(sx - r, sy - r, 2 * r, 2 * r, r * 0.4); g.fill();
    },
    nuvola(b, g, n) {
      const T = b.T, [sx, sy] = b.P(n.x, -0.4, n.z), rnd = casuale(n.seme), R = n.r * T;
      g.save(); g.beginPath(); g.rect(sx - R * 2, sy - R * 2, R * 4, R * 2.1); g.clip();
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(sx + (rnd() - 0.5) * R * 1.6, sy - rnd() * R * 0.3, R * (0.45 + rnd() * 0.3), 0, 7); g.fill(); }
      g.restore();
    },
  });
}
