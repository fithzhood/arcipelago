// Passaggio finale: nessuno, pixel (risoluzione ridotta, colori a gradini con retino) o
// diorama (sfocatura sopra e sotto come una foto di modellino).
import * as THREE from 'three';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const PIXEL = `
uniform sampler2D tex; uniform vec2 res; varying vec2 vUv;
float bayer(vec2 p){ int x=int(mod(p.x,4.0)), y=int(mod(p.y,4.0)); int i=x+y*4;
  int m[16]=int[16](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5); return float(m[i])/16.0-0.5; }
void main(){
  vec3 c = pow(texture2D(tex, vUv).rgb, vec3(1.0/2.2));
  float lv = 7.0;
  c = floor(c*lv + 0.5 + bayer(floor(vUv*res))*0.55)/lv;
  gl_FragColor = vec4(c,1.0);
}`;

const TILT = `
uniform sampler2D tex; uniform vec2 res; varying vec2 vUv;
void main(){
  float d = smoothstep(0.10, 0.48, abs(vUv.y-0.52));
  vec2 px = 1.0/res; float r = d*5.0;
  vec3 acc = texture2D(tex, vUv).rgb; float w = 1.0;
  for(int i=0;i<16;i++){ float a = float(i)*2.39996; float rr = r*sqrt((float(i)+0.5)/16.0);
    acc += texture2D(tex, vUv + vec2(cos(a),sin(a))*rr*px).rgb; w += 1.0; }
  vec3 c = pow(acc/w, vec3(1.0/2.2));
  float l = dot(c, vec3(0.299,0.587,0.114)); c = mix(vec3(l), c, 1.22);
  c *= 1.0 - 0.25*pow(length(vUv-0.5)*1.3, 2.5);
  gl_FragColor = vec4(c,1.0);
}`;

export function creaPost(renderer, tipo) {
  if (!tipo) return { render: (s, c) => renderer.render(s, c), size() {}, dispose() {} };
  const pixel = tipo === 'pixel', scala = pixel ? 3.5 : 1;
  // la scena va nel bersaglio in lineare (mezzi float, niente gradini): il passaggio a sRGB lo fa lo shader
  const rt = new THREE.WebGLRenderTarget(2, 2, {
    type: THREE.HalfFloatType,
    samples: pixel ? 0 : 4,
    minFilter: pixel ? THREE.NearestFilter : THREE.LinearFilter,
    magFilter: pixel ? THREE.NearestFilter : THREE.LinearFilter,
  });
  const mat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: rt.texture }, res: { value: new THREE.Vector2(2, 2) } },
    vertexShader: VERT, fragmentShader: pixel ? PIXEL : TILT, depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const sq = new THREE.Scene(); sq.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    size(w, h) {
      const pr = pixel ? 1 : renderer.getPixelRatio(); // il pixel si misura in pixel dello schermo, non del dispositivo
      const W = Math.max(2, Math.floor((w * pr) / scala)), H = Math.max(2, Math.floor((h * pr) / scala));
      rt.setSize(W, H); mat.uniforms.res.value.set(W, H);
    },
    render(s, c) {
      renderer.setRenderTarget(rt); renderer.render(s, c);
      renderer.setRenderTarget(null); renderer.render(sq, cam);
    },
    dispose() { rt.dispose(); mat.dispose(); quad.geometry.dispose(); },
  };
}
