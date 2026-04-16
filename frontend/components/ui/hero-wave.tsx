'use client'

import React, { useEffect, useRef } from 'react';

interface HeroWaveProps {
  className?: string;
}

const HeroWave = ({ className = '' }: HeroWaveProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Lower resolution for better performance
    const SCALE = 4; // Increased from 2 to 4 for better performance
    
    const resizeCanvas = () => {
      canvas.width = Math.floor(window.innerWidth / SCALE);
      canvas.height = Math.floor(window.innerHeight / SCALE);
    };

    resizeCanvas();

    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize, { passive: true });

    const startTime = Date.now();

    // Pre-compute sin/cos tables
    const SIN_TABLE = new Float32Array(256);
    const COS_TABLE = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const angle = (i / 256) * Math.PI * 2;
      SIN_TABLE[i] = Math.sin(angle);
      COS_TABLE[i] = Math.cos(angle);
    }

    const fastSin = (x: number) => {
      const index = Math.floor(((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 256) & 255;
      return SIN_TABLE[index];
    };

    const fastCos = (x: number) => {
      const index = Math.floor(((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 256) & 255;
      return COS_TABLE[index];
    };

    let animationId: number;
    let lastTime = 0;
    const FPS = 30; // Limit FPS for performance
    const frameInterval = 1000 / FPS;

    const render = (currentTime: number) => {
      animationId = requestAnimationFrame(render);

      // Throttle to 30 FPS
      if (currentTime - lastTime < frameInterval) return;
      lastTime = currentTime;

      const time = (currentTime - startTime) * 0.001;
      const width = canvas.width;
      const height = canvas.height;

      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      for (let y = 0; y < height; y++) {
        const u_y = (y / height) * 2 - 1;
        
        for (let x = 0; x < width; x++) {
          const u_x = (x / height) * 2 - 1;

          let a = 0;
          let d = 0;

          // Simplified wave iterations
          for (let i = 0; i < 3; i++) {
            a += fastCos(i - d + time * 0.5 - a * u_x);
            d += fastSin(i * u_y + a);
          }

          const wave = (fastSin(a) + fastCos(d)) * 0.5;
          const intensity = 0.3 + 0.4 * wave;

          // Base dark value
          const baseVal = 0.02;

          // Color accents
          const purple = 0.3 * fastSin(a + time * 0.3);
          const fuchsia = 0.2 * fastCos(d + time * 0.2);
          const cyan = 0.15 * fastCos(u_x + u_y + time * 0.25);

          // Calculate RGB
          const r = Math.floor((baseVal + purple * 0.6 + fuchsia * 0.4) * intensity * 255);
          const g = Math.floor((baseVal + cyan * 0.3) * intensity * 255);
          const b = Math.floor((baseVal + purple * 0.8 + cyan * 0.6) * intensity * 255);

          const index = (y * width + x) * 4;
          data[index] = Math.min(255, Math.max(0, r));
          data[index + 1] = Math.min(255, Math.max(0, g));
          data[index + 2] = Math.min(255, Math.max(0, b));
          data[index + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full ${className}`} style={{ imageRendering: 'auto' }} />;
};

export default HeroWave;
