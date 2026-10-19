import React, { useState } from "react";
import { SupplierPicker } from "./purchases-dashboard.jsx";
export function quoteChecklist({ titulo, prazo, items }, now = Date.now()) {
  return [
    titulo.trim().length >= 3 && Date.parse(prazo) > now,
    items.length > 0 &&
      items.every(
        (i) =>
          Number.isFinite(i.quantidade) && i.quantidade > 0 && i.unidade.trim(),
      ),
    items.length > 0 && items.every((i) => i.fornecedores.length > 0),
  ];
}
export default function QuoteQuest({
  suppliers,
  groups = [],
  onSave,
  Catalog,
}) {
  const [step, setStep] = useState(0),
    [titulo, setTitulo] = useState(""),
    [prazo, setPrazo] = useState(""),
    [observacoes, setObservacoes] = useState(""),
    [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState("");
  const checks = quoteChecklist({ titulo, prazo, items }),
    complete = checks.filter(Boolean).length,
    ready = checks.every(Boolean),
    partners = new Set(items.flatMap((i) => i.fornecedores)).size;
  const names = [
    "Defina a missão",
    "Monte a lista",
    "Escolha os parceiros",
    "Revise e conclua",
  ];
  const update = (index, key, value) =>
    setItems((old) =>
      old.map((i, n) => (n === index ? { ...i, [key]: value } : i)),
    );
  const go = (n) => {
    setError("");
    setStep(n);
  };
  const advance = () => {
    if (!checks[step]) {
      setError(
        [
          "Informe um título de pelo menos 3 caracteres e um prazo futuro.",
          "Adicione produtos com quantidade positiva e unidade preenchida.",
          "Selecione pelo menos um fornecedor para cada produto.",
        ][step],
      );
      return;
    }
    setFeedback(
      [
        "Missão definida. Vamos aos produtos!",
        "Lista pronta. Hora de escolher os parceiros!",
        "Parceiros definidos. Falta só sua revisão.",
      ][step],
    );
    go(step + 1);
  };
  return (
    <form
      className="purchase-card purchase-quest"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        if (step !== 3) {
          advance();
          return;
        }
        if (!ready) {
          setError("Há etapas incompletas. Revise o checklist antes de criar.");
          return;
        }
        setBusy(true);
        setError("");
        try {
          await onSave({
            titulo: titulo.trim(),
            prazo: new Date(prazo).toISOString(),
            observacoes,
            itens: items,
          });
          setStep(0);
          setTitulo("");
          setPrazo("");
          setItems([]);
          setObservacoes("");
          setFeedback("Cotação criada! Os links estão prontos no detalhe.");
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <header className="purchase-toolbar">
        <div>
          <span className="purchase-eyebrow">SUA PRÓXIMA BOA COMPRA</span>
          <h2>{names[step]}</h2>
        </div>
        <span className="quest-score">{complete}/3 missões concluídas</span>
      </header>
      <progress
        aria-label="Progresso do preenchimento"
        value={complete}
        max={3}
      />
      <nav className="quest-steps" aria-label="Etapas da cotação">
        {names.map((name, n) => (
          <button
            type="button"
            key={name}
            aria-current={step === n ? "step" : undefined}
            onClick={() => go(n)}
          >
            <b>{checks[n] ? "✓" : n + 1}</b>
            <span>{name}</span>
          </button>
        ))}
      </nav>
      {feedback && (
        <p className="quest-feedback" role="status">
          {feedback}
        </p>
      )}
      {step === 0 && (
        <section>
          <p>
            Dê um nome à compra e defina até quando os fornecedores podem
            responder.
          </p>
          <div className="purchase-grid">
            <label className="purchase-field">
              Título da cotação
              <input
                value={titulo}
                maxLength={200}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Filtros para revisão da frota"
              />
            </label>
            <label className="purchase-field">
              Receber respostas até
              <input
                type="datetime-local"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
              />
            </label>
          </div>
          <div className="purchase-actions">
            {[1, 3, 7].map((days) => (
              <button
                type="button"
                key={days}
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + days);
                  d.setHours(18, 0, 0, 0);
                  setPrazo(
                    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16),
                  );
                }}
              >
                Em {days} dia{days > 1 ? "s" : ""}
              </button>
            ))}
          </div>
          <label className="purchase-field">
            Orientações aos fornecedores
            <textarea
              maxLength={1000}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Entrega, especificações ou condições importantes"
            />
          </label>
        </section>
      )}
      {step === 1 && (
        <section>
          <Catalog
            tipo="produtos"
            onSelect={(r) => {
              if (
                items.some(
                  (i) => i.empresa === r.empresa && i.codigo === r.codigo,
                )
              ) {
                setFeedback(
                  "Esse produto já está na sua lista. Ajuste a quantidade abaixo.",
                );
                return;
              }
              setItems((old) => [
                ...old,
                { ...r, quantidade: 1, unidade: "UN", fornecedores: [] },
              ]);
              setFeedback(`${r.nome} adicionado à lista.`);
            }}
          />
          {items.map((i, n) => (
            <article className="quest-product" key={`${i.empresa}:${i.codigo}`}>
              <header>
                <strong>
                  {n + 1}. {i.nome}
                </strong>
                <button
                  type="button"
                  onClick={() =>
                    setItems((old) => old.filter((_, index) => index !== n))
                  }
                >
                  Remover
                </button>
              </header>
              <div className="purchase-grid">
                <label className="purchase-field">
                  Quantidade de {i.nome}
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={i.quantidade}
                    onChange={(e) =>
                      update(n, "quantidade", Number(e.target.value))
                    }
                  />
                </label>
                <label className="purchase-field">
                  Unidade de {i.nome}
                  <input
                    maxLength={30}
                    value={i.unidade}
                    onChange={(e) => update(n, "unidade", e.target.value)}
                  />
                </label>
              </div>
            </article>
          ))}
          {!items.length && (
            <p>Sua lista está vazia. Busque e escolha o primeiro produto.</p>
          )}
        </section>
      )}
      {step === 2 && (
        <section>
          <p>
            Cada produto pode ir para vários fornecedores. Só os itens
            selecionados aparecem no link de cada parceiro.
          </p>
          {items.map((i, n) => (
            <article className="quest-product" key={`${i.empresa}:${i.codigo}`}>
              <header>
                <strong>{i.nome}</strong>
                <span>
                  {i.quantidade} {i.unidade}
                </span>
              </header>
              <SupplierPicker
                groups={groups}
                suppliers={suppliers}
                selected={i.fornecedores}
                onChange={(v) => update(n, "fornecedores", v)}
              />
              {n > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    update(n, "fornecedores", [...items[n - 1].fornecedores]);
                    setFeedback(
                      "Seleção do produto anterior copiada. Você pode ajustar os parceiros.",
                    );
                  }}
                >
                  Usar parceiros do produto anterior
                </button>
              )}
            </article>
          ))}
          {!items.length && (
            <p>Adicione produtos na etapa 2 para escolher os fornecedores.</p>
          )}
        </section>
      )}
      {step === 3 && (
        <section>
          <div className="quest-review-summary">
            <strong>{titulo || "Título ainda não definido"}</strong>
            <p>
              {prazo
                ? new Date(prazo).toLocaleString("pt-BR")
                : "Prazo não definido"}{" "}
              · {items.length} produtos · {partners} fornecedores
            </p>
            {observacoes && <p>{observacoes}</p>}
          </div>
          <ul className="quest-checklist">
            {[
              "Título e prazo válidos",
              "Produtos com quantidade e unidade",
              "Fornecedores de todos os produtos",
            ].map((label, n) => (
              <li key={label}>
                <span>
                  {checks[n] ? "✓" : "○"} {label}
                </span>
                <button type="button" onClick={() => go(n)}>
                  Revisar
                </button>
              </li>
            ))}
          </ul>
          {items.map((i) => (
            <div className="quest-review-item" key={`${i.empresa}:${i.codigo}`}>
              <strong>
                {i.nome} · {i.quantidade} {i.unidade}
              </strong>
              <p>
                {suppliers
                  .filter((s) => i.fornecedores.includes(s.id))
                  .map((s) => s.nome)
                  .join(", ") || "Sem fornecedores selecionados"}
              </p>
            </div>
          ))}
          <p>
            Ao concluir, a cotação será salva e os links individuais serão
            gerados. Você escolhe quando compartilhá-los.
          </p>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      <footer className="quest-footer">
        <span>
          {items.length} produtos · {partners} parceiros
        </span>
        <div className="purchase-actions">
          {step > 0 && (
            <button type="button" disabled={busy} onClick={() => go(step - 1)}>
              Voltar
            </button>
          )}
          <button
            className="purchase-primary"
            disabled={busy || (step === 3 && !ready)}
          >
            {busy
              ? "Criando…"
              : step === 3
                ? "Concluir e gerar links"
                : "Continuar →"}
          </button>
        </div>
      </footer>
    </form>
  );
}
