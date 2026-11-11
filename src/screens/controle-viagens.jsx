import React, { useEffect, useState } from "react";
import "./controle-viagens.css";

const api = () => window.RB_API;
const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const dateLabel = (value) =>
  value ? value.slice(0, 10).split("-").reverse().join("/") : "A definir";
const today = () => new Date().toLocaleDateString("en-CA");
const statusNames = {
  rascunho: "Preparando",
  em_viagem: "Na estrada",
  conferencia: "Em conferência",
  concluida: "Concluída",
};
const steps = [
  ["principal", "Principal", "Veículo, motorista e percurso"],
  ["fretes", "Fretes e documentos", "O que esta viagem transporta"],
  ["despesas", "Despesas", "Gastos durante a viagem"],
  ["abastecimentos", "Abastecimentos", "Combustível e quilometragem"],
  ["motorista", "Motorista", "Diárias e premiações"],
  ["ocorrencias", "Ocorrências", "Imprevistos e soluções"],
  ["acerto", "Acerto da viagem", "Conferência e fechamento"],
];
export const newTrip = () => ({
  placa: "",
  motorista: "",
  reboque: "",
  origem: "",
  destino: "",
  saida: "",
  horaSaida: "",
  chegada: "",
  horaChegada: "",
  kmSaida: null,
  kmChegada: null,
  kmVazio: 0,
  observacao: "",
  status: "rascunho",
  fretes: [],
  despesas: [],
  abastecimentos: [],
  adiantamentos: [],
  recebimentos: [],
  premios: [],
  diariasAvulsas: [],
  diarias: [],
  diariasPeriodo: "",
  ocorrencias: [],
  refeicoes: [
    { nome: "Café da manhã", horario: "07:00", valor: 0 },
    { nome: "Almoço", horario: "12:00", valor: 0 },
    { nome: "Jantar", horario: "19:00", valor: 0 },
  ],
  conferido: {
    fretes: false,
    despesas: false,
    abastecimentos: false,
    motorista: false,
    ocorrencias: false,
  },
});
export function tripProgress(t) {
  const done = {
    principal: !!(t.placa && t.motorista && t.saida && t.horaSaida),
    ...t.conferido,
    acerto: t.status === "concluida",
  };
  return { done, count: Object.values(done).filter(Boolean).length, total: 7 };
}
export function controlTotals(t) {
  const sum = (rows) =>
    Math.round(rows.reduce((s, r) => s + Number(r.valor || 0), 0) * 100) / 100;
  const receita = sum(t.fretes),
    despesas = sum(t.despesas),
    abastecimentos = sum(t.abastecimentos),
    diarias =
      sum(t.diarias.filter((i) => i.incluir)) + sum(t.diariasAvulsas || []),
    premios = sum(t.premios),
    adiantamentos = sum(t.adiantamentos),
    recebimentos = sum(t.recebimentos),
    reembolsos = sum(
      [...t.despesas, ...t.abastecimentos].filter((i) => i.motoristaPagou),
    );
  return {
    receita,
    despesas,
    abastecimentos,
    diarias,
    premios,
    adiantamentos,
    recebimentos,
    reembolsos,
    resultado: receita - despesas - abastecimentos - diarias - premios,
    saldoMotorista:
      diarias + premios + reembolsos - adiantamentos - recebimentos,
  };
}
function Field({ label, children, hint }) {
  return (
    <label className="tc-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Empty({ title, children }) {
  return (
    <div className="tc-empty">
      <span aria-hidden="true">◇</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Dialog({ title, onClose, children }) {
  const ref = React.useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.showModal();
    return () => {
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="tc-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="tc-dialog-heading">
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </div>
      {children}
    </dialog>
  );
}
const sectionNames = {
  fretes: "frete",
  despesas: "despesa",
  abastecimentos: "abastecimento",
  premios: "premiação",
  diariasAvulsas: "diária avulsa",
  adiantamentos: "adiantamento",
  recebimentos: "recebimento",
};
function MealParametersDialog({ onClose, onSaved, readOnly }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api()
      .getControleParametrosDiarias()
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  function update(index, key, value) {
    setData((d) => ({
      ...d,
      refeicoes: d.refeicoes.map((m, i) =>
        i === index ? { ...m, [key]: value } : m,
      ),
    }));
  }
  return (
    <Dialog
      title="Parâmetros de diárias"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p className="tc-help">
        Padrão para novas viagens. Alterações não modificam diárias já lançadas.
        Em uma viagem existente, use “Aplicar padrão atual” e recalcule para
        atualizar.
      </p>
      {error && (
        <p className="tc-error" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Carregando parâmetros…</p>}
      {data && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api().saveControleParametrosDiarias(data);
              onSaved();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="tc-meal-settings">
            {data.refeicoes.map((m, i) => (
              <div key={m.nome}>
                <h3>{m.nome}</h3>
                <Field label={`${m.nome}: valor (R$)`}>
                  <input
                    type="number"
                    required
                    min="0"
                    max="10000"
                    step="0.01"
                    disabled={busy || readOnly}
                    value={m.valor}
                    onChange={(e) =>
                      update(
                        i,
                        "valor",
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                  />
                </Field>
                <Field label={`${m.nome}: horário`}>
                  <input
                    required
                    type="time"
                    disabled={busy || readOnly}
                    value={m.horario}
                    onChange={(e) => update(i, "horario", e.target.value)}
                  />
                </Field>
                <Field
                  label={`${m.nome}: ou após horas no dia`}
                  hint="Opcional. Deixe vazio para usar somente o horário."
                >
                  <input
                    type="number"
                    min="0.25"
                    max="24"
                    step="0.25"
                    disabled={busy || readOnly}
                    value={m.horas ?? ""}
                    onChange={(e) =>
                      update(
                        i,
                        "horas",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                </Field>
              </div>
            ))}
          </div>
          <p className="tc-help">
            A regra de horas considera o tempo da viagem dentro de cada dia,
            desde a saída ou meia-noite. Não é uma medição das horas dirigidas.
            Horário e quantidade de horas são alternativas: a refeição é contada
            no máximo uma vez por dia.
          </p>
          <div className="tc-dialog-actions">
            <button type="button" disabled={busy} onClick={onClose}>
              Fechar
            </button>
            <button className="tc-primary" disabled={busy || readOnly}>
              {busy ? "Salvando…" : "Salvar parâmetros"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
function EntryDialog({ kind, initial, onClose, onAdd }) {
  const [v, set] = useState(
    initial || {
      id: crypto.randomUUID(),
      descricao: "",
      data: today(),
      valor: 0,
      documento: "",
      pessoa: "",
      litros: 0,
      km: null,
      motoristaPagou: false,
      origem: "manual",
      vinculo: "",
    },
  );
  const update = (key, value) => set((s) => ({ ...s, [key]: value }));
  return (
    <Dialog
      title={`${initial ? "Editar" : "Novo"} ${sectionNames[kind]}`}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(v);
        }}
      >
        <div className="tc-fields">
          <Field label="Descrição">
            <input
              required
              maxLength={500}
              value={v.descricao}
              onChange={(e) => update("descricao", e.target.value)}
            />
          </Field>
          <Field label="Data">
            <input
              required
              type="date"
              value={v.data}
              onChange={(e) => update("data", e.target.value)}
            />
          </Field>
          <Field label="Valor (R$)">
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              max="1000000000"
              value={v.valor || ""}
              onChange={(e) => update("valor", Number(e.target.value))}
            />
          </Field>
          <Field label="Documento / referência">
            <input
              maxLength={120}
              value={v.documento}
              onChange={(e) => update("documento", e.target.value)}
            />
          </Field>
          <Field
            label={kind === "fretes" ? "Cliente" : "Fornecedor / favorecido"}
          >
            <input
              maxLength={160}
              value={v.pessoa}
              onChange={(e) => update("pessoa", e.target.value)}
            />
          </Field>
          {kind === "abastecimentos" && (
            <>
              <Field label="Litros">
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={v.litros || ""}
                  onChange={(e) => update("litros", Number(e.target.value))}
                />
              </Field>
              <Field label="Quilometragem">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={v.km ?? ""}
                  onChange={(e) =>
                    update(
                      "km",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </Field>
            </>
          )}
        </div>
        {["despesas", "abastecimentos"].includes(kind) && (
          <label className="tc-check">
            <input
              type="checkbox"
              checked={v.motoristaPagou}
              onChange={(e) => update("motoristaPagou", e.target.checked)}
            />
            Pago pelo motorista com recursos próprios (reembolso no acerto)
          </label>
        )}
        {kind === "recebimentos" && (
          <p className="tc-help">
            Valor de frete recebido em mãos pelo motorista. Será descontado do
            saldo a pagar a ele.
          </p>
        )}
        <div className="tc-dialog-actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="tc-primary">Adicionar ao controle</button>
        </div>
      </form>
    </Dialog>
  );
}
function DocumentDialog({ kind, trip, onClose, onAdd }) {
  const [range, setRange] = useState({
    inicio: trip.saida || today(),
    fim: trip.chegada || today(),
  });
  const [rows, setRows] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [selected, setSelected] = useState([]);
  async function search(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSelected([]);
    try {
      setRows(
        await api().searchControleDocumentos({
          tipo: kind,
          placa: trip.placa,
          ...range,
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={
        kind === "fretes"
          ? "Vincular documentos do ERP"
          : kind === "despesas"
            ? "Vincular despesas já lançadas"
            : "Vincular abastecimentos do ERP"
      }
      onClose={onClose}
    >
      <p className="tc-help">
        Busque os lançamentos de <strong>{trip.placa}</strong> e selecione os
        que pertencem à viagem.
      </p>
      <form className="tc-search" onSubmit={search}>
        <Field label="De">
          <input
            type="date"
            required
            value={range.inicio}
            onChange={(e) => setRange({ ...range, inicio: e.target.value })}
          />
        </Field>
        <Field label="Até">
          <input
            type="date"
            required
            value={range.fim}
            min={range.inicio}
            onChange={(e) => setRange({ ...range, fim: e.target.value })}
          />
        </Field>
        <button disabled={busy}>{busy ? "Buscando…" : "Buscar"}</button>
      </form>
      {error && (
        <p className="tc-error" role="alert">
          {error}
        </p>
      )}
      <div className="tc-document-list">
        {rows?.itens.map((row) => {
          const bound =
            !!row.viagemVinculada ||
            trip[kind].some((i) => i.vinculo === row.vinculo);
          return (
            <label
              className={`tc-document ${bound ? "is-bound" : ""}`}
              key={row.vinculo}
            >
              <input
                type="checkbox"
                disabled={bound}
                checked={selected.includes(row.vinculo)}
                onChange={(e) =>
                  setSelected((s) =>
                    e.target.checked
                      ? [...s, row.vinculo]
                      : s.filter((k) => k !== row.vinculo),
                  )
                }
              />
              <div>
                <strong>
                  {row.descricao} {row.documento && `· ${row.documento}`}
                </strong>
                <small>
                  {dateLabel(row.data)} · {row.pessoa || "Sem favorecido"}
                  {bound ? " · Já vinculado" : ""}
                </small>
              </div>
              <b>{money(row.valor)}</b>
            </label>
          );
        })}
      </div>
      {rows && !rows.itens.length && (
        <Empty title="Nenhum lançamento neste período">
          Confira as datas ou registre um lançamento manual.
        </Empty>
      )}
      {rows?.temMais && (
        <p className="tc-help">
          Exibindo os primeiros 100 registros. Reduza o período para encontrar
          outros.
        </p>
      )}
      <div className="tc-dialog-actions">
        <span>{selected.length} selecionado(s)</span>
        <button
          disabled={!selected.length || busy}
          className="tc-primary"
          onClick={() =>
            onAdd(rows.itens.filter((r) => selected.includes(r.vinculo)))
          }
        >
          Vincular à viagem
        </button>
      </div>
    </Dialog>
  );
}
function ErpDialog({ onClose, onImport }) {
  const [filter, setFilter] = useState({
      numero: "",
      placa: "",
      motorista: "",
    }),
    [rows, setRows] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function search(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setRows(await api().listConsultaViagens(filter));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="Trazer uma viagem do ERP" onClose={onClose}>
      <p className="tc-help">
        Importe a viagem com seus fretes, despesas e abastecimentos. As próximas
        alterações serão salvas aqui.
      </p>
      <form className="tc-search" onSubmit={search}>
        <Field label="Número">
          <input
            inputMode="numeric"
            value={filter.numero}
            onChange={(e) =>
              setFilter({
                ...filter,
                numero: e.target.value.replace(/\D/g, ""),
              })
            }
          />
        </Field>
        <Field label="Placa">
          <input
            maxLength={7}
            value={filter.placa}
            onChange={(e) =>
              setFilter({ ...filter, placa: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <button disabled={busy}>{busy ? "Buscando…" : "Buscar no ERP"}</button>
      </form>
      {error && (
        <p className="tc-error" role="alert">
          {error}
        </p>
      )}
      <div className="tc-document-list">
        {rows?.itens.map((r) => (
          <div className="tc-document" key={`${r.empresa}:${r.numero}`}>
            <div>
              <strong>
                #{r.numero} · {r.placa}
              </strong>
              <small>
                {r.motorista} · {dateLabel(r.saida)} · Empresa {r.empresa}
              </small>
            </div>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await onImport({ empresa: r.empresa, numero: r.numero });
                } catch (e) {
                  setError(e.message);
                  setBusy(false);
                }
              }}
            >
              Importar e abrir →
            </button>
          </div>
        ))}
      </div>
      {rows && !rows.itens.length && (
        <Empty title="Nenhuma viagem encontrada">
          Tente outro número ou placa.
        </Empty>
      )}
      {rows?.total > 30 && (
        <p className="tc-help">
          Mostrando as 30 mais recentes. Filtre por número ou placa.
        </p>
      )}
    </Dialog>
  );
}
function Entries({ kind, trip, change, onEntry, onLink, readOnly }) {
  const rows = trip[kind];
  return (
    <>
      <div className="tc-section-head">
        <div>
          <h2>
            {kind === "diariasAvulsas"
              ? "Diárias avulsas"
              : kind === "premios"
                ? "Premiações e comissões"
                : kind === "recebimentos"
                  ? "Fretes recebidos pelo motorista"
                  : kind === "adiantamentos"
                    ? "Adiantamentos"
                    : steps.find((s) => s[0] === kind)?.[1]}
          </h2>
          <p>
            {rows.length} lançamento(s) ·{" "}
            {money(rows.reduce((s, r) => s + r.valor, 0))}
          </p>
        </div>
        <div className="tc-actions">
          {["fretes", "despesas", "abastecimentos"].includes(kind) && (
            <button
              disabled={readOnly || !trip.placa}
              onClick={() => onLink(kind)}
            >
              ↗ Vincular existente
            </button>
          )}
          <button
            className="tc-primary"
            disabled={readOnly}
            onClick={() => onEntry({ kind })}
          >
            ＋ Novo lançamento
          </button>
        </div>
      </div>
      {!rows.length ? (
        ["premios", "diariasAvulsas", "adiantamentos", "recebimentos"].includes(
          kind,
        ) ? (
          <p className="tc-compact-empty">
            Nenhum lançamento. Adicione somente se houver {sectionNames[kind]}{" "}
            nesta viagem.
          </p>
        ) : (
          <Empty title="Tudo começa com o primeiro lançamento">
            Vincule um registro existente ou adicione um novo{" "}
            {sectionNames[kind]}. Se não houve lançamentos, você pode conferir a
            etapa assim mesmo.
          </Empty>
        )
      ) : (
        <div className="tc-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data / documento</th>
                <th>Descrição</th>
                {kind === "abastecimentos" && <th>Litros / KM</th>}
                <th>Origem</th>
                <th className="tc-num">Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {dateLabel(row.data)}
                    <small>{row.documento || "Sem documento"}</small>
                  </td>
                  <td>
                    <strong>{row.descricao || "Sem descrição"}</strong>
                    <small>
                      {row.pessoa}
                      {row.motoristaPagou ? " · Reembolsar motorista" : ""}
                    </small>
                  </td>
                  {kind === "abastecimentos" && (
                    <td>
                      {row.litros.toLocaleString("pt-BR")} L
                      <small>{row.km?.toLocaleString("pt-BR") || "—"} km</small>
                    </td>
                  )}
                  <td>
                    <span className="tc-tag">
                      {row.origem === "erp"
                        ? "ERP"
                        : row.origem === "despesa"
                          ? "Despesas"
                          : "Manual"}
                    </span>
                  </td>
                  <td className="tc-num">{money(row.valor)}</td>
                  <td>
                    <div className="tc-actions">
                      {!row.vinculo && (
                        <button
                          disabled={readOnly}
                          onClick={() => onEntry({ kind, initial: row })}
                          aria-label={`Editar ${row.descricao}`}
                        >
                          Editar
                        </button>
                      )}
                      {["despesas", "abastecimentos"].includes(kind) &&
                        row.vinculo && (
                          <label className="tc-check">
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={row.motoristaPagou}
                              onChange={(e) =>
                                change(
                                  kind,
                                  rows.map((r) =>
                                    r.id === row.id
                                      ? {
                                          ...r,
                                          motoristaPagou: e.target.checked,
                                        }
                                      : r,
                                  ),
                                )
                              }
                            />
                            Reembolsar
                          </label>
                        )}
                      <button
                        disabled={readOnly}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Remover este lançamento do controle? O registro original será preservado.",
                            )
                          )
                            change(
                              kind,
                              rows.filter((i) => i.id !== row.id),
                            );
                        }}
                        aria-label={`Remover ${row.descricao}`}
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ControleViagens() {
  const [list, setList] = useState({ itens: [], total: 0 }),
    [filters, setFilters] = useState({ search: "", status: "", page: 1 }),
    [query, setQuery] = useState(""),
    [refresh, setRefresh] = useState(0);
  const [trip, setTrip] = useState(null),
    [tab, setTab] = useState("principal"),
    [dirty, setDirty] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [entry, setEntry] = useState(null),
    [link, setLink] = useState(null),
    [erp, setErp] = useState(false),
    [mealPreview, setMealPreview] = useState(null),
    [occurrence, setOccurrence] = useState(null);
  const [parametersOpen, setParametersOpen] = useState(false);
  const readOnly = !!window.RB_AUTH?.getUser()?.readOnly;
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api()
      .listControleViagens(filters)
      .then((r) => {
        if (active) setList(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, refresh]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const canLeave = () =>
    !dirty || window.confirm("Há alterações não salvas. Deseja descartá-las?");
  function change(key, value) {
    setTrip((t) => ({
      ...t,
      [key]: value,
      conferido: {
        ...t.conferido,
        ...(["placa", "motorista"].includes(key)
          ? {
              fretes: false,
              despesas: false,
              abastecimentos: false,
              motorista: false,
              ocorrencias: false,
            }
          : {}),
        ...(Object.hasOwn(t.conferido, key) ? { [key]: false } : {}),
        ...([
          "diarias",
          "despesas",
          "abastecimentos",
          "diariasAvulsas",
          "refeicoes",
          "premios",
          "adiantamentos",
          "recebimentos",
          "saida",
          "chegada",
          "horaSaida",
          "horaChegada",
        ].includes(key)
          ? { motorista: false }
          : {}),
      },
    }));
    setDirty(true);
    setNotice("");
    setMealPreview(null);
  }
  function accept(t) {
    setTrip(t);
    setDirty(false);
    setTab("principal");
    setError("");
    setMealPreview(null);
  }
  async function open(t) {
    if (!canLeave()) return;
    setBusy(true);
    setError("");
    try {
      accept(await api().getControleViagem(t.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save(status) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await api().saveControleViagem({
        ...trip,
        status: status || trip.status,
      });
      setTrip(saved);
      setDirty(false);
      setNotice(
        status === "concluida"
          ? "Viagem concluída. Tudo conferido!"
          : "Controle salvo com sucesso.",
      );
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const totals = trip ? controlTotals(trip) : null,
    progress = trip ? tripProgress(trip) : null;
  const locked = readOnly || busy || trip?.status === "concluida";
  const next = trip ? steps.find(([key]) => !progress.done[key]) : null;
  const period = trip
    ? `${trip.saida}T${trip.horaSaida}/${trip.chegada}T${trip.horaChegada}`
    : "";
  const staleMeals = trip?.diarias.length > 0 && trip.diariasPeriodo !== period;
  const complete =
    trip &&
    progress.count >= 6 &&
    trip.chegada &&
    trip.horaChegada &&
    trip.kmSaida !== null &&
    trip.kmChegada !== null &&
    !trip.ocorrencias.some((o) => !o.resolvida) &&
    !staleMeals;
  const field = (key, label, type = "text", opts = {}) => (
    <Field label={label}>
      <input
        type={type}
        {...opts}
        disabled={locked}
        value={trip[key] ?? ""}
        onChange={(e) =>
          change(
            key,
            type === "number"
              ? e.target.value === ""
                ? null
                : Number(e.target.value)
              : key === "placa"
                ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                : e.target.value,
          )
        }
      />
    </Field>
  );
  const confirmStep = (key) => {
    setTrip((t) => ({
      ...t,
      conferido: { ...t.conferido, [key]: !t.conferido[key] },
    }));
    setDirty(true);
  };
  return (
    <div className="view tc-page">
      <header className="tc-heading">
        <div>
          <span className="tc-eyebrow">OPERAÇÃO / VIAGENS</span>
          <h1>
            Uma viagem. Tudo no lugar<span>.</span>
          </h1>
          <p>Do primeiro frete ao acerto com o motorista.</p>
        </div>
        <div className="tc-actions">
          <button disabled={busy} onClick={() => setParametersOpen(true)}>
            ⚙ Parâmetros de diárias
          </button>
          {trip ? (
            <button
              disabled={busy}
              onClick={() => {
                if (canLeave()) {
                  setTrip(null);
                  setDirty(false);
                  setNotice("");
                  setError("");
                }
              }}
            >
              ← Todas as viagens
            </button>
          ) : (
            <>
              <button disabled={readOnly || busy} onClick={() => setErp(true)}>
                ↗ Trazer do ERP
              </button>
              <button
                className="tc-primary"
                disabled={readOnly || busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const parameters =
                      await api().getControleParametrosDiarias();
                    accept({ ...newTrip(), refeicoes: parameters.refeicoes });
                    setDirty(true);
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                ＋ Nova viagem
              </button>
            </>
          )}
        </div>
      </header>
      {error && (
        <div className="tc-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="tc-success" role="status">
          ✓ {notice}
        </div>
      )}
      {readOnly && (
        <p className="tc-help">Seu acesso permite consultar os controles.</p>
      )}
      {!trip ? (
        <>
          <div className="tc-overview">
            <div>
              <span>SEU QUADRO DE VIAGENS</span>
              <strong>{list.total}</strong>
              <p>controles encontrados</p>
            </div>
            <div>
              <span>UM PASSO DE CADA VEZ</span>
              <h2>Prepare, acompanhe, confira.</h2>
              <p>
                Complete as etapas e veja o que falta para fechar cada viagem.
              </p>
            </div>
            <div className="tc-overview-mark" aria-hidden="true">
              ↗
            </div>
          </div>
          <form
            className="tc-toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              setFilters({ ...filters, search: query, page: 1 });
            }}
          >
            <input
              aria-label="Buscar viagem"
              placeholder="Buscar por placa, motorista ou número…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Situação da viagem"
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value, page: 1 })
              }
            >
              <option value="">Todas as situações</option>
              {Object.entries(statusNames).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <button>Buscar</button>
            <button type="button" onClick={() => setRefresh((n) => n + 1)}>
              Atualizar
            </button>
          </form>
          {loading ? (
            <p className="tc-loading" role="status">
              Carregando controles…
            </p>
          ) : !list.itens.length ? (
            <Empty title="Seu próximo percurso começa aqui">
              Crie uma viagem ou traga um controle do ERP para continuar por
              aqui.
            </Empty>
          ) : (
            <div className="tc-trip-grid">
              {list.itens.map((t) => {
                const p = tripProgress(t);
                return (
                  <button
                    className="tc-trip-card"
                    key={t.id}
                    disabled={busy}
                    onClick={() => open(t)}
                  >
                    <div className="tc-card-top">
                      <span className={`tc-status ${t.status}`}>
                        {statusNames[t.status]}
                      </span>
                      <small>
                        #{t.id}
                        {t.erpNumero ? ` · ERP ${t.erpNumero}` : ""}
                      </small>
                    </div>
                    <h2>{t.placa}</h2>
                    <p>{t.motorista}</p>
                    <div className="tc-route">
                      {t.origem || "Origem a definir"}
                      <span>→</span>
                      {t.destino || "Destino a definir"}
                    </div>
                    <div className="tc-card-progress">
                      <span>{p.count} de 7 etapas</span>
                      <strong>{Math.round((p.count / 7) * 100)}%</strong>
                    </div>
                    <div className="tc-progress">
                      <span style={{ width: `${(p.count / 7) * 100}%` }} />
                    </div>
                    <footer>
                      <span>Saída · {dateLabel(t.saida)}</span>
                      <b>Abrir viagem ↗</b>
                    </footer>
                  </button>
                );
              })}
            </div>
          )}
          <div className="tc-pagination">
            <button
              disabled={filters.page === 1 || loading}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              ← Anterior
            </button>
            <span>Página {filters.page}</span>
            <button
              disabled={filters.page * 30 >= list.total || loading}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              Próxima →
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="tc-trip-banner">
            <div>
              <span className="tc-eyebrow">
                {trip.id ? `CONTROLE #${trip.id}` : "NOVA VIAGEM"}
                {trip.erpNumero ? ` · ERP ${trip.erpNumero}` : ""}
              </span>
              <h2>
                {trip.placa || "Vamos preparar a viagem"}
                <span className={`tc-status ${trip.status}`}>
                  {statusNames[trip.status]}
                </span>
              </h2>
              <p>{trip.motorista || "Comece pelo veículo e pelo motorista"}</p>
            </div>
            <div className="tc-banner-progress">
              <strong>
                {progress.count}
                <span>/7</span>
              </strong>
              <div>
                <b>
                  {trip.status === "concluida"
                    ? "Missão concluída"
                    : "Etapas conferidas"}
                </b>
                <small>
                  {next
                    ? `Próximo passo: ${next[1]}`
                    : "Tudo pronto. Boa próxima viagem!"}
                </small>
              </div>
            </div>
          </div>
          <div className="tc-workspace">
            <nav className="tc-steps" aria-label="Etapas da viagem">
              {steps.map(([key, label, description], index) => (
                <button
                  key={key}
                  aria-label={label}
                  aria-current={tab === key ? "step" : undefined}
                  className={`${tab === key ? "active" : ""} ${progress.done[key] ? "done" : ""}`}
                  onClick={() => setTab(key)}
                >
                  <span className="tc-step-number">
                    {progress.done[key] ? "✓" : index + 1}
                  </span>
                  <span>
                    <b>{label}</b>
                    <small>{description}</small>
                  </span>
                </button>
              ))}
            </nav>
            <section
              className="tc-editor"
              aria-label={steps.find((s) => s[0] === tab)[1]}
            >
              {trip.status === "concluida" && (
                <div className="tc-success">
                  ✓ Viagem concluída e protegida para consulta.{" "}
                  <button
                    disabled={readOnly || busy}
                    onClick={() => {
                      if (
                        window.confirm("Reabrir esta viagem para conferência?")
                      )
                        save("conferencia");
                    }}
                  >
                    Reabrir conferência
                  </button>
                </div>
              )}
              {tab === "principal" && (
                <>
                  <div className="tc-section-head">
                    <div>
                      <span className="tc-eyebrow">01 / PREPARAR</span>
                      <h2>Quem vai e para onde?</h2>
                      <p>
                        Preencha o essencial. O retorno pode ser informado
                        depois.
                      </p>
                    </div>
                    <span className="tc-badge">🚚</span>
                  </div>
                  <div className="tc-fields">
                    {field("placa", "Placa *", "text", {
                      maxLength: 7,
                      placeholder: "ABC1D23",
                    })}
                    {field("motorista", "Motorista *", "text", {
                      maxLength: 160,
                      placeholder: "Nome do motorista",
                    })}
                    {field("reboque", "Reboque", "text", { maxLength: 10 })}
                    {field("origem", "Origem", "text", {
                      maxLength: 160,
                      placeholder: "Cidade / UF",
                    })}
                    {field("destino", "Destino", "text", {
                      maxLength: 160,
                      placeholder: "Cidade / UF",
                    })}
                    <Field label="Situação">
                      <select
                        disabled={locked}
                        value={trip.status}
                        onChange={(e) => change("status", e.target.value)}
                      >
                        {Object.entries(statusNames)
                          .filter(
                            ([k]) =>
                              k !== "concluida" || trip.status === "concluida",
                          )
                          .map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                      </select>
                    </Field>
                  </div>
                  <h3 className="tc-subheading">Saída e retorno</h3>
                  <div className="tc-fields">
                    {field("saida", "Data de saída", "date")}
                    {field("horaSaida", "Hora de saída", "time")}
                    {field("kmSaida", "KM de saída", "number", { min: 0 })}
                    {field("chegada", "Data de retorno", "date", {
                      min: trip.saida,
                    })}
                    {field("horaChegada", "Hora de retorno", "time")}
                    {field("kmChegada", "KM de retorno", "number", {
                      min: trip.kmSaida ?? 0,
                    })}
                    {field("kmVazio", "KM percorridos vazio", "number", {
                      min: 0,
                    })}
                    <div className="tc-distance">
                      <span>Distância registrada</span>
                      <strong>
                        {trip.kmSaida !== null && trip.kmChegada !== null
                          ? `${(trip.kmChegada - trip.kmSaida).toLocaleString("pt-BR")} km`
                          : "—"}
                      </strong>
                    </div>
                  </div>
                  <Field label="Observações">
                    <textarea
                      disabled={locked}
                      rows={3}
                      maxLength={5000}
                      value={trip.observacao}
                      onChange={(e) => change("observacao", e.target.value)}
                      placeholder="Instruções ou detalhes importantes para esta viagem"
                    />
                  </Field>
                  <p className="tc-help">
                    * Placa e motorista são obrigatórios para salvar o rascunho.
                  </p>
                </>
              )}
              {["fretes", "despesas", "abastecimentos"].includes(tab) && (
                <Entries
                  kind={tab}
                  trip={trip}
                  change={change}
                  onEntry={setEntry}
                  onLink={setLink}
                  readOnly={locked}
                />
              )}
              {tab === "motorista" && (
                <>
                  <div className="tc-section-head">
                    <div>
                      <span className="tc-eyebrow">
                        05 / CUIDAR DO MOTORISTA
                      </span>
                      <h2>Diárias sem contar uma por uma.</h2>
                      <p>
                        {trip.motorista ||
                          "Informe o motorista na etapa Principal"}
                      </p>
                    </div>
                  </div>
                  <div className="tc-meal-period">
                    <span>Período da viagem</span>
                    <strong>
                      {dateLabel(trip.saida)} {trip.horaSaida} →{" "}
                      {dateLabel(trip.chegada)} {trip.horaChegada}
                    </strong>
                    <button onClick={() => setTab("principal")}>
                      Editar período
                    </button>
                  </div>
                  <div className="tc-meal-settings">
                    {trip.refeicoes.map((m, index) => (
                      <div key={m.nome}>
                        <h3>
                          {["☀", "◷", "☾"][index]} {m.nome}
                        </h3>
                        <Field label={`Valor do ${m.nome.toLowerCase()} (R$)`}>
                          <input
                            disabled={locked}
                            type="number"
                            min="0"
                            step="0.01"
                            max="10000"
                            value={m.valor || ""}
                            placeholder="Definir valor"
                            onChange={(e) =>
                              change(
                                "refeicoes",
                                trip.refeicoes.map((r, i) =>
                                  i === index
                                    ? { ...r, valor: Number(e.target.value) }
                                    : r,
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field label={`Horário do ${m.nome.toLowerCase()}`}>
                          <input
                            disabled={locked}
                            type="time"
                            value={m.horario}
                            onChange={(e) =>
                              change(
                                "refeicoes",
                                trip.refeicoes.map((r, i) =>
                                  i === index
                                    ? { ...r, horario: e.target.value }
                                    : r,
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field
                          label={`${m.nome}: ou após horas no dia`}
                          hint="Opcional; sem preencher, vale só o horário."
                        >
                          <input
                            disabled={locked}
                            type="number"
                            min="0.25"
                            max="24"
                            step="0.25"
                            value={m.horas ?? ""}
                            onChange={(e) =>
                              change(
                                "refeicoes",
                                trip.refeicoes.map((r, i) =>
                                  i === index
                                    ? {
                                        ...r,
                                        horas:
                                          e.target.value === ""
                                            ? null
                                            : Number(e.target.value),
                                      }
                                    : r,
                                ),
                              )
                            }
                          />
                        </Field>
                      </div>
                    ))}
                  </div>
                  <p className="tc-help">
                    {trip.diariasAvulsas?.length > 0
                      ? "Há diárias avulsas registradas: confira se o novo cálculo não cobre o mesmo período. "
                      : ""}
                    Cada refeição conta pelo horário entre saída e retorno,
                    inclusive nos limites, ou pelas horas de viagem no mesmo
                    dia. Conta no máximo uma vez ao dia. Valores e regras
                    alterados só entram nos lançamentos após recalcular e
                    aplicar.
                  </p>
                  <button
                    disabled={locked}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        const p = await api().getControleParametrosDiarias();
                        change("refeicoes", p.refeicoes);
                        setNotice(
                          "Padrão aplicado aos parâmetros desta viagem. Recalcule e aplique as diárias para atualizar os lançamentos.",
                        );
                      } catch (e) {
                        setError(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Aplicar padrão atual
                  </button>
                  {staleMeals && (
                    <p className="tc-error">
                      O período mudou. Recalcule as diárias antes de salvar.
                    </p>
                  )}
                  <button
                    className="tc-primary"
                    disabled={
                      locked ||
                      !trip.saida ||
                      !trip.chegada ||
                      !trip.horaSaida ||
                      !trip.horaChegada
                    }
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        setMealPreview(
                          await api().calculateControleDiarias({
                            saida: trip.saida,
                            horaSaida: trip.horaSaida,
                            chegada: trip.chegada,
                            horaChegada: trip.horaChegada,
                            refeicoes: trip.refeicoes,
                          }),
                        );
                      } catch (e) {
                        setError(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Calcular diárias do período
                  </button>
                  {mealPreview && (
                    <div className="tc-meal-preview">
                      <h3>
                        Confira antes de lançar · {mealPreview.items.length}{" "}
                        refeições
                      </h3>
                      <p>
                        Desmarque refeições não devidas. Aplicar substitui o
                        cálculo anterior desta viagem.
                      </p>
                      <div className="tc-meal-rows">
                        {mealPreview.items.map((m, index) => (
                          <label key={`${m.data}:${m.refeicao}`}>
                            <input
                              type="checkbox"
                              checked={m.incluir}
                              onChange={(e) =>
                                setMealPreview((p) => ({
                                  ...p,
                                  items: p.items.map((r, i) =>
                                    i === index
                                      ? { ...r, incluir: e.target.checked }
                                      : r,
                                  ),
                                }))
                              }
                            />
                            <span>
                              {dateLabel(m.data)} · {m.refeicao} · {m.horario}
                              {m.motivo && (
                                <small className="tc-meal-reason">
                                  {m.motivo}
                                </small>
                              )}
                            </span>
                            <strong>{money(m.valor)}</strong>
                          </label>
                        ))}
                      </div>
                      <div className="tc-dialog-actions">
                        <strong>
                          Total:{" "}
                          {money(
                            mealPreview.items
                              .filter((i) => i.incluir)
                              .reduce((s, i) => s + i.valor, 0),
                          )}
                        </strong>
                        <button
                          disabled={locked}
                          className="tc-primary"
                          onClick={() => {
                            setTrip((t) => ({
                              ...t,
                              diarias: mealPreview.items,
                              diariasPeriodo: period,
                              conferido: { ...t.conferido, motorista: false },
                            }));
                            setMealPreview(null);
                            setDirty(true);
                          }}
                        >
                          Aplicar diárias
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="tc-daily-total">
                    <span>Diárias lançadas nesta viagem</span>
                    <strong>{money(totals.diarias)}</strong>
                    <small>
                      {trip.diarias.filter((i) => i.incluir).length} refeições
                      incluídas
                    </small>
                  </div>
                  {trip.diarias.length > 0 && (
                    <details className="tc-details">
                      <summary>Ver diárias lançadas</summary>
                      {trip.diarias.map((i) => (
                        <p key={`${i.data}:${i.refeicao}`}>
                          {dateLabel(i.data)} · {i.refeicao} · {money(i.valor)}{" "}
                          {i.incluir ? "" : "· Não incluída"}
                          {i.motivo ? ` · ${i.motivo}` : ""}
                        </p>
                      ))}
                    </details>
                  )}
                  <Entries
                    kind="diariasAvulsas"
                    trip={trip}
                    change={change}
                    onEntry={setEntry}
                    readOnly={locked}
                  />
                  <Entries
                    kind="premios"
                    trip={trip}
                    change={change}
                    onEntry={setEntry}
                    readOnly={locked}
                  />
                </>
              )}
              {tab === "ocorrencias" && (
                <>
                  <div className="tc-section-head">
                    <div>
                      <span className="tc-eyebrow">06 / ACOMPANHAR</span>
                      <h2>Imprevistos com acompanhamento.</h2>
                      <p>
                        Registre o que aconteceu e marque quando estiver
                        resolvido.
                      </p>
                    </div>
                    <button
                      disabled={locked}
                      className="tc-primary"
                      onClick={() =>
                        setOccurrence({
                          id: crypto.randomUUID(),
                          data: today(),
                          tipo: "Outro",
                          descricao: "",
                          resolvida: false,
                        })
                      }
                    >
                      ＋ Nova ocorrência
                    </button>
                  </div>
                  {!trip.ocorrencias.length ? (
                    <Empty title="Nenhuma ocorrência registrada">
                      Avarias, batidas e outros problemas da viagem ficam
                      reunidos aqui.
                    </Empty>
                  ) : (
                    trip.ocorrencias.map((o) => (
                      <article
                        className={`tc-occurrence ${o.resolvida ? "resolved" : ""}`}
                        key={o.id}
                      >
                        <div>
                          <span className="tc-tag">{o.tipo}</span>
                          <small>{dateLabel(o.data)}</small>
                        </div>
                        <p>{o.descricao}</p>
                        <label className="tc-check">
                          <input
                            type="checkbox"
                            disabled={locked}
                            checked={o.resolvida}
                            onChange={(e) =>
                              change(
                                "ocorrencias",
                                trip.ocorrencias.map((i) =>
                                  i.id === o.id
                                    ? { ...i, resolvida: e.target.checked }
                                    : i,
                                ),
                              )
                            }
                          />
                          {o.resolvida ? "Resolvida" : "Marcar como resolvida"}
                        </label>
                        <button
                          disabled={locked}
                          onClick={() => setOccurrence(o)}
                        >
                          Editar
                        </button>
                      </article>
                    ))
                  )}
                </>
              )}
              {tab === "acerto" && (
                <>
                  <div className="tc-section-head">
                    <div>
                      <span className="tc-eyebrow">07 / CONCLUIR</span>
                      <h2>Feche a viagem com clareza.</h2>
                      <p>Confira os lançamentos antes de concluir.</p>
                    </div>
                    <span className="tc-badge">✓</span>
                  </div>
                  <div className="tc-financial">
                    <div>
                      <h3>Resultado da viagem</h3>
                      {[
                        ["Fretes", totals.receita],
                        ["Despesas", -totals.despesas],
                        ["Abastecimentos", -totals.abastecimentos],
                        ["Diárias", -totals.diarias],
                        ["Premiações", -totals.premios],
                      ].map(([label, value]) => (
                        <p key={label}>
                          <span>{label}</span>
                          <strong>{money(value)}</strong>
                        </p>
                      ))}
                      <footer>
                        <span>Resultado dos lançamentos</span>
                        <strong>{money(totals.resultado)}</strong>
                      </footer>
                      <small>
                        Considera somente os valores deste controle, sem rateio
                        de custos fixos.
                      </small>
                    </div>
                    <div>
                      <h3>Acerto com o motorista</h3>
                      {[
                        [
                          "Diárias e premiações",
                          totals.diarias + totals.premios,
                        ],
                        ["Despesas a reembolsar", totals.reembolsos],
                        ["Adiantamentos", -totals.adiantamentos],
                        ["Fretes recebidos em mãos", -totals.recebimentos],
                      ].map(([label, value]) => (
                        <p key={label}>
                          <span>{label}</span>
                          <strong>{money(value)}</strong>
                        </p>
                      ))}
                      <footer>
                        <span>
                          {totals.saldoMotorista < 0
                            ? "Motorista deve devolver"
                            : "A pagar ao motorista"}
                        </span>
                        <strong>
                          {money(Math.abs(totals.saldoMotorista))}
                        </strong>
                      </footer>
                      <small>
                        Concluir registra o acerto; não executa pagamentos.
                      </small>
                    </div>
                  </div>
                  <Entries
                    kind="adiantamentos"
                    trip={trip}
                    change={change}
                    onEntry={setEntry}
                    readOnly={locked}
                  />
                  <Entries
                    kind="recebimentos"
                    trip={trip}
                    change={change}
                    onEntry={setEntry}
                    readOnly={locked}
                  />
                  <div className="tc-finish">
                    <h3>
                      {complete
                        ? "Tudo conferido. Pronto para concluir!"
                        : "Falta pouco para concluir"}
                    </h3>
                    <ul>
                      {(!trip.chegada || !trip.horaChegada) && (
                        <li>Informe a data e a hora de retorno.</li>
                      )}
                      {(trip.kmSaida === null || trip.kmChegada === null) && (
                        <li>Informe o KM de saída e retorno.</li>
                      )}
                      {Object.entries(trip.conferido)
                        .filter(([, v]) => !v)
                        .map(([k]) => (
                          <li key={k}>
                            Confira a etapa {steps.find((s) => s[0] === k)?.[1]}
                            .
                          </li>
                        ))}
                      {trip.ocorrencias.some((o) => !o.resolvida) && (
                        <li>Resolva as ocorrências pendentes.</li>
                      )}
                      {staleMeals && (
                        <li>Recalcule as diárias para o período atual.</li>
                      )}
                    </ul>
                    <button
                      className="tc-primary"
                      disabled={!complete || locked}
                      onClick={() => save("concluida")}
                    >
                      ✓ Concluir viagem
                    </button>
                  </div>
                </>
              )}
              {Object.hasOwn(trip.conferido, tab) && (
                <label className="tc-review">
                  <input
                    type="checkbox"
                    checked={trip.conferido[tab]}
                    disabled={locked}
                    onChange={() => confirmStep(tab)}
                  />
                  <span>
                    <strong>Etapa conferida</strong>
                    <small>
                      Revisei os lançamentos e confirmei que estão corretos,
                      inclusive se não houve nenhum.
                    </small>
                  </span>
                </label>
              )}
            </section>
          </div>
          <footer className="tc-savebar">
            <div>
              <strong>
                {dirty ? "● Alterações não salvas" : "✓ Tudo salvo"}
              </strong>
              <span>
                {trip.id
                  ? `Controle #${trip.id}`
                  : "Salve para criar o controle"}
              </span>
            </div>
            <div className="tc-actions">
              {steps.findIndex((s) => s[0] === tab) < 6 && (
                <button
                  onClick={() =>
                    setTab(steps[steps.findIndex((s) => s[0] === tab) + 1][0])
                  }
                >
                  Próxima etapa →
                </button>
              )}
              <button
                className="tc-primary"
                disabled={locked || !dirty}
                onClick={() => save()}
              >
                {busy ? "Salvando…" : "Salvar controle"}
              </button>
            </div>
          </footer>
        </>
      )}
      {parametersOpen && (
        <MealParametersDialog
          readOnly={readOnly}
          onClose={() => setParametersOpen(false)}
          onSaved={() => {
            setParametersOpen(false);
            setNotice(
              "Parâmetros padrão salvos. Viagens existentes mantêm os valores já lançados.",
            );
          }}
        />
      )}
      {entry && (
        <EntryDialog
          {...entry}
          onClose={() => setEntry(null)}
          onAdd={(v) => {
            change(
              entry.kind,
              entry.initial
                ? trip[entry.kind].map((r) => (r.id === v.id ? v : r))
                : [...trip[entry.kind], v],
            );
            setEntry(null);
          }}
        />
      )}
      {link && (
        <DocumentDialog
          kind={link}
          trip={trip}
          onClose={() => setLink(null)}
          onAdd={(items) => {
            change(link, [...trip[link], ...items]);
            setLink(null);
          }}
        />
      )}
      {erp && (
        <ErpDialog
          onClose={() => setErp(false)}
          onImport={async (params) => {
            const saved = await api().importControleViagem(params);
            accept(saved);
            setErp(false);
            setRefresh((n) => n + 1);
            setNotice(
              "Viagem do ERP disponível no controle. Confira as etapas antes de concluir.",
            );
          }}
        />
      )}
      {occurrence && (
        <Dialog
          title="Registrar ocorrência"
          onClose={() => setOccurrence(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              change(
                "ocorrencias",
                trip.ocorrencias.some((o) => o.id === occurrence.id)
                  ? trip.ocorrencias.map((o) =>
                      o.id === occurrence.id ? occurrence : o,
                    )
                  : [...trip.ocorrencias, occurrence],
              );
              setOccurrence(null);
            }}
          >
            <div className="tc-fields">
              <Field label="Data">
                <input
                  required
                  type="date"
                  value={occurrence.data}
                  onChange={(e) =>
                    setOccurrence({ ...occurrence, data: e.target.value })
                  }
                />
              </Field>
              <Field label="Tipo">
                <select
                  value={occurrence.tipo}
                  onChange={(e) =>
                    setOccurrence({ ...occurrence, tipo: e.target.value })
                  }
                >
                  {["Avaria", "Acidente", "Atraso", "Outro"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="O que aconteceu?">
              <textarea
                required
                rows={5}
                maxLength={3000}
                value={occurrence.descricao}
                onChange={(e) =>
                  setOccurrence({ ...occurrence, descricao: e.target.value })
                }
              />
            </Field>
            <div className="tc-dialog-actions">
              <button type="button" onClick={() => setOccurrence(null)}>
                Cancelar
              </button>
              <button className="tc-primary">Registrar</button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
window.ConsultaViagens = ControleViagens;
