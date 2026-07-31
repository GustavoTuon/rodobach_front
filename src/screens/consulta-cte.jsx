const ConsultaCte = () => {
  const [nota, setNota] = React.useState("");
  const [serie, setSerie] = React.useState("");
  const [resultados, setResultados] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [searched, setSearched] = React.useState(false);
  const [copied, setCopied] = React.useState("");

  const consultar = async (event) => {
    event?.preventDefault();
    const numero = nota.replace(/\D/g, "");
    if (!numero || !serie.trim()) return setError("Informe o numero e a serie da nota fiscal.");
    setLoading(true); setError(""); setSearched(false); setResultados([]);
    try {
      const data = await window.RB_API.consultarNfeIbrap(numero, serie.trim());
      setResultados(data?.resultados || []);
      setSearched(true);
    } catch (requestError) {
      setError(requestError?.message || "Nao foi possivel consultar o CT-e.");
    } finally { setLoading(false); }
  };

  const copiar = async (chave) => {
    await navigator.clipboard.writeText(chave);
    setCopied(chave);
    window.setTimeout(() => setCopied(""), 1800);
  };

  const formatDate = (value) => value
    ? new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" })
    : "-";

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>Consultar chave da NF-e</h1>
          <div className="sub">IBRAP / ESAF · Todas as unidades cadastradas</div>
        </div>
      </div>

      <div className="card" style={{maxWidth:860,margin:"24px auto",padding:28}}>
        <div style={{maxWidth:620,margin:"0 auto",textAlign:"center"}}>
          <div style={{width:54,height:54,borderRadius:14,background:"var(--primary-soft)",color:"var(--primary)",display:"grid",placeItems:"center",margin:"0 auto 14px"}}>
            <Icon name="search"/>
          </div>
          <h2 style={{margin:"0 0 7px"}}>Localize a chave da nota fiscal</h2>
          <p className="muted" style={{margin:"0 0 22px"}}>Digite o numero e a serie impressos na NF-e.</p>
          <form onSubmit={consultar} style={{display:"flex",gap:10}}>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Numero da nota (ex.: 15342)"
              style={{
                flex:1,
                fontSize:16,
                padding:"12px 14px",
                background:"var(--surface-2)",
                color:"var(--text)",
                border:"1px solid var(--border-strong)",
                borderRadius:8,
                outline:"none",
                caretColor:"var(--primary)",
              }}
            />
            <input type="text" inputMode="numeric" value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="Serie (ex.: 6)" style={{width:145,fontSize:16,padding:"12px 14px",background:"var(--surface-2)",color:"var(--text)",border:"1px solid var(--border-strong)",borderRadius:8,outline:"none",caretColor:"var(--primary)"}} />
            <button className="btn primary" disabled={loading || !nota || !serie} style={{padding:"0 22px"}}>
              <Icon name="search"/>{loading ? " Consultando..." : " Consultar"}
            </button>
          </form>
        </div>

        {error && <div style={{marginTop:20,padding:12,borderRadius:8,color:"var(--crit)",background:"var(--crit-bg)",border:"1px solid var(--crit-border)"}}>{error}</div>}
        {searched && !resultados.length && <div className="muted" style={{marginTop:24,textAlign:"center",padding:24}}>Nenhuma NF-e com chave foi encontrada para este numero e serie da IBRAP/ESAF.</div>}

        {!!resultados.length && <div style={{marginTop:28,display:"grid",gap:12}}>
          {resultados.map((row) => <div key={`${row.empresa}-${row.serie}-${row.numeroCte}-${row.numeroNota}-${row.chaveNfe}`} style={{border:"1px solid var(--divider)",borderRadius:10,padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
              <div><strong>NF-e {row.numeroNota}</strong><div className="muted" style={{fontSize:12}}>Serie {row.serieNota} · Emitida em {formatDate(row.dataEmissao)}</div></div>
              <span className="badge ok">Chave encontrada</span>
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <code style={{flex:1,minWidth:280,padding:"12px 14px",borderRadius:8,background:"var(--bg)",border:"1px solid var(--divider)",fontSize:14,wordBreak:"break-all"}}>{row.chaveNfe}</code>
              <button className="btn primary" onClick={() => copiar(row.chaveNfe)}><Icon name="copy"/>{copied === row.chaveNfe ? " Copiada!" : " Copiar chave"}</button>
            </div>
          </div>)}
        </div>}
      </div>
    </div>
  );
};

window.ConsultaCte = ConsultaCte;
