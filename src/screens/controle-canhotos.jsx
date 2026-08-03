const CanhotoStatusBadge = ({ item }) => {
  if (!item.recebido) return <span className="badge warn">Pendente</span>;
  if (item.origemBaixa === "erp") return <span className="badge info">Recebido no ERP</span>;
  return <span className="badge ok">Recebido pelo portal</span>;
};

const ControleCanhotos = () => {
  const hoje = new Date().toISOString().slice(0, 10);
  const padrao = { inicio: "2026-07-01", fim: hoje, proprietario: "todos", status: "pendente", busca: "", motorista: "", viagem: "", cliente: "", placa: "", nota: "", serie: "", cte: "", semViagem: false };
  const [filtros, setFiltros] = React.useState(padrao);
  const [consulta, setConsulta] = React.useState(padrao);
  const [data, setData] = React.useState({ itens: [], resumo: {} });
  const [selecionados, setSelecionados] = React.useState(new Set());
  const [abertos, setAbertos] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [modal, setModal] = React.useState(false);
  const [observacao, setObservacao] = React.useState("");
  const [atualizadoEm, setAtualizadoEm] = React.useState(null);
  const [maisFiltros, setMaisFiltros] = React.useState(false);
  const [detalhe, setDetalhe] = React.useState(null);
  const [ultimaBaixa, setUltimaBaixa] = React.useState(null);

  const chave = (r) => [r.empresa, r.serieCte, r.numeroCte, r.sequenciaNota].join("|");
  const fmt = (v) => v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-";
  const fmtHora = (v) => v ? new Date(v).toLocaleString("pt-BR") : "-";

  const carregar = React.useCallback(async () => {
    setLoading(true); setError(""); setSuccess(""); setUltimaBaixa(null);
    try {
      const result = await RB_API.listCanhotos(consulta);
      setData(result || { itens: [], resumo: {} });
      setSelecionados(new Set()); setAtualizadoEm(new Date());
    } catch (e) { setError(e.message || "Não foi possível carregar os canhotos."); }
    finally { setLoading(false); }
  }, [consulta]);

  React.useEffect(() => { carregar(); }, [carregar]);
  const pesquisar = (e) => { e?.preventDefault(); setConsulta({ ...filtros }); };
  const limparFiltros = () => { setFiltros(padrao); setConsulta(padrao); };
  const aplicarAtalho = (proprietario, status) => {
    const proximo = { ...filtros, proprietario, status };
    setFiltros(proximo); setConsulta(proximo);
  };

  const toggle = (r) => setSelecionados((atual) => {
    if (r.recebido) return atual;
    const proximo = new Set(atual); const id = chave(r);
    proximo.has(id) ? proximo.delete(id) : proximo.add(id); return proximo;
  });

  const grupos = React.useMemo(() => {
    const mapa = new Map();
    data.itens.forEach((r) => {
      const id = `${r.proprietario}|${r.motorista || "sem"}|${r.placa || "sem"}`;
      if (!mapa.has(id)) mapa.set(id, {
        id, viagem: r.viagem, motorista: r.motorista, placa: r.placa, proprietario: r.proprietario,
        dataSaida: r.dataSaida, dataChegada: r.dataChegada, inicioJanelaFaturamento: r.inicioJanelaFaturamento,
        fimJanelaFaturamento: r.fimJanelaFaturamento, motoristaChegou: r.motoristaChegou, itens: [],
      });
      mapa.get(id).itens.push(r);
    });
    return [...mapa.values()].map((g) => ({ ...g,
      pendentes: g.itens.filter((r) => !r.recebido).length,
      recebidos: g.itens.filter((r) => r.recebido).length,
    }));
  }, [data.itens]);

  const docsSelecionados = data.itens.filter((r) => selecionados.has(chave(r)));
  const viagensSelecionadas = [...new Set(docsSelecionados.map((r) => r.viagem || "Sem vínculo"))];
  const motoristasSelecionados = [...new Set(docsSelecionados.map((r) => r.motorista || "Não informado"))];
  const filtrosAtivos = [
    ["motorista", "Motorista", consulta.motorista], ["viagem", "Viagem", consulta.viagem],
    ["cliente", "Cliente", consulta.cliente], ["placa", "Placa", consulta.placa],
    ["nota", "NF", consulta.nota], ["serie", "Série", consulta.serie], ["cte", "CT-e", consulta.cte],
    ["busca", "Busca", consulta.busca], ["semViagem", "Sem viagem", consulta.semViagem],
  ].filter(([, , valor]) => Boolean(valor));
  const removerFiltro = (campo) => {
    const valor = campo === "semViagem" ? false : "";
    setFiltros((f) => ({ ...f, [campo]: valor }));
    setConsulta((f) => ({ ...f, [campo]: valor }));
  };

  const selecionarGrupo = (grupo) => setSelecionados((atual) => {
    const proximo = new Set(atual); const pendentes = grupo.itens.filter((r) => !r.recebido);
    const todosMarcados = pendentes.every((r) => proximo.has(chave(r)));
    pendentes.forEach((r) => todosMarcados ? proximo.delete(chave(r)) : proximo.add(chave(r)));
    return proximo;
  });

  const baixar = async () => {
    if (!docsSelecionados.length || saving) return;
    const documentosBaixados = [...docsSelecionados];
    setSaving(true); setError("");
    try {
      await RB_API.baixarCanhotos({ documentos: documentosBaixados, observacao });
      const quantidade = documentosBaixados.length;
      setModal(false); setObservacao(""); await carregar();
      setUltimaBaixa({ documentos: documentosBaixados, quantidade });
      setSuccess(`${quantidade} canhoto(s) recebido(s) com sucesso.`);
    } catch (e) { setError(e.message || "Não foi possível baixar os canhotos."); }
    finally { setSaving(false); }
  };

  const desfazerUltimaBaixa = async () => {
    if (!ultimaBaixa?.documentos?.length || saving) return;
    if (!window.confirm(`Desmarcar os ${ultimaBaixa.quantidade} canhoto(s) da última baixa?`)) return;
    setSaving(true); setError("");
    try {
      await RB_API.estornarCanhotosLote(ultimaBaixa.documentos);
      const quantidade = ultimaBaixa.quantidade;
      setUltimaBaixa(null); await carregar();
      setSuccess(`Última baixa desfeita: ${quantidade} canhoto(s) voltaram para pendentes.`);
    } catch (e) { setError(e.message || "Não foi possível desfazer a última baixa."); }
    finally { setSaving(false); }
  };

  const estornar = async (row) => {
    if (row.origemBaixa !== "portal") return;
    if (!window.confirm(`Estornar a baixa da NF ${row.numeroNota}, série ${row.serieNota}?`)) return;
    try { await RB_API.estornarCanhoto(row); await carregar(); setSuccess("Baixa estornada com sucesso."); }
    catch (e) { setError(e.message || "Não foi possível estornar a baixa."); }
  };

  const Metric = ({ label, value, sub, tone, active, onClick }) => <button type="button" className={`canhoto-metric ${active ? "active" : ""}`} onClick={onClick}>
    <span>{label}</span><strong style={tone ? { color: tone } : null}>{value || 0}</strong><small>{sub}</small>
  </button>;
  const renderGrupo = (g, index) => {
    const aberto = abertos[g.id] !== undefined ? abertos[g.id] : (g.pendentes > 0 && index < 4);
    const pendentesMarcados = g.itens.filter((r) => !r.recebido && selecionados.has(chave(r))).length;
    const blocosMap = new Map();
    g.itens.forEach((item) => {
      const emissao = item.emissaoNota || item.emissaoCte;
      const id = emissao ? String(emissao).slice(0, 10) : "sem-data";
      if (!blocosMap.has(id)) blocosMap.set(id, { id, data: emissao, itens: [] });
      blocosMap.get(id).itens.push(item);
    });
    const blocos = [...blocosMap.values()].sort((a, b) => b.id.localeCompare(a.id));
    const renderLinha = (r) => <tr key={chave(r)} className={selecionados.has(chave(r)) ? "selected" : ""}>
      <td><label className="canhoto-check"><input type="checkbox" disabled={r.recebido} checked={selecionados.has(chave(r))} onChange={() => toggle(r)} aria-label={`Selecionar NF ${r.numeroNota}`}/></label></td>
      <td className="canhoto-client" title={r.cliente}>{r.cliente}</td>
      <td><strong className="canhoto-doc">NF {r.numeroNota}</strong><small>Série {r.serieNota || "-"} · {r.tipoDocumento || "CT-e"} {r.serieCte}-{r.numeroCte}</small></td>
      <td>{fmt(r.emissaoNota || r.emissaoCte)}</td><td><CanhotoStatusBadge item={r}/></td>
      <td>{r.recebido ? <><span>{r.recebidoPor || "ERP"}</span><small>{fmtHora(r.recebidoEm)}</small></> : <span className="muted">Aguardando entrega</span>}</td>
      <td><div className="canhoto-row-actions"><button className="btn sm" onClick={() => setDetalhe(r)}>Detalhes</button>{r.origemBaixa === "portal" ? <button className="btn sm" onClick={() => estornar(r)}>Estornar</button> : r.origemBaixa === "erp" ? <span className="muted" title="Baixas do ERP não podem ser estornadas pelo portal">Somente ERP</span> : null}</div></td>
    </tr>;
    return <article className="canhoto-group" key={g.id}>
      <div className="canhoto-group-head">
        <button type="button" className="canhoto-group-toggle" onClick={() => setAbertos((a) => ({ ...a, [g.id]: !aberto }))} aria-expanded={aberto}>
          <Icon name={aberto ? "chevron-down" : "chevron-right"}/>
          <div><strong>{g.motorista || "Motorista não informado"}</strong>
            <span>{g.placa || "Sem placa"} · documentos agrupados por faturamento</span></div>
        </button>
        <div className="canhoto-trip-meta">
          <span className={`badge ${g.motoristaChegou ? "ok" : "info"}`}>{g.motoristaChegou ? "Motorista chegou" : "Em viagem"}</span>
          <span>{fmt(g.dataSaida)} → {g.motoristaChegou ? fmt(g.dataChegada) : "Aguardando retorno"}</span>
          <b>{g.pendentes} pendente(s)</b><span>{g.recebidos} recebido(s)</span>
          {!!g.pendentes && <button type="button" className="btn sm" onClick={() => selecionarGrupo(g)}>{pendentesMarcados === g.pendentes ? "Desmarcar" : "Selecionar pendentes"}</button>}
        </div>
      </div>
      {aberto && <>
        {(g.inicioJanelaFaturamento || g.fimJanelaFaturamento) && <div className="canhoto-window">Janela dos documentos: chegada anterior {fmt(g.inicioJanelaFaturamento)} até saída atual {fmt(g.fimJanelaFaturamento)}</div>}
        <div className="table-wrap"><table className="data-table compact canhoto-table"><thead><tr><th></th><th>Cliente</th><th>Documento</th><th>Emissão</th><th>Situação</th><th>Conferência</th><th>Ações</th></tr></thead>
          <tbody>{blocos.map((bloco, blocoIndex) => <React.Fragment key={bloco.id}>
            {blocoIndex > 0 && <tr className="canhoto-trip-space"><td colSpan="7"/></tr>}
            <tr className={`canhoto-billing-divider billing-color-${blocoIndex % 2}`}><td colSpan="7"><span>FATURAMENTO · {bloco.data ? fmt(bloco.data) : "DATA NÃO INFORMADA"}</span><b>{bloco.itens.length} documento(s)</b></td></tr>
            {bloco.itens.map(renderLinha)}
          </React.Fragment>)}</tbody></table></div>
      </>}
    </article>;
  };

  const renderSecao = (tipo, titulo, descricao) => {
    const lista = grupos.filter((g) => g.proprietario === tipo);
    const pendentes = lista.reduce((n, g) => n + g.pendentes, 0);
    const recebidos = lista.reduce((n, g) => n + g.recebidos, 0);
    if (filtros.proprietario !== "todos" && filtros.proprietario !== tipo) return null;
    return <section className={`canhoto-section ${tipo}`}>
      <header><div><span className="canhoto-section-mark"><Icon name="truck"/></span><div><h2>{titulo}</h2><p>{descricao}</p></div></div><div><b>{pendentes} pendente(s)</b><span>{recebidos} recebido(s) · {lista.length} viagem(ns)</span></div></header>
      <div className="canhoto-section-actions"><button className="btn sm" onClick={() => setAbertos((a) => ({ ...a, ...Object.fromEntries(lista.map((g) => [g.id, true])) }))}>Expandir todos</button><button className="btn sm" onClick={() => setAbertos((a) => ({ ...a, ...Object.fromEntries(lista.map((g) => [g.id, false])) }))}>Recolher todos</button></div>
      {lista.length ? <div className="canhoto-groups">{lista.map((grupo, index) => renderGrupo(grupo, index))}</div> : <div className="canhoto-section-empty">Nenhum canhoto de {titulo.toLowerCase()} encontrado.</div>}
    </section>;
  };

  return <div className="view canhotos-view">
    <div className="page-head"><div><h1>Controle de canhotos</h1><div className="sub">Confira os documentos entregues pelos motoristas após o retorno das viagens.</div>{atualizadoEm && <div className="canhoto-updated">Atualizado em {atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>}</div></div>

    <div className="canhoto-metrics">
      <Metric label="Canhotos no período" value={data.resumo.total} sub={`${data.resumo.viagens || 0} viagens`} active={filtros.status === "todos" && filtros.proprietario === "todos"} onClick={() => aplicarAtalho("todos", "todos")}/>
      <Metric label="Pendentes" value={data.resumo.pendentes} sub="Prioridade operacional" tone="var(--warn)" active={filtros.status === "pendente" && filtros.proprietario === "todos"} onClick={() => aplicarAtalho("todos", "pendente")}/>
      <Metric label="Frota própria" value={data.resumo.frotaPendentes} sub="Canhotos pendentes" tone="var(--primary)" active={filtros.status === "pendente" && filtros.proprietario === "frota"} onClick={() => aplicarAtalho("frota", "pendente")}/>
      <Metric label="Terceiros" value={data.resumo.terceirosPendentes} sub="Canhotos pendentes" tone="var(--warn)" active={filtros.status === "pendente" && filtros.proprietario === "terceiro"} onClick={() => aplicarAtalho("terceiro", "pendente")}/>
      <Metric label="Recebidos" value={data.resumo.recebidos} sub="Portal e ERP" tone="var(--ok)" active={filtros.status === "recebido"} onClick={() => aplicarAtalho("todos", "recebido")}/>
      <Metric label="Viagens" value={data.resumo.viagens} sub="No resultado atual" onClick={() => aplicarAtalho("todos", "todos")}/>
    </div>

    <form className="period-filter canhoto-filters" onSubmit={pesquisar}>
      <label><span>De</span><input type="date" min="2026-07-01" value={filtros.inicio} onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })}/></label>
      <label><span>Até</span><input type="date" min="2026-07-01" value={filtros.fim} onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })}/></label>
      <label><span>Operação</span><select value={filtros.proprietario} onChange={(e) => setFiltros({ ...filtros, proprietario: e.target.value })}><option value="todos">Frota e terceiros</option><option value="frota">Somente frota própria</option><option value="terceiro">Somente terceiros</option></select></label>
      <label><span>Situação</span><select value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}><option value="pendente">Pendentes</option><option value="recebido">Recebidos</option><option value="todos">Todos</option></select></label>
      <label className="canhoto-search"><span>Busca</span><input value={filtros.busca} onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} placeholder="Motorista, viagem, cliente, placa, nota, série ou CT-e"/></label>
      <button className="btn primary" disabled={loading}><Icon name="search"/> {loading ? "Consultando..." : "Consultar"}</button>
      <button type="button" className="btn" onClick={limparFiltros}>Limpar</button>
      <button type="button" className="btn" onClick={() => setMaisFiltros((v) => !v)}>{maisFiltros ? "Ocultar filtros" : "Mais filtros"} <Icon name={maisFiltros ? "chevron-down" : "chevron-right"}/></button>
      {maisFiltros && <div className="canhoto-advanced-filters">
        <label><span>Motorista</span><input value={filtros.motorista} onChange={(e) => setFiltros({ ...filtros, motorista: e.target.value })}/></label>
        <label><span>Viagem</span><input inputMode="numeric" value={filtros.viagem} onChange={(e) => setFiltros({ ...filtros, viagem: e.target.value.replace(/\D/g, "") })}/></label>
        <label><span>Cliente</span><input value={filtros.cliente} onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}/></label>
        <label><span>Placa</span><input value={filtros.placa} onChange={(e) => setFiltros({ ...filtros, placa: e.target.value.toUpperCase() })}/></label>
        <label><span>Número da NF</span><input inputMode="numeric" value={filtros.nota} onChange={(e) => setFiltros({ ...filtros, nota: e.target.value.replace(/\D/g, "") })}/></label>
        <label><span>Série</span><input value={filtros.serie} onChange={(e) => setFiltros({ ...filtros, serie: e.target.value })}/></label>
        <label><span>CT-e</span><input inputMode="numeric" value={filtros.cte} onChange={(e) => setFiltros({ ...filtros, cte: e.target.value.replace(/\D/g, "") })}/></label>
        <label className="canhoto-switch"><input type="checkbox" checked={filtros.semViagem} onChange={(e) => setFiltros({ ...filtros, semViagem: e.target.checked })}/><span>Somente sem viagem vinculada</span></label>
      </div>}
    </form>
    {!!filtrosAtivos.length && <div className="canhoto-filter-chips"><span>Filtros ativos:</span>{filtrosAtivos.map(([campo, label, valor]) => <button key={campo} onClick={() => removerFiltro(campo)}>{label}{valor !== true ? `: ${valor}` : ""} <b>×</b></button>)}</div>}

    {error && <div className="canhoto-message error">{error}<button className="btn sm" onClick={carregar}>Tentar novamente</button></div>}
    {success && <div className="canhoto-message success"><span>{success}</span>{ultimaBaixa && <button className="btn sm" disabled={saving} onClick={desfazerUltimaBaixa}>{saving ? "Desfazendo..." : "Desfazer última baixa"}</button>}</div>}
    {loading ? <div className="canhoto-skeleton"><i/><i/><i/></div> : !error && <>
      {renderSecao("frota", "Frota própria", "Viagens realizadas com veículos da empresa")}
      {renderSecao("terceiro", "Terceiros", "Viagens realizadas por agregados e transportadores terceiros")}
      {!grupos.length && <div className="card muted canhoto-empty">{filtros.status === "pendente" && data.resumo.recebidos ? "Todos os canhotos deste período foram conferidos." : "Nenhum canhoto foi encontrado com os filtros selecionados."}</div>}
    </>}

    {!!selecionados.size && <div className="canhoto-bulk"><strong>{selecionados.size} canhoto(s) selecionado(s)</strong><span>{viagensSelecionadas.length} viagem(ns) · {motoristasSelecionados.length} motorista(s)</span><div><button className="btn" onClick={() => setSelecionados(new Set())}>Limpar seleção</button><button className="btn primary" onClick={() => setModal(true)}><Icon name="check"/> Confirmar recebimento</button></div></div>}

    {modal && <div className="canhoto-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setModal(false)}><div className="card canhoto-modal" role="dialog" aria-modal="true" aria-labelledby="canhoto-modal-title">
      <h2 id="canhoto-modal-title">Confirmar recebimento dos canhotos?</h2><p><strong>{docsSelecionados.length} documento(s)</strong> de {viagensSelecionadas.length} viagem(ns).</p>
      <div className="canhoto-modal-summary"><span><b>Viagens:</b> {viagensSelecionadas.slice(0, 5).join(", ")}</span><span><b>Motoristas:</b> {motoristasSelecionados.slice(0, 4).join(", ")}</span></div>
      <label><span>Observação comum (opcional)</span><textarea rows="3" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: documentos conferidos sem ressalvas"/></label>
      <small>Seu usuário, a data e o horário serão registrados.</small><div className="canhoto-modal-actions"><button className="btn" disabled={saving} onClick={() => setModal(false)}>Cancelar</button><button className="btn primary" disabled={saving || !docsSelecionados.length} onClick={baixar}>{saving ? "Registrando..." : "Confirmar recebimento"}</button></div>
    </div></div>}

    {detalhe && <div className="canhoto-drawer-backdrop" onClick={(e) => e.target === e.currentTarget && setDetalhe(null)}><aside className="canhoto-drawer" role="dialog" aria-modal="true" aria-labelledby="canhoto-detail-title">
      <header><div><span className="muted">Detalhes do canhoto</span><h2 id="canhoto-detail-title">NF {detalhe.numeroNota}</h2></div><button className="btn sm" onClick={() => setDetalhe(null)} aria-label="Fechar detalhes">Fechar</button></header>
      <div className="canhoto-detail-status"><CanhotoStatusBadge item={detalhe}/>{!detalhe.viagem && <span className="badge warn">Sem vínculo confiável</span>}</div>
      <dl className="canhoto-detail-grid">
        <div><dt>Cliente</dt><dd>{detalhe.cliente || "-"}</dd></div><div><dt>Nota / série</dt><dd>{detalhe.numeroNota} / {detalhe.serieNota || "-"}</dd></div>
        <div><dt>{detalhe.tipoDocumento || "CT-e"}</dt><dd>{detalhe.serieCte}-{detalhe.numeroCte}</dd></div><div><dt>Emissão</dt><dd>{fmt(detalhe.emissaoNota || detalhe.emissaoCte)}</dd></div>
        <div><dt>Motorista</dt><dd>{detalhe.motorista || "Não informado"}</dd></div><div><dt>Placa</dt><dd>{detalhe.placa || "-"}</dd></div>
        <div><dt>Operação</dt><dd>{detalhe.proprietario === "frota" ? "Frota própria" : "Terceiro"}</dd></div><div><dt>Data de faturamento</dt><dd>{fmt(detalhe.emissaoNota || detalhe.emissaoCte)}</dd></div>
        <div><dt>Saída</dt><dd>{fmt(detalhe.dataSaida)}</dd></div><div><dt>Chegada</dt><dd>{detalhe.motoristaChegou ? fmt(detalhe.dataChegada) : "Aguardando retorno"}</dd></div>
        <div className="wide"><dt>Janela utilizada</dt><dd>As viagens definem apenas o período da consulta: última chegada válida do motorista e, como alternativa, última chegada da placa. Documentos considerados de {fmt(detalhe.inicioJanelaFaturamento)} até {fmt(detalhe.fimJanelaFaturamento)}.</dd></div>
        <div><dt>Origem da baixa</dt><dd>{detalhe.origemBaixa === "portal" ? "Portal" : detalhe.origemBaixa === "erp" ? "ERP" : "Pendente"}</dd></div><div><dt>Conferido em</dt><dd>{fmtHora(detalhe.recebidoEm)}</dd></div>
        <div className="wide"><dt>Responsável</dt><dd>{detalhe.recebidoPor || "-"}</dd></div><div className="wide"><dt>Observação</dt><dd>{detalhe.observacao || "Nenhuma observação registrada."}</dd></div>
      </dl>
      {detalhe.origemBaixa === "erp" && <div className="canhoto-drawer-note">Recebimento registrado no ERP. Este lançamento não pode ser estornado pelo portal.</div>}
      {detalhe.origemBaixa === "portal" && <footer><button className="btn" onClick={() => { const item = detalhe; setDetalhe(null); estornar(item); }}>Estornar baixa</button></footer>}
    </aside></div>}
  </div>;
};

window.ControleCanhotos = ControleCanhotos;
