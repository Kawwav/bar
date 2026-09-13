import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './fotos.css'

gsap.registerPlugin(ScrollTrigger)

const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

const amortecer = (fatorA60fps, delta) =>
  1 - Math.pow(1 - fatorA60fps, delta * 60)

const janela = (t, inicio, fim) => clamp01((t - inicio) / (fim - inicio))

const PALAVRAS_REVELACAO = ['CAPTURE', 'CADA', 'MOMENTO']
const LIMIAR_CENTRO_TELA = 0.15
const DURACAO_ENTRADA_TEXTO = 1.4
const QUEBRA_DIAGONAL = 0.6

const IMAGENS_CARROSSEL = [
  'festa/festa1.webp',
  'festa/festa2.webp',
  'festa/festa3.webp',
  'festa/festa4.webp',
  'festa/festa5.webp',
]

// Texto fixo de 2 linhas exibido em cima do carrossel de fotos,
// adaptado ao tema do bar (drinks, festas, noites).
const CARROSSEL_LEGENDA = {
  linha1: 'Cada festa tem um clima diferente',
  linha2: 'e combina com os mais variados drinks da casa',
}

const LOGOS_MARCAS = [
  'logos/amstel.webp',
  'logos/budweiser.webp',
  'logos/cocacola.webp',
  'logos/heineken.webp',
  'logos/jack.webp',
  'logos/monster.webp',
  'logos/redbull.webp',
  'logos/smirnoff.webp',
  'logos/spaten.webp',
  'logos/sol.webp',
]

const ESTATISTICAS = [
  { valor: 10, prefixo: '+', sufixo: '', texto: 'ANOS DE EXPERIÊNCIA' },
  { valor: 500, prefixo: '+', sufixo: '', texto: 'EVENTOS REALIZADOS' },
  { valor: 50, prefixo: '+', sufixo: '', texto: 'MARCAS ATENDIDAS' },
  { valor: 100, prefixo: '', sufixo: '%', texto: 'SATISFAÇÃO GARANTIDA' },
]

export default function Fotos() {
  const containerRef = useRef(null)
  const palavrasRef = useRef(null)
  const secaoFotosRef = useRef(null)

  const [indiceCarrossel, setIndiceCarrossel] = useState(0)
  const cortinaEsqRef = useRef(null)
  const cortinaDirRef = useRef(null)
  const setaEsqRef = useRef(null)
  const setaDirRef = useRef(null)
  const pontosRef = useRef(null)
  const verMaisRef = useRef(null)
  const trilhoRef = useRef(null)
  const carrosselInterativoRef = useRef(true)
  const diagonalCorRef = useRef(null)
  const diagonalTextoRef = useRef(null)
  const marcasTrilhoRef = useRef(null)
  const marcasGrupoRef = useRef(null)
  const statsNumeroRefs = useRef([])
  // Fica "true" durante a transição de troca de foto (mesma duração da
  // transition do CSS). Usado para aliviar o render 3D nesse momento e
  // evitar engasgo ao trocar de imagem.
  const transicionandoCarrosselRef = useRef(false)
  const timeoutTransicaoCarrosselRef = useRef(null)

  const marcarTransicaoCarrossel = () => {
    transicionandoCarrosselRef.current = true
    clearTimeout(timeoutTransicaoCarrosselRef.current)
    timeoutTransicaoCarrosselRef.current = setTimeout(() => {
      transicionandoCarrosselRef.current = false
    }, 1550) // um pouco mais que a transition de 1.4s + delay de 0.12s do CSS
  }

  useEffect(() => () => clearTimeout(timeoutTransicaoCarrosselRef.current), [])

  const carrosselAnterior = useCallback(() => {
    if (!carrosselInterativoRef.current) return
    marcarTransicaoCarrossel()
    setIndiceCarrossel(
      (i) => (i - 1 + IMAGENS_CARROSSEL.length) % IMAGENS_CARROSSEL.length,
    )
  }, [])

  const carrosselProxima = useCallback(() => {
    if (!carrosselInterativoRef.current) return
    marcarTransicaoCarrossel()
    setIndiceCarrossel((i) => (i + 1) % IMAGENS_CARROSSEL.length)
  }, [])

  const carrosselIrPara = useCallback((i) => {
    if (!carrosselInterativoRef.current) return
    marcarTransicaoCarrossel()
    setIndiceCarrossel(i)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const secaoFotos = secaoFotosRef.current
    if (!container || !secaoFotos) return

    const linhasPalavras = palavrasRef.current
      ? Array.from(palavrasRef.current.children)
      : []

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    )
    camera.position.set(0, 0, 5.5)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(container.clientWidth, container.clientHeight)

    // Configuração de Iluminação e ToneMapping para Qualidade Realista/Estúdio
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap

    container.appendChild(renderer.domElement)

    // Ambiente HDR de Estúdio
    const pmrem = new THREE.PMREMGenerator(renderer)
    pmrem.compileCubemapShader()
    const roomEnv = new RoomEnvironment()
    const ambienteTextura = pmrem.fromScene(roomEnv, 0.04).texture
    scene.environment = ambienteTextura
    roomEnv.dispose()

    // Sistema de Iluminação
    const luzHemisferio = new THREE.HemisphereLight(0xfffdfa, 0xd0c4b4, 0.9)
    scene.add(luzHemisferio)

    const luzPrincipal = new THREE.DirectionalLight(0xfff5ea, 3.5)
    luzPrincipal.castShadow = true
    // 1024 em vez de 2048: reduz bastante o custo de gerar o shadow map a
    // cada frame, mantendo a sombra visualmente equivalente nesse enquadramento.
    luzPrincipal.shadow.mapSize.set(1024, 1024)
    luzPrincipal.shadow.camera.left = -3
    luzPrincipal.shadow.camera.right = 3
    luzPrincipal.shadow.camera.top = 3
    luzPrincipal.shadow.camera.bottom = -3
    luzPrincipal.shadow.camera.near = 0.1
    luzPrincipal.shadow.camera.far = 15
    luzPrincipal.shadow.bias = -0.0005
    luzPrincipal.shadow.radius = 4
    scene.add(luzPrincipal)
    scene.add(luzPrincipal.target)

    const direcaoLuz = new THREE.Vector3(3.5, 5, 4.5).normalize()
    const distanciaLuz = 7.5

    const luzPreenchimento = new THREE.DirectionalLight(0xdce6ff, 1.2)
    luzPreenchimento.position.set(-5, -2, 2)
    scene.add(luzPreenchimento)

    const luzContorno1 = new THREE.DirectionalLight(0xffffff, 2.8)
    luzContorno1.position.set(-4, 3, -5)
    scene.add(luzContorno1)

    const luzContorno2 = new THREE.DirectionalLight(0xffe2c4, 1.5)
    luzContorno2.position.set(4, -3, -4)
    scene.add(luzContorno2)

    const spotLente = new THREE.SpotLight(0xffffff, 4, 10, Math.PI / 6, 0.5, 1)
    spotLente.position.set(0, 4, 3)
    scene.add(spotLente)

    const pivo = new THREE.Group()
    scene.add(pivo)

    let modelo = null
    let escalaBase = 1
    const ROTACAO_BASE_Y = Math.PI

    const loader = new GLTFLoader()
    loader.load(
      'camera.glb',
      (gltf) => {
        modelo = gltf.scene

        modelo.traverse((filho) => {
          if (filho.isMesh && filho.material) {
            filho.castShadow = true
            filho.receiveShadow = true

            const materiais = Array.isArray(filho.material)
              ? filho.material
              : [filho.material]

            materiais.forEach((mat) => {
              mat.envMapIntensity = 1.8
              if (
                mat.name.toLowerCase().includes('glass') ||
                mat.name.toLowerCase().includes('lens') ||
                mat.name.toLowerCase().includes('vidro')
              ) {
                mat.transparent = true
                mat.opacity = 0.85
                mat.roughness = 0.05
                mat.metalness = 0.1
                mat.depthWrite = true
              } else if (mat.transparent && mat.opacity >= 0.95) {
                mat.transparent = false
                mat.depthWrite = true
              }
              mat.side = THREE.FrontSide
              mat.needsUpdate = true
            })
          }
        })

        const caixa = new THREE.Box3().setFromObject(modelo)
        const centro = caixa.getCenter(new THREE.Vector3())
        modelo.position.sub(centro)

        const tamanho = caixa.getSize(new THREE.Vector3())
        const maiorLado = Math.max(tamanho.x, tamanho.y, tamanho.z)
        if (maiorLado > 0) escalaBase = 1.9 / maiorLado

        pivo.scale.setScalar(escalaBase)
        pivo.add(modelo)
        spotLente.target = modelo

        pivo.position.copy(trajeto.getPointAt(0))
      },
      undefined,
      (erro) => console.error('Erro ao carregar camera.glb:', erro),
    )

    const trajeto = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(5.2, -0.9, -1.6),
        new THREE.Vector3(3.1, -0.45, -0.4),
        new THREE.Vector3(1.5, -0.1, 0.5),
        new THREE.Vector3(0.55, 0.15, 0.9),
        new THREE.Vector3(0.0, -0.05, 0.35),
        new THREE.Vector3(-0.5, 0.25, 0.8),
        new THREE.Vector3(-1.7, 0.55, 0.25),
        new THREE.Vector3(-2.6, 0.8, 0.0),
      ],
      false,
      'catmullrom',
      0.6,
    )

    const posAtual = new THREE.Vector3()
    const alvoOlhar = new THREE.Vector3()
    const quatAlvo = new THREE.Quaternion()
    const matAux = new THREE.Matrix4()
    const cima = new THREE.Vector3(0, 1, 0)

    const T_ENTRADA = 1.2
    const T_FOTOGRAFO = 1.8
    const T_DESLOQUE = 1.2
    const T_TOTAL = T_ENTRADA + T_FOTOGRAFO + T_DESLOQUE

    let tempoTotal = 0
    let ultimoInstante = null
    let emExecucao = false
    let animId

    let centroAtingidoEm = null
    const posicaoProjetada = new THREE.Vector3()

    let liberadoParaScroll = false

    let permitirTravamento = false
    let modeloAssentado = false
    let contadorFrameSombra = 0
    let contadorFrameRender = 0

    let scrollProgressoAlvo = 0
    let scrollProgressoExibido = 0

    const calcularScrollProgresso = () => {
      const rect = secaoFotos.getBoundingClientRect()
      const totalScroll = rect.height - window.innerHeight
      if (totalScroll > 0) {
        scrollProgressoAlvo = clamp01(-rect.top / totalScroll)
      } else {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        scrollProgressoAlvo = docHeight > 0 ? clamp01(window.scrollY / docHeight) : 1
      }
    }
    calcularScrollProgresso()
    window.addEventListener('scroll', calcularScrollProgresso, { passive: true })

    let ultimoInstanteCarrossel = null
    let animIdCarrossel
    const contadoresAtuais = ESTATISTICAS.map(() => 0)

    const animarCarrossel = (instanteAtual) => {
      animIdCarrossel = requestAnimationFrame(animarCarrossel)

      if (ultimoInstanteCarrossel === null) ultimoInstanteCarrossel = instanteAtual
      const delta = Math.min((instanteAtual - ultimoInstanteCarrossel) / 1000, 0.05)
      ultimoInstanteCarrossel = instanteAtual

      scrollProgressoExibido +=
        (scrollProgressoAlvo - scrollProgressoExibido) * amortecer(0.16, delta)

      if (!linhasPalavras.length) return

      const progressoEntradaTexto =
        centroAtingidoEm === null
          ? 0
          : janela(tempoTotal, centroAtingidoEm, centroAtingidoEm + DURACAO_ENTRADA_TEXTO)

      const DIRECOES = [1, -1, 1]
      const CURVAS = [-1, 1, -1]
      const DIST_X_VW = 70
      const DIST_Y_VH = 22

      const progressoCortina = clamp01(scrollProgressoExibido / QUEBRA_DIAGONAL)
      const progressoDiagonal = clamp01(
        (scrollProgressoExibido - QUEBRA_DIAGONAL) / (1 - QUEBRA_DIAGONAL),
      )

      const exitSuave = liberadoParaScroll ? easeInOutCubic(progressoCortina) : 0
      const diagonalSuave = liberadoParaScroll
        ? easeInOutCubic(progressoDiagonal)
        : 0

      linhasPalavras.forEach((linha, i) => {
        const atraso = i * 0.12
        const entradaSuave = easeOutCubic(clamp01((progressoEntradaTexto - atraso) / (1 - atraso)))

        const direcao = DIRECOES[i] ?? 1
        const curva = CURVAS[i] ?? 1
        const angulo = exitSuave * (Math.PI / 2)

        const deslocX = direcao * DIST_X_VW * Math.sin(angulo)
        const deslocY = curva * DIST_Y_VH * (1 - Math.cos(angulo))
        const rotacao = direcao * exitSuave * 35
        const escala = 1 - exitSuave * 0.62
        const entradaY = (1 - entradaSuave) * 28

        linha.style.opacity = entradaSuave * (1 - exitSuave)
        linha.style.transform =
          `translate(${deslocX}vw, calc(${entradaY}px + ${deslocY}vh)) ` +
          `rotate(${rotacao}deg) scale(${escala})`
      })
      if (cortinaEsqRef.current && cortinaDirRef.current) {
        cortinaEsqRef.current.style.transform = `translateX(${-exitSuave * 100}%)`
        cortinaDirRef.current.style.transform = `translateX(${exitSuave * 100}%)`
      }
      const carrosselInterativo = exitSuave > 0.5 && diagonalSuave <= 0
      carrosselInterativoRef.current = carrosselInterativo

      if (trilhoRef.current) {
        trilhoRef.current.classList.toggle('trilho-bloqueado', !carrosselInterativo)
      }

      if (setaEsqRef.current && setaDirRef.current) {
        const abrindo = exitSuave
        const fechado = 1 - abrindo
        const REPOUSO_Y_SETA = 14 // px — distancia das setas
        const DESLOC_X_SETA = 130 // px — quão perto do centro elas partem
        const DESLOC_Y_SETA = 90 // px — quanto mais abaixo elas partem
        const ROTACAO_SETA = 220 // graus percorridos até a posição final

        setaEsqRef.current.style.opacity = abrindo
        setaEsqRef.current.style.pointerEvents = carrosselInterativo ? 'auto' : 'none'
        setaEsqRef.current.style.transform =
          `translateY(${REPOUSO_Y_SETA + fechado * DESLOC_Y_SETA}px) ` +
          `translateX(${fechado * DESLOC_X_SETA}px) ` +
          `rotate(${-fechado * ROTACAO_SETA}deg)`

        setaDirRef.current.style.opacity = abrindo
        setaDirRef.current.style.pointerEvents = carrosselInterativo ? 'auto' : 'none'
        setaDirRef.current.style.transform =
          `translateY(${REPOUSO_Y_SETA + fechado * DESLOC_Y_SETA}px) ` +
          `translateX(${-fechado * DESLOC_X_SETA}px) ` +
          `rotate(${fechado * ROTACAO_SETA}deg)`
      }

      if (pontosRef.current) {
        pontosRef.current.style.opacity = exitSuave
        pontosRef.current.style.pointerEvents = carrosselInterativo ? 'auto' : 'none'
      }

      if (verMaisRef.current) {
        verMaisRef.current.style.opacity = exitSuave
        verMaisRef.current.style.pointerEvents = carrosselInterativo ? 'auto' : 'none'
      }

      if (diagonalCorRef.current) {
        const L = diagonalSuave * 200
        diagonalCorRef.current.style.clipPath =
          `polygon(0% 100%, ${L}% 100%, 0% ${100 - L}%)`
      }

      if (diagonalTextoRef.current) {
        const progressoTexto = easeOutCubic(
          clamp01((diagonalSuave - 0.35) / 0.65),
        )
        // Mesmo clip-path do quadrado bege: o conteúdo só aparece dentro
        // da área já revelada, nunca flutuando por cima do fundo creme.
        const L = diagonalSuave * 200
        diagonalTextoRef.current.style.clipPath =
          `polygon(0% 100%, ${L}% 100%, 0% ${100 - L}%)`
        diagonalTextoRef.current.style.opacity = progressoTexto
        diagonalTextoRef.current.style.transform =
          `translateY(${(1 - progressoTexto) * 24}px)`

        // Contagem dos números: sobem de 0 até o valor final, perseguindo
        // o alvo de forma amortecida (bem mais lenta que o resto), o que
        // deixa a contagem suave em vez de saltar junto com o scroll.
        statsNumeroRefs.current.forEach((el, i) => {
          if (!el) return
          const stat = ESTATISTICAS[i]
          if (!stat) return
          const valorAlvo = progressoTexto * stat.valor
          contadoresAtuais[i] +=
            (valorAlvo - contadoresAtuais[i]) * amortecer(0.045, delta)
          if (Math.abs(valorAlvo - contadoresAtuais[i]) < 0.05) {
            contadoresAtuais[i] = valorAlvo
          }
          const valorExibido = Math.round(contadoresAtuais[i])
          el.textContent = `${stat.prefixo}${valorExibido}${stat.sufixo}`
        })
      }
    }

    animIdCarrossel = requestAnimationFrame(animarCarrossel)
    let direcaoAlvoMarcas = -1
    let direcaoAtualMarcas = -1
    let posXMarcas = 0
    let ultimoInstanteMarcas = null
    let animIdMarcas
    const VELOCIDADE_MARCAS = 34 // px/s no repouso

    const aoRolarRodaMarcas = (evento) => {
      direcaoAlvoMarcas = evento.deltaY > 0 ? -1 : 1
    }
    window.addEventListener('wheel', aoRolarRodaMarcas, { passive: true })
    let ultimoScrollYMarcas = window.scrollY
    const aoRolarScrollMarcas = () => {
      const atual = window.scrollY
      if (atual !== ultimoScrollYMarcas) {
        direcaoAlvoMarcas = atual > ultimoScrollYMarcas ? -1 : 1
        ultimoScrollYMarcas = atual
      }
    }
    window.addEventListener('scroll', aoRolarScrollMarcas, { passive: true })

    const animarMarcas = (instanteAtual) => {
      animIdMarcas = requestAnimationFrame(animarMarcas)

      if (ultimoInstanteMarcas === null) ultimoInstanteMarcas = instanteAtual
      const delta = Math.min((instanteAtual - ultimoInstanteMarcas) / 1000, 0.05)
      ultimoInstanteMarcas = instanteAtual

      direcaoAtualMarcas +=
        (direcaoAlvoMarcas - direcaoAtualMarcas) * amortecer(0.05, delta)

      posXMarcas += direcaoAtualMarcas * VELOCIDADE_MARCAS * delta

      const grupo = marcasGrupoRef.current
      const trilho = marcasTrilhoRef.current
      if (grupo && trilho) {
        const larguraGrupo = grupo.offsetWidth
        if (larguraGrupo > 0) {
          if (posXMarcas <= -larguraGrupo) posXMarcas += larguraGrupo
          if (posXMarcas > 0) posXMarcas -= larguraGrupo
          trilho.style.transform = `translateX(${posXMarcas}px)`
        }
      }
    }
    animIdMarcas = requestAnimationFrame(animarMarcas)

    const animar = (instanteAtual) => {
      animId = requestAnimationFrame(animar)

      if (ultimoInstante === null) ultimoInstante = instanteAtual
      const delta = Math.min((instanteAtual - ultimoInstante) / 1000, 0.05)
      ultimoInstante = instanteAtual
      tempoTotal += delta
      const t = tempoTotal

      if (modelo) {
        const pEntrada = easeInOutCubic(janela(t, 0, T_ENTRADA)) * 0.38
        const pFoto =
          easeInOutCubic(janela(t, T_ENTRADA, T_ENTRADA + T_FOTOGRAFO)) * 0.3
        const pFim =
          easeInOutCubic(janela(t, T_ENTRADA + T_FOTOGRAFO, T_TOTAL)) * 0.32
        const u = clamp01(pEntrada + pFoto + pFim)

        trajeto.getPointAt(u, posAtual)

        const chegou = janela(t, T_TOTAL - 0.8, T_TOTAL + 1.2)
        const flutua = easeOutCubic(chegou)

        if (!modeloAssentado && chegou >= 1) {
          modeloAssentado = true
          renderer.shadowMap.autoUpdate = false
        }

        const deriva = 1 - flutua * 0.55
        posAtual.x += Math.sin(t * 0.47) * 0.07 * deriva
        posAtual.y += Math.cos(t * 0.61) * 0.05 * deriva
        posAtual.z += Math.sin(t * 0.33 + 1.2) * 0.09 * deriva

        posAtual.y += Math.sin(t * 0.85) * 0.085 * flutua
        posAtual.x += Math.sin(t * 0.4 + 0.7) * 0.03 * flutua
        posAtual.z += Math.sin(t * 0.55 + 2.1) * 0.04 * flutua

        pivo.position.lerp(posAtual, amortecer(0.14, delta))

        luzPrincipal.target.position.copy(pivo.position)
        luzPrincipal.position
          .copy(pivo.position)
          .addScaledVector(direcaoLuz, distanciaLuz)
        luzPrincipal.target.updateMatrixWorld()

        const busca = janela(t, T_ENTRADA * 0.6, T_ENTRADA + T_FOTOGRAFO)
        alvoOlhar.set(
          Math.sin(t * 0.31) * 1.4 * busca - pivo.position.x * 0.35,
          Math.sin(t * 0.23 + 1.7) * 0.6 * busca,
          3.2,
        )
        matAux.lookAt(pivo.position, alvoOlhar, cima)
        quatAlvo.setFromRotationMatrix(matAux)
        pivo.quaternion.slerp(quatAlvo, amortecer(0.08, delta))

        modelo.rotation.z = Math.sin(t * 0.42) * 0.06
        modelo.rotation.y =
          ROTACAO_BASE_Y + Math.sin(t * 0.28) * 0.18 * (0.4 + flutua * 0.6)
        modelo.rotation.x = Math.sin(t * 0.37 + 0.9) * 0.05

        const zoom =
          1 +
          Math.sin(t * 0.36) * 0.045 * (1 - flutua * 0.5) +
          Math.sin(t * 0.7) * 0.012 * flutua
        pivo.scale.setScalar(escalaBase * zoom)
        if (centroAtingidoEm === null) {
          posicaoProjetada.copy(pivo.position).project(camera)
          if (Math.abs(posicaoProjetada.x) < LIMIAR_CENTRO_TELA) {
            centroAtingidoEm = t
          }
        }
        if (modeloAssentado) {
          contadorFrameSombra = (contadorFrameSombra + 1) % 3
          if (contadorFrameSombra === 0) renderer.shadowMap.needsUpdate = true
        }
      }

      const rectSecao = secaoFotos.getBoundingClientRect()

      if (!permitirTravamento) {
        permitirTravamento =
          rectSecao.top <= 1 && rectSecao.bottom > window.innerHeight
      } else if (rectSecao.top > 6 || rectSecao.bottom <= window.innerHeight) {
        permitirTravamento = false
      }

      if (permitirTravamento && !liberadoParaScroll) {
        travarScroll()
      } else {
        destravarScroll()
      }

      if (!liberadoParaScroll) {
        const entradaTextoCompleta =
          centroAtingidoEm !== null &&
          t - centroAtingidoEm >= DURACAO_ENTRADA_TEXTO
        const modeloChegouNoCanto = t >= T_TOTAL

        if (entradaTextoCompleta && modeloChegouNoCanto) {
          liberadoParaScroll = true
        }
      }

      if (modeloAssentado) {
        const abrindoCarrossel = liberadoParaScroll && scrollProgressoExibido > QUEBRA_DIAGONAL * 0.85
        // Enquanto uma foto está entrando/saindo, o render 3D pula mais
        // frames — isso libera a thread principal e a GPU bem na hora em
        // que a transição do carrossel mais precisa de fôlego, evitando
        // o engasgo ao trocar de imagem.
        const fatorPular = transicionandoCarrosselRef.current
          ? 8
          : abrindoCarrossel
            ? 4
            : 2
        contadorFrameRender = (contadorFrameRender + 1) % fatorPular
        if (contadorFrameRender === 0) {
          renderer.render(scene, camera)
        }
      } else {
        renderer.render(scene, camera)
      }
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            if (!emExecucao) {
              emExecucao = true
              ultimoInstante = null
              animId = requestAnimationFrame(animar)
            }

            normalizador?.enable()
          } else if (emExecucao) {
            emExecucao = false
            permitirTravamento = false
            cancelAnimationFrame(animId)
            if (!travado) normalizador?.disable()
          }
        })
      },
      { threshold: 0 },
    )
    observador.observe(secaoFotos)

    const normalizador =
      ScrollTrigger.normalizeScroll() || ScrollTrigger.normalizeScroll(true)
    normalizador?.disable()

    let travado = false
    let scrollYAntesDoTravamento = 0

    const travarScroll = () => {
      if (travado) return
      travado = true
      scrollYAntesDoTravamento = window.scrollY
      normalizador?.disable()
      const larguraScrollbar = window.innerWidth - document.documentElement.clientWidth
      document.documentElement.style.overflow = 'hidden'
      if (larguraScrollbar > 0) {
        document.documentElement.style.paddingRight = `${larguraScrollbar}px`
      }
    }

    const destravarScroll = () => {
      if (!travado) return
      travado = false
      document.documentElement.style.overflow = ''
      document.documentElement.style.paddingRight = ''
      normalizador?.enable()
      window.scrollTo(0, scrollYAntesDoTravamento)
    }

    const aoRedimensionar = () => {
      const largura = container.clientWidth
      const altura = container.clientHeight
      camera.aspect = largura / altura
      camera.updateProjectionMatrix()
      renderer.setSize(largura, altura)
    }
    window.addEventListener('resize', aoRedimensionar)

    return () => {
      window.removeEventListener('resize', aoRedimensionar)
      window.removeEventListener('scroll', calcularScrollProgresso)
      window.removeEventListener('wheel', aoRolarRodaMarcas)
      window.removeEventListener('scroll', aoRolarScrollMarcas)
      destravarScroll()
      observador.disconnect()
      cancelAnimationFrame(animId)
      cancelAnimationFrame(animIdCarrossel)
      cancelAnimationFrame(animIdMarcas)
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose()
          const m = obj.material
          if (Array.isArray(m)) m.forEach((mm) => mm.dispose())
          else m?.dispose()
        }
      })
      pmrem.dispose()
      ambienteTextura.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <section className="fotos-wrapper" ref={secaoFotosRef} id="fotos">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <clipPath id="carrossel-onda" clipPathUnits="objectBoundingBox">
            <path d="M0,0.14 C0.25,0 0.75,0 1,0.14 L1,0.86 C0.75,1 0.25,1 0,0.86 Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="fotos-sticky">
        <div className="fotos-carrossel" id="carrossel">
          <div className="carrossel-conteudo">
            <div className="carrossel-legenda-topo">
              <span>{CARROSSEL_LEGENDA.linha1}</span>
              <span>{CARROSSEL_LEGENDA.linha2}</span>
            </div>
            <div className="carrossel-trilho-mascara">
              <div className="carrossel-trilho" ref={trilhoRef}>
                {IMAGENS_CARROSSEL.map((src, i) => {
                  const n = IMAGENS_CARROSSEL.length
                  let rel = i - indiceCarrossel
                  if (rel > n / 2) rel -= n
                  if (rel < -n / 2) rel += n

                  const ativo = rel === 0
                  const distancia = Math.abs(rel)
                  const FAN_X_VW = 9 // afastamento horizontal por passo
                  const FAN_Y_VW = 3 // quanto desce por passo
                  const FAN_ROT_DEG = 9 // rotação por passo
                  const MAX_VISIVEL = 2 // quantas fotos de cada lado ficam visíveis

                  const deslocX = rel * FAN_X_VW
                  const deslocY = distancia * FAN_Y_VW
                  const rotacao = rel * FAN_ROT_DEG
                  const escala = ativo ? 1.12 : Math.max(1 - distancia * 0.08, 0.8)
                  const zIndex = ativo ? 20 : 10 - distancia
                  const visivel = distancia <= MAX_VISIVEL

                  return (
                    <div
                      className={`carrossel-item ${ativo ? 'ativo' : ''}`}
                      key={`${src}-${i}`}
                      onClick={() => !ativo && carrosselIrPara(i)}
                      style={{
                        transform:
                          `translate(-50%, -50%) translate(${deslocX}vw, ${deslocY}vw) ` +
                          `rotate(${rotacao}deg) scale(${escala})`,
                        zIndex,
                        opacity: visivel ? 1 : 0,
                        pointerEvents: visivel ? 'auto' : 'none',
                      }}
                    >
                      <img
                        src={src}
                        alt={`Foto ${i + 1}`}
                        decoding="async"
                        loading="eager"
                        fetchPriority={ativo ? 'high' : 'auto'}
                      />
                    </div>
                  )
                })}
              </div>

              <div className="carrossel-pontos" ref={pontosRef}>
                {IMAGENS_CARROSSEL.map((_, i) => (
                  <button
                    type="button"
                    key={i}
                    className={`carrossel-ponto ${i === indiceCarrossel ? 'ativo' : ''}`}
                    onClick={() => carrosselIrPara(i)}
                    aria-label={`Ir para foto ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              className="carrossel-seta carrossel-seta-esq"
              onClick={carrosselAnterior}
              aria-label="Foto anterior"
              ref={setaEsqRef}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 6 9 12 15 18" />
              </svg>
            </button>
            <button
              type="button"
              className="carrossel-seta carrossel-seta-dir"
              onClick={carrosselProxima}
              aria-label="Próxima foto"
              ref={setaDirRef}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>

            <button
              type="button"
              className="carrossel-ver-mais"
              ref={verMaisRef}
              aria-label="Ver mais fotos"
            >
              VER MAIS
            </button>
          </div>

          <div
            className="carrossel-cortina carrossel-cortina-esq"
            ref={cortinaEsqRef}
          />
          <div
            className="carrossel-cortina carrossel-cortina-dir"
            ref={cortinaDirRef}
          />
        </div>

        <div className="fotos-palavras" ref={palavrasRef}>
          {PALAVRAS_REVELACAO.map((palavra) => (
            <span className="fotos-palavra-linha" key={palavra}>
              {palavra}
            </span>
          ))}
        </div>
        <div className="fotos-canvas" ref={containerRef} />

        <div className="fotos-diagonal-reveal">
          <div className="fotos-diagonal-cor" ref={diagonalCorRef} />
          <div className="fotos-diagonal-texto" ref={diagonalTextoRef}>
            <h2 className="fotos-diagonal-titulo">FELIZ EM TRABALHAR COM</h2>

            <div className="marcas-marquee">
              <div className="marcas-trilho" ref={marcasTrilhoRef}>
                <div className="marcas-grupo" ref={marcasGrupoRef}>
                  {LOGOS_MARCAS.map((src, i) => (
                    <img
                      key={`marca-a-${i}`}
                      src={src}
                      alt=""
                      className="marcas-logo"
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
                <div className="marcas-grupo" aria-hidden="true">
                  {LOGOS_MARCAS.map((src, i) => (
                    <img
                      key={`marca-b-${i}`}
                      src={src}
                      alt=""
                      className="marcas-logo"
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="fotos-djs-mulher-wrap">
              <div className="fotos-stats-coluna fotos-stats-esq">
                {ESTATISTICAS.slice(0, 2).map((stat, i) => (
                  <div className="fotos-stat-item" key={`stat-esq-${i}`}>
                    <span
                      className="fotos-stat-numero"
                      ref={(el) => (statsNumeroRefs.current[i] = el)}
                    >
                      {`${stat.prefixo}0${stat.sufixo}`}
                    </span>
                    <span className="fotos-stat-texto">{stat.texto}</span>
                  </div>
                ))}
              </div>

              <svg
                className="fotos-mulher-estrela"
                viewBox="0 0 200 200"
                aria-hidden="true"
                focusable="false"
              >
                <polygon points="100.0,5.0 111.6,49.3 141.2,14.4 132.4,59.3 174.3,40.8 146.9,77.4 192.6,78.9 152.0,100.0 192.6,121.1 146.9,122.6 174.3,159.2 132.4,140.7 141.2,185.6 111.6,150.7 100.0,195.0 88.4,150.7 58.8,185.6 67.6,140.7 25.7,159.2 53.1,122.6 7.4,121.1 48.0,100.0 7.4,78.9 53.1,77.4 25.7,40.8 67.6,59.3 58.8,14.4 88.4,49.3" />
              </svg>

              <img
                src="mulher.webp"
                alt=""
                className="fotos-diagonal-mulher"
                loading="lazy"
                decoding="async"
              />

              <div className="fotos-stats-coluna fotos-stats-dir">
                {ESTATISTICAS.slice(2, 4).map((stat, i) => (
                  <div className="fotos-stat-item" key={`stat-dir-${i}`}>
                    <span
                      className="fotos-stat-numero"
                      ref={(el) => (statsNumeroRefs.current[i + 2] = el)}
                    >
                      {`${stat.prefixo}0${stat.sufixo}`}
                    </span>
                    <span className="fotos-stat-texto">{stat.texto}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}