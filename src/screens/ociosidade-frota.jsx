const { useEffect: useEffectOciosidade, useState: useStateOciosidade } = React;

const ofToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
const ofDaysAgo = (days) => {
  const date = new Date(`${ofToday()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
};
const ofNumber = (value, digits = 1) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(
    Number(value || 0),
  );
const ofDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(value))
    : "Em aberto";
const ofDuration = (hours) => {
  const total = Math.max(0, Math.round(Number(hours || 0) * 60));
  const days = Math.floor(total / 1440);
  const hrs = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  return [days ? `${days}d` : "", hrs ? `${hrs}h` : "", `${mins}min`]
    .filter(Boolean)
    .join(" ");
};

function OfKpi({ label, value, sub, tone }) {
  return (
    <div
      className="card"
      style={{ padding: 17, borderLeft: `4px solid ${tone}`, minHeight: 104 }}
    >
      <div
        className="muted"
        style={{
          fontSize: 10,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          fontWeight: 750,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          marginTop: 6,
          letterSpacing: "-.02em",
        }}
      >
        {value}
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 5 }}>
        {sub}
      </div>
    </div>
  );
}

const OciosidadeFrota = ({ onNavigate }) => {
  const [startDate, setStartDate] = useStateOciosidade(ofDaysAgo(29));
  const [endDate, setEndDate] = useStateOciosidade(ofToday());
  const [placa, setPlaca] = useStateOciosidade("");
  const [data, setData] = useStateOciosidade({
    summary: {},
    rows: [],
    filters: { placas: [] },
  });
  const [loading, setLoading] = useStateOciosidade(true);
  const [error, setError] = useStateOciosidade("");
  const [selected, setSelected] = useStateOciosidade(null);

  const load = async (overrides = {}) => {
    setLoading(true);
    setError("");
    try {
      setData(await window.RB_API.getOciosidadeFrota({
        startDate: overrides.startDate || startDate,
        endDate: overrides.endDate || endDate,
        placa: overrides.placa === undefined ? placa : overrides.placa,
      }));
    } catch (err) {
      setError(err.message || "Não foi possível calcular a ociosidade.");
    } finally {
      setLoading(false);
    }
  };
  useEffectOciosidade(() => {
    load();
  }, []);
  const summary = data.summary || {};
  const movingEmptyHours = Math.max(
    0,
    Number(summary.horasVazio || 0) - Number(summary.horasParadoVazio || 0),
  );
  const classifiedKm =
    Number(summary.kmCarregado || 0) +
    Number(summary.kmVazio || 0) +
    Number(summary.kmVazioConfirmado || 0);
  const classifiedPercent = summary.kmTotal
    ? Math.min(100, Math.round((classifiedKm / summary.kmTotal) * 100))
    : 0;
  const emptyPercent = Number(summary.percentualKmVazio || 0);
  const quality = data.qualidade || {};
  const quickPeriod = (start, end = ofToday()) => {
    setStartDate(start); setEndDate(end); load({ startDate: start, endDate: end });
  };

  return (
    <div className="page-content of-page">
      <style>{`
      .of-page{width:100%;height:100%;min-height:0;box-sizing:border-box;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;padding:20px clamp(16px,2vw,32px) 56px;max-width:1720px;margin:0 auto}
      .of-filters{display:grid;grid-template-columns:150px 150px minmax(150px,220px) auto 1fr;gap:12px;align-items:end}
      .of-filters label{display:grid;gap:6px;color:var(--muted);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
      .of-filters input,.of-filters select{width:100%;height:40px;box-sizing:border-box;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);padding:0 11px;color-scheme:dark}
      .of-quick{display:flex;gap:6px;justify-content:flex-end;align-items:center;flex-wrap:wrap}.of-quick .btn{padding:9px 11px;white-space:nowrap}
      .of-two{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:14px;margin-bottom:14px}
      .of-page .table-wrap{overflow:auto;max-width:100%}.of-page .tbl{min-width:1080px}
      @media(max-width:1100px){.of-filters{grid-template-columns:repeat(3,1fr)}.of-quick{grid-column:1/-1;justify-content:flex-start}.of-page .grid.cols-4{grid-template-columns:repeat(2,minmax(0,1fr))}.of-two{grid-template-columns:1fr}}
      @media(max-width:650px){.of-page{padding:14px 12px 44px}.of-filters{grid-template-columns:1fr 1fr}.of-filters label:nth-child(3){grid-column:1/-1}.of-page .grid.cols-4{grid-template-columns:1fr}.of-quick{overflow-x:auto;flex-wrap:nowrap}.of-two{grid-template-columns:1fr}}
    `}</style>
      <div className="page-header">
        <div>
          <button
            className="btn"
            onClick={() => onNavigate("status-carga")}
            style={{ marginBottom: 10 }}
          >
            ← Status de carga
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <h1 style={{ margin: 0 }}>Ociosidade da frota</h1>
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                background: "#dcfce7",
                color: "#166534",
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              SM + TELEMETRIA
            </span>
          </div>
          <p>
            Conciliação do odômetro com períodos carregados, vazios e parados.
          </p>
        </div>
      </div>
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div className="of-filters">
          <label>
            Data inicial
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label>
            Data final
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={ofToday()}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <label>
            Veículo
            <select value={placa} onChange={(e) => setPlaca(e.target.value)}>
              <option value="">Toda a frota</option>
              {(data.filters?.placas || []).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <button
            className="btn primary"
            onClick={load}
            disabled={loading}
            style={{ height: 40, minWidth: 118 }}
          >
            {loading ? "Consultando..." : "Aplicar filtros"}
          </button>
          <div className="of-quick">
            <span className="muted" style={{ fontSize: 10 }}>
              PERÍODO RÁPIDO
            </span>
            <button
              className="btn"
              onClick={() => quickPeriod(ofDaysAgo(6))}
            >
              7 dias
            </button>
            <button
              className="btn"
              onClick={() => quickPeriod(ofDaysAgo(29))}
            >
              30 dias
            </button>
            <button
              className="btn"
              onClick={() => {
                const today = ofToday();
                quickPeriod(`${today.slice(0, 8)}01`, today);
              }}
            >
              Este mês
            </button>
          </div>
        </div>
      </div>
      {error && (
        <div
          className="card"
          style={{ padding: 14, marginBottom: 14, color: "#b91c1c" }}
        >
          {error}
        </div>
      )}
      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <OfKpi
          label="KM total real"
          value={`${ofNumber(summary.kmTotal, 0)} km`}
          sub="Variação do odômetro válido"
          tone="#64748b"
        />
        <OfKpi
          label="KM vazio"
          value={`${ofNumber(Number(summary.kmVazio || 0) + Number(summary.kmVazioConfirmado || 0), 0)} km`}
          sub="Confirmado + inferido entre SMs"
          tone="#2563eb"
        />
        <OfKpi
          label="Percentual de KM vazio"
          value={`${ofNumber(emptyPercent, 1)}%`}
          sub="Sobre a distância total analisada"
          tone={emptyPercent >= 20 ? "#dc2626" : "#d97706"}
        />
        <OfKpi
          label="Parado em condição vazia"
          value={ofDuration(summary.horasParadoVazio)}
          sub="Telemetria abaixo de 5 km/h"
          tone="#dc2626"
        />
      </div>
      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <OfKpi
          label="Percentual parado"
          value={`${summary.percentualParado || 0}%`}
          sub="Do tempo total vazio"
          tone="#dc2626"
        />
        <OfKpi
          label="Tempo vazio total"
          value={ofDuration(summary.horasVazio)}
          sub={`${summary.veiculos || 0} caminhões analisados`}
          tone="#7c3aed"
        />
        <OfKpi
          label="Em movimento vazio"
          value={ofDuration(movingEmptyHours)}
          sub="Tempo vazio menos tempo parado"
          tone="#0891b2"
        />
        <OfKpi
          label="KM não classificado"
          value={`${ofNumber(summary.kmNaoClassificado, 0)} km`}
          sub="Requer conferência operacional"
          tone="#64748b"
        />
      </div>
      <div className="of-two">
        <div className="card" style={{ padding: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>Utilização dos quilômetros</h3>
              <span className="muted" style={{ fontSize: 11 }}>
                {ofNumber(summary.kmTotal, 0)} km analisados
              </span>
            </div>
            <b>{classifiedPercent}% classificados</b>
          </div>
          <div
            style={{
              height: 18,
              borderRadius: 999,
              overflow: "hidden",
              display: "flex",
              background: "#cbd5e1",
            }}
          >
            <div
              style={{
                width: `${summary.kmTotal ? (summary.kmCarregado / summary.kmTotal) * 100 : 0}%`,
                background: "#16a34a",
              }}
            />
            <div style={{ width: `${emptyPercent}%`, background: "#2563eb" }} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 10,
              marginTop: 14,
            }}
          >
            <div>
              <span style={{ color: "#16a34a" }}>●</span> <b>Carregado</b>
              <div>{ofNumber(summary.kmCarregado, 0)} km</div>
            </div>
            <div>
              <span style={{ color: "#2563eb" }}>●</span> <b>Vazio</b>
              <div>
                {ofNumber(
                  Number(summary.kmVazio || 0) +
                    Number(summary.kmVazioConfirmado || 0),
                  0,
                )}{" "}
                km
              </div>
            </div>
            <div>
              <span className="muted">●</span> <b>Não classificado</b>
              <div>{ofNumber(summary.kmNaoClassificado, 0)} km</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div
            className="muted"
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Qualidade da análise
          </div>
          <div style={{ fontSize: 38, fontWeight: 850, marginTop: 6 }}>
            {quality.score || 0}
            <small style={{ fontSize: 15 }}>/100</small>
          </div>
          <div
            style={{
              fontWeight: 800,
              color: (quality.score || 0) >= 75 ? "#16a34a" : "#d97706",
            }}
          >
            {quality.nivel || "Calculando"}
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 12 }}>
            {summary.coberturaPercentual || 0}% cobertura média
            <br />
            {classifiedPercent}% dos quilômetros classificados
            <br />
            {summary.intervalos || 0} intervalos analisados
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: 18, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 14px" }}>Pontos de atenção</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
            gap: 10,
          }}
        >
          {(data.insights || []).map((item, index) => (
            <div
              key={index}
              style={{
                padding: 12,
                borderRadius: 9,
                background:
                  item.nivel === "critico"
                    ? "rgba(239,68,68,.10)"
                    : item.nivel === "ok"
                      ? "rgba(34,197,94,.10)"
                      : "rgba(245,158,11,.10)",
                border: `1px solid ${item.nivel === "critico" ? "rgba(239,68,68,.35)" : item.nivel === "ok" ? "rgba(34,197,94,.35)" : "rgba(245,158,11,.35)"}`,
                color:
                  item.nivel === "critico"
                    ? "#fca5a5"
                    : item.nivel === "ok"
                      ? "#86efac"
                      : "#fcd34d",
              }}
            >
              <b>
                {item.nivel === "critico"
                  ? "● "
                  : item.nivel === "ok"
                    ? "✓ "
                    : "▲ "}
                {item.titulo}
              </b>
              <div style={{ fontSize: 12, marginTop: 4, color: "inherit", opacity: 0.88 }}>
                {item.texto}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card card-flush" style={{ marginBottom: 14 }}>
        <div className="card-header">
          <div>
            <h3 style={{ marginBottom: 2 }}>
              Veículos que precisam de atenção
            </h3>
            <div className="muted" style={{ fontSize: 11 }}>
              Ordenado pelo maior número de quilômetros vazios
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table tbl">
            <thead>
              <tr>
                <th>Placa</th>
                <th className="num">KM total</th>
                <th className="num">KM vazio</th>
                <th className="num">% vazio</th>
                <th className="num">Tempo parado</th>
                <th className="num">% parado</th>
                <th className="num">Não classificado</th>
                <th>Qualidade</th>
              </tr>
            </thead>
            <tbody>
              {(data.ranking || []).map((row) => (
                <tr key={row.placa}>
                  <td>
                    <Plate value={row.placa} />
                  </td>
                  <td className="num">{ofNumber(row.kmTotal, 0)} km</td>
                  <td className="num">
                    <b style={{ color: "#2563eb" }}>
                      {ofNumber(row.kmVazio, 0)} km
                    </b>
                  </td>
                  <td className="num">
                    <b>{ofNumber(row.percentualVazio, 1)}%</b>
                  </td>
                  <td className="num">{ofDuration(row.horasParadoVazio)}</td>
                  <td className="num">{row.percentualParado}%</td>
                  <td className="num">
                    {ofNumber(row.kmNaoClassificado, 0)} km
                  </td>
                  <td>
                    {row.coberturaPercentual >= 80
                      ? "Alta"
                      : row.coberturaPercentual >= 50
                        ? "Média"
                        : "Baixa"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card card-flush">
        <div className="card-header">
          <div>
            <h3 style={{ marginBottom: 2 }}>Intervalos entre SMs</h3>
            <div className="muted" style={{ fontSize: 11 }}>
              Do encerramento de uma operação ao início da seguinte
            </div>
          </div>
          <span className="meta muted">{data.rows?.length || 0} períodos</span>
        </div>
        <div className="table-wrap">
          <table className="data-table tbl">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Operação encerrada</th>
                <th>Início do vazio</th>
                <th>Próxima operação</th>
                <th className="num">Tempo total</th>
                <th className="num">Tempo parado</th>
                <th className="num">KM vazio</th>
                <th>Qualidade</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(data.rows || []).map((row) => {
                const stoppedPercent = row.horasVazio
                  ? Math.round((row.horasParadoVazio / row.horasVazio) * 100)
                  : 0;
                return (
                  <tr key={`${row.placa}-${row.id}`}>
                    <td>
                      <Plate value={row.placa} />
                    </td>
                    <td>
                      <b>{row.documento || "-"}</b>
                      <div
                        className="muted"
                        style={{ fontSize: 11, maxWidth: 220 }}
                      >
                        {row.destino || row.cliente || "Destino não informado"}
                      </div>
                    </td>
                    <td>{ofDateTime(row.inicio)}</td>
                    <td>
                      {row.proximaOperacaoAt ? (
                        <>
                          <b>{row.proximoDocumento || "Nova operação"}</b>
                          <div className="muted" style={{ fontSize: 11 }}>
                            {ofDateTime(row.fim)}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "#d97706", fontWeight: 700 }}>
                          Ainda vazio
                        </span>
                      )}
                    </td>
                    <td className="num">
                      <b>{ofDuration(row.horasVazio)}</b>
                    </td>
                    <td className="num">
                      <b>{ofDuration(row.horasParadoVazio)}</b>
                      <div
                        style={{
                          height: 4,
                          width: 72,
                          background: "#e2e8f0",
                          borderRadius: 9,
                          margin: "5px 0 0 auto",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${stoppedPercent}%`,
                            height: "100%",
                            background:
                              stoppedPercent >= 80 ? "#dc2626" : "#d97706",
                          }}
                        />
                      </div>
                      <div className="muted" style={{ fontSize: 10 }}>
                        {stoppedPercent}% do intervalo
                      </div>
                    </td>
                    <td className="num">
                      <b style={{ color: "#2563eb" }}>
                        {ofNumber(row.kmVazio)} km
                      </b>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 7px",
                          borderRadius: 999,
                          background:
                            row.coberturaPercentual >= 80
                              ? "#dcfce7"
                              : "#fef3c7",
                          color:
                            row.coberturaPercentual >= 80
                              ? "#166534"
                              : "#92400e",
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        {row.coberturaPercentual}% cobertura
                      </span>
                      <div
                        className="muted"
                        style={{ fontSize: 10, marginTop: 4 }}
                      >
                        Vazio provável
                      </div>
                    </td>
                    <td>
                      <button className="btn" onClick={() => setSelected(row)}>
                        Analisar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && !(data.rows || []).length && (
                <tr>
                  <td colSpan="8" className="muted">
                    Nenhum intervalo vazio encontrado no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selected && (
        <>
          <div
            onClick={() => setSelected(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.55)",
              zIndex: 80,
            }}
          />
          <aside
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              bottom: 0,
              width: "min(440px,92vw)",
              background: "var(--surface, #111)",
              zIndex: 81,
              padding: 24,
              overflowY: "auto",
              boxShadow: "-16px 0 40px rgba(0,0,0,.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
              }}
            >
              <div>
                <div className="muted" style={{ fontSize: 11 }}>
                  ANÁLISE DO INTERVALO
                </div>
                <h2 style={{ marginTop: 5 }}>{selected.placa}</h2>
              </div>
              <button className="btn" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>
            <div className="card" style={{ padding: 16, marginTop: 18 }}>
              <b>{selected.documento}</b> → <b>{selected.proximoDocumento}</b>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {ofDateTime(selected.inicio)} até {ofDateTime(selected.fim)}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginTop: 12,
              }}
            >
              <OfKpi
                label="Tempo vazio"
                value={ofDuration(selected.horasVazio)}
                sub="Entre operações"
                tone="#7c3aed"
              />
              <OfKpi
                label="Tempo parado"
                value={ofDuration(selected.horasParadoVazio)}
                sub={`${selected.horasVazio ? Math.round((selected.horasParadoVazio / selected.horasVazio) * 100) : 0}% do intervalo`}
                tone="#dc2626"
              />
              <OfKpi
                label="Em movimento"
                value={ofDuration(
                  Math.max(0, selected.horasVazio - selected.horasParadoVazio),
                )}
                sub="Condição vazia"
                tone="#0891b2"
              />
              <OfKpi
                label="KM vazio"
                value={`${ofNumber(selected.kmVazio)} km`}
                sub="Variação do odômetro"
                tone="#2563eb"
              />
            </div>
            <div className="card" style={{ padding: 16, marginTop: 12 }}>
              <div>
                <b>Última entrega</b>
                <div className="muted">
                  {selected.destino || "Destino não informado"}
                </div>
              </div>
              <hr style={{ opacity: 0.15, margin: "14px 0" }} />
              <div>
                <b>Próxima operação</b>
                <div className="muted">
                  {selected.proximoDocumento} · {ofDateTime(selected.fim)}
                </div>
              </div>
              <hr style={{ opacity: 0.15, margin: "14px 0" }} />
              <div>
                <b>Qualidade</b>
                <div className="muted">
                  {selected.coberturaPercentual}% de cobertura da telemetria ·
                  vazio provável
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

window.OciosidadeFrota = OciosidadeFrota;
