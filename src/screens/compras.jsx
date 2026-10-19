import PurchaseDecision from "../purchases-decision.jsx";
import { PurchaseSummary } from "../purchases-selection.jsx";
import { SupplierEditor } from "../supplier-workspace.jsx";
import AddSuppliers from "../purchases-add-suppliers.jsx";
import QuoteActions from "../purchases-quote-actions.jsx";
import { quoteProgress } from "../purchases-status.js";
import { SupplierGroups } from "../purchases-groups.jsx";
import QuoteQuest from "../purchases-quest.jsx";
import PurchaseAnalysis, { analysisRows } from "../purchases-analysis.jsx";
import { PurchaseNavigation, PurchaseHome } from "../purchases-shell.jsx";
import {
  PurchaseDashboard,
  ImportedQuote,
  SupplierDirectory,
} from "../purchases-dashboard.jsx";
import React, { useEffect, useState } from "react";
import { purchasesApi as api, rankedOffers } from "../purchases-api.js";
import "./compras.css";
import "./compras-app.css";
import "../supplier-workspace.css";
const money = (n) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (n) => new Date(n).toLocaleString("pt-BR");
function Field({ label, children }) {
  return (
    <label className="purchase-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Catalog({ tipo, onSelect }) {
  const [query, setQuery] = useState(""),
    [rows, setRows] = useState([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      api(`/catalogo/${tipo}?q=${encodeURIComponent(query)}`)
        .then((r) => {
          if (active) {
            setRows(r);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, tipo]);
  return (
    <div>
      <Field label={`Buscar ${tipo} no sistema`}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome ou código"
        />
      </Field>
      {error && <p role="alert">{error}</p>}
      <div className="purchase-results">
        {rows.map((r) => (
          <button
            type="button"
            key={`${r.empresa}:${r.codigo}`}
            onClick={() => onSelect(r)}
          >
            {r.nome}
            <small>
              Empresa {r.empresa} · Código {r.codigo}
            </small>
          </button>
        ))}
        {!rows.length && !error && <p>Nenhum cadastro encontrado.</p>}
      </div>
    </div>
  );
}
function SupplierForm({ onSave }) {
  const empty = { nome: "", documento: "", email: "", telefone: "" };
  const [form, setForm] = useState(empty),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="purchase-card">
      <h2>Cadastrar fornecedor</h2>
      <p>
        Selecione um cadastro do sistema ou preencha um novo fornecedor para o
        portal de compras.
      </p>
      <Catalog
        tipo="fornecedores"
        onSelect={(r) => setForm({ ...empty, ...r })}
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSave(form);
            setForm(empty);
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="purchase-grid">
          {["nome", "documento", "email", "telefone"].map((key) => (
            <Field
              key={key}
              label={
                {
                  nome: "Nome",
                  documento: "CNPJ / CPF",
                  email: "E-mail",
                  telefone: "Telefone",
                }[key]
              }
            >
              <input
                required={key === "nome"}
                type={key === "email" ? "email" : "text"}
                value={form[key]}
                readOnly={key === "nome" && !!form.codigo}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
        {form.codigo && (
          <p>
            Vinculado à empresa {form.empresa}, código {form.codigo}.{" "}
            <button type="button" onClick={() => setForm(empty)}>
              Limpar vínculo
            </button>
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        <button disabled={busy}>
          {busy ? "Salvando…" : "Salvar fornecedor"}
        </button>
      </form>
    </section>
  );
}
function QuoteDetail({ quote, onRefresh, onChanged, suppliers, groups }) {
  const [history, setHistory] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const closed =
    quote.status !== "aberta" || new Date(quote.prazo) <= new Date();
  return (
    <section className="purchase-card">
      <header className="purchase-toolbar">
        <div>
          <h2>{quote.titulo}</h2>
          <small>Cotação #{quote.id.slice(0, 8).toUpperCase()}</small>
          <p>
            {quoteProgress(quote).label} · Prazo: {date(quote.prazo)}
          </p>
        </div>
        <button
          onClick={async () => {
            try {
              await onRefresh();
              setError("");
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Atualizar respostas
        </button>
        {!closed && (
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`/cotacoes/${quote.id}/encerrar`, {});
                await onRefresh();
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Encerrar recebimento
          </button>
        )}
      </header>
      <div className="quote-status-summary">
        <span className={`purchase-badge ${quoteProgress(quote).key}`}>
          {quoteProgress(quote).label}
        </span>
        <strong>
          {quoteProgress(quote).answered} de {quoteProgress(quote).total}{" "}
          fornecedores responderam
        </strong>
        <progress
          aria-label="Progresso das respostas"
          value={quoteProgress(quote).answered}
          max={Math.max(1, quoteProgress(quote).total)}
        />
      </div>
      <QuoteActions quote={quote} onChanged={onChanged} />
      <p>{quote.observacoes}</p>
      <AddSuppliers
        quote={quote}
        suppliers={suppliers}
        groups={groups}
        onSaved={() => onChanged(false)}
      />
      <h3>Links dos fornecedores</h3>
      <p>
        Copie o link e envie ao contato. Cada fornecedor acessa somente os
        produtos vinculados a ele.
      </p>
      {quote.convites.map((c) => (
        <div className="purchase-invite" key={c.id}>
          <strong>{c.nome}</strong>
          <span>
            {c.respondido_em
              ? `Respondido em ${date(c.respondido_em)}`
              : "Aguardando resposta"}{" "}
            · {c.itens.length} produto(s)
          </span>
          <span>
            {c.email} {c.telefone}
          </span>
          {!closed && (
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}/compras/responder#${c.token}`,
                  );
                  setNotice(`Link de ${c.nome} copiado.`);
                } catch {
                  setError("Não foi possível copiar. Selecione o link abaixo.");
                }
              }}
            >
              Copiar link
            </button>
          )}
          {!closed && (
            <input
              aria-label={`Link de ${c.nome}`}
              readOnly
              value={`${window.location.origin}/compras/responder#${c.token}`}
              onFocus={(e) => e.target.select()}
            />
          )}{" "}
          {c.resposta && (
            <p>
              Observações da proposta: {c.resposta.observacoes || "Nenhuma"} ·
              Total com frete:{" "}
              {money(
                c.resposta.itens
                  .filter((i) => i.disponivel)
                  .reduce((s, i) => s + i.quantidade * i.valor, 0) +
                  c.resposta.frete,
              )}
            </p>
          )}
        </div>
      ))}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      <PurchaseDecision
        quote={quote}
        rows={analysisRows(quote)}
        onRefresh={onRefresh}
      />
      <PurchaseAnalysis quote={quote} />
      <PurchaseSummary quote={quote} onRefresh={onRefresh} />
      <details className="analysis-original">
        <summary>Detalhamento original e histórico de compras</summary>
        <h3>Comparativo por produto</h3>
        <p>
          Menor preço unitário entre propostas que atendem a quantidade. Frete é
          por fornecedor e não está incluído no ranking. Confira marca, unidade
          e condições antes de decidir.
        </p>
        {quote.itens.map((item) => {
          const offers = rankedOffers(item, quote.convites);
          const best = offers.find((o) => o.completa)?.valor;
          return (
            <div className="purchase-item" key={item.id}>
              <header className="purchase-toolbar">
                <div>
                  <h3>{item.nome}</h3>
                  <p>
                    Solicitado: {item.quantidade} {item.unidade}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setHistory(null);
                    try {
                      const rows = await api(
                        `/historico?empresa=${encodeURIComponent(item.empresa)}&codigo=${encodeURIComponent(item.codigo)}`,
                      );
                      setHistory({ nome: item.nome, rows });
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                >
                  Histórico de compras
                </button>
              </header>
              <div className="purchase-table">
                <table>
                  <thead>
                    <tr>
                      {[
                        "Fornecedor",
                        "Marca",
                        "Quantidade",
                        "Unitário",
                        "Total ofertado",
                        "Frete do fornecedor",
                        "Entrega / pagamento",
                        "Análise",
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((o, n) => (
                      <tr key={n}>
                        <td data-label="Fornecedor">{o.fornecedor}</td>
                        <td data-label="Marca">
                          {o.marca}
                          <small>{o.observacoes}</small>
                        </td>
                        <td data-label="Quantidade">
                          {o.quantidade} {item.unidade}
                        </td>
                        <td data-label="Unitario">{money(o.valor)}</td>
                        <td data-label="Total ofertado">
                          {money(o.valor * o.quantidade)}
                        </td>
                        <td data-label="Frete">{money(o.frete)}</td>
                        <td data-label="Entrega / pagamento">
                          {o.prazoEntrega}
                          <small>{o.pagamento}</small>
                        </td>
                        <td data-label="Analise">
                          {!o.completa
                            ? "Quantidade parcial"
                            : o.valor === best
                              ? "Menor preço unitário"
                              : "Atende quantidade"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!offers.length && (
                <p>Nenhuma oferta disponível para este produto.</p>
              )}
            </div>
          );
        })}
        {history && (
          <section className="purchase-item">
            <header className="purchase-toolbar">
              <h3>Histórico · {history.nome}</h3>
              <button onClick={() => setHistory(null)}>Fechar histórico</button>
            </header>
            <p>
              Últimas 50 entradas do produto na empresa selecionada, conforme
              notas fiscais do sistema.
            </p>
            <div className="purchase-table">
              <table>
                <thead>
                  <tr>
                    {[
                      "Data",
                      "Nota",
                      "Fornecedor",
                      "Quantidade",
                      "Unitário",
                      "Total",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.rows.map((r, i) => (
                    <tr key={i}>
                      <td data-label="Data">{r.data ? date(r.data) : "—"}</td>
                      <td data-label="Nota">{r.documento}</td>
                      <td data-label="Fornecedor">
                        {r.fornecedor || r.fornecedor_codigo}
                      </td>
                      <td data-label="Quantidade">{r.quantidade}</td>
                      <td data-label="Unitario">{money(r.valor_unitario)}</td>
                      <td data-label="Total">{money(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!history.rows.length && <p>Nenhuma compra anterior encontrada.</p>}
          </section>
        )}
      </details>
    </section>
  );
}
function Compras({ standalone = false }) {
  const [tab, setTab] = useState("inicio"),
    [quotes, setQuotes] = useState([]),
    [suppliers, setSuppliers] = useState([]),
    [groups, setGroups] = useState([]),
    [selected, setSelected] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [importing, setImporting] = useState(false),
    [notice, setNotice] = useState(""),
    [showSupplier, setShowSupplier] = useState(false);
  const refresh = async () => {
    setError("");
    setLoading(true);
    try {
      const [q, s, g] = await Promise.all([
        api("/cotacoes"),
        api("/fornecedores"),
        api("/grupos"),
      ]);
      setQuotes(q);
      setSuppliers(s);
      setGroups(g);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    document.querySelector(".purchase-app")?.scrollTo?.({ top: 0 });
  }, [tab, selected?.id]);
  const open = async (id) => {
    setError("");
    try {
      setSelected(await api(`/cotacoes/${id}`));
      setTab("detalhe");
    } catch (e) {
      setError(e.message);
    }
  };
  const importQuotes = async () => {
    setImporting(true);
    setError("");
    setNotice("");
    try {
      const result = await api("/importar-erp", {});
      setNotice(
        `${result.ofertas} ofertas sincronizadas em ${result.cotacoes} cotações: ${result.novas} novas e ${result.atualizadas} atualizadas, sem duplicar registros.`,
      );
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };
  return (
    <section
      className={`compras-demo-view purchase-app${standalone ? " compras-standalone-view" : ""}`}
    >
      <PurchaseNavigation tab={tab} onNavigate={setTab} />
      <div className="purchase-workspace">
        <header className="purchase-app-header">
          <div>
            <span className="purchase-eyebrow">RODOBACH / COMPRAS</span>
            <h2>
              {
                {
                  inicio: "Visão geral",
                  cotacoes: "Cotações",
                  nova: "Nova cotação",
                  fornecedores: "Fornecedores",
                  detalhe: "Detalhes da cotação",
                }[tab]
              }
            </h2>
          </div>
          <span className="purchase-app-connection">
            <i />
            {loading
              ? "Atualizando..."
              : error
                ? "Verifique sua conexão"
                : "Sistema conectado"}
          </span>
          <img
            className="purchase-mobile-logo"
            src="/brand/rodobach.png"
            alt="Rodobach"
          />
        </header>
        {tab === "inicio" && (
          <PurchaseHome
            quotes={quotes}
            suppliers={suppliers}
            onNavigate={setTab}
            onOpen={open}
            loading={loading}
          />
        )}
        {error && (
          <p role="alert">
            {error} <button onClick={refresh}>Tentar novamente</button>
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {loading && <p role="status">Carregando compras…</p>}
        {tab === "cotacoes" && (
          <PurchaseDashboard
            quotes={quotes}
            onOpen={open}
            onNew={() => setTab("nova")}
            onImport={importQuotes}
            onRefresh={refresh}
            importing={importing}
            loading={loading}
          />
        )}
        <div hidden={tab !== "nova"}>
          <QuoteQuest
            groups={groups}
            Catalog={Catalog}
            suppliers={suppliers}
            onSave={async (b) => {
              const q = await api("/cotacoes", b);
              await refresh();
              await open(q.id);
            }}
          />
        </div>
        {tab === "fornecedores" && (
          <>
            <div className="purchase-toolbar purchase-section-intro">
              <div>
                <h2>Uma boa rede de fornecedores</h2>
                <p>Aproveite os cadastros do sistema e complete os contatos.</p>
              </div>
              <button
                className="purchase-primary"
                onClick={() => setShowSupplier((v) => !v)}
              >
                {showSupplier ? "Fechar cadastro" : "＋ Cadastrar fornecedor"}
              </button>
            </div>
            {showSupplier && (
              <SupplierForm
                onSave={async (b) => {
                  await api("/fornecedores", b);
                  await refresh();
                  setShowSupplier(false);
                  setNotice("Fornecedor salvo com sucesso.");
                }}
              />
            )}
            <SupplierGroups
              groups={groups}
              suppliers={suppliers}
              onRefresh={refresh}
            />
            <p>
              Portal do fornecedor:{" "}
              <a href="/compras/fornecedor" target="_blank" rel="noreferrer">
                Abrir portal
              </a>
            </p>
            <SupplierDirectory suppliers={suppliers} onRefresh={refresh} />
          </>
        )}
        {tab === "detalhe" &&
          selected &&
          (selected.origem_chave ? (
            <ImportedQuote quote={selected} onBack={() => setTab("cotacoes")} />
          ) : (
            <>
              <button
                className="purchase-back"
                onClick={() => setTab("cotacoes")}
              >
                ← Voltar às cotações
              </button>
              <QuoteDetail
                suppliers={suppliers}
                groups={groups}
                key={selected.id}
                quote={selected}
                onRefresh={async () => {
                  const updated = await api(`/cotacoes/${selected.id}`);
                  setSelected(updated);
                  return updated;
                }}
                onChanged={async (removed) => {
                  if (removed) {
                    setSelected(null);
                    setTab("cotacoes");
                  } else await open(selected.id);
                  await refresh();
                }}
              />
            </>
          ))}
        <footer className="purchase-footer">
          Rodobach · Compras com informação, do pedido à decisão.
        </footer>
      </div>
    </section>
  );
}

export function SupplierResponse({ invitationToken, onSaved } = {}) {
  const [quote, setQuote] = useState(null),
    [form, setForm] = useState(null),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false);
  const token = invitationToken || window.location.hash.slice(1);
  useEffect(() => {
    let active = true;
    api(`/${token}`, undefined, "GET", true)
      .then((q) => {
        if (!active) return;
        setQuote(q);
        setForm(
          q.resposta || {
            frete: 0,
            prazoEntrega: "",
            pagamento: "",
            observacoes: "",
            itens: q.itens.map((i) => ({
              id: i.id,
              disponivel: true,
              quantidade: i.quantidade,
              valor: 0,
              marca: "",
              observacoes: "",
            })),
          },
        );
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [token]);
  const update = (id, key, value) => {
    setSaved(false);
    setForm((f) => ({
      ...f,
      itens: f.itens.map((i) => (i.id === id ? { ...i, [key]: value } : i)),
    }));
  };
  return (
    <SupplierEditor
      quote={quote}
      form={form}
      update={update}
      setForm={(value) => {
        setSaved(false);
        setForm(value);
      }}
      busy={busy}
      saved={saved}
      error={error}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        setSaved(false);
        try {
          await api(
            `/${token}`,
            {
              ...form,
              itens: form.itens.map((item) => ({
                ...item,
                quantidade: Number(item.quantidade),
                valor: Number(item.valor),
              })),
            },
            "PUT",
            true,
          );
          setSaved(true);
          onSaved?.();
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

window.ComprasDemo = Compras;
export default Compras;
