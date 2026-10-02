# SIGFROTA - implantação Brandão

Este pacote está configurado para o Firebase `sigfrota-d64d0`.

## Gestor inicial
UID: `uwUU8OkzRbfBtlVR1oeT72H0jYE2`

## GitHub Pages
O projeto mantém `index.html` e `assets/` compilados na raiz e o workflow recompila a partir do fonte.

## Vercel
O `vite.config.js` cria `dist/index.html` automaticamente. O `vercel.json` define `npm run build` e `dist` como saída. Isso elimina o 404 que ocorria quando existia apenas `dist/app.html`.

## Firebase
Publique o arquivo `firestore.rules` no projeto `sigfrota-d64d0`.
Em Authentication > Settings > Authorized domains, adicione os domínios usados, por exemplo `cbbrandao.github.io` e o domínio de produção da Vercel.

Não é necessário colocar API Secret ou service account no repositório.
