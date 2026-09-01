import { useEffect, useRef, useState } from "react";
import "./cardapio.css";

const PALAVRA = "Cardápio";

// Categorias exibidas dentro de cada quadrado, na ordem em que aparecem
const CATEGORIAS = ["Bebidas", "Combos", "Comidas", "Drinks", "Cerveja"];
const ORIGEM_ZOOM_X = 49.7; // %
const ORIGEM_ZOOM_Y = 62; // %

// Quanto do scroll total (dentro do container estendido) é usado
// para cada fase: 0 -> ZOOM_FIM é o zoom no D, ZOOM_FIM -> 1 são os quadrados
const ZOOM_FIM = 0.55;
const ESCALA_MAX = 40;
const EASE = 0.07;
const EPSILON = 0.0005;

export default function Cardapio() {
  const containerRef = useRef(null);
  const sectionRef = useRef(null);
  const tituloRef = useRef(null);
  const quadradosRef = useRef(null);
  const quadradoRefs = useRef([]);
  const letraRefs = useRef([]);
  const [visivel, setVisivel] = useState(false);
  const targetProgressRef = useRef(0);
  const displayProgressRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisivel(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const aplicarVisual = (progresso) => {
      const progressoZoom = Math.min(progresso / ZOOM_FIM, 1);
      const escala = 1 + progressoZoom * (ESCALA_MAX - 1);

      if (tituloRef.current) {
        tituloRef.current.style.transform = `scale(${escala})`;
      }

      const progressoQuadrados = Math.max(
        (progresso - ZOOM_FIM) / (1 - ZOOM_FIM),
        0
      );

      if (quadradosRef.current) {
        quadradosRef.current.style.opacity = progressoQuadrados;
        quadradosRef.current.style.pointerEvents =
          progressoQuadrados > 0.6 ? "auto" : "none";
      }

      quadradoRefs.current.forEach((el, i) => {
        if (!el) return;
        const atraso = i * 0.15;
        const escalaQuadrado = Math.min(
          Math.max((progressoQuadrados - atraso) * 2.5, 0),
          1
        );
        el.style.transform = `scale(${escalaQuadrado})`;
      });
    };

    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const totalScrollavel = rect.height - window.innerHeight;
      if (totalScrollavel <= 0) return;

      const percorrido = -rect.top;
      const p = Math.min(Math.max(percorrido / totalScrollavel, 0), 1);
      targetProgressRef.current = p;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    const tick = () => {
      const target = targetProgressRef.current;
      const current = displayProgressRef.current;
      const diff = target - current;

      if (Math.abs(diff) > EPSILON) {
        displayProgressRef.current = current + diff * EASE;
      } else if (current !== target) {
        displayProgressRef.current = target;
      }

      aplicarVisual(displayProgressRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Efeito de "esquiva": cada letra se afasta suavemente do mouse
  const RAIO = 130;
  const FORCA_MAX = 10;

  const handleMouseMove = (e) => {
    const rect = sectionRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    letraRefs.current.forEach((el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2 - rect.left;
      const cy = r.top + r.height / 2 - rect.top;
      const dx = cx - mouseX;
      const dy = cy - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < RAIO) {
        const forca = (1 - dist / RAIO) * FORCA_MAX;
        const angulo = Math.atan2(dy, dx);
        const tx = Math.cos(angulo) * forca;
        const ty = Math.sin(angulo) * forca;
        el.style.transform = `translate(${tx}px, ${ty}px)`;
      } else {
        el.style.transform = "translate(0px, 0px)";
      }
    });
  };

  const handleMouseLeave = () => {
    letraRefs.current.forEach((el) => {
      if (el) el.style.transform = "translate(0px, 0px)";
    });
  };

  return (
    <div className="cardapio-scroll-container" ref={containerRef}>
      <section
        className="cardapio-section"
        ref={sectionRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <h1
          className="cardapio-title"
          ref={tituloRef}
          style={{
            transformOrigin: `${ORIGEM_ZOOM_X}% ${ORIGEM_ZOOM_Y}%`,
          }}
        >
          {PALAVRA.split("").map((letra, i) => (
            <span
              key={i}
              className={`cardapio-letra-entrada ${visivel ? "cardapio-letra-entrada--visivel" : ""}`}
              style={{ transitionDelay: `${i * 0.12}s` }}
            >
              <span
                className="cardapio-letra-esquiva"
                ref={(el) => (letraRefs.current[i] = el)}
              >
                {letra}
              </span>
            </span>
          ))}
        </h1>

        <div className="cardapio-quadrados" ref={quadradosRef} style={{ opacity: 0 }}>
          {CATEGORIAS.map((categoria, i) => (
            <div
              key={categoria}
              className={`cardapio-quadrado ${i === 4 ? "cardapio-quadrado--central" : ""}`}
              ref={(el) => (quadradoRefs.current[i] = el)}
            >
              <span className="cardapio-quadrado-texto">{categoria}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}