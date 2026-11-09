import{A as e,At as t,Bt as n,Ct as r,Dt as i,Et as a,Ft as o,Gt as s,H as c,Ht as l,It as u,J as d,Jt as f,Kt as p,L as m,M as h,Mt as g,N as _,Nt as v,O as y,Ot as b,P as x,St as S,Tt as C,U as w,Ut as T,V as E,Vt as D,W as O,Wt as ee,Xt as k,Y as A,Yt as te,Zt as j,_t as M,a as ne,c as re,ct as N,dt as ie,gt as ae,ht as oe,j as se,jt as P,kt as ce,l as le,lt as F,mt as ue,n as de,nt as fe,o as pe,ot as me,qt as I,r as he,s as ge,st as _e,t as ve,tt as ye,ut as be,wt as xe,xt as L,zt as Se}from"./music-pavilion-rules-vUhCtblA.js";import{$n as Ce,A as we,An as R,Ar as Te,At as z,B as Ee,Bn as B,C as De,Cr as Oe,D as ke,Dn as Ae,Dr as V,Dt as je,E as Me,En as Ne,Er as Pe,Et as Fe,F as Ie,G as Le,Hn as Re,Jn as ze,Jt as H,K as Be,Kn as Ve,L as He,M as Ue,Mn as We,Mt as Ge,N as Ke,Nn as qe,Nt as Je,O as Ye,On as Xe,Or as Ze,Ot as Qe,P as $e,Pt as et,Qn as U,R as tt,Rn as nt,S as rt,Sr as W,St as it,T as at,Tn as ot,Tr as G,Tt as st,U as K,Un as ct,Ut as lt,V as ut,Vn as dt,W as ft,Xn as q,Yt as pt,_r as mt,_t as J,a as ht,b as Y,br as gt,cr as _t,ct as vt,d as yt,dr as X,dt as bt,er as xt,f as St,fr as Ct,g as wt,gr as Tt,gt as Et,h as Dt,hr as Ot,i as kt,ir as At,j as jt,jn as Mt,jr as Nt,jt as Pt,k as Ft,kn as It,kr as Lt,l as Rt,lr as zt,lt as Bt,m as Vt,mr as Ht,mt as Ut,n as Wt,nr as Gt,nt as Kt,o as qt,or as Jt,p as Yt,qn as Xt,qt as Zt,r as Qt,sr as $t,st as en,t as tn,tr as nn,u as rn,ur as an,ut as on,v as sn,vr as cn,vt as ln,w as un,wr as dn,wt as fn,x as pn,xr as mn,xt as hn,y as gn,yr as _n,yt as Z,z as vn,zn as yn,zt as bn}from"./camera-CPvng7K-.js";import{a as xn,c as Sn,i as Cn,n as wn,o as Tn,r as En,s as Dn}from"./WorldScreen-B5whU8AF.js";import{$ as On,B as kn,F as An,G as jn,H as Mn,I as Nn,J as Pn,K as Fn,L as In,R as Ln,U as Rn,V as zn,W as Bn,X as Vn,Z as Hn,a as Un,i as Wn,n as Gn,nt as Kn,r as qn,tt as Jn,z as Yn}from"./main-BD7bSnrS.js";import{A as Xn,C as Zn,D as Qn,E as $n,O as er,S as tr,T as nr,_ as rr,a as ir,b as ar,c as or,d as sr,g as cr,h as lr,i as ur,j as dr,k as fr,l as pr,m as mr,n as hr,o as gr,p as _r,r as vr,s as yr,t as br,u as xr,v as Sr,w as Cr,x as wr,y as Tr}from"./terrain-camera-v001-DLBhNRJi.js";function Er(){let e=null,t=!1,n=null,r=null;function i(t,a){r=e.requestAnimationFrame(i),n(t,a)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function Dr(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var Q={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},$={common:{diffuse:{value:new Y(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new J},alphaMap:{value:null},alphaMapTransform:{value:new J},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new J}},envmap:{envMap:{value:null},envMapRotation:{value:new J},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new J}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new J}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new J},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new J},normalScale:{value:new an(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new J},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new J}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new J}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new J}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Y(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new Y(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new J},alphaTest:{value:0},uvTransform:{value:new J}},sprite:{diffuse:{value:new Y(16777215)},opacity:{value:1},center:{value:new an(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new J},alphaMap:{value:null},alphaMapTransform:{value:new J},alphaTest:{value:0}}},Or={basic:{uniforms:G([$.common,$.specularmap,$.envmap,$.aomap,$.lightmap,$.fog]),vertexShader:Q.meshbasic_vert,fragmentShader:Q.meshbasic_frag},lambert:{uniforms:G([$.common,$.specularmap,$.envmap,$.aomap,$.lightmap,$.emissivemap,$.bumpmap,$.normalmap,$.displacementmap,$.fog,$.lights,{emissive:{value:new Y(0)},envMapIntensity:{value:1}}]),vertexShader:Q.meshlambert_vert,fragmentShader:Q.meshlambert_frag},phong:{uniforms:G([$.common,$.specularmap,$.envmap,$.aomap,$.lightmap,$.emissivemap,$.bumpmap,$.normalmap,$.displacementmap,$.fog,$.lights,{emissive:{value:new Y(0)},specular:{value:new Y(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Q.meshphong_vert,fragmentShader:Q.meshphong_frag},standard:{uniforms:G([$.common,$.envmap,$.aomap,$.lightmap,$.emissivemap,$.bumpmap,$.normalmap,$.displacementmap,$.roughnessmap,$.metalnessmap,$.fog,$.lights,{emissive:{value:new Y(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Q.meshphysical_vert,fragmentShader:Q.meshphysical_frag},toon:{uniforms:G([$.common,$.aomap,$.lightmap,$.emissivemap,$.bumpmap,$.normalmap,$.displacementmap,$.gradientmap,$.fog,$.lights,{emissive:{value:new Y(0)}}]),vertexShader:Q.meshtoon_vert,fragmentShader:Q.meshtoon_frag},matcap:{uniforms:G([$.common,$.bumpmap,$.normalmap,$.displacementmap,$.fog,{matcap:{value:null}}]),vertexShader:Q.meshmatcap_vert,fragmentShader:Q.meshmatcap_frag},points:{uniforms:G([$.points,$.fog]),vertexShader:Q.points_vert,fragmentShader:Q.points_frag},dashed:{uniforms:G([$.common,$.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Q.linedashed_vert,fragmentShader:Q.linedashed_frag},depth:{uniforms:G([$.common,$.displacementmap]),vertexShader:Q.depth_vert,fragmentShader:Q.depth_frag},normal:{uniforms:G([$.common,$.bumpmap,$.normalmap,$.displacementmap,{opacity:{value:1}}]),vertexShader:Q.meshnormal_vert,fragmentShader:Q.meshnormal_frag},sprite:{uniforms:G([$.sprite,$.fog]),vertexShader:Q.sprite_vert,fragmentShader:Q.sprite_frag},background:{uniforms:{uvTransform:{value:new J},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Q.background_vert,fragmentShader:Q.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new J}},vertexShader:Q.backgroundCube_vert,fragmentShader:Q.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Q.cube_vert,fragmentShader:Q.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Q.equirect_vert,fragmentShader:Q.equirect_frag},distance:{uniforms:G([$.common,$.displacementmap,{referencePosition:{value:new X},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Q.distance_vert,fragmentShader:Q.distance_frag},shadow:{uniforms:G([$.lights,$.fog,{color:{value:new Y(0)},opacity:{value:1}}]),vertexShader:Q.shadow_vert,fragmentShader:Q.shadow_frag}};Or.physical={uniforms:G([Or.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new J},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new J},clearcoatNormalScale:{value:new an(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new J},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new J},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new J},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new J},sheen:{value:0},sheenColor:{value:new Y(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new J},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new J},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new J},transmissionSamplerSize:{value:new an},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new J},attenuationDistance:{value:0},attenuationColor:{value:new Y(0)},specularColor:{value:new Y(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new J},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new J},anisotropyVector:{value:new an},anisotropyMap:{value:null},anisotropyMapTransform:{value:new J}}]),vertexShader:Q.meshphysical_vert,fragmentShader:Q.meshphysical_frag};var kr={r:0,b:0,g:0},Ar=new ln,jr=new J;jr.set(-1,0,0,0,1,0,0,0,1);function Mr(e,t,n,r,i,a){let o=new Y(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&i.isCubeTexture?(l===void 0&&(l=new Z(new Vt(1,1,1),new dt({name:`BackgroundCubeMaterial`,uniforms:mt(Or.backgroundCube.uniforms),vertexShader:Or.backgroundCube.vertexShader,fragmentShader:Or.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(Ar.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(jr),l.material.toneMapped=pn.getTransfer(i.colorSpace)!==yn,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new Z(new et(2,2),new dt({name:`BackgroundMaterial`,uniforms:mt(Or.background.uniforms),vertexShader:Or.background.vertexShader,fragmentShader:Or.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=pn.getTransfer(i.colorSpace)!==yn,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(kr,Oe(e)),n.buffers.color.setClear(kr.r,kr.g,kr.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function Nr(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.isInterleavedBuffer===!0?t.stride:t.itemSize,p=s.offset;if(t.isInstancedInterleavedBuffer||t.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function Pr(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function Fr(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&n!==1015&&!i&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE))}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(V(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`),f=n.logarithmicDepthBuffer===!0&&d===!1;n.reversedDepthBuffer===!0&&d===!1&&V(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`),n.logarithmicDepthBuffer===!0&&d===!0&&V(`WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:f,reversedDepthBuffer:d,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function Ir(e){let t=this,n=null,r=0,i=!1,a=!1,o=new Je,s=new J,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var Lr=class extends Ot{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new un(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Vt(5,5,5),i=new dt({name:`CubemapFromEquirect`,uniforms:mt(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new Z(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=en),new rt(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}},Rr=256,zr=3,Br=20,Vr=256,Hr=16,Ur=3,Wr=new X,Gr=new Y,Kr=class e{constructor(e){this._renderer=e,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new rt(1,10,null),this._boxMesh=new Z(new Vt(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=Wr}=i,s=this._renderer;this._setSize(a);let c=this._allocateTarget(),l=this._getSourceTarget(!0);t>0&&(l.texture.mipmapsAutoUpdate=!1);let u=s.autoClear,d=s.autoClearColor,f=s.autoClearDepth,p=s.autoClearStencil,m=e.background;s.autoClear=!0,s.autoClearColor=!0,s.autoClearDepth=!0,s.autoClearStencil=!0,m===null&&(e.background=s.getClearColor(Gr));let h=new rt(n,r,l);return h.position.copy(o),h.update(s,e),s.autoClear=u,s.autoClearColor=d,s.autoClearDepth=f,s.autoClearStencil=p,e.background=m,t>0&&(l.texture.mipmapsAutoUpdate=!0,this._blur(c,t)),this._applyPMREM(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=$r(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Qr(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(e,t){return t>0?1-Math.sqrt(1-e/t):0}_setSize(e){this._cubeSize=Math.max(Rr,mn(e))}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?Rr:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4);let n=t||this._allocateTarget();return this._textureToCubemap(e),this._applyPMREM(n),n}_allocateTarget(){let e=this._cubeSize,t=qr(e,!1,!1),n=Math.log2(e)-zr;for(let r=0;r<=n;r++)t.texture.mipmaps.push({width:e>>r,height:e>>r});return t.texture.name=`PMREM`,t.texture.isPMREMTexture=!0,t}_getSourceTarget(e=!1){let t=this._cubeSize,n=this._sourceTarget;return(n===null||n.width!==t||e&&n.depthBuffer===!1)&&(n!==null&&n.dispose(),this._sourceTarget=qr(t,!0,e)),this._sourceTarget}_compileMaterial(e){this._boxMesh.material=e,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(e,t,n){let r=this._boxMesh,i=this._cubeCamera;r.material=n,i.renderTarget=e,i.activeMipmapLevel=t;let a=e.width>>t;e.viewport.set(0,0,a,a),i.update(this._renderer,r),e.viewport.set(0,0,e.width,e.height)}_textureToCubemap(e){let t;e.mapping===301||e.mapping===302?(this._cubemapMaterial===null&&(this._cubemapMaterial=$r()),t=this._cubemapMaterial,t.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=Qr()),t=this._equirectMaterial),t.uniforms.envMap.value=e,this._renderCube(this._getSourceTarget(),0,t)}_applyPMREM(t){this._ggxMaterial===null&&(this._ggxMaterial=Yr(),this._integrationMaterial=Xr());let n=this._cubeSize,r=t.texture.mipmaps.length-1,i=this._ggxMaterial.uniforms;i.envMap.value=this._sourceTarget.texture;let a=this._integrationMaterial.uniforms;a.envMap.value=this._sourceTarget.texture,a.sourceLod.value=Math.log2(n/Hr);for(let o=0;o<=r;o++){let s=e.lodToRoughness(o,r);if(o>r-Ur)a.roughness.value=s,this._renderCube(t,o,this._integrationMaterial);else{let e=s>0?Math.log2(n)+.5*Math.log2(6/(Vr*s**4))+.5:0;i.roughness.value=s,i.lodBias.value=e,this._renderCube(t,o,this._ggxMaterial)}}}_blur(e,t){this._blurMaterial===null&&(this._blurMaterial=Zr());let n=this._blurMaterial,r=n.uniforms,i=this._sourceTarget;r.sigma.value=Math.min(t,Math.PI)/Math.SQRT2,r.envMap.value=i.texture,this._renderCube(e,0,n),r.envMap.value=e.texture,this._renderCube(i,0,n)}};function qr(e,t,n){return new Lr(e,{minFilter:vt,generateMipmaps:t,type:ft,colorSpace:on,depthBuffer:n})}function Jr(e,t,n){return new dt({name:e,uniforms:t,vertexShader:Q.cube_vert,fragmentShader:n,side:1,blending:0,depthTest:!1,depthWrite:!1})}function Yr(){return Jr(`PMREMGGXConvolution`,{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${Vr}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Xr(){return Jr(`PMREMGGXIntegration`,{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:Hr}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Zr(){return Jr(`PMREMSphericalGaussianBlur`,{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${Br}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function Qr(){return Jr(`PMREMEquirectangularToCubemap`,{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function $r(){return Jr(`PMREMCubemapToCubemap`,{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function ei(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new Lr(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture&&t.isPMREMTexture!==!0){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new Kr(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new Kr(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function ti(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&Ze(`WebGLRenderer: `+e+` extension not supported.`),t}}}function ni(e,t,n,r){let i={},a=new WeakMap,o=new FinalizationRegistry(e=>delete i[e]);function s(e){c(e.target)}function c(e){e.index!==null&&t.remove(e.index);for(let n in e.attributes)t.remove(e.attributes[n]);e.removeEventListener(`dispose`,s),delete i[e.id],o.unregister(e);let c=a.get(e);c&&(t.remove(c),a.delete(e)),r.releaseStatesOfGeometry(e),e.isInstancedBufferGeometry===!0&&delete e._maxInstanceCount,n.memory.geometries--}function l(e,t){return i[t.id]===void 0&&(t.addEventListener(`dispose`,s),i[t.id]=new WeakRef(t),o.register(t,t.id,t),n.memory.geometries++),t}function u(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function d(e){let n=e.index,r=e.attributes.position,i=0;if(r===void 0)return;let o=n===null?r.array.length/3-1:n.array.length,s=new(r.count>=65535?xt:Ce)(Math.ceil(o/3)*6,1),c=s.array;if(n!==null){let e=n.array;i=n.version;for(let t=0,n=0;t<o;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];c[n++]=r,c[n++]=i,c[n++]=i,c[n++]=a,c[n++]=a,c[n++]=r}}else{i=r.version;for(let e=0,t=0;e<o;e+=3){let n=e+0,r=e+1,i=e+2;c[t++]=n,c[t++]=r,c[t++]=r,c[t++]=i,c[t++]=i,c[t++]=n}}s.version=i;let l=a.get(e);l&&t.remove(l),a.set(e,s)}function f(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&d(e)}else d(e);return a.get(e)}function p(){for(let e in i){let t=i[e].deref();t!==void 0&&c(t)}}return{get:l,update:u,getWireframeAttribute:f,dispose:p}}function ri(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function ii(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:gt(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function ai(e,t,n){let r=new WeakMap,i=new Ct;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let h=new Float32Array(p*m*4*u),g=new ke(h,p,m,u);g.type=tt,g.needsUpdate=!0;let _=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*_;e===!0&&(i.fromBufferAttribute(r,t),h[d+s+0]=i.x,h[d+s+1]=i.y,h[d+s+2]=i.z,h[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),h[d+s+4]=i.x,h[d+s+5]=i.y,h[d+s+6]=i.z,h[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),h[d+s+8]=i.x,h[d+s+9]=i.y,h[d+s+10]=i.z,h[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:g,size:new an(p,m)},r.set(o,d);function v(){g.dispose(),r.delete(o),o.removeEventListener(`dispose`,v)}o.addEventListener(`dispose`,v)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function oi(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var si={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function ci(e,t,n,r,i,a){let o=new Ot(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),s=null,c=null,l=null,u=new wt;u.setAttribute(`position`,new He([-1,3,0,-1,-1,0,3,-1,0],3)),u.setAttribute(`uv`,new He([0,2,0,0,2,0],2));let d=new Ae({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),f=new Z(u,d),p=new Pt(-1,1,1,-1,0,1),m=null,h=null,g=!1,_,v=null,y=[],b=!1;this.setSize=function(e,t){o.setSize(e,t),s!==null&&s.setSize(e,t),c!==null&&c.setSize(e,t);for(let n=0;n<y.length;n++){let r=y[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){y=e,b=y.length>0&&y[0].isRenderPass===!0;let t=o.width,n=o.height;y.length>0&&s===null&&(s=new Ot(t,n,{type:ft,depthBuffer:!1,stencilBuffer:!1}),c=new Ot(t,n,{type:ft,depthBuffer:!1,stencilBuffer:!1}));let r=i===!0&&y.some(e=>e.needsDepthTexture===!0);r!==(o.depthTexture!==null)&&(r===!0&&l===null&&(l=new jt(t,n),a===!0&&(l.format=we,l.type=At)),o.dispose(),o.depthTexture=r?l:null,o.resolveDepthBuffer=r,o.storeMultisampledDepthBuffer=r);for(let e=0;e<y.length;e++){let i=y[e];i.setSize&&i.setSize(t,n),r&&i.needsDepthTexture===!0&&i.setDepthTexture&&i.setDepthTexture(l)}},this.begin=function(e,t){if(g||e.toneMapping===0&&y.length===0)return!1;if(v=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return b===!1&&e.setRenderTarget(o),_=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return b},this.end=function(e,t){e.toneMapping=_,g=!0;let n=o,r=s;for(let i=0;i<y.length;i++){let a=y[i];a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1&&(n=r,r=r===s?c:s))}if(m!==e.outputColorSpace||h!==e.toneMapping){m=e.outputColorSpace,h=e.toneMapping,d.defines={},pn.getTransfer(m)===`srgb`&&(d.defines.SRGB_TRANSFER=``);let t=si[h];t&&(d.defines[t]=``),d.needsUpdate=!0}d.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(v),e.render(f,p),v=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){o.dispose(),s!==null&&s.dispose(),c!==null&&c.dispose(),u.dispose(),d.dispose()}}var li=new q,ui=new jt(1,1),di=new De(1),fi=new ke,pi=new Me,mi=new un,hi=[],gi=[],_i=new Float32Array(16),vi=new Float32Array(9),yi=new Float32Array(4);function bi(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=hi[i];if(a===void 0&&(a=new Float32Array(i),hi[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function xi(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function Si(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function Ci(e,t){let n=gi[t];n===void 0&&(n=new Int32Array(t),gi[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function wi(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function Ti(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(xi(n,t))return;e.uniform2fv(this.addr,t),Si(n,t)}}function Ei(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(xi(n,t))return;e.uniform3fv(this.addr,t),Si(n,t)}}function Di(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(xi(n,t))return;e.uniform4fv(this.addr,t),Si(n,t)}}function Oi(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(xi(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),Si(n,t)}else{if(xi(n,r))return;yi.set(r),e.uniformMatrix2fv(this.addr,!1,yi),Si(n,r)}}function ki(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(xi(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),Si(n,t)}else{if(xi(n,r))return;vi.set(r),e.uniformMatrix3fv(this.addr,!1,vi),Si(n,r)}}function Ai(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(xi(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),Si(n,t)}else{if(xi(n,r))return;_i.set(r),e.uniformMatrix4fv(this.addr,!1,_i),Si(n,r)}}function ji(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function Mi(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(xi(n,t))return;e.uniform2iv(this.addr,t),Si(n,t)}}function Ni(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(xi(n,t))return;e.uniform3iv(this.addr,t),Si(n,t)}}function Pi(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(xi(n,t))return;e.uniform4iv(this.addr,t),Si(n,t)}}function Fi(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function Ii(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(xi(n,t))return;e.uniform2uiv(this.addr,t),Si(n,t)}}function Li(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(xi(n,t))return;e.uniform3uiv(this.addr,t),Si(n,t)}}function Ri(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(xi(n,t))return;e.uniform4uiv(this.addr,t),Si(n,t)}}function zi(e){return e.version===0&&(e.compareFunction=519,e.needsUpdate=!0),e}function Bi(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;a=this.type===e.SAMPLER_2D_SHADOW?zi(ui):li,n.setTexture2D(t||a,i)}function Vi(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||pi,i)}function Hi(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;a=this.type===e.SAMPLER_CUBE_SHADOW?zi(di):mi,n.setTextureCube(t||a,i)}function Ui(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||fi,i)}function Wi(e){switch(e){case 5126:return wi;case 35664:return Ti;case 35665:return Ei;case 35666:return Di;case 35674:return Oi;case 35675:return ki;case 35676:return Ai;case 5124:case 35670:return ji;case 35667:case 35671:return Mi;case 35668:case 35672:return Ni;case 35669:case 35673:return Pi;case 5125:return Fi;case 36294:return Ii;case 36295:return Li;case 36296:return Ri;case 35678:case 36198:case 36298:case 36306:case 35682:return Bi;case 35679:case 36299:case 36307:return Vi;case 35680:case 36300:case 36308:case 36293:return Hi;case 36289:case 36303:case 36311:case 36292:return Ui}}function Gi(e,t){e.uniform1fv(this.addr,t)}function Ki(e,t){let n=bi(t,this.size,2);e.uniform2fv(this.addr,n)}function qi(e,t){let n=bi(t,this.size,3);e.uniform3fv(this.addr,n)}function Ji(e,t){let n=bi(t,this.size,4);e.uniform4fv(this.addr,n)}function Yi(e,t){let n=bi(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function Xi(e,t){let n=bi(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function Zi(e,t){let n=bi(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function Qi(e,t){e.uniform1iv(this.addr,t)}function $i(e,t){e.uniform2iv(this.addr,t)}function ea(e,t){e.uniform3iv(this.addr,t)}function ta(e,t){e.uniform4iv(this.addr,t)}function na(e,t){e.uniform1uiv(this.addr,t)}function ra(e,t){e.uniform2uiv(this.addr,t)}function ia(e,t){e.uniform3uiv(this.addr,t)}function aa(e,t){e.uniform4uiv(this.addr,t)}function oa(e,t,n){let r=this.cache,i=t.length,a=Ci(n,i);xi(r,a)||(e.uniform1iv(this.addr,a),Si(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?zi(ui):li;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function sa(e,t,n){let r=this.cache,i=t.length,a=Ci(n,i);xi(r,a)||(e.uniform1iv(this.addr,a),Si(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||pi,a[e])}function ca(e,t,n){let r=this.cache,i=t.length,a=Ci(n,i);xi(r,a)||(e.uniform1iv(this.addr,a),Si(r,a));let o;o=this.type===e.SAMPLER_CUBE_SHADOW?zi(di):mi;for(let e=0;e!==i;++e)n.setTextureCube(t[e]||o,a[e])}function la(e,t,n){let r=this.cache,i=t.length,a=Ci(n,i);xi(r,a)||(e.uniform1iv(this.addr,a),Si(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||fi,a[e])}function ua(e){switch(e){case 5126:return Gi;case 35664:return Ki;case 35665:return qi;case 35666:return Ji;case 35674:return Yi;case 35675:return Xi;case 35676:return Zi;case 5124:case 35670:return Qi;case 35667:case 35671:return $i;case 35668:case 35672:return ea;case 35669:case 35673:return ta;case 5125:return na;case 36294:return ra;case 36295:return ia;case 36296:return aa;case 35678:case 36198:case 36298:case 36306:case 35682:return oa;case 35679:case 36299:case 36307:return sa;case 35680:case 36300:case 36308:case 36293:return ca;case 36289:case 36303:case 36311:case 36292:return la}}var da=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Wi(t.type)}},fa=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=ua(t.type)}},pa=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},ma=/(\w+)(\])?(\[|\.)?/g;function ha(e,t){e.seq.push(t),e.map[t.id]=t}function ga(e,t,n){let r=e.name,i=r.length;for(ma.lastIndex=0;;){let a=ma.exec(r),o=ma.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){ha(n,l===void 0?new da(s,e,t):new fa(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new pa(s),ha(n,e)),n=e}}}var _a=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);ga(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function va(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var ya=37297,ba=0;function xa(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var Sa=new J;function Ca(e){pn._getMatrix(Sa,pn.workingColorSpace,e);let t=`mat3( ${Sa.elements.map(e=>e.toFixed(4))} )`;switch(pn.getTransfer(e)){case bt:return[t,`LinearTransferOETF`];case yn:return[t,`sRGBTransferOETF`];default:return V(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function wa(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+xa(e.getShaderSource(t),r)}return i}function Ta(e,t){let n=Ca(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( ${n[0]} * value.rgb, value.a ) );`,`}`].join(`
`)}var Ea={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function Da(e,t){let n=Ea[t];return n===void 0?(V(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var Oa=new X;function ka(){return pn.getLuminanceCoefficients(Oa),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${Oa.x.toFixed(4)}, ${Oa.y.toFixed(4)}, ${Oa.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function Aa(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(Na).join(`
`)}function ja(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function Ma(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function Na(e){return e!==``}function Pa(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,t.numLightProbeGrids)}function Fa(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var Ia=/^[ \t]*#include +<([\w\d./]+)>/gm;function La(e){return e.replace(Ia,Ra)}function Ra(e,t){let n=Q[t];if(n===void 0)throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`);return La(n)}var za=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ba(e){return e.replace(za,Va)}function Va(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function Ha(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var Ua={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function Wa(e){return Ua[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var Ga={302:`ENVMAP_MODE_REFRACTION`};function Ka(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Ga[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var qa={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function Ja(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:qa[e.combine]||`ENVMAP_BLENDING_NONE`}function Ya(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=Wa(n),l=n.envMapPMREM===!0?`ENVMAP_TYPE_PMREM`:`ENVMAP_TYPE_CUBE`,u=Ka(n),d=Ja(n),f=Aa(n),p=ja(a),m=i.createProgram(),h,g,_=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(h=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p].filter(Na).join(`
`),h.length>0&&(h+=`
`),g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p].filter(Na).join(`
`),g.length>0&&(g+=`
`)):(h=[Ha(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.diffuseRoughnessMap?`#define USE_DIFFUSE_ROUGHNESSMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.diffuseRoughnessMapUv?`#define DIFFUSE_ROUGHNESSMAP_UV `+n.diffuseRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(Na).join(`
`),g=[Ha(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,n.envMapPMREM?`#define ENVMAP_MAX_LOD `+n.envMapMaxLod+`.0`:``,n.envMapPMREM?`#define ENVMAP_SIZE `+n.envMapSize+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.diffuseRoughness?`#define USE_DIFFUSE_ROUGHNESS`:``,n.diffuseRoughnessMap?`#define USE_DIFFUSE_ROUGHNESSMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.retroreflection?`#define USE_RETROREFLECTION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:Q.tonemapping_pars_fragment,n.toneMapping===0?``:Da(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,Q.colorspace_pars_fragment,Ta(`linearToOutputTexel`,n.outputColorSpace),ka(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(Na).join(`
`)),o=La(o),o=Pa(o,n),o=Fa(o,n),s=La(s),s=Pa(s,n),s=Fa(s,n),o=Ba(o),s=Ba(s),n.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,h=[f,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+h,g=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+g);let v=_+h+o,y=_+g+s,b=va(i,i.VERTEX_SHADER,v),x=va(i,i.FRAGMENT_SHADER,y);i.attachShader(m,b),i.attachShader(m,x),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(m,0,`position`):i.bindAttribLocation(m,0,n.index0AttributeName),i.linkProgram(m);function S(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(m)||``,r=i.getShaderInfoLog(b)||``,a=i.getShaderInfoLog(x)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(m,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,m,b,x);else{let e=wa(i,b,`vertex`),n=wa(i,x,`fragment`);gt(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(m,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):V(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:h},fragmentShader:{log:c,prefix:g}})}i.deleteShader(b),i.deleteShader(x),C=new _a(i,m),w=Ma(i,m)}let C;this.getUniforms=function(){return C===void 0&&S(this),C};let w;this.getAttributes=function(){return w===void 0&&S(this),w};let T=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return T===!1&&(T=i.getProgramParameter(m,ya)),T},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(m),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=ba++,this.cacheKey=t,this.usedTimes=1,this.program=m,this.vertexShader=b,this.fragmentShader=x,this}var Xa=0,Za=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Qa(e),t.set(e,n)),n}},Qa=class{constructor(e){this.id=Xa++,this.code=e,this.usedTimes=0}};function $a(e){return e===1030||e===37490||e===36285}function eo(e,t,n,r,i,a){let o=new Kt,s=new Za,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function p(e){return c.add(e),e===0?`uv`:`uv${e}`}function m(i,o,l,u,m,h){let g=u.fog,_=m.geometry,v=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,b=t.get(i.envMap||v,y),x=f[i.type],S=r.precision;i.precision!==null&&(S=r.getMaxPrecision(i.precision),S!==i.precision&&V(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,S,`instead.`));let C=_.morphAttributes.position||_.morphAttributes.normal||_.morphAttributes.color,w=C===void 0?0:C.length,T=0;_.morphAttributes.position!==void 0&&(T=1),_.morphAttributes.normal!==void 0&&(T=2),_.morphAttributes.color!==void 0&&(T=3);let E,D,O,ee;if(x){let e=Or[x];E=e.vertexShader,D=e.fragmentShader}else{E=i.vertexShader,D=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),O=e.id,ee=t.id}let k=e.getRenderTarget(),A=e.state.buffers.depth.getReversed(),te=m.isInstancedMesh===!0,j=m.isBatchedMesh===!0,M=!!i.map,ne=!!i.matcap,re=!!b,N=re&&b.isPMREMTexture===!0,ie=!!i.aoMap,ae=!!i.lightMap,oe=!!i.bumpMap&&i.wireframe===!1,se=!!i.normalMap,P=!!i.displacementMap,ce=!!i.emissiveMap,le=!!i.metalnessMap,F=!!i.roughnessMap,ue=i.anisotropy>0,de=i.clearcoat>0,fe=i.diffuseRoughness>0,pe=i.dispersion>0,me=i.retroreflectivity>0,I=i.iridescence>0,he=i.sheen>0,ge=i.transmission>0,_e=ue&&!!i.anisotropyMap,ve=de&&!!i.clearcoatMap,ye=de&&!!i.clearcoatNormalMap,be=de&&!!i.clearcoatRoughnessMap,xe=fe&&!!i.diffuseRoughnessMap,L=I&&!!i.iridescenceMap,Se=I&&!!i.iridescenceThicknessMap,Ce=he&&!!i.sheenColorMap,we=he&&!!i.sheenRoughnessMap,R=!!i.specularMap,Te=!!i.specularColorMap,z=!!i.specularIntensityMap,Ee=ge&&!!i.transmissionMap,B=ge&&!!i.thicknessMap,De=!!i.gradientMap,Oe=!!i.alphaMap,ke=i.alphaTest>0,Ae=!!i.alphaHash,je=!!i.extensions,Me=0;i.toneMapped&&(k===null||k.isXRRenderTarget===!0)&&(Me=e.toneMapping);let Ne=N?b.isCompressedCubeTexture?b.image[0].mipmaps:b.mipmaps:null,Pe={shaderID:x,shaderType:i.type,shaderName:i.name,vertexShader:E,fragmentShader:D,defines:i.defines,customVertexShaderID:O,customFragmentShaderID:ee,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:S,batching:j,batchingColor:j&&m._colorsTexture!==null,instancing:te,instancingColor:te&&m.instanceColor!==null,instancingMorph:te&&m.morphTexture!==null,outputColorSpace:k===null?e.outputColorSpace:k.isXRRenderTarget===!0?k.texture.colorSpace:pn.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:M,matcap:ne,envMap:re,envMapMode:re&&b.mapping,envMapPMREM:N,envMapMaxLod:N?Ne.length-1:null,envMapSize:N?Ne[0].width:null,aoMap:ie,lightMap:ae,bumpMap:oe,normalMap:se,displacementMap:P,emissiveMap:ce,normalMapObjectSpace:se&&i.normalMapType===1,normalMapTangentSpace:se&&i.normalMapType===0,packedNormalMap:se&&i.normalMapType===0&&$a(i.normalMap.format),metalnessMap:le,roughnessMap:F,anisotropy:ue,anisotropyMap:_e,clearcoat:de,clearcoatMap:ve,clearcoatNormalMap:ye,clearcoatRoughnessMap:be,diffuseRoughness:fe,diffuseRoughnessMap:xe,dispersion:pe,retroreflection:me,iridescence:I,iridescenceMap:L,iridescenceThicknessMap:Se,sheen:he,sheenColorMap:Ce,sheenRoughnessMap:we,specularMap:R,specularColorMap:Te,specularIntensityMap:z,transmission:ge,transmissionMap:Ee,thicknessMap:B,gradientMap:De,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Oe,alphaTest:ke,alphaHash:Ae,combine:i.combine,mapUv:M&&p(i.map.channel),aoMapUv:ie&&p(i.aoMap.channel),lightMapUv:ae&&p(i.lightMap.channel),bumpMapUv:oe&&p(i.bumpMap.channel),normalMapUv:se&&p(i.normalMap.channel),displacementMapUv:P&&p(i.displacementMap.channel),emissiveMapUv:ce&&p(i.emissiveMap.channel),metalnessMapUv:le&&p(i.metalnessMap.channel),roughnessMapUv:F&&p(i.roughnessMap.channel),anisotropyMapUv:_e&&p(i.anisotropyMap.channel),clearcoatMapUv:ve&&p(i.clearcoatMap.channel),clearcoatNormalMapUv:ye&&p(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:be&&p(i.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:xe&&p(i.diffuseRoughnessMap.channel),iridescenceMapUv:L&&p(i.iridescenceMap.channel),iridescenceThicknessMapUv:Se&&p(i.iridescenceThicknessMap.channel),sheenColorMapUv:Ce&&p(i.sheenColorMap.channel),sheenRoughnessMapUv:we&&p(i.sheenRoughnessMap.channel),specularMapUv:R&&p(i.specularMap.channel),specularColorMapUv:Te&&p(i.specularColorMap.channel),specularIntensityMapUv:z&&p(i.specularIntensityMap.channel),transmissionMapUv:Ee&&p(i.transmissionMap.channel),thicknessMapUv:B&&p(i.thicknessMap.channel),alphaMapUv:Oe&&p(i.alphaMap.channel),vertexTangents:!!_.attributes.tangent&&(se||ue),vertexNormals:!!_.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!_.attributes.color&&_.attributes.color.itemSize===4,pointsUvs:m.isPoints===!0&&!!_.attributes.uv&&(M||Oe),fog:!!g,useFog:i.fog===!0,fogExp2:!!g&&g.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||_.attributes.normal===void 0&&se===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:A,skinning:m.isSkinnedMesh===!0,hasPositionAttribute:_.attributes.position!==void 0,morphTargets:_.morphAttributes.position!==void 0,morphNormals:_.morphAttributes.normal!==void 0,morphColors:_.morphAttributes.color!==void 0,morphTargetsCount:w,morphTextureStride:T,numSunLights:o.sun.length,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numSunLightShadows:o.sunShadowMap.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:h.filter(e=>e.texture!==null).length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:Me,decodeVideoTexture:M&&i.map.isVideoTexture===!0&&pn.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:ce&&i.emissiveMap.isVideoTexture===!0&&pn.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:je&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(je&&i.extensions.multiDraw===!0||j)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return Pe.vertexUv1s=c.has(1),Pe.vertexUv2s=c.has(2),Pe.vertexUv3s=c.has(3),c.clear(),Pe}function h(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(g(n,t),_(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function g(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapPMREM),e.push(t.envMapMaxLod),e.push(t.envMapSize),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.diffuseRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.numSunLights),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numSunLightShadows),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.numLightProbeGrids),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function _(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.retroreflection&&o.enable(24),t.diffuseRoughness&&o.enable(25),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function v(e){let t=f[e.type],n;if(t){let e=Or[t];n=nn.clone(e.uniforms)}else n=e.uniforms;return n}function y(t,n){let r=u.get(n);return r===void 0?(r=new Ya(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function b(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function x(e){s.remove(e)}function S(){s.dispose()}return{getParameters:m,getProgramCacheKey:h,getUniforms:v,acquireProgram:y,releaseProgram:b,releaseShaderCache:x,programs:l,dispose:S}}function to(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function no(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function ro(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function io(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l,u){u.reversedDepth===!0&&(c=-c);let d=s(e,t,a,o,c,l);a.transmission>0?r.push(d):a.transparent===!0?i.push(d):n.push(d)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t){n.length>1&&n.sort(e||no),r.length>1&&r.sort(t||ro),i.length>1&&i.sort(t||ro)}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function ao(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new io,e.set(t,[i])):n>=r.length?(i=new io,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function oo(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={direction:new X,color:new Y};break;case`SpotLight`:n={position:new X,direction:new X,color:new Y,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new X,color:new Y,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new X,skyColor:new Y,groundColor:new Y};break;case`RectAreaLight`:n={color:new Y,position:new X,halfWidth:new X,halfHeight:new X}}return e[t.id]=n,n}}}function so(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new an};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new an};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new an,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var co=0;function lo(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function uo(e){let t=new oo,n=so(),r={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new X);let i=new X,a=new ln,o=new ln;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,b=0,x=0;i.sort(lo);for(let e=0,S=i.length;e<S;e++){let S=i[e],C=S.color,w=S.intensity,T=S.distance,E=null;if(S.shadow&&S.shadow.map&&(E=S.shadow.map.texture.format===1030?S.shadow.map.texture:S.shadow.map.depthTexture||S.shadow.map.texture),S.isAmbientLight)a+=C.r*w,o+=C.g*w,s+=C.b*w;else if(S.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(S.sh.coefficients[e],w);x++}else if(S.isSunLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()),r.sunShadow[l]=t,r.sunShadowMap[l]=E;let i=e.getViewportCount();for(let t=0;t<i;t++)r.sunShadowMatrix[u+t]=e.getMatrix(t),r.sunShadowCascade[u+t]=e._cascadeData[t];u+=i,l++}r.sun[c]=e,c++}else if(S.isDirectionalLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[d]=t,r.directionalShadowMap[d]=E,r.directionalShadowMatrix[d]=S.shadow.matrix,g++}r.directional[d]=e,d++}else if(S.isSpotLight){let e=t.get(S);e.position.setFromMatrixPosition(S.matrixWorld),e.color.copy(C).multiplyScalar(w),e.distance=T,e.coneCos=Math.cos(S.angle),e.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),e.decay=S.decay,r.spot[p]=e;let i=S.shadow;if(S.map&&(r.spotLightMap[y]=S.map,y++,i.updateMatrices(S),S.castShadow&&b++),r.spotLightMatrix[p]=i.matrix,S.castShadow){let e=n.get(S);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[p]=e,r.spotShadowMap[p]=E,v++}p++}else if(S.isRectAreaLight){let e=t.get(S);e.color.copy(C).multiplyScalar(w),e.halfWidth.set(S.width*.5,0,0),e.halfHeight.set(0,S.height*.5,0),r.rectArea[m]=e,m++}else if(S.isPointLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),e.distance=S.distance,e.decay=S.decay,S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[f]=t,r.pointShadowMap[f]=E,r.pointShadowMatrix[f]=S.shadow.matrix,_++}r.point[f]=e,f++}else if(S.isHemisphereLight){let e=t.get(S);e.skyColor.copy(S.color).multiplyScalar(w),e.groundColor.copy(S.groundColor).multiplyScalar(w),r.hemi[h]=e,h++}}m>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=$.LTC_FLOAT_1,r.rectAreaLTC2=$.LTC_FLOAT_2):(r.rectAreaLTC1=$.LTC_HALF_1,r.rectAreaLTC2=$.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let S=r.hash;(S.sunLength!==c||S.directionalLength!==d||S.pointLength!==f||S.spotLength!==p||S.rectAreaLength!==m||S.hemiLength!==h||S.numSunShadows!==l||S.numDirectionalShadows!==g||S.numPointShadows!==_||S.numSpotShadows!==v||S.numSpotMaps!==y||S.numLightProbes!==x)&&(r.sun.length=c,r.directional.length=d,r.spot.length=p,r.rectArea.length=m,r.point.length=f,r.hemi.length=h,r.sunShadow.length=l,r.sunShadowMap.length=l,r.sunShadowMatrix.length=u,r.sunShadowCascade.length=u,r.directionalShadow.length=g,r.directionalShadowMap.length=g,r.directionalShadowMatrix.length=g,r.pointShadow.length=_,r.pointShadowMap.length=_,r.pointShadowMatrix.length=_,r.spotShadow.length=v,r.spotShadowMap.length=v,r.spotLightMatrix.length=v+y-b,r.spotLightMap.length=y,r.numSpotLightShadowsWithMaps=b,r.numLightProbes=x,S.sunLength=c,S.directionalLength=d,S.pointLength=f,S.spotLength=p,S.rectAreaLength=m,S.hemiLength=h,S.numSunShadows=l,S.numDirectionalShadows=g,S.numPointShadows=_,S.numSpotShadows=v,S.numSpotMaps=y,S.numLightProbes=x,r.version=co++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=0,f=t.matrixWorldInverse;for(let t=0,p=e.length;t<p;t++){let p=e[t];if(p.isSunLight){let e=r.sun[n];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),n++}else if(p.isDirectionalLight){let e=r.directional[s];e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),s++}else if(p.isSpotLight){let e=r.spot[l];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),l++}else if(p.isRectAreaLight){let e=r.rectArea[u];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),o.identity(),a.copy(p.matrixWorld),a.premultiply(f),o.extractRotation(a),e.halfWidth.set(p.width*.5,0,0),e.halfHeight.set(0,p.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),u++}else if(p.isPointLight){let e=r.point[c];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),c++}else if(p.isHemisphereLight){let e=r.hemi[d];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),d++}}}return{setup:s,setupView:c,state:r}}function fo(e){let t=new uo(e),n=[],r=[],i=[];function a(e){u.camera=e,n.length=0,r.length=0,i.length=0}function o(e){e.isLightProbeGrid?i.push(e):n.push(e)}function s(e){r.push(e)}function c(){t.setup(n),i.sort((e,t)=>e.priority-t.priority||e.id-t.id)}function l(e){t.setupView(n,e)}let u={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:u,setupLights:c,setupLightsView:l,pushLight:o,pushShadow:s}}function po(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new fo(e),t.set(n,[a])):r>=i.length?(a=new fo(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var mo=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,ho=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,go=[new X(1,0,0),new X(-1,0,0),new X(0,1,0),new X(0,-1,0),new X(0,0,1),new X(0,0,-1)],_o=[new X(0,-1,0),new X(0,-1,0),new X(0,0,1),new X(0,0,-1),new X(0,-1,0),new X(0,-1,0)],vo=new ln,yo=new X,bo=new X;function xo(e,t,n){let r=new Ee,i=new an,a=new an,o=new Ct,s=new hn,c=new it,l={},u=n.maxTextureSize,d={0:1,1:0,2:2},f=new dt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new an},radius:{value:4}},vertexShader:mo,fragmentShader:ho}),p=f.clone();p.defines.HORIZONTAL_PASS=1;let m=new wt;m.setAttribute(`position`,new Dt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let h=new Z(m,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let _=this.type;this.render=function(t,n,s){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||t.length===0)return;this.type===2&&(V(`WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.`),this.type=1);let c=e.getRenderTarget(),l=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),f=e.state;f.setBlending(0),f.buffers.depth.getReversed()===!0?f.buffers.color.setClear(0,0,0,0):f.buffers.color.setClear(1,1,1,1),f.buffers.depth.setTest(!0),f.setScissorTest(!1);let p=_!==this.type;p&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let c=0,l=t.length;c<l;c++){let l=t[c],d=l.shadow;if(d===void 0){V(`WebGLShadowMap:`,l,`has no shadow.`);continue}if(d.autoUpdate===!1&&d.needsUpdate===!1)continue;i.copy(d.mapSize);let m=d.getFrameExtents();i.multiply(m),a.copy(d.mapSize),(i.x>u||i.y>u)&&(i.x>u&&(a.x=Math.floor(u/m.x),i.x=a.x*m.x,d.mapSize.x=a.x),i.y>u&&(a.y=Math.floor(u/m.y),i.y=a.y*m.y,d.mapSize.y=a.y));let h=e.state.buffers.depth.getReversed();if(d.camera._reversedDepth=h,d.map===null||p===!0){if(d.map!==null&&(d.map.depthTexture!==null&&(d.map.depthTexture.dispose(),d.map.depthTexture=null),d.map.dispose()),this.type===3){if(l.isPointLight){V(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}d.map=new Ot(i.x,i.y,{format:ot,type:ft,minFilter:en,magFilter:en,generateMipmaps:!1}),d.map.texture.name=l.name+`.shadowMap`,d.map.depthTexture=new jt(i.x,i.y,tt),d.map.depthTexture.name=l.name+`.shadowMapDepth`,d.map.depthTexture.format=Ft,d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=Fe,d.map.depthTexture.magFilter=Fe}else l.isPointLight?(d.map=new Lr(i.x),d.map.depthTexture=new De(i.x,Jt)):(d.map=new Ot(i.x,i.y),d.map.depthTexture=new jt(i.x,i.y,Jt)),d.map.depthTexture.name=l.name+`.shadowMap`,d.map.depthTexture.format=Ft,this.type===1?(d.map.depthTexture.compareFunction=h?518:515,d.map.depthTexture.minFilter=en,d.map.depthTexture.magFilter=en):(d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=Fe,d.map.depthTexture.magFilter=Fe);d.camera.updateProjectionMatrix()}d.map.isWebGLCubeRenderTarget!==!0&&(d.map.width!==i.x||d.map.height!==i.y)&&d.map.setSize(i.x,i.y);let g=d.map.isWebGLCubeRenderTarget?6:d.getViewportCount();l.isPointLight!==!0&&d.updateMatrices(l,s);let _=d.camera.layers.mask&4294967294?d.camera.layers:s.layers;for(let t=0;t<g;t++){let i=d.getCamera(t);if(l.isPointLight){let e=d.camera,n=d.matrix,r=l.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),yo.setFromMatrixPosition(l.matrixWorld),e.position.copy(yo),bo.copy(e.position),bo.add(go[t]),e.up.copy(_o[t]),e.lookAt(bo),e.updateMatrixWorld(),n.makeTranslation(-yo.x,-yo.y,-yo.z),vo.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),d._frustum.setFromProjectionMatrix(vo,e.coordinateSystem,e.reversedDepth)}if(d.map.isWebGLCubeRenderTarget)e.setRenderTarget(d.map,t),e.clear();else{t===0&&(e.setRenderTarget(d.map),e.clear());let n=d.getViewport(t);o.set(a.x*n.x,a.y*n.y,a.x*n.z,a.y*n.w),f.viewport(o)}r=d.getFrustum(t),b(n,s,i,l,_,this.type)}d.isPointLightShadow!==!0&&this.type===3&&v(d,s),d.needsUpdate=!1}_=this.type,g.needsUpdate=!1,e.setRenderTarget(c,l,d)};function v(n,r){let a=t.update(h);f.defines.VSM_SAMPLES!==n.blurSamples&&(f.defines.VSM_SAMPLES=n.blurSamples,p.defines.VSM_SAMPLES=n.blurSamples,f.needsUpdate=!0,p.needsUpdate=!0),n.mapPass===null?n.mapPass=new Ot(i.x,i.y,{format:ot,type:ft}):(n.mapPass.width!==n.map.width||n.mapPass.height!==n.map.height)&&n.mapPass.setSize(n.map.width,n.map.height),f.uniforms.shadow_pass.value=n.map.depthTexture,f.uniforms.resolution.value.set(n.map.width,n.map.height),f.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,a,f,h,null),p.uniforms.shadow_pass.value=n.mapPass.texture,p.uniforms.resolution.value.set(n.map.width,n.map.height),p.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,a,p,h,null)}function y(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?c:s,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=l[e];r===void 0&&(r={},l[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,x)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?d[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function b(n,i,a,o,s,c){if(n.visible===!1)return;if(n.layers.test(s)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&c===3)&&(!n.frustumCulled||n.intersectsFrustum(r))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let r=t.update(n),s=n.material;if(Array.isArray(s)){let t=r.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=s[u.materialIndex];if(d&&d.visible){let t=y(n,d,o,c);n.onBeforeShadow(e,n,i,a,r,t,u),e.renderBufferDirect(a,null,r,t,n,u),n.onAfterShadow(e,n,i,a,r,t,u)}}}else if(s.visible){let t=y(n,s,o,c);n.onBeforeShadow(e,n,i,a,r,t,null),e.renderBufferDirect(a,null,r,t,n,null),n.onAfterShadow(e,n,i,a,r,t,null)}}let l=n.children;for(let e=0,t=l.length;e<t;e++)b(l[e],i,a,o,s,c)}function x(e){e.target.removeEventListener(`dispose`,x);for(let t in l){let n=l[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function So(e,t){function n(){let t=!1,n=new Ct,r=null,i=new Ct(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?le(e.DEPTH_TEST):F(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=qe[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?le(e.STENCIL_TEST):F(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c={},l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new Y(0,0,0),T=0,E=!1,D=null,O=null,ee=null,k=null,A=null,te=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),j=!1,M=0,ne=e.getParameter(e.VERSION);ne.indexOf(`WebGL`)===-1?ne.indexOf(`OpenGL ES`)!==-1&&(M=parseFloat(/^OpenGL ES (\d)/.exec(ne)[1]),j=M>=2):(M=parseFloat(/^WebGL (\d)/.exec(ne)[1]),j=M>=1);let re=null,N={},ie=e.getParameter(e.SCISSOR_BOX),ae=e.getParameter(e.VIEWPORT),oe=new Ct().fromArray(ie),se=new Ct().fromArray(ae);function P(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let ce={};ce[e.TEXTURE_2D]=P(e.TEXTURE_2D,e.TEXTURE_2D,1),ce[e.TEXTURE_CUBE_MAP]=P(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),ce[e.TEXTURE_2D_ARRAY]=P(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),ce[e.TEXTURE_3D]=P(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),le(e.DEPTH_TEST),o.setFunc(3),ge(!1),_e(1),le(e.CULL_FACE),I(0);function le(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function F(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function ue(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function de(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function fe(t){return h!==t&&(e.useProgram(t),h=t,!0)}let pe={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};pe[103]=e.MIN,pe[104]=e.MAX;let me={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function I(t,n,r,i,a,o,s,c,l,u){if(t===0)g===!0&&(F(e.BLEND),g=!1);else if(g===!1&&(le(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:gt(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:gt(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:gt(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:gt(`WebGLState: Invalid blending: `,t)}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}}else a||=n,o||=r,s||=i,(n!==v||a!==x)&&(e.blendEquationSeparate(pe[n],pe[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(me[r],me[i],me[o],me[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function he(t,n){t.side===2?F(e.CULL_FACE):le(e.CULL_FACE);let r=t.side===1;n&&(r=!r),ge(r),t.blending===1&&t.transparent===!1?I(0):I(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),ye(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?le(e.SAMPLE_ALPHA_TO_COVERAGE):F(e.SAMPLE_ALPHA_TO_COVERAGE)}function ge(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function _e(t){t===0?F(e.CULL_FACE):(le(e.CULL_FACE),t!==O&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),O=t}function ve(t){t!==ee&&(j&&e.lineWidth(t),ee=t)}function ye(t,n,r){t?(le(e.POLYGON_OFFSET_FILL),(k!==n||A!==r)&&(k=n,A=r,o.getReversed()&&(n=-n,r=-r),e.polygonOffset(n,r))):F(e.POLYGON_OFFSET_FILL)}function be(t){t?le(e.SCISSOR_TEST):F(e.SCISSOR_TEST)}function xe(t){t===void 0&&(t=e.TEXTURE0+te-1),re!==t&&(e.activeTexture(t),re=t)}function L(t,n,r){r===void 0&&(r=re===null?e.TEXTURE0+te-1:re);let i=N[r];i===void 0&&(i={type:void 0,texture:void 0},N[r]=i),(i.type!==t||i.texture!==n)&&(re!==r&&(e.activeTexture(r),re=r),e.bindTexture(t,n||ce[t]),i.type=t,i.texture=n)}function Se(){let t=N[re];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function Ce(){try{e.compressedTexImage2D(...arguments)}catch(e){gt(`WebGLState:`,e)}}function we(){try{e.compressedTexImage3D(...arguments)}catch(e){gt(`WebGLState:`,e)}}function R(){try{e.texSubImage2D(...arguments)}catch(e){gt(`WebGLState:`,e)}}function Te(){try{e.texSubImage3D(...arguments)}catch(e){gt(`WebGLState:`,e)}}function z(){try{e.compressedTexSubImage2D(...arguments)}catch(e){gt(`WebGLState:`,e)}}function Ee(){try{e.compressedTexSubImage3D(...arguments)}catch(e){gt(`WebGLState:`,e)}}function B(){try{e.texStorage2D(...arguments)}catch(e){gt(`WebGLState:`,e)}}function De(){try{e.texStorage3D(...arguments)}catch(e){gt(`WebGLState:`,e)}}function Oe(){try{e.texImage2D(...arguments)}catch(e){gt(`WebGLState:`,e)}}function ke(){try{e.texImage3D(...arguments)}catch(e){gt(`WebGLState:`,e)}}function Ae(t){return d[t]===void 0?e.getParameter(t):d[t]}function V(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function je(t){oe.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),oe.copy(t))}function Me(t){se.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),se.copy(t))}function Ne(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),e.uniformBlockBinding(n,i,i),r.set(t,i))}function Pe(t,n,r){let i=l.get(n).get(t);c[i]!==r&&(e.bindBufferBase(e.UNIFORM_BUFFER,i,r),c[i]=r)}function Fe(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},re=null,N={},f={},c={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new Y(0,0,0),T=0,E=!1,D=null,O=null,ee=null,k=null,A=null,oe.set(0,0,e.canvas.width,e.canvas.height),se.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:le,disable:F,bindFramebuffer:ue,drawBuffers:de,useProgram:fe,setBlending:I,setMaterial:he,setFlipSided:ge,setCullFace:_e,setLineWidth:ve,setPolygonOffset:ye,setScissorTest:be,activeTexture:xe,bindTexture:L,unbindTexture:Se,compressedTexImage2D:Ce,compressedTexImage3D:we,texImage2D:Oe,texImage3D:ke,pixelStorei:V,getParameter:Ae,updateUBOMapping:Ne,uniformBlockBinding:Pe,texStorage2D:B,texStorage3D:De,texSubImage2D:R,texSubImage3D:Te,compressedTexSubImage2D:z,compressedTexSubImage3D:Ee,scissor:je,viewport:Me,reset:Fe}}function Co(e,t,n,r,i,a,o){let s=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,c=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),l=new an,u=new WeakMap,d=new Set,f,p=new WeakMap,m=new Set,h=new FinalizationRegistry(e=>m.delete(e)),g=!1;try{g=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function _(e,t){return g?new OffscreenCanvas(e,t):_n(`canvas`)}function v(e,t,n){let r=1,i=De(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);f===void 0&&(f=_(n,a));let o=t?_(n,a):f;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),V(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&V(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function y(e){return e.generateMipmaps}function b(t){e.generateMipmap(t)}function x(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function S(n,r,i,a,o,s=!1){if(n!==null){if(e[n]!==void 0)return e[n];V(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let c;a&&(c=t.get(`EXT_texture_norm16`),c||V(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=r;if(r===e.RED&&(i===e.FLOAT&&(l=e.R32F),i===e.HALF_FLOAT&&(l=e.R16F),i===e.UNSIGNED_BYTE&&(l=e.R8),i===e.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===e.SHORT&&c&&(l=c.R16_SNORM_EXT)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.R8UI),i===e.UNSIGNED_SHORT&&(l=e.R16UI),i===e.UNSIGNED_INT&&(l=e.R32UI),i===e.BYTE&&(l=e.R8I),i===e.SHORT&&(l=e.R16I),i===e.INT&&(l=e.R32I)),r===e.RG&&(i===e.FLOAT&&(l=e.RG32F),i===e.HALF_FLOAT&&(l=e.RG16F),i===e.UNSIGNED_BYTE&&(l=e.RG8),i===e.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===e.SHORT&&c&&(l=c.RG16_SNORM_EXT)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RG8UI),i===e.UNSIGNED_SHORT&&(l=e.RG16UI),i===e.UNSIGNED_INT&&(l=e.RG32UI),i===e.BYTE&&(l=e.RG8I),i===e.SHORT&&(l=e.RG16I),i===e.INT&&(l=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGB8UI),i===e.UNSIGNED_SHORT&&(l=e.RGB16UI),i===e.UNSIGNED_INT&&(l=e.RGB32UI),i===e.BYTE&&(l=e.RGB8I),i===e.SHORT&&(l=e.RGB16I),i===e.INT&&(l=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(l=e.RGBA16UI),i===e.UNSIGNED_INT&&(l=e.RGBA32UI),i===e.BYTE&&(l=e.RGBA8I),i===e.SHORT&&(l=e.RGBA16I),i===e.INT&&(l=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===e.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===e.UNSIGNED_INT_5_9_9_9_REV&&(l=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(l=e.R11F_G11F_B10F)),r===e.RGBA){let t=s?bt:pn.getTransfer(o);i===e.FLOAT&&(l=e.RGBA32F),i===e.HALF_FLOAT&&(l=e.RGBA16F),i===e.UNSIGNED_BYTE&&(l=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===e.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===e.UNSIGNED_SHORT_4_4_4_4&&(l=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(l=e.RGB5_A1)}return(l===e.R16F||l===e.R32F||l===e.RG16F||l===e.RG32F||l===e.RGBA16F||l===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),l}function C(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,V(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function w(e,t){return y(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function T(e){let t=new WeakRef(e);r.get(e).__ref=t,m.add(t),h.register(e,t,t)}function E(e){let t=r.get(e).__ref;t!==void 0&&(m.delete(t),h.unregister(t))}function D(e){ee(e.target)}function O(e){k(e.target)}function ee(e){e.removeEventListener(`dispose`,D),E(e),te(e),e.isVideoTexture&&u.delete(e),e.isHTMLTexture&&d.delete(e)}function k(e){e.removeEventListener(`dispose`,O),E(e),M(e)}function A(){for(let e of m){let t=e.deref();t!==void 0&&(t.isRenderTarget===!0?k(t):ee(t))}m.clear(),d.clear()}function te(e){let t=r.get(e);if(t.__webglInit===void 0)return;let n=e.source,i=p.get(n);if(i){let r=i[t.__cacheKey];r.usedTimes--,r.usedTimes===0&&j(e),Object.keys(i).length===0&&p.delete(n)}r.remove(e)}function j(t){let n=r.get(t);e.deleteTexture(n.__webglTexture);let i=t.source,a=p.get(i);delete a[n.__cacheKey],o.memory.textures--}function M(t){let n=r.get(t);n.__depthDisposeCallback&&n.__depthDisposeCallback();let i=t.depthTexture;if(i&&i.renderTarget===t&&ee(i),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let a=t.textures;for(let t=0,n=a.length;t<n;t++){let n=r.get(a[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),o.memory.textures--),r.remove(a[t])}r.remove(t)}let ne=0;function re(){ne=0}function N(){return ne}function ie(e){ne=e}function ae(){let e=ne;return e>=i.maxTextures&&V(`WebGLTextures: Trying to use `+(e+1)+` texture units while this GPU supports only `+i.maxTextures),ne+=1,e}function oe(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.mipmapsAutoUpdate),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function se(t,i){let a=r.get(t);if(t.isVideoTexture&&Ee(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)V(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)V(`WebGLRenderer: Texture marked for update but image is incomplete`);else{he(a,t,i);return}}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+i)}function P(t,i){let a=r.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?he(a,t,i):(t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null),n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+i))}function ce(t,i){let a=r.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?he(a,t,i):n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+i)}function le(t,i){let a=r.get(t);t.version>0&&a.__version!==t.version?ge(a,t,i):n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+i)}let F={[We]:e.REPEAT,[gn]:e.CLAMP_TO_EDGE,[st]:e.MIRRORED_REPEAT},ue={[Fe]:e.NEAREST,[Qe]:e.NEAREST_MIPMAP_NEAREST,[je]:e.NEAREST_MIPMAP_LINEAR,[en]:e.LINEAR,[Bt]:e.LINEAR_MIPMAP_NEAREST,[vt]:e.LINEAR_MIPMAP_LINEAR},de={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function fe(n,a){if(a.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(a.magFilter===1006||a.magFilter===1007||a.magFilter===1005||a.magFilter===1008||a.minFilter===1006||a.minFilter===1007||a.minFilter===1005||a.minFilter===1008)&&V(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,F[a.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,F[a.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,F[a.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,ue[a.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,ue[a.minFilter]),a.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,de[a.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(a.magFilter===1003||a.minFilter!==1005&&a.minFilter!==1008||a.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(a.anisotropy>1||r.get(a).__currentAnisotropy){let o=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,o.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,i.getMaxAnisotropy())),r.get(a).__currentAnisotropy=a.anisotropy}}}function pe(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,D),T(n));let i=n.source,a=p.get(i);a===void 0&&(a={},p.set(i,a));let s=oe(n);if(s!==t.__cacheKey){a[s]===void 0&&(a[s]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,r=!0),a[s].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&j(n)),t.__cacheKey=s,t.__webglTexture=a[s].texture}return r}function me(e,t,n){return Math.floor(Math.floor(e/n)/t)}function I(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=me(n.start,r.width,4),c=me(t.start,r.width,4);n.start<=i+1&&a===c&&me(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=n.getParameter(e.UNPACK_ROW_LENGTH),l=n.getParameter(e.UNPACK_SKIP_PIXELS),u=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;n.pixelStorei(e.UNPACK_SKIP_PIXELS,u),n.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,c),n.pixelStorei(e.UNPACK_SKIP_PIXELS,l),n.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function he(t,o,s){let c=e.TEXTURE_2D;(o.isDataArrayTexture||o.isCompressedArrayTexture)&&(c=e.TEXTURE_2D_ARRAY),o.isData3DTexture&&(c=e.TEXTURE_3D);let l=pe(t,o),u=o.source;n.bindTexture(c,t.__webglTexture,e.TEXTURE0+s);let f=r.get(u);if(u.version!==f.__version||l===!0){if(n.activeTexture(e.TEXTURE0+s),!(typeof ImageBitmap<`u`&&o.image instanceof ImageBitmap)){let t=pn.getPrimaries(pn.workingColorSpace),r=o.colorSpace===``?null:pn.getPrimaries(o.colorSpace),i=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,i)}n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment);let t=v(o.image,!1,i.maxTextureSize);t=B(o,t);let r=a.convert(o.format,o.colorSpace),p=a.convert(o.type),m=S(o.internalFormat,r,p,o.normalized,o.colorSpace,o.isVideoTexture);fe(c,o);let h,g=o.mipmaps,_=o.isVideoTexture!==!0,x=f.__version===void 0||l===!0,T=u.dataReady,E=w(o,t);if(o.isDepthTexture)m=C(o.format===we,o.type),x&&(_?n.texStorage2D(e.TEXTURE_2D,1,m,t.width,t.height):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,null));else if(o.isDataTexture){if(g.length>0){_&&x&&n.texStorage2D(e.TEXTURE_2D,E,m,g[0].width,g[0].height);for(let t=0,i=g.length;t<i;t++)h=g[t],_?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data);o.generateMipmaps=!1}else _?(x&&n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height),T&&I(o,t,r,p)):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,t.data)}else if(o.isCompressedTexture){if(o.isCompressedArrayTexture){_&&x&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,g[0].width,g[0].height,t.depth);for(let i=0,a=g.length;i<a;i++)if(h=g[i],o.format!==1023){if(r!==null){if(_){if(T){if(o.layerUpdates.size>0){let t=W(h.width,h.height,o.format,o.type);for(let a of o.layerUpdates){let o=h.data.subarray(a*t/h.data.BYTES_PER_ELEMENT,(a+1)*t/h.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,a,h.width,h.height,1,r,o)}}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,h.data)}}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,h.data,0,0)}else V(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else _?T&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,p,h.data):n.texImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,r,p,h.data);o.layerUpdates.size>0&&o.clearLayerUpdates()}else{_&&x&&n.texStorage2D(e.TEXTURE_2D,E,m,g[0].width,g[0].height);for(let t=0,i=g.length;t<i;t++)h=g[t],o.format===1023?_?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data):r===null?V(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):_?T&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,h.data):n.compressedTexImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,h.data)}}else if(o.isDataArrayTexture){if(_){if(x&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,t.width,t.height,t.depth),T){if(o.layerUpdates.size>0){let i=W(t.width,t.height,o.format,o.type);for(let a of o.layerUpdates){let o=t.data.subarray(a*i/t.data.BYTES_PER_ELEMENT,(a+1)*i/t.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,a,t.width,t.height,1,r,p,o)}o.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)}}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,m,t.width,t.height,t.depth,0,r,p,t.data)}else if(o.isData3DTexture)_?(x&&n.texStorage3D(e.TEXTURE_3D,E,m,t.width,t.height,t.depth),T&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)):n.texImage3D(e.TEXTURE_3D,0,m,t.width,t.height,t.depth,0,r,p,t.data);else if(o.isFramebufferTexture){if(x){if(_)n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height);else{let i=t.width,a=t.height;for(let t=0;t<E;t++)n.texImage2D(e.TEXTURE_2D,t,m,i,a,0,r,p,null),i>>=1,a>>=1}}}else if(o.isHTMLTexture){if(`texElementImage2D`in e){let n=e.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),t.parentNode!==n){n.appendChild(t),d.add(o),n.onpaint=e=>{let t=e.changedElements;for(let e of d)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(e.texElementImage2D.length===3)e.texElementImage2D(e.TEXTURE_2D,e.RGBA8,t);else{let n=e.RGBA,r=e.RGBA,i=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,0,n,r,i,t)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(g.length>0){if(_&&x){let t=De(g[0]);n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height)}for(let t=0,i=g.length;t<i;t++)h=g[t],_?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,r,p,h):n.texImage2D(e.TEXTURE_2D,t,m,r,p,h);o.generateMipmaps=!1}else if(_){if(x){let r=De(t);n.texStorage2D(e.TEXTURE_2D,E,m,r.width,r.height)}T&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,r,p,t)}else n.texImage2D(e.TEXTURE_2D,0,m,r,p,t);y(o)&&o.mipmapsAutoUpdate===!0&&b(c),f.__version=u.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function ge(t,o,s){if(o.image.length!==6)return;let c=pe(t,o),l=o.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+s);let u=r.get(l);if(l.version!==u.__version||c===!0){n.activeTexture(e.TEXTURE0+s);let t=pn.getPrimaries(pn.workingColorSpace),r=o.colorSpace===``?null:pn.getPrimaries(o.colorSpace),d=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,d);let f=o.isCompressedTexture||o.image[0].isCompressedTexture,p=o.image[0]&&o.image[0].isDataTexture,m=[];for(let e=0;e<6;e++)!f&&!p?m[e]=v(o.image[e],!0,i.maxCubemapSize):m[e]=p?o.image[e].image:o.image[e],m[e]=B(o,m[e]);let h=m[0],g=a.convert(o.format,o.colorSpace),_=a.convert(o.type),x=S(o.internalFormat,g,_,o.normalized,o.colorSpace),T=o.isVideoTexture!==!0,E=u.__version===void 0||c===!0,D=l.dataReady,O=w(o,h);fe(e.TEXTURE_CUBE_MAP,o);let ee;if(o.isDepthTexture){if(x=C(o.format===we,o.type),E){if(T)n.texStorage2D(e.TEXTURE_CUBE_MAP,1,x,h.width,h.height);else for(let t=0;t<6;t++)n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,x,h.width,h.height,0,g,_,null)}}else if(f){T&&E&&n.texStorage2D(e.TEXTURE_CUBE_MAP,O,x,h.width,h.height);for(let t=0;t<6;t++){ee=m[t].mipmaps;for(let r=0;r<ee.length;r++){let i=ee[r];o.format===1023?T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,x,i.width,i.height,0,g,_,i.data):g===null?V(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):T?D&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,i.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,x,i.width,i.height,0,i.data)}}}else{if(ee=o.mipmaps,T&&E){ee.length>0&&O++;let t=De(m[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,O,x,t.width,t.height)}for(let t=0;t<6;t++)if(p){T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,m[t].width,m[t].height,g,_,m[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,x,m[t].width,m[t].height,0,g,_,m[t].data);for(let r=0;r<ee.length;r++){let i=ee[r].image[t].image;T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,x,i.width,i.height,0,g,_,i.data)}}else{T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,g,_,m[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,x,g,_,m[t]);for(let r=0;r<ee.length;r++){let i=ee[r];T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,g,_,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,x,g,_,i.image[t])}}}y(o)&&o.mipmapsAutoUpdate===!0&&b(e.TEXTURE_CUBE_MAP),u.__version=l.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function _e(t,i,o,c,l,u){let d=a.convert(o.format,o.colorSpace),f=a.convert(o.type),p=S(o.internalFormat,d,f,o.normalized,o.colorSpace),m=r.get(i),h=r.get(o);if(h.__renderTarget=i,!m.__hasExternalTextures){let t=Math.max(1,i.width>>u),r=Math.max(1,i.height>>u);l===e.TEXTURE_3D||l===e.TEXTURE_2D_ARRAY?n.texImage3D(l,u,p,t,r,i.depth,0,d,f,null):n.texImage2D(l,u,p,t,r,0,d,f,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),z(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,c,l,h.__webglTexture,0,Te(i)):(l===e.TEXTURE_2D||l>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&l<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,c,l,h.__webglTexture,u),n.bindFramebuffer(e.FRAMEBUFFER,null)}function ve(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=C(n.stencilBuffer,a),c=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;z(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Te(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,Te(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,c,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let o=t[i],c=a.convert(o.format,o.colorSpace),l=a.convert(o.type),u=S(o.internalFormat,c,l,o.normalized,o.colorSpace);z(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,Te(n),u,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,Te(n),u,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,u,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function ye(t,i,a){let o=i.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(i.depthTexture&&i.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let c=r.get(i.depthTexture);c.__renderTarget=i;let l=o?i.depthTexture.image[0]:i.depthTexture.image;c.__webglTexture&&l.width===i.width&&l.height===i.height||(l.width=i.width,l.height=i.height,i.depthTexture.needsUpdate=!0),o?le(i.depthTexture,0):se(i.depthTexture,0);let u=c.__webglTexture,d=Te(i),f=o?e.TEXTURE_CUBE_MAP_POSITIVE_X+a:e.TEXTURE_2D,p=i.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(i.depthTexture.format===1026)z(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else if(i.depthTexture.format===1027)z(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function be(t){let i=r.get(t),a=t.isWebGLCubeRenderTarget===!0;if(i.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(i.__depthDisposeCallback&&i.__depthDisposeCallback(),e){let t=()=>{delete i.__boundDepthTexture,delete i.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),i.__depthDisposeCallback=t}i.__boundDepthTexture=e}if(t.depthTexture&&!i.__autoAllocateDepthBuffer){if(a)for(let e=0;e<6;e++)ye(i.__webglFramebuffer[e],t,e);else t.texture.mipmaps.length>0?ye(i.__webglFramebuffer[0],t,0):ye(i.__webglFramebuffer,t,0)}else if(a){i.__webglDepthbuffer=[];for(let r=0;r<6;r++)if(n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[r]),i.__webglDepthbuffer[r]===void 0)i.__webglDepthbuffer[r]=e.createRenderbuffer(),ve(i.__webglDepthbuffer[r],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=i.__webglDepthbuffer[r];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else if(t.texture.mipmaps.length>0?n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer),i.__webglDepthbuffer===void 0)i.__webglDepthbuffer=e.createRenderbuffer(),ve(i.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,r=i.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,r),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,r)}n.bindFramebuffer(e.FRAMEBUFFER,null)}function xe(t,n,i){let a=r.get(t);n!==void 0&&_e(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),i!==void 0&&be(t)}function L(t){let i=t.texture,s=r.get(t),c=r.get(i);t.addEventListener(`dispose`,O),T(t);let l=t.textures,u=t.isWebGLCubeRenderTarget===!0,d=l.length>1;if(d||(c.__webglTexture===void 0&&(c.__webglTexture=e.createTexture()),c.__version=i.version,o.memory.textures++),u){s.__webglFramebuffer=[];for(let t=0;t<6;t++)if(i.mipmaps.length>0){s.__webglFramebuffer[t]=[];for(let n=0;n<i.mipmaps.length;n++)s.__webglFramebuffer[t][n]=e.createFramebuffer()}else s.__webglFramebuffer[t]=e.createFramebuffer()}else{if(i.mipmaps.length>0){s.__webglFramebuffer=[];for(let t=0;t<i.mipmaps.length;t++)s.__webglFramebuffer[t]=e.createFramebuffer()}else s.__webglFramebuffer=e.createFramebuffer();if(d)for(let t=0,n=l.length;t<n;t++){let n=r.get(l[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),o.memory.textures++)}if(t.samples>0&&z(t)===!1){s.__webglMultisampledFramebuffer=e.createFramebuffer(),s.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,s.__webglMultisampledFramebuffer);for(let n=0;n<l.length;n++){let r=l[n];s.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,s.__webglColorRenderbuffer[n]);let i=a.convert(r.format,r.colorSpace),o=a.convert(r.type),c=S(r.internalFormat,i,o,r.normalized,r.colorSpace,t.isXRRenderTarget===!0),u=Te(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,u,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,s.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(s.__webglDepthRenderbuffer=e.createRenderbuffer(),ve(s.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(u){n.bindTexture(e.TEXTURE_CUBE_MAP,c.__webglTexture),fe(e.TEXTURE_CUBE_MAP,i);for(let n=0;n<6;n++)if(i.mipmaps.length>0)for(let r=0;r<i.mipmaps.length;r++)_e(s.__webglFramebuffer[n][r],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,r);else _e(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);y(i)?b(e.TEXTURE_CUBE_MAP):i.mipmaps.length>0&&e.texParameteri(e.TEXTURE_CUBE_MAP,e.TEXTURE_MAX_LEVEL,i.mipmaps.length-1),n.unbindTexture()}else if(d){for(let i=0,a=l.length;i<a;i++){let a=l[i],o=r.get(a),c=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(c=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(c,o.__webglTexture),fe(c,a),_e(s.__webglFramebuffer,t,a,e.COLOR_ATTACHMENT0+i,c,0),y(a)&&b(c)}n.unbindTexture()}else{let r=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(r=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(r,c.__webglTexture),fe(r,i),i.mipmaps.length>0)for(let n=0;n<i.mipmaps.length;n++)_e(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,r,n);else _e(s.__webglFramebuffer,t,i,e.COLOR_ATTACHMENT0,r,0);y(i)?b(r):i.mipmaps.length>0&&e.texParameteri(r,e.TEXTURE_MAX_LEVEL,i.mipmaps.length-1),n.unbindTexture()}t.depthBuffer&&be(t)}function Se(e){let t=e.textures;for(let i=0,a=t.length;i<a;i++){let a=t[i];if(y(a)&&a.mipmapsAutoUpdate===!0){let t=x(e),i=r.get(a).__webglTexture;n.bindTexture(t,i),b(t),n.unbindTexture()}}}let Ce=[];function R(t){if(t.samples>0){if(z(t)===!1){let i=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,l=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,u=r.get(t),d=i.length>1;if(d)for(let t=0;t<i.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,u.__webglMultisampledFramebuffer),t.texture.mipmaps.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer);for(let n=0;n<i.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(s|=e.STENCIL_BUFFER_BIT)),d){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,u.__webglColorRenderbuffer[n]);let t=r.get(i[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),c===!0&&(Ce.length=0,Ce.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&Ce.push(l),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,Ce))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),d)for(let t=0;t<i.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,u.__webglColorRenderbuffer[t]);let a=r.get(i[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&c){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function Te(e){return Math.min(i.maxSamples,e.samples)}function z(e){let n=r.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function Ee(e){let t=o.render.frame;u.get(e)!==t&&(u.set(e,t),e.update())}function B(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(pn.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&V(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):gt(`WebGLTextures: Unsupported texture color space:`,n)),t}function De(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(l.width=e.naturalWidth||e.width,l.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(l.width=e.displayWidth,l.height=e.displayHeight):(l.width=e.width,l.height=e.height),l}this.allocateTextureUnit=ae,this.resetTextureUnits=re,this.getTextureUnits=N,this.setTextureUnits=ie,this.setTexture2D=se,this.setTexture2DArray=P,this.setTexture3D=ce,this.setTextureCube=le,this.rebindTextures=xe,this.setupRenderTarget=L,this.updateRenderTargetMipmap=Se,this.updateMultisampleRenderTarget=R,this.setupDepthRenderbuffer=be,this.setupFrameBufferTexture=_e,this.useMultisampledRTT=z,this.dispose=A}function wo(e,t){function n(n,r=``){let i,a=pn.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var To=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Eo=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Do=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new $e(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new dt({vertexShader:To,fragmentShader:Eo,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Z(new et(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Oo=class extends Ke{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,l=null,u=null,d=null,f=null,p=null,m=typeof XRWebGLBinding<`u`,h=new Do,g={},_=t.getContextAttributes(),v=null,y=null,b=[],x=[],S=new an,C=null,w=null,T=new Ge;T.viewport=new Ct;let E=new Ge;E.viewport=new Ct;let D=[T,E],O=new rn,ee=null,k=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=b[e];return t===void 0&&(t=new Tt,b[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=b[e];return t===void 0&&(t=new Tt,b[e]=t),t.getGripSpace()},this.getHand=function(e){let t=b[e];return t===void 0&&(t=new Tt,b[e]=t),t.getHandSpace()};function A(e){let t=x.indexOf(e.inputSource);if(t===-1)return;let n=b[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function te(){r.removeEventListener(`select`,A),r.removeEventListener(`selectstart`,A),r.removeEventListener(`selectend`,A),r.removeEventListener(`squeeze`,A),r.removeEventListener(`squeezestart`,A),r.removeEventListener(`squeezeend`,A),r.removeEventListener(`end`,te),r.removeEventListener(`inputsourceschange`,j);for(let e=0;e<b.length;e++){let t=x[e];t!==null&&(x[e]=null,b[e].disconnect(t))}ee=null,k=null,h.reset();for(let e in g)delete g[e];if(e.setRenderTarget(v),f=null,d=null,u=null,r=null,y=null,ie.stop(),n.isPresenting=!1,e.setPixelRatio(C),e.setSize(S.width,S.height,!1),w!==null){let e=w.camera;e.fov=w.fov,e.zoom=w.zoom,e.updateProjectionMatrix(),w=null}n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&V(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&V(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return d===null?f:d},this.getBinding=function(){return u===null&&m&&(u=new XRWebGLBinding(r,t)),u},this.getFrame=function(){return p},this.getSession=function(){return r},this.setSession=async function(l){if(r=l,r!==null){if(v=e.getRenderTarget(),r.addEventListener(`select`,A),r.addEventListener(`selectstart`,A),r.addEventListener(`selectend`,A),r.addEventListener(`squeeze`,A),r.addEventListener(`squeezestart`,A),r.addEventListener(`squeezeend`,A),r.addEventListener(`end`,te),r.addEventListener(`inputsourceschange`,j),_.xrCompatible!==!0&&await t.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(S),m&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;_.depth&&(o=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=_.stencil?we:Ft,a=_.stencil?At:Jt);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};u=this.getBinding(),d=u.createProjectionLayer(s),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),y=new Ot(d.textureWidth,d.textureHeight,{format:H,type:Gt,depthTexture:new jt(d.textureWidth,d.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{let n={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:i};f=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),y=new Ot(f.framebufferWidth,f.framebufferHeight,{format:H,type:Gt,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),ie.setContext(r),ie.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return h.getDepthTexture()};function j(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=x.indexOf(n);r>=0&&(x[r]=null,b[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=x.indexOf(n);if(r===-1){for(let e=0;e<b.length;e++)if(e>=x.length){x.push(n),r=e;break}else if(x[e]===null){x[e]=n,r=e;break}if(r===-1)break}let i=b[r];i&&i.connect(n)}}function M(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;h.texture!==null&&(h.depthNear>0&&(t=h.depthNear),h.depthFar>0&&(n=h.depthFar)),O.near=E.near=T.near=t,O.far=E.far=T.far=n,(ee!==O.near||k!==O.far)&&(r.updateRenderState({depthNear:O.near,depthFar:O.far}),ee=O.near,k=O.far),O.layers.mask=e.layers.mask|6,T.layers.mask=O.layers.mask&-5,E.layers.mask=O.layers.mask&-3;let i=e.parent,a=O.cameras;M(O,i);for(let e=0;e<a.length;e++)M(a[e],i);O.projectionMatrix.copy(T.projectionMatrix),O.projectionMatrixInverse.copy(T.projectionMatrixInverse),w===null&&e.isPerspectiveCamera&&(w={camera:e,fov:e.fov,zoom:e.zoom}),ne(e,O,i)};function ne(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=lt*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return O},this.getFoveation=function(){if(d!==null||f!==null)return s},this.setFoveation=function(e){s=e,d!==null&&(d.fixedFoveation=e),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=e)},this.hasDepthSensing=function(){return h.texture!==null},this.getDepthSensingMesh=function(){return h.getMesh(O)},this.getCameraTexture=function(e){return g[e]};let re=null;function N(t,i){if(l=i.getViewerPose(c||a),p=i,l!==null){let t=l.views;f!==null&&(e.setRenderTargetFramebuffer(y,f.framebuffer),e.setRenderTarget(y));let i=!1;t.length!==O.cameras.length&&(O.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(f!==null)a=f.getViewport(r);else{let t=u.getViewSubImage(d,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(y,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(y))}let o=D[n];o===void 0&&(o=new Ge,o.layers.enable(n),o.viewport=new Ct,D[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(O.matrix.copy(o.matrix),O.matrix.decompose(O.position,O.quaternion,O.scale)),i===!0&&O.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&m){u=n.getBinding();let e=u.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&h.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&m){e.state.unbindTexture(),u=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=g[n];e||(e=new $e,g[n]=e);let t=u.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<b.length;e++){let t=x[e],n=b[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}re&&re(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),p=null}let ie=new Er;ie.setAnimationLoop(N),this.setAnimationLoop=function(e){re=e},this.dispose=function(){}}},ko=new ln,Ao=new J;Ao.set(-1,0,0,0,1,0,0,0,1);function jo(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,Oe(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(ko.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(Ao),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.diffuseRoughness>0&&(e.diffuseRoughness.value=t.diffuseRoughness,t.diffuseRoughnessMap&&(e.diffuseRoughnessMap.value=t.diffuseRoughnessMap,n(t.diffuseRoughnessMap,e.diffuseRoughnessMapTransform))),t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.retroreflectivity>0&&(e.retroreflectivity.value=t.retroreflectivity),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessMinimum,e.iridescenceThicknessMaximum.value=t.iridescenceThicknessMaximum,t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function Mo(e,t,n,r){let i={},a={};function o(e,t){let n=t.program;r.uniformBlockBinding(e,n,i[e.id])}function s(e,n){let o=i[e.id];o===void 0&&(m(e),o=c(e),i[e.id]=o,e.addEventListener(`dispose`,g));let s=n.program;r.updateUBOMapping(e,s);let u=t.render.frame;a[e.id]!==u&&(l(e),a[e.id]=u)}function c(t){let n=e.createBuffer(),r=t.__size,i=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,n),e.bufferData(e.UNIFORM_BUFFER,r,i),e.bindBuffer(e.UNIFORM_BUFFER,null),n}function l(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)u(t[n],e,n,a);else u(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function u(t,n,r,i){if(f(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=h(i,!0);d(i,t.__data,e),e+=a.storage/Float32Array.BYTES_PER_ELEMENT}}else d(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function d(e,t,n){typeof e==`number`||typeof e==`boolean`?t[n]=e:e.isMatrix3?(t[n]=e.elements[0],t[n+1]=e.elements[1],t[n+2]=e.elements[2],t[n+3]=0,t[n+4]=e.elements[3],t[n+5]=e.elements[4],t[n+6]=e.elements[5],t[n+7]=0,t[n+8]=e.elements[6],t[n+9]=e.elements[7],t[n+10]=e.elements[8],t[n+11]=0):ArrayBuffer.isView(e)?t.set(e.subarray(0,t.length-n),n):e.toArray(t,n)}function f(e,t,n,r){let i=e.value,a=t+`_`+n;if(Array.isArray(i)){r[a]===void 0&&(r[a]=[]);let e=r[a],t=!1;for(let n=0;n<i.length;n++)p(i[n],e,n)===!0&&(t=!0);return t}return p(i,r,a)}function p(e,t,n){if(t[n]===void 0)return t[n]=typeof e==`number`||typeof e==`boolean`?e:ArrayBuffer.isView(e)?e.slice():e.clone(),!0;{let r=t[n];if(typeof e==`number`||typeof e==`boolean`){if(r!==e)return t[n]=e,!0}else if(ArrayBuffer.isView(e))return!0;else if(r.equals(e)===!1)return r.copy(e),!0}return!1}function m(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let i=0,a=r.length;i<a;i++){let a=r[i],o=Array.isArray(a.value)?a.value:[a.value],s=Array.isArray(t[e])||Array.isArray(a.value),c=n;for(let e=0,t=o.length;e<t;e++){let t=o[e],r=h(t,s),i=n%16,a=i%r.boundary,l=i+a;n+=a,l!==0&&16-l<r.storage&&(n+=16-l),e===0&&(c=n),n+=r.storage}a.__data=new(a.type===`int`?Int32Array:a.type===`uint`?Uint32Array:Float32Array)((n-c)/Float32Array.BYTES_PER_ELEMENT),a.__offset=c}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function h(e,t){let n={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(n.boundary=4,n.storage=4):e.isVector2?(n.boundary=8,n.storage=8):e.isVector3||e.isColor?(n.boundary=16,n.storage=12):e.isVector4?(n.boundary=16,n.storage=16):e.isMatrix3?(n.boundary=16,n.storage=48):e.isMatrix4?(n.boundary=16,n.storage=64):e.isTexture?V(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(n.boundary=16,n.storage=e.byteLength):V(`WebGLRenderer: Unsupported uniform value type.`,e),t===!0&&(n.boundary=16,n.storage=Math.ceil(n.storage/16)*16),n}function g(t){let n=t.target;n.removeEventListener(`dispose`,g),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function _(){for(let t in i)e.deleteBuffer(i[t]);i={},a={}}return{bind:o,update:s,dispose:_}}var No=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Po=null;function Fo(){return Po===null&&(Po=new Ye(No,16,16,ot,ft),Po.name=`DFG_LUT`,Po.minFilter=en,Po.magFilter=en,Po.wrapS=gn,Po.wrapT=gn,Po.generateMipmaps=!1,Po.needsUpdate=!0),Po}var Io=class{constructor(e={}){let{canvas:t=cn(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:c=!1,powerPreference:l=`default`,failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=Gt}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);p=n.getContextAttributes().alpha}else p=a;let m=f,h=new Set([pt,Ne,Mt]),g=new Set([Gt,Jt,zt,At,$t,_t]),_=new Uint32Array(4),v=new Int32Array(4),y={textures:[],min:[],max:[],resolution:[]},b=null,x=null,S=[],C=[],w=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let T=this,E=!1,D=null,O=null,ee=null,k=null;this._outputColorSpace=nt;let A=0,te=0,j=null,M=-1,ne=null,re=new Ct,N=new Ct,ie=null,ae=new Y(0),oe=0,se=t.width,P=t.height,ce=1,le=null,F=null,ue=new Ct(0,0,se,P),de=new Ct(0,0,se,P),fe=!1,pe=new Ee,me=new ut,I=!1,he=!1,ge=new ln,_e=new X,ve=new Ct,ye={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},be=!1;function xe(){return j===null?ce:1}let L=n;function Se(e,n){return t.getContext(e,n)}let Ce,we,R,Te,z,B,De,Oe,ke,Ae,je,Me,Fe,Ie,Le,Re,ze,H,Be,Ve,He,Ue,We;try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r187`),t.addEventListener(`webglcontextlost`,qe,!1),t.addEventListener(`webglcontextrestored`,Je,!1),t.addEventListener(`webglcontextcreationerror`,Ye,!1),L===null){let t=`webgl2`;if(L=Se(t,e),L===null)throw Se(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}Ge()}catch(e){throw t.removeEventListener(`webglcontextlost`,qe,!1),t.removeEventListener(`webglcontextrestored`,Je,!1),t.removeEventListener(`webglcontextcreationerror`,Ye,!1),gt(`WebGLRenderer: `+e.message),e}function Ge(){Ce=new ti(L),Ce.init(),He=new wo(L,Ce),we=new Fr(L,Ce,e,He),R=new So(L,Ce),we.reversedDepthBuffer&&d&&R.buffers.depth.setReversed(!0),O=L.createFramebuffer(),ee=L.createFramebuffer(),k=L.createFramebuffer(),Te=new ii(L),z=new to,B=new Co(L,Ce,R,z,we,He,Te),De=new ei(T),Oe=new Dr(L),Ue=new Nr(L,Oe),ke=new ni(L,Oe,Te,Ue),Ae=new oi(L,ke,Oe,Ue,Te),H=new ai(L,we,B),Le=new Ir(z),je=new eo(T,De,Ce,we,Ue,Le),Me=new jo(T,z),Fe=new ao,Ie=new po(Ce),ze=new Mr(T,De,R,Ae,p,s),Re=new xo(T,Ae,we),We=new Mo(L,Te,we,R),Be=new Pr(L,Ce,Te),Ve=new ri(L,Ce,Te),Te.programs=je.programs,T.capabilities=we,T.extensions=Ce,T.properties=z,T.renderLists=Fe,T.shadowMap=Re,T.state=R,T.info=Te}m!==1009&&(w=new ci(m,t.width,t.height,o,r,i));let Ke=new Oo(T,L);this.xr=Ke,this.getContext=function(){return L},this.getContextAttributes=function(){return L.getContextAttributes()},this.forceContextLoss=function(){let e=Ce.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=Ce.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return ce},this.setPixelRatio=function(e){e!==void 0&&(ce=e,this.setSize(se,P,!1))},this.getSize=function(e){return e.set(se,P)},this.setSize=function(e,n,r=!0){Ke.isPresenting?V(`WebGLRenderer: Can't change size while VR device is presenting.`):(se=e,P=n,t.width=Math.floor(e*ce),t.height=Math.floor(n*ce),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),w!==null&&w.setSize(t.width,t.height),this.setViewport(0,0,e,n))},this.getDrawingBufferSize=function(e){return e.set(se*ce,P*ce).floor()},this.setDrawingBufferSize=function(e,n,r){se=e,P=n,ce=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(m===1009)gt(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);else{if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){V(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}w.setEffects(e||[])}},this.getCurrentViewport=function(e){return e.copy(re)},this.getViewport=function(e){return e.copy(ue)},this.setViewport=function(e,t,n,r){e.isVector4?ue.set(e.x,e.y,e.z,e.w):ue.set(e,t,n,r),R.viewport(re.copy(ue).multiplyScalar(xe()).round())},this.getScissor=function(e){return e.copy(de)},this.setScissor=function(e,t,n,r){e.isVector4?de.set(e.x,e.y,e.z,e.w):de.set(e,t,n,r),R.scissor(N.copy(de).multiplyScalar(xe()).round())},this.getScissorTest=function(){return fe},this.setScissorTest=function(e){R.setScissorTest(fe=e)},this.setOpaqueSort=function(e){le=e},this.setTransparentSort=function(e){F=e},this.getClearColor=function(e){return e.copy(ze.getClearColor())},this.setClearColor=function(){ze.setClearColor(...arguments)},this.getClearAlpha=function(){return ze.getClearAlpha()},this.setClearAlpha=function(){ze.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(j!==null){let t=j.texture.format;e=h.has(t)}if(e){let e=j.texture.type,t=g.has(e),n=ze.getClearColor(),r=ze.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(_[0]=i,_[1]=a,_[2]=o,_[3]=r,L.clearBufferuiv(L.COLOR,0,_)):(v[0]=i,v[1]=a,v[2]=o,v[3]=r,L.clearBufferiv(L.COLOR,0,v))}else r|=L.COLOR_BUFFER_BIT}t&&(r|=L.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=L.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&L.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),D=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,qe,!1),t.removeEventListener(`webglcontextrestored`,Je,!1),t.removeEventListener(`webglcontextcreationerror`,Ye,!1),ze.dispose(),Fe.dispose(),Ie.dispose(),B.dispose(),z.dispose(),De.dispose(),Ae.dispose(),ke.dispose(),Ue.dispose(),We.dispose(),je.dispose(),Ke.dispose(),Ke.removeEventListener(`sessionstart`,tt),Ke.removeEventListener(`sessionend`,rt),W.stop()};function qe(e){e.preventDefault(),dn(`WebGLRenderer: Context Lost.`),E=!0}function Je(){dn(`WebGLRenderer: Context Restored.`),E=!1;let e=Te.autoReset,t=Re.enabled,n=Re.autoUpdate,r=Re.needsUpdate,i=Re.type;Ge(),Te.autoReset=e,Re.enabled=t,Re.autoUpdate=n,Re.needsUpdate=r,Re.type=i}function Ye(e){gt(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function Xe(e){let t=e.target;t.removeEventListener(`dispose`,Xe),Ze(t)}function Ze(e){Qe(e),z.remove(e)}function Qe(e){let t=z.get(e).programs;t!==void 0&&(t.forEach(function(e){je.releaseProgram(e)}),e.isShaderMaterial&&je.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=ye);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=mt(e,t,n,r,i);R.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=ke.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;Ue.setup(i,r,s,n,c);let h,g=Be;if(c!==null&&(h=Oe.get(c),g=Ve,g.setIndex(h)),i.isMesh)r.wireframe===!0?(R.setLineWidth(r.wireframeLinewidth*xe()),g.setMode(L.LINES)):g.setMode(L.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),R.setLineWidth(e*xe()),i.isLineSegments?g.setMode(L.LINES):i.isLineLoop?g.setMode(L.LINE_LOOP):g.setMode(L.LINE_STRIP)}else i.isPoints?g.setMode(L.POINTS):i.isSprite&&g.setMode(L.TRIANGLES);if(i.isBatchedMesh){if(Ce.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?Oe.get(c).bytesPerElement:1,o=z.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(L,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function $e(e,t,n,r){D!==null&&e.isNodeMaterial&&D.setObject(r,e),I===!0&&Le.setState(e,n,!1),e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,ct(e,t,r),e.side=0,e.needsUpdate=!0,ct(e,t,r),e.side=2):ct(e,t,r)}this.compile=function(e,t,n=null){n===null&&(n=e),D!==null&&D.renderStart(e,t,n),x=Ie.get(n),x.init(t),C.push(x),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),x.setupLights(),D!==null&&D.updateLights(x.state.lightsArray),he=this.localClippingEnabled,I=Le.init(this.clippingPlanes,he),I===!0&&Le.setGlobalState(this.clippingPlanes,t),D!==null&&Re.render(x.state.shadowsArray,n,t);let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let i=e.material;if(i){if(Array.isArray(i))for(let a=0;a<i.length;a++){let o=i[a];$e(o,n,t,e),r.add(o)}else $e(i,n,t,e),r.add(i)}}),x=C.pop(),D!==null&&D.renderEnd(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){r.forEach(function(e){let t=z.get(e).currentProgram;(t===void 0||t.isReady())&&r.delete(e)}),r.size===0?t(e):setTimeout(n,10)}Ce.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let et=null;function U(e){et&&et(e)}function tt(){W.stop()}function rt(){W.start()}let W=new Er;W.setAnimationLoop(U),typeof self<`u`&&W.setContext(self),this.setAnimationLoop=function(e){et=e,Ke.setAnimationLoop(e),e===null?W.stop():W.start()},Ke.addEventListener(`sessionstart`,tt),Ke.addEventListener(`sessionend`,rt),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){gt(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(E===!0)return;D!==null&&D.renderStart(e,t);let n=Ke.enabled===!0&&Ke.isPresenting===!0,r=w!==null&&(j===null||n)&&w.begin(T,j);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),Ke.enabled===!0&&Ke.isPresenting===!0&&(w===null||w.isCompositing()===!1)&&(Ke.cameraAutoUpdate===!0&&Ke.updateCamera(t),t=Ke.getCamera()),e.isScene===!0&&e.onBeforeRender(T,e,t,j),x=Ie.get(e,C.length),x.init(t),x.state.textureUnits=B.getTextureUnits(),C.push(x),ge.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),t.isArrayCamera?me.setFromArrayCamera(t):pe.setFromProjectionMatrix(ge,Ht,t.reversedDepth),he=this.localClippingEnabled,I=Le.init(this.clippingPlanes,he),b=Fe.get(e,S.length),b.init(),S.push(b),this.info.render.frame++,Ke.enabled===!0&&Ke.isPresenting===!0){let e=T.xr.getDepthSensingMesh();e!==null&&it(e,t,-1/0,T.sortObjects)}it(e,t,0,T.sortObjects),b.finish(),D!==null&&D.updateLights(x.state.lightsArray),T.sortObjects===!0&&b.sort(le,F),be=Ke.enabled===!1||Ke.isPresenting===!1||Ke.hasDepthSensing()===!1,be&&ze.addToRenderList(b,e),this.info.autoReset===!0&&this.info.reset(),I===!0&&Le.beginShadows();let i=x.state.shadowsArray;if(Re.render(i,e,t),I===!0&&Le.endShadows(),(r&&w.hasRenderPass())===!1){let n=b.opaque,r=b.transmissive;if(x.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];ot(n,r,e,a)}be&&ze.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];at(b,e,n,n.viewport)}}else r.length>0&&ot(n,r,e,t),be&&ze.render(e),at(b,e,t)}j!==null&&te===0&&(B.updateMultisampleRenderTarget(j),B.updateRenderTargetMipmap(j)),r&&w.end(T),e.isScene===!0&&e.onAfterRender(T,e,t),Ue.resetDefaultState(),M=-1,ne=null,C.pop(),C.length>0?(x=C[C.length-1],B.setTextureUnits(x.state.textureUnits),I===!0&&Le.setGlobalState(T.clippingPlanes,x.state.camera)):x=null,S.pop(),b=S.length>0?S[S.length-1]:null,D!==null&&D.renderEnd()};function it(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLight)x.pushLight(e),e.castShadow&&x.pushShadow(e);else if(e.isSprite){let i=t.isArrayCamera?me:pe;if(!e.frustumCulled||e.intersectsFrustum(i)){r&&ve.setFromMatrixPosition(e.matrixWorld).applyMatrix4(ge);let i=Ae.update(e),a=e.material;a.visible&&b.push(e,i,a,n,ve.z,null,t)}}else if(e.isMesh||e.isLine||e.isPoints){let i=t.isArrayCamera?me:pe;if(!e.frustumCulled||e.intersectsFrustum(i)){let i=Ae.update(e),a=e.material;if(r&&(e.boundingSphere===void 0?(i.boundingSphere===null&&i.computeBoundingSphere(),ve.copy(i.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),ve.copy(e.boundingSphere.center)),ve.applyMatrix4(e.matrixWorld).applyMatrix4(ge)),Array.isArray(a)){let r=i.groups;for(let o=0,s=r.length;o<s;o++){let s=r[o],c=a[s.materialIndex];c&&c.visible&&b.push(e,i,c,n,ve.z,s,t)}}else a.visible&&b.push(e,i,a,n,ve.z,null,t)}}}let i=e.children;for(let e=0,a=i.length;e<a;e++)it(i[e],t,n,r)}function at(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;x.setupLightsView(n),I===!0&&Le.setGlobalState(T.clippingPlanes,n),r&&R.viewport(re.copy(r)),i.length>0&&G(i,t,n),a.length>0&&G(a,t,n),o.length>0&&G(o,t,n),R.buffers.depth.setTest(!0),R.buffers.depth.setMask(!0),R.buffers.color.setMask(!0),R.setPolygonOffset(!1)}function ot(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(x.state.transmissionRenderTarget[r.id]===void 0){let e=Ce.has(`EXT_color_buffer_half_float`)||Ce.has(`EXT_color_buffer_float`);x.state.transmissionRenderTarget[r.id]=new Ot(1,1,{generateMipmaps:!0,type:e?ft:Gt,minFilter:vt,samples:Math.max(4,we.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:pn.workingColorSpace})}let a=x.state.transmissionRenderTarget[r.id],o=r.viewport||re;a.setSize(o.z*T.transmissionResolutionScale,o.w*T.transmissionResolutionScale);let s=T.getRenderTarget(),c=T.getActiveCubeFace(),l=T.getActiveMipmapLevel();T.setRenderTarget(a),T.getClearColor(ae),oe=T.getClearAlpha(),oe<1&&T.setClearColor(16777215,.5),T.clear(),be&&ze.render(n);let u=T.toneMapping;T.toneMapping=0;let d=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),x.setupLightsView(r),I===!0&&Le.setGlobalState(T.clippingPlanes,r),G(e,n,r),B.updateMultisampleRenderTarget(a),B.updateRenderTargetMipmap(a),Ce.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,st(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(B.updateMultisampleRenderTarget(a),B.updateRenderTargetMipmap(a))}T.setRenderTarget(s,c,l),T.setClearColor(ae,oe),d!==void 0&&(r.viewport=d),T.toneMapping=u}function G(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&st(o,t,n,s,l,c)}}function st(e,t,n,r,i,a){D!==null&&i.isNodeMaterial&&D.setObject(e,i),e.onBeforeRender(T,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(T,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,T.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,T.renderBufferDirect(n,t,r,i,e,a),i.side=2):T.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(T,t,n,r,i,a)}function K(e){let t=0;for(let n of e)n.texture!==null&&t++;return t}function ct(e,t,n){t.isScene!==!0&&(t=ye);let r=z.get(e),i=x.state.lights,a=x.state.shadowsArray,o=i.state.version,s=je.getParameters(e,i.state,a,t,n,x.state.lightProbeGridArray),c=je.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=De.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,Xe),l=new Map,r.programs=l,r.programVariants=new Map);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return q(e,s),d}else s.uniforms=je.getUniforms(e),D!==null&&e.isNodeMaterial&&D.build(e,n,s),e.onBeforeCompile(s,T),d=je.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Le.uniform),q(e,s),r.needsLights=ht(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.sunLights.value=i.state.sun,f.sunLightShadows.value=i.state.sunShadow,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.sunShadowMatrix.value=i.state.sunShadowMatrix,f.sunShadowCascade.value=i.state.sunShadowCascade,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.numLightProbeGrids=K(x.state.lightProbeGridArray),r.currentProgram=d,r.uniformsList=null,d}function lt(e,t,n,r,i){let a=z.get(e),o=a.currentProgram.id+`,`+r+`,`+i,s=a.programVariants.get(o);return s===void 0?(s=ct(e,t,n),a.programVariants.set(o,s)):(a.currentProgram=s,a.uniformsList=null,a.outputColorSpace=r,a.toneMapping=i),s}function dt(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=_a.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function q(e,t){let n=z.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function mt(e,t,n,r,i){t.isScene!==!0&&(t=ye),B.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=j===null?T.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:pn.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=De.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(h=T.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=z.get(r),b=x.state.lights;if(I===!0&&(he===!0||e!==ne)){let t=e===ne&&r.id===M;Le.setState(r,e,t)}let S=!1,C=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==b.state.version||i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i._colorsTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i._colorsTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?S=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Le.numPlanes||v.numIntersection!==Le.numIntersection)?S=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.morphTargetsCount===_&&v.numLightProbeGrids===K(x.state.lightProbeGridArray)?(v.outputColorSpace!==s||v.toneMapping!==h)&&(C=!0):S=!0:S=!0:(S=!0,v.__version=r.version);let w=v.currentProgram;(S===!0||C===!0)&&(w=C===!0?lt(r,t,i,s,h):ct(r,t,i),D&&r.isNodeMaterial&&D.onUpdateProgram(r,w,v));let E=!1,O=!1,ee=!1,k=w.getUniforms(),A=v.uniforms;if(R.useProgram(w.program)&&(E=!0,O=!0,ee=!0),r.id!==M&&(M=r.id,O=!0),E||ne!==e){R.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),k.setValue(L,`projectionMatrix`,e.projectionMatrix),k.setValue(L,`viewMatrix`,e.matrixWorldInverse);let t=k.map.cameraPosition;t!==void 0&&t.setValue(L,_e.setFromMatrixPosition(e.matrixWorld)),we.logarithmicDepthBuffer&&k.setValue(L,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&k.setValue(L,`isOrthographic`,e.isOrthographicCamera===!0),ne!==e&&(ne=e,O=!0,ee=!0)}if(v.needsLights&&(b.state.sunShadowMap.length>0&&k.setValue(L,`sunShadowMap`,b.state.sunShadowMap,B),b.state.directionalShadowMap.length>0&&k.setValue(L,`directionalShadowMap`,b.state.directionalShadowMap,B),b.state.spotShadowMap.length>0&&k.setValue(L,`spotShadowMap`,b.state.spotShadowMap,B),b.state.pointShadowMap.length>0&&k.setValue(L,`pointShadowMap`,b.state.pointShadowMap,B)),i.isSkinnedMesh){k.setOptional(L,i,`bindMatrix`),k.setOptional(L,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),k.setValue(L,`boneTexture`,e.boneTexture,B))}i.isBatchedMesh&&(k.setOptional(L,i,`batchingTexture`),k.setValue(L,`batchingTexture`,i._matricesTexture,B),k.setOptional(L,i,`batchingIdTexture`),k.setValue(L,`batchingIdTexture`,i._indirectTexture,B),k.setOptional(L,i,`batchingColorTexture`),i._colorsTexture!==null&&k.setValue(L,`batchingColorTexture`,i._colorsTexture,B));let te=n.morphAttributes;if((te.position!==void 0||te.normal!==void 0||te.color!==void 0)&&H.update(i,n,w),(O||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,k.setValue(L,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(A.envMapIntensity.value=t.environmentIntensity),A.dfgLUT!==void 0&&(A.dfgLUT.value=Fo()),O){if(k.setValue(L,`toneMappingExposure`,T.toneMappingExposure),v.needsLights&&J(A,ee),a&&r.fog===!0&&Me.refreshFogUniforms(A,a),Me.refreshMaterialUniforms(A,r,ce,P,x.state.transmissionRenderTarget[e.id]),v.needsLights&&v.numLightProbeGrids>0){let e=y,t=0;for(let n of x.state.lightProbeGridArray)n.texture!==null&&(e.textures[t]=n.texture,e.min[t]=n.boundingBox.min,e.max[t]=n.boundingBox.max,e.resolution[t]=n.resolution,t++);for(let n in e)e[n].length=t;A.probesSH.value=e.textures,A.probesMin.value=e.min,A.probesMax.value=e.max,A.probesResolution.value=e.resolution}_a.upload(L,dt(v),A,B)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(_a.upload(L,dt(v),A,B),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&k.setValue(L,`center`,i.center),k.setValue(L,`modelViewMatrix`,i.modelViewMatrix),k.setValue(L,`normalMatrix`,i.normalMatrix),k.setValue(L,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];We.update(n,w),We.bind(n,w)}}return w}function J(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.sunLights.needsUpdate=t,e.sunLightShadows.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function ht(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return A},this.getActiveMipmapLevel=function(){return te},this.getRenderTarget=function(){return j},this.setRenderTargetTextures=function(e,t,n){let r=z.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),z.get(e.texture).__webglTexture=t,z.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=z.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){j=e,A=t,te=n;let r=null,i=!1,a=!1;if(e){let o=z.get(e);if(o.__useDefaultFramebuffer!==void 0){R.bindFramebuffer(L.FRAMEBUFFER,o.__webglFramebuffer),re.copy(e.viewport),N.copy(e.scissor),ie=e.scissorTest,R.viewport(re),R.scissor(N),R.setScissorTest(ie),M=-1;return}if(o.__webglFramebuffer===void 0)B.setupRenderTarget(e);else if(o.__hasExternalTextures)B.rebindTextures(e,z.get(e.texture).__webglTexture,z.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&z.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);B.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=z.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&B.useMultisampledRTT(e)===!1?z.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,re.copy(e.viewport),N.copy(e.scissor),ie=e.scissorTest}else re.copy(ue).multiplyScalar(ce).floor(),N.copy(de).multiplyScalar(ce).floor(),ie=fe;if(n!==0&&(r=O),R.bindFramebuffer(L.FRAMEBUFFER,r)&&R.drawBuffers(e,r),R.viewport(re),R.scissor(N),R.setScissorTest(ie),i){let r=z.get(e.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=z.get(e.textures[t]);L.framebufferTextureLayer(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=z.get(e.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,t.__webglTexture,n)}M=-1};function yt(e){let t=z.get(e);return(t.__readFormat!==e.format||t.__readType!==e.type)&&(t.__readFormat=e.format,t.__readType=e.type,t.__formatReadable=we.textureFormatReadable(e.format),t.__typeReadable=we.textureTypeReadable(e.type)),t}this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){gt(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=z.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o],Array.isArray(c)&&(c=c[0])),c){R.bindFramebuffer(L.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;e.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+s);let u=yt(o);if(u.__formatReadable===!1){gt(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(u.__typeReadable===!1){gt(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&L.readPixels(t,n,r,i,He.convert(c),He.convert(l),a)}finally{let e=j===null?null:z.get(j).__webglFramebuffer;R.bindFramebuffer(L.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=z.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o],Array.isArray(c)&&(c=c[0])),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){R.bindFramebuffer(L.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;e.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+s);let d=yt(o);if(d.__formatReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(d.__typeReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let f=L.createBuffer();L.bindBuffer(L.PIXEL_PACK_BUFFER,f),L.bufferData(L.PIXEL_PACK_BUFFER,a.byteLength,L.STREAM_READ),L.readPixels(t,n,r,i,He.convert(l),He.convert(u),0),L.bindBuffer(L.PIXEL_PACK_BUFFER,null);let p=j===null?null:z.get(j).__webglFramebuffer;R.bindFramebuffer(L.FRAMEBUFFER,p);let m=L.fenceSync(L.SYNC_GPU_COMMANDS_COMPLETE,0);return L.flush(),await Pe(L,m,4),L.bindBuffer(L.PIXEL_PACK_BUFFER,f),L.getBufferSubData(L.PIXEL_PACK_BUFFER,0,a),L.bindBuffer(L.PIXEL_PACK_BUFFER,null),L.deleteBuffer(f),L.deleteSync(m),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;B.setTexture2D(e,0),L.copyTexSubImage2D(L.TEXTURE_2D,n,0,0,o,s,i,a),R.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=He.convert(t.format),_=He.convert(t.type),v;t.isData3DTexture?(B.setTexture3D(t,0),v=L.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(B.setTexture2DArray(t,0),v=L.TEXTURE_2D_ARRAY):(B.setTexture2D(t,0),v=L.TEXTURE_2D),R.activeTexture(L.TEXTURE0),R.pixelStorei(L.UNPACK_FLIP_Y_WEBGL,t.flipY),R.pixelStorei(L.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),R.pixelStorei(L.UNPACK_ALIGNMENT,t.unpackAlignment);let y=R.getParameter(L.UNPACK_ROW_LENGTH),b=R.getParameter(L.UNPACK_IMAGE_HEIGHT),x=R.getParameter(L.UNPACK_SKIP_PIXELS),S=R.getParameter(L.UNPACK_SKIP_ROWS),C=R.getParameter(L.UNPACK_SKIP_IMAGES);R.pixelStorei(L.UNPACK_ROW_LENGTH,h.width),R.pixelStorei(L.UNPACK_IMAGE_HEIGHT,h.height),R.pixelStorei(L.UNPACK_SKIP_PIXELS,l),R.pixelStorei(L.UNPACK_SKIP_ROWS,u),R.pixelStorei(L.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=z.get(e),r=z.get(t),h=z.get(n.__renderTarget),g=z.get(r.__renderTarget);R.bindFramebuffer(L.READ_FRAMEBUFFER,h.__webglFramebuffer),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,z.get(e).__webglTexture,i,d+n),L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,z.get(t).__webglTexture,a,m+n)),L.blitFramebuffer(l,u,l+o,u+s,f,p,f+o,p+s,L.DEPTH_BUFFER_BIT,L.NEAREST);R.bindFramebuffer(L.READ_FRAMEBUFFER,null),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||z.has(e)){let n=z.get(e),r=z.get(t);R.bindFramebuffer(L.READ_FRAMEBUFFER,ee),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,k);for(let e=0;e<c;e++)w?L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):L.framebufferTexture2D(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,n.__webglTexture,i),T?L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):L.framebufferTexture2D(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,r.__webglTexture,a),i===0?T?L.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):L.copyTexSubImage2D(v,a,f,p,l,u,o,s):L.blitFramebuffer(l,u,l+o,u+s,f,p,f+o,p+s,L.COLOR_BUFFER_BIT,L.NEAREST);R.bindFramebuffer(L.READ_FRAMEBUFFER,null),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?L.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?L.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):L.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?L.texSubImage2D(L.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?L.compressedTexSubImage2D(L.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):L.texSubImage2D(L.TEXTURE_2D,a,f,p,o,s,g,_,h);R.pixelStorei(L.UNPACK_ROW_LENGTH,y),R.pixelStorei(L.UNPACK_IMAGE_HEIGHT,b),R.pixelStorei(L.UNPACK_SKIP_PIXELS,x),R.pixelStorei(L.UNPACK_SKIP_ROWS,S),R.pixelStorei(L.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps===!0&&t.mipmapsAutoUpdate===!0&&L.generateMipmap(v),R.unbindTexture()},this.initRenderTarget=function(e){z.get(e).__webglFramebuffer===void 0&&B.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?B.setTextureCube(e,0):e.isData3DTexture?B.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?B.setTexture2DArray(e,0):B.setTexture2D(e,0),R.unbindTexture()},this.resetState=function(){A=0,te=0,j=null,R.reset(),Ue.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return Ht}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=pn._getDrawingBufferColorSpace(e),t.unpackColorSpace=pn._getUnpackColorSpace()}},Lo=.0025;function Ro(){let e=null,t=!1,n=0;return{sample(r,i){return Number.isFinite(r)&&(e!==null&&t&&i&&r>=e&&(n+=r-e),e=r,t=i),n},get seconds(){return n}}}function zo(e,t){let n=Math.hypot(e.x-t.source[0],e.z-t.source[2]),r=Math.max(0,Math.min(1,(t.outerRadius-n)/(t.outerRadius-t.innerRadius))),i=t.departureFade,a=i&&e.x<i.maxX?Math.max(0,Math.min(1,(e.z-i.startZ)/(i.endZ-i.startZ))):1,o=(r*r*(3-2*r))**Math.max(.1,t.falloffExponent??1),s=Math.max(0,Math.min(1,t.gainMultiplier?.(e)??1));return o*a*a*(3-2*a)*s}function Bo(e,t=Fn.audio){let n=!1,r=!1,i=!1,a=`loading`,o=e,s={x:0,z:18},c=0,l=0,u=!1,d=!0,f=null,p=null,m=null,h=null,g=null,_=null,v=null,y=null,b=new AbortController,x=Ro(),S=()=>!n&&!!m&&a===`ready`&&f?.state===`running`&&d&&!i&&!document.hidden&&o.enabled&&o.volume>0&&l>0,C=()=>!!S()&&Math.min(l,h?.gain.value??0)>=.0025;function w(){f&&x.sample(f.currentTime,C())}async function T(){a=`loading`;try{let e=await fetch(Nt(`music-pavilion/v002/arrival-plucks.wav`),{signal:b.signal});if(!e.ok)throw Error(`music-unavailable`);let t=await e.arrayBuffer();if(n)return;v=t,a=`ready`,r&&await E()}catch{n||(a=`error`)}}async function E(){if(n||!r||!f||!v||y)return;let e=f;y=(async()=>{try{if(p||=await e.decodeAudioData(v.slice(0)),n||e!==f)return;m||(h=e.createGain(),h.gain.value=0,g=e.createStereoPanner(),_=e.createMediaStreamDestination(),m=e.createBufferSource(),m.buffer=p,m.loop=!0,m.connect(h),h.connect(g),g.connect(e.destination),g.connect(_),m.start()),D()}catch{n||(a=`error`)}})().finally(()=>{y=null}),await y}function D(){w();let e=!d||i||document.hidden||!o.enabled;if(l=e?0:zo(s,t)*o.volume*(u?.22:1),f){if(h&&(h.gain.cancelScheduledValues(f.currentTime),h.gain.setTargetAtTime(l,f.currentTime,e?.008:.12)),g){let e=t.source[0]-s.x,n=t.source[2]-s.z;g.pan.setTargetAtTime(Math.max(-.65,Math.min(.65,(e*Math.cos(c)-n*Math.sin(c))/Math.max(1,Math.hypot(e,n)))),f.currentTime,.2)}e&&f.state===`running`?f.suspend().catch(()=>{}):!e&&r&&f.state===`suspended`&&f.resume().catch(()=>{}),w()}}function O(e){if(!(n||r||!(e instanceof PointerEvent||e instanceof KeyboardEvent))&&!(e instanceof KeyboardEvent&&(e.metaKey||e.ctrlKey||e.altKey)))try{f??=new AudioContext,r=!0,f.resume().then(()=>E()).catch(()=>{r=!1})}catch{a=`error`}}return window.addEventListener(`pointerdown`,O),window.addEventListener(`keydown`,O),T(),{update(e,t){s=e,c=t,D()},setEnabled(e){d=e,D()},setBlocked(e){i=e,D()},setDucked(e){e!==u&&(u=e,D())},setPreferences(e){o=e,D()},retry(){a===`error`&&(v=null,p=null,T())},inspect:()=>(w(),{status:a,unlocked:r,gain:l,playing:!!S(),audible:C(),audibleTime:x.seconds,currentTime:f?.currentTime??0}),recordingStream:()=>_?.stream??null,dispose(){n||(n=!0,b.abort(),window.removeEventListener(`pointerdown`,O),window.removeEventListener(`keydown`,O),m?.stop(),m?.disconnect(),h?.disconnect(),g?.disconnect(),_?.disconnect(),f?.close().catch(()=>{}),m=null,p=null,v=null,f=null)}}}var Vo={source:M.audio.source,outerRadius:155,innerRadius:14,falloffExponent:4,gainMultiplier(e){let t=p(`courtyard`,j(`music`,e)),n=Math.max(0,Math.min(1,(t.z-9)/4)),r=Math.max(0,Math.min(1,(t.x-12)/18));return Math.max(n*n*(3-2*n),r*r*(3-2*r))}};function Ho(e){return zo(e,Vo)*.4>=Lo}function Uo(e){let t=e.position;if(Math.abs(t.x-122)>8.5||t.z>-74||t.z<-82.5)return!1;e.updateMatrixWorld(!0);let n=e.getWorldDirection(new X);if(n.y<.42||n.z>-.25)return!1;let r=(t,n,r)=>new X(t,n,r).project(e),i=r(122,36.3,-91.8),a=r(122,27.3,-87.8),o=r(114,24,-87),s=r(130,24,-87),c=r(122,7.3,-84),l=(e,t,n)=>e.z>-1&&e.z<1&&Math.abs(e.x)<t&&Math.abs(e.y)<n;return l(i,.7,.92)&&l(a,.6,.85)&&Math.abs(s.x-o.x)>.85&&i.y-c.y>1.35}function Wo(){let e=!1,t=0;return{update(n,r,i){return n?e||(t=r?t+Math.max(0,i):0,t<.65)?!1:(e=!0,!0):(e=!1,t=0,!1)},inspect:()=>({seen:e,dwell:t})}}function Go(){let e=`outside`,t=0;return{get phase(){return e},update(n,r){n?e===`outside`?(e=`waiting`,t=0):e===`waiting`&&(t+=Math.max(0,r),t>=2&&(e=`guidance`)):(e=`outside`,t=0)},dismiss(){e===`guidance`&&(e=`done`)}}}function Ko(){let e=fr(),[t,n,r]=Un.origin;return{...e,boxes:[...e.boxes,...qn.filter(e=>!e.circle).map(e=>new Yt(new X(e.minX,-.2,e.minZ),new X(e.maxX,e.height,e.maxZ)).expandByScalar(tn)),new Yt(new X(t-4.4,n+9,r-3),new X(t+4.4,n+12,r+3.6)).expandByScalar(tn),new Yt(new X(t-12,n+18,r-33),new X(t+12,n+40,r-3)).expandByScalar(tn),new Yt(new X(t-19,17.2,r+1),new X(t+19,20.7,r+14)).expandByScalar(tn)],cylinders:[...e.cylinders,...qn.flatMap(e=>e.circle?[{...e.circle,id:e.id,minY:0,maxY:e.height}]:[])]}}function qo(e,t,n,r,i){if(e>80&&n>0){let a=Et.smoothstep(n,0,28),o=12+a*6,s=new X(e,t+3.2+a*3.8,n),c=new X(e,t+.65,n),l=s.clone().add(new X(Math.sin(r)*o,1.1-a*3.1,Math.cos(r)*o)),u=qt(s,kt(s,l,i),l,i,c);return u.distanceTo(s)<8?ht(e,t,n,r,{...i,landmarkFraming:void 0}):{target:s,position:u,subjectTarget:c}}return $n(e,t,n,r,i)}var Jo={version:`v004`,origin:[122,6.85546875,-68],x0:-72,y0:-45,step:.75,heights:[[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2e-4,.0089,.0148,.0168,.0148,.009,4e-4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0087,.0314,.0554,.0784,.0975,.1102,.1148,.1104,.098,.0793,.0571,.034,.0124,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0129,.0425,.0799,.1234,.1697,.2141,.2511,.2758,.2846,.2764,.2527,.2172,.1754,.1324,.0928,.059,.0278,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0034,.006,.0057,.0021,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.002,.0178,.0419,.0772,.1261,.1885,.2618,.3404,.416,.4793,.5217,.5369,.5232,.4833,.424,.3547,.2847,.2211,.1677,.1168,.0302,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0088,.0214,.0335,.0443,.0529,.0585,.0609,.0601,.0566,.0517,.0469,.0438,.0438,.0478,.0551,.0644,.0729,.078,.0773,.0701,.0572,.041,.0245,.0106,.001,0,0,0,.003,.006,.007,.0055,.0017,0,0,0,0,0,7e-4,.0112,.0231,.0354,.0481,.0633,.0846,.1174,.167,.2372,.3287,.4375,.5551,.669,.7646,.8287,.852,.8317,.7721,.684,.582,.4803,.3896,.3144,.2408,.1002,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0117,.0305,.0519,.0752,.0992,.1223,.1428,.159,.1697,.174,.1722,.1651,.1547,.1439,.1354,.132,.1349,.1437,.156,.1676,.174,.1718,.1596,.139,.1138,.089,.0693,.0576,.0549,.0596,.0688,.079,.0865,.0891,.0858,.0773,.0655,.0536,.0448,.0418,.0461,.0574,.0737,.0923,.1107,.128,.1464,.1711,.2097,.2703,.3588,.4768,.6193,.7748,.9262,1.054,1.1398,1.171,1.1438,1.0642,.947,.8117,.6777,.5592,.4617,.3649,.1701,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0071,.0136,.0186,.0218,.0228,.0218,.0186,.0136,.0071,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0182,.0411,.0686,.1009,.1375,.1773,.2183,.2578,.293,.3207,.3389,.346,.342,.3285,.3083,.2857,.2652,.2508,.2451,.248,.2566,.2656,.2693,.2629,.245,.2177,.1863,.1574,.1375,.1302,.1362,.1528,.1749,.1967,.2123,.2177,.2116,.195,.1717,.1469,.1263,.1145,.1143,.1253,.1447,.168,.1907,.2108,.2301,.2548,.2945,.3597,.4586,.5934,.7588,.941,1.1195,1.2704,1.372,1.4087,1.3758,1.2803,1.1395,.9767,.8148,.6708,.5519,.4349,.2063,.0042,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2e-4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0078,.0226,.0379,.0529,.0668,.0787,.0879,.0937,.0957,.0937,.0879,.0788,.0668,.053,.038,.0227,.0079,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.018,.0429,.0726,.1083,.1505,.1999,.2558,.3166,.3794,.4401,.4941,.5369,.5647,.5751,.5677,.5444,.5091,.4675,.4258,.3899,.3638,.3484,.3415,.3378,.3312,.3171,.2936,.2635,.2325,.2082,.1974,.2039,.2274,.2637,.3052,.3434,.3701,.3795,.3696,.3423,.303,.2596,.2205,.1928,.1805,.1839,.1994,.2214,.2437,.263,.2804,.3023,.3391,.4025,.5015,.6393,.8104,1.0001,1.1867,1.345,1.4514,1.4895,1.4537,1.351,1.1991,1.0219,.8436,.6827,.5479,.4186,.1907,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0075,.0203,.0353,.05,.0621,.0694,.0704,.0648,.0535,.0381,.0205,.003,0,0,0,0,0,0,0,0,0,.015,.0359,.0594,.0847,.1108,.1364,.1601,.1805,.1961,.206,.2094,.206,.1962,.1805,.1602,.1365,.111,.085,.0599,.0365,.0157,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,.011,.0383,.0706,.1079,.151,.2008,.2587,.3255,.4011,.4837,.5694,.6527,.7272,.7864,.8246,.8382,.8263,.7907,.7362,.6696,.599,.532,.4742,.4285,.394,.3671,.3429,.3172,.2889,.2602,.2367,.2252,.2315,.2586,.3047,.364,.4269,.4825,.5206,.5341,.5204,.482,.426,.3624,.3018,.2535,.223,.2112,.215,.2282,.2441,.2587,.2723,.2903,.3222,.3791,.4695,.5964,.7547,.9309,1.1045,1.2518,1.3507,1.3857,1.3511,1.2529,1.1069,.935,.7595,.5981,.461,.3333,.1364,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0373,.0482,.0529,.0537,.055,.061,.0745,.0954,.1212,.1474,.1691,.1822,.1839,.1736,.1528,.1243,.0919,.0596,.0305,.007,0,0,0,0,0,.0115,.0343,.0626,.0959,.1333,.1736,.2152,.2561,.2939,.3263,.3513,.3671,.3725,.3671,.3514,.3265,.2942,.2566,.2161,.175,.1353,.0987,.066,.038,.0148,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,.0216,.057,.0988,.1461,.1982,.2551,.3176,.3879,.4676,.5575,.6564,.76,.8618,.9536,1.0269,1.074,1.0901,1.0731,1.0249,.9508,.8584,.7571,.6559,.5623,.4811,.4138,.3589,.3134,.2747,.242,.2169,.2035,.2069,.231,.2771,.3422,.4192,.4975,.5652,.6111,.6273,.6111,.5652,.4976,.4191,.3418,.2757,.2273,.1984,.1868,.187,.193,.2007,.2097,.2239,.2505,.2982,.3738,.4795,.611,.7571,.9009,1.0227,1.1044,1.133,1.1036,1.0207,.897,.75,.598,.4563,.3343,.2234,.073,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.05,.1156,.1342,.1411,.1405,.1398,.1468,.1663,.1985,.2392,.2811,.3161,.3372,.3399,.3232,.2892,.2428,.1901,.1373,.0898,.0512,.0236,.0076,.0029,.0088,.0245,.0495,.0832,.1252,.1746,.2302,.2902,.3521,.4129,.4691,.5175,.5546,.5781,.5861,.5782,.5548,.5179,.47,.4145,.3549,.2947,.2369,.1838,.1369,.0969,.0637,.0368,.0157,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,.0234,.0654,.117,.1764,.241,.3081,.3764,.4468,.5218,.6047,.698,.8016,.9122,1.0226,1.1235,1.2046,1.2568,1.2737,1.2524,1.1945,1.1052,.9927,.8671,.7384,.6153,.5044,.409,.3298,.266,.2161,.1794,.1569,.1509,.164,.1983,.2533,.3254,.4072,.4885,.5577,.6043,.6207,.6043,.5577,.4885,.4072,.325,.2517,.1938,.1537,.1301,.1191,.116,.1174,.1223,.133,.1541,.1912,.2489,.3284,.4262,.5343,.6402,.7298,.7897,.8105,.7886,.7272,.635,.5249,.4101,.302,.2083,.1244,.0208,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0909,.1801,.2062,.2168,.2179,.2198,.2328,.2634,.3117,.3716,.4326,.4834,.5139,.5178,.4938,.4449,.3781,.3022,.2263,.1578,.1023,.0624,.0391,.0318,.0395,.061,.0955,.1421,.2002,.2686,.3457,.4289,.5147,.5991,.6772,.7443,.796,.8285,.8397,.8287,.7965,.7455,.6795,.6033,.522,.4405,.363,.2927,.2313,.1794,.1363,.1013,.0731,.0512,.0354,.0255,.0216,.0233,.0296,.039,.0497,.0596,.067,.0705,.0692,.063,.0527,.0391,.0236,.0075,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,.013,.0563,.1128,.1812,.2578,.3378,.4164,.4908,.5612,.631,.7053,.7888,.8836,.9873,1.0936,1.1925,1.273,1.3249,1.3408,1.3171,1.2549,1.159,1.0378,.901,.7591,.6213,.4948,.3842,.2917,.2176,.1614,.1223,.1003,.0962,.1107,.1442,.1952,.26,.3322,.403,.4629,.5031,.5172,.503,.4627,.4026,.3313,.2581,.1911,.1359,.0949,.0675,.0513,.0433,.0407,.0428,.0502,.0656,.0918,.1315,.185,.2499,.321,.3903,.4488,.4878,.5013,.487,.4469,.3867,.3144,.2388,.1671,.1047,.0493,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0968,.1912,.2214,.2378,.247,.26,.2876,.3363,.405,.486,.5665,.6326,.6721,.6774,.647,.5849,.4999,.4035,.3072,.2206,.1506,.1008,.0721,.0638,.0745,.1027,.1472,.2073,.282,.3701,.4694,.5768,.6877,.7968,.898,.9849,1.0518,1.0941,1.1086,1.0945,1.053,.9873,.9028,.8056,.7028,.6009,.5056,.4206,.3477,.2869,.2366,.1951,.1606,.1328,.112,.0993,.0956,.1009,.1141,.1327,.1535,.1727,.1869,.1936,.1912,.1795,.1597,.1338,.1042,.0735,.0442,.0178,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,.0318,.0847,.1528,.2335,.3218,.4107,.4933,.5656,.6274,.6829,.7389,.8023,.8771,.9628,1.0537,1.1406,1.2125,1.259,1.2724,1.2488,1.1887,1.0966,.9797,.8474,.7093,.5741,.449,.3387,.2461,.1719,.1158,.077,.0548,.0487,.0585,.0832,.1213,.1694,.2228,.275,.3189,.3483,.3586,.3481,.3185,.2741,.2211,.1661,.1151,.0719,.0386,.015,0,0,0,0,0,.0025,.019,.0432,.0752,.1135,.1549,.1951,.2289,.2514,.2592,.251,.228,.1933,.1516,.1079,.0664,.0302,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0645,.1429,.1728,.1954,.217,.2469,.294,.3627,.4506,.5487,.6434,.7199,.7655,.772,.738,.6683,.5732,.4654,.3583,.2627,.1863,.1332,.1043,.0985,.1142,.1496,.2035,.2751,.3639,.4686,.587,.7154,.8485,.9798,1.1018,1.2067,1.2876,1.3387,1.3564,1.3394,1.2895,1.2107,1.1097,.9944,.8735,.7554,.647,.5525,.4735,.409,.3559,.3111,.2726,.2401,.2153,.2008,.1991,.211,.235,.2676,.3034,.3362,.3605,.3719,.3679,.3482,.3148,.271,.221,.1692,.1195,.0749,.037,.0066,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0024,.045,.1034,.1774,.2634,.3547,.4429,.5201,.5816,.6274,.6625,.695,.7333,.7828,.8442,.9133,.9817,1.0396,1.0772,1.0874,1.0663,1.0141,.9343,.8331,.7183,.5981,.4801,.3704,.2735,.1917,.126,.0761,.041,.0197,.0112,.0145,.0284,.0515,.0813,.1145,.147,.1744,.1927,.1991,.1925,.1739,.1459,.1124,.0775,.0447,.0166,0,0,0,0,0,0,0,0,0,0,.0046,.0245,.0459,.0665,.0838,.0952,.0992,.0951,.0834,.0658,.0447,.0224,.0013,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0162,.069,.095,.1212,.1529,.1967,.2582,.3393,.4364,.5404,.6386,.7168,.7632,.7703,.7369,.6682,.5747,.4694,.3657,.2749,.2047,.1587,.1375,.1396,.1628,.2051,.2655,.3438,.44,.5538,.6833,.8247,.9724,1.1189,1.2555,1.3734,1.4645,1.5221,1.542,1.523,1.4669,1.3786,1.2657,1.1375,1.0045,.8762,.7604,.662,.5819,.5181,.4661,.4218,.3825,.3486,.3231,.3106,.315,.3379,.3776,.4288,.4838,.534,.5709,.5882,.5823,.5531,.5031,.4375,.3628,.2853,.211,.1443,.0877,.0422,.0074,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0086,.0536,.1144,.1897,.2748,.3619,.4419,.5064,.5508,.576,.5879,.5953,.6074,.6305,.6661,.7111,.7587,.8002,.8275,.8344,.8175,.7765,.714,.6349,.545,.4509,.3584,.2723,.196,.1315,.0794,.0396,.011,0,0,0,0,0,.0139,.0313,.0485,.063,.0728,.0761,.0726,.0626,.0475,.0295,.0106,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0017,.0068,.0086,.0068,.0015,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0069,.0274,.053,.0873,.1348,.1983,.2778,.3695,.4653,.5542,.6245,.6662,.6731,.6445,.5854,.5054,.4166,.3313,.2597,.2086,.1809,.176,.1914,.2241,.2719,.3341,.4114,.5053,.6169,.7454,.8879,1.0386,1.1895,1.3314,1.4545,1.5499,1.6103,1.6312,1.6111,1.5521,1.4593,1.3408,1.2068,1.0684,.9358,.8175,.7183,.6392,.5775,.5282,.4866,.4502,.4198,.3996,.3952,.4115,.4503,.5092,.5815,.6574,.7257,.7756,.7991,.7917,.7531,.687,.6003,.5013,.3988,.3005,.2121,.1372,.077,.0309,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0151,.0626,.1254,.2012,.2841,.3654,.435,.4846,.51,.5131,.5008,.4829,.4691,.4663,.4767,.4981,.5249,.5502,.5673,.5711,.5586,.5294,.4851,.4292,.3657,.2991,.2336,.1726,.1185,.0727,.0356,.007,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0059,.0357,.0768,.1306,.1964,.2708,.3474,.418,.4736,.5067,.5128,.4917,.4478,.3893,.3264,.2694,.2268,.2037,.2015,.2183,.2501,.2927,.3434,.4017,.4698,.5511,.6485,.7635,.8939,1.0349,1.1784,1.3148,1.4341,1.527,1.586,1.6064,1.5865,1.5282,1.4366,1.3197,1.1873,1.0503,.919,.8015,.7029,.6243,.5634,.516,.4778,.4469,.4247,.4154,.4246,.4569,.5136,.5914,.6825,.7756,.8582,.9182,.9465,.9382,.8932,.816,.7144,.5985,.4785,.3633,.2598,.1721,.1015,.0476,.0083,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0249,.0767,.144,.2236,.3081,.3872,.4498,.487,.4952,.4771,.4409,.3977,.3583,.3302,.3165,.3159,.3237,.3344,.3423,.3431,.3344,.3154,.287,.2511,.2104,.1678,.1259,.0868,.0522,.0228,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0283,.0669,.1136,.1659,.2195,.2687,.3075,.3309,.3359,.3229,.2955,.2601,.2248,.1977,.1851,.1904,.2135,.2508,.2969,.3466,.3965,.4466,.5,.5621,.6379,.7305,.8394,.9607,1.0868,1.2086,1.3162,1.4004,1.4541,1.4724,1.4539,1.3999,1.3152,1.2066,1.0833,.9547,.8302,.7174,.6211,.5431,.4823,.4358,.4009,.3766,.3642,.3676,.3911,.438,.5084,.5982,.6994,.8005,.8888,.9526,.9829,.9748,.9283,.8484,.7432,.6231,.4987,.3794,.2722,.1812,.1081,.0521,.0113,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0389,.0978,.1735,.2616,.3533,.4362,.4976,.5276,.5222,.4851,.4261,.3581,.2935,.2413,.2053,.1849,.1765,.1748,.175,.1733,.1672,.1557,.139,.1182,.0946,.0699,.0456,.0229,.0029,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0148,.0437,.076,.109,.1392,.1632,.1779,.1817,.1754,.1617,.1453,.1322,.1283,.1381,.1634,.2029,.2522,.3052,.3562,.4016,.4416,.4799,.5228,.5765,.6453,.7299,.8272,.9307,1.0323,1.1228,1.1942,1.2397,1.2552,1.239,1.1924,1.1189,1.0245,.9165,.8029,.6914,.5885,.4988,.4243,.3654,.3208,.2894,.2709,.2668,.2794,.3118,.3654,.4394,.5293,.6276,.7241,.8074,.8673,.8958,.8887,.8464,.7732,.6768,.5667,.4528,.3434,.2452,.1618,.0947,.0433,.0058,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0076,.0564,.1248,.212,.3128,.4166,.5088,.5742,.6014,.5862,.5327,.4527,.3612,.2729,.1983,.1424,.1054,.0836,.0723,.0665,.0626,.0579,.0512,.0422,.0312,.0188,.0058,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0113,.0292,.0457,.0588,.0671,.0698,.0678,.0629,.0585,.0586,.0671,.0871,.1194,.1623,.2115,.2615,.307,.3449,.3755,.4025,.4316,.4688,.5184,.5816,.6561,.7366,.8165,.8882,.9449,.9811,.9933,.9802,.9425,.883,.8064,.7182,.6245,.5314,.444,.3662,.3003,.2473,.2072,.1801,.166,.1661,.1818,.2146,.2647,.3307,.4085,.4918,.5725,.6417,.6912,.7148,.7094,.6752,.616,.5379,.4488,.3565,.268,.1883,.1207,.0663,.0245,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0195,.0761,.1551,.2557,.3716,.4904,.5949,.6677,.6954,.6731,.6057,.5067,.3938,.2839,.1893,.1164,.0656,.0334,.0148,.0046,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5e-4,4e-4,0,7e-4,.0056,.0171,.0367,.065,.1004,.1398,.1791,.2143,.2433,.2665,.2866,.3081,.3357,.3725,.4195,.475,.5351,.5948,.6484,.6908,.7179,.727,.7171,.6887,.6439,.5859,.5189,.4473,.3753,.3069,.2451,.1919,.1486,.1156,.0935,.0826,.0834,.0968,.1232,.1623,.2125,.2707,.3324,.3915,.442,.478,.4953,.4917,.4675,.4252,.3695,.3059,.24,.1768,.1199,.0715,.0324,.0022,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0317,.0962,.1862,.3007,.4324,.5669,.685,.7666,.7964,.7688,.6895,.5737,.4416,.3125,.2007,.1134,.0514,.0112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0134,.0369,.063,.089,.1129,.1333,.1505,.1666,.1841,.2061,.2343,.2693,.3096,.3527,.3951,.433,.4628,.4819,.4883,.4813,.4614,.43,.3892,.3419,.2911,.2398,.1906,.1457,.1066,.0744,.0497,.0329,.0243,.0242,.0329,.0504,.0761,.109,.1469,.1867,.2248,.2572,.2804,.2917,.2897,.2748,.2485,.2137,.1741,.133,.0935,.0579,.0275,.0027,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0436,.1157,.2161,.3438,.4905,.6403,.7716,.8619,.8944,.8628,.7733,.6429,.4941,.3484,.2217,.1223,.0512,.0045,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0027,.0176,.0319,.0451,.0576,.0702,.0844,.1018,.123,.1482,.1763,.2057,.2342,.2593,.279,.2916,.2958,.2913,.2783,.2577,.2311,.2,.1666,.1328,.1001,.0701,.0439,.022,.005,0,0,0,0,0,.0139,.0325,.0539,.0765,.0981,.1165,.1299,.1366,.1361,.1285,.1148,.0967,.076,.0545,.0339,.0151,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,.0024,.0545,.1334,.2432,.3827,.5427,.706,.849,.9473,.9824,.9475,.8496,.7069,.544,.3843,.2452,.1358,.0572,.0054,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0066,.0172,.0298,.0447,.0616,.0799,.0987,.1165,.1321,.1443,.152,.1547,.1519,.144,.1315,.1152,.0963,.0758,.0551,.035,.0165,3e-4,0,0,0,0,0,0,0,0,0,0,.0057,.0165,.0259,.033,.0371,.038,.0359,.0314,.0253,.0185,.0115,.0047,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,.0081,.0642,.1489,.2665,.4156,.5866,.7609,.9133,1.0181,1.0555,1.0182,.9135,.7612,.587,.4161,.2671,.1497,.0651,.009,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0054,.0164,.0275,.0379,.0469,.0539,.0583,.0599,.0583,.0538,.0467,.0374,.0266,.015,.0032,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0037,.0083,.0115,.0122,.0098,.0041,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,.0131,.0724,.1617,.2853,.4417,.6207,.803,.9623,1.0717,1.1107,1.0717,.9624,.8031,.6208,.4418,.2855,.1619,.0727,.0134,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4e-4,.0013,4e-4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0113,.0284,.0449,.058,.0655,.0656,.0582,.0443,.0263,.0068,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,.0176,.0793,.1718,.2995,.4606,.6447,.8318,.9952,1.1073,1.1472,1.1073,.9952,.8318,.6447,.4607,.2996,.1719,.0794,.0176,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0178,.047,.0788,.1093,.1341,.1488,.1506,.1392,.1166,.0867,.054,.0228,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,.0215,.085,.1797,.3097,.4731,.6594,.8483,1.013,1.126,1.1662,1.126,1.0131,.8483,.6594,.4731,.3097,.1797,.0851,.0215,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0136,.0496,.0929,.1399,.1851,.2218,.2438,.247,.2307,.1981,.1547,.1073,.062,.0231,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,.0253,.0901,.1859,.3168,.4807,.6667,.8548,1.0186,1.1307,1.1706,1.1307,1.0186,.8548,.6667,.4807,.3168,.186,.0901,.0253,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0326,.0778,.132,.1907,.247,.2927,.3201,.3241,.3041,.2637,.2099,.151,.0947,.0462,.008,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,.0293,.0951,.1916,.3224,.4852,.6693,.8548,1.0158,1.1259,1.165,1.1259,1.0158,.8548,.6693,.4852,.3224,.1916,.0951,.0293,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0061,.0442,.0936,.1524,.2157,.2763,.3252,.3545,.3589,.3375,.2943,.2366,.1732,.1122,.0594,.0174,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,.0338,.1007,.1977,.3281,.4893,.6704,.8521,1.0095,1.1168,1.1549,1.1168,1.0095,.8522,.6704,.4893,.3281,.1978,.1007,.0339,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0101,.0486,.0977,.1555,.2171,.2756,.3227,.3507,.3549,.3344,.293,.2374,.1759,.1162,.0638,.0217,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,.0393,.1076,.2054,.3356,.4951,.6733,.8511,1.0045,1.1089,1.1459,1.1089,1.0045,.8512,.6733,.4952,.3356,.2054,.1076,.0393,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0136,.0517,.0994,.1545,.2125,.2668,.3102,.336,.3398,.321,.2829,.2314,.1738,.1171,.0666,.0252,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,.046,.1161,.2154,.3462,.5049,.6808,.8554,1.0053,1.107,1.143,1.107,1.0053,.8554,.6808,.5049,.3462,.2155,.1161,.046,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0207,.0602,.1086,.1636,.2207,.2736,.3154,.3401,.3437,.3258,.2891,.2391,.1827,.1264,.0754,.0328,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,.0051,.0539,.1266,.2283,.3607,.5198,.6948,.8674,1.0149,1.1146,1.1499,1.1146,1.0149,.8674,.6948,.5199,.3607,.2284,.1267,.0539,.0051,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0332,.0769,.1299,.1895,.2506,.3068,.351,.377,.3808,.362,.3233,.2703,.21,.1493,.0937,.0467,.0097,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,.0114,.063,.1391,.2441,.3793,.5405,.7162,.8884,1.0348,1.1335,1.1684,1.1336,1.0349,.8884,.7162,.5405,.3794,.2441,.1391,.063,.0114,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0113,.0504,.1011,.1623,.2305,.3003,.3642,.4143,.4437,.448,.4267,.3829,.3228,.2541,.1846,.1205,.0661,.0231,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,.0181,.073,.153,.2623,.4016,.5662,.7443,.9179,1.0647,1.1634,1.1983,1.1635,1.0648,.918,.7445,.5664,.4018,.2624,.1531,.0731,.0182,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.025,.071,.1304,.2019,.2817,.3631,.4375,.4957,.5299,.535,.5102,.4593,.3893,.3092,.228,.1532,.0894,.0389,.0015,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,.0251,.0835,.1678,.282,.4264,.5956,.7776,.9539,1.1025,1.2021,1.2372,1.2022,1.1027,.9542,.7779,.5959,.4266,.2821,.1679,.0836,.0252,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9e-4,.0397,.0931,.1621,.2452,.3378,.4322,.5185,.5861,.6257,.6316,.6029,.5439,.4627,.3698,.2757,.1887,.1147,.056,.0124,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,.0319,.0938,.1825,.3018,.4517,.6263,.813,.9931,1.1443,1.2455,1.2811,1.2457,1.1447,.9936,.8135,.6268,.4521,.3021,.1827,.0939,.032,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0102,.0545,.1156,.1944,.2892,.3949,.5027,.6013,.6784,.7237,.7305,.6978,.6304,.5378,.4318,.3242,.225,.1404,.0733,.0235,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,.038,.1032,.196,.3203,.4755,.6554,.847,1.0312,1.1854,1.2884,1.3248,1.2888,1.1861,1.0321,.848,.6563,.4762,.3208,.1964,.1034,.0382,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0192,.0689,.1372,.2255,.3317,.4501,.5708,.6813,.7677,.8185,.8261,.7896,.7142,.6105,.4917,.3713,.2601,.1653,.0901,.0343,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,.0431,.1109,.2073,.3356,.4954,.68,.8759,1.0636,1.2206,1.3254,1.3624,1.326,1.2218,1.0652,.8775,.6815,.4967,.3366,.2079,.1114,.0434,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0275,.0819,.157,.2539,.3705,.5005,.6332,.7545,.8495,.9054,.9139,.8739,.7912,.6774,.547,.4146,.2924,.1882,.1056,.0443,.0015,0,0,0,0,0,0,0],[0,0,0,0,0,5e-4,.0467,.1165,.2152,.3464,.5093,.6971,.8959,1.0861,1.245,1.3509,1.3885,1.352,1.247,1.0886,.8985,.6995,.5114,.348,.2163,.1172,.0472,7e-4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0345,.0931,.1739,.2782,.4038,.5438,.6867,.8175,.92,.9803,.9897,.9468,.8579,.7354,.5949,.4524,.3207,.2083,.1192,.053,.0069,0,0,0,0,0,0,0],[0,0,0,0,0,.0016,.0486,.1192,.219,.3514,.5155,.7043,.904,1.095,1.2543,1.3608,1.3987,1.3626,1.2576,1.0991,.9084,.7084,.5189,.354,.2208,.1203,.0493,.002,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0399,.1018,.1871,.2972,.4299,.5778,.7289,.8672,.9758,1.0399,1.0501,1.0051,.9114,.7821,.6337,.483,.3437,.2248,.1304,.0602,.0113,0,0,0,0,0,0,0],[0,0,0,0,0,.0016,.0484,.1187,.2181,.3498,.5128,.7002,.8984,1.0878,1.2461,1.3519,1.3901,1.3548,1.2513,1.0944,.9054,.7067,.5182,.3539,.221,.1206,.0495,.0022,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0436,.1077,.196,.3101,.4477,.6012,.758,.9018,1.0148,1.0818,1.093,1.0467,.9499,.816,.6621,.5056,.3608,.2371,.1388,.0658,.0148,0,0,0,0,0,0,0],[0,0,0,0,0,3e-4,.0462,.1151,.2124,.3412,.5008,.6842,.8782,1.0639,1.2192,1.3235,1.3616,1.3279,1.2273,1.0741,.8891,.6943,.5092,.3476,.2168,.1179,.0479,.0012,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9e-4,.0453,.1104,.2003,.3165,.4567,.6132,.7733,.9203,1.0361,1.1051,1.1173,1.0709,.9728,.8365,.6797,.52,.372,.2454,.1446,.0697,.0173,0,0,0,0,0,0,0],[0,0,0,0,0,0,.042,.1083,.2019,.3261,.4798,.6568,.8442,1.0238,1.1746,1.2764,1.3145,1.2831,1.1868,1.0394,.8607,.6721,.4926,.3358,.2087,.1126,.0446,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8e-4,.0451,.1102,.2001,.3165,.4569,.614,.775,.9231,1.0402,1.1105,1.124,1.0786,.9809,.8447,.6874,.5269,.3777,.25,.1481,.0721,.0189,0,0,0,0,0,0,0],[0,0,0,0,0,0,.0361,.0988,.1874,.305,.451,.6193,.798,.9699,1.1149,1.2136,1.2518,1.2236,1.133,.993,.8224,.642,.4699,.3194,.1974,.1052,.0399,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0431,.1072,.1957,.3105,.4493,.6048,.7646,.912,1.0292,1.1005,1.1155,1.0722,.9768,.8427,.6872,.5278,.3793,.2518,.1498,.0736,.02,0,0,0,0,0,0,0],[0,0,0,0,0,0,.0287,.087,.1696,.2794,.416,.5741,.7427,.9057,1.0442,1.1397,1.1784,1.1542,1.0704,.939,.7779,.6068,.4433,.3001,.184,.0963,.0342,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0396,.1018,.188,.2998,.4354,.5877,.7447,.8902,1.0068,1.0788,1.096,1.0558,.9642,.8339,.6818,.5252,.3786,.2522,.1508,.0747,.021,0,0,0,0,0,0,0],[0,0,0,0,0,0,.0203,.0737,.1494,.2506,.377,.524,.6818,.8356,.9677,1.0604,1.1002,1.0808,1.0046,.8825,.7315,.5701,.4155,.2798,.1698,.0867,.0281,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.035,.0948,.1778,.2858,.4172,.5653,.7187,.8619,.9777,1.0507,1.0707,1.0347,.948,.8227,.6751,.522,.378,.253,.1522,.0762,.0223,0,0,0,0,0,0,0],[0,0,0,0,0,0,.0114,.0595,.1281,.2203,.3363,.4722,.6195,.7646,.891,.9819,1.0238,1.0098,.9416,.829,.6877,.5356,.3891,.2605,.1561,.0775,.0221,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0298,.0869,.1663,.2702,.397,.5408,.6906,.8316,.9471,1.022,1.0457,1.0148,.9338,.8141,.6712,.5216,.3798,.256,.1554,.079,.0246,0,0,0,0,0,0,0],[0,0,0,0,0,0,.0024,.0452,.1068,.1902,.2961,.4217,.5594,.6972,.8195,.9101,.9553,.9476,.8874,.7836,.6509,.5066,.367,.2441,.1444,.0693,.0167,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0246,.0789,.1549,.2548,.3775,.5174,.6645,.8043,.9207,.9986,1.027,1.0019,.927,.8127,.6741,.5273,.3867,.2629,.1615,.084,.0282,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,.0315,.0865,.1618,.2587,.3753,.5053,.6378,.7581,.8502,.9001,.8992,.8469,.7507,.6249,.4864,.3514,.2322,.1356,.063,.0123,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0196,.0716,.1446,.2413,.3607,.4982,.644,.7844,.9033,.9857,1.02,1.0013,.9324,.823,.6874,.5418,.4008,.2754,.1717,.0917,.0337,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,.0188,.0679,.1361,.2255,.335,.4596,.5894,.7103,.8062,.8623,.8688,.8236,.7336,.6123,.4768,.3439,.2261,.1306,.0591,.0094,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0155,.0655,.1364,.2309,.3487,.4855,.6321,.7752,.8988,.9874,1.0287,1.0168,.9536,.8478,.7136,.5671,.4235,.2943,.1865,.1026,.0413,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,.0076,.0517,.1142,.1978,.3024,.4242,.554,.6782,.7801,.8438,.858,.8193,.7335,.6142,.479,.3452,.2263,.1298,.0578,.008,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0123,.0612,.131,.2247,.3425,.4807,.6306,.7788,.9093,1.0059,1.0553,1.0504,.9921,.8885,.7536,.6039,.4552,.32,.2062,.1168,.051,.0054,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0382,.0963,.1759,.278,.3995,.5321,.662,.772,.8445,.8667,.8335,.7502,.6305,.4926,.3552,.2326,.1332,.0591,.0082,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0104,.0588,.1285,.2228,.3426,.4844,.6398,.7955,.935,1.0411,1.0994,1.1016,1.0474,.9444,.8067,.6514,.4953,.352,.2303,.134,.0626,.0128,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0273,.0825,.1598,.2614,.3849,.5226,.6605,.7801,.8624,.8924,.8639,.7814,.6589,.516,.3726,.2442,.1402,.0628,.0099,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0095,.0582,.1288,.2251,.3484,.4956,.6586,.8237,.9739,1.0907,1.1584,1.1674,1.1164,1.0126,.8702,.7073,.5418,.3887,.2577,.1533,.0756,.0211,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0191,.0724,.1489,.2516,.379,.5235,.6707,.8009,.8933,.9309,.9061,.8231,.6963,.5466,.3954,.2599,.1499,.0684,.0127,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0096,.0591,.1313,.2306,.3586,.5126,.6845,.8603,1.022,1.1501,1.2273,1.2426,1.1939,1.0881,.9398,.768,.5919,.4278,.2867,.1738,.0892,.0297,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.013,.0654,.1422,.2471,.3793,.5315,.6885,.8295,.9317,.9764,.9547,.8702,.7381,.5808,.4212,.2777,.1613,.075,.0163,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0104,.061,.1353,.2381,.3714,.5327,.7139,.9007,1.074,1.213,1.2992,1.3203,1.2731,1.1646,1.0098,.8286,.6417,.4666,.3153,.1938,.1025,.0381,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0087,.0607,.1384,.246,.3832,.5429,.7093,.8604,.9716,1.0226,1.0032,.917,.7797,.6148,.4469,.2958,.173,.0821,.0202,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0114,.0632,.1397,.246,.3844,.5527,.7426,.9394,1.1233,1.2722,1.3664,1.3923,1.3462,1.2348,1.0737,.8838,.6869,.5017,.3412,.2119,.1145,.0457,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0055,.0575,.1361,.2461,.3879,.554,.7284,.8879,1.0067,1.0629,1.0456,.9579,.8161,.6448,.4699,.3121,.1838,.0888,.024,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0123,.0651,.1434,.2525,.3951,.5691,.7662,.9712,1.1636,1.3204,1.4208,1.4506,1.4052,1.2914,1.1252,.9282,.7232,.5298,.3619,.2264,.1241,.0517,.0035,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0031,.0549,.1341,.2458,.3906,.5613,.7415,.9073,1.0317,1.092,1.0765,.9881,.8434,.6677,.4878,.3252,.1928,.0946,.0276,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0126,.0661,.1454,.2563,.4015,.5791,.7807,.991,1.1889,1.3509,1.4555,1.4878,1.4431,1.3279,1.1585,.9569,.7468,.5482,.3755,.2359,.1304,.0557,.0059,0,0,0,0,0],[0,0,0,0,0,0,0,0,9e-4,.0523,.1313,.2435,.3896,.5624,.7456,.9147,1.0425,1.1057,1.092,1.0041,.8587,.6813,.4991,.334,.1993,.0991,.0306,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0122,.0656,.145,.2561,.4019,.5804,.7834,.9953,1.195,1.3589,1.4652,1.4987,1.4546,1.3394,1.1692,.9666,.7549,.5547,.3804,.2394,.1328,.0572,.0068,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0492,.1272,.2384,.3835,.5557,.7387,.9084,1.0373,1.1021,1.0904,1.0045,.8609,.6848,.5033,.3383,.2033,.1025,.0333,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0108,.0634,.1417,.2514,.3954,.5719,.7725,.9821,1.1796,1.3418,1.447,1.4803,1.4369,1.3232,1.1552,.955,.7459,.548,.3757,.2363,.1309,.0561,.0062,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0455,.1215,.2301,.3721,.541,.7209,.8882,1.0161,1.0816,1.0722,.99,.8506,.6789,.501,.3387,.2052,.105,.0357,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0084,.0595,.1356,.2422,.3821,.5535,.7483,.9515,1.1428,1.2996,1.4009,1.4325,1.3899,1.2793,1.1163,.9223,.7198,.5282,.3615,.2266,.1246,.0522,.0039,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0411,.1143,.219,.356,.5193,.6935,.8561,.9813,1.0467,1.0401,.963,.8304,.6656,.494,.3364,.206,.1074,.0385,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0052,.0541,.127,.2291,.363,.5268,.7124,.9057,1.0871,1.235,1.3299,1.3583,1.3163,1.2101,1.0546,.8701,.6779,.4963,.3384,.2108,.1143,.0458,2e-4,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0363,.1061,.2059,.3367,.4925,.6593,.8156,.9369,1.0019,.9986,.9282,.8042,.6484,.4849,.3336,.2072,.1105,.0422,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0014,.0478,.1169,.2135,.3399,.494,.6682,.8487,1.0171,1.1533,1.2394,1.2631,1.2214,1.1204,.9742,.8018,.6229,.4543,.308,.1899,.1006,.0374,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0316,.0977,.1922,.316,.4637,.6221,.7713,.8883,.953,.9537,.891,.7768,.6314,.477,.3325,.2103,.1156,.0475,.0017,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0411,.1061,.1968,.315,.4586,.6198,.7857,.939,1.0614,1.1366,1.1542,1.1121,1.0165,.8806,.722,.5584,.405,.2722,.1651,.0845,.0273,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0274,.09,.1793,.2962,.4358,.586,.7283,.8415,.9064,.9119,.8575,.7538,.6191,.4738,.3358,.2173,.1237,.0551,.008,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0349,.0961,.1811,.2913,.4242,.5722,.7227,.8598,.9669,1.0298,1.0399,.9964,.9056,.7803,.636,.4886,.3513,.2331,.1382,.0668,.0163,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0242,.0839,.1687,.2795,.4121,.5552,.6918,.8022,.8684,.8792,.8335,.7403,.6156,.4785,.3458,.2296,.136,.0657,.0162,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0299,.0879,.1681,.2713,.3946,.5301,.6658,.7867,.8779,.9273,.9287,.8823,.7953,.6795,.549,.4176,.2965,.1931,.1104,.0486,.005,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0225,.0801,.1615,.2679,.3952,.5331,.6661,.7755,.8442,.8611,.824,.7403,.6244,.4937,.3644,.2486,.1531,.0797,.0268,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0268,.0827,.1595,.2576,.3731,.4981,.6204,.7259,.8013,.8368,.828,.7772,.6921,.5841,.4659,.3494,.2435,.1542,.0834,.0308,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0226,.0792,.1588,.2626,.387,.5225,.6543,.7649,.8376,.8611,.8323,.7569,.6477,.5209,.3925,.2748,.1755,.0974,.0397,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.026,.0813,.1567,.2518,.3623,.4793,.5905,.6824,.7428,.764,.7441,.687,.6015,.4988,.3907,.2869,.1947,.1181,.0583,.0142,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0246,.0814,.1609,.2644,.3885,.5243,.6578,.7719,.8502,.8808,.8596,.7909,.6861,.5607,.4304,.3083,.203,.1184,.0548,.0097,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0278,.084,.1602,.2551,.3635,.4757,.5786,.659,.7056,.7128,.6806,.6154,.527,.427,.3261,.2325,.1517,.0861,.0358,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0285,.0866,.1678,.2732,.3996,.5386,.6765,.7963,.8815,.9196,.9053,.8415,.7387,.6119,.4771,.3482,.2349,.1425,.0718,.021,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0324,.0911,.17,.2674,.3769,.4874,.5852,.6564,.6909,.6843,.6393,.5642,.4705,.3703,.2736,.1874,.1155,.0589,.0165,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0339,.0944,.1787,.2879,.4191,.5638,.7084,.8359,.9292,.9749,.9664,.9059,.8029,.6723,.5307,.3929,.2702,.1686,.0902,.0332,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0394,.102,.1857,.288,.4012,.5132,.6087,.6733,.6972,.6777,.6194,.533,.4319,.3287,.2334,.1518,.0864,.0367,7e-4,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0404,.1042,.1926,.3072,.4448,.5971,.7502,.8867,.9887,1.0418,1.0385,.9797,.8746,.7384,.5882,.4403,.3071,.1958,.1091,.0457,.0021,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0021,.0487,.1163,.2061,.3151,.4344,.5502,.6459,.7061,.7212,.6895,.618,.5195,.4093,.3011,.2047,.1254,.0641,.0193,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0017,.0474,.1148,.2082,.3289,.4741,.635,.7975,.9436,1.0545,1.1146,1.1155,1.0573,.9489,.8059,.6464,.4878,.3438,.2228,.1279,.0582,.0101,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0096,.0601,.1332,.23,.3467,.4735,.5948,.6923,.7499,.7577,.715,.6308,.52,.3999,.2851,.1859,.1068,.0478,.0063,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.006,.0543,.1255,.2238,.3509,.5037,.6734,.8453,1.0008,1.12,1.1865,1.1908,1.1324,1.0203,.8703,.7016,.5328,.3786,.2484,.146,.0706,.0183,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0197,.0741,.1526,.2563,.381,.5155,.6428,.7431,.7992,.8009,.7485,.6525,.53,.3998,.278,.1748,.0946,.0365,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0098,.0605,.135,.2378,.3706,.5304,.7081,.8885,1.0523,1.1788,1.2507,1.2577,1.199,1.0834,.9272,.7504,.5728,.4099,.2721,.1634,.0831,.0275,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.034,.0919,.1752,.2851,.4167,.558,.6907,.7937,.8486,.8451,.7843,.6779,.5447,.4052,.2765,.1692,.0872,.0291,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0128,.0653,.1424,.2487,.3861,.5514,.7353,.9224,1.0927,1.225,1.3013,1.3106,1.2517,1.1336,.973,.7904,.6064,.4373,.294,.1808,.0972,.0392,.0013,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.017,.0558,.1164,.2033,.3177,.4542,.6002,.7364,.8406,.8938,.8856,.8175,.7023,.5601,.4128,.2781,.167,.0831,.0246,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0146,.0682,.1469,.2554,.3955,.5641,.7519,.9432,1.1178,1.2541,1.3335,1.3449,1.2868,1.1681,1.0056,.8205,.6335,.4615,.3156,.2005,.1154,.0565,.0179,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0037,.0102,.0162,.0214,.0255,.0283,.0295,.0292,.0273,.024,.0194,.0137,.0073,5e-4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0047,.0115,.0175,.0226,.0264,.0288,.0297,.029,.0268,.0231,.0183,.0126,.0062,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7e-4,.008,.0148,.0209,.0257,.0292,.0311,.0313,.03,.0273,.0235,.0191,.0145,.0101,.0063,.0035,.002,.0023,.0051,.012,.0256,.0498,.0901,.1522,.241,.3573,.4958,.6432,.7797,.8827,.9328,.9195,.8449,.7224,.5733,.42,.2807,.1665,.081,.022,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0151,.069,.1481,.2571,.3978,.5672,.756,.9486,1.1248,1.263,1.3446,1.3582,1.3023,1.1856,1.025,.8414,.6558,.4851,.3404,.2263,.1423,.084,.0459,.0222,.0079,0,0,0,0,0,0,0,0,0,.0012,.0086,.0173,.0271,.0377,.0485,.059,.0688,.0772,.0839,.0883,.0904,.0899,.0868,.0813,.0738,.0645,.0541,.0429,.0315,.0206,.0104,.0014,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0049,.0153,.0265,.0382,.0498,.0607,.0706,.0789,.0852,.0892,.0907,.0896,.086,.0801,.0723,.0629,.0526,.0417,.0309,.0205,.011,.0026,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0017,.0106,.0208,.0321,.0439,.0556,.0667,.0765,.0845,.0902,.0932,.0937,.0916,.0873,.0814,.0745,.0674,.0607,.055,.051,.049,.0495,.0532,.0613,.0763,.1017,.1429,.2054,.2939,.4091,.5456,.69,.8227,.9208,.9654,.946,.8652,.7369,.5827,.4252,.2829,.1669,.0804,.021,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0143,.0675,.1456,.2533,.3924,.5598,.7467,.9376,1.1128,1.251,1.3339,1.3503,1.2987,1.1874,1.033,.856,.6769,.5124,.3733,.264,.1837,.1283,.092,.0691,.0547,.0453,.0386,.0336,.0296,.0268,.0256,.0262,.0291,.0345,.0425,.0531,.066,.0808,.0968,.1133,.1295,.1445,.1575,.1678,.1747,.1779,.177,.1722,.1637,.152,.1376,.1214,.1041,.0866,.0698,.0544,.0409,.0298,.0214,.0157,.0127,.0121,.0133,.0158,.019,.0223,.025,.0266,.0269,.0258,.0232,.0194,.0149,.0103,.0061,.003,.0015,.0021,.0053,.0113,.02,.0315,.0454,.0612,.0785,.0966,.1145,.1316,.147,.16,.1698,.1761,.1784,.1767,.1711,.1621,.15,.1356,.1197,.1031,.0865,.0708,.0565,.0442,.0341,.0264,.0212,.0184,.0177,.0188,.0213,.0247,.0286,.0326,.0363,.0393,.0414,.0423,.042,.0405,.0379,.0345,.0305,.0264,.0226,.0196,.0179,.018,.0203,.0252,.0328,.0432,.0563,.0717,.0887,.1067,.1247,.1418,.1569,.1692,.1779,.1827,.1834,.1803,.1739,.165,.1547,.1441,.1344,.1264,.121,.1187,.1199,.125,.1351,.1521,.1791,.2208,.2824,.3682,.4788,.6088,.7453,.8689,.9578,.9935,.9663,.8789,.7457,.5879,.4281,.2844,.1676,.0807,.0211,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0121,.0638,.1397,.2443,.3794,.5423,.7243,.9107,1.0824,1.219,1.3029,1.3232,1.2784,1.1764,1.0331,.8683,.7016,.5488,.4202,.3197,.2465,.1962,.1632,.1418,.1274,.1166,.1076,.0996,.0924,.0866,.0828,.0818,.0842,.0905,.1009,.1154,.1334,.1544,.1774,.2013,.2249,.2469,.266,.2811,.2913,.2959,.2946,.2875,.2749,.2576,.2363,.2124,.187,.1615,.137,.1147,.0956,.0802,.0691,.0622,.0595,.0603,.064,.0697,.0762,.0825,.0876,.0908,.0915,.0895,.0849,.0782,.0701,.0615,.0534,.0468,.0428,.042,.0452,.0527,.0646,.0808,.1007,.1237,.149,.1755,.202,.2273,.2501,.2693,.284,.2932,.2968,.2943,.2862,.2729,.2552,.2342,.2109,.1867,.1628,.1401,.1198,.1025,.0887,.0787,.0725,.0699,.0706,.0739,.0794,.0862,.0937,.101,.1077,.1131,.1168,.1184,.1179,.1153,.1107,.1046,.0974,.0898,.0825,.0763,.072,.0704,.0722,.0778,.0877,.1019,.1202,.142,.1665,.1926,.2187,.2436,.2657,.2837,.2966,.3037,.3048,.3003,.291,.2782,.2634,.2483,.2347,.2238,.2169,.2144,.2169,.2243,.2373,.2571,.286,.328,.3875,.4682,.5706,.6894,.8126,.9218,.9965,1.0195,.9821,.8875,.7496,.5895,.4288,.2851,.1685,.0818,.0223,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0088,.0582,.1306,.2305,.3597,.5156,.6901,.8695,1.0358,1.1697,1.2546,1.2802,1.245,1.1565,1.0296,.8829,.7344,.5991,.4861,.399,.3362,.2936,.2654,.2461,.2316,.2187,.2061,.1935,.1812,.1704,.1624,.1582,.159,.1655,.1781,.1966,.2204,.2488,.2803,.3133,.346,.3765,.4032,.4243,.4385,.4449,.4431,.4331,.4153,.3909,.3611,.3275,.2921,.2566,.2228,.1923,.1665,.1464,.1325,.125,.1235,.1273,.1352,.1458,.1574,.1683,.1772,.1827,.184,.1809,.1734,.1623,.1488,.1342,.1201,.1082,.0999,.0964,.0988,.1075,.1228,.1443,.1715,.2033,.2385,.2755,.3127,.3482,.3803,.4074,.428,.4412,.4462,.4429,.4316,.4131,.3884,.3591,.3269,.2934,.2604,.2295,.202,.1791,.1613,.1491,.1424,.1411,.1444,.1516,.1618,.1738,.1866,.1991,.2102,.2192,.2252,.228,.2272,.2229,.2154,.2053,.1933,.1804,.1678,.1566,.1481,.1433,.1434,.1492,.1612,.1794,.2036,.233,.2664,.3022,.3384,.3729,.4036,.4287,.4466,.4565,.458,.4518,.4389,.4211,.4007,.3801,.3616,.3472,.3383,.3359,.34,.3505,.3672,.3905,.4218,.4637,.52,.5934,.6842,.7876,.8924,.982,1.0379,1.0446,.9947,.8918,.7495,.5879,.4276,.2849,.1694,.0834,.0242,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,.0044,.0508,.1189,.2128,.3343,.4813,.6463,.8167,.9759,1.1063,1.1925,1.2249,1.2023,1.1314,1.0258,.9025,.778,.6655,.573,.5032,.4542,.4215,.3996,.3832,.3683,.3525,.3349,.3159,.2965,.2787,.2643,.2552,.2529,.2585,.2726,.295,.325,.3614,.4023,.4456,.4887,.5292,.5645,.5926,.6114,.6199,.6174,.604,.5802,.5475,.5077,.4631,.416,.369,.3246,.2849,.2519,.2269,.2106,.2033,.2044,.2129,.2269,.2444,.2631,.2806,.2945,.3032,.3054,.3007,.2894,.2725,.2516,.2289,.2066,.1872,.1727,.165,.1654,.1747,.1932,.2205,.2557,.2974,.344,.3932,.4427,.4902,.5332,.5695,.5972,.6149,.6218,.6175,.6026,.578,.5453,.5066,.464,.4199,.3767,.3366,.3014,.2724,.2507,.2367,.2305,.2316,.2392,.2521,.269,.2882,.3083,.3276,.3448,.3585,.3678,.372,.3708,.3643,.3529,.3375,.319,.299,.2791,.2609,.2462,.2367,.2338,.2387,.2521,.2742,.3047,.3424,.3857,.4325,.48,.5255,.5661,.5993,.6231,.6361,.638,.6296,.6123,.5887,.5616,.5342,.5099,.4911,.4798,.477,.4829,.4966,.5174,.5445,.5781,.6197,.6716,.7358,.8124,.8969,.9795,1.0456,1.0792,1.0669,1.0028,.891,.7447,.5827,.4239,.2834,.1698,.0851,.0264,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0422,.1051,.192,.3046,.4411,.5949,.7548,.9059,1.0322,1.1199,1.1605,1.1526,1.1025,1.0221,.9266,.8305,.7451,.6769,.6277,.595,.5742,.5596,.5464,.5311,.5116,.4878,.4608,.4327,.406,.3834,.3676,.3608,.3643,.379,.4048,.4408,.4853,.536,.59,.6441,.6951,.7397,.7751,.799,.8097,.8064,.7892,.759,.7174,.6669,.6103,.5508,.4916,.436,.3869,.3466,.317,.299,.2929,.298,.3126,.3345,.3609,.3884,.4137,.4339,.4465,.4499,.4434,.4274,.4034,.3736,.341,.3087,.2798,.2575,.244,.2413,.2504,.2717,.3046,.3481,.4003,.4588,.5211,.584,.6443,.699,.7453,.7806,.8033,.8122,.807,.7882,.7572,.7159,.6671,.6135,.5583,.5045,.4549,.4118,.377,.3518,.3369,.3321,.337,.3502,.3704,.3956,.4238,.4528,.4805,.505,.5245,.5377,.5437,.542,.5329,.5168,.4949,.4686,.4399,.411,.3841,.3617,.3458,.3386,.3415,.3555,.381,.4174,.4634,.517,.5752,.6347,.6918,.7429,.7846,.8145,.8307,.833,.8219,.7997,.7693,.7346,.6995,.6682,.644,.6293,.6254,.6322,.6486,.6729,.7032,.7386,.779,.8256,.8795,.9402,1.0038,1.0621,1.1029,1.1125,1.0803,1.0019,.8819,.7328,.5717,.4161,.2792,.1687,.086,.0283,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0327,.09,.1691,.2718,.3967,.5382,.6864,.8283,.9499,1.0391,1.0883,1.0963,1.0686,1.0155,.9501,.8847,.8286,.7868,.7598,.7447,.7366,.73,.7203,.7043,.6808,.6503,.6146,.5767,.5401,.5085,.485,.4725,.473,.4875,.5159,.5571,.609,.6689,.7332,.7979,.8591,.9127,.9553,.9841,.9969,.9929,.972,.9354,.8851,.8241,.7558,.6841,.6132,.5469,.4888,.4419,.4084,.3895,.3855,.3953,.4172,.4479,.484,.5211,.5552,.5822,.5991,.6037,.5952,.5743,.5426,.5033,.4599,.4165,.3774,.3462,.3261,.3194,.3276,.351,.389,.4402,.5024,.5726,.6475,.7234,.7964,.8626,.9187,.9616,.9892,1.0001,.994,.9714,.9342,.8847,.8261,.7619,.696,.6321,.5735,.5231,.4832,.4553,.4402,.4377,.4471,.4669,.4953,.5298,.5678,.6065,.6433,.6756,.7013,.7187,.7267,.7246,.7126,.6914,.6625,.6278,.5897,.551,.5146,.4834,.4603,.4479,.4479,.4618,.4898,.5314,.5851,.6482,.7173,.7882,.8565,.9177,.9677,1.0033,1.0226,1.0248,1.0109,.9834,.9459,.9029,.8594,.8202,.7895,.77,.7635,.7696,.7869,.813,.845,.8808,.919,.9594,1.0022,1.0466,1.0893,1.1236,1.1396,1.1264,1.0758,.9851,.8591,.7096,.552,.4016,.2702,.1642,.0847,.0289,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0226,.0739,.1448,.237,.3496,.4778,.6134,.7451,.8611,.9508,1.0079,1.0312,1.0254,.9992,.9635,.9284,.9011,.8852,.88,.8822,.8864,.8875,.8812,.8648,.8375,.8006,.7568,.7097,.6637,.6232,.5922,.5741,.5712,.5849,.6149,.6602,.7184,.786,.859,.9328,1.0027,1.0642,1.113,1.146,1.1607,1.156,1.1319,1.0897,1.0318,.9616,.8832,.8011,.72,.6446,.5789,.5266,.4901,.4709,.4693,.4842,.513,.5523,.5976,.6439,.6861,.7195,.7404,.7462,.736,.7104,.6716,.6233,.5697,.516,.4671,.4274,.4008,.3901,.3969,.4216,.4637,.5214,.5921,.6724,.7583,.8455,.9294,1.0057,1.0704,1.1199,1.1518,1.1645,1.1575,1.1318,1.0892,1.0325,.9655,.8923,.8172,.7446,.6785,.6221,.5782,.5484,.5336,.5338,.5478,.5742,.6104,.6537,.7009,.7488,.7941,.8338,.8654,.8867,.8965,.8939,.8793,.8534,.818,.7754,.7284,.6804,.635,.5955,.5654,.5476,.5446,.5576,.5874,.6331,.6931,.7642,.8425,.9232,1.001,1.0708,1.1278,1.1683,1.1899,1.1918,1.175,1.1422,1.0977,1.0465,.9944,.9468,.9085,.8829,.8717,.8749,.8905,.9157,.947,.981,1.0153,1.0487,1.0806,1.1097,1.1334,1.1463,1.1408,1.1085,1.0436,.9447,.8169,.6708,.52,.3779,.2544,.1549,.08,.027,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0122,.0573,.1197,.2012,.3009,.4153,.5373,.6578,.7666,.8552,.9179,.954,.9673,.9649,.9556,.9474,.9457,.9524,.9663,.9832,.9981,1.0059,1.0026,.9861,.9561,.9145,.8643,.8102,.7569,.7096,.6727,.65,.6444,.6571,.6881,.7361,.7985,.8716,.9509,1.0312,1.1074,1.1745,1.2278,1.2638,1.2798,1.2746,1.2482,1.202,1.1386,1.0618,.976,.8864,.798,.716,.645,.5889,.5505,.5315,.532,.5507,.5851,.631,.6834,.7368,.7852,.8236,.8476,.8543,.8428,.8136,.7694,.7141,.6529,.5912,.5347,.4885,.4568,.4428,.4483,.4738,.5187,.5809,.6577,.7452,.839,.9344,1.0263,1.1099,1.1807,1.2351,1.2701,1.2841,1.2766,1.2486,1.2021,1.1403,1.0672,.9874,.9058,.8271,.7557,.6952,.6485,.6176,.6034,.6057,.6236,.655,.6973,.7474,.8018,.8566,.9085,.9538,.9899,1.0142,1.0253,1.0224,1.0057,.9763,.9359,.8872,.8335,.7785,.726,.6801,.6445,.6226,.6168,.629,.6597,.7082,.7725,.8493,.9341,1.0217,1.1064,1.1822,1.2442,1.288,1.3109,1.3122,1.2927,1.2554,1.2047,1.1462,1.0861,1.0304,.9841,.9512,.9335,.9312,.9422,.9634,.9909,1.0206,1.0495,1.0754,1.097,1.1131,1.1212,1.1173,1.0956,1.0502,.9769,.8756,.7513,.6134,.4736,.3431,.2303,.1394,.0709,.0222,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,.0018,.0406,.0946,.1651,.2518,.3518,.4595,.5674,.6673,.7521,.8172,.862,.8895,.9055,.9168,.9295,.9475,.9715,.9995,1.0273,1.05,1.0627,1.0619,1.0459,1.0148,.9709,.9178,.8601,.8032,.7524,.7125,.6876,.6804,.6925,.724,.7733,.8377,.9134,.9956,1.0791,1.1584,1.2281,1.2836,1.3211,1.3378,1.3323,1.3048,1.2566,1.1905,1.1105,1.0212,.9279,.836,.7509,.6773,.6194,.5802,.5613,.5629,.5837,.6208,.6701,.7261,.7829,.8346,.8754,.9009,.9081,.8959,.865,.818,.7594,.6942,.6286,.5683,.5188,.4845,.4688,.4735,.4994,.5455,.61,.6897,.7806,.8783,.9776,1.0734,1.1605,1.2344,1.2911,1.3276,1.3423,1.3345,1.3054,1.257,1.1927,1.1167,1.0338,.9491,.8674,.7934,.731,.683,.6517,.6378,.6413,.6611,.6951,.7405,.794,.8519,.9103,.9654,1.0136,1.0518,1.0777,1.0894,1.0864,1.0687,1.0374,.9946,.9429,.8858,.8272,.7713,.7221,.6837,.6596,.6525,.6642,.6953,.745,.8114,.8908,.9788,1.0697,1.1575,1.2362,1.3004,1.3455,1.3688,1.3691,1.3475,1.3069,1.2517,1.1878,1.1214,1.0587,1.0051,.9646,.9393,.9295,.9334,.9478,.9687,.992,1.014,1.0323,1.0451,1.0509,1.0479,1.0328,1.0015,.9499,.8751,.7779,.6628,.5379,.4131,.2975,.198,.1179,.0574,.0141,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,.0243,.0699,.1296,.2033,.2887,.3816,.4758,.5648,.6429,.7064,.7549,.7906,.8181,.8427,.8689,.8993,.9337,.9699,1.0037,1.0305,1.0459,1.0469,1.0322,1.0021,.959,.9067,.8498,.7937,.7436,.7044,.6799,.6731,.6853,.7166,.7657,.8297,.9049,.9865,1.0694,1.148,1.2172,1.2723,1.3094,1.326,1.3206,1.2932,1.2455,1.18,1.1006,1.012,.9194,.8283,.7438,.6707,.6132,.5741,.5552,.5566,.577,.6135,.6621,.7174,.7735,.8245,.8648,.89,.8971,.885,.8545,.8081,.7501,.6858,.621,.5614,.5126,.4788,.4635,.4684,.4942,.54,.6041,.6831,.7734,.8703,.9688,1.0638,1.1502,1.2235,1.2797,1.3159,1.3304,1.3228,1.2938,1.2458,1.182,1.1066,1.0244,.9403,.8592,.7857,.7237,.676,.6447,.6308,.6341,.6534,.6869,.7317,.7845,.8416,.8993,.9537,1.0014,1.0391,1.0647,1.0763,1.0733,1.0558,1.0249,.9826,.9315,.8751,.8172,.762,.7135,.6757,.652,.6452,.657,.688,.7375,.8034,.8823,.9696,1.0597,1.1468,1.2247,1.2881,1.3324,1.3549,1.3543,1.3315,1.2893,1.2321,1.1654,1.0954,1.0281,.9689,.9217,.889,.871,.8664,.8723,.885,.9003,.9149,.926,.9316,.9305,.9208,.9002,.8658,.8145,.7446,.6572,.5562,.4484,.3417,.2435,.1593,.0915,.0402,.0034,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,.0086,.0462,.0955,.1566,.2277,.3055,.3852,.4617,.5304,.5886,.6357,.6736,.7058,.7364,.7684,.8037,.8418,.8801,.9149,.9423,.9583,.9604,.9475,.9203,.8811,.8333,.7814,.7303,.6849,.6498,.6285,.6236,.6366,.6674,.7147,.7759,.8475,.9249,1.0035,1.0779,1.1434,1.1954,1.2306,1.2462,1.2412,1.2154,1.1703,1.1085,1.0335,.9498,.8623,.776,.6958,.6264,.5713,.5334,.5143,.5142,.5318,.5646,.6086,.659,.7103,.757,.7939,.817,.8235,.8123,.7842,.7415,.6882,.6292,.5698,.5155,.4711,.4409,.4278,.4337,.459,.5031,.5641,.6392,.7247,.8163,.9093,.999,1.0805,1.1496,1.2026,1.2367,1.2504,1.243,1.2157,1.1702,1.1099,1.0385,.9606,.8808,.8038,.7339,.6745,.6286,.598,.5836,.5853,.602,.632,.6726,.7207,.773,.8259,.8758,.9196,.9543,.9778,.9885,.9858,.9697,.9412,.9022,.8553,.8035,.7505,.7001,.656,.622,.6012,.5963,.6088,.6392,.6869,.75,.8251,.908,.9935,1.0759,1.1495,1.2092,1.2508,1.2714,1.27,1.2472,1.2056,1.1491,1.0829,1.0126,.944,.8821,.8306,.7919,.7667,.7539,.7511,.7551,.7624,.7697,.7745,.7751,.7699,.7575,.7362,.7037,.6579,.5977,.5242,.4405,.3521,.2652,.1856,.1174,.0625,.021,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,.0242,.0639,.1131,.1705,.2336,.2987,.3618,.4194,.4693,.5111,.5462,.5773,.6075,.639,.6731,.7089,.7444,.7763,.8012,.8159,.8185,.808,.7851,.7519,.7114,.6676,.6248,.5872,.5586,.5423,.5406,.5545,.5841,.6282,.6845,.7497,.8201,.8911,.9583,1.0173,1.0643,1.0959,1.1101,1.1055,1.0825,1.042,.9865,.9191,.8438,.7649,.687,.6143,.551,.5003,.4647,.4456,.4431,.4564,.4829,.5195,.5619,.6053,.6449,.6764,.696,.7014,.6917,.6676,.6311,.5855,.5352,.4848,.4389,.402,.3775,.368,.3753,.3997,.4405,.4962,.5643,.6415,.7241,.8077,.8883,.9615,1.0235,1.071,1.1015,1.1136,1.107,1.0822,1.0412,.9868,.9223,.8519,.7797,.7097,.6459,.5914,.5486,.5194,.5044,.5037,.5163,.5405,.5743,.6148,.6591,.7041,.7467,.7841,.8138,.8339,.8431,.8407,.8268,.8024,.7691,.729,.6848,.6398,.5971,.5603,.5325,.5164,.5143,.5277,.557,.6015,.6595,.7281,.8034,.8808,.9552,1.0216,1.0753,1.1124,1.1306,1.1286,1.107,1.068,1.0151,.9527,.8859,.8196,.7584,.7058,.664,.6338,.6145,.6044,.6008,.601,.6022,.6023,.5995,.5927,.5806,.5618,.5345,.4973,.4493,.3914,.326,.2574,.1901,.1286,.076,.0337,.0016,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,.0046,.0355,.074,.1189,.1683,.2195,.2694,.3151,.3552,.3892,.4182,.4444,.4699,.4966,.5252,.5551,.5845,.6109,.6314,.6437,.6462,.6382,.6203,.5943,.5626,.5285,.4955,.467,.4462,.4356,.4372,.4519,.4795,.5191,.5687,.6256,.6865,.7479,.8057,.8564,.8967,.9239,.9361,.9323,.9126,.8781,.8306,.773,.7085,.6407,.5736,.5108,.4555,.4107,.3784,.3598,.355,.3632,.3825,.4103,.4431,.477,.5082,.5329,.5483,.5525,.5447,.5254,.4964,.4602,.4204,.3807,.345,.3168,.299,.2937,.3023,.325,.3614,.4101,.4691,.5356,.6064,.6781,.7469,.8094,.8623,.9028,.9288,.939,.9332,.9118,.8766,.8298,.7743,.7136,.6511,.5905,.5347,.4866,.4484,.4213,.4061,.4028,.4106,.4283,.4539,.4852,.5199,.5554,.5892,.6189,.6425,.6585,.6658,.6639,.6528,.6333,.6068,.5749,.5399,.5045,.4713,.443,.4224,.4117,.4128,.4268,.454,.494,.5452,.6052,.6706,.7375,.8017,.8587,.9048,.9365,.9517,.9494,.9301,.8955,.8485,.7928,.7326,.6721,.6152,.5649,.5232,.4911,.4681,.4531,.4441,.4391,.4359,.4328,.4284,.4216,.4115,.3968,.3761,.3484,.3129,.2702,.2221,.1717,.1223,.0771,.0385,.0075,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,.0111,.0402,.0742,.1116,.1503,.1879,.2224,.2525,.2779,.2996,.319,.3379,.3577,.379,.4012,.4232,.443,.4585,.4678,.4699,.4642,.4513,.4325,.4096,.3852,.3619,.3423,.329,.3238,.3281,.3427,.3675,.4015,.4434,.4908,.5412,.5917,.6391,.6807,.7136,.7358,.7458,.7428,.7268,.6988,.6602,.6133,.5607,.5053,.4502,.3983,.3524,.3145,.2863,.2689,.2622,.2658,.2783,.2974,.3206,.345,.3676,.3857,.3969,.3999,.394,.3796,.3581,.3314,.3022,.2734,.2479,.2283,.2169,.2153,.2246,.245,.2761,.3168,.3655,.4201,.478,.5364,.5924,.6431,.6861,.7189,.7399,.748,.7431,.7256,.6968,.6584,.6129,.563,.5116,.4613,.4148,.3743,.3414,.3173,.3026,.2973,.3007,.312,.3296,.3518,.3769,.4028,.4276,.4495,.467,.4788,.4842,.4827,.4745,.46,.4403,.4168,.3912,.3654,.3416,.3218,.3082,.3026,.3063,.3202,.3446,.379,.4223,.4723,.5266,.5818,.6345,.6813,.7189,.7447,.7569,.7547,.7384,.7093,.6697,.6226,.5713,.5192,.4694,.4244,.386,.3549,.3313,.3142,.3024,.2944,.2887,.2839,.2791,.2733,.2657,.2554,.2413,.2223,.1979,.1685,.1352,.1001,.0656,.0341,.0071,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,.0123,.0372,.0645,.0926,.1197,.1443,.1655,.183,.1975,.2102,.2224,.2353,.2492,.264,.2788,.2922,.3028,.3094,.3109,.3072,.2986,.286,.2708,.2548,.2399,.228,.2208,.2197,.2257,.2394,.2605,.2885,.3222,.3599,.3996,.4392,.4762,.5086,.5342,.5515,.5593,.557,.5447,.5231,.4932,.4569,.4161,.373,.3299,.2892,.2526,.2221,.1987,.1831,.1756,.1757,.1824,.1942,.2092,.2253,.2404,.2525,.2601,.262,.2578,.2479,.233,.2148,.195,.1757,.159,.1468,.1407,.1419,.1511,.1686,.1939,.2264,.2647,.3073,.3524,.3976,.441,.4802,.5133,.5386,.5547,.5609,.557,.5433,.5208,.4909,.4554,.4163,.3759,.3362,.2993,.2666,.2397,.2192,.2058,.1993,.1995,.2055,.2163,.2307,.2473,.2647,.2816,.2966,.3086,.3167,.3204,.3193,.3136,.3037,.2901,.274,.2566,.2393,.2237,.2112,.2035,.2018,.2071,.2201,.2409,.2692,.3041,.344,.3868,.4302,.4715,.508,.5373,.5573,.5667,.5648,.5517,.5286,.4971,.4594,.4181,.3757,.3347,.297,.2641,.2366,.2147,.198,.1857,.1768,.1702,.1651,.1607,.1562,.1512,.1447,.1359,.124,.1084,.0894,.0676,.0445,.0217,8e-4,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0078,.0271,.0468,.0655,.0822,.0962,.1072,.1158,.123,.1296,.1366,.1444,.1531,.1619,.1701,.1767,.1809,.1819,.1797,.1744,.1667,.1575,.148,.1394,.1332,.1303,.1318,.1384,.1503,.1674,.1893,.2151,.2436,.2734,.3029,.3305,.3544,.3734,.3862,.392,.3904,.3814,.3655,.3435,.3168,.2866,.2547,.2227,.1922,.1646,.1411,.1226,.1096,.1022,.1002,.1028,.1091,.1178,.1275,.1367,.1442,.1488,.1499,.1472,.1408,.1313,.1198,.1074,.0956,.0857,.079,.0767,.0794,.0878,.1019,.1216,.1462,.1749,.2067,.24,.2734,.3052,.3341,.3583,.3768,.3886,.3931,.3901,.38,.3633,.3411,.3147,.2856,.2554,.2256,.1976,.1726,.1515,.1351,.1236,.117,.1151,.1174,.1231,.1315,.1416,.1524,.1629,.1724,.18,.1852,.1876,.1869,.1832,.1768,.1681,.1579,.147,.1364,.1271,.1202,.1167,.1175,.1233,.1346,.1515,.1736,.2004,.2306,.2628,.2953,.3261,.3532,.3749,.3897,.3966,.3951,.3852,.3678,.344,.3155,.2841,.2516,.2198,.1902,.1639,.1414,.123,.1084,.0973,.089,.0828,.0781,.0744,.0713,.0683,.0646,.0597,.0529,.0438,.0322,.0188,.0043,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.012,.0245,.0353,.0439,.0502,.0546,.0578,.0604,.0633,.0668,.071,.0755,.08,.0836,.086,.0866,.0854,.0824,.0782,.0731,.0681,.0638,.0612,.061,.0637,.0698,.0794,.0925,.1088,.1275,.148,.1693,.1902,.2097,.2266,.24,.249,.253,.2519,.2457,.2346,.2192,.2005,.1793,.1569,.1343,.1125,.0927,.0755,.0617,.0515,.045,.0421,.0423,.045,.0494,.0546,.0597,.0639,.0665,.067,.0654,.0615,.056,.0492,.0421,.0355,.0303,.0273,.0272,.0305,.0375,.0483,.0627,.0805,.101,.1234,.1468,.1703,.1926,.2127,.2296,.2425,.2507,.2538,.2516,.2444,.2326,.217,.1983,.1777,.1563,.135,.1148,.0966,.081,.0685,.0593,.0534,.0507,.0507,.0532,.0575,.063,.0691,.0751,.0807,.0852,.0882,.0896,.0891,.0869,.0831,.078,.0721,.0658,.0599,.0549,.0516,.0507,.0528,.0582,.0674,.0803,.0967,.1162,.138,.1611,.1842,.206,.2252,.2405,.2509,.2557,.2546,.2476,.2352,.2182,.1978,.1752,.1517,.1285,.1066,.0869,.0698,.0555,.044,.035,.0281,.0229,.0191,.0164,.0144,.0128,.011,.0086,.0051,1e-4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0015,.0065,.0097,.0114,.0121,.0124,.0128,.0136,.015,.0169,.0188,.0206,.0218,.0221,.0215,.02,.0178,.0154,.0131,.0114,.0108,.0118,.0147,.0197,.027,.0365,.0479,.0608,.0748,.0892,.1033,.1164,.1277,.1367,.1427,.1454,.1447,.1406,.1332,.123,.1105,.0964,.0814,.0662,.0515,.038,.0261,.0163,.0088,.0036,6e-4,0,4e-4,.0022,.0047,.0072,.0094,.0107,.0109,.0099,.0078,.0048,.0012,0,0,0,0,0,0,2e-4,.008,.0181,.0303,.0442,.0592,.0749,.0905,.1054,.1187,.13,.1385,.1439,.1459,.1444,.1396,.1317,.1212,.1086,.0948,.0803,.0658,.052,.0395,.0286,.0196,.0127,.0079,.0052,.0042,.0048,.0066,.0093,.0124,.0156,.0186,.021,.0226,.0234,.0231,.0219,.0198,.017,.0138,.0106,.0076,.0053,.0042,.0046,.0069,.0114,.0183,.0276,.0392,.0527,.0676,.0832,.0989,.1136,.1265,.1367,.1437,.1469,.1461,.1414,.133,.1216,.1077,.0923,.0763,.0603,.0452,.0313,.0192,.0089,5e-4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0047,.0132,.0223,.0315,.0406,.0489,.0561,.0618,.0656,.0674,.067,.0643,.0597,.0532,.0453,.0364,.0268,.0171,.0077,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0033,.0129,.0229,.0327,.0421,.0506,.0576,.063,.0664,.0676,.0667,.0636,.0586,.0519,.0439,.035,.0257,.0164,.0075,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0077,.0173,.0274,.0375,.0469,.0551,.0617,.0661,.0681,.0676,.0646,.0593,.0519,.0431,.0332,.0228,.0124,.0025,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.003,.0074,.0108,.0131,.0142,.0139,.0124,.0096,.0057,.001,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0041,.0084,.0116,.0136,.0143,.0137,.0119,.0088,.0048,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.0017,.0067,.0106,.0133,.0145,.0142,.0124,.0092,.0047,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],maximumHeight:1.6312060375797472};function Yo(e){let t=(e.x-Jo.origin[0]-Jo.x0)/Jo.step,n=(Jo.origin[2]-e.z-Jo.y0)/Jo.step,r=Jo.heights.length,i=Jo.heights[0].length;if(t<0||n<0||t>=i-1||n>=r-1)return 0;let a=Math.floor(t),o=Math.floor(n),s=t-a,c=n-o,l=Jo.heights[o][a]*(1-s)+Jo.heights[o][a+1]*s,u=Jo.heights[o+1][a]*(1-s)+Jo.heights[o+1][a+1]*s;return l*(1-c)+u*c}function Xo(e){return Math.max(ye(e),Yo(e))}function Zo(e,t,n){if(n<=0)return t.clone();let r=t.clone().sub(e),i=Math.max(1,r.length()),a=Math.hypot(r.x,r.z),o=Math.min(1.28,Math.atan2(r.y,a)+n);return a<.001?t.clone():e.clone().add(new X(r.x/a*Math.cos(o),Math.sin(o),r.z/a*Math.cos(o)).multiplyScalar(i))}function Qo(){let e=fr(),[t,n,r]=Kn.origin;return{...e,boxes:[...e.boxes,...On.filter(e=>!e.circle).map(e=>new Yt(new X(e.minX,-.2,e.minZ),new X(e.maxX,e.height,e.maxZ)).expandByScalar(tn)),new Yt(new X(t-4,n+9,r-Kn.room.front),new X(t+4,n+12,r)).expandByScalar(tn),new Yt(new X(t-Kn.room.width/2,n+Kn.room.height,r-Kn.room.front-Kn.room.depth),new X(t+Kn.room.width/2,n+40,r-Kn.room.front)).expandByScalar(tn)],cylinders:[...e.cylinders,...On.flatMap(e=>e.circle?[{...e.circle,id:e.id,minY:0,maxY:e.height}]:[])]}}function $o(e,t,n,r,i){if(e>74&&n<60){let a=Et.smoothstep(e,74,85),o=new X(e,t+1.8+a*1.4,n),s=new X(e,t+.65,n),c=9.2+a*2.8,l=o.clone().add(new X(Math.sin(r)*c,2.7-a*1.6,Math.cos(r)*c)),u=qt(o,kt(o,l,i),l,i,s);return u.distanceTo(o)<8?ht(e,t,n,r,{...i,landmarkFraming:void 0}):{target:o,position:u,subjectTarget:s}}return ht(e,t,n,r,i)}function es(){let e=fr(),[t,n,r]=Hn.origin;return{...e,boxes:[...e.boxes,...Pn.filter(e=>!e.circle).map(e=>new Yt(new X(e.minX,-.2,e.minZ),new X(e.maxX,e.height,e.maxZ)).expandByScalar(tn)),new Yt(new X(t-4,n+9,r-10),new X(t+4,n+12,r)).expandByScalar(tn),new Yt(new X(t-Hn.room.width/2,n+Hn.room.height,r-Hn.room.front-Hn.room.depth),new X(t+Hn.room.width/2,n+40,r-10)).expandByScalar(tn)],cylinders:[...e.cylinders,...Pn.flatMap(e=>e.circle?[{...e.circle,id:e.id,minY:0,maxY:e.height}]:[])]}}function ts(e,t,n,r,i){if(e>74&&n<60){let a=Et.smoothstep(e,74,85),o=new X(e,t+1.8+a*1.4,n),s=new X(e,t+.65,n),c=9.2+a*2.8,l=o.clone().add(new X(Math.sin(r)*c,2.7-a*1.6,Math.cos(r)*c)),u=qt(o,kt(o,l,i),l,i,s);return u.distanceTo(o)<8?ht(e,t,n,r,{...i,landmarkFraming:void 0}):{target:o,position:u,subjectTarget:s}}return ht(e,t,n,r,i)}var ns={music:{text:`哪里来的音乐声？`,audioPath:`traveler-voice/v001/music-question.mp3`,duration:2.8},mural:{text:`好美的飞天啊！`,audioPath:`traveler-voice/v001/mural-admiration.mp3`,duration:2.3}},rs={minX:2.5,maxX:6.5,minZ:9.5,maxZ:16};function is(e){let t=M.mural,n=M.platform;return e.x>=t.center[0]-t.width/2-1&&e.x<=t.center[0]+t.width/2+1&&e.z>=t.center[2]+.3&&e.z<=n.maxZ+n.run+3.7}function as(e,t=!1,n,r={}){let i=!!r.useAudiblePlayback,a=r.hearingDuration??2.5,o=r.musicAlreadyHeard??(i||n?ue(e):e.x>rs.maxX),s=null,c=0,l=0,u=!1,d=null;function f(){d?.id===`mural`&&(u=!0),d=null}function p(e){d={id:e,time:0,...ns[e]}}return{get state(){return d?{...d}:null},get musicHeard(){return o},get listenedSeconds(){return Math.max(0,c-l)},get muralReady(){return u&&!d},update(e,r,m,h){i&&h&&Number.isFinite(h.audibleTime)&&(h.audibleTime<c&&(l=h.audibleTime),c=h.audibleTime);let g=M.court;if((e.x<g.minX-.7||e.x>g.maxX+.7||e.z>g.frontZ+.7||e.z<g.backZ-.7)&&(u=!1),d){d.time+=r,(t&&d.id===`mural`&&d.time>.15&&m||d.time>=d.duration&&(m||d.time>=d.duration+.2))&&f();return}if(i){if(!o&&h?.audible&&c-l>=a){o=!0,p(`music`);return}let[n,r]=M.mural.trigger;!u&&ue(e)&&(t?is(e):Math.hypot(e.x-n,e.z-r)<4.1)&&p(`mural`);return}if(s!==null){s+=r,s>=2&&(s=null,p(`music`));return}let _=rs,v=n?n(e):e.x>=_.minX&&e.x<=_.maxX&&e.z>=_.minZ&&e.z<=_.maxZ;if(!o&&v){o=!0,t?s=0:p(`music`);return}(n?ue(e):e.x>_.maxX)&&(o=!0);let[y,b]=M.mural.trigger;!u&&ue(e)&&(t?is(e):Math.hypot(e.x-y,e.z-b)<4.1)&&p(`mural`)},skip:f,reset(){o=!1,s=null,l=c,u=!1,d=null}}}function os(){return{subjectHeight:.65,shelters:Yn.shelters,landmarkFraming:{bounds:Yn.framing,targetLift:.85},boxes:[...In.filter(e=>!e.circle&&!e.polygon).map(e=>new Yt(new X(e.minX,-.2,e.minZ),new X(e.maxX,e.height,e.maxZ))),...[...Wt,...Yn.cameraBoxes,...Yn.dune.cameraBoxes].map(e=>new Yt(new X(...e.min),new X(...e.max)))].map(e=>e.expandByScalar(tn)),cylinders:In.flatMap(e=>e.circle?[{...e.circle,id:e.id??`music-prop`,minY:-.2,maxY:e.height}]:[])}}function ss(e){let t=Math.max(12.8,8.4/(2*Math.tan(Et.degToRad(49/2))*e)),[n,r,i]=Yn.mural.center;return{position:new X(n,r+3.75,i+t),target:new X(n,r-.55,i)}}function cs(e,t){let n=!1,r=!1,i=0,a=t,o=!1,s=new AbortController,c=new K;c.name=`music-pavilion-v003`,e.add(c);let l=[],u=[],d=null,f={uOriginal:{value:null},uRibbonMasks:{value:null},uTime:{value:0},uColor:{value:0},uMovement:{value:0}},p=e=>new URL(Nt(`music-pavilion/${e===`music-pavilion.glb`?`v003`:`v002`}/${e}`),document.baseURI);async function m(e){let t=await fetch(p(e),{signal:s.signal});if(!t.ok)throw Error(`music-asset-request-failed`);return t}async function h(e,t=!0){let r=await(await m(e)).blob(),i=await createImageBitmap(r,{imageOrientation:`flipY`,premultiplyAlpha:`none`});if(n)throw i.close(),Error(`music-load-cancelled`);u.push(i);let a=new q(i);return a.colorSpace=t?nt:``,a.needsUpdate=!0,a.anisotropy=4,l.push(a),a}function g(e){let t=new Set,n=new Set,r=new Set;e.traverse(e=>{if(e instanceof Z){t.add(e.geometry);for(let t of Array.isArray(e.material)?e.material:[e.material]){n.add(t);for(let e of Object.values(t))e instanceof q&&r.add(e)}}}),t.forEach(e=>e.dispose()),n.forEach(e=>e.dispose()),r.forEach(e=>{e.source.data instanceof ImageBitmap&&!u.includes(e.source.data)&&e.source.data.close(),e.dispose()}),e.removeFromParent()}let _=null;async function v(e=`music-pavilion.glb`){let t=await(await m(e)).arrayBuffer();if(n)throw Error(`music-load-cancelled`);let r=await new Xn().parseAsync(t,new URL(`.`,p(e)).href);if(n)throw g(r.scene),Error(`music-load-cancelled`);e===`route-dune.glb`?(r.scene.position.set(...Yn.dune.position),r.scene.scale.set(...Yn.dune.scale),_=r.scene):r.scene.position.set(...Yn.origin),r.scene.traverse(e=>{e instanceof Z&&(e.castShadow=!0,e.receiveShadow=!0)}),c.add(r.scene)}let y,b=Promise.race([Promise.all([v(),v(`route-dune.glb`),h(`mural-original.png`),h(`mural-underlay-crop.png`),h(`ribbon-masks-crop.png`,!1)]).then(([,,e,t,r])=>{if(n)return;f.uOriginal.value=e,f.uRibbonMasks.value=r;let i=new fn({map:t,roughness:1,metalness:0});i.onBeforeCompile=e=>{Object.assign(e.uniforms,f),e.fragmentShader=`uniform sampler2D uOriginal;
uniform sampler2D uRibbonMasks;
uniform float uTime;
uniform float uColor;
uniform float uMovement;
`+e.fragmentShader,e.fragmentShader=e.fragmentShader.replace(`#include <map_fragment>`,`
          vec2 uv = vMapUv;
          vec4 fixedArt = texture2D(uOriginal, uv);
          float freeEnd = 1.0 - smoothstep(140.0/1448.0, 275.0/1448.0, uv.x);
          vec2 upperUv = uv - vec2(3.0*sin(uTime*1.55),20.0*sin(uTime*1.55+uv.x*4.0))*freeEnd*uMovement/vec2(1448.0,1086.0);
          vec2 lowerUv = uv - vec2(2.5*sin(uTime*1.31),17.0*sin(uTime*1.31+uv.x*5.0+.65))*freeEnd*uMovement/vec2(1448.0,1086.0);
          vec2 patchOrigin = vec2(48.0/1448.0,1.0-520.0/1086.0);
          vec2 patchSize = vec2(272.0/1448.0,460.0/1086.0);
          vec2 patchUv = (uv-patchOrigin)/patchSize;
          float inPatch = step(0.0,patchUv.x)*step(patchUv.x,1.0)*step(0.0,patchUv.y)*step(patchUv.y,1.0);
          vec4 localArt = mix(fixedArt,texture2D(map,patchUv),inPatch);
          localArt = mix(localArt,texture2D(uOriginal,upperUv),texture2D(uRibbonMasks,(upperUv-patchOrigin)/patchSize).r*inPatch);
          localArt = mix(localArt,texture2D(uOriginal,lowerUv),texture2D(uRibbonMasks,(lowerUv-patchOrigin)/patchSize).g*inPatch);
          vec4 art = mix(fixedArt,localArt,uMovement);
          float luminance = dot(art.rgb,vec3(.2126,.7152,.0722));
          vec3 muted = vec3(luminance)*vec3(1.04,1.0,.91);
          diffuseColor *= vec4(mix(muted,art.rgb,uColor),art.a);
        `)},i.customProgramCacheKey=()=>`dunhuang-flying-local-ribbons-v003`,d=new Z(new et(Yn.mural.width,Yn.mural.height),i),d.name=`flying-original-art`,d.position.set(...Yn.mural.center),d.receiveShadow=!0,c.add(d)}),new Promise((e,t)=>{y=setTimeout(()=>t(Error(`music-loading-timeout`)),3e4)})]).then(()=>{clearTimeout(y)}).catch(e=>{throw S(),e});function x(e,t){o=t,r&&(i+=e,o&&(i=Math.max(i,ve)),i>=3.6&&(a=!0)),f.uColor.value=r?pe(i,o):0,f.uTime.value=i,f.uMovement.value=r&&!o?Et.smoothstep(i,.45,1.4):0}function S(){n||(n=!0,clearTimeout(y),s.abort(),g(c),l.forEach(e=>e.dispose()),u.forEach(e=>e.close()),l.length=0,u.length=0,c.clear())}return{ready:b,dispose:S,update:x,enter(){r=!0,i=0,x(0,o)},exit(){r=!1,i=0,x(0,o)},replay(){r=!0,i=0,x(0,o)},inspect:()=>({time:i,color:f.uColor.value,complete:r&&i>=3.6,awakened:a,active:r,reduced:o,movement:f.uMovement.value}),auditSight(e){return c.updateMatrixWorld(!0),[[36.8,5.9,-8.2],[46,5.9,-8.2],[55.2,5.9,-8.2],[38,8.9,-18],[46,8.9,-18],[54,8.9,-18],[46,10.7,-23],[38,10.2,-23],[54,10.2,-23]].map(t=>{let n=new X(...t),r=n.clone().project(e),i=e.position.distanceTo(n),a=new It(e.position,n.clone().sub(e.position).normalize(),0,i-.3),o=!!_&&a.intersectObject(_,!0).length>0;return{point:t,inFrame:Math.abs(r.x)<1&&Math.abs(r.y)<1&&r.z<1,blocked:o}})}}}function ls(){return{subjectHeight:.65,shelters:Fn.shelters,landmarkFraming:{bounds:Fn.framing,targetLift:.85},boxes:[...Mn.filter(e=>!e.circle&&!e.polygon).map(e=>new Yt(new X(e.minX,-.2,e.minZ),new X(e.maxX,e.height,e.maxZ))),...[...Wt,...Fn.cameraBoxes,...Fn.dune.cameraBoxes].map(e=>new Yt(new X(...e.min),new X(...e.max)))].map(e=>e.expandByScalar(tn)),cylinders:Mn.flatMap(e=>e.circle?[{...e.circle,id:e.id??`music-prop`,minY:-.2,maxY:e.height}]:[])}}function us(e){let t=Math.max(12.8,8.4/(2*Math.tan(Et.degToRad(49/2))*e)),[n,r,i]=Fn.mural.center;return{position:new X(n,r+.45,i+t),target:new X(n,r-.9,i)}}function ds(e,t){let n=!1,r=!1,i=0,a=t,o=!1,s=new AbortController,c=new K;c.name=`music-pavilion-v002`,e.add(c);let l=[],u=[],d=null,f={uOriginal:{value:null},uRibbonMasks:{value:null},uTime:{value:0},uColor:{value:0},uMovement:{value:0}},p=e=>new URL(Nt(`music-pavilion/v002/${e}`),document.baseURI);async function m(e){let t=await fetch(p(e),{signal:s.signal});if(!t.ok)throw Error(`music-asset-request-failed`);return t}async function h(e,t=!0){let r=await(await m(e)).blob(),i=await createImageBitmap(r,{imageOrientation:`flipY`,premultiplyAlpha:`none`});if(n)throw i.close(),Error(`music-load-cancelled`);u.push(i);let a=new q(i);return a.colorSpace=t?nt:``,a.needsUpdate=!0,a.anisotropy=4,l.push(a),a}function g(e){let t=new Set,n=new Set,r=new Set;e.traverse(e=>{if(e instanceof Z){t.add(e.geometry);for(let t of Array.isArray(e.material)?e.material:[e.material]){n.add(t);for(let e of Object.values(t))e instanceof q&&r.add(e)}}}),t.forEach(e=>e.dispose()),n.forEach(e=>e.dispose()),r.forEach(e=>{e.source.data instanceof ImageBitmap&&!u.includes(e.source.data)&&e.source.data.close(),e.dispose()}),e.removeFromParent()}let _=null;async function v(e=`music-pavilion.glb`){let t=await(await m(e)).arrayBuffer();if(n)throw Error(`music-load-cancelled`);let r=await new Xn().parseAsync(t,new URL(`.`,p(e)).href);if(n)throw g(r.scene),Error(`music-load-cancelled`);e===`route-dune.glb`?(r.scene.position.set(...Fn.dune.position),r.scene.scale.set(...Fn.dune.scale),_=r.scene):r.scene.position.set(...Fn.origin),r.scene.traverse(e=>{e instanceof Z&&(e.castShadow=!0,e.receiveShadow=!0)}),c.add(r.scene)}let y,b=Promise.race([Promise.all([v(),v(`route-dune.glb`),h(`mural-original.png`),h(`mural-underlay-crop.png`),h(`ribbon-masks-crop.png`,!1)]).then(([,,e,t,r])=>{if(n)return;f.uOriginal.value=e,f.uRibbonMasks.value=r;let i=new fn({map:t,roughness:1,metalness:0});i.onBeforeCompile=e=>{Object.assign(e.uniforms,f),e.fragmentShader=`uniform sampler2D uOriginal;
uniform sampler2D uRibbonMasks;
uniform float uTime;
uniform float uColor;
uniform float uMovement;
`+e.fragmentShader,e.fragmentShader=e.fragmentShader.replace(`#include <map_fragment>`,`
          vec2 uv = vMapUv;
          vec4 fixedArt = texture2D(uOriginal, uv);
          float freeEnd = 1.0 - smoothstep(140.0/1448.0, 275.0/1448.0, uv.x);
          vec2 upperUv = uv - vec2(3.0*sin(uTime*1.55),20.0*sin(uTime*1.55+uv.x*4.0))*freeEnd*uMovement/vec2(1448.0,1086.0);
          vec2 lowerUv = uv - vec2(2.5*sin(uTime*1.31),17.0*sin(uTime*1.31+uv.x*5.0+.65))*freeEnd*uMovement/vec2(1448.0,1086.0);
          vec2 patchOrigin = vec2(48.0/1448.0,1.0-520.0/1086.0);
          vec2 patchSize = vec2(272.0/1448.0,460.0/1086.0);
          vec2 patchUv = (uv-patchOrigin)/patchSize;
          float inPatch = step(0.0,patchUv.x)*step(patchUv.x,1.0)*step(0.0,patchUv.y)*step(patchUv.y,1.0);
          vec4 localArt = mix(fixedArt,texture2D(map,patchUv),inPatch);
          localArt = mix(localArt,texture2D(uOriginal,upperUv),texture2D(uRibbonMasks,(upperUv-patchOrigin)/patchSize).r*inPatch);
          localArt = mix(localArt,texture2D(uOriginal,lowerUv),texture2D(uRibbonMasks,(lowerUv-patchOrigin)/patchSize).g*inPatch);
          vec4 art = mix(fixedArt,localArt,uMovement);
          float luminance = dot(art.rgb,vec3(.2126,.7152,.0722));
          vec3 muted = vec3(luminance)*vec3(1.04,1.0,.91);
          diffuseColor *= vec4(mix(muted,art.rgb,uColor),art.a);
        `)},i.customProgramCacheKey=()=>`dunhuang-flying-local-ribbons-v002`,d=new Z(new et(Fn.mural.width,Fn.mural.height),i),d.name=`flying-original-art`,d.position.set(...Fn.mural.center),d.receiveShadow=!0,c.add(d)}),new Promise((e,t)=>{y=setTimeout(()=>t(Error(`music-loading-timeout`)),3e4)})]).then(()=>{clearTimeout(y)}).catch(e=>{throw S(),e});function x(e,t){o=t,r&&(i+=e,o&&(i=Math.max(i,ve)),i>=3.6&&(a=!0)),f.uColor.value=r?pe(i,o):0,f.uTime.value=i,f.uMovement.value=r&&!o?Et.smoothstep(i,.45,1.4):0}function S(){n||(n=!0,clearTimeout(y),s.abort(),g(c),l.forEach(e=>e.dispose()),u.forEach(e=>e.close()),l.length=0,u.length=0,c.clear())}return{ready:b,dispose:S,update:x,enter(){r=!0,i=0,x(0,o)},exit(){r=!1,i=0,x(0,o)},replay(){r=!0,i=0,x(0,o)},inspect:()=>({time:i,color:f.uColor.value,complete:r&&i>=3.6,awakened:a,active:r,reduced:o,movement:f.uMovement.value}),auditSight(e){return c.updateMatrixWorld(!0),[[36.8,3.1,-8.2],[46,3.1,-8.2],[55.2,3.1,-8.2],[38,8.9,-18],[46,8.9,-18],[54,8.9,-18],[46,10.7,-23],[38,10.2,-23],[54,10.2,-23]].map(t=>{let n=new X(...t),r=n.clone().project(e),i=e.position.distanceTo(n),a=new It(e.position,n.clone().sub(e.position).normalize(),0,i-.3),o=!!_&&a.intersectObject(_,!0).length>0;return{point:t,inFrame:Math.abs(r.x)<1&&Math.abs(r.y)<1&&r.z<1,blocked:o}})}}}var fs=e=>Math.atan2(Math.sin(e),Math.cos(e));function ps(){let e=0,t=null,n=0,r=0;return{reset(){t=null,n=0,r=0},manual(){r=1.5,t=null,n=0},vector(a,o,s,c){if(r=Math.max(0,r-c),Math.hypot(a,o)<.08)return t=null,n=0,{x:0,z:0};let l=Math.atan2(o,a);return(t===null||Math.abs(fs(l-t))>.22)&&(e=s,n=0,t=l),n+=c,i(a,o,e)},yaw(e,t,i,a,o){if(!i||n<.18||r>0)return e;let s=fs(t-e);return Math.abs(s)<.012?fs(t):o?e:fs(e+s*(1-Math.exp(-a*3.2)))}}}function ms(e,t){let n=!1,r=!1,i=!1,a=!1,o=!1,s=e?`loading`:`missing`,c=t,l=!1,u=0;function d(){return!n||!r||i||a||o?!1:(u++,o=!0,e?.pause(),!0)}let f=Tn(d),p=()=>n&&r&&!i&&!a&&!o;function m(){if(!e||a)return;if(e.volume=Math.max(0,Math.min(1,c.volume)),e.muted=!c.enabled,!p()){e.pause();return}if(s===`error`||s===`blocked`||l||!e.paused)return;let t=u;l=!0,e.play().then(()=>{p()||e.pause()}).catch(e=>{!a&&t===u&&p()&&(s=e instanceof DOMException&&e.name===`NotAllowedError`?`blocked`:`error`)}).finally(()=>{l=!1,!a&&t!==u&&p()&&m()})}function h(){!a&&s!==`blocked`&&(s=`ready`)}function g(){a||(s=`error`,e?.pause())}function _(){o=!0}return e&&(e.preload=`auto`,e.addEventListener(`canplay`,h),e.addEventListener(`error`,g),e.addEventListener(`ended`,_)),{skip:d,enter(){a||(u++,n=!0,r=!1,o=!1,e&&(e.pause(),e.currentTime=0))},update(e){r=e,m()},setBlocked(e){e&&!i&&u++,i=e,m()},setPreferences(e){c=e,m()},retry(){e&&!a&&(u++,o=!1,s===`error`?(s=`loading`,e.load()):s===`blocked`&&(s=`ready`),e.currentTime=0,m())},exit(){u++,n=!1,r=!1,o=!1,e&&(e.pause(),e.currentTime=0)},inspect(){return{status:s,active:n,ended:o,playing:!!e&&p()&&!e.paused&&e.readyState>=2&&!e.muted&&e.volume>0&&s===`ready`,currentTime:e?.currentTime??0,duration:e&&Number.isFinite(e.duration)?e.duration:0}},dispose(){a||(a=!0,n=!1,u++,f(),e&&(e.pause(),e.removeEventListener(`canplay`,h),e.removeEventListener(`error`,g),e.removeEventListener(`ended`,_),e.removeAttribute(`src`),e.load()))}}}function hs(){return{shelters:[[10,17.1,-16,-10]],landmarkFraming:{bounds:[0,29,-10,14],targetLift:.85},boxes:[...ne.filter(e=>!e.circle).map(e=>new Yt(new X(e.minX,-.2,e.minZ),new X(e.maxX,e.height,e.maxZ))),...[...Wt,...le.cameraBoxes].map(e=>new Yt(new X(...e.min),new X(...e.max)))].map(e=>e.expandByScalar(tn)),cylinders:ne.flatMap(e=>e.circle?[{...e.circle,id:e.id??`music-prop`,minY:-.2,maxY:e.height}]:[])}}function gs(e){let t=Math.max(12.8,8.4/(2*Math.tan(Et.degToRad(49/2))*e)),[n,r,i]=le.mural.center;return{position:new X(n,r+.45,i+t),target:new X(n,r-.9,i)}}function _s(e,t){let n=!1,r=!1,i=0,a=t,o=!1,s=new AbortController,c=new K;c.name=`music-pavilion-v001`,e.add(c);let l=[],u=[],d=null,f={uOriginal:{value:null},uRibbonMasks:{value:null},uTime:{value:0},uColor:{value:+!!t},uMovement:{value:0}},p=e=>new URL(Nt(`music-pavilion/v001/${e}`),document.baseURI);async function m(e){let t=await fetch(p(e),{signal:s.signal});if(!t.ok)throw Error(`music-asset-request-failed`);return t}async function h(e,t=!0){let r=await(await m(e)).blob(),i=await createImageBitmap(r,{imageOrientation:`flipY`,premultiplyAlpha:`none`});if(n)throw i.close(),Error(`music-load-cancelled`);u.push(i);let a=new q(i);return a.colorSpace=t?nt:``,a.needsUpdate=!0,a.anisotropy=4,l.push(a),a}function g(e){let t=new Set,n=new Set,r=new Set;e.traverse(e=>{if(e instanceof Z){t.add(e.geometry);for(let t of Array.isArray(e.material)?e.material:[e.material]){n.add(t);for(let e of Object.values(t))e instanceof q&&r.add(e)}}}),t.forEach(e=>e.dispose()),n.forEach(e=>e.dispose()),r.forEach(e=>{e.source.data instanceof ImageBitmap&&!u.includes(e.source.data)&&e.source.data.close(),e.dispose()}),e.removeFromParent()}async function _(){let e=await(await m(`music-pavilion.glb`)).arrayBuffer();if(n)throw Error(`music-load-cancelled`);let t=await new Xn().parseAsync(e,new URL(`.`,p(`music-pavilion.glb`)).href);if(n)throw g(t.scene),Error(`music-load-cancelled`);t.scene.position.set(...le.origin),t.scene.traverse(e=>{e instanceof Z&&(e.castShadow=!0,e.receiveShadow=!0)}),c.add(t.scene)}let v,y=Promise.race([Promise.all([_(),h(`mural-original.png`),h(`mural-underlay-crop.png`),h(`ribbon-masks-crop.png`,!1)]).then(([,e,t,r])=>{if(n)return;f.uOriginal.value=e,f.uRibbonMasks.value=r;let i=new fn({map:t,roughness:1,metalness:0});i.onBeforeCompile=e=>{Object.assign(e.uniforms,f),e.fragmentShader=`uniform sampler2D uOriginal;
uniform sampler2D uRibbonMasks;
uniform float uTime;
uniform float uColor;
uniform float uMovement;
`+e.fragmentShader,e.fragmentShader=e.fragmentShader.replace(`#include <map_fragment>`,`
          vec2 uv = vMapUv;
          vec4 fixedArt = texture2D(uOriginal, uv);
          float freeEnd = 1.0 - smoothstep(160.0/1448.0, 275.0/1448.0, uv.x);
          vec2 upperUv = uv - vec2(0.25*sin(uTime*1.15),2.2*sin(uTime*1.15))*freeEnd*uMovement/vec2(1448.0,1086.0);
          vec2 lowerUv = uv - vec2(0.20*sin(uTime*.93),1.8*sin(uTime*.93))*freeEnd*uMovement/vec2(1448.0,1086.0);
          vec2 patchOrigin = vec2(60.0/1448.0,1.0-491.0/1086.0);
          vec2 patchSize = vec2(234.0/1448.0,406.0/1086.0);
          vec2 patchUv = (uv-patchOrigin)/patchSize;
          float inPatch = step(0.0,patchUv.x)*step(patchUv.x,1.0)*step(0.0,patchUv.y)*step(patchUv.y,1.0);
          vec4 localArt = mix(fixedArt,texture2D(map,patchUv),inPatch);
          localArt = mix(localArt,texture2D(uOriginal,upperUv),texture2D(uRibbonMasks,(upperUv-patchOrigin)/patchSize).r*inPatch);
          localArt = mix(localArt,texture2D(uOriginal,lowerUv),texture2D(uRibbonMasks,(lowerUv-patchOrigin)/patchSize).g*inPatch);
          vec4 art = mix(fixedArt,localArt,uMovement);
          float luminance = dot(art.rgb,vec3(.2126,.7152,.0722));
          vec3 muted = vec3(luminance)*vec3(1.04,1.0,.91);
          diffuseColor *= vec4(mix(muted,art.rgb,uColor),art.a);
        `)},i.customProgramCacheKey=()=>`dunhuang-flying-local-ribbons-v001`,d=new Z(new et(le.mural.width,le.mural.height),i),d.name=`flying-original-art`,d.position.set(...le.mural.center),d.receiveShadow=!0,c.add(d)}),new Promise((e,t)=>{v=setTimeout(()=>t(Error(`music-loading-timeout`)),3e4)})]).then(()=>{clearTimeout(v)}).catch(e=>{throw x(),e});function b(e,t){o=t,r&&(i+=e,o&&(i=Math.max(i,ve)),i>=3.6&&(a=!0)),f.uColor.value=r?pe(i,o):+!!a,f.uTime.value=i,f.uMovement.value=r&&!o?Et.smoothstep(i,1.8,3.6):0}function x(){n||(n=!0,clearTimeout(v),s.abort(),g(c),l.forEach(e=>e.dispose()),u.forEach(e=>e.close()),l.length=0,u.length=0,c.clear())}return{ready:y,dispose:x,update:b,enter(){r=!0,i=0,b(0,o)},exit(){r=!1,b(0,o)},replay(){r=!0,i=0,b(0,o)},inspect:()=>({time:i,color:f.uColor.value,complete:r&&i>=3.6,awakened:a})}}function vs(e,t){return Math.abs(e-122)>14.5?0:Et.smoothstep(-68-t,2,9)}function ys(e){return .004+.48*Et.clamp(e,0,1)}function bs(e=!1,t=vs){let n=new Map,r=new Map,i=0;function a(t,r){t.traverse(t=>{if(t instanceof Z){for(let i of Array.isArray(t.material)?t.material:[t.material])if(i instanceof fn){let t=i.color.clone();e&&r===n&&(/^(deer|novice)$/.test(i.name)?t.multiplyScalar(.53):i.name===`border`?t.multiplyScalar(.32):i.name===`contact-stone`&&t.multiply(new Y(.6,.57,.5))),r.set(i,t),r===n&&(i.metalness=0,i.roughness=Math.max(.9,i.roughness),i.emissive.set(0),i.envMapIntensity=0)}}})}return{addCave:e=>a(e,n),addTraveler:e=>a(e,r),update(e,a,o){let s=t(e.x,e.z);i=o?s:Et.lerp(i,s,1-Math.exp(-a*1.25));for(let[e,t]of n)e.color.copy(t).multiplyScalar(ys(i));for(let[e,t]of r)e.color.copy(t).multiplyScalar(1-.82*s)},inspect:()=>({adaptation:i,gain:ys(i),caveMaterials:n.size})}}function xs(e,t){let n=O.origin[2]-t,r=n<O.room.front?me.passage.halfWidth:O.room.width/2;return Math.abs(e-O.origin[0])>r||n>O.room.front+O.room.depth?0:Et.smoothstep(n,me.passage.front,O.room.front+2)}function Ss(e,t,n){let r={uTime:{value:0},uAmount:{value:0}},i=new dt({uniforms:r,transparent:!0,depthWrite:!1,toneMapped:!1,vertexShader:`varying vec2 vUv;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
        #include <logdepthbuf_vertex>
      }`,fragmentShader:`
      varying vec2 vUv; uniform float uTime; uniform float uAmount;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){
        #include <logdepthbuf_fragment>
        vec2 p=vUv*vec2(4.6,5.8)-vec2(uTime*.12,uTime*.28);
        float n=noise(p)*.58+noise(p*2.1+vec2(uTime*.08,0))*.28+noise(p*4.2)*.14;
        float curl=sin(vUv.y*19.-vUv.x*6.+n*7.-uTime*1.2)*.5+.5;
        float edge=smoothstep(0.,.13,vUv.x)*smoothstep(0.,.13,1.-vUv.x)*smoothstep(0.,.13,vUv.y)*smoothstep(0.,.13,1.-vUv.y);
        float alpha=edge*uAmount*smoothstep(.22,.79,n)*(.50+curl*.5);
        gl_FragColor=vec4(mix(vec3(.84,.81,.72),vec3(1.,.96,.86),n),alpha);
      }`}),a=new Z(new et(t*1.04,n*1.04),i);return a.name=`mural-awakening-mist`,a.position.set(e[0],e[1],e[2]+.09),a.renderOrder=3,a.visible=!1,{mesh:a,update(e,t,n,i){let o=Math.max(0,Math.min(1,e/t));r.uTime.value=e,r.uAmount.value=n&&!i?Math.sin(Math.PI*o)**.65*.83:0,a.visible=r.uAmount.value>.001},inspect:()=>({visible:a.visible,opacity:r.uAmount.value})}}function Cs(e,t){let n=!1,r=!1,i=0,a=t,o=!1,s=new AbortController,c=new K;c.name=`music-pavilion-v005`,e.add(c);let l=Ss(M.mural.center,M.mural.width,M.mural.height);c.add(l.mesh);let u=[],d=[],f=null,p={uOriginal:{value:null},uRibbonMasks:{value:null},uTime:{value:0},uColor:{value:0},uMovement:{value:0}},m=e=>new URL(Nt(`music-pavilion/${e===`music-pavilion.glb`?`v005`:`v002`}/${e}`),document.baseURI);async function h(e){let t=await fetch(m(e),{signal:s.signal});if(!t.ok)throw Error(`music-asset-request-failed`);return t}async function g(e,t=!0){let r=await(await h(e)).blob(),i=await createImageBitmap(r,{imageOrientation:`flipY`,premultiplyAlpha:`none`});if(n)throw i.close(),Error(`music-load-cancelled`);d.push(i);let a=new q(i);return a.colorSpace=t?nt:``,a.needsUpdate=!0,a.anisotropy=4,u.push(a),a}function _(e){let t=new Set,n=new Set,r=new Set;e.traverse(e=>{if(e instanceof Z){t.add(e.geometry);for(let t of Array.isArray(e.material)?e.material:[e.material]){n.add(t);for(let e of Object.values(t))e instanceof q&&r.add(e)}}}),t.forEach(e=>e.dispose()),n.forEach(e=>e.dispose()),r.forEach(e=>{e.source.data instanceof ImageBitmap&&!d.includes(e.source.data)&&e.source.data.close(),e.dispose()}),e.removeFromParent()}let v=null;async function y(e=`music-pavilion.glb`){let t=await(await h(e)).arrayBuffer();if(n)throw Error(`music-load-cancelled`);let r=await new Xn().parseAsync(t,new URL(`.`,m(e)).href);if(n)throw _(r.scene),Error(`music-load-cancelled`);e===`route-dune.glb`?(r.scene.position.set(...M.dune.position),r.scene.scale.set(...M.dune.scale),v=r.scene):r.scene.position.set(...M.origin),r.scene.traverse(e=>{e instanceof Z&&(e.castShadow=!0,e.receiveShadow=!0)}),c.add(r.scene)}let b,x=Promise.race([Promise.all([y(),y(`route-dune.glb`),g(`mural-original.png`),g(`mural-underlay-crop.png`),g(`ribbon-masks-crop.png`,!1)]).then(([,,e,t,r])=>{if(n)return;p.uOriginal.value=e,p.uRibbonMasks.value=r;let i=new fn({map:t,roughness:1,metalness:0});i.onBeforeCompile=e=>{Object.assign(e.uniforms,p),e.fragmentShader=`uniform sampler2D uOriginal;
uniform sampler2D uRibbonMasks;
uniform float uTime;
uniform float uColor;
uniform float uMovement;
`+e.fragmentShader,e.fragmentShader=e.fragmentShader.replace(`#include <map_fragment>`,`
          vec2 uv = vMapUv;
          vec4 fixedArt = texture2D(uOriginal, uv);
          float freeEnd = 1.0 - smoothstep(140.0/1448.0, 275.0/1448.0, uv.x);
          vec2 upperUv = uv - vec2(3.0*sin(uTime*1.55),20.0*sin(uTime*1.55+uv.x*4.0))*freeEnd*uMovement/vec2(1448.0,1086.0);
          vec2 lowerUv = uv - vec2(2.5*sin(uTime*1.31),17.0*sin(uTime*1.31+uv.x*5.0+.65))*freeEnd*uMovement/vec2(1448.0,1086.0);
          vec2 patchOrigin = vec2(48.0/1448.0,1.0-520.0/1086.0);
          vec2 patchSize = vec2(272.0/1448.0,460.0/1086.0);
          vec2 patchUv = (uv-patchOrigin)/patchSize;
          float inPatch = step(0.0,patchUv.x)*step(patchUv.x,1.0)*step(0.0,patchUv.y)*step(patchUv.y,1.0);
          vec4 localArt = mix(fixedArt,texture2D(map,patchUv),inPatch);
          localArt = mix(localArt,texture2D(uOriginal,upperUv),texture2D(uRibbonMasks,(upperUv-patchOrigin)/patchSize).r*inPatch);
          localArt = mix(localArt,texture2D(uOriginal,lowerUv),texture2D(uRibbonMasks,(lowerUv-patchOrigin)/patchSize).g*inPatch);
          vec4 art = mix(fixedArt,localArt,uMovement);
          float luminance = dot(art.rgb,vec3(.2126,.7152,.0722));
          vec3 muted = vec3(luminance)*vec3(1.04,1.0,.91);
          diffuseColor *= vec4(mix(muted,art.rgb,uColor),art.a);
        `)},i.customProgramCacheKey=()=>`dunhuang-flying-local-ribbons-v005`,f=new Z(new et(M.mural.width,M.mural.height),i),f.name=`flying-original-art`,f.position.set(...M.mural.center),f.receiveShadow=!0,c.add(f)}),new Promise((e,t)=>{b=setTimeout(()=>t(Error(`music-loading-timeout`)),3e4)})]).then(()=>{clearTimeout(b)}).catch(e=>{throw C(),e});function S(e,t){o=t,r&&(i+=e,o&&(i=Math.max(i,ve)),i>=3.6&&(a=!0)),l.update(i,ve,r,o),p.uColor.value=r?pe(i,o):0,p.uTime.value=i,p.uMovement.value=r&&!o?Et.smoothstep(i,.45,1.4):0}function C(){n||(n=!0,clearTimeout(b),s.abort(),_(c),u.forEach(e=>e.dispose()),d.forEach(e=>e.close()),u.length=0,d.length=0,c.clear())}return{ready:x,dispose:C,update:S,enter(){r=!0,i=0,S(0,o)},exit(){r=!1,i=0,S(0,o)},replay(){r=!0,i=0,S(0,o)},inspect:()=>({time:i,color:p.uColor.value,complete:r&&i>=3.6,awakened:a,active:r,reduced:o,mist:l.inspect(),movement:p.uMovement.value}),auditSight(e){return c.updateMatrixWorld(!0),[[24,4.7,3],[46,4.7,3],[70,4.7,3],[34.4,14.2,-18],[46,14.2,-18],[57.6,14.2,-18],[46,16.8,-23],[34.4,16,-23],[57.6,16,-23]].map(t=>{let n=new X(...t),r=n.clone().project(e),i=e.position.distanceTo(n),a=new It(e.position,n.clone().sub(e.position).normalize(),0,i-.3),o=!!v&&a.intersectObject(v,!0).length>0;return{point:t,inFrame:Math.abs(r.x)<1&&Math.abs(r.y)<1&&r.z<1,blocked:o}})}}}var ws=Et.degToRad(250),Ts=Et.degToRad(30),Es=new X(Math.sin(ws)*Math.cos(Ts),Math.sin(Ts),-Math.cos(ws)*Math.cos(Ts)),Ds=27,Os=28,ks=29,As=[[`courtyard`,45],[`music`,55],[`cliff`,90]],js=`environment-static-sun-v001`,Ms=`
varying vec3 vEnvironmentShadowPosition;
varying vec3 vEnvironmentShadowNormal;
`,Ns=`
varying vec3 vEnvironmentShadowPosition;
varying vec3 vEnvironmentShadowNormal;
uniform vec3 uEnvironmentSunDirection;
#if defined(USE_SHADOWMAP) && defined(SHADOWMAP_TYPE_PCF)
uniform sampler2DShadow uEnvironmentShadow0;
uniform sampler2DShadow uEnvironmentShadow1;
uniform sampler2DShadow uEnvironmentShadow2;
uniform sampler2DShadow uEnvironmentShadow3;
uniform mat4 uEnvironmentShadowMatrix0;
uniform mat4 uEnvironmentShadowMatrix1;
uniform mat4 uEnvironmentShadowMatrix2;
uniform mat4 uEnvironmentShadowMatrix3;
// inverse resolution, depth bias, world normal bias, filter radius in texels
uniform vec4 uEnvironmentShadowParameters0;
uniform vec4 uEnvironmentShadowParameters1;
uniform vec4 uEnvironmentShadowParameters2;
uniform vec4 uEnvironmentShadowParameters3;
vec3 environmentShadowCoord(mat4 matrix,vec4 parameters) {
  vec4 q=matrix*vec4(vEnvironmentShadowPosition+normalize(vEnvironmentShadowNormal)*parameters.z,1.0);
  q.xyz/=q.w;
  #ifdef USE_REVERSED_DEPTH_BUFFER
    q.z-=parameters.y;
  #else
    q.z+=parameters.y;
  #endif
  return q.xyz;
}
float environmentTileWeight(vec3 q,float fade) {
  float edge=min(min(q.x,1.0-q.x),min(q.y,1.0-q.y));
  return smoothstep(0.0,fade,edge)*step(0.0,q.z)*step(q.z,1.0);
}
vec2 environmentDepthGradient(vec3 q) {
  vec3 dx=dFdx(q),dy=dFdy(q);
  float determinant=dx.x*dy.y-dx.y*dy.x;
  if(abs(determinant)<1e-16)return vec2(0.0);
  return vec2(dy.y*dx.z-dx.y*dy.z,dx.x*dy.z-dy.x*dx.z)/determinant;
}
float environmentCompareShadow(sampler2DShadow map,vec3 q,vec4 parameters,vec2 gradient) {
  // A fixed PCF footprint: no screen-space noise that changes when the camera turns.
  // Correct each tap for the receiver plane's depth slope. A 30-degree sun makes
  // even flat sand steep in light space; a constant tiny bias alone creates bands.
  float footprintBias=dot(abs(gradient),vec2(parameters.x*.55));
  #ifdef USE_REVERSED_DEPTH_BUFFER
    q.z+=footprintBias;
  #else
    q.z-=footprintBias;
  #endif
  vec2 d=vec2(parameters.x*parameters.w*.5);
  vec2 a=vec2(-d.x,-d.y),b=vec2(d.x,-d.y),c=vec2(-d.x,d.y),e=vec2(d.x,d.y);
  return .25*(texture(map,vec3(q.xy+a,q.z+dot(gradient,a)))
    +texture(map,vec3(q.xy+b,q.z+dot(gradient,b)))
    +texture(map,vec3(q.xy+c,q.z+dot(gradient,c)))
    +texture(map,vec3(q.xy+e,q.z+dot(gradient,e))));
}
float environmentStaticShadow() {
  vec3 q0=environmentShadowCoord(uEnvironmentShadowMatrix0,uEnvironmentShadowParameters0);
  vec3 q1=environmentShadowCoord(uEnvironmentShadowMatrix1,uEnvironmentShadowParameters1);
  vec3 q2=environmentShadowCoord(uEnvironmentShadowMatrix2,uEnvironmentShadowParameters2);
  vec3 q3=environmentShadowCoord(uEnvironmentShadowMatrix3,uEnvironmentShadowParameters3);
  // Evaluate derivatives before spatially varying tile branches.
  vec2 g0=environmentDepthGradient(q0),g1=environmentDepthGradient(q1),g2=environmentDepthGradient(q2),g3=environmentDepthGradient(q3);
  vec3 weights=vec3(environmentTileWeight(q1,.13),environmentTileWeight(q2,.13),environmentTileWeight(q3,.13));
  float total=weights.x+weights.y+weights.z;
  float base=1.0;
  if(total<.999)base=mix(1.0,environmentCompareShadow(uEnvironmentShadow0,q0,uEnvironmentShadowParameters0,g0),environmentTileWeight(q0,.025));
  float detail=0.0;
  if(weights.x>.0001)detail+=weights.x*environmentCompareShadow(uEnvironmentShadow1,q1,uEnvironmentShadowParameters1,g1);
  if(weights.y>.0001)detail+=weights.y*environmentCompareShadow(uEnvironmentShadow2,q2,uEnvironmentShadowParameters2,g2);
  if(weights.z>.0001)detail+=weights.z*environmentCompareShadow(uEnvironmentShadow3,q3,uEnvironmentShadowParameters3,g3);
  return (base*max(0.0,1.0-total)+detail)/max(1.0,total);
}
#endif
`;function Ps(e,t){let n=`#include <shadowmap_vertex>`,r=`#include <lights_fragment_begin>`;if(!e.includes(n)||!t.includes(r))throw Error(`environment-shadow-shader-anchor-missing`);let i=Q.lights_fragment_begin.replace(`getDirectionalLightInfo( directionalLight, directLight );`,`getDirectionalLightInfo( directionalLight, directLight );
    #if defined(USE_SHADOWMAP) && defined(SHADOWMAP_TYPE_PCF)
    if(receiveShadow && dot(directionalLight.direction,transformDirection(uEnvironmentSunDirection,viewMatrix))>.99999)
      directLight.color*=environmentStaticShadow();
    #endif`);return{vertex:Ms+e.replace(n,`${n}\n vEnvironmentShadowPosition=worldPosition.xyz;\n vEnvironmentShadowNormal=transformNormalByInverseViewMatrix(transformedNormal,viewMatrix);`),fragment:Ns+t.replace(r,i)}}function Fs(e,t,n){let r=new jt(e,e,Jt);r.format=Ft,r.compareFunction=n?518:515,r.minFilter=r.magFilter=en,r.name=`${t}-depth`;let i=new Ot(e,e,{format:R,type:Gt,minFilter:Fe,magFilter:Fe,generateMipmaps:!1,depthTexture:r});return i.texture.name=`${t}-unused-r8`,i}function Is(e){e&&(e.depthTexture?.dispose(),e.depthTexture=null,e.dispose())}function Ls(e){return[0,1,2,3,4,5,6,7].map(t=>new X(t&1?e.max.x:e.min.x,t&2?e.max.y:e.min.y,t&4?e.max.z:e.min.z))}function Rs(e,t){let n=e.children.find(e=>e instanceof Ue);if(!n)throw Error(`environment-sun-missing`);let r=n,i=e.children.find(e=>e instanceof Le),a={position:r.position.clone(),target:r.target.position.clone(),intensity:r.intensity,layers:r.layers.mask,autoUpdate:r.shadow.autoUpdate,shadowLayers:r.shadow.camera.layers.mask,normalBias:r.shadow.normalBias,bias:r.shadow.bias,mapSize:r.shadow.mapSize.clone(),radius:r.shadow.radius,camera:r.shadow.camera.clone(),castShadow:r.castShadow},o=i?.intensity,s=e.onBeforeRender,c=[],l=[],u=[],d=new Map,f=new Map,p=new K;p.name=`environment-traveler-shadow-only`;let m=`pending`,h=!1,g=!1,_=null,v=0,y=0,b=1024,x=null,S=null,C=new X;t.getWorldPosition(C),r.intensity=2.4,i&&(i.intensity=.95),r.castShadow=!0,r.shadow.autoUpdate=!1,r.shadow.needsUpdate=!1,r.position.copy(r.target.position).addScaledVector(Es,100);function w(){if(!h&&u.length){t.updateWorldMatrix(!0,!0);for(let{source:e,proxy:n}of u){n.matrix.copy(e.matrixWorld),n.matrixWorldNeedsUpdate=!0,n.visible=!0;for(let r=e;r&&r!==t;r=r.parent)if(!r.visible){n.visible=!1;break}e.morphTargetInfluences&&n.morphTargetInfluences&&n.morphTargetInfluences.splice(0,n.morphTargetInfluences.length,...e.morphTargetInfluences),n.updateMatrixWorld(!0)}}}let T=(...t)=>{s.apply(e,t),w()};function E(){let n=new Set;t.traverse(e=>n.add(e)),e.traverse(e=>{if(e instanceof Z&&(d.set(e,e.layers.mask),e.layers.disable(Ds),e.layers.disable(Os),!n.has(e)&&e.castShadow&&(e.layers.enable(Ds),y++),e.name===`continuous-sand-heightfield`))for(let t of Array.isArray(e.material)?e.material:[e.material])f.set(t,t.shadowSide),t.shadowSide=2}),t.traverse(e=>{if(!(e instanceof Z)||!e.castShadow)return;let t=e.clone(!1);t.name=`shadow-only-${e.name}`,t.layers.set(Os),t.matrixAutoUpdate=!1,t.frustumCulled=!1,t.castShadow=!0,t.receiveShadow=!1,p.add(t),u.push({source:e,proxy:t})}),e.add(p),w()}function O(){let t=e.userData.environmentShadowBounds;if(t instanceof Yt)return t.clone();let n=new Yt(new X(Se.minX-100,-15,Se.minZ-100),new X(Se.maxX+100,150,Se.maxZ+100)),r=new Yt;return e.traverseVisible(e=>{e instanceof Z&&e.layers.isEnabled(Ds)&&e.name!==`continuous-sand-heightfield`&&(e.geometry.boundingBox||e.geometry.computeBoundingBox(),e.geometry.boundingBox&&(r.copy(e.geometry.boundingBox).applyMatrix4(e.matrixWorld),n.union(r)))}),n}function ee(e,t,n,i){let a=Ls(n).map(t=>t.sub(e).dot(Es)),o=Math.max(...a),s=Math.min(...a);r.target.position.copy(e),r.position.copy(e).addScaledVector(Es,o+30);let c=r.shadow.camera;Object.assign(c,{left:-t.x,right:t.x,top:t.y,bottom:-t.y,near:1,far:o-s+60}),c.updateProjectionMatrix(),c.layers.set(Ds),r.shadow.mapSize.set(i,i),r.shadow.normalBias=0,r.shadow.bias=0,r.shadow.needsUpdate=!0,r.updateMatrixWorld(!0),r.target.updateMatrixWorld(!0)}function k(){let t=new Set;e.traverse(e=>{if(e instanceof Z)for(let n of Array.isArray(e.material)?e.material:[e.material])n instanceof fn&&t.add(n)});for(let e of t){let t=e.onBeforeCompile,n=e.customProgramCacheKey,r=e.customProgramCacheKey(),i=function(e,n){t.call(this,e,n),e.uniforms.uEnvironmentSunDirection={value:Es};for(let[t,n]of c.entries())e.uniforms[`uEnvironmentShadow${t}`]={value:n.target.depthTexture},e.uniforms[`uEnvironmentShadowMatrix${t}`]={value:n.matrix},e.uniforms[`uEnvironmentShadowParameters${t}`]={value:n.parameters};let r=Ps(e.vertexShader,e.fragmentShader);e.vertexShader=r.vertex,e.fragmentShader=r.fragment};e.onBeforeCompile=i,e.customProgramCacheKey=()=>`${r}|${js}`,e.needsUpdate=!0,l.push({material:e,before:t,key:n,installed:i})}}function A(e){C.copy(e),g&&!h&&(mr(r,C,{extent:7,offset:Es.clone().multiplyScalar(30),near:1,far:65,bias:-16e-5,normalBias:.018}),r.shadow.camera.layers.set(Os),r.shadow.needsUpdate=!0,w())}async function te(t,n){if(h)throw Error(`environment-lighting-disposed`);return _||(_=(async()=>{if(m=`preparing`,t.shadowMap.type!==1)throw Error(`environment-lighting-requires-pcf`);E(),e.updateMatrixWorld(!0);let n=O(),i=n.getCenter(new X),o=new ln().lookAt(Es,new X,new X(0,1,0)),s=new X().setFromMatrixColumn(o,0),l=new X().setFromMatrixColumn(o,1),u=Ls(n).map(e=>e.sub(i)),d=[{id:`world`,focus:i,extent:new an(Math.max(...u.map(e=>Math.abs(e.dot(s))))+8,Math.max(...u.map(e=>Math.abs(e.dot(l))))+8),size:2048},...As.map(([e,t])=>({id:e,focus:new X(D[e].target.x,D[e].target.y,D[e].target.z),extent:new an(t,t),size:1024}))],f=t.capabilities.maxTextureSize;b=Math.min(1024,f);let p=new Pt(-1,1,1,-1,.1,2);p.layers.set(ks);let _=new Ot(1,1,{depthBuffer:!1,stencilBuffer:!1}),y=t.getRenderTarget(),w=t.getActiveCubeFace(),te=t.getActiveMipmapLevel(),j=t.getViewport(new Ct),M=t.getScissor(new Ct),ne=t.getScissorTest(),re=e.background,N=t.shadowMap.autoUpdate,ie=t.shadowMap.enabled,ae=t.capabilities.reversedDepthBuffer;Is(r.shadow.map),r.shadow.map=null;try{e.background=null,r.layers.enable(ks),t.shadowMap.enabled=!0,t.shadowMap.autoUpdate=!0;for(let i of d){if(h)throw Error(`environment-lighting-disposed`);let a=Math.min(i.size,f),o=Fs(a,`environment-static-${i.id}`,ae);if(S=o,ee(i.focus,i.extent,n,a),r.shadow.map=o,t.setRenderTarget(_),t.render(e,p),r.shadow.map!==o)throw Error(`environment-shadow-target-replaced`);let s=r.shadow.camera.far-r.shadow.camera.near,l=Math.max(i.extent.x,i.extent.y)*2/a,u=i.id===`world`?Math.max(.035,l*.22):Math.max(.014,l*.045);c.push({id:i.id,target:o,matrix:r.shadow.matrix.clone(),extent:i.extent.clone(),depthRange:s,parameters:new Ct(1/a,-u/s,Math.max(.022,l*.28),1.1)}),v++,r.shadow.map=null,S=null,await new Promise(e=>setTimeout(e,0))}}finally{r.layers.mask=a.layers,e.background=re,t.shadowMap.autoUpdate=N,t.shadowMap.enabled=ie,t.getContext().isContextLost()||(t.setRenderTarget(y,w,te),t.setViewport(j),t.setScissor(M),t.setScissorTest(ne)),_.dispose()}if(h)throw Error(`environment-lighting-disposed`);x=Fs(b,`environment-dynamic-traveler`,ae),r.shadow.map=x,r.shadow.mapSize.set(b,b),r.shadow.autoUpdate=!0,r.shadow.radius=1.25,k(),e.onBeforeRender=T,g=!0,m=`ready`,A(C)})().catch(e=>{throw h||(m=`failed`),Is(S),S=null,e}),_)}return{prepare:te,updateTraveler:A,inspect(){return{status:m,sunDirection:Es.toArray(),sunElevationDegrees:30,sunAzimuthDegrees:250,hemisphereIntensity:i?.intensity??0,staticPasses:v,staticCasters:y,materials:l.length,avatarProxyMeshes:u.length,dynamicResolution:b,estimatedTargetBytes:c.reduce((e,t)=>e+t.target.width*t.target.height*5,0)+(x?b**2*5:0),tiles:c.map(e=>({id:e.id,resolution:e.target.width,extent:e.extent.toArray(),depthRange:e.depthRange,matrix:e.matrix.toArray()}))}},dispose(){if(!h){h=!0,m=`disposed`,e.onBeforeRender===T&&(e.onBeforeRender=s);for(let{material:e,before:t,key:n,installed:r}of l)e.onBeforeCompile===r&&(e.onBeforeCompile=t,e.customProgramCacheKey=n,e.needsUpdate=!0);for(let[e,t]of d)e.layers.mask=t;for(let[e,t]of f)e.shadowSide=t;p.removeFromParent(),p.clear(),u.length=0,r.shadow.map&&r.shadow.map!==x&&r.shadow.map!==S&&!c.some(e=>e.target===r.shadow.map)&&Is(r.shadow.map);for(let e of c)Is(e.target);c.length=0,Is(x),x=null,Is(S),S=null,r.shadow.map=null,r.castShadow=a.castShadow,r.shadow.autoUpdate=a.autoUpdate,r.shadow.camera.copy(a.camera),r.shadow.camera.layers.mask=a.shadowLayers,r.shadow.mapSize.copy(a.mapSize),r.shadow.normalBias=a.normalBias,r.shadow.bias=a.bias,r.shadow.radius=a.radius,r.position.copy(a.position),r.target.position.copy(a.target),r.intensity=a.intensity,r.layers.mask=a.layers,i&&o!==void 0&&(i.intensity=o)}}}}var zs={dark:`#84664a`,light:`#bca17e`,roughness:.94},Bs=`
varying vec3 vTerrainRockWorld;
uniform vec3 uTerrainRockDark;
uniform vec3 uTerrainRockLight;
float terrainRockHash(vec2 p) {
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}
float terrainRockNoise(vec2 p) {
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(terrainRockHash(i),terrainRockHash(i+vec2(1,0)),f.x),
             mix(terrainRockHash(i+vec2(0,1)),terrainRockHash(i+vec2(1,1)),f.x),f.y);
}
`,Vs=`
// Metre-scale fields are continuous across material slots and separate faces.
// Their intensity is deliberately small: real facets and the fixed sun supply
// the strong light/dark contrast, not painted black stripes or fake shadows.
vec3 rockP=vTerrainRockWorld;
float rockMass=terrainRockNoise(rockP.xz*.095+vec2(17.0,29.0));
float rockWarp=.30*(terrainRockNoise(rockP.xz*.055)-.5)
              +.10*(terrainRockNoise(rockP.xz*.16+11.0)-.5);
float rockStrata=terrainRockNoise(vec2(rockP.y*.68+rockWarp,23.7));
float rockFine=terrainRockNoise(vec2(rockP.y*2.3+rockWarp*.7,51.8));
float rockBlend=clamp(.50+(rockMass-.5)*.48+(rockStrata-.5)*.30+(rockFine-.5)*.07,.19,.81);
diffuseColor.rgb=mix(uTerrainRockDark,uTerrainRockLight,rockBlend);
`;function Hs(e){let t=new Map,n=[],r=new Set,i=new Y(zs.dark),a=new Y(zs.light),o=!1;function s(e){if(!(e instanceof fn)||!/^(sandstone-baked-|sand-foot$)/.test(e.name))return e;let n=t.get(e);if(n)return n;let r=e.clone();return r.name=`terrain-matched-${e.name}`,r.color.set(16777215),r.map=null,r.roughnessMap=null,r.metalnessMap=null,r.roughness=zs.roughness,r.metalness=0,r.aoMapIntensity=.35,r.normalScale.multiplyScalar(.42),r.onBeforeCompile=e=>{e.uniforms.uTerrainRockDark={value:i},e.uniforms.uTerrainRockLight={value:a},e.vertexShader=`varying vec3 vTerrainRockWorld;
`+e.vertexShader,e.vertexShader=e.vertexShader.replace(`#include <worldpos_vertex>`,`#include <worldpos_vertex>
vTerrainRockWorld=(modelMatrix*vec4(transformed,1.0)).xyz;`),e.fragmentShader=Bs+e.fragmentShader,e.fragmentShader=e.fragmentShader.replace(`#include <color_fragment>`,`#include <color_fragment>
`+Vs)},r.customProgramCacheKey=()=>`terrain-matched-sandstone-v001`,r.userData.terrainSandstone=!0,t.set(e,r),r}return e.traverse(e=>{if(typeof e.userData.geometryRevision==`string`&&r.add(e.userData.geometryRevision),!(e instanceof Z))return;let t=e.material,i=Array.isArray(t)?t.map(s):s(t);(Array.isArray(t)?i.some((e,n)=>e!==t[n]):i!==t)&&(n.push({mesh:e,original:t}),e.material=i)}),{inspect:()=>({version:`v001`,matchedMeshes:n.length,matchedMaterials:t.size,palette:{...zs},unchangedGeometry:!0,geometryRevisions:[...r],bakedLighting:!1,disposed:o}),dispose(){if(!o){o=!0;for(let{mesh:e,original:t}of n)e.material=t;for(let e of t.values())e.dispose()}}}}var Us={asset:`bactrian-caravan/v001/bactrian-camel.png`,imageWidth:1536,imageHeight:1024,alphaBounds:{left:28,top:18,right:1517,bottom:999},alphaTest:.5},Ws=[{id:`north-high-ridge`,points:[{x:100,z:-201},{x:111,z:-201.3},{x:124,z:-200.2},{x:138,z:-197.3}],spacing:[0,.18,.365,.57,.78,1],heights:[2.74,2.56,2.83,2.65,2.77,2.91],tones:[16777215,16115925,16183519,15326921,16313562,16777215]},{id:`north-low-ridge`,points:[{x:210,z:-198.5},{x:221,z:-196.8},{x:233,z:-193.6},{x:246,z:-190.7}],spacing:[0,.19,.39,.57,.79,1],heights:[2.65,2.81,2.52,2.74,2.61,2.87],tones:[16116443,16777215,15655370,16379354,15656659,16777215]},{id:`south-curving-ridge`,points:[{x:266,z:241.3},{x:281,z:240},{x:296,z:237.3},{x:312,z:236.8}],spacing:[0,.15,.32,.48,.65,.83,1],heights:[2.79,2.62,2.89,2.67,2.54,2.83,2.72],tones:[16777215,15721422,16313820,16777215,15458766,16247511,15984854]}],Gs=-.025,Ks=(e,t=0,n=1)=>Math.max(t,Math.min(n,e)),qs=(e,t,n)=>{let r=Ks((n-e)/(t-e));return r*r*(3-2*r)};function Js(e,t){let n=Se;return Math.hypot(Math.max(n.minX-e,e-n.maxX,0),Math.max(n.minZ-t,t-n.maxZ,0))}function Ys(e){return 237+2.2*Math.sin((e-205)*.032)}function Xs(e,t){let n=Js(e,t),r=k(e,t);if(n===0)return r;let i=(1-qs(40,75,Math.abs(e-205)))*(1-qs(20,55,Math.abs(t-237))),a=7+2*Math.sin(e*.003+t*.002)+1.5*Math.cos(t*.003-e*.001),o=qs(0,115,n)*(1-i),s=r+(a-r)*o,c=Math.sin(e*.012+.7)*32+Math.sin(t*.009-e*.004)*24,l=0;for(let[r,i,a,o]of[[190,110,52,0],[390,160,78,1.7],[650,220,105,3.2]]){let s=(Math.sin(e*.006+t*.004+o*1.7)*42+Math.sin(e*.003-t*.005+o*2.1)*24)*qs(80,200,n),u=(n-r-c*Math.sin(o+e*.003)-s)/i,d=.76+.15*Math.sin(e*.014+t*.004+o)+.09*Math.sin(t*.011-e*.005+o);l=Math.max(l,a*d*Math.exp(-u*u))}let u=Math.max(0,t-237),d=qs(255,310,t)*qs(-30+u*.1,90+u*.1,e)*(1-qs(375+u*.4,470+u*.4,e));l*=1-.97*d;let f=-190-16*Math.sin(e*.014),p=32*Math.exp(-(((t-f)/65)**2))*Math.exp(-(((e-95)/240)**2)),m=26*Math.exp(-(((e+135+12*Math.sin(t*.01))/70)**2))*Math.exp(-(((t-10)/260)**2)),h=t-Ys(e),g=33*Math.exp(-(Math.abs(h/(h<0?53:42))**1.7))*Math.exp(-(((e-205)/145)**4));return s+Math.max(l,p,m,g)*qs(0,42,n)}function Zs(){function e(e,t){let n=Math.ceil((t-e)/2),r=Array.from({length:n+1},(r,i)=>e+(t-e)*i/n);for(let n=4;n<=1400;)r.push(e-n,t+n),n+=n<100?4:n<320?12:24;return r.sort((e,t)=>e-t)}return{xs:e(Se.minX,Se.maxX),zs:e(Se.minZ,Se.maxZ)}}var Qs=Zs();function $s(e,t){let n=0,r=e.length-1;for(;r-n>1;){let i=n+r>>1;e[i]<=t?n=i:r=i}return Math.min(e.length-2,Math.max(0,n))}function ec(e,t){let n=$s(Qs.xs,e),r=$s(Qs.zs,t),i=Qs.xs[n],a=Qs.xs[n+1],o=Qs.zs[r],s=Qs.zs[r+1],c=Ks((e-i)/(a-i)),l=Ks((t-o)/(s-o)),u=Xs(i,o),d=Xs(i,s),f=Xs(a,o),p=Xs(a,s);return(c+l<=1?u+(f-u)*c+(d-u)*l:p+(d-p)*(1-c)+(f-p)*(1-l))+Gs}function tc(){let e=new K;e.name=`bactrian-caravans-v001`;let t=new AbortController,n=[],r=[],i=[],a=!1,o=!1,s=null,c=null,l=Us.alphaBounds,u=(l.right-l.left)/(l.bottom-l.top);function d(t,r,i){let a=new et(t.width,t.height,12,1),o=a.getAttribute(`position`),s=a.getAttribute(`uv`);for(let e=0;e<o.count;e++){let n=o.getX(e),r=ec(t.position.x+t.tangent.x*n,t.position.z+t.tangent.z*n);o.setY(e,o.getY(e)+t.height/2+r-t.position.y-.018),s.setXY(e,(l.left+s.getX(e)*(l.right-l.left))/Us.imageWidth,1-(l.bottom-s.getY(e)*(l.bottom-l.top))/Us.imageHeight)}a.computeVertexNormals(),a.computeBoundingBox(),a.computeBoundingSphere(),n.push(a);let c=new Z(a,r);c.name=t.id,c.position.copy(t.position),c.rotation.y=Math.atan2(-t.tangent.z,t.tangent.x),c.castShadow=!0,c.receiveShadow=!0,c.customDepthMaterial=i,c.userData.scenicBactrian=!0,e.add(c)}function f(t,r,i){let a=t.position.clone().addScaledVector(t.tangent,t.width*.37);a.y+=t.height*.73;let o=r.position.clone().addScaledVector(r.tangent,-r.width*.35);o.y+=r.height*.47;let s=a.clone().lerp(o,.5);s.y-=Math.min(.28,a.distanceTo(o)*.07);let c=new bn(a,s,o),l=new U(c,8,.012,3,!1);n.push(l);let u=new Z(l,i);u.name=`${t.id}-lead-rope`,u.castShadow=!1,e.add(u)}let p=(async()=>{let e=await fetch(Nt(Us.asset),{signal:t.signal});if(!e.ok)throw Error(`bactrian-caravan-texture-${e.status}`);let n=await createImageBitmap(await e.blob(),{imageOrientation:`flipY`,premultiplyAlpha:`none`});if(a){n.close();return}s=n,c=new q(n),c.name=`bactrian-camel-original-alpha`,c.colorSpace=nt,c.anisotropy=4,c.minFilter=vt,c.magFilter=en,c.needsUpdate=!0;let l=new hn({map:c,alphaTest:Us.alphaTest,depthPacking:Zt,side:2});l.name=`bactrian-alpha-depth`,r.push(l);let p=new fn({color:7163957,roughness:1});p.name=`bactrian-caravan-rope`,r.push(p);for(let e of Ws){let t=new sn(e.points.map(e=>new X(e.x,0,e.z)),!1,`centripetal`),n=[];e.spacing.forEach((a,o)=>{let s=t.getPointAt(a),f=t.getTangentAt(a).setY(0).normalize();s.y=ec(s.x,s.z);let p=e.heights[o],m=p*u,h=(ec(s.x+f.x*m/2,s.z+f.z*m/2)-ec(s.x-f.x*m/2,s.z-f.z*m/2))/m,g={id:`${e.id}-camel-${o+1}`,position:s,tangent:f,height:p,width:m,slope:h};i.push(g),n.push(g);let _=new fn({map:c,color:e.tones[o],roughness:.98,alphaTest:Us.alphaTest,side:2,transparent:!1,depthWrite:!0});_.name=`${g.id}-painted-cutout`,r.push(_),d(g,_,l)});for(let e=0;e<n.length-1;e++)f(n[e],n[e+1],p)}o=!0})().catch(e=>{throw m(),e});function m(){a||(a=!0,t.abort(),e.removeFromParent(),n.forEach(e=>e.dispose()),r.forEach(e=>e.dispose()),c?.dispose(),s?.close())}return{root:e,ready:p,dispose:m,inspect:()=>({version:`v001`,loaded:o,disposed:a,caravans:Ws.length,camels:i.length,representation:`fixed-alpha-cutout`,cameraFacing:!1,asset:Us.asset,animals:i.map(e=>({id:e.id,position:e.position.toArray(),height:e.height,width:e.width,yaw:Math.atan2(-e.tangent.z,e.tangent.x),slope:e.slope}))})}}var nc={minX:-160,maxX:720,minZ:-300,maxZ:450},rc=e=>Math.max(0,Math.min(1,e)),ic=(e,t,n)=>{let r=rc((n-e)/(t-e));return r*r*(3-2*r)};function ac(e,t,n){let r=Math.sin(e*127.1+t*311.7+n*19.19)*43758.5453123;return r-Math.floor(r)}function oc(e,t,n=0){let r=Math.floor(e),i=Math.floor(t),a=ic(0,1,e-r),o=ic(0,1,t-i);return(ac(r,i,n)*(1-a)+ac(r+1,i,n)*a)*(1-o)+(ac(r,i+1,n)*(1-a)+ac(r+1,i+1,n)*a)*o}function sc(e,t,n){return .62*oc(e,t,n)+.26*oc(e*2.07+11,t*2.07-7,n+3)+.12*oc(e*4.31-8,t*4.31+17,n+7)}var cc=new Map;for(let e of l)for(let t=1;t<e.points.length;t++){let n=e.points[t-1],r=e.points[t],i=r.x-n.x,a=r.z-n.z,o={ax:n.x,az:n.z,dx:i,dz:a,length2:i*i+a*a,halfWidth:e.width/2};if(o.length2===0)continue;let s=24+o.halfWidth;for(let e=Math.floor((Math.min(n.x,r.x)-s)/32);e<=Math.floor((Math.max(n.x,r.x)+s)/32);e++)for(let t=Math.floor((Math.min(n.z,r.z)-s)/32);t<=Math.floor((Math.max(n.z,r.z)+s)/32);t++){let n=`${e},${t}`,r=cc.get(n)??[];r.push(o),cc.set(n,r)}}function lc(e,t){let n=1/0;for(let r of cc.get(`${Math.floor(e/32)},${Math.floor(t/32)}`)??[]){let i=rc(((e-r.ax)*r.dx+(t-r.az)*r.dz)/r.length2);n=Math.min(n,Math.hypot(e-r.ax-r.dx*i,t-r.az-r.dz*i)-r.halfWidth)}return n}function uc(e,t,n,r){let i=p(n,{x:e,z:t});return Math.hypot(Math.max(r[0]-i.x,i.x-r[1],0),Math.max(r[2]-i.z,i.z-r[3],0))}var dc=f({x:215,z:28});function fc(e,t){let n=nc,r=ic(n.minX,n.minX+35,e)*(1-ic(n.maxX-60,n.maxX,e))*ic(n.minZ,n.minZ+45,t)*(1-ic(n.maxZ-65,n.maxZ,t));if(r===0||e<135)return{gravel:0,gobi:0};let i=(oc(e/53,t/47,101)-.5)*46,a=ic(265,345,e+i)*ic(-75,60,t+i*.6)*(1-ic(510,650,e))*(1-ic(290,410,t))*.94,s=lc(e,t),c=(1-ic(8,23,s))*ic(.6,3.5,s)*.28,l=Math.exp(-(((e-dc.x)/104)**2+((t-dc.z)/104)**2)),u=(l*(l>.015?1-ic(7,22,k(e,t)):0)*.52+c)*ic(140,173,e)*(1-a*.75),d=ic(.35,2.8,s);e>o.minX-7&&e<o.maxX+7&&t>o.minZ-7&&t<o.maxZ+7&&(d*=ic(1.5,6,I(e,t))),e<155&&(d*=ic(.5,3,uc(e,t,`courtyard`,[-24.8,.8,-27,3]))),d*=ic(.5,3,uc(e,t,`music`,[23.4,70.6,-29.4,3.5])),e>285&&e<390&&t>20&&t<150&&(d*=ic(.5,3,uc(e,t,`cliff`,[105,139,-108,-38.7]))),u=rc(u)*d*r;let f=rc(a)*d*r,p=Math.max(1,u+f);return{gravel:u/p,gobi:f/p}}function pc(e,t){let n=fc(e,t);if(n.gravel+n.gobi===0)return[0,0,0,0];let r=-t,i=e+13*(sc(e/24,r/27,2)-.5)+3*(sc(e/7,r/13,29)-.5),a=r+15*(sc(e/29+4,r/23,7)-.5)+4*(sc(e/9,r/8,31)-.5),o=sc(i/17+1.9,a/20-.8,51),s=sc(i/5.2-3,a/9.1+2,67),c=ic(.4,.63,o),l=c*(.08+.8*Math.exp(-(((s-.49)/.051)**4)))+.05*ic(.59,.73,s)*c,u=ic(.49,.72,o)*(.22+.34*ic(.34,.66,s)),d=sc(i/20-.7,a/15+.5,83),f=sc(i/3.7+7,a/5.3-1,89),p=ic(.29,.65,d)*(.54+.43*ic(.3,.69,f)),m=ic(.3,.67,d)*(.35+.65*ic(.3,.68,f));return[rc(l)*n.gravel,rc(p)*n.gobi,u*n.gravel,m*n.gobi]}var mc=`
varying vec3 vEnvGroundWorld;
uniform sampler2D uEnvGravelColor;
uniform sampler2D uEnvGravelSurface;
uniform sampler2D uEnvGobiColor;
uniform sampler2D uEnvGobiSurface;
uniform sampler2D uEnvGroundControl;
uniform vec4 uEnvGroundBounds;
uniform vec3 uEnvSandColor;
uniform vec3 uEnvOriginalVertexBase;

float envHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float envNoise(vec2 p) {
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(envHash(i),envHash(i+vec2(1,0)),f.x),mix(envHash(i+vec2(0,1)),envHash(i+vec2(1,1)),f.x),f.y);
}
vec3 envLinear(vec3 c) {
  return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));
}
// Reduced world-coordinate mid-scale field. It never inherits the 2m micro UV.
vec3 envMeso(vec2 p) {
  vec2 w=p+vec2(.65*(envNoise(p/2.8+vec2(4,9))-.5),.8*(envNoise(p/3.1+vec2(7,2))-.5));
  float sediment=smoothstep(.25,.74,.72*envNoise(w/vec2(1.45,.65)+vec2(2,-1))+.28*envNoise(w/vec2(.68,.31)+9.0));
  float plate=smoothstep(.31,.66,.72*envNoise(w/vec2(1.05,.74)+vec2(13,7))+.28*envNoise(w/vec2(.49,.35)+19.0));
  float worn=smoothstep(.32,.68,envNoise(w/vec2(.38,.64)+vec2(4,-7)));
  return vec3(sediment,plate,worn);
}
mat3 envTangentFrame(vec3 eye,vec3 n,vec2 uv) {
  vec3 q0=dFdx(eye),q1=dFdy(eye);
  vec2 st0=dFdx(uv),st1=dFdy(uv);
  vec3 a=cross(q1,n),b=cross(n,q0),t=a*st0.x+b*st1.x,bit=a*st0.y+b*st1.y;
  float scale=inversesqrt(max(max(dot(t,t),dot(bit,bit)),1e-16));
  return mat3(t*scale,bit*scale,n);
}
vec3 envBump(vec3 eye,vec3 n,float height) {
  vec3 dx=dFdx(eye),dy=dFdy(eye),a=cross(dy,n),b=cross(n,dx);
  float det=dot(dx,a);
  return normalize(abs(det)*n-sign(det)*(dFdx(height)*a+dFdy(height)*b));
}
`,hc=`
vec2 envP=vec2(vEnvGroundWorld.x,-vEnvGroundWorld.z);
vec2 envMacroUv=(vEnvGroundWorld.xz-uEnvGroundBounds.xy)/uEnvGroundBounds.zw;
float envInside=step(0.0,envMacroUv.x)*step(envMacroUv.x,1.0)*step(0.0,envMacroUv.y)*step(envMacroUv.y,1.0);
vec4 envControl=texture2D(uEnvGroundControl,envMacroUv)*envInside;
vec2 envMicroUv=envP/2.0;
vec4 envGravel=texture2D(uEnvGravelColor,envMicroUv);
vec4 envGobi=texture2D(uEnvGobiColor,envMicroUv+vec2(.173,.281));
vec4 envGs=texture2D(uEnvGravelSurface,envMicroUv);
vec4 envBs=texture2D(uEnvGobiSurface,envMicroUv+vec2(.173,.281));
float envG=smoothstep(-.025,.025,envControl.r-envGravel.a)*step(.001,envControl.r);
float envB=smoothstep(-.025,.025,envControl.g-envGobi.a)*step(.001,envControl.g);
// Fine particles fade to their mean coverage before becoming subpixel speckles.
float envDetail=1.0-smoothstep(18.0,58.0,length(vViewPosition));
vec3 envNear=mix(mix(uEnvSandColor,envGravel.rgb,envG),envGobi.rgb,envB);
vec3 envFar=mix(mix(uEnvSandColor,envLinear(vec3(.755,.653,.494)),envControl.r*.378),envLinear(vec3(.75,.645,.48)),envControl.g*.294);
vec3 envColor=mix(envFar,envNear,envDetail);
vec3 envMid=envMeso(envP);
vec3 envSediment=envLinear(vec3(.81,.687,.50)+vec3((envMid.x-.5)*.028));
vec3 envHardpan=envLinear(vec3(.755,.642,.467)+(envMid.y-.5)*vec3(.055,.045,.033)+vec3(envMid.z*.015));
float envHardTotal=clamp(envControl.b+envControl.a,0.0,1.0);
vec3 envSubstrate=(envSediment*envControl.b+envHardpan*envControl.a)/max(envHardTotal,.0001);
envColor=mix(envColor,envSubstrate,envHardTotal);
// Dust is a small material tint, not a baked light-facing gradient.
float envDust=(1.0-envHardTotal)*max(envControl.r,envControl.g)*.22;
envColor=1.0-(1.0-envColor)*(1.0-vec3(.035,.025,.012)*envDust);
diffuseColor.rgb=envColor;
#if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
  // Retain the original shore/distant tints without multiplying two sand bases.
  diffuseColor.rgb*=vColor.rgb/uEnvOriginalVertexBase;
#endif
float envRough=mix(mix(.93,envGs.b,envG),envBs.b,envB);
float envMidRough=((.89+.055*(1.0-envMid.x))*envControl.b+(.76+.16*(1.0-envMid.y)+.03*envMid.z)*envControl.a)/max(envHardTotal,.0001);
envRough=mix(envRough,envMidRough,envHardTotal);
vec2 envNormalXY=mix((envGs.rg*2.0-1.0)*envG,envBs.rg*2.0-1.0,envB)*(.8*envDetail);
float envMesoHeight=(envControl.b*(.0008*envMid.x)+envControl.a*(.0038*envMid.y+.0008*envMid.z))*.85;
`;function gc(){let e=!1,t=!1,n=0,r=0,i=new AbortController,a=[],o=[],s=nc,c=new Uint8Array(1048576),l=new Ye(c,512,512,H);l.name=`environment-world-nonrepeating-control`,l.colorSpace=``,l.minFilter=en,l.magFilter=en,l.generateMipmaps=!1,l.wrapS=l.wrapT=gn,l.needsUpdate=!0,a.push(l);let u={uEnvGravelColor:{value:null},uEnvGravelSurface:{value:null},uEnvGobiColor:{value:null},uEnvGobiSurface:{value:null},uEnvGroundControl:{value:l},uEnvGroundBounds:{value:new Ct(s.minX,s.minZ,s.maxX-s.minX,s.maxZ-s.minZ)},uEnvSandColor:{value:new Y().setRGB(.84,.723,.537,nt)},uEnvOriginalVertexBase:{value:new Y(`#dcb77a`)}},d=new fn({color:16777215,vertexColors:!0,roughness:.93});d.name=`environment-ground-v001`,d.userData.environmentGround=!0,d.onBeforeCompile=e=>{Object.assign(e.uniforms,u),e.vertexShader=`varying vec3 vEnvGroundWorld;
`+e.vertexShader,e.vertexShader=e.vertexShader.replace(`#include <worldpos_vertex>`,`#include <worldpos_vertex>
vEnvGroundWorld=(modelMatrix*vec4(transformed,1.0)).xyz;`),e.fragmentShader=mc+e.fragmentShader,e.fragmentShader=e.fragmentShader.replace(`#include <color_fragment>`,`#include <color_fragment>
`+hc),e.fragmentShader=e.fragmentShader.replace(`#include <roughnessmap_fragment>`,`#include <roughnessmap_fragment>
roughnessFactor=envRough;`),e.fragmentShader=e.fragmentShader.replace(`#include <normal_fragment_maps>`,`#include <normal_fragment_maps>
       vec3 envMapN=vec3(envNormalXY,sqrt(max(1.0-dot(envNormalXY,envNormalXY),.0001)));
       normal=normalize(envTangentFrame(-vViewPosition,normal,envMicroUv)*envMapN);
       normal=envBump(-vViewPosition,normal,envMesoHeight);`)},d.customProgramCacheKey=()=>`environment-ground-packed-v001`;async function f(t,n){let s=await fetch(Nt(`environment-world/v001/ground-${t}.png`),{signal:i.signal});if(!s.ok)throw Error(`environment-ground-texture-${s.status}: ${t}`);let c=await createImageBitmap(await s.blob(),{imageOrientation:`flipY`,premultiplyAlpha:`none`});if(e)throw c.close(),Error(`environment-ground-disposed`);o.push(c);let l=new q(c);return l.name=`ground-${t}`,l.colorSpace=n?nt:``,l.wrapS=l.wrapT=We,l.anisotropy=4,l.minFilter=vt,l.magFilter=en,l.needsUpdate=!0,a.push(l),r++,l}async function p(){let t=performance.now();for(let t=0;t<512;t++){if(e)throw Error(`environment-ground-disposed`);for(let e=0;e<512;e++){let n=pc(s.minX+(e+.5)/512*(s.maxX-s.minX),s.minZ+(t+.5)/512*(s.maxZ-s.minZ)),r=(t*512+e)*4;for(let e=0;e<4;e++)c[r+e]=Math.round(n[e]*255)}t%32==31&&await new Promise(e=>setTimeout(e,0))}l.needsUpdate=!0,n=performance.now()-t}let m=Promise.all([f(`gravel-color-id`,!0),f(`gravel-surface`,!1),f(`gobi-color-id`,!0),f(`gobi-surface`,!1),p()]).then(([n,r,i,a])=>{e||(u.uEnvGravelColor.value=n,u.uEnvGravelSurface.value=r,u.uEnvGobiColor.value=i,u.uEnvGobiSurface.value=a,t=!0)}).catch(e=>{throw h(),e});function h(){e||(e=!0,i.abort(),a.forEach(e=>e.dispose()),o.forEach(e=>e.close()),d.dispose())}return{material:d,ready:m,dispose:h,inspect:()=>({version:`v001`,loaded:t,disposed:e,loadedFileTextures:r,totalTextures:a.length,microTileMetres:2,controlSize:512,controlWorldBounds:{...s},controlBuildMs:Math.round(n),approximateGpuMiB:22.33,geometryDisplacement:!1,staticLightInBasecolor:!1,regionSamples:[{x:110,z:12},{x:185,z:50},{x:310,z:170},{x:420,z:180}].map(e=>({...e,...fc(e.x,e.z)}))})}}var _c=class e extends Z{constructor(t,n={}){super(t),this.isReflector=!0,this.type=`Reflector`,this.forceUpdate=!1,this._reflectionCameras=new WeakMap;let r=this,i=n.color===void 0?new Y(8355711):new Y(n.color),a=n.textureWidth||512,o=n.textureHeight||512,s=n.clipBias||0,c=n.shader||e.ReflectorShader,l=n.multisample===void 0?4:n.multisample,u=new Je,d=new X,f=new X,p=new X,m=new ln,h=new X(0,0,-1),g=new Ct,_=new X,v=new X,y=new Ct,b=new ln,x=new Ot(a,o,{samples:l,type:ft}),S=new dt({name:c.name===void 0?`unspecified`:c.name,uniforms:nn.clone(c.uniforms),fragmentShader:c.fragmentShader,vertexShader:c.vertexShader});S.uniforms.tDiffuse.value=x.texture,S.uniforms.color.value=i,S.uniforms.textureMatrix.value=b,this.material=S,this.onBeforeRender=function(e,t,n){let i=this.getReflectionCamera(n);if(f.setFromMatrixPosition(r.matrixWorld),p.setFromMatrixPosition(n.matrixWorld),m.extractRotation(r.matrixWorld),d.set(0,0,1),d.applyMatrix4(m),_.subVectors(f,p),_.dot(d)>0&&this.forceUpdate===!1)return;_.reflect(d).negate(),_.add(f),m.extractRotation(n.matrixWorld),h.set(0,0,-1),h.applyMatrix4(m),h.add(p),v.subVectors(f,h),v.reflect(d).negate(),v.add(f),i.position.copy(_),i.up.set(0,1,0),i.up.applyMatrix4(m),i.up.reflect(d),i.lookAt(v),i.far=n.far,i.updateMatrixWorld(),i.projectionMatrix.copy(n.projectionMatrix),i.projectionMatrix.elements[8]*=-1,i.projectionMatrix.elements[12]*=-1,b.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),b.multiply(i.projectionMatrix),b.multiply(i.matrixWorldInverse),b.multiply(r.matrixWorld),u.setFromNormalAndCoplanarPoint(d,f),u.applyMatrix4(i.matrixWorldInverse),g.set(u.normal.x,u.normal.y,u.normal.z,u.constant);let a=i.projectionMatrix;i.isOrthographicCamera?(y.x=(Math.sign(g.x)+a.elements[8])/a.elements[0],y.y=(Math.sign(g.y)+a.elements[9])/a.elements[5],y.z=-n.far,y.w=1):(y.x=(Math.sign(g.x)+a.elements[8])/a.elements[0],y.y=(Math.sign(g.y)+a.elements[9])/a.elements[5],y.z=-1,y.w=(1+a.elements[10])/a.elements[14]),g.multiplyScalar(2/g.dot(y)),a.elements[2]=g.x,a.elements[6]=g.y,i.isOrthographicCamera?(a.elements[10]=g.z-s,a.elements[14]=g.w-1):(a.elements[10]=g.z+1-s,a.elements[14]=g.w),r.visible=!1;let o=e.getRenderTarget(),c=e.xr.enabled,l=e.shadowMap.autoUpdate;e.xr.enabled=!1,e.shadowMap.autoUpdate=!1,e.setRenderTarget(x),e.state.buffers.depth.setMask(!0),e.autoClear===!1&&e.clear(),e.render(t,i),e.xr.enabled=c,e.shadowMap.autoUpdate=l,e.setRenderTarget(o);let S=n.viewport;S!==void 0&&e.state.viewport(S),r.visible=!0,this.forceUpdate=!1},this.getRenderTarget=function(){return x},this.dispose=function(){x.dispose(),r.material.dispose()},this.getReflectionCamera=function(e){let t=this._reflectionCameras.get(e);return t===void 0&&(t=e.clone(),this._reflectionCameras.set(e,t)),t}}};_c.ReflectorShader={name:`ReflectorShader`,uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null}},vertexShader:`
		uniform mat4 textureMatrix;
		varying vec4 vUv;

		#include <common>
		#include <logdepthbuf_pars_vertex>

		void main() {

			vUv = textureMatrix * vec4( position, 1.0 );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			#include <logdepthbuf_vertex>

		}`,fragmentShader:`
		uniform vec3 color;
		uniform sampler2D tDiffuse;
		varying vec4 vUv;

		#include <logdepthbuf_pars_fragment>

		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}

		void main() {

			#include <logdepthbuf_fragment>

			vec4 base = texture2DProj( tDiffuse, vUv );
			gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`};var vc=256,yc=256;function bc(){let e=new Uint8Array(vc*vc*4),t=[[3,2,.12,0],[5,-3,.065,1.4],[11,4,.024,2.3],[15,-8,.012,4.3],[23,19,.006,3.2]];for(let n=0;n<vc;n++)for(let r=0;r<vc;r++){let i=0,a=0;for(let[e,o,s,c]of t){let t=(e*r+o*n)/vc*Math.PI*2+c;i+=Math.cos(t)*s*e*.1,a+=Math.cos(t)*s*o*.1}let o=Math.hypot(i,a,1),s=(n*vc+r)*4;e[s]=(-i/o*.5+.5)*255,e[s+1]=(-a/o*.5+.5)*255,e[s+2]=(1/o*.5+.5)*255,e[s+3]=255}let n=new Ye(e,vc,vc);return n.name=`terrain-water-calm-normals-v001`,n.wrapS=n.wrapT=We,n.magFilter=en,n.minFilter=vt,n.generateMipmaps=!0,n.needsUpdate=!0,n}function xc(){let e=new St;for(let t of u)e.expandByPoint(new an(t.x,t.z));e.expandByScalar(2);let t=e.getSize(new an),n=new Float32Array(yc*yc),r=.01;for(let i=0;i<yc;i++)for(let a=0;a<yc;a++){let o=e.min.x+a/255*t.x,s=e.min.y+i/255*t.y,c=I(o,s)<0?Math.max(0,0-k(o,s)):0;n[i*yc+a]=c,r=Math.max(r,c)}let i=new Uint8Array(yc*yc*4);for(let e=0;e<n.length;e++){let t=Math.round(n[e]/r*255);i[e*4]=i[e*4+1]=i[e*4+2]=t,i[e*4+3]=255}let a=new Ye(i,yc,yc);return a.name=`terrain-water-lake-bed-depth-v001`,a.magFilter=a.minFilter=en,a.needsUpdate=!0,{texture:a,bounds:e,size:t,maxDepth:r}}var Sc=`
  uniform mat4 textureMatrix;
  varying vec4 mirrorCoord;
  varying vec4 worldPosition;
  #include <common>
  #include <fog_pars_vertex>
  #include <logdepthbuf_pars_vertex>
  void main() {
    worldPosition = modelMatrix * vec4(position, 1.0);
    // Reflector's matrix already includes modelMatrix (unlike Water's matrix).
    mirrorCoord = textureMatrix * vec4(position, 1.0);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <logdepthbuf_vertex>
    #include <fog_vertex>
  }
`,Cc=`
  uniform sampler2D tDiffuse, normalSampler, depthSampler;
  uniform float time, wind, maxDepth, reflectionWeight;
  uniform vec2 depthOrigin, depthExtent;
  uniform vec3 sunDirection, sunColor, distantSky;
  varying vec4 mirrorCoord;
  varying vec4 worldPosition;
  #include <common>
  #include <fog_pars_fragment>
  #include <logdepthbuf_pars_fragment>
  void main() {
    #include <logdepthbuf_fragment>
    vec2 p = worldPosition.xz;
    float depth = texture2D(depthSampler, (p - depthOrigin) / depthExtent).r * maxDepth;
    vec2 n1 = texture2D(normalSampler, p / 12.0 + time * vec2(.0021, .0013)).rg * 2.0 - 1.0;
    vec2 n2 = texture2D(normalSampler, mat2(.82, -.57, .57, .82) * p / 4.7 + time * vec2(-.0014, .0018)).rg * 2.0 - 1.0;
    vec2 n3 = texture2D(normalSampler, mat2(.36, .93, -.93, .36) * p / 2.2 + time * vec2(.001, -.0017)).rg * 2.0 - 1.0;
    vec2 slopes = (n1 * .7 + n2 * .38 + n3 * .17) * (.42 + wind * .72);
    vec3 N = normalize(vec3(slopes.x, 1.0, slopes.y));
    vec3 V = normalize(cameraPosition - worldPosition.xyz);
    float grazing = 1.0 - max(dot(N, V), 0.0);
    float fresnel = .025 + .975 * pow(grazing, 5.0);
    vec2 reflectedUv = mirrorCoord.xy / mirrorCoord.w + slopes * .052;
    // The reflection target is linear; decode neither its RGB nor the depth map.
    vec3 reflected = mix(distantSky, texture2D(tDiffuse, reflectedUv).rgb, reflectionWeight);
    vec3 transmittance = exp(-vec3(.95, .44, .29) * depth);
    vec3 sandBed = vec3(.40, .27, .14) * (1.0 + .035 * sin(p.x * 3.1 + p.y * 2.4));
    vec3 deepWater = vec3(.006, .085, .125);
    vec3 below = sandBed * transmittance + deepWater * (1.0 - transmittance);
    float sunAngle = max(dot(reflect(-sunDirection, N), V), 0.0);
    float glitter = pow(sunAngle, 180.0);
    float softLight = pow(sunAngle, 18.0);
    float rippleLight = (n1.x + n2.y * .6 + n3.x * .25) * (.18 + wind * .18);
    vec3 color = mix(below, reflected, clamp(.105 + fresnel * .895, 0.0, 1.0));
    color *= 1.0 + rippleLight;
    color += sunColor * (glitter * .42 + softLight * .035);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;function wc(e={}){let t=bc(),n=xc(),r=new Re;u.forEach((e,t)=>{t===0?r.moveTo(e.x,-e.z):r.lineTo(e.x,-e.z)}),r.closePath();let i=new ct(r),a=typeof matchMedia==`function`&&matchMedia(`(pointer: coarse)`).matches,o=Et.clamp(Math.round(e.reflectionSize??(a?512:768)),256,1024),s=(e.sunDirection??new X(-38,32,-45)).clone().normalize(),c=new _c(i,{textureWidth:o,textureHeight:o,multisample:0,clipBias:.002,shader:{name:`DunhuangTerrainCalmWaterV001`,uniforms:nn.merge([$.fog,{tDiffuse:{value:null},color:{value:new Y},textureMatrix:{value:new ln},normalSampler:{value:null},depthSampler:{value:null},depthOrigin:{value:n.bounds.min},depthExtent:{value:n.size},maxDepth:{value:n.maxDepth},time:{value:0},wind:{value:.22},reflectionWeight:{value:1},distantSky:{value:new Y(`#7bb9df`)},sunDirection:{value:s},sunColor:{value:new Y(`#fff1cf`)}}]),vertexShader:Sc,fragmentShader:Cc}}),l=c.material;l.fog=!0,l.uniforms.normalSampler.value=t,l.uniforms.depthSampler.value=n.texture,c.getRenderTarget().texture.colorSpace=on,c.name=`terrain-calm-crescent-water-v001`,c.rotation.x=-Math.PI/2,c.position.y=0,c.userData={reflectionSize:o,waterLevel:0,depthMapSize:yc,maxDepth:n.maxDepth,reflectionUpdates:0,reflectionSkipped:0},i.computeBoundingSphere();let d=new Xt,f=new X,p=c.onBeforeRender,m=!1;c.onBeforeRender=(e,t,n,r,a,o)=>{d.copy(i.boundingSphere).applyMatrix4(c.matrixWorld),f.setFromMatrixPosition(n.matrixWorld);let s=f.distanceTo(d.center),u=f.y-0>=90;l.uniforms.reflectionWeight.value=u?1:1-Et.smoothstep(s,190,220),t.background instanceof Y&&l.uniforms.distantSky.value.copy(t.background),m&&!u&&s>220?c.userData.reflectionSkipped++:(p.call(c,e,t,n,r,a,o),m=!0,c.userData.reflectionUpdates++)};let h=!1;return{object:c,update(e,t){h||t||!Number.isFinite(e)||(l.uniforms.time.value+=Et.clamp(e,0,.05))},dispose(){h||(h=!0,c.removeFromParent(),c.onBeforeRender=()=>{},i.dispose(),t.dispose(),n.texture.dispose(),c.dispose())}}}function Tc(e){let t=1/0;for(let n of l)for(let r=1;r<n.points.length;r++){let i=n.points[r-1],a=n.points[r],o=a.x-i.x,s=a.z-i.z,c=Math.max(0,Math.min(1,((e.x-i.x)*o+(e.z-i.z)*s)/(o*o+s*s)));t=Math.min(t,Math.hypot(e.x-i.x-c*o,e.z-i.z-c*s)-n.width/2)}return t}function Ec(e,t,n,r,i,a){return Math.hypot(Math.max(n-e.x,e.x-r,0),Math.max(i-e.z,e.z-a,0))>t}function Dc(e,t){let n=t+1.1;if(Tc(e)<n||I(e.x,e.z)<n)return!1;let r=p(`courtyard`,e),i=p(`music`,e),a=p(`cliff`,e);return Ec(r,n,-24.8,.8,-27,3)&&Ec(i,n,23.4,70.6,-29.4,3.5)&&Ec(a,n,105,139,-108,-38.7)}function Oc(e,t){if(Dc(e,t))return e;for(let n=.5;n<=48;n+=.5){let r=Math.max(24,Math.ceil(Math.PI*2*n/.5));for(let i=0;i<r;i++){let a=i*Math.PI*2/r,o={x:e.x+Math.sin(a)*n,z:e.z+Math.cos(a)*n};if(Dc(o,t))return o}}throw Error(`No clear terrain planting position`)}function kc(e,t){let n=.035;if(e.maxX+n<=t.minX||t.maxX+n<=e.minX||e.maxZ+n<=t.minZ||t.maxZ+n<=e.minZ)return!1;for(let r of[e.corners,t.corners])for(let i=0;i<r.length;i++){let a=r[i],o=r[(i+1)%r.length],s=Math.hypot(o.x-a.x,o.z-a.z),c=-(o.z-a.z)/s,l=(o.x-a.x)/s,u=e.corners.map(e=>e.x*c+e.z*l),d=t.corners.map(e=>e.x*c+e.z*l);if(Math.max(...u)+n<=Math.min(...d)||Math.max(...d)+n<=Math.min(...u))return!1}return!0}function Ac(e,t,n){for(let r of l.slice(0,t))for(let t=1;t<r.points.length;t++){let i=r.points[t-1],a=r.points[t],o=a.x-i.x,s=a.z-i.z,c=Et.clamp(((e.x-i.x)*o+(e.z-i.z)*s)/(o*o+s*s),0,1);if(Math.hypot(e.x-i.x-o*c,e.z-i.z-s*c)<n)return!0}return!1}function jc(e,n=!1){let r=new K;r.name=`continuous-terrain-v001`;for(let t of e.children)t instanceof Z&&(t.visible=!1);let i=new Y(.62,.61,.55);e.background=i.clone(),e.fog=new vn(i,n?950:550,n?1900:1050),e.add(r);let a=[],o=new Map,s=[],c=[];for(let t of[`courtyard`,`music`,`cliff`]){let n=new K;n.name=`terrain-region-${t}`;let r=j(t,{x:0,y:0,z:0});n.position.set(r.x,r.y,r.z),n.rotation.y=D[t].yaw,e.add(n),o.set(t,n)}let{minX:u,maxX:d,minZ:f,maxZ:m}=Se;function h(e,t){let n=Math.ceil((t-e)/2),r=Array.from({length:n+1},(r,i)=>e+(t-e)*i/n);for(let n=8;n<=1400;)r.push(e-n,t+n),n+=n<96?8:n<320?16:24;return r.sort((e,t)=>e-t)}let{xs:g,zs:_}=n?Zs():{xs:h(u,d),zs:h(f,m)},v=g.length-1,y=_.length-1;function b(e,t){if(n)return Xs(e,t);let r=Math.hypot(Math.max(u-e,e-d,0),Math.max(f-t,t-m,0));if(r<=30)return k(e,t);let i=Math.sin(e*.012+.7)*32+Math.sin(t*.009-e*.004)*24,a=0;for(let[n,o,s,c]of[[180,100,55,0],[365,155,85,1.7],[620,210,115,3.2]]){let l=(r-n-i*Math.sin(c+e*.003))/o,u=.76+.15*Math.sin(e*.014+t*.004+c)+.09*Math.sin(t*.011-e*.005+c);a=Math.max(a,s*u*Math.exp(-l*l))}return k(e,t)+a*Et.smoothstep(r,30,100)}let x=[],S=[],C=[],w=new Y(`#dcb77a`),E=new Y(`#ae9970`),O=new Y(`#e3c18c`),ee=new Y(`#9f8e75`),A=new Y;for(let e=0;e<=y;e++)for(let t=0;t<=v;t++){let n=g[t],r=_[e],i=b(n,r),a=I(n,r);x.push(n,i-.025,r),A.copy(w).lerp(O,Et.clamp((i-10)/70,0,.3)),a<6&&A.lerp(E,.38*(1-Et.smoothstep(a,0,6)));let o=Math.hypot(Math.max(u-n,n-d,0),Math.max(f-r,r-m,0));if(o>60){let e=Et.clamp((i-k(n,r))/45,0,1);A.lerp(ee,.15*e*Et.smoothstep(o,60,140))}if(A.multiplyScalar(.985+.015*Math.sin(n*.083+Math.sin(r*.036))),S.push(A.r,A.g,A.b),e<y&&t<v){let n=e*(v+1)+t,r=n+v+1;C.push(n,r,n+1,n+1,r,r+1)}}let te=new wt;te.setAttribute(`position`,new He(x,3)),te.setAttribute(`color`,new He(S,3)),te.setIndex(C),te.computeVertexNormals();let M=n?gc():null,ne=new Z(te,M?.material??new fn({vertexColors:!0,roughness:1}));ne.name=`continuous-sand-heightfield`,ne.castShadow=n,ne.receiveShadow=!0,r.add(ne),a.push(ne);let re=[`#c7b69b`,`#d0bea0`,`#bbaa90`,`#d6c6a9`].map(e=>new fn({color:e,roughness:1})),N=re.map(()=>[]),ie=0,ae=0,oe=0,se=[];for(let[e,t]of l.entries()){let n=2;for(let r=1;r<t.points.length;r++){let i=t.points[r-1],a=t.points[r];if(n+=Math.hypot(a.x-i.x,a.z-i.z),n<1.12&&r!==t.points.length-1)continue;n=0;let o=Math.atan2(a.x-i.x,a.z-i.z),s=Math.min(1.06,t.width/3);for(let t=0;t<3;t++){let n=ae++,r=(t-1)*s,i=a.x+Math.cos(o)*r,c=a.z-Math.sin(o)*r,l=[[-.44,-.43],[.28,-.46],[.46,-.24],[.42,.34],[-.24,.44],[-.46,.16]],u=[],d=[],f=[];for(let[e,[t,r]]of l.entries()){let a=(t+Math.sin(n*13.37+e*7.9)*.035)*s,l=r*1.08,d=i+a*Math.cos(o)+l*Math.sin(o),p=c-a*Math.sin(o)+l*Math.cos(o);f.push({x:d,z:p});let m=k(d,p);u.push(d,m+.045,p,d,m-.015,p)}let p={route:e,corners:f,minX:Math.min(...f.map(e=>e.x)),maxX:Math.max(...f.map(e=>e.x)),minZ:Math.min(...f.map(e=>e.z)),maxZ:Math.max(...f.map(e=>e.z))};if(se.some(e=>kc(e,p))){oe++;continue}se.push(p),ie++,u.push(i,k(i,c)+.045,c);for(let e=0;e<6;e++){let t=e*2,n=(e+1)%6*2;d.push(12,n,t,t,n,t+1,n,n+1,t+1)}let m=new wt;m.setAttribute(`position`,new He(u,3)),m.setIndex(d),m.computeVertexNormals(),N[n%N.length].push(m)}}}for(let[e,t]of N.entries()){let n=t.length?dr(t):null;if(t.forEach(e=>e.dispose()),!n){re[e].dispose();continue}let i=new Z(n,re[e]);i.name=`terrain-following-stone-road-${e}`,i.receiveShadow=!0,r.add(i),a.push(i)}let P=new Z(new ze(1e3,48,24),new dt({side:1,depthWrite:!1,depthTest:!1,uniforms:{horizon:{value:i.clone()}},vertexShader:`varying vec3 skyDirection;
      void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position.z=gl_Position.w;}`,fragmentShader:`uniform vec3 horizon;varying vec3 skyDirection;
      #include <common>
      void main(){vec3 d=normalize(skyDirection);float h=max(d.y,0.0);
        vec3 c=mix(horizon,vec3(.10,.34,.65),pow(h,.65));
        float cloud=smoothstep(.63,.91,sin(d.x*17.0+d.z*5.0)*.4+sin(d.z*27.0-d.x*7.0)*.25+sin(d.x*43.0+d.z*31.0)*.12);
        cloud*=smoothstep(.08,.24,h)*(1.0-smoothstep(.45,.72,h));
        c=mix(c,vec3(.82,.88,.91),cloud*.19);gl_FragColor=vec4(c,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`}));P.name=`terrain-blue-gradient-sky`,P.renderOrder=-1e3,P.frustumCulled=!1,P.onBeforeRender=(e,t,n)=>{P.position.copy(n.position),P.updateMatrixWorld(!0)},r.add(P),a.push(P);let ce=wc({sunDirection:n?Es:new X(-14,35,22).normalize()});r.add(ce.object);function le(e,t){o.get(e).add(t),t.updateWorldMatrix(!0,!0)}function F(e){for(let n of t.props){if(!(n.x<-22||n.x>-2||n.z>2||n.z<-24))continue;let t=T.courtyard?.[n.id]??n,r=j(`courtyard`,{x:t.x,y:n.y,z:t.z}),i=k(r.x,r.z)-D.courtyard.target.y;e.traverse(e=>{let r=String(e.userData.semanticGroup??e.name);(r===n.id||r===`${n.id}-canopy`||r===`${n.id}-trunk`)&&(e.position.x+=t.x-n.x,e.position.z+=t.z-n.z,e.position.y+=i)}),s.push({id:n.id,source:[n.x,n.y,n.z],target:[r.x,k(r.x,r.z),r.z],deltaY:i})}e.updateWorldMatrix(!0,!0)}function ue(e,t,n=0){e.updateWorldMatrix(!0,!0);let i=new Yt().setFromObject(e,!0),a=i.getCenter(new X),o=Math.hypot(i.max.x-i.min.x,i.max.z-i.min.z)/2,s=t?j(t,a):a,l=Oc(s,o);if(n>0&&c.some(e=>Math.hypot(e.x-l.x,e.z-l.z)<e.radius+o+n))return;let u=t?p(t,l):l;e.position.x+=u.x-a.x,e.position.z+=u.z-a.z,e.position.y+=k(l.x,l.z)-(t?D[t].target.y:0)-i.min.y,t?le(t,e):r.add(e),c.push({id:e.name,x:l.x,z:l.z,radius:o,roadClearance:Tc(l),shift:Math.hypot(l.x-s.x,l.z-s.z)})}function de(e,t){let n=0;for(let[e,r]of l.entries())for(let i=10;i<r.points.length-8;i+=23){let a=r.points[i-1],o=r.points[i],s=n++%2?-1:1;if(Ac(o,e,r.width+3))continue;let c=o.x-a.x,l=o.z-a.z,u=Math.hypot(c,l)||1,d=s*(r.width/2+2.5+.9*Math.sin(n*2.1)),f=o.x+l/u*d,p=o.z-c/u*d;if(I(f,p)<2.5)continue;let m=t.clone(!0);m.visible=!0,m.name=`terrain-route-shrub-${n}`,m.position.set(f,0,p),m.scale.setScalar(.65+n%4*.12),m.rotation.y=n*1.37,ue(m,void 0,2.5)}}return{root:r,ready:M?.ready??Promise.resolve(),attachRegionObject:le,groundCourtyardAttachments:F,addNatureTemplates:de,placeOutdoorShrub:ue,update(e,t){ce.update(e,t)},inspect:()=>({environmentVersion:n?`v001`:null,groundMaterial:M?.inspect(),groundVertices:x.length/3,groundTriangles:C.length/3,visualBounds:{minX:g[0],maxX:g.at(-1),minZ:_[0],maxZ:_.at(-1)},stones:ie,duplicatePavingSkipped:oe,groundedAttachments:s,outdoorShrubs:c}),dispose(){ce.dispose(),M?.dispose();for(let e of a)if(e instanceof Z){e.geometry.dispose();for(let t of Array.isArray(e.material)?e.material:[e.material])t!==M?.material&&t.dispose()}r.removeFromParent(),r.clear();for(let e of o.values())e.removeFromParent(),e.clear();o.clear()}}}function Mc(e,t){let n=new Yt,r=e.matrixWorld.clone().invert();return t.traverse(e=>{if(!(e instanceof Z))return;e.geometry.computeBoundingBox();let t=e.geometry.boundingBox,i=r.clone().multiply(e.matrixWorld);for(let e of[t.min.x,t.max.x])for(let r of[t.min.y,t.max.y])for(let a of[t.min.z,t.max.z])n.expandByPoint(new X(e,r,a).applyMatrix4(i))}),n}function Nc(e){let r=e.userData.terrainCourtyardExpansionV003;if(r)return r;e.updateWorldMatrix(!0,!0);let i=e.matrixWorld.clone().invert(),a=new Set,o={movedParts:[],pavingMeshes:0,addedWidth:4},s=new Set;e.traverse(r=>{let c=String(r.userData.semanticGroup??``);if(c===`courtyard-paving`&&r.traverse(e=>{if(e instanceof Z)for(let t of Array.isArray(e.material)?e.material:[e.material])s.add(t)}),!c)return;for(let t=r.parent;t&&t!==e;t=t.parent)if(a.has(t))return;let l=Mc(e,r);if(l.isEmpty())return;let u=(l.min.x+l.max.x)/2-12,d=te(c,u),f=n.attachedProps[c];if(f){let e=t.props.find(e=>e.id===c);d={scaleX:1,offsetX:f.x-e.x}}if(!d||!r.parent)return;let p=new ln().makeScale(d.scaleX,1,1);p.setPosition(d.offsetX+12*(1-d.scaleX),0,0);let m=i.clone().multiply(r.parent.matrixWorld);r.applyMatrix4(m.clone().invert().multiply(p).multiply(m)),a.add(r),o.movedParts.push(c)});let c=[...s];if(!c.length)throw Error(`courtyard-paving-material-missing`);let l=c.map(()=>[]),u=[[-11.75,-10.07],[9.77,11.75]];for(let e=0;e<u.length;e++){let[t,n]=u[e],r=(n-t-.04)/2;for(let n=0;n<21;n++)for(let i=0;i<2;i++){let a=new Vt(r,.012,1.105);a.translate(t+r/2+i*(r+.04),-.003,-.95-n*1.15),l[(n*2+i+e)%c.length].push(a)}}return l.forEach((t,n)=>{if(!t.length)return;let r=dr(t,!1);for(let e of t)e.dispose();let i=new Z(r,c[n]);i.name=`terrain-courtyard-side-paving-${n}`,i.userData.semanticGroup=i.name,i.userData.cameraRole=`decoration`,i.castShadow=!0,i.receiveShadow=!0,e.add(i),o.pavingMeshes++}),e.userData.terrainCourtyardExpansionV003=o,e.updateWorldMatrix(!0,!0),o}function Pc(e){let t=N,n=new K;n.name=t.id;let r=new K;r.position.set(-t.rootAnchor.x,0,-t.rootAnchor.z),r.add(e),n.add(r),n.scale.setScalar(t.placement.height/t.sourceHeight);let i=j(`music`,t.placement);n.position.set(i.x,i.y,i.z),n.rotation.y=D.music.yaw+t.placement.yaw;let a=[];e.traverse(e=>{e instanceof Z&&(e.castShadow=e.receiveShadow=!0,a.push(e))}),n.updateWorldMatrix(!0,!0);let o=new Yt().setFromObject(n,!0);return{root:n,meshes:a,worldBounds:o,inspect:()=>({id:t.id,height:o.max.y-o.min.y,position:n.position.toArray(),worldBounds:{min:o.min.toArray(),max:o.max.toArray()}}),dispose(){e.removeFromParent(),n.removeFromParent(),n.clear()}}}function Fc(e){e.updateWorldMatrix(!0,!0);let t=e.matrixWorld.clone().invert(),n=[],r=Object.fromEntries(_e.map(e=>[e.id,0]));e.traverse(e=>{if(!(e instanceof Z))return;let i=String(e.userData.semanticGroup??``);if(i!==`high-drapery`&&i!==`workshop-furnishings`)return;let a=e.geometry,o=a.getAttribute(`position`),s=a.getAttribute(`normal`),c=t.clone().multiply(e.matrixWorld),l=c.clone().invert(),u=new J().getNormalMatrix(c),d=u.clone().invert(),f=[],p=new X;for(let e=0;e<o.count;e++)p.fromBufferAttribute(o,e).applyMatrix4(c),p.x+=46,p.z-=9,f.push(_e.findIndex(e=>p.x>=e.sourceMin[0]&&p.x<=e.sourceMax[0]&&p.y>=e.sourceMin[1]&&p.y<=e.sourceMax[1]&&p.z>=e.sourceMin[2]&&p.z<=e.sourceMax[2]));if(!f.some(e=>e>=0))return;let m=a.index;for(let t=0;t<(m?.count??o.count);t+=3){let n=[0,1,2].map(e=>f[m?m.getX(t+e):t+e]);if(n[0]!==n[1]||n[0]!==n[2])throw Error(`Furniture relocation cuts a triangle in ${e.name}`)}n.push({mesh:e,position:new Float32Array(o.array),normal:s?new Float32Array(s.array):null});for(let e=0;e<o.count;e++){let t=f[e];if(t<0)continue;let n=_e[t];p.fromBufferAttribute(o,e).applyMatrix4(c),p.x+=46,p.z-=9;let i=F(p,n);p.set(i.x-46,p.y,i.z+9).applyMatrix4(l),o.setXYZ(e,p.x,p.y,p.z),s&&n.yaw&&(p.fromBufferAttribute(s,e).applyMatrix3(u).normalize(),p.applyAxisAngle(z.DEFAULT_UP,n.yaw).applyMatrix3(d).normalize(),s.setXYZ(e,p.x,p.y,p.z)),r[n.id]++}o.needsUpdate=!0,s&&(s.needsUpdate=!0),a.computeBoundingBox(),a.computeBoundingSphere()});let i=!1;return{inspect:()=>({movedVertices:{...r},changedMeshes:n.length}),dispose(){if(!i){i=!0;for(let e of n){let t=e.mesh.geometry.getAttribute(`position`);t.array.set(e.position),t.needsUpdate=!0;let n=e.mesh.geometry.getAttribute(`normal`);n&&e.normal&&(n.array.set(e.normal),n.needsUpdate=!0),e.mesh.geometry.computeBoundingBox(),e.mesh.geometry.computeBoundingSphere()}}}}}function Ic(e){if(e.length!==x.length)throw Error(`Two supplied tower-tree models are required, in configuration order.`);let t=new K;t.name=`terrain-tower-trees-v001`;let n=[],r=e.map(e=>({position:e.position.clone(),quaternion:e.quaternion.clone(),scale:e.scale.clone()}));for(let[r,i]of x.entries()){let a=e[r];a.updateWorldMatrix(!0,!0);let o=new Yt().setFromObject(a,!0),s=o.getSize(new X);if(!Number.isFinite(s.y)||s.y<=0)throw Error(`Invalid tree height: ${i.id}`);let c=o.getCenter(new X),l=new K;l.name=`${i.id}-normalization`,l.position.set(-c.x,-o.min.y,-c.z),l.add(a);let u=new K;u.name=i.id,u.scale.setScalar(i.placement.height/s.y),u.add(l);let d=j(`cliff`,i.placement),f=k(d.x,d.z);u.position.set(d.x,f,d.z),u.rotation.y=D.cliff.yaw+i.placement.yaw;let p=[];a.traverse(e=>{e instanceof Z&&(e.castShadow=!0,e.receiveShadow=!0,p.push(e))}),u.userData={sourceAsset:i.assetPath,targetHeight:i.placement.height},t.add(u),u.updateWorldMatrix(!0,!0);let m=new Yt().setFromObject(u,!0);n.push({id:i.id,object:u,meshes:p,baseY:f,height:m.max.y-m.min.y,cameraRadius:i.collisionRadii.camera,worldBounds:m})}let i=!1;return{root:t,trees:n,inspect:()=>n.map(e=>({id:e.id,baseY:e.baseY,height:e.height,position:e.object.position.toArray(),worldBounds:{min:e.worldBounds.min.toArray(),max:e.worldBounds.max.toArray()}})),dispose(){if(!i){i=!0;for(let[t,n]of e.entries())n.removeFromParent(),n.position.copy(r[t].position),n.quaternion.copy(r[t].quaternion),n.scale.copy(r[t].scale);t.removeFromParent(),t.clear()}}}}function Lc(e,t){let n=[];for(let r of t)for(let t=1;t<r.length-1;t++)n.push(...e[r[0]],...e[r[t]],...e[r[t+1]]);let r=new wt;return r.setAttribute(`position`,new He(n,3)),r.computeVertexNormals(),r.computeBoundingBox(),r.computeBoundingSphere(),r}function Rc(e,t){let n=Math.sin(e*7.13+t*11.79)*1847.17;return n-Math.floor(n)}function zc(e,t=`x`,n=!1){let r=[-1,-.82,-.57,-.31,-.05,.21,.48,.74,1],i=[.14,.55,.86,.49,1,.6,.84,.47,.16],a=[],o=[];for(let o=0;o<r.length;o++){let s=o===0||o===r.length-1,c=r[o]+(s?0:(Rc(e,o)-.5)*.12),l=i[o]*(.85+Rc(e,o+12)*.15),u=(Rc(e,o+27)-.5)*.35,d=n?[[c,-1,-1],[c,l*.57,-.81+Rc(e,o+40)*.13],[c,l,u],[c,l*.65,.48+Rc(e,o+50)*.15],[c,-1,1]]:[[c,-.17,-1],[c,l*.42,-.59+Rc(e,o+40)*.14],[c,l,u],[c,l*.48,.54+Rc(e,o+50)*.13],[c,-.17,1]];for(let e of d)a.push(t===`x`?e:[e[2],e[1],-e[0]])}for(let t=0;t<r.length-1;t++)for(let n=0;n<4;n++){let r=t*5+n,i=r+5;(t+n+e)%2?o.push([r,r+1,i],[r+1,i+1,i]):o.push([r,r+1,i+1],[r,i+1,i])}return o.push([4,3,2,1,0],[40,41,42,43,44],[0,40,44,4]),Lc(a,o)}function Bc(e){let t=[],n=[];for(let n=0;n<3;n++)for(let r=0;r<7;r++){let i=r*Math.PI*2/7+.17,a=(n===2?.6:n===1?1:.85)*(.76+Rc(e,r)*.22),o=n===0?-1:n===1?-.12+Rc(e,r+9)*.28:.56+Rc(e,r+20)*.3;t.push([Math.cos(i)*a+(n===2?.12:0),o,Math.sin(i)*a-(n===2?.09:0)])}t.push([.1,1,-.12]);for(let e=0;e<2;e++)for(let t=0;t<7;t++){let r=e*7+t,i=e*7+(t+1)%7;n.push([r,r+7,i+7,i])}for(let e=0;e<7;e++)n.push([14+e,21,14+(e+1)%7]);return n.push([0,1,2,3,4,5,6]),Lc(t,n)}function Vc({artSample:e=!1,musicPreview:t=!1,extendedMusic:n=!1}={}){let r=new B;r.background=new Y(e?`#afcfdf`:`#d9ded8`),r.fog=new vn(e?`#d9d6c3`:`#d9ded8`,46,115);let i={sand:new fn({color:`#c9c4ae`,roughness:1}),dune:new fn({color:`#bcbba8`,roughness:1,flatShading:!0}),path:new fn({color:`#e3dcca`,roughness:1}),wall:new fn({color:`#e7e1d4`,roughness:.95}),stone:new fn({color:`#a3a79c`,roughness:.95,flatShading:!0}),beam:new fn({color:`#888b7e`,roughness:1}),roof:new fn({color:`#717e78`,roughness:1}),trim:new fn({color:`#c2ac8c`,roughness:.9}),green:new fn({color:`#8e9b82`,roughness:1,flatShading:!0}),dark:new fn({color:`#5c6e68`,roughness:.9}),cloth:new fn({color:`#ad7059`,roughness:1}),skin:new fn({color:`#cfb590`,roughness:1}),marker:new fn({color:`#c9a45f`,emissive:`#715628`,emissiveIntensity:.25,roughness:.6})};e&&(i.sand.color.set(`#dfbd83`),i.dune.color.set(`#cfa36b`),i.path.color.set(`#efd5a0`),i.wall.color.set(`#dfc5a1`),i.stone.color.set(`#ae8c68`),i.beam.color.set(`#714a36`),i.roof.color.set(`#557a72`),i.trim.color.set(`#b79052`),i.green.color.set(`#8a9b65`));let a=new Vt(1,1,1),o=new Be(1,e?3:1),s=new at(1,1,1,10),c=new Set([a,o,s]);function l(e,t,n,i,a,o=1,s=1,c=1,l=r){let u=new Z(e,t);return u.position.set(n,i,a),u.scale.set(o,s,c),u.castShadow=!0,u.receiveShadow=!0,l.add(u),u}function u(e,t,n,o,s,c,u=i.wall,d=r){return l(a,u,e,t,n,o,s,c,d)}function d(e,t,n){u(e,.14,t,.96,.28,.96,i.stone),l(s,i.beam,e,n/2+.28,t,.29,n,.29),u(e,n+.24,t,1,.28,.8,i.trim)}function f(e,t,n,r,a){u(e,n,t,r,.26,a,i.beam),u(e,n+.24,t,r+.6,.2,a+.6,i.roof),u(e,n+.51,t,r-.4,.34,a-.7,i.roof),u(e,n+.8,t,r-1.6,.25,a-2,i.roof),u(e,n+.99,t,r-3,.15,a-3.2,i.trim)}function p(e,t,n=1){l(s,i.beam,e,.9*n,t,.13*n,1.8*n,.13*n),l(o,i.green,e-.23*n,2.05*n,t,1*n,1.25*n,.85*n),l(o,i.green,e+.55*n,1.8*n,t+.18,.7*n,1*n,.75*n)}let m=u(n?25:0,-.22,-5,n?240:180,.4,180,i.sand);m.castShadow=!1,m.name=`world-ground`;let h=[],_=[];for(let e=0;e<Dn.length;e++){let{left:t,right:n}=Dn[e];if(h.push(t.x,.005,t.z,n.x,.005,n.z),e<Dn.length-1){let t=e*2;_.push(t,t+2,t+1,t+1,t+2,t+3)}}let y=new wt;c.add(y),y.setAttribute(`position`,new He(h,3)),y.setIndex(_),y.computeVertexNormals(),l(y,i.path,0,0,0).name=`courtyard-road`;for(let[e,n]of(t?[]:v).entries()){let t=zc(e,n.ridgeAxis);c.add(t),l(t,i.dune,n.x,n.y,n.z,n.radiusX,n.radiusY,n.radiusZ).name=n.id}for(let[e,n]of(t?[]:P).entries()){let t=Bc(e);c.add(t),l(t,i.stone,n.x,n.y,n.z,n.radiusX,n.radiusY,n.radiusZ).name=n.id}if(!e){u(-12,.015,-10.8,19.7,.05,25.5,i.path),u(-22,1.35,-11,.6,2.7,26),u(-2,1.35,-11,.6,2.7,26),u(-12,2.25,-24,20,4.5,.6);for(let e of[-18.5,-5.5])u(e,1.35,2,7,2.7,.6),u(e,2.77,2,7.2,.22,.9,i.trim);for(let e of[-15,-9])u(e,1.8,2,.9,3.6,1.2,i.stone),u(e,3.7,2,1.3,.18,1.5,i.trim);f(-12,2,4,7,3),u(-12,.07,-13.1,17,.14,1.4,i.stone),u(-12,.14,-18.5,17,.28,10,i.path),u(-20.5,2.7,-18.5,.6,5.4,11),u(-3.5,2.7,-18.5,.6,5.4,11),u(-12,2.7,-23.5,17,5.4,.6);for(let e of[-18,-6])for(let t of[-14,-20])d(e,t,4.8);u(-12,5.15,-14,17.5,.48,.65,i.beam),u(-12,5.15,-20,17.5,.48,.65,i.beam),u(-12,5.4,-18.5,17.5,.3,11,i.wall);for(let e=0;e<5;e++){let t=6.7-e*1.05,n=5.14-e*.07,r=e%2==0?i.trim:i.roof;u(-12,n,-18-t/2,t,.15,.25,r),u(-12,n,-18+t/2,t,.15,.25,r),u(-12-t/2,n,-18,.25,.15,t,r),u(-12+t/2,n,-18,.25,.15,t,r)}l(s,i.marker,-12,4.76,-18,.63,.12,.63),u(-12,6.2,-20.5,16,1.35,5.4);for(let e=-19;e<=-5;e+=2.8)u(e,6.75,-14,.24,2.4,.24,i.beam),u(e,6.17,-14,.8,.85,.14,i.trim);u(-12,6.7,-14,15,.16,.24,i.beam),f(-12,-18.5,7.95,18,12.3),u(-18,.9,-7.5,3.3,.22,1.4,i.beam);for(let e of[-19.3,-16.7])for(let t of[-8,-7])u(e,.46,t,.14,.9,.14,i.beam);for(let e=0;e<3;e++)l(s,i.trim,-19+e,1.1,-7.5,.18,.18,.18)}if(u(-4.4,1.35,-7.8,.35,2.7,3,i.roof),u(-4.61,1.5,-7.8,.04,1.6,2.4,i.trim),e||(p(-18,-2,.9),p(-6,-2,.85),p(-6,-11,.8),p(5,13,.65),p(-6,12,.65),p(7,3,.8),p(-27,-10,.9)),!e)for(let e=0;e<8;e++){let t=e%2==0?4.5:-4.5;l(o,i.stone,t,.16,26-e*1.7,.26,.25,.3)}if(!t){u(18,3.3,-18,14,6.6,12,i.wall),f(18,-18,6.7,15.5,13);for(let e=12;e<=24;e+=3)u(e,5.1,-11.94,1.5,2.3,.1,i.roof)}for(let[e,n]of(t?[]:g).entries()){let t=zc(e+31,`x`,!0);c.add(t),l(t,i.stone,n.x,n.y,n.z,n.radiusX,n.radiusY,n.radiusZ).name=n.id}let b=new K;e||r.add(b),l(s,i.cloth,0,1.03,0,.34,.72,.29,b);let x=l(o,i.skin,0,1.62,0,.23,.26,.23,b);l(s,i.dark,0,1.83,.01,.34,.12,.34,b),u(0,1.12,.27,.42,.56,.18,i.dark,b);let S=new K;S.position.set(-.15,.77,0),b.add(S);let C=new K;C.position.set(.15,.77,0),b.add(C),u(0,-.31,0,.18,.62,.21,i.dark,S),u(0,-.31,0,.18,.62,.21,i.dark,C);let w=new K;w.position.set(-.37,1.3,0),b.add(w);let T=new K;T.position.set(.37,1.3,0),b.add(T),u(0,-.23,0,.15,.48,.17,i.cloth,w),u(0,-.23,0,.15,.48,.17,i.cloth,T),u(-.13,1.35,.45,.16,.1,.55,i.trim,b);let E=new Le(e?`#fff2d7`:`#f6f1dc`,e?`#ab825a`:`#797d70`,e?1.65:2.3);r.add(E);let D=new Ue(`#fff2d6`,2.4);return D.position.set(-18,35,18),D.castShadow=!0,D.shadow.mapSize.set(e?2048:1024,e?2048:1024),D.shadow.camera.left=-40,D.shadow.camera.right=40,D.shadow.camera.top=40,D.shadow.camera.bottom=-40,D.shadow.camera.near=1,D.shadow.camera.far=100,D.shadow.normalBias=.04,D.shadow.bias=-2e-4,r.add(D),D.target.position.set(-4,0,-4),r.add(D.target),{scene:r,traveler:b,animateTraveler(e,t,n){let r=n?0:Math.min(1,e/3.2),i=Math.sin(t*(e>4?12:8))*.55*r;S.rotation.x=i,C.rotation.x=-i,w.rotation.x=-i*.7,T.rotation.x=i*.7,x.position.y=1.62+(n?0:Math.abs(Math.sin(t*8))*.02*r)},dispose(){for(let e of c)e.dispose();for(let e of Object.values(i))e.dispose();D.shadow.map?.dispose(),r.clear()}}}function Hc(e=Dn,t=!1){let n=new K;n.name=`preview-only-stone-paving`;let r=[`#c6b498`,`#d1bea0`,`#bcaa8d`,`#d8c7a9`].map(e=>new fn({color:e,roughness:1})),i=0,a=0;for(let o=1;o<e.length;o++){let s=e[o-1],c=e[o];if(i+=Math.hypot(c.center.x-s.center.x,c.center.z-s.center.z),i<.95||!t&&c.center.z<3)continue;i=0;let l=Math.atan2(c.center.x-s.center.x,c.center.z-s.center.z);for(let e=0;e<3;e++){let t=a++,i=new Re,o=[[-.43,-.39],[.26,-.44],[.43,-.24],[.39,.34],[-.24,.43],[-.45,.18]];for(let e=0;e<o.length;e++){let[n,r]=o[e],a=Math.sin(t*13.37+e*7.9)*.045;e?i.lineTo(n+a,r):i.moveTo(n+a,r)}i.closePath();let s=new Ie(i,{depth:.055,bevelEnabled:!0,bevelSegments:1,bevelSize:.025,bevelThickness:.015,steps:1});s.rotateX(-Math.PI/2);let u=new Z(s,r[t%r.length]),d=(e-1)*.98;u.position.set(c.center.x+Math.cos(l)*d,.012,c.center.z-Math.sin(l)*d),u.rotation.y=l+Math.sin(t*5.2)*.045,u.castShadow=!0,u.receiveShadow=!0,n.add(u)}}n.updateMatrixWorld(!0);let o=r.map(e=>({material:e,geometries:[]}));for(let e of n.children){let t=e;t.geometry.applyMatrix4(t.matrixWorld),o[r.indexOf(t.material)].geometries.push(t.geometry)}n.clear();for(let{material:e,geometries:t}of o){let r=dr(t);for(let e of t)e.dispose();if(r){let t=new Z(r,e);t.castShadow=!0,t.receiveShadow=!0,n.add(t)}}return n}function Uc(e){let t=new Set,n=new Set,r=new Set,i=new Set;e.traverse(e=>{if(e instanceof Z){t.add(e.geometry);for(let t of Array.isArray(e.material)?e.material:[e.material]){n.add(t);for(let e of Object.values(t))e instanceof q&&r.add(e)}e instanceof Ve&&i.add(e.skeleton)}});let a=new Set;for(let e of r)typeof ImageBitmap<`u`&&e.source.data instanceof ImageBitmap&&a.add(e.source.data),e.dispose();for(let e of a)e.close();for(let e of n)e.dispose();for(let e of t)e.dispose();for(let e of i)e.dispose();e.removeFromParent(),e.clear()}function Wc(e={}){let t=e.mogaoVersion===`v012`,n=t||e.mogaoVersion===`v011`,r=n||e.mogaoVersion===`v010`,i=r||e.mogaoVersion===`v009`,a=i||e.mogaoVersion===`v008`,o=a||e.mogaoVersion===`v007`,s=a?bs(i,t?xs:void 0):null,{MOGAO_LAYOUT:c,MOGAO_ROAD:l}=a?E:e.mogaoVersion===`v007`?d:e.mogaoVersion===`v006`?Wn:e.mogaoVersion===`v003`?fe:e.mogaoVersion===`v002`?Jn:Vn,u=e.musicVersion===`v005`||e.musicVersion===`v006`,f=e.musicVersion===`v004`||u,m=e.musicVersion===`v003`,h=e.musicVersion===`v002`||m||f,g=Vc({artSample:!0,musicPreview:e.musicPavilion,extendedMusic:h});if(e.mogao&&(g.scene.fog=null),o){let e=g.scene.getObjectByName(`world-ground`);e&&(e.position.set(65,-.22,-40),e.scale.set(520,.4,430))}let _=e.terrainVersion===`v001`&&e.environmentVersion===`v001`,v=e.terrainVersion===`v001`?jc(g.scene,_):null;_&&(g.scene.userData.environmentShadowBounds=new Yt(new X(-160,-10,-270),new X(815,175,400)));let y=!!v&&e.terrainCaissonVersion===`v001`,b=e.musicPavilion?(u?Cs:f?Qn:m?cs:h?ds:_s)(g.scene,!!e.flyingAwakened):null,C=f?M:m?Yn:h?Fn:le,w=new K;w.name=`traveler`,g.scene.add(w);let D=_?Rs(g.scene,w):null,O=_?tc():null;O&&g.scene.add(O.root);let ee=null,A=!1,te=null,ne=null,re=null,ae=null,oe=null,se=null,P=null,ce=null,F=null,ue=null,de=`Idle`,pe=null,me=null,I=[],ge=null,_e=[],ve=new It,ye=[],be=new Set,xe=[],Se=new Map,Ce=new Xn,we=new AbortController,R;function z(){if(!A){if(A=!0,D?.dispose(),O?.dispose(),ee?.dispose(),ee=null,ce?.dispose(),ce=null,b?.dispose(),clearTimeout(R),we.abort(),F&&ue&&(F.stopAllAction(),F.uncacheRoot(ue)),Se.clear(),F=null,ue=null,te?.dispose(),te=null,P?.dispose(),P=null,oe){let e=!1;for(let t of I)t.traverse(t=>{if(t instanceof Z)for(let n of Array.isArray(t.material)?t.material:[t.material])Object.values(n).includes(oe)&&(e=!0)});e||sr(oe),oe=null}for(let e of I)Uc(e);I.length=0;for(let e of be)e.dispose();be.clear(),xe.length=0,v?.dispose(),g.dispose()}}async function Ee(e){let t=new URL(Nt(e),document.baseURI),n=await fetch(t,{signal:we.signal});if(!n.ok)throw Error(`model-request-failed`);let r=await n.arrayBuffer();if(A||we.signal.aborted)throw Error(`model-request-cancelled`);let i=await Ce.parseAsync(r,new URL(`.`,t).href);if(A||we.signal.aborted)throw Uc(i.scene),Error(`model-decode-cancelled`);return I.push(i.scene),i}let B=_?Promise.all([`rocks.glb`,`caravan.glb`].map(e=>Ee(`environment-world/v001/${e}`))):Promise.resolve([]),De=Promise.all([Ee(v?Lt:Te.courtyard),Ee(e.travelerPath??Te.traveler),...e.sampleNature?[`tree-a`,`shrub-a`,`dunes`].map(e=>Ee(`environment-sample/v002/${e}.glb`)):[],...a?[`mogao/v008/mountain.glb`,`mogao/v008/interior.glb`,`mogao-massing/v003/tower.glb`,`mogao/v007/entry.glb`,`mogao/v008/buddha.glb`].map(e=>Ee(_&&e.endsWith(`/mountain.glb`)?`mogao-strata/v001/mountain.glb`:n&&(e.endsWith(`/entry.glb`)||e.endsWith(`/mountain.glb`))?`mogao/v011/${e.split(`/`).pop()}`:r&&(e.endsWith(`/entry.glb`)||e.endsWith(`/interior.glb`))?`mogao/v010/${e.split(`/`).pop()}`:i?e.replace(`mogao/v008/`,`mogao/v009/`):e)):e.mogaoVersion===`v007`?[`mogao-sandstone/v001/mountain.glb`,`mogao/v003/interior.glb`,`mogao-massing/v003/tower.glb`,`mogao/v007/entry.glb`].map(Ee):e.mogao?[`exterior`,`interior`].map(t=>Ee(`mogao/${t===`exterior`?e.mogaoFacadeVersion??e.mogaoSurfaceVersion??e.mogaoVersion??`v001`:e.mogaoVersion===`v006`?`v003`:e.mogaoVersion??`v001`}/${t}.glb`)):[],...v?x.map(e=>Ee(e.assetPath)):[],...v?[Ee(N.assetPath)]:[],...y?[Ee(or.asset)]:[]]),Oe=y?pr(new URL(Nt(or.centerPanel.texture),document.baseURI),we.signal).then(e=>{if(A)throw sr(e),Error(`caisson-image-load-cancelled`);return oe=e,e}):Promise.resolve(null),ke=Promise.all([De,Oe]).then(([e,t])=>{if(A)throw Error(`caisson-model-load-cancelled`);return t&&(ae=xr(e[e.length-1].scene,t),oe=null),e}),Ae=new Promise((e,t)=>{R=setTimeout(()=>t(Error(`model-loading-timeout`)),3e4)});function V(e,t){if(!v)return;let n=j(e,t.position);t.position.y+=k(n.x,n.z)-n.y,v.attachRegionObject(e,t)}let je=Promise.race([Promise.all([ke,b?.ready,v?.ready,B,O?.ready]),Ae]).then(([[t,n,i,d,p,m,b,x,S,E,...D],,,O])=>{if(A)return;for(let e of O)e.scene.traverse(e=>{e instanceof Z&&(e.castShadow=!0,e.receiveShadow=!0)}),g.scene.add(e.scene);let k=[`Idle`,`Walk`,`Run`];if(e.presentationClips&&k.push(`Greeting`,`HallLookUp`),u&&k.push(`LookAround`),k.some(e=>!n.animations.some(t=>t.name===e)))throw Error(`model-animation-incomplete`);for(let e of[t,n])e.scene.traverse(e=>{e instanceof Z&&(e.castShadow=!0,e.receiveShadow=!0)});if(t.scene.position.set(-12,0,2),v&&(ne=Nc(t.scene)),v&&(re=_r(t.scene)),v){let e=new Set;t.scene.traverse(t=>{let n=String(t.userData.semanticGroup??t.name);n.startsWith(`caisson-`)&&(t.visible=!1),n.startsWith(`hall-v003-`)&&e.add(n)}),se={asset:Lt,parts:[...e]}}if(g.scene.add(t.scene),e.sampleNature){g.scene.traverse(e=>{let t=String(e.userData.semanticGroup??e.name);/^(tree-|shrub-|road-grass|dune-|cliff-|boundary-)/.test(t)&&(e.visible=!1)});for(let e of[i,d,p])e.scene.traverse(e=>{e instanceof Z&&(e.castShadow=!0,e.receiveShadow=!0)}),g.scene.add(e.scene);if(h&&ye.push(i.scene),i.scene.position.set(h?3:4.8,0,h?5:13),d.scene.position.set(-2.9,0,16.2),V(`courtyard`,i.scene),v?v.placeOutdoorShrub(d.scene,`courtyard`):V(`courtyard`,d.scene),p.scene.position.set(e.mogao?215:h?105:55,0,e.mogao?24:h?0:12),p.scene.rotation.y=-Math.PI/2,v)p.scene.visible=!1;else{let e=Hc();I.push(e),g.scene.add(e)}if(e.musicPavilion){for(let[t,[n,r,a]]of[...C.trees,...e.mogao?c.routeTrees:[]].entries()){let e=t<C.trees.length?`music`:`cliff`,o=e===`music`?`music-tree-${t}`:`mogao-v8-tree-${t-C.trees.length}`,s=v?T[e]?.[o]:void 0,c=i.scene.clone(!0);c.name=o,c.position.set(s?.x??n,0,s?.z??r),c.scale.setScalar(a),g.scene.add(c),h&&ye.push(c),V(e,c)}for(let[t,[n,r,i]]of[...C.shrubs,...e.mogao?c.routeShrubs:[]].entries()){let e=t<C.shrubs.length?`music`:`cliff`,a=d.scene.clone(!0);a.name=`${e}-outdoor-shrub-${t}`,a.position.set(n,0,r),a.scale.setScalar(i),g.scene.add(a),v?v.placeOutdoorShrub(a,e):V(e,a)}let t=p.scene.clone(!0);if(t.position.set(h?20:0,0,-65),t.rotation.y=0,g.scene.add(t),v)t.visible=!1;else{let e=Hc((f?ie:h?zn:he).filter(e=>e.center.z>(f?2.8:h?-8.55:-2.55)),!0);I.push(e),g.scene.add(e)}}v?.addNatureTemplates(i.scene,d.scene)}if(e.mogao&&!v){let e=Hc(l,!0);I.push(e),g.scene.add(e)}if(e.mogao){_&&(ee=Hs(m.scene)),r&&(ge=E.scene,_e.push(b.scene,S.scene));for(let e of a?[m,b,x,S,E]:o?[m,b,x,S]:[m,b])e.scene.position.set(...c.origin),o&&e!==b&&e!==E&&(e.scene.position.y=0),e.scene.traverse(t=>{if(t instanceof Z&&(t.castShadow=!0,t.receiveShadow=!0,o&&e===m)){for(let e of Array.isArray(t.material)?t.material:[t.material])if(e instanceof fn)for(let t of[e.map,e.normalMap,e.roughnessMap,e.aoMap])t&&(t.anisotropy=8)}}),g.scene.add(e.scene),v?.attachRegionObject(`cliff`,e.scene),a&&(e===b||e===E)&&s?.addCave(e.scene)}if(v){te=Ic(D.slice(0,2).map(e=>e.scene)),g.scene.add(te.root);for(let e of te.trees){let t=[...new Set(e.meshes.flatMap(e=>Array.isArray(e.material)?e.material:[e.material]))];for(let e of t)e.transparent=!0;xe.push({bounds:e.worldBounds.clone().expandByScalar(.2),materials:t,opacity:1})}P=Pc(D[2].scene),g.scene.add(P.root);let e=[...new Set(P.meshes.flatMap(e=>Array.isArray(e.material)?e.material:[e.material]))];for(let t of e)t.transparent=!0;let n=P.worldBounds.clone().expandByScalar(.2);n.min.y=P.root.position.y+N.trunkBounds.max[1],xe.push({bounds:n,materials:e,opacity:1}),v.groundCourtyardAttachments(t.scene),v.attachRegionObject(`courtyard`,t.scene),y&&v.attachRegionObject(`courtyard`,D[D.length-1].scene);let r=g.scene.children.find(e=>e.name.startsWith(`music-pavilion-`));if(r){let e=r.children.find(e=>{let t=!1;return e.traverse(e=>{e.userData.semanticGroup===`high-drapery`&&(t=!0)}),t});if(!e)throw Error(`music-furnishing-model-missing`);ce=Fc(e),r.traverse(e=>{e.name===`accepted-central-dune`&&(e.visible=!1)}),v.attachRegionObject(`music`,r)}}t.scene.updateMatrixWorld(!0),t.scene.traverse(e=>{if(!(e instanceof Z)||e.userData.cameraRole!==`canopy`&&!e.name.includes(`-canopy`))return;let t=(Array.isArray(e.material)?e.material:[e.material]).map(e=>{be.add(e);let t=e.clone();return t.transparent=!0,t});e.material=Array.isArray(e.material)?t:t[0],xe.push({bounds:new Yt().setFromObject(e,!0).expandByScalar(.2),materials:t,opacity:1})});for(let e of ye){e.updateMatrixWorld(!0);let t=new Yt,n=new Map;e.traverse(r=>{if(!(r instanceof Z)||!r.name.includes(`-canopy-`))return;t.union(new Yt().setFromObject(r,!0));let a=(Array.isArray(r.material)?r.material:[r.material]).map(t=>{if(!n.has(t)){let r=t.clone();r.transparent=!0,n.set(t,r),be.add(t),e!==i.scene&&be.add(r)}return n.get(t)});r.material=Array.isArray(r.material)?a:a[0]}),t.isEmpty()||xe.push({bounds:t.expandByScalar(.2),materials:[...n.values()],opacity:1})}ue=n.scene,w.add(ue),F=new Rt(ue);for(let e of k)Se.set(e,F.clipAction(n.animations.find(t=>t.name===e)));if(Se.get(`Idle`).play(),F.update(0),o){let e=w.position.clone();w.position.set(0,0,0),w.updateMatrixWorld(!0),ue.updateMatrixWorld(!0);let t=new Yt().setFromObject(ue,!0),n=1.8/(t.max.y-t.min.y);ue.scale.multiplyScalar(n),ue.position.y-=t.min.y*n,ue.updateMatrixWorld(!0),pe=new Yt().setFromObject(ue,!0).getSize(new X).y,w.position.copy(e),w.updateMatrixWorld(!0)}s?.addTraveler(n.scene),clearTimeout(R)}).catch(()=>{throw z(),Error(`美术模型加载失败。请重新加载，或直接选择文化主题。`)});return{scene:g.scene,traveler:w,ready:je,music:b,animationName:()=>de,animatePresentation(e,t){if(!F)return;let n=Se.get(e);if(!n)throw Error(`Required character presentation clip is missing`);de!==e&&(F.stopAllAction(),n.reset().setLoop(Ut,1).play(),n.clampWhenFinished=!0,de=e),n.setEffectiveWeight(1),n.setEffectiveTimeScale(0),n.time=Math.min(t,n.getClip().duration),F.update(0)},inspectInterior:()=>s?.inspect(),prepareEnvironment:D?async(e,t)=>{D.updateTraveler(w.position),await D.prepare(e,t)}:void 0,updateTerrain:(e,t)=>{v?.update(e,t),D?.updateTraveler(w.position)},inspectTerrain:()=>v?{...v.inspect(),lighting:D?.inspect(),rockFinish:ee?.inspect(),bactrianCaravans:O?.inspect(),towerTrees:te?.inspect(),courtyardExpansion:ne,courtyardShadows:re,caisson:ae,squareHall:se,musicTree:P?.inspect(),musicFurniture:ce?.inspect()}:void 0,buddhaVisibleAtCenter(e){if(!ge)return!1;ve.setFromCamera(new an(0,0),e);let t=ve.intersectObject(ge,!0)[0];if(!t)return!1;let n=ve.intersectObjects(_e,!0)[0];return!n||n.distance>t.distance},inspectTraveler(){let e=[];return w.updateMatrixWorld(!0),w.traverse(t=>{t instanceof yt&&/(?:Head|RightHand|RightForeArm|Neck)$/.test(t.name)&&e.push({name:t.name,position:t.getWorldPosition(new X).toArray()})}),{visible:w.visible,restHeight:pe,animation:de,time:Se.get(de)?.time??0,joints:e}},updateCameraVisibility(n,r,i,l){if(h&&!D){let e=g.scene.children.find(e=>e instanceof Ue);if(e){if(v){let t=n.x>300,r=t?3:2;mr(e,new X(n.x,k(n.x,n.z),n.z),{extent:t?95:65,offset:new X(-14,35,22).multiplyScalar(r),near:1,far:t?250:180,bias:t?-3e-4:-2e-4,normalBias:t?.14:.04})}else{let t=Math.round(n.x*25.6)/25.6,r=Math.round(n.z*25.6)/25.6,i=o&&t>74,a=i?3:1,s=i?95:40;e.target.position.set(t,0,r),e.position.set(t-14*a,35*a,r+22*a),e.shadow.camera.right!==s&&(Object.assign(e.shadow.camera,{left:-s,right:s,top:s,bottom:-s,far:i?250:100}),e.shadow.camera.updateProjectionMatrix()),e.shadow.normalBias=i?.14:.04,e.shadow.bias=i?-3e-4:-2e-4}}}let u=t?w.position:r,d=v?p(`cliff`,u):u;if(s?.update(new X(d.x,d.y,d.z),i,l),e.mogao&&!a){let e=g.scene.children.find(e=>e instanceof Le),t=n.x>110&&n.x<134?Et.smoothstep(-n.z,68,68+c.room.front+5):0;e&&(e.intensity=Et.lerp(1.65,1.15,t))}let f=r.clone().sub(n),m=f.length();a&&(w.visible=m>(w.visible?2.35:2.65));let _=new Xe(n,f.normalize()),y=new X;for(let e of xe){let t=_.intersectBox(e.bounds,y),a=e.bounds.containsPoint(r)||t&&n.distanceTo(y)<m+.3?.12:1;e.opacity=l?a:Et.lerp(e.opacity,a,1-Math.exp(-i*14));for(let t of e.materials)t.opacity=e.opacity,t.depthWrite=e.opacity>.98}},animateTraveler(t,n,r){let i=me===null?0:Math.min(.05,Math.max(0,n-me));if(me=n,!F)return;let a=r||t<.05?`Idle`:t>4?`Run`:`Walk`;if(a!==de){let e=Se.get(de),t=Se.get(a);t.reset().play(),r?(e.stop(),t.setEffectiveWeight(1)):e.crossFadeTo(t,.18,!1),de=a}let o=a===`Walk`?e.animationRates?.walk??1.5:e.animationRates?.run??1.25,s=a===`Walk`?o*t/S:a===`Run`?o*t/L:1,c=e.animationRates?o*1.8:1.8;Se.get(a).setEffectiveTimeScale(a===`Idle`?1:Et.clamp(s,.35,c)),F.update(r?0:i)},dispose:z}}function Gc(e,t,n,r){let i=new Set,a=!0,o=!1,s=0,c={x:0,y:0},l=new Set([`KeyW`,`KeyA`,`KeyS`,`KeyD`,`ArrowUp`,`ArrowLeft`,`ArrowDown`,`ArrowRight`,`ShiftLeft`,`ShiftRight`,`KeyQ`,`KeyE`,`KeyF`]),u=e=>e instanceof Element&&!!e.closest(`input, textarea, select, [contenteditable=true], dialog, [role=dialog]`);function d(){i.clear(),o=!1,c={x:0,y:0}}function f(n){u(n.target)||(l.has(n.code)&&r?.(),a&&(l.has(n.code)&&n.preventDefault(),(n.code===`KeyF`||n.code===`Enter`&&n.target===e)&&!n.repeat&&t(),i.add(n.code)))}function p(e){i.delete(e.code)}function m(t){a&&t.button===2&&(r?.(),o=!0,s=t.clientX,e.setPointerCapture(t.pointerId))}function h(e){a&&o&&(n((e.clientX-s)*-.004),s=e.clientX)}function g(){o=!1}function _(e){e.preventDefault()}return window.addEventListener(`keydown`,f),window.addEventListener(`keyup`,p),window.addEventListener(`blur`,d),e.addEventListener(`pointerdown`,m),e.addEventListener(`pointermove`,h),e.addEventListener(`pointerup`,g),e.addEventListener(`pointercancel`,g),e.addEventListener(`lostpointercapture`,g),e.addEventListener(`contextmenu`,_),{clear:d,setEnabled(e){a=e,d()},setJoystick(e,t){Math.hypot(e,t)>.08&&r?.(),a&&(c={x:Math.max(-1,Math.min(1,e)),y:Math.max(-1,Math.min(1,t))})},read(){let e=Number(i.has(`KeyD`)||i.has(`ArrowRight`))-Number(i.has(`KeyA`)||i.has(`ArrowLeft`)),t=Number(i.has(`KeyS`)||i.has(`ArrowDown`))-Number(i.has(`KeyW`)||i.has(`ArrowUp`)),n=e!==0||t!==0;return{x:n?e:c.x,y:n?t:c.y,run:n?i.has(`ShiftLeft`)||i.has(`ShiftRight`):Math.hypot(c.x,c.y)>.82,camera:Number(i.has(`KeyQ`))-Number(i.has(`KeyE`))}},dispose(){d(),window.removeEventListener(`keydown`,f),window.removeEventListener(`keyup`,p),window.removeEventListener(`blur`,d),e.removeEventListener(`pointerdown`,m),e.removeEventListener(`pointermove`,h),e.removeEventListener(`pointerup`,g),e.removeEventListener(`pointercancel`,g),e.removeEventListener(`lostpointercapture`,g),e.removeEventListener(`contextmenu`,_)}}}function Kc(t,n){let o=!1,l=!1,u=!1,f=!1,g=`follow`,v=n.terrainVersion===`v001`,x=!1,T=n.reducedMotion,O=!!n.mogao,k=n.mogaoVersion===`v002`,te=n.mogaoVersion===`v003`,j=n.mogaoVersion===`v006`,ne=n.mogaoVersion===`v007`,N=n.mogaoVersion===`v011`||n.mogaoVersion===`v012`,ie=N||n.mogaoVersion===`v010`,P=ie||n.mogaoVersion===`v009`,le=P||n.mogaoVersion===`v008`,F=P?Go():null,pe=Number.isFinite(n.initialLook)?Et.clamp(n.initialLook,cr,lr):0,me=pe,I=new X,{MOGAO_LAYOUT:he,MOGAO_PLAYER_COLLIDERS:_e,mogaoSurfaceHeight:ve,nearDeerWall:ye,mogaoLocation:Ce,inMogaoRoom:we}=N?m:le?E:ne?d:j?Wn:te?fe:k?Jn:Vn,R=(e,t)=>v?p(e,t):t,Te=e=>we(R(`cliff`,e)),z=!!n.musicPavilion,Ee=z&&n.musicVersion===`v006`,B=z&&(n.musicVersion===`v005`||Ee),De=z&&(n.musicVersion===`v004`||B),Oe=z&&n.musicVersion===`v003`,ke=z&&(n.musicVersion===`v002`||Oe||De),Ae=ke?ps():null,V=ke?fs:C,je=v?Se:O?he.bounds:De?M.bounds:Oe?Yn.bounds:ke?Fn.bounds:void 0,Me=v?y:O?_e:De?be:Oe?Nn:ke?kn:de,Ne=De?er:Oe?ss:ke?us:gs,Pe=Ee?is:De?ae:ke?jn:re,Fe=e=>v?yr(`music`,Ne(e)):Ne(e),Ie=e=>Pe(R(`music`,e)),Le=v?ur(n.terrainCaissonVersion===`v001`):O?(N?Sr:le?wr:ne?Zn:j?Ko:te?nr:k?Qo:es)():z?De?fr():Oe?os():ke?ls():hs():void 0,Re=e=>v?_(e):O?n.mogaoSurfaceVersion===`v004`?Xo(e):ve(e):ce(e)+(z?(De?oe:ke?Bn:ge)(e):0),ze=(e,t,n,r)=>v?ir(e,t,n,r,Le):O?(N?Tr:le?tr:ne?Cr:j?qo:te?$n:k?$o:ts)(e,t,n,r,Le):ht(e,t,n,r,Le),H={...n.initial,position:v?se(n.initial.position):b(n.initial.position,z?Me:void 0,je),cameraYaw:V(n.initial.cameraYaw),visitedEvents:[...n.initial.visitedEvents]},Be=!1,Ve=0,He=0,Ue=0,We=0,Ke=-1/0,qe=!1,Je=new Io({antialias:!0,alpha:!1,powerPreference:`high-performance`,logarithmicDepthBuffer:v});Je.setPixelRatio(Math.min(window.devicePixelRatio||1,window.matchMedia(`(pointer: coarse)`).matches?1.5:2)),Je.shadowMap.enabled=!0,Je.shadowMap.type=1,Je.outputColorSpace=nt,Je.toneMapping=4,Je.toneMappingExposure=1.08;let Ye=Je.domElement;Ye.tabIndex=0,Ye.setAttribute(`aria-label`,`3D探索画面，WASD或方向键移动，F键互动`),Ye.dataset.worldCanvas=`true`,Ye.style.display=`block`,Ye.style.width=`100%`,Ye.style.height=`100%`;let Xe=!!n.cinematics||z,Ze=!v&&n.cinematics?En(n.cinematics.seen,n.cinematics.onSeen):null,Qe=!1,$e=H.heading,et=!1,U=Wc(Xe?{travelerPath:`traveler-tripo/v002/traveler.glb`,animationRates:{walk:S/1.20591,run:L/4.3949},presentationClips:!0,sampleNature:!0,terrainVersion:n.terrainVersion,environmentVersion:n.environmentVersion,terrainCaissonVersion:n.terrainCaissonVersion,mogao:O,mogaoVersion:n.mogaoVersion,mogaoSurfaceVersion:n.mogaoSurfaceVersion,mogaoFacadeVersion:n.mogaoFacadeVersion,musicPavilion:z,musicVersion:n.musicVersion,flyingAwakened:H.visitedEvents.includes(`flying`)}:void 0),tt=[...r.filter(e=>!e.id?.startsWith(`tree-`)),{id:`sample-tree-a`,minX:3.79,maxX:5.81,minZ:11.99,maxZ:14.01,height:2.1,circle:{x:4.8,z:13,radius:1.01}}],rt=z?Me:Xe?tt.map(e=>({...e,minX:e.minX-.21,maxX:e.maxX+.21,minZ:e.minZ-.21,maxZ:e.maxZ+.21,...e.circle?{circle:{...e.circle,radius:e.circle.radius+.21}}:{}})):r,W=new Ge(49,1,.1,v?1400:O?450:150),it=new X,at=ze(H.position.x,Re(H.position),H.position.z,H.cameraYaw);W.position.copy(at.position),it.copy(at.target),W.lookAt(it);let ot=()=>Uo(v?gr(W,`cliff`):W),G=Gc(Ye,()=>{l&&!f&&g===`follow`&&n.onInteract()},e=>At(e),()=>{Qe=!0,bt()});G.setEnabled(!1),t.appendChild(Ye);let st=ke?Bo(n.sound??Gn(),v?Vo:De?M.audio:void 0):null,K=B?as(R(`music`,H.position),Ee,v?Ho:void 0,v?{useAudiblePlayback:!0,hearingDuration:2.5}:void 0):null,ct=B?{music:ms(new Audio(Nt(ns.music.audioPath)),n.sound??Gn()),mural:ms(new Audio(Nt(ns.mural.audioPath)),n.sound??Gn())}:null;st?.setEnabled(v||!K||K.musicHeard);let lt=n.flyingVoice?ms(An.audioPath?new Audio(Nt(An.audioPath)):null,n.sound??Gn()):null,ut=ie?Wo():null,dt=0,ft=!1,q=ie?ms(new Audio(Nt(Sn.audioPath)),n.sound??Gn()):null,pt=Tn(()=>!K?.state||f||g!==`follow`?!1:(J(),!0));function mt(){let e=K?.state?.id;return e?ct?.[e]:void 0}function J(){mt()?.exit(),K?.skip(),G.setEnabled(l&&!f&&g===`follow`),Ae?.reset(),Be=!1,vt()}function Y(e){ct?.music.setBlocked(e),ct?.mural.setBlocked(e)}function gt(){if(!l||F?.phase===`waiting`)return null;let e=H.position;if(z&&Ie(e)&&(!K||K.muralReady))return`flying`;let t=R(`courtyard`,e);return!v&&Math.hypot(t.x+12,t.z+17)<2.6?`caisson`:le?w(R(`cliff`,e)):(O?ye(e):Math.hypot(e.x+5,e.z+6)<2.25)?`story-demo`:null}function _t(){let e=H.position,t=(v?Te(e)?`石窟内`:h(e)===`courtyard`?`纹彩院 · 山腰`:h(e)===`music`?`月牙泉 · 乐舞坊`:h(e)===`cliff`?`崖前古道`:e.x<92?`沙丘坡脊`:e.x<160?`下坡古道`:`月牙谷地`:null)??(O?Ce(e):null)??(e.x<-2&&e.x>-22&&e.z<2&&e.z>-24?e.z<-12.3?`藻井观赏厅`:`纹彩院`:z&&(De?ue(e):Oe?Ln(e):ke?Rn(e):e.x>8&&e.x<28&&e.z<-2&&e.z>-23)?`乐舞馆`:e.z<-25?`洞窟远景 · 待制作`:!z&&e.x>10&&e.z<-8?`乐舞馆远景 · 待制作`:`沙漠道路`);return{checkpoint:{...H,position:{...e},visitedEvents:[...H.visitedEvents]},nearby:x?null:gt(),location:t,moving:Be,overview:x,observationTime:We,caveLook:me,buddhaVoice:q?.inspect(),hallArrival:F?.phase,encounter:K?.state,encounterVoice:mt()?.inspect(),cinematic:Ze?.state??null,flying:U.music?.inspect(),musicAudio:st?.inspect(),flyingVoice:lt?.inspect()}}function vt(){n.onSnapshot(_t())}function yt(e){U.traveler.position.set(H.position.x,Re(H.position),H.position.z);let t=Ze?.state;U.traveler.rotation.y=t?.id===`opening`?xn(t.time):H.heading;let n=K?.state;n&&!T?U.animatePresentation(n.id===`music`?`LookAround`:`HallLookUp`,n.id===`music`?3.5+Math.min(1,n.time/2.8)*8.4:Math.min(n.time,2.25)):t?.id===`opening`&&t.time<1.75?U.animatePresentation(`Greeting`,t.time):t?.id===`hall`?U.animatePresentation(`HallLookUp`,t.time):U.animateTraveler(e,Ue,T),Ye.dataset.animation=U.animationName()}function bt(){Ze?.state?(Ze.skip(),et=!0,l&&(yt(0),xt(),Tt(),vt())):Ze?.skip()}function xt(){let e=ze(H.position.x,Re(H.position),H.position.z,H.cameraYaw);W.position.copy(e.position),it.copy(e.target),W.lookAt(it),et=!1}function St(){Ve&&cancelAnimationFrame(Ve),Ve=0,He=0}function Ct(){return l&&!o&&!u&&!f&&!document.hidden&&g!==`story`}function wt(){Ct()&&!Ve&&(Ve=requestAnimationFrame(Ot))}function Tt(){if(!(o||u))try{Je.render(U.scene,W)}catch{Dt(`3D画面绘制失败。可以重新加载，或直接选择文化主题。`)}}function Dt(e){o||u||(u=!0,Be=!1,q?.setBlocked(!0),Y(!0),lt?.setBlocked(!0),st?.setDucked(!1),st?.setBlocked(!0),St(),G.setEnabled(!1),U.dispose(),Je.renderLists.dispose(),vt(),n.onError(e))}function Ot(t){if(Ve=0,!Ct())return;let r=He?Math.min((t-He)/1e3,.05):0;if(He=t,Ue+=r,g!==`follow`&&(We+=r),g===`follow`&&F){let e=F.phase;F.update(Te(H.position)&&(e!==`outside`||R(`cliff`,H.position).z<=-76.5),r),e!==F.phase&&(e===`waiting`||F.phase===`waiting`)&&(G.setEnabled(F.phase!==`waiting`),Ae?.reset())}let o=Be,u=0;if(g===`follow`&&!x&&!K?.state&&F?.phase!==`waiting`){let t=G.read();(t.camera||t.x||t.y)&&F?.dismiss(),t.camera&&Ae?.manual(),H.cameraYaw=V(H.cameraYaw+t.camera*r*.65);let n=Ae?Ae.vector(t.x,t.y,H.cameraYaw,r):i(t.x,t.y,H.cameraYaw),o=v?t.run?7:s:Xe?t.run?4.4:1.8:t.run?L:S,l={x:n.x*o*r,z:n.z*o*r},d=v?e(H.position,l):le?c(H.position,l):ne?A(H.position,l):a(H.position,l,rt,je),f=Math.hypot(d.x-H.position.x,d.z-H.position.z);if(u=r?f/r:0,u>.05){let e=Math.atan2(-n.x,-n.z),t=Math.atan2(Math.sin(e-H.heading),Math.cos(e-H.heading));H.heading+=t*(T?1:1-Math.exp(-r*15))}H.position=d,Be=u>.05,Ae&&(H.cameraYaw=Ae.yaw(H.cameraYaw,H.heading,Be,r,T))}else Be=!1;if(K&&g===`follow`&&!x){let e=K.state,t=mt()?.inspect(),n=Ee?!!t?.ended:!t||t.ended||t.status===`missing`||t.status===`error`||t.status===`blocked`;K.update(R(`music`,H.position),r,n,v?st?.inspect():void 0);let i=K.state;i&&!e?(Ze?.skip(),G.setEnabled(!1),Ae?.reset(),u=0,Be=!1,ct?.[i.id].enter()):e&&!i&&(ct?.[e.id].exit(),G.setEnabled(l&&!f),Ae?.reset()),i&&(u=0,Be=!1,mt()?.update(i.time>=(i.id===`music`?.35:.1))),st?.setEnabled(v||K.musicHeard)}let d=Ze?.state;if(Ze&&g===`follow`&&!K?.state&&F?.phase!==`waiting`){let e=G.read(),t=Math.hypot(e.x,e.y)>.01||e.camera!==0,n=gt()===`caisson`,i=n&&!Ze.seen.hall&&!!wn(`hall`,0,H.position,Re(H.position),H.heading,H.cameraYaw);Ze.update(r,n,t,T,i);let o=Ze.state;if(o&&!d&&($e=H.heading),o?.id===`opening`){let e=Cn(o.time)-Cn(d?.time??0),t=a(H.position,{x:0,z:-e},rt,je);u=r?Math.hypot(t.x-H.position.x,t.z-H.position.z)/r:0,H.position=t,Be=u>.05}o&&o.time>=o.duration&&(Ze.finish(),et=!0)}U.music?.update(r,T),lt?.update(g===`flying`&&(B?!!U.music?.inspect().complete:(U.music?.inspect().time??0)>=An.startAt)),st?.setDucked(!!lt?.inspect().playing||!!mt()?.inspect().playing||!!q?.inspect().playing),st?.update(R(`music`,H.position),H.cameraYaw-(v?D.music.yaw:0)),U.music?.inspect().awakened&&!H.visitedEvents.includes(`flying`)&&H.visitedEvents.push(`flying`),yt(u),U.updateTerrain?.(r,T);let p=x?n.environmentVersion?br:hr:g===`caisson`?v?yr(`courtyard`,Qt()):Qt():g===`flying`?Fe(W.aspect):ze(H.position.x,Re(H.position),H.position.z,H.cameraYaw),m=T?1:1-Math.exp(-r*(g===`caisson`?2:10));if(g===`follow`?it.copy(p.target):it.lerp(p.target,m),W.position.lerp(p.position,m),g===`follow`&&!x){let e=Le?.subjectHeight===void 0?void 0:new X(H.position.x,Re(H.position)+Le.subjectHeight,H.position.z);W.position.copy(v&&Le&&e?vr(it,W.position,p.position,Le,e,h(H.position)===`cliff`):N&&Le&&e?ar(it,W.position,p.position,Le,e):qt(it,W.position,p.position,Le,e))}let _=Ze?.state;if(_){let e=wn(_.id,_.time,H.position,Re(H.position),$e,H.cameraYaw);e?(W.position.copy(e.position),it.copy(e.target)):(Ze?.skip(),et=!0)}if(et&&g===`follow`&&!x&&xt(),U.updateCameraVisibility(it,W.position,r,T),N||O&&Te(H.position)||(me=0,pe=0),pe=Et.lerp(pe,me,T?1:1-Math.exp(-r*7)),I.copy(!x&&g===`follow`&&(N||O&&Te(H.position))?(N?rr:Zo)(W.position,it,pe):it),W.lookAt(I),ut&&q){let e=Te(H.position),t=g===`follow`&&F?.phase!==`waiting`&&!K?.state&&!Ze?.state&&!x&&ot();dt-=r,t?!ut.inspect().seen&&dt<=0&&(ft=!!U.buddhaVisibleAtCenter?.(W),dt=.2):(ft=!1,dt=0),ut.update(e,t&&ft,r)&&(q.enter(),q.update(!0)),!e&&q.inspect().active&&q.exit(),st?.setDucked(!!lt?.inspect().playing||!!mt()?.inspect().playing||q.inspect().playing)}qe=W.position.distanceToSquared(p.position)<2e-5&&it.distanceToSquared(p.target)<2e-5,Tt(),(t-Ke>100||Be!==o)&&(Ke=t,vt()),g===`caisson`&&qe&&We>3.2||wt()}function kt(){if(o)return;let e=Math.max(1,t.clientWidth),n=Math.max(1,t.clientHeight);Je.setSize(e,n,!1),W.aspect=e/n,W.updateProjectionMatrix(),Tt()}function At(e){!l||f||x||g!==`follow`||o||K?.state||F?.phase===`waiting`||(F?.dismiss(),bt(),Ae?.manual(),H.cameraYaw=V(H.cameraYaw+e),wt())}function jt(){q?.setBlocked(document.hidden||f||g!==`follow`),Y(document.hidden||f||g!==`follow`),G.clear(),Ae?.reset(),lt?.setBlocked(document.hidden||f||g!==`flying`),st?.setDucked(!!lt?.inspect().playing||!!mt()?.inspect().playing||!!q?.inspect().playing),st?.setBlocked(document.hidden||f||g===`story`),Be=!1,He=0,document.hidden?(bt(),St(),vt()):wt()}function Mt(e){e.preventDefault(),Dt(`浏览器暂停了3D画面。请重新加载，或直接选择文化主题。`)}let Pt=()=>{q?.setBlocked(!0),Y(!0),bt(),G.clear(),Ae?.reset(),lt?.setBlocked(!0),st?.setDucked(!1),st?.setBlocked(!0)};window.addEventListener(`blur`,Pt),ie&&window.addEventListener(`focus`,jt);let Ft=new ResizeObserver(kt);return Ft.observe(t),document.addEventListener(`visibilitychange`,jt),Ye.addEventListener(`webglcontextlost`,Mt),yt(0),kt(),vt(),U.ready.then(async()=>{if(o||u||(await U.prepareEnvironment?.(Je,W),o||u))return;l=!0,G.clear(),G.setEnabled(l&&!f&&!x&&g===`follow`&&!K?.state&&F?.phase!==`waiting`),yt(0);let e=ze(H.position.x,Re(H.position),H.position.z,H.cameraYaw);if(W.position.copy(e.position),it.copy(e.target),W.lookAt(it),U.updateCameraVisibility(it,W.position,0,!0),Ze?.opening(Math.hypot(H.position.x-xe.x,H.position.z-xe.z)<.5,T,Qe||f),$e=H.heading,Ze?.state){yt(0);let e=wn(`opening`,0,H.position,Re(H.position),H.heading,H.cameraYaw);e?(W.position.copy(e.position),it.copy(e.target),W.lookAt(it)):Ze?.skip()}Tt(),!u&&(vt(),n.onReady?.(),wt())}).catch(e=>{Dt(e instanceof Error?e.message:`美术模型加载失败。请重新加载，或直接选择文化主题。`)}),{snapshot:_t,skipCinematic:bt,setOverview(e){if(v&&l&&g===`follow`&&!f){if(x=e,G.clear(),G.setEnabled(!x),Be=!1,Ae?.reset(),x){me=0,pe=0;let e=n.environmentVersion?br:hr;W.position.copy(e.position),it.copy(e.target),W.lookAt(it)}else xt();U.updateCameraVisibility(it,W.position,0,!0),Tt(),vt(),wt()}},setSound:e=>{q?.setPreferences(e),ct?.music.setPreferences(e),ct?.mural.setPreferences(e),lt?.setPreferences(e),st?.setPreferences(e),st?.setDucked(!!lt?.inspect().playing||!!mt()?.inspect().playing||!!q?.inspect().playing)},skipBuddhaVoice:()=>{q?.skip(),vt()},retryBuddhaVoice:()=>{q?.retry(),vt()},skipVoice:()=>{lt?.skip(),vt()},skipEncounter:J,retryEncounter:()=>mt()?.retry(),retryVoice:()=>lt?.retry(),retrySound:()=>st?.retry(),recordingAudio:()=>st?.recordingStream()??null,captureFrame(){if(!(o||!l||u)){Tt();try{return Ye.toDataURL(`image/jpeg`,.75)}catch{return}}},replayObservation(){g===`flying`&&(U.music?.replay(),lt?.enter(),st?.setDucked(!1),vt(),wt())},inspect:()=>({..._t(),view:g,paused:f,loaded:l,camera:{position:W.position.toArray(),target:(pe?I:it).toArray()},buddhaGaze:ut?.inspect(),buddhaInView:ie?ot():void 0,landmarkSight:!v&&U.music&&`auditSight`in U.music?U.music.auditSight(W):void 0,traveler:U.inspectTraveler(),interiorLighting:U.inspectInterior?.(),terrain:v?{logarithmicDepth:Je.capabilities.logarithmicDepthBuffer,height:Re(H.position),region:h(H.position),cameraClearance:W.position.y-_(W.position),overview:x,scene:U.inspectTerrain?.()}:void 0,seen:Ze?.seen,stats:{triangles:Je.info.render.triangles,calls:Je.info.render.calls}}),setPaused(e){o||f===e||(e&&bt(),f=e,q?.setBlocked(f||document.hidden||g!==`follow`),Y(f||document.hidden||g!==`follow`),Ae?.reset(),lt?.setBlocked(f||document.hidden||g!==`flying`),st?.setDucked(!!lt?.inspect().playing||!!mt()?.inspect().playing||!!q?.inspect().playing),st?.setBlocked(f||document.hidden||g===`story`),G.setEnabled(l&&!f&&!x&&g===`follow`&&!K?.state&&F?.phase!==`waiting`),Be=!1,He=0,f?St():wt(),vt())},setView(e){if(o||g===e)return;q?.exit(),K?.state&&J(),bt(),e===`caisson`&&Ze?.skipHall();let t=g===`flying`;if(t&&(U.music?.exit(),lt?.exit(),st?.setDucked(!1)),e===`flying`){U.music?.update(0,T),U.music?.enter(),lt?.enter();let e=Fe(W.aspect);W.position.copy(e.position),it.copy(e.target),W.lookAt(it)}g=e,x=!1,We=0,q?.setBlocked(f||document.hidden||g!==`follow`),Y(f||document.hidden||g!==`follow`),Ae?.reset(),lt?.setBlocked(f||document.hidden||g!==`flying`),st?.setBlocked(f||document.hidden||g===`story`),e===`follow`&&t&&xt(),G.setEnabled(l&&!f&&!x&&g===`follow`&&!K?.state&&F?.phase!==`waiting`),Be=!1,qe=!1,He=0,g===`story`?(St(),yt(0),Tt()):wt(),vt()},setJoystick(e,t){l&&G.setJoystick(e,t)},turnCamera:At,chooseHallDirection(e){F?.phase!==`guidance`||f||g!==`follow`||(F.dismiss(),Ae?.manual(),G.clear(),H.cameraYaw=(e===`left`?Math.PI/2:e===`right`?-Math.PI/2:0)+(v?D.cliff.yaw:0),me=e===`up`?1.05:0,wt(),vt())},tiltCamera(e){l&&!f&&!x&&g===`follow`&&(N||O&&Te(H.position))&&F?.phase!==`waiting`&&(F?.dismiss(),me=Et.clamp(me+e,N?cr:0,lr),wt(),vt())},resetCameraLook(){F?.dismiss(),me=0,wt(),vt()},setReducedMotion(e){T=e,e&&bt(),wt()},resetToStart(){N&&(me=0,pe=0),q?.exit(),ut?.update(!1,!1,0),mt()?.exit(),K?.reset(),st?.setEnabled(v||!K),bt(),U.music?.exit(),lt?.exit(),st?.setDucked(!1),Ae?.reset();let e=v?ee:xe,t=v?D.courtyard.yaw:0;H={...H,position:{...e},heading:t,cameraYaw:t},x=!1,g=`follow`,G.setEnabled(l&&!f),Be=!1;let n=ze(e.x,Re(e),e.z,t);W.position.copy(n.position),it.copy(n.target),W.lookAt(it),yt(0),Tt(),vt(),wt()},dispose(){o||(o=!0,q?.dispose(),pt(),ct?.music.dispose(),ct?.mural.dispose(),lt?.dispose(),st?.dispose(),St(),G.dispose(),Ft.disconnect(),window.removeEventListener(`blur`,Pt),ie&&window.removeEventListener(`focus`,jt),document.removeEventListener(`visibilitychange`,jt),Ye.removeEventListener(`webglcontextlost`,Mt),U.dispose(),Je.renderLists.dispose(),Je.dispose(),Je.forceContextLoss(),Ye.remove())}}}export{Kc as createWorldRuntime};