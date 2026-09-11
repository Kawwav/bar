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

// Quantas imagens ficam visíveis por vez em cada carrossel
const ITENS_VISIVEIS = 3

// Duração (ms) de cada fase da transição ao trocar de categoria.
// Precisa bater com os tempos de animação em maisConteudo.css
const DURACAO_SAIDA = 700
const DURACAO_ENTRADA = 850
// Atraso (ms) entre um item e o próximo, pra dar aquele efeito de "cascata"
const ATRASO_ENTRE_ITENS = 110

// Carrossel genérico: recebe a lista de itens e cuida sozinho do
// slide, do índice atual, do hover de cada imagem e da transição
// de "cair e sumir" / "entrar de cima e de baixo" ao trocar de categoria
function Carrossel({ itens, labelAnterior, labelProximo }) {
  const trackRef = useRef(null)
  const [indice, setIndice] = useState(0)
  // itensExibidos é o que está de fato na tela; pode ficar "atrasado" em
  // relação a `itens` enquanto a animação de saída ainda está rolando
  const [itensExibidos, setItensExibidos] = useState(itens)
  // fase: 'idle' (parado) | 'saindo' (caindo/sumindo) | 'entrando' (chegando)
  const [fase, setFase] = useState('idle')
  const itensPendentesRef = useRef(itens)
  // Guarda qual `itens` já disparou uma transição, pra decidir se um novo
  // clique no nav deve iniciar outra. Não usar `itensExibidos` aqui: como
  // o próprio efeito atualiza `itensExibidos`, colocá-lo nas dependências
  // faz o efeito rodar de novo no meio da transição e o cleanup cancela o
  // timeout que devolveria a fase pra 'idle' — as setas ficam travadas.
  const ultimoItensRef = useRef(itens)
  const timeoutRef = useRef(null)

  const indiceMax = Math.max(itensExibidos.length - ITENS_VISIVEIS, 0)

  // Sempre que a categoria muda de verdade, dispara a sequência:
  // sai a categoria antiga -> troca a lista -> entra a nova
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

  // Limpa qualquer timeout pendente quando o carrossel desmontar
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
      track.style.transform = `translateX(-${indice * passo}px)`
    }

    atualizarPosicao()
    window.addEventListener('resize', atualizarPosicao)
    return () => window.removeEventListener('resize', atualizarPosicao)
  }, [indice, itensExibidos])

  const irParaSlideAnterior = () => {
    setIndice((atual) => Math.max(atual - 1, 0))
  }

  const irParaProximoSlide = () => {
    setIndice((atual) => Math.min(atual + 1, indiceMax))
  }

  const classeItem = (i) => {
    if (fase === 'saindo') return 'mais-conteudo-carrossel-item--saindo'
    if (fase === 'entrando') return 'mais-conteudo-carrossel-item--entrando'
    return ''
  }

  return (
    <>
      <div className="mais-conteudo-carrossel">
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
          disabled={indice === 0 || fase !== 'idle'}
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
          disabled={indice >= indiceMax || fase !== 'idle'}
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
  // Categoria exibida no carrossel único (padrão: bebidas). Troca quando
  // o nav do cardapio.jsx dispara o evento "cardapio:categoria".
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