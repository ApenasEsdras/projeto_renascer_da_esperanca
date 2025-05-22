[Início]
   |
   v
[Cliente envia email + senha via HTTP POST (/login)]
   |
   v
[Valida formato do email e senha?]
   |------Não------> [Retorna 400 - Requisição inválida]
   |
   v
[Busca usuário no banco de dados pelo email]
   |
   v
[Usuário encontrado?]
   |------Não------> [Retorna 401 - Credenciais inválidas]
   |
   v
[Compara senha fornecida com senha hash do banco (bcrypt)]
   |
   v
[Senha confere?]
   |------Não------> [Retorna 401 - Credenciais inválidas]
   |
   v
[Gera token JWT (ou session cookie)]
   |
   v
[Retorna 200 + token JWT (ou configura cookie)]
   |
   v
[Fim]


193764582