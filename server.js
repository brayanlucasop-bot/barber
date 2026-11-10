const express = require("express");

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const crypto = require("crypto")

const app = express();
const PORTA = process.env.PORT || 3002;

//Configurando os emails
const nodemailer = require("nodemailer")
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOSTER,
  port: 587,
  secure: false, // true para porta 465
  auth: {
    user: process.env.EMAIL_USER, // Puxa do .env
    pass: process.env.EMAIL_PASS  // Puxa do .env
  }
});

console.log(process.env.EMAIL_USER)
console.log(process.env.EMAIL_PASS)

transporter.verify(function(error, success) {
  if (error) {
    console.log("Erro na configuração:", error);
  } else {
    console.log("Servidor pronto para enviar mensagens!");
  }
});

//dicionario de Acao
// {
//    acao: excluir||reagendar
//    data : horario
//    hash:
//    info:{}
// }

const ACOES = Object.freeze({
  EXCLUIR: "EXCLUIR",
  REAGENDAR: "REAGENDAR"
})

const acoesPendentes = {
  'e3196a82f9fb35533d05181fdbb8dd936fa881c3233acdf9c9652a3050a0815d': {
    acao: 'EXCLUIR', data: "2026-11-01T01:16:38.991Z", id: '1', info: {}
  },
  '40e898d458d48f1e472eea863b7dc5486821366fd201bc4a862bae30f38476d9': {
    acao: 'REAGENDAR',
    data: '2026-11-06T22:38:45.206Z',
    id: '2',
    info: { data: '2026-11-19', horario: '15:00' }
  }
}
//preciso saber o usuario num futuro
function criarAcao(acao, id,info) {

  //vamos ter laungs problemas, resolver depois,
  // 1 a gente teria que verificar se o agendamento fa foi excluido ou reagendado antes de fazer o email, mas agora fds
  console.log("testestes id"+ id)
  const sql = `
      SELECT
          agendamentos.id,
          agendamentos.profissional_id,
          clientes.nome AS cliente,
          clientes.whatsapp,
          clientes.email,
          servicos.nome AS servico,
          servicos.preco,
          profissionais.nome AS profissional,
          agendamentos.data,
          agendamentos.horario,
          agendamentos.status,
          agendamentos.criado_em
      FROM agendamentos

      INNER JOIN clientes
          ON clientes.id = agendamentos.cliente_id

      INNER JOIN servicos
          ON servicos.id = agendamentos.servico_id

      INNER JOIN profissionais
          ON profissionais.id = agendamentos.profissional_id

      WHERE agendamentos.id = ?
  `;

  db.get(sql, [id], (erro, agendamento) => {

      if (erro) {
          console.error("Erro ao consultar agendamento:", erro);

      }
      if (!agendamento.id) {
        return 0
      }
          const hashAleatorio = crypto.randomBytes(32).toString('hex');
          acoesPendentes[hashAleatorio] =
          {
            acao: acao,
            data: new Date(),
            id: id,
            info:info
          }

          console.log(acoesPendentes)
          mandarEmail(
            agendamento.email,
            acao == ACOES.EXCLUIR ? "cancelamento do agendamento ": "confirmar reagendamento",
            `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Confirmação de Acesso</title>
            </head>
            <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 450px; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0;">
                    <tr>
                        <td align="center">
                            <h3 style="color: #333; margin-top: 0;">Verificação em Duas Etapas</h3>
                            <p style="color: #666; font-size: 15px; margin-bottom: 25px;">
                               ${ acao == ACOES.EXCLUIR ? "cancelamento do agendamento ": "confirmar reagendamento"}
                            </p>
                            <a href="${process.env.URL_HOSTER}/api/verificar/${hashAleatorio}" style="background-color: #007bff; color: #ffffff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
                                Confirmar
                            </a>
                            <p style="color: #999; font-size: 12px; margin-top: 30px; margin-bottom: 0;">
                                Se não foi você, ignore este email.
                            </p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            ` )

  });


}
function mandarEmail(destinatario, assunto, email) {

    transporter.sendMail({
      from: "barbearia uni9<brayanlucasop@uni9.edu.br>",
      to: destinatario,
      subject: assunto,
      text: "",
      html: email,
    }, (error, info) => {
      if (error) {
        return console.log("Erro ao enviar:", error);
      }
      console.log("E-mail enviado com sucesso:", info.response);
    });

}

function verificarHorarioLivre(agendamentoId, data, horario) {
  return new Promise((resolve, reject) => {

  // Verificar se o horário já está ocupado
  const verificarHorario = `
      SELECT id
      FROM agendamentos
      WHERE profissional_id = (
          SELECT profissional_id
          FROM agendamentos
          WHERE id = ?
      )
      AND data = ?
      AND horario = ?
      AND status IN ('agendado', 'confirmado')
      AND id != ?
  `;

  db.get(
    verificarHorario,
    [agendamentoId, data, horario, agendamentoId],
    (erro, agendamentoExistente) => {
      console.log("oi, estamos aqui")
      console.log(agendamentoExistente)
      if (erro) {
        return resolve([false,"Erro ao verificar horário"])
      }

      if (agendamentoExistente) {
            return resolve([false,"Esse horário já está ocupado."])
      }

      return resolve([true, "horario disponivel"])

    })
   })
}
// ========================================
// CONFIGURAÇÕES
// ========================================

// Permite receber dados em JSON
app.use(express.json());

// Permite receber dados de formulários
app.use(express.urlencoded({ extended: true }));

// ========================================
// PROTEÇÃO DO PAINEL ADMINISTRATIVO
// ========================================

const usuarioAdmin = process.env.ADMIN_USER;
const senhaAdmin = process.env.ADMIN_PASSWORD;

function protegerAdmin(req, res, next) {
    if (!usuarioAdmin || !senhaAdmin) {
        return res.status(503).send(
            "Painel administrativo não configurado."
        );
    }

    const auth = req.headers.authorization || "";
    const [tipo, credenciais] = auth.split(" ");

    let usuario = "";
    let senha = "";

    if (tipo === "Basic" && credenciais) {
        try {
            const texto = Buffer.from(credenciais, "base64").toString("utf8");
            const separador = texto.indexOf(":");

            if (separador !== -1) {
                usuario = texto.slice(0, separador);
                senha = texto.slice(separador + 1);
            }
        } catch (erro) {
            // Credenciais inválidas
        }
    }

    if (usuario === usuarioAdmin && senha === senhaAdmin) {
        return next();
    }

    res.set("WWW-Authenticate", 'Basic realm="Painel Barbearia"');
    return res.status(401).send("Acesso não autorizado.");
}

// Protege a página e todas as rotas administrativas
app.use("/admin.html", protegerAdmin);
app.use("/api/admin", protegerAdmin);

// Define a pasta pública do site
app.use(express.static(path.join(__dirname, "public")));

// ========================================
// BANCO DE DADOS
// ========================================

const caminhoBanco = process.env.DATABASE_PATH || path.join(
    __dirname,
    "database",
    "banco.db"
);

const db = new sqlite3.Database(caminhoBanco, (erro) => {
    if (erro) {
        console.error("❌ Erro ao conectar ao banco:", erro.message);
    } else {
        console.log("✅ Banco de dados conectado!");
    }
});

// ========================================
// CRIAÇÃO DAS TABELAS
// ========================================

db.serialize(() => {

    // -----------------------------
    // TABELA DE SERVIÇOS
    // -----------------------------

    db.run(`
        CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            preco REAL DEFAULT 0,
            duracao INTEGER DEFAULT 30
        )
    `, (erro) => {

        if (erro) {
            console.error("Erro ao criar tabela servicos:", erro.message);
        } else {
            console.log("✅ Tabela servicos pronta!");
        }

    });

    // -----------------------------
    // TABELA DE PROFISSIONAIS
    // -----------------------------

    db.run(`
        CREATE TABLE IF NOT EXISTS profissionais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            ativo INTEGER DEFAULT 1
        )
    `, (erro) => {

        if (erro) {
            console.error(
                "Erro ao criar tabela profissionais:",
                erro.message
            );
        } else {
            console.log("✅ Tabela profissionais pronta!");
        }

    });

    // -----------------------------
    // TABELA DE CLIENTES
    // -----------------------------

    db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            whatsapp TEXT NOT NULL,
            email TEXT NOT NULL
        )
    `, (erro) => {

        if (erro) {
            console.error(
                "Erro ao criar tabela clientes:",
                erro.message
            );
        } else {
            console.log("✅ Tabela clientes pronta!");
        }

    });


    // -----------------------------
    // TABELA DE AGENDAMENTOS
    // -----------------------------

    db.run(`
        CREATE TABLE IF NOT EXISTS agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            cliente_id INTEGER NOT NULL,

            servico_id INTEGER NOT NULL,

            profissional_id INTEGER NOT NULL,

            data TEXT NOT NULL,

            horario TEXT NOT NULL,

            status TEXT DEFAULT 'agendado',

            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (cliente_id)
                REFERENCES clientes(id),

            FOREIGN KEY (servico_id)
                REFERENCES servicos(id),

            FOREIGN KEY (profissional_id)
                REFERENCES profissionais(id),

            UNIQUE (
                profissional_id,
                data,
                horario
            )
        )
    `, (erro) => {

        if (erro) {
            console.error(
                "Erro ao criar tabela agendamentos:",
                erro.message
            );
        } else {
            console.log("✅ Tabela agendamentos pronta!");
        }

    });

});


// ========================================
// INSERIR SERVIÇOS
// ========================================

const servicos = [
    ["Corte degradê", 35, 40],
    ["Corte social", 30, 30],
    ["Barba", 25, 30],
    ["Corte + barba", 50, 60],
    ["Sobrancelha", 15, 15],
    ["Corte e penteado", 45, 50],
    ["Limpeza de pele", 60, 60],
    ["Corte + progressiva", 100, 120],
    ["Corte + alisamento", 100, 120],
    ["Corte + botox", 110, 120],
    ["Corte + hidratação", 80, 90],
    ["Acabamento", 20, 20],
    ["Corte + luzes", 150, 180]
];

// ========================================
// INSERIR SERVIÇOS APENAS SE NÃO EXISTIREM
// ========================================

db.get(
    "SELECT COUNT(*) AS total FROM servicos",
    (erro, resultado) => {

        if (erro) {
            console.error(
                "Erro ao verificar serviços:",
                erro.message
            );

            return;
        }

        if (resultado.total === 0) {

            const comando = `
                INSERT INTO servicos
                (nome, preco, duracao)
                VALUES (?, ?, ?)
            `;

            servicos.forEach((servico) => {

                db.run(
                    comando,
                    servico,
                    (erro) => {

                        if (erro) {
                            console.error(
                                "Erro ao inserir serviço:",
                                erro.message
                            );
                        }

                    }
                );

            });

            console.log("✅ Serviços cadastrados!");

        }

    }
);

// ========================================
// INSERIR PROFISSIONAIS
// ========================================

const profissionais = [
    "Carlos",
    "João",
    "Lucas"
];

db.get(
    "SELECT COUNT(*) AS total FROM profissionais",
    (erro, resultado) => {

        if (erro) {

            console.error(
                "Erro ao verificar profissionais:",
                erro.message
            );

            return;
        }

        if (resultado.total === 0) {

            const comando = `
                INSERT INTO profissionais
                (nome)
                VALUES (?)
            `;

            profissionais.forEach((nome) => {

                db.run(
                    comando,
                    [nome],
                    (erro) => {

                        if (erro) {

                            console.error(
                                "Erro ao inserir profissional:",
                                erro.message
                            );

                        }

                    }
                );

            });

            console.log("✅ Profissionais cadastrados!");

        }

    }
);


// ========================================
// ROTA PRINCIPAL
// ========================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});


// ========================================
// LISTAR SERVIÇOS
// ========================================

app.get("/api/servicos", (req, res) => {

    db.all(
        `
        SELECT *
        FROM servicos
        ORDER BY nome
        `,
        [],
        (erro, resultados) => {

            if (erro) {

                console.error(erro);

                return res.status(500).json({
                    erro: "Erro ao buscar serviços."
                });

            }

            res.json(resultados);

        }
    );

});
// ========================================
// LISTAR PROFISSIONAIS
// ========================================
app.get("/api/profissionais", (req, res) => {

    db.all(
        `
        SELECT *
        FROM profissionais
        WHERE ativo = 1
        ORDER BY nome
        `,
        [],
        (erro, resultados) => {

            if (erro) {

                console.error(erro);

                return res.status(500).json({
                    erro: "Erro ao buscar profissionais."
                });

            }

            res.json(resultados);

        }
    );
});
// ========================================
// VERIFICAR HORÁRIO
// ========================================

app.get("/api/horario-disponivel", (req, res) => {

    const {
        profissional_id,
        data,
        horario
    } = req.query;


    if (
        !profissional_id ||
        !data ||
        !horario
    ) {

        return res.status(400).json({
            disponivel: false,
            erro: "Dados incompletos."
        });

    }

    const sql = `
        SELECT id
        FROM agendamentos
        WHERE profissional_id = ?
        AND data = ?
        AND horario = ?
        AND status IN ('agendado', 'confirmado')
    `;

    db.get(
        sql,
        [
            profissional_id,
            data,
            horario
        ],
        (erro, resultado) => {

            if (erro) {

                console.error(erro);

                return res.status(500).json({
                    disponivel: false,
                    erro: "Erro ao verificar horário."
                });

            }


            res.json({
                disponivel: !resultado
            });

        }
    );

});


// ========================================
// CRIAR AGENDAMENTO
// ========================================

// ========================================
// CONSULTAR AGENDAMENTO
// ========================================

app.get("/api/agendamentos/:id", (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT
            agendamentos.id,
            agendamentos.profissional_id,
            clientes.nome AS cliente,
            clientes.whatsapp,
            clientes.email,
            servicos.nome AS servico,
            servicos.preco,
            profissionais.nome AS profissional,
            agendamentos.data,
            agendamentos.horario,
            agendamentos.status,
            agendamentos.criado_em
        FROM agendamentos

        INNER JOIN clientes
            ON clientes.id = agendamentos.cliente_id

        INNER JOIN servicos
            ON servicos.id = agendamentos.servico_id

        INNER JOIN profissionais
            ON profissionais.id = agendamentos.profissional_id

        WHERE agendamentos.id = ?
    `;

    db.get(sql, [id], (erro, agendamento) => {

        if (erro) {
            console.error("Erro ao consultar agendamento:", erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao consultar agendamento."
            });
        }

        if (!agendamento) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Agendamento não encontrado."
            });
        }

        res.json({
            sucesso: true,
            agendamento: agendamento
        });
    });
});

app.post("/api/agendamentos", (req, res) => {

    const {
        nome,
        whatsapp,
        email,
        servico_id,
        profissional_id,
        data,
        horario
    } = req.body;


    // -----------------------------
    // VALIDAR CAMPOS
    // -----------------------------

    if (
        !nome ||
        !whatsapp ||
        !email ||
        !servico_id ||
        !profissional_id ||
        !data ||
        !horario
    ) {

        return res.status(400).json({
            sucesso: false,
            mensagem: "Preencha todos os campos."
        });

    }

    // ========================================
// VALIDAR DADOS DO CLIENTE
// ========================================

// Remover espaços extras do nome
const nomeLimpo = String(nome).trim();

// Remover caracteres não numéricos do WhatsApp
const whatsappLimpo = String(whatsapp).replace(/\D/g, "");

// Remover espaços extras do e-mail
const emailLimpo = String(email).trim().toLowerCase();

// Validar nome
if (nomeLimpo.length < 3 || nomeLimpo.length > 100) {
    return res.status(400).json({
        sucesso: false,
        mensagem: "Informe um nome válido de 3 a 100 caracteres."
    });
}

// Validar WhatsApp brasileiro com DDD
if (!/^[1-9][0-9]{9,10}$/.test(whatsappLimpo)) {
    return res.status(400).json({
        sucesso: false,
        mensagem: "Informe um WhatsApp válido com DDD."
    });
}

// Validar e-mail
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
    return res.status(400).json({
        sucesso: false,
        mensagem: "Informe um e-mail válido."
    });
}

    // -----------------------------
    // VERIFICAR HORÁRIO
    // -----------------------------

    const verificarHorario = `
        SELECT id
        FROM agendamentos
        WHERE profissional_id = ?
        AND data = ?
        AND horario = ?
        AND status IN ('agendado', 'confirmado')
    `;


    db.get(
        verificarHorario,
        [
            profissional_id,
            data,
            horario
        ],
        (erro, agendamentoExistente) => {

            if (erro) {

                console.error(erro);

                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Erro ao verificar horário."
                });

            }


            if (agendamentoExistente) {

                return res.status(409).json({
                    sucesso: false,
                    mensagem:
                        "Esse horário já está ocupado."
                });

            }


            // -----------------------------
            // CRIAR CLIENTE
            // -----------------------------

            const sqlCliente = `
                INSERT INTO clientes
                (nome, whatsapp, email)
                VALUES (?, ?, ?)
            `;


            db.run(
                sqlCliente,
                [
                    nomeLimpo,
                    whatsappLimpo,
                    emailLimpo
                ],
                function (erro) {

                    if (erro) {

                        console.error(erro);

                        return res.status(500).json({
                            sucesso: false,
                            mensagem:
                                "Erro ao cadastrar cliente."
                        });

                    }


                  const clienteId = this.lastID;


                  // -----------------------------
                  // CRIAR AGENDAMENTO
                  // -----------------------------

                  const sqlAgendamento = `
                      INSERT INTO agendamentos
                      (
                          cliente_id,
                          servico_id,
                          profissional_id,
                          data,
                          horario
                      )
                      VALUES (?, ?, ?, ?, ?)
                  `;


                  db.run(
                      sqlAgendamento,
                      [
                          clienteId,
                          servico_id,
                          profissional_id,
                          data,
                          horario
                      ],
                      function (erro) {

                          if (erro) {

                              console.error(erro);

                              return res.status(500).json({
                                  sucesso: false,
                                  mensagem:
                                      "Erro ao criar agendamento."
                              });

                          }


                          res.status(201).json({

                              sucesso: true,

                              mensagem:
                                  "Agendamento realizado com sucesso!",

                              agendamento_id:
                                  this.lastID

                          });

                      }
                  );

              }
          );

      }
  );

});
                    // ========================================
// LISTAR HORÁRIOS DISPONÍVEIS
// ========================================
app.get("/api/horarios-disponiveis", (req, res) => {

    const {
        profissional_id,
        data
    } = req.query;

    if (!profissional_id || !data) {

        return res.status(400).json({
            sucesso: false,
            mensagem: "Informe o profissional e a data."
        });

    }

    // Horários de funcionamento
    const horarios = [
        "08:00",
        "08:30",
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "13:00",
        "13:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30",
        "16:00",
        "16:30",
        "17:00",
        "17:30"
    ];

    const sql = `
        SELECT horario
        FROM agendamentos
        WHERE profissional_id = ?
        AND data = ?
        AND status IN ('agendado', 'confirmado')
    `;

    db.all(
        sql,
        [profissional_id, data],
        (erro, resultados) => {

            if (erro) {

                console.error(
                    "Erro ao buscar horários:",
                    erro
                );

                return res.status(500).json({
                    sucesso: false,
                    mensagem:
                        "Erro ao buscar horários disponíveis."
                });

            }

            const ocupados =
                resultados.map(
                    agendamento => agendamento.horario
                );

            const disponiveis =
                horarios.filter(
                    horario => !ocupados.includes(horario)
                );

            res.json({
                sucesso: true,
                horarios: disponiveis
            });

        }
    );

});




// ========================================
// CANCELAR AGENDAMENTO
// ========================================

app.put("/api/agendamentos/:id/cancelar", (req, res) => {

    const id = req.params.id;
    criarAcao(ACOES.EXCLUIR, id)
    // const sql = `
    //     UPDATE agendamentos
    //     SET status = 'cancelado'
    //     WHERE id = ?
    //     AND status IN ('agendado', 'confirmado')
    // `;

    // db.run(sql, [id], function (erro) {

    //     if (erro) {

    //         console.error("Erro ao cancelar agendamento:", erro);

    //         return res.status(500).json({
    //             sucesso: false,
    //             mensagem: "Erro ao cancelar agendamento."
    //         });

    //     }

    //     if (this.changes === 0) {

    //         return res.status(400).json({
    //             sucesso: false,
    //             mensagem:
    //                 "Agendamento não encontrado ou já foi cancelado."
    //         });

    //     }

    //     res.json({
    //         sucesso: true,
    //         mensagem: "Agendamento cancelado com sucesso!"
    //     });

    // });

});

// ========================================
// INICIAR SERVIDOR
// ========================================


/* ========================================
   PAINEL ADMINISTRATIVO
======================================== */

app.get("/api/admin/agendamentos", (req, res) => {

    // Data de hoje no formato YYYY-MM-DD
    const agora = new Date();

    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");

    const hoje = `${ano}-${mes}-${dia}`;

    // Lista os agendamentos ativos de hoje
    const sqlAgendamentos = `
        SELECT
            a.id,
            a.data,
            a.horario,
            a.status,
            c.nome AS cliente,
            s.nome AS servico,
            s.preco AS preco,
            p.nome AS profissional
        FROM agendamentos a
        JOIN clientes c ON c.id = a.cliente_id
        JOIN servicos s ON s.id = a.servico_id
        JOIN profissionais p ON p.id = a.profissional_id
        WHERE a.data = ?
        AND a.status IN ('agendado', 'confirmado')
        ORDER BY a.horario ASC
    `;

    db.all(sqlAgendamentos, [hoje], (erro, agendamentos) => {

        if (erro) {
            console.error("Erro ao buscar agendamentos:", erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao buscar os agendamentos."
            });
        }

        // Busca os totais para os cartões do painel
        const sqlResumo = `
            SELECT
                (
                    SELECT COUNT(*)
                    FROM agendamentos
                    WHERE data = ?
                    AND status IN ('agendado', 'confirmado')
                ) AS totalHoje,

                (
                    SELECT COUNT(*)
                    FROM agendamentos
                    WHERE data >= ?
                    AND status IN ('agendado', 'confirmado')
                ) AS proximos,

                (
                    SELECT COALESCE(SUM(s.preco), 0)
                    FROM agendamentos a
                    JOIN servicos s ON s.id = a.servico_id
                    WHERE a.data = ?
                      AND a.status IN ('agendado', 'confirmado')
                ) AS faturamento
        `;

        db.get(sqlResumo, [hoje, hoje, hoje], (erroResumo, resumo) => {

            if (erroResumo) {
                console.error("Erro ao buscar resumo:", erroResumo);

                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Erro ao calcular o resumo."
                });
            }

            res.json({
                sucesso: true,
                totalHoje: resumo.totalHoje,
                proximos: resumo.proximos,
                faturamento: resumo.faturamento,
                agendamentos: agendamentos
            });

        });

    });

});


/* ========================================
   ALTERAR STATUS DO AGENDAMENTO PELO PAINEL
======================================== */

app.patch("/api/admin/agendamentos/:id/status", (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Número de atendimento inválido."
        });
    }

    if (!["confirmado", "cancelado"].includes(status)) {
        return res.status(400).json({
            sucesso: false,
            mensagem: "Status inválido."
        });
    }

    const sql = `
        UPDATE agendamentos
        SET status = ?
        WHERE id = ?
          AND status IN ('agendado', 'confirmado')
    `;

    db.run(sql, [status, id], function (erro) {
        if (erro) {
            console.error("Erro ao alterar atendimento:", erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Não foi possível alterar o atendimento."
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Atendimento não encontrado ou já cancelado."
            });
        }

        res.json({
            sucesso: true,
            mensagem: status === "confirmado"
                ? "Atendimento confirmado!"
                : "Atendimento cancelado!"
        });
    });
});

console.log("asdfasdasdasdfasfasf")


app.get("/api/verificar/:hash",async  (req, res) => {
  const hash = req.params.hash
  console.log(acoesPendentes)
  console.log("bu")
  console.log(acoesPendentes[hash])
  if (!acoesPendentes[hash]?.id) {
    res.json({
      sucesso: false,
      mensagem: "operacao invalida"
    });
    }
    switch (acoesPendentes[hash].acao) {
      case ACOES.EXCLUIR:
        console.log("asda")
        const sql = `
            UPDATE agendamentos
            SET status = 'cancelado'
            WHERE id = ?
            AND status IN ('agendado', 'confirmado')
        `;
        db.run(sql, [acoesPendentes[hash].id], function (erro) {
          if (erro) {
            console.error("Erro ao cancelar agendamento:", erro);
            // res.status(500).json({
            //   sucesso: false,
            //   mensagem: "Erro ao cancelar agendamento."
            // });
          } else if (this.changes === 0) {
            // res.status(400).json({
            //   sucesso: false,
            //   mensagem:
            //     "Agendamento não encontrado ou já foi cancelado."
            // });
          }
          // res.json({
          //   sucesso: true,
          //   mensagem: "Agendamento cancelado com sucesso!"
          // });

        })
        break;
      case (ACOES.REAGENDAR):
        if (await verificarHorarioLivre(acoesPendentes[hash].id, acoesPendentes[hash].info.data, acoesPendentes[hash].info.horario)) {
          const atualizar = `
                     UPDATE agendamentos
                     SET data = ?, horario = ?
                     WHERE id = ?
                     AND status = 'agendado'
                 `;

          console.log("boca do db run")
        db.run(
          atualizar,
          [acoesPendentes[hash].info.data, acoesPendentes[hash].info.horario, acoesPendentes[hash].id],
          function (erro) {

            if (erro) {

              console.error(
                "Erro ao remarcar:",
                erro
              );

              // return res.status(500).json({
              //   sucesso: false,
              //   mensagem:
              //     "Erro ao remarcar atendimento."
              // });

            }

            if (this.changes === 0) {

              // return res.status(400).json({
              //   sucesso: false,
              //   mensagem:
              //     "Atendimento não encontrado ou já cancelado."
              // });

            }

            // res.json({
            //   sucesso: true,
            //   mensagem:
            //     "Atendimento remarcado com sucesso!"
            // });
          })

          }

      break;


    }

    res.redirect('/');

});





// ========================================
// REMARCAR AGENDAMENTO
// ========================================

app.put("/api/agendamentos/:id/remarcar", async  (req, res) => {

    const id = req.params.id;

    const{
        data,
        horario
    } = req.body;

//     // Verificar se os dados foram enviados
    if (!data || !horario) {

      return res.status(400).json({
          sucesso: false,
          mensagem: "Informe a nova data e o novo horário."
      });

    }
  console.log("ver o que tenrona")
  console.log(await verificarHorarioLivre(id, data, horario))
  if (await verificarHorarioLivre(id, data, horario)) {
    criarAcao(ACOES.REAGENDAR, id,{data,horario})
    console.log(acoesPendentes)
    return res.json({
        sucesso: true,
        mensagem: "reagendamento solicitado, por favor confirme no email"
    });

  }
  return res.json({
      sucesso: false,
      mensagem: "algo deu errado"
  });
    //         // Atualizar o atendimento
    //         const atualizar = `
    //             UPDATE agendamentos
    //             SET data = ?, horario = ?
    //             WHERE id = ?
    //             AND status = 'agendado'
    //         `;

    //         db.run(
    //             atualizar,
    //             [data, horario, id],
    //             function (erro) {

    //                 if (erro) {

    //                     console.error(
    //                         "Erro ao remarcar:",
    //                         erro
    //                     );

    //                     return res.status(500).json({
    //                         sucesso: false,
    //                         mensagem:
    //                             "Erro ao remarcar atendimento."
    //                     });

    //                 }

    //                 if (this.changes === 0) {

    //                     return res.status(400).json({
    //                         sucesso: false,
    //                         mensagem:
    //                             "Atendimento não encontrado ou já cancelado."
    //                     });

    //                 }

    //                 res.json({
    //                     sucesso: true,
    //                     mensagem:
    //                         "Atendimento remarcado com sucesso!"
    //                 });

    //             }
    //         );

    //     }
    // );

});

app.listen(PORTA, () => {

    console.log("");
    console.log("=================================");
    console.log("💈 BARBEARIA");
            //
    console.log("=================================");
    console.log(
        `🚀 Servidor rodando em http://localhost:${PORTA}`
    );
    console.log("=================================");
    console.log("");

});
