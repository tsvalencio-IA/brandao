# SIGFROTA — Correção de permissões individuais

Esta versão corrige o bloqueio em que usuários só conseguiam operar corretamente quando recebiam ACESSO TOTAL.

## Regra aplicada

- Usuário autenticado no Firebase + perfil ATIVO/APROVADO pode entrar no SIGFROTA.
- Não é necessário marcar ACESSO TOTAL.
- Uma única permissão especial pode liberar o módulo correspondente.
- ACESSO TOTAL continua existindo apenas como atalho para liberar tudo.
- O perfil principal continua definindo os acessos-base já existentes.
- As permissões especiais complementam o perfil principal.

## Correções técnicas

- ProtectedRoute não exige ACESSO TOTAL.
- Rotas individuais respeitam permissoes_especiais.
- Firestore respeita cada permissão individual nas leituras e gravações necessárias.
- Consultas de ADM OPM passam a filtrar a unidade no próprio Firestore.
- Dashboard deixa de consultar coleções que o usuário não pode acessar.
- Botão Gerar OES passa a considerar as permissões especiais do usuário.
- Botão de gestão de viaturas passa a receber o usuário completo na validação.
- Tela de usuários informa explicitamente que 1 ação pode ser liberada sem acesso total.

## Obrigatório no Firebase

Publique o arquivo `firestore.rules` desta versão no projeto Firebase em uso.
Sem publicar essas regras, a interface pode mostrar o módulo liberado enquanto o Firestore ainda bloqueia os dados.
