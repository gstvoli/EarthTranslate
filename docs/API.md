# Integração de tradução

O EarthTranslate usa o provedor configurado na tela de configurações.

## MyMemory — padrão gratuito

O MyMemory é o provedor padrão. Ele não exige chave de API:

```http
GET https://api.mymemory.translated.net/get?q=Hello%2C%20world!&langpair=autodetect%7Cpt
```

Uma resposta bem-sucedida segue o formato:

```json
{
  "responseData": {
    "translatedText": "Olá, mundo!",
    "detectedLanguage": "en"
  },
  "responseStatus": 200,
  "matches": [
    { "translation": "Olá mundo" },
    { "translation": "Oi, mundo!" }
  ]
}
```

Limites gratuitos atuais:

- 5.000 caracteres por dia por IP;
- 500 bytes por chamada;
- 50.000 caracteres por dia quando o usuário fornece um email válido ao MyMemory.

O EarthTranslate exibe até três itens distintos de `matches` como **Outras traduções e expressões** e até cinco resultados adicionais no bloco lateral **Mais**. Essas opções são correspondências retornadas pelo MyMemory, não definições de dicionário.

## LibreTranslate — alternativa com chave

```http
POST https://libretranslate.com/translate
Content-Type: application/json
```

```json
{
  "q": "Hello, world!",
  "source": "auto",
  "target": "pt",
  "format": "text",
  "api_key": "chave-configurada-no-Windows-Credential-Manager"
}
```

`api_key` só é incluído quando uma chave foi cadastrada. A chave não é exposta ao JavaScript da interface nem gravada no `localStorage`.

O endpoint público do LibreTranslate atualmente exige chave de API. Sem ela, ele retorna `400 Bad Request` com a mensagem para criar uma chave no portal do LibreTranslate.

Textos enviados para qualquer provedor deixam o computador. Não use o serviço gratuito para conteúdo confidencial.
