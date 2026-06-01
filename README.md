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

2. Configure a variável de ambiente do provedor de IA que você quer usar.

- `GROQ_API_KEY` para o provedor Groq
- `CLOUDE_API_KEY` para o provedor Cloude
- `GEMINI_API_KEY` para o provedor Gemini

No PowerShell:

```powershell
$env:GROQ_API_KEY = "sua_chave_aqui"
npm start
```

No Linux/macOS:

```bash
export GROQ_API_KEY="sua_chave_aqui"
npm start
```

Para usar `Cloude` ou `Gemini`, substitua `GROQ_API_KEY` por `CLOUDE_API_KEY` ou `GEMINI_API_KEY`.

3. Abra no navegador:

```text
http://localhost:3000
```

## Endpoints

- `GET /` — serve `index.html`.
- `GET /styles.css`, `/js/app.js`, `/data/content.json`, `/data/manual.txt` — serve arquivos estáticos.
- `POST /api/chat` — se a chave de API do provedor selecionado estiver definida, encaminha para essa API; caso contrário, responde com um mock de chat local.

## Vercel e variáveis de ambiente

No Vercel, defina as variáveis de ambiente na dashboard do projeto:

- `GROQ_API_KEY` para Groq
- `CLOUDE_API_KEY` para Cloude
- `GEMINI_API_KEY` para Gemini

Depois disso, abra o chat no frontend e selecione o provedor desejado no menu de IA.

## Notas

- O chat local é um mock. Ele retorna uma resposta de exemplo em vez de consultar a API real.
- Para usar o backend real, será necessário implementar um servidor que encaminhe `/api/chat` para o provedor apropriado e configurar a variável de ambiente `GROQ_API_KEY`.
- Se quiser usar o `api/chat.js` real em produção, mantenha `server.js` apenas como teste local ou adapte-o para carregar este handler.
