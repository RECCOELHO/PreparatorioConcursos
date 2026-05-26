# PreparatorioConcursos

Projeto de estudo com interface para o Manual do PEP (SPDATA SGH® Versão 25) e assistente de chat.

## O que está pronto

- `index.html` renderiza o menu lateral e o conteúdo do `data/content.json`.
- `js/app.js` carrega o conteúdo e o manual (`data/manual.txt`) de forma assíncrona.
- `data/manual.txt` agora contém o manual completo copiado de `manual_pep.txt`.
- `server.js` fornece um servidor local estático e um endpoint mock de `POST /api/chat`.

## Como rodar localmente

1. Instale dependências (apenas para futuras bibliotecas, o servidor local usa Node puro):

```bash
npm install
```

2. Inicie o servidor local:

```bash
npm start
```

3. Abra no navegador:

```text
http://localhost:3000
```

## Endpoints

- `GET /` — serve `index.html`.
- `GET /styles.css`, `/js/app.js`, `/data/content.json`, `/data/manual.txt` — serve arquivos estáticos.
- `POST /api/chat` — responde com um mock de chat para testes locais.

## Notas

- O chat local é um mock. Ele retorna uma resposta de exemplo em vez de consultar a API real.
- Para usar o backend real, será necessário implementar um servidor que encaminhe `/api/chat` para o provedor apropriado e configurar a variável de ambiente `GROQ_API_KEY`.
- Se quiser usar o `api/chat.js` real em produção, mantenha `server.js` apenas como teste local ou adapte-o para carregar este handler.
