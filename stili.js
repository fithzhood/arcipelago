// L'elenco degli stili. Ognuno è un modulo in pittori/ con una funzione crea(...) che restituisce
// un pittore: { dimensioni(w, h), rendi(dt), dispose() }. I 3D ricevono il renderer WebGL, i 2D una tela.
export const STILI = [
  // il low poly della prima prova (pittori/lowpoly.js) è uscito dal menu per far posto all'ibrido
  { id: 'ibrido', nome: 'Ibrido', tipo: '3d', carica: () => import('./pittori/ibrido.js') },
  { id: 'pixel', nome: 'Pixel 16 bit', tipo: '2d', carica: () => import('./pittori/pixel.js') },
  { id: 'vettoriale', nome: 'Vettoriale', tipo: '2d', carica: () => import('./pittori/vettoriale.js') },
  { id: 'illustrato', nome: 'Illustrato', tipo: '2d', carica: () => import('./pittori/illustrato.js') },
  { id: 'carta', nome: 'Carta', tipo: '2d', carica: () => import('./pittori/carta.js') },
  { id: 'voxel', nome: 'Voxel', tipo: '3d', carica: () => import('./pittori/voxel.js') },
  { id: 'hd2d', nome: 'HD-2D', tipo: '3d', carica: () => import('./pittori/hd2d.js') },
  { id: 'cel', nome: 'Cel morbido', tipo: '3d', carica: () => import('./pittori/cel.js') },
  { id: 'plastilina', nome: 'Plastilina', tipo: '3d', carica: () => import('./pittori/plastilina.js') },
  { id: 'fumetto', nome: 'Linea chiara', tipo: '3d', carica: () => import('./pittori/fumetto.js') },
];
