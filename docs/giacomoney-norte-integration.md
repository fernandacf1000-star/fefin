# GiacoMoney → Norte: ativação segura (uma única vez)

A integração foi preparada em branches de GitHub e a Edge Function de destino no Norte foi publicada, mas ainda não está ativa: depende do deploy da função de origem no projeto do Adriano, dos segredos e do agendamento. Nenhuma despesa foi importada.

## Princípios

- GiacoMoney exporta apenas a parte de Fernanda em despesas de eventos mensais.
- Eventos especiais e a parte de Adriano não são importados.
- O Norte escreve somente em public.norte_lancamentos, nunca em public.lancamentos do FeFin.
- Cada despesa mantém seu UUID original, evitando importações repetidas. Também é verificada possível duplicidade manual de mesma descrição, valor e data.
- Categoria e subcategoria obrigatórias vêm exclusivamente das listas do Norte: histórico pessoal, regras conhecidas ou IA. Se a classificação não for confiável, a despesa é deixada pendente, sem registro incompleto.
- Não se inventa cartão, pois GiacoMoney não guarda a forma de pagamento.
- A sincronização começa em uma data de inclusão configurada. Alterações e exclusões posteriores no GiacoMoney não são propagadas nesta primeira versão.

## Passo 1 — Adriano, projeto SupaGiacoMoney

1. Revisar e publicar a função supabase/functions/norte-export no projeto jsjrkfjprzlsdlyxgafc, após integrar o PR.
2. Em Edge Functions → Secrets, criar GIACO_NORTE_SYNC_SECRET com um valor forte e aleatório de 32 bytes ou mais.
3. Não compartilhar esse segredo pelo ChatGPT, por mensagens, pelo GitHub, no frontend nem em logs. Ele deverá ser cadastrado também no Supabase do Norte, por uma pessoa autorizada.
4. A função deve responder 401 a chamadas sem o cabeçalho x-giaco-norte-secret correto.

## Passo 2 — Configurar Supabase do Norte

No projeto zhzaiphsnfqcgvtckdgv, em Edge Functions → Secrets, definir:

- GIACO_NORTE_SYNC_SECRET: mesmo segredo privado do GiacoMoney.
- NORTE_GIACO_CRON_SECRET: um segundo segredo aleatório exclusivo da rotina agendada.
- NORTE_IMPORT_USER_ID: ID da Fernanda no Supabase do Norte. A migração original contém 3b2ffd9c-6122-4128-9474-9bf796410e94; confirmar que continua sendo o usuário ativo.
- GIACO_IMPORT_SINCE: data de criação mínima na origem, em formato ISO, por exemplo 2026-11-02T00:00:00-03:00.

A função norte-giacomoney-sync já foi publicada no projeto Norte (version 1), mas não importa nada até todas as configurações estarem válidas. SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são fornecidas automaticamente pelo próprio Supabase à função. A classificação por IA reaproveita ANTHROPIC_API_KEY do Norte.

## Passo 3 — Teste manual antes de agendar

Invocar POST em https://zhzaiphsnfqcgvtckdgv.supabase.co/functions/v1/norte-giacomoney-sync, com cabeçalho x-norte-giaco-cron-secret e o segundo segredo configurado.

Examinar o JSON retornado: imported, alreadyPresent, possibleManualDuplicates e pendingClassification. Conferir as despesas no Norte, especialmente percentuais e categorias. Repetir a chamada: a mesma despesa não pode ser inserida novamente.

## Passo 4 — Agendar a cada cinco minutos

Somente após o teste:
1. Habilitar a extensão pg_cron no banco Norte. As extensões pg_net e supabase_vault já existem.
2. No Supabase Vault, salvar o segundo segredo (NORTE_GIACO_CRON_SECRET) sob o nome norte_giaco_cron_secret.
3. No SQL Editor do Norte, agendar esta consulta usando a referência do Vault (sem copiar segredo literal para o SQL):

    select cron.schedule(
      'norte-giacomoney-sync',
      '*/5 * * * *',
      $$
      select net.http_post(
        url := 'https://zhzaiphsnfqcgvtckdgv.supabase.co/functions/v1/norte-giacomoney-sync',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-norte-giaco-cron-secret',
          (select decrypted_secret from vault.decrypted_secrets
           where name = 'norte_giaco_cron_secret')
        ),
        body := '{}'::jsonb
      );
      $$
    );

O agendamento roda no servidor, inclusive com os aplicativos fechados. Nenhuma autorização é necessária a cada despesa.

## Testes de aceite

- R$ 300 em despesa mensal 50/50 no GiacoMoney deve importar R$ 150 para Norte.
- Split mensal de 30% deve importar apenas 30% do total.
- Evento especial deve continuar fora do Norte.
- Rodar duas vezes não deve duplicar.
- Verificar que não existe lançamento sem categoria e subcategoria.
- O FeFin original permanece intacto.

Nenhuma dessas etapas de ativação é concluída automaticamente pelo merge dos PRs.