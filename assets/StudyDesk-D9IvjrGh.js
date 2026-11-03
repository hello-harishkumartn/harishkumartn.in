const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/Effects-CYh-0Rna.js","assets/events-e51d7528.esm-BXO5kNqJ.js","assets/jsx-runtime-Wy9s6hX0.js","assets/index-DdT-mwqi.js","assets/index-ClGzi07o.css","assets/dist-CrpU2bwW.js","assets/Physics-0qhMooGG.js","assets/react-three-rapier.esm-B7902_Px.js","assets/Globe-LdVvyT4T.js"])))=>i.map(i=>d[i]);
import{a as e,c as t,d as n,f as r,h as i,i as a,l as o,n as s,o as c,p as l,s as u,t as d,u as f}from"./Globe-LdVvyT4T.js";import{a as p,i as m,n as h,t as g}from"./jsx-runtime-Wy9s6hX0.js";import{D as _,Dt as v,E as y,Et as b,F as x,Ht as S,M as C,Mt as w,Sn as T,en as E,h as D,jt as O,kt as k,rn as ee,rt as A,tn as j,u as M,vn as N,y as P}from"./events-e51d7528.esm-BXO5kNqJ.js";import{a as F,i as I,o as L,r as R}from"./index-DdT-mwqi.js";var te={uniforms:{tDiffuse:{value:null},h:{value:1/512}},vertexShader:`
      varying vec2 vUv;

      void main() {

        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

      }
  `,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float h;

    varying vec2 vUv;

    void main() {

    	vec4 sum = vec4( 0.0 );

    	sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;

    	gl_FragColor = sum;

    }
  `},ne={uniforms:{tDiffuse:{value:null},v:{value:1/512}},vertexShader:`
    varying vec2 vUv;

    void main() {

      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    }
  `,fragmentShader:`

  uniform sampler2D tDiffuse;
  uniform float v;

  varying vec2 vUv;

  void main() {

    vec4 sum = vec4( 0.0 );

    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;

    gl_FragColor = sum;

  }
  `},z=p(h()),re=({focus:e=0,size:t=25,samples:n=10},r)=>{let i=r?`unpackRGBAToDepth( texture2D( shadowMap, uv + offset ) )`:`texture2D( shadowMap, uv + offset ).r`;return`
#define PENUMBRA_FILTER_SIZE float(${t})
#define RGB_NOISE_FUNCTION(uv) (randRGB(uv))
vec3 randRGB(vec2 uv) {
  return vec3(
    fract(sin(dot(uv, vec2(12.75613, 38.12123))) * 13234.76575),
    fract(sin(dot(uv, vec2(19.45531, 58.46547))) * 43678.23431),
    fract(sin(dot(uv, vec2(23.67817, 78.23121))) * 93567.23423)
  );
}

vec3 lowPassRandRGB(vec2 uv) {
  // 3x3 convolution (average)
  // can be implemented as separable with an extra buffer for a total of 6 samples instead of 9
  vec3 result = vec3(0);
  result += RGB_NOISE_FUNCTION(uv + vec2(-1.0, -1.0));
  result += RGB_NOISE_FUNCTION(uv + vec2(-1.0,  0.0));
  result += RGB_NOISE_FUNCTION(uv + vec2(-1.0, +1.0));
  result += RGB_NOISE_FUNCTION(uv + vec2( 0.0, -1.0));
  result += RGB_NOISE_FUNCTION(uv + vec2( 0.0,  0.0));
  result += RGB_NOISE_FUNCTION(uv + vec2( 0.0, +1.0));
  result += RGB_NOISE_FUNCTION(uv + vec2(+1.0, -1.0));
  result += RGB_NOISE_FUNCTION(uv + vec2(+1.0,  0.0));
  result += RGB_NOISE_FUNCTION(uv + vec2(+1.0, +1.0));
  result *= 0.111111111; // 1.0 / 9.0
  return result;
}
vec3 highPassRandRGB(vec2 uv) {
  // by subtracting the low-pass signal from the original signal, we're being left with the high-pass signal
  // hp(x) = x - lp(x)
  return RGB_NOISE_FUNCTION(uv) - lowPassRandRGB(uv) + 0.5;
}


vec2 pcssVogelDiskSample(int sampleIndex, int sampleCount, float angle) {
  const float goldenAngle = 2.399963f; // radians
  float r = sqrt(float(sampleIndex) + 0.5f) / sqrt(float(sampleCount));
  float theta = float(sampleIndex) * goldenAngle + angle;
  float sine = sin(theta);
  float cosine = cos(theta);
  return vec2(cosine, sine) * r;
}
float penumbraSize( const in float zReceiver, const in float zBlocker ) { // Parallel plane estimation
  return (zReceiver - zBlocker) / zBlocker;
}
float findBlocker(sampler2D shadowMap, vec2 uv, float compare, float angle) {
  float texelSize = 1.0 / float(textureSize(shadowMap, 0).x);
  float blockerDepthSum = float(${e});
  float blockers = 0.0;

  int j = 0;
  vec2 offset = vec2(0.);
  float depth = 0.;

  #pragma unroll_loop_start
  for(int i = 0; i < ${n}; i ++) {
    offset = (pcssVogelDiskSample(j, ${n}, angle) * texelSize) * 2.0 * PENUMBRA_FILTER_SIZE;
    depth = ${i};
    if (depth < compare) {
      blockerDepthSum += depth;
      blockers++;
    }
    j++;
  }
  #pragma unroll_loop_end

  if (blockers > 0.0) {
    return blockerDepthSum / blockers;
  }
  return -1.0;
}

        
float vogelFilter(sampler2D shadowMap, vec2 uv, float zReceiver, float filterRadius, float angle) {
  float texelSize = 1.0 / float(textureSize(shadowMap, 0).x);
  float shadow = 0.0f;
  int j = 0;
  vec2 vogelSample = vec2(0.0);
  vec2 offset = vec2(0.0);
  #pragma unroll_loop_start
  for (int i = 0; i < ${n}; i++) {
    vogelSample = pcssVogelDiskSample(j, ${n}, angle) * texelSize;
    offset = vogelSample * (1.0 + filterRadius * float(${t}));
    shadow += step( zReceiver, ${i} );
    j++;
  }
  #pragma unroll_loop_end
  return shadow * 1.0 / ${n}.0;
}

float PCSS (sampler2D shadowMap, vec4 coords) {
  vec2 uv = coords.xy;
  float zReceiver = coords.z; // Assumed to be eye-space z in this code
  float angle = highPassRandRGB(gl_FragCoord.xy).r * PI2;
  float avgBlockerDepth = findBlocker(shadowMap, uv, zReceiver, angle);
  if (avgBlockerDepth == -1.0) {
    return 1.0;
  }
  float penumbraRatio = penumbraSize(zReceiver, avgBlockerDepth);
  return vogelFilter(shadowMap, uv, zReceiver, 1.25 * penumbraRatio, angle);
}`};function B(e,t,n){t.traverse(t=>{t.material&&(Array.isArray(t.material)?t.material:[t.material]).forEach(t=>{e.properties.remove(t),t.dispose==null||t.dispose(),t.needsUpdate=!0})}),e.info.programs.length=0,e.compile(t,n)}function ie({focus:e=0,samples:t=10,size:n=25}){let r=D(e=>e.gl),i=D(e=>e.scene),a=D(e=>e.camera);return z.useEffect(()=>{let o=P.shadowmap_pars_fragment,s=!o.includes(`sampler2DShadow`),c=o.lastIndexOf(`float getShadow( sampler2D shadowMap`),l=o.indexOf(`if ( frustumTest ) {`,c)+20;if(c<0||l<20){console.warn(`[SoftShadows] Could not find injection point in shadow shader`);return}let u=r.shadowMap.type;s||(r.shadowMap.type=0);let d=o.slice(c,l).includes(`shadowIntensity`)?`return mix( 1.0, PCSS( shadowMap, shadowCoord ), shadowIntensity );`:`return PCSS( shadowMap, shadowCoord );`,f=(o.slice(0,l)+`
`+d+o.slice(l)).replace(`#ifdef USE_SHADOWMAP`,`#ifdef USE_SHADOWMAP
`+re({size:n,samples:t,focus:e},s));return P.shadowmap_pars_fragment=f,B(r,i,a),()=>{P.shadowmap_pars_fragment=o,r.shadowMap.type=u,B(r,i,a)}},[e,n,t]),null}var ae=z.forwardRef(({scale:e=10,frames:t=1/0,opacity:n=1,width:r=1,height:a=1,blur:o=1,near:s=0,far:c=10,resolution:l=512,smooth:u=!0,color:d=`#000000`,depthWrite:f=!1,renderOrder:p,...m},h)=>{let g=z.useRef(null),_=D(e=>e.scene),y=D(e=>e.gl),b=z.useRef(null);r*=Array.isArray(e)?e[0]:e||1,a*=Array.isArray(e)?e[1]:e||1;let[C,w,E,O,A,j,N]=z.useMemo(()=>{let e=new T(l,l),t=new T(l,l);t.texture.generateMipmaps=e.texture.generateMipmaps=!1;let n=new S(r,a).rotateX(Math.PI/2),i=new v(n),o=new k;o.depthTest=o.depthWrite=!1,o.onBeforeCompile=e=>{e.uniforms={...e.uniforms,ucolor:{value:new x(d)}},e.fragmentShader=e.fragmentShader.replace(`void main() {`,`uniform vec3 ucolor;
           void main() {
          `),e.fragmentShader=e.fragmentShader.replace(`vec4( vec3( 1.0 - fragCoordZ ), opacity );`,`vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );`)};let s=new ee(te),c=new ee(ne);return c.depthTest=s.depthTest=!1,[e,n,o,i,s,c,t]},[l,r,a,e,d]),P=e=>{O.visible=!0,O.material=A,A.uniforms.tDiffuse.value=C.texture,A.uniforms.h.value=e*1/256,y.setRenderTarget(N),y.render(O,b.current),O.material=j,j.uniforms.tDiffuse.value=N.texture,j.uniforms.v.value=e*1/256,y.setRenderTarget(C),y.render(O,b.current),O.visible=!1},F=0,I,L;return M(()=>{b.current&&(t===1/0||F<t)&&(F++,I=_.background,L=_.overrideMaterial,g.current.visible=!1,_.background=null,_.overrideMaterial=E,y.setRenderTarget(C),y.render(_,b.current),P(o),u&&P(o*.4),y.setRenderTarget(null),g.current.visible=!0,_.overrideMaterial=L,_.background=I)}),z.useImperativeHandle(h,()=>g.current,[]),z.createElement(`group`,i({"rotation-x":Math.PI/2},m,{ref:g}),z.createElement(`mesh`,{renderOrder:p,geometry:w,scale:[1,-1,1],rotation:[-Math.PI/2,0,0]},z.createElement(`meshBasicMaterial`,{transparent:!0,map:C.texture,opacity:n,depthWrite:f})),z.createElement(`orthographicCamera`,{ref:b,args:[-r/2,r/2,a/2,-a/2,s,c]}))}),V=g(),H={w:2,d:.95,t:.045,backZ:-.475};function oe(e,t=!0){e.traverse(e=>{let n=e;if(!n.isMesh)return;n.castShadow=!0,n.receiveShadow=t;let r=n.material;r&&`envMapIntensity`in r&&(r.envMapIntensity=1)})}function U(e){let t=r(u(`models/${e}.glb`));return(0,z.useLayoutEffect)(()=>oe(t.scene),[t.scene]),t}function W(e,t){let{scene:n}=U(e);return(0,z.useMemo)(()=>{let e=n.getObjectByName(t).clone(!0);return e.position.set(0,0,0),e.quaternion.identity(),e},[n,t])}function se({tier:t}){let r=t===`low`?1024:2048,[i,a,o]=l([u(`textures/wood_diff_${r}.webp`),u(`textures/wood_nor_${r}.webp`),u(`textures/wood_arm_${r}.webp`)]);(0,z.useLayoutEffect)(()=>{i.colorSpace=j,[i,a,o].forEach(e=>{e.wrapS=e.wrapT=E,e.repeat.set(1.4,.7),e.anisotropy=16,e.needsUpdate=!0})},[i,a,o]);let s=(0,z.useMemo)(e,[]);return(0,V.jsxs)(`group`,{children:[(0,V.jsx)(n,{args:[H.w,H.t,H.d],radius:.012,smoothness:6,position:[0,-H.t/2,0],receiveShadow:!0,castShadow:!0,children:(0,V.jsx)(`meshPhysicalMaterial`,{map:i,normalMap:a,normalScale:new N(.8,.8),roughnessMap:o,aoMap:o,metalness:0,roughness:1,color:`#c9b6a2`,clearcoat:.35,clearcoatRoughness:.28})}),[-.9,.9].map(e=>(0,V.jsx)(n,{args:[.05,.72,.8],radius:.01,position:[e,-H.t-.36,0],castShadow:!0,receiveShadow:!0,children:(0,V.jsx)(`meshStandardMaterial`,{color:`#1b1b1d`,metalness:.8,roughness:.45})},e)),(0,V.jsxs)(`mesh`,{position:[0,.6,H.backZ-.03],receiveShadow:!0,children:[(0,V.jsx)(`planeGeometry`,{args:[8,3]}),(0,V.jsx)(`meshStandardMaterial`,{color:`#3a332d`,roughness:.95,bumpMap:s,bumpScale:.6})]}),(0,V.jsxs)(`mesh`,{"rotation-x":-Math.PI/2,position:[0,-.76,0],receiveShadow:!0,children:[(0,V.jsx)(`planeGeometry`,{args:[10,10]}),(0,V.jsx)(`meshStandardMaterial`,{color:`#17130f`,roughness:.9})]})]})}function ce(){let{scene:e}=U(`desk-lamp`);return(0,z.useLayoutEffect)(()=>{e.traverse(e=>{let t=e;if(t.isMesh&&t.material.name.includes(`light`)){let e=t.material.clone();e.emissive=new x(`#ffd9a0`),e.emissiveIntensity=2.5,t.material=e,t.castShadow=!1}})},[e]),(0,V.jsx)(`primitive`,{object:e})}function le(){return(0,V.jsx)(`primitive`,{object:U(`plant`).scene})}function ue(){return(0,V.jsx)(`primitive`,{object:U(`camera`).scene})}function de(){return(0,V.jsx)(`primitive`,{object:U(`compass`).scene})}function fe(){return(0,V.jsx)(`primitive`,{object:U(`spectacles`).scene})}function pe(){let e=W(`stationery`,`stationery_supplies_pencilcup`),t=W(`stationery`,`stationery_supplies_pen_fancy`),n=W(`stationery`,`stationery_supplies_pencil_new_a`),r=W(`stationery`,`stationery_supplies_pencil_used`);return(0,V.jsxs)(`group`,{children:[(0,V.jsx)(`primitive`,{object:e}),(0,V.jsx)(`primitive`,{object:t,position:[.004,.075,.003],rotation:[.1,.3,Math.PI/2-.12]}),(0,V.jsx)(`primitive`,{object:n,position:[-.006,.07,-.004],rotation:[-.08,0,Math.PI/2+.1]}),(0,V.jsx)(`primitive`,{object:r,position:[.001,.06,.008],rotation:[.14,.8,Math.PI/2+.05]})]})}function me(){let e=[`postcard_03`,`postcard_07`,`postcard_14`].map(e=>W(`postcards`,e));return(0,V.jsx)(`group`,{children:e.map((e,t)=>(0,V.jsx)(`group`,{position:[t*.05,.0012+t*8e-4,t*.025],rotation:[0,.35-t*.32,0],children:(0,V.jsx)(`primitive`,{object:e,rotation:[0,0,0]})},t))})}function he(){let e=[`01`,`02`,`03`,`05`,`08`,`13`,`14`].map(e=>`book_encyclopedia_set_01_book${e}`).map(e=>W(`books`,e)),t=(0,z.useMemo)(()=>{let t=0;return e.map((n,r)=>{n.position.set(0,0,0),n.rotation.set(0,0,0),n.updateMatrixWorld(!0);let i=new y().setFromObject(n),a=t-i.min.x;return t+=i.max.x-i.min.x+.0015,{b:n,pos:a,lean:r===e.length-1?-.22:0}})},e);return(0,V.jsx)(`group`,{children:t.map(({b:e,pos:t,lean:n},r)=>(0,V.jsx)(`primitive`,{object:e,position:[t,0,0],rotation:[0,0,n]},r))})}function ge(){let e=W(`notebook`,`binder_notebook_closed`);return(0,V.jsx)(`primitive`,{object:e})}[`desk-lamp`,`plant`,`camera`,`compass`,`spectacles`,`stationery`,`postcards`,`books`,`notebook`].forEach(e=>r.preload(u(`models/${e}.glb`)));var G=`"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`,K=`"Space Grotesk Variable", system-ui, sans-serif`;function q(e,t){let n=document.createElement(`canvas`);n.width=e,n.height=t;let r=n.getContext(`2d`),i=new C(n);return i.colorSpace=j,i.anisotropy=8,{canvas:n,ctx:r,texture:i}}function J(e,t,n,r,i,a){e.beginPath(),e.roundRect(t,n,r,i,a)}var Y={kw:`#ff9e64`,fn:`#7dcfff`,str:`#9ece6a`,com:`#5c6370`,num:`#e0af68`,txt:`#c8ccd4`,dec:`#bb9af7`},X=[[[`from`,Y.kw],[` airflow `,Y.txt],[`import`,Y.kw],[` DAG`,Y.txt]],[[`from`,Y.kw],[` pyspark.sql `,Y.txt],[`import`,Y.kw],[` SparkSession, functions `,Y.txt],[`as`,Y.kw],[` F`,Y.txt]],[],[[`# nightly events pipeline: kafka → spark → s3`,Y.com]],[[`@task`,Y.dec]],[[`def`,Y.kw],[` extract`,Y.fn],[`(topic: str) -> str:`,Y.txt]],[[`    batch = consume(topic, max_records=`,Y.txt],[`50_000`,Y.num],[`)`,Y.txt]],[[`    return`,Y.kw],[` stage_to_s3(batch, `,Y.txt],[`"raw/events"`,Y.str],[`)`,Y.txt]],[],[[`@task`,Y.dec]],[[`def`,Y.kw],[` transform`,Y.fn],[`(path: str) -> str:`,Y.txt]],[[`    spark = SparkSession.builder.getOrCreate()`,Y.txt]],[[`    df = spark.read.json(path)`,Y.txt]],[[`    clean = (df.dropDuplicates([`,Y.txt],[`"event_id"`,Y.str],[`])`,Y.txt]],[[`        .withColumn(`,Y.txt],[`"day"`,Y.str],[`, F.to_date(`,Y.txt],[`"ts"`,Y.str],[`))`,Y.txt]],[[`        .filter(F.col(`,Y.txt],[`"valid"`,Y.str],[`)))`,Y.txt]],[[`    return`,Y.kw],[` write_parquet(clean, `,Y.txt],[`"curated/events"`,Y.str],[`)`,Y.txt]],[],[[`@task`,Y.dec]],[[`def`,Y.kw],[` load`,Y.fn],[`(path: str) -> None:`,Y.txt]],[[`    warehouse.copy_into(`,Y.txt],[`"analytics.events"`,Y.str],[`, path)`,Y.txt]],[],[[`with`,Y.kw],[` DAG(`,Y.txt],[`"events_daily"`,Y.str],[`, schedule=`,Y.txt],[`"@daily"`,Y.str],[`):`,Y.txt]],[[`    load(transform(extract(`,Y.txt],[`"events"`,Y.str],[`)))`,Y.txt]],[],[[`# ── devops portal (react + go) ──`,Y.com]],[[`func`,Y.kw],[` (s *Server) `,Y.txt],[`Deploy`,Y.fn],[`(w http.ResponseWriter, r *http.Request) {`,Y.txt]],[[`    job := s.queue.Enqueue(r.Context(), parse(r))`,Y.txt]],[[`    json.NewEncoder(w).Encode(job.Status())`,Y.txt]],[[`}`,Y.txt]],[]];function _e(e=1024,t=640){let{ctx:n,texture:r}=q(e,t),i=e*.66;return{texture:r,paint:a=>{n.fillStyle=`#16171d`,n.fillRect(0,0,e,t),n.fillStyle=`#101116`,n.fillRect(0,0,e,40),[`#ff5f57`,`#febc2e`,`#28c840`].forEach((e,t)=>{n.fillStyle=e,n.beginPath(),n.arc(22+t*22,20,7,0,Math.PI*2),n.fill()}),n.font=`500 15px ${K}`,n.fillStyle=`#8b8f99`,n.textAlign=`center`,n.fillText(`events_pipeline — workspace`,e/2,26),n.textAlign=`left`,n.fillStyle=`#1b1c23`,n.fillRect(0,40,i,30),n.fillStyle=`#16171d`,n.fillRect(0,40,150,30),n.fillStyle=`#ff9e64`,n.fillRect(0,68,150,2),n.font=`14px ${G}`,n.fillStyle=`#e6e6e6`,n.fillText(`pipeline.py`,18,60),n.fillStyle=`#6b6f7a`,n.fillText(`portal.go`,170,60);let o=a*14%(X.length*26);n.save(),n.beginPath(),n.rect(0,72,i,t-76-26),n.clip(),n.font=`15px ${G}`;let s=Math.ceil((t-76)/26)+2,c=Math.floor(o/26),l=(c+9)%X.length;for(let e=0;e<s;e++){let t=(c+e)%X.length,r=92+e*26-o%26;t===l&&(n.fillStyle=`rgba(255,255,255,0.045)`,n.fillRect(0,r-18,i,26)),n.fillStyle=t===l?`#c8ccd4`:`#4a4e5a`,n.textAlign=`right`,n.fillText(String(t+1),48,r),n.textAlign=`left`;let s=64;for(let[e,i]of X[t])n.fillStyle=i,n.fillText(e,s,r),s+=n.measureText(e).width;t===l&&Math.floor(a*2)%2==0&&(n.fillStyle=`#ffcc66`,n.fillRect(s+2,r-15,2,19))}n.restore();let u=i;n.fillStyle=`#121318`,n.fillRect(u,40,e-u,t-40),n.fillStyle=`#e6e6e6`,n.font=`600 16px ${K}`,n.fillText(`DAG · events_daily`,u+22,72),n.font=`13px ${G}`,n.fillStyle=`#6b6f7a`,n.fillText(`illustrative run`,u+22,94);let d=[`extract`,`transform`,`load`],f=a/2.2%(d.length+1.5);d.forEach((t,r)=>{let i=140+r*92,o=f>r+1,s=!o&&f>r;if(J(n,u+22,i,e-u-44,60,12),n.fillStyle=s?`rgba(255,158,100,0.12)`:`rgba(255,255,255,0.04)`,n.fill(),n.strokeStyle=s?`rgba(255,158,100,0.7)`:o?`rgba(52,211,153,0.45)`:`rgba(255,255,255,0.08)`,n.lineWidth=2,n.stroke(),n.fillStyle=o?`#34d399`:s?`#ff9e64`:`#3c3f49`,n.beginPath(),n.arc(u+46,i+30,7+(s?Math.sin(a*8)*1.5:0),0,Math.PI*2),n.fill(),n.fillStyle=`#e6e6e6`,n.font=`500 16px ${G}`,n.fillText(t,u+66,i+27),n.fillStyle=`#7b7f8a`,n.font=`12px ${G}`,n.fillText(o?`success`:s?`running…`:`queued`,u+66,i+46),s){let t=(e-u-44)*((f-r)%1);n.fillStyle=`rgba(255,158,100,0.85)`,n.fillRect(u+22,i+57,t,3)}r<d.length-1&&(n.strokeStyle=`rgba(255,255,255,0.12)`,n.beginPath(),n.moveTo(u+46,i+60),n.lineTo(u+46,i+92),n.stroke())}),n.fillStyle=`#7b7f8a`,n.font=`12px ${G}`,n.fillText(`records / s`,u+22,440),n.strokeStyle=`#7dcfff`,n.lineWidth=2,n.beginPath();for(let t=0;t<=40;t++){let r=u+22+t/40*(e-u-44),i=510-((Math.sin(t*.45+a*1.3)*.5+Math.sin(t*.17-a*.6)*.5)*.5+.5)*50;t===0?n.moveTo(r,i):n.lineTo(r,i)}n.stroke(),n.fillStyle=`#ff9e64`,n.fillRect(0,t-24,e,24),n.fillStyle=`#1a1208`,n.font=`600 13px ${G}`,n.fillText(`⎇ main   spark 3.5   airflow   kafka   aws`,14,t-7),n.textAlign=`right`,n.fillText(`Python  UTF-8`,e-14,t-7),n.textAlign=`left`,r.needsUpdate=!0},dispose:()=>r.dispose()}}function ve(e){return()=>{e|=0,e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function ye(e=1024,t=576){let{ctx:n,texture:r}=q(e,t),i=ve(7),a=[],o=100,s=()=>{let e=o,t=(i()-.47)*3.2,n=Math.max(40,e+t),r=Math.max(e,n)+i()*1.6,a=Math.min(e,n)-i()*1.6;return o=n,{o:e,h:r,l:a,c:n,v:.3+i()*.7}};for(let e=0;e<54;e++)a.push(s());let c=0;return{texture:r,paint:i=>{i-c>1.4&&(c=i,a.shift(),a.push(s()));let o=a[a.length-1],l=Math.sin(i*5.3)*.5+Math.sin(i*2.1)*.4,u=o.c+l,d=Math.max(o.h,u),f=Math.min(o.l,u),p=n.createLinearGradient(0,0,0,t);p.addColorStop(0,`#0f1115`),p.addColorStop(1,`#0a0b0e`),n.fillStyle=p,n.fillRect(0,0,e,t),n.fillStyle=`#e8e6e3`,n.font=`600 22px ${K}`,n.fillText(`Practice chart`,28,42),n.font=`13px ${G}`,n.fillStyle=`#7a7f89`,n.fillText(`simulated random walk · not market data`,28,64),J(n,e-128,22,100,30,15),n.fillStyle=`rgba(251,146,60,0.14)`,n.fill(),n.fillStyle=`#fb923c`,n.font=`600 13px ${G}`,n.textAlign=`center`,n.fillText(`DEMO`,e-78,42),n.textAlign=`left`;let m=e-28,h=t-110,g=t-96,_=t-28,v=1/0,y=-1/0;a.forEach(e=>{v=Math.min(v,e.l),y=Math.max(y,e.h)}),v=Math.min(v,f)-2,y=Math.max(y,d)+2;let b=e=>h-(e-v)/(y-v)*(h-92);n.strokeStyle=`rgba(255,255,255,0.05)`,n.lineWidth=1;for(let e=0;e<=5;e++){let t=92+e/5*(h-92);n.beginPath(),n.moveTo(28,t),n.lineTo(m,t),n.stroke()}for(let e=0;e<=8;e++){let t=28+e/8*(m-28);n.beginPath(),n.moveTo(t,92),n.lineTo(t,_),n.stroke()}let x=(m-28)/54,S=x*.62;a.forEach((e,t)=>{let r=t===a.length-1,i=r?u:e.c,o=r?d:e.h,s=r?f:e.l,c=i>=e.o?`#34d399`:`#f87171`,l=28+t*x+x/2;n.strokeStyle=c,n.lineWidth=2,n.beginPath(),n.moveTo(l,b(o)),n.lineTo(l,b(s)),n.stroke(),n.fillStyle=c;let p=b(Math.max(e.o,i));n.fillRect(l-S/2,p,S,Math.max(2,b(Math.min(e.o,i))-p)),n.globalAlpha=.35;let m=e.v*(_-g);n.fillRect(l-S/2,_-m,S,m),n.globalAlpha=1}),n.strokeStyle=`#fbbf24`,n.lineWidth=2.5,n.beginPath(),a.forEach((e,t)=>{let r=Math.max(0,t-8),i=0;for(let e=r;e<=t;e++)i+=e===a.length-1?u:a[e].c;let o=i/(t-r+1),s=28+t*x+x/2;t===0?n.moveTo(s,b(o)):n.lineTo(s,b(o))}),n.stroke();let C=b(u);n.setLineDash([6,6]),n.strokeStyle=`rgba(251,146,60,0.6)`,n.lineWidth=1.5,n.beginPath(),n.moveTo(28,C),n.lineTo(m,C),n.stroke(),n.setLineDash([]),r.needsUpdate=!0},dispose:()=>r.dispose()}}function be(){return(0,z.useMemo)(()=>({alu:new O({color:`#8d9096`,metalness:1,roughness:.34,clearcoat:.15}),aluDark:new O({color:`#3b3d42`,metalness:1,roughness:.38}),keys:new w({color:`#141416`,roughness:.62}),bezel:new O({color:`#050506`,roughness:.18,clearcoat:1,clearcoatRoughness:.05}),glass:new O({color:`#000000`,roughness:.06,metalness:0,transparent:!0,opacity:.16,depthWrite:!1}),plastic:new w({color:`#16171a`,roughness:.55})}),[])}function xe(e,t,n){let r=(0,z.useMemo)(e,[e]);(0,z.useEffect)(()=>(r.paint(4),()=>r.dispose()),[r]);let i=(0,z.useMemo)(()=>({t:0,since:0}),[]);return M((e,a)=>{n||(i.t+=a,i.since+=a,i.since<1/t||(i.since=0,r.paint(i.t+4)))}),r.texture}var Se=.312,Ce=.221,Z=.0155,Q=.212;function we({fps:e,still:t}){let r=be(),i=xe(_e,e,t),a=(0,z.useMemo)(()=>{let e=new _(.0158,.0012,.0152),t=new A(e,r.keys,84),n=new b,i=0;for(let e=0;e<6;e++)for(let r=0;r<14;r++){if(e===5&&r>3&&r<10)continue;let a=-.1235+r*.019,o=-.088+e*(e===0?.016:.0188)+(e>0?-.003:0);n.makeScale(1,1,e===0?.6:1),n.setPosition(a,.0159,o),t.setMatrixAt(i++,n)}return t.count=i,t.castShadow=!1,t.receiveShadow=!0,t},[r.keys]);return(0,V.jsxs)(`group`,{children:[(0,V.jsx)(n,{args:[Se,Z,Ce],radius:.006,smoothness:5,position:[0,Z/2,0],material:r.alu,castShadow:!0,receiveShadow:!0}),(0,V.jsx)(`primitive`,{object:a}),(0,V.jsx)(`mesh`,{position:[0,.0159,.0895-.088-.003],material:r.keys,receiveShadow:!0,children:(0,V.jsx)(`boxGeometry`,{args:[.112,.0012,.0152]})}),(0,V.jsx)(n,{args:[.13,6e-4,.078],radius:3e-4,smoothness:2,position:[0,Z,.066],receiveShadow:!0,children:(0,V.jsx)(`meshPhysicalMaterial`,{color:`#7d8086`,metalness:.9,roughness:.2})}),(0,V.jsxs)(`group`,{position:[0,Z,-.1065],rotation:[-.33,0,0],children:[(0,V.jsx)(n,{args:[Se,Q,.0055],radius:.0027,smoothness:4,position:[0,Q/2,-.0028],material:r.alu,castShadow:!0,receiveShadow:!0}),(0,V.jsx)(`mesh`,{position:[0,Q/2,5e-5],material:r.bezel,children:(0,V.jsx)(`planeGeometry`,{args:[.306,.206]})}),(0,V.jsxs)(`mesh`,{position:[0,.109,2e-4],children:[(0,V.jsx)(`planeGeometry`,{args:[.294,.188]}),(0,V.jsx)(`meshBasicMaterial`,{map:i,toneMapped:!1})]}),(0,V.jsx)(`mesh`,{position:[0,Q/2,4e-4],material:r.glass,children:(0,V.jsx)(`planeGeometry`,{args:[.306,.206]})})]})]})}function Te({fps:e,still:t}){let r=be(),i=xe(ye,e,t),a=.545,o=.318;return(0,V.jsxs)(`group`,{children:[(0,V.jsx)(n,{args:[.23,.009,.17],radius:.004,smoothness:4,position:[0,.0045,.01],material:r.alu,castShadow:!0,receiveShadow:!0}),(0,V.jsx)(`group`,{position:[0,.009,-.035],rotation:[-.12,0,0],children:(0,V.jsx)(n,{args:[.065,.29,.014],radius:.006,smoothness:4,position:[0,.145,0],material:r.alu,castShadow:!0,receiveShadow:!0})}),(0,V.jsxs)(`group`,{position:[0,.335,-.012],rotation:[-.05,0,0],children:[(0,V.jsx)(n,{args:[a,o,.011],radius:.004,smoothness:4,material:r.bezel,castShadow:!0,receiveShadow:!0}),(0,V.jsx)(n,{args:[a*.92,o*.86,.03],radius:.012,smoothness:4,position:[0,0,-.016],material:r.alu,castShadow:!0}),(0,V.jsxs)(`mesh`,{position:[0,.006,.0058],children:[(0,V.jsx)(`planeGeometry`,{args:[.529,.28600000000000003]}),(0,V.jsx)(`meshBasicMaterial`,{map:i,toneMapped:!1})]}),(0,V.jsx)(`mesh`,{position:[0,0,.006],material:r.glass,children:(0,V.jsx)(`planeGeometry`,{args:[.541,.314]})})]})]})}var Ee=m({default:()=>ke}),De=(0,z.lazy)(()=>R(()=>import(`./Effects-CYh-0Rna.js`),__vite__mapDeps([0,1,2,3,4,5]))),Oe=(0,z.lazy)(()=>R(()=>import(`./Physics-0qhMooGG.js`),__vite__mapDeps([6,1,2,3,4,7,8])));function ke({hotspots:e,tier:n,degraded:r,reducedMotion:i,focusId:a,onFocus:l,signals:p,onReady:m}){let[h,g]=(0,z.useState)(null),[_,v]=(0,z.useState)(null),[y,b]=(0,z.useState)(!1),x=n===`high`,S=D(e=>e.viewport.dpr),C=i,w=t=>e.find(e=>e.id===t)?.label??t,T=F,E=(0,z.useRef)(0),O=(0,z.useRef)(!1);M(()=>{O.current||++E.current>2&&(O.current=!0,m?.(),i||window.setTimeout(()=>b(!0),400))}),(0,z.useEffect)(()=>{a||v(null)},[a]);let k=(n,r,i,o)=>e.some(e=>e.id===n)?(0,V.jsx)(t,{id:n,label:w(n),position:r.position,rotation:r.rotation,labelOffset:i,active:a===n,quiet:!!a,onSelect:()=>l(n),onHover:g,children:o}):(0,V.jsx)(`group`,{position:r.position,rotation:r.rotation,children:o});return(0,V.jsxs)(V.Fragment,{children:[(0,V.jsx)(`color`,{attach:`background`,args:[`#0d0b09`]}),(0,V.jsx)(`fog`,{attach:`fog`,args:[`#0d0b09`,3,8]}),x&&(0,V.jsx)(ie,{size:18,samples:10,focus:.6}),(0,V.jsx)(f,{files:u(`hdri/brown_photostudio_02_1k.hdr`),environmentIntensity:.55,environmentRotation:[0,1.2,0]}),(0,V.jsx)(Ae,{high:x}),(0,V.jsx)(o,{path:L,focus:a?I[a]??null:null,signals:p,reducedMotion:i,parallax:x,onSettle:v}),(0,V.jsx)(se,{tier:n}),k(`laptop`,T.laptop,[0,.27,0],(0,V.jsx)(we,{fps:x?24:12,still:C})),k(`chart`,T.monitor,[0,.55,0],(0,V.jsx)(Te,{fps:x?20:10,still:C})),k(`globe`,T.globe,[0,.38,0],(0,V.jsx)(d,{focused:a===`globe`,still:C})),k(`racket`,T.racket,[0,.4,-.05],(0,V.jsx)(s,{})),k(`books`,T.books,[.1,.32,0],(0,V.jsxs)(V.Fragment,{children:[(0,V.jsx)(he,{}),(0,V.jsxs)(`group`,{position:[T.notebook.position[0]-T.books.position[0],0,T.notebook.position[2]-T.books.position[2]],rotation:T.notebook.rotation,children:[(0,V.jsx)(ge,{}),(0,V.jsx)(`group`,{position:[0,.024,0],rotation:[0,.3,0],scale:.82,children:(0,V.jsx)(c,{})})]})]})),(0,V.jsx)(`group`,{position:T.lamp.position,rotation:T.lamp.rotation,children:(0,V.jsx)(ce,{})}),(0,V.jsx)(`group`,{position:T.cup.position,rotation:T.cup.rotation,children:(0,V.jsx)(pe,{})}),(0,V.jsx)(`group`,{position:T.spectacles.position,rotation:T.spectacles.rotation,children:(0,V.jsx)(fe,{})}),(0,V.jsx)(`group`,{position:T.postcards.position,rotation:T.postcards.rotation,children:(0,V.jsx)(me,{})}),(0,V.jsx)(`group`,{position:T.camera.position,rotation:T.camera.rotation,children:(0,V.jsx)(ue,{})}),(0,V.jsx)(`group`,{position:T.compass.position,rotation:T.compass.rotation,children:(0,V.jsx)(de,{})}),(0,V.jsx)(`group`,{position:T.plant.position,rotation:T.plant.rotation,children:(0,V.jsx)(le,{})}),y?(0,V.jsx)(z.Suspense,{fallback:(0,V.jsx)($,{}),children:(0,V.jsx)(Oe,{onHover:g,registerFlick:e=>window.__flick=e})}):(0,V.jsx)($,{}),!x&&(0,V.jsx)(ae,{position:[0,5e-4,0],scale:[2,1],far:.5,blur:2.2,opacity:.6,resolution:512,frames:1,color:`#1a0f06`}),(0,V.jsx)(z.Suspense,{fallback:null,children:(0,V.jsx)(De,{tier:n,degraded:r,hovered:h,focusTarget:_},`${S}-${r}`)})]})}function $(){let[e,,t]=F.shuttle.position;return(0,V.jsx)(a,{position:[e,.0128,t],rotation:[0,.6,-Math.PI/2+.38]})}function Ae({high:e}){let t=(0,z.useRef)(null),{scene:n}=D();return(0,z.useEffect)(()=>{let e=t.current;if(e)return e.target.position.set(-.3,0,0),n.add(e.target),()=>{n.remove(e.target)}},[n]),(0,V.jsxs)(V.Fragment,{children:[(0,V.jsx)(`spotLight`,{ref:t,position:[-.62,.62,-.08],angle:.95,penumbra:1,intensity:2.4,distance:3,decay:2,color:`#ffc88a`,castShadow:e,"shadow-mapSize":[1024,1024],"shadow-bias":-4e-4,"shadow-normalBias":.01}),(0,V.jsx)(`directionalLight`,{position:[1.6,2.2,1.4],intensity:1.1,color:`#dbe6ff`,castShadow:!0,"shadow-mapSize":e?[2048,2048]:[1024,1024],"shadow-camera-left":-1.2,"shadow-camera-right":1.2,"shadow-camera-top":1,"shadow-camera-bottom":-1,"shadow-camera-near":.5,"shadow-camera-far":6,"shadow-bias":-3e-4,"shadow-normalBias":.015}),(0,V.jsx)(`pointLight`,{position:[.5,.45,.6],intensity:.15,color:`#ffb070`,distance:2})]})}export{ke as default,H as n,Ee as t};