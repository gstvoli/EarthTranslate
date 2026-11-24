# Plano de ação — EarthTranslate

## 1. Objetivo e recorte do MVP

Criar um aplicativo desktop para Windows que abra rapidamente por atalho global e traduza texto digitado ou colado em sua própria janela.

**Fluxo principal do MVP**

1. O usuário pressiona `Ctrl+Alt+T`.
2. O EarthTranslate mostra a janela e posiciona o cursor no campo de entrada.
3. O usuário digita ou cola o texto e confirma com `Ctrl+Enter`.
4. A janela exibe o resultado e permite copiá-lo.

**Fora do MVP**

- Captura automática de texto selecionado em outros aplicativos.
- Substituição do texto selecionado em outros aplicativos.
- Tradução de páginas inteiras, imagens e documentos.
- Histórico sincronizado entre dispositivos.
- Login obrigatório e cobrança própria.
- Suporte inicial para macOS e Linux.

## 2. Decisões técnicas

| Tema | Decisão inicial | Motivo |
| --- | --- | --- |
| Desktop | Tauri 2 | Menor consumo de memória e acesso a APIs nativas via Rust. |
| Interface | React + TypeScript + Vite | Produtividade para pop-up, preferências e histórico. |
| Atalho global | Plugin/API global-shortcut do Tauri | Permite mostrar, focar ou ocultar a janela sem sair do aplicativo atual. |
| Entrada de texto | Campo próprio com suporte a digitar e colar | Mantém o MVP previsível, sem automação de outros aplicativos. |
| Saída | Resultado selecionável e botão de cópia | Permite reutilizar a tradução sem modificar o aplicativo de origem. |
| Preferências | Armazenamento local do Tauri | Persiste atalhos, idiomas, tema e configurações de provedor. |
| Tradução | Adaptador de provedores | Troca simples entre LibreTranslate, DeepL, Google e Azure. |
| Dados locais | SQLite ou armazenamento do Tauri | Preferências e histórico opcional, sem depender da nuvem. |

## 3. Arquitetura

```text
Atalho global
     │
     ▼
Controle da janela (Rust)
 ├── mostra/oculta
 └── entrega foco ao campo de texto
          │
          ▼
Janela React
 ├── entrada de texto e seleção de idiomas
 ├── comando para traduzir
 ├── resultado selecionável
 └── botão/atalho para copiar
          │
          ▼
Adaptador de tradução ──► API configurada
```

## 4. Fases de execução

### Fase 0 — Fundação do projeto

- Criar o aplicativo Tauri com React e TypeScript.
- Configurar lint, formatação, testes unitários e pipeline de CI.
- Implementar tela de configurações e persistência local para idiomas, provedor, atalhos e tema.
- Criar um componente de captura de teclas que apresente a combinação escolhida pelo usuário.
- Criar o contrato `TranslationProvider`.
- Critério de saída: aplicação empacota e a tela de configurações salva e restaura preferências.

### Fase 1 — Janela e atalho global

- Registrar `Ctrl+Alt+T` e exibir conflito de atalho quando houver.
- Alternar entre mostrar/focar e ocultar a janela a cada acionamento.
- Ao mostrar a janela, posicionar o foco no campo de entrada.
- Permitir alterar o atalho global na tela de configurações; ao salvar, desregistrar o anterior e registrar o novo.
- Validar combinações reservadas pelo sistema, duplicadas ou indisponíveis antes de salvar.
- Oferecer restauração de todos os atalhos aos valores padrão.
- Critério de saída: o aplicativo pode ser aberto, focado e ocultado somente pelo teclado.

### Fase 2 — Tradução e interface

- Implementar um provedor local/de desenvolvimento e o primeiro provedor de produção.
- Adicionar cancelamento, timeout, repetição limitada e mensagens de erro compreensíveis.
- Criar tela com entrada multilinha, detecção de idioma de origem e idioma de destino configurável.
- Permitir tradução por botão e por `Ctrl+Enter`.
- Exibir indicadores de carregamento, mensagem de erro e texto traduzido selecionável.
- Critério de saída: tradução exibida em até 1,5 s no cenário de referência.

### Fase 3 — Ações rápidas

- Botão para copiar a tradução e feedback visual de confirmação.
- `Esc` para ocultar a janela.
- `Ctrl+Alt+G`: alternar o idioma de destino.
- Expor atalhos internos configuráveis na tela de configurações: traduzir, copiar resultado, alternar idioma e ocultar.
- Navegação completa por teclado.
- Critério de saída: ciclo abrir → digitar/colar → traduzir → copiar pode ser feito somente pelo teclado.

### Fase 4 — Qualidade, privacidade e distribuição

- Criar testes de unidade para normalização, seleção de provedor e interface; testes de integração para atalhos e janela.
- Guardar chaves de API no cofre de credenciais do sistema; nunca no código ou em logs.
- Informar claramente o que é enviado ao provedor e oferecer modo sem histórico.
- Assinar o instalador Windows, preparar atualizações automáticas e telemetria estritamente opcional.
- Critério de saída: instalador reproduzível, política de privacidade e checklist de release aprovados.

## 5. Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Latência ou indisponibilidade da API | Experiência lenta | Timeouts, cancelamento, cache local opcional e provedores alternativos. |
| Texto sensível enviado a terceiros | Risco de privacidade | Consentimento explícito, mínimo de retenção, exclusão de histórico e opção de endpoint corporativo. |
| Conflito de atalhos | Ação não é disparada | Validação no cadastro e alternativas configuráveis. |
| Atalho global muda fora do aplicativo | O comando deixa de responder | Informar falha no registro e preservar o último atalho válido. |

## 6. Backlog priorizado

1. Shell Tauri + tela de configurações e persistência local.
2. Captura, validação e restauração de atalhos padrão.
3. Registro de atalho global e comportamento de mostrar/ocultar.
4. Campo de texto, idiomas e janela com foco.
5. Adaptador de tradução e configuração segura de chave.
6. Copiar resultado e ações por teclado.
7. Histórico local opcional.
8. Empacotamento, assinatura e atualizações.

## 7. Métricas de sucesso

- Mediana de menos de **1,5 s** do atalho à resposta, em textos de até 500 caracteres.
- Todo o fluxo principal disponível sem mouse.

## 8. Próximo passo recomendado

Criar o shell Tauri com React e implementar o atalho global para mostrar, focar e ocultar a janela. Em seguida, implementar o campo de texto e o primeiro provedor de tradução.
