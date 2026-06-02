// Norte Telemetria — App shell, router, sidebar, Tweaks
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "auto",
  "density": "comfortable"
}/*EDITMODE-END*/;

const NAV = [
  { id: "dashboard",   label: "Dashboard",    icon: "dashboard",   title: "Visão geral" },
  { id: "vehicles",    label: "Veículos",     icon: "truck",       title: "Veículos" },
  { id: "alerts",      label: "Alertas",      icon: "alert",       title: "Alertas e ocorrências", badge: 12 },
  { id: "simulador",   label: "Calculadora",  icon: "calculator",  title: "Calculadora de Frete ANTT" },
  { id: "diarias",     label: "Diárias",      icon: "clock",       title: "Diárias do Motorista" },
  { id: "viagens",     label: "Viagens",      icon: "route",       title: "Viagens e Cotações" },
  { id: "reports",     label: "Relatórios",   icon: "chart",       title: "Relatórios" },
  { id: "custos",      label: "Custos",       icon: "money",       title: "Despesas e Custos" },
  { id: "receita",     label: "Receita",      icon: "trending-up", title: "Análise de Receita" },
  { id: "placa",       label: "Por Placa",    icon: "compass",     title: "Financeiro por Placa" },
  { id: "clientes",   label: "Clientes",     icon: "user",        title: "Análise de Clientes" },
  { id: "integration", label: "Integração",   icon: "plug",        title: "Saúde da integração" },
  { id: "settings",    label: "Configurações", icon: "settings",   title: "Configurações" },
];

const REMOVED_SCREENS = new Set([
  "map",
  "vehicles",
  "vehicle",
  "alerts",
  "dashboard",
  "reports",
  "integration",
]);
const APP_NAV = NAV.filter(n => !REMOVED_SCREENS.has(n.id));
const DEFAULT_SCREEN = "simulador";
const isKnownScreen = (screen) => APP_NAV.some(n => n.id === screen);

function readRoute() {
  const h = (window.location.hash || "").replace(/^#\/?/, "");
  if (!h) return { screen: DEFAULT_SCREEN };
  const parts = h.split("/");
  return { screen: isKnownScreen(parts[0]) ? parts[0] : DEFAULT_SCREEN };
}

function setRoute(r) {
  window.location.hash = "/" + (isKnownScreen(r.screen) ? r.screen : DEFAULT_SCREEN);
}

const App = () => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRouteState] = useState(readRoute());

  useEffect(() => {
    const on = () => setRouteState(readRoute());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  // Apply theme + density to <html>. When theme === "auto" follow the OS.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = t.theme === "auto"
        ? (mq.matches ? "dark" : "light")
        : t.theme;
      document.documentElement.setAttribute("data-theme", resolved);
      document.documentElement.setAttribute("data-theme-pref", t.theme);
    };
    apply();
    document.documentElement.setAttribute("data-density", t.density);
    if (t.theme === "auto") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [t.theme, t.density]);

  const go = (screen, extra = {}) => setRoute({ screen, ...extra });
  const goVehicle = () => {};

  const onNavigate = (screen) => go(isKnownScreen(screen) ? screen : DEFAULT_SCREEN);

  let body = null;
  switch (route.screen) {
    case "simulador":
      body = <SimuladorFrete onNavigate={onNavigate}/>;
      break;
    case "diarias":
      body = <DiariasMotorista onNavigate={onNavigate}/>;
      break;
    case "viagens":
      body = <Viagens onNavigate={onNavigate}/>;
      break;
    case "custos":
      body = <Custos onGoToVehicle={goVehicle} onNavigate={onNavigate}/>;
      break;
    case "receita":
      body = <Receita onGoToVehicle={goVehicle} onNavigate={onNavigate}/>;
      break;
    case "placa":
      body = <FinanceiroPlaca onNavigate={onNavigate}/>;
      break;
    case "clientes":
      body = <AnaliseClientes onNavigate={onNavigate}/>;
      break;
    case "settings":
      body = <SettingsScreen theme={t.theme} setTheme={(v) => setTweak("theme", v)} density={t.density} setDensity={(v) => setTweak("density", v)}/>;
      break;
    default:
      body = <SimuladorFrete onNavigate={onNavigate}/>;
      break;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" title="Norte — Gestão de Frota Inteligente">
            <svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              {/* N body: thick road-like stroke */}
              <path d="M5.5 23 L5.5 8.5 L18 21.5 L18 11.5"
                    fill="none" stroke="#141936"
                    strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round"/>
              {/* dashed road centerline along the N's left leg */}
              <path d="M5.5 21 L5.5 10"
                    fill="none" stroke="#ffffff"
                    strokeWidth="0.7" strokeDasharray="1.3 1.3" strokeLinecap="round"/>
              {/* arrow head tip — light blue */}
              <path d="M18 11.5 L22.5 6.5"
                    fill="none" stroke="#4f7fab"
                    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22.5 6.5 L19.5 6.5 L22.5 6.5 L22.5 9.5"
                    fill="none" stroke="#4f7fab"
                    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="brand-name">
            Norte
            <span className="tag">Gestão de frota</span>
          </div>
        </div>

        <div className="nav-section">
          {APP_NAV.slice(0, -1).map(n => (
            <button
              key={n.id}
              className={`nav-item ${route.screen === n.id ? "active" : ""}`}
              data-tip={n.label}
              data-has-badge={n.badge != null ? "true" : "false"}
              onClick={() => go(n.id)}
            >
              <Icon name={n.icon}/>
              <span className="lbl">{n.label}</span>
              {n.badge != null && <span className="badge-count">{n.badge}</span>}
            </button>
          ))}
        </div>

        <div className="nav-section">
          <div className="nav-label">Sistema</div>
          {APP_NAV.slice(-1).map(n => (
            <button
              key={n.id}
              className={`nav-item ${route.screen === n.id ? "active" : ""}`}
              data-tip={n.label}
              onClick={() => go(n.id)}
            >
              <Icon name={n.icon}/>
              <span className="lbl">{n.label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="avatar">JM</div>
          <div className="who">
            <div className="who-name">Juliana Martins</div>
            <div className="who-org">Norte Logística</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div style={{flex: 1, overflow: "hidden", display: "flex", flexDirection: "column"}}>
          {body}
        </div>
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Aparência">
          <TweakRadio
            label="Tema"
            value={t.theme}
            onChange={v => setTweak("theme", v)}
            options={[
              { value: "auto", label: "Auto" },
              { value: "light", label: "Claro" },
              { value: "dark", label: "Escuro" },
            ]}
          />
          <TweakRadio
            label="Densidade"
            value={t.density}
            onChange={v => setTweak("density", v)}
            options={[
              { value: "comfortable", label: "Confortável" },
              { value: "compact", label: "Compacta" },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
};

// Settings — with theme + density switchers
const SettingsScreen = ({ theme, setTheme, density, setDensity }) => {
  const themeOptions = [
    {
      id: "auto",
      label: "Sistema",
      desc: "Acompanhar o tema do sistema operacional",
      preview: "auto",
    },
    {
      id: "light",
      label: "Claro",
      desc: "Tema claro fixo, ideal para uso diurno",
      preview: "light",
    },
    {
      id: "dark",
      label: "Escuro",
      desc: "Tema escuro fixo, melhor em ambientes com pouca luz",
      preview: "dark",
    },
  ];

  const ThemePreview = ({ kind }) => {
    // Render a small mock window for each theme option
    const bgs = {
      light: { bg: "#fafafa", surface: "#ffffff", border: "#e8e8eb", text: "#09090b", muted: "#71717a", accent: "#4f7fab" },
      dark:  { bg: "#09090b", surface: "#0f0f11", border: "#232327", text: "#fafafa", muted: "#71717a", accent: "#6a98c4" },
    };
    if (kind === "auto") {
      return (
        <div style={{display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)"}}>
          <Mini c={bgs.light}/>
          <Mini c={bgs.dark}/>
        </div>
      );
    }
    return (
      <div style={{borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)"}}>
        <Mini c={bgs[kind]} full/>
      </div>
    );
  };

  const Mini = ({ c, full }) => (
    <div style={{
      flex: 1,
      width: full ? "100%" : "50%",
      height: 72,
      background: c.bg,
      padding: 8,
      display: "flex",
      gap: 6,
    }}>
      {/* mini sidebar */}
      <div style={{width: 18, height: "100%", background: "#141936", borderRadius: 3, padding: 4, display: "flex", flexDirection: "column", gap: 3}}>
        <div style={{width: 10, height: 2, background: "#6a98c4", borderRadius: 1}}/>
        <div style={{width: 10, height: 1.5, background: "rgba(255,255,255,0.4)", borderRadius: 1}}/>
        <div style={{width: 10, height: 1.5, background: "rgba(255,255,255,0.4)", borderRadius: 1}}/>
      </div>
      {/* mini content */}
      <div style={{flex: 1, display: "flex", flexDirection: "column", gap: 4}}>
        <div style={{height: 10, background: c.surface, border: `0.5px solid ${c.border}`, borderRadius: 2, display: "flex", padding: 2, gap: 2, alignItems: "center"}}>
          <div style={{width: 8, height: 4, background: c.text, borderRadius: 1, opacity: 0.6}}/>
        </div>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, flex: 1}}>
          <div style={{background: c.surface, border: `0.5px solid ${c.border}`, borderRadius: 2, padding: 3}}>
            <div style={{width: 8, height: 1.5, background: c.muted, borderRadius: 1, marginBottom: 2}}/>
            <div style={{width: 14, height: 3, background: c.text, borderRadius: 1}}/>
          </div>
          <div style={{background: c.surface, border: `0.5px solid ${c.border}`, borderRadius: 2, padding: 3}}>
            <div style={{width: 8, height: 1.5, background: c.muted, borderRadius: 1, marginBottom: 2}}/>
            <div style={{width: 12, height: 3, background: c.accent, borderRadius: 1}}/>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>Configurações</h1>
          <div className="sub">Aparência, conta, integrações e usuários</div>
        </div>
      </div>

      {/* APPEARANCE CARD */}
      <div className="card" style={{marginBottom: 16}}>
        <div className="section-head" style={{marginBottom: 14}}>
          <div>
            <h2 style={{color: "var(--text)", fontSize: 14}}>Aparência</h2>
            <div className="muted" style={{fontSize: 12, marginTop: 2}}>Personalize o tema e a densidade da interface</div>
          </div>
        </div>

        {/* Theme selector */}
        <div style={{marginBottom: 22}}>
          <div className="row between" style={{marginBottom: 10}}>
            <div>
              <div style={{fontSize: 12.5, fontWeight: 500}}>Tema</div>
              <div className="muted" style={{fontSize: 11.5, marginTop: 2}}>
                {theme === "auto"
                  ? "Acompanhando o sistema operacional"
                  : `Fixo em modo ${theme === "light" ? "claro" : "escuro"}`}
              </div>
            </div>
          </div>

          <div className="grid cols-3" style={{gap: 12}}>
            {themeOptions.map(opt => {
              const active = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  style={{
                    border: `1.5px solid ${active ? "var(--brand-blue)" : "var(--border)"}`,
                    borderRadius: 8,
                    background: active ? "var(--accent-soft)" : "var(--surface)",
                    padding: 12,
                    cursor: "pointer",
                    textAlign: "left",
                    boxShadow: active ? "0 0 0 3px color-mix(in oklab, var(--brand-blue) 12%, transparent)" : "none",
                    transition: "all 120ms ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}>
                  <ThemePreview kind={opt.preview}/>
                  <div className="row between">
                    <div>
                      <div style={{fontSize: 12.5, fontWeight: 500}}>{opt.label}</div>
                      <div className="muted" style={{fontSize: 11.5, marginTop: 2}}>{opt.desc}</div>
                    </div>
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%",
                      border: `1.5px solid ${active ? "var(--brand-blue)" : "var(--border-strong)"}`,
                      background: active ? "var(--brand-blue)" : "transparent",
                      display: "grid", placeItems: "center",
                      flexShrink: 0,
                    }}>
                      {active && <Icon name="check" size={10} strokeWidth={3} style={{color: "#fff"}}/>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Density selector */}
        <div style={{borderTop: "1px solid var(--divider)", paddingTop: 16}}>
          <div className="row between" style={{marginBottom: 10}}>
            <div>
              <div style={{fontSize: 12.5, fontWeight: 500}}>Densidade da interface</div>
              <div className="muted" style={{fontSize: 11.5, marginTop: 2}}>Ajuste o espaçamento de tabelas e cards</div>
            </div>
          </div>
          <div className="row" style={{gap: 8}}>
            {[
              { id: "comfortable", label: "Confortável", desc: "Mais espaço entre os elementos" },
              { id: "compact", label: "Compacta", desc: "Mais informação por tela" },
            ].map(opt => {
              const active = density === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setDensity(opt.id)}
                  style={{
                    flex: 1,
                    border: `1.5px solid ${active ? "var(--brand-blue)" : "var(--border)"}`,
                    background: active ? "var(--accent-soft)" : "var(--surface)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    border: `1.5px solid ${active ? "var(--brand-blue)" : "var(--border-strong)"}`,
                    background: active ? "var(--brand-blue)" : "transparent",
                    display: "grid", placeItems: "center",
                    flexShrink: 0,
                  }}>
                    {active && <Icon name="check" size={10} strokeWidth={3} style={{color: "#fff"}}/>}
                  </div>
                  <div>
                    <div style={{fontSize: 12.5, fontWeight: 500}}>{opt.label}</div>
                    <div className="muted" style={{fontSize: 11.5, marginTop: 1}}>{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* OTHER SETTINGS */}
      <div className="section-head"><h2>Outras configurações</h2></div>
      <div className="grid cols-3">
        {[
          { t: "Conta da empresa", d: "Norte Logística · CNPJ 32.480.591/0001-04", i: "user" },
          { t: "Usuários e permissões", d: "8 usuários · 3 perfis", i: "user" },
          { t: "Perfis de alerta", d: "Velocidade · RPM · Cerca virtual · Sirene", i: "bell" },
          { t: "Integração Trucks", d: "API v3.4 · token expira em 142 dias", i: "plug" },
          { t: "Webhooks e notificações", d: "2 webhooks ativos", i: "external" },
          { t: "Exportação e BI", d: "PowerBI · Looker Studio · CSV", i: "download" },
        ].map((c, i) => (
          <div key={i} className="card" style={{cursor: "pointer"}}>
            <div className="row between">
              <div className="row" style={{gap: 10}}>
                <div style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: "var(--accent-soft)",
                  display: "grid", placeItems: "center",
                  color: "var(--brand-blue)",
                  border: "1px solid var(--accent-border)",
                }}>
                  <Icon name={c.i} size={15}/>
                </div>
                <h3 style={{margin: 0, fontSize: 13}}>{c.t}</h3>
              </div>
              <Icon name="chevron-right" size={14} className="dim"/>
            </div>
            <div className="muted" style={{fontSize: 12, marginTop: 8}}>{c.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.App = App;

// Mount
ReactDOM.createRoot(document.getElementById("app")).render(<App/>);
