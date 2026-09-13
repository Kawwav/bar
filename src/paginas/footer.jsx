import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { clone as clonarComEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js'
import dragaoImagem from '/dragon.webp'
import './footer.css'

const CAMINHO_MODELO = `${import.meta.env.BASE_URL}jack.glb`
const ESCALA_MODELO = 0.28
const CONFIGURACAO_GARRAFAS = [
  { escalaRelativa: 0.14, coluna: 0, deslocamentoZ: 0, atraso: 0 },
]


const FATOR_ESPACAMENTO = 0.2

function FooterLink({ href, children }) {
  return (
    <a href={href} className="footer-link">
      <span className="footer-link-textos">
        <span className="footer-link-linha">{children}</span>
        <span className="footer-link-linha" aria-hidden="true">
          {children}
        </span>
      </span>
    </a>
  )
}

function Footer() {
  const footerRef = useRef(null)
  const containerRef = useRef(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight || 1,
      0.05,
      1000,
    )

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(
      container.clientWidth || 300,
      container.clientHeight || 300,
    )
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const luzDirecional = new THREE.DirectionalLight(0xffffff, 1.2)
    luzDirecional.position.set(3, 5, 4)
    scene.add(luzDirecional)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enableZoom = false
    controls.enablePan = false

    const placeholder = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xd40000, wireframe: true }),
    )
    scene.add(placeholder)
    camera.position.set(0, 0, 3)
    camera.lookAt(0, 0, 0)

    let garrafas = []
    let jaEntrouNaTela = false
    const enquadrarGrupo = (caixaGrupo) => {
      const centro = caixaGrupo.getCenter(new THREE.Vector3())
      const largura = caixaGrupo.max.x - caixaGrupo.min.x
      const altura = caixaGrupo.max.y - caixaGrupo.min.y
      const raioGrupo = caixaGrupo.getBoundingSphere(new THREE.Sphere()).radius || 1

      const margem = 1.12
      const fovRad = (camera.fov * Math.PI) / 180
      const aspecto = container.clientWidth / container.clientHeight || 1
      const distanciaPorAltura = altura / 2 / Math.tan(fovRad / 2)
      const distanciaPorLargura = largura / 2 / (Math.tan(fovRad / 2) * aspecto)
      const distancia = Math.max(distanciaPorAltura, distanciaPorLargura) * margem

      camera.position.set(centro.x, centro.y + raioGrupo * 0.1, centro.z + distancia)
      camera.near = Math.max(distancia - raioGrupo * 3, 0.05)
      camera.far = distancia + raioGrupo * 3
      camera.updateProjectionMatrix()

      controls.target.copy(centro)
      controls.update()

      return { raioGrupo, distancia }
    }

    const prepararPoseDeQueda = (objeto, raio, alturaDescanso) => {
      const fovRad = (camera.fov * Math.PI) / 180
      const distanciaCam = camera.position.z - objeto.position.z
      const metadeAlturaVisivel = distanciaCam * Math.tan(fovRad / 2)
      const folga = raio * 0.8
      const alturaInicial = alturaDescanso + metadeAlturaVisivel + folga

      objeto.position.y = alturaInicial
      objeto.rotation.set(0, 0, 0)
      objeto.visible = false
    }

    const iniciarQueda = (item) => {
      const { modelo: objeto, alturaDescanso, atraso } = item
      objeto.visible = true

      const tl = gsap.timeline({ delay: atraso })

      tl.to(
        objeto.position,
        { y: alturaDescanso, duration: 5.2, ease: 'power2.out' },
        0,
      )
      tl.set(objeto.rotation, { z: 0.05 }, 4.6)
      tl.to(
        objeto.rotation,
        { z: 0, duration: 2.5, ease: 'power2.out' },
        4.6,
      )
      tl.eventCallback('onComplete', () => {
        item.assentada = true
      })
      return tl
    }

    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)

    loader.load(
      CAMINHO_MODELO,
      (gltf) => {
        scene.remove(placeholder)

        const modeloBase = gltf.scene
        modeloBase.scale.setScalar(ESCALA_MODELO)
        modeloBase.updateMatrixWorld(true)

        const caixaBase = new THREE.Box3().setFromObject(modeloBase)
        const larguraBase = caixaBase.max.x - caixaBase.min.x || 1
        const espacamento = larguraBase * FATOR_ESPACAMENTO

        const caixaGrupo = new THREE.Box3()
        let primeiraCaixa = true
        const itens = []

        CONFIGURACAO_GARRAFAS.forEach((config) => {

          const clone = clonarComEsqueleto(modeloBase)
          clone.scale.multiplyScalar(config.escalaRelativa)

          clone.position.set(0, 0, 0)
          clone.rotation.set(0, 0, 0)
          clone.updateMatrixWorld(true)

          const caixaClone = new THREE.Box3().setFromObject(clone)
          const centroClone = caixaClone.getCenter(new THREE.Vector3())
          const meiaAltura = (caixaClone.max.y - caixaClone.min.y) / 2
          const raio = caixaClone.getBoundingSphere(new THREE.Sphere()).radius || 1


          clone.position.sub(centroClone)
          clone.position.y += meiaAltura
          clone.position.x += config.coluna * espacamento
          clone.position.z += config.deslocamentoZ
          clone.updateMatrixWorld(true)

          const alturaDescanso = clone.position.y

          const caixaDescanso = new THREE.Box3().setFromObject(clone)
          if (primeiraCaixa) {
            caixaGrupo.copy(caixaDescanso)
            primeiraCaixa = false
          } else {
            caixaGrupo.union(caixaDescanso)
          }

          scene.add(clone)

          itens.push({
            modelo: clone,
            raio,
            alturaDescanso,
            baseX: clone.position.x,
            baseZ: clone.position.z,
            atraso: config.atraso,
            assentada: false,
          })
        })

        enquadrarGrupo(caixaGrupo)

        itens.forEach(({ modelo, raio, alturaDescanso }) => {
          prepararPoseDeQueda(modelo, raio, alturaDescanso)
        })

        garrafas = itens

        if (jaEntrouNaTela) {
          garrafas.forEach((item) => {
            iniciarQueda(item)
          })
        }
      },
      undefined,
      (erroCarregamento) => {
        console.error('[Footer] Erro ao carregar jack.glb:', erroCarregamento)
        setErro(
          `Não consegui carregar "${CAMINHO_MODELO}". Detalhe no console (F12).`,
        )
      },
    )

    const observadorRevelacao = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting && !jaEntrouNaTela) {
            jaEntrouNaTela = true
            if (garrafas.length > 0) {
              garrafas.forEach((item) => {
                iniciarQueda(item)
              })
            }
            observadorRevelacao.disconnect()
          }
        })
      },
      { threshold: 0.1 },
    )
    if (footerRef.current) {
      observadorRevelacao.observe(footerRef.current)
    }

    let frameId
    let ultimoInstanteFrame = null
    let tempoAnimado = 0
    const animar = (instanteAtual) => {
      frameId = requestAnimationFrame(animar)

      if (ultimoInstanteFrame == null) ultimoInstanteFrame = instanteAtual
      const delta = Math.min((instanteAtual - ultimoInstanteFrame) / 1000, 0.05)
      ultimoInstanteFrame = instanteAtual
      tempoAnimado += delta
      const t = tempoAnimado

      if (garrafas.length === 0) {
        placeholder.rotation.y += 0.01
        placeholder.rotation.x += 0.006
      }

      garrafas.forEach((item) => {
        if (!item.assentada) return
        const { modelo, raio, alturaDescanso, baseX, baseZ, atraso } = item

        modelo.position.y =
          alturaDescanso + Math.sin(t * 0.85 + atraso) * raio * 0.05
        modelo.position.x =
          baseX + Math.sin(t * 0.4 + 0.7 + atraso) * raio * 0.025
        modelo.position.z =
          baseZ + Math.sin(t * 0.55 + 2.1 + atraso) * raio * 0.035

        modelo.rotation.z = Math.sin(t * 0.42 + atraso) * 0.05
        modelo.rotation.x = Math.sin(t * 0.37 + 0.9 + atraso) * 0.035
        modelo.rotation.y = Math.sin(t * 0.28 + atraso) * 0.09
      })

      controls.update()
      renderer.render(scene, camera)
    }
    frameId = requestAnimationFrame(animar)

    const observadorDeTamanho = new ResizeObserver(() => {
      const largura = container.clientWidth
      const altura = container.clientHeight
      if (!largura || !altura) return
      camera.aspect = largura / altura
      camera.updateProjectionMatrix()
      renderer.setSize(largura, altura)
    })
    observadorDeTamanho.observe(container)

    return () => {
      observadorDeTamanho.disconnect()
      observadorRevelacao.disconnect()
      cancelAnimationFrame(frameId)
      controls.dispose()
      pmremGenerator.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <footer
      className="footer"
      ref={footerRef}
      style={{ '--footer-dragao': `url(${dragaoImagem})` }}
    >
      <div className="footer-topo">
        <div className="footer-coluna footer-coluna-esquerda">
          <p className="footer-descricao">
            Drinks autorais, boa música e brindes que viram história. Desde 2004, em Curitiba.
          </p>
          <div className="footer-redes">
            <a href="#" aria-label="Instagram" className="footer-icone">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" /></svg>
            </a>
            <a href="#" aria-label="YouTube" className="footer-icone">
              <svg viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M10.3 9.3v5.4l4.9-2.7z" fill="currentColor" /></svg>
            </a>
            <a href="#" aria-label="WhatsApp" className="footer-icone">
              <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3z" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M8.3 8.7c.2-.5.5-.5.8-.5h.6c.2 0 .4 0 .6.5.2.5.7 1.6.7 1.7.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.1.1-.3.3-.4.4-.1.1-.3.3-.1.6.2.4.9 1.4 1.9 2.3 1.3 1.1 2.4 1.5 2.7 1.6.3.1.5.1.7-.1.2-.2.8-.9 1-1.2.2-.3.4-.2.7-.1.3.1 1.9.9 2.2 1 .3.2.5.2.6.4.1.2.1.9-.2 1.8-.3.8-1.6 1.5-2.2 1.6-.6.1-1.3.2-4.2-.9-3.5-1.4-5.7-4.9-5.9-5.2-.2-.3-1.4-1.9-1.4-3.6 0-1.7.9-2.5 1.2-2.8z" fill="currentColor" /></svg>
            </a>
          </div>
        </div>

        <div className="footer-modelo3d" ref={containerRef} />

        <div className="footer-coluna footer-coluna-direita">
          <nav className="footer-links">
            <div className="footer-coluna-links">
              <FooterLink href="#">Cardápio</FooterLink>
              <FooterLink href="#">Unidades</FooterLink>
              <FooterLink href="#">Sobre</FooterLink>
            </div>
            <div className="footer-coluna-links">
              <FooterLink href="#">Busca</FooterLink>
              <FooterLink href="#">Reservas</FooterLink>
              <FooterLink href="#">Contato</FooterLink>
            </div>
          </nav>
          <p className="footer-copyright">© 2026, Kawwa Bar.</p>
        </div>
      </div>

      <div className="footer-marca" aria-hidden="true">
        <div className="footer-marca-linha">
          {'KAWWA'.split('').map((letra, i) => (
            <span key={i}>{letra}</span>
          ))}
        </div>
        <div className="footer-marca-linha">
          {'BAR'.split('').map((letra, i) => (
            <span key={i}>{letra}</span>
          ))}
        </div>
      </div>

      {erro && <p className="footer-erro">{erro}</p>}
    </footer>
  )
}

export default Footer