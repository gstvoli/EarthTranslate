# Atualizações automáticas

O EarthTranslate verifica a versão mais recente publicada nas [GitHub Releases](https://github.com/gstvoli/EarthTranslate/releases).

A partir da versão `0.1.5`, a edição instalada no Windows verifica atualizações antes de abrir o tradutor. Se houver uma versão nova, o aplicativo baixa o pacote, valida a assinatura e executa o instalador em modo silencioso. O instalador fecha e reabre o EarthTranslate automaticamente.

A verificação tem limite de 4 segundos e o download tem limite de 30 segundos. Se houver uma falha, o tradutor abre na versão atual. Também é possível selecionar **Continuar sem atualizar** durante a verificação ou o download.

## Segurança

- Os artefatos de atualização são assinados pelo Tauri.
- A chave pública faz parte do `src-tauri/tauri.conf.json`.
- A chave privada está em `%USERPROFILE%\.tauri\earthtranslate-updater.key` e foi cadastrada como o segredo `TAURI_SIGNING_PRIVATE_KEY` no GitHub.
- Não mova, compartilhe ou exclua essa chave. Perder a chave impede que versões já instaladas recebam atualizações futuras.

## Publicar uma versão

1. Atualize a versão em `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` e `src-tauri/tauri.conf.json`.
2. Faça commit das alterações.
3. Crie e envie uma tag:

```powershell
git tag v0.1.2
git push origin v0.1.2
```

O workflow `.github/workflows/release.yml` gera os instaladores assinados, publica a GitHub Release e cria `latest.json`, que é o manifesto consumido pelo atualizador.

## Primeira instalação com atualizador

Se você já usa uma versão instalada entre `0.1.1` e `0.1.4`, use **Atualizar agora** uma última vez. A partir de `0.1.5`, as atualizações seguintes são instaladas na inicialização.

Versões anteriores a `0.1.1` não têm atualizador. Quem usa apenas o executável extraído também deve instalar a edição Windows uma vez para receber atualizações automáticas. O executável portátil não é substituído pelo atualizador: use o novo atalho da edição instalada ou continue trocando o executável portátil manualmente.
