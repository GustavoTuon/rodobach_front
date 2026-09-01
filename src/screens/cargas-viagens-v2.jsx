const { useEffect, useState } = React;

const CV2_STATUS = {
  aguardando_viagem: { label: "Somente carga", tone: "neutral" },
  aguardando_cte: { label: "Aguardando CT-e", tone: "warning" },
  em_transito: { label: "Em trânsito", tone: "blue" },
  entregue: { label: "Entregue", tone: "delivered" },
  cancelado: { label: "Cancelado", tone: "danger" },
  faltando_dados: { label: "Faltando dados", tone: "warning" },
};

const CV2_FINANCIAL = {
  sem_cte: { label: "Sem CT-e", tone: "neutral" },
  sem_titulo: { label: "Sem faturamento", tone: "neutral" },
  em_aberto: { label: "Em aberto", tone: "open" },
  parcial: { label: "Pagamento parcial", tone: "partial" },
  quitado: { label: "Quitado", tone: "paid" },
  revisar: { label: "Revisar financeiro", tone: "danger" },
  cancelado: { label: "Cancelado", tone: "neutral" },
  indisponivel: { label: "Financeiro indisponível", tone: "neutral" },
};

const CV2_APPROVAL = {
  rascunho: { label: "Rascunho", tone: "neutral" },
  aguardando_aprovacao: { label: "Aguardando aprovação", tone: "warning" },
  aprovada: { label: "Aprovada", tone: "success" },
  correcao_solicitada: { label: "Correção solicitada", tone: "warning" },
  reprovada: { label: "Reprovada", tone: "danger" },
  cancelada: { label: "Cancelada", tone: "neutral" },
};

const CV2_TODAY = () => new Date().toISOString().slice(0, 10);
const CV2_UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const cv2Money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const cv2Weight = (value) => `${Number(value || 0).toLocaleString("pt-BR")} kg`;
const cv2Date = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const cv2Error = (error) => error?.message || "Não foi possível concluir a operação.";
const cv2StoredArray = (key, fallback) => {
  try { const value = JSON.parse(window.localStorage.getItem(key)); return Array.isArray(value) ? value : fallback; }
  catch { return fallback; }
};
const CV2_COMMERCIAL_BY_LOGIN = {
  maicon: "MAICON STEINBACH",
  mauricio: "MAURICIO STEINBACK",
};
const cv2CommercialForUser = (user) =>
  CV2_COMMERCIAL_BY_LOGIN[String(user?.login || "").trim().toLowerCase()] || "";

const emptyCarga = () => ({
  data: CV2_TODAY(), cliente: "", clienteFinal: "", tomadorServico: "", vendedor: "",
  origem: "", ufOrigem: "", destino: "", ufDestino: "", material: "", peso: "",
  valorCliente: "", condicaoPagamento: "", observacoes: "", paradas: [], calculoPreco: {},
});

const emptyViagem = () => ({
  numero: "", data: CV2_TODAY(), placa: "", tipoPropriedade: "", motorista: "", km: "",
  numeroMotorista: "", cnh: "", antt: "", contaDeposito: "", chavePix: "",
  valorMotorista: "", rotaMapsUrl: "", observacoes: "", cargaIds: [], docs: {},
});

const emptyCargaFilters = () => ({ empresa: "", origem: "", ufOrigem: "", destino: "", ufDestino: "", material: "" });

function Cv2Status({ value, detail = "", vehicleLinked = false }) {
  const status = CV2_STATUS[value] || { label: value || "Sem status", tone: "neutral" };
  return <div className="cv2-status-stack">{vehicleLinked && value === "aguardando_cte" && <span className="cv2-status linked"><i />Veículo vinculado</span>}<span className={`cv2-status ${status.tone}`}><i />{status.label}</span>{detail && <small>{detail}</small>}</div>;
}

function Cv2FinancialStatus({ value }) {
  const financial = value || {};
  const status = CV2_FINANCIAL[financial.status] || CV2_FINANCIAL.sem_cte;
  const detail = financial.status === "quitado" && financial.valorTotal > 0
    ? `${cv2Money(financial.valorTotal)} recebido`
    : financial.valorAberto > 0
      ? `${cv2Money(financial.valorAberto)} em aberto`
      : financial.titulos > 0
        ? `${financial.titulos} título(s)`
        : "";
  return <div className="cv2-status-stack"><span className={`cv2-status finance ${status.tone}`}><i />{status.label}</span>{detail && <small>{detail}</small>}</div>;
}

function Cv2TripBilling({ financeiro }) {
  const parcelas = financeiro?.parcelas || [];
  const total = Number(financeiro?.valorTotal || 0);
  const aberto = Number(financeiro?.valorAberto || 0);
  const recebido = Math.max(0, total - aberto);
  const progress = total > 0 ? Math.min(100, Math.max(0, (recebido / total) * 100)) : 0;
  return <section className="cv2-billing">
    <div className="cv2-billing-head"><div><h3>Faturas e parcelas</h3><p>Valores recebidos e vencimentos vinculados aos CT-es desta viagem.</p></div><Cv2FinancialStatus value={financeiro} /></div>
    {!parcelas.length ? <div className="cv2-billing-empty"><b>Nenhuma parcela localizada.</b><span>Ela aparecerá aqui quando o CT-e gerar um título no financeiro.</span></div> : <>
      <div className="cv2-billing-summary"><div><span>Faturado</span><b>{cv2Money(total)}</b></div><div><span>Recebido</span><b className="received">{cv2Money(recebido)}</b></div><div><span>Saldo em aberto</span><b className={aberto > 0 ? "open" : "received"}>{cv2Money(aberto)}</b></div><div><span>Progresso</span><b>{progress.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%</b><div className="cv2-progress"><i style={{ width: `${progress}%` }} /></div></div></div>
      <div className="cv2-installments"><table><thead><tr><th>Fatura / parcela</th><th>Emissão</th><th>Vencimento</th><th>Valor</th><th>Recebido</th><th>Saldo</th><th>Situação</th></tr></thead><tbody>{parcelas.map((parcela) => {
        const overdue = parcela.status === "em_aberto" && parcela.vencimento && parcela.vencimento < CV2_TODAY();
        const status = overdue ? { label: "Vencida", tone: "danger" } : (CV2_FINANCIAL[parcela.status] || CV2_FINANCIAL.revisar);
        return <tr key={parcela.id}><td><strong>{parcela.documento || `${parcela.serie}-${parcela.duplicata}`}</strong><small>Parcela {parcela.parcela || "—"}</small></td><td>{cv2Date(parcela.emissao)}</td><td><strong>{cv2Date(parcela.vencimento)}</strong>{parcela.dataRecebimento && <small>Baixa em {cv2Date(parcela.dataRecebimento)}</small>}</td><td>{cv2Money(parcela.valorTotal)}</td><td>{cv2Money(parcela.valorRecebido)}</td><td>{cv2Money(parcela.valorAberto)}</td><td><span className={`cv2-status ${status.tone}`}><i />{status.label}</span></td></tr>;
      })}</tbody></table></div>
    </>}
  </section>;
}

function Cv2Approval({ carga }) {
  const approval = CV2_APPROVAL[carga.statusAprovacao] || CV2_APPROVAL.rascunho;
  const author = carga.statusAprovacao === "aprovada" && carga.aprovadoPor
    ? `por ${carga.aprovadoPor}`
    : carga.atualizadoPor ? `alterado por ${carga.atualizadoPor}` : "";
  return <div className="cv2-approval"><span className={`cv2-approval-badge ${approval.tone}`}>{approval.label}</span>{author && <small>{author}</small>}</div>;
}

function Cv2Modal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <div className="cv2-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`cv2-modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true">
        <header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="cv2-icon-btn" onClick={onClose} aria-label="Fechar">×</button></header>
        {children}
      </section>
    </div>
  );
}

function Cv2Field({ label, required, hint, children, className = "" }) {
  return <label className={`cv2-field ${className}`}><span>{label}{required && <b> *</b>}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function Cv2QuoteModal({ onClose, user, sellers = [] }) {
  const userCommercial = cv2CommercialForUser(user);
  const activeUserCommercial = sellers.includes(userCommercial) ? userCommercial : "";
  const [form, setForm] = useState({ ufOrigem: "SC", municipioOrigem: "", ufDestino: "", municipioDestino: "", placa: "", material: "", vendedor: activeUserCommercial, meses: "24" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState({ field: "data", direction: "desc" });
  const defaultColumnOrder = ["data", "origem", "destino", "clienteInicial", "material", "peso", "placa", "km", "valor", "valorMotorista", "clienteFinal"];
  const [columnOrder, setColumnOrder] = useState(() => cv2StoredArray("cv2-quote-column-order-v2", defaultColumnOrder));
  const [hiddenColumns, setHiddenColumns] = useState(() => cv2StoredArray("cv2-quote-hidden-columns-v2", []));
  const [dragColumn, setDragColumn] = useState("");
  const [compact, setCompact] = useState(true);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  useEffect(() => {
    if (!form.ufOrigem || !form.ufDestino) { setResult(null); setLoading(false); return undefined; }
    let active = true;
    const timer = setTimeout(async () => {
      setError(""); setLoading(true);
      try {
        const data = await window.RB_API.consultarCotacaoFretesV2(form);
        if (active) setResult(data);
      } catch (err) {
        if (active) { setResult(null); setError(cv2Error(err)); }
      } finally {
        if (active) setLoading(false);
      }
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [form.ufOrigem, form.municipioOrigem, form.ufDestino, form.municipioDestino, form.placa, form.material, form.vendedor, form.meses]);
  useEffect(() => { window.localStorage.setItem("cv2-quote-column-order-v2", JSON.stringify(columnOrder)); }, [columnOrder]);
  useEffect(() => { window.localStorage.setItem("cv2-quote-hidden-columns-v2", JSON.stringify(hiddenColumns)); }, [hiddenColumns]);
  const changeSort = (field) => setSort((current) => ({ field, direction: current.field === field && current.direction === "asc" ? "desc" : "asc" }));
  const sortedFreights = [...(result?.fretes || [])].sort((a, b) => {
    const left = ["valor", "valorMotorista", "peso", "km"].includes(sort.field) ? Number(a[sort.field] || 0) : String(a[sort.field] || "").toLocaleLowerCase("pt-BR");
    const right = ["valor", "valorMotorista", "peso", "km"].includes(sort.field) ? Number(b[sort.field] || 0) : String(b[sort.field] || "").toLocaleLowerCase("pt-BR");
    const comparison = left < right ? -1 : left > right ? 1 : 0;
    return sort.direction === "asc" ? comparison : -comparison;
  });
  const heading = (label, field) => <button type="button" onClick={() => changeSort(field)}>{label}<span>{sort.field === field ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}</span></button>;
  const columns = {
    data: { label: "Data", render: (frete) => cv2Date(frete.data) },
    origem: { label: "Origem", render: (frete) => frete.origem || "—" },
    destino: { label: "Destino", render: (frete) => frete.destino || "—" },
    clienteInicial: { label: "Cliente inicial", render: (frete) => frete.clienteInicial || "Não informado" },
    clienteFinal: { label: "Cliente final", render: (frete) => frete.clienteFinal || "Não informado" },
    material: { label: "Material", render: (frete) => frete.material || "Não informado" },
    peso: { label: "Peso", render: (frete) => Number(frete.peso || 0) > 0 ? cv2Weight(frete.peso) : "—" },
    placa: { label: "Placa", render: (frete) => <span className="cv2-plate">{frete.placa || "—"}</span> },
    km: { label: "KM", render: (frete) => Number(frete.km || 0) > 0 ? `${Number(frete.km).toLocaleString("pt-BR")} km` : "—" },
    valor: { label: "Valor do frete", render: (frete) => <strong>{cv2Money(frete.valor)}</strong> },
    valorMotorista: { label: "Valor motorista", render: (frete) => Number(frete.valorMotorista || 0) > 0 ? <strong>{cv2Money(frete.valorMotorista)}</strong> : "—" },
  };
  const visibleColumns = columnOrder.filter((id) => !hiddenColumns.includes(id));
  const moveColumn = (target) => {
    if (!dragColumn || dragColumn === target) return;
    setColumnOrder((current) => {
      const next = current.filter((id) => id !== dragColumn);
      next.splice(next.indexOf(target), 0, dragColumn);
      return next;
    });
    setDragColumn("");
  };
  const toggleColumn = (id) => setHiddenColumns((current) => current.includes(id) ? current.filter((item) => item !== id) : visibleColumns.length > 1 ? [...current, id] : current);
  const resumo = result?.resumo || {};
  return <Cv2Modal wide title="Histórico para cotação" subtitle="Filtre e ordene os fretes como em uma planilha. A lista é atualizada automaticamente." onClose={onClose}>
    <form onSubmit={(event) => event.preventDefault()}>
      <div className="cv2-modal-body cv2-quote-body">
        <div className="cv2-quote-filters">
          <Cv2Field label="UF de origem" required><select value={form.ufOrigem} onChange={(event) => update("ufOrigem", event.target.value)} required><option value="">Selecione</option>{CV2_UFS.map((uf) => <option key={uf}>{uf}</option>)}</select></Cv2Field>
          <Cv2Field label="Município de origem"><input value={form.municipioOrigem} placeholder="Ex.: Morro da Fumaça" onChange={(event) => update("municipioOrigem", event.target.value)} /></Cv2Field>
          <Cv2Field label="UF de destino" required><select value={form.ufDestino} onChange={(event) => update("ufDestino", event.target.value)} required><option value="">Selecione</option>{CV2_UFS.map((uf) => <option key={uf}>{uf}</option>)}</select></Cv2Field>
          <Cv2Field label="Município de destino"><input value={form.municipioDestino} placeholder="Ex.: São Paulo" onChange={(event) => update("municipioDestino", event.target.value)} /></Cv2Field>
          <Cv2Field label="Placa" hint="Opcional: deixe em branco para consultar toda a frota."><input value={form.placa} maxLength="7" placeholder="Ex.: ABC1D23" onChange={(event) => update("placa", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></Cv2Field>
          <Cv2Field label="Material carregado"><input value={form.material} placeholder="Todos os materiais" onChange={(event) => update("material", event.target.value)} /></Cv2Field>
          <Cv2Field label="Vendedor" hint={activeUserCommercial ? "Preenchido pelo usuário logado." : "Sem vendedor selecionado, consulta todos."}><select value={form.vendedor} onChange={(event) => update("vendedor", event.target.value)}><option value="">Todos os vendedores</option>{sellers.map((item) => <option key={item} value={item}>{item}</option>)}</select></Cv2Field>
          <Cv2Field label="Período"><select value={form.meses} onChange={(event) => update("meses", event.target.value)}><option value="6">Últimos 6 meses</option><option value="12">Últimos 12 meses</option><option value="24">Últimos 24 meses</option><option value="36">Últimos 36 meses</option></select></Cv2Field>
        </div>
        {error && <div className="cv2-alert error">{error}</div>}
        {loading && <div className="cv2-quote-loading">Atualizando a lista...</div>}
        {result && <section className="cv2-quote-sheet">
          <div className="cv2-quote-sheet-head"><div><b>{resumo.quantidade || 0} frete(s)</b><span>Valor médio: {cv2Money(resumo.media)}</span></div><div className="cv2-quote-view-actions"><small>Arraste as colunas para reorganizar.</small><button type="button" className="btn" onClick={() => setCompact((value) => !value)}>{compact ? "Visual confortável" : "Visual compacto"}</button><details><summary>Colunas</summary><div>{defaultColumnOrder.map((id) => <label key={id}><input type="checkbox" checked={!hiddenColumns.includes(id)} onChange={() => toggleColumn(id)} />{columns[id].label}</label>)}<button type="button" onClick={() => { setColumnOrder(defaultColumnOrder); setHiddenColumns([]); }}>Restaurar padrão</button></div></details></div></div>
          {!sortedFreights.length ? <div className="cv2-empty small"><b>Nenhum frete encontrado</b><span>Altere os filtros acima para ampliar a consulta.</span></div> : <div className={`cv2-quote-history ${compact ? "compact" : "comfortable"}`}><table><thead><tr>{visibleColumns.map((id) => <th key={id} draggable onDragStart={() => setDragColumn(id)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveColumn(id)} className={dragColumn === id ? "dragging" : ""}>{heading(columns[id].label, id)}</th>)}</tr></thead><tbody>{sortedFreights.map((frete, index) => <tr key={`${frete.id}-${index}`}>{visibleColumns.map((id) => <td key={id}>{columns[id].render(frete)}</td>)}</tr>)}</tbody></table></div>}
        </section>}
        {!result && !loading && !error && <div className="cv2-empty small"><b>Selecione a UF de destino</b><span>Assim que os filtros forem preenchidos, a lista será carregada automaticamente.</span></div>}
      </div>
      <footer className="cv2-modal-actions"><span>{loading ? "Atualizando..." : result ? `${resumo.quantidade || 0} frete(s) localizado(s)` : "Aguardando os filtros"}</span><button type="button" className="btn primary" onClick={onClose}>Fechar</button></footer>
    </form>
  </Cv2Modal>;
}

function Cv2Autocomplete({ label, hint, value, onChange, onSelect, search, placeholder, renderOption, required, allowCustom = true }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const q = String(value || "").trim();
    if (!open || q.length < 2) { setItems([]); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      search(q).then((result) => setItems(Array.isArray(result) ? result : [])).catch(() => setItems([])).finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(timer);
  }, [value, open]);
  return (
    <Cv2Field label={label} hint={hint} required={required} className="cv2-autocomplete-field">
      <div className="cv2-autocomplete">
        <input value={value || ""} placeholder={placeholder} autoComplete="off" required={required} onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && allowCustom && String(value || "").trim()) {
              event.preventDefault(); setOpen(false);
            }
          }}
          onChange={(event) => { onChange(event.target.value); setOpen(true); }} />
        {open && String(value || "").trim().length >= 2 && (
          <div className="cv2-suggestions">
            {loading && <div className="cv2-suggestion-empty">Buscando...</div>}
            {!loading && !items.length && <div className="cv2-suggestion-empty">Nenhum resultado. Você pode manter o texto digitado.</div>}
            {!loading && items.map((item, index) => (
              <button type="button" key={`${item.codigo || item.placa || item.label}-${index}`} onMouseDown={(event) => event.preventDefault()}
                onClick={() => { onSelect(item); setOpen(false); }}>{renderOption(item)}</button>
            ))}
          </div>
        )}
      </div>
    </Cv2Field>
  );
}

function Cv2CargaForm({ initial, user, onClose, onSaved }) {
  const userCommercial = cv2CommercialForUser(user);
  const [form, setForm] = useState(() => initial
    ? { ...emptyCarga(), ...initial }
    : { ...emptyCarga(), vendedor: userCommercial });
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [pricing, setPricing] = useState(initial?.calculoPreco?.custoEstimado !== undefined ? initial.calculoPreco : null);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const addStop = () => set("paradas", [...form.paradas, { tipo: "entrega", cidade: "", uf: "", cliente: "", endereco: "", nf: "", observacoes: "" }]);
  const editStop = (index, key, value) => set("paradas", form.paradas.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const removeStop = (index) => set("paradas", form.paradas.filter((_, itemIndex) => itemIndex !== index));
  const calculatePrice = async () => {
    setError(""); setCalculating(true);
    try {
      const result = await window.RB_API.calcularPrecoCargaV2({ ...form, cargaId: initial?.id });
      setPricing(result); set("calculoPreco", result);
    } catch (err) { setError(cv2Error(err)); }
    finally { setCalculating(false); }
  };
  const save = async (event) => {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      const saved = initial?.id ? await window.RB_API.updateCargaV2(initial.id, form) : await window.RB_API.createCargaV2(form);
      onSaved(saved);
    } catch (err) { setError(cv2Error(err)); }
    finally { setSaving(false); }
  };
  return (
    <Cv2Modal title={initial?.id ? `Editar ${initial.codigo}` : "Cadastrar carga"} subtitle="Registre as informações comerciais. O veículo será definido na próxima etapa." onClose={onClose} wide>
      <form onSubmit={save}>
        <div className="cv2-modal-body">
          {error && <div className="cv2-alert error">{error}</div>}
          <div className="cv2-section-title"><span>1</span><div><b>Clientes e negociação</b><small>Informe onde a carga começa, onde será entregue e quem pagará o frete.</small></div></div>
          <div className="cv2-grid four">
            <Cv2Field label="Data" required><input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} required /></Cv2Field>
            <Cv2Autocomplete label="Cliente inicial" hint="Onde a carga começa" required value={form.cliente} onChange={(value) => set("cliente", value)}
              search={window.RB_API.searchViagemClientes} placeholder="Onde a carga começa"
              onSelect={(item) => setForm((current) => ({ ...current, cliente: item.nome, origem: item.cidade || current.origem, ufOrigem: item.uf || current.ufOrigem, condicaoPagamento: item.condicaoPagamento || current.condicaoPagamento, vendedor: userCommercial || item.vendedor || current.vendedor }))}
              renderOption={(item) => <><strong>{item.nome}</strong><span>{[item.documento, item.cidade, item.uf].filter(Boolean).join(" · ")}</span></>} />
            <Cv2Autocomplete label="Cliente final" hint="Onde a carga será entregue" required value={form.clienteFinal} onChange={(value) => set("clienteFinal", value)}
              search={window.RB_API.searchViagemClientes} placeholder="Onde a carga será entregue"
              onSelect={(item) => setForm((current) => ({ ...current, clienteFinal: item.nome, destino: item.cidade || current.destino, ufDestino: item.uf || current.ufDestino }))}
              renderOption={(item) => <><strong>{item.nome}</strong><span>{[item.documento, item.cidade, item.uf].filter(Boolean).join(" · ")}</span></>} />
            <Cv2Autocomplete label="Tomador do serviço" hint="Quem vai pagar o frete" required value={form.tomadorServico} onChange={(value) => set("tomadorServico", value)}
              search={window.RB_API.searchViagemClientes} placeholder="Quem vai pagar o frete"
              onSelect={(item) => setForm((current) => ({ ...current, tomadorServico: item.nome, condicaoPagamento: item.condicaoPagamento || current.condicaoPagamento, vendedor: userCommercial || item.vendedor || current.vendedor }))}
              renderOption={(item) => <><strong>{item.nome}</strong><span>{[item.documento, item.cidade, item.uf].filter(Boolean).join(" · ")}</span></>} />
            {userCommercial
              ? <Cv2Field label="Vendedor" hint="Preenchido pelo usuário logado"><input value={form.vendedor} readOnly /></Cv2Field>
              : <Cv2Autocomplete label="Vendedor" value={form.vendedor} onChange={(value) => set("vendedor", value)}
                search={window.RB_API.searchViagemVendedores} placeholder="Selecione ou digite o vendedor"
                onSelect={(item) => set("vendedor", item.nome)} renderOption={(item) => <><strong>{item.nome}</strong>{item.fantasia && <span>{item.fantasia}</span>}</>} />}
            <Cv2Field label="Condição de pagamento"><input value={form.condicaoPagamento} onChange={(e) => set("condicaoPagamento", e.target.value)} placeholder="Ex.: 30 dias" /></Cv2Field>
            <Cv2Field label="Valor do cliente (R$)" required><input type="number" min="0" step="0.01" value={form.valorCliente} onChange={(e) => set("valorCliente", e.target.value)} required /></Cv2Field>
          </div>
          <div className="cv2-section-title"><span>2</span><div><b>Rota e mercadoria</b><small>Esses dados alimentarão a consulta de fretes já realizados.</small></div></div>
          <div className="cv2-grid four">
            <Cv2Autocomplete label="Cidade de origem" required value={form.origem} onChange={(value) => set("origem", value)}
              search={window.RB_API.searchCidades} placeholder="Selecione ou digite a cidade"
              onSelect={(item) => setForm((current) => ({ ...current, origem: item.nome, ufOrigem: item.uf || current.ufOrigem }))}
              renderOption={(item) => <><strong>{item.nome}</strong><span>{item.uf || "UF não informada"}</span></>} />
            <Cv2Field label="UF origem" required><input maxLength="2" value={form.ufOrigem} onChange={(e) => set("ufOrigem", e.target.value.toUpperCase())} required /></Cv2Field>
            <Cv2Autocomplete label="Cidade de destino" required value={form.destino} onChange={(value) => set("destino", value)}
              search={window.RB_API.searchCidades} placeholder="Selecione ou digite a cidade"
              onSelect={(item) => setForm((current) => ({ ...current, destino: item.nome, ufDestino: item.uf || current.ufDestino }))}
              renderOption={(item) => <><strong>{item.nome}</strong><span>{item.uf || "UF não informada"}</span></>} />
            <Cv2Field label="UF destino" required><input maxLength="2" value={form.ufDestino} onChange={(e) => set("ufDestino", e.target.value.toUpperCase())} required /></Cv2Field>
            <Cv2Field label="Material"><input value={form.material} onChange={(e) => set("material", e.target.value)} placeholder="Mercadoria transportada" /></Cv2Field>
            <Cv2Field label="Peso (kg)"><input type="number" min="0" step="0.001" value={form.peso} onChange={(e) => set("peso", e.target.value)} /></Cv2Field>
          </div>
          <div className="cv2-price-box">
            <div className="cv2-stops-head"><div><b>Referência de preço do ERP</b><small>Consulta CT-es, viagens e custos fiscais da mesma rota. Não bloqueia o valor negociado.</small></div><button type="button" className="btn" disabled={calculating || !form.origem || !form.destino} onClick={calculatePrice}>{calculating ? "Consultando ERP..." : "Consultar histórico"}</button></div>
            {pricing && <div className="cv2-price-results"><div><span>Operações no ERP</span><b>{pricing.historico.quantidade} frete(s)</b><small>{pricing.historico.ultimaData ? `Último em ${cv2Date(pricing.historico.ultimaData)}` : "Sem histórico exato"}</small></div><div><span>Receita média</span><b>{pricing.historico.quantidade ? cv2Money(pricing.historico.media) : "—"}</b><small>CT-es emitidos na rota</small></div><div><span>Custo médio real</span><b>{pricing.suficienteParaCusto ? cv2Money(pricing.custoEstimado) : "—"}</b><small>Custos vinculados às viagens no ERP</small></div><div className={pricing.margemEstimada < 0 ? "negative" : "positive"}><span>Preço recomendado</span><b>{pricing.suficienteParaCusto ? cv2Money(pricing.precoSugerido) : "Sem base suficiente"}</b><small>{pricing.suficienteParaCusto ? `Margem neste valor: ${Number(pricing.margemEstimada || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% · confiança ${pricing.confianca}` : "Não foi encontrado histórico confiável desta rota"}</small></div></div>}
          </div>
          <div className="cv2-stops-head"><div><b>Paradas adicionais</b><small>Opcional: coletas ou entregas intermediárias.</small></div><button type="button" className="btn" onClick={addStop}>+ Adicionar parada</button></div>
          {form.paradas.map((stop, index) => <div className="cv2-stop" key={index}>
            <select value={stop.tipo} onChange={(e) => editStop(index, "tipo", e.target.value)}><option value="coleta">Coleta</option><option value="entrega">Entrega</option></select>
            <input value={stop.cidade} onChange={(e) => editStop(index, "cidade", e.target.value)} placeholder="Cidade" />
            <input className="uf" maxLength="2" value={stop.uf} onChange={(e) => editStop(index, "uf", e.target.value.toUpperCase())} placeholder="UF" />
            <input value={stop.cliente} onChange={(e) => editStop(index, "cliente", e.target.value)} placeholder="Cliente/local" />
            <input value={stop.endereco} onChange={(e) => editStop(index, "endereco", e.target.value)} placeholder="Endereço" />
            <input value={stop.nf} onChange={(e) => editStop(index, "nf", e.target.value)} placeholder="Nota fiscal" />
            <button type="button" className="cv2-icon-btn" onClick={() => removeStop(index)}>×</button>
          </div>)}
          <Cv2Field label="Observações"><textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows="3" placeholder="Instruções comerciais ou detalhes da operação" /></Cv2Field>
        </div>
        <footer className="cv2-modal-actions"><button type="button" className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={saving}>{saving ? "Salvando..." : initial?.id ? "Salvar alterações" : "Cadastrar carga"}</button></footer>
      </form>
    </Cv2Modal>
  );
}

function Cv2ViagemForm({ initial, initialCargaId, cargas, onClose, onSaved, onCreateCarga }) {
  const [form, setForm] = useState(() => initial
    ? { ...emptyViagem(), ...initial, cargaIds: (initial.cargas || []).map((carga) => carga.id), docs: { ...emptyViagem().docs, ...(initial.docs || {}) } }
    : { ...emptyViagem(), cargaIds: initialCargaId ? [initialCargaId] : [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const isFrota = String(form.tipoPropriedade).toUpperCase() === "FROTA";
  const chooseVehicle = (item) => setForm((current) => ({ ...current, placa: item.placa, tipoPropriedade: item.ownershipType,
    motorista: item.motorista || current.motorista, numeroMotorista: item.numeroMotorista || "", cnh: item.cnh || "",
    antt: item.antt || "", contaDeposito: item.contaDeposito || "", chavePix: item.chavePix || "", valorMotorista: item.ownershipType === "FROTA" ? "" : current.valorMotorista }));
  const chooseDriver = (item) => setForm((current) => ({ ...current, motorista: item.nome, numeroMotorista: item.numeroMotorista || "",
    cnh: item.cnh || "", antt: item.antt || current.antt, contaDeposito: item.contaDeposito || "", chavePix: item.chavePix || "" }));
  const toggleCarga = (id) => set("cargaIds", form.cargaIds.includes(id) ? form.cargaIds.filter((item) => item !== id) : [...form.cargaIds, id]);
  const save = async (event) => {
    event.preventDefault(); setError(""); setSaving(true);
    try { onSaved(initial?.id ? await window.RB_API.updateViagemV2(initial.id, form) : await window.RB_API.createViagemV2(form)); }
    catch (err) { setError(cv2Error(err)); }
    finally { setSaving(false); }
  };
  return <Cv2Modal title={initial?.id ? `Editar viagem ${initial.numero}` : "Programar veículo"} subtitle={initial?.id ? "Atualize os dados operacionais e organize as cargas desta viagem." : "Escolha o veículo e vincule uma ou mais cargas disponíveis."} onClose={onClose} wide>
    <form onSubmit={save}>
      <div className="cv2-modal-body">
        {error && <div className="cv2-alert error">{error}</div>}
        <div className="cv2-section-title"><span>1</span><div><b>Viagem e veículo</b><small>O identificador é criado automaticamente se ficar em branco.</small></div></div>
        <div className="cv2-grid four">
          <Cv2Field label="Identificador da viagem"><input value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="Automático: V-ANO-NÚMERO" /></Cv2Field>
          <Cv2Field label="Data" required><input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} required /></Cv2Field>
          <Cv2Autocomplete label="Placa do veículo" required value={form.placa} onChange={(value) => set("placa", value.toUpperCase())}
            search={window.RB_API.searchViagemPlacas} onSelect={chooseVehicle} placeholder="Digite a placa"
            renderOption={(item) => <div className="cv2-vehicle-option"><strong>{item.placa}</strong><span>{item.ownershipType === "FROTA" ? "FROTA" : "TERCEIRO"}</span><em>{item.motorista || item.veiculo || "Sem motorista vinculado"}</em></div>} />
          <Cv2Field label="KM previsto"><input type="number" min="0" step="0.1" value={form.km} onChange={(e) => set("km", e.target.value)} /></Cv2Field>
        </div>
        {form.tipoPropriedade && <div className={`cv2-alert ${isFrota ? "success" : "info"}`}><b>Veículo {isFrota ? "de frota" : "terceiro"}.</b> {isFrota ? "Motorista contratado: valor do motorista não é necessário." : "Informe os dados e o valor do motorista."}</div>}
        <div className="cv2-section-title"><span>2</span><div><b>Motorista, ANTT e pagamento</b><small>Ao escolher a placa, os dados cadastrados são preenchidos automaticamente.</small></div></div>
        <div className="cv2-grid three">
          <Cv2Autocomplete label="Motorista" required={!isFrota} value={form.motorista} onChange={(value) => set("motorista", value)}
            search={window.RB_API.searchViagemMotoristas} onSelect={chooseDriver} placeholder="Nome do motorista"
            renderOption={(item) => <><strong>{item.nome}</strong><span>{[item.cnh && `CNH ${item.cnh}`, item.numeroMotorista].filter(Boolean).join(" · ")}</span></>} />
          <Cv2Field label="Celular / número"><input value={form.numeroMotorista} onChange={(e) => set("numeroMotorista", e.target.value)} /></Cv2Field>
          <Cv2Field label="CNH"><input value={form.cnh} onChange={(e) => set("cnh", e.target.value)} /></Cv2Field>
          <Cv2Field label="ANTT / RNTRC"><input value={form.antt} onChange={(e) => set("antt", e.target.value)} /></Cv2Field>
          <Cv2Field label="Conta para depósito"><input value={form.contaDeposito} onChange={(e) => set("contaDeposito", e.target.value)} /></Cv2Field>
          <Cv2Field label="Chave Pix"><input value={form.chavePix} onChange={(e) => set("chavePix", e.target.value)} /></Cv2Field>
          {!isFrota && <Cv2Field label="Valor do motorista (R$)" required><input type="number" min="0" step="0.01" value={form.valorMotorista} onChange={(e) => set("valorMotorista", e.target.value)} required /></Cv2Field>}
          <Cv2Field label="Link da rota no Google Maps"><input value={form.rotaMapsUrl} onChange={(e) => set("rotaMapsUrl", e.target.value)} /></Cv2Field>
        </div>
        <div className="cv2-section-title cv2-section-title-action"><span>3</span><div><b>Cargas desta viagem</b><small>Selecione todas as cargas que irão no mesmo veículo.</small></div>{initial?.id && <button type="button" className="btn" onClick={() => onCreateCarga(initial)}>+ Cadastrar carga nesta viagem</button>}</div>
        <div className="cv2-load-picker">
          {!cargas.length && <div className="cv2-empty small"><b>Nenhuma carga aguardando veículo.</b><span>Cadastre uma carga antes de programar a viagem.</span></div>}
          {cargas.map((carga) => <label key={carga.id} className={form.cargaIds.includes(carga.id) ? "selected" : ""}>
            <input type="checkbox" checked={form.cargaIds.includes(carga.id)} onChange={() => toggleCarga(carga.id)} />
            <div><strong>{carga.codigo} · {carga.cliente}</strong><span>{carga.origem}/{carga.ufOrigem} → {carga.destino}/{carga.ufDestino}</span></div>
            <em>{cv2Weight(carga.peso)} · {cv2Money(carga.valorCliente)}</em>
          </label>)}
        </div>
        <details className="cv2-details"><summary>Controle de documentos recebidos</summary><div className="cv2-checks">
          {[['placas','Placas do veículo'],['antt','ANTT / RNTRC'],['cnh','CNH do motorista'],['consultaMotorista','Consulta do motorista'],['contaDeposito','Conta depósito'],['chavePix','Chave Pix'],['comprovanteResidencia','Comprovante de residência'],['numeroMotorista','Número do motorista']].map(([key,label]) =>
            <label key={key}><input type="checkbox" checked={Boolean(form.docs[key])} onChange={(e) => set("docs", { ...form.docs, [key]: e.target.checked })} />{label}</label>)}
        </div></details>
        <Cv2Field label="Observações"><textarea rows="3" value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} /></Cv2Field>
      </div>
      <footer className="cv2-modal-actions"><span>{form.cargaIds.length} carga(s) selecionada(s)</span><div><button type="button" className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={saving || !form.cargaIds.length}>{saving ? "Salvando..." : initial?.id ? "Salvar alterações" : "Criar viagem"}</button></div></footer>
    </form>
  </Cv2Modal>;
}

function Cv2CteModal({ carga, onClose, onSaved }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [documents, setDocuments] = useState(carga.documentos || []);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const search = async () => {
    setLoading(true); setError("");
    try { setResults(await window.RB_API.searchViagemDocumentos(query)); }
    catch (err) { setError(cv2Error(err)); }
    finally { setLoading(false); }
  };
  const select = (item) => {
    const next = [{ tipo: "CT-e", numero: item.numero, chave: item.chave, observacoes: item.observacoes }];
    (item.notasDocumentos || []).forEach((nota) => next.push({ tipo: "NF-e", numero: String(nota.numero || ""), chave: nota.chave || "", observacoes: `Vinculada ao CT-e ${item.numero}` }));
    setDocuments(next); setResults([]);
  };
  const save = async () => {
    setSaving(true); setError("");
    try { onSaved(await window.RB_API.saveCargaDocumentosV2(carga.id, documents)); }
    catch (err) { setError(cv2Error(err)); }
    finally { setSaving(false); }
  };
  return <Cv2Modal title={`Vincular CT-e · ${carga.codigo}`} subtitle={`${carga.cliente} · ${carga.origem}/${carga.ufOrigem} → ${carga.destino}/${carga.ufDestino}`} onClose={onClose}>
    <div className="cv2-modal-body">
      {error && <div className="cv2-alert error">{error}</div>}
      <Cv2Field label="Número do CT-e no ERP" hint="A nota fiscal vinculada ao CT-e também será adicionada.">
        <div className="cv2-search-row"><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} placeholder="Ex.: 4030" /><button type="button" className="btn" onClick={search} disabled={loading}>{loading ? "Buscando..." : "Pesquisar"}</button></div>
      </Cv2Field>
      {results.map((item) => <button type="button" className="cv2-cte-result" key={`${item.serie}-${item.numero}`} onClick={() => select(item)}>
        <div><strong>CT-e {item.numero}</strong><span>{item.cliente}</span></div><div><span>{item.placa || "Sem placa"}</span><b>{(item.notas || []).length} NF-e</b></div>
      </button>)}
      <div className="cv2-doc-list"><b>Documentos que serão vinculados</b>
        {!documents.length && <span>Nenhum documento selecionado.</span>}
        {documents.map((doc, index) => <div key={`${doc.tipo}-${doc.numero}-${index}`}><span className="cv2-doc-type">{doc.tipo}</span><strong>{doc.numero || "Sem número"}</strong><small>{doc.chave ? `Chave ${doc.chave}` : doc.observacoes}</small><button type="button" onClick={() => setDocuments(documents.filter((_, i) => i !== index))}>×</button></div>)}
      </div>
    </div>
    <footer className="cv2-modal-actions"><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="button" className="btn primary" onClick={save} disabled={saving || !documents.length}>{saving ? "Salvando..." : "Vincular documentos"}</button></footer>
  </Cv2Modal>;
}

function Cv2DeleteModal({ type, item, onClose, onDeleted }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isTrip = type === "viagem";
  const remove = async () => {
    setSaving(true); setError("");
    try {
      if (isTrip) await window.RB_API.deleteViagemV2(item.id);
      else await window.RB_API.deleteCargaV2(item.id);
      onDeleted();
    } catch (err) { setError(cv2Error(err)); }
    finally { setSaving(false); }
  };
  return <Cv2Modal title={`Excluir ${isTrip ? "viagem" : "carga"}`} subtitle={isTrip ? item.numero : item.codigo} onClose={onClose}>
    <div className="cv2-modal-body">
      {error && <div className="cv2-alert error">{error}</div>}
      <div className="cv2-delete-message"><b>Tem certeza que deseja excluir?</b>
        <p>{isTrip
          ? "As cargas vinculadas voltarão para Somente carga e poderão ser programadas novamente."
          : "A carga e seus documentos serão removidos desta nova tela. Cargas vinculadas precisam ter a viagem excluída primeiro."}</p>
      </div>
    </div>
    <footer className="cv2-modal-actions"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn danger" onClick={remove} disabled={saving}>{saving ? "Excluindo..." : "Sim, excluir"}</button></footer>
  </Cv2Modal>;
}

const cv2Escape = (value) => String(value ?? "—").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const cv2Route = (item) => `${[item.origem, item.ufOrigem].filter(Boolean).join("/") || "—"} → ${[item.destino, item.ufDestino].filter(Boolean).join("/") || "—"}`;
const cv2PrintCell = (label, value) => `<div class="cell"><span>${cv2Escape(label)}</span><b>${cv2Escape(value || "—")}</b></div>`;

function cv2OpenPrint({ title, code, route, metrics = [], sections = [], rows = [], notes = "" }) {
  const popup = window.open("", "_blank", "width=980,height=760");
  if (!popup) {
    window.alert("O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.");
    return;
  }
  const metricHtml = metrics.map((item) => cv2PrintCell(item.label, item.value)).join("");
  const sectionHtml = sections.map((section) => `<section><h2>${cv2Escape(section.title)}</h2><div class="data-grid">${section.items.map((item) => cv2PrintCell(item.label, item.value)).join("")}</div></section>`).join("");
  const tableHtml = rows.length ? `<section><h2>Cargas vinculadas</h2><table><thead><tr><th>Carga</th><th>Cliente / entrega</th><th>Rota</th><th>Peso</th><th>Valor</th></tr></thead><tbody>${rows.map((carga) => `<tr><td><b>${cv2Escape(carga.codigo)}</b></td><td>${cv2Escape(carga.cliente)}<small>${cv2Escape(carga.clienteFinal)}</small></td><td>${cv2Escape(cv2Route(carga))}</td><td>${cv2Escape(cv2Weight(carga.peso))}</td><td>${cv2Escape(cv2Money(carga.valorCliente))}</td></tr>`).join("")}</tbody></table></section>` : "";
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${cv2Escape(title)}</title><style>
    *{box-sizing:border-box}body{margin:0;background:#eef1f5;color:#111827;font:11px Arial,sans-serif}.toolbar{position:sticky;top:0;display:flex;justify-content:flex-end;gap:8px;padding:10px 18px;background:#111827}.toolbar button{border:0;border-radius:5px;padding:9px 14px;cursor:pointer}.toolbar .primary{background:#1e3a8a;color:white}.sheet{width:190mm;min-height:270mm;margin:18px auto;background:#fff;border:1px solid #d1d5db}.head{display:flex;align-items:stretch;border-bottom:2px solid #111827}.brand{display:flex;align-items:center;gap:12px;flex:1;padding:11px 14px}.logo{display:grid;place-items:center;width:44px;height:44px;border-radius:4px;background:#1e3a8a;color:#fff;font-size:9px;font-weight:900;line-height:1.15;text-align:center}.eyebrow,.cell span{display:block;color:#6b7280;font-size:8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}.route{margin-top:3px;font-size:14px;font-weight:700}.code{display:grid;place-items:center;min-width:105px;padding:10px 14px;border-left:2px solid #111827;text-align:center}.code b{display:block;margin-top:4px;font-size:13px}.metrics,.data-grid{display:grid;grid-template-columns:repeat(4,1fr)}.metrics{border-bottom:1px solid #d1d5db}.cell{min-height:50px;padding:9px 12px;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}.cell b{display:block;margin-top:4px;font-size:11.5px;line-height:1.35}.warning{padding:5px 12px;border-bottom:1px solid #d1d5db;background:#f9fafb;text-align:center;font-size:8px;font-weight:700;letter-spacing:.04em}section{padding:12px 14px 0}section h2{margin:0;padding-bottom:6px;border-bottom:1px solid #d1d5db;font-size:9px;letter-spacing:.06em;text-transform:uppercase}.data-grid{margin-top:7px}.data-grid .cell:nth-child(4n){border-right:0}table{width:100%;border-collapse:collapse;margin-top:7px}th,td{padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}th{font-size:8px;text-transform:uppercase;color:#4b5563}td small{display:block;margin-top:3px;color:#6b7280}.notes{min-height:38px;white-space:pre-wrap}.sign{display:grid;grid-template-columns:1fr 1fr;gap:55px;margin:55px 22px 20px}.sign div{padding-top:6px;border-top:1px solid #4b5563;text-align:center;font-size:9px}
    @page{size:A4 portrait;margin:8mm}@media print{body{background:#fff}.toolbar{display:none}.sheet{width:100%;min-height:0;margin:0;border:0}section{break-inside:avoid}}
  </style></head><body><div class="toolbar"><button onclick="window.close()">Fechar</button><button class="primary" onclick="window.print()">Imprimir</button></div><main class="sheet"><header class="head"><div class="brand"><div class="logo">RODO<br>BACH</div><div><span class="eyebrow">${cv2Escape(title)}</span><div class="route">${cv2Escape(route)}</div></div></div><div class="code"><span class="eyebrow">NÚMERO</span><b>${cv2Escape(code)}</b></div></header><div class="metrics">${metricHtml}</div><div class="warning">TODA DOCUMENTAÇÃO DEVE SER LEGÍVEL · CONFERIR ANTES DE ENCAMINHAR PARA FATURAMENTO</div>${sectionHtml}${tableHtml}${notes ? `<section><h2>Observações</h2><p class="notes">${cv2Escape(notes)}</p></section>` : ""}<div class="sign"><div>Responsável pela programação</div><div>Motorista</div></div></main></body></html>`);
  popup.document.close();
}

function cv2PrintLoad(carga) {
  cv2OpenPrint({
    title: "Folha da carga", code: carga.codigo, route: cv2Route(carga), notes: carga.observacoes,
    metrics: [
      { label: "Data", value: cv2Date(carga.data) }, { label: "Valor da carga", value: cv2Money(carga.valorCliente) },
      { label: "Peso", value: cv2Weight(carga.peso) }, { label: "Valor por tonelada", value: `${cv2Money(carga.valorTon)}/ton` },
    ],
    sections: [{ title: "Dados comerciais e operacionais", items: [
      { label: "Cliente inicial", value: carga.cliente }, { label: "Cliente de entrega", value: carga.clienteFinal },
      { label: "Tomador do serviço", value: carga.tomadorServico }, { label: "Vendedor", value: carga.vendedor },
      { label: "Material", value: carga.material }, { label: "Condição de pagamento", value: carga.condicaoPagamento },
      { label: "Viagem", value: carga.numeroViagem }, { label: "Placa / motorista", value: [carga.placa, carga.motorista].filter(Boolean).join(" · ") },
      { label: "Paradas / entregas", value: String(carga.paradas?.length || 0) }, { label: "Documentos", value: (carga.documentos || []).map((doc) => `${doc.tipo} ${doc.numero}`).join(", ") },
    ]}],
  });
}

function cv2PrintTrip(viagem) {
  const cargas = viagem.cargas || [];
  cv2OpenPrint({
    title: "Romaneio de viagem", code: viagem.numero, route: cargas.length ? cv2Route(cargas[0]) : "Rota não definida", rows: cargas, notes: viagem.observacoes,
    metrics: [
      { label: "Data", value: cv2Date(viagem.data) }, { label: "Valor das cargas", value: cv2Money(cargas.reduce((sum, carga) => sum + carga.valorCliente, 0)) },
      { label: "Peso total", value: cv2Weight(cargas.reduce((sum, carga) => sum + carga.peso, 0)) }, { label: "KM da viagem", value: viagem.km ? `${Number(viagem.km).toLocaleString("pt-BR")} km` : "—" },
    ],
    sections: [{ title: "Motorista e pagamento", items: [
      { label: "Motorista", value: viagem.motorista }, { label: "Placa do veículo", value: viagem.placa },
      { label: "Celular", value: viagem.numeroMotorista }, { label: "CNH", value: viagem.cnh },
      { label: "ANTT / RNTRC", value: viagem.antt }, { label: "Valor motorista", value: cv2Money(viagem.valorMotorista) },
      { label: "Conta depósito", value: viagem.contaDeposito }, { label: "Chave PIX", value: viagem.chavePix },
    ]}],
  });
}

function Cv2TripDetails({ viagem, onClose }) {
  return <Cv2Modal title={`Viagem ${viagem.numero}`} subtitle={`${cv2Date(viagem.data)} · ${viagem.placa || "Sem placa"}`} onClose={onClose} wide>
    <div className="cv2-modal-body">
      <div className="cv2-detail-grid"><div><span>Operação</span><Cv2Status value={viagem.situacao} vehicleLinked={Boolean(viagem.placa)} /></div><div><span>Financeiro</span><Cv2FinancialStatus value={viagem.financeiro} /></div><div><span>Motorista</span><b>{viagem.motorista || "—"}</b></div><div><span>KM previsto</span><b>{viagem.km ?? "—"}</b></div><div><span>ANTT / RNTRC</span><b>{viagem.antt || "—"}</b></div><div><span>Celular / CNH</span><b>{[viagem.numeroMotorista, viagem.cnh].filter(Boolean).join(" · ") || "—"}</b></div></div>
      <Cv2TripBilling financeiro={viagem.financeiro} />
      <h3 className="cv2-subtitle">Cargas vinculadas</h3>
      <div className="cv2-linked-loads">{viagem.cargas.map((carga) => <div key={carga.id}><div><strong>{carga.codigo} · {carga.cliente}</strong><span>{carga.origem}/{carga.ufOrigem} → {carga.destino}/{carga.ufDestino}</span></div><div className="cv2-linked-statuses"><Cv2Status value={carga.status} /><Cv2FinancialStatus value={carga.financeiro} /><button className="btn" onClick={() => cv2PrintLoad(carga)}><Icon name="file" size={13} /> Imprimir carga</button></div></div>)}</div>
    </div>
    <footer className="cv2-modal-actions"><button className="btn" onClick={onClose}>Fechar</button><button className="btn primary" onClick={() => cv2PrintTrip(viagem)}>Imprimir folha da viagem</button></footer>
  </Cv2Modal>;
}

function Cv2Pagination({ page, pageSize, total, totalPages, onPage, onPageSize }) {
  if (!total) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const pages = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, Math.max(5, page + 2));
  for (let value = start; value <= end; value += 1) pages.push(value);
  return <div className="cv2-pagination">
    <div className="cv2-page-summary">Exibindo <b>{first}–{last}</b> de <b>{total.toLocaleString("pt-BR")}</b> registros</div>
    <label>Registros por página<select value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))}>
      <option value="25">25</option><option value="50">50</option><option value="100">100</option>
    </select></label>
    <nav aria-label="Paginação">
      <button disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">‹</button>
      {start > 1 && <><button onClick={() => onPage(1)}>1</button>{start > 2 && <span>…</span>}</>}
      {pages.map((value) => <button key={value} className={value === page ? "active" : ""} onClick={() => onPage(value)}>{value}</button>)}
      {end < totalPages && <>{end < totalPages - 1 && <span>…</span>}<button onClick={() => onPage(totalPages)}>{totalPages}</button></>}
      <button disabled={page === totalPages} onClick={() => onPage(page + 1)} aria-label="Próxima página">›</button>
    </nav>
  </div>;
}

const Cv2Styles = () => <style>{`
  .cv2{width:100%;height:100%;min-height:0;max-width:1680px;margin:0 auto;padding:4px 10px 40px 2px;color:var(--text);overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable}
  .cv2 *{box-sizing:border-box}.cv2-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:14px;padding:17px 20px;border:1px solid var(--border);border-radius:16px;background:linear-gradient(135deg,var(--surface),var(--surface-2));box-shadow:0 8px 30px rgba(0,0,0,.08)}.cv2-head h1{margin:3px 0 0;font-size:27px;letter-spacing:-.03em}.cv2-head p{margin:6px 0 0;color:var(--muted);font-size:13px}.cv2-eyebrow{color:var(--accent);font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}.cv2-head-actions,.cv2-actions{display:flex;gap:9px}
  .cv2 .btn{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:8px;padding:9px 13px;cursor:pointer;font:inherit}.cv2 .btn:hover{border-color:var(--accent-border);background:var(--hover)}.cv2 .btn.primary{background:var(--brand-navy);border-color:var(--brand-navy-2);color:#fff}.cv2 .btn.danger{background:var(--crit-bg);border-color:var(--crit-border);color:var(--crit)}.cv2 .btn:disabled{opacity:.5;cursor:not-allowed}
  .cv2-flow{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--border);border-radius:12px;background:var(--surface);overflow:hidden;margin-bottom:14px}.cv2-flow>div{padding:12px 15px;display:flex;gap:10px;align-items:center;border-right:1px solid var(--border)}.cv2-flow>div:last-child{border:0}.cv2-flow b{display:block;font-size:12px}.cv2-flow small{display:block;color:var(--muted);margin-top:2px}.cv2-flow i,.cv2-section-title>span{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent);font-style:normal;font-weight:700;flex:none}
  .cv2-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin-bottom:14px}.cv2-kpi{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:10px;padding:12px 14px;text-align:left;font:inherit;cursor:pointer}.cv2-kpi:hover{border-color:var(--accent-border);background:var(--hover);transform:translateY(-1px)}.cv2-kpi span{color:var(--muted);font-size:12px}.cv2-kpi b{display:block;font-size:23px;margin-top:7px}.cv2-tabbar{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)}.cv2-tabs{display:flex;gap:4px}.cv2-tabs button{border:0;background:none;color:var(--muted);padding:12px 16px;cursor:pointer;border-bottom:2px solid transparent}.cv2-tabs button.active{color:var(--text);border-color:var(--accent)}.cv2-tabs small{margin-left:6px;background:var(--neutral-bg);color:var(--neutral-text);border-radius:10px;padding:2px 6px}.cv2-tab-actions{display:flex;gap:8px;padding-bottom:7px}
  .cv2-seller-bar{display:flex;align-items:center;gap:13px;margin-top:12px;padding:10px 12px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2)}.cv2-seller-bar label{display:flex;align-items:center;gap:9px}.cv2-seller-bar label span{font-size:11px;font-weight:600;white-space:nowrap}.cv2-seller-bar select{width:220px;padding:7px 30px 7px 9px}.cv2-seller-bar small{color:var(--muted);font-size:10.5px}.cv2-toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0 14px}.cv2-search{position:relative;max-width:520px;flex:1}.cv2-search input{width:100%;padding-left:36px}.cv2-search svg{position:absolute;left:12px;top:11px;color:var(--muted)}.cv2-filters{display:flex;gap:6px;flex-wrap:wrap}.cv2-filters button{border:1px solid var(--border);background:var(--surface);color:var(--muted);padding:7px 10px;border-radius:7px;cursor:pointer}.cv2-filters button.active{background:var(--accent-soft);border-color:var(--accent-border);color:var(--accent)}.cv2-advanced-filters{border:1px solid var(--border);background:var(--surface);border-radius:10px;padding:13px;margin-bottom:14px}.cv2-advanced-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px}.cv2-advanced-head b{font-size:12px}.cv2-advanced-head button{border:0;background:none;color:var(--accent);cursor:pointer;font-size:11px}.cv2-filter-grid{display:grid;grid-template-columns:1.3fr 1.2fr 80px 1.2fr 80px 1.2fr;gap:9px}.cv2-filter-grid label span{display:block;color:var(--muted);font-size:10px;margin-bottom:5px}
  .cv2-table-wrap{border:1px solid var(--border);border-radius:11px;overflow:auto;background:var(--surface)}.cv2-table{width:100%;border-collapse:collapse;min-width:1360px;table-layout:auto}.cv2-table th{position:sticky;top:0;z-index:2;background:var(--surface);color:var(--muted);font-size:10.5px;font-weight:600;letter-spacing:.02em;text-align:left;padding:13px 14px;border-bottom:1px solid var(--border);white-space:nowrap}.cv2-table td{padding:13px 14px;border-bottom:1px solid var(--border);font-size:12px;line-height:1.35;vertical-align:middle}.cv2-table tr:last-child td{border:0}.cv2-table tr:hover td{background:var(--hover)}.cv2-table strong{display:block;color:var(--text);overflow-wrap:anywhere}.cv2-table small{display:block;color:var(--muted);margin-top:4px;line-height:1.35}.cv2-route{max-width:260px}.cv2-route span{color:var(--muted)}.cv2-client-cell{min-width:210px}.cv2-client-line{display:flex!important;gap:5px;align-items:baseline;margin-top:4px!important}.cv2-client-line b{color:var(--muted);font-size:9px;letter-spacing:.04em;text-transform:uppercase;min-width:48px}.cv2-client-line span{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:190px}.cv2-plate{display:inline-block!important;border:1px solid #35445d;border-radius:5px;padding:4px 7px;background:#171b22;color:#fff!important;letter-spacing:.7px}.cv2-row-actions{display:flex;justify-content:flex-end;align-items:center;gap:6px;min-width:max-content}.cv2-row-actions .btn{padding:7px 10px;white-space:nowrap}.cv2-row-actions .cv2-icon-btn{width:32px;height:32px;font-size:16px;color:var(--crit)}
  .cv2-status-stack{display:flex;flex-direction:column;align-items:flex-start;min-width:max-content}.cv2-status-stack>.cv2-status+.cv2-status{margin-top:5px}.cv2-status-stack>small{margin:5px 0 0 2px;font-size:9.5px}.cv2-status{display:inline-flex!important;align-items:center;gap:6px;border:1px solid var(--border);border-radius:14px;padding:5px 8px;font-size:11px;white-space:nowrap}.cv2-status i{width:6px;height:6px;border-radius:50%;background:var(--neutral-text)}.cv2-status.linked{color:#a78bfa;border-color:rgba(167,139,250,.35);background:rgba(139,92,246,.10)}.cv2-status.linked i{background:#a78bfa}.cv2-status.warning,.cv2-status.open{color:var(--warn);border-color:var(--warn-border);background:var(--warn-bg)}.cv2-status.warning i,.cv2-status.open i{background:var(--warn)}.cv2-status.info,.cv2-status.blue{color:var(--info);border-color:var(--info-border);background:var(--info-bg)}.cv2-status.info i,.cv2-status.blue i{background:var(--info)}.cv2-status.delivered{color:#2dd4bf;border-color:rgba(45,212,191,.35);background:rgba(20,184,166,.10)}.cv2-status.delivered i{background:#2dd4bf}.cv2-status.paid{color:var(--ok);border-color:var(--ok-border);background:var(--ok-bg)}.cv2-status.paid i{background:var(--ok)}.cv2-status.partial{color:#c084fc;border-color:rgba(192,132,252,.35);background:rgba(168,85,247,.10)}.cv2-status.partial i{background:#c084fc}.cv2-status.danger{color:var(--crit);border-color:var(--crit-border);background:var(--crit-bg)}.cv2-status.danger i{background:var(--crit)}
  .cv2-approval-badge{display:inline-block;border:1px solid var(--neutral-border);background:var(--neutral-bg);color:var(--neutral-text);border-radius:14px;padding:5px 9px;font-size:10.5px;white-space:nowrap}.cv2-approval-badge.success{color:var(--ok);border-color:var(--ok-border);background:var(--ok-bg)}.cv2-approval-badge.warning{color:var(--warn);border-color:var(--warn-border);background:var(--warn-bg)}.cv2-approval-badge.danger{color:var(--crit);border-color:var(--crit-border);background:var(--crit-bg)}.cv2-approval>small{display:block;color:var(--muted);margin-top:5px}.cv2-approval-action.approve{color:var(--ok)}.cv2-approval-action.correct{color:var(--warn)}
  .cv2-empty{padding:60px 20px;text-align:center;color:var(--muted)}.cv2-empty b,.cv2-empty span{display:block}.cv2-empty span{margin-top:7px}.cv2-empty.small{padding:28px}.cv2-note{font-size:12px;color:var(--muted);margin-top:10px}.cv2-pagination{display:flex;align-items:center;gap:18px;padding:16px 2px;color:var(--muted);font-size:11.5px}.cv2-page-summary{margin-right:auto}.cv2-page-summary b{color:var(--text)}.cv2-pagination>label{display:flex;align-items:center;gap:8px;white-space:nowrap}.cv2-pagination select{width:auto;padding:7px 28px 7px 9px}.cv2-pagination nav{display:flex;align-items:center;gap:4px}.cv2-pagination nav button{min-width:32px;height:32px;padding:0 8px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--muted);cursor:pointer}.cv2-pagination nav button:hover:not(:disabled){border-color:#5270ae;color:var(--text)}.cv2-pagination nav button.active{background:#1a2d5a;border-color:#4164ad;color:#fff}.cv2-pagination nav button:disabled{opacity:.35;cursor:not-allowed}.cv2-pagination nav span{padding:0 3px}
  .cv2-overlay{position:fixed;inset:0;background:rgba(9,9,11,.58);z-index:1000;display:grid;place-items:center;padding:24px;backdrop-filter:blur(2px)}.cv2-modal{width:min(680px,calc(100vw - 48px));max-height:94vh;background:var(--surface);color:var(--text);border:1px solid var(--border-strong);border-radius:13px;box-shadow:var(--shadow-lg);overflow:hidden;display:flex;flex-direction:column}.cv2-modal.wide{width:min(1120px,calc(100vw - 48px))}.cv2-modal>header{display:flex;justify-content:space-between;gap:15px;padding:20px 22px;background:var(--surface);border-bottom:1px solid var(--border)}.cv2-modal h2{color:var(--text);font-size:18px;line-height:1.3;margin:0}.cv2-modal header p{font-size:12px;line-height:1.5;color:var(--muted);margin:5px 0 0}.cv2-icon-btn{width:34px;height:34px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--muted);font-size:20px;cursor:pointer}.cv2-icon-btn:hover{background:var(--hover);color:var(--text)}.cv2-modal form{display:flex;flex-direction:column;min-height:0}.cv2-modal-body{padding:22px;background:var(--surface);overflow-y:auto;overflow-x:hidden}.cv2-modal-actions{border-top:1px solid var(--border);padding:14px 22px;display:flex;align-items:center;justify-content:flex-end;gap:9px;background:var(--surface-2)}.cv2-modal-actions>span{margin-right:auto;color:var(--muted);font-size:12px}.cv2-modal-actions>div{display:flex;gap:8px}
  .cv2-section-title{display:flex;align-items:center;gap:10px;margin:4px 0 14px}.cv2-section-title:not(:first-of-type){margin-top:25px}.cv2-section-title b,.cv2-section-title small{display:block}.cv2-section-title small{font-size:11px;color:var(--muted);margin-top:3px}.cv2-grid{display:grid;gap:13px}.cv2-grid.four{grid-template-columns:repeat(4,1fr)}.cv2-grid.three{grid-template-columns:repeat(3,1fr)}.cv2-field{display:block;min-width:0}.cv2-field>span{display:block;color:var(--muted);font-size:11px;margin:0 0 6px}.cv2-field>span b{color:#ff8d8d}.cv2-field small{display:block;color:var(--muted);font-size:10.5px;margin-top:5px}.cv2 input,.cv2 select,.cv2 textarea{width:100%;border:1px solid var(--border);background:var(--bg);color:var(--text);border-radius:7px;padding:10px 11px;outline:none;font:inherit;font-size:12.5px}.cv2 input:focus,.cv2 select:focus,.cv2 textarea:focus{border-color:#729ce9;box-shadow:0 0 0 2px rgba(81,127,215,.16)}.cv2 textarea{resize:vertical}
  .cv2-autocomplete{position:relative}.cv2-suggestions{position:absolute;z-index:20;left:0;top:calc(100% + 5px);width:100%;min-width:min(360px,calc(100vw - 70px));max-height:245px;overflow:auto;background:var(--surface);border:1px solid var(--border-strong);border-radius:9px;padding:5px;box-shadow:var(--shadow-lg)}.cv2-suggestions button{display:flex;flex-direction:column;align-items:flex-start;width:100%;border:0;background:transparent;color:var(--text);border-radius:6px;padding:10px;text-align:left;cursor:pointer}.cv2-suggestions button:hover{background:var(--hover)}.cv2-suggestions strong{font-size:12.5px}.cv2-suggestions span{font-size:10.5px;color:var(--accent);margin-top:4px}.cv2-suggestion-empty{padding:12px;color:var(--muted);font-size:12px}.cv2-vehicle-option{display:grid!important;grid-template-columns:minmax(76px,auto) auto 1fr;align-items:center;gap:10px;width:100%}.cv2-vehicle-option strong{white-space:nowrap}.cv2-vehicle-option span{margin:0!important;color:var(--accent)!important;font-weight:600}.cv2-vehicle-option em{font-style:normal;color:var(--text-2);white-space:normal;overflow-wrap:anywhere}
  .cv2-alert{border:1px solid var(--info-border);background:var(--info-bg);color:var(--info);border-radius:8px;padding:11px 13px;font-size:12px;margin:14px 0}.cv2-alert.success{color:var(--ok);border-color:var(--ok-border);background:var(--ok-bg)}.cv2-alert.error{color:var(--crit);border-color:var(--crit-border);background:var(--crit-bg)}.cv2-stops-head{display:flex;justify-content:space-between;align-items:center;margin-top:22px}.cv2-stops-head b,.cv2-stops-head small{display:block}.cv2-stops-head small{color:var(--muted);font-size:11px;margin-top:3px}.cv2-stop{display:grid;grid-template-columns:110px 1fr 62px 1.2fr 1.4fr 1fr 34px;gap:7px;margin-top:9px}.cv2-stop .cv2-icon-btn{height:auto}.cv2-details{margin:16px 0;border:1px solid var(--border);border-radius:8px;padding:12px}.cv2-details summary{cursor:pointer;font-size:12px}.cv2-checks{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:13px}.cv2-checks label{font-size:11px;color:var(--muted);display:flex;gap:7px;align-items:center}.cv2-checks input{width:auto}
  .cv2-price-box{border:1px solid var(--accent-border);background:var(--accent-soft);border-radius:10px;padding:0 14px 14px;margin-top:18px}.cv2-price-box .cv2-stops-head{margin-top:14px}.cv2-price-inputs{margin-top:13px}.cv2-price-results{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:13px}.cv2-price-results>div{border:1px solid var(--border);background:var(--surface);border-radius:8px;padding:11px}.cv2-price-results span,.cv2-price-results b,.cv2-price-results small{display:block}.cv2-price-results span,.cv2-price-results small{font-size:10px;color:var(--muted)}.cv2-price-results b{margin:6px 0;font-size:14px}.cv2-price-results .negative b{color:var(--crit)}.cv2-price-results .positive b{color:var(--ok)}
  .cv2-load-picker{border:1px solid var(--border);background:var(--surface);border-radius:9px;max-height:260px;overflow:auto;padding:7px}.cv2-load-picker>label{display:grid;grid-template-columns:20px 1fr auto;gap:10px;align-items:center;padding:11px;border-radius:7px;cursor:pointer}.cv2-load-picker>label:hover,.cv2-load-picker>label.selected{background:var(--accent-soft)}.cv2-load-picker input{width:auto;accent-color:var(--accent)}.cv2-load-picker strong,.cv2-load-picker span{display:block}.cv2-load-picker span{color:var(--muted);font-size:11px;margin-top:4px}.cv2-load-picker em{font-size:11px;color:var(--muted);font-style:normal}.cv2-search-row{display:flex;gap:8px}.cv2-search-row .btn{white-space:nowrap}.cv2-cte-result{width:100%;display:flex;justify-content:space-between;text-align:left;border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:8px;padding:12px;margin-top:8px;cursor:pointer}.cv2-cte-result:hover{border-color:var(--accent-border);background:var(--hover)}.cv2-cte-result strong,.cv2-cte-result span{display:block}.cv2-cte-result span{color:var(--muted);font-size:11px;margin-top:4px}.cv2-doc-list{margin-top:22px}.cv2-doc-list>b,.cv2-doc-list>span{display:block;margin-bottom:10px}.cv2-doc-list>span{color:var(--muted);font-size:12px}.cv2-doc-list>div{display:grid;grid-template-columns:55px 100px 1fr 28px;gap:9px;align-items:center;border-top:1px solid var(--border);padding:10px 0}.cv2-doc-list small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted)}.cv2-doc-list button{border:0;background:none;color:var(--muted);cursor:pointer}.cv2-doc-type{font-size:10px;color:var(--accent)}.cv2-detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.cv2-detail-grid>div{border:1px solid var(--border);background:var(--surface-2);border-radius:8px;padding:12px}.cv2-detail-grid>div>span{display:block;color:var(--muted);font-size:10px;margin-bottom:7px}.cv2-subtitle{font-size:14px;margin:22px 0 10px}.cv2-linked-loads{border:1px solid var(--border);border-radius:8px}.cv2-linked-loads>div{padding:12px;display:flex;justify-content:space-between;align-items:center;gap:18px;border-bottom:1px solid var(--border)}.cv2-linked-loads>div:last-child{border:0}.cv2-linked-loads strong,.cv2-linked-loads span{display:block}.cv2-linked-loads span{color:var(--muted);font-size:11px;margin-top:4px}.cv2-linked-statuses{display:flex;align-items:flex-start;gap:9px}
  .cv2-delete-message{padding:5px 2px}.cv2-delete-message b{font-size:15px}.cv2-delete-message p{color:var(--muted);line-height:1.6;margin:8px 0 0}
  .cv2-billing{margin-top:18px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);overflow:hidden}.cv2-billing-head{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:14px 16px;border-bottom:1px solid var(--border)}.cv2-billing-head h3{margin:0;font-size:14px}.cv2-billing-head p{margin:4px 0 0;color:var(--muted);font-size:10.5px}.cv2-billing-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border-bottom:1px solid var(--border)}.cv2-billing-summary>div{padding:12px 14px;background:var(--surface)}.cv2-billing-summary span,.cv2-billing-summary b{display:block}.cv2-billing-summary span{color:var(--muted);font-size:10px}.cv2-billing-summary b{margin-top:6px;font-size:14px}.cv2-billing-summary b.received{color:var(--ok)}.cv2-billing-summary b.open{color:var(--warn)}.cv2-progress{height:4px;margin-top:7px;border-radius:4px;background:var(--neutral-bg);overflow:hidden}.cv2-progress i{display:block;height:100%;border-radius:inherit;background:var(--ok)}.cv2-billing-empty{padding:20px 16px}.cv2-billing-empty b,.cv2-billing-empty span{display:block}.cv2-billing-empty span{margin-top:5px;color:var(--muted);font-size:11px}.cv2-installments{overflow:auto}.cv2-installments table{width:100%;min-width:790px;border-collapse:collapse}.cv2-installments th{padding:10px 12px;color:var(--muted);font-size:9.5px;text-align:left;text-transform:uppercase;letter-spacing:.04em;background:var(--surface)}.cv2-installments td{padding:11px 12px;border-top:1px solid var(--border);font-size:11px;white-space:nowrap}.cv2-installments td strong,.cv2-installments td small{display:block}.cv2-installments td small{margin-top:3px;color:var(--muted);font-size:9.5px}.cv2-installments .cv2-status{font-size:10px;padding:4px 7px}
  .cv2-quote-filters{display:grid;grid-template-columns:90px minmax(170px,1fr) 90px minmax(170px,1fr);gap:12px;align-items:start;padding:13px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2)}.cv2-quote-loading{margin-top:10px;padding:8px 11px;border-radius:7px;background:var(--accent-soft);color:var(--accent);font-size:11px}.cv2-quote-sheet{margin-top:14px;border:1px solid var(--border);border-radius:9px;overflow:hidden}.cv2-quote-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 11px;background:var(--surface-2);border-bottom:1px solid var(--border)}.cv2-quote-sheet-head>div{display:flex;align-items:center;gap:12px}.cv2-quote-sheet-head b{font-size:12px}.cv2-quote-sheet-head span,.cv2-quote-sheet-head small{color:var(--muted);font-size:10.5px}.cv2-quote-view-actions .btn{padding:6px 9px;font-size:10.5px}.cv2-quote-view-actions details{position:relative}.cv2-quote-view-actions summary{padding:6px 9px;border:1px solid var(--border);border-radius:7px;background:var(--surface);font-size:10.5px;cursor:pointer;list-style:none}.cv2-quote-view-actions details>div{position:absolute;z-index:10;right:0;top:calc(100% + 5px);width:210px;padding:8px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface);box-shadow:var(--shadow-lg)}.cv2-quote-view-actions details label{display:flex;align-items:center;gap:8px;padding:6px;border-radius:5px;font-size:10.5px;cursor:pointer}.cv2-quote-view-actions details label:hover{background:var(--hover)}.cv2-quote-view-actions details input{width:auto}.cv2-quote-view-actions details button{width:100%;margin-top:5px;padding:7px;border:0;border-top:1px solid var(--border);background:none;color:var(--accent);font-size:10.5px;cursor:pointer}.cv2-quote-history{max-height:430px;overflow:auto}.cv2-quote-history table{width:max-content;min-width:100%;border-collapse:collapse}.cv2-quote-history th{position:sticky;top:0;z-index:2;padding:0;background:var(--surface-2);border-bottom:1px solid var(--border);text-align:left}.cv2-quote-history th[draggable=true]{cursor:grab}.cv2-quote-history th.dragging{opacity:.45}.cv2-quote-history th button{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:9px 10px;border:0;background:transparent;color:var(--muted);font:inherit;font-size:9px;font-weight:700;text-align:left;text-transform:uppercase;cursor:pointer;white-space:nowrap}.cv2-quote-history th button:hover{color:var(--accent);background:var(--hover)}.cv2-quote-history th button span{font-size:8px}.cv2-quote-history td{max-width:250px;padding:8px 10px;border-top:1px solid var(--border);font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cv2-quote-history.comfortable th button{padding:12px 14px}.cv2-quote-history.comfortable td{padding:12px 14px;font-size:11px}.cv2-quote-history tbody tr:hover td{background:var(--hover)}.cv2-quote-history td strong{display:block}
  .cv2-kpi{position:relative;overflow:hidden;border-radius:12px;padding:15px 17px}.cv2-kpi:before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:var(--accent)}.cv2-kpi span{font-size:11px}.cv2-kpi b{font-size:24px;letter-spacing:-.03em}.cv2-table-wrap{border-radius:12px;box-shadow:0 8px 25px rgba(0,0,0,.05)}.cv2-table th{background:var(--surface-2);font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}.cv2-table td{padding-top:14px;padding-bottom:14px}.cv2-row-actions .btn{display:inline-flex;align-items:center;gap:5px}.cv2-edit-btn{color:var(--accent)!important}.cv2-section-title-action>div{flex:1}.cv2-section-title-action>.btn{margin-left:auto}
  .cv2-kpi.total:before{background:var(--brand-navy-2)}.cv2-kpi.total b{color:var(--text)}.cv2-kpi.vehicle:before{background:#a78bfa}.cv2-kpi.vehicle b{color:#a78bfa}.cv2-kpi.cte:before{background:var(--warn)}.cv2-kpi.cte b{color:var(--warn)}.cv2-kpi.transit:before{background:var(--info)}.cv2-kpi.transit b{color:var(--info)}.cv2-kpi.delivered:before{background:#2dd4bf}.cv2-kpi.delivered b{color:#2dd4bf}.cv2-kpi.paid:before{background:var(--ok)}.cv2-kpi.paid b{color:var(--ok)}
  .cv2-filters button{display:inline-flex;align-items:center;gap:5px}.cv2-filters button.active.warning,.cv2-filters button.active.open{color:var(--warn);border-color:var(--warn-border);background:var(--warn-bg)}.cv2-filters button.active.info{color:var(--info);border-color:var(--info-border);background:var(--info-bg)}.cv2-filters button.active.success,.cv2-filters button.active.paid{color:var(--ok);border-color:var(--ok-border);background:var(--ok-bg)}.cv2-filters button.active.delivered{color:#2dd4bf;border-color:rgba(45,212,191,.35);background:rgba(20,184,166,.10)}.cv2-filter-divider{width:1px;background:var(--border);margin:3px 2px}.cv2-filter-toggle{margin-left:4px;color:var(--text)!important}
  .cv2-more{position:relative}.cv2-more summary{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--muted);cursor:pointer;list-style:none;font-weight:700;letter-spacing:1px}.cv2-more summary::-webkit-details-marker{display:none}.cv2-more[open] summary{border-color:var(--accent-border);background:var(--accent-soft);color:var(--accent)}.cv2-more>div{position:absolute;z-index:30;right:0;top:calc(100% + 5px);width:190px;padding:5px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface);box-shadow:var(--shadow-lg)}.cv2-more>div button{display:block;width:100%;padding:9px 10px;border:0;border-radius:6px;background:transparent;color:var(--text);font:inherit;font-size:11.5px;text-align:left;cursor:pointer}.cv2-more>div button:hover{background:var(--hover)}.cv2-more>div button.approve{color:var(--ok)}.cv2-more>div button.danger{color:var(--crit)}.cv2-more>div button:disabled{opacity:.5}.cv2-load-count{padding:0;border:0;background:none;color:var(--accent);text-align:left;cursor:pointer}.cv2-load-count strong,.cv2-load-count small{color:inherit}.cv2-load-count:hover{text-decoration:underline}
  @media(max-width:1250px){.cv2-kpis{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:1000px){.cv2-grid.four,.cv2-grid.three{grid-template-columns:repeat(2,1fr)}.cv2-kpis{grid-template-columns:repeat(2,1fr)}.cv2-flow{grid-template-columns:repeat(2,1fr)}.cv2-stop{grid-template-columns:1fr 1fr 60px}.cv2-stop>*{min-width:0}.cv2-toolbar{align-items:flex-start;flex-direction:column}.cv2-search{max-width:none;width:100%}.cv2-filter-grid{grid-template-columns:repeat(3,1fr)}.cv2-quote-filters{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:650px){.cv2-head{flex-direction:column;align-items:stretch}.cv2-head-actions{display:grid;grid-template-columns:1fr}.cv2-flow,.cv2-kpis,.cv2-grid.four,.cv2-grid.three,.cv2-detail-grid,.cv2-filter-grid,.cv2-billing-summary,.cv2-quote-filters,.cv2-quote-summary,.cv2-quote-routes>div{grid-template-columns:1fr}.cv2-billing-head,.cv2-quote-result-head,.cv2-quote-privacy,.cv2-seller-bar{align-items:flex-start;flex-direction:column}.cv2-seller-bar label{width:100%;align-items:flex-start;flex-direction:column}.cv2-seller-bar select{width:100%}.cv2-tabbar{align-items:stretch;flex-direction:column}.cv2-tab-actions .btn{width:100%}.cv2-checks{grid-template-columns:1fr 1fr}.cv2-filter-divider{display:none}.cv2-overlay{padding:0}.cv2-modal,.cv2-modal.wide{width:100%;height:100vh;max-height:none;border-radius:0}.cv2-suggestions{width:100%}.cv2-pagination{align-items:flex-start;flex-direction:column;gap:10px}.cv2-pagination nav{max-width:100%;overflow:auto}.cv2-page-summary{margin:0}.cv2-linked-loads>div{align-items:flex-start;flex-direction:column}.cv2-linked-statuses{flex-wrap:wrap}}
`}</style>;

const CargasViagensV2 = ({ user }) => {
  const [tab, setTab] = useState("cargas");
  const [cargas, setCargas] = useState([]);
  const [viagens, setViagens] = useState([]);
  const [summary, setSummary] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pageInfo, setPageInfo] = useState({ total: 0, totalPages: 1 });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("aguardando_viagem");
  const [financialStatus, setFinancialStatus] = useState("");
  const [seller, setSeller] = useState(() => cv2CommercialForUser(user));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cargaFilters, setCargaFilters] = useState(emptyCargaFilters());
  const [filterOptions, setFilterOptions] = useState({ empresas: [], origens: [], ufsOrigem: [], destinos: [], ufsDestino: [], materiais: [], vendedores: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [approvalBusy, setApprovalBusy] = useState(null);
  const load = async (refreshMeta = false) => {
    setLoading(true); setError("");
    try {
      const request = tab === "cargas"
        ? window.RB_API.listCargasV2({ q: query, status, financeiro: financialStatus, vendedor: seller, ...cargaFilters, page, pageSize })
        : window.RB_API.listViagensV2({ q: query, status, financeiro: financialStatus, vendedor: seller, page, pageSize });
      const [result, stats, options] = await Promise.all([
        request,
        refreshMeta || !Object.keys(summary).length ? window.RB_API.getCargasViagensV2Resumo() : Promise.resolve(summary),
        refreshMeta || !filterOptions.empresas.length ? window.RB_API.getCargasViagensV2Filtros() : Promise.resolve(filterOptions),
      ]);
      const rows = Array.isArray(result) ? result : result.items || [];
      if (tab === "cargas") setCargas(rows); else setViagens(rows);
      const totalPages = Number(result.totalPages || 1);
      setPageInfo({ total: Number(result.total ?? rows.length), totalPages });
      if (page > totalPages) setPage(totalPages);
      setSummary(stats); setFilterOptions(options);
      const loginSeller = cv2CommercialForUser(user);
      if (loginSeller && !seller && options.vendedores?.includes(loginSeller)) setSeller(loginSeller);
      if (seller && options.vendedores?.length && !options.vendedores.includes(seller)) setSeller("");
    } catch (err) { setError(cv2Error(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const timer = setTimeout(load, 260);
    return () => clearTimeout(timer);
  }, [tab, page, pageSize, query, status, financialStatus, seller, cargaFilters.empresa, cargaFilters.origem, cargaFilters.ufOrigem, cargaFilters.destino, cargaFilters.ufDestino, cargaFilters.material]);
  const saved = (kind, item) => {
    setModal(kind === "viagem" ? { type: "tripDone", item } : null);
    load(true);
  };
  const setCargaFilter = (key, value) => { setPage(1); setCargaFilters((current) => ({ ...current, [key]: value })); };
  const removeDone = async () => {
    setModal(null); await load(true);
  };
  const openViagemForm = async (initialCargaId = null) => {
    setError("");
    try {
      const rows = await window.RB_API.listCargasV2({ status: "aguardando_viagem" });
      const selectedCargaId = Number.isInteger(Number(initialCargaId)) ? Number(initialCargaId) : null;
      setModal({ type: "viagem", cargas: rows, initialCargaId: selectedCargaId });
    } catch (err) { setError(cv2Error(err)); }
  };
  const openViagemEdit = async (viagem) => {
    setError("");
    try {
      const available = await window.RB_API.listCargasV2({ status: "aguardando_viagem" });
      const byId = new Map([...(viagem.cargas || []), ...available].map((carga) => [carga.id, carga]));
      setModal({ type: "viagem", item: viagem, cargas: [...byId.values()] });
    } catch (err) { setError(cv2Error(err)); }
  };
  const saveCargaInViagem = async (viagem, carga) => {
    const fresh = await window.RB_API.getViagemV2(viagem.id);
    const updated = await window.RB_API.updateViagemV2(viagem.id, {
      ...fresh, cargaIds: [...new Set([...(fresh.cargas || []).map((item) => item.id), carga.id])],
    });
    setModal({ type: "details", item: updated });
    await load(true);
  };
  const isApprover = Boolean(user?.admin || user?.permissions?.["aprovar-viagens"]);
  const useStatusShortcut = (nextStatus = "", nextFinancial = "") => {
    setPage(1); setStatus(nextStatus); setFinancialStatus(nextFinancial);
  };
  const approvalAction = async (carga, action) => {
    const needsReason = ["corrigir", "reprovar", "reabrir"].includes(action);
    const reason = needsReason ? window.prompt("Informe a justificativa desta ação:") || "" : "";
    if (needsReason && !reason.trim()) return;
    const labels = { enviar: "enviar para aprovação", aprovar: "aprovar", corrigir: "solicitar correção", reprovar: "reprovar", reabrir: "reabrir a aprovação" };
    if (!window.confirm(`Confirma ${labels[action]} a carga ${carga.codigo}?`)) return;
    setApprovalBusy(carga.id); setError("");
    try {
      const savedCarga = await window.RB_API.updateCargaAprovacaoV2(carga.id, { acao: action, motivo: reason });
      setCargas((current) => current.map((item) => item.id === savedCarga.id ? savedCarga : item));
    } catch (err) { setError(cv2Error(err)); }
    finally { setApprovalBusy(null); }
  };
  const cargaActions = (carga) => {
    const hasCte = carga.documentos.some((doc) => doc.tipo.toUpperCase().includes("CT"));
    const approvalPending = ["rascunho", "correcao_solicitada", "reprovada"].includes(carga.statusAprovacao || "rascunho");
    return <div className="cv2-row-actions">
      {carga.status === "aguardando_viagem" && <button className="btn primary" onClick={() => openViagemForm(carga.id)}>Programar veículo</button>}
      {carga.status === "aguardando_cte" && carga.viagemId && <button className="btn primary" onClick={() => setModal({ type: "cte", item: carga })}>{hasCte ? "Documentos" : "Vincular CT-e"}</button>}
      {["em_transito", "entregue"].includes(carga.status) && carga.viagemId && <button className="btn" onClick={() => setModal({ type: "cte", item: carga })}>Documentos</button>}
      <details className="cv2-more"><summary aria-label="Mais ações">•••</summary><div>
        <button onClick={() => cv2PrintLoad(carga)}><Icon name="file" size={13} /> Imprimir folha da carga</button>
        <button onClick={() => setModal({ type: "carga", item: carga })}>Editar carga</button>
        {approvalPending && <button disabled={approvalBusy === carga.id} onClick={() => approvalAction(carga, "enviar")}>Enviar para aprovação</button>}
        {isApprover && carga.statusAprovacao === "aguardando_aprovacao" && <><button className="approve" disabled={approvalBusy === carga.id} onClick={() => approvalAction(carga, "aprovar")}>Aprovar carga</button><button disabled={approvalBusy === carga.id} onClick={() => approvalAction(carga, "corrigir")}>Solicitar correção</button><button className="danger" disabled={approvalBusy === carga.id} onClick={() => approvalAction(carga, "reprovar")}>Reprovar carga</button></>}
        {isApprover && carga.statusAprovacao === "aprovada" && <button disabled={approvalBusy === carga.id} onClick={() => approvalAction(carga, "reabrir")}>Reabrir aprovação</button>}
        <button className="danger" onClick={() => setModal({ type: "deleteCarga", item: carga })}>Excluir carga</button>
      </div></details>
    </div>;
  };
  return <div className="cv2">
    <Cv2Styles />
    <header className="cv2-head"><div><span className="cv2-eyebrow">Operação logística</span><h1>Cargas e viagens</h1><p>Acompanhe a operação, a entrega e a quitação financeira em uma única tela.</p></div><div className="cv2-head-actions"><button className="btn" onClick={() => setModal({ type: "quote" })}>Cotação</button><button className="btn" onClick={() => setModal({ type: "carga" })}>+ Nova carga</button><button className="btn primary" onClick={() => openViagemForm()}>+ Nova viagem</button></div></header>
    <div className="cv2-flow"><div><i>1</i><div><b>Cadastre a carga</b><small>Clientes, rota, peso e valor</small></div></div><div><i>2</i><div><b>Vincule o veículo</b><small>Viagem, placa e motorista</small></div></div><div><i>3</i><div><b>Emita o CT-e</b><small>Documento e acompanhamento</small></div></div><div><i>4</i><div><b>Entregue e receba</b><small>Entrega operacional e quitação</small></div></div></div>
    {tab === "cargas" ? <div className="cv2-kpis">
      <button className="cv2-kpi total" onClick={() => useStatusShortcut()}><span>Cargas cadastradas</span><b>{summary.cargas || 0}</b></button>
      <button className="cv2-kpi vehicle" onClick={() => useStatusShortcut("aguardando_cte")}><span>Veículo vinculado</span><b>{summary.cargas_vinculadas || 0}</b></button>
      <button className="cv2-kpi cte" onClick={() => useStatusShortcut("aguardando_cte")}><span>Aguardando CT-e</span><b>{summary.aguardando_cte || 0}</b></button>
      <button className="cv2-kpi transit" onClick={() => useStatusShortcut("em_transito")}><span>Em trânsito</span><b>{summary.cargas_em_transito || 0}</b></button>
      <button className="cv2-kpi delivered" onClick={() => useStatusShortcut("entregue")}><span>Entregues</span><b>{summary.cargas_entregues || 0}</b></button>
      <button className="cv2-kpi paid" onClick={() => useStatusShortcut("", "quitado")}><span>Quitadas</span><b>{summary.quitadas || 0}</b></button>
    </div> : <div className="cv2-kpis">
      <button className="cv2-kpi total" onClick={() => useStatusShortcut()}><span>Viagens cadastradas</span><b>{summary.viagens || 0}</b></button>
      <button className="cv2-kpi cte" onClick={() => useStatusShortcut("aguardando_cte")}><span>Aguardando CT-e</span><b>{summary.viagens_aguardando_cte || 0}</b></button>
      <button className="cv2-kpi transit" onClick={() => useStatusShortcut("em_transito")}><span>Em trânsito</span><b>{summary.viagens_em_transito || 0}</b></button>
      <button className="cv2-kpi delivered" onClick={() => useStatusShortcut("entregue")}><span>Entregues</span><b>{summary.viagens_entregues || 0}</b></button>
      <button className="cv2-kpi paid" onClick={() => useStatusShortcut("", "quitado")}><span>Quitadas</span><b>{summary.viagens_quitadas || 0}</b></button>
    </div>}
    <div className="cv2-tabbar"><div className="cv2-tabs"><button className={tab === "cargas" ? "active" : ""} onClick={() => { setTab("cargas"); setPage(1); setStatus("aguardando_viagem"); setFinancialStatus(""); setQuery(""); }}>Cargas <small>{summary.cargas || 0}</small></button><button className={tab === "viagens" ? "active" : ""} onClick={() => { setTab("viagens"); setPage(1); setStatus("aguardando_cte"); setFinancialStatus(""); setQuery(""); }}>Viagens <small>{summary.viagens || 0}</small></button></div></div>
    <div className="cv2-seller-bar"><label><span>Vendedor exibido</span><select value={seller} onChange={(event) => { setPage(1); setSeller(event.target.value); }}><option value="">Todos os vendedores ativos</option>{(filterOptions.vendedores || []).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>{seller ? <small>A tela está mostrando somente cargas e viagens de <b>{seller}</b>.</small> : <small>A tela está mostrando cargas e viagens de <b>todos os vendedores ativos</b>.</small>}</div>
    <div className="cv2-toolbar"><div className="cv2-search"><Icon name="search" /><input value={query} onChange={(e) => { setPage(1); setQuery(e.target.value); }} placeholder={tab === "cargas" ? "Buscar carga, cliente, cidade, placa..." : "Buscar viagem, placa ou motorista..."} /></div><div className="cv2-filters">
      <button className={!status && !financialStatus ? "active" : ""} onClick={() => { setPage(1); setStatus(""); setFinancialStatus(""); }}>Todas</button>
      {tab === "cargas" && <button className={status === "aguardando_viagem" ? "active" : ""} onClick={() => { setPage(1); setStatus("aguardando_viagem"); setFinancialStatus(""); }}>Somente carga</button>}
      <button className={status === "aguardando_cte" ? "active warning" : ""} onClick={() => { setPage(1); setStatus("aguardando_cte"); setFinancialStatus(""); }}>Aguardando CT-e</button>
      <button className={status === "em_transito" ? "active info" : ""} onClick={() => { setPage(1); setStatus("em_transito"); setFinancialStatus(""); }}>Em trânsito</button>
      <button className={status === "entregue" ? "active delivered" : ""} onClick={() => { setPage(1); setStatus("entregue"); setFinancialStatus(""); }}>Entregue</button>
      <span className="cv2-filter-divider" />
      <button className={financialStatus === "em_aberto" ? "active open" : ""} onClick={() => { setPage(1); setStatus(""); setFinancialStatus(financialStatus === "em_aberto" ? "" : "em_aberto"); }}>Financeiro em aberto</button>
      <button className={financialStatus === "quitado" ? "active paid" : ""} onClick={() => { setPage(1); setStatus(""); setFinancialStatus(financialStatus === "quitado" ? "" : "quitado"); }}>Quitado</button>
      {tab === "cargas" && <button className="cv2-filter-toggle" onClick={() => setFiltersOpen((value) => !value)}><Icon name="filter" size={13} /> Filtros {filtersOpen ? "▴" : "▾"}</button>}
    </div></div>
    {tab === "cargas" && filtersOpen && <div className="cv2-advanced-filters"><div className="cv2-advanced-head"><b>Filtros avançados da carga</b><button onClick={() => { setPage(1); setCargaFilters(emptyCargaFilters()); }}>Limpar filtros</button></div><div className="cv2-filter-grid">
      <label><span>Empresa / cliente</span><input list="cv2-empresas" value={cargaFilters.empresa} onChange={(e) => setCargaFilter("empresa", e.target.value)} placeholder="Todas" /><datalist id="cv2-empresas">{filterOptions.empresas.map((item) => <option key={item} value={item} />)}</datalist></label>
      <label><span>Origem</span><input list="cv2-origens" value={cargaFilters.origem} onChange={(e) => setCargaFilter("origem", e.target.value)} placeholder="Todas as cidades" /><datalist id="cv2-origens">{filterOptions.origens.map((item) => <option key={item} value={item} />)}</datalist></label>
      <label><span>UF origem</span><select value={cargaFilters.ufOrigem} onChange={(e) => setCargaFilter("ufOrigem", e.target.value)}><option value="">Todas</option>{filterOptions.ufsOrigem.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label><span>Destino</span><input list="cv2-destinos" value={cargaFilters.destino} onChange={(e) => setCargaFilter("destino", e.target.value)} placeholder="Todas as cidades" /><datalist id="cv2-destinos">{filterOptions.destinos.map((item) => <option key={item} value={item} />)}</datalist></label>
      <label><span>UF destino</span><select value={cargaFilters.ufDestino} onChange={(e) => setCargaFilter("ufDestino", e.target.value)}><option value="">Todas</option>{filterOptions.ufsDestino.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label><span>Material</span><input list="cv2-materiais" value={cargaFilters.material} onChange={(e) => setCargaFilter("material", e.target.value)} placeholder="Todos" /><datalist id="cv2-materiais">{filterOptions.materiais.map((item) => <option key={item} value={item} />)}</datalist></label>
    </div></div>}
    {error && <div className="cv2-alert error">{error}</div>}
    {tab === "cargas" ? <div className="cv2-table-wrap"><table className="cv2-table"><thead><tr><th>Carga / data</th><th>Clientes</th><th>Origem</th><th>Destino</th><th>Material / peso</th><th>Valor da carga</th><th>Placa / viagem</th><th>Operação</th><th>Financeiro</th><th>Aprovação</th><th></th></tr></thead><tbody>
      {!loading && !cargas.length && <tr><td colSpan="11"><div className="cv2-empty"><b>Nenhuma carga encontrada.</b><span>Ajuste os filtros.</span></div></td></tr>}
      {cargas.map((carga) => <tr key={carga.id}><td><strong>{carga.codigo}</strong><small>{cv2Date(carga.data)}</small></td><td className="cv2-client-cell"><small className="cv2-client-line"><b>Inicial</b><span>{carga.cliente || "—"}</span></small><small className="cv2-client-line"><b>Entrega</b><span>{carga.clienteFinal || "—"}</span></small><small className="cv2-client-line"><b>Tomador</b><span>{carga.tomadorServico || "—"}</span></small></td><td><strong>{carga.origem || "—"}</strong><small>{carga.ufOrigem || "Sem UF"}</small></td><td><strong>{carga.destino || "—"}</strong><small>{carga.ufDestino || "Sem UF"}</small></td><td><strong>{carga.material || "—"}</strong><small>{cv2Weight(carga.peso)}</small></td><td><strong>{cv2Money(carga.valorCliente)}</strong><small>{cv2Money(carga.valorTon)}/ton</small></td><td>{carga.placa ? <><strong className="cv2-plate">{carga.placa}</strong><small>{[carga.numeroViagem, carga.motorista].filter(Boolean).join(" · ")}</small></> : <><strong>Sem veículo</strong><small>Não programada</small></>}</td><td><Cv2Status value={carga.status} vehicleLinked={Boolean(carga.placa)} detail={carga.status === "aguardando_viagem" ? "Sem veículo programado" : ""} /></td><td><Cv2FinancialStatus value={carga.financeiro} /></td><td><Cv2Approval carga={carga} /></td><td>{cargaActions(carga)}</td></tr>)}
    </tbody></table></div> : <div className="cv2-table-wrap"><table className="cv2-table"><thead><tr><th>Viagem / data</th><th>Motorista / placa</th><th>Rota</th><th>Cargas</th><th>Peso total</th><th>Receita</th><th>Operação</th><th>Financeiro</th><th></th></tr></thead><tbody>
      {!loading && !viagens.length && <tr><td colSpan="9"><div className="cv2-empty"><b>Nenhuma viagem encontrada.</b><span>Programe um veículo usando as cargas disponíveis.</span></div></td></tr>}
      {viagens.map((viagem) => { const first = viagem.cargas[0] || {}; const destinations = [...new Set(viagem.cargas.map((carga) => [carga.destino, carga.ufDestino].filter(Boolean).join("/")).filter(Boolean))]; const delivered = viagem.cargas.filter((carga) => carga.status === "entregue").length; return <tr key={viagem.id}><td><strong>{viagem.numero}</strong><small>{cv2Date(viagem.data)}</small></td><td><strong>{viagem.motorista || "—"}</strong>{viagem.placa ? <small><span className="cv2-plate">{viagem.placa}</span></small> : <small>Sem placa</small>}</td><td className="cv2-route"><strong>{first.origem ? `${first.origem}/${first.ufOrigem}` : "—"}</strong><span>{destinations.length === 1 ? ` → ${destinations[0]}` : destinations.length > 1 ? ` → ${destinations.length} destinos` : ""}</span></td><td><button className="cv2-load-count" onClick={() => setModal({ type: "details", item: viagem })}><strong>{viagem.cargas.length} {viagem.cargas.length === 1 ? "carga" : "cargas"}</strong><small>{delivered}/{viagem.cargas.length} entregue(s)</small></button></td><td><strong>{cv2Weight(viagem.cargas.reduce((sum, carga) => sum + carga.peso, 0))}</strong></td><td><strong>{cv2Money(viagem.cargas.reduce((sum, carga) => sum + carga.valorCliente, 0))}</strong></td><td><Cv2Status value={viagem.situacao} vehicleLinked={Boolean(viagem.placa)} detail={`${delivered}/${viagem.cargas.length} cargas entregues`} /></td><td><Cv2FinancialStatus value={viagem.financeiro} /></td><td><div className="cv2-row-actions"><button className="btn" onClick={() => setModal({ type: "details", item: viagem })}>Detalhes</button><button className="btn primary" onClick={() => cv2PrintTrip(viagem)}><Icon name="file" size={13} /> Imprimir</button><details className="cv2-more"><summary aria-label="Mais ações">•••</summary><div><button onClick={() => openViagemEdit(viagem)}><Icon name="wrench" size={13} /> Editar viagem</button><button onClick={() => setModal({ type: "cargaViagem", viagem })}>+ Adicionar carga</button><button className="danger" onClick={() => setModal({ type: "deleteViagem", item: viagem })}>Excluir viagem</button></div></details></div></td></tr>; })}
    </tbody></table></div>}
    <Cv2Pagination page={page} pageSize={pageSize} total={pageInfo.total} totalPages={pageInfo.totalPages}
      onPage={setPage} onPageSize={(value) => { setPage(1); setPageSize(value); }} />
    {modal?.type === "quote" && <Cv2QuoteModal user={user} sellers={filterOptions.vendedores || []} onClose={() => setModal(null)} />}
    {modal?.type === "carga" && <Cv2CargaForm initial={modal.item} user={user} onClose={() => setModal(null)} onSaved={(item) => saved("carga", item)} />}
    {modal?.type === "viagem" && <Cv2ViagemForm initial={modal.item} initialCargaId={modal.initialCargaId} cargas={modal.cargas || []} onClose={() => setModal(null)} onCreateCarga={(viagem) => setModal({ type: "cargaViagem", viagem })} onSaved={(item) => { setModal(modal.item ? null : { type: "tripDone", item }); load(true); }} />}
    {modal?.type === "cargaViagem" && <Cv2CargaForm user={user} onClose={() => setModal({ type: "details", item: modal.viagem })} onSaved={(carga) => saveCargaInViagem(modal.viagem, carga).catch((err) => { setError(cv2Error(err)); setModal(null); })} />}
    {modal?.type === "cte" && <Cv2CteModal carga={modal.item} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(true); }} />}
    {modal?.type === "details" && <Cv2TripDetails viagem={modal.item} onClose={() => setModal(null)} />}
    {modal?.type === "deleteCarga" && <Cv2DeleteModal type="carga" item={modal.item} onClose={() => setModal(null)} onDeleted={removeDone} />}
    {modal?.type === "deleteViagem" && <Cv2DeleteModal type="viagem" item={modal.item} onClose={() => setModal(null)} onDeleted={removeDone} />}
    {modal?.type === "tripDone" && <Cv2Modal title="Viagem criada com sucesso" subtitle={`${modal.item.numero} está aguardando a vinculação do CT-e.`} onClose={() => setModal(null)}><div className="cv2-modal-body"><div className="cv2-alert success"><b>{modal.item.placa}</b> · {modal.item.motorista || "Motorista não informado"}<br />{modal.item.cargas.length} carga(s) vinculada(s).</div></div><footer className="cv2-modal-actions"><button className="btn" onClick={() => setModal(null)}>Fechar</button><button className="btn primary" onClick={() => cv2PrintTrip(modal.item)}>Imprimir folha da viagem</button></footer></Cv2Modal>}
  </div>;
};

window.CargasViagensV2 = CargasViagensV2;
