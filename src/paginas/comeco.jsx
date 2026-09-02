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
    <div className="comeco-wrapper">
      {welcomeState !== 'gone' && (
        <div
          className={`welcome-screen ${welcomeState === 'leaving' ? 'welcome-screen--leaving' : ''}`}
        >
          <p className="welcome-text">SEJA BEM VINDO AO <br /> KAWWA BAR</p>
        </div>
      )}

      <div
        className={`video-stage ${boxed ? 'video-stage--boxed' : ''}`}
        style={{
          transform: `scale(${scale})`,
          filter: `blur(${blur}px)`,
          willChange: 'transform, filter, width, height',
        }}
      >
        <video
          ref={videoARef}
          className={`video-player ${activeSlot === 'a' ? 'slot--active' : 'slot--hidden'}`}
          muted
          playsInline
          loop={false}
        />
        <video
          ref={videoBRef}
          className={`video-player ${activeSlot === 'b' ? 'slot--active' : 'slot--hidden'}`}
          muted
          playsInline
          loop={false}
        />

        <div className={`video-overlay ${boxed ? 'video-overlay--visible' : ''}`}>
          <div className="overlay-top">
            <span className="overlay-brand">
              Bar Kaw
              <span className="letter-with-icon">w</span>
              <span className="letter-with-icon">
                <img src="amor.png" className="amor" alt="" />a
              </span>
            </span>
          </div>

          <div className="overlay-center">
            <p className="overlay-slogan">
              <span className="letter-with-icon">
                <img src="coracao.png" className="coracao" alt="" />G
              </span>
              arantimos{' '}
              <span className="letter-with-icon">
                <img src="contorno.png" className="contorno" alt="" />
                diver
                <span className="accent-wrap">
                  <span className="virar1">s</span>a
                </span>
                o
              </span>{' '}
              do primeiro gole ao{' '}
              <span className="accent-wrap">
                <span className="virar">I</span>u
              </span>
              ltimo brinde
            </p>
          </div>

          <div className="overlay-bottom">
            <span className="overlay-since">Desde 2004</span>
            <span className="overlay-location">PR – CWB</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Comeco
