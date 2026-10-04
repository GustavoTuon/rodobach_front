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
    <span className={`trip-status ${value === "FECHADA" || value === "Finalizada" ? "closed" : ""}`}>
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
  if (!audit?.disponivel) return <section className="card trip-audit"><h3>Conferência de CT-es</h3><p role="status">{audit?.mensagem || 'Conferência indisponível.'}</p><button className="btn" onClick={onRetry}>Conferir novamente</button></section>;
  const labels = { vinculado: 'Vinculado', sem_vinculo: 'Possível faltante', outra_viagem: 'Em outra viagem', duplicado: 'Vínculo em mais de uma viagem', fora_periodo: 'Data ou placa divergente' };
  const rows = audit.documentos.filter(d => all || d.situacao !== 'vinculado');
  return <section className="card trip-audit" aria-label="Conferência de CT-es">
    <div className="trip-audit-heading"><div><h3>Conferência de CT-es</h3><p>{date(audit.inicio)} a {date(audit.fim)} · emissão por dia, incluindo saída e chegada</p></div><span className={`trip-audit-badge ${audit.pendencias ? 'warning' : ''}`}>{audit.pendencias ? `${audit.pendencias} para revisar` : audit.emitidos ? 'Sem divergências' : 'Sem emissões no período'}</span></div>
    <div className="trip-audit-counts">{[['CT-es com financeiro',audit.emitidos],['Vínculos conferidos',audit.vinculados],['Sem vínculo',audit.semVinculo],['Outras divergências',audit.divergencias]].map(([label,total],i)=><div className={i>1&&total?'warning':''} key={label}><strong>{total}</strong><span>{label}</span></div>)}</div>
    <div className="trip-audit-toolbar"><p>Somente CT-es emitidos com título financeiro ativo, em aberto ou quitado. Documentos sem vínculo são candidatos à revisão; viagens podem compartilhar o mesmo período.</p><button className="btn" onClick={()=>setAll(!all)}>{all?'Ver só pendências':'Ver todos os CT-es'}</button></div>
    <div className="trip-table-wrap"><table className="data-table"><thead><tr><th>CT-e / série</th><th>Emissão</th><th>Placa</th><th>Conferência</th><th>Viagem vinculada</th></tr></thead><tbody>{rows.map(d=><tr key={`${d.empresa}-${d.serie}-${d.codigo}`} className={d.situacao==='vinculado'?'':'trip-audit-pending'}><td><strong>{d.numero || `Cód. ${d.codigo}`} / {d.serie}</strong><small className="trip-cell-sub">Empresa {d.empresa}</small></td><td>{date(d.emissao)}</td><td>{d.placa || '—'}</td><td><span className={`trip-audit-badge ${d.situacao==='vinculado'?'':'warning'}`}>{labels[d.situacao]}</span></td><td>{d.vinculos.length?d.vinculos.map(v=>`${v.numero} (empresa ${v.empresa})`).join(', '):'Sem viagem'}</td></tr>)}</tbody></table></div>
    {!rows.length && <p className="trip-empty">{audit.emitidos ? 'Nenhuma pendência encontrada nesta conferência.' : 'Nenhum CT-e emitido para esta placa no período informado.'}</p>}
  </section>;
}
export function TripIndicators({ trip }) {
  const [open,setOpen]=useState(false),[mode,setMode]=useState('viagem'),[data,setData]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!open)return;
    let active=true;setError('');setData(null);
    window.RB_API.getConsultaViagemIndicadores(trip.empresa,trip.numero).then(r=>{if(active)setData(r)}).catch(e=>{if(active)setError(e.message||'Não foi possível carregar os indicadores.')});
    return ()=>{active=false};
  },[open,trip.empresa,trip.numero,attempt]);
  const current=data?.[mode];
  return <section className="card trip-indicators" aria-label="Indicadores de resultado">
    <div className="trip-audit-heading"><div><h3>Receita, custo e lucro</h3><p>Compare o resultado da viagem com o resultado da placa no período.</p></div><button className="btn" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Recolher indicadores':'Ver indicadores'}</button></div>
    {open&&<>
      <div className="trip-tabs" role="tablist" aria-label="Visão do resultado">{[['viagem','Somente esta viagem'],['veiculo','Veículo no período']].map(([key,label])=><button key={key} role="tab" aria-selected={mode===key} onClick={()=>setMode(key)}>{label}</button>)}</div>
      {error?<div className="trip-error" role="alert">{error}<button className="btn" onClick={()=>setAttempt(n=>n+1)}>Tentar novamente</button></div>:!data?<p className="trip-empty" role="status">Calculando indicadores…</p>:!current?.disponivel?<p className="trip-empty">{current?.mensagem||'O controle não possui os totais necessários para calcular o resultado.'}</p>:<div className="trip-result-body">
        <p className="trip-result-method">{mode==='viagem'?'Receita e resultado do controle da viagem. Custo líquido = fretes menos o saldo total do ERP, preservando os ajustes do acerto. Resultado provisório enquanto a viagem estiver aberta.':`${trip.placa} · ${date(trip.saida)} a ${date(trip.chegada)}. Receitas e custos variáveis por emissão/data do lançamento. Custos fixos rateados pelos dias da viagem em cada mês; parcelas do contas a pagar pelo mês do vencimento, pagas ou em aberto.`}</p>
        <div className="trip-kpis">{[['Receita',current.receita],['Custo',current.custo],['Lucro / prejuízo',current.lucro],['Margem',current.margem]].map(([label,value],i)=><div className={`card ${i===2?(value<0?'trip-loss':'trip-profit'):''}`} key={label}><span>{label}</span><strong>{i===3?(value==null?'—':`${number(value)}%`):money(value)}</strong></div>)}</div>
        {mode==='viagem'?<DataTable rows={current.componentes} columns={[["conta","Composição do custo líquido"],["valor","Valor",money]]}/>:<>
          <div className="trip-result-verdict"><strong>{!current.itens.length?'Sem lançamentos financeiros para avaliar.':current.lucro>=0?'A receita cobriu os custos considerados.':'A receita não cobriu os custos considerados.'}</strong><span>Custos fixos: {money(current.fixos)} · Financiamentos incluídos: {money(current.financiamentos)}</span></div>
          <p className="trip-result-method">Fixos: financiamentos, seguros da frota, IPVA/licenciamento, aluguel de veículos e depreciação. Apenas valores lançados e atribuídos à placa. Despesas sem placa/centro identificável e custos ainda não lançados não entram. Períodos de viagens sobrepostos não devem ser somados.</p>
          <DataTable rows={current.itens.map(r=>({...r,rateio:r.fixo?`${r.dias}/${r.diasMes} dias`:'Integral'}))} columns={[["data","Data",date],["conta","Conta financeira"],["documento","Documento"],["valorOriginal","Original (R$)",money],["rateio","Apropriação"],["valor","No período (R$)",money]]} emptyText="Nenhum lançamento financeiro encontrado."/>
          <p className="trip-result-method">Receitas positivas e custos negativos. Esta visão é gerencial, inclui parcelas de financiamento e não representa apenas dinheiro recebido ou pago.</p>
        </>}
      </div>}
    </>}
  </section>;
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
            Confira documentos, identifique pendências e acompanhe os valores da viagem.
          </div>
        </div>
        <span className="trip-origin">Dados do sistema do cliente</span>
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
        <label>
          Motorista
          <input value={form.motorista} maxLength={120} placeholder="Nome do motorista" onChange={e=>setForm({...form,motorista:e.target.value})}/>
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
          <div className="trip-workspace">
            <section
              className="card trip-list"
              aria-label="Viagens encontradas"
            >
              <div className="trip-section-head">
                <div>
                  <h2>Viagens encontradas</h2>
                  <p>{data.total} registro(s) · mais recentes primeiro</p>
                </div>
                <span className="trip-count">{data.total}</span>
              </div>
              <div className="trip-list-items">
                {data.itens.map((item) => (
                  <button
                    key={`${item.empresa}-${item.numero}`}
                    className={`trip-item ${selected?.numero === item.numero && selected?.empresa === item.empresa ? "selected" : ""}`}
                    onClick={() => setSelected(item)}
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
                        <p>CONTROLE DE VIAGEM · EMPRESA {v.empresa}</p>
                        <h2>
                          Viagem {v.numero}{" "}
                          <span className="trip-plate">{v.placa}</span>
                        </h2>
                        <p className="trip-driver">{v.motorista || 'Motorista não informado'}</p>
                      </div>
                      <Status trip={v} />
                    </div>
                    <div className="trip-journey">
                      <div>
                        <small>SAÍDA</small>
                        <strong>{date(v.saida)}</strong>
                        <span>{v.horaSaida?.slice(0,5) || "Horário não informado"}</span>
                      </div>
                      <span className="trip-journey-line">→</span>
                      <div>
                        <small>CHEGADA</small>
                        <strong>{date(v.chegada)}</strong>
                        <span>{v.horaChegada?.slice(0,5) || "Horário não informado"}</span>
                      </div>
                      <div>
                        <small>ACERTO</small>
                        <strong>{date(v.acerto)}</strong>
                      </div>
                    </div>
                    <details className="trip-operational"><summary>Detalhes operacionais · quilometragem, reboque e entregas</summary><dl className="trip-facts">
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
                    </dl></details>
                  </div>
                  <TripIndicators key={`${v.empresa}-${v.numero}`} trip={v}/>
                  <CteAudit key={`audit-${v.empresa}-${v.numero}`} audit={detail.conferencia} onRetry={()=>setDetailAttempt(n=>n+1)} />
                  <details className="card trip-breakdown">
                    <summary>Valores do acerto · pedágios, diárias e comissão</summary>
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
                  <div className="card trip-documents">
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
                  </div>
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
