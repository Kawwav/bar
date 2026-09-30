import { useEffect, useRef, useState } from 'react'
import './maisConteudo.css'

const BEBIDAS_ITENS = [
  { arquivo: 'bebidas/bebida.jpg', arquivoHover: 'bebidas/bebidavermelha.png', nome: 'Gin Tônica', preco: 'R$ 28' },
  { arquivo: 'bebidas/bebida1.jpg', arquivoHover: 'bebidas/bebidavermelha1.png', nome: 'Negroni', preco: 'R$ 32' },
  { arquivo: 'bebidas/bebida2.jpg', arquivoHover: 'bebidas/bebidavermelha2.png', nome: 'Espumante Floral', preco: 'R$ 24' },
  { arquivo: 'bebidas/bebida3.jpg', arquivoHover: 'bebidas/bebidavermelha3.png', nome: 'Mimosa', preco: 'R$ 22' },
]

const COMBOS_ITENS = [
  { arquivo: 'combos/combo.jpg', arquivoHover: 'combos/combovermelho.jpg', nome: 'Balde Destilados', preco: 'R$ 120' },
  { arquivo: 'combos/combo1.jpg', arquivoHover: 'combos/combovermelho1.jpg', nome: 'Balde Amstel', preco: 'R$ 60' },
  { arquivo: 'combos/combo2.jpg', arquivoHover: 'combos/combovermelho2.jpg', nome: 'Balde Devassa', preco: 'R$ 55' },
  { arquivo: 'combos/combo3.jpg', arquivoHover: 'combos/combovermelho3.jpg', nome: 'Balde Sol', preco: 'R$ 65' },
]

const ITENS_VISIVEIS_DESKTOP = 3
const ITENS_VISIVEIS_MOBILE = 2
const QUERY_DESKTOP = '(min-width: 901px)'
const SWIPE_MIN_PX = 40

function useItensVisiveis() {
  const [qtd, setQtd] = useState(() =>
    typeof window !== 'undefined' && !window.matchMedia(QUERY_DESKTOP).matches
      ? ITENS_VISIVEIS_MOBILE
      : ITENS_VISIVEIS_DESKTOP,
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY_DESKTOP)
    const atualizar = () =>
      setQtd(mq.matches ? ITENS_VISIVEIS_DESKTOP : ITENS_VISIVEIS_MOBILE)
    mq.addEventListener('change', atualizar)
    return () => mq.removeEventListener('change', atualizar)
  }, [])

  return qtd
}

const DURACAO_SAIDA = 700
const DURACAO_ENTRADA = 850

const ATRASO_ENTRE_ITENS = 110

function Carrossel({ itens, labelAnterior, labelProximo }) {
  const trackRef = useRef(null)
  const [indice, setIndice] = useState(0)

  const [itensExibidos, setItensExibidos] = useState(itens)

  const [fase, setFase] = useState('idle')
  const itensPendentesRef = useRef(itens)

  const ultimoItensRef = useRef(itens)
  const timeoutRef = useRef(null)

  const itensVisiveis = useItensVisiveis()
  const toqueInicioRef = useRef(null)

  const indiceMax = Math.max(itensExibidos.length - itensVisiveis, 0)

  const indiceAtual = Math.min(indice, indiceMax)

  useEffect(() => {
    if (itens === ultimoItensRef.current) return
    ultimoItensRef.current = itens

    itensPendentesRef.current = itens
    setFase('saindo')
    setIndice(0)

    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setItensExibidos(itensPendentesRef.current)
      setFase('entrando')

      timeoutRef.current = setTimeout(() => {
        setFase('idle')
      }, DURACAO_ENTRADA)
    }, DURACAO_SAIDA)
  }, [itens])

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  useEffect(() => {
    const atualizarPosicao = () => {
      const track = trackRef.current
      if (!track) return
      const primeiroItem = track.children[0]
      if (!primeiroItem) return

      const gap = parseFloat(window.getComputedStyle(track).columnGap || '0')
      const passo = primeiroItem.getBoundingClientRect().width + gap
      track.style.transform = `translateX(-${indiceAtual * passo}px)`
    }

    atualizarPosicao()
    window.addEventListener('resize', atualizarPosicao)
    return () => window.removeEventListener('resize', atualizarPosicao)
  }, [indiceAtual, itensExibidos, itensVisiveis])

  const irParaSlideAnterior = () => {
    setIndice(Math.max(indiceAtual - 1, 0))
  }

  const irParaProximoSlide = () => {
    setIndice(Math.min(indiceAtual + 1, indiceMax))
  }

  const aoTocarInicio = (e) => {
    toqueInicioRef.current = e.touches[0].clientX
  }

  const aoTocarFim = (e) => {
    if (toqueInicioRef.current === null || fase !== 'idle') return
    const dx = e.changedTouches[0].clientX - toqueInicioRef.current
    toqueInicioRef.current = null
    if (dx <= -SWIPE_MIN_PX) irParaProximoSlide()
    else if (dx >= SWIPE_MIN_PX) irParaSlideAnterior()
  }

  const classeItem = (i) => {
    if (fase === 'saindo') return 'mais-conteudo-carrossel-item--saindo'
    if (fase === 'entrando') return 'mais-conteudo-carrossel-item--entrando'
    return ''
  }

  return (
    <>
      <div
        className="mais-conteudo-carrossel"
        style={{ '--visiveis': itensVisiveis }}
        onTouchStart={aoTocarInicio}
        onTouchEnd={aoTocarFim}
      >
        <div className="mais-conteudo-carrossel-track" ref={trackRef}>
          {itensExibidos.map(({ arquivo, arquivoHover, nome, preco }, i) => (
            <div
              className={`mais-conteudo-carrossel-item ${classeItem(i)}`}
              key={arquivo}
              style={{ '--atraso-transicao': `${i * ATRASO_ENTRE_ITENS}ms` }}
            >
              <div className="mais-conteudo-carrossel-frame">
                <img
                  src={arquivo}
                  alt={nome}
                  loading="lazy"
                  className="mais-conteudo-carrossel-img mais-conteudo-carrossel-img--base"
                />
                {arquivoHover && (
                  <img
                    src={arquivoHover}
                    alt={nome}
                    loading="lazy"
                    className="mais-conteudo-carrossel-img mais-conteudo-carrossel-img--hover"
                  />
                )}
              </div>
              <span className="mais-conteudo-carrossel-nome">{nome}</span>
              <span className="mais-conteudo-carrossel-preco">{preco}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mais-conteudo-carrossel-setas">
        <button
          type="button"
          className="mais-conteudo-carrossel-seta"
          onClick={irParaSlideAnterior}
          disabled={indiceAtual === 0 || fase !== 'idle'}
          aria-label={labelAnterior}
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
          className="mais-conteudo-carrossel-seta"
          onClick={irParaProximoSlide}
          disabled={indiceAtual >= indiceMax || fase !== 'idle'}
          aria-label={labelProximo}
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
      </div>
    </>
  )
}

export default function MaisConteudo() {

  const [categoriaAtiva, setCategoriaAtiva] = useState('bebidas')

  useEffect(() => {
    const aoTrocarCategoria = (evento) => {
      setCategoriaAtiva(evento.detail)
    }

    window.addEventListener('cardapio:categoria', aoTrocarCategoria)
    return () =>
      window.removeEventListener('cardapio:categoria', aoTrocarCategoria)
  }, [])

  const itensAtivos = categoriaAtiva === 'combos' ? COMBOS_ITENS : BEBIDAS_ITENS

  return (
    <section className="mais-conteudo" id="mais-conteudo">
      <div className="mais-conteudo-carrossel-bloco" id="cardapio-carrossel">
        <Carrossel
          itens={itensAtivos}
          labelAnterior={categoriaAtiva === 'combos' ? 'Combo anterior' : 'Bebida anterior'}
          labelProximo={categoriaAtiva === 'combos' ? 'Próximo combo' : 'Próxima bebida'}
        />
      </div>
    </section>
  )
}