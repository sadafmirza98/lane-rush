import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vert = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

// Extract bright pixels — high threshold so only true emissives bloom
const brightFrag = `
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float knee = smoothstep(0.55, 0.88, lum);
  gl_FragColor = vec4(c * knee, 1.0);
}
`

// Separable gaussian — used twice (narrow + wide) for layered glow
const blurFrag = `
uniform sampler2D tDiffuse;
uniform vec2 dir;
uniform vec2 res;
varying vec2 vUv;
void main() {
  vec2 t = dir / res;
  vec3 c  = texture2D(tDiffuse, vUv + t*-4.0).rgb * 0.051;
      c += texture2D(tDiffuse, vUv + t*-3.0).rgb * 0.0918;
      c += texture2D(tDiffuse, vUv + t*-2.0).rgb * 0.1227;
      c += texture2D(tDiffuse, vUv + t*-1.0).rgb * 0.1353;
      c += texture2D(tDiffuse, vUv         ).rgb * 0.1461;
      c += texture2D(tDiffuse, vUv + t* 1.0).rgb * 0.1353;
      c += texture2D(tDiffuse, vUv + t* 2.0).rgb * 0.1227;
      c += texture2D(tDiffuse, vUv + t* 3.0).rgb * 0.0918;
      c += texture2D(tDiffuse, vUv + t* 4.0).rgb * 0.051;
  gl_FragColor = vec4(c, 1.0);
}
`

const compositeFrag = `
uniform sampler2D tScene;
uniform sampler2D tBloomNear;  // tight bloom
uniform sampler2D tBloomFar;   // wide bloom
uniform float bloomNear;
uniform float bloomFar;
uniform float aberration;
uniform float vigAmt;
uniform float exposure;
varying vec2 vUv;

void main() {
  vec2 uv  = vUv;
  vec2 off = (uv - 0.5) * aberration;

  // Chromatic aberration — only at edges
  float edgeMask = length(uv - 0.5) * 2.0;
  vec2 scaledOff = off * edgeMask;
  float r = texture2D(tScene, uv + scaledOff).r;
  float g = texture2D(tScene, uv            ).g;
  float b = texture2D(tScene, uv - scaledOff).b;
  vec3 col = vec3(r, g, b) * exposure;

  // Layered bloom — tight core + wide halo
  col += texture2D(tBloomNear, uv).rgb * bloomNear;
  col += texture2D(tBloomFar,  uv).rgb * bloomFar;

  // Reinhard — lifts midtones without crushing darks
  col = col / (col + vec3(0.85));

  // Gamma
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));

  // Cinematic color grade — NFS night: warm amber highlights, cool blue shadows
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  // Cool blue in deep shadows
  vec3 coolShadow = col * vec3(0.82, 0.88, 1.06);
  col = mix(coolShadow, col, smoothstep(0.0, 0.4, lum));
  // Warm amber push in highlights (streetlights)
  col.r = mix(col.r, col.r * 1.08, smoothstep(0.55, 1.0, lum));
  col.g = mix(col.g, col.g * 1.03, smoothstep(0.55, 1.0, lum));

  // Vignette — oval, soft
  vec2 vig = (uv - 0.5) * vec2(1.0, 1.28);
  float v = smoothstep(0.9, 0.3, length(vig) * vigAmt);
  col *= v;

  gl_FragColor = vec4(col, 1.0);
}
`

export default function PostFX({ speedRef }) {
  const { gl, scene, camera, size } = useThree()
  const s     = useRef(null)
  const abRef = useRef(0)

  useEffect(() => {
    const w = size.width, h = size.height
    const hw = Math.max(1, Math.floor(w / 2))
    const hh = Math.max(1, Math.floor(h / 2))
    const qw = Math.max(1, Math.floor(w / 4))
    const qh = Math.max(1, Math.floor(h / 4))
    const opt = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.UnsignedByteType }

    // Render targets
    const sceneRT   = new THREE.WebGLRenderTarget(w,  h,  opt)
    const brightRT  = new THREE.WebGLRenderTarget(hw, hh, opt)
    // Near bloom (half-res)
    const blurNH    = new THREE.WebGLRenderTarget(hw, hh, opt)
    const blurNV    = new THREE.WebGLRenderTarget(hw, hh, opt)
    // Far bloom (quarter-res — wider spread, cheaper)
    const blurFH    = new THREE.WebGLRenderTarget(qw, qh, opt)
    const blurFV    = new THREE.WebGLRenderTarget(qw, qh, opt)

    const geo = new THREE.PlaneGeometry(2, 2)

    const mk = (uniforms, frag) => new THREE.ShaderMaterial({
      uniforms, vertexShader: vert, fragmentShader: frag,
      depthTest: false, depthWrite: false,
    })

    const brightMat = mk({ tDiffuse: { value: sceneRT.texture } }, brightFrag)

    const blurNHMat = mk({ tDiffuse: { value: brightRT.texture }, dir: { value: new THREE.Vector2(1,0) }, res: { value: new THREE.Vector2(hw,hh) } }, blurFrag)
    const blurNVMat = mk({ tDiffuse: { value: blurNH.texture   }, dir: { value: new THREE.Vector2(0,1) }, res: { value: new THREE.Vector2(hw,hh) } }, blurFrag)

    const blurFHMat = mk({ tDiffuse: { value: brightRT.texture }, dir: { value: new THREE.Vector2(1,0) }, res: { value: new THREE.Vector2(qw,qh) } }, blurFrag)
    const blurFVMat = mk({ tDiffuse: { value: blurFH.texture   }, dir: { value: new THREE.Vector2(0,1) }, res: { value: new THREE.Vector2(qw,qh) } }, blurFrag)

    const compMat = mk({
      tScene:     { value: sceneRT.texture },
      tBloomNear: { value: blurNV.texture },
      tBloomFar:  { value: blurFV.texture },
      bloomNear:  { value: 0.5 },
      bloomFar:   { value: 0.28 },
      aberration: { value: 0.0 },
      vigAmt:     { value: 1.1 },
      exposure:   { value: 1.3 },
    }, compositeFrag)

    const os = new THREE.Scene()
    const oc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    s.current = {
      sceneRT, brightRT, blurNH, blurNV, blurFH, blurFV,
      bQ:  new THREE.Mesh(geo, brightMat),
      nHQ: new THREE.Mesh(geo, blurNHMat),
      nVQ: new THREE.Mesh(geo, blurNVMat),
      fHQ: new THREE.Mesh(geo, blurFHMat),
      fVQ: new THREE.Mesh(geo, blurFVMat),
      cQ:  new THREE.Mesh(geo, compMat),
      compMat, os, oc,
    }

    return () => {
      ;[sceneRT, brightRT, blurNH, blurNV, blurFH, blurFV].forEach(r => r.dispose())
      ;[brightMat, blurNHMat, blurNVMat, blurFHMat, blurFVMat, compMat, geo].forEach(r => r.dispose())
      s.current = null
    }
  }, [size])

  useFrame(() => {
    if (!s.current) return
    const { sceneRT, brightRT, blurNH, blurNV, blurFH, blurFV,
            bQ, nHQ, nVQ, fHQ, fVQ, cQ, compMat, os, oc } = s.current

    const spd = speedRef?.current ?? 0
    const targetAb = Math.max(0, (spd - 1.4) / 2.2) * 0.0035
    abRef.current += (targetAb - abRef.current) * 0.08
    compMat.uniforms.aberration.value = abRef.current

    const pass = (mesh, rt) => {
      os.add(mesh)
      gl.setRenderTarget(rt)
      gl.clear()
      gl.render(os, oc)
      os.remove(mesh)
    }

    // Scene
    gl.setRenderTarget(sceneRT); gl.clear(); gl.render(scene, camera)

    // Bright extract
    pass(bQ, brightRT)

    // Near bloom (half-res)
    pass(nHQ, blurNH)
    pass(nVQ, blurNV)

    // Far bloom (quarter-res)
    pass(fHQ, blurFH)
    pass(fVQ, blurFV)

    // Composite to screen
    os.add(cQ)
    gl.setRenderTarget(null)
    gl.clear()
    gl.render(os, oc)
    os.remove(cQ)
  }, 1)

  return null
}
