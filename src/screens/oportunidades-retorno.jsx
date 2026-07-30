const OportunidadesRetorno = () => {
  const [data, setData] = React.useState({ clientes: [], sms: [], configuracao: {} });
  const [smId, setSmId] = React.useState("");
  const [raioKm, setRaioKm] = React.useState(200);
  const [analysis, setAnalysis] = React.useState(null);
  const [message, setMessage] = React.useState("");
  const [recipient, setRecipient] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const potentialClients = analysis?.potenciais || analysis?.clientes || [];

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await window.RB_API.getOportunidadesRetorno();
      setData(result || { clientes: [], sms: [], configuracao: {} });
      if (!recipient && result?.configuracao?.destinatario) setRecipient(result.configuracao.destinatario);
      if (!smId && result?.sms?.length) setSmId(String(result.sms[0].id));
    } catch (err) {
      setError(err?.message || "Nao foi possivel carregar as oportunidades.");
    } finally {
      setLoading(false);
    }
  }, [smId, recipient]);

  React.useEffect(() => { load(); }, []);

  const downloadTemplate = async () => {
    try {
      const blob = await window.RB_API.downloadOportunidadesModelo();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "modelo-clientes-retorno.xlsx";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || "Falha ao baixar o modelo.");
    }
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const arquivoBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || "").split(",").pop());
        reader.onerror = () => reject(new Error("Nao foi possivel ler a planilha."));
        reader.readAsDataURL(file);
      });
      const result = await window.RB_API.importOportunidadesClientes({ arquivoBase64, substituir: true });
      setNotice(`${result.importados} clientes importados. ${result.semCoordenadas} sem coordenadas.`);
      await load();
    } catch (err) {
      setError(err?.message || "Falha ao importar a planilha.");
    } finally {
      setWorking(false);
    }
  };

  const analyze = async () => {
    if (!smId) return setError("Selecione uma SM em viagem.");
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const result = await window.RB_API.analyzeOportunidadesRetorno({ smId, raioKm });
      setAnalysis(result);
      setMessage(result.mensagem || "");
    } catch (err) {
      setError(err?.message || "Falha ao analisar clientes proximos.");
    } finally {
      setWorking(false);
    }
  };

  const sendN8n = async () => {
    if (!analysis) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const result = await window.RB_API.sendOportunidadesN8n({
        smId,
        raioKm,
        mensagem: message,
        destinatario: recipient,
      });
      setNotice(`Mensagem enviada ao n8n com ${result.enviados} clientes.`);
    } catch (err) {
      setError(err?.message || "Falha ao enviar para o n8n.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="view">
      <style>{`
        .or-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(340px,.85fr);gap:16px}
        .or-toolbar{display:grid;grid-template-columns:minmax(340px,1fr) 140px auto;gap:12px;align-items:end}
        .or-toolbar label,.or-recipient{display:flex;flex-direction:column;gap:6px;color:var(--text-2);font-size:11.5px}
        .or-toolbar select,.or-toolbar input,.or-recipient input,.or-message{
          width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:7px;
          background:var(--surface-2);color:var(--text);outline:none;
        }
        .or-toolbar select,.or-toolbar input,.or-recipient input{height:38px;padding:0 11px}
        .or-toolbar select:focus,.or-toolbar input:focus,.or-recipient input:focus,.or-message:focus{border-color:var(--brand-blue);box-shadow:0 0 0 2px var(--accent-soft)}
        .or-toolbar select option{background:var(--surface);color:var(--text)}
        .or-message{min-height:270px;resize:vertical;padding:11px;line-height:1.45;font-family:var(--font-mono);font-size:12px}
        .or-message::placeholder,.or-recipient input::placeholder{color:var(--text-3)}
        .or-client{display:grid;grid-template-columns:1fr auto;gap:12px;padding:12px 0;border-bottom:1px solid var(--divider)}
        .or-client:last-child{border-bottom:0}.or-client strong{display:block}.or-client .meta{line-height:1.45;margin-top:4px}
        .or-distance{font-family:var(--font-mono);color:#22c55e;white-space:nowrap;font-weight:700}
        @media(max-width:980px){.or-grid{grid-template-columns:1fr}.or-toolbar{grid-template-columns:1fr 130px}}
        @media(max-width:640px){.or-toolbar{grid-template-columns:1fr}.or-toolbar .btn{width:100%;justify-content:center}}
      `}</style>

      <div className="page-head">
        <div>
          <h1>Oportunidades de retorno</h1>
          <div className="sub">Clientes que já faturaram conosco próximos ao local onde o veículo ficará vazio</div>
        </div>
        <div className="actions">
          <button className="btn" onClick={downloadTemplate}><Icon name="download"/> Baixar modelo</button>
          <label className="btn" style={{ cursor: "pointer" }}>
            <Icon name="file"/> Importar planilha
            <input type="file" accept=".xlsx,.xls,.csv" onChange={importFile} style={{ display: "none" }}/>
          </label>
        </div>
      </div>

      {(loading || working || error || notice) && (
        <div className="card" style={{ padding: "10px 14px", marginBottom: 14 }}>
          <span className={error ? "kpi-delta down" : notice ? "kpi-delta up" : "muted"}>
            {error || notice || (working ? "Processando..." : "Carregando...")}
          </span>
        </div>
      )}

      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="kpi-label"><Icon name="user"/> Clientes importados</div><div className="kpi-value">{data.clientes?.length || 0}</div><span className="kpi-delta flat">base comercial ativa</span></div>
        <div className="kpi"><div className="kpi-label"><Icon name="truck"/> SMs em viagem</div><div className="kpi-value">{data.sms?.length || 0}</div><span className="kpi-delta flat">Trafegus</span></div>
        <div className="kpi"><div className="kpi-label"><Icon name="map"/> Raio analisado</div><div className="kpi-value">{raioKm} km</div><span className="kpi-delta flat">distancia em linha reta</span></div>
        <div className="kpi"><div className="kpi-label"><Icon name="plug"/> Envio</div><div className="kpi-value" style={{ fontSize: 18 }}>{data.configuracao?.envioHabilitado ? "Habilitado" : "Validação"}</div><span className={`kpi-delta ${data.configuracao?.envioHabilitado ? "up" : "flat"}`}>{data.configuracao?.envioHabilitado ? (data.configuracao?.destinatario || "destinatário pendente") : "nenhuma mensagem será enviada"}</span></div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div className="or-toolbar">
          <label>Veículo / SM
            <select value={smId} onChange={(event) => { setSmId(event.target.value); setAnalysis(null); }}>
              <option value="">Selecione</option>
              {(data.sms || []).map((sm) => <option key={sm.id} value={sm.id}>{sm.placa} · SM {sm.id} · {sm.destino}</option>)}
            </select>
          </label>
          <label>Raio em km<input type="number" min="1" max="1000" value={raioKm} onChange={(event) => setRaioKm(Number(event.target.value) || 200)}/></label>
          <button className="btn primary" onClick={analyze} disabled={working || !smId}><Icon name="search"/> Analisar região</button>
        </div>
      </div>

      <div className="or-grid">
        <div className="card card-flush">
          <div className="card-header">
            <div><h3>Potenciais clientes próximos</h3>{analysis && <span className="meta muted">Veículo vazio em {analysis.destino?.descricao} · raio de {analysis.raioKm} km</span>}</div>
            <span className="meta muted">Top {potentialClients.length} por proximidade</span>
          </div>
          <div style={{ padding: "0 16px" }}>
            {potentialClients.map((client, index) => (
              <div className="or-client" key={client.id}>
                <div>
                  <strong>{index + 1}. {client.nome}</strong>
                  <div className="meta muted">{client.cidade}/{client.uf} · {client.endereco || "Endereco nao informado"}</div>
                  <div className="meta muted">{[client.contato, client.telefone, client.tipoCarga].filter(Boolean).join(" · ") || "Contato/carga nao informados"}</div>
                  {client.quantidadeFretes ? <div className="meta muted">{client.quantidadeFretes} frete(s) · faturamento histórico {Number(client.faturamento || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · último em {client.ultimoFrete ? new Date(client.ultimoFrete).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"}</div> : null}
                  <a href={client.mapsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11.5 }}>Abrir localização</a>
                </div>
                <div className="or-distance">{client.distanciaKm.toFixed(0)} km</div>
              </div>
            ))}
            {!analysis && <div className="muted" style={{ padding: 24 }}>Selecione uma SM e clique em “Analisar região”.</div>}
            {analysis && !potentialClients.length && <div className="muted" style={{ padding: 24 }}>Nenhum cliente com faturamento histórico foi encontrado dentro do raio informado.</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ margin: "-16px -16px 14px" }}>
            <div><h3>Mensagem</h3><span className="meta muted">Revise antes de enviar</span></div>
          </div>
          <label className="or-recipient" style={{ marginBottom: 10 }}>Receber no WhatsApp
            <input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Ex.: 5548999999999"/>
          </label>
          <textarea className="or-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="A mensagem sera montada apos a analise."/>
          <div className="actions" style={{ marginTop: 12, justifyContent: "flex-end" }}>
            <button className="btn" disabled={!message} onClick={() => navigator.clipboard.writeText(message)}><Icon name="copy"/> Copiar</button>
            <button className="btn primary" disabled={!data.configuracao?.envioHabilitado || !analysis || !recipient || !data.configuracao?.n8nConfigurado || working} onClick={sendN8n}><Icon name="whatsapp"/> {data.configuracao?.envioHabilitado ? "Enviar para o comercial" : "Envio bloqueado — validação"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

window.OportunidadesRetorno = OportunidadesRetorno;
