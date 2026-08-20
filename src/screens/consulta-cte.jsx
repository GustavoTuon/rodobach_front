const ConsultaCte = () => {
  const [tipo, setTipo] = React.useState("nf");
  const [numero, setNumero] = React.useState("");
  const [serie, setSerie] = React.useState("1");
  const [fornecedor, setFornecedor] = React.useState("");
  const [frete, setFrete] = React.useState("");
  const [resultados, setResultados] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [searched, setSearched] = React.useState(false);

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
          <h1>Consulta de NF / NCM e rateio</h1>
          <div className="sub">
            Consulte uma nota ou CT-e e distribua o frete proporcionalmente
          </div>
        </div>
      </div>

      <form className="card" onSubmit={consultar} style={{ padding: 18 }}>
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
      </form>

      {error && <div className="card ncm-error">{error}</div>}
      {searched && !resultados.length && (
        <div className="card muted ncm-empty">
          Nenhuma nota encontrada com os dados informados.
        </div>
      )}

      {!!resultados.length && (
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
    </div>
  );
};

window.ConsultaCte = ConsultaCte;
