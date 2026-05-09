"use client";
import { useEffect, useRef } from "react";

export default function AmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const bugCount = window.innerWidth < 600 ? 20 : 40;
    const bugs: Array<{
      x: number;
      y: number;
      r: number;
      dx: number;
      dy: number;
    }> = Array.from({ length: bugCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 1 + Math.random() * 3,
      dx: -0.5 + Math.random(),
      dy: -0.5 + Math.random(),
    }));

    const draw = () => {
      if (!document.hidden) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        bugs.forEach((b) => {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
          ctx.fill();

          b.x += b.dx;
          b.y += b.dy;

          if (b.x <= 0 || b.x >= canvas.width) b.dx *= -1;
          if (b.y <= 0 || b.y >= canvas.height) b.dy *= -1;
        });
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        background: "transparent",
      }}
    />
  );
}
