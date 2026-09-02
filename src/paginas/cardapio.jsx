import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import "./cardapio.css";

const PALAVRA = "Cardápio";

const ORIGEM_ZOOM_X = 55.7; // %
const ORIGEM_ZOOM_Y = 61; // %

// Quanto do scroll total (dentro do container estendido) é usado
// para cada fase: 0 -> ZOOM_FIM é o zoom no D, ZOOM_FIM -> 1 é a revelação da imagem
const ZOOM_FIM = 0.55;
const ESCALA_MAX = 40;
const EASE = 0.07;
const EPSILON = 0.0005;

// Palavras da frase "bora pedir", uma por linha
const FRASE_PALAVRAS = ["bora", "pedir"];
// Quanto (em fração do progresso da frase) cada letra "espera" a anterior
const FRASE_STAGGER = 0.025;
// Duração (em fração do progresso da frase) da subida de cada letra
const FRASE_DURACAO = 0.4;
// Quantos px cada letra sobe a partir do "chão"
const FRASE_SUBIDA_PX = 60;

// Selos decorativos: só começam a aparecer depois que o zoom no
// título termina (ou seja, junto com o início da revelação da
// imagem). Cada um espera um pouco o anterior (stagger).
const SELOS_ATRASO = 0.08;
const SELOS_DURACAO = 0.5;
const SELOS_DESLOCAMENTO_PX = 40;

// Parallax: cada selo se move em velocidade/direção própria conforme
// o scroll avança (progresso geral 0 -> 1), criando sensação de
// profundidade entre as camadas. Valores em px, aplicados de forma
// linear sobre o progresso total do scroll.
const SELOS_PARALLAX = [
  { y: -70, x: 18 }, // topo
  { y: 90, x: -14 }, // esquerda
  { y: -60, x: 14 }, // direita
  { y: 100, x: -18 }, // base
];

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// ---------------------------------------------------------------------------
// Modelos 3D (hambúrguer, jack, vodka)
// ---------------------------------------------------------------------------

// Ajuste os caminhos abaixo para onde os .glb ficarem hospedados no seu
// projeto (ex.: pasta "public/models" em Vite/CRA/Next.js).
const MODELOS_3D = [
  { chave: "hamburguer", arquivo: `${import.meta.env.BASE_URL}hamburger.glb`, lado: "esquerda" },
  { chave: "jack", arquivo: `${import.meta.env.BASE_URL}jack.glb`, lado: "direita" },
  { chave: "vodka", arquivo: `${import.meta.env.BASE_URL}vodka.glb`, lado: "esquerda" },
];

// Duração do giro de entrada de cada modelo
const DURACAO_GIRO_MS = 1400;
// Giro horizontal (eixo Y) que o modelo começa fazendo antes de assentar
const GIRO_HORIZONTAL_INICIAL = Math.PI * 1.15;
// Inclinação diagonal (eixo Z) que acompanha o giro no começo
const INCLINACAO_DIAGONAL_INICIAL = 0.45;

function criarVisualizador3D(container) {
  const largura = container.clientWidth || 380;
  const altura = container.clientHeight || 380;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, largura / altura, 0.1, 100);
  camera.position.set(0, 0, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(largura, altura);
  container.appendChild(renderer.domElement);

  const luzAmbiente = new THREE.AmbientLight(0xffffff, 1.1);
  scene.add(luzAmbiente);

  const luzDirecional = new THREE.DirectionalLight(0xffffff, 1.4);
  luzDirecional.position.set(3, 5, 4);
  scene.add(luzDirecional);

  const luzPreenchimento = new THREE.DirectionalLight(0xffffff, 0.5);
  luzPreenchimento.position.set(-4, -2, 3);
  scene.add(luzPreenchimento);

  const grupo = new THREE.Group();
  scene.add(grupo);

  const redimensionar = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  return { scene, camera, renderer, grupo, redimensionar };
}

// Loader de Draco compartilhado entre os 3 modelos — os decoders (wasm)
// são baixados de um CDN oficial do Google, não precisa hospedar nada
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
);

function carregarModeloNoGrupo(grupo, arquivo) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      arquivo,
      (gltf) => {
        const objeto = gltf.scene;

        // Centraliza e normaliza a escala pra todo modelo ocupar
        // proporcionalmente o mesmo espaço dentro do seu quadro,
        // independente do tamanho/origem original do .glb
        const caixa = new THREE.Box3().setFromObject(objeto);
        const centro = caixa.getCenter(new THREE.Vector3());
        const tamanho = caixa.getSize(new THREE.Vector3());
        const maiorLado = Math.max(tamanho.x, tamanho.y, tamanho.z) || 1;
        const escala = 2.4 / maiorLado;

        objeto.position.sub(centro);
        objeto.scale.setScalar(escala);

        grupo.add(objeto);
        resolve(objeto);
      },
      undefined,
      reject
    );
  });
}

// Anima o giro de entrada: começa girado (horizontal + diagonal) e
// termina assentado na posição normal (rotation 0)
function animarGiroEntrada(grupo, lado) {
  const inicioY =
    lado === "esquerda" ? -GIRO_HORIZONTAL_INICIAL : GIRO_HORIZONTAL_INICIAL;
  const inicioZ =
    lado === "esquerda"
      ? INCLINACAO_DIAGONAL_INICIAL
      : -INCLINACAO_DIAGONAL_INICIAL;

  grupo.rotation.y = inicioY;
  grupo.rotation.z = inicioZ;

  const inicioTempo = performance.now();

  const passo = (agora) => {
    const decorrido = agora - inicioTempo;
    const bruto = Math.min(decorrido / DURACAO_GIRO_MS, 1);
    const t = easeOutCubic(bruto);

    grupo.rotation.y = inicioY * (1 - t);
    grupo.rotation.z = inicioZ * (1 - t);

    if (bruto < 1) {
      requestAnimationFrame(passo);
    }
  };

  requestAnimationFrame(passo);
}

export default function Cardapio() {
  const containerRef = useRef(null);
  const sectionRef = useRef(null);
  const tituloRef = useRef(null);
  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const imagemRef = useRef(null);
  const fraseRef = useRef(null);
  const letraRefs = useRef([]);
  const fraseLetraRefs = useRef([]);
  const seloEsquerdaRef = useRef(null);
  const seloDireitaRef = useRef(null);
  const seloTopoRef = useRef(null);
  const seloBaseRef = useRef(null);
  const [visivel, setVisivel] = useState(false);
  const targetProgressRef = useRef(0);
  const displayProgressRef = useRef(0);
  const rafRef = useRef(null);

  // Refs dos containers onde cada modelo 3D vai renderizar
  const hamburguerRef = useRef(null);
  const jackRef = useRef(null);
  const vodkaRef = useRef(null);
  const [modelosVisiveis, setModelosVisiveis] = useState({});

  const containersModelos = {
    hamburguer: hamburguerRef,
    jack: jackRef,
    vodka: vodkaRef,
  };

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

      const progressoImagem = Math.min(
        Math.max((progresso - ZOOM_FIM) / (1 - ZOOM_FIM), 0),
        1
      );

      if (stageRef.current && frameRef.current && imagemRef.current) {
        // Cresce de bem pequena até o tamanho final
        const escalaImagem = 0.4 + progressoImagem * 0.6;

        // Fração de revelação: 0 = fechada (frame com largura ~0),
        // 1 = totalmente aberta (frame com 100% de largura).
        // Evita 0 puro para não gerar divisão por zero abaixo.
        const revelacao = Math.max(progressoImagem, 0.0001);
        const larguraFramePct = revelacao * 100;

        // A <img> interna sempre tem o tamanho final; só ajustamos
        // sua largura/posição em % relativas ao frame (que está
        // encolhido) para que, visualmente, pareça uma cortina
        // abrindo a partir do centro — mas agora a borda e a sombra
        // do frame ficam sempre visíveis, mesmo com ele encolhido.
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

      // Selos decorativos: aparecem só depois do zoom no título
      // (progressoImagem só passa de 0 quando o zoom termina),
      // um pouco escalonados entre si.
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

      // A frase aparece um pouco depois da imagem já estar visível
      const ATRASO_FRASE = 0.15;
      const progressoFrase = Math.min(
        Math.max((progressoImagem - ATRASO_FRASE) / (1 - ATRASO_FRASE), 0),
        1
      );

      // Cada letra sobe do chão de forma escalonada (stagger),
      // usando o mesmo progresso (já suavizado pelo easing do
      // scroll) como "linha do tempo" — sem blur, só posição/opacidade.
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

  // Monta as cenas 3D, carrega os modelos e dispara o giro de entrada
  // quando cada modelo aparece na tela pela primeira vez
  useEffect(() => {
    const instancias = {};
    const observadores = [];
    let ativo = true;

    const VELOCIDADE_GIRO = 0.008; // radianos por frame

    const loopRenderizacao = () => {
      if (!ativo) return;
      Object.values(instancias).forEach(({ scene, camera, renderer, grupo }) => {
        grupo.rotation.y += VELOCIDADE_GIRO;
        renderer.render(scene, camera);
      });
      requestAnimationFrame(loopRenderizacao);
    };

    MODELOS_3D.forEach(({ chave, arquivo }) => {
      const container = containersModelos[chave].current;
      if (!container) return;

      const visualizador = criarVisualizador3D(container);
      instancias[chave] = visualizador;

      carregarModeloNoGrupo(visualizador.grupo, arquivo)
        .then(() => {
          setModelosVisiveis((atual) => ({ ...atual, [chave]: true }));
        })
        .catch((erro) => {
          console.error(`Erro ao carregar o modelo "${chave}":`, erro);
        });
    });

    requestAnimationFrame(loopRenderizacao);

    const aoRedimensionar = () => {
      Object.values(instancias).forEach((v) => v.redimensionar());
    };
    window.addEventListener("resize", aoRedimensionar);

    return () => {
      ativo = false;
      window.removeEventListener("resize", aoRedimensionar);
      observadores.forEach((o) => o.disconnect());
      Object.values(instancias).forEach(({ renderer, scene }) => {
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            const materiais = Array.isArray(obj.material)
              ? obj.material
              : [obj.material];
            materiais.forEach((m) => m.dispose());
          }
        });
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      });
    };
  }, []);

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

      {/* Seção logo abaixo do cardápio, com os 3 modelos 3D */}
      <section className="cardapio-modelos-section">
        <div
          className={`cardapio-modelo cardapio-modelo-hamburguer ${
            modelosVisiveis.hamburguer ? "cardapio-modelo--visivel" : ""
          }`}
          ref={hamburguerRef}
        />
        <div
          className={`cardapio-modelo cardapio-modelo-jack ${
            modelosVisiveis.jack ? "cardapio-modelo--visivel" : ""
          }`}
          ref={jackRef}
        />
        <div
          className={`cardapio-modelo cardapio-modelo-vodka ${
            modelosVisiveis.vodka ? "cardapio-modelo--visivel" : ""
          }`}
          ref={vodkaRef}
        />
      </section>
    </>
  );
}