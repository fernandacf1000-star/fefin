# Novo Fefin — primeira etapa

Desenvolvimento isolado na branch `novo-fefin`. A branch `main` e o aplicativo publicado continuam intactos.

## Acesso

A rota `/novo` exige o mesmo login do Fefin. Nesta branch, o login abre a nova interface. `/dashboard` continua disponível como acesso ao aplicativo completo.

## Implementado

- Início com mês atual, gastos pessoais por mês de referência e pendências registradas.
- Melhor cartão pelo vencimento estimado, considerando fechamento e vencimento reais, virada de ano e meses curtos.
- Movimentos em ordem de data, com busca.
- Formulário manual curto com Pix, débito, dinheiro e cartões; data e parcelas em detalhes recolhidos.
- Parcelas preservam o valor total em centavos.
- Acesso direto à IA existente (`parse-expense`), por texto ou imagem, com revisão antes de salvar.
- Nenhum atalho de voz ou lançamento da Luísa na nova interface.

## Integração e limites desta etapa

Reutiliza autenticação, hooks e tabelas existentes, sem migrar, excluir ou alterar dados. Salvar após autenticar grava no mesmo banco usado pelo Fefin — esta branch isola o código, não os registros.

A função `parse-expense` foi confirmada como ativa no Supabase. Sua qualidade de interpretação e o fluxo autenticado completo ainda exigem teste com uma sessão real. Nenhum lançamento real foi criado durante a verificação.

A área Família continua acessível pelo Fefin completo; ainda não foi redesenhada. O rascunho manual persiste ao fechar o formulário enquanto a página permanece aberta, mas não após recarregar. Pendências usam o campo `pago` existente e não são um saldo bancário reconciliado. Gastos de cartão usam mês de referência da fatura.

## Verificação

`npm run test -- src/next/finance.test.ts`

`npm run build`

O package-lock preexistente não está sincronizado com package.json; para a validação local desta etapa foi utilizado `npm install --ignore-scripts --package-lock=false`, sem atualizar dependências versionadas.
