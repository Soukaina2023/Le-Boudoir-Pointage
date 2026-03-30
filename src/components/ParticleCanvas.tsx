import { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}

function createParticle(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    size: Math.random() * 2 + 0.5,
    speedX: (Math.random() - 0.5) * 0.5,
    speedY: (Math.random() - 0.5) * 0.5,
    opacity: Math.random() * 0.5 + 0.2,
    color: Math.random() > 0.5 ? '#D4AF37' : '#FF69B4',
  };
}

function resetParticle(p: Particle, w: number, h: number): void {
  p.x = Math.random() * w;
  p.y = Math.random() * h;
  p.size = Math.random() * 2 + 0.5;
  p.speedX = (Math.random() - 0.5) * 0.5;
  p.speedY = (Math.random() - 0.5) * 0.5;
  p.opacity = Math.random() * 0.5 + 0.2;
  p.color = Math.random() > 0.5 ? '#D4AF37' : '#FF69B4';
}

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let isActive = true;
    let frameCount = 0;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const particleCount = isMobile ? 30 : 60;
    const maxDistance = isMobile ? 80 : 100;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(canvas.width, canvas.height));
    }

    const connectParticles = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < maxDistance) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.08)';
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      if (!isActive) return;

      frameCount++;
      if (isMobile && frameCount % 2 !== 0) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          resetParticle(p, canvas.width, canvas.height);
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (!isMobile) {
        connectParticles();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleVisibility = () => {
      if (document.hidden) {
        isActive = false;
        cancelAnimationFrame(animationId);
      } else {
        isActive = true;
        animate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isActive = false;
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="login-particles-canvas" />;
}
