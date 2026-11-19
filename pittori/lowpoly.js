// Low poly a facce piatte: lo stile della prima prova, tenuto come riferimento.
import * as THREE from 'three';
import * as P from '../pezzi.js';
import { Base3D, luciBase } from './base3d.js';

const C = {
  erba: '#9fcf6a', erba2: '#93c460', roccia: '#a08670', roccia2: '#8a715e',
  lastra: '#eadfc6', lastra2: '#e2d5b8', lastraSotto: '#b9a688',
  cespuglio: '#5f9e4a', tronco: '#7a5638', chioma: '#4f8f48', pilastro: '#d3cabb',
  nuvola: '#ffffff', coniglio: '#f4eee6', orecchie: '#f0b4b4', occhi: '#2a2230',
  fuoco: '#ff6a1f', fuoco2: '#ffd04a', brace: '#4a3a3a',
};
const STILE = { mat: 'flat', col: C, glifo: { T: '#2763c9', R: '#d97a12', M: '#8545c8', D: '#13906a', fantasma: '#8f99a3', fondo: '#fffaf0', alone: 0 } };

export function crea(renderer, gioco, anim) {
  const M = P.materiali(STILE);
  const geoS = new THREE.BoxGeometry(0.13, 0.1, 0.13), fuocoM = new THREE.MeshBasicMaterial({ color: C.fuoco });
  return new Base3D(renderer, gioco, anim, {
    cielo: '#a9d8ef', nebbia: [22, 70],
    luci: (scene, centro) => luciBase(scene, centro, { cielo: '#d8efff', terra: '#7d6c5c', amb: 1.4, sole: '#fff1dc', forza: 2.4 }),
    isole(scene, liv) {
      const rnd = P.casuale(11), fiamme = [];
      for (const { x, y, c } of liv.celle) {
        if ('#bt'.includes(c)) {
          const i = P.cellaIsola(x, y, M, C, rnd);
          if (c === 'b') i.add(P.cespuglio(M, C, rnd));
          if (c === 't') i.add(P.albero(M, C, rnd));
          scene.add(i);
        } else if (c === 'o') scene.add(P.scoglio(x, y, M, C, rnd));
        else if (c === 'p') scene.add(P.pilastro(x, y, M, C));
        else if (c === 'f') { const f = P.fuoco(x, y, M, C); fiamme.push(...f.userData.fiamme); scene.add(f); }
      }
      return { fiamme };
    },
    lastra: (a) => P.cellaLastra(M, C, a.alt),
    glifo: (g) => P.glifo(g, STILE),
    coniglio: () => P.coniglio(M, C),
    nuvola: (rnd, s) => P.nuvola(M, C, rnd, s),
    scheggia: (tipo) => new THREE.Mesh(geoS, tipo === 'fuoco' ? fuocoM : M.mat(C.lastra)),
    dispose: () => { M.dispose(); geoS.dispose(); fuocoM.dispose(); },
  });
}
