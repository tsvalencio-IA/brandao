# Migração Base44 → SIGFROTA

Este repositório começa como estrutura neutra e executável. O objetivo é portar os módulos existentes sem inventar dados ou substituir regras silenciosamente.

## Já identificados

- Dashboard
- Viaturas
- Detalhe da viatura
- Registrar Baixa
- Ordens de Manutenção
- Detalhe da Ordem
- Checklist
- Oficinas
- Aprovações
- Histórico
- Auditoria
- Usuários
- Portal da Oficina
- Controle Operacional
- Manutenção Rápida
- Estoque
- UGE / Relatórios
- Rota pública por QR Code

## Perfis identificados

- gestor
- adm
- adm_opm
- mecanico
- oficina
- uge

## Próxima camada

1. Concluir captura dos arquivos reais do Base44.
2. Portar componentes e regras sem alterar fluxos.
3. Criar Firebase Auth/Firestore/Storage.
4. Implementar RBAC no backend e frontend.
5. Migrar dados reais somente após definição e validação do modelo Firebase.
