import { quoteProgress } from "./purchases-status.js";
import React from "react";
import { quoteStatus } from "./purchases-dashboard.jsx";
export function PurchaseIcon({ name, size = 22 }) {
  const paths = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
        <path d="M9 21V12h6v9" />
      </>
    ),
    quotes: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4" />
      </>
    ),
    suppliers: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87" />
        <circle cx="9" cy="7" r="4" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    exit: (
      <>
        <path d="M10 4H4v16h6M9 12h12m-4-4 4 4-4 4" />
      </>
    ),
    box: (
      <>
        <path d="m12 3 9 5v9l-9 5-9-5V8Z M3 8l9 5 9-5M12 13v9M7.5 5.5l9 5" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.quotes}
    </svg>
  );
}
export function PurchaseNavigation({ tab, onNavigate }) {
  const items = [
    ["inicio", "Início", "home"],
    ["cotacoes", "Cotações", "quotes"],
    ["fornecedores", "Fornecedores", "suppliers"],
    ["nova", "Criar cotação", "plus"],
  ];
  return (
    <aside className="purchase-app-rail">
      <a
        href="/"
        className="purchase-rail-brand"
        aria-label="Rodobach — voltar ao sistema"
      >
        <img src="/brand/rodobach.png" alt="Rodobach" width="190" height="52" />
        <span>COMPRAS</span>
      </a>
      <nav aria-label="Navegação de compras">
        {items.map(([id, label, icon]) => (
          <button
            key={id}
            aria-current={
              tab === id || (id === "cotacoes" && tab === "detalhe")
                ? "page"
                : undefined
            }
            onClick={() => onNavigate(id)}
          >
            <PurchaseIcon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <a className="purchase-rail-exit" href="/">
        <PurchaseIcon name="exit" size={20} />
        <span>Voltar ao sistema</span>
      </a>
      <div className="purchase-rail-signature">
        <span>RB</span>
        <small>
          Do pedido
          <br />à melhor decisão.
        </small>
      </div>
    </aside>
  );
}
export function PurchaseHome({
  quotes,
  suppliers,
  onNavigate,
  onOpen,
  loading,
}) {
  const active = quotes.filter((q) => quoteStatus(q) === "aberta");
  const pending = active.reduce(
    (n, q) => n + Math.max(0, q.fornecedores - q.respostas),
    0,
  );
  const ready = quotes.filter(
    (q) => quoteProgress(q).key === "respondida",
  ).length;
  const history = quotes.filter((q) => q.origem_chave).length;
  return (
    <div className="purchase-home">
      <section className="purchase-hero">
        <div className="purchase-hero-content">
          <span className="purchase-eyebrow">SEU ESPAÇO DE COMPRAS</span>
          <h1>
            Da cotação à decisão.
            <br />
            <em>Tudo no mesmo lugar.</em>
          </h1>
          <p>
            Organize o que precisa, encontre seus fornecedores
            <br className="purchase-desktop-break" /> e escolha a proposta que
            faz sentido.
          </p>
          <div className="purchase-hero-actions">
            <button
              className="purchase-hero-primary"
              onClick={() => onNavigate("nova")}
            >
              <PurchaseIcon name="plus" size={18} />
              Nova cotação
            </button>
            <button
              className="purchase-hero-secondary"
              onClick={() => onNavigate("cotacoes")}
            >
              Ver cotações
              <PurchaseIcon name="arrow" size={18} />
            </button>
          </div>
        </div>
        <div className="purchase-hero-art" aria-hidden="true">
          <div className="purchase-art-sheet">
            <PurchaseIcon name="quotes" size={26} />
            <span />
            <span />
            <span />
            <div>
              <PurchaseIcon name="check" size={20} />
            </div>
          </div>
        </div>
      </section>
      <div className="purchase-home-stats">
        {[
          [pending, "Respostas pendentes", "clock"],
          [active.length, "Em andamento", "quotes"],
          [history, "Cotações do sistema", "check"],
        ].map(([value, label, icon], index) => (
          <button
            key={label}
            className={`purchase-home-stat stat-${index}`}
            onClick={() => onNavigate("cotacoes")}
          >
            <span>
              <PurchaseIcon name={icon} size={18} />
              {label}
            </span>
            <strong>{loading ? "—" : value}</strong>
          </button>
        ))}
      </div>
      <div className="purchase-home-notice">
        <PurchaseIcon name="clock" size={21} />
        <div>
          <strong>
            {ready
              ? `${ready} ${ready === 1 ? "cotação aguardando" : "cotações aguardando"} sua análise`
              : pending
                ? "Há fornecedores aguardando resposta"
                : "Tudo em dia por aqui"}
          </strong>
          <p>
            {ready
              ? "Compare as propostas e escolha os fornecedores de cada item."
              : pending
                ? `Acompanhe as ${pending} respostas pendentes nas cotações em andamento.`
                : "Crie uma cotação para começar a receber propostas dos fornecedores."}
          </p>
        </div>
        <button
          aria-label="Abrir cotações"
          onClick={() => onNavigate("cotacoes")}
        >
          <PurchaseIcon name="arrow" size={20} />
        </button>
      </div>
      <header className="purchase-home-section">
        <span className="purchase-eyebrow">DO PEDIDO À MELHOR ESCOLHA</span>
        <h2>
          Sua operação, <em>mais simples.</em>
        </h2>
      </header>
      <div className="purchase-module-grid">
        <section className="purchase-module">
          <header>
            <span className="purchase-module-icon">
              <PurchaseIcon name="box" size={25} />
            </span>
            <div>
              <h3>Cotações e propostas</h3>
              <p>Uma visão completa de cada negociação</p>
            </div>
          </header>
          <div className="purchase-module-numbers">
            <div>
              <span>Cotações cadastradas</span>
              <strong>{loading ? "—" : quotes.length}</strong>
            </div>
            <div>
              <span>Em andamento</span>
              <strong>{loading ? "—" : active.length}</strong>
            </div>
          </div>
          <div className="purchase-module-tip">
            <PurchaseIcon name="check" size={18} />
            <div>
              <strong>Compare com informação</strong>
              <p>
                Consulte preços, quantidades e o histórico antes de decidir.
              </p>
            </div>
          </div>
          <button onClick={() => onNavigate("cotacoes")}>
            Explorar cotações
            <PurchaseIcon name="arrow" size={19} />
          </button>
        </section>
        <section className="purchase-module suppliers">
          <header>
            <span className="purchase-module-icon">
              <PurchaseIcon name="suppliers" size={25} />
            </span>
            <div>
              <h3>Seus fornecedores</h3>
              <p>Uma rede pronta para a próxima compra</p>
            </div>
          </header>
          <div className="purchase-module-numbers">
            <div>
              <span>Fornecedores cadastrados</span>
              <strong>{loading ? "—" : suppliers.length}</strong>
            </div>
            <div>
              <span>Com contato informado</span>
              <strong>
                {loading
                  ? "—"
                  : suppliers.filter((s) => s.email || s.telefone).length}
              </strong>
            </div>
          </div>
          <div className="purchase-module-tip">
            <PurchaseIcon name="suppliers" size={18} />
            <div>
              <strong>Cada produto, os parceiros certos</strong>
              <p>Escolha quem recebe cada item e acompanhe as respostas.</p>
            </div>
          </div>
          <button onClick={() => onNavigate("fornecedores")}>
            Abrir fornecedores
            <PurchaseIcon name="arrow" size={19} />
          </button>
        </section>
      </div>
      <section className="purchase-home-recent">
        <header>
          <h2>Últimas cotações</h2>
          <button onClick={() => onNavigate("cotacoes")}>
            Ver todas
            <PurchaseIcon name="arrow" size={16} />
          </button>
        </header>
        {quotes.slice(0, 3).map((q) => (
          <button
            className="purchase-recent-row"
            key={q.id}
            onClick={() => onOpen(q.id)}
          >
            <span className="purchase-module-icon">
              <PurchaseIcon name="quotes" size={19} />
            </span>
            <span>
              <strong>{q.titulo}</strong>
              <small>
                {q.produtos ?? 0} produtos · {q.fornecedores} fornecedores
              </small>
            </span>
            <span className="purchase-badge">{quoteProgress(q).label}</span>
            <PurchaseIcon name="arrow" size={18} />
          </button>
        ))}
        {!quotes.length && !loading && (
          <p>Sua primeira cotação vai aparecer aqui.</p>
        )}
      </section>
    </div>
  );
}
