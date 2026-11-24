# EarthTranslate

Aplicativo desktop para tradução rápida, acionado por um atalho global e usado por meio de um campo de texto próprio.

## Experiência-alvo

1. A pessoa pressiona `Ctrl+Alt+T` em qualquer aplicativo.
2. O EarthTranslate abre ou ganha foco.
3. A pessoa digita ou cola o texto a traduzir.
4. A tradução aparece rapidamente, com opção de cópia.

## Stack proposta

- **Tauri 2**: aplicativo desktop leve, com binários nativos.
- **React + TypeScript + Vite**: interface e estado da aplicação.
- **Rust**: integração com atalhos globais, área de transferência e APIs nativas.
- **Provedor de tradução intercambiável**: LibreTranslate para desenvolvimento; DeepL, Google Cloud Translation ou Azure Translator em produção.

Consulte [docs/PLANO_DE_ACAO.md](docs/PLANO_DE_ACAO.md) para o plano, riscos e marcos.

## Executar em desenvolvimento

Pré-requisitos no Windows: Node.js 20+, Rust estável com o toolchain MSVC e as dependências do [Tauri para Windows](https://v2.tauri.app/start/prerequisites/).

```bash
npm install
npm run tauri:dev
```

Por padrão, o MVP utiliza o endpoint público do LibreTranslate. Esse serviço exige uma chave de API, que deve ser cadastrada em **Configurações**. A chave é salva no Gerenciador de Credenciais do Windows; ela não é incluída no armazenamento local do navegador. O endpoint pode ser alterado para utilizar um serviço próprio ou corporativo.

Consulte [docs/API.md](docs/API.md) para o contrato de chamada ao serviço de tradução.

## Atalhos iniciais

| Atalho | Ação |
| --- | --- |
| `Ctrl+Alt+T` | Mostrar, focar ou ocultar o EarthTranslate |
| `Ctrl+Enter` | Traduzir o texto digitado |
| `Ctrl+Alt+G` | Alternar o idioma de destino |
| `Esc` | Ocultar a janela |

O atalho global deverá ser configurável e detectar conflitos com o sistema ou outros aplicativos.

## Configurações

A tela de configurações permitirá:

- Alterar o atalho global de mostrar/ocultar a aplicação.
- Definir atalhos internos para traduzir, copiar o resultado e ocultar a janela.
- Validar combinações inválidas ou já utilizadas.
- Restaurar os atalhos padrão.
- Escolher idiomas padrão e o provedor de tradução.

## Estrutura planejada

```text
src/                 # Interface React
src-tauri/           # Núcleo Rust e integrações nativas
docs/                # Produto, arquitetura e decisões
tests/               # Testes automatizados
```
