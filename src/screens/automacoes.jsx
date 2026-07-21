function AutomacoesN8n() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await RB_API.getAutomacaoVencimentoClientes());
    } catch (err) {
      setError(err.message || "Nao foi possivel carregar a automacao.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function toggleActive() {
    if (!data || saving) return;
    setSaving(true);
    setError("");
    try {
      setData(data.active
        ? await RB_API.desativarAutomacaoVencimentoClientes()
        : await RB_API.ativarAutomacaoVencimentoClientes());
    } catch (err) {
      setError(err.message || "Nao foi possivel alterar a automacao.");
    } finally {
      setSaving(false);
    }
  }

  const last = data?.lastExecution;

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>Automações</h1>
          <div className="sub">Monitoramento e controle dos fluxos n8n</div>
        </div>
        <div className="actions">
          <button className="btn" onClick={load} disabled={loading || saving}>
            <Icon name="refresh"/> Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--crit-border)", background: "var(--crit-bg)", color: "var(--crit)" }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h3>{data?.name || "Vencimento Clientes"}</h3>
            <div className="meta">Workflow n8n: {data?.id || "carregando"}</div>
          </div>
          <div className={`badge ${data?.active ? "ok" : "crit"}`}>
            <span className="dot"/>
            {loading ? "Carregando" : data?.active ? "Ativa" : "Inativa"}
          </div>
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
              <div className="kpi-label"><Icon name="alarm"/> Parada</div>
              <div className="kpi-value" style={{ fontSize: 20 }}>{formatDateTime(last?.stoppedAt)}</div>
              <div className="kpi-sub">Horario informado pelo n8n</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className={`btn ${data?.active ? "danger" : "primary"}`}
              onClick={toggleActive}
              disabled={loading || saving || !data}
            >
              <Icon name={data?.active ? "pause" : "play"}/>
              {saving ? "Salvando..." : data?.active ? "Desativar automacao" : "Ativar automacao"}
            </button>
            <button className="btn" onClick={load} disabled={loading || saving}>
              <Icon name="refresh"/> Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-header">
          <h3>Historico recente</h3>
          <div className="meta">Ultimas execucoes registradas no n8n</div>
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
              {(data?.executions || []).map((execution) => (
                <tr key={execution.id}>
                  <td>{execution.id}</td>
                  <td><ExecutionBadge execution={execution}/></td>
                  <td>{formatDateTime(execution.startedAt)}</td>
                  <td>{formatDateTime(execution.stoppedAt)}</td>
                  <td>{execution.mode || "-"}</td>
                </tr>
              ))}
              {!loading && !data?.executions?.length && (
                <tr><td colSpan="5" style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>Nenhuma execucao recente.</td></tr>
              )}
              {loading && (
                <tr><td colSpan="5" style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>Carregando...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
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
