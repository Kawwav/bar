import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./cardapio.css";

gsap.registerPlugin(ScrollTrigger);

const PALAVRA = "Cardápio";
const LETRA_ZOOM = "d";
const INDICE_LETRA_ZOOM = PALAVRA.toLowerCase().indexOf(LETRA_ZOOM);
const ORIGEM_ZOOM_PADRAO = { x: 50, y: 50 }; 
const AJUSTE_ORIGEM_TELA_MAIOR = { x: 0, y: -12 };
const LARGURA_TELA_MAIOR = 1024;
const ZOOM_FIM = 0.55;
const ESCALA_MAX = 40;
const TITULO_FADE_DURACAO = 0.35;
const EPSILON = 0.0005;

const NAV_ITENS = [
  { texto: "Bebidas / Drinks", tipo: "categoria", categoria: "bebidas" },
  { texto: "Combos", tipo: "categoria", categoria: "combos" },
  { texto: "Comidas", tipo: "ancora", href: "#comidas" },
];

const CARROSSEL_ANCORA = "#cardapio-carrossel";
const EVENTO_CATEGORIA = "cardapio:categoria";
const NAV_GAP_PX = 64;
const NAV_INICIO = 0.55;
const NAV_DURACAO = 0.2;

const FRASE_PALAVRAS = ["bora", "pedir"];
const FRASE_STAGGER = 0.025;
const FRASE_DURACAO = 0.4;
const FRASE_SUBIDA_PX = 60;

const SELOS_ATRASO = 0.08;
const SELOS_DURACAO = 0.5;
const SELOS_ENTRADA_PX = 420;
const SELOS_DIRECAO_ENTRADA = [1, -1];
const SELOS_PARALLAX = [
  { y: -320, x: 90 },
  { y: 480, x: -110 },
];

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const gapResponsivo = (base, alturaSecao) =>
  Math.max(12, Math.min(base, alturaSecao * 0.035));

export default function Cardapio() {
  const containerRef = useRef(null);
  const sectionRef = useRef(null);
  const tituloRef = useRef(null);
  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const imagemRef = useRef(null);
  const fraseRef = useRef(null);
  const linhaFraseRefs = useRef([]);
  const navRef = useRef(null);
  const letraRefs = useRef([]);
  const fraseLetraRefs = useRef([]);
  const seloDireitaRef = useRef(null);
  const seloBaseRef = useRef(null);

  const [visivel, setVisivel] = useState(false);
  const [navAtivo, setNavAtivo] = useState(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState("bebidas");

  const scrollTriggerRef = useRef(null);

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
    const alvos = NAV_ITENS
      .filter(({ tipo }) => tipo === "ancora")
      .map(({ href }) => document.querySelector(href))
      .filter(Boolean);

    if (alvos.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visiveis = entries.filter((entry) => entry.isIntersecting);
        if (visiveis.length === 0) return;

        const maisProxima = visiveis.reduce((melhor, atual) =>
          atual.boundingClientRect.top < melhor.boundingClientRect.top
            ? atual
            : melhor
        );

        setNavAtivo(`#${maisProxima.target.id}`);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    alvos.forEach((alvo) => observer.observe(alvo));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const ajustarTamanhoFonte = () => {
      const titulo = tituloRef.current;
      const secao = sectionRef.current;
      if (!titulo || !secao) return;

      titulo.style.fontSize = "";

      const margemSeguranca = 0.94;
      const larguraDisponivel = secao.clientWidth * margemSeguranca;
      const larguraNecessaria = titulo.scrollWidth;

      if (larguraNecessaria > larguraDisponivel && larguraNecessaria > 0) {
        const tamanhoAtual = parseFloat(
          window.getComputedStyle(titulo).fontSize
        );
        const fator = larguraDisponivel / larguraNecessaria;
        titulo.style.fontSize = `${tamanhoAtual * fator}px`;
      }

      ScrollTrigger.refresh();
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(ajustarTamanhoFonte);
    } else {
      ajustarTamanhoFonte();
    }

    window.addEventListener("resize", ajustarTamanhoFonte);
    window.addEventListener("orientationchange", ajustarTamanhoFonte);
    return () => {
      window.removeEventListener("resize", ajustarTamanhoFonte);
      window.removeEventListener("orientationchange", ajustarTamanhoFonte);
    };
  }, []);



  const calcularOrigemZoomRef = useRef(() => ORIGEM_ZOOM_PADRAO);

  useEffect(() => {
    calcularOrigemZoomRef.current = () => {
      const titulo = tituloRef.current;
      const letraAlvo = letraRefs.current[INDICE_LETRA_ZOOM];
      if (!titulo || !letraAlvo) return ORIGEM_ZOOM_PADRAO;

      const wrapperEntrada = letraAlvo.parentElement;

      const transformAntigo = titulo.style.transform;
      const letraTransformAntigo = letraAlvo.style.transform;
      const wrapperTransformAntigo = wrapperEntrada
        ? wrapperEntrada.style.transform
        : "";

      titulo.style.transform = "none";
      letraAlvo.style.transform = "translate(0px, 0px)";
      if (wrapperEntrada) wrapperEntrada.style.transform = "translateY(0px)";

      const tituloRect = titulo.getBoundingClientRect();
      const letraRect = letraAlvo.getBoundingClientRect();

      titulo.style.transform = transformAntigo;
      letraAlvo.style.transform = letraTransformAntigo;
      if (wrapperEntrada) wrapperEntrada.style.transform = wrapperTransformAntigo;

      if (tituloRect.width === 0 || tituloRect.height === 0) {
        return ORIGEM_ZOOM_PADRAO;
      }

      const centroX = letraRect.left + letraRect.width / 2;
      const centroY = letraRect.top + letraRect.height / 2;

      let x = ((centroX - tituloRect.left) / tituloRect.width) * 100;
      let y = ((centroY - tituloRect.top) / tituloRect.height) * 100;

      if (window.innerWidth >= LARGURA_TELA_MAIOR) {
        x += AJUSTE_ORIGEM_TELA_MAIOR.x;
        y += AJUSTE_ORIGEM_TELA_MAIOR.y;
      }

      x = Math.min(100, Math.max(0, x));
      y = Math.min(100, Math.max(0, y));

      return { x, y };
    };
  }, []);

  useEffect(() => {
    const aplicarVisual = (progresso) => {
      const progressoZoom = Math.min(progresso / ZOOM_FIM, 1);
      const escala = 1 + progressoZoom * (ESCALA_MAX - 1);

      const progressoImagem = Math.min(
        Math.max((progresso - ZOOM_FIM) / (1 - ZOOM_FIM), 0),
        1
      );

      const progressoFadeTitulo = Math.min(
        progressoImagem / TITULO_FADE_DURACAO,
        1
      );

      if (tituloRef.current) {
        if (progresso <= EPSILON) {
          tituloRef.current.style.transform = "scale(1)";
          tituloRef.current.style.opacity = "1";
        } else {
          tituloRef.current.style.transform = `scale(${escala})`;
          tituloRef.current.style.opacity = `${1 - progressoFadeTitulo}`;
        }
      }

      if (stageRef.current && frameRef.current && imagemRef.current) {
        const escalaImagem = 0.4 + progressoImagem * 0.6;
        const revelacao = Math.max(progressoImagem, 0.0001);
        const larguraFramePct = revelacao * 100;
        const larguraImgPct = 100 / revelacao;
        const deslocamentoImgPct = (100 - larguraImgPct) / 2;

        stageRef.current.style.opacity = progressoImagem > 0 ? 1 : 0;
        stageRef.current.style.transform = `scale(${escalaImagem})`;
        stageRef.current.style.pointerEvents =
          progressoImagem > 0.6 ? "auto" : "none";

        frameRef.current.style.width = `${larguraFramePct}%`;

        imagemRef.current.style.width = `${larguraImgPct}%`;
        imagemRef.current.style.left = `${deslocamentoImgPct}%`;
      }

      if (navRef.current && stageRef.current && sectionRef.current) {
        const secaoRect = sectionRef.current.getBoundingClientRect();
        const stageRect = stageRef.current.getBoundingClientRect();
        const navTop =
          stageRect.bottom -
          secaoRect.top +
          gapResponsivo(NAV_GAP_PX, secaoRect.height);
        navRef.current.style.top = `${navTop}px`;

        const progressoNav = Math.min(
          Math.max((progressoImagem - NAV_INICIO) / NAV_DURACAO, 0),
          1
        );
        const tNav = easeOutCubic(progressoNav);
        navRef.current.style.opacity = tNav;
        navRef.current.style.pointerEvents = progressoNav > 0.5 ? "auto" : "none";
      }

      const selos = [seloDireitaRef.current, seloBaseRef.current];

      selos.forEach((el, i) => {
        if (!el) return;
        const inicio = i * SELOS_ATRASO;
        const bruto = Math.min(
          Math.max((progressoImagem - inicio) / SELOS_DURACAO, 0),
          1
        );
        const t = easeOutCubic(bruto);
        el.style.opacity = t;
        el.style.setProperty(
          "--selo-entrada-x",
          `${(1 - t) * SELOS_ENTRADA_PX * SELOS_DIRECAO_ENTRADA[i]}px`
        );
        el.style.setProperty("--selo-escala", `${0.85 + t * 0.15}`);

        const { y: fatorY, x: fatorX } = SELOS_PARALLAX[i];
        el.style.setProperty("--selo-parallax-y", `${progresso * fatorY}px`);
        el.style.setProperty("--selo-parallax-x", `${progresso * fatorX}px`);
      });

      if (
        fraseRef.current &&
        frameRef.current &&
        sectionRef.current &&
        linhaFraseRefs.current[0] &&
        linhaFraseRefs.current[1]
      ) {
        const secaoRect = sectionRef.current.getBoundingClientRect();
        const frameRect = frameRef.current.getBoundingClientRect();
        const alturaLinha1 = linhaFraseRefs.current[0].getBoundingClientRect().height;
        const alturaLinha2 = linhaFraseRefs.current[1].getBoundingClientRect().height;

        const topoImagem = frameRect.top - secaoRect.top;
        const novoTop = topoImagem - alturaLinha1 - alturaLinha2 / 2;
        fraseRef.current.style.top = `${novoTop}px`;
      }

      if (frameRef.current && sectionRef.current) {
        const secaoRect = sectionRef.current.getBoundingClientRect();
        const frameRect = frameRef.current.getBoundingClientRect();
        const frameTop = frameRect.top - secaoRect.top;
        const frameBottom = frameRect.bottom - secaoRect.top;
        const frameLeft = frameRect.left - secaoRect.left;
        const frameRight = frameRect.right - secaoRect.left;
        const frameHeight = frameRect.height;

        const posicionar = (ref, { left, top }) => {
          if (!ref.current) return;
          ref.current.style.left = `${left}px`;
          ref.current.style.top = `${top}px`;
          ref.current.style.right = "auto";
          ref.current.style.bottom = "auto";
        };

        if (seloDireitaRef.current) {
          const w = seloDireitaRef.current.offsetWidth;
          posicionar(seloDireitaRef, {
            left: frameRight - w * 0.55,
            top: frameTop + frameHeight * 0.3,
          });
        }

        if (seloBaseRef.current) {
          const w = seloBaseRef.current.offsetWidth;
          const h = seloBaseRef.current.offsetHeight;
          posicionar(seloBaseRef, {
            left: frameLeft - w * 0.55,
            top: frameBottom - h * 1.4,
          });
        }
      }

      const ATRASO_FRASE = 0.15;
      const progressoFrase = Math.min(
        Math.max((progressoImagem - ATRASO_FRASE) / (1 - ATRASO_FRASE), 0),
        1
      );

      const total = fraseLetraRefs.current.length;
      const linhaDoTempo = (total - 1) * FRASE_STAGGER + FRASE_DURACAO;
      const progressoVirtual = progressoFrase * linhaDoTempo;

      fraseLetraRefs.current.forEach((el, i) => {
        if (!el) return;
        const inicio = i * FRASE_STAGGER;
        const bruto = Math.min(
          Math.max((progressoVirtual - inicio) / FRASE_DURACAO, 0),
          1
        );
        const t = easeOutCubic(bruto);
        el.style.opacity = t;
        el.style.transform = `translateY(${(1 - t) * FRASE_SUBIDA_PX}px)`;
      });
    };

    const resetarEsquiva = () => {
      letraRefs.current.forEach((el) => {
        if (el) el.style.transform = "translate(0px, 0px)";
      });
    };

    window.addEventListener("scroll", resetarEsquiva, { passive: true });


    const st = ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6, // dá a mesma sensação de "arrasto suave" do lerp manual (EASE)
      invalidateOnRefresh: true,
      onRefresh: () => {
        const origem = calcularOrigemZoomRef.current();
        if (tituloRef.current) {
          tituloRef.current.style.transformOrigin = `${origem.x}% ${origem.y}%`;
        }
      },
      onUpdate: (self) => aplicarVisual(self.progress),
    });

    scrollTriggerRef.current = st;

    const refresh = () => ScrollTrigger.refresh();
    if (document.fonts?.ready) {
      document.fonts.ready.then(refresh);
    }

    return () => {
      window.removeEventListener("scroll", resetarEsquiva);
      st.kill();
    };
  }, []);

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

  const handleClickCategoria = (categoria) => (e) => {
    e.preventDefault();
    setCategoriaAtiva(categoria);
    window.dispatchEvent(
      new CustomEvent(EVENTO_CATEGORIA, { detail: categoria })
    );
  };

  return (
    <>
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
              transformOrigin: `${ORIGEM_ZOOM_PADRAO.x}% ${ORIGEM_ZOOM_PADRAO.y}%`,
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

          <div
            className="cardapio-imagem-stage"
            ref={stageRef}
            style={{ opacity: 0, transform: "scale(0.4)" }}
          >
            <div
              className="cardapio-imagem-frame"
              ref={frameRef}
              style={{ width: "0%" }}
            >
              <img
                src="cerveja.jpg"
                alt="Cerveja"
                className="cardapio-imagem-img"
                ref={imagemRef}
                style={{ width: "1000000%", left: "-499950%" }}
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.target;
                  if (stageRef.current && naturalWidth && naturalHeight) {
                    stageRef.current.style.aspectRatio = `${naturalWidth} / ${naturalHeight}`;
                  }
                }}
              />
            </div>
          </div>

          <nav className="cardapio-nav" ref={navRef}>
            {NAV_ITENS.map((item) => {
              const ativo =
                item.tipo === "categoria"
                  ? categoriaAtiva === item.categoria
                  : navAtivo === item.href;

              return item.tipo === "categoria" ? (
                <a
                  key={item.texto}
                  href={CARROSSEL_ANCORA}
                  onClick={handleClickCategoria(item.categoria)}
                  className={`cardapio-nav-item ${ativo ? "cardapio-nav-item--ativo" : ""}`}
                >
                  {item.texto}
                </a>
              ) : (
                <a
                  key={item.texto}
                  href={item.href}
                  className={`cardapio-nav-item ${ativo ? "cardapio-nav-item--ativo" : ""}`}
                >
                  {item.texto}
                </a>
              );
            })}
          </nav>

          <p className="cardapio-frase" ref={fraseRef}>
            {FRASE_PALAVRAS.map((palavra, wi) => {
              const offset = FRASE_PALAVRAS.slice(0, wi).join("").length;
              return (
                <span
                  className="cardapio-frase-linha"
                  key={wi}
                  ref={(el) => (linhaFraseRefs.current[wi] = el)}
                >
                  {palavra.split("").map((letra, li) => (
                    <span
                      className="cardapio-frase-letra"
                      key={li}
                      ref={(el) => (fraseLetraRefs.current[offset + li] = el)}
                    >
                      {letra}
                    </span>
                  ))}
                </span>
              );
            })}
          </p>

          <div
            className="cardapio-selo cardapio-selo-direita cardapio-selo-estrela"
            ref={seloDireitaRef}
          >
            <span>Sabor de<br />Verdade</span>
          </div>

          <div
            className="cardapio-selo cardapio-selo-base cardapio-selo-fita"
            ref={seloBaseRef}
          >
            <span>Peça Já!</span>
          </div>
        </section>
      </div>
    </>
  );
}