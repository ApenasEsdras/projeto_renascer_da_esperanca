const express = require('express');
const cors = require('cors'); // ✅ importação
const rotas = require('./routes/routes'); 

const app = express();

app.use(cors()); // ✅ permite requisições de qualquer origem
app.use(express.json());
app.use(rotas);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
