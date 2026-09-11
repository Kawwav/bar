import { useState, useEffect, useRef } from 'react'
import './comeco.css'

const videos = ['1.mp4', '2.mp4', '3.mp4']

const INTERVAL = 4000
const WELCOME_HOLD = 3000
const CURTAIN_DURATION = 900
const FULLSCREEN_HOLD = 1400

function Comeco({ scale = 1, blur = 0 }) {
  const [welcomeState, setWelcomeState] = useState('visible')
  // 'full' = vídeo ocupando a tela inteira | 'boxed' = retângulo com textos
  const [stageMode, setStageMode] = useState('full')
  const videoARef = useRef(null)
  const videoBRef = useRef(null)
  const [activeSlot, setActiveSlot] = useState('a')
  const timerRef = useRef(null)
  const nextIndexRef = useRef(1)

  // Bloqueia o scroll enquanto a cortina estiver visível ou subindo
  useEffect(() => {
    if (welcomeState === 'visible' || welcomeState === 'leaving') {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [welcomeState])

  // Cortina azul sobe -> vídeo em tela cheia -> vira retângulo
  useEffect(() => {
    const hold = setTimeout(() => {
      setWelcomeState('leaving')
      setTimeout(() => setWelcomeState('gone'), CURTAIN_DURATION)
    }, WELCOME_HOLD)

    const shrink = setTimeout(
      () => setStageMode('boxed'),
      WELCOME_HOLD + CURTAIN_DURATION + FULLSCREEN_HOLD,
    )

    return () => {
      clearTimeout(hold)
      clearTimeout(shrink)
    }
  }, [])

  // Pré-carrega o próximo vídeo no slot inativo
  const preload = (index, slot) => {
    const ref = slot === 'a' ? videoARef : videoBRef
    if (ref.current) {
      ref.current.src = videos[index]
      ref.current.load()
    }
  }

  useEffect(() => {
    if (videoARef.current) {
      videoARef.current.src = videos[0]
      videoARef.current.load()
      videoARef.current.play().catch(() => {})
    }
    preload(1, 'b')
  }, [])

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      const next = nextIndexRef.current
      const incoming = activeSlot === 'a' ? 'b' : 'a'
      const incomingRef = incoming === 'a' ? videoARef : videoBRef

      incomingRef.current?.play().catch(() => {})
      setActiveSlot(incoming)

      const afterNext = (next + 1) % videos.length
      nextIndexRef.current = afterNext
      preload(afterNext, activeSlot)
    }, INTERVAL)

    return () => clearTimeout(timerRef.current)
  }, [activeSlot])

  const boxed = stageMode === 'boxed'

  return (
    <div className="envoltorio">
      {welcomeState !== 'gone' && (
        <div
          className={`boasvindas ${welcomeState === 'leaving' ? 'saindo' : ''}`}
        >
          <p className="texto">SEJA BEM VINDO AO <br /> KAWWA BAR</p>
        </div>
      )}

      <div
        className={`palco ${boxed ? 'moldurado' : ''}`}
        style={{
          transform: `scale(${scale})`,
          filter: `blur(${blur}px)`,
          willChange: 'transform, filter, width, height',
        }}
      >
        <video
          ref={videoARef}
          className={`video ${activeSlot === 'a' ? 'ativo' : 'oculto'}`}
          muted
          playsInline
          loop={false}
        />
        <video
          ref={videoBRef}
          className={`video ${activeSlot === 'b' ? 'ativo' : 'oculto'}`}
          muted
          playsInline
          loop={false}
        />

        <div className={`sobreposicao ${boxed ? 'visivel' : ''}`}>
          <div className="topo">
            <span className="marca">
              Bar Kaw
              <span className="letra">w</span>
              <span className="letra">
                <img src="amor.png" className="amor" alt="" />a
              </span>
            </span>
          </div>

          <div className="centro">
            <p className="slogan">
              <span className="letra">
                <img src="coracao.png" className="coracao" alt="" />G
              </span>
              arantimos{' '}
              <span className="letra">
                <img src="contorno.png" className="contorno" alt="" />
                diver
                <span className="acento">
                  <span className="giro">s</span>a
                </span>
                o
              </span>{' '}
              do primeiro gole ao{' '}
              <span className="acento">
                <span className="tombo">I</span>u
              </span>
              ltimo brinde
            </p>
          </div>

          <div className="rodape">
            <span className="desde">Desde 2004</span>
            <span className="local">PR – CWB</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Comeco