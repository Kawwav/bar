import { useEffect, useRef, useState } from "react";
import "./cardapio.css";

const PALAVRA = "Cardápio";
// Letra em que o zoom deve mirar (a palavra sempre cresce "saindo"
// de dentro dessa letra). Detecta a posição dela automaticamente
// dentro de PALAVRA, então se a palavra mudar não quebra nada.
const LETRA_ZOOM = "d";
const INDICE_LETRA_ZOOM = PALAVRA.toLowerCase().indexOf(LETRA_ZOOM);

// A origem do zoom do título (de onde ele "cresce") não é mais um
// número fixo (%). Ela é calculada automaticamente em tempo real,
// medindo onde a letra-alvo (LETRA_ZOOM) fica na tela e convertendo
// essa posição em % relativa ao próprio título. Isso faz o efeito
// funcionar certinho em qualquer tamanho de tela, incluindo celular,
// sem precisar ajustar nada manualmente.
const ORIGEM_ZOOM_PADRAO = { x: 50, y: 50 }; // fallback antes de medir

// Quanto do scroll total (dentro do container estendido) é usado
// para cada fase: 0 -> ZOOM_FIM é o zoom no D, ZOOM_FIM -> 1 é a revelação da imagem
const ZOOM_FIM = 0.55;
const ESCALA_MAX = 40;
// Fração do progresso de revelação da imagem (0 a 1) usada para o título
// "Cardápio" desaparecer suavemente enquanto a foto da cerveja vai abrindo
const TITULO_FADE_DURACAO = 0.35;
const EASE = 0.07;
const EPSILON = 0.0005;

// Itens do nav que aparece logo abaixo da imagem.
// "Bebidas" e "Combos" são abas: clicar troca o conteúdo dentro do
// mesmo carrossel (#cardapio-carrossel), sem empilhar seções.
// "Comidas" continua sendo uma âncora normal de scroll.
const NAV_ITENS = [
  { texto: "Bebidas / Drinks", tipo: "categoria", categoria: "bebidas" },
  { texto: "Combos", tipo: "categoria", categoria: "combos" },
  { texto: "Comidas", tipo: "ancora", href: "#comidas" },
];
// Alvo compartilhado por Bebidas/Combos (o carrossel único no maisConteudo)
const CARROSSEL_ANCORA = "#cardapio-carrossel";
// Nome do evento customizado usado para avisar o maisConteudo.jsx
// qual categoria (bebidas/combos) deve aparecer no carrossel
const EVENTO_CATEGORIA = "cardapio:categoria";
// Vão de folga (px) entre a base da imagem e o topo do nav
const NAV_GAP_PX = 64;
// Progresso (dentro da revelação da imagem) em que o nav começa/termina de aparecer
const NAV_INICIO = 0.55;
const NAV_DURACAO = 0.2;

// Palavras da frase "bora pedir", uma por linha
const FRASE_PALAVRAS = ["bora", "pedir"];
// Quanto (em fração do progresso da frase) cada letra "espera" a anterior
const FRASE_STAGGER = 0.025;
// Duração (em fração do progresso da frase) da subida de cada letra
const FRASE_DURACAO = 0.4;
// Quantos px cada letra sobe a partir do "chão"
const FRASE_SUBIDA_PX = 60;
const SELOS_ATRASO = 0.08;
const SELOS_DURACAO = 0.5;
const SELOS_DESLOCAMENTO_PX = 40;
const SELOS_PARALLAX = [
  { y: -70, x: 18 }, // topo
  { y: 90, x: -14 }, // esquerda
  { y: -60, x: 14 }, // direita
  { y: 100, x: -18 }, // base
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
  const navRef = useRef(null);
  const letraRefs = useRef([]);
  const fraseLetraRefs = useRef([]);
  const seloEsquerdaRef = useRef(null);
  const seloDireitaRef = useRef(null);
  const seloTopoRef = useRef(null);
  const seloBaseRef = useRef(null);
  const [visivel, setVisivel] = useState(false);
  const [navAtivo, setNavAtivo] = useState(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState("bebidas");
  const [origemZoom, setOrigemZoom] = useState(ORIGEM_ZOOM_PADRAO);
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

  // Observa as seções referenciadas por âncora (ex: #comidas) e marca
  // em vermelho o item correspondente quando a seção está em foco na tela.
  // Bebidas/Combos não entram aqui: eles ficam vermelhos por clique (ver categoriaAtiva).
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

        // Se mais de uma seção estiver na faixa observada, usa a que
        // está mais próxima do topo (a que o usuário está "vendo agora")
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

  // Ajusta automaticamente o tamanho da fonte do título pra ele
  // NUNCA quebrar linha, em nenhuma tela. O CSS já define um tamanho
  // "ideal" (clamp), mas em telas estreitas esse tamanho pode ser
  // grande demais pra palavra caber de uma vez — então aqui a gente
  // mede a largura real da palavra e, se não couber, encolhe a fonte
  // na proporção exata necessária.
  useEffect(() => {
    const ajustarTamanhoFonte = () => {
      const titulo = tituloRef.current;
      const secao = sectionRef.current;
      if (!titulo || !secao) return;

      // Volta pro tamanho "natural" do CSS antes de medir, senão a
      // gente vai encolhendo em cima do que já encolheu antes
      titulo.style.fontSize = "";

      const margemSeguranca = 0.94; // deixa uma folguinha nas bordas
      const larguraDisponivel = secao.clientWidth * margemSeguranca;
      const larguraNecessaria = titulo.scrollWidth;

      if (larguraNecessaria > larguraDisponivel && larguraNecessaria > 0) {
        const tamanhoAtual = parseFloat(
          window.getComputedStyle(titulo).fontSize
        );
        const fator = larguraDisponivel / larguraNecessaria;
        titulo.style.fontSize = `${tamanhoAtual * fator}px`;
      }
    };

    // Espera as fontes carregarem antes de medir, senão a medição
    // pode sair errada (fonte fallback é mais estreita/larga que a real)
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

  // Calcula (e recalcula) automaticamente o ponto de onde o título
  // "Cardápio" deve crescer: o centro da letra-alvo (LETRA_ZOOM),
  // convertido em % relativa à caixa do próprio título. Como usa
  // medidas reais do navegador (getBoundingClientRect), funciona em
  // qualquer resolução/tela sem precisar ajustar nada na mão.
  useEffect(() => {
    const calcularOrigemZoom = () => {
      const titulo = tituloRef.current;
      const letraAlvo = letraRefs.current[INDICE_LETRA_ZOOM];
      if (!titulo || !letraAlvo) return;

      const tituloRect = titulo.getBoundingClientRect();
      const letraRect = letraAlvo.getBoundingClientRect();
      if (tituloRect.width === 0 || tituloRect.height === 0) return;

      const centroX = letraRect.left + letraRect.width / 2;
      const centroY = letraRect.top + letraRect.height / 2;

      const x = ((centroX - tituloRect.left) / tituloRect.width) * 100;
      const y = ((centroY - tituloRect.top) / tituloRect.height) * 100;

      setOrigemZoom({ x, y });
    };

    // Espera um frame (e as fontes) pro layout assentar antes de medir
    const medir = () => requestAnimationFrame(calcularOrigemZoom);
    if (document.fonts?.ready) {
      document.fonts.ready.then(medir);
    } else {
      medir();
    }

    window.addEventListener("resize", calcularOrigemZoom);
    window.addEventListener("orientationchange", calcularOrigemZoom);

    return () => {
      window.removeEventListener("resize", calcularOrigemZoom);
      window.removeEventListener("orientationchange", calcularOrigemZoom);
    };
  }, []);

  useEffect(() => {
    const aplicarVisual = (progresso) => {
      const progressoZoom = Math.min(progresso / ZOOM_FIM, 1);
      const escala = 1 + progressoZoom * (ESCALA_MAX - 1);

      if (tituloRef.current) {
        tituloRef.current.style.transform = `scale(${escala})`;
      }

      const progressoImagem = Math.min(
        Math.max((progresso - ZOOM_FIM) / (1 - ZOOM_FIM), 0),
        1
      );

      if (tituloRef.current) {
        // Enquanto a imagem vai se revelando, o título vai sumindo
        const progressoFadeTitulo = Math.min(
          progressoImagem / TITULO_FADE_DURACAO,
          1
        );
        tituloRef.current.style.opacity = `${1 - progressoFadeTitulo}`;
      }

      if (stageRef.current && frameRef.current && imagemRef.current) {
        // Cresce de bem pequena até o tamanho final
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
      const selos = [
        seloTopoRef.current,
        seloEsquerdaRef.current,
        seloDireitaRef.current,
        seloBaseRef.current,
      ];

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
          "--selo-desloc",
          `${(1 - t) * SELOS_DESLOCAMENTO_PX}px`
        );
        el.style.setProperty("--selo-escala", `${0.5 + t * 0.5}`);

        const { y: fatorY, x: fatorX } = SELOS_PARALLAX[i];
        el.style.setProperty("--selo-parallax-y", `${progresso * fatorY}px`);
        el.style.setProperty("--selo-parallax-x", `${progresso * fatorX}px`);
      });

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

  // Clique em "Bebidas" ou "Combos": troca a categoria ativa, avisa o
  // maisConteudo.jsx (que renderiza o carrossel certo) e rola até lá
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
              transformOrigin: `${origemZoom.x}% ${origemZoom.y}%`,
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
                <span className="cardapio-frase-linha" key={wi}>
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
            className="cardapio-selo cardapio-selo-esquerda cardapio-selo-meia-lua"
            ref={seloEsquerdaRef}
          >
            <span>Hot Stuff!</span>
          </div>

          <div
            className="cardapio-selo cardapio-selo-direita cardapio-selo-estrela"
            ref={seloDireitaRef}
          >
            <span>Sabor de<br />Verdade</span>
          </div>

          <div
            className="cardapio-selo cardapio-selo-topo cardapio-selo-circulo"
            ref={seloTopoRef}
          >
            <span>100%<br />Artesanal</span>
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