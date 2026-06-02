// Diárias do Motorista — Rodobach
const DiariasMotorista = ({ onNavigate }) => {
  const D = window.NT_DATA;
  const { useState, useEffect } = React;

  const today = new Date().toISOString().slice(0, 10);

  const [tabela,      setTabela]      = useState(() => D.DIARIAS_MOTORISTA);
  const [motorista,   setMotorista]   = useState("");
  const [dataInicial, setDataInicial] = useState(today);
  const [horaInicial, setHoraInicial] = useState("08:00");
  const [dataFinal,   setDataFinal]   = useState(today);
  const [horaFinal,   setHoraFinal]   = useState("18:00");
  const [resultado,   setResultado]   = useState(null);
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    window.RB_API.listDiarias()
      .then((data) => { if (Array.isArray(data) && data.length) setTabela(data); })
      .catch((err) => console.warn("API indisponivel, usando dados locais.", err));
  }, []);

  const getValor = (codigo) => {
    const item = tabela.find(x => x.codigo === codigo);
    return item ? Number(item.valor) : 0;
  };

  const fmtR = (n) => `R$ ${fmtNum(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtData = (str) => {
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
  };

  // Cálculo server-side
  const calcular = async () => {
    setLoading(true);
    setResultado(null);
    try {
      const data = await window.RB_API.calcularDiarias({
        motorista,
        startDate: dataInicial,
        startTime: horaInicial,
        endDate:   dataFinal,
        endTime:   horaFinal,
      });
      // Normaliza items do backend para o formato esperado pela tabela
      const itemsPorData = {};
      for (const item of (data.items || [])) {
        if (!itemsPorData[item.data]) {
          itemsPorData[item.data] = { data: item.data, cafe: 0, almoco: 0, janta: 0, temCafe: false, temAlmoco: false, temJanta: false };
        }
        const cod = item.codigo || "";
        if (cod === "cafe")   { itemsPorData[item.data].cafe   = item.valor; itemsPorData[item.data].temCafe   = true; }
        if (cod === "almoco") { itemsPorData[item.data].almoco = item.valor; itemsPorData[item.data].temAlmoco = true; }
        if (cod === "janta")  { itemsPorData[item.data].janta  = item.valor; itemsPorData[item.data].temJanta  = true; }
      }
      const dias = Object.values(itemsPorData).sort((a, b) => a.data.localeCompare(b.data));
      if (!dias.length && data.total === 0) {
        // Sem refeições mas sem erro — mostra o período vazio
        const start = new Date(`${dataInicial}T00:00:00`);
        const end   = new Date(`${dataFinal}T00:00:00`);
        const cursor = new Date(start);
        while (cursor <= end) {
          dias.push({ data: cursor.toISOString().slice(0, 10), cafe: 0, almoco: 0, janta: 0, temCafe: false, temAlmoco: false, temJanta: false });
          cursor.setDate(cursor.getDate() + 1);
        }
      }
      setResultado({ dias, total: data.total, observacao: data.observacao });
    } catch (err) {
      setResultado({ erro: err.message || "Erro ao calcular diárias." });
    } finally {
      setLoading(false);
    }
  };

  const dias          = resultado?.dias        || [];
  const totalCafe     = dias.filter(d => d.temCafe).length;
  const totalAlmoco   = dias.filter(d => d.temAlmoco).length;
  const totalJanta    = dias.filter(d => d.temJanta).length;
  const itensCount    = totalCafe + totalAlmoco + totalJanta;
  const total         = resultado?.total ?? dias.reduce((s, d) => s + d.cafe + d.almoco + d.janta, 0);
  const observacaoTexto = resultado?.observacao ?? "";

  const fs = {
    height: 34, padding: "0 10px",
    border: "1.5px solid var(--border)", borderRadius: "var(--r)",
    background: "var(--surface)", color: "var(--text)",
    fontSize: 13, outline: "none", boxSizing: "border-box", width: "100%",
  };
  const lbl = {
    display: "block", fontSize: 11, color: "var(--text-2)",
    fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6,
  };

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>Diárias do Motorista</h1>
          <div className="sub">Cálculo de refeições por período de viagem</div>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => onNavigate("simulador")}>
            <Icon name="calculator"/> Calculadora de Frete
          </button>
          <button className="btn" onClick={() => onNavigate("viagens")}>
            <Icon name="route"/> Viagens
          </button>
        </div>
      </div>

      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start"}}>

        {/* ── ESQUERDA: Formulário ── */}
        <div className="card">
          <div style={{fontSize: 13, fontWeight: 600, marginBottom: 4}}>Período da diária</div>
          <div className="muted" style={{fontSize: 12, marginBottom: 20}}>
            A janta conta às 21:00 ou quando bater 11h rodadas no dia
          </div>

          <div style={{marginBottom: 14}}>
            <label style={lbl}>Motorista</label>
            <input style={fs} value={motorista}
              onChange={e => setMotorista(e.target.value)}
              placeholder="Nome do motorista"/>
          </div>

          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20}}>
            <div>
              <label style={lbl}>Data inicial</label>
              <input type="date" style={fs} value={dataInicial}
                onChange={e => setDataInicial(e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Data final</label>
              <input type="date" style={fs} value={dataFinal}
                onChange={e => setDataFinal(e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Hora inicial</label>
              <input type="time" style={fs} value={horaInicial}
                onChange={e => setHoraInicial(e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Hora final</label>
              <input type="time" style={fs} value={horaFinal}
                onChange={e => setHoraFinal(e.target.value)}/>
            </div>
          </div>

          <button className="btn primary" style={{width: "100%", justifyContent: "center"}}
            onClick={calcular} disabled={loading}>
            {loading ? "Calculando…" : "Calcular"}
          </button>

          {/* Tabela de valores de referência */}
          <div style={{marginTop: 20, borderTop: "1px solid var(--divider)", paddingTop: 16}}>
            <div style={{fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 10}}>
              Valores de referência
            </div>
            <div className="col" style={{gap: 6}}>
              {tabela.map(d => (
                <div key={d.codigo}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "7px 12px", background: "var(--bg)", borderRadius: "var(--r)",
                    fontSize: 12.5,
                  }}>
                  <div>
                    <span style={{fontWeight: 500}}>{d.descricao}</span>
                    <span className="muted" style={{fontSize: 11.5, marginLeft: 8}}>{d.horario}</span>
                  </div>
                  <span className="num" style={{fontWeight: 500}}>{fmtR(d.valor)}</span>
                </div>
              ))}
            </div>
            <div className="muted" style={{fontSize: 11.5, marginTop: 10}}>
              A janta é incluída automaticamente quando o motorista está em viagem às 21:00
              ou quando atinge 11h rodadas no dia.
            </div>
          </div>
        </div>

        {/* ── DIREITA: Resultado ── */}
        <div className="card">
          <div style={{fontSize: 13, fontWeight: 600, marginBottom: 16}}>Resultado</div>

          {!resultado && (
            <div style={{textAlign: "center", padding: "48px 0", color: "var(--text-3)"}}>
              <div style={{marginBottom: 12, opacity: 0.4}}>
                <Icon name="clock" size={36}/>
              </div>
              <div style={{fontSize: 13}}>Preencha o período e clique em Calcular</div>
            </div>
          )}

          {resultado?.erro && (
            <div style={{
              padding: "10px 14px", background: "#fef2f2",
              border: "1px solid #fecaca", borderRadius: 8, color: "#b91c1c", fontSize: 13,
            }}>
              {resultado.erro}
            </div>
          )}

          {dias.length > 0 && (
            <>
              <div className="muted" style={{fontSize: 12, marginBottom: 16}}>
                de {fmtData(dataInicial)}, {horaInicial} até {fmtData(dataFinal)}, {horaFinal}
              </div>

              {/* Totalizador */}
              <div style={{marginBottom: 20}}>
                <div className="muted" style={{fontSize: 12, marginBottom: 4}}>Valor da diária</div>
                <div style={{
                  fontSize: 30, fontWeight: 700, letterSpacing: "-0.5px",
                  color: total > 0 ? "var(--text)" : "var(--text-3)",
                }}>
                  {fmtR(total)}
                </div>
                {itensCount > 0 && (
                  <div className="muted" style={{fontSize: 12, marginTop: 4}}>
                    {itensCount} item(ns) calculado(s)
                  </div>
                )}
              </div>

              {/* Tabela por dia */}
              <div style={{overflowX: "auto", marginBottom: 16}}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th className="num">Café</th>
                      <th className="num">Almoço</th>
                      <th className="num">Janta</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dias.map(d => {
                      const dTotal = d.cafe + d.almoco + d.janta;
                      return (
                        <tr key={d.data}>
                          <td>{fmtData(d.data)}</td>
                          <td className="num" style={{color: d.temCafe   ? "var(--text)" : "var(--text-3)"}}>
                            {d.temCafe   ? fmtR(d.cafe)   : "—"}
                          </td>
                          <td className="num" style={{color: d.temAlmoco ? "var(--text)" : "var(--text-3)"}}>
                            {d.temAlmoco ? fmtR(d.almoco) : "—"}
                          </td>
                          <td className="num" style={{color: d.temJanta  ? "var(--text)" : "var(--text-3)"}}>
                            {d.temJanta  ? fmtR(d.janta)  : "—"}
                          </td>
                          <td className="num" style={{fontWeight: 600, color: dTotal > 0 ? "var(--text)" : "var(--text-3)"}}>
                            {dTotal > 0 ? fmtR(dTotal) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Linha de totais */}
                    <tr style={{fontWeight: 700, borderTop: "2px solid var(--border)"}}>
                      <td>Total</td>
                      <td className="num" style={{color: totalCafe   > 0 ? "var(--text)" : "var(--text-3)"}}>
                        {totalCafe   > 0 ? fmtR(totalCafe   * getValor("cafe"))   : "—"}
                      </td>
                      <td className="num" style={{color: totalAlmoco > 0 ? "var(--text)" : "var(--text-3)"}}>
                        {totalAlmoco > 0 ? fmtR(totalAlmoco * getValor("almoco")) : "—"}
                      </td>
                      <td className="num" style={{color: totalJanta  > 0 ? "var(--text)" : "var(--text-3)"}}>
                        {totalJanta  > 0 ? fmtR(totalJanta  * getValor("janta"))  : "—"}
                      </td>
                      <td className="num" style={{color: "var(--brand-blue)"}}>
                        {fmtR(total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Observação para copiar */}
              {observacaoTexto && (
                <div style={{background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14}}>
                  <div style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
                    textTransform: "uppercase", color: "var(--text-2)", marginBottom: 8,
                  }}>
                    Observação para enviar
                  </div>
                  <div style={{fontSize: 12.5, color: "var(--text)", marginBottom: 12, lineHeight: 1.6, whiteSpace: "pre-line"}}>
                    {observacaoTexto}
                  </div>
                  <button className="btn" style={{width: "100%", justifyContent: "center", fontSize: 12}}
                    onClick={() => navigator.clipboard?.writeText(observacaoTexto).catch(() => {})}>
                    <Icon name="copy" size={13}/> Copiar observação
                  </button>
                </div>
              )}

              {total === 0 && dias.length > 0 && (
                <div className="muted" style={{fontSize: 13, textAlign: "center", padding: "20px 0"}}>
                  Nenhuma refeição se aplica ao período informado.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

window.DiariasMotorista = DiariasMotorista;
