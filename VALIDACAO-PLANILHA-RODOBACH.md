# Planilha Rodobach — validação de layout

Prévia: http://localhost:5173/#/simulador → **Planilha Rodobach**.

A proposta usa três blocos tabulares com Motorista/Cliente e Resultado líquido/Margem líquida nas mesmas posições. Os campos de negociação ficam nas próprias células. As abas mantêm acesso aos quatro modelos e aos mesmos dados.

## Referência disponível

Foi analisada a aba **Ca 6E 3** de `Nova tabela de cotações.xlsx`, além das imagens disponíveis na conversa. O arquivo `Nova tabela de cotações(3).xlsx` e as quatro novas imagens citadas no texto de orientação não estavam anexados. A implementação usa o Excel como referência visual, sem importar suas fórmulas.

## Diferenças mantidas para apresentar ao cliente

- O Excel apresenta ETC/TAC e Normal/Alto desempenho simultaneamente em blocos distintos. No sistema, escolhe-se **uma contratação e uma tabela por vez**, aplicadas aos três cenários.
- O motorista do cenário **Motorista + cliente** é o mesmo informado em **Alterar motorista**. O terceiro cenário permite editar o cliente, não um segundo motorista independente.
- Se motorista ou cliente estiverem vazios, continuam usando a referência da cotação padrão. O cliente vazio do terceiro cenário não usa o cliente recalculado do segundo cenário.

## Conferências realizadas

- Sete testes da calculadora: preservação de entradas entre os quatro modelos; falha de API; resposta atrasada; independência da cotação padrão; vínculo e atualização dos cenários; zero monetário distinto de vazio; seguro automático/manual, ETC/TAC, veículo e tabela; cópia e envio da negociação para viagens.
- Verificação no Chromium: três modelos alternativos × dois temas × quatro larguras (1920, 1366, 1024 e 390 px), totalizando 24 combinações. Sem extrapolar a largura da área principal, com ações acessíveis.
- Em 1366 × 768, os valores principais dos três cenários ficam antes de 701 px de altura, com espaço lateral equivalente ao menu aberto. O detalhamento permanece abaixo e pode ser recolhido por cenário.
- Navegação por Tab, manutenção dos valores ao trocar tema/modelo e campos com foco visível.
- Capturas da implementação renderizada, com dados demonstrativos e respostas de API controladas. O teste visual usa a estrutura e o CSS do sistema, com menu lateral simplificado; não representa uma sessão autenticada de produção.

As funções de cálculo, tarifas, percentuais, arredondamentos e contrato da API foram preservados. O ajuste no formato ao sair de campos monetários mantém `0` preenchido, em vez de apagá-lo e reativar um valor automático.

## Capturas locais

As capturas ficam em `../.local-logs/`:

- `rodobach-sheet-sheet-light-1366.png`: notebook, tema claro.
- `rodobach-sheet-sheet-dark-1366.png`: notebook, tema escuro.
- `planilha-rodobach-mobile-light.png`: conteúdo completo no celular, tema claro.
- `planilha-rodobach-mobile-dark.png`: conteúdo completo no celular, tema escuro.

A comparação visual não valida as tarifas da API nem as fórmulas do Excel. A integração de produção e sua autenticação não foram exercitadas nesta rodada de layout.
