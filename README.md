# Laboratorio REST

Aplicacao didatica em React para alunos praticarem requisicoes HTTP usando a API:

```text
https://barrigarest.wcaquino.me
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

1. Enviar `POST /signin` com credenciais validas.
2. Observar status `200` e guardar o token retornado.
3. Usar o token para testar `GET`, `POST`, `PUT` e `DELETE` em `/contas`.

## Credenciais de exemplo

```json
{
  "email": "senaiteste@gmail.com",
  "senha": "123456",
  "redirecionar": false
}
```
