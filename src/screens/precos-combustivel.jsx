function PrecosCombustivel() {
  const [tab, setTab] = React.useState("acordos");
  const [acordos, setAcordos] = React.useState([]);
  const [postos, setPostos] = React.useState([]);
  const [grupos, setGrupos] = React.useState([]);
  const [divergencias, setDivergencias] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [checking, setChecking] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState(() => ({
    startDate: pcDaysAgo(6),
    endDate: pcToday(),
  }));
  const [form, setForm] = React.useState(() => pcBlankForm());

  const loadAcordos = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await RB_API.listAbastecimentoAcordos({ search });
      setAcordos(Array.isArray(data?.acordos) ? data.acordos : []);
    } catch (err) {
      setError(err.message || "Nao foi possivel carregar os precos combinados.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadPostos = React.useCallback(async () => {
    try {
      const data = await RB_API.listPostosAbastecimento(search);
      setPostos(Array.isArray(data?.postos) ? data.postos : []);
    } catch {
      setPostos([]);
    }
  }, [search]);

  const loadGrupos = React.useCallback(async () => {
    try {
      const data = await RB_API.listGruposClientes();
      setGrupos(Array.isArray(data?.grupos) ? data.grupos : []);
    } catch {
      setGrupos([]);
    }
  }, []);

  React.useEffect(() => {
    loadAcordos();
    loadPostos();
    loadGrupos();
  }, [loadAcordos, loadPostos, loadGrupos]);

  async function checkDivergencias() {
    setChecking(true);
    setError("");
    try {
      const data = await RB_API.getDivergenciasAbastecimento(filters);
      setDivergencias(data);
      setTab("divergencias");
    } catch (err) {
      setError(err.message || "Nao foi possivel conferir os abastecimentos.");
    } finally {
      setChecking(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await RB_API.saveAbastecimentoAcordo(form);
      setForm(pcBlankForm());
      await loadAcordos();
    } catch (err) {
      setError(err.message || "Nao foi possivel salvar o preco combinado.");
    } finally {
      setSaving(false);
    }
  }

  async function removeGroup(group) {
    if (!confirm(`Excluir todos os precos de ${group.postoNome || group.postoCodigo} para ${group.grupoCliente || "Geral"}?`)) return;
    setSaving(true);
    setError("");
    try {
      await Promise.all(group.items.map((item) => RB_API.deleteAbastecimentoAcordo(item.id)));
      await loadAcordos();
    } catch (err) {
      setError(err.message || "Nao foi possivel excluir os acordos agrupados.");
    } finally {
      setSaving(false);
    }
  }

  function pickPosto(option) {
    setForm((current) => ({
      ...current,
      postoCodigo: option.postoCodigo || current.postoCodigo,
      postoNome: option.postoNome || current.postoNome,
      cidade: option.cidade || current.cidade,
      uf: option.uf || current.uf,
      produtoCodigo: option.produtoCodigo || current.produtoCodigo,
      produtoNome: option.produtoNome || current.produtoNome,
    }));
  }

  function setGrupo(codigo) {
    const grupo = grupos.find((item) => String(item.codigo) === String(codigo));
    setForm((current) => ({
      ...current,
      grupoClienteCodigo: grupo?.codigo || "",
      grupoCliente: grupo?.nome || "Geral",
    }));
  }

  const resumo = divergencias?.summary || {};
  const acordosAgrupados = React.useMemo(() => pcGroupAcordos(acordos), [acordos]);
  const webhookUrl = `${window.RB_API_BASE_URL || ""}/abastecimentos/acordos/divergencias?startDate=${filters.startDate}&endDate=${filters.endDate}`;

  return (
    <div className="view pc-view">
      <div className="page-head pc-head">
        <div>
          <h1>Precos combinados</h1>
          <div className="sub">Cadastro por posto, grupo e combustivel com conferencia para alerta no n8n</div>
        </div>
        <div className="actions">
          <button className="btn" onClick={loadAcordos} disabled={loading || saving}>
            <Icon name="refresh"/> Atualizar
          </button>
          <button className="btn primary" onClick={checkDivergencias} disabled={checking}>
            <Icon name="alert"/> Conferir notas
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--crit-border)", background: "var(--crit-bg)", color: "var(--crit)" }}>
          {error}
        </div>
      )}

      <div className="pc-kpis">
        <KPI label="Acordos ativos" value={acordos.filter((a) => a.ativo).length} icon="check" sub={`${acordosAgrupados.length} postos/grupos`}/>
        <KPI label="Divergencias" value={resumo.divergencias ?? "-"} icon="alert" sub="no periodo conferido"/>
        <KPI label="Excedente" value={pcBRL(resumo.totalExcedente || 0)} icon="money" sub="estimativa sobre o combinado"/>
        <KPI label="Grupos" value={grupos.length || "-"} icon="user" sub="do cadastro de clientes"/>
      </div>

      <div className="card pc-check-card">
        <div className="card-header pc-check-head">
          <div>
            <h3>Conferencia</h3>
            <div className="meta">Use a mesma URL no n8n, autenticada com o token do sistema</div>
          </div>
          <div className="pc-date-row">
            <label className="pc-field compact"><span>Inicio</span><input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}/></label>
            <label className="pc-field compact"><span>Fim</span><input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}/></label>
          </div>
        </div>
        <div className="card-body pc-check-body">
          <div className="pc-search-row">
            <input
              className="pc-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar posto, grupo ou combustivel"
            />
            <button className="btn" onClick={checkDivergencias} disabled={checking}>
              <Icon name="search"/> {checking ? "Conferindo..." : "Conferir periodo"}
            </button>
          </div>
          <div className="pc-webhook">
            <span>Endpoint n8n</span>
            <code>{webhookUrl}</code>
          </div>
        </div>
      </div>

      <div className="pc-tabs">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "acordos", label: "Acordos", count: acordosAgrupados.length },
            { id: "novo", label: form.id ? "Editar" : "Novo" },
            { id: "divergencias", label: "Divergencias", count: resumo.divergencias },
          ]}
        />
      </div>

      {tab === "novo" && (
        <div className="pc-edit-layout">
          <form className="card pc-form-card" onSubmit={save}>
            <div className="card-header">
              <h3>{form.id ? "Editar preco combinado" : "Novo preco combinado"}</h3>
              <label className="pc-toggle">
                <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })}/>
                Ativo
              </label>
            </div>
            <div className="card-body pc-form-body">
              <div className="pc-form-section">
                <h4>Posto e grupo</h4>
                <div className="pc-form-grid">
                  <label className="pc-field"><span>Codigo posto</span><input required value={form.postoCodigo} onChange={(e) => setForm({ ...form, postoCodigo: e.target.value })}/></label>
                  <label className="pc-field wide"><span>Nome posto</span><input value={form.postoNome} onChange={(e) => setForm({ ...form, postoNome: e.target.value })}/></label>
                  <label className="pc-field"><span>Cidade</span><input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })}/></label>
                  <label className="pc-field uf"><span>UF</span><input value={form.uf} maxLength="2" onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}/></label>
                  <label className="pc-field wide"><span>Grupo de cliente</span>
                    <select value={form.grupoClienteCodigo || ""} onChange={(e) => setGrupo(e.target.value)}>
                      <option value="">Geral / sem grupo</option>
                      {grupos.map((grupo) => (
                        <option key={grupo.codigo} value={grupo.codigo}>{grupo.nome} ({grupo.clientes})</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="pc-form-section">
                <h4>Combustivel e regra</h4>
                <div className="pc-form-grid">
                  <label className="pc-field wide"><span>Combustivel</span><input value={form.produtoNome} onChange={(e) => setForm({ ...form, produtoNome: e.target.value })} placeholder="S-10, S-500, Arla..."/></label>
                  <label className="pc-field"><span>Codigo produto</span><input value={form.produtoCodigo} onChange={(e) => setForm({ ...form, produtoCodigo: e.target.value })}/></label>
                  <label className="pc-field"><span>Valor combinado</span><input required type="number" step="0.0001" min="0" value={form.valorMaximo} onChange={(e) => setForm({ ...form, valorMaximo: e.target.value })}/></label>
                  <label className="pc-field"><span>Tolerancia</span><input type="number" step="0.0001" min="0" value={form.tolerancia} onChange={(e) => setForm({ ...form, tolerancia: e.target.value })}/></label>
                  <label className="pc-field"><span>Inicio</span><input type="date" value={form.vigenciaInicio} onChange={(e) => setForm({ ...form, vigenciaInicio: e.target.value })}/></label>
                  <label className="pc-field"><span>Fim</span><input type="date" value={form.vigenciaFim || ""} onChange={(e) => setForm({ ...form, vigenciaFim: e.target.value })}/></label>
                </div>
              </div>

              <div className="pc-form-section">
                <h4>Contato para alerta</h4>
                <div className="pc-form-grid">
                  <label className="pc-field"><span>Contato</span><input value={form.contatoNome} onChange={(e) => setForm({ ...form, contatoNome: e.target.value })}/></label>
                  <label className="pc-field"><span>Telefone</span><input value={form.contatoTelefone} onChange={(e) => setForm({ ...form, contatoTelefone: e.target.value })}/></label>
                  <label className="pc-field wide"><span>Link WhatsApp</span><input value={form.linkWhatsapp} onChange={(e) => setForm({ ...form, linkWhatsapp: e.target.value })}/></label>
                </div>
              </div>

              <label className="pc-field"><span>Observacoes</span><textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows="3"/></label>
              <div className="pc-form-actions">
                <button type="button" className="btn" onClick={() => { setForm(pcBlankForm()); setTab("acordos"); }}>Cancelar</button>
                <button className="btn primary" disabled={saving}><Icon name="check"/> {saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </div>
          </form>

          <div className="card card-flush pc-recent-card">
            <div className="card-header">
              <h3>Postos recentes</h3>
              <div className="meta">Clique para preencher o cadastro</div>
            </div>
            <div className="table-wrap pc-table-wrap">
              <table className="pc-table">
                <thead><tr><th>Posto</th><th>Produto</th><th>Ultimo uso</th><th></th></tr></thead>
                <tbody>
                  {postos.map((posto, index) => (
                    <tr key={`${posto.postoCodigo}-${posto.produtoCodigo}-${index}`}>
                      <td>{posto.postoNome}<br/><span className="muted">{posto.postoCodigo} - {[posto.cidade, posto.uf].filter(Boolean).join("/")}</span></td>
                      <td>{posto.produtoNome || "-"}</td>
                      <td>{pcDate(posto.ultimaData)}</td>
                      <td><button className="btn" onClick={() => pickPosto(posto)}>Usar</button></td>
                    </tr>
                  ))}
                  {!postos.length && <tr><td colSpan="4" style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>Nenhum posto encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "acordos" && (
        <div className="card card-flush pc-list-card">
          <div className="card-header">
            <div>
              <h3>Tabela de precos combinados</h3>
              <div className="meta">{acordos.length} precos em {acordosAgrupados.length} linhas agrupadas</div>
            </div>
            <button className="btn primary" onClick={() => { setForm(pcBlankForm()); setTab("novo"); }}><Icon name="plus"/> Novo acordo</button>
          </div>
          <div className="table-wrap pc-table-wrap">
            <table className="pc-table">
              <thead><tr><th>Status</th><th>Posto</th><th>Grupo cliente</th><th>ARLA</th><th>S-10</th><th>S-500</th><th>Vigencia</th><th>Contato</th><th></th></tr></thead>
              <tbody>
                {acordosAgrupados.map((group) => (
                  <tr key={group.key}>
                    <td><span className={`badge ${group.ativo ? "ok" : "crit"}`}><span className="dot"/>{group.ativo ? "Ativo" : "Inativo"}</span></td>
                    <td>{group.postoNome || `Posto ${group.postoCodigo}`}<br/><span className="muted">{group.postoCodigo} - {[group.cidade, group.uf].filter(Boolean).join("/")}</span></td>
                    <td>{group.grupoCliente || "Geral"}<br/><span className="muted">{group.grupoClienteCodigo ? `Codigo ${group.grupoClienteCodigo}` : "Regra geral"}</span></td>
                    <td><PcPriceCell acordo={group.products.ARLA}/></td>
                    <td><PcPriceCell acordo={group.products["S-10"]}/></td>
                    <td><PcPriceCell acordo={group.products["S-500"]}/></td>
                    <td>{pcVigencia(group.items)}</td>
                    <td>{group.contatoNome || "-"}<br/><span className="muted">{group.contatoTelefone || ""}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="icon-btn" title="Editar primeiro preco da linha" onClick={() => { setForm({ ...pcBlankForm(), ...group.items[0] }); setTab("novo"); }}><Icon name="edit" size={13}/></button>
                        <button className="icon-btn" title="Excluir linha agrupada" onClick={() => removeGroup(group)}><Icon name="trash" size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !acordosAgrupados.length && <tr><td colSpan="9"><div className="pc-empty">Nenhum acordo cadastrado.</div></td></tr>}
                {loading && <tr><td colSpan="9"><div className="pc-empty">Carregando...</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "divergencias" && (
        <div className="card card-flush pc-list-card">
          <div className="card-header">
            <h3>Divergencias encontradas</h3>
            <div className="meta">{divergencias ? `${pcDate(divergencias.period?.startDate)} a ${pcDate(divergencias.period?.endDate)}` : "Conferir periodo para atualizar"}</div>
          </div>
          <div className="table-wrap pc-table-wrap">
            <table className="pc-table">
              <thead><tr><th>Data</th><th>Posto</th><th>Grupo/cliente</th><th>Produto</th><th>Placa</th><th>Pago</th><th>Combinado</th><th>Excedente</th><th>Mensagem n8n</th></tr></thead>
              <tbody>
                {(divergencias?.divergencias || []).map((row) => (
                  <tr key={`${row.empresa}-${row.codigo}`}>
                    <td>{pcDate(row.data)}</td>
                    <td>{row.postoNome}<br/><span className="muted">{row.postoCodigo} - {row.grupoCliente}</span></td>
                    <td>{row.grupoClienteNome || row.grupoCliente || "-"}<br/><span className="muted">{row.clienteNome || "sem cliente vinculado"}</span></td>
                    <td>{row.produtoNome || "-"}</td>
                    <td>{row.placa || "-"}</td>
                    <td>{pcBRL(row.valorLitro)}/l<br/><span className="muted">{pcBRL(row.total)}</span></td>
                    <td>{pcBRL(row.valorCombinado)}/l<br/><span className="muted">limite {pcBRL(row.valorLimite)}</span></td>
                    <td>{pcBRL(row.excedenteTotal)}<br/><span className="muted">{pcBRL(row.excedenteLitro)}/l</span></td>
                    <td style={{ maxWidth: 360 }}>{row.mensagem}</td>
                  </tr>
                ))}
                {divergencias && !divergencias.divergencias?.length && <tr><td colSpan="9"><div className="pc-empty">Nenhuma nota acima do combinado neste periodo.</div></td></tr>}
                {!divergencias && <tr><td colSpan="9"><div className="pc-empty">Clique em conferir notas para buscar divergencias.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function pcBlankForm() {
  return {
    ativo: true,
    postoCodigo: "",
    postoNome: "",
    cidade: "",
    uf: "",
    grupoClienteCodigo: "",
    grupoCliente: "Geral",
    produtoCodigo: "",
    produtoNome: "",
    valorMaximo: "",
    tolerancia: "0",
    vigenciaInicio: pcToday(),
    vigenciaFim: "",
    contatoNome: "",
    contatoTelefone: "",
    linkWhatsapp: "",
    observacoes: "",
  };
}

function PcPriceCell({ acordo }) {
  if (!acordo) return <span className="pc-price-empty">-</span>;
  return (
    <div className="pc-price-cell">
      <strong>{pcBRL(acordo.valorMaximo)}</strong>
      <span>tol. {pcBRL(acordo.tolerancia || 0)}</span>
    </div>
  );
}

function pcProductKey(value) {
  const text = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (text.includes("ARLA")) return "ARLA";
  if (text.includes("S-500") || text.includes("S500")) return "S-500";
  if (text.includes("S-10") || text.includes("S10")) return "S-10";
  return text.trim() || "OUTROS";
}

function pcGroupAcordos(acordos = []) {
  const map = new Map();
  for (const acordo of acordos) {
    const key = [
      acordo.postoCodigo || "",
      acordo.postoNome || "",
      acordo.cidade || "",
      acordo.uf || "",
      acordo.grupoClienteCodigo || "",
      acordo.grupoCliente || "",
      acordo.contatoNome || "",
      acordo.contatoTelefone || "",
      acordo.linkWhatsapp || "",
    ].map((part) => String(part).trim().toLowerCase()).join("|");

    const group = map.get(key) || {
      key,
      postoCodigo: acordo.postoCodigo,
      postoNome: acordo.postoNome,
      cidade: acordo.cidade,
      uf: acordo.uf,
      grupoClienteCodigo: acordo.grupoClienteCodigo,
      grupoCliente: acordo.grupoCliente,
      contatoNome: acordo.contatoNome,
      contatoTelefone: acordo.contatoTelefone,
      linkWhatsapp: acordo.linkWhatsapp,
      ativo: false,
      products: {},
      items: [],
    };

    group.items.push(acordo);
    group.ativo = group.ativo || acordo.ativo;
    group.products[pcProductKey(acordo.produtoNome || acordo.produtoCodigo)] = acordo;
    map.set(key, group);
  }

  return [...map.values()].sort((a, b) => {
    const groupCompare = String(a.grupoCliente || "").localeCompare(String(b.grupoCliente || ""));
    if (groupCompare) return groupCompare;
    return String(a.postoNome || a.postoCodigo || "").localeCompare(String(b.postoNome || b.postoCodigo || ""));
  });
}

function pcVigencia(items = []) {
  const starts = [...new Set(items.map((item) => pcDate(item.vigenciaInicio)).filter(Boolean))];
  const ends = [...new Set(items.map((item) => pcDate(item.vigenciaFim) || "sem fim").filter(Boolean))];
  const startLabel = starts.length === 1 ? starts[0] : "varias datas";
  const endLabel = ends.length === 1 ? ends[0] : "varios fins";
  return `${startLabel} a ${endLabel}`;
}

function pcToday() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function pcDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function pcBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function pcDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
}

window.PrecosCombustivel = PrecosCombustivel;
