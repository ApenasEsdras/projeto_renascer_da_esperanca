const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const autenticarToken = require('./auth');
require('dotenv').config();


const router = express.Router();

const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Rota protegida exemplo
router.get('/perfil', autenticarToken, (req, res) => {
  res.json({ msg: 'Você acessou uma rota protegida', usuario: req.usuario });
});

// Login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
  }

  try {
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const usuario = result.rows[0];

    if (!usuario) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaConfere) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// Registro
router.post('/register', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
  }

  try {
    const hash = await bcrypt.hash(senha, 10);
    const result = await db.query(
      'INSERT INTO usuarios (email, senha_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hash]
    );

    res.status(201).json({ usuario: result.rows[0] });
  } catch (erro) {
    console.error(erro);
    if (erro.code === '23505') {
      res.status(400).json({ erro: 'Email já cadastrado' });
    } else {
      res.status(500).json({ erro: 'Erro interno do servidor' });
    }
  }
});

// Listar pessoas (protegida)
router.get('/pessoas', autenticarToken, async (req, res) => {
  try {
    const resultado = await db.query('SELECT * FROM pessoas WHERE criado_por = $1', [req.usuario.id]);
    res.json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar pessoas' });
  }
});

// Cadastrar pessoa (protegida)
router.post('/pessoas', autenticarToken, async (req, res) => {
  const { nome, data_nascimento, tipo } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'Nome é obrigatório' });
  }

  try {
    const resultado = await db.query(
      'INSERT INTO pessoas (nome, data_nascimento, tipo, criado_por, atualizado_em) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [nome, data_nascimento, tipo, req.usuario.id]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao cadastrar pessoa' });
  }
});

// Sincronizar pessoas - envio (protegida)
router.post('/sync/pessoas', autenticarToken, async (req, res) => {
  const pessoas = req.body.pessoas;
  try {
    for (const p of pessoas) {
      await db.query(`
        INSERT INTO pessoas (id, nome, data_nascimento, tipo, criado_por, atualizado_em)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          nome = EXCLUDED.nome,
          data_nascimento = EXCLUDED.data_nascimento,
          tipo = EXCLUDED.tipo,
          atualizado_em = EXCLUDED.atualizado_em
      `, [p.id, p.nome, p.data_nascimento, p.tipo, req.usuario.id, p.atualizado_em]);
    }
    res.status(200).json({ sucesso: true });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao sincronizar dados' });
  }
});

// Sincronizar pessoas - receber atualizações (protegida)
router.get('/sync/pessoas', autenticarToken, async (req, res) => {
  const desde = req.query.desde;
  try {
    const resultado = await db.query(`
      SELECT * FROM pessoas
      WHERE criado_por = $1 AND atualizado_em > $2
    `, [req.usuario.id, desde]);

    res.status(200).json({ pessoas: resultado.rows });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar dados atualizados' });
  }
});

module.exports = router;
