import { consolidateNfes, parseNfeXml } from "../xml-nfe.js";

const ConsultaCte = () => {
  const [modo, setModo] = React.useState("consulta");
  const [tipo, setTipo] = React.useState("nf");
  const [numero, setNumero] = React.useState("");
  const [serie, setSerie] = React.useState("1");
  const [fornecedor, setFornecedor] = React.useState("");
  const [frete, setFrete] = React.useState("");
  const [resultados, setResultados] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [searched, setSearched] = React.useState(false);
  const [notasXml, setNotasXml] = React.useState([]);
  const [errosXml, setErrosXml] = React.useState([]);
  const [lendoXml, setLendoXml] = React.useState(false);
  const [freteXml, setFreteXml] = React.useState("");
  const [ratearFreteXml, setRatearFreteXml] = React.useState(false);

  const numberValue = (value) => {
    const text = String(value || "").trim();
    const normalized = text.includes(",")
      ? text.replace(/\./g, "").replace(",", ".")
      : text;
    const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const money = (value) =>
    Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" })
      : "—";
  const decimal = (value, digits = 3) =>
    Number(value || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

  const resumoXml = consolidateNfes(notasXml);
  const freteXmlTotal = numberValue(freteXml);
  const notasXmlRateadas = (() => {
    const totalCentavos = Math.round(freteXmlTotal * 100);
    const notasComPeso = notasXml.filter((note) => Number(note.pesoConsiderado || 0) > 0);
    let distribuidoCentavos = 0;
    return notasXml.map((note) => {
      const peso = Number(note.pesoConsiderado || 0);
      const indiceComPeso = notasComPeso.indexOf(note);
      let centavos = 0;
      if (ratearFreteXml && resumoXml.pesoTotal > 0 && peso > 0) {
        centavos = indiceComPeso === notasComPeso.length - 1
          ? totalCentavos - distribuidoCentavos
          : Math.round((totalCentavos * peso) / resumoXml.pesoTotal);
        distribuidoCentavos += centavos;
      }
      return {
        ...note,
        percentualPeso: resumoXml.pesoTotal > 0 ? (peso / resumoXml.pesoTotal) * 100 : 0,
        freteRateado: centavos / 100,
      };
    });
  })();
  const gruposXml = (() => {
    const grupos = new Map();
    notasXmlRateadas.forEach((note) => {
      const key = note.tomadorCteDocumento || note.tomadorCte || `tomador-a-confirmar-${note.chave || note.arquivo}`;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key).push(note);
    });
    return Array.from(grupos.entries()).map(([key, notes]) => ({
      key,
      cliente: notes[0].tomadorCte || "Tomador a confirmar no CT-e",
      documento: notes[0].tomadorCteDocumento || "",
      tomadorConhecido: notes.every((note) => note.tomadorConhecido),
      notes,
      resumo: consolidateNfes(notes),
      freteRateado: notes.reduce((sum, note) => sum + note.freteRateado, 0),
    }));
  })();

  const importarXmls = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setLendoXml(true);
    setErrosXml([]);
    try {
      const settled = await Promise.all(
        files.map(async (file) => {
          try {
            return { note: parseNfeXml(await file.text(), file.name) };
          } catch (xmlError) {
            return { error: `${file.name}: ${xmlError.message}` };
          }
        }),
      );
      setErrosXml(settled.flatMap((item) => (item.error ? [item.error] : [])));
      const imported = settled.flatMap((item) => (item.note ? [item.note] : []));
      setNotasXml((current) => {
        const unique = new Map();
        [...current, ...imported].forEach((note) => {
          const key = note.chave || `${note.emitente}|${note.serie}|${note.numero}|${note.arquivo}`;
          unique.set(key, note);
        });
        return Array.from(unique.values());
      });
    } finally {
      event.target.value = "";
      setLendoXml(false);
    }
  };

  const pesoTotal = resultados.reduce(
    (sum, item) => sum + Number(item.pesoNota || 0),
    0,
  );
  const freteTotal = numberValue(frete);
  const freteCentavos = Math.round(freteTotal * 100);
  let distribuido = 0;
  const rateados = resultados.map((item, index) => {
    const pesoNota = Number(item.pesoNota || 0);
    const centavos =
      pesoTotal <= 0
        ? 0
        : index === resultados.length - 1
          ? freteCentavos - distribuido
          : Math.round((freteCentavos * pesoNota) / pesoTotal);
    distribuido += centavos;
    return {
      ...item,
      percentual: pesoTotal > 0 ? (pesoNota / pesoTotal) * 100 : 0,
      freteRateado: centavos / 100,
    };
  });

  const consultar = async (event) => {
    event?.preventDefault();
    const cleanNumero = numero.replace(/\D/g, "");
    if (!cleanNumero) return setError("Informe o número da consulta.");
    if (tipo === "nf" && !serie.trim())
      return setError("Informe a série da nota fiscal.");
    setLoading(true);
    setError("");
    setSearched(false);
    setResultados([]);
    try {
      const data = await window.RB_API.consultarNcmRateio({
        tipo,
        numero: cleanNumero,
        serie: serie.trim(),
        fornecedor: fornecedor.trim(),
      });
      setResultados(Array.isArray(data?.resultados) ? data.resultados : []);
      setSearched(true);
    } catch (requestError) {
      setError(
        requestError?.message || "Não foi possível realizar a consulta.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = {
    height: 40,
    width: "100%",
    padding: "0 11px",
    color: "var(--text)",
    background: "var(--surface-2)",
    border: "1px solid var(--border-strong)",
    borderRadius: 7,
    outline: "none",
  };

  return (
    <div className="view consulta-nfe-view">
      <div className="page-head">
        <div>
          <h1>NF / NCM e cálculo por peso</h1>
          <div className="sub">
            Consulte o ERP ou analise vários XMLs de NF-e de uma só vez
          </div>
        </div>
      </div>

      <div className="ncm-mode-tabs">
        <button type="button" className={`btn${modo === "consulta" ? " primary" : ""}`} onClick={() => setModo("consulta")}>
          <Icon name="search" size={13} /> Consultar ERP
        </button>
        <button type="button" className={`btn${modo === "xml" ? " primary" : ""}`} onClick={() => setModo("xml")}>
          <Icon name="file" size={13} /> Importar XMLs
        </button>
      </div>

      {modo === "consulta" && <form className="card" onSubmit={consultar} style={{ padding: 18 }}>
        <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
          {[
            ["nf", "Buscar por nota fiscal"],
            ["cte", "Buscar por CT-e"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn${tipo === key ? " primary" : ""}`}
              onClick={() => setTipo(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ncm-query-grid">
          <label>
            <span>{tipo === "nf" ? "Número da NF" : "Número do CT-e"}</span>
            <input
              autoFocus
              inputMode="numeric"
              value={numero}
              onChange={(event) =>
                setNumero(event.target.value.replace(/\D/g, ""))
              }
              placeholder={tipo === "nf" ? "Ex.: 718685" : "Ex.: 4347"}
              style={fieldStyle}
            />
          </label>
          <label>
            <span>Série {tipo === "cte" && "(opcional)"}</span>
            <input
              value={serie}
              onChange={(event) => setSerie(event.target.value)}
              style={fieldStyle}
            />
          </label>
          {tipo === "nf" && (
            <label>
              <span>Fornecedor (opcional)</span>
              <input
                value={fornecedor}
                onChange={(event) => setFornecedor(event.target.value)}
                placeholder="Nome ou CNPJ"
                style={fieldStyle}
              />
            </label>
          )}
          <label>
            <span>Frete total (R$)</span>
            <input
              inputMode="decimal"
              value={frete}
              onChange={(event) => setFrete(event.target.value)}
              placeholder="0,00"
              style={fieldStyle}
            />
          </label>
          <button
            className="btn primary"
            disabled={loading}
            style={{ height: 40 }}
          >
            <Icon name="search" size={13} />
            {loading ? "Consultando..." : "Consultar"}
          </button>
        </div>
      </form>}

      {modo === "consulta" && error && <div className="card ncm-error">{error}</div>}
      {modo === "consulta" && searched && !resultados.length && (
        <div className="card muted ncm-empty">
          Nenhuma nota encontrada com os dados informados.
        </div>
      )}

      {modo === "consulta" && !!resultados.length && (
        <div className="card ncm-results">
          <div className="ncm-summary">
            <div>
              <span>Notas encontradas</span>
              <strong>{resultados.length}</strong>
            </div>
            <div>
              <span>Peso total das notas</span>
              <strong>
                {pesoTotal.toLocaleString("pt-BR", {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}{" "}
                kg
              </strong>
            </div>
            <div>
              <span>Frete para ratear</span>
              <strong>{money(freteTotal)}</strong>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table ncm-table">
              <thead>
                <tr>
                  <th>Nota fiscal</th>
                  <th>Fornecedor</th>
                  <th>CT-e</th>
                  <th>NCM predominante</th>
                  <th>Emissão</th>
                  <th className="num">Valor da nota</th>
                  <th className="num">Peso da nota</th>
                  <th className="num">Proporção</th>
                  <th className="num">Frete rateado</th>
                </tr>
              </thead>
              <tbody>
                {rateados.map((item, index) => (
                  <tr
                    key={
                      item.chaveNfe ||
                      `${item.empresa}-${item.serieNota}-${item.numeroNota}-${index}`
                    }
                  >
                    <td>
                      <strong>NF {item.numeroNota}</strong>
                      <div className="muted">Série {item.serieNota || "—"}</div>
                    </td>
                    <td>
                      {item.fornecedor || "—"}
                      <div className="muted">{item.origem}</div>
                    </td>
                    <td>
                      {item.numeroCte
                        ? `${item.serieCte || ""}-${item.numeroCte}`
                        : "—"}
                    </td>
                    <td>
                      <strong className="ncm-code">
                        {item.ncmPredominante || "Não informado"}
                      </strong>
                    </td>
                    <td>{formatDate(item.dataEmissao)}</td>
                    <td className="num">{money(item.valorNota)}</td>
                    <td className="num">
                      {Number(item.pesoNota || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{" "}
                      kg
                    </td>
                    <td className="num">
                      {item.percentual.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      %
                    </td>
                    <td className="num ncm-rate">
                      <strong>{money(item.freteRateado)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pesoTotal <= 0 && (
            <div className="ncm-warning">
              Não foi possível ratear porque as notas não possuem peso no ERP.
            </div>
          )}
        </div>
      )}

      {modo === "xml" && (
        <>
          <div className="card xml-upload-card">
            <div>
              <strong>Selecione os XMLs de NF-e</strong>
              <div className="muted">Aceita vários arquivos. O processamento acontece localmente no navegador.</div>
            </div>
            <label className="btn primary xml-file-button">
              <Icon name="file" size={14} /> {lendoXml ? "Lendo arquivos..." : "Escolher XMLs"}
              <input type="file" accept=".xml,text/xml,application/xml" multiple disabled={lendoXml} onChange={importarXmls} />
            </label>
            {!!notasXml.length && (
              <button type="button" className="btn" onClick={() => { setNotasXml([]); setErrosXml([]); }}>Limpar análise</button>
            )}
          </div>

          {!!notasXml.length && (
            <div className="card xml-freight-card">
              <label className="xml-rate-toggle">
                <input type="checkbox" checked={ratearFreteXml} onChange={(event) => setRatearFreteXml(event.target.checked)} />
                <span><strong>Ratear o valor do frete pelo peso</strong><small>Distribui o frete proporcionalmente ao peso considerado de cada NF-e.</small></span>
              </label>
              <label className="xml-freight-value">
                <span>Valor total do frete (R$)</span>
                <input inputMode="decimal" value={freteXml} onChange={(event) => setFreteXml(event.target.value)} placeholder="0,00" disabled={!ratearFreteXml} />
              </label>
            </div>
          )}

          {!!errosXml.length && (
            <div className="card ncm-error">
              <strong>{errosXml.length} arquivo(s) não processado(s)</strong>
              {errosXml.map((message) => <div key={message}>{message}</div>)}
            </div>
          )}

          {!notasXml.length && !errosXml.length && (
            <div className="card muted ncm-empty">Nenhum XML importado. Selecione uma ou várias NF-e para iniciar a análise.</div>
          )}

          {!!notasXml.length && (
            <>
            <div className="card ncm-results">
              <div className="ncm-summary xml-summary">
                <div><span>Notas válidas</span><strong>{resumoXml.quantidadeNotas}</strong></div>
                <div><span>NCM predominante por valor</span><strong className="ncm-code">{resumoXml.ncmPredominante || "Não informado"}</strong></div>
                <div><span>Valor total</span><strong>{money(resumoXml.valorTotal)}</strong></div>
                <div><span>Peso total</span><strong>{decimal(resumoXml.pesoTotal)} kg</strong></div>
                <div><span>Valor por peso</span><strong>{resumoXml.valorPorKg == null ? "Sem peso" : `${money(resumoXml.valorPorKg)} / kg`}</strong></div>
                {ratearFreteXml && <div><span>Frete para ratear</span><strong>{money(freteXmlTotal)}</strong></div>}
              </div>
              <div className="xml-method-note">O NCM predominante é o que soma o maior valor de produtos. Para o peso, usamos o peso bruto; quando ausente, usamos o líquido.</div>
            </div>
            {gruposXml.map((grupo) => (
              <div className="card ncm-results xml-client-block" key={grupo.key}>
                <div className="xml-client-head">
                  <div><span>Cliente / tomador do CT-e</span><strong>{grupo.cliente}</strong>{grupo.documento && <small>{grupo.documento}</small>}{!grupo.tomadorConhecido && <small>O XML da NF-e não identifica o tomador para esta modalidade de frete.</small>}</div>
                  <div><span>{grupo.notes.length} NF-e · {decimal(grupo.resumo.pesoTotal)} kg</span>{ratearFreteXml && <strong>{money(grupo.freteRateado)} de frete</strong>}</div>
                </div>
                <div style={{ overflowX: "auto" }}>
                <table className="data-table ncm-table">
                  <thead><tr><th>Arquivo / NF-e</th><th>Emitente</th><th>NCM predominante</th><th className="num">Valor</th><th className="num">Peso considerado</th>{ratearFreteXml && <><th className="num">Proporção</th><th className="num">Frete rateado</th></>}<th className="num">Valor por kg</th></tr></thead>
                  <tbody>
                    {grupo.notes.map((note) => {
                      const noteSummary = consolidateNfes([note]);
                      return (
                        <tr key={note.chave || note.arquivo}>
                          <td><strong>NF {note.numero || "—"}</strong><div className="muted">Série {note.serie || "—"} · {note.arquivo}</div></td>
                          <td>{note.emitente || "Não informado"}</td>
                          <td><strong className="ncm-code">{noteSummary.ncmPredominante || "Não informado"}</strong></td>
                          <td className="num">{money(note.valorNota)}</td>
                          <td className="num">{decimal(note.pesoConsiderado)} kg<div className="muted">{note.pesoBruto ? "peso bruto" : note.pesoLiquido ? "peso líquido" : "não informado"}</div></td>
                          {ratearFreteXml && <><td className="num">{decimal(note.percentualPeso, 2)}%</td><td className="num ncm-rate"><strong>{money(note.freteRateado)}</strong></td></>}
                          <td className="num ncm-rate"><strong>{noteSummary.valorPorKg == null ? "—" : `${money(noteSummary.valorPorKg)} / kg`}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
                {grupo.resumo.pesoTotal <= 0 && <div className="ncm-warning">As NF-e deste cliente não informam peso bruto nem líquido.</div>}
                {!!grupo.resumo.ncms.length && (
                <div className="xml-ncm-ranking">
                  <strong>Composição por NCM</strong>
                  {grupo.resumo.ncms.map((item, index) => (
                    <div key={item.ncm} className="xml-ncm-row">
                      <span>{index + 1}. <span className="ncm-code">{item.ncm}</span></span>
                      <span>{money(item.valorProdutos)} · {item.itens} item(ns)</span>
                    </div>
                  ))}
                </div>
              )}
              </div>
            ))}
            </>
          )}
        </>
      )}
    </div>
  );
};

window.ConsultaCte = ConsultaCte;
