import React from 'react';

const money = value => value == null ? 'Não apurado' : Number(value).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
const percent = value => value == null ? 'Não apurada' : `${Number(value).toLocaleString('pt-BR', {maximumFractionDigits: 2})}%`;
const date = value => value?.split('-').reverse().join('/') || '—';
const localDate = value => `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;

export function clientMarginCsv(rows, period) {
  const cell = value => `"${String(value ?? '').replace(/^[\s]*[=+@-]/, match => `'${match}`).replaceAll('"', '""')}"`;
  const header = ['Início', 'Fim', 'Cliente', 'Empresa', 'Documentos', 'Documentos com custo', 'Receita documental', 'Receita sem custo identificado', 'Custo direto identificado', 'Saldo parcial da base coberta', 'Margem parcial (%)'];
  return '\uFEFF' + [header, ...rows.map(row => [period.startDate, period.endDate, row.cliente, row.empresa, row.atual.documentos,
    row.atual.documentosComCusto, row.atual.receita, row.atual.receitaSemCusto, row.atual.custoDireto, row.atual.saldoParcial, row.atual.margemParcial])].map(row => row.map(cell).join(';')).join('\r\n');
}

function Summary({value}) {
  return <div className="grid cols-4" style={{marginBottom: 16}}>
    {[
      ['Receita documental', money(value.receita), `${value.documentos} CT-es autorizados`],
      ['Receita sem custo identificado', money(value.receitaSemCusto), 'Prioridade para completar a análise'],
      ['Custo direto identificado', money(value.custoDireto), `${value.documentosComCusto} de ${value.documentos} documentos com custo`],
      ['Saldo parcial da base coberta', money(value.saldoParcial), `${percent(value.margemParcial)} · exclui documentos sem custo`],
    ].map(([label, amount, note]) => <div className="kpi" key={label}><div className="kpi-label">{label}</div><div className="kpi-value">{amount}</div><small className="muted">{note}</small></div>)}
  </div>;
}

export function ClientMargin() {
  const [dates, setDates] = React.useState(() => {const end = new Date(), start = new Date(); start.setDate(start.getDate()-29); return {startDate: localDate(start), endDate: localDate(end)};});
  const [applied, setApplied] = React.useState(dates);
  const [payload, setPayload] = React.useState(null), [loading, setLoading] = React.useState(true), [error, setError] = React.useState('');
  const [tab, setTab] = React.useState('clientes'), [search, setSearch] = React.useState(''), [selected, setSelected] = React.useState(null);
  React.useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setSelected(null); setPayload(null);
    window.RB_API.getClienteMargem(applied).then(value => {if (active) setPayload(value);})
      .catch(error => {if (active) setError(error.message || 'Não foi possível carregar a análise.');})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [applied]);
  const rows = (payload?.[tab] || []).filter(row => (tab === 'clientes' ? `${row.cliente} ${row.empresa}` : `${row.origem} ${row.destino}`).toLowerCase().includes(search.toLowerCase()));
  const detail = selected ? payload.documentos.filter(row => selected.type === 'clientes' ? row.clienteId === selected.id : JSON.stringify([row.origem,row.destino]) === selected.id) : [];
  const priorDetail = selected ? payload.documentosAnteriores.filter(row => selected.type === 'clientes' ? row.clienteId === selected.id : JSON.stringify([row.origem,row.destino]) === selected.id) : [];
  function download() {
    const blob = new Blob([clientMarginCsv(rows, payload.periodos.current)], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = `margem-parcial-clientes-${applied.startDate}-${applied.endDate}.csv`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="view">
    <div className="page-head"><div><h1>Rentabilidade por cliente e rota</h1><p className="sub">Receita documental, cobertura dos custos e margem parcial para apoiar a revisão comercial.</p></div></div>
    <form className="period-filter" onSubmit={event => {event.preventDefault(); setApplied({...dates});}}>
      <label>Data inicial<input type="date" value={dates.startDate} onChange={event => setDates({...dates, startDate: event.target.value})} required/></label>
      <label>Data final<input type="date" value={dates.endDate} onChange={event => setDates({...dates, endDate: event.target.value})} required/></label>
      <button className="btn primary" disabled={loading || dates.startDate > dates.endDate}>Aplicar período</button>
    </form>
    {loading && <p role="status">Carregando análise…</p>}
    {error && <div className="card" role="alert"><p>{error}</p><button className="btn" onClick={() => setApplied({...applied})}>Tentar novamente</button></div>}
    {payload && <>
      <p className="muted">{date(payload.periodos.current.startDate)} a {date(payload.periodos.current.endDate)} · Comparação: {date(payload.periodos.previous.startDate)} a {date(payload.periodos.previous.endDate)} · Atualizado em {new Date(payload.atualizadoEm).toLocaleString('pt-BR')}</p>
      <section className="card" style={{marginBottom: 16}}><h2>Como interpretar</h2><p>{payload.metodologia}</p><p><strong>Primeiro investigue a receita sem custo. Depois, revise os saldos negativos e as quedas de margem.</strong> Uma margem alta com pouca cobertura não comprova boa rentabilidade.</p></section>
      <Summary value={payload.resumo}/>
      {payload.resumo.documentosSemReceita > 0 && <p role="alert">{payload.resumo.documentosSemReceita} documentos sem valor de receita válido. Os totais de receita estão incompletos.</p>}
      <section className="card" style={{marginBottom: 16}}>
        <div className="row between" style={{gap: 12, flexWrap: 'wrap'}}><div className="actions"><button className="btn" aria-pressed={tab === 'clientes'} onClick={() => {setTab('clientes'); setSelected(null);}}>Por cliente</button><button className="btn" aria-pressed={tab === 'rotas'} onClick={() => {setTab('rotas'); setSelected(null);}}>Por rota</button></div>
          <label>Buscar<input type="search" value={search} onChange={event => setSearch(event.target.value)}/></label>
          {tab === 'clientes' && <button className="btn" disabled={!rows.length} onClick={download}>Exportar clientes CSV</button>}</div>
        <p className="muted">Resumo acima considera todos os clientes do período. A busca filtra somente esta tabela. Empresas são mantidas separadas por cadastro. Variação da margem em pontos percentuais só aparece com custo identificado em todos os documentos dos dois períodos.</p>
        <div className="table-wrap"><table className="data-table compact"><thead><tr><th>{tab === 'clientes' ? 'Cliente / empresa' : 'Origem → destino'}</th><th>Receita</th><th>Cobertura</th><th>Receita sem custo</th><th>Custo direto</th><th>Saldo parcial</th><th>Margem parcial</th><th>Variação (p.p.)</th><th>Investigar</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}><td>{tab === 'clientes' ? `${row.cliente} · ${row.empresa}` : `${row.origem} → ${row.destino}`}</td>
            <td>{money(row.atual.receita)}</td><td>{row.atual.documentosComCusto}/{row.atual.documentos} documentos</td><td>{money(row.atual.receitaSemCusto)}</td><td>{money(row.atual.custoDireto)}</td><td>{money(row.atual.saldoParcial)}</td><td>{percent(row.atual.margemParcial)}</td><td>{row.variacaoMargemPp == null ? 'Sem base comparável' : row.variacaoMargemPp.toLocaleString('pt-BR')}</td>
            <td><button className="btn" onClick={() => setSelected({...row, type: tab})}>Ver documentos</button></td></tr>)}</tbody></table></div>
        {!rows.length && <p>Nenhum documento encontrado para esta seleção.</p>}
      </section>
      {selected && <section className="card" style={{marginBottom: 16}} aria-label="Documentos da seleção">
        <div className="row between"><h2>{selected.type === 'clientes' ? selected.cliente : `${selected.origem} → ${selected.destino}`}</h2><button className="btn" onClick={() => setSelected(null)}>Fechar detalhes</button></div>
        <p>Anterior: receita {money(selected.anterior.receita)}, saldo parcial {money(selected.anterior.saldoParcial)}, cobertura {selected.anterior.documentosComCusto}/{selected.anterior.documentos} documentos.</p>
        <Summary value={selected.atual}/>
        <DocumentTable rows={detail}/>
        <details><summary>Documentos do período anterior ({priorDetail.length})</summary><DocumentTable rows={priorDetail}/></details>
      </section>}
      <section className="card"><h2>Custos compartilhados sem atribuição</h2><p>Cartas-frete relacionadas aos CT-es do período e vinculadas a mais de um documento. Cada carta aparece uma vez; seu valor integral não pertence necessariamente ao período selecionado. Estes valores não entram nas margens.</p>
        <div className="table-wrap"><table className="data-table compact"><thead><tr><th>Empresa:série:carta</th><th>Frete contratado</th><th>Documentos vinculados</th></tr></thead><tbody>{payload.custosCompartilhados.map(card => <tr key={card.id}><td>{card.id}</td><td>{money(card.valor)}</td><td>{card.documentos}</td></tr>)}</tbody></table></div>
        {!payload.custosCompartilhados.length && <p>Nenhuma carta compartilhada identificada nesta base.</p>}
        <p className="muted">Demais custos sem vínculo documental não foram quantificados nesta análise. Consulte a DRE e a análise de custos da frota para a visão global.</p>
      </section>
    </>}
  </div>;
}

function DocumentTable({rows}) {
  return <div className="table-wrap"><table className="data-table compact"><thead><tr><th>Emissão</th><th>Empresa:série:código ERP</th><th>Nº CT-e</th><th>Cliente</th><th>Placa</th><th>Rota</th><th>Receita</th><th>Custo direto</th><th>Saldo parcial</th><th>Origem do custo</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{date(row.data)}</td><td>{row.id}</td><td>{row.numero || '—'}</td><td>{row.cliente}</td><td>{row.placa || '—'}</td><td>{row.origem} → {row.destino}</td><td>{money(row.receita)}</td><td>{money(row.custoDireto)}</td><td>{money(row.saldoParcial)}</td><td>{row.fonteCusto}{row.cartas.length > 0 && ` · ${row.cartas.map(card => card.id).join(', ')}`}</td></tr>)}</tbody></table>{!rows.length && <p>Sem documentos neste período.</p>}</div>;
}

window.RentabilidadeClientes = ClientMargin;
