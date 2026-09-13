import { useEffect, useRef, useState } from 'react'
import Comeco from './paginas/comeco'
import Cardapio from './paginas/cardapio'
import MaisConteudo from './paginas/maisConteudo'
import Fotos from './paginas/fotos'
import Footer from './paginas/footer'
import './App.css'

//npm run build
//npm run deploy
//git add .
//git commit -m ""
//git checkout main
//git push origin main

const CHAVE_SCROLL = 'kawwa_scroll_y'

function App() {
  const targetRef = useRef(0)
  const [displayProgress, setDisplayProgress] = useState(0)
  const displayRef = useRef(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    const scrollSalvo = sessionStorage.getItem(CHAVE_SCROLL)
    if (scrollSalvo) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(scrollSalvo, 10))
      })
    }

    const salvarScroll = () => {
      sessionStorage.setItem(CHAVE_SCROLL, String(window.scrollY))
    }

    window.addEventListener('beforeunload', salvarScroll)
    window.addEventListener('pagehide', salvarScroll)

    return () => {
      window.removeEventListener('beforeunload', salvarScroll)
      window.removeEventListener('pagehide', salvarScroll)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const vh = window.innerHeight
      const p = Math.min(Math.max(window.scrollY / vh, 0), 1)
      targetRef.current = p
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    const EASE = 0.09
    const EPSILON = 0.0005

    const tick = () => {
      const target = targetRef.current
      const current = displayRef.current
      const diff = target - current

      if (Math.abs(diff) > EPSILON) {
        const next = current + diff * EASE
        displayRef.current = next
        setDisplayProgress(next)
      } else if (current !== target) {
        displayRef.current = target
        setDisplayProgress(target)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const scale = 1 - displayProgress * 0.08  
  const blur  = displayProgress * 4           

  return (
    <div>
      <div style={{ position: 'relative', height: '100vh' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', zIndex: 1 }}>
          <Comeco scale={scale} blur={blur} />
        </div>
      </div>
      <Cardapio />
      <MaisConteudo />
      <Fotos />
      <Footer />

      <div className="secao-espaco" />
    </div>
  )
}

export default App