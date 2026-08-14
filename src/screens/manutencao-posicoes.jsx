const COMPONENTS = [
  "Lona de freio",
  "Graxa",
  "Tambor",
  "Rolamento",
  "Cubo",
  "Amortecedor",
  "Mola",
  "Suspensão",
  "Outro",
];
const SERVICES = ["Troca", "Inspeção", "Regulagem", "Reparo"];
const INSPECTION_CONDITIONS = [
  { id: "BOM", label: "Bom", color: "#16a34a" },
  { id: "ATENCAO", label: "Atenção", color: "#d97706" },
  { id: "CRITICO", label: "Crítico", color: "#dc2626" },
];
const INSPECTION_REASONS = [
  "Desgaste",
  "Folga",
  "Ruído",
  "Vazamento",
  "Trinca",
  "Aquecimento",
  "Outro",
];
const STATUS = {
  none: { color: "#94a3b8", label: "Sem histórico", icon: "○", rank: 0 },
  ok: { color: "#16a34a", label: "Em dia", icon: "✓", rank: 1 },
  near: { color: "#d97706", label: "Próximo", icon: "!", rank: 2 },
  overdue: { color: "#dc2626", label: "Vencido", icon: "×", rank: 3 },
};

function inferMaintenanceLayout(vehicle) {
  const text = `${vehicle?.modelo || ""} ${vehicle?.marca || ""}`.toUpperCase();
  const axles = Number(vehicle?.eixos) || 3;
  if (axles >= 4 || /BITRUCK|BI.?TRUCK|8X2|8X4/.test(text)) return "BITRUCK";
  if ((vehicle?.implementos || []).length) return "CAVALO";
  return "TRUCK";
}

function axleConfig(type, count) {
  if (type === "BITRUCK")
    return [
      { id: "DIR-1", label: "Direcional 1", dual: false },
      { id: "DIR-2", label: "Direcional 2", dual: false },
      { id: "TRAS-1", label: "Traseiro 1", dual: true },
      { id: "TRAS-2", label: "Traseiro 2", dual: true },
    ];
  if (type === "IMPLEMENTO")
    return Array.from({ length: Math.max(2, count || 3) }, (_, i) => ({
      id: `IMP-${i + 1}`,
      label: `Eixo ${i + 1}`,
      dual: true,
    }));
  return [
    { id: "DIR-1", label: "Direcional", dual: false },
    { id: "TRAS-1", label: "Traseiro 1", dual: true },
    { id: "TRAS-2", label: "Traseiro 2", dual: true },
  ];
}

function recordStatus(record, currentKm) {
  if (!record) return STATUS.none;
  if (record.condicao === "CRITICO") return STATUS.overdue;
  if (record.condicao === "ATENCAO") return STATUS.near;
  const remainingKm = record.proximo_km
    ? Number(record.proximo_km) - currentKm
    : null;
  const plannedInterval =
    record.proximo_km && record.km_servico
      ? Number(record.proximo_km) - Number(record.km_servico)
      : 0;
  const due = record.proxima_data
    ? new Date(`${String(record.proxima_data).slice(0, 10)}T23:59:59`)
    : null;
  const days = due ? Math.ceil((due - new Date()) / 86400000) : null;
  if ((remainingKm != null && remainingKm <= 0) || (days != null && days <= 0))
    return { ...STATUS.overdue, remainingKm, days };
  if (
    (remainingKm != null &&
      remainingKm <= Math.max(1000, plannedInterval * 0.1)) ||
    (days != null && days <= 30)
  )
    return { ...STATUS.near, remainingKm, days };
  return { ...STATUS.ok, remainingKm, days };
}

function positionState(records, plate, axle, side, currentKm) {
  const history = records.filter(
    (r) => r.placa === plate && r.eixo_codigo === axle && r.lado === side,
  );
  const latest = new Map();
  history.forEach((record) => {
    if (!latest.has(record.componente)) latest.set(record.componente, record);
  });
  const components = COMPONENTS.filter(
    (component) => component !== "Outro",
  ).map((component) => ({
    component,
    record: latest.get(component),
    status: recordStatus(latest.get(component), currentKm),
  }));
  const worst = components.reduce(
    (result, item) => (item.status.rank > result.rank ? item.status : result),
    STATUS.none,
  );
  const counts = components.reduce((acc, item) => {
    acc[item.status.label] = (acc[item.status.label] || 0) + 1;
    return acc;
  }, {});
  return { ...worst, history, components, counts };
}

function allPositions(vehicle) {
  if (!vehicle) return [];
  const layout = inferMaintenanceLayout(vehicle);
  const units = [
    { plate: vehicle.placa, type: layout, count: vehicle.eixos },
    ...(vehicle.implementos || []).map((item) => ({
      plate: item.placa,
      type: "IMPLEMENTO",
      count: item.eixos,
    })),
  ];
  return units.flatMap((unit) =>
    axleConfig(unit.type, unit.count).flatMap((axle) =>
      ["E", "D"].map((side) => ({ ...unit, axle, side })),
    ),
  );
}

const formatDate = (value) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(
        "pt-BR",
      )
    : "—";
const formatKm = (value) => Number(value || 0).toLocaleString("pt-BR");
const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function Wheel({ dual, side, state, onClick }) {
  return (
    <button
      className={`mp-wheel ${dual ? "is-dual" : ""}`}
      type="button"
      onClick={onClick}
      title={`${side === "E" ? "Esquerdo" : "Direito"} · ${state.label}`}
      style={{ "--position-color": state.color }}
    >
      <span className="mp-wheel-icon">{dual ? "▮▮" : "▮"}</span>
      <span>{side}</span>
      <small>{state.icon}</small>
    </button>
  );
}

function AxleDiagram({
  plate,
  title,
  type,
  count,
  records,
  currentKm,
  selected,
  onSelect,
}) {
  return (
    <div className="card mp-vehicle-card">
      <div className="mp-unit-head">
        <div>
          <strong>{title}</strong>
          <div className="muted">
            {plate} ·{" "}
            {type === "IMPLEMENTO"
              ? "Implemento"
              : type === "BITRUCK"
                ? "Bi-truck"
                : type === "CAVALO"
                  ? "Cavalo mecânico"
                  : "Truck"}
          </div>
        </div>
        <Icon name={type === "IMPLEMENTO" ? "package" : "truck"} />
      </div>
      <div className="mp-front">
        FRENTE <span>↑</span>
      </div>
      <div
        className={`mp-body-shape ${type === "IMPLEMENTO" ? "trailer" : "truck"}`}
      />
      {axleConfig(type, count).map((axle) => {
        const left = positionState(records, plate, axle.id, "E", currentKm);
        const right = positionState(records, plate, axle.id, "D", currentKm);
        return (
          <div key={axle.id} className="mp-axle-row">
            <Wheel
              dual={axle.dual}
              side="E"
              state={left}
              onClick={() =>
                onSelect({ plate, axle, side: "E", type, state: left })
              }
            />
            <div className="mp-axle">
              <span>{axle.label}</span>
            </div>
            <Wheel
              dual={axle.dual}
              side="D"
              state={right}
              onClick={() =>
                onSelect({ plate, axle, side: "D", type, state: right })
              }
            />
            {selected?.plate === plate && selected?.axle.id === axle.id && (
              <i className={`mp-selected-marker side-${selected.side}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SummaryCards({ positions, records, currentKm }) {
  const totals = { Vencido: 0, Próximo: 0, "Em dia": 0, "Sem histórico": 0 };
  positions.forEach((pos) =>
    positionState(
      records,
      pos.plate,
      pos.axle.id,
      pos.side,
      currentKm,
    ).components.forEach((item) => totals[item.status.label]++),
  );
  return (
    <div className="mp-summary">
      {[
        ["Vencido", STATUS.overdue],
        ["Próximo", STATUS.near],
        ["Em dia", STATUS.ok],
        ["Sem histórico", STATUS.none],
      ].map(([label, state]) => (
        <div
          className="card mp-summary-card"
          key={label}
          style={{ "--status-color": state.color }}
        >
          <span>{state.icon}</span>
          <strong>{totals[label]}</strong>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}

function ComponentList({ selected, onRegister }) {
  return (
    <div className="mp-component-list">
      {selected.state.components.map((item) => (
        <div className="mp-component" key={item.component}>
          <div className="mp-component-main">
            <i style={{ background: item.status.color }} />
            <div>
              <strong>{item.component}</strong>
              <small>
                {item.status.icon} {item.status.label}
                {item.status.remainingKm != null
                  ? ` · ${Math.abs(item.status.remainingKm).toLocaleString("pt-BR")} km ${item.status.remainingKm < 0 ? "acima do limite" : "restantes"}`
                  : ""}
              </small>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onRegister(item.component)}
          >
            {item.record ? "Registrar" : "Primeiro registro"}
          </button>
        </div>
      ))}
    </div>
  );
}

const conditionLabel = (value) =>
  value === "ATENCAO"
    ? "Atenção"
    : value === "CRITICO"
      ? "Crítico"
      : value === "BOM"
        ? "Bom"
        : "";
const axleLabel = (code) =>
  code?.startsWith("DIR-")
    ? `Direcional ${code.split("-")[1]}`
    : code?.startsWith("TRAS-")
      ? `Traseiro ${code.split("-")[1]}`
      : code?.startsWith("IMP-")
        ? `Eixo ${code.split("-")[1]}`
        : code || "Posição geral";
const sideLabel = (side) =>
  side === "E"
    ? "esquerdo"
    : side === "D"
      ? "direito"
      : String(side || "geral").toLowerCase();

function groupMaintenanceRecords(records) {
  const groups = [];
  const byKey = new Map();
  records.forEach((record) => {
    const key = record.grupo_id || `registro-${record.id}`;
    if (!byKey.has(key)) {
      const event = { key, records: [] };
      byKey.set(key, event);
      groups.push(event);
    }
    byKey.get(key).records.push(record);
  });
  return groups;
}

function MaintenanceRecordEdit({ record, saving, onSave, onCancel }) {
  const [form, setForm] = React.useState({
    componente: record.componente || "",
    tipo_servico: record.tipo_servico || "",
    data_servico: String(record.data_servico || "").slice(0, 10),
    km_servico: record.km_servico ?? "",
    proximo_km: record.proximo_km ?? "",
    proxima_data: record.proxima_data
      ? String(record.proxima_data).slice(0, 10)
      : "",
    marca: record.marca || "",
    fornecedor: record.fornecedor || "",
    valor: record.valor ?? "",
    observacao: record.observacao || "",
    condicao: record.condicao || "",
    motivo: record.motivo || "",
  });
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <form
      className="mp-detail-edit"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="mp-form-grid">
        <label>
          Componente
          <select
            value={form.componente}
            onChange={(e) => set("componente", e.target.value)}
          >
            {COMPONENTS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Serviço
          <select
            value={form.tipo_servico}
            onChange={(e) => set("tipo_servico", e.target.value)}
          >
            {SERVICES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Data
          <input
            required
            type="date"
            value={form.data_servico}
            onChange={(e) => set("data_servico", e.target.value)}
          />
        </label>
        <label>
          KM do serviço
          <input
            type="number"
            value={form.km_servico}
            onChange={(e) => set("km_servico", e.target.value)}
          />
        </label>
        <label>
          Próximo KM
          <input
            type="number"
            value={form.proximo_km}
            onChange={(e) => set("proximo_km", e.target.value)}
          />
        </label>
        <label>
          Próxima data
          <input
            type="date"
            value={form.proxima_data}
            onChange={(e) => set("proxima_data", e.target.value)}
          />
        </label>
        <label>
          Marca
          <input
            value={form.marca}
            onChange={(e) => set("marca", e.target.value)}
          />
        </label>
        <label>
          Fornecedor
          <input
            value={form.fornecedor}
            onChange={(e) => set("fornecedor", e.target.value)}
          />
        </label>
        <label>
          Valor
          <input
            type="number"
            step="0.01"
            value={form.valor}
            onChange={(e) => set("valor", e.target.value)}
          />
        </label>
        {form.tipo_servico === "Inspeção" && (
          <>
            <label>
              Condição
              <select
                value={form.condicao}
                onChange={(e) => set("condicao", e.target.value)}
              >
                <option value="">Não informada</option>
                {INSPECTION_CONDITIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Motivo
              <input
                value={form.motivo}
                onChange={(e) => set("motivo", e.target.value)}
              />
            </label>
          </>
        )}
        <label className="mp-observation">
          Observação
          <textarea
            rows="3"
            value={form.observacao}
            onChange={(e) => set("observacao", e.target.value)}
          />
        </label>
      </div>
      <div className="mp-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar edição
        </button>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Salvando..." : "Salvar correção"}
        </button>
      </div>
    </form>
  );
}

function MaintenanceDetail({ event, selected, onClose, onChanged }) {
  const [editingId, setEditingId] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const total = event.records.reduce(
    (sum, record) => sum + Number(record.valor || 0),
    0,
  );
  const first = event.records[0];
  const positions = [
    ...new Set(
      event.records.map(
        (record) =>
          `${record.placa} · ${axleLabel(record.eixo_codigo)} · lado ${sideLabel(record.lado)}`,
      ),
    ),
  ];
  const fields = [
    [
      "Placa real",
      positions.length === 1
        ? first.placa
        : `${new Set(event.records.map((record) => record.placa)).size} veículos/implementos`,
    ],
    [
      "Posição",
      selected
        ? `${selected.axle.label} · lado ${sideLabel(selected.side)}`
        : positions.length === 1
          ? positions[0].split(" · ").slice(1).join(" · ")
          : `${positions.length} posições`,
    ],
    ["Data do serviço", formatDate(first.data_servico)],
    [
      "KM do serviço",
      first.km_servico != null
        ? `${formatKm(first.km_servico)} km`
        : "Não informado",
    ],
    ["Fornecedor", first.fornecedor || "Não informado"],
    ["Valor total", total > 0 ? money(total) : "Não informado"],
    [
      "Registrado em",
      first.criado_em
        ? new Date(first.criado_em).toLocaleString("pt-BR")
        : "Não informado",
    ],
  ];
  return (
    <div
      className="mp-detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes da manutenção"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="card mp-detail-panel">
        <div className="mp-detail-head">
          <div>
            <small>DETALHES DA MANUTENÇÃO</small>
            <h3>
              {event.records.length > 1
                ? `Lançamento agrupado · ${event.records.length} itens`
                : `${first.tipo_servico} de ${first.componente}`}
            </h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="mp-detail-grid">
          {fields.map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        {error && <div className="mp-alert error">{error}</div>}
        <div className="mp-detail-components">
          <h4>Serviços e componentes</h4>
          {event.records.map((record) => (
            <article
              key={record.id}
              className={record.cancelado ? "is-cancelled" : ""}
            >
              <div>
                <strong>
                  {record.componente}
                  {record.cancelado ? " · Cancelado" : ""}
                </strong>
                <span>
                  {record.tipo_servico}
                  {record.condicao
                    ? ` · ${conditionLabel(record.condicao)}`
                    : ""}
                  {!record.cancelado && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setEditingId(record.id)}
                    >
                      Editar
                    </button>
                  )}
                </span>
              </div>
              {!selected && (
                <div className="mp-detail-position">
                  {record.placa} · {axleLabel(record.eixo_codigo)} · lado{" "}
                  {sideLabel(record.lado)}
                </div>
              )}
              <div className="mp-detail-record-grid">
                {record.motivo && (
                  <span>
                    <small>Motivo</small>
                    {record.motivo}
                  </span>
                )}
                {record.marca && (
                  <span>
                    <small>Marca</small>
                    {record.marca}
                  </span>
                )}
                {record.valor != null && (
                  <span>
                    <small>Valor</small>
                    {money(record.valor)}
                  </span>
                )}
                {record.proximo_km != null && (
                  <span>
                    <small>Próximo KM</small>
                    {formatKm(record.proximo_km)} km
                  </span>
                )}
                {record.proxima_data && (
                  <span>
                    <small>Próxima data</small>
                    {formatDate(record.proxima_data)}
                  </span>
                )}
              </div>
              {record.observacao && (
                <p>
                  <small>Observação</small>
                  {record.observacao}
                </p>
              )}
              {record.cancelado && (
                <p>
                  <small>Motivo do cancelamento</small>
                  {record.motivo_cancelamento || "Não informado"} ·{" "}
                  {record.cancelado_em
                    ? new Date(record.cancelado_em).toLocaleString("pt-BR")
                    : ""}
                </p>
              )}
              {editingId === record.id && (
                <MaintenanceRecordEdit
                  record={record}
                  saving={saving}
                  onCancel={() => setEditingId(null)}
                  onSave={async (form) => {
                    setSaving(true);
                    setError("");
                    try {
                      await RB_API.updateComponentePosicao(record.id, form);
                      await onChanged?.();
                      onClose();
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setSaving(false);
                    }
                  }}
                />
              )}
            </article>
          ))}
        </div>
        {first.grupo_id && (
          <div className="mp-detail-code">
            Código do lançamento: {first.grupo_id}
          </div>
        )}
        <div className="mp-actions">
          {!event.records.every((record) => record.cancelado) && (
            <button
              type="button"
              className="btn mp-cancel-btn"
              disabled={saving}
              onClick={async () => {
                const motivo = window.prompt(
                  "Informe o motivo do cancelamento deste lançamento:",
                );
                if (!motivo?.trim()) return;
                if (
                  !window.confirm(
                    `Cancelar ${event.records.length} registro(s)? O histórico será preservado.`,
                  )
                )
                  return;
                setSaving(true);
                setError("");
                try {
                  await RB_API.cancelComponentesPosicao({
                    ids: event.records.map((record) => record.id),
                    motivo: motivo.trim(),
                  });
                  await onChanged?.();
                  onClose();
                } catch (e) {
                  setError(e.message);
                } finally {
                  setSaving(false);
                }
              }}
            >
              Cancelar lançamento
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </section>
    </div>
  );
}

function History({ selected, onChanged }) {
  const [detail, setDetail] = React.useState(null);
  if (!selected.state.history.length)
    return (
      <div className="mp-empty">
        <strong>Nenhuma manutenção registrada nesta posição</strong>
        <span>Registre o primeiro serviço para iniciar o histórico.</span>
      </div>
    );
  const groups = groupMaintenanceRecords(selected.state.history);
  return (
    <>
      <div className="mp-timeline">
        {groups.map((event) => {
          const first = event.records[0];
          const components = event.records
            .map((record) => record.componente)
            .join(", ");
          const conditions = [
            ...new Set(
              event.records
                .map((record) => conditionLabel(record.condicao))
                .filter(Boolean),
            ),
          ];
          const total = event.records.reduce(
            (sum, record) => sum + Number(record.valor || 0),
            0,
          );
          return (
            <button
              type="button"
              className="mp-history-item"
              key={event.key}
              onClick={() => setDetail(event)}
            >
              <i />
              <span className="mp-history-content">
                <strong>
                  {formatDate(first.data_servico)} ·{" "}
                  {first.km_servico
                    ? `${formatKm(first.km_servico)} km`
                    : "KM não informado"}
                </strong>
                <span>
                  {event.records.length > 1
                    ? `${first.tipo_servico} agrupada · ${event.records.length} componentes`
                    : `${first.tipo_servico} de ${first.componente}`}
                  {conditions.length ? ` · ${conditions.join("/")}` : ""}
                </span>
                <small>
                  {[
                    event.records.length > 1 && components,
                    first.fornecedor && `Fornecedor: ${first.fornecedor}`,
                    total > 0 && `Total: ${money(total)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </span>
              <span className="mp-history-open">
                Ver detalhes <Icon name="chevron-right" size={13} />
              </span>
            </button>
          );
        })}
      </div>
      {detail && (
        <MaintenanceDetail
          event={detail}
          selected={selected}
          onChanged={onChanged}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}

function MaintenanceConsultation({ vehicles, options }) {
  const [records, setRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [detail, setDetail] = React.useState(null);
  const emptyFilters = {
    busca: "",
    placa: "",
    componente: "",
    servico: "",
    fornecedor: "",
    inicio: "",
    fim: "",
    status: "",
  };
  const [filters, setFilters] = React.useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = React.useState(emptyFilters);
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({ total: 0, paginas: 1 });
  const [showCancelled, setShowCancelled] = React.useState(false);
  const loadConsultation = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { status: _status, ...serverFilters } = appliedFilters;
      const data = await RB_API.consultaComponentesPosicao({
        ...serverFilters,
        page,
        pageSize: 20,
        cancelados: showCancelled || undefined,
      });
      setRecords(data.registros || []);
      setPagination({
        total: Number(data.total || 0),
        paginas: Math.max(1, Number(data.paginas || 1)),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilters, showCancelled]);
  React.useEffect(() => {
    loadConsultation();
  }, [loadConsultation]);

  const kmByPlate = new Map();
  vehicles.forEach((vehicle) => {
    kmByPlate.set(vehicle.placa, Number(vehicle.km_atual) || 0);
    (vehicle.implementos || []).forEach((implement) =>
      kmByPlate.set(implement.placa, Number(vehicle.km_atual) || 0),
    );
  });
  const latestIds = new Set();
  const latestKeys = new Set();
  records.forEach((record) => {
    const key = `${record.placa}|${record.eixo_codigo}|${record.lado}|${record.componente}`;
    if (!latestKeys.has(key)) {
      latestKeys.add(key);
      latestIds.add(record.id);
    }
  });
  const statusOf = (record) =>
    latestIds.has(record.id)
      ? recordStatus(
          record,
          kmByPlate.get(record.placa) ||
            kmByPlate.get(record.conjunto_placa) ||
            0,
        )
      : null;
  const text = appliedFilters.busca.trim().toLocaleLowerCase("pt-BR");
  const filtered = records.filter((record) => {
    const status = statusOf(record);
    if (
      appliedFilters.placa &&
      record.placa !== appliedFilters.placa &&
      record.conjunto_placa !== appliedFilters.placa
    )
      return false;
    if (
      appliedFilters.componente &&
      record.componente !== appliedFilters.componente
    )
      return false;
    if (
      appliedFilters.servico &&
      record.tipo_servico !== appliedFilters.servico
    )
      return false;
    if (
      appliedFilters.fornecedor &&
      record.fornecedor !== appliedFilters.fornecedor
    )
      return false;
    if (
      appliedFilters.inicio &&
      String(record.data_servico).slice(0, 10) < appliedFilters.inicio
    )
      return false;
    if (
      appliedFilters.fim &&
      String(record.data_servico).slice(0, 10) > appliedFilters.fim
    )
      return false;
    if (appliedFilters.status && status?.label !== appliedFilters.status)
      return false;
    if (
      text &&
      ![
        record.placa,
        record.conjunto_placa,
        record.componente,
        record.tipo_servico,
        record.fornecedor,
        record.marca,
        record.observacao,
      ].some((value) =>
        String(value || "")
          .toLocaleLowerCase("pt-BR")
          .includes(text),
      )
    )
      return false;
    return true;
  });
  const events = groupMaintenanceRecords(filtered);
  const latestFiltered = filtered.filter((record) => latestIds.has(record.id));
  const overdue = latestFiltered.filter(
    (record) => statusOf(record)?.label === "Vencido",
  ).length;
  const near = latestFiltered.filter(
    (record) => statusOf(record)?.label === "Próximo",
  ).length;
  const totalCost = filtered.reduce(
    (sum, record) => sum + Number(record.valor || 0),
    0,
  );
  const plates = [
    ...new Set(
      vehicles
        .flatMap((vehicle) => [
          vehicle.placa,
          ...(vehicle.implementos || []).map((item) => item.placa),
        ])
        .filter(Boolean),
    ),
  ].sort();
  const suppliers = [
    ...new Set(
      [
        ...options.fornecedores,
        ...records.map((record) => record.fornecedor),
      ].filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const update = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));
  return (
    <div className="mp-consult">
      <div className="mp-consult-summary">
        <div className="card">
          <small>Lançamentos encontrados</small>
          <strong>{pagination.total}</strong>
        </div>
        <div className="card danger">
          <small>Vencidos nesta página</small>
          <strong>{overdue}</strong>
        </div>
        <div className="card warning">
          <small>Próximos nesta página</small>
          <strong>{near}</strong>
        </div>
        <div className="card">
          <small>Custo no filtro</small>
          <strong>{money(totalCost)}</strong>
        </div>
      </div>
      <section className="card mp-consult-filters">
        <div className="mp-consult-filter-grid">
          <label className="wide">
            Buscar
            <input
              value={filters.busca}
              onChange={(e) => update("busca", e.target.value)}
              placeholder="Placa, componente, marca ou observação"
            />
          </label>
          <label>
            Veículo
            <select
              value={filters.placa}
              onChange={(e) => update("placa", e.target.value)}
            >
              <option value="">Todos</option>
              {plates.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Componente
            <select
              value={filters.componente}
              onChange={(e) => update("componente", e.target.value)}
            >
              <option value="">Todos</option>
              {COMPONENTS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Serviço
            <select
              value={filters.servico}
              onChange={(e) => update("servico", e.target.value)}
            >
              <option value="">Todos</option>
              {SERVICES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Status atual
            <select
              value={filters.status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="">Todos</option>
              {["Vencido", "Próximo", "Em dia"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Fornecedor
            <select
              value={filters.fornecedor}
              onChange={(e) => update("fornecedor", e.target.value)}
            >
              <option value="">Todos</option>
              {suppliers.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            De
            <input
              type="date"
              value={filters.inicio}
              onChange={(e) => update("inicio", e.target.value)}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              value={filters.fim}
              onChange={(e) => update("fim", e.target.value)}
            />
          </label>
          <label className="mp-cancelled-filter">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => {
                setPage(1);
                setShowCancelled(e.target.checked);
              }}
            />
            Incluir cancelados
          </label>
        </div>
        <div className="mp-filter-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setPage(1);
              setAppliedFilters(filters);
            }}
          >
            Aplicar
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setFilters(emptyFilters);
              setAppliedFilters(emptyFilters);
              setPage(1);
            }}
          >
            Limpar
          </button>
        </div>
      </section>
      {loading && (
        <div className="mp-page-state">Carregando manutenções...</div>
      )}
      {error && <div className="mp-alert error">{error}</div>}
      {!loading && !error && !events.length && (
        <div className="card mp-empty">
          <strong>Nenhuma manutenção encontrada</strong>
          <span>Ajuste os filtros ou registre o primeiro serviço.</span>
        </div>
      )}
      {!loading && !!events.length && (
        <div className="card mp-consult-table-wrap">
          <table className="mp-consult-table">
            <thead>
              <tr>
                <th>Data / KM</th>
                <th>Veículo e posição</th>
                <th>Serviço</th>
                <th>Fornecedor</th>
                <th>Status atual</th>
                <th>Valor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const first = event.records[0];
                const statuses = event.records.map(statusOf).filter(Boolean);
                const worst = statuses.reduce(
                  (result, item) =>
                    !result || item.rank > result.rank ? item : result,
                  null,
                );
                const value = event.records.reduce(
                  (sum, record) => sum + Number(record.valor || 0),
                  0,
                );
                const positions = [
                  ...new Set(
                    event.records.map(
                      (record) =>
                        `${record.placa} · ${axleLabel(record.eixo_codigo)} ${record.lado}`,
                    ),
                  ),
                ];
                return (
                  <tr key={event.key} onClick={() => setDetail(event)}>
                    <td>
                      <strong>{formatDate(first.data_servico)}</strong>
                      <small>
                        {first.km_servico
                          ? `${formatKm(first.km_servico)} km`
                          : "KM não informado"}
                      </small>
                    </td>
                    <td>
                      <strong>{positions[0]}</strong>
                      {positions.length > 1 && (
                        <small>+ {positions.length - 1} posição(ões)</small>
                      )}
                    </td>
                    <td>
                      <strong>
                        {first.tipo_servico}
                        {event.records.length > 1
                          ? ` · ${event.records.length} itens`
                          : ""}
                      </strong>
                      <small>
                        {event.records
                          .map((record) => record.componente)
                          .join(", ")}
                      </small>
                    </td>
                    <td>{first.fornecedor || "—"}</td>
                    <td>
                      {worst ? (
                        <span
                          className="mp-status-pill"
                          style={{ "--status-color": worst.color }}
                        >
                          {worst.icon} {worst.label}
                        </span>
                      ) : (
                        <span className="muted">Histórico</span>
                      )}
                    </td>
                    <td>{value > 0 ? money(value) : "—"}</td>
                    <td>
                      <Icon name="chevron-right" size={14} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!loading && pagination.paginas > 1 && (
        <nav className="mp-pagination" aria-label="Paginação">
          <button
            className="btn"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Anterior
          </button>
          <span>
            Página <strong>{page}</strong> de{" "}
            <strong>{pagination.paginas}</strong>
            {" · "}
            {pagination.total} lançamentos
          </span>
          <button
            className="btn"
            disabled={page >= pagination.paginas}
            onClick={() => setPage((value) => value + 1)}
          >
            Próxima
          </button>
        </nav>
      )}
      {detail && (
        <MaintenanceDetail
          event={detail}
          onChanged={loadConsultation}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function ServiceForm({
  selected,
  vehicle,
  initialComponent,
  options,
  saving,
  onCancel,
  onSave,
}) {
  const empty = {
    componentes: [initialComponent || "Lona de freio"],
    tipo_servico: "Troca",
    condicao: "",
    motivo: "",
    data_servico: new Date().toISOString().slice(0, 10),
    km_servico: vehicle?.km_atual || "",
    proximo_km: "",
    proxima_data: "",
    marca: "",
    fornecedor: "",
    valor: "",
    observacao: "",
  };
  const [form, setForm] = React.useState(empty);
  const [more, setMore] = React.useState(false);
  const intervals = Object.fromEntries(
    (options.intervalos || []).map((item) => [
      item.componente,
      Number(item.km),
    ]),
  );
  const suggested = form.componentes
    .map((component) => ({
      component,
      interval: intervals[component],
      next:
        intervals[component] && Number(form.km_servico)
          ? Number(form.km_servico) + intervals[component]
          : null,
    }))
    .filter((item) => item.next);
  const toggleComponent = (component) =>
    setForm((current) => ({
      ...current,
      componentes: current.componentes.includes(component)
        ? current.componentes.length === 1
          ? current.componentes
          : current.componentes.filter((item) => item !== component)
        : [...current.componentes, component],
    }));
  return (
    <form
      className="mp-service-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <div className="mp-step">
        <strong>O que foi realizado?</strong>
        <div className="mp-choice-row">
          {SERVICES.map((service) => (
            <button
              type="button"
              className={form.tipo_servico === service ? "active" : ""}
              onClick={() => setForm({ ...form, tipo_servico: service })}
              key={service}
            >
              {service}
            </button>
          ))}
        </div>
      </div>
      <div className="mp-step">
        <strong>
          Componentes{" "}
          <small className="muted">
            · selecione um ou mais para registrar agrupado
          </small>
        </strong>
        <div className="mp-choice-row mp-components-choice">
          {COMPONENTS.map((component) => (
            <button
              type="button"
              className={form.componentes.includes(component) ? "active" : ""}
              onClick={() => toggleComponent(component)}
              key={component}
            >
              <span className="mp-check">
                {form.componentes.includes(component) ? "✓" : "+"}
              </span>
              {component}
            </button>
          ))}
        </div>
      </div>
      {form.tipo_servico === "Inspeção" && (
        <div className="mp-inspection">
          <strong>Condição encontrada</strong>
          <div className="mp-condition-row">
            {INSPECTION_CONDITIONS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={form.condicao === item.id ? "active" : ""}
                style={{ "--condition-color": item.color }}
                onClick={() => setForm({ ...form, condicao: item.id })}
              >
                {item.label}
              </button>
            ))}
          </div>
          {form.condicao && form.condicao !== "BOM" && (
            <label>
              Motivo
              <select
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              >
                <option value="">Selecione...</option>
                {INSPECTION_REASONS.map((reason) => (
                  <option key={reason}>{reason}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      <div className="mp-known-data">
        <span>
          <small>Posição</small>
          {selected.axle.label} · {selected.side}
        </span>
        <span>
          <small>Data</small>
          <input
            type="date"
            required
            value={form.data_servico}
            onChange={(e) => setForm({ ...form, data_servico: e.target.value })}
          />
        </span>
        <span>
          <small>KM do serviço</small>
          <input
            type="number"
            value={form.km_servico}
            onChange={(e) => setForm({ ...form, km_servico: e.target.value })}
          />
        </span>
      </div>
      {form.tipo_servico === "Troca" && suggested.length > 0 && (
        <div className="mp-km-suggestions">
          <strong>Próximos vencimentos calculados</strong>
          {suggested.map((item) => (
            <span key={item.component}>
              {item.component}: <b>{formatKm(item.next)} km</b>{" "}
              <small>
                (intervalo planejado de {formatKm(item.interval)} km)
              </small>
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        className="mp-more-toggle"
        onClick={() => setMore(!more)}
      >
        {more
          ? "− Ocultar informações adicionais"
          : "+ Mais informações (opcional)"}
      </button>
      {more && (
        <div className="mp-form-grid">
          <label>
            Próximo KM <small>(sobrescrever cálculo)</small>
            <input
              type="number"
              placeholder={
                suggested.length === 1
                  ? suggested[0].next
                  : "Automático por componente"
              }
              value={form.proximo_km}
              onChange={(e) => setForm({ ...form, proximo_km: e.target.value })}
            />
          </label>
          <label>
            Próxima data
            <input
              type="date"
              value={form.proxima_data}
              onChange={(e) =>
                setForm({ ...form, proxima_data: e.target.value })
              }
            />
          </label>
          <label>
            Marca
            <input
              list="mp-marcas"
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
            />
            <datalist id="mp-marcas">
              {options.marcas.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
          <label>
            Fornecedor
            <input
              list="mp-fornecedores"
              value={form.fornecedor}
              onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
            />
            <datalist id="mp-fornecedores">
              {options.fornecedores.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
          <label>
            Valor
            <input
              type="number"
              step="0.01"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
            />
          </label>
          <label className="mp-observation">
            Observação
            <textarea
              rows="3"
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            />
          </label>
        </div>
      )}
      <div className="mp-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          disabled={
            saving || (form.tipo_servico === "Inspeção" && !form.condicao)
          }
        >
          {saving
            ? "Salvando..."
            : form.componentes.length > 1
              ? `Salvar ${form.componentes.length} serviços agrupados`
              : "Salvar serviço"}
        </button>
      </div>
    </form>
  );
}

function MaintenanceCheckup({
  positions,
  currentKm,
  vehicle,
  saving,
  onSave,
  onClose,
}) {
  const items = positions.flatMap((position) =>
    COMPONENTS.filter((component) => component !== "Outro").map(
      (component) => ({ ...position, component }),
    ),
  );
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const item = items[index];
  const key = item
    ? `${item.plate}|${item.axle.id}|${item.side}|${item.component}`
    : "";
  const answer = answers[key];
  const inspected = Object.keys(answers).length;
  const choose = (condition) => {
    setAnswers((current) => ({ ...current, [key]: condition }));
    if (index < items.length - 1)
      setTimeout(() => setIndex((value) => value + 1), 120);
  };
  const finish = async () => {
    const selectedItems = items
      .filter(
        (entry) =>
          answers[
            `${entry.plate}|${entry.axle.id}|${entry.side}|${entry.component}`
          ],
      )
      .map((entry) => ({
        placa: entry.plate,
        conjunto_placa: vehicle.placa,
        layout_tipo: entry.type,
        eixo_codigo: entry.axle.id,
        lado: entry.side,
        componente: entry.component,
        tipo_servico: "Inspeção",
        condicao:
          answers[
            `${entry.plate}|${entry.axle.id}|${entry.side}|${entry.component}`
          ],
        data_servico: new Date().toISOString().slice(0, 10),
        km_servico: currentKm,
      }));
    if (selectedItems.length)
      await onSave(selectedItems, `Check-up com ${selectedItems.length} itens`);
  };
  const totals = Object.values(answers).reduce((acc, condition) => {
    acc[condition] = (acc[condition] || 0) + 1;
    return acc;
  }, {});
  return (
    <div className="mp-checkup">
      <div className="mp-checkup-head">
        <div>
          <small>CHECK-UP · {vehicle.placa}</small>
          <h3>
            {inspected} de {items.length} verificados
          </h3>
        </div>
        <button className="icon-btn" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>
      <div className="mp-progress">
        <i
          style={{
            width: `${items.length ? (inspected / items.length) * 100 : 0}%`,
          }}
        />
      </div>
      <div className="mp-checkup-item">
        <span>
          {index + 1} / {items.length}
        </span>
        <h2>{item.component}</h2>
        <p>
          {item.plate} · {item.axle.label} · lado{" "}
          {item.side === "E" ? "esquerdo" : "direito"}
        </p>
        <div className="mp-checkup-actions">
          {INSPECTION_CONDITIONS.map((condition) => (
            <button
              type="button"
              className={answer === condition.id ? "active" : ""}
              style={{ "--condition-color": condition.color }}
              onClick={() => choose(condition.id)}
              key={condition.id}
            >
              {condition.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mp-checkup-nav">
        <button
          className="btn"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          Anterior
        </button>
        <div>
          <span className="ok">{totals.BOM || 0} bons</span>
          <span className="near">{totals.ATENCAO || 0} atenção</span>
          <span className="bad">{totals.CRITICO || 0} críticos</span>
        </div>
        <button
          className="btn"
          disabled={index === items.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Próximo
        </button>
      </div>
      <div className="mp-actions">
        <button className="btn" onClick={onClose}>
          Sair sem salvar
        </button>
        <button
          className="btn btn-primary"
          disabled={!inspected || saving}
          onClick={finish}
        >
          {saving ? "Salvando..." : `Concluir e salvar (${inspected})`}
        </button>
      </div>
    </div>
  );
}

export function ManutencaoPosicoes({ vehicles, onClose, embedded = false }) {
  const [screenMode, setScreenMode] = React.useState("map");
  const [vehicle, setVehicle] = React.useState(vehicles[0] || null);
  const [records, setRecords] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [tab, setTab] = React.useState("current");
  const [formComponent, setFormComponent] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [loadingRecords, setLoadingRecords] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [checkup, setCheckup] = React.useState(false);
  const [options, setOptions] = React.useState({
    marcas: [],
    fornecedores: [],
    intervalos: [],
  });
  const layout = inferMaintenanceLayout(vehicle);
  const currentKm = Number(vehicle?.km_atual) || 0;
  const positions = allPositions(vehicle);
  const load = React.useCallback(async (plate) => {
    if (!plate) return;
    setLoadingRecords(true);
    try {
      const data = await RB_API.listComponentesPosicao(plate);
      setRecords(data.registros || []);
    } finally {
      setLoadingRecords(false);
    }
  }, []);
  React.useEffect(() => {
    setSelected(null);
    setFormComponent(null);
    setSuccess("");
    load(vehicle?.placa).catch((e) => setError(e.message));
  }, [vehicle]);
  React.useEffect(() => {
    RB_API.getOpcoesComponentesPosicao()
      .then(setOptions)
      .catch((e) => setError(e.message));
  }, []);

  function selectPosition(pos) {
    setSelected(pos);
    setTab("current");
    setFormComponent(null);
    setSuccess("");
  }
  async function saveBatch(items, successMessage) {
    setSaving(true);
    setError("");
    try {
      await RB_API.createComponentesPosicaoLote({ itens: items });
      await load(vehicle.placa);
      setSuccess(successMessage);
      setFormComponent(null);
      setCheckup(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function save(form) {
    const { componentes, ...shared } = form;
    const intervalMap = Object.fromEntries(
      options.intervalos.map((item) => [item.componente, Number(item.km)]),
    );
    const items = componentes.map((componente) => ({
      ...shared,
      componente,
      proximo_km:
        shared.proximo_km ||
        (shared.tipo_servico === "Troca" &&
        intervalMap[componente] &&
        Number(shared.km_servico)
          ? Number(shared.km_servico) + intervalMap[componente]
          : ""),
      placa: selected.plate,
      conjunto_placa: vehicle.placa,
      layout_tipo: selected.type,
      eixo_codigo: selected.axle.id,
      lado: selected.side,
    }));
    await saveBatch(
      items,
      `${form.tipo_servico} de ${componentes.join(" + ")} registrada em ${selected.axle.label} · ${selected.side}.`,
    );
  }

  // Keeps the selected panel synchronized after records are refreshed.
  const selectedLive = selected
    ? {
        ...selected,
        state: positionState(
          records,
          selected.plate,
          selected.axle.id,
          selected.side,
          currentKm,
        ),
      }
    : null;
  return (
    <div className={embedded ? "mp-embedded" : "mp-overlay"}>
      <section className="card mp-shell">
        <div className="card-header mp-main-header">
          <div>
            <h2>
              {screenMode === "map"
                ? "Mapa de componentes"
                : "Consulta de manutenções"}
            </h2>
            <span className="muted">
              {screenMode === "map"
                ? "Estado mecânico por eixo e posição"
                : "Histórico completo, custos e próximos vencimentos"}
            </span>
          </div>
          <div className="mp-screen-switch">
            <button
              type="button"
              className={screenMode === "map" ? "active" : ""}
              onClick={() => setScreenMode("map")}
            >
              <Icon name="truck" size={13} /> Mapa por posição
            </button>
            <button
              type="button"
              className={screenMode === "consult" ? "active" : ""}
              onClick={() => setScreenMode("consult")}
            >
              <Icon name="search" size={13} /> Consulta geral
            </button>
            {!embedded && (
              <button className="icon-btn" onClick={onClose}>
                <Icon name="x" />
              </button>
            )}
          </div>
        </div>
        {screenMode === "consult" ? (
          <MaintenanceConsultation vehicles={vehicles} options={options} />
        ) : (
          <div className="mp-content">
            <div className="mp-toolbar">
              <label>Veículo</label>
              <select
                value={vehicle?.placa || ""}
                onChange={(e) =>
                  setVehicle(vehicles.find((v) => v.placa === e.target.value))
                }
              >
                {vehicles.map((v) => (
                  <option key={v.placa} value={v.placa}>
                    {v.placa} · {v.modelo || "Sem modelo"}
                  </option>
                ))}
              </select>
              <span className="badge">
                {layout === "BITRUCK"
                  ? "Bi-truck"
                  : vehicle?.implementos?.length
                    ? `Cavalo + ${vehicle.implementos.length} implemento(s)`
                    : "Truck"}
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => setCheckup(true)}
              >
                Iniciar check-up
              </button>
              <span className="mp-km">
                <small>KM atual</small>
                <strong>{formatKm(currentKm)} km</strong>
              </span>
            </div>
            {loadingRecords ? (
              <div className="mp-loading">
                Atualizando situação do veículo...
              </div>
            ) : (
              <SummaryCards
                positions={positions}
                records={records}
                currentKm={currentKm}
              />
            )}
            <div className="mp-vehicles">
              <AxleDiagram
                plate={vehicle?.placa}
                title={vehicle?.modelo || `Veículo ${vehicle?.placa}`}
                type={layout}
                count={vehicle?.eixos}
                records={records}
                currentKm={currentKm}
                selected={selectedLive}
                onSelect={selectPosition}
              />
              {(vehicle?.implementos || []).map((imp) => (
                <AxleDiagram
                  key={imp.placa}
                  plate={imp.placa}
                  title={imp.modelo || "Implemento engatado"}
                  type="IMPLEMENTO"
                  count={imp.eixos}
                  records={records}
                  currentKm={currentKm}
                  selected={selectedLive}
                  onSelect={selectPosition}
                />
              ))}
            </div>
            <div className="mp-legend">
              {Object.values(STATUS).map((state) => (
                <span key={state.label}>
                  <i style={{ background: state.color }} />
                  {state.icon} {state.label}
                </span>
              ))}
            </div>
            {error && <div className="mp-alert error">{error}</div>}
            {success && (
              <div className="mp-alert success">
                <strong>Serviço registrado com sucesso.</strong> {success}
              </div>
            )}
            {checkup && (
              <MaintenanceCheckup
                positions={positions}
                currentKm={currentKm}
                vehicle={vehicle}
                saving={saving}
                onSave={saveBatch}
                onClose={() => setCheckup(false)}
              />
            )}
            {selectedLive && (
              <section className="card mp-position-panel">
                <div className="mp-position-head">
                  <div>
                    <small>{selectedLive.plate}</small>
                    <h3>
                      {selectedLive.axle.label} · lado{" "}
                      {selectedLive.side === "E" ? "esquerdo" : "direito"}
                    </h3>
                  </div>
                  <div className="mp-position-actions">
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => setFormComponent("Lona de freio")}
                    >
                      + Registrar serviço
                    </button>
                    <button
                      className="icon-btn"
                      type="button"
                      onClick={() => setSelected(null)}
                    >
                      <Icon name="x" />
                    </button>
                  </div>
                </div>
                {!formComponent && (
                  <>
                    <div className="mp-tabs">
                      <button
                        className={tab === "current" ? "active" : ""}
                        onClick={() => setTab("current")}
                      >
                        Visão atual
                      </button>
                      <button
                        className={tab === "history" ? "active" : ""}
                        onClick={() => setTab("history")}
                      >
                        Histórico{" "}
                        <span>{selectedLive.state.history.length}</span>
                      </button>
                    </div>
                    {tab === "current" ? (
                      <ComponentList
                        selected={selectedLive}
                        onRegister={setFormComponent}
                      />
                    ) : (
                      <History
                        selected={selectedLive}
                        onChanged={() => load(vehicle.placa)}
                      />
                    )}
                  </>
                )}
                {formComponent && (
                  <ServiceForm
                    key={`${selectedLive.plate}-${selectedLive.axle.id}-${selectedLive.side}-${formComponent}`}
                    selected={selectedLive}
                    vehicle={vehicle}
                    initialComponent={formComponent}
                    options={options}
                    saving={saving}
                    onCancel={() => setFormComponent(null)}
                    onSave={save}
                  />
                )}
              </section>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function ManutencaoPosicoesScreen() {
  const [vehicles, setVehicles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    let active = true;
    RB_API.listVeiculosManutencao()
      .then((data) => {
        if (active) setVehicles(data.veiculos || []);
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
  }, []);
  return (
    <div className="view mp-view">
      <div className="page-head">
        <div>
          <h1>Manutenção por posição</h1>
          <div className="sub">
            Check-up visual de freios, cubos, rolamentos e suspensão por eixo.
          </div>
        </div>
      </div>
      {loading && (
        <div className="card mp-page-state">
          Carregando veículos e implementos...
        </div>
      )}
      {error && <div className="card mp-page-state error">{error}</div>}
      {!loading && !error && !vehicles.length && (
        <div className="card mp-page-state">Nenhum veículo encontrado.</div>
      )}
      {!loading && !error && vehicles.length > 0 && (
        <ManutencaoPosicoes vehicles={vehicles} embedded />
      )}
    </div>
  );
}

window.ManutencaoPosicoesScreen = ManutencaoPosicoesScreen;
