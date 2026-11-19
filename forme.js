// Aiuti comuni a tutti gli stili: caso deterministico, contorno delle isole, vicini.

export function casuale(seme) {
  let s = seme >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const K = (x, y) => x + ',' + y;
export const eIsola = (liv, x, y) => { const c = liv.celle[y * liv.W + x]; return !!c && x >= 0 && x < liv.W && y >= 0 && y < liv.H && '#bt'.includes(c.c); };

/**
 * Il contorno di ogni isola come poligono chiuso (angoli delle caselle, in coordinate di griglia:
 * la casella x,y occupa [x-0.5, x+0.5] × [y-0.5, y+0.5]). Senso orario visto dall'alto.
 */
export function contorniIsole(liv) {
  const lati = new Map(); // inizio -> fine
  for (const { x, y } of liv.celle) {
    if (!eIsola(liv, x, y)) continue;
    const a = x - 0.5, b = x + 0.5, c = y - 0.5, d = y + 0.5;
    if (!eIsola(liv, x, y - 1)) lati.set(K(a, c), [b, c]);
    if (!eIsola(liv, x + 1, y)) lati.set(K(b, c), [b, d]);
    if (!eIsola(liv, x, y + 1)) lati.set(K(b, d), [a, d]);
    if (!eIsola(liv, x - 1, y)) lati.set(K(a, d), [a, c]);
  }
  const poligoni = [];
  while (lati.size) {
    const [k0] = lati.keys();
    const pol = [k0.split(',').map(Number)];
    let k = k0;
    while (lati.has(k)) {
      const fine = lati.get(k); lati.delete(k);
      k = K(fine[0], fine[1]);
      if (k === k0) break;
      pol.push(fine);
    }
    // via i punti in mezzo ai lati dritti
    const pulito = pol.filter((p, i) => {
      const a = pol[(i - 1 + pol.length) % pol.length], b = pol[(i + 1) % pol.length];
      return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
    });
    poligoni.push(pulito);
  }
  return poligoni;
}

/** Celle di decoro (cespugli, alberi, scogli, pilastri, fuoco) con la loro posizione. */
export function decori(liv) {
  return liv.celle.filter((c) => 'btopf'.includes(c.c));
}
