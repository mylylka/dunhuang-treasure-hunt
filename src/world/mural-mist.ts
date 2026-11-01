import * as THREE from 'three';
/** A single transparent local layer: broad drifting wisps, never scene fog or a new light. */
export function createMuralMist(center: readonly number[], width: number, height: number) {
  const uniforms = { uTime: { value: 0 }, uAmount: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, toneMapped: false,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform float uAmount;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){
        vec2 p=vUv*vec2(4.6,5.8)-vec2(uTime*.12,uTime*.28);
        float n=noise(p)*.58+noise(p*2.1+vec2(uTime*.08,0))*.28+noise(p*4.2)*.14;
        float curl=sin(vUv.y*19.-vUv.x*6.+n*7.-uTime*1.2)*.5+.5;
        float edge=smoothstep(0.,.13,vUv.x)*smoothstep(0.,.13,1.-vUv.x)*smoothstep(0.,.13,vUv.y)*smoothstep(0.,.13,1.-vUv.y);
        float alpha=edge*uAmount*smoothstep(.22,.79,n)*(.50+curl*.5);
        gl_FragColor=vec4(mix(vec3(.84,.81,.72),vec3(1.,.96,.86),n),alpha);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width*1.04,height*1.04),material);
  mesh.name = 'mural-awakening-mist'; mesh.position.set(center[0],center[1],center[2]+.09); mesh.renderOrder = 3; mesh.visible=false;
  return { mesh,
    update(time: number, duration: number, active: boolean, reduced: boolean) {
      const t=Math.max(0,Math.min(1,time/duration));
      uniforms.uTime.value=time;
      uniforms.uAmount.value=active&&!reduced?Math.pow(Math.sin(Math.PI*t),.65)*.83:0;
      mesh.visible=uniforms.uAmount.value>.001;
    },
    inspect:()=>({visible:mesh.visible,opacity:uniforms.uAmount.value}),
  };
}
