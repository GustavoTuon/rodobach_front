function AutomacoesN8n() {
  const [data, setData] = React.useState({ summary: {}, workflows: [] });
  const [selectedId, setSelectedId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState("");
  const [retryingId, setRetryingId] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const payload = await RB_API.listAutomacoesN8n();
      const workflows = Array.isArray(payload?.workflows) ? payload.workflows : [];
      setData({ summary: payload?.summary || {}, workflows, scope: payload?.scope || null });
      setSelectedId((current) => current && workflows.some((item) => item.id === current)
        ? current
        : workflows[0]?.id || "");
    } catch (err) {
      setError(err.message || "Nao foi possivel carregar as automacoes.");
      setData({ summary: {}, workflows: [], scope: null });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function refreshOne(id) {
    if (!id) return;
    try {
      setNotice("");
      const updated = await RB_API.getAutomacaoN8n(id);
      setData((current) => ({
        ...current,
        workflows: current.workflows.map((item) => item.id === id ? updated : item),
      }));
    } catch (err) {
      setError(err.message || "Nao foi possivel atualizar a automacao.");
    }
  }

  async function toggleActive(workflow) {
    if (!workflow || savingId) return;
    setSavingId(workflow.id);
    setError("");
    setNotice("");
    try {
      const updated = workflow.active
        ? await RB_API.desativarAutomacaoN8n(workflow.id)
        : await RB_API.ativarAutomacaoN8n(workflow.id);
      setData((current) => ({
        ...current,
        workflows: current.workflows.map((item) => item.id === workflow.id ? updated : item),
      }));
    } catch (err) {
      setError(err.message || "Nao foi possivel alterar a automacao.");
    } finally {
      setSavingId("");
    }
  }

  async function retryWorkflow(workflow) {
    if (!workflow || retryingId) return;
    setRetryingId(workflow.id);
    setError("");
    setNotice("");
    try {
      const result = await RB_API.executarNovamenteAutomacaoN8n(workflow.id);
      const updated = result?.workflow || await RB_API.getAutomacaoN8n(workflow.id);
      setData((current) => ({
        ...current,
        workflows: current.workflows.map((item) => item.id === workflow.id ? updated : item),
      }));
      setNotice(`Execucao ${result?.originalExecutionId || ""} enviada novamente.`.trim());
    } catch (err) {
      setError(err.message || "Nao foi possivel executar novamente.");
    } finally {
      setRetryingId("");
    }
  }

  const workflows = data.workflows || [];
  const selected = workflows.find((item) => item.id === selectedId) || workflows[0] || null;
  const summary = data.summary || {};

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>n8n</h1>
          <div className="sub">Central de monitoramento: {data.scope?.label || "Personal / Rodobach"}</div>
        </div>
        <div className="actions">
          <button className="btn" onClick={load} disabled={loading || Boolean(savingId)}>
            <Icon name="refresh"/> Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--crit-border)", background: "var(--crit-bg)", color: "var(--crit)" }}>
          {error}
        </div>
      )}
      {notice && (
        <div className="card" style={{ borderColor: "var(--ok-border)", background: "var(--ok-bg)", color: "var(--ok)" }}>
          {notice}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 14 }}>
        <N8nKpi label="Workflows" value={summary.total ?? "-"} icon="plug" sub="cadastrados no n8n"/>
        <N8nKpi label="Ativos" value={summary.active ?? "-"} icon="check" sub="rodando"/>
        <N8nKpi label="Falhando" value={summary.failing ?? "-"} icon="alert" sub="ultima execucao com erro" tone="crit"/>
        <N8nKpi label="Inativos" value={summary.inactive ?? "-"} icon="pause" sub="desligados"/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 430px) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
        <div className="card card-flush">
          <div className="card-header">
            <div>
              <h3>Automacoes</h3>
              <div className="meta">Clique em um fluxo para ver detalhes</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 8, padding: 10 }}>
            {workflows.map((workflow) => (
              <button
                key={workflow.id}
                type="button"
                onClick={() => setSelectedId(workflow.id)}
                style={{
                  textAlign: "left",
                  border: `1px solid ${selected?.id === workflow.id ? "var(--brand-blue)" : "var(--border)"}`,
                  background: selected?.id === workflow.id ? "var(--accent-soft)" : "var(--surface)",
                  color: "var(--text)",
                  borderRadius: 7,
                  padding: "10px 11px",
                  cursor: "pointer",
                  display: "grid",
                  gap: 7,
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 13.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {workflow.name}
                  </strong>
                  <WorkflowHealthBadge workflow={workflow}/>
                </div>
                <div className="muted" style={{ fontSize: 11.5, fontFamily: "var(--font-mono)" }}>{workflow.id}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span className={`badge ${workflow.active ? "ok" : "crit"}`}><span className="dot"/>{workflow.active ? "Ativa" : "Inativa"}</span>
                  <span className="muted" style={{ fontSize: 11.5 }}>Ultima: {formatDateTime(workflow.lastExecution?.startedAt)}</span>
                </div>
              </button>
            ))}
            {!loading && workflows.length === 0 && (
              <div style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>Nenhuma automacao encontrada.</div>
            )}
            {loading && (
              <div style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>Carregando...</div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <WorkflowDetail
            workflow={selected}
            saving={savingId === selected?.id}
            retrying={retryingId === selected?.id}
            loading={loading}
            onToggle={() => toggleActive(selected)}
            onRefresh={() => refreshOne(selected?.id)}
            onRetry={() => retryWorkflow(selected)}
          />
          <WorkflowHistory workflow={selected} loading={loading}/>
        </div>
      </div>
    </div>
  );
}

function N8nKpi({ label, value, icon, sub, tone }) {
  return (
    <div className="kpi" style={tone === "crit" && Number(value) > 0 ? { borderColor: "var(--crit-border)", background: "var(--crit-bg)" } : null}>
      <div className="kpi-label"><Icon name={icon}/>{label}</div>
      <div className="kpi-value" style={{ fontSize: 22 }}>{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

function WorkflowDetail({ workflow, saving, retrying, loading, onToggle, onRefresh, onRetry }) {
  const last = workflow?.lastExecution;
  const canRetry = ["error", "failed", "crashed"].includes(String(last?.status || "").toLowerCase());
  if (!workflow) {
    return (
      <div className="card">
        <div className="card-body" style={{ color: "var(--muted)", padding: 24 }}>Selecione uma automacao.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3>{workflow.name}</h3>
          <div className="meta">Workflow n8n: {workflow.id}</div>
        </div>
        <WorkflowHealthBadge workflow={workflow}/>
      </div>

      <div className="card-body" style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div className="kpi">
            <div className="kpi-label"><Icon name="clock"/> Ultima execucao</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{formatDateTime(last?.startedAt)}</div>
            <div className="kpi-sub">{last?.id ? `ID ${last.id}` : "Sem execucoes recentes"}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label"><Icon name="check"/> Resultado</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{last?.statusLabel || "-"}</div>
            <div className="kpi-sub">{last?.finished ? "Execucao finalizada" : last ? "Ainda em andamento" : "Aguardando historico"}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label"><Icon name="alarm"/> Fim</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{formatDateTime(last?.stoppedAt)}</div>
            <div className="kpi-sub">{workflow.nodeCount ? `${workflow.nodeCount} nodes` : "Horario informado pelo n8n"}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn primary"
            onClick={onRetry}
            disabled={loading || saving || retrying || !canRetry}
            title={canRetry ? "Executa novamente a ultima execucao com erro" : "Disponivel quando a ultima execucao falhar"}
          >
            <Icon name="play"/>
            {retrying ? "Executando..." : "Executar novamente"}
          </button>
          <button
            className={`btn ${workflow.active ? "danger" : "primary"}`}
            onClick={onToggle}
            disabled={loading || saving || retrying || !workflow}
          >
            <Icon name={workflow.active ? "pause" : "play"}/>
            {saving ? "Salvando..." : workflow.active ? "Desativar" : "Ativar"}
          </button>
          <button className="btn" onClick={onRefresh} disabled={loading || saving || retrying}>
            <Icon name="refresh"/> Atualizar status
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkflowHistory({ workflow, loading }) {
  return (
    <div className="card card-flush">
      <div className="card-header">
        <h3>Historico recente</h3>
        <div className="meta">{workflow?.name || "Selecione um fluxo"}</div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Inicio</th>
              <th>Fim</th>
              <th>Modo</th>
            </tr>
          </thead>
          <tbody>
            {(workflow?.executions || []).map((execution) => (
              <tr key={execution.id}>
                <td>{execution.id}</td>
                <td><ExecutionBadge execution={execution}/></td>
                <td>{formatDateTime(execution.startedAt)}</td>
                <td>{formatDateTime(execution.stoppedAt)}</td>
                <td>{execution.mode || "-"}</td>
              </tr>
            ))}
            {!loading && !workflow?.executions?.length && (
              <tr><td colSpan="5" style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>Nenhuma execucao recente.</td></tr>
            )}
            {loading && (
              <tr><td colSpan="5" style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>Carregando...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WorkflowHealthBadge({ workflow }) {
  const health = workflow?.health;
  const cls = health === "ok" ? "ok" : health === "error" ? "crit" : health === "inactive" ? "crit" : "warn";
  const label = health === "ok"
    ? "OK"
    : health === "error"
      ? "Falhou"
      : health === "inactive"
        ? "Inativa"
        : workflow?.statusLabel || "Atencao";
  return <span className={`badge ${cls}`}><span className="dot"/>{label}</span>;
}

function ExecutionBadge({ execution }) {
  const status = String(execution?.status || "").toLowerCase();
  const cls = status === "success" ? "ok" : status === "error" ? "crit" : status === "waiting" ? "warn" : "info";
  return <span className={`badge ${cls}`}><span className="dot"/>{execution?.statusLabel || status || "-"}</span>;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

window.AutomacoesN8n = AutomacoesN8n;
