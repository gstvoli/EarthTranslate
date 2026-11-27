# Integração de tradução

O EarthTranslate usa o provedor configurado na tela de configurações.
O aplicativo reutiliza conexões HTTP entre traduções. Cada chamada tem um
limite de 5 segundos para estabelecer a conexão e de 15 segundos no total.

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

## Google Cloud Translation — API com cobrança por uso

Ative a **Cloud Translation API** no projeto do Google Cloud e cadastre uma chave
de API nas configurações do EarthTranslate. A chave é armazenada no Gerenciador
de Credenciais do Windows, separadamente da chave do LibreTranslate.

```http
POST https://translation.googleapis.com/language/translate/v2?key=CHAVE_GUARDADA_NO_WINDOWS
Content-Type: application/json
```

```json
{
  "q": "Hello, world!",
  "target": "pt",
  "format": "text"
}
```

Quando o idioma de entrada é selecionado manualmente, o EarthTranslate também
envia `source`. Para detecção automática, esse campo é omitido conforme a API
do Google requer. Restrinja a chave no Google Cloud à Cloud Translation API e
acompanhe a cobrança e as cotas do projeto.

Textos enviados para qualquer provedor deixam o computador. Não use o serviço gratuito para conteúdo confidencial.
