import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './fotos.css'

gsap.registerPlugin(ScrollTrigger)

const ENTRADA_FIM = 0.18


const DIRECOES = [1, -1, 1]

function Fotos() {
  const containerRef = useRef(null)
  const sectionRef = useRef(null)
  const linhaRefs = useRef([])
  const carrosselRef = useRef(null)
  const prevBtnRef = useRef(null)
  const nextBtnRef = useRef(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setVisivel(entry.isIntersecting),
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        },
      })

      tl.to({}, { duration: ENTRADA_FIM })
      tl.addLabel('saida')

      linhaRefs.current.forEach((el, i) => {
        if (!el) return
        const dir = DIRECOES[i]
        tl.to(
          el,
          {
            xPercent: dir * 160,
            rotate: dir * 8,
            scale: 0.3,
            // sobe e volta descendo (curva), igual ao Math.sin do JS manual
            keyframes: { '50%': { y: -70 } },
            duration: 1 - ENTRADA_FIM,
            ease: 'power1.inOut',
          },
          'saida' // as três linhas saem juntas, em sincronia
        )
      })

tl.to(
  carrosselRef.current,
  {
    scale: 1,
    opacity: 1,
    transformOrigin: '50% 50%',
    duration: 1 - ENTRADA_FIM,
    ease: 'power1.out',
  },
  'saida'
)

      tl.set(
        carrosselRef.current,
        { className: '+=carrossel-visivel' },
        `saida+=${(0.15 * (1 - ENTRADA_FIM)).toFixed(3)}`
      )

      tl.fromTo(
        prevBtnRef.current,
        { xPercent: 80, rotate: 360, opacity: 0 },
        {
          xPercent: 0,
          rotate: 0,
          opacity: 1,
          duration: (1 - ENTRADA_FIM) * 0.5,
          ease: 'power1.out',
        },
        `saida+=${(0.5 * (1 - ENTRADA_FIM)).toFixed(3)}`
      )
      tl.fromTo(
        nextBtnRef.current,
        { xPercent: -80, rotate: 360, opacity: 0 },
        {
          xPercent: 0,
          rotate: 0,
          opacity: 1,
          duration: (1 - ENTRADA_FIM) * 0.5,
          ease: 'power1.out',
        },
        '<'
      )

      tl.set(
        carrosselRef.current,
        { pointerEvents: 'auto' },
        `saida+=${(0.6 * (1 - ENTRADA_FIM)).toFixed(3)}`
      )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className="fotos-scroll-container" ref={containerRef}>
      <div className="fotos-viewport">
        <section className="fotos-section" ref={sectionRef}>
          <div className="fotos-top">
            <span className="fotos-brand">Bar Kawwa</span>
          </div>

          <div className="fotos-center">
            <p className={`fotos-titulo ${visivel ? 'visivel' : ''}`}>
              <span
                className="fotos-linha-wrap"
                ref={(el) => (linhaRefs.current[0] = el)}
              >
                <span className="fotos-linha-mask">
                  <span className="fotos-linha">NOSSOS</span>
                </span>
                <img src="imagem.jpg" alt="Bar Kawwa" className="fotos-img" />
              </span>

              <span
                className="fotos-linha-wrap esquerda"
                ref={(el) => (linhaRefs.current[1] = el)}
              >
                <img src="imagem1.jpg" alt="Bar Kawwa" className="fotos-img" />
                <span className="fotos-linha-mask">
                  <span className="fotos-linha">MELHORES</span>
                </span>
              </span>

              <span
                className="fotos-linha-wrap"
                ref={(el) => (linhaRefs.current[2] = el)}
              >
                <span className="fotos-linha-mask">
                  <span className="fotos-linha">MOMENTOS</span>
                </span>
                <img src="imagem2.jpg" alt="Bar Kawwa" className="fotos-img" />
              </span>
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}

export default Fotos