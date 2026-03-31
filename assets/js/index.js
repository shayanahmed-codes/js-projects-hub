const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');

    let W, H, cx, cy;
    let mouse = { x: 0, y: 0 };
    let particles = [];
    let nebulae = [];
    let lines = [];
    let tick = 0;
    let shootingStars = [];
    let ripples = [];

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      cx = W / 2;
      cy = H / 2;
    }

    resize();

    window.addEventListener('resize', () => {
      resize();
      init();
    });

    window.addEventListener('mousemove', e => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    window.addEventListener('touchmove', e => {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
    }, { passive: true });

    const rnd = (a, b) => a + Math.random() * (b - a);
    const lerp = (a, b, t) => a + (b - a) * t;
    const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

    class Nebula {
      constructor() { this.reset(true); }
      reset(initial = false) {
        this.x = rnd(0, W);
        this.y = rnd(0, H);
        this.r = rnd(80, 220);
        this.hue = rnd(200, 270);
        this.alpha = rnd(0.04, 0.12);
        this.vx = rnd(-0.15, 0.15);
        this.vy = rnd(-0.1, 0.1);
        this.life = initial ? rnd(0, 600) : 0;
        this.maxLife = rnd(400, 800);
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life++;
        if (this.life > this.maxLife) this.reset();
      }
      draw() {
        const t = this.life / this.maxLife;
        const a = this.alpha * Math.sin(t * Math.PI);
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
        g.addColorStop(0, `hsla(${this.hue},80%,60%,${a})`);
        g.addColorStop(1, `hsla(${this.hue},80%,40%,0)`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
    }

    class Particle {
      constructor() { this.reset(true); }
      reset(initial = false) {
        this.x = rnd(0, W);
        this.y = rnd(0, H);
        this.ox = this.x;
        this.oy = this.y;
        this.size = rnd(0.5, 2.5);
        this.hue = rnd(200, 260);
        this.sat = rnd(60, 100);
        this.lit = rnd(70, 100);
        this.alpha = rnd(0.4, 1);
        this.speed = rnd(0.002, 0.012);
        this.angle = rnd(0, Math.PI * 2);
        this.orbitR = rnd(10, 60);
        this.twinkleSpeed = rnd(0.02, 0.06);
        this.twinklePhase = rnd(0, Math.PI * 2);
        this.life = initial ? rnd(0, 300) : 0;
        this.maxLife = rnd(200, 600);
      }
      update(t) {
        this.angle += this.speed;
        this.x = this.ox + Math.cos(this.angle) * this.orbitR;
        this.y = this.oy + Math.sin(this.angle) * this.orbitR;
        this.ox += 0.03 * Math.sin(t * 0.001 + this.orbitR);
        this.oy += 0.02 * Math.cos(t * 0.0013 + this.orbitR);

        const d = dist(this.x, this.y, mouse.x, mouse.y);
        if (d < 120) {
          const force = (120 - d) / 120;
          const ang = Math.atan2(this.y - mouse.y, this.x - mouse.x);
          this.ox += Math.cos(ang) * force * 2.5;
          this.oy += Math.sin(ang) * force * 2.5;
        }

        this.life++;
        if (this.life > this.maxLife) this.reset();

        if (this.ox < -50) this.ox = W + 50;
        if (this.ox > W + 50) this.ox = -50;
        if (this.oy < -50) this.oy = H + 50;
        if (this.oy > H + 50) this.oy = -50;
      }
      draw(t) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * this.twinkleSpeed + this.twinklePhase);
        const a = this.alpha * twinkle;
        const lt = this.life / this.maxLife;
        const fade = Math.sin(lt * Math.PI);

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * (0.8 + 0.2 * twinkle), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue},${this.sat}%,${this.lit}%,${a * fade})`;
        ctx.fill();

        if (this.size > 1.5) {
          const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 5);
          glow.addColorStop(0, `hsla(${this.hue},80%,80%,${0.3 * fade * twinkle})`);
          glow.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * 5, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }
      }
    }

    class ConstellationLine {
      constructor(p1, p2) {
        this.p1 = p1;
        this.p2 = p2;
        this.alpha = 0;
        this.maxAlpha = rnd(0.04, 0.14);
        this.alive = true;
      }
      update() {
        const d = dist(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
        if (d > 180) { this.alive = false; return; }
        this.alpha = lerp(this.alpha, this.maxAlpha * (1 - d / 180), 0.05);
      }
      draw() {
        if (!this.alive) return;
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.strokeStyle = `rgba(140,190,255,${this.alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    class ShootingStar {
      constructor() { this.reset(); }
      reset() {
        this.x = rnd(-100, W);
        this.y = rnd(-100, H * 0.5);
        this.len = rnd(80, 200);
        this.speed = rnd(8, 18);
        this.angle = rnd(0.3, 0.8);
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.alpha = 1;
        this.dead = false;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.018;
        if (this.alpha <= 0 || this.x > W + 200 || this.y > H + 200) this.dead = true;
      }
      draw() {
        const tail = { x: this.x - this.vx * (this.len / this.speed), y: this.y - this.vy * (this.len / this.speed) };
        const g = ctx.createLinearGradient(tail.x, tail.y, this.x, this.y);
        g.addColorStop(0, 'transparent');
        g.addColorStop(1, `rgba(200,230,255,${this.alpha})`);
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    class Ripple {
      constructor(x, y) {
        this.x = x; this.y = y;
        this.r = 0; this.maxR = 150;
        this.alpha = 0.8;
      }
      update() { this.r += 4; this.alpha -= 0.02; }
      get dead() { return this.alpha <= 0; }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(120,180,255,${this.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    function init() {
      nebulae = Array.from({ length: 8 }, () => new Nebula());
      particles = Array.from({ length: 180 }, () => new Particle());
      lines = [];
      shootingStars = [];
      ripples = [];
    }

    function buildLines() {
      lines = [];
      const maxPairs = 60;
      for (let i = 0; i < particles.length && lines.length < maxPairs; i++) {
        for (let j = i + 1; j < particles.length && lines.length < maxPairs; j++) {
          const d = dist(particles[i].x, particles[i].y, particles[j].x, particles[j].y);
          if (d < 130) lines.push(new ConstellationLine(particles[i], particles[j]));
        }
      }
    }

    window.addEventListener('click', e => {
      ripples.push(new Ripple(e.clientX, e.clientY));
      shootingStars.push(new ShootingStar());
    });

    function draw() {
      tick++;
      ctx.fillStyle = 'rgba(5,5,16,0.18)';
      ctx.fillRect(0, 0, W, H);

      nebulae.forEach(n => { n.update(); n.draw(); });
      particles.forEach(p => { p.update(tick); p.draw(tick); });

      if (tick % 60 === 0) buildLines();
      lines.forEach(l => { l.update(); l.draw(); });
      lines = lines.filter(l => l.alive);

      if (Math.random() < 0.003) shootingStars.push(new ShootingStar());
      shootingStars.forEach(s => { s.update(); s.draw(); });
      shootingStars = shootingStars.filter(s => !s.dead);

      ripples.forEach(r => { r.update(); r.draw(); });
      ripples = ripples.filter(r => !r.dead);

      const aura = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120);
      aura.addColorStop(0, 'rgba(100,160,255,0.06)');
      aura.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 120, 0, Math.PI * 2);
      ctx.fillStyle = aura;
      ctx.fill();

      requestAnimationFrame(draw);
    }

    init();
    draw();