import { useEffect, useRef } from 'react'
import { useThree, useFrame, addEffect } from '@react-three/fiber'
import * as THREE from 'three'

/*
  PostFX — correct R3F pattern:
  R3F renders the scene normally each frame.
  We intercept AFTER that render using useFrame with priority > 0,
  copy the result, apply bloom + grade + vignette, write back to screen.
  autoClear stays true — R3F handles scene clearing.
*/

const vert = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const brightFrag = `
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float knee = smoothstep(0.5, 0.8, lum);
  gl_FragColor = vec4(c * knee, 1.0);
}
`

const blurFrag = `
uniform sampler2D tDiffuse;
uniform vec2 dir;
uniform vec2 res;
varying vec2 vUv;
void main() {
  vec2 t = dir / res;
  vec3 c  = texture2D(tDiffuse, vUv + t * -3.0).rgb * 0.0625;
      c += texture2D(tDiffuse, vUv + t * -2.0).rgb * 0.125;
      c += texture2D(tDiffuse, vUv + t * -1.0).rgb * 0.25;
      c += texture2D(tDiffuse, vUv           ).rgb * 0.25;
      c += texture2D(tDiffuse, vUv + t *  1.0).rgb * 0.25;
      c += texture2D(tDiffuse, vUv + t *  2.0).rgb * 0.125;
      c += texture2D(tDiffuse, vUv + t *  3.0).rgb * 0.0625;
  gl_FragColor = vec4(c, 1.0);
}
`

const compositeFrag = `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float bloomAmt;
uniform float aberration;
uniform float vigAmt;
varying vec2 vUv;

vec3 aces(vec3 x) {
  return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0);
}

void main() {
  vec2 uv  = vUv;
  vec2 off = (uv - 0.5) * aberration;

  float r = texture2D(tScene, uv + off).r;
  float g = texture2D(tScene, uv      ).g;
  float b = texture2D(tScene, uv - off).b;
  vec3 col = vec3(r, g, b);

  col += texture2D(tBloom, uv).rgb * bloomAmt;
  col  = aces(col * 1.05);
  col  = pow(max(col, 0.0), vec3(1.0 / 2.2));

  // Soft vignette
  vec2 vig = (uv - 0.5) * vec2(1.0, 1.35);
  col *= smoothstep(0.82, 0.28, length(vig) * vigAmt);

  gl_FragColor = vec4(col, 1.0);
}
`

export default function PostFX({ speedRef }) {
  const { gl, scene, camera, size } = useThree()
  const s = useRef(null)
  const abRef = useRef(0)

  useEffect(() => {
    const w = size.width,  h = size.height
    const hw = Math.max(1, Math.floor(w / 2))
    const hh = Math.max(1, Math.floor(h / 2))
    const opt = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.UnsignedByteType }

    const sceneRT  = new THREE.WebGLRenderTarget(w,  h,  opt)
    const brightRT = new THREE.WebGLRenderTarget(hw, hh, opt)
    const blurH    = new THREE.WebGLRenderTarget(hw, hh, opt)
    const blurV    = new THREE.WebGLRenderTarget(hw, hh, opt)
    const geo      = new THREE.PlaneGeometry(2, 2)

    const brightMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: sceneRT.texture } },
      vertexShader: vert, fragmentShader: brightFrag,
      depthTest: false, depthWrite: false,
    })
    const blurHMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: brightRT.texture },
        dir: { value: new THREE.Vector2(1, 0) },
        res: { value: new THREE.Vector2(hw, hh) },
      },
      vertexShader: vert, fragmentShader: blurFrag,
      depthTest: false, depthWrite: false,
    })
    const blurVMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: blurH.texture },
        dir: { value: new THREE.Vector2(0, 1) },
        res: { value: new THREE.Vector2(hw, hh) },
      },
      vertexShader: vert, fragmentShader: blurFrag,
      depthTest: false, depthWrite: false,
    })
    const compMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene:     { value: sceneRT.texture },
        tBloom:     { value: blurV.texture },
        bloomAmt:   { value: 0.5 },
        aberration: { value: 0.0 },
        vigAmt:     { value: 1.1 },
      },
      vertexShader: vert, fragmentShader: compositeFrag,
      depthTest: false, depthWrite: false,
    })

    const os = new THREE.Scene()
    const oc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    s.current = {
      sceneRT, brightRT, blurH, blurV,
      bQ: new THREE.Mesh(geo, brightMat),
      hQ: new THREE.Mesh(geo, blurHMat),
      vQ: new THREE.Mesh(geo, blurVMat),
      cQ: new THREE.Mesh(geo, compMat),
      compMat, os, oc,
    }

    return () => {
      [sceneRT, brightRT, blurH, blurV].forEach(r => r.dispose())
      ;[brightMat, blurHMat, blurVMat, compMat, geo].forEach(r => r.dispose())
      s.current = null
    }
  }, [size])

  // Priority 1 = runs AFTER R3F's default render (priority 0)
  useFrame(() => {
    if (!s.current) return
    const { sceneRT, brightRT, blurH, blurV, bQ, hQ, vQ, cQ, compMat, os, oc } = s.current

    // Update aberration
    const spd = speedRef?.current ?? 0
    const targetAb = Math.max(0, (spd - 1.2) / 2.2) * 0.005
    abRef.current += (targetAb - abRef.current) * 0.08
    compMat.uniforms.aberration.value = abRef.current

    // Step 1: copy current screen → sceneRT
    // R3F already rendered the scene to the default framebuffer.
    // We re-render to our RT to get a texture copy.
    gl.setRenderTarget(sceneRT)
    gl.clear()
    gl.render(scene, camera)

    // Step 2: bright extract
    os.add(bQ); gl.setRenderTarget(brightRT); gl.clear(); gl.render(os, oc); os.remove(bQ)

    // Step 3: blur H
    os.add(hQ); gl.setRenderTarget(blurH);    gl.clear(); gl.render(os, oc); os.remove(hQ)

    // Step 4: blur V
    os.add(vQ); gl.setRenderTarget(blurV);    gl.clear(); gl.render(os, oc); os.remove(vQ)

    // Step 5: composite to screen
    os.add(cQ); gl.setRenderTarget(null);     gl.clear(); gl.render(os, oc); os.remove(cQ)
  }, 1)

  return null
}
