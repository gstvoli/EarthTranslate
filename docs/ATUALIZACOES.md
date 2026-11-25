# Atualizações automáticas

O EarthTranslate verifica a versão mais recente publicada nas [GitHub Releases](https://github.com/gstvoli/EarthTranslate/releases).

Quando uma versão mais nova estiver disponível, o aplicativo exibe uma ação para baixar, validar a assinatura e instalar a atualização. No Windows, o instalador fecha e reinicia o aplicativo automaticamente.

## Segurança

- Os artefatos de atualização são assinados pelo Tauri.
- A chave pública faz parte do `src-tauri/tauri.conf.json`.
- A chave privada está em `%USERPROFILE%\.tauri\earthtranslate-updater.key` e foi cadastrada como o segredo `TAURI_SIGNING_PRIVATE_KEY` no GitHub.
- Não mova, compartilhe ou exclua essa chave. Perder a chave impede que versões já instaladas recebam atualizações futuras.

## Publicar uma versão

1. Atualize a versão de forma consistente em `package.json`, `src-tauri/Cargo.toml` e `src-tauri/tauri.conf.json`.
2. Faça commit das alterações.
3. Crie e envie uma tag:

```powershell
git tag v0.1.2
git push origin v0.1.2
```

O workflow `.github/workflows/release.yml` gera os instaladores assinados, publica a GitHub Release e cria `latest.json`, que é o manifesto consumido pelo atualizador.

## Primeira instalação com atualizador

Versões instaladas antes do `0.1.1` não contêm a chave pública do atualizador. Instale manualmente a primeira versão `0.1.1` ou superior; as versões seguintes poderão ser instaladas pelo aplicativo.
