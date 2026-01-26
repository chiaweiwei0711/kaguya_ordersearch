// src/components/GridScan.tsx
import React, { useRef, useEffect, useState } from 'react';

interface GridScanProps {
  sensitivity?: number;
  lineThickness?: number;
  linesColor?: string;
  scanColor?: string;
  scanOpacity?: number;
  gridScale?: number;
  lineStyle?: string;
  lineJitter?: number;
  scanDirection?: 'top-bottom' | 'bottom-top' | 'pingpong';
  noiseIntensity?: number;
  scanGlow?: number;
  scanSoftness?: number;
  scanDuration?: number;
  scanDelay?: number;
  scanOnClick?: boolean;
  width?: string | number;
  height?: string | number;
}

const GridScan: React.FC<GridScanProps> = ({
  lineThickness = 1,
  linesColor = "#392e4e",
  scanColor = "#FF9FFC",
  scanOpacity = 0.4,
  gridScale = 0.1,
  scanDirection = "pingpong",
  scanDuration = 2,
  width = "100%",
  height = "100%"
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  // 1. 處理視窗大小變化 (RWD)
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        const parent = canvasRef.current.parentElement;
        setDimensions({ w: parent.clientWidth, h: parent.clientHeight });
        canvasRef.current.width = parent.clientWidth;
        canvasRef.current.height = parent.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // 初始化
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. 動畫繪製邏輯
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let startTime = performance.now();

    const render = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // --- 繪製網格 ---
      ctx.strokeStyle = linesColor;
      ctx.lineWidth = lineThickness;
      ctx.globalAlpha = 0.2; // 網格稍微淡一點
      
      // 計算網格間距
      const step = Math.max(20, Math.floor(h * gridScale)); 

      ctx.beginPath();
      // 橫線
      for (let y = 0; y <= h; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      // 直線
      for (let x = 0; x <= w; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      ctx.stroke();

      // --- 計算掃描線位置 ---
      // 使用餘數運算讓時間循環
      const elapsed = (time - startTime) / 1000;
      let progress = (elapsed % scanDuration) / scanDuration;
      
      let scanY = 0;
      if (scanDirection === 'pingpong') {
        // 來回掃描邏輯 (0 -> 1 -> 0)
        const cycle = (elapsed / scanDuration) % 2;
        scanY = cycle < 1 ? cycle * h : (2 - cycle) * h;
      } else {
        // 單向掃描 (0 -> 1)
        scanY = progress * h;
      }

      // --- 繪製掃描光束 ---
      // 建立漸層光暈
      const gradient = ctx.createLinearGradient(0, scanY - 80, 0, scanY + 80);
      
      // 顏色處理 (Hex 轉 RGB)
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : '255,255,255';
      };
      const rgb = hexToRgb(scanColor);

      // 設定漸層顏色: 透明 -> 半透明顏色 -> 透明
      gradient.addColorStop(0, `rgba(${rgb}, 0)`);
      gradient.addColorStop(0.5, `rgba(${rgb}, ${scanOpacity})`);
      gradient.addColorStop(1, `rgba(${rgb}, 0)`);

      ctx.fillStyle = gradient;
      ctx.globalAlpha = 1;
      // 繪製光束矩形
      ctx.fillRect(0, scanY - 80, w, 160);

      // 繼續下一幀動畫
      animationFrameId = requestAnimationFrame(render);
    };

    render(performance.now());

    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions, linesColor, lineThickness, scanColor, scanOpacity, gridScale, scanDirection, scanDuration]);

  return <canvas ref={canvasRef} style={{ width, height, display: 'block' }} />;
};

export default GridScan;
