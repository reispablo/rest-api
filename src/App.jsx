import { useMemo, useState } from 'react'
import './App.css'

const BASE_URL = 'https://barrigarest.wcaquino.me'
const INITIAL_HEADERS = {
  'Content-Type': 'application/json',
}

const lessons = [
  {
    id: 'signin',
    title: 'Login e token',
    method: 'POST',
    endpoint: '/signin',
    goal: 'Enviar email e senha para receber um token de acesso.',
    expectedStatus: 200,
    body: {
      email: 'senaiteste@gmail.com',
      senha: '123456',
      redirecionar: false,
    },
  },
  {
    id: 'accounts-list',
    title: 'Listar contas',
    method: 'GET',
    endpoint: '/contas',
    goal: 'Buscar recursos existentes usando uma chamada autenticada.',
    expectedStatus: 200,
    body: null,
  },
  {
    id: 'account-create',
    title: 'Criar conta',
    method: 'POST',
    endpoint: '/contas',
    goal: 'Criar um novo recurso enviando dados no corpo da requisicao.',
    expectedStatus: 201,
    body: {
      nome: 'Conta Aula API',
    },
  },
  {
    id: 'account-update',
    title: 'Editar conta',
    method: 'PUT',
    endpoint: '/contas/ID_DA_CONTA',
    goal: 'Alterar um recurso existente usando o identificador na URL.',
    expectedStatus: 200,
    body: {
      nome: 'Conta Aula API Atualizada',
    },
  },
  {
    id: 'account-delete',
    title: 'Excluir conta',
    method: 'DELETE',
    endpoint: '/contas/ID_DA_CONTA',
    goal: 'Remover um recurso existente pelo seu identificador.',
    expectedStatus: 204,
    body: null,
  },
]

const methodHints = {
  GET: 'GET busca dados. Normalmente nao envia body e deve ser uma leitura segura.',
  POST: 'POST cria dados ou executa uma acao. O body costuma carregar as informacoes novas.',
  PUT: 'PUT atualiza dados existentes. A URL aponta para o recurso e o body leva a nova versao.',
  DELETE: 'DELETE remove dados. A URL precisa identificar exatamente o recurso.',
}

const statusHints = {
  200: 'Sucesso. A API processou a requisicao.',
  201: 'Criado. Um novo recurso foi salvo.',
  204: 'Sem conteudo. A acao funcionou, mas nao ha JSON para exibir.',
  400: 'Requisicao invalida. Confira JSON, campos obrigatorios e tipos de dados.',
  401: 'Nao autorizado. Verifique login, token e header Authorization.',
  403: 'Acesso negado. O usuario autenticado nao tem permissao para esta acao.',
  404: 'Nao encontrado. Confira o endpoint e o ID usado na URL.',
  500: 'Erro interno da API. A requisicao chegou, mas o servidor falhou.',
}

function formatJson(value) {
  if (value === '' || value === null || value === undefined) {
    return ''
  }

  return JSON.stringify(value, null, 2)
}

function tryParseJson(text, fallback) {
  if (!text.trim()) {
    return fallback
  }

  return JSON.parse(text)
}

function isSigninUrl(requestUrl) {
  try {
    return new URL(requestUrl).pathname === '/signin'
  } catch {
    return false
  }
}

function buildHeaders(headersText, token, requestUrl) {
  const headers = tryParseJson(headersText, {})

  if (token.trim() && !isSigninUrl(requestUrl)) {
    headers.Authorization = `JWT ${token.trim()}`
  }

  return headers
}

function getStatusHint(status) {
  return statusHints[status] || 'Resposta recebida. Analise o status e o corpo retornado pela API.'
}

function getExpectedMessage(response, lesson) {
  if (!response || !lesson?.expectedStatus) {
    return null
  }

  if (response.status === lesson.expectedStatus) {
    return `Resultado esperado para este desafio: ${lesson.expectedStatus}.`
  }

  return `Esperado neste desafio: ${lesson.expectedStatus}. Recebido: ${response.status}.`
}

function App() {
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0].id)
  const [method, setMethod] = useState('POST')
  const [url, setUrl] = useState(`${BASE_URL}/signin`)
  const [token, setToken] = useState('')
  const [headersText, setHeadersText] = useState(formatJson(INITIAL_HEADERS))
  const [bodyText, setBodyText] = useState(formatJson(lessons[0].body))
  const [response, setResponse] = useState(null)
  const [history, setHistory] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === selectedLessonId),
    [selectedLessonId],
  )

  function applyLesson(lesson) {
    setSelectedLessonId(lesson.id)
    setMethod(lesson.method)
    setUrl(`${BASE_URL}${lesson.endpoint}`)
    setBodyText(formatJson(lesson.body))
    setError('')
    setResponse(null)
  }

  async function sendRequest(event) {
    event.preventDefault()
    setIsSending(true)
    setError('')
    setResponse(null)

    const startedAt = performance.now()

    try {
      const headers = buildHeaders(headersText, token, url)
      const hasBody = !['GET', 'DELETE'].includes(method) && bodyText.trim()
      const options = {
        method,
        headers,
      }

      if (hasBody) {
        options.body = JSON.stringify(tryParseJson(bodyText, {}))
      }

      const result = await fetch(url, options)
      const contentType = result.headers.get('content-type') || ''
      const rawText = await result.text()
      const parsedBody = contentType.includes('application/json') && rawText
        ? JSON.parse(rawText)
        : rawText
      const duration = Math.round(performance.now() - startedAt)
      const requestResult = {
        method,
        url,
        status: result.status,
        statusText: result.statusText,
        duration,
        body: parsedBody,
      }

      setResponse(requestResult)
      setHistory((items) => [requestResult, ...items].slice(0, 8))

      if (isSigninUrl(url) && parsedBody?.token) {
        setToken(parsedBody.token)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Laboratorio REST</p>
          <h1>API Lab para aulas de sistemas</h1>
        </div>
        <span className="base-url">{BASE_URL}</span>
      </header>

      <section className="workspace">
        <aside className="lessons-panel" aria-label="Desafios da aula">
          <div className="panel-heading">
            <p className="eyebrow">Roteiro</p>
            <h2>Desafios guiados</h2>
          </div>

          <div className="lesson-list">
            {lessons.map((lesson) => (
              <button
                className={`lesson-card ${lesson.id === selectedLessonId ? 'active' : ''}`}
                key={lesson.id}
                onClick={() => applyLesson(lesson)}
                type="button"
              >
                <span className={`method-pill ${lesson.method.toLowerCase()}`}>
                  {lesson.method}
                </span>
                <strong>{lesson.title}</strong>
                <small>{lesson.endpoint}</small>
                <small>Esperado: {lesson.expectedStatus}</small>
              </button>
            ))}
          </div>
        </aside>

        <form autoComplete="off" className="request-panel" onSubmit={sendRequest}>
          <div className="panel-heading">
            <p className="eyebrow">Requisicao</p>
            <h2>{selectedLesson?.title}</h2>
            <p>{selectedLesson?.goal}</p>
          </div>

          <div className="request-line">
            <select value={method} onChange={(event) => setMethod(event.target.value)}>
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
            <input
              aria-label="URL da API"
              onChange={(event) => setUrl(event.target.value)}
              value={url}
            />
            <button disabled={isSending} type="submit">
              {isSending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>

          <p className="method-hint">{methodHints[method]}</p>

          <div className="editor-grid">
            <label className="token-field">
              <span>Token JWT</span>
              <input
                autoComplete="off"
                name="api-lab-jwt-token"
                onChange={(event) => setToken(event.target.value)}
                placeholder="Vazio ao abrir. Envie o login para gerar automaticamente."
                value={token}
              />
              <small>
                {token
                  ? 'Token gerado. Ele sera enviado automaticamente nas outras APIs.'
                  : 'Nenhum token gerado ainda.'}
              </small>
            </label>

            <label>
              Headers JSON
              <textarea
                onChange={(event) => setHeadersText(event.target.value)}
                spellCheck="false"
                value={headersText}
              />
            </label>

            <label className="body-editor">
              Body JSON
              <textarea
                disabled={method === 'GET' || method === 'DELETE'}
                onChange={(event) => setBodyText(event.target.value)}
                placeholder="GET e DELETE geralmente nao precisam de body"
                spellCheck="false"
                value={bodyText}
              />
            </label>
          </div>
        </form>

        <aside className="response-panel" aria-label="Resposta da API">
          <div className="panel-heading">
            <p className="eyebrow">Retorno</p>
            <h2>Resposta da API</h2>
          </div>

          {error && (
            <div className="feedback error">
              <strong>Erro ao enviar</strong>
              <p>{error}</p>
            </div>
          )}

          {!error && !response && (
            <div className="empty-state">
              <strong>Pronto para testar</strong>
              <p>Escolha um desafio, ajuste os dados e envie a requisicao.</p>
            </div>
          )}

          {response && (
            <div className="response-result">
              <div className="status-row">
                <span className={response.status < 400 ? 'status ok' : 'status fail'}>
                  {response.status} {response.statusText}
                </span>
                <span>{response.duration} ms</span>
              </div>
              {getExpectedMessage(response, selectedLesson) && (
                <p
                  className={
                    response.status === selectedLesson.expectedStatus
                      ? 'challenge-check ok'
                      : 'challenge-check fail'
                  }
                >
                  {getExpectedMessage(response, selectedLesson)}
                </p>
              )}
              <p className="status-hint">{getStatusHint(response.status)}</p>
              <pre>{formatJson(response.body) || 'Sem conteudo no corpo da resposta.'}</pre>
            </div>
          )}

          <div className="history">
            <div className="history-heading">
              <h3>Historico</h3>
              <button
                disabled={history.length === 0}
                onClick={() => setHistory([])}
                type="button"
              >
                Limpar
              </button>
            </div>
            {history.length === 0 ? (
              <p>Nenhuma chamada enviada ainda.</p>
            ) : (
              <ol>
                {history.map((item, index) => (
                  <li key={`${item.method}-${item.url}-${index}`}>
                    <span className={`method-pill ${item.method.toLowerCase()}`}>
                      {item.method}
                    </span>
                    <span>{item.status}</span>
                    <small>{new URL(item.url).pathname}</small>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </section>
    </main>
  )
}

export default App
