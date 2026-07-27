// Monitor de SMs e alterações de rota do Elite OP / Trafegus.
const Trafegus = () => {
  const [data, setData] = React.useState({ resumo: {}, sms: [], alteracoes: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [tab, setTab] = React.useState("sms");
  const [search, setSearch] = React.useState("");
  const [routeDetail, setRouteDetail] = React.useState(null);
  const [routeLoading, setRouteLoading] = React.useState(false);
  const [routeError, setRouteError] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const load = React.useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const payload = force
        ? await window.RB_API.refreshTrafegus()
        : await window.RB_API.getTrafegusDashboard();
      setData(payload || { resumo: {}, sms: [], alteracoes: [] });
    } catch (requestError) {
      setError(requestError?.message || "Não foi possível consultar o Trafegus.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(false); }, [load]);

  const openRouteOptions = async (smId) => {
    setRouteDetail({ sm: smId });
    setRouteLoading(true);
    setRouteError("");
    setCopied(false);
    try {
      setRouteDetail(await window.RB_API.getTrafegusGoogleRoute(smId));
    } catch (requestError) {
      setRouteError(requestError?.message || "Não foi possível montar a rota do Google Maps.");
    } finally {
      setRouteLoading(false);
    }
  };

  const copyGoogleRoute = async () => {
    if (!routeDetail?.googleMapsUrl) return;
    await navigator.clipboard.writeText(routeDetail.googleMapsUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(parsed.getTime())
      ? String(value)
      : parsed.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  const term = search.trim().toLowerCase();
  const includesTerm = (row) => !term || Object.values(row).some((value) => String(value || "").toLowerCase().includes(term));
  const sms = (data.sms || []).filter(includesTerm);
  const changes = (data.alteracoes || []).filter(includesTerm);
  const summary = data.resumo || {};

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>Trafegus — SMs e Rotas</h1>
          <div className="sub">Monitoramento autenticado do Elite OP, somente leitura</div>
        </div>
        <button className="btn primary" onClick={() => load(true)} disabled={loading}>
          <Icon name="refresh"/>{loading ? " Consultando..." : " Atualizar agora"}
        </button>
      </div>

      {error && (
        <div className="card" style={{padding:"11px 14px",marginBottom:16,borderColor:"var(--crit-border)",color:"var(--crit)"}}>
          {error}
        </div>
      )}

      <div className="grid cols-4" style={{marginBottom:16}}>
        <div className="kpi" style={{borderLeft:"3px solid #38bdf8"}}>
          <div className="kpi-label"><Icon name="route"/><span>Veículos em viagem</span></div>
          <div className="kpi-value">{summary.totalSms || 0}</div>
          <span className="kpi-delta up">{summary.exibindoSms || 0} SMs carregadas</span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid #22c55e"}}>
          <div className="kpi-label"><Icon name="map"/><span>Com link de rota</span></div>
          <div className="kpi-value">{summary.comLinkRota || 0}</div>
          <span className="kpi-delta up">prontas para compartilhar</span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid #f59e0b"}}>
          <div className="kpi-label"><Icon name="alert"/><span>Sem link de rota</span></div>
          <div className="kpi-value">{summary.semLinkRota || 0}</div>
          <span className="kpi-delta down">necessitam revisão</span>
        </div>
        <div className="kpi" style={{borderLeft:"3px solid #a78bfa"}}>
          <div className="kpi-label"><Icon name="refresh"/><span>Alterações de rota</span></div>
          <div className="kpi-value">{summary.totalAlteracoes || 0}</div>
          <span className="kpi-delta up">{summary.exibindoAlteracoes || 0} mais recentes carregadas</span>
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-header" style={{gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:6}}>
            <button className={`btn sm ${tab === "sms" ? "primary" : ""}`} onClick={() => setTab("sms")}>SMs em viagem</button>
            <button className={`btn sm ${tab === "alteracoes" ? "primary" : ""}`} onClick={() => setTab("alteracoes")}>Alterações de rota</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginLeft:"auto"}}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar placa, motorista, cliente ou rota" style={{minWidth:310}}/>
            <span className="meta muted">{data.atualizadoEm ? `Atualizado ${formatDate(data.atualizadoEm)}` : ""}</span>
          </div>
        </div>

        {tab === "sms" && (
          <div style={{overflow:"auto"}}>
            <table className="tbl">
              <thead><tr><th>SM</th><th>Placa</th><th>Motorista</th><th>Origem</th><th>Destino</th><th>Status</th><th>Previsão</th><th>Rota</th></tr></thead>
              <tbody>
                {sms.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.id}</strong>{row.manifesto && <div className="muted" style={{fontSize:10.5}}>Manifesto {row.manifesto}</div>}</td>
                    <td><strong>{row.placa || "-"}</strong>{row.carreta && <div className="muted" style={{fontSize:10.5}}>{row.carreta}</div>}</td>
                    <td>{row.motorista || "-"}<div className="muted" style={{fontSize:10.5}}>{row.transportador || ""}</div></td>
                    <td style={{maxWidth:220}}>{row.origem || "-"}</td>
                    <td style={{maxWidth:220}}>{row.destino || "-"}</td>
                    <td><span className={`badge ${/finaliz|encerr/i.test(row.status) ? "ok" : /cancel/i.test(row.status) ? "crit" : "warn"}`}>{row.status || "Sem status"}</span></td>
                    <td>{formatDate(row.previsaoInicio)}<div className="muted" style={{fontSize:10.5}}>até {formatDate(row.previsaoFim)}</div></td>
                    <td>
                      <div style={{display:"flex",gap:6,whiteSpace:"nowrap"}}>
                        <button className="btn sm primary" onClick={() => openRouteOptions(row.id)}><Icon name="route"/> GPS</button>
                        {row.linkRota
                          ? <a className="btn sm" href={row.linkRota} target="_blank" rel="noreferrer"><Icon name="map"/> Elite</a>
                          : <span className="badge warn">Sem link</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!sms.length && <tr><td colSpan="8" className="muted" style={{padding:18}}>Nenhuma SM encontrada.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === "alteracoes" && (
          <div style={{overflow:"auto"}}>
            <table className="tbl">
              <thead><tr><th>Viagem</th><th>Placa</th><th>Operação</th><th>Rota</th><th>Origem</th><th>Destino</th><th>Alterado em</th><th>Usuário</th></tr></thead>
              <tbody>
                {changes.map((row, index) => (
                  <tr key={`${row.viagemId}-${row.rotaId}-${row.alteradoEm}-${index}`}>
                    <td><strong>{row.viagemId || "-"}</strong></td>
                    <td><strong>{row.placa || "-"}</strong><div className="muted" style={{fontSize:10.5}}>{row.frota || ""}</div></td>
                    <td><span className={`badge ${/inclu/i.test(row.operacao) ? "ok" : /exclu/i.test(row.operacao) ? "crit" : "warn"}`}>{row.operacao || "-"}</span></td>
                    <td style={{maxWidth:260}}>{row.rota || row.rotaId || "-"}</td>
                    <td>{row.origem || "-"}</td>
                    <td>{row.destino || "-"}</td>
                    <td>{formatDate(row.alteradoEm)}</td>
                    <td>{row.usuarioAlterou || row.usuarioAdicionou || "-"}</td>
                  </tr>
                ))}
                {!changes.length && <tr><td colSpan="8" className="muted" style={{padding:18}}>Nenhuma alteração encontrada.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {routeDetail && (
        <div style={{position:"fixed",inset:0,zIndex:1100,background:"rgba(0,0,0,.68)",display:"grid",placeItems:"center",padding:18}} onMouseDown={() => setRouteDetail(null)}>
          <section className="card card-flush" style={{width:"min(900px, calc(100vw - 36px))",maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column"}} onMouseDown={(event) => event.stopPropagation()}>
            <div className="card-header" style={{borderBottom:"1px solid var(--divider)"}}>
              <div>
                <h3>Rota para o motorista — SM {routeDetail.sm}</h3>
                <span className="meta muted">{routeDetail.placa ? `${routeDetail.placa} · ${routeDetail.motorista || "Motorista não identificado"}` : "Carregando locais da viagem..."}</span>
              </div>
              <button className="icon-btn" onClick={() => setRouteDetail(null)} title="Fechar"><Icon name="x"/></button>
            </div>

            <div style={{padding:16,overflow:"auto"}}>
              {routeLoading && <div className="muted" style={{padding:22,textAlign:"center"}}>Consultando o Guia de Viagem e montando a rota...</div>}
              {routeError && <div style={{padding:14,color:"var(--crit)",border:"1px solid var(--crit-border)",borderRadius:8}}>{routeError}</div>}
              {!routeLoading && !routeError && routeDetail.googleMapsUrl && (
                <>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                    <a className="btn primary" href={routeDetail.googleMapsUrl} target="_blank" rel="noreferrer"><Icon name="map"/> Abrir no Google Maps</a>
                    <button className="btn" onClick={copyGoogleRoute}><Icon name="copy"/> {copied ? "Link copiado" : "Copiar link"}</button>
                    <a className="btn" href={routeDetail.whatsappUrl} target="_blank" rel="noreferrer"><Icon name="whatsapp"/> Enviar ao motorista</a>
                    <span className={`badge ${routeDetail.telefoneEncontrado ? "ok" : "warn"}`}>
                      {routeDetail.telefoneEncontrado ? `Telefone encontrado · final ${routeDetail.telefoneFinal}` : "Telefone não encontrado — escolher contato"}
                    </span>
                  </div>

                  <div className="card card-flush">
                    <div className="card-header">
                      <h3>Entregas na ordem do Trafegus</h3>
                      <span className="meta muted">{routeDetail.entregas?.length || 0} entregas · paradas permitidas excluídas</span>
                    </div>
                    <div className="card-body">
                      {(routeDetail.locais || []).map((local, index) => (
                        <div key={`${local.tipo}-${local.ordem}-${index}`} style={{display:"grid",gridTemplateColumns:"34px 90px 1fr auto",gap:10,alignItems:"center",padding:"10px 0",borderBottom:index < routeDetail.locais.length - 1 ? "1px solid var(--divider)" : 0}}>
                          <span style={{width:26,height:26,borderRadius:"50%",display:"grid",placeItems:"center",background:local.tipo === "ENTREGA" ? "rgba(56,189,248,.16)" : "rgba(34,197,94,.16)",color:local.tipo === "ENTREGA" ? "#38bdf8" : "#22c55e",fontWeight:700}}>{index + 1}</span>
                          <span className={`badge ${local.tipo === "ENTREGA" ? "warn" : "ok"}`}>{local.tipo}</span>
                          <div><strong>{local.descricao}</strong><div className="muted" style={{fontSize:10.5}}>{local.latitude}, {local.longitude}</div></div>
                          <span className="meta muted">{local.previsao || ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

window.Trafegus = Trafegus;
