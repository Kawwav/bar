import { useEffect, useRef, useState } from 'react'
import Comeco from './paginas/comeco'
import Cardapio from './paginas/cardapio'
import Fotos from './paginas/fotos'

//git add .
//git commit -m ""
//git branch -M main

function App() {
  const targetRef = useRef(0)
  const [displayProgress, setDisplayProgress] = useState(0)
  const displayRef = useRef(0)
  const rafRef = useRef(null)
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

  const scale = 1 - displayProgress * 0.08   // 1 → 0.92
  const blur  = displayProgress * 4           // 0 → 4px

  return (
    <div>
      <div style={{ position: 'relative', height: '100vh' }}>
        {/* COMECO fica fixo (sticky) enquanto a página rola */}
        <div style={{ position: 'sticky', top: 0, height: '100vh', zIndex: 1 }}>
          <Comeco scale={scale} blur={blur} />
        </div>
      </div>
      <Cardapio />
      <Fotos />
    </div>
  )
}

export default App