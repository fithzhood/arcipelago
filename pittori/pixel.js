// Pixel art 16 bit: si disegna su una tela piccola (16 pixel per casella) e la si ingrandisce
// a scala intera senza filtro. Vista dall'alto con le pareti davanti, come i giochi d'avventura
// del Super Nintendo. Coniglio disegnato a mano, piastrelle e alberi generati a regola.
import { Base2D } from './base2d.js';
import * as S from '../sprite.js';
import { casuale } from '../forme.js';

const PAL = { T: '#2a64c8', R: '#d4780e', M: '#8a44c8', D: '#11906a', fantasma: '#8f99a3', fondo: '#fff8ea' };
const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

function nuvolaPixel(seme, r) {
  const rnd = casuale(seme), W = Math.ceil(r * 40), H = Math.ceil(r * 20), c = tela(W, H), g = c.getContext('2d');
  for (let i = 0; i < 5; i++) {
    const cx = W * (0.2 + rnd() * 0.6), cy = H * (0.45 + (rnd() - 0.5) * 0.3), rr = H * (0.25 + rnd() * 0.2);
    for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) if (x * x + y * y <= rr * rr) {
      g.fillStyle = y > rr * 0.35 ? '#c8dff0' : '#ffffff'; g.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
    }
  }
  return c;
}

export function crea(tela2d, gioco, anim) {
  const buf = tela(2, 2), bg = buf.getContext('2d');
  const erbe = [0, 1, 2, 3].map((i) => S.erba(20 + i, i % 2)), terra = S.terra(4), roccia = S.roccia(6), pietre = [S.pietra(0), S.pietra(1)];
  const albero = S.albero(), cespuglio = S.cespuglio(), pilastro = S.pilastro(), fiamme = S.fiamme(), conig = S.coniglio();
  const glifi = new Map(), nuvole = new Map();
  let scala = 3;
  const R = Math.round;
  const ombra = (g, x, y, w) => { g.fillStyle = 'rgba(20,10,40,0.35)'; for (let i = -w; i <= w; i++) if ((i + x) % 2 === 0 || Math.abs(i) < w - 1) g.fillRect(R(x + i), R(y), 1, 1); g.fillRect(R(x - w + 2), R(y + 1), 2 * w - 3, 1); };

  return new Base2D(tela2d, gioco, anim, {
    K: 1, HY: 0.55, intero: true,
    tela(b) {
      const pr = tela2d.width / b.w;
      const voluto = Math.min(b.w / 13, b.h / 9.5) * (1.45 / anim.zoom) * pr;
      scala = Math.max(1, Math.round(voluto / 16));
      const W = Math.ceil(tela2d.width / scala), H = Math.ceil(tela2d.height / scala);
      if (buf.width !== W || buf.height !== H) { buf.width = W; buf.height = H; }
      bg.imageSmoothingEnabled = false;
      return { g: bg, w: W, h: H, scala: 1 };
    },
    lato: () => 16,
    sfondo(b, g, W, H) {
      g.fillStyle = '#62ade0'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#74bce8'; for (let y = Math.floor(H * 0.55); y < H; y += 2) for (let x = (y / 2) % 2; x < W; x += 2) g.fillRect(x, y, 1, 1);
    },
    isola(b, g, x, y, c, v) {
      const [sx, sy] = b.P(x, 0, y), X = R(sx - 8), Y = R(sy - 8), piena = c !== 'o' && c !== 'p';
      g.drawImage(piena ? erbe[(x * 7 + y * 3) % 4] : roccia, X, Y);
      g.fillStyle = '#3e6a2a';
      if (piena) { if (!v.su) g.fillRect(X, Y, 16, 1); if (!v.sx) g.fillRect(X, Y, 1, 16); if (!v.dx) g.fillRect(X + 15, Y, 1, 16); }
      if (!piena || !v.giu) {
        g.drawImage(terra, 0, 0, 16, 6, X, Y + 16, 16, 6);
        g.fillStyle = '#4a3020'; g.fillRect(X, Y + 21, 16, 1);
        const n = 3 + ((x * 7 + y * 5) % 4);
        for (let k = 0; k < n; k++) { g.fillStyle = k % 2 ? '#6a584c' : '#7d6a5c'; g.fillRect(X + k + 1, Y + 22 + k * 2, 14 - 2 * k, 2); }
      }
    },
    lastra(b, g, a) {
      const [sx, sy] = b.P(a.x, a.y, a.z);
      g.save(); g.translate(R(sx), R(sy)); g.rotate(-a.ry); g.scale(a.s, a.s);
      g.fillStyle = '#3a2c3a'; g.fillRect(-8, 8, 16, 4);
      g.fillStyle = '#b39a72'; g.fillRect(-7, 8, 14, 3);
      g.fillStyle = '#7d6a5c'; g.fillRect(-5, 12, 10, 2); g.fillRect(-3, 14, 6, 2);
      if (a.brucia) g.globalAlpha = 1 - a.brucia;
      g.drawImage(pietre[a.alt], -8, -8);
      g.restore();
    },
    glifo(b, g, q) {
      if (!glifi.has(q.g)) glifi.set(q.g, S.glifo(q.g, PAL, 14));
      const [sx, sy] = b.P(q.g.x, q.alt, q.g.y), lato = 14 + (q.imp > 0.3 ? 2 : 0);
      g.globalAlpha = 0.7 + 0.3 * q.cop;
      g.drawImage(glifi.get(q.g), R(sx - lato / 2), R(sy - lato / 2), lato, lato);
      g.globalAlpha = 1;
    },
    decoro(b, g, d) {
      const [sx, sy] = b.P(d.x, 0, d.y);
      if (d.c === 't') { ombra(g, sx, sy + 4, 6); g.drawImage(albero, R(sx - 10), R(sy - 21)); }
      if (d.c === 'b' || d.c === 'o') g.drawImage(cespuglio, R(sx - 8), R(sy - 8));
      if (d.c === 'p') { ombra(g, sx, sy + 4, 5); g.drawImage(pilastro, R(sx - 6), R(sy - 22)); }
      if (d.c === 'f') {
        g.fillStyle = '#2a1e24'; g.fillRect(R(sx - 6), R(sy + 2), 12, 4); g.fillStyle = '#4a3a3e'; g.fillRect(R(sx - 5), R(sy + 2), 10, 2);
        g.drawImage(fiamme[Math.floor(anim.tempo * 8) % 3], R(sx - 6), R(sy - 11));
      }
    },
    coniglio(b, g, c) {
      const [gx, gy] = b.P(c.x, 0, c.z), [sx, sy] = b.P(c.x, c.y, c.z);
      if (c.y > -0.5) ombra(g, gx, gy + 1, 5);
      g.save(); g.translate(R(sx), R(sy)); g.rotate(c.rz);
      g.drawImage(conig[S.lato(c.ry)], -8, -14);
      g.restore();
    },
    scheggia(b, g, s) {
      const [sx, sy] = b.P(s.x, s.y, s.z);
      g.fillStyle = s.tipo === 'fuoco' ? (s.vita > 0.35 ? '#ffd04a' : '#ff6a1a') : '#ebdfc0';
      g.fillRect(R(sx), R(sy), 2, 2);
    },
    nuvola(b, g, n) {
      if (!nuvole.has(n.seme)) nuvole.set(n.seme, nuvolaPixel(n.seme, n.r));
      const c = nuvole.get(n.seme), [sx, sy] = b.P(n.x, -0.3, n.z);
      g.drawImage(c, R(sx - c.width / 2), R(sy - c.height / 2));
    },
    presenta(b) {
      const g = b.g; g.imageSmoothingEnabled = false;
      g.drawImage(buf, 0, 0, buf.width * scala, buf.height * scala);
    },
  });
}
