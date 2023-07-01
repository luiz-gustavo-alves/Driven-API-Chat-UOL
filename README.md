# Driven-API-Chat-UOL <img width="140" height="60" src="https://upload.wikimedia.org/wikipedia/commons/8/81/UOL_logo_old.png"/>
Projeto _back-end_ para construção da API do Bate-papo UOL.

## Requisitos Obrigatórios ⚠️

### Armazenamento dos Dados:
- Utilização de coleções do banco de dados MongoDb.
- Formato geral dos dados:

``` javascript
participantSchema = {
  name: 'usuário',
  lastStatus: 'tempo atual (milissegundos)' 
};

messageSchema = {
  from: 'usuário',
  to: 'todos / usuário',
  text: 'messagem',
  type: 'message (normal) / private message (mensagem privada DM)',
  time: 'tempo atual (HH:mm:ss)'
}
```

### Remoção Automática de Usuários: 
A cada 15 segundos é removido da lista de participantes os participantes que possuam um lastStatus de mais de 10 segundos atrás.

## Rotas ⚙️

### /participants
![](https://place-hold.it/80x20/26baec/ffffff?text=GET&fontsize=16) Retorna lista de participantes.<br>
<br>
![](https://place-hold.it/80x20/26ec48/ffffff?text=POST&fontsize=16) Recebe o parâmetro **name** pelo _body_, salva o usuário no banco de dados e salva uma mensagem informando que o usuário entrou na sala.
<br>
### /messages
![](https://place-hold.it/80x20/26baec/ffffff?text=GET&fontsize=16) Retorna lista de mensagens de acordo com o parâmetro **limit** via _query string_.<br>
<br>
![](https://place-hold.it/80x20/26ec48/ffffff?text=POST&fontsize=16) Recebe os parâmetros **to, text, type** pelo _body_ e o parâmetro **from** pelo _header_ e salva a mensagem no banco de dados.
<br>
### /status
![](https://place-hold.it/80x20/26ec48/ffffff?text=POST&fontsize=16) Recebe o parâmetro **user** pelo _header_ e atualiza o campo **lastStatus** deste usuário.
<br>
### /messages/:id
![](https://place-hold.it/80x20/ec2626/ffffff?text=DELETE&fontsize=16) Recebe o parâmetro **user** pelo _header_ e o **ID** da mensagem via _path params_ e deleta uma mensagem de acordo com o parâmetro **user** e **ID** fornecido.<br>
<br>
![](https://place-hold.it/80x20/ec7926/ffffff?text=PUT&fontsize=16) Recebe os parâmetros **to, text, type** pelo _body_, o parâmetro **user** pelo _header_ e o **ID** da mensagem via _path params_ e atualiza uma mensagem de acordo com o parâmetro **user** e **ID** fornecido.
