// Norte Telemetria — App shell, router, sidebar, Tweaks
const { useState, useEffect } = React;

const SCREEN_SCRIPTS = [
  "src/screens/diretoria.jsx",
  "src/screens/simulador.jsx",
  "src/screens/viagens.jsx",
  "src/screens/status-carga.jsx",
  "src/screens/trafegus.jsx",
  "src/screens/oportunidades-retorno.jsx",
  "src/screens/dre-empresarial.jsx",
  "src/screens/analise-frota.jsx",
  "src/screens/precos-combustivel.jsx",
  "src/screens/custos-veiculos.jsx",
  "src/screens/manutencoes-veiculos.jsx",
  "src/screens/analise-clientes.jsx",
  "src/screens/rentabilidade-clientes.jsx",
  "src/screens/lucro-viagens.jsx",
  "src/screens/resultado-fretes.jsx",
  "src/screens/faturamento-diario.jsx",
  "src/screens/comparativo-faturamento.jsx",
  "src/screens/manutencao.jsx",
  "src/screens/pneus.jsx?v=20260603-historico-pneu",
  "src/screens/automacoes.jsx",
];

const SCREEN_GLOBALS = [
  "Diretoria", "SimuladorFrete", "Viagens",
  "StatusCargaFrota", "Trafegus", "OportunidadesRetorno",
  "DreEmpresarial", "AnaliseClientes",
  "RentabilidadeClientes", "LucroViagens", "ResultadoFretes", "FaturamentoDiario", "ComparativoFaturamento", "ManutencaoMensagens", "Pneus", "CustosVeiculos", "ManutencoesVeiculos", "AnaliseFrota", "PrecosCombustivel", "AutomacoesN8n",
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "auto",
  "density": "comfortable"
}/*EDITMODE-END*/;

const NAV = [
  { id: "diretoria",       label: "Diretoria",    icon: "dashboard",   title: "Resumo executivo", section: "direcao" },
  { id: "dre-empresarial", label: "DRE Emp.",     icon: "chart",       title: "DRE Empresarial", section: "direcao" },
  { id: "faturamento-diario", label: "Fat. Diário", icon: "chart",     title: "Faturamento Diário", section: "direcao" },
  { id: "comparativo-faturamento", label: "Comp. Mensal", icon: "chart", title: "Comparativo Mensal", section: "direcao" },
  { id: "analise-frota",   label: "Frota BI",     icon: "truck",       title: "Analise de Frota", section: "direcao" },
  { id: "abastecimentos",  label: "Abastecimentos", icon: "fuel",       title: "Análise de Abastecimentos", section: "direcao" },
  { id: "precos-combustivel", label: "Preços Postos", icon: "money",     title: "Preços combinados de combustível", section: "direcao" },
  { id: "lucro-viagens",   label: "Res. Viagem",  icon: "route",       title: "Resultado por Viagem", group: "resultados", section: "direcao" },
  { id: "clientes",        label: "Análise",      icon: "user",        title: "Análise de Clientes", group: "clientes", section: "direcao" },
  { id: "clientes-lucro",  label: "Lucro",        icon: "chart",       title: "Rentabilidade Clientes", group: "clientes", section: "direcao" },
  { id: "custos-veiculos", label: "Custos",       icon: "truck",       title: "Custos por Veiculo", group: "manutencoes", section: "direcao" },
  { id: "manutencoes-veiculos", label: "Lançamentos", icon: "wrench", title: "Manutenções e Custos por Veículo", group: "manutencoes", section: "direcao" },
  { id: "simulador",       label: "Calculadora",  icon: "calculator",  title: "Calculadora de Frete ANTT", section: "operacao" },
  { id: "viagens",         label: "Viagens",      icon: "route",       title: "Viagens e Cotações", section: "operacao" },
  { id: "status-carga",    label: "Status Carga", icon: "package",     title: "Status de Carga da Frota", section: "operacao" },
  { id: "trafegus",        label: "Trafegus",     icon: "map",         title: "SMs e Rotas do Trafegus", section: "operacao" },
  { id: "oportunidades-retorno", label: "Retorno", icon: "route", title: "Clientes próximos e carga de retorno", section: "operacao" },
  { id: "pneus",           label: "Pneus",        icon: "truck",       title: "Movimentação de Pneus", section: "operacao" },
  { id: "manutencao",      label: "Automações",   icon: "wrench",      title: "Automação de Manutenção", section: "operacao" },
  { id: "automacoes-n8n",  label: "n8n",          icon: "plug",        title: "Automações n8n", sistema: true },
  { id: "settings",        label: "Configurações", icon: "settings",   title: "Configurações",    sistema: true },
  { id: "usuarios",        label: "Usuários",     icon: "user",        title: "Gerenciar Usuários", sistema: true, adminOnly: true },
];

const BASE_NAV = NAV;
const DEFAULT_SCREEN = "diretoria";

const NAV_SECTION_LABELS = {
  direcao: "Direção",
  operacao: "Operação",
};

const NAV_GROUPS = {
  clientes: {
    label: "Clientes",
    icon: "user",
    screens: ["clientes", "clientes-lucro"],
  },
  manutencoes: {
    label: "Manutenções",
    icon: "wrench",
    screens: ["custos-veiculos", "manutencoes-veiculos"],
  },
  resultados: {
    label: "Resultado por viagem",
    icon: "chart",
    screens: ["lucro-viagens"],
  },
};

function getSidebarNav(visibleNav) {
  const seenGroups = new Set();
  return visibleNav.flatMap((n) => {
    if (!n.group) return [n];
    if (seenGroups.has(n.group)) return [];
    const group = NAV_GROUPS[n.group];
    const firstAvailable = group?.screens
      .map((id) => visibleNav.find((item) => item.id === id))
      .find(Boolean);
    if (!group || !firstAvailable) return [];
    seenGroups.add(n.group);
    return [{
      ...firstAvailable,
      id: firstAvailable.id,
      label: group.label,
      icon: group.icon,
      group: n.group,
    }];
  });
}

function isNavActive(item, currentScreen) {
  if (item.group) return NAV_GROUPS[item.group]?.screens.includes(currentScreen);
  return currentScreen === item.id;
}

const ScreenGroup = ({ tabs, active, onChange, children }) => {
  const availableTabs = tabs.filter((tab) => tab.available !== false);
  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 24px 0", flexShrink: 0 }}>
        <Tabs tabs={availableTabs} active={active} onChange={onChange}/>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
};

function getNavForUser(user) {
  const permissions = user?.permissions || {};
  return BASE_NAV.filter(n => {
    if (n.adminOnly && !user?.admin) return false;
    return permissions[n.id] !== false;
  });
}

function readRoute() {
  const h = (window.location.hash || "").replace(/^#\/?/, "");
  if (!h) return { screen: DEFAULT_SCREEN };
  const parts = h.split("/");
  return { screen: parts[0] || DEFAULT_SCREEN };
}

function setRoute(r) {
  window.location.hash = "/" + r.screen;
}

// â”€â”€ Componente principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const App = () => {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRouteState] = useState(readRoute());
  const [auth, setAuth] = useState({ checking: true, user: null });
  const [screensReady, setScreensReady] = useState(false);

  // Verificar sessÃ£o existente ao carregar
  useEffect(() => {
    const token = RB_AUTH.getToken();
    const cachedUser = RB_AUTH.getUser();
    if (token && cachedUser) {
      RB_AUTH.me()
        .then(data => setAuth({ checking: false, user: data.user }))
        .catch(() => {
          RB_AUTH.logout();
          setAuth({ checking: false, user: null });
        });
    } else {
      setAuth({ checking: false, user: null });
    }
  }, []);

  // Ouvir evento de sessÃ£o expirada
  useEffect(() => {
    const handler = () => setAuth({ checking: false, user: null });
    window.addEventListener("rodobach:unauthorized", handler);
    return () => window.removeEventListener("rodobach:unauthorized", handler);
  }, []);

  // Hash change
  useEffect(() => {
    const on = () => setRouteState(readRoute());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  // Tema e densidade
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

  // Carrega as telas apÃ³s autenticaÃ§Ã£o via fetch + Babel.transform
  useEffect(() => {
    if (!auth.user || screensReady) return;
    (async () => {
      try {
        for (const src of SCREEN_SCRIPTS) {
          let loaded = false;
          let lastError = null;
          for (let attempt = 1; attempt <= 2 && !loaded; attempt += 1) {
            try {
              const separator = src.includes("?") ? "&" : "?";
              const res = await fetch(`${src}${separator}screen=${encodeURIComponent(src)}&attempt=${attempt}`, { cache: "no-store" });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const code = await res.text();
              const { code: compiled } = Babel.transform(code, { presets: ["react"], filename: src });
              // eslint-disable-next-line no-eval
              eval(compiled);
              loaded = true;
            } catch (error) {
              lastError = error;
            }
          }
          if (!loaded) console.error(`Erro ao carregar tela ${src}:`, lastError);
        }
        setScreensReady(true);
      } catch (e) {
        console.error("Erro ao carregar telas:", e);
        setScreensReady(true); // mostra o app mesmo assim
      }
    })();
  }, [auth.user]);

  const handleLogin = ({ user }) => {
    setAuth({ checking: false, user });
  };

  const handleLogout = () => {
    RB_AUTH.logout();
    setAuth({ checking: false, user: null });
    window.location.hash = "";
  };

  // â”€â”€ Estados de carregamento e nÃ£o autenticado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (auth.checking) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "var(--bg)",
      }}>
        <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Verificando sessão…</div>
      </div>
    );
  }

  if (!auth.user) {
    return <LoginScreen onLogin={handleLogin}/>;
  }

  if (!screensReady) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", background: "var(--bg)", gap: 16,
      }}>
        <img src="uploads/LOGO NORTE-03.png" alt="Norte"
          style={{ maxWidth: 160, opacity: 0.7, filter: "invert(var(--logo-invert, 0))" }}/>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Carregando o sistema…</div>
      </div>
    );
  }

  // â”€â”€ App autenticado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const visibleNav = getNavForUser(auth.user);
  const sidebarNav = getSidebarNav(visibleNav);

  // Se a tela atual nÃ£o estÃ¡ acessÃ­vel ao usuÃ¡rio, cair na primeira disponÃ­vel
  const currentScreen = visibleNav.some(n => n.id === route.screen)
    ? route.screen
    : (visibleNav[0]?.id || DEFAULT_SCREEN);

  const go = (screen) => setRoute({ screen });
  const onNavigate = (screen) => {
    if (visibleNav.some(n => n.id === screen)) go(screen);
  };
  const hasScreen = (screen) => visibleNav.some(n => n.id === screen);
  const renderNavItems = (items) => items.map(n => (
    <button
      key={n.id}
      className={`nav-item ${isNavActive(n, currentScreen) ? "active" : ""}`}
      data-tip={n.label}
      data-has-badge={n.badge != null ? "true" : "false"}
      onClick={() => go(n.id)}
    >
      <Icon name={n.icon}/>
      <span className="lbl">{n.label}</span>
      {n.badge != null && <span className="badge-count">{n.badge}</span>}
    </button>
  ));

  let body = null;
  switch (currentScreen) {
    case "diretoria":
      body = <Diretoria onNavigate={onNavigate}/>;
      break;
    case "simulador":
      body = <SimuladorFrete onNavigate={onNavigate}/>;
      break;
    case "viagens":
      body = <Viagens onNavigate={onNavigate}/>;
      break;
    case "status-carga":
      body = <StatusCargaFrota onNavigate={onNavigate}/>;
      break;
    case "trafegus":
      body = <Trafegus onNavigate={onNavigate}/>;
      break;
    case "dre-empresarial":
      body = <DreEmpresarial onNavigate={onNavigate}/>;
      break;
    case "analise-frota":
      body = <AnaliseFrota key="frota-bi" onNavigate={onNavigate}/>;
      break;
    case "abastecimentos":
      body = <AnaliseFrota key="abastecimentos" onNavigate={onNavigate} modoAbastecimento/>;
      break;
    case "precos-combustivel":
      body = <PrecosCombustivel onNavigate={onNavigate}/>;
      break;
    case "lucro-viagens":
      body = (
        <ScreenGroup
          tabs={[
            { id: "lucro-viagens", label: "Resultado por viagem", available: hasScreen("lucro-viagens") },
          ]}
          active={currentScreen}
          onChange={onNavigate}
        >
          <ResultadoFretes onNavigate={onNavigate}/>
        </ScreenGroup>
      );
      break;
    case "faturamento-diario":
      body = <FaturamentoDiario onNavigate={onNavigate}/>;
      break;
    case "comparativo-faturamento":
      body = <ComparativoFaturamento onNavigate={onNavigate}/>;
      break;
    case "custos-veiculos":
      body = (
        <ScreenGroup
          tabs={[
            { id: "custos-veiculos", label: "Custos", available: hasScreen("custos-veiculos") },
            { id: "manutencoes-veiculos", label: "Lançamentos", available: hasScreen("manutencoes-veiculos") },
          ]}
          active={currentScreen}
          onChange={onNavigate}
        >
          <CustosVeiculos onNavigate={onNavigate}/>
        </ScreenGroup>
      );
      break;
    case "manutencoes-veiculos":
      body = (
        <ScreenGroup
          tabs={[
            { id: "custos-veiculos", label: "Custos", available: hasScreen("custos-veiculos") },
            { id: "manutencoes-veiculos", label: "Lançamentos", available: hasScreen("manutencoes-veiculos") },
          ]}
          active={currentScreen}
          onChange={onNavigate}
        >
          <ManutencoesVeiculos onNavigate={onNavigate}/>
        </ScreenGroup>
      );
      break;
    case "clientes":
      body = (
        <ScreenGroup
          tabs={[
            { id: "clientes", label: "Análise", available: hasScreen("clientes") },
            { id: "clientes-lucro", label: "Lucro", available: hasScreen("clientes-lucro") },
          ]}
          active={currentScreen}
          onChange={onNavigate}
        >
          <AnaliseClientes onNavigate={onNavigate}/>
        </ScreenGroup>
      );
      break;
    case "clientes-lucro":
      body = (
        <ScreenGroup
          tabs={[
            { id: "clientes", label: "Análise", available: hasScreen("clientes") },
            { id: "clientes-lucro", label: "Lucro", available: hasScreen("clientes-lucro") },
          ]}
          active={currentScreen}
          onChange={onNavigate}
        >
          <RentabilidadeClientes onNavigate={onNavigate}/>
        </ScreenGroup>
      );
      break;
    case "manutencao":
      body = <ManutencaoMensagens onNavigate={onNavigate}/>;
      break;
    case "automacoes-n8n":
      body = <AutomacoesN8n onNavigate={onNavigate}/>;
      break;
    case "oportunidades-retorno":
      body = <OportunidadesRetorno onNavigate={onNavigate}/>;
      break;
    case "usuarios":
      body = <GerenciarUsuarios onNavigate={onNavigate}/>;
      break;
    case "pneus":
      body = <Pneus onNavigate={onNavigate}/>;
      break;
    case "settings":
      body = <SettingsScreen theme={t.theme} setTheme={(v) => setTweak("theme", v)} density={t.density} setDensity={(v) => setTweak("density", v)} onNavigate={onNavigate} canManageUsers={hasScreen("usuarios")}/>;
      break;
    default:
      body = <SimuladorFrete onNavigate={onNavigate}/>;
      break;
  }

  const userLogin = auth.user.login || "Usuário";
  const userInitials = userLogin.split(".").map(p => p[0] || "").join("").toUpperCase().slice(0, 2) || "U";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand" style={{ justifyContent: "center", padding: "14px 16px 8px" }}>
          <img
            src="uploads/LOGO NORTE-03.png"
            alt="Norte"
            style={{ width: "100%", maxHeight: 88, objectFit: "contain", display: "block" }}
          />
        </div>

        {Object.entries(NAV_SECTION_LABELS).map(([section, label]) => {
          const items = sidebarNav.filter(n => !n.sistema && (n.section || "direcao") === section);
          if (!items.length) return null;
          return (
            <div className="nav-section" key={section}>
              <div className="nav-label">{label}</div>
              {renderNavItems(items)}
            </div>
          );
        })}

        <div className="nav-section">
          <div className="nav-label">Sistema</div>
          {renderNavItems(sidebarNav.filter(n => n.sistema))}
        </div>

        <div className="sidebar-footer">
          <div className="avatar">{userInitials}</div>
          <div className="who" style={{ flex: 1, minWidth: 0 }}>
            <div className="who-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userLogin}
            </div>
            <div className="who-org" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {auth.user.email || "Rodobach"}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sair do sistema"
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "4px 6px", color: "var(--muted)", display: "flex",
              alignItems: "center", borderRadius: 5, flexShrink: 0,
              transition: "color 120ms",
            }}
            onMouseOver={e => e.currentTarget.style.color = "var(--text)"}
            onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}
          >
            <Icon name="external" size={14}/>
          </button>
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

function formatPhone(raw) {
  if (!raw) return raw;
  const num = String(raw).replace(/\D/g, "");
  if (num.length === 13 && num.startsWith("55")) {
    return `+55 (${num.slice(2, 4)}) ${num.slice(4, 9)}-${num.slice(9)}`;
  }
  if (num.length === 12 && num.startsWith("55")) {
    return `+55 (${num.slice(2, 4)}) ${num.slice(4, 8)}-${num.slice(8)}`;
  }
  return `+${num}`;
}

// Settings — with theme + density switchers
const SettingsScreen = ({ theme, setTheme, density, setDensity, onNavigate, canManageUsers }) => {
  const [showWaModal, setShowWaModal] = React.useState(false);
  const [waState, setWaState] = React.useState({ loading: false, qrcode: null, connected: false, phone: null, profileName: null, error: null });
const pollRef = React.useRef(null);

  React.useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function loadQrCode() {
    setWaState({ loading: true, qrcode: null, connected: false, error: null });
    try {
      const data = await RB_API.whatsappConnect();
      if (data.connected) {
        setWaState({ loading: false, qrcode: null, connected: true, phone: data.phone, profileName: data.profileName, error: null });
        return;
      }
      setWaState({ loading: false, qrcode: data.qrcode, connected: false, phone: null, profileName: null, error: null });
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const status = await RB_API.whatsappStatus();
          if (status.state === "open") {
            setWaState({ loading: false, qrcode: null, connected: true, phone: status.phone, profileName: status.profileName, error: null });
            clearInterval(pollRef.current);
          }
        } catch {}
      }, 3000);
    } catch (err) {
      setWaState({ loading: false, qrcode: null, connected: false, error: err.message });
    }
  }

  function openWaModal() {
    setShowWaModal(true);
    loadQrCode();
  }

  function closeWaModal() {
    setShowWaModal(false);
    if (pollRef.current) clearInterval(pollRef.current);
    setWaState({ loading: false, qrcode: null, connected: false, error: null });
  }
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
      <div style={{width: 18, height: "100%", background: "#141936", borderRadius: 3, padding: 4, display: "flex", flexDirection: "column", gap: 3}}>
        <div style={{width: 10, height: 2, background: "#6a98c4", borderRadius: 1}}/>
        <div style={{width: 10, height: 1.5, background: "rgba(255,255,255,0.4)", borderRadius: 1}}/>
        <div style={{width: 10, height: 1.5, background: "rgba(255,255,255,0.4)", borderRadius: 1}}/>
      </div>
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

      <div className="card" style={{marginBottom: 16}}>
        <div className="section-head" style={{marginBottom: 14}}>
          <div>
            <h2 style={{color: "var(--text)", fontSize: 14}}>Aparência</h2>
            <div className="muted" style={{fontSize: 12, marginTop: 2}}>Personalize o tema e a densidade da interface</div>
          </div>
        </div>

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

      <div className="section-head"><h2>Outras configurações</h2></div>
      <div className="grid cols-3">
        {[
          { t: "Conta da empresa", d: "Norte Logística · CNPJ 32.480.591/0001-04", i: "user" },
          { t: "Usuários e permissões", d: "Gerenciar acessos e telas liberadas", i: "user", action: canManageUsers ? () => onNavigate("usuarios") : null },
          { t: "Perfis de alerta", d: "Velocidade · RPM · Cerca virtual · Sirene", i: "bell" },
          { t: "Integração Trucks", d: "API v3.4 · token expira em 142 dias", i: "plug" },
          { t: "Webhooks e notificações", d: "2 webhooks ativos", i: "external" },
          { t: "Exportação e BI", d: "PowerBI · Looker Studio · CSV", i: "download" },
        ].map((c, i) => (
          <div key={i} className="card" style={{cursor: c.action ? "pointer" : "default", opacity: c.action === null ? 0.72 : 1}} onClick={c.action || undefined}>
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

        {/* Card WhatsApp */}
        <div className="card" style={{cursor: "pointer"}} onClick={openWaModal}>
          <div className="row between">
            <div className="row" style={{gap: 10}}>
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: "color-mix(in oklab, #25d366 12%, transparent)",
                display: "grid", placeItems: "center",
                color: "#25d366",
                border: "1px solid color-mix(in oklab, #25d366 25%, transparent)",
              }}>
                <Icon name="whatsapp" size={15}/>
              </div>
              <h3 style={{margin: 0, fontSize: 13}}>WhatsApp</h3>
            </div>
            <Icon name="chevron-right" size={14} className="dim"/>
          </div>
          <div className="muted" style={{fontSize: 12, marginTop: 8}}>Conectar celular para automações</div>
        </div>
      </div>

      {/* Modal QR Code WhatsApp */}
      {showWaModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 16,
        }} onClick={e => { if (e.target === e.currentTarget) closeWaModal(); }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 24, width: "100%", maxWidth: 380,
          }}>
            <div className="row between" style={{marginBottom: 20}}>
              <div className="row" style={{gap: 8}}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: "color-mix(in oklab, #25d366 12%, transparent)",
                  display: "grid", placeItems: "center", color: "#25d366",
                  border: "1px solid color-mix(in oklab, #25d366 25%, transparent)",
                }}>
                  <Icon name="whatsapp" size={13}/>
                </div>
                <h2 style={{margin: 0, fontSize: 15}}>Conectar WhatsApp</h2>
              </div>
              <button onClick={closeWaModal} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--muted)", padding: 4,
              }}>
                <Icon name="x" size={18}/>
              </button>
            </div>

            {waState.loading && (
              <div style={{textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13}}>
                Gerando QR Code...
              </div>
            )}

            {waState.connected && (
              <div>
                <div style={{display: "flex", alignItems: "center", gap: 12, padding: "16px 0 20px"}}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                    background: "color-mix(in oklab, #25d366 12%, transparent)",
                    border: "2px solid #25d366",
                    display: "grid", placeItems: "center",
                    color: "#25d366",
                  }}>
                    <Icon name="check" size={20} strokeWidth={2.5}/>
                  </div>
                  <div>
                    <div style={{fontSize: 14, fontWeight: 600, color: "#25d366"}}>WhatsApp conectado!</div>
                    {waState.profileName && (
                      <div style={{fontSize: 12.5, color: "var(--text)", marginTop: 1}}>{waState.profileName}</div>
                    )}
                    {waState.phone && (
                      <div className="muted" style={{fontSize: 12, marginTop: 1}}>
                        {formatPhone(waState.phone)}
                      </div>
                    )}
                  </div>
                </div>

<div className="row" style={{gap: 8, justifyContent: "flex-end"}}>
                  <button onClick={closeWaModal} className="btn primary" style={{fontSize: 13}}>
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {waState.qrcode && !waState.connected && (
              <div style={{textAlign: "center"}}>
                <div className="muted" style={{fontSize: 12, marginBottom: 14, lineHeight: 1.5}}>
                  Abra o WhatsApp → <strong>Dispositivos vinculados</strong> → <strong>Vincular um dispositivo</strong>
                </div>
                <img
                  src={waState.qrcode}
                  alt="QR Code WhatsApp"
                  style={{width: 220, height: 220, borderRadius: 8, border: "1px solid var(--border)"}}
                />
                <div className="muted" style={{fontSize: 11.5, marginTop: 10}}>
                  Aguardando leitura do QR Code...
                </div>
                <button onClick={loadQrCode} className="btn primary" style={{marginTop: 14, fontSize: 13}}>
                  Gerar novo QR Code
                </button>
              </div>
            )}

            {waState.error && (
              <div style={{textAlign: "center", padding: "20px 0"}}>
                <div style={{color: "#dc2626", fontSize: 13, marginBottom: 12}}>
                  {waState.error}
                </div>
                <button onClick={loadQrCode} className="btn primary" style={{fontSize: 13}}>
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

window.App = App;

// Mount
ReactDOM.createRoot(document.getElementById("app")).render(<App/>);
