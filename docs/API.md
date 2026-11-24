# Integração de tradução

O EarthTranslate usa o endpoint configurado na tela de configurações. O padrão é o LibreTranslate:

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

Uma resposta bem-sucedida segue o formato:

```json
{
  "translatedText": "Olá, mundo!",
  "detectedLanguage": {
    "language": "en"
  }
}
```

O endpoint público do LibreTranslate atualmente exige chave de API. Sem ela, ele retorna `400 Bad Request` com a mensagem para criar uma chave no portal do LibreTranslate.
