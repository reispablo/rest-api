import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let rawBody = ''

    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      rawBody += chunk
    })
    req.on('end', () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function publicApiProxy() {
  return {
    name: 'public-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy-public', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'Metodo nao permitido.' })
          return
        }

        try {
          const { method, url, headers = {}, body = null } = await readJsonBody(req)
          const targetUrl = new URL(url)

          if (!['http:', 'https:'].includes(targetUrl.protocol)) {
            sendJson(res, 400, { ok: false, error: 'Use uma URL http ou https.' })
            return
          }

          const requestOptions = {
            method,
            headers,
          }

          if (!['GET', 'DELETE'].includes(method) && body !== null && body !== '') {
            requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
          }

          const startedAt = performance.now()
          const response = await fetch(targetUrl, requestOptions)
          const contentType = response.headers.get('content-type') || ''
          const rawText = await response.text()
          const parsedBody = contentType.includes('application/json') && rawText
            ? JSON.parse(rawText)
            : rawText

          sendJson(res, 200, {
            ok: true,
            duration: Math.round(performance.now() - startedAt),
            response: {
              status: response.status,
              statusText: response.statusText,
              body: parsedBody,
            },
          })
        } catch (error) {
          sendJson(res, 502, {
            ok: false,
            error: error.message || 'Nao foi possivel enviar a requisicao publica.',
          })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), publicApiProxy()],
})
