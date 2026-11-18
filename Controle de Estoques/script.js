// ==================== DADOS SALVOS ====================
let estoque = JSON.parse(localStorage.getItem('estoque')) || {};
let historico = JSON.parse(localStorage.getItem('historico')) || [];
let financeiro = JSON.parse(localStorage.getItem('financeiro')) || [];
let empresa = JSON.parse(localStorage.getItem('empresa')) || {
  nome: 'Sua Empresa Ltda',
  doc: '',
  tel: '',
  end: ''
};
let itensDocumento = [];

function salvarDados() {
  localStorage.setItem('estoque', JSON.stringify(estoque));
  localStorage.setItem('historico', JSON.stringify(historico));
  localStorage.setItem('financeiro', JSON.stringify(financeiro));
}

// ==================== ELEMENTOS DA TELA ====================
const formEstoque = document.getElementById('form-movimentacao');
const tabelaEstoque = document.getElementById('tabela-estoque');
const listaHistorico = document.getElementById('lista-historico');

const formFinanceiro = document.getElementById('form-financeiro');
const tabelaFinanceiro = document.getElementById('tabela-financeiro');

function dataHojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

document.getElementById('data-fin').value = dataHojeISO();

// Inicializa telas
carregarDadosEmpresa();
atualizarTelaEstoque();
atualizarTelaFinanceiro();
atualizarPreviewDocumento();

// ==================== NAVEGAÇÃO ENTRE ABAS ====================
function trocarAba(aba, botaoClicado) {
  document.getElementById('secao-estoque').classList.add('oculto');
  document.getElementById('secao-financeiro').classList.add('oculto');
  document.getElementById('secao-documentos').classList.add('oculto');

  document.querySelectorAll('.aba-btn').forEach(btn => btn.classList.remove('ativa'));

  document.getElementById('secao-' + aba).classList.remove('oculto');
  botaoClicado.classList.add('ativa');

  if (aba === 'financeiro') atualizarTelaFinanceiro();
  if (aba === 'documentos') atualizarPreviewDocumento();
}

// ==================== LÓGICA DE ESTOQUE, CUSTO E MARGEM ====================
function preencherPrecosExistentes() {
  const nome = document.getElementById('produto').value.trim().toLowerCase();
  const item = estoque[nome];
  if (item) {
    if (item.custo > 0) document.getElementById('preco-custo').value = item.custo;
    if (item.venda > 0) document.getElementById('preco-venda').value = item.venda;
  }
}

function atualizarSugestoesProdutos() {
  const datalist = document.getElementById('lista-produtos-sugestao');
  if (!datalist) return;
  datalist.innerHTML = '';
  for (const chave in estoque) {
    const opt = document.createElement('option');
    opt.value = estoque[chave].nome;
    datalist.appendChild(opt);
  }
}

formEstoque.addEventListener('submit', function(event) {
  event.preventDefault();

  const nomeInput = document.getElementById('produto').value.trim();
  const tipo = document.getElementById('tipo').value;
  const quantidade = parseInt(document.getElementById('quantidade').value);
  const inputCusto = parseFloat(document.getElementById('preco-custo').value);
  const inputVenda = parseFloat(document.getElementById('preco-venda').value);
  const integrar = document.getElementById('integrar-financeiro').checked;
  const statusIntegracao = document.getElementById('status-estoque-fin').value;
  const chave = nomeInput.toLowerCase();

  if (!estoque[chave]) {
    estoque[chave] = { nome: nomeInput, quantidade: 0, custo: 0, venda: 0 };
  }

  if (!isNaN(inputCusto) && inputCusto >= 0) estoque[chave].custo = inputCusto;
  if (!isNaN(inputVenda) && inputVenda >= 0) estoque[chave].venda = inputVenda;

  const custoAtual = estoque[chave].custo || 0;
  const vendaAtual = estoque[chave].venda || 0;

  if (tipo === 'entrada') {
    estoque[chave].quantidade += quantidade;
  } else {
    if (estoque[chave].quantidade < quantidade) {
      alert(`Estoque insuficiente! Saldo atual de ${estoque[chave].nome}: ${estoque[chave].quantidade}`);
      return;
    }
    estoque[chave].quantidade -= quantidade;
  }

  const isEntrada = tipo === 'entrada';
  const valorOperacao = isEntrada ? (custoAtual * quantidade) : (vendaAtual * quantidade);
  const lucroOperacao = !isEntrada && custoAtual > 0 && vendaAtual > 0
    ? (vendaAtual - custoAtual) * quantidade
    : 0;

  const agora = new Date().toLocaleString('pt-BR');
  historico.unshift({
    produto: estoque[chave].nome,
    tipo: tipo,
    quantidade: quantidade,
    valorTotal: valorOperacao,
    lucroOperacao: lucroOperacao,
    data: agora
  });

  if (integrar && valorOperacao > 0) {
    financeiro.unshift({
      id: Date.now(),
      dataISO: dataHojeISO(),
      descricao: `${isEntrada ? 'Compra estoque' : 'Venda produto'}: ${estoque[chave].nome} (${quantidade}x)`,
      categoria: isEntrada ? 'Fornecedores' : 'Vendas',
      tipo: isEntrada ? 'despesa' : 'receita',
      status: statusIntegracao,
      valor: valorOperacao
    });
  }

  salvarDados();
  atualizarTelaEstoque();
  atualizarTelaFinanceiro();
  formEstoque.reset();
  document.getElementById('quantidade').value = 1;
  document.getElementById('integrar-financeiro').checked = true;
});

function removerProduto(chave) {
  if (confirm(`Remover "${estoque[chave].nome}" da lista de estoque?`)) {
    delete estoque[chave];
    salvarDados();
    atualizarTelaEstoque();
  }
}

function atualizarTelaEstoque() {
  atualizarSugestoesProdutos();

  const termoBusca = document.getElementById('busca-estoque').value.toLowerCase().trim();
  tabelaEstoque.innerHTML = '';

  let custoTotalEstoque = 0;
  let vendaTotalEstoque = 0;

  for (const chave in estoque) {
    const item = estoque[chave];
    const custo = item.custo || 0;
    const venda = item.venda || 0;

    custoTotalEstoque += custo * item.quantidade;
    vendaTotalEstoque += venda * item.quantidade;

    if (termoBusca && !item.nome.toLowerCase().includes(termoBusca)) continue;

    let margemHTML = '<span style="color:#94a3b8;">—</span>';
    if (venda > 0 && custo > 0) {
      const lucroUnit = venda - custo;
      const margemPerc = ((lucroUnit / venda) * 100).toFixed(1);
      const classeMargem = lucroUnit >= 0 ? 'margem-positiva' : 'margem-negativa';
      margemHTML = `
        <div class="${classeMargem}">${margemPerc}%</div>
        <div class="detalhe-preco">${formatarMoeda(lucroUnit)}/un</div>
      `;
    }

    const estoqueBaixo = item.quantidade <= 5;
    const statusHTML = estoqueBaixo
      ? `<span class="badge-baixo">Baixo (≤ 5)</span>`
      : `<span class="badge-ok">Normal</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${item.nome}</strong></td>
      <td><strong>${item.quantidade}</strong></td>
      <td>
        <div class="detalhe-preco">Custo: ${formatarMoeda(custo)}</div>
        <div class="detalhe-preco">Venda: <strong>${formatarMoeda(venda)}</strong></div>
      </td>
      <td>${margemHTML}</td>
      <td>${statusHTML}</td>
      <td><button class="btn-excluir" onclick="removerProduto('${chave}')">Remover</button></td>
    `;
    tabelaEstoque.appendChild(tr);
  }

  const lucroProjetado = vendaTotalEstoque - custoTotalEstoque;
  document.getElementById('estoque-custo-total').textContent = formatarMoeda(custoTotalEstoque);
  document.getElementById('estoque-venda-total').textContent = formatarMoeda(vendaTotalEstoque);

  const elLucro = document.getElementById('estoque-lucro-total');
  elLucro.textContent = formatarMoeda(lucroProjetado);
  elLucro.style.color = lucroProjetado >= 0 ? '#16a34a' : '#dc2626';

  listaHistorico.innerHTML = '';
  historico.slice(0, 30).forEach(mov => {
    const li = document.createElement('li');
    const sinal = mov.tipo === 'entrada' ? '+' : '-';
    const classe = mov.tipo === 'entrada' ? 'entrada' : 'saida';
    const infoValor = mov.valorTotal > 0 ? ` — ${formatarMoeda(mov.valorTotal)}` : '';
    const infoLucro = mov.lucroOperacao > 0 ? ` <span class="margem-positiva">(Lucro: +${formatarMoeda(mov.lucroOperacao)})</span>` : '';

    li.innerHTML = `
      <span class="${classe}">[${mov.tipo.toUpperCase()} ${sinal}${mov.quantidade}]</span> 
      ${mov.produto}${infoValor}${infoLucro} — <small>${mov.data}</small>
    `;
    listaHistorico.appendChild(li);
  });
}

// ==================== LÓGICA FINANCEIRA E VENCIMENTOS ====================
formFinanceiro.addEventListener('submit', function(event) {
  event.preventDefault();

  const descricao = document.getElementById('descricao-fin').value.trim();
  const categoria = document.getElementById('categoria-fin').value;
  const tipo = document.getElementById('tipo-fin').value;
  const valor = parseFloat(document.getElementById('valor-fin').value);
  const dataISO = document.getElementById('data-fin').value || dataHojeISO();
  const status = document.getElementById('status-fin').value;

  financeiro.unshift({
    id: Date.now(),
    dataISO: dataISO,
    descricao: descricao,
    categoria: categoria,
    tipo: tipo,
    status: status,
    valor: valor
  });

  salvarDados();
  atualizarTelaFinanceiro();
  formFinanceiro.reset();
  document.getElementById('data-fin').value = dataHojeISO();
});

function darBaixaLancamento(id) {
  const item = financeiro.find(lanc => lanc.id === id);
  if (item) {
    item.status = 'pago';
    salvarDados();
    atualizarTelaFinanceiro();
  }
}

function removerLancamento(id) {
  if (confirm('Excluir este lançamento financeiro?')) {
    financeiro = financeiro.filter(item => item.id !== id);
    salvarDados();
    atualizarTelaFinanceiro();
  }
}

function limparFiltrosFinanceiro() {
  document.getElementById('filtro-mes').value = '';
  document.getElementById('filtro-status').value = 'todos';
  atualizarTelaFinanceiro();
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataBR(item) {
  if (item.dataISO) {
    const [ano, mes, dia] = item