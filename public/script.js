// ========================================
// VARIÁVEIS
// ========================================

let agendamento = {
    servicoId: "",
    servicoNome: "",
    profissionalId: "",
    profissionalNome: "",
    data: "",
    horario: "",
    nome: "",
    whatsapp: "",
    email: ""
};


// ========================================
// ELEMENTOS
// ========================================

const servicosContainer =
    document.querySelector(".servicos-grid");

const profissionaisContainer =
    document.querySelector(".profissionais");

const horarios =
    document.querySelectorAll(".horario");

const campoData =
    document.querySelector("#data");

const campoNome =
    document.querySelector("#nome");

const campoWhatsapp =
    document.querySelector("#whatsapp");

const campoEmail =
    document.querySelector("#email");


// ========================================
// CARREGAR SERVIÇOS DO BANCO
// ========================================

async function carregarServicos() {

    try {

        const resposta =
            await fetch("/api/servicos");

        const servicos =
            await resposta.json();


        servicosContainer.innerHTML = "";


        servicos.forEach(servico => {

            const botao =
                document.createElement("button");

            botao.classList.add("servico");

            botao.dataset.id =
                servico.id;

            botao.innerHTML = `
                <span>✂</span>

                <strong>
                    ${servico.nome}
                </strong>

                <small>
                    R$ ${Number(servico.preco).toFixed(2).replace(".", ",")}
                </small>
            `;


            botao.addEventListener("click", () => {

                document
                    .querySelectorAll(".servico")
                    .forEach(item => {
                        item.classList.remove("selecionado");
                    });


                botao.classList.add("selecionado");


                agendamento.servicoId =
                    servico.id;

                agendamento.servicoNome =
                    servico.nome;


                document.querySelector(
                    "#resumoServico"
                ).textContent =
                    servico.nome;

            });


            servicosContainer.appendChild(botao);

        });


    } catch (erro) {

        console.error(
            "Erro ao carregar serviços:",
            erro
        );

    }

}


// ========================================
// CARREGAR PROFISSIONAIS DO BANCO
// ========================================

async function carregarProfissionais() {

    try {

        const resposta =
            await fetch("/api/profissionais");

        const profissionais =
            await resposta.json();


        profissionaisContainer.innerHTML = "";


        profissionais.forEach(profissional => {

            const botao =
                document.createElement("button");

            botao.classList.add(
                "profissional"
            );

            botao.dataset.id =
                profissional.id;


            const primeiraLetra =
                profissional.nome
                    .charAt(0)
                    .toUpperCase();


            botao.innerHTML = `

                <div class="avatar">
                    ${primeiraLetra}
                </div>

                <div>

                    <strong>
                        ${profissional.nome}
                    </strong>

                    <small>
                        Barbeiro
                    </small>

                </div>

            `;


            botao.addEventListener("click", () => {

                document
                    .querySelectorAll(".profissional")
                    .forEach(item => {
                        item.classList.remove(
                            "selecionado"
                        );
                    });


                botao.classList.add(
                    "selecionado"
                );


                agendamento.profissionalId =
                    profissional.id;

                agendamento.profissionalNome =
                    profissional.nome;


                document.querySelector(
                    "#resumoProfissional"
                ).textContent =
                    profissional.nome;


                atualizarHorarios();

            });


            profissionaisContainer.appendChild(
                botao
            );

        });


    } catch (erro) {

        console.error(
            "Erro ao carregar profissionais:",
            erro
        );

    }

}


// ========================================
// DATA MÍNIMA
// ========================================

const hoje = new Date();

const ano =
    hoje.getFullYear();

const mes =
    String(
        hoje.getMonth() + 1
    ).padStart(2, "0");

const dia =
    String(
        hoje.getDate()
    ).padStart(2, "0");


const dataMinima =
    `${ano}-${mes}-${dia}`;


campoData.min =
    dataMinima;


// ========================================
// ALTERAÇÃO DA DATA
// ========================================

campoData.addEventListener(
    "change",
    () => {

        agendamento.data =
            campoData.value;


        if (agendamento.data) {

            const data =
                new Date(
                    agendamento.data +
                    "T00:00:00"
                );


            document.querySelector(
                "#resumoData"
            ).textContent =
                data.toLocaleDateString(
                    "pt-BR"
                );

        } else {

            document.querySelector(
                "#resumoData"
            ).textContent =
                "Não selecionada";

        }


        agendamento.horario = "";


        document.querySelector(
            "#resumoHorario"
        ).textContent =
            "Não selecionado";


        atualizarHorarios();

    }
);


// ========================================
// HORÁRIOS
// ========================================

horarios.forEach(horario => {

    horario.addEventListener(
        "click",
        async () => {

            if (
                horario.classList.contains(
                    "ocupado"
                )
            ) {

                return;

            }


            if (
                !agendamento.profissionalId
            ) {

                alert(
                    "Escolha primeiro um profissional."
                );

                return;

            }


            if (!agendamento.data) {

                alert(
                    "Escolha primeiro uma data."
                );

                return;

            }


            horarios.forEach(item => {
                item.classList.remove(
                    "selecionado"
                );
            });


            horario.classList.add(
                "selecionado"
            );


            agendamento.horario =
                horario.dataset.horario;


            document.querySelector(
                "#resumoHorario"
            ).textContent =
                agendamento.horario;

        }
    );

});


// ========================================
// VERIFICAR HORÁRIOS NO BANCO
// ========================================

async function atualizarHorarios() {

    horarios.forEach(horario => {

        horario.classList.remove(
            "ocupado"
        );

        horario.classList.remove(
            "selecionado"
        );

    });


    if (
        !agendamento.profissionalId ||
        !agendamento.data
    ) {

        return;

    }


    for (const horario of horarios) {

        const hora =
            horario.dataset.horario;


        try {

            const resposta =
                await fetch(
                    `/api/horario-disponivel?profissional_id=${agendamento.profissionalId}&data=${agendamento.data}&horario=${hora}`
                );


            const dados =
                await resposta.json();


            if (!dados.disponivel) {

                horario.classList.add(
                    "ocupado"
                );

            }

        } catch (erro) {

            console.error(
                "Erro ao verificar horário:",
                erro
            );

        }

    }

}


// ========================================
// DADOS DO CLIENTE
// ========================================

campoNome.addEventListener(
    "input",
    () => {

        agendamento.nome =
            campoNome.value.trim();


        atualizarResumoCliente();

    }
);


campoWhatsapp.addEventListener(
    "input",
    () => {

        agendamento.whatsapp =
            campoWhatsapp.value.trim();

    }
);


campoEmail.addEventListener(
    "input",
    () => {

        agendamento.email =
            campoEmail.value.trim();

    }
);


// ========================================
// RESUMO DO CLIENTE
// ========================================

function atualizarResumoCliente() {

    document.querySelector(
        "#resumoCliente"
    ).textContent =

        agendamento.nome ||
        "Não informado";

}


// ========================================
// CONFIRMAR AGENDAMENTO
// ========================================

const botaoConfirmar =
    document.querySelector("#confirmar");


botaoConfirmar.addEventListener(
    "click",
    async () => {


        // -----------------------------
        // VALIDAÇÕES
        // -----------------------------

        if (!agendamento.servicoId) {

            alert(
                "Selecione um serviço."
            );

            return;

        }


        if (!agendamento.profissionalId) {

            alert(
                "Selecione um profissional."
            );

            return;

        }


        if (!agendamento.data) {

            alert(
                "Selecione uma data."
            );

            return;

        }


        if (!agendamento.horario) {

            alert(
                "Selecione um horário."
            );

            return;

        }


        if (!agendamento.nome) {

            alert(
                "Digite seu nome."
            );

            campoNome.focus();

            return;

        }


        if (!agendamento.whatsapp) {

            alert(
                "Digite seu WhatsApp."
            );

            campoWhatsapp.focus();

            return;

        }


        if (!agendamento.email) {

            alert(
                "Digite seu e-mail."
            );

            campoEmail.focus();

            return;

        }


        // -----------------------------
        // ENVIAR PARA O SERVIDOR
        // -----------------------------

// ========================================
// VALIDAR DADOS ANTES DO ENVIO
// ========================================

const nomeLimpo = String(agendamento.nome || "").trim();

const whatsappLimpo = String(
    agendamento.whatsapp || ""
).replace(/\D/g, "");

const emailLimpo = String(
    agendamento.email || ""
).trim().toLowerCase();

// Validar nome
if (nomeLimpo.length < 3 || nomeLimpo.length > 100) {
    alert("Informe um nome válido de 3 a 100 caracteres.");
    document.querySelector("#nome").focus();
    return;
}

// Validar WhatsApp
if (!/^[1-9][0-9]{9,10}$/.test(whatsappLimpo)) {
    alert("Informe um WhatsApp válido com DDD.");
    document.querySelector("#whatsapp").focus();
    return;
}

// Validar e-mail
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
    alert("Informe um e-mail válido.");
    document.querySelector("#email").focus();
    return;
}

// Atualizar os dados antes do envio
agendamento.nome = nomeLimpo;
agendamento.whatsapp = whatsappLimpo;
agendamento.email = emailLimpo;

        try {

            const resposta =
                await fetch(
                    "/api/agendamentos",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            nome:
                                agendamento.nome,

                            whatsapp:
                                agendamento.whatsapp,

                            email:
                                agendamento.email,

                            servico_id:
                                agendamento.servicoId,

                            profissional_id:
                                agendamento.profissionalId,

                            data:
                                agendamento.data,

                            horario:
                                agendamento.horario

                        })

                    }
                );


            const dados =
                await resposta.json();


            // -----------------------------
            // ERRO
            // -----------------------------

            if (!resposta.ok) {

                alert(
                    dados.mensagem ||
                    "Não foi possível realizar o agendamento."
                );

                atualizarHorarios();

                return;

            }


            // -----------------------------
            // SUCESSO
            // -----------------------------

            mostrarConfirmacao(
                dados.agendamento_id
            );


        } catch (erro) {

            console.error(
                erro
            );

            alert(
                "Erro de conexão com o servidor."
            );

        }

    }
);


// ========================================
// MOSTRAR CONFIRMAÇÃO
// ========================================

function mostrarConfirmacao(
    idAgendamento
) {

    const mensagem =
        document.querySelector(
            "#mensagem"
        );


    const dadosConfirmacao =
        document.querySelector(
            "#dadosConfirmacao"
        );


    const data =
        new Date(
            agendamento.data +
            "T00:00:00"
        );


    const dataFormatada =
        data.toLocaleDateString(
            "pt-BR"
        );


    dadosConfirmacao.innerHTML = `

        <strong>Cliente:</strong>
        ${agendamento.nome}

        <br>

        <strong>WhatsApp:</strong>
        ${agendamento.whatsapp}

        <br>

        <strong>Serviço:</strong>
        ${agendamento.servicoNome}

        <br>

        <strong>Profissional:</strong>
        ${agendamento.profissionalNome}

        <br>

        <strong>Data:</strong>
        ${dataFormatada}

        <br>

        <strong>Horário:</strong>
        ${agendamento.horario}

        <br>

        <strong>Número do atendimento:</strong>
        ${idAgendamento}

    `;


    mensagem.classList.add(
        "exibir"
    );


    mensagem.scrollIntoView({
        behavior: "smooth"
    });

}


// ========================================
// NOVO AGENDAMENTO
// ========================================

const novoAgendamento =
    document.querySelector(
        "#novoAgendamento"
    );


novoAgendamento.addEventListener(
    "click",
    () => {

        location.reload();

    }
);


// ========================================
// INICIALIZAR SISTEMA
// ========================================

carregarServicos();

carregarProfissionais();

// ========================================
// CONSULTAR MEU ATENDIMENTO
// ========================================

const botaoConsultar = document.querySelector("#consultarAtendimento");
const campoNumero = document.querySelector("#numeroAtendimento");
const resultado = document.querySelector("#resultadoAtendimento");

if (botaoConsultar) {

    botaoConsultar.addEventListener("click", async () => {

        const id = campoNumero.value.trim();

        if (!id) {
            alert("Digite o número do atendimento.");
            campoNumero.focus();
            return;
        }

        resultado.innerHTML = `
            <p>Consultando atendimento...</p>
        `;

        try {

            const resposta = await fetch(`/api/agendamentos/${id}`);

            const dados = await resposta.json();

            console.log("Resposta da API:", dados);

            if (!resposta.ok) {

                resultado.innerHTML = `
                    <div class="card-atendimento">

                        <h3>❌ Atendimento não encontrado</h3>

                        <p>
                            ${dados.mensagem}
                        </p>

                    </div>
                `;

                return;
            }

            const agendamento = dados.agendamento;

            const data = new Date(
                agendamento.data + "T00:00:00"
            );

            const dataFormatada =
                data.toLocaleDateString("pt-BR");

            resultado.innerHTML = `
                <div class="card-atendimento">

                    <h3>💈 Seu Atendimento</h3>

                    <div class="dado-atendimento">
                        <strong>Número:</strong>
                        #${agendamento.id}
                    </div>

                    <div class="dado-atendimento">
                        <strong>Cliente:</strong>
                        ${agendamento.cliente}
                    </div>

                    <div class="dado-atendimento">
                        <strong>WhatsApp:</strong>
                        ${agendamento.whatsapp}
                    </div>

                    <div class="dado-atendimento">
                        <strong>E-mail:</strong>
                        ${agendamento.email}
                    </div>

                    <div class="dado-atendimento">
                        <strong>Serviço:</strong>
                        ${agendamento.servico}
                    </div>

                    <div class="dado-atendimento">
                        <strong>Profissional:</strong>
                        ${agendamento.profissional}
                    </div>

                    <div class="dado-atendimento">
                        <strong>Data:</strong>
                        ${dataFormatada}
                    </div>

                    <div class="dado-atendimento">
                        <strong>Horário:</strong>
                        ${agendamento.horario}
                    </div>

                    <div class="dado-atendimento">
                        <strong>Valor:</strong>
                        R$ ${Number(agendamento.preco)
                            .toFixed(2)
                            .replace(".", ",")}
                    </div>

<div class="dado-atendimento">
    <strong>Status:</strong>
    <span class="status-agendado">${agendamento.status}</span>
</div>

${
    agendamento.status === "agendado"
        ? `
            <button
                class="botao-remarcar"
                onclick="mostrarRemarcacao(${agendamento.id}, ${agendamento.profissional_id})"
            >
                🔄 Remarcar atendimento
            </button>

            <div
                id="areaRemarcacao"
                class="area-remarcacao"
                style="display: none;"
            >

                <h4>Escolha uma nova data e horário</h4>

                <label for="novaData">
                    Nova data:
                </label>

                <input
                    type="date"
                    id="novaData"
                >

                <label for="novoHorario">
                    Novo horário:
                </label>

                <select id="novoHorario">

                    <option value="">
                        Selecione um horário
                    </option>

                    <option value="08:00">08:00</option>
                    <option value="08:30">08:30</option>
                    <option value="09:00">09:00</option>
                    <option value="09:30">09:30</option>
                    <option value="10:00">10:00</option>
                    <option value="10:30">10:30</option>
                    <option value="11:00">11:00</option>
                    <option value="11:30">11:30</option>
                    <option value="13:00">13:00</option>
                    <option value="13:30">13:30</option>
                    <option value="14:00">14:00</option>
                    <option value="14:30">14:30</option>
                    <option value="15:00">15:00</option>
                    <option value="15:30">15:30</option>
                    <option value="16:00">16:00</option>
                    <option value="16:30">16:30</option>
                    <option value="17:00">17:00</option>
                    <option value="17:30">17:30</option>

                </select>

                <button
                    class="botao-confirmar-remarcacao"
                    onclick="confirmarRemarcacao(${agendamento.id})"
                >
                    ✅ Confirmar nova data e horário
                </button>

            </div>
        `
        : ""
}

${
    agendamento.status === "agendado"
        ? `
            <button
                class="botao-cancelar"
                onclick="cancelarAtendimento(${agendamento.id})"
            >
                ❌ Cancelar atendimento
            </button>
          `
        : ""
}

                </div>
            `;

        } catch (erro) {

            console.error(
                "Erro ao consultar atendimento:",
                erro
            );

            resultado.innerHTML = `
                <div class="card-atendimento">

                    <h3>❌ Erro</h3>

                    <p>
                        Não foi possível consultar o atendimento.
                    </p>

                </div>
            `;
        }
        const modal = document.getElementById('consultar-agendamento');
            if (modal && resultado.innerHTML.trim() !== '') {
                modal.classList.add('com-resultado');
            }

    });

}

// ========================================
// CANCELAR ATENDIMENTO
// ========================================

async function cancelarAtendimento(id) {

    const confirmar = confirm(
        "Tem certeza que deseja cancelar este atendimento?"
    );

    if (!confirmar) {
        return;
    }

    try {

        const resposta = await fetch(
            `/api/agendamentos/${id}/cancelar`,
            {
                method: "PUT"
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {

            alert(dados.mensagem);
            return;

        }

        alert("✅ Atendimento cancelado com sucesso!");

        // Recarrega a consulta
        const campoNumero = document.querySelector("#numeroAtendimento");
        const botaoConsultar = document.querySelector("#consultarAtendimento");

        if (campoNumero && botaoConsultar) {
            botaoConsultar.click();
        }

    } catch (erro) {

        console.error("Erro ao cancelar:", erro);

        alert(
            "❌ Não foi possível cancelar o atendimento."
        );

    }

}

// ========================================
// MOSTRAR ÁREA DE REMARCAÇÃO
// ========================================


async function mostrarRemarcacao(id, profissionalId) {
    const area = document.querySelector("#areaRemarcacao");
    const campoData = document.querySelector("#novaData");
    const campoHorario = document.querySelector("#novoHorario");

    if (!area || !campoData || !campoHorario) {
        return;
    }

    area.style.display = "block";

    // Define a data mínima como hoje
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    campoData.min = `${ano}-${mes}-${dia}`;

    // Limpa os horários até o cliente escolher uma data
    campoHorario.innerHTML = `
        <option value="">Selecione uma data primeiro</option>
    `;

    campoData.onchange = async function () {
        const data = campoData.value;

        if (!data) {
            campoHorario.innerHTML = `
                <option value="">Selecione uma data primeiro</option>
            `;
            return;
        }

        campoHorario.innerHTML = `
            <option value="">Carregando horários...</option>
        `;

        try {
            const resposta = await fetch(
                `/api/horarios-disponiveis?profissional_id=${encodeURIComponent(profissionalId)}&data=${encodeURIComponent(data)}`
            );

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.mensagem || "Erro ao buscar horários."
                );
            }

            campoHorario.innerHTML = `
                <option value="">Selecione um horário</option>
            `;

            if (!dados.horarios || dados.horarios.length === 0) {
                campoHorario.innerHTML = `
                    <option value="">Nenhum horário disponível</option>
                `;
                return;
            }

            dados.horarios.forEach((horario) => {
                const opcao = document.createElement("option");
                opcao.value = horario;
                opcao.textContent = horario;
                campoHorario.appendChild(opcao);
            });

        } catch (erro) {
            console.error("Erro ao carregar horários:", erro);

            campoHorario.innerHTML = `
                <option value="">Erro ao carregar horários</option>
            `;
        }
    };
}


// ========================================
// CONFIRMAR REMARCAÇÃO
// ========================================

async function confirmarRemarcacao(id) {

    const novaData =
        document.querySelector("#novaData").value;

    const novoHorario =
        document.querySelector("#novoHorario").value;

    if (!novaData) {

        alert("Escolha uma nova data.");
        return;

    }

    if (!novoHorario) {

        alert("Escolha um novo horário.");
        return;

    }

    const confirmar = confirm(
        `Deseja remarcar seu atendimento para ${novaData} às ${novoHorario}?`
    );

    if (!confirmar) {
        return;
    }

    try {

        const resposta = await fetch(
            `/api/agendamentos/${id}/remarcar`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    data: novaData,
                    horario: novoHorario
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {

            alert("❌ " + dados.mensagem);
            return;

        }

        alert(
            "✅ Atendimento remarcado com sucesso!"
        );

        // Consultar novamente o atendimento
        const botaoConsultar =
            document.querySelector("#consultarAtendimento");

        if (botaoConsultar) {
            botaoConsultar.click();
        }

    } catch (erro) {

        console.error(
            "Erro ao remarcar:",
            erro
        );

        alert(
            "❌ Não foi possível remarcar o atendimento."
        );

    }

}

//brayan adiconando
// ========================================
// ATUALIZAR PASSO ATIVO CONFORME SCROLL
// ========================================
const etapas = document.querySelectorAll('.etapa');
const passos = document.querySelectorAll('.passo');

// Mapeamento: id da etapa → índice do passo (0-based)
const mapaEtapas = {
    'servicos':           0,
    'etapa-profissional': 1,
    'etapa-data':         2,
    'etapa-dados':        3
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const index = mapaEtapas[entry.target.id];
            if (index === undefined) return;

            passos.forEach((p, i) => {
                p.classList.toggle('ativo', i === index);
            });
        }
    });
}, {
    rootMargin: '-40% 0px -40% 0px',
    threshold: 0
});

etapas.forEach(etapa => observer.observe(etapa));

//modal
// // ========================================
// MODAL: CONSULTAR AGENDAMENTO
// ========================================
const modalConsulta = document.getElementById('consultar-agendamento');
const botoesAbrirModal = document.querySelectorAll('[data-abrir-modal]');
const botaoFecharModal = modalConsulta ? modalConsulta.querySelector('.modal-fechar') : null;

function abrirModalConsulta(e) {
    if (e) e.preventDefault();
    if (modalConsulta) modalConsulta.classList.add('aberto');
    document.body.style.overflow = 'hidden';
}

function fecharModalConsulta() {
    if (modalConsulta) modalConsulta.classList.remove('aberto');
  document.body.style.overflow = '';


  // NOVO: reseta o form e o resultado ao fechar
  if (modalConsulta) {
      modalConsulta.classList.remove('com-resultado');
      const resultado = modalConsulta.querySelector('#resultadoAtendimento');
      if (resultado) resultado.innerHTML = '';
      const inputNumero = modalConsulta.querySelector('#numeroAtendimento');
      if (inputNumero) inputNumero.value = '';
  }
}

// Abre ao clicar no botão do hero
botoesAbrirModal.forEach(btn => btn.addEventListener('click', abrirModalConsulta));

// Fecha no ×
if (botaoFecharModal) {
    botaoFecharModal.addEventListener('click', fecharModalConsulta);
}

// Fecha ao clicar no overlay
if (modalConsulta) {
    modalConsulta.addEventListener('click', (e) => {
        if (e.target === modalConsulta) fecharModalConsulta();
    });
}

// Fecha com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalConsulta && modalConsulta.classList.contains('aberto')) {
        fecharModalConsulta();
    }
});
