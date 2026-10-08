import React, { useEffect, useState } from "react";
import "./consulta-viagens.css";
const money = (v) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const number = (v) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const date = (v) =>
  v ? String(v).slice(0, 10).split("-").reverse().join("/") : "—";
const empty = { numero: "", placa: "", motorista: "", inicio: "", fim: "" };
export function tripStatus(trip) {
  const departure = String(trip.saida || "").slice(0, 10);
  const arrival = String(trip.chegada || "").slice(0, 10);
  if (departure && arrival && departure !== arrival) return "Finalizada";
  return trip.status || "Sem status";
}
function Status({ trip }) {
  const value = tripStatus(trip);
  return (
    <span
      className={`trip-status ${value === "FECHADA" || value === "Finalizada" ? "closed" : ""}`}
    >
      {value || "Sem status"}
    </span>
  );
}
function DataTable({ rows, columns, emptyText }) {
  return (
    <div className="trip-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(([key, label]) => (
              <th key={key}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map(([key, , format]) => (
                <td key={key}>{format ? format(row[key]) : row[key] || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="trip-empty">{emptyText}</p>}
    </div>
  );
}
export function CteAudit({ audit, onRetry }) {
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState(false);
  if (!audit?.disponivel)
    return (
      <section className="card trip-audit">
        <h3>Conferência de CT-es</h3>
        <p role="status">{audit?.mensagem || "Conferência indisponível."}</p>
        <button className="btn" onClick={onRetry}>
          Conferir novamente
        </button>
      </section>
    );
  const labels = {
    vinculado: "Vinculado",
    sem_vinculo: "Possível faltante",
    outra_viagem: "Em outra viagem",
    duplicado: "Vínculo em mais de uma viagem",
    placa_divergente: "Placa diferente da viagem",
  };
  const rows = audit.documentos.filter(
    (d) => all || d.situacao !== "vinculado",
  );
  return (
    <section
      className={`card trip-audit ${audit.pendencias ? "needs-review" : ""}`}
      aria-label="Conferência de CT-es"
    >
      <div className="trip-audit-heading">
        <div>
          <h3>
            {audit.pendencias
              ? `${audit.pendencias} ${audit.pendencias === 1 ? "documento" : "documentos"} para revisar`
              : audit.emitidos
                ? "Documentos conferidos"
                : "Sem emissões no período"}
          </h3>
          <p>
            {audit.pendencias
              ? "Confira as diferenças encontradas nos CT-es."
              : "Conferência de CT-es desta viagem."}
          </p>
        </div>
        <button
          className="btn"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open
            ? "Fechar conferência"
            : audit.pendencias
              ? "Revisar documentos"
              : "Ver conferência"}
        </button>
      </div>
      {open && (
        <>
          <p className="trip-audit-period">
            Período conferido: {date(audit.inicio)} a {date(audit.fim)}
          </p>
          <div className="trip-audit-counts">
            {[
              ["Emitidos no período", audit.emitidos],
              ["Vinculados à viagem", audit.vinculados],
              ["Sem vínculo", audit.semVinculo],
              ["Outras divergências", audit.divergencias],
            ].map(([label, total], i) => (
              <div className={i > 1 && total ? "warning" : ""} key={label}>
                <strong>{total}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="trip-audit-toolbar">
            <p>
              CT-es com financeiro ativo. O vínculo com a viagem é aceito mesmo
              com emissão anterior à saída. Documentos sem vínculo precisam de
              revisão; viagens podem compartilhar o mesmo período.
            </p>
            <button className="btn" onClick={() => setAll(!all)}>
              {all ? "Ver só pendências" : "Ver todos os CT-es"}
            </button>
          </div>
          <div className="trip-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>CT-e / série</th>
                  <th>Emissão</th>
                  <th>Placa</th>
                  <th>Conferência</th>
                  <th>Viagem vinculada</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr
                    key={`${d.empresa}-${d.serie}-${d.codigo}`}
                    className={
                      d.situacao === "vinculado" ? "" : "trip-audit-pending"
                    }
                  >
                    <td>
                      <strong>
                        {d.numero || `Cód. ${d.codigo}`} / {d.serie}
                      </strong>
                      <small className="trip-cell-sub">
                        Empresa {d.empresa}
                      </small>
                    </td>
                    <td>{date(d.emissao)}</td>
                    <td>{d.placa || "—"}</td>
                    <td>
                      <span
                        className={`trip-audit-badge ${d.situacao === "vinculado" ? "" : "warning"}`}
                      >
                        {labels[d.situacao]}
                      </span>
                    </td>
                    <td>
                      {d.vinculos.length
                        ? d.vinculos
                            .map((v) => `${v.numero} (empresa ${v.empresa})`)
                            .join(", ")
                        : "Sem viagem"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <p className="trip-empty">
              {audit.emitidos
                ? "Nenhuma pendência encontrada nesta conferência."
                : "Nenhum CT-e emitido para esta placa no período informado."}
            </p>
          )}
        </>
      )}
    </section>
  );
}
function ResultCard({ title, subtitle, result, vehicle = false, provisional = false }) {
  const available = result?.disponivel && (!vehicle || result.itens?.length > 0);
  const balance = available ? result.lucro : null;
  const verdict = balance == null ? "Sem dados para avaliar" : balance > 0 ? "Sobrou" : balance < 0 ? "Faltou" : "Empatou";
  return (
    <section className="trip-comparison-card" aria-label={title}>
      <h4>{title}</h4>
      <p className="trip-comparison-subtitle">{subtitle}</p>
      {available ? <>
        <dl className="trip-calculation">
          <div><dt>Receita</dt><dd>{money(result.receita)}</dd></div>
          <div><dt>{vehicle ? "Todos os custos da placa" : "Custos da viagem"}</dt><dd>{money(result.custo)}</dd></div>
        </dl>
        <div className={`trip-balance ${balance < 0 ? "is-loss" : balance > 0 ? "is-profit" : ""}`}>
          <span>{verdict}</span>
          <strong>{money(Math.abs(balance))}</strong>
          <span>{balance > 0 ? "Lucro" : balance < 0 ? "Prejuízo" : "Receita igual aos custos"}{provisional ? " · provisório" : ""}</span>
        </div>
        {vehicle && <p className="trip-comparison-note">Já inclui {money(result.fixos)} de custos fixos. Financiamentos incluídos: {money(result.financiamentos)}.</p>}
      </> : <p className="trip-empty" role="status">{result?.mensagem || (vehicle ? "Sem lançamentos financeiros para esta placa no período. Não é possível afirmar se houve lucro." : "O controle da viagem ainda não tem os valores necessários para calcular o resultado.")}</p>}
    </section>
  );
}
export function TripIndicators({ trip }) {
  const [open, setOpen] = useState(false),
    [period, setPeriod] = useState("viagem"),
    [month, setMonth] = useState(trip.saida?.slice(0, 7) || ""),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  const selectedMonth = period === "mes" ? month : "";
  useEffect(() => {
    if (!open) return;
    let active = true;
    setError("");
    setData(null);
    if (period === "mes" && !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(selectedMonth)) {
      setError("Selecione um mês válido para consultar o veículo.");
      return;
    }
    window.RB_API.getConsultaViagemIndicadores(trip.empresa, trip.numero, selectedMonth ? {mes: selectedMonth} : {})
      .then((r) => { if (active) setData(r); })
      .catch((e) => { if (active) setError(e.message || "Não foi possível carregar os resultados."); });
    return () => { active = false; };
  }, [open, trip.empresa, trip.numero, selectedMonth, period, attempt]);
  const vehicle = data?.veiculo;
  const comparable = data?.viagem?.disponivel && vehicle?.disponivel && vehicle.itens?.length > 0;
  const tripPeriod = `${date(trip.saida)} a ${date(trip.chegada)}`;
  const vehicleDates = `${date(vehicle?.inicio || trip.saida)} a ${date(vehicle?.fim || trip.chegada)}`;
  return (
    <section className="card trip-indicators" aria-label="Lucro da viagem e do veículo">
      <div className="trip-audit-heading">
        <div>
          <h3>A viagem e o veículo deram lucro?</h3>
          <p>Veja quanto sobrou na viagem e depois de considerar os custos da placa.</p>
        </div>
        <button className="btn" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Fechar comparação" : "Comparar lucro e custos"}
        </button>
      </div>
      {open && <div className="trip-result-body">
        <div className="trip-period-controls">
          <label>Período do veículo
            <select value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="viagem">Somente os dias da viagem</option>
              <option value="mes">Mês inteiro</option>
            </select>
          </label>
          {period === "mes" && <label>Mês do veículo<input type="month" value={month} onChange={e => setMonth(e.target.value)} /></label>}
        </div>
        {error ? <div className="trip-error" role="alert">{error}<button className="btn" onClick={() => setAttempt(n => n + 1)}>Tentar novamente</button></div>
          : !data ? <p className="trip-empty" role="status">Consultando receitas e custos…</p>
          : <>
            <div className="trip-comparison-grid">
              <ResultCard title="Esta viagem" subtitle={`Viagem ${trip.numero} · ${tripPeriod}`} result={data.viagem} provisional={!['FECHADA', 'FINALIZADA'].includes(String(trip.status || '').trim().toUpperCase())} />
              <ResultCard title={period === "mes" ? "Veículo no mês" : "Veículo nos dias da viagem"} subtitle={`${trip.placa || "Sem placa"} · ${vehicleDates}`} result={vehicle} vehicle />
            </div>
            {comparable && <p className="trip-comparison-conclusion" role="status">{
              data.viagem.lucro > 0 && vehicle.lucro < 0
                ? "A viagem deu lucro, mas a receita do veículo não cobriu todos os custos considerados no período."
                : vehicle.lucro > 0
                  ? "A receita do veículo cobriu os custos considerados no período e houve lucro."
                  : vehicle.lucro < 0
                    ? "Faltou receita para cobrir os custos considerados do veículo no período."
                    : "A receita do veículo foi igual aos custos considerados no período."
            }</p>}
            <p className="trip-comparison-note">O veículo considera todas as receitas e despesas lançadas para a placa no período, mesmo sem vínculo com esta viagem. {period === "viagem" ? "Custos fixos proporcionais aos dias da viagem." : "Custos fixos do mês inteiro."} Valores ainda não lançados ou sem placa identificável ficam de fora. Os dois resultados são separados: não devem ser somados nem descontados um do outro.</p>
            <details className="trip-cost-details">
              <summary>Ver de onde vêm os valores</summary>
              <div className="trip-cost-details-body">
                <h4>Custos desta viagem</h4>
                <p className="trip-comparison-note">Fretes menos o saldo do controle da viagem, incluindo os ajustes do acerto. Enquanto a viagem estiver aberta, o resultado é provisório.</p>
                <DataTable rows={data.viagem?.componentes || []} columns={[["conta", "Custo / ajuste"], ["valor", "Valor", money]]} emptyText="Custos da viagem indisponíveis." />
                <h4>Receitas e custos do veículo</h4>
                <p className="trip-comparison-note">{period === "mes" ? "Custos fixos do mês inteiro." : "Custos fixos divididos pelos dias do mês, considerando somente os dias da viagem."} Inclui financiamentos, seguros, IPVA/licenciamento, aluguel e depreciação que estejam lançados para a placa. As parcelas de financiamento entram pelo vencimento, pagas ou em aberto.</p>
                <DataTable rows={(vehicle?.itens || []).map(r => ({...r, rateio: r.fixo ? `${r.dias}/${r.diasMes} dias` : "Integral"}))}
                  columns={[["data", "Data", date], ["conta", "Receita / custo"], ["documento", "Documento"], ["rateio", "Parte considerada"], ["valor", "Valor no período", money]]}
                  emptyText="Nenhum lançamento disponível para o veículo." />
                <p className="trip-comparison-note">Receitas aparecem positivas e despesas negativas. Valores ainda não lançados ou sem placa identificável ficam de fora. Este resultado não é o saldo bancário. Períodos de viagens que se sobrepõem não devem ser somados.</p>
              </div>
            </details>
          </>}
      </div>}
    </section>
  );
}
export default function ConsultaViagens() {
  const [form, setForm] = useState(empty),
    [filters, setFilters] = useState({ ...empty, page: 1 });
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [selected, setSelected] = useState(null),
    [detail, setDetail] = useState(null),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState("");
  const [showList, setShowList] = useState(false);
  const [tab, setTab] = useState("fretes"),
    [attempt, setAttempt] = useState(0),
    [detailAttempt, setDetailAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    setSelected(null);
    setDetail(null);
    window.RB_API.listConsultaViagens(filters)
      .then((result) => {
        if (active) {
          setData(result);
          setSelected(result.itens[0] || null);
        }
      })
      .catch((e) => {
        if (active)
          setError(e.message || "Não foi possível consultar as viagens.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, attempt]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    setDetail(null);
    setDetailLoading(true);
    setDetailError("");
    setTab("fretes");
    window.RB_API.getConsultaViagem(selected.empresa, selected.numero)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((e) => {
        if (active)
          setDetailError(e.message || "Não foi possível carregar a viagem.");
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected, detailAttempt]);
  const v = detail?.viagem;
  return (
    <div className="view trip-page">
      <header className="page-head">
        <div>
          <h1>Consulta de viagens</h1>
          <div className="sub">
            Escolha uma viagem para conferir valores e documentos.
          </div>
        </div>
      </header>
      <form
        className="card trip-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({ ...form, page: 1 });
        }}
      >
        <label>
          Número da viagem
          <input
            inputMode="numeric"
            value={form.numero}
            onChange={(e) =>
              setForm({
                ...form,
                numero: e.target.value.replace(/\D/g, "").slice(0, 9),
              })
            }
            placeholder="Ex.: 868"
          />
        </label>
        <label>
          Placa
          <input
            value={form.placa}
            onChange={(e) =>
              setForm({
                ...form,
                placa: e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 7),
              })
            }
            placeholder="Todas as placas"
          />
        </label>
        <button className="btn primary" disabled={loading}>
          Buscar viagens
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setForm(empty);
            setFilters({ ...empty, page: 1 });
          }}
        >
          Limpar filtros
        </button>
        <details className="trip-more-filters">
          <summary>
            Mais filtros
            {[form.motorista, form.inicio, form.fim].filter(Boolean).length
              ? " • ativos"
              : ""}
          </summary>
          <div>
            <label>
              Motorista
              <input
                value={form.motorista}
                maxLength={120}
                placeholder="Nome do motorista"
                onChange={(e) =>
                  setForm({ ...form, motorista: e.target.value })
                }
              />
            </label>
            <label>
              Saída inicial
              <input
                type="date"
                value={form.inicio}
                onChange={(e) => setForm({ ...form, inicio: e.target.value })}
              />
            </label>
            <label>
              Saída final
              <input
                type="date"
                value={form.fim}
                min={form.inicio || undefined}
                onChange={(e) => setForm({ ...form, fim: e.target.value })}
              />
            </label>
          </div>
        </details>
      </form>
      {error && (
        <div className="card trip-error" role="alert">
          {error}
          <button className="btn" onClick={() => setAttempt((n) => n + 1)}>
            Tentar novamente
          </button>
        </div>
      )}
      {loading ? (
        <div className="card trip-empty" role="status">
          Consultando viagens…
        </div>
      ) : (
        data && (
          <div
            className={`trip-workspace ${showList || !selected ? "show-trip-list" : ""}`}
          >
            {selected && (
              <button
                className="btn trip-mobile-switch"
                onClick={() => setShowList(!showList)}
              >
                {showList ? "Voltar à viagem" : "Trocar viagem"}
              </button>
            )}
            <section
              className="card trip-list"
              aria-label="Viagens encontradas"
            >
              <div className="trip-section-head">
                <div>
                  <h2>Escolha a viagem</h2>
                  <p>{data.total} registro(s) · mais recentes primeiro</p>
                </div>
              </div>
              <div className="trip-list-items">
                {data.itens.map((item) => (
                  <button
                    key={`${item.empresa}-${item.numero}`}
                    className={`trip-item ${selected?.numero === item.numero && selected?.empresa === item.empresa ? "selected" : ""}`}
                    onClick={() => {
                      setSelected(item);
                      setShowList(false);
                    }}
                    aria-pressed={
                      selected?.numero === item.numero &&
                      selected?.empresa === item.empresa
                    }
                    aria-label={`Viagem ${item.numero}, empresa ${item.empresa}`}
                  >
                    <div>
                      <strong>Viagem {item.numero}</strong>
                      <Status trip={item} />
                    </div>
                    <div>
                      <span className="trip-plate">
                        {item.placa || "Sem placa"}
                      </span>
                      <span>{date(item.saida)}</span>
                    </div>
                    <p>{item.motorista || "Motorista não informado"}</p>
                    <div className="trip-item-bottom">
                      <span>Empresa {item.empresa}</span>
                      <b>
                        {money(item.fretes)} <small>em fretes</small>
                      </b>
                    </div>
                  </button>
                ))}
                {!data.itens.length && (
                  <p className="trip-empty">
                    Nenhuma viagem encontrada. Ajuste os filtros.
                  </p>
                )}
              </div>
              <div className="trip-pagination">
                <button
                  className="btn"
                  disabled={filters.page <= 1}
                  onClick={() =>
                    setFilters({ ...filters, page: filters.page - 1 })
                  }
                >
                  Anterior
                </button>
                <span>
                  {filters.page} /{" "}
                  {Math.max(1, Math.ceil(data.total / data.pageSize))}
                </span>
                <button
                  className="btn"
                  disabled={filters.page * data.pageSize >= data.total}
                  onClick={() =>
                    setFilters({ ...filters, page: filters.page + 1 })
                  }
                >
                  Próxima
                </button>
              </div>
            </section>
            <section className="trip-detail" aria-label="Detalhes da viagem">
              {detailLoading && (
                <div className="card trip-empty" role="status">
                  Carregando detalhes…
                </div>
              )}
              {detailError && (
                <div className="card trip-error" role="alert">
                  {detailError}
                  <button
                    className="btn"
                    onClick={() => setDetailAttempt((n) => n + 1)}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
              {v && (
                <>
                  <div className="card trip-overview">
                    <div className="trip-section-head">
                      <div>
                        <p>Empresa {v.empresa}</p>
                        <h2>
                          Viagem {v.numero}{" "}
                          <span className="trip-plate">{v.placa}</span>
                        </h2>
                        <p className="trip-driver">
                          {v.motorista || "Motorista não informado"}
                        </p>
                      </div>
                      <Status trip={v} />
                    </div>
                    <div className="trip-journey">
                      <div>
                        <small>Saída</small>
                        <strong>{date(v.saida)}</strong>
                        <span>
                          {v.horaSaida?.slice(0, 5) || "Horário não informado"}
                        </span>
                      </div>
                      <span className="trip-journey-line">→</span>
                      <div>
                        <small>Chegada</small>
                        <strong>{date(v.chegada)}</strong>
                        <span>
                          {v.horaChegada?.slice(0, 5) ||
                            "Horário não informado"}
                        </span>
                      </div>
                      <div>
                        <small>Acerto</small>
                        <strong>{date(v.acerto)}</strong>
                      </div>
                    </div>
                    <details className="trip-operational">
                      <summary>Quilometragem e outros dados</summary>
                      <dl className="trip-facts">
                        {[
                          ["Motorista", v.motorista],
                          ["Reboque", v.reboque],
                          ["KM de saída", number(v.kmSaida)],
                          ["KM de chegada", number(v.kmChegada)],
                          ["KM percorridos", number(v.kmPercorrido)],
                          ["KM vazio", number(v.kmVazio)],
                          ["Entregas", number(v.entregas)],
                          ["Litros", number(v.litros)],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt>{label}</dt>
                            <dd>{value || "—"}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  </div>
                  <dl
                    className="trip-summary-values"
                    aria-label="Valores registrados"
                  >
                    {[
                      ["Total em fretes", v.fretes],
                      ["Despesas", v.despesas],
                      ["Abastecimentos", v.abastecimentos],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{money(value)}</dd>
                      </div>
                    ))}
                  </dl>
                  <CteAudit
                    key={`audit-${v.empresa}-${v.numero}`}
                    audit={detail.conferencia}
                    onRetry={() => setDetailAttempt((n) => n + 1)}
                  />
                  <details key={`manifestos-${v.empresa}-${v.numero}`} className="card trip-documents">
                    <summary>Manifestos (MDF-e){detail.manifestosDisponiveis !== false ? ` · ${detail.manifestos?.length || 0}` : " · consulta indisponível"}</summary>
                    {detail.manifestosDisponiveis === false ? <p className="trip-empty" role="status">Não foi possível consultar os manifestos. Recarregue a viagem para tentar novamente.</p> :
                      <DataTable rows={detail.manifestos || []} columns={[
                        ["numero","Manifesto"],["serie","Série"],["empresa","Empresa"],["placa","Placa"],
                        ["status","Situação"],["encerradoEm","Baixa / encerramento", value => value ? new Date(value).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"}) : "Sem baixa"]
                      ]} emptyText="Nenhum manifesto vinculado a esta viagem." />}
                  </details>
                  <TripIndicators key={`${v.empresa}-${v.numero}`} trip={v} />
                  <details className="card trip-breakdown">
                    <summary>Consultar acerto do motorista</summary>
                    <dl className="trip-facts">
                      {[
                        ["Pedágios", v.pedagios],
                        ["Diárias", v.diarias],
                        ["Comissão", v.comissao],
                        ["Impostos", v.impostos],
                        ["Saldo do motorista", v.saldoMotorista],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{money(value)}</dd>
                        </div>
                      ))}
                    </dl>
                    <p>
                      Totais conforme o controle de viagem do sistema de origem.
                    </p>
                  </details>
                  <details
                    key={`documents-${v.empresa}-${v.numero}`}
                    className="card trip-documents"
                  >
                    <summary>
                      Consultar fretes, despesas e abastecimentos
                    </summary>
                    <div
                      className="trip-tabs"
                      role="tablist"
                      aria-label="Itens da viagem"
                    >
                      {[
                        ["fretes", "Fretes e documentos"],
                        ["despesas", "Despesas"],
                        ["abastecimentos", "Abastecimentos"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          role="tab"
                          aria-selected={tab === key}
                          onClick={() => setTab(key)}
                        >
                          {label}
                          <span>{detail[key].length}</span>
                        </button>
                      ))}
                    </div>
                    {tab === "fretes" && (
                      <DataTable
                        rows={detail.fretes}
                        columns={[
                          ["data", "Data", date],
                          ["documento", "Documento"],
                          ["cliente", "Cliente"],
                          ["origem", "Origem"],
                          ["destino", "Destino"],
                          ["peso", "Peso", number],
                          ["valor", "Frete", money],
                        ]}
                        emptyText="Nenhum frete vinculado a esta viagem."
                      />
                    )}
                    {tab === "despesas" && (
                      <DataTable
                        rows={detail.despesas}
                        columns={[
                          ["data", "Data", date],
                          ["fornecedor", "Fornecedor"],
                          ["documento", "Documento"],
                          ["observacao", "Descrição"],
                          ["valor", "Valor", money],
                        ]}
                        emptyText="Nenhuma despesa vinculada a esta viagem."
                      />
                    )}
                    {tab === "abastecimentos" && (
                      <DataTable
                        rows={detail.abastecimentos}
                        columns={[
                          ["data", "Data", date],
                          ["documento", "Documento"],
                          ["km", "KM", number],
                          ["litros", "Litros", number],
                          ["valorLitro", "R$/litro", money],
                          ["valor", "Total", money],
                        ]}
                        emptyText="Nenhum abastecimento vinculado a esta viagem."
                      />
                    )}
                  </details>
                  {(v.observacao || v.observacaoPrincipal) && (
                    <div className="card trip-notes">
                      <h3>Observações da viagem</h3>
                      {v.observacaoPrincipal && <p>{v.observacaoPrincipal}</p>}
                      {v.observacao && <p>{v.observacao}</p>}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )
      )}
    </div>
  );
}
window.ConsultaViagens = ConsultaViagens;
