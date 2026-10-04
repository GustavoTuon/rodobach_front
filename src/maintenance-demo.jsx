import React, { useEffect, useRef, useState } from "react";
import "./maintenance-demo.css";

const money = (value) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const normalize = (value) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
function Icon({ name, size = 20 }) {
  const paths = {
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
      : null);
  if (
    (!canRegister && !canReview) ||
    (requested === "manager" && !canReview) ||
    (requested === "driver" && !canRegister)
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

function MaintenanceForm({
  user,
  initialView,
  canRegister,
  canReview,
  embedded,
}) {
  const [records, setRecords] = useState([]);
  const [view, setView] = useState(initialView);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsAttempt, setRecordsAttempt] = useState(0);
  const [recordsError, setRecordsError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [plate, setPlate] = useState("");
  const [fleet, setFleet] = useState([]);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [fleetError, setFleetError] = useState("");
  const [fleetAttempt, setFleetAttempt] = useState(0);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [supplier, setSupplier] = useState({ nome: "" });
  const author = user.nome || user.login;
  const [service, setService] = useState("Borracharia");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setFleetLoading(true);
    setFleetError("");
    window.RB_API.listVeiculosPlantao()
      .then((data) => {
        if (!Array.isArray(data.veiculos))
          throw new Error("Resposta inválida ao consultar a frota.");
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
  const scoped = records.filter((r) =>
    manager ? r.plate.includes(normalize(search)) : !plate || r.plate === plate,
  );
  const visible = scoped
    .filter(
      (r) =>
        filter === "all" || (filter === "pending" ? !r.checked : r.checked),
    )
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const pending = scoped.filter((r) => !r.checked);

  async function confirmRecord(record) {
    if (!canReview || user.readOnly || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await window.RB_API.checkPlantao(record.id);
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
  async function submit(event) {
    event.preventDefault();
    if (!canRegister || user.readOnly || savingRef.current) return;
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
    savingRef.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await window.RB_API.createPlantao({
        plate,
        amount: value,
        service,
        note: note.trim(),
        supplier: supplier.nome.trim(),
        supplierCode: supplier.codigo ?? null,
        supplierCompany: supplier.empresa ?? null,
      });
      setRecords((items) => [result.record, ...items]);
      setAmount("");
      setNote("");
      setSupplier({ nome: "" });
      setFilter("all");
      setMessage(
        "Manutenção registrada! Ela já aparece no histórico e aguarda conferência.",
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
      (next === "driver" && !canRegister)
    )
      return;
    setRecords([]);
    setView(next);
    setFilter("all");
    setMessage("");
    setError("");
  }
  return (
    <div className={`mp-app ${embedded ? "mp-embedded" : ""}`}>
      <header className="mp-topbar">
        <a className="mp-brand" href="/manutencao-plantao">
          <span className="mp-brand-icon">
            <Icon name="truck" />
          </span>
          rodobach
          <span className="mp-brand-caption">NA ESTRADA, COM VOCÊ.</span>
        </a>
        <a className="mp-test" href="/">
          Voltar ao sistema
        </a>
      </header>
      <main className="mp-main">
        <div className="mp-heading">
          <div>
            <p className="mp-eyebrow">MANUTENÇÃO DE PLANTÃO</p>
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
                ? "Cada manutenção registrada. Tudo no mesmo lugar."
                : "Precisou parar? Registre aqui e siga tranquilo."}
            </p>
          </div>
          <div className="mp-view" aria-label="Visão da demonstração">
            <button
              hidden={!canRegister}
              className={!manager ? "active" : ""}
              onClick={() => changeView("driver")}
              aria-pressed={!manager}
            >
              <Icon name="truck" />
              Motorista
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
            <div className="mp-hero">
              <span className="mp-eyebrow">
                {manager
                  ? "VISÃO DO ESCRITÓRIO"
                  : "MENOS MENSAGENS. MAIS TRANQUILIDADE."}
              </span>
              <h2>
                {manager ? (
                  "Nenhum lançamento fica para trás."
                ) : (
                  <>
                    Sua manutenção,
                    <br />
                    sem complicação.
                  </>
                )}
              </h2>
              <p>
                {manager
                  ? "Confira os valores e acompanhe o que está pendente."
                  : "Placa, valor e pronto. O escritório acompanha por aqui."}
              </p>
              <div className="mp-hero-foot">
                <span className="mp-dot" />
                {manager
                  ? `${pending.length} lançamento(s) para conferir`
                  : "Registro rápido · disponível a qualquer hora"}
              </div>
              <Icon name="tool" size={145} />
            </div>
            {!manager ? (
              <form className="mp-form" onSubmit={submit} noValidate>
                <div className="mp-section-title">
                  <h2>Nova manutenção</h2>
                  <span>É rapidinho</span>
                </div>
                <div className="mp-fields">
                  <FleetSelect
                    fleet={fleet}
                    value={plate}
                    loading={fleetLoading}
                    disabled={
                      fleetLoading || Boolean(fleetError) || fleet.length === 0
                    }
                    onChange={(value) => {
                      setPlate(value);
                      setMessage("");
                    }}
                  />
                  <label>
                    Valor pago
                    <div className="mp-money-input">
                      <span>R$</span>
                      <input
                        aria-label="Valor pago"
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
                <SupplierSelect value={supplier} onChange={setSupplier} />
                <fieldset>
                  <legend>Tipo de manutenção</legend>
                  <div className="mp-services">
                    {["Borracharia", "Mecânica", "Elétrica", "Outros"].map(
                      (item) => (
                        <button
                          type="button"
                          key={item}
                          aria-pressed={service === item}
                          className={service === item ? "selected" : ""}
                          onClick={() => setService(item)}
                        >
                          {item}
                        </button>
                      ),
                    )}
                  </div>
                </fieldset>
                <label>
                  Uma observação <span className="mp-optional">(opcional)</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex.: troca de pneu na estrada"
                    rows={2}
                    maxLength={300}
                  />
                </label>
                <button
                  className="mp-submit"
                  type="submit"
                  disabled={
                    saving ||
                    user.readOnly ||
                    recordsLoading ||
                    fleetLoading ||
                    Boolean(fleetError) ||
                    fleet.length === 0
                  }
                >
                  <Icon name="plus" />
                  Registrar manutenção
                  <Icon name="arrow" />
                </button>
                <p className="mp-form-help">
                  <Icon name="clock" size={14} />A data e o horário são
                  registrados automaticamente.
                </p>
              </form>
            ) : (
              <div className="mp-manager-note">
                <span className="mp-note-icon">
                  <Icon name="list" size={26} />
                </span>
                <h2>Conferência simplificada</h2>
                <p>
                  Busque uma placa, veja quem lançou e marque cada manutenção
                  como conferida.
                </p>
                <label>
                  Buscar placa
                  <div className="mp-filter-input">
                    <input
                      value={search}
                      onChange={(e) => setSearch(normalize(e.target.value))}
                      placeholder="Todas as placas"
                      maxLength={8}
                    />
                    {search && (
                      <button
                        type="button"
                        aria-label="Limpar filtro de placa"
                        onClick={() => {
                          setSearch("");
                          setFilter("all");
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </label>
                <p className="mp-small">
                  Os valores do resumo acompanham a placa buscada.
                </p>
              </div>
            )}
            {error && (
              <div className="mp-feedback error" role="alert">
                {error}
              </div>
            )}
            {message && (
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
                  {manager ? "CONTROLE DE MANUTENÇÕES" : "SEU VEÍCULO"}
                </p>
                <h2>
                  {manager
                    ? "Lançamentos da frota"
                    : plate
                      ? "Histórico da placa"
                      : "Meus lançamentos"}
                </h2>
              </div>
              {!manager && <span className="mp-plate">{plate || "Todas"}</span>}
            </div>
            <div className="mp-stats">
              <div>
                <span>Total registrado</span>
                <strong>
                  {money(scoped.reduce((sum, r) => sum + r.amount, 0))}
                </strong>
                <small>{scoped.length} lançamento(s)</small>
              </div>
              <div>
                <span>A conferir</span>
                <strong>
                  {money(pending.reduce((sum, r) => sum + r.amount, 0))}
                </strong>
                <small>
                  <i />
                  {pending.length} pendente(s)
                </small>
              </div>
            </div>
            <div className="mp-history-label">
              <h3>{manager ? "Registros recebidos" : "Seus lançamentos"}</h3>
              <span>Mais recentes primeiro</span>
            </div>
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
              {visible.length === 0 ? (
                <div className="mp-empty">
                  <Icon name="list" size={32} />
                  <h3>Nenhum lançamento por aqui</h3>
                  <p>
                    {manager
                      ? "Tente outra placa ou outro filtro."
                      : "Confira a placa acima ou registre uma manutenção."}
                  </p>
                </div>
              ) : (
                visible.map((r) => (
                  <article className="mp-record" key={r.id}>
                    <div className="mp-record-main">
                      <span
                        className={`mp-service-icon ${r.service === "Elétrica" ? "peach" : ""}`}
                      >
                        <Icon name="tool" size={23} />
                      </span>
                      <div className="mp-record-description">
                        <h3>{r.service}</h3>
                        {r.supplier && (
                          <p className="mp-record-supplier">{r.supplier}</p>
                        )}
                        <p>{r.note || "Sem observação"}</p>
                      </div>
                      <strong>{money(r.amount)}</strong>
                    </div>
                    <div className="mp-record-meta">
                      <span>
                        <Icon name="clock" size={13} />
                        {new Date(r.date).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
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
                      <span>
                        {manager && <b>{r.plate} · </b>}
                        {r.author}
                      </span>
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
                  </article>
                ))
              )}
            </div>
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
      <nav className="mp-mobile-nav" aria-label="Navegação da demonstração">
        <button
          hidden={!canRegister}
          className={!manager ? "active" : ""}
          onClick={() => changeView("driver")}
        >
          <Icon name="truck" />
          <span>Meu veículo</span>
        </button>
        <button
          hidden={!canRegister}
          className="mp-add"
          aria-label="Nova manutenção"
          onClick={() => {
            changeView("driver");
            setTimeout(
              () => document.querySelector(".mp-plate-input")?.focus(),
              0,
            );
          }}
        >
          <Icon name="plus" size={28} />
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
