// Regole di Arcipelago, senza grafica. Il mondo è una griglia: x verso destra, y verso il basso.
// Ogni mossa restituisce una lista di eventi che la scena trasforma in animazioni.

const K = (x, y) => x + ',' + y;
const copia = (o) => JSON.parse(JSON.stringify(o));
// Arrotondamento verso il perno sui mezzi esatti: se no l'arco "si allunga" e urta caselle che non tocca.
const arrot = (v) => Math.sign(v) * Math.round(Math.abs(v) - 1e-9);

/**
 * Mappa: '.' cielo, '#' isola, 'b' cespuglio su isola, 't' albero su isola,
 * 'o' scoglio volante con cespuglio, 'p' pilastro (muro), 'f' fuoco sospeso.
 */
export function caricaLivello(def) {
  const H = def.mappa.length, W = def.mappa[0].length;
  const liv = { W, H, celle: [], terra: new Set(), solidi: new Set(), fuoco: new Set(), glifi: new Map() };
  def.mappa.forEach((riga, y) => [...riga].forEach((c, x) => {
    liv.celle.push({ x, y, c });
    if ('#bt'.includes(c)) liv.solidi.add(K(x, y));
    if (c === '#') liv.terra.add(K(x, y));
    if ('op'.includes(c)) liv.solidi.add(K(x, y));
    if (c === 'f') liv.fuoco.add(K(x, y));
  }));
  for (const g of def.glifi) liv.glifi.set(K(g.x, g.y), g);
  let id = 0;
  liv.iniziale = {
    coniglio: { x: def.coniglio[0], y: def.coniglio[1], verso: [0, 1] },
    lastre: def.lastre.map((celle, i) => ({ id: i, celle: celle.map(([x, y]) => ({ id: id++, x, y })) })),
    caduto: false,
  };
  return liv;
}

export class Gioco {
  constructor(liv) { this.liv = liv; this.stato = copia(liv.iniziale); this.storia = []; }

  lastraIn(x, y, st = this.stato) {
    for (const l of st.lastre) for (const c of l.celle) if (c.x === x && c.y === y) return { lastra: l, cella: c };
    return null;
  }
  occupata(x, y, ignora) {
    const { W, H, solidi } = this.liv;
    if (x < 0 || y < 0 || x >= W || y >= H) return true;
    if (solidi.has(K(x, y))) return true;
    const t = this.lastraIn(x, y);
    return !!(t && t.lastra.id !== ignora);
  }
  calpestabile(x, y) {
    return this.liv.terra.has(K(x, y)) || !!this.lastraIn(x, y);
  }

  /** Un passo del coniglio. Restituisce gli eventi da animare. */
  muovi(dx, dy) {
    const st = this.stato, c = st.coniglio;
    if (st.caduto) return [];
    c.verso = [dx, dy];
    const nx = c.x + dx, ny = c.y + dy;
    if (!this.calpestabile(nx, ny)) return [{ tipo: 'urto', d: [dx, dy] }];
    this.storia.push(copia(st));
    const ev = [{ tipo: 'cammina', da: [c.x, c.y], a: [nx, ny] }];
    c.x = nx; c.y = ny;
    const sotto = this.lastraIn(nx, ny);
    const g = this.liv.glifi.get(K(nx, ny));
    if (sotto && g && !g.fantasma) ev.push({ tipo: 'glifo', x: nx, y: ny }, ...this.attiva(g, sotto.lastra, nx, ny));
    return ev;
  }

  attiva(g, lastra, px, py) {
    let ev;
    if (g.tipo === 'T') ev = this.trasla(lastra, g.d, g.n);
    else if (g.tipo === 'R') ev = this.ruota(lastra, px, py, g.giro);
    else if (g.tipo === 'M') ev = this.specchia(lastra, px, py, g.asse);
    else return [];
    if (ev[0].tipo.endsWith('-urto')) return ev;
    return ev.concat(this.brucia(lastra));
  }

  trasla(lastra, [dx, dy], n) {
    const max = n === 0 ? Infinity : n;
    let passi = 0;
    while (passi < max) {
      const ok = lastra.celle.every((c) => {
        const x0 = c.x + dx * passi, y0 = c.y + dy * passi;
        if (this.occupata(x0 + dx, y0 + dy, lastra.id)) return false;
        // In diagonale non si passa fra due spigoli se anche un solo lato è occupato.
        if (dx && dy && (this.occupata(x0 + dx, y0, lastra.id) || this.occupata(x0, y0 + dy, lastra.id))) return false;
        return true;
      });
      if (!ok) break;
      passi++;
    }
    if (passi === 0) return [{ tipo: 'trasla-urto', lastra: lastra.id, d: [dx, dy] }];
    for (const c of lastra.celle) { c.x += dx * passi; c.y += dy * passi; }
    const co = this.stato.coniglio; co.x += dx * passi; co.y += dy * passi;
    return [{ tipo: 'trasla', lastra: lastra.id, d: [dx, dy], passi }];
  }

  /** Primo angolo (radianti, col segno del giro) a cui l'arco urta qualcosa, o null. */
  arco(lastra, px, py, gradi) {
    const s = Math.sign(gradi);
    for (let a = 15; a <= Math.abs(gradi); a += 15) {
      const r = (s * a * Math.PI) / 180, co = Math.cos(r), si = Math.sin(r);
      for (const c of lastra.celle) {
        const dx = c.x - px, dy = c.y - py;
        if (this.occupata(px + arrot(dx * co - dy * si), py + arrot(dx * si + dy * co), lastra.id)) return r;
      }
    }
    return null;
  }

  ruota(lastra, px, py, giro) {
    // giro: 90 orario, -90 antiorario, 180 mezzo giro (prova prima in senso orario, poi l'altro).
    const tentativi = giro === 180 ? [180, -180] : [giro];
    let primoUrto = null;
    for (const gradi of tentativi) {
      const urto = this.arco(lastra, px, py, gradi);
      if (urto !== null) { if (primoUrto === null) primoUrto = urto; continue; }
      for (const c of lastra.celle) {
        const dx = c.x - px, dy = c.y - py;
        if (gradi === 90) { c.x = px - dy; c.y = py + dx; }
        else if (gradi === -90) { c.x = px + dy; c.y = py - dx; }
        else { c.x = px - dx; c.y = py - dy; }
      }
      const co = this.stato.coniglio, r = (gradi * Math.PI) / 180;
      const vx = co.verso[0], vy = co.verso[1];
      co.verso = [Math.round(vx * Math.cos(r) - vy * Math.sin(r)), Math.round(vx * Math.sin(r) + vy * Math.cos(r))];
      return [{ tipo: 'ruota', lastra: lastra.id, perno: [px, py], angolo: r }];
    }
    return [{ tipo: 'ruota-urto', lastra: lastra.id, perno: [px, py], angolo: primoUrto }];
  }

  specchia(lastra, px, py, asse) {
    const rifletti = (x, y) => {
      const dx = x - px, dy = y - py;
      if (asse === '|') return [px - dx, py + dy];
      if (asse === '-') return [px + dx, py - dy];
      if (asse === '\\') return [px + dy, py + dx];
      return [px - dy, py - dx]; // '/'
    };
    const mappa = lastra.celle.map((c) => ({ id: c.id, da: [c.x, c.y], a: rifletti(c.x, c.y) }));
    const libero = mappa.every((m) => !this.occupata(m.a[0], m.a[1], lastra.id));
    if (!libero) return [{ tipo: 'specchia-urto', lastra: lastra.id, perno: [px, py] }];
    mappa.forEach((m, i) => { lastra.celle[i].x = m.a[0]; lastra.celle[i].y = m.a[1]; });
    return [{ tipo: 'specchia', lastra: lastra.id, perno: [px, py], asse, mappa }];
  }

  /** Il fuoco brucia le caselle di lastra che ci si posano sopra; chi ci sta sopra cade. */
  brucia(lastra) {
    const bruciate = lastra.celle.filter((c) => this.liv.fuoco.has(K(c.x, c.y)));
    if (!bruciate.length) return [];
    lastra.celle = lastra.celle.filter((c) => !bruciate.includes(c));
    const ev = [{ tipo: 'brucia', lastra: lastra.id, celle: bruciate.map((c) => c.id) }];
    const co = this.stato.coniglio;
    if (bruciate.some((c) => c.x === co.x && c.y === co.y)) { this.stato.caduto = true; ev.push({ tipo: 'cade' }); }
    return ev;
  }

  annulla() {
    if (!this.storia.length) return false;
    this.stato = this.storia.pop();
    return true;
  }
  ricomincia() {
    this.storia.push(copia(this.stato)); // anche il reset si annulla
    this.stato = copia(this.liv.iniziale);
  }
}
