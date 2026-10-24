import React, { useEffect, useRef, useState } from "react";
import "./maintenance-demo.css";
import ExpenseHistory, { ExpenseSummary } from "./expense-history.jsx";
import DriverExpenseWizard, {prepareReceipt} from "./driver-expense-wizard.jsx";
import ExpensePhotoAssist from "./expense-photo-assist.jsx";
import {readExpenseDraft,clearExpenseDraft,useExpenseDraft} from "./expense-draft.js";

const money = (value) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const expenseDay = (r) =>
  r.expenseDate ||
  new Date(r.date).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
const controlLabel = (value) => value == null ? "Não informado" : value ? "Sim" : "Não";
const displayDay = (value) =>
  value ? value.split("-").reverse().join("/") : "—";
const normalize = (value) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
function Icon({ name, size = 20 }) {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    truck: (
      <>
        <path d="M3 6h11v11H3zM14 10h4l3 4v3h-7" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    list: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V2h6v2M9 10h6M9 15h6" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    tool: (
      <path d="M14 6a5 5 0 0 0-6 6l-5 5a2 2 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-4-4 3-3Z" />
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.tool}
    </svg>
  );
}

export default function MaintenanceDemo({
  initialView,
  embedded = false,
} = {}) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const expired = () => {
      setUser(null);
      setChecking(false);
      setAuthError("");
    };
    window.addEventListener("rodobach:unauthorized", expired);
    setChecking(true);
    setAuthError("");
    if (!window.RB_AUTH?.getToken()) setChecking(false);
    else
      window.RB_AUTH.me()
        .then(({ user: current }) => {
          if (active) setUser(current);
        })
        .catch((error) => {
          if (active) {
            setUser(null);
            if (window.RB_AUTH.getToken()) setAuthError(error.message);
          }
        })
        .finally(() => {
          if (active) setChecking(false);
        });
    return () => {
      active = false;
      window.removeEventListener("rodobach:unauthorized", expired);
    };
  }, [attempt]);
  if (checking)
    return (
      <div className="mp-app mp-access" role="status">
        Verificando sua sessão…
      </div>
    );
  if (authError)
    return (
      <div className="mp-app mp-access">
        <p role="alert">{authError}</p>
        <button onClick={() => setAttempt((n) => n + 1)}>
          Tentar novamente
        </button>
      </div>
    );
  if (!user) {
    const Login = window.LoginScreen;
    return Login ? (
      <Login onLogin={() => setAttempt((n) => n + 1)} />
    ) : (
      <div className="mp-app mp-access">Entre no sistema para continuar.</div>
    );
  }
  const canRegister =
    user.admin || user.permissions?.["manutencao-plantao"] === true;
  const canReview =
    user.admin || user.permissions?.["conferencia-manutencao"] === true;
  const requested =
    initialView ||
    (new URLSearchParams(window.location.search).get("visao") === "conferencia"
      ? "manager"
      : new URLSearchParams(window.location.search).get("visao") === "motorista" ? "motorist" : null);
  if (
    (!canRegister && !canReview) ||
    (requested === "manager" && !canReview) ||
    (["driver", "motorist"].includes(requested) && !canRegister)
  )
    return (
      <div className="mp-app mp-access">
        <p role="alert">
          Seu usuário não possui liberação para esta tela. Solicite acesso ao
          administrador.
        </p>
        <a href="/">Voltar ao sistema</a>
      </div>
    );
  return (
    <MaintenanceForm
      key={`${user.id}-${requested}`}
      user={user}
      initialView={requested || (canRegister ? "driver" : "manager")}
      canRegister={canRegister}
      canReview={canReview}
      embedded={embedded}
    />
  );
}

export function sanitizeAmount(raw) {
  const cleaned = raw.replace(/[^0-9,.]/g, "");
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "")
    : cleaned.replace(".", ",");
  const [integer, ...fraction] = normalized.split(",");
  return (
    integer.replace(/^0+(?=\d)/, "").slice(0, 6) +
    (fraction.length
      ? `,${fraction.join("").replace(/\D/g, "").slice(0, 2)}`
      : "")
  );
}

function FleetSelect({ fleet, value, onChange, disabled, loading }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef(null);
  const options = fleet.filter((item) => item.includes(value));
  const choose = (item) => {
    onChange(item);
    input.current?.focus();
    setOpen(false);
    setActive(-1);
  };
  useEffect(() => {
    if (open && active >= 0)
      document
        .getElementById(`mp-fleet-option-${active}`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [active, open]);
  return (
    <div
      className="mp-fleet-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <label htmlFor="mp-plate-search">Placa do veículo</label>
      <div
        className={`mp-fleet-control ${open ? "is-open" : ""} ${value ? "has-value" : ""}`}
      >
        <span className="mp-fleet-icon">
          <Icon name="truck" size={18} />
        </span>
        <input
          ref={input}
          id="mp-plate-search"
          className="mp-plate-input"
          role="combobox"
          aria-expanded={open}
          aria-controls="mp-fleet-plates"
          aria-autocomplete="list"
          aria-activedescendant={
            open && active >= 0 ? `mp-fleet-option-${active}` : undefined
          }
          disabled={disabled}
          value={value}
          placeholder={loading ? "Carregando…" : "Buscar placa"}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={8}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            onChange(normalize(event.target.value));
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              setActive(-1);
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActive((index) =>
                options.length
                  ? (index +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      options.length) %
                    options.length
                  : -1,
              );
            }
            if (event.key === "Enter" && open) {
              event.preventDefault();
              if (options[active] || options.length === 1)
                choose(options[active] || options[0]);
            }
          }}
        />
        {value && (
          <button
            type="button"
            type="button"
            className="mp-clear-plate"
            aria-label="Limpar placa selecionada"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange("");
              input.current?.focus();
              setOpen(false);
              setActive(-1);
            }}
          >
            ×
          </button>
        )}
        <button
          type="button"
          className="mp-fleet-toggle"
          aria-label={
            open ? "Fechar placas da frota" : "Mostrar placas da frota"
          }
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open) setOpen(false);
            else {
              input.current?.focus();
              setOpen(true);
            }
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      {open && !disabled && (
        <div className="mp-fleet-dropdown">
          <div className="mp-fleet-caption">
            PLACAS DA FROTA <span>{options.length}</span>
          </div>
          <div id="mp-fleet-plates" role="listbox" aria-label="Placas da frota">
            {options.map((item, index) => (
              <div
                role="option"
                aria-selected={value === item}
                id={`mp-fleet-option-${index}`}
                key={item}
                className={`mp-fleet-option ${index === active ? "is-active" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                <span className="mp-fleet-option-icon">
                  <Icon name="truck" size={17} />
                </span>
                <strong>{item}</strong>
                {value === item && <Icon name="check" size={16} />}
              </div>
            ))}
          </div>
          {!options.length && (
            <p className="mp-fleet-empty">Nenhuma placa encontrada.</p>
          )}
        </div>
      )}
    </div>
  );
}

function SupplierSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    setError(false);
    setOptions([]);
    setActive(-1);
    const timer = setTimeout(() => {
      window.RB_API.searchFornecedoresManutencao(value.nome)
        .then((data) => {
          if (live) setOptions(data.fornecedores || []);
        })
        .catch(() => {
          if (live) setError(true);
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [value.nome, open]);
  function choose(item) {
    onChange(item);
    input.current?.focus();
    setOpen(false);
    setActive(-1);
  }
  return (
    <div
      className="mp-fleet-select mp-supplier"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor="mp-supplier">Fornecedor</label>
      <input
        ref={input}
        id="mp-supplier"
        role="combobox"
        aria-expanded={open}
        aria-controls="mp-suppliers"
        aria-autocomplete="list"
        aria-activedescendant={
          open && active >= 0 ? `mp-supplier-${active}` : undefined
        }
        value={value.nome}
        maxLength={120}
        autoComplete="off"
        placeholder="Busque ou digite o nome do fornecedor"
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          onChange({ nome: event.target.value });
          setOpen(true);
          setActive(-1);
          setOptions([]);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((index) =>
              options.length
                ? (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    options.length) %
                  options.length
                : -1,
            );
          }
          if (event.key === "Enter" && open) {
            event.preventDefault();
            if (options[active]) choose(options[active]);
            else if (value.nome.trim()) choose({ nome: value.nome.trim() });
          }
        }}
      />
      {open && (
        <div className="mp-fleet-dropdown">
          <div className="mp-fleet-caption">FORNECEDORES DO SISTEMA</div>
          {loading && (
            <p className="mp-fleet-empty" role="status">
              Buscando fornecedores…
            </p>
          )}
          {error && (
            <p className="mp-fleet-empty">
              Não foi possível consultar. Você pode digitar o nome.
            </p>
          )}
          <div
            id="mp-suppliers"
            role="listbox"
            aria-label="Fornecedores do sistema"
          >
            {options.map((item, index) => (
              <div
                key={`${item.empresa}-${item.codigo}`}
                id={`mp-supplier-${index}`}
                role="option"
                aria-selected={
                  value.codigo === item.codigo && value.empresa === item.empresa
                }
                className={`mp-fleet-option ${active === index ? "is-active" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                <strong>{item.nome}</strong>
                <small>
                  Cód. {item.codigo} · Emp. {item.empresa}
                </small>
              </div>
            ))}
          </div>
          {!loading && !error && !options.length && (
            <p className="mp-fleet-empty">
              Nenhum fornecedor encontrado. Use o nome digitado.
            </p>
          )}
          {value.nome.trim() && (
            <button
              type="button"
              className="mp-supplier-manual"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose({ nome: value.nome.trim() })}
            >
              <Icon name="plus" size={16} />
              Usar “{value.nome.trim()}” sem cadastro
            </button>
          )}
        </div>
      )}
      <p className="mp-field-help">
        {value.codigo != null
          ? "Fornecedor selecionado no cadastro do sistema."
          : "Não encontrou? Digite o nome para este lançamento."}
      </p>
    </div>
  );
}

function MaintenanceDialog({ children, onClose, saving, step }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = window.document.activeElement;
    const overflow = window.document.body.style.overflow;
    dialog.showModal();
    window.document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      window.document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    ref.current.querySelector("[data-step-title]")?.focus();
    ref.current.querySelector(".mp-wizard-body")?.scrollTo?.(0, 0);
  }, [step]);
  return (
    <dialog
      ref={ref}
      className="mp-dialog"
      aria-labelledby="mp-edit-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

function MaintenanceForm({
  user,
  initialView,
  canRegister,
  canReview,
  embedded,
}) {
  const [driverWizard, setDriverWizard] = useState(null);
  const [maintenanceDraft] = useState(()=>readExpenseDraft(user,"maintenance"));
  const [receiptReason,setReceiptReason] = useState(maintenanceDraft?.receiptReason || "");
  const [maintenancePhotos,setMaintenancePhotos] = useState(maintenanceDraft?.photos || {});
  const [photoBusy,setPhotoBusy] = useState(false);
  const [receiptView, setReceiptView] = useState(null);
  const [sourceFilter, setSourceFilter] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expenseDate, setExpenseDate] = useState(maintenanceDraft?.expenseDate || today);
  const [paymentRecord, setPaymentRecord] = useState(null);
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paidFilter, setPaidFilter] = useState("");
  const [postedFilter, setPostedFilter] = useState("");
  const [document, setDocument] = useState(maintenanceDraft?.document || "");
  const [dateFrom, setDateFrom] = useState(() => `${today().slice(0,7)}-01`);
  const [dateTo, setDateTo] = useState(today);
  const [textSearch, setTextSearch] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [history, setHistory] = useState(null);
  const [records, setRecords] = useState([]);
  const [view, setView] = useState(initialView);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsAttempt, setRecordsAttempt] = useState(0);
  const [recordsError, setRecordsError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [plate, setPlate] = useState(maintenanceDraft?.plate || "");
  const [fleet, setFleet] = useState([]);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [fleetError, setFleetError] = useState("");
  const [fleetAttempt, setFleetAttempt] = useState(0);
  const [expenseAccess, setExpenseAccess] = useState(null);
  const isDriver = user.expenseProfile === "motorista";
  useEffect(() => {
    if (!isDriver || wizardOpen || driverWizard) return;
    const refresh = () => setFleetAttempt(n => n + 1);
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [isDriver, wizardOpen, driverWizard]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState(maintenanceDraft?.amount || "");
  const [supplier, setSupplier] = useState(maintenanceDraft?.supplier || { nome: "" });
  const author = user.nome || user.login;
  const [service, setService] = useState(maintenanceDraft?.service || "Borracharia");
  const [note, setNote] = useState(maintenanceDraft?.note || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const draftWarning = useExpenseDraft(user,"maintenance",editing,{expenseDate,document,plate,amount,service,note,supplier,receiptReason,photos:maintenancePhotos},wizardOpen && !completed);
  useEffect(() => {
    let active = true;
    setFleetLoading(true);
    setFleetError("");
    window.RB_API.listVeiculosPlantao()
      .then((data) => {
        if (!Array.isArray(data.veiculos))
          throw new Error("Resposta inválida ao consultar a frota.");
        if (active) setExpenseAccess(data.access || null);
        if (active)
          setFleet(
            [
              ...new Set(
                data.veiculos
                  .map((v) => normalize(String(v.placa || "")))
                  .filter(Boolean),
              ),
            ].sort(),
          );
      })
      .catch((error) => {
        if (active) {
          setFleet([]);
          setExpenseAccess(null);
          setFleetError(error.message || "Não foi possível carregar a frota.");
        }
      })
      .finally(() => {
        if (active) setFleetLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fleetAttempt]);
  const manager = view === "manager" && canReview;
  useEffect(() => {
    let active = true;
    setRecordsLoading(true);
    setRecordsError("");
    setRecords([]);
    window.RB_API.listPlantao(manager)
      .then((data) => {
        if (active) setRecords(data.records);
      })
      .catch((error) => {
        if (active)
          setRecordsError(
            error.message || "Não foi possível carregar os lançamentos.",
          );
      })
      .finally(() => {
        if (active) setRecordsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [manager, recordsAttempt]);
  const scoped = records.filter(
    (r) =>
      (!manager || !sourceFilter || (r.authorProfile || "unknown") === sourceFilter) &&
      (!manager || !paidFilter || String(r.paid ?? "unknown") === paidFilter) &&
      (!manager || !postedFilter || String(r.posted ?? "unknown") === postedFilter) &&
      r.plate.includes(normalize(search)) &&
      (!dateFrom || expenseDay(r) >= dateFrom) &&
      (!dateTo || expenseDay(r) <= dateTo) &&
      `${r.supplier || ""} ${r.document || ""} ${r.author || ""} ${r.note || ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(textSearch.toLocaleLowerCase("pt-BR")),
  );
  const duplicates = new Set();
  const duplicateKeys = new Map();
  for (const r of records) {
    const supplierKey = (r.supplier || "").trim().toLowerCase();
    const keys = [
      JSON.stringify([
        r.plate,
        expenseDay(r),
        r.amount,
        r.service,
        supplierKey,
      ]),
    ];
    if (r.document && supplierKey)
      keys.push(
        JSON.stringify([
          supplierKey,
          r.document.toUpperCase().replace(/[^A-Z0-9]/g, ""),
        ]),
      );
    for (const key of keys) {
      if (duplicateKeys.has(key)) {
        duplicates.add(r.id);
        duplicates.add(duplicateKeys.get(key));
      } else duplicateKeys.set(key, r.id);
    }
  }
  function cancelEdit() {
    setReceiptReason("");setMaintenancePhotos({});
    setStep(0);
    setEditing(null);
    setAmount("");
    setNote("");
    setSupplier({ nome: "" });
    setDocument("");
    setExpenseDate(today());
    setError("");
    setPlate("");
    setService("Borracharia");
  }
  function editRecord(r) {
    if (saving || user.readOnly || r.checked) return;
    if (r.source === "motorista") { setDriverWizard({record:r}); return; }
    const draft = readExpenseDraft(user,"maintenance",r);
    setReceiptReason(draft?.receiptReason ?? r.receiptReason ?? "");
    setMaintenancePhotos(draft?.photos || {});
    setEditing(r);
    setPlate(draft?.plate ?? r.plate);
    setAmount(draft?.amount ?? r.amount.toFixed(2).replace(".", ","));
    setService(draft?.service ?? r.service);
    setNote(draft?.note ?? r.note ?? "");
    setSupplier(draft?.supplier ?? {
      nome: r.supplier || "",
      codigo: r.supplierCode,
      empresa: r.supplierCompany,
    });
    setExpenseDate(draft?.expenseDate ?? expenseDay(r));
    setDocument(draft?.document ?? r.document ?? "");
    setMessage("");
    setError("");
    setStep(0);
    setCompleted(false);
    setWizardOpen(true);
  }
  async function deleteRecord(r) {
    if (savingRef.current || deleteReason.trim().length < 5) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await window.RB_API.deletePlantao(
        r.id,
        { version: r.version, reason: deleteReason.trim() },
        manager,
      );
      setRecords((items) => items.filter((item) => item.id !== r.id));
      setDeleting(null);
      setDeleteReason("");
      if (editing?.id === r.id) cancelEdit();
      setMessage(
        "Lançamento excluído. O motivo e o histórico foram preservados.",
      );
    } catch (error) {
      setError(error.message || "Não foi possível excluir.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  async function showReceipt(r) {
    setReceiptView({id:r.id,loading:true});
    try {
      const result = await window.RB_API.receiptPlantao(r.id, manager);
      setReceiptView(current => current?.id === r.id ? {id:r.id,receipt:result.receipt,photos:result.photos} : current);
    } catch(error) {setReceiptView(current => current?.id === r.id ? {id:r.id,error:error.message} : current);}
  }
  async function showHistory(r) {
    setHistory({ id: r.id, loading: true, items: [] });
    try {
      const result = await window.RB_API.historyPlantao(r.id, manager);
      setHistory((current) =>
        current?.id === r.id ? { id: r.id, items: result.history } : current,
      );
    } catch (error) {
      setHistory((current) =>
        current?.id === r.id
          ? { id: r.id, items: [], error: error.message }
          : current,
      );
    }
  }
  const visible = scoped
    .filter(
      (r) =>
        filter === "all" || (filter === "pending" ? !r.checked : r.checked),
    )
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  async function updateControl(record, field, value) {
    if (!manager || user.readOnly || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await window.RB_API.updatePlantaoControl(record.id, { version: record.version, [field]: value }, manager);
      setRecords(items => items.map(item => item.id === record.id ? result.record : item));
      setHistory(null);
      setMessage("Controle atualizado e registrado no histórico.");
      return true;
    } catch (error) {
      const message = error.message || "Não foi possível atualizar o controle.";
      if (field === "paymentDate") setPaymentError(message);
      else setError(message);
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  function openPayment(record) {
    setPaymentRecord(record);
    setPaymentDate(record.paymentDate || today());
    setPaymentError("");
  }
  async function savePayment(event) {
    event.preventDefault();
    if (!paymentDate || paymentDate > today()) {
      setPaymentError("Informe a data do pagamento, sem data futura.");
      return;
    }
    setPaymentError("");
    if (await updateControl(paymentRecord, "paymentDate", paymentDate)) setPaymentRecord(null);
  }
  async function confirmRecord(record) {
    if (!canReview || user.readOnly || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await window.RB_API.checkPlantao(
        record.id,
        record.version,
      );
      setRecords((items) =>
        items.map((item) => (item.id === record.id ? result.record : item)),
      );
      setMessage(`Lançamento da placa ${record.plate} conferido.`);
    } catch (error) {
      setError(error.message || "Não foi possível conferir o lançamento.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  function openWizard() {
    if (!canRegister || user.readOnly) return;
    if (isDriver && !editing) setPlate(fleet[0] || "");
    setMessage("");
    setError("");
    setCompleted(false);
    setWizardOpen(true);
  }
  function closeWizard() {
    if (savingRef.current || photoBusy) return;
    setWizardOpen(false);
    setError("");
    if (completed) {
      setStep(0);
      setCompleted(false);
    }
  }
  function advance(event) {
    event.preventDefault();
    if (savingRef.current || photoBusy) return;
    setError("");
    if (step === 0) {
      if (fleetLoading || fleetError || !fleet.includes(plate)) {
        setError("Selecione uma placa cadastrada na frota.");
        return;
      }
      const value = Number(amount.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(value) || value <= 0 || value > 999999.99) {
        setError(
          "Informe um valor entre R$ 0,01 e R$ 999.999,99. Exemplo: 180,00.",
        );
        return;
      }
      if (!expenseDate || expenseDate > today()) {
        setError("Informe a data da despesa, sem data futura.");
        return;
      }
    }
    if (step === 1) {
      const hasInvoice = maintenancePhotos.invoice !== undefined ? Boolean(maintenancePhotos.invoice) : Boolean(editing?.photoKinds?.invoice || editing?.hasReceipt);
      if (!hasInvoice && receiptReason.trim().length < 10) {
        setError("Anexe a nota ou justifique a ausência com pelo menos 10 caracteres.");
        return;
      }
    }
    if (step < 2) setStep((n) => n + 1);
    else submit(event);
  }
  async function submit(event) {
    event.preventDefault();
    if (
      (!canRegister && !(editing && canReview)) ||
      user.readOnly ||
      savingRef.current || photoBusy
    )
      return;
    if (!expenseDate || expenseDate > today()) {
      setError("Informe a data da despesa, sem data futura.");
      return;
    }
    const value = Number(amount.trim().replace(/\./g, "").replace(",", "."));
    if (fleetLoading || fleetError || !fleet.includes(plate)) {
      setError("Selecione uma placa cadastrada na frota.");
      return;
    }
    if (
      !/^\d+(?:\.\d{3})*(?:,\d{1,2})?$/.test(amount.trim()) ||
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 999999.99
    ) {
      setError(
        "Informe um valor entre R$ 0,01 e R$ 999.999,99. Exemplo: 180,00.",
      );
      return;
    }
    if (!window.RB_AUTH.getToken() || !author) {
      setError("Entre no sistema novamente para registrar a manutenção.");
      return;
    }
    const hasInvoice=maintenancePhotos.invoice !== undefined ? Boolean(maintenancePhotos.invoice) : Boolean(editing?.photoKinds?.invoice || editing?.hasReceipt);
    if (!hasInvoice && receiptReason.trim().length<10) {setError("Anexe a nota ou justifique a ausência com pelo menos 10 caracteres.");return;}
    savingRef.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const body = {
        expenseDate,
        receiptReason,photos:maintenancePhotos,
        document: document.trim(),
        plate,
        amount: value,
        service,
        note: note.trim(),
        supplier: supplier.nome.trim(),
        supplierCode: supplier.codigo ?? null,
        supplierCompany: supplier.empresa ?? null,
      };
      const result = editing
        ? await window.RB_API.updatePlantao(
            editing.id,
            { ...body, version: editing.version },
            manager,
          )
        : await window.RB_API.createPlantao(body);
      setRecords((items) =>
        editing
          ? items.map((r) => (r.id === editing.id ? result.record : r))
          : [result.record, ...items],
      );
      setCompleted(true);
      try {clearExpenseDraft(user,"maintenance",editing);} catch { /* Expense already saved. */ }
      setReceiptReason("");setMaintenancePhotos({});
      setPlate("");
      setService("Borracharia");
      setEditing(null);
      setDocument("");
      setExpenseDate(today());
      setAmount("");
      setNote("");
      setSupplier({ nome: "" });
      setFilter("all");
      setMessage(
        editing
          ? "Lançamento atualizado. A alteração ficou registrada no histórico."
          : "Manutenção registrada! Ela já aparece no histórico e aguarda conferência.",
      );
    } catch (error) {
      setError(error.message || "Não foi possível salvar o lançamento.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  function changeView(next) {
    if (
      saving ||
      (next === "manager" && !canReview) ||
      (["driver", "motorist"].includes(next) && !canRegister)
    )
      return;
    if (next === view || (next !== "manager" && !manager)) return;
    cancelEdit();
    setDeleting(null);
    setHistory(null);
    setRecords([]);
    setView(next);
    setSourceFilter("");
    setDriverWizard(null);
    setWizardOpen(false);
    setPaidFilter("");
    setPostedFilter("");
    setFilter("all");
    setMessage("");
    setError("");
  }
  const renderExpenseRecord = (r) => (
                  <div className="mp-record" key={r.id}>
                    <div className="mp-record-main">
                      <span
                        className={`mp-service-icon ${r.service === "Elétrica" ? "peach" : ""}`}
                      >
                        <Icon name="tool" size={23} />
                      </span>
                      <div className="mp-record-description">
                        <span className="mp-plate-badge">
                          <Icon name="truck" size={15} />
                          {r.plate}
                        </span>
                        <h3>{r.service}</h3>
                        {manager && <span className="driver-source-tag">{r.authorProfile === "motorista" ? "Motorista" : r.authorProfile === "colaborador" ? "Colaborador" : "Perfil não registrado"}</span>}
                        {r.supplier && (
                          <p className="mp-record-supplier">{r.supplier}</p>
                        )}
                        <p>{r.note || "Sem observação"}</p>
                      </div>
                      <strong>{money(r.amount)}</strong>
                    </div>
                    <div className="mp-cost-details">
                      {r.expenseTime && <span>Horário da nota <b>{r.expenseTime}</b></span>}
                      <span>
                        Data da despesa <b>{displayDay(expenseDay(r))}</b>
                      </span>
                      <span>
                        Comprovante <b>{r.document || "Não informado"}</b>
                      </span>
                    </div>
                    {!r.photoKinds?.invoice && <p className="mp-duplicate-warning">Sem nota anexada · {r.receiptReason || "Justificativa não registrada"}</p>}
                    {r.source !== "motorista" && r.photoKinds?.invoice && <button className="mp-cancel-edit" onClick={()=>showReceipt(r)}>Ver comprovante</button>}
                    {r.paid && !r.checked && <p className="mp-duplicate-warning">Pago, aguardando conferência</p>}
                    {r.source === "motorista" && <div className="mp-cost-details driver-expense-details">
                      {r.fuelType && <span>Combustível <b>{r.fuelType}</b></span>}
                      {r.customerName && <span>Cliente da nota <b>{r.customerName}</b></span>}
                      {r.odometerDate && <span>Leitura da telemetria <b>{new Date(r.odometerDate).toLocaleString("pt-BR", {timeZone:"America/Sao_Paulo"})}</b></span>}
                      {r.arlaLiters != null && <span>ARLA <b>{r.arlaLiters.toLocaleString("pt-BR")} L · {money(r.arlaAmount)}</b></span>}
                      {r.fuelAmount != null && <span>Combustível <b>{money(r.fuelAmount)}</b></span>}
                      {r.liters != null && <span>Abastecimento <b>{Number(r.liters).toLocaleString("pt-BR")} L</b></span>}
                      {r.odometer != null && <span>Hodômetro <b>{Number(r.odometer).toLocaleString("pt-BR")} km</b></span>}
                      {r.location && <span>Local <b>{r.location}</b></span>}
                      {r.hasReceipt && <button className="mp-cancel-edit" onClick={() => showReceipt(r)}>Ver comprovante</button>}
                    </div>}
                    {manager && <div className="mp-payment-controls">
                      <button type="button" className={`mp-payment-button ${r.paid ? "is-paid" : ""}`}
                        disabled={saving || user.readOnly} onClick={() => openPayment(r)}
                        aria-label={`${r.paid ? "Editar pagamento" : "Registrar pagamento"} — ${r.plate}`}>
                        <span className="mp-payment-symbol"><Icon name={r.paid ? "check" : "calendar"} size={19} /></span>
                        <span><small>PAGAMENTO</small><strong>{r.paymentDate ? `Pago em ${displayDay(r.paymentDate)}` : r.paid ? "Pago · informar data" : "Registrar pagamento"}</strong></span>
                        <Icon name="arrow" size={16} />
                      </button>
                      <label className={`mp-posted-check ${r.posted ? "is-posted" : ""}`}>
                        <input type="checkbox" checked={r.posted === true} disabled={saving || user.readOnly}
                          aria-label={`Lançado — ${r.plate}`} onChange={(e) => updateControl(r, "posted", e.target.checked)} />
                        <span><small>LANÇAMENTO</small><strong>{r.posted ? "Lançado" : "Marcar como lançado"}</strong></span>
                      </label>
                    </div>}
                    {!manager && <div className="mp-payment-controls mp-financial-status" aria-label="Status financeiro">
                      <div className={`mp-payment-button ${r.paid ? "is-paid" : ""}`}>
                        <span className="mp-payment-symbol"><Icon name={r.paid ? "check" : "clock"} size={19} /></span>
                        <span><small>PAGAMENTO</small><strong>{r.paymentDate ? `Pago em ${displayDay(r.paymentDate)}` : r.paid ? "Pago · data não informada" : r.paid === false ? "Não pago" : "Não informado"}</strong></span>
                      </div>
                      <div className={`mp-posted-check ${r.posted ? "is-posted" : ""}`}>
                        <span className="mp-payment-symbol"><Icon name={r.posted ? "check" : "clock"} size={19} /></span>
                        <span><small>LANÇAMENTO</small><strong>{r.posted ? "Lançado" : r.posted === false ? "Não lançado" : "Não informado"}</strong></span>
                      </div>
                    </div>}
                    {duplicates.has(r.id) && (
                      <p className="mp-duplicate-warning">
                        Possível duplicidade. Compare os comprovantes antes de
                        conferir ou pagar.
                      </p>
                    )}
                    <div className="mp-record-meta">
                      <span>
                        <Icon name="clock" size={13} />
                        Registrado em{" "}
                        {new Date(r.date).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "America/Sao_Paulo",
                        })}
                      </span>
                      <span
                        className={`mp-status ${r.checked ? "checked" : ""}`}
                      >
                        {r.checked ? <Icon name="check" size={12} /> : <i />}
                        {r.checked ? "Conferido" : "Pendente"}
                      </span>
                    </div>
                    <div className="mp-record-bottom">
                      <span>Lançado por {r.author}</span>
                      {manager && !r.checked && (
                        <button
                          disabled={saving || user.readOnly}
                          onClick={() => confirmRecord(r)}
                        >
                          <Icon name="check" size={15} />
                          Conferir
                        </button>
                      )}
                    </div>
                    {r.checked && (
                      <p className="mp-checked-detail">
                        Conferido por {r.checkedBy || "usuário autorizado"}
                        {r.checkedAt
                          ? ` em ${new Date(r.checkedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
                          : ""}
                        . Edição e exclusão bloqueadas.
                      </p>
                    )}
                    <div className="mp-cost-actions">
                      {!r.checked &&
                        !user.readOnly &&
                        (manager || String(r.authorId) === String(user.id)) && (
                          <>
                            <button
                              disabled={saving || photoBusy}
                              onClick={() => editRecord(r)}
                            >
                              Editar
                            </button>
                            <button
                              className="mp-delete-action"
                              disabled={saving || photoBusy}
                              onClick={() => {
                                setDeleting(r.id);
                                setDeleteReason("");
                              }}
                            >
                              Excluir
                            </button>
                          </>
                        )}
                      <button
                        onClick={() =>
                          history?.id === r.id
                            ? setHistory(null)
                            : showHistory(r)
                        }
                      >
                        {history?.id === r.id
                          ? "Fechar histórico"
                          : "Histórico"}
                      </button>
                    </div>
                    {deleting === r.id && (
                      <div
                        className="mp-delete-confirm"
                        role="region"
                        aria-label="Confirmar exclusão"
                      >
                        <strong>
                          Excluir {r.plate} · {money(r.amount)}?
                        </strong>
                        <p>
                          O lançamento sairá da lista. O motivo e os dados serão
                          preservados no histórico.
                        </p>
                        <label>
                          Motivo da exclusão
                          <input
                            autoFocus
                            value={deleteReason}
                            maxLength={300}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            placeholder="Ex.: lançado duas vezes"
                          />
                        </label>
                        <button
                          disabled={saving || deleteReason.trim().length < 5}
                          onClick={() => deleteRecord(r)}
                        >
                          Confirmar exclusão
                        </button>
                        <button
                          disabled={saving || photoBusy}
                          onClick={() => setDeleting(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                    {history?.id === r.id && (
                      <div
                        className="mp-audit-history"
                        role="region"
                        aria-label="Histórico do lançamento"
                      >
                        {history.loading ? (
                          <p role="status">Carregando histórico…</p>
                        ) : history.error ? (
                          <p role="alert">{history.error}</p>
                        ) : history.items.length ? (
                          history.items.map((h, i) => (
                            <div key={i}>
                              <strong>
                                {{
                                  create: "Registrado",
                                  edit: "Editado",
                                  delete: "Excluído",
                                  check: "Conferido",
                                  status: "Controle atualizado",
                                }[h.evento] || h.evento}
                              </strong>{" "}
                              · {h.usuario_login} ·{" "}
                              {new Date(h.ocorrido_em).toLocaleString("pt-BR", {
                                timeZone: "America/Sao_Paulo",
                              })}
                              {h.evento === "edit" && (
                                <p>
                                  Antes: {h.antes.placa} ·{" "}
                                  {money(Number(h.antes.valor))} ·{" "}
                                  {String(h.antes.data_despesa)} ·{" "}
                                  {h.antes.fornecedor || "Sem fornecedor"} ·{" "}
                                  {h.antes.documento || "Sem comprovante"}
                                  <br />
                                  Depois: {h.depois.placa} ·{" "}
                                  {money(Number(h.depois.valor))} ·{" "}
                                  {String(h.depois.data_despesa)} ·{" "}
                                  {h.depois.fornecedor || "Sem fornecedor"} ·{" "}
                                  {h.depois.documento || "Sem comprovante"} {manager && <>· Pago: {controlLabel(h.depois.pago)}{h.depois.data_pagamento ? ` em ${displayDay(String(h.depois.data_pagamento).slice(0, 10))}` : ""} · Lançado: {controlLabel(h.depois.lancado)}</>}
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p>
                            Registro anterior ao histórico de alterações.
                            Lançado por {r.author}.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
  );
  return (
    <div className={`mp-app ${embedded ? "mp-embedded" : ""}`}>
      <header className="mp-topbar">
        <a className="mp-brand" href="/manutencao-plantao">
          <img className="mp-client-logo" src="/brand/rodobach.png" alt="Rodobach Transportes Rodoviários" width="191" height="52" />
          <span className="mp-brand-caption">NA ESTRADA, COM VOCÊ.</span>
        </a>
        <a className="mp-test" href="/">
          Voltar ao sistema
        </a>
      </header>
      {driverWizard && <DriverExpenseWizard record={driverWizard.record} user={user} fleet={fleet} fleetLoading={fleetLoading} fleetError={fleetError}
        onRetryFleet={() => setFleetAttempt(n => n + 1)} manager={manager} Dialog={MaintenanceDialog} FleetSelect={FleetSelect} sanitizeAmount={sanitizeAmount}
        onMaintenance={receipt => {
          if (receipt) {
            setMaintenancePhotos(current=>({...current,...receipt.photos}));
            setExpenseDate(receipt.date);
            if(receipt.amount) setAmount(receipt.amount);
            if(receipt.supplier) setSupplier({nome:receipt.supplier});
            if(receipt.documentNumber) setDocument(receipt.documentNumber);
            if(receipt.plate) setPlate(receipt.plate);
            setStep(0);
          }
          try {clearExpenseDraft(user,"expense");} catch {} setDriverWizard(null); openWizard();
        }}
        onClose={() => setDriverWizard(null)} onSaved={record => {
          setRecords(items => items.some(item => item.id === record.id) ? items.map(item => item.id === record.id ? record : item) : [record, ...items]);
          setHistory(null);
        }} />}
      {receiptView && <MaintenanceDialog onClose={() => setReceiptView(null)} saving={false} step="receipt">
        <div className="mp-form mp-payment-modal"><div className="mp-section-title"><h2 id="mp-edit-title" data-step-title tabIndex={-1}>Comprovante da despesa</h2><button className="mp-close" onClick={() => setReceiptView(null)} aria-label="Fechar comprovante">×</button></div>
          {receiptView.loading ? <p role="status">Carregando foto…</p> : receiptView.error ? <p role="alert">{receiptView.error}</p> : <div>{Object.entries(receiptView.photos || {invoice:receiptView.receipt}).filter(([,photo])=>photo).map(([kind,photo])=><figure key={kind}><figcaption>{{odometer:"Painel / hodômetro",pump:"Bomba de combustível",invoice:"Nota / comprovante"}[kind]}</figcaption><img className="driver-receipt" src={photo} alt={kind === "invoice" ? "Foto do comprovante da despesa" : `Foto de ${kind === "pump" ? "bomba" : "painel"}`} /></figure>)}</div>}
        </div>
      </MaintenanceDialog>}
      {manager && paymentRecord && (
        <MaintenanceDialog onClose={() => setPaymentRecord(null)} saving={saving} step="payment">
          <form className="mp-form mp-payment-modal" onSubmit={savePayment}>
            <header className="mp-section-title">
              <div><p className="mp-eyebrow">CONTROLE FINANCEIRO</p><h2 id="mp-edit-title" data-step-title tabIndex={-1}>Pagamento da manutenção</h2></div>
              <button className="mp-close" type="button" aria-label="Fechar pagamento" disabled={saving || photoBusy} onClick={() => setPaymentRecord(null)}>×</button>
            </header>
            <div className="mp-payment-summary"><span>{paymentRecord.plate} · {paymentRecord.service}</span><strong>{money(paymentRecord.amount)}</strong></div>
            <label>Data do pagamento<input type="date" value={paymentDate} required max={today()} disabled={saving || photoBusy} onChange={(e) => setPaymentDate(e.target.value)} /></label>
            <p className="mp-field-help">Ao salvar a data, esta manutenção será marcada como paga.</p>
            {paymentError && <p className="mp-feedback error" role="alert">{paymentError}</p>}
            <div className="mp-payment-modal-actions">
              <button className="mp-cancel-edit" type="button" disabled={saving || photoBusy} onClick={() => setPaymentRecord(null)}>Cancelar</button>
              <button className="mp-submit" type="submit" disabled={saving || !paymentDate}>{saving ? "Salvando…" : "Salvar pagamento"}<Icon name="check" size={18} /></button>
            </div>
            {paymentRecord.paid && <button className="mp-undo-payment" type="button" disabled={saving || photoBusy} onClick={async () => {
              setPaymentError("");
              if (await updateControl(paymentRecord, "paymentDate", null)) setPaymentRecord(null);
            }}>Remover registro de pagamento</button>}
          </form>
        </MaintenanceDialog>
      )}
      <main className="mp-main">
        <div className="mp-heading">
          <div>
            <p className="mp-eyebrow">{manager ? "CENTRAL DE CONFERÊNCIA" : "DESPESAS DE COLABORADORES E MOTORISTAS"}</p>
            <h1>
              {manager ? (
                <>
                  Tudo pronto para <em>conferir.</em>
                </>
              ) : (
                <>
                  Cuide da sua <em>jornada.</em>
                </>
              )}
            </h1>
            <p className="mp-subtitle">
              {manager
                ? "Manutenções e despesas da viagem. Tudo no mesmo lugar."
                : "Abastecimento, manutenção e outros custos. Registre e acompanhe por aqui."}
            </p>
          </div>
          <div className="mp-view" aria-label="Área de trabalho">
            <button
              hidden={!canRegister}
              className={!manager ? "active" : ""}
              onClick={() => changeView("driver")}
              aria-pressed={!manager}
            >
              <Icon name="truck" />
              Minhas despesas
            </button>
            <button
              hidden={!canReview}
              className={manager ? "active" : ""}
              onClick={() => changeView("manager")}
              aria-pressed={manager}
            >
              <Icon name="list" />
              Conferência
            </button>
          </div>
        </div>
        <div className="mp-layout">
          <section className="mp-entry">
            {!manager && isDriver && <div className="mp-feedback" role="status">
              <strong>{expenseAccess?.driverName || "Seu vínculo de motorista"}</strong>
              <p>{fleetLoading ? "Consultando sua placa na telemetria…" : fleetError || expenseAccess?.message || "Vínculo indisponível."}</p>
              {expenseAccess?.plate && <p>Placa: <strong>{expenseAccess.plate}</strong> · Identificação em {new Date(expenseAccess.observedAt).toLocaleString("pt-BR")}</p>}
              <button type="button" disabled={fleetLoading} onClick={() => setFleetAttempt(n => n + 1)}>Atualizar vínculo</button>
            </div>}
            {!manager && <div className="driver-start-card">
              <div className="driver-start-top"><span className="driver-road-icon" aria-hidden="true">↗</span><span className="driver-badge">SUAS DESPESAS EM UM SÓ LUGAR</span></div>
              <h2>Cada despesa, um registro completo.</h2>
              <p>Escolha o tipo, preencha as etapas e envie para a equipe. Você acompanha tudo por aqui.</p>
              <div className="driver-route"><span>1 · Escolha</span><i /><span>2 · Preencha</span><i /><span>3 · Acompanhe</span></div>
              <button className="mp-submit" disabled={user.readOnly || (isDriver && (fleetLoading || Boolean(fleetError) || !fleet.length))} onClick={() => { if (editing || amount || plate) openWizard(); else setDriverWizard({record:null}); }}><Icon name="plus" />Registrar despesa<Icon name="arrow" /></button>
              <small>{records.length} despesa(s) registrada(s) · Seu histórico fica sempre disponível.</small>
            </div>}
            {wizardOpen && (
              <MaintenanceDialog
                onClose={closeWizard}
                saving={saving || photoBusy}
                step={completed ? 3 : step}
              >
                {completed ? (
                  <div className="mp-complete">
                    <span className="mp-complete-icon">
                      <Icon name="check" size={36} />
                    </span>
                    <p className="mp-eyebrow">ETAPAS CONCLUÍDAS</p>
                    <h2 id="mp-edit-title" data-step-title tabIndex={-1}>
                      Tudo certo. Pode seguir!
                    </h2>
                    <p role="status">{message}</p>
                    <button className="mp-submit" onClick={closeWizard}>
                      Ver lançamentos
                      <Icon name="arrow" />
                    </button>
                  </div>
                ) : (
                  <form
                    className="mp-form mp-wizard"
                    onSubmit={advance}
                    noValidate
                  >
                    <header className="mp-wizard-header">
                      <div className="mp-section-title">
                        <div>
                          <p className="mp-eyebrow">
                            {editing ? "EDITAR LANÇAMENTO" : "NOVA MANUTENÇÃO"}
                          </p>
                          <h2 id="mp-edit-title" data-step-title tabIndex={-1}>
                            {
                              [
                                "Vamos começar pelo básico",
                                "O que foi feito?",
                                "Tudo pronto para registrar?",
                              ][step]
                            }
                          </h2>
                        </div>
                        <button
                          type="button"
                          className="mp-close"
                          aria-label="Fechar lançamento"
                          disabled={saving || photoBusy}
                          onClick={closeWizard}
                        >
                          ×
                        </button>
                      </div>
                      <div
                        className="mp-progress"
                        role="progressbar"
                        aria-label="Progresso do lançamento"
                        aria-valuemin={0}
                        aria-valuemax={3}
                        aria-valuenow={step + 1}
                        aria-valuetext={`Etapa ${step + 1} de 3`}
                      >
                        <span style={{ width: `${((step + 1) / 3) * 100}%` }} />
                      </div>
                      <ol className="mp-steps">
                        {["Veículo e valor", "Detalhes", "Revisão"].map(
                          (label, index) => (
                            <li
                              key={label}
                              className={index <= step ? "is-active" : ""}
                              aria-current={index === step ? "step" : undefined}
                            >
                              <span>
                                {index < step ? (
                                  <Icon name="check" size={13} />
                                ) : (
                                  index + 1
                                )}
                              </span>
                              {label}
                            </li>
                          ),
                        )}
                      </ol>
                    </header>
                    <div className="mp-wizard-body">
                      <section hidden={step !== 0}>
                        <p className="mp-step-intro">
                          Informe o veículo, o valor e a data da despesa.
                        </p>
                        <div className="mp-fields">
                          <FleetSelect
                            fleet={fleet}
                            value={plate}
                            loading={fleetLoading}
                            disabled={
                              isDriver ||
                              fleetLoading ||
                              Boolean(fleetError) ||
                              fleet.length === 0
                            }
                            onChange={(value) => {
                              setPlate(value);
                              setMessage("");
                            }}
                          />
                          <label>
                            Valor da despesa
                            <div className="mp-money-input">
                              <span>R$</span>
                              <input
                                aria-label="Valor da despesa"
                                value={amount}
                                onChange={(e) =>
                                  setAmount(sanitizeAmount(e.target.value))
                                }
                                onBlur={() => {
                                  if (!amount) return;
                                  const value = Number(
                                    amount.replace(/\./g, "").replace(",", "."),
                                  );
                                  if (Number.isFinite(value))
                                    setAmount(
                                      value.toLocaleString("pt-BR", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }),
                                    );
                                }}
                                placeholder="0,00"
                                inputMode="decimal"
                                maxLength={13}
                              />
                            </div>
                          </label>
                        </div>
                        {fleetLoading ? (
                          <p className="mp-field-help" role="status">
                            Carregando placas da frota…
                          </p>
                        ) : fleetError ? (
                          <div className="mp-feedback error" role="alert">
                            {fleetError}
                            <button
                              type="button"
                              onClick={() => setFleetAttempt((n) => n + 1)}
                            >
                              Tentar novamente
                            </button>
                          </div>
                        ) : (
                          <p className="mp-field-help">
                            {fleet.length
                              ? "Digite para filtrar e selecione uma placa da frota."
                              : "Nenhuma placa disponível na frota."}
                          </p>
                        )}
                        <label>
                          Quem está lançando?
                          <input
                            value={author}
                            readOnly
                            aria-describedby="mp-author-help"
                          />
                        </label>
                        <p className="mp-field-help" id="mp-author-help">
                          Usuário conectado ao sistema.
                        </p>
                        <div className="mp-fields mp-cost-fields">
                          <label>
                            Data da despesa
                            <input
                              type="date"
                              value={expenseDate}
                              max={today()}
                              required
                              onChange={(e) => setExpenseDate(e.target.value)}
                            />
                          </label>
                        </div>
                      </section>
                      <section hidden={step !== 1}>
                        <p className="mp-field-help">{draftWarning || "Rascunho salvo automaticamente neste aparelho, somente para seu usuário."}</p>
                        <button type="button" className="mp-cancel-edit" disabled={saving || photoBusy} onClick={()=>{try {clearExpenseDraft(user,"maintenance",editing);cancelEdit();setWizardOpen(false);} catch {setError("Não foi possível descartar o rascunho.");}}}>Descartar rascunho</button>
                        <p className="mp-step-intro">
                          Mais um passo! Complete os detalhes da manutenção.
                        </p>
                        <SupplierSelect
                          value={supplier}
                          onChange={setSupplier}
                        />
                        <label>
                          Nota / comprovante{" "}
                          <span className="mp-optional">(opcional)</span>
                          <input
                            value={document}
                            maxLength={80}
                            placeholder="Número do documento"
                            onChange={(e) => setDocument(e.target.value)}
                          />
                        </label>
                        <fieldset>
                          <legend>Tipo de manutenção</legend>
                          <div className="mp-services">
                            {[
                              "Borracharia",
                              "Mecânica",
                              "Elétrica",
                              "Outros",
                            ].map((item) => (
                              <button
                                type="button"
                                key={item}
                                aria-pressed={service === item}
                                className={service === item ? "selected" : ""}
                                onClick={() => setService(item)}
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                        <ExpensePhotoAssist photos={maintenancePhotos} knownPhotos={editing?.photoKinds || {}} photoKinds={["invoice"]} suggestionFields={["supplier","documentNumber"]}
                          preparePhoto={prepareReceipt} onPhoto={(kind,photo)=>setMaintenancePhotos(current=>({...current,[kind]:photo}))}
                          onApply={(field,value)=>field==="supplier" ? setSupplier({nome:value}) : field==="documentNumber" ? setDocument(value) : null}
                          onLoadSaved={async()=>editing ? (await window.RB_API.receiptPlantao(editing.id,manager)).photos : {}} onBusy={setPhotoBusy} values={{supplier:supplier.nome,documentNumber:document}} />
                        {!(maintenancePhotos.invoice !== undefined ? maintenancePhotos.invoice : editing?.photoKinds?.invoice) && <label>Justificativa sem nota<textarea value={receiptReason} onChange={e=>setReceiptReason(e.target.value)} minLength={10} maxLength={300} placeholder="Explique por que não há nota ou comprovante." /></label>}
                        <label>
                          Uma observação{" "}
                          <span className="mp-optional">(opcional)</span>
                          <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Ex.: troca de pneu na estrada"
                            rows={2}
                            maxLength={300}
                          />
                        </label>
                      </section>
                      {step === 2 && (
                        <section className="mp-review">
                          <p className="mp-step-intro">
                            Última etapa. Revise os dados antes de salvar.
                          </p>
                          <div className="mp-review-total">
                            <span>
                              {plate} · {service}
                            </span>
                            <strong>
                              {money(
                                Number(
                                  amount.replace(/\./g, "").replace(",", "."),
                                ) || 0,
                              )}
                            </strong>
                          </div>
                          <dl>
                            {[
                              ["Data da despesa", displayDay(expenseDate)],
                              ["Fornecedor", supplier.nome || "Não informado"],
                              ["Comprovante", document || "Não informado"],
                              ["Nota anexada", (maintenancePhotos.invoice !== undefined ? maintenancePhotos.invoice : editing?.photoKinds?.invoice || editing?.hasReceipt) ? "Sim" : "Não"],
                              ["Justificativa sem nota", receiptReason || "—"],
                              ["Responsável", author],
                              ["Observação", note || "Sem observação"],
                            ].map(([label, value]) => (
                              <div key={label}>
                                <dt>{label}</dt>
                                <dd>{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                      )}
                      {error && (
                        <div className="mp-feedback error" role="alert">
                          {error}
                        </div>
                      )}
                    </div>
                    <footer className="mp-wizard-actions">
                      <button
                        type="button"
                        className="mp-cancel-edit"
                        disabled={saving || photoBusy}
                        onClick={() =>
                          step
                            ? (setStep((n) => n - 1), setError(""))
                            : closeWizard()
                        }
                      >
                        {step ? "Voltar" : "Continuar depois"}
                      </button>
                      <button
                        className="mp-submit"
                        type="submit"
                        disabled={
                          saving ||
                          photoBusy ||
                          user.readOnly ||
                          fleetLoading ||
                          Boolean(fleetError) ||
                          fleet.length === 0
                        }
                      >
                        {saving
                          ? "Salvando…"
                          : step < 2
                            ? "Continuar"
                            : editing
                              ? "Salvar alterações"
                              : "Registrar manutenção"}
                        <Icon name={step === 2 ? "check" : "arrow"} />
                      </button>
                      <p>
                        Etapa {step + 1} de 3 ·{" "}
                        {step === 2
                          ? "Os dados serão salvos ao confirmar."
                          : "Rascunho salvo neste aparelho."}
                      </p>
                    </footer>
                  </form>
                )}
              </MaintenanceDialog>
            )}
            {manager && (
              <div className="mp-manager-note">
                <span className="mp-note-icon">
                  <Icon name="list" size={26} />
                </span>
                <h2>Conferência simplificada</h2>
                <p>
                  Confira os registros de colaboradores e motoristas, os comprovantes e os status financeiros.
                </p>
              </div>
            )}
            {error && !wizardOpen && (
              <div className="mp-feedback error" role="alert">
                {error}
              </div>
            )}
            {message && !wizardOpen && (
              <div className="mp-feedback" role="status">
                <Icon name="check" />
                {message}
              </div>
            )}
          </section>
          <section className="mp-history" aria-label="Histórico de manutenções">
            <div className="mp-section-title">
              <div>
                <p className="mp-eyebrow">
                  {manager ? "CONTROLE DE DESPESAS" : "SUAS DESPESAS"}
                </p>
                <h2>
                  {manager
                    ? "Lançamentos da frota"
                    : search
                      ? "Histórico da placa"
                      : "Meus lançamentos"}
                </h2>
              </div>
              <span className="mp-plate">{search || "Todas"}</span>
            </div>
            <div className="mp-history-label">
              <button
                className="mp-cancel-edit"
                disabled={saving || recordsLoading}
                onClick={() => {
                  setDeleting(null);
                  setHistory(null);
                  setRecordsAttempt((n) => n + 1);
                }}
              >
                Atualizar lista
              </button>
            </div>
            <div className="mp-period-filters">
                {(
                  <label>
                    Buscar placa
                    <input
                      value={search}
                      placeholder="Todas as placas"
                      maxLength={8}
                      onChange={(e) => setSearch(normalize(e.target.value))}
                    />
                  </label>
                )}
                <label>
                  De
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </label>
                <label>
                  Até
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </label>
              <button type="button" onClick={() => {setDateFrom(`${today().slice(0,7)}-01`);setDateTo(today());}}>Mês atual</button>
              <button type="button" onClick={() => {setDateFrom("");setDateTo("");}}>Todo o período</button>
            </div>
            <details className="mp-filter-panel">
              <summary>
                Filtrar lançamentos{" "}
                {(search || dateFrom || dateTo || textSearch || paidFilter || postedFilter || sourceFilter) && (
                  <span>Filtros ativos</span>
                )}
              </summary>
              <div className="mp-cost-filters">
                {manager && <label>Perfil de quem lançou<select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}><option value="">Todos</option><option value="colaborador">Colaborador</option><option value="motorista">Motorista</option><option value="unknown">Perfil não registrado</option></select></label>}
                {manager && [["Pagamento", paidFilter, setPaidFilter], ["Lançamento", postedFilter, setPostedFilter]].map(([label, value, setter]) => (
                  <label key={label}>{label}<select value={value} onChange={(e) => setter(e.target.value)}>
                    <option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option><option value="unknown">Não informado</option>
                  </select></label>
                ))}
                <label className="mp-cost-search">
                  Buscar fornecedor, documento ou responsável
                  <input
                    type="search"
                    value={textSearch}
                    onChange={(e) => setTextSearch(e.target.value)}
                    placeholder="Filtrar lançamentos"
                  />
                </label>
                {(search || dateFrom || dateTo || textSearch || paidFilter || postedFilter || sourceFilter) && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setDateFrom("");
                      setDateTo("");
                      setTextSearch("");
                      setSourceFilter("");
                      setPaidFilter("");
                      setPostedFilter("");
                    }}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </details>
            {dateFrom && dateTo && dateFrom > dateTo && (
              <p role="alert">O início do período deve ser anterior ao fim.</p>
            )}
            <p hidden={!manager} className="mp-control-notice">
              Conferido significa revisado. Confira também o comprovante e o
              pagamento no financeiro antes de pagar ou reembolsar.
            </p>
            <div className="mp-filters">
              {[
                ["all", "Todos"],
                ["pending", "Pendentes"],
                ["checked", "Conferidos"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  aria-pressed={filter === key}
                  className={filter === key ? "active" : ""}
                  onClick={() => setFilter(key)}
                >
                  {label}
                  {key === "all" && <span>{scoped.length}</span>}
                </button>
              ))}
            </div>
            <div className="mp-records">
              {recordsLoading && <p role="status">Carregando lançamentos…</p>}
              {recordsError && (
                <div role="alert">
                  {recordsError}
                  <button
                    type="button"
                    onClick={() => setRecordsAttempt((n) => n + 1)}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
              {!recordsLoading && !recordsError && visible.length === 0 ? (
                <div className="mp-empty">
                  <Icon name="list" size={32} />
                  <h3>Nenhum lançamento por aqui</h3>
                  <p>
                    {manager
                      ? "Tente outra placa ou outro filtro."
                      : "Registre uma manutenção ou ajuste os filtros para ver seus lançamentos."}
                  </p>
                </div>
              ) : (
                <ExpenseHistory records={visible} isDriver={isDriver && !manager} currentPlate={expenseAccess?.plate} renderRecord={renderExpenseRecord} />
              )}
            </div>
            {!recordsLoading && !recordsError && <ExpenseSummary records={visible} />}
            <p className="mp-history-help">
              <Icon name="check" size={16} />
              Registrou aqui? Não precisa lembrar depois.
            </p>
          </section>
        </div>
        <footer className="mp-footer">
          <span>
            RODOBACH <b>·</b> Cuidado em cada quilômetro.
          </span>
          <p>
            Lançamentos salvos no sistema. A conferência é exclusiva dos
            usuários autorizados e registra quem conferiu cada manutenção.
          </p>
        </footer>
      </main>
      <nav className="mp-mobile-nav" aria-label="Áreas do portal">
        <button
          hidden={!canRegister}
          className={!manager ? "active" : ""}
          onClick={() => changeView("driver")}
        >
          <Icon name="truck" />
          <span>Minhas despesas</span>
        </button>
        <button
          hidden={!canReview}
          className={manager ? "active" : ""}
          onClick={() => changeView("manager")}
        >
          <Icon name="list" />
          <span>Conferência</span>
        </button>
      </nav>
    </div>
  );
}
