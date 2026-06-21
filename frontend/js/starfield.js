/**
 * starfield.js — shared ambient background for every TicketVerse
 * dashboard page (admin / organizer / user).
 *
 * Auto-initializes on DOMContentLoaded if a <canvas id="bg-canvas">
 * is present on the page. One implementation, used everywhere, so
 * the "void" backdrop looks and moves identically across the whole app.
 */
(function () {
  function initStarfield() {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * 5000,
      y: Math.random() * 5000,
      r: Math.random() * 1.1 + 0.2,
      a: Math.random(),
      da: (Math.random() * 0.007 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
    }));

    const pts = Array.from({ length: 80 }, () => ({
      x: Math.random() * 500,
      y: Math.random() * 400,
      r: Math.random() * 1.8 + 0.4,
      speed: Math.random() * 0.4 + 0.15,
      dx: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.1,
      fadeDir: 1,
      col: ["rgba(245,200,66,", "rgba(124,106,247,", "rgba(247,74,106,"][
        Math.floor(Math.random() * 3)
      ],
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#0a0a14");
      g.addColorStop(1, "#0d0d22");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      [
        [0.1, 0.3, 280, "rgba(124,106,247,0.06)"],
        [0.85, 0.7, 350, "rgba(245,200,66,0.04)"],
        [0.5, 0.1, 200, "rgba(247,74,106,0.04)"],
      ].forEach(([ox, oy, r, c]) => {
        const rg = ctx.createRadialGradient(ox * W, oy * H, 0, ox * W, oy * H, r);
        rg.addColorStop(0, c);
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
      });

      stars.forEach((s) => {
        s.a += s.da;
        if (s.a > 1 || s.a < 0) s.da *= -1;
        ctx.beginPath();
        ctx.arc(s.x % W, s.y % H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, s.a) * 0.45})`;
        ctx.fill();
      });

      pts.forEach((p) => {
        p.y -= p.speed;
        p.x += p.dx;
        p.alpha += 0.003 * p.fadeDir;
        if (p.alpha > 0.6 || p.alpha < 0.07) p.fadeDir *= -1;
        if (p.y < -10) {
          p.x = Math.random() * W;
          p.y = H + 10;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.col + p.alpha + ")";
        ctx.fill();
      });

      requestAnimationFrame(draw);
    }
    draw();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStarfield);
  } else {
    initStarfield();
  }
})();
