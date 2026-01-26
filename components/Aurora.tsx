import React, { useEffect, useRef } from "react";

interface AuroraProps {
  colorStops?: string[]; // 顏色
  amplitude?: number;    // 流動幅度
  speed?: number;        // 流動速度
}

const Aurora: React.FC<AuroraProps> = ({
  // 這是你指定的 Kaguya 專屬配色
  colorStops = ["#5227FF", "#ff0ab1", "#0537ff"], 
  amplitude = 1.0,
  speed = 0.5,
}) => {
  const ctnDom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;

    // 1. 建立畫布 (Canvas)
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // 設定畫布填滿容器
    const resize = () => {
      if (!ctn) return;
      canvas.width = ctn.offsetWidth;
      canvas.height = ctn.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    
    ctn.appendChild(canvas);
    window.addEventListener('resize', resize);
    resize();

    // 2. 著色器程式碼 (這是極光的靈魂 - Simplex Noise 算法)
    const vertexShaderSrc = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5; // 轉換座標
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSrc = `
      precision highp float;
      uniform float uTime;
      uniform float uAmplitude;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      varying vec2 vUv;

      // --- 雜訊數學公式 (從 React Bits 原版移植) ---
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
      }

      void main() {
        vec2 uv = vUv;
        // 極光流動邏輯
        float noise1 = snoise(vec3(uv.x * 2.0 + uTime * 0.05, uv.y * 1.5 - uTime * 0.05, uTime * 0.1));
        float noise2 = snoise(vec3(uv.x * 1.5 - uTime * 0.05, uv.y * 2.0 + uTime * 0.05, uTime * 0.1 + 10.0));
        float combinedNoise = (noise1 + noise2) * 0.5 * uAmplitude;
        
        // 混合顏色
        vec3 color = mix(uColor1, uColor2, uv.x + combinedNoise);
        color = mix(color, uColor3, uv.y - combinedNoise);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // 3. 編譯程式
    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vertexShaderSrc);
    const fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // 4. 設定一個大三角形覆蓋畫面
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 
       3, -1, 
      -1,  3
    ]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // 5. 獲取變數位置
    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    const uAmpLoc = gl.getUniformLocation(program, 'uAmplitude');
    const uCol1Loc = gl.getUniformLocation(program, 'uColor1');
    const uCol2Loc = gl.getUniformLocation(program, 'uColor2');
    const uCol3Loc = gl.getUniformLocation(program, 'uColor3');

    // 工具：色碼轉 RGB
    const hexToRgb = (hex: string) => {
      const bigint = parseInt(hex.replace('#', ''), 16);
      return [((bigint >> 16) & 255)/255, ((bigint >> 8) & 255)/255, (bigint & 255)/255];
    };

    // 6. 動畫迴圈
    let reqId: number;
    let startTime = performance.now();

    const render = () => {
      const time = (performance.now() - startTime) * 0.001 * speed;
      gl.useProgram(program);
      gl.uniform1f(uTimeLoc, time);
      gl.uniform1f(uAmpLoc, amplitude);

      const c1 = hexToRgb(colorStops[0]);
      const c2 = hexToRgb(colorStops[1]);
      const c3 = hexToRgb(colorStops[2] || colorStops[0]);

      gl.uniform3f(uCol1Loc, c1[0], c1[1], c1[2]);
      gl.uniform3f(uCol2Loc, c2[0], c2[1], c2[2]);
      gl.uniform3f(uCol3Loc, c3[0], c3[1], c3[2]);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      reqId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', resize);
      if (ctn && canvas) ctn.removeChild(canvas);
    };
  }, [JSON.stringify(colorStops), amplitude, speed]);

  return <div ref={ctnDom} className="absolute inset-0 w-full h-full -z-10" />;
};

export default Aurora;