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
const ofBRL = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
const ofLocalInput = (value) => value ? new Date(new Date(value).getTime() - 3 * 3600000).toISOString().slice(0,16) : "";
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

function ofSort(rows, sort) {
  return [...rows].sort((a, b) => {
    const x = a[sort.key], y = b[sort.key];
    const result = typeof x === "number" || typeof y === "number"
      ? Number(x || 0) - Number(y || 0)
      : String(x || "").localeCompare(String(y || ""), "pt-BR", { numeric: true });
    return sort.direction === "asc" ? result : -result;
  });
}
function OfSortHeader({ label, field, sort, onSort, numeric }) {
  const active = sort.key === field;
  return <th className={numeric ? "num" : undefined} aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
    <button type="button" className="of-sort" onClick={() => onSort({ key: field, direction: active && sort.direction === "asc" ? "desc" : "asc" })}>{label} <span aria-hidden="true">{active ? (sort.direction === "asc" ? "\u2191" : "\u2193") : "\u2195"}</span></button>
  </th>;
}

function OfKpi({ label, value, sub, tone, help, pending = false }) {
  return (
    <div
      className="card"
      style={{ padding: 17, borderLeft: `4px solid ${tone}`, minHeight: 104 }}
    >
      <div
        className="muted of-kpi-label"
        style={{
          fontSize: 10,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          fontWeight: 750,
        }}
      >
        <span>{label}</span>
        {help && <button type="button" className="of-help" aria-label={`Entenda: ${label}`}><span>i</span><div role="tooltip">{help}</div></button>}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          marginTop: 6,
          letterSpacing: "-.02em",
        }}
      >
        {pending ? "A conciliar" : value}
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 5 }}>
        {pending ? "Sem resultado suficiente para esta classificação" : sub}
      </div>
    </div>
  );
}

const OciosidadeFrota = ({ onNavigate }) => {
  const [startDate, setStartDate] = useStateOciosidade(ofDaysAgo(29));
  const [endDate, setEndDate] = useStateOciosidade(ofToday());
  const [placa, setPlaca] = useStateOciosidade("");

  const [conference, setConference] = useStateOciosidade(null);
  const [stops, setStops] = useStateOciosidade([]);
  const [conferenceError, setConferenceError] = useStateOciosidade("");
  const [conferenceBusy, setConferenceBusy] = useStateOciosidade(false);
  const [data, setData] = useStateOciosidade({
    summary: {},
    rows: [],
    filters: { placas: [] },
  });
  const [loading, setLoading] = useStateOciosidade(true);
  const [error, setError] = useStateOciosidade("");
  const [selected, setSelected] = useStateOciosidade(null);
  const [rankingSort, setRankingSort] = useStateOciosidade({ key: "horasParadoVazio", direction: "desc" });
  const [intervalSort, setIntervalSort] = useStateOciosidade({ key: "horasParadoVazio", direction: "desc" });

  const load = async (overrides = {}) => {
    setLoading(true);
    setError("");
    try {
      setData(await window.RB_API.getOciosidadeFrota({
        modo: "sms",
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
  const openConference = (doc) => {
    setStops([]); setConferenceError("");
    setConference({ placa: doc.placa, documentos: doc.confirmacaoId ? data.documentosDetalhados.filter((d) => d.confirmacaoId === doc.confirmacaoId).map((d) => d.documentKey) : [doc.documentKey], inicio: doc.confirmacaoId ? ofLocalInput(doc.emissao) : "", fim: doc.confirmacaoId ? ofLocalInput(doc.entrega) : "", confirmacaoId: doc.confirmacaoId,
      buscaInicio: ofLocalInput(doc.emissao).slice(0,10), buscaFim: endDate });
  };
  const conferenceAction = async (action) => {
    setConferenceBusy(true); setConferenceError("");
    try { await action(); } catch (e) { setConferenceError(e.message); } finally { setConferenceBusy(false); }
  };
  const movingEmptyHours = Math.max(
    0,
    Number(summary.horasEmMovimento || 0),
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
  const intervalRows = ofSort(data.rows || [], intervalSort);
  const quickPeriod = (start, end = ofToday()) => {
    setStartDate(start); setEndDate(end); load({ startDate: start, endDate: end });
  };

  return (
    <div className="page-content of-page">
      <style>{`
      .of-sort{background:none;border:0;color:inherit;font:inherit;text-transform:inherit;letter-spacing:inherit;cursor:pointer;padding:8px 0}.of-sort:focus-visible{outline:2px solid #2563eb}.of-page{width:100%;height:100%;min-height:0;box-sizing:border-box;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;padding:20px clamp(16px,2vw,32px) 56px;max-width:1720px;margin:0 auto}
      .of-filters{display:grid;grid-template-columns:150px 150px minmax(150px,220px) auto 1fr;gap:12px;align-items:end}
      .of-filters label{display:grid;gap:6px;color:var(--muted);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
      .of-filters input,.of-filters select{width:100%;height:40px;box-sizing:border-box;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);padding:0 11px;color-scheme:dark}
      .of-quick{display:flex;gap:6px;justify-content:flex-end;align-items:center;flex-wrap:wrap}.of-quick .btn{padding:9px 11px;white-space:nowrap}
      .of-kpi-label{display:flex;align-items:center;justify-content:space-between;gap:8px}.of-help{position:relative;display:grid;place-items:center;flex:0 0 18px;width:18px;height:18px;padding:0;border:1px solid var(--border-strong);border-radius:50%;background:var(--surface-2);color:var(--text-2);font:700 10px inherit;cursor:help;text-transform:none;letter-spacing:0}.of-help>div{position:absolute;z-index:20;right:-5px;bottom:calc(100% + 9px);display:none;width:260px;padding:10px 12px;border:1px solid var(--border-strong);border-radius:8px;background:var(--surface-1);box-shadow:0 12px 30px rgba(0,0,0,.35);color:var(--text-2);font-size:11px;font-weight:500;line-height:1.5;text-align:left;letter-spacing:0;text-transform:none}.of-help:hover>div,.of-help:focus>div{display:block}.of-help>div:after{content:"";position:absolute;right:9px;top:100%;border:5px solid transparent;border-top-color:var(--border-strong)}
      .of-calendar-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.of-calendar-grid>div{padding:13px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2)}.of-calendar-grid span,.of-calendar-grid strong,.of-calendar-grid small{display:block}.of-calendar-grid span{color:var(--text-3);font-size:10px;text-transform:uppercase;letter-spacing:.05em}.of-calendar-grid strong{margin-top:6px;font-size:20px}.of-calendar-grid small{margin-top:4px;color:var(--text-3);font-size:10px}
      .of-two{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:14px;margin-bottom:14px}
      .of-page .table-wrap{overflow:auto;max-width:100%}.of-page .tbl{min-width:1080px}
      @media(max-width:1100px){.of-filters{grid-template-columns:repeat(3,1fr)}.of-quick{grid-column:1/-1;justify-content:flex-start}.of-page .grid.cols-4{grid-template-columns:repeat(2,minmax(0,1fr))}.of-two{grid-template-columns:1fr}}
      @media(max-width:650px){.of-page{padding:14px 12px 44px}.of-filters{grid-template-columns:1fr 1fr}.of-filters label:nth-child(3){grid-column:1/-1}.of-page .grid.cols-4{grid-template-columns:1fr}.of-quick{overflow-x:auto;flex-wrap:nowrap}.of-two,.of-calendar-grid{grid-template-columns:1fr}}
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
              {summary.modo === "documentos" ? "TESTE: DOCUMENTOS + TELEMETRIA" : "SM + TELEMETRIA"}
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
          sub="Distância válida percorrida pela frota"
          help="Soma da variação dos odômetros considerada confiável no período. É a base usada para separar quilômetros carregados, vazios e não classificados."
          tone="#64748b"
        />
        <OfKpi
          label="KM vazio"
          value={`${ofNumber(Number(summary.kmVazio || 0) + Number(summary.kmVazioConfirmado || 0), 0)} km`}
          sub="Deslocamento sem carga identificada"
          help="Soma os trechos vazios confirmados nas SMs com os deslocamentos inferidos entre o fim de uma carga e o início da próxima. Quanto menor, melhor o aproveitamento da frota."
          tone="#2563eb"
        />
        <OfKpi
          label="Percentual de KM vazio"
          value={`${ofNumber(emptyPercent, 1)}%`}
          sub="Participação do vazio no KM total"
          help="Cálculo: KM vazio ÷ KM total real × 100. Mostra quanto da distância percorrida não transportou carga e deve ser analisado junto das oportunidades de retorno."
          tone={emptyPercent >= 20 ? "#dc2626" : "#d97706"}
        />
        <OfKpi
          label="Parado em condição vazia"
          value={ofDuration(summary.horasParadoVazio)}
          sub="Veículo vazio e praticamente imóvel"
          help="Tempo em que o caminhão estava em um intervalo vazio e a telemetria registrou menos de 5 km/h. Pode representar espera por carga, fila, pátio ou intervalo operacional."
          tone="#dc2626"
        />
      </div>
      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <OfKpi
          label="Parado nas janelas vazias"
          value={`${summary.percentualParado || 0}%`}
          sub="Percentual apenas entre operações"
          help="Cálculo: horas parado vazio ÷ tempo vazio total × 100. Um valor alto indica que o maior problema está na espera, não somente no deslocamento sem carga."
          tone="#dc2626"
        />
        <OfKpi
          label="Tempo vazio total"
          value={ofDuration(summary.horasVazio)}
          sub={`Janela vazia de ${summary.veiculos || 0} caminhões`}
          help="Tempo acumulado entre operações carregadas, do encerramento de uma carga ao início da próxima. Inclui tempo em movimento e tempo parado nessa condição."
          tone="#7c3aed"
        />
        <OfKpi
          label="Em movimento vazio"
          value={ofDuration(movingEmptyHours)}
          sub="Deslocamento vazio efetivamente rodando"
          help="Soma dos trechos com velocidade de pelo menos 5 km/h e intervalo entre amostras de até 2h. Paradas na base e lacunas não contam como movimento."
          tone="#0891b2"
        />
        <OfKpi
          label="KM não classificado"
          value={`${ofNumber(summary.kmNaoClassificado, 0)} km`}
          sub="Distância sem vínculo confiável com SM"
          help="Quilômetros válidos no odômetro que não puderam ser associados com segurança a uma viagem carregada ou a um intervalo vazio. Valores altos reduzem a confiança da análise."
          tone="#64748b"
        />
      </div>
      <div className="grid cols-4" style={{ marginBottom: 14 }}>
        <OfKpi
          label="Média parada por caminhão"
          value={ofDuration(summary.horasParadoMediaVeiculo)}
          sub={`Média dos ${summary.veiculos || 0} veículos analisados`}
          help="Cálculo: total acumulado de horas paradas ÷ quantidade de caminhões analisados. Facilita comparar períodos e evita interpretar a soma da frota como dias corridos."
          tone="#f59e0b"
        />
        <OfKpi
          label="Parado no período total"
          value={`${ofNumber(summary.percentualParadoPeriodo, 1)}%`}
          sub={`Sobre ${summary.diasPeriodo || 0} dias × ${summary.veiculos || 0} caminhões`}
          help="Cálculo: horas paradas acumuladas ÷ todas as horas disponíveis dos caminhões no período. Este é o percentual adequado para entender o peso da parada no mês inteiro."
          tone={Number(summary.percentualParadoPeriodo || 0) >= 25 ? "#dc2626" : "#d97706"}
        />
        <OfKpi
          label="Custo fixo da ociosidade"
          value={ofBRL(summary.custoOciosidadeEstimado)}
          sub="Estimativa proporcional às horas paradas"
          help="Usa o custo fixo diário médio de cada veículo nos últimos 90 dias e multiplica pelos dias equivalentes parados fora da base. Não inclui perda de receita nem custos variáveis."
          tone="#a855f7"
        />
        <OfKpi

          label="Descartado dentro da base"
          value={ofDuration(summary.horasDescartadasBase)}
          sub={data.cercaBase?.aplicada ? `Cerca ${data.cercaBase.nome} aplicada` : "Cerca da base não localizada"}
          help="Tempo retirado da ociosidade porque a posição da telemetria estava dentro da cerca eletrônica da base cadastrada."
          tone="#64748b"
        />
      </div>
      <div className="card" style={{ padding: 18, marginBottom: 14 }}>
        <div style={{ marginBottom: 14 }}><h3 style={{ margin: 0 }}>Quando ocorreram as paradas</h3><div className="muted" style={{ fontSize: 11 }}>Horas paradas fora da base, separadas pelo calendário</div></div>
        <div className="of-calendar-grid">
          <div><span>Dias úteis</span><strong>{ofDuration(summary.horasParadoDiaUtilObservadas)}</strong><small>{summary.horasParadoObservadas ? ofNumber(summary.horasParadoDiaUtilObservadas / summary.horasParadoObservadas * 100, 1) : 0}% das paradas</small></div>
          <div><span>Finais de semana</span><strong>{ofDuration(summary.horasParadoFimSemanaObservadas)}</strong><small>{summary.horasParadoObservadas ? ofNumber(summary.horasParadoFimSemanaObservadas / summary.horasParadoObservadas * 100, 1) : 0}% das paradas</small></div>
          <div><span>Feriados nacionais</span><strong>{ofDuration(summary.horasParadoFeriadoObservadas)}</strong><small>{(data.calendario?.feriadosNacionais || []).length} feriado(s) no período</small></div>
        </div>
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
                Como a distância total foi utilizada: com carga, vazia ou sem classificação · {ofNumber(summary.kmTotal, 0)} km analisados
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
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)", color: "var(--text-3)", fontSize: 10.5, lineHeight: 1.5 }}>
            Mede a confiabilidade do resultado combinando cobertura da telemetria, quilômetros classificados e quantidade de intervalos válidos. Quanto mais próximo de 100, menor a necessidade de conferência manual.
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
              Clique nos cabeçalhos para ordenar os dados
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table tbl">
            <thead><tr><OfSortHeader label="Placa" field="placa" sort={rankingSort} onSort={setRankingSort} numeric={false} /><OfSortHeader label="KM total" field="kmTotal" sort={rankingSort} onSort={setRankingSort} numeric={true} /><OfSortHeader label="KM vazio" field="kmVazio" sort={rankingSort} onSort={setRankingSort} numeric={true} /><OfSortHeader label="% vazio" field="percentualVazio" sort={rankingSort} onSort={setRankingSort} numeric={true} /><OfSortHeader label="Tempo parado" field="horasParadoVazio" sort={rankingSort} onSort={setRankingSort} numeric={true} /><OfSortHeader label="% do período" field="percentualParadoPeriodo" sort={rankingSort} onSort={setRankingSort} numeric={true} /><OfSortHeader label="Custo estimado" field="custoOciosidadeEstimado" sort={rankingSort} onSort={setRankingSort} numeric={true} /><OfSortHeader label="Não classificado" field="kmNaoClassificado" sort={rankingSort} onSort={setRankingSort} numeric={true} /><OfSortHeader label="Qualidade" field="coberturaPercentual" sort={rankingSort} onSort={setRankingSort} numeric={true} /></tr></thead>
            <tbody>
              {ofSort(data.ranking || [], rankingSort).map((row) => (
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
                  <td className="num">{ofNumber(row.percentualParadoPeriodo, 1)}%</td>
                  <td className="num" title={`Custo fixo diário: ${ofBRL(row.custoFixoDiario)}`}>{ofBRL(row.custoOciosidadeEstimado)}</td>
                  <td className="num">
                    {ofNumber(row.kmNaoClassificado, 0)} km
                  </td>
                  <td>
                    {row.requerConciliacao ? "A conciliar" : row.coberturaPercentual >= 80
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
      {summary.modo === "documentos" && <div className="card card-flush" style={{ marginBottom: 14 }}>
        {conference && <div style={{ padding: 18, borderBottom: "1px solid var(--border)" }}>
          <h3>Conferir carregamento e última descarga — {conference.placa}</h3>
          <p className="muted">Selecione os documentos da mesma viagem e confirme os horários reais (Brasília). Paradas sugerem eventos, mas não comprovam carga ou descarga. Use o fim da parada como sugestão de conclusão.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
            {(data.documentosDetalhados || []).filter((d) => d.placa === conference.placa && (!d.confirmacaoId || d.confirmacaoId === conference.confirmacaoId)).map((d) => <label key={d.documentKey}><input type="checkbox" disabled={conferenceBusy || !!conference.confirmacaoId} checked={conference.documentos.includes(d.documentKey)} onChange={(e) => setConference({ ...conference, documentos: e.target.checked ? [...conference.documentos,d.documentKey] : conference.documentos.filter((key) => key !== d.documentKey) })} /> {d.documento} · {d.cliente}</label>)}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
            <label>Carregamento concluído<br /><input type="datetime-local" value={conference.inicio} disabled={conferenceBusy || !!conference.confirmacaoId} onChange={(e) => setConference({ ...conference, inicio: e.target.value })} /></label>
            <label>Última descarga concluída<br /><input type="datetime-local" value={conference.fim} disabled={conferenceBusy || !!conference.confirmacaoId} onChange={(e) => setConference({ ...conference, fim: e.target.value })} /></label>
            {!conference.confirmacaoId && <button className="btn primary" disabled={conferenceBusy || !conference.inicio || !conference.fim || !conference.documentos.length} onClick={() => conferenceAction(async () => {
              await window.RB_API.saveConferenciaOciosidade({ placa: conference.placa, documentos: conference.documentos, inicio: `${conference.inicio}:00-03:00`, fim: `${conference.fim}:00-03:00` });
              setConference(null); await load();
            })}>Confirmar horários e recalcular</button>}
            {conference.confirmacaoId && <button className="btn" disabled={conferenceBusy} onClick={() => conferenceAction(async () => { await window.RB_API.removeConferenciaOciosidade(conference.confirmacaoId); setConference(null); await load(); })}>Desfazer confirmação e recalcular</button>}
            <button className="btn" disabled={conferenceBusy} onClick={() => setConference(null)}>Fechar</button>
          </div>
          {!conference.confirmacaoId && <><div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <label>Buscar paradas de <input type="date" value={conference.buscaInicio} onChange={(e) => setConference({ ...conference, buscaInicio: e.target.value })} /></label>
            <label>até <input type="date" value={conference.buscaFim} onChange={(e) => setConference({ ...conference, buscaFim: e.target.value })} /></label>
            <button className="btn" disabled={conferenceBusy} onClick={() => conferenceAction(async () => setStops(await window.RB_API.getParadasOciosidade({ placa: conference.placa, inicio: `${conference.buscaInicio}T00:00:00-03:00`, fim: `${conference.buscaFim}T23:59:59-03:00` })))}>Buscar paradas do rastreador</button>
          </div><p className="muted">Paradas de pelo menos 15 minutos, sem lacunas superiores a 10 minutos; busca de até 31 dias. A lista pode incluir filas e descansos. Limite de 300 sugestões.</p>
          {stops.map((stop, i) => <div key={i} style={{ padding: 8, borderTop: "1px solid var(--border)" }}>
            <b>{stop.municipio || "Município não informado"}</b> · {ofDateTime(stop.inicio)} até {ofDateTime(stop.fim)} · Odômetro {ofNumber(stop.odometro_minimo)} a {ofNumber(stop.odometro_maximo)} km · Coordenadas {Number(stop.latitude).toFixed(5)}, {Number(stop.longitude).toFixed(5)} {" "}
            <button className="btn" onClick={() => setConference({ ...conference, inicio: ofLocalInput(stop.fim) })}>Usar como carregamento</button> {" "}
            <button className="btn" onClick={() => setConference({ ...conference, fim: ofLocalInput(stop.fim) })}>Usar como última descarga</button>
          </div>)}</>}
          {conferenceBusy && <p role="status">Consultando / salvando…</p>}
          {conferenceError && <p role="alert" style={{ color: "#fca5a5" }}>{conferenceError}</p>}
        </div>}
        <div className="card-header"><div><h3>Documentos e KM vazio até o próximo</h3>
          <p className="muted">Todos os documentos emitidos no filtro, em ordem de emissão. Orçamento e CT-e podem ser da mesma viagem. Datas sobrepostas não representam zero km; precisam de conferência. Entrega sem horário considera o fim do dia.</p>
        </div><span>{data.documentosDetalhados?.length || 0} documentos</span></div>
        <div className="table-wrap"><table className="data-table tbl">
          <thead><tr><th>Placa</th><th>Documento / cliente</th><th>Destino</th><th>Emissão</th><th>Entrega ERP</th><th>Próximo documento</th><th className="num">KM entre emissões</th><th className="num">KM vazio estimado</th><th>Situação</th></tr></thead>
          <tbody>{(data.documentosDetalhados || []).map((doc) => <tr key={doc.id}>
            <td><Plate value={doc.placa} /></td><td><b>{doc.documento}</b><div className="muted">{doc.cliente}</div></td>
            <td>{doc.destino}</td><td>{ofDateTime(doc.emissao)}{doc.confirmacaoId && <div className="muted">Carga confirmada<br />Emissão ERP: {ofDateTime(doc.emissaoOriginal)}</div>}</td>
            <td>{doc.entrega ? ofDateTime(doc.entrega) : "Não informada"}{doc.entrega && !doc.entregaPrecisa && <div className="muted">Horário não confirmado</div>}</td>
            <td>{doc.proximoDocumento || "—"}{doc.proximaEmissao && <div className="muted">{ofDateTime(doc.proximaEmissao)}</div>}</td>
            <td className="num">{doc.kmEntreEmissoes == null ? "—" : `${ofNumber(doc.kmEntreEmissoes)} km`}<div className="muted">Pode incluir carga</div></td><td className="num"><b>{doc.kmVazio == null ? "A conferir" : `${ofNumber(doc.kmVazio)} km`}</b></td><td>{doc.status}<div>{doc.confirmacaoId ? "Horários confirmados" : "Horários ERP"}</div><button className="btn" onClick={() => openConference(doc)}>{doc.confirmacaoId ? "Ver confirmação" : "Conferir viagem"}</button></td>
          </tr>)}{!data.documentosDetalhados?.length && <tr><td colSpan={9}>Nenhum documento emitido no filtro.</td></tr>}</tbody>
        </table></div>
      </div>}
      <div className="card card-flush">
        <div className="card-header">
          <div>
            <h3 style={{ marginBottom: 2 }}>{summary.modo === "documentos" ? "Intervalos entre documentos (teste)" : "Intervalos entre operações"}</h3>
            <div className="muted" style={{ fontSize: 11 }}>
              {summary.modo === "documentos" ? "Da entrega registrada à próxima emissão. Horários de carga e descarga são estimados; entregas sem horário consideram o dia inteiro." : "Do encerramento de uma SM ao início da seguinte · paradas exibidas fora da base; condição de carga depende da conciliação"}
            </div>
          </div>
          <span className="meta muted">{data.rows?.length || 0} períodos</span>
        </div>
        <div className="table-wrap">
          <table className="data-table tbl">
            <thead><tr><OfSortHeader label="Placa" field="placa" sort={intervalSort} onSort={setIntervalSort} numeric={false} /><OfSortHeader label="Operação encerrada" field="documento" sort={intervalSort} onSort={setIntervalSort} numeric={false} /><OfSortHeader label="Início do vazio" field="inicio" sort={intervalSort} onSort={setIntervalSort} numeric={false} /><OfSortHeader label="Próxima operação" field="proximoDocumento" sort={intervalSort} onSort={setIntervalSort} numeric={false} /><OfSortHeader label="Tempo total" field="horasVazio" sort={intervalSort} onSort={setIntervalSort} numeric={true} /><OfSortHeader label="Tempo parado" field="horasParadoVazio" sort={intervalSort} onSort={setIntervalSort} numeric={true} /><OfSortHeader label="KM vazio" field="kmVazio" sort={intervalSort} onSort={setIntervalSort} numeric={true} /><OfSortHeader label="Qualidade" field="coberturaPercentual" sort={intervalSort} onSort={setIntervalSort} numeric={true} /><th></th></tr></thead>
            <tbody>
              {intervalRows.map((row) => {
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
                          <div className="muted" style={{ fontSize: 11, maxWidth: 260 }}>
                            {row.proximaOrigem || "Local de carregamento não informado"}
                          </div>
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
                      {row.requerConciliacao && <div className="muted" style={{ fontSize: 10 }}>Condição de carga a conciliar</div>}
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
                        {`${ofNumber(row.kmVazio)} km`}
                      </b>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 7px",
                          borderRadius: 999,
                          background:
                            !row.requerConciliacao && !row.regressoesOdometro && !row.saltosOdometro && row.coberturaPercentual >= 80
                              ? "#dcfce7"
                              : "#fef3c7",
                          color:
                            !row.requerConciliacao && !row.regressoesOdometro && !row.saltosOdometro && row.coberturaPercentual >= 80
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
                        {row.requerConciliacao ? "Documentos ERP: a conciliar" : row.regressoesOdometro || row.saltosOdometro ? "Odômetro a conferir · vazio provável" : "Vazio provável"}
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
                  <td colSpan="9" className="muted">
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
                label={selected.requerConciliacao ? "Tempo do intervalo" : "Tempo vazio"}
                value={ofDuration(selected.horasVazio)}
                sub="Entre operações"
                tone="#7c3aed"
              />
              <OfKpi
                label={selected.requerConciliacao ? "Parado fora da base" : "Tempo parado"}
                value={ofDuration(selected.horasParadoVazio)}
                sub={`${selected.horasVazio ? Math.round((selected.horasParadoVazio / selected.horasVazio) * 100) : 0}% do intervalo`}
                tone="#dc2626"
              />
              <OfKpi
                label="Em movimento"
                value={ofDuration(
                  Number(selected.horasEmMovimento || 0),
                )}
                sub={selected.requerConciliacao ? "Carga a conciliar" : "Condição vazia"}
                tone="#0891b2"
              />
              <OfKpi
                label={selected.requerConciliacao ? "KM do intervalo" : "KM vazio"}
                value={`${ofNumber(selected.kmIntervalo ?? selected.kmVazio)} km`}
                sub={selected.requerConciliacao ? "Incluído como estimativa entre SMs" : "Variação do odômetro"}
                tone="#2563eb"
              />
            </div>
            <div className="card" style={{ padding: 16, marginTop: 12 }}>
              <div>
                {selected.requerConciliacao && <div style={{ marginBottom: 16 }}>
                  <b style={{ color: "#fcd34d" }}>Carga possível sem correspondência com SM</b>
                  <p className="muted">Existem documentos da mesma placa sobrepostos ao intervalo. Seus quilômetros e horas entram nos indicadores como estimativas entre SMs, ainda sujeitas a conferência. Emissão não confirma carregamento; entrega sem horário não confirma descarga. Conferir com a operação antes de dividir em trechos carregados e vazios.</p>
                  {selected.documentosERP?.map((doc) => <div key={`${doc.documento}-${doc.codigo}`} style={{ borderTop: "1px solid var(--border)", padding: "10px 0", fontSize: 12 }}>
                    <b>Documento ERP {doc.documento}</b><br />
                    {doc.cliente} · {doc.destino}<br />
                    Registro: {ofDateTime(doc.emissao)}<br />
                    Entrega: {doc.entrega ? ofDateTime(doc.entrega) : "Não registrada"} {doc.entrega && !doc.entregaPrecisa ? "(horário não confirmado)" : ""}
                  </div>)}
                </div>}
                <b>Conferência do cálculo</b>
                <div className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>
                  Parado na base (excluído): {ofDuration(selected.horasDescartadasBase)}<br />
                  Cerca: {data.cercaBase?.aplicada ? data.cercaBase.nome : "Não aplicada"}<br />
                  Menor odômetro: {ofNumber(selected.odometroMinimo)} km<br />
                  Maior odômetro: {ofNumber(selected.odometroMaximo)} km<br />
                  Incrementos filtrados: {ofNumber(selected.kmIncrementosValidos)} km<br />
                  Amostras: {ofNumber(selected.amostras, 0)}<br />
                  Primeira: {ofDateTime(selected.primeiraAmostra)}<br />
                  Última: {ofDateTime(selected.ultimaAmostra)}<br />
                  KM vazio = maior menos menor odômetro. A base desconta horas paradas, sem descontar quilômetros. Ausência de carga entre SMs é uma inferência. A cobertura mede a abrangência das amostras, sem garantir continuidade.
                </div>
                {(selected.regressoesOdometro > 0 || selected.saltosOdometro > 0) && <p style={{ color: "#fcd34d", fontSize: 12 }}>Odômetro inconsistente: {selected.regressoesOdometro} regressões e {selected.saltosOdometro} saltos entre leituras positivas. A distância exige conferência; os incrementos filtrados também não confirmam o total real.</p>}
                <hr style={{ opacity: 0.15, margin: "14px 0" }} />
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
                  <div>{selected.proximaOrigem || "Local de carregamento não informado"}</div>
                </div>
              </div>
              <hr style={{ opacity: 0.15, margin: "14px 0" }} />
              <div>
                <b>Qualidade</b>
                <div className="muted">
                  {selected.coberturaPercentual}% de cobertura da telemetria ·
                  {selected.requerConciliacao ? "documentos ERP conflitantes · a conciliar" : "vazio provável"}
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
