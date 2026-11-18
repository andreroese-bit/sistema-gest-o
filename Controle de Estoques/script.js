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

// Inicializa dados da empresa e telas
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

  if (aba === 'financeiro') {
    atualizarTelaFinanceiro();
  }
  if (aba === 'documentos') {
    atualizarPreviewDocumento();
  }
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

  if (!isNaN(inputCusto) && inputCusto >= 0) {
    estoque[chave].custo = inputCusto;
  }
  if (!isNaN(inputVenda) && inputVenda >= 0) {
    estoque[chave].venda = inputVenda;
  }

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

    if (termoBusca && !item.nome.toLowerCase().includes(termoBusca)) {
      continue;
    }

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
  historico.forEach(mov => {
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
    const [ano, mes, dia] = item.dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  return item.data || '';
}

function analisarVencimento(item) {
  const statusAtual = item.status || 'pago';
  if (statusAtual === 'pago') {
    return { codigo: 'pago', html: `<span class="badge-ok">Pago</span>` };
  }

  const hojeStr = dataHojeISO();
  const vencStr = item.dataISO || hojeStr;

  const hojeDate = new Date(hojeStr + 'T00:00:00');
  const vencDate = new Date(vencStr + 'T00:00:00');
  const diffDias = Math.round((vencDate - hojeDate) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    const diasAtraso = Math.abs(diffDias);
    return {
      codigo: 'atrasado',
      html: `<span class="badge-atrasado">Atrasado (${diasAtraso}d)</span>`
    };
  }
  if (diffDias === 0) {
    return {
      codigo: 'vence_hoje',
      html: `<span class="badge-alerta">Vence Hoje!</span>`
    };
  }
  if (diffDias <= 3) {
    return {
      codigo: 'vence_breve',
      html: `<span class="badge-alerta">Vence em ${diffDias}d</span>`
    };
  }
  return {
    codigo: 'pendente',
    html: `<span class="badge-pendente">Pendente</span>`
  };
}

function atualizarBannerAlertas() {
  const banner = document.getElementById('banner-alertas');
  let qtdAtrasadas = 0;
  let valorAtrasado = 0;
  let qtdVencendo = 0;

  financeiro.forEach(item => {
    const analise = analisarVencimento(item);
    if (analise.codigo === 'atrasado') {
      qtdAtrasadas++;
      valorAtrasado += item.valor;
    } else if (analise.codigo === 'vence_hoje' || analise.codigo === 'vence_breve') {
      qtdVencendo++;
    }
  });

  if (qtdAtrasadas === 0 && qtdVencendo === 0) {
    banner.classList.add('oculto');
    return;
  }

  const mensagens = [];
  if (qtdAtrasadas > 0) {
    mensagens.push(`<strong>Atenção:</strong> Você tem <strong>${qtdAtrasadas}</strong> conta(s) atrasada(s) somando <strong>${formatarMoeda(valorAtrasado)}</strong>.`);
  }
  if (qtdVencendo > 0) {
    mensagens.push(`Existem <strong>${qtdVencendo}</strong> conta(s) pendente(s) vencendo hoje ou nos próximos 3 dias.`);
  }

  banner.innerHTML = mensagens.join(' ');
  banner.classList.remove('oculto');
}

function atualizarTelaFinanceiro() {
  atualizarBannerAlertas();

  const mesFiltro = document.getElementById('filtro-mes').value;
  const statusFiltro = document.getElementById('filtro-status').value;

  let totalReceitasPagas = 0;
  let totalDespesasPagas = 0;
  let totalAReceber = 0;
  let totalAPagar = 0;
  const despesasPorCategoria = {};

  tabelaFinanceiro.innerHTML = '';

  financeiro.forEach(item => {
    if (mesFiltro && item.dataISO && !item.dataISO.startsWith(mesFiltro)) {
      return;
    }

    const statusItem = item.status || 'pago';
    const analise = analisarVencimento(item);

    if (statusItem === 'pago') {
      if (item.tipo === 'receita') {
        totalReceitasPagas += item.valor;
      } else {
        totalDespesasPagas += item.valor;
        const cat = item.categoria || 'Outros';
        despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + item.valor;
      }
    } else {
      if (item.tipo === 'receita') {
        totalAReceber += item.valor;
      } else {
        totalAPagar += item.valor;
      }
    }

    if (statusFiltro === 'pago' && statusItem !== 'pago') return;
    if (statusFiltro === 'pendente' && statusItem !== 'pendente') return;
    if (statusFiltro === 'atrasado' && analise.codigo !== 'atrasado') return;

    const classeValor = item.tipo === 'receita' ? 'entrada' : 'saida';
    const sinal = item.tipo === 'receita' ? '+' : '-';
    const classeLinha = analise.codigo === 'atrasado' ? 'linha-atrasada' : '';

    const botaoBaixa = statusItem === 'pendente'
      ? `<button class="btn-baixar" title="Marcar como Pago" onclick="darBaixaLancamento(${item.id})">Dar Baixa</button>`
      : '';

    const tr = document.createElement('tr');
    tr.className = classeLinha;
    tr.innerHTML = `
      <td>${formatarDataBR(item)}</td>
      <td>
        <div>${item.descricao}</div>
        <span class="badge-cat">${item.categoria || 'Geral'}</span>
      </td>
      <td>${analise.html}</td>
      <td class="${classeValor}">${sinal} ${formatarMoeda(item.valor)}</td>
      <td>
        <div class="grupo-acoes-tabela">
          ${botaoBaixa}
          <button class="btn-excluir" onclick="removerLancamento(${item.id})">Excluir</button>
        </div>
      </td>
    `;
    tabelaFinanceiro.appendChild(tr);
  });

  const saldoReal = totalReceitasPagas - totalDespesasPagas;
  document.getElementById('total-receitas').textContent = formatarMoeda(totalReceitasPagas);
  document.getElementById('total-despesas').textContent = formatarMoeda(totalDespesasPagas);
  document.getElementById('total-a-receber').textContent = formatarMoeda(totalAReceber);
  document.getElementById('total-a-pagar').textContent = formatarMoeda(totalAPagar);

  const elSaldo = document.getElementById('saldo-financeiro');
  elSaldo.textContent = formatarMoeda(saldoReal);
  elSaldo.style.color = saldoReal >= 0 ? '#16a34a' : '#dc2626';

  desenharGraficoBarras(totalReceitasPagas, totalDespesasPagas);
  desenharGraficoRosca(despesasPorCategoria, totalDespesasPagas);
}

// ==================== GRÁFICOS VISUAIS (CANVAS NATIVO) ====================
function desenharGraficoBarras(receitas, despesas) {
  const canvas = document.getElementById('grafico-barras');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const maxValor = Math.max(receitas, despesas, 1);
  const alturaMaxima = 125;
  const baseY = 165;

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, baseY);
  ctx.lineTo(270, baseY);
  ctx.stroke();

  const altRec = (receitas / maxValor) * alturaMaxima;
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(65, baseY - altRec, 60, altRec);

  const altDesp = (despesas / maxValor) * alturaMaxima;
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(175, baseY - altDesp, 60, altDesp);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Receitas', 95, baseY + 18);
  ctx.fillText('Despesas', 205, baseY + 18);

  ctx.font = 'bold 11px Arial';
  ctx.fillStyle = '#15803d';
  ctx.fillText(formatarMoeda(receitas), 95, baseY - altRec - 6);

  ctx.fillStyle = '#b91c1c';
  ctx.fillText(formatarMoeda(despesas), 205, baseY - altDesp - 6);
}

function desenharGraficoRosca(categoriasObj, totalDespesas) {
  const canvas = document.getElementById('grafico-rosca');
  const legendaDiv = document.getElementById('legenda-rosca');
  if (!canvas || !legendaDiv) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  legendaDiv.innerHTML = '';

  const centroX = canvas.width / 2;
  const centroY = canvas.height / 2;
  const raio = 65;

  if (totalDespesas <= 0) {
    ctx.beginPath();
    ctx.arc(centroX, centroY, raio, 0, Math.PI * 2);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 22;
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Sem despesas', centroX, centroY + 4);
    return;
  }

  const cores = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899'];
  const entradas = Object.entries(categoriasObj).sort((a, b) => b[1] - a[1]);

  let anguloAtual = -Math.PI / 2;

  entradas.forEach(([categoria, valor], index) => {
    const fatia = (valor / totalDespesas) * Math.PI * 2;
    const cor = cores[index % cores.length];

    ctx.beginPath();
    ctx.arc(centroX, centroY, raio, anguloAtual, anguloAtual + fatia);
    ctx.strokeStyle = cor;
    ctx.lineWidth = 24;
    ctx.stroke();

    anguloAtual += fatia;

    const percentual = ((valor / totalDespesas) * 100).toFixed(0);
    const itemLegenda = document.createElement('div');
    itemLegenda.className = 'item-legenda';
    itemLegenda.innerHTML = `
      <span class="cor-legenda" style="background-color: ${cor};"></span>
      <span><strong>${categoria}:</strong> ${percentual}% (${formatarMoeda(valor)})</span>
    `;
    legendaDiv.appendChild(itemLegenda);