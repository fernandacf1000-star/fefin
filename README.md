# Norte

Aplicativo pessoal com três abas: Hoje, Semana e Tudo. React 18, TypeScript estrito, Vite, CSS simples e Supabase. O código ativo está em `norte-src/`; `index.html` aponta exclusivamente para ele. O código legado de `src/` não faz parte do build. A branch `main` continua sendo o FeFin.

## Executar

```sh
npm ci
npm run dev -- --host 127.0.0.1
npm test
npm run build
```

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente ou em `.env.local`. Ambas são variáveis públicas de cliente. Nunca use uma service-role key no frontend. O login é e-mail e senha da mesma conta do FeFin. Consultas e alterações filtram `user_id` e usam as políticas RLS existentes.

## Regras

- O orçamento usa a data da compra, deslocando a parcela N em N−1 meses; exclui receitas, Aportes e lançamentos reembolsados dos Pais.
- A fatura usa o próximo fechamento, incluindo o dia atual. O pagamento acontece no primeiro vencimento estritamente posterior ao fechamento.
- A memória compara descrições sem acentos/caixa e conta cada parcelamento uma única vez. Frequência vence; empate usa o registro mais recente.
- Categorias são fixas. Pais mantém macro conhecida e usa `subcategoria_pais='Pais'`. Correções atualizam todas as parcelas do grupo.
- O lançamento é salvo antes da classificação adicional. Falha da IA mantém o registro e permite escolher categoria. Desfazer exclui somente os IDs da última inclusão desta sessão.
- A revisão semanal é armazenada neste aparelho por usuário e por semana (segunda-feira como início).
- A PWA guarda apenas o shell público; dados financeiros e respostas de autenticação não são armazenados no service worker. Sem conexão, não é possível gravar gastos.

## Edge Functions

Fontes em `supabase/functions/`, compartilhando calendário, memória e parsing de SMS em `_shared/`.

- `norte-ai`: `verify_jwt=true`, valida usuário com `getUser`, tarefas `parse` e `classify`, categorias fixas e `ANTHROPIC_API_KEY` no servidor.
- `sms-lancamento`: `verify_jwt=false` exclusivamente porque o webhook autentica por `x-sms-key` com `SMS_SECRET`. Preserva o usuário e os cartões existentes, `dry_run`, os formatos Master/pais/Visa e a divisão de centavos na última parcela. A deduplicação compara estabelecimento, cartão, data, valor e quantidade de parcelas dos últimos dez minutos. Mensagens irrelevantes são ignoradas.

As chaves privadas ficam nos secrets já existentes do Supabase. Não há migração de schema nem alteração de dados históricos.

## Vercel

Deploy de **preview** a partir da branch `norte`, no projeto Vercel já ligado ao repositório. Não promover o preview sobre a produção do FeFin. O build usa `npm run build`, saída `dist`, com as duas variáveis públicas do Supabase. `vercel.json` configura o fallback de navegação e impede cache longo do service worker.

No iPhone: abrir a URL no Safari, Compartilhar → Adicionar à Tela de Início. A instalação usa o nome Norte, ícone de bússola e modo standalone.

## Validação

21 testes automatizados cobrem calendário, limites de mês, orçamento e parcelas, memória e empates, regras dos pais, quatro formatos de SMS, arredondamento, login sem sessão, anotação com IA indisponível, desfazer, edição de categoria e revisão semanal. Os testes de interface usam Supabase simulado e não alteram dados reais. A validação autenticada com dados reais depende da sessão pessoal da usuária.
