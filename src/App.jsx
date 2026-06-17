import { useMemo, useState } from 'react'
import './App.css'

const BASE_URL = 'https://barrigarest.wcaquino.me'
const INITIAL_HEADERS = {
  'Content-Type': 'application/json',
}
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

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
  PATCH: 'PATCH atualiza parte de um recurso. Use quando a API aceitar alteracoes parciais.',
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

function normalizeRequestInput(currentMethod, requestUrl) {
  const trimmedUrl = requestUrl.trim()
  const methodUrlMatch = trimmedUrl.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/i)

  if (!methodUrlMatch) {
    return {
      method: currentMethod,
      url: trimmedUrl,
    }
  }

  return {
    method: methodUrlMatch[1].toUpperCase(),
    url: methodUrlMatch[2].trim(),
  }
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

function getHistoryPath(item) {
  try {
    return new URL(item.url).pathname
  } catch {
    return item.url
  }
}

function applyAuthorizationHeader(headers, token, authScheme, requestUrl) {
  if (!token.trim() || authScheme === 'none' || isSigninUrl(requestUrl)) {
    return headers
  }

  if (authScheme === 'raw') {
    headers.Authorization = token.trim()
    return headers
  }

  headers.Authorization = `${authScheme} ${token.trim()}`
  return headers
}

async function executeRequest({ method, url, headersText, bodyText, token, authScheme, useProxy = false }) {
  const request = normalizeRequestInput(method, url)
  const headers = applyAuthorizationHeader(
    tryParseJson(headersText, {}),
    token,
    authScheme,
    request.url,
  )
  const hasBody = !['GET', 'DELETE'].includes(request.method) && bodyText.trim()
  const options = {
    method: request.method,
    headers,
  }

  if (hasBody) {
    options.body = JSON.stringify(tryParseJson(bodyText, {}))
  }

  const startedAt = performance.now()

  if (useProxy) {
    const proxyResult = await fetch('/api/proxy-public', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: request.method,
        url: request.url,
        headers,
        body: hasBody ? tryParseJson(bodyText, {}) : null,
      }),
    })
    const proxyPayload = await proxyResult.json()

    if (!proxyPayload.ok) {
      throw new Error(proxyPayload.error || 'Nao foi possivel enviar a requisicao publica.')
    }

    return {
      method: request.method,
      url: request.url,
      status: proxyPayload.response.status,
      statusText: proxyPayload.response.statusText,
      duration: proxyPayload.duration || Math.round(performance.now() - startedAt),
      body: proxyPayload.response.body,
    }
  }

  const result = await fetch(request.url, options)
  const contentType = result.headers.get('content-type') || ''
  const rawText = await result.text()
  const parsedBody = contentType.includes('application/json') && rawText
    ? JSON.parse(rawText)
    : rawText
  const duration = Math.round(performance.now() - startedAt)

  return {
    method: request.method,
    url: request.url,
    status: result.status,
    statusText: result.statusText,
    duration,
    body: parsedBody,
  }
}

function RequestResponsePanel({
  bodyText,
  emptyText,
  error,
  headersText,
  history,
  isSending,
  method,
  methodHint,
  onClearHistory,
  onSubmit,
  onBodyChange,
  onHeadersChange,
  onMethodChange,
  onTokenChange,
  onUrlChange,
  onAuthSchemeChange,
  response,
  selectedLesson,
  token,
  authScheme,
  tokenHelp,
  url,
}) {
  return (
    <>
      <form autoComplete="off" className="request-panel" onSubmit={onSubmit}>
        <div className="panel-heading">
          <p className="eyebrow">Requisicao</p>
          <h2>{selectedLesson?.title || 'Validador publico'}</h2>
          <p>{selectedLesson?.goal || 'Envie chamadas para qualquer URL publica que aceite requisicoes do navegador.'}</p>
        </div>

        <div className="request-line">
          <select value={method} onChange={(event) => onMethodChange(event.target.value)}>
            {METHODS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <input
            aria-label="URL da API"
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://api.exemplo.com/recurso"
            value={url}
          />
          <button disabled={isSending} type="submit">
            {isSending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>

        <p className="method-hint">{methodHint}</p>

        <div className="editor-grid">
          <div className={`auth-fields ${onAuthSchemeChange ? '' : 'single'}`}>
            <label className="token-field">
              <span>Token</span>
              <input
                autoComplete="off"
                name="api-lab-token"
                onChange={(event) => onTokenChange(event.target.value)}
                placeholder="Opcional. Pode ser gerado pela autenticacao."
                value={token}
              />
              <small>{tokenHelp}</small>
            </label>

            {onAuthSchemeChange && (
              <label className="token-scheme-field">
                Tipo do token
                <select
                  onChange={(event) => onAuthSchemeChange(event.target.value)}
                  value={authScheme}
                >
                  <option value="JWT">JWT</option>
                  <option value="Bearer">Bearer</option>
                  <option value="raw">Header completo</option>
                  <option value="none">Nao enviar</option>
                </select>
                <small>Define como o header Authorization sera enviado.</small>
              </label>
            )}
          </div>

          <label className="headers-editor">
            Headers JSON
            <textarea
              onChange={(event) => onHeadersChange(event.target.value)}
              spellCheck="false"
              value={headersText}
            />
          </label>

          <label className="body-editor">
            Body JSON
            <textarea
              disabled={method === 'GET' || method === 'DELETE'}
              onChange={(event) => onBodyChange(event.target.value)}
              placeholder="GET e DELETE geralmente nao precisam de body"
              spellCheck="false"
              value={bodyText}
            />
          </label>
        </div>
      </form>

      <ResponsePanel
        emptyText={emptyText}
        error={error}
        history={history}
        onClearHistory={onClearHistory}
        response={response}
        selectedLesson={selectedLesson}
      />
    </>
  )
}

function ResponsePanel({ emptyText, error, history, onClearHistory, response, selectedLesson }) {
  return (
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
          <p>{emptyText}</p>
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
            onClick={onClearHistory}
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
                <small>{getHistoryPath(item)}</small>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('guided')
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
  const [publicMethod, setPublicMethod] = useState('GET')
  const [publicUrl, setPublicUrl] = useState('')
  const [publicHeadersText, setPublicHeadersText] = useState(formatJson(INITIAL_HEADERS))
  const [publicBodyText, setPublicBodyText] = useState('')
  const [publicAuthUrl, setPublicAuthUrl] = useState('')
  const [publicAuthMethod, setPublicAuthMethod] = useState('POST')
  const [publicAuthBodyText, setPublicAuthBodyText] = useState('')
  const [publicToken, setPublicToken] = useState('')
  const [publicAuthScheme, setPublicAuthScheme] = useState('JWT')
  const [publicResponse, setPublicResponse] = useState(null)
  const [publicHistory, setPublicHistory] = useState([])
  const [isPublicSending, setIsPublicSending] = useState(false)
  const [publicError, setPublicError] = useState('')

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

    try {
      const request = normalizeRequestInput(method, url)
      setMethod(request.method)
      setUrl(request.url)

      const requestResult = await executeRequest({
        method: request.method,
        url: request.url,
        headersText,
        bodyText,
        token,
        authScheme: 'JWT',
      })

      setResponse(requestResult)
      setHistory((items) => [requestResult, ...items].slice(0, 8))

      if (isSigninUrl(url) && requestResult.body?.token) {
        setToken(requestResult.body.token)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSending(false)
    }
  }

  async function sendPublicRequest(event) {
    event.preventDefault()
    setIsPublicSending(true)
    setPublicError('')
    setPublicResponse(null)

    try {
      let nextToken = publicToken

      if (publicAuthUrl.trim()) {
        const authRequest = normalizeRequestInput(publicAuthMethod, publicAuthUrl)
        setPublicAuthMethod(authRequest.method)
        setPublicAuthUrl(authRequest.url)

        const authResult = await executeRequest({
          method: authRequest.method,
          url: authRequest.url,
          headersText: publicHeadersText,
          bodyText: publicAuthBodyText,
          token: '',
          authScheme: 'none',
          useProxy: true,
        })
        const authToken = authResult.body?.token || authResult.body?.access_token || authResult.body?.jwt

        if (!authToken) {
          throw new Error('Autenticacao enviada, mas nenhum token, access_token ou jwt foi encontrado na resposta.')
        }

        nextToken = authToken
        setPublicToken(authToken)
      }

      const request = normalizeRequestInput(publicMethod, publicUrl)
      setPublicMethod(request.method)
      setPublicUrl(request.url)

      const requestResult = await executeRequest({
        method: request.method,
        url: request.url,
        headersText: publicHeadersText,
        bodyText: publicBodyText,
        token: nextToken,
        authScheme: publicAuthScheme,
        useProxy: true,
      })

      setPublicResponse(requestResult)
      setPublicHistory((items) => [requestResult, ...items].slice(0, 8))
    } catch (requestError) {
      setPublicError(requestError.message)
    } finally {
      setIsPublicSending(false)
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

      <nav className="tabs" aria-label="Modos do laboratorio">
        <button
          className={activeTab === 'guided' ? 'active' : ''}
          onClick={() => setActiveTab('guided')}
          type="button"
        >
          Desafios guiados
        </button>
        <button
          className={activeTab === 'public' ? 'active' : ''}
          onClick={() => setActiveTab('public')}
          type="button"
        >
          URLs publicas
        </button>
      </nav>

      {activeTab === 'guided' && (
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

        <RequestResponsePanel
          bodyText={bodyText}
          emptyText="Escolha um desafio, ajuste os dados e envie a requisicao."
          error={error}
          headersText={headersText}
          history={history}
          isSending={isSending}
          method={method}
          methodHint={methodHints[method]}
          onBodyChange={setBodyText}
          onClearHistory={() => setHistory([])}
          onHeadersChange={setHeadersText}
          onMethodChange={setMethod}
          onSubmit={sendRequest}
          onTokenChange={setToken}
          onUrlChange={setUrl}
          response={response}
          selectedLesson={selectedLesson}
          token={token}
          tokenHelp={
            token
              ? 'Token gerado. Ele sera enviado automaticamente nas outras APIs.'
              : 'Nenhum token gerado ainda.'
          }
          url={url}
        />
      </section>
      )}

      {activeTab === 'public' && (
        <section className="workspace public-workspace">
          <aside className="lessons-panel" aria-label="Autenticacao opcional">
            <div className="panel-heading">
              <p className="eyebrow">Autenticacao</p>
              <h2>Login opcional</h2>
              <p>Use apenas quando a API publica exigir token antes da chamada principal.</p>
            </div>

            <label>
              URL de autenticacao
              <input
                onChange={(event) => setPublicAuthUrl(event.target.value)}
                placeholder="https://api.exemplo.com/login"
                value={publicAuthUrl}
              />
            </label>

            <label>
              Metodo
              <select
                onChange={(event) => setPublicAuthMethod(event.target.value)}
                value={publicAuthMethod}
              >
                {METHODS.filter((item) => item !== 'GET' && item !== 'DELETE').map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label>
              Body do login
              <textarea
                onChange={(event) => setPublicAuthBodyText(event.target.value)}
                placeholder={'{\n  "email": "usuario@exemplo.com",\n  "senha": "123456"\n}'}
                spellCheck="false"
                value={publicAuthBodyText}
              />
            </label>
          </aside>

          <RequestResponsePanel
            bodyText={publicBodyText}
            emptyText="Informe uma URL publica, selecione o metodo e envie a requisicao."
            error={publicError}
            headersText={publicHeadersText}
            history={publicHistory}
            isSending={isPublicSending}
            method={publicMethod}
            methodHint={methodHints[publicMethod]}
            onBodyChange={setPublicBodyText}
            onClearHistory={() => setPublicHistory([])}
            onHeadersChange={setPublicHeadersText}
            onMethodChange={setPublicMethod}
            onSubmit={sendPublicRequest}
            onTokenChange={setPublicToken}
            onUrlChange={setPublicUrl}
            response={publicResponse}
            selectedLesson={null}
            token={publicToken}
            tokenHelp={
            publicToken
                ? `Token pronto. Ele sera enviado como ${publicAuthScheme} na chamada principal.`
                : 'Preencha manualmente ou use a URL de autenticacao para gerar.'
            }
            authScheme={publicAuthScheme}
            onAuthSchemeChange={setPublicAuthScheme}
            url={publicUrl}
          />
        </section>
      )}
    </main>
  )
}

export default App
