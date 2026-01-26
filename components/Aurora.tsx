// src/components/Aurora.tsx
// 這段程式碼直接移植自 React Bits 及其依賴項，用於在免安裝環境下重現原版效果。
import React, { useEffect, useRef } from "react";

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  speed?: number;
}

const Aurora: React.FC<AuroraProps> = ({
  colorStops = ["#000000", "#fd56d4cd"], // 你的指定配色
  amplitude = 1.0,
  speed = 1.0,
}) => {
  const ctnDom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;

    // 1. 建立 WebGL 畫布
    const canvas = document.createElement('canvas');
    // 關鍵設定：alpha: true 讓背景透明，premultipliedAlpha: false 避免顏色混合錯誤
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    // 讓畫布填滿容器
    const resize = () => {
      if (!ctn) return;
      // 使用 devicePixelRatio 確保高解析度螢幕清晰度
      const dpr = window.devicePixelRatio || 1;
      canvas.width = ctn.offsetWidth * dpr;
      canvas.height = ctn.offsetHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    
    // 設定樣式並加入 DOM
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    ctn.appendChild(canvas);
    window.addEventListener('resize', resize);
    resize(); // 初始調整大小

    // 2. 定義 Shader 程式碼 (這就是 React Bits 原版的數學靈魂)
    // Vertex Shader: 處理頂點位置
    const vertexShaderSrc = `
      attribute vec2 uv;
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
      }
    `;

    // Fragment Shader: 處理像素顏色 (極光的核心)
    const fragmentShaderSrc = `
      precision highp float;
      uniform float uTime;
      uniform float uAmplitude;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      varying vec2 vUv;

      // --- Simplex Noise 雜訊算法 (從 OGL/React Bits 移植) ---
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
      // --- 雜訊算法結束 ---

      void main() {
        vec2 uv = vUv;
        // React Bits 原版參數調整，創造絲滑流動感
        float noise = snoise(vec3(uv.x * 1.0, uv.y * 0.8 - uTime * 0.1, uTime * 0.05)) * 0.5;
        float noise2 = snoise(vec3(uv.x * 1.0 + uTime * 0.1, uv.y * 1.5, uTime * 0.1)) * 0.5;
        
        float combinedNoise = (noise + noise2) * uAmplitude;
        
        // 混合三種顏色
        vec3 color = mix(uColor1, uColor2, uv.x + combinedNoise);
        color = mix(color, uColor3, uv.y - combinedNoise);
        
        // 增強一點飽和度與對比
        color = color * 1.1;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // 3. 編譯 Shader 程式
    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      // 錯誤檢查
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
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

    // 4. 建立幾何體 (一個覆蓋全螢幕的大三角形)
    // 數據格式: [x, y, u, v]
    const vertices = new Float32Array([
      -1, -1,  0, 1, // 左下
       3, -1,  2, 1, // 右下 (延伸到螢幕外)
      -1,  3,  0, -1 // 左上 (延伸到螢幕外)
    ]);
    
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // 設定屬性指針 (告訴 GPU 如何讀取數據)
    const positionLoc = gl.getAttribLocation(program, 'position');
    const uvLoc = gl.getAttribLocation(program, 'uv');
    const stride = 4 * 4; // 每個頂點 4 個 float，每個 float 4 bytes

    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, stride, 0); // 前兩個是位置
    
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, stride, 8); // 後兩個是 UV

    // 5. 獲取 Uniform 變數位置 (用於傳遞參數)
    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    const uAmplitudeLoc = gl.getUniformLocation(program, 'uAmplitude');
    const uColor1Loc = gl.getUniformLocation(program, 'uColor1');
    const uColor2Loc = gl.getUniformLocation(program, 'uColor2');
    const uColor3Loc = gl.getUniformLocation(program, 'uColor3');

    // 工具：Hex 轉 RGB (0~1)
    const hexToRgb = (hex: string) => {
      const bigint = parseInt(hex.replace('#', ''), 16);
      return [((bigint >> 16) & 255)/255, ((bigint >> 8) & 255)/255, (bigint & 255)/255];
    };

    // 6. 渲染迴圈 (動畫引擎)
    let reqId: number;
    let startTime = performance.now();

    const render = () => {
      const time = (performance.now() - startTime) * 0.001 * speed;
      
      gl.useProgram(program);
      
      // 更新 Uniforms
      gl.uniform1f(uTimeLoc, time);
      gl.uniform1f(uAmplitudeLoc, amplitude);
      
      const c1 = hexToRgb(colorStops[0]);
      const c2 = hexToRgb(colorStops[1]);
      const c3 = hexToRgb(colorStops[2] || colorStops[0]);
      
      gl.uniform3f(uColor1Loc, c1[0], c1[1], c1[2]);
      gl.uniform3f(uColor2Loc, c2[0], c2[1], c2[2]);
      gl.uniform3f(uColor3Loc, c3[0], c3[1], c3[2]);

      // 繪製
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      reqId = requestAnimationFrame(render);
    };
    
    render(); // 開始動畫

    // 清理函數
    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', resize);
      if (ctn && canvas && ctn.contains(canvas)) {
          ctn.removeChild(canvas);
      }
      // 嘗試釋放 WebGL 上下文
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [JSON.stringify(colorStops), amplitude, speed]);

  return <div ref={ctnDom} className="absolute inset-0 w-full h-full -z-10 pointer-events-none" />;
};

export default Aurora;