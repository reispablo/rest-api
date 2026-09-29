# Laboratorio REST do CadastroPro

Aplicacao didatica em React para alunos praticarem requisicoes HTTP usando as APIs de
autenticacao e estoque do CadastroPro:

```text
https://cadastroprova.netlify.app
```

## Rodar o projeto

```bash
npm install
npm run dev
```

Abra:

```text
http://localhost:5173/
```

## Fluxo sugerido em aula

1. Opcionalmente, enviar `POST /api/auth/cadastro` para criar uma conta de teste.
2. Enviar `POST /api/auth/login` com credenciais validas.
3. Observar o status `200` e o `access_token` retornado.
4. Consultar o proprio cadastro com `GET /api/auth/cadastro`.
5. Usar o token Bearer para testar `GET`, `POST`, `PUT` e `DELETE` em `/api/estoque`.

Ao cadastrar um item de estoque, o laboratorio guarda o ID retornado e o preenche
automaticamente nos desafios de busca, alteracao e exclusao. Durante o desenvolvimento, as chamadas guiadas passam
pelo proxy local do Vite. No build publicado, o navegador chama diretamente a API, que
libera essas rotas para uso didatico por meio de CORS.

## Credenciais de exemplo

```json
{
  "email": "teste@email.com",
  "password": "ja98ch70"
}
```

Use essa conta apenas para o laboratorio. Itens de estoque criados nela sao compartilhados por quem
utilizar as mesmas credenciais. Para isolar seus dados, cadastre outra conta e use o novo
email e senha no desafio de login.
