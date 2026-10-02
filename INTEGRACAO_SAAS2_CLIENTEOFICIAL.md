# Integração SAAS-2 CLIENTEOFICIAL → SIGFROTA

## Regra de sincronização
- Nenhum CLIENTEOFICIAL do SAAS-2 aparece automaticamente no SIGFROTA.
- O envio só acontece quando um Gestor/Admin do Jarvis clicar **🔄 SIGFROTA** no cliente governamental.
- Novo clique atualiza o mesmo vínculo e gera nova notificação no SIGFROTA.

## Dados sincronizados
- Dados públicos da oficina SAAS-2.
- Dados do CLIENTEOFICIAL: órgão, CNPJ, unidade, fiscal e parâmetros contratuais.
- Viaturas vinculadas ao CLIENTEOFICIAL.
- Ordens de serviço vinculadas.
- Serviços das OS.
- Peças do orçamento da OS.
- Peças Cília com código, descrição, quantidade, valor e metadados Cília disponíveis.
- Não são enviados PIN/senha do CLIENTEOFICIAL nem `pecasReais`/dados confidenciais de compra.

## Chat
- O chat usa a coleção `saas2_chat` do Firebase do SIGFROTA.
- Jarvis e SIGFROTA escutam a mesma conversa em tempo real.
- Mensagens do Jarvis geram notificação visível no SIGFROTA.

## Notificações
- Cada sincronização cria um evento em `saas2_sync_events`.
- O SIGFROTA mostra sino com contador e popup em tempo real.
- A oficina integrada é aberta por `/oficinas/:integrationId`.

## Primeira configuração obrigatória
1. Publicar o `firestore.rules` deste pacote no Firebase do SIGFROTA.
2. No Jarvis, abrir um CLIENTEOFICIAL e clicar **🔄 SIGFROTA**.
3. Na primeira vez será pedido login de uma conta autorizada do SIGFROTA.
4. Use uma conta Gestor/ADM ou com permissão `gerenciar_oficinas`, `integrar_saas2` ou `acesso_total`.
5. A senha não é gravada pelo SAAS-2; o Firebase mantém a sessão autenticada do navegador.

## Firebase SIGFROTA configurado neste pacote
- Project ID: `sigfrota-d64d0`
- Bootstrap Gestor UID: `uwUU8OkzRbfBtlVR1oeT72H0jYE2`

Powered by Matheus Brandão e thIAguinho Soluções Digitais.
