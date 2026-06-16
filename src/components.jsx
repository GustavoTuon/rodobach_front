// Reusable UI atoms + icons for Norte Telemetria

const Icon = ({ name, size = 16, strokeWidth = 1.6, ...rest }) => {
  const s = size;
  const sw = strokeWidth;
  const common = {
    width: s, height: s, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor",
    strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round",
    ...rest,
  };
  switch (name) {
    case "dashboard":
      return <svg {...common}><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>;
    case "map":
      return <svg {...common}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>;
    case "truck":
      return <svg {...common}><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>;
    case "alert":
      return <svg {...common}><path d="M12 3 2 20h20z"/><path d="M12 10v5M12 17.5v.01"/></svg>;
    case "chart":
      return <svg {...common}><path d="M3 21V8M9 21V4M15 21v-9M21 21V12"/></svg>;
    case "plug":
      return <svg {...common}><path d="M9 7V3M15 7V3M6 11h12v3a6 6 0 0 1-12 0z"/><path d="M12 20v3"/></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M12 1.5v3M12 19.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1.5 12h3M19.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "filter":
      return <svg {...common}><path d="M4 5h16l-6 8v6l-4-2v-4z"/></svg>;
    case "chevron-right":
      return <svg {...common}><path d="m9 6 6 6-6 6"/></svg>;
    case "chevron-down":
      return <svg {...common}><path d="m6 9 6 6 6-6"/></svg>;
    case "arrow-up":
      return <svg {...common}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case "arrow-down":
      return <svg {...common}><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
    case "arrow-right":
      return <svg {...common}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case "external":
      return <svg {...common}><path d="M14 4h6v6M10 14 20 4M19 14v6H5V6h6"/></svg>;
    case "more":
      return <svg {...common}><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>;
    case "refresh":
      return <svg {...common}><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>;
    case "play":
      return <svg {...common}><path d="M6 4v16l14-8z"/></svg>;
    case "pause":
      return <svg {...common}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
    case "download":
      return <svg {...common}><path d="M12 4v12M6 12l6 6 6-6M4 20h16"/></svg>;
    case "speedometer":
      return <svg {...common}><path d="M3 13a9 9 0 1 1 18 0"/><path d="M12 13l5-3"/></svg>;
    case "fuel":
      return <svg {...common}><path d="M4 22V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v18"/><path d="M4 22h12"/><path d="M14 9h2a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2"/></svg>;
    case "gauge":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "wifi":
      return <svg {...common}><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="0.8" fill="currentColor"/></svg>;
    case "wifi-off":
      return <svg {...common}><path d="M2 8.8a13 13 0 0 1 5 -3M22 8.8a13 13 0 0 0 -5 -3M8.5 16a5 5 0 0 1 7 0"/><path d="M3 3l18 18"/></svg>;
    case "calendar":
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>;
    case "user":
      return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
    case "door":
      return <svg {...common}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M4 22h16"/><circle cx="15" cy="12" r="0.8" fill="currentColor"/></svg>;
    case "key":
      return <svg {...common}><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/></svg>;
    case "alarm":
      return <svg {...common}><circle cx="12" cy="13" r="8"/><path d="M5 4 2 7M19 4l3 3M12 9v5l3 1"/></svg>;
    case "lock":
      return <svg {...common}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
    case "link-off":
      return <svg {...common}><path d="M9 17H7a5 5 0 0 1 0-10h2M15 7h2a5 5 0 0 1 5 5M3 3l18 18"/></svg>;
    case "idle":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>;
    case "bell":
      return <svg {...common}><path d="M6 19a3 3 0 0 0 12 0M5 17h14l-1.5-3V10a5.5 5.5 0 1 0-11 0v4z"/></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 5 5 9-11"/></svg>;
    case "x":
      return <svg {...common}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>;
    case "wrench":
      return <svg {...common}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
    case "edit":
      return <svg {...common}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>;
    case "trash":
      return <svg {...common}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>;
    case "compass":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m9 15 2-6 6-2-2 6z"/></svg>;
    case "money":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5h4.5a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3H15"/></svg>;
    case "trending-up":
      return <svg {...common}><path d="M3 17l5-5 4 4 9-10"/><path d="M14 6h6v6"/></svg>;
    case "calculator":
      return <svg {...common}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h2M12 10h2M16 10h.01M8 14h2M12 14h2M16 14h2M8 18h2M12 18h2M16 18h2"/></svg>;
    case "route":
      return <svg {...common}><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>;
    case "file":
      return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;
    case "package":
      return <svg {...common}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>;
    case "copy":
      return <svg {...common}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
    case "whatsapp":
      return <svg {...common}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
  }
};

// Status badge for vehicle communication status
const StatusBadge = ({ status, size }) => {
  const map = {
    "online":   { cls: "ok",   lbl: "Online" },
    "atrasado": { cls: "warn", lbl: "Atrasado" },
    "sem-comm": { cls: "crit", lbl: "Sem comunicação" },
  };
  const m = map[status] || { cls: "", lbl: status };
  return <span className={`badge ${m.cls}`}><span className="dot"/>{m.lbl}</span>;
};

const SeverityBadge = ({ sev }) => {
  const m = { crit: "Crítico", warn: "Atenção", info: "Informativo", ok: "Normal" };
  return <span className={`badge ${sev}`}><span className="dot"/>{m[sev] || sev}</span>;
};

// Plate display
const Plate = ({ value, lg }) => <span className={`plate ${lg ? "lg" : ""}`}>{value}</span>;

// KPI tile
const KPI = ({ label, value, unit, delta, deltaDir, sub, icon }) => (
  <div className="kpi">
    <div className="kpi-label">
      {icon && <Icon name={icon}/>}
      <span>{label}</span>
    </div>
    <div className="kpi-value">{value}{unit && <span className="unit">{unit}</span>}</div>
    {(delta || sub) && (
      <div className="row" style={{gap: 8}}>
        {delta && (
          <span className={`kpi-delta ${deltaDir || "flat"}`}>
            {deltaDir === "up" && "▲ "}
            {deltaDir === "down" && "▼ "}
            {delta}
          </span>
        )}
        {sub && <span className="kpi-sub">{sub}</span>}
      </div>
    )}
  </div>
);

// Format helpers
function fmtNum(n, opts = {}) {
  return new Intl.NumberFormat("pt-BR", opts).format(n);
}
function fmtKm(n) { return fmtNum(n) + " km"; }
function pad(n) { return String(n).padStart(2, "0"); }

// Minibar from array of numbers
const MiniBar = ({ values, accent, height = 22 }) => {
  const max = Math.max(...values, 1);
  return (
    <div className={`minibar ${accent ? "accent" : ""}`} style={{ height }}>
      {values.map((v, i) => (
        <i key={i} style={{ height: `${Math.max(8, (v / max) * height)}px` }}/>
      ))}
    </div>
  );
};

// Sparkline (svg path)
const Sparkline = ({ values, width = 120, height = 30, color = "currentColor" }) => {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - ((v - min) / range) * (height - 2) - 1]);
  const d = "M " + pts.map(p => p.join(",")).join(" L ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

// Horizontal bar chart (already styled via .chart-bars)
const BarChart = ({ rows }) => {
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <div className="chart-bars">
      {rows.map((r, i) => (
        <div className="row" key={i}>
          <div className="label">{r.label}</div>
          <div className="bar-track">
            <div className={`bar-fill ${r.sev || ""}`} style={{ width: `${(r.value / max) * 100}%` }}/>
          </div>
          <div className="val">{fmtNum(r.value)}</div>
        </div>
      ))}
    </div>
  );
};

// Tabs
const Tabs = ({ tabs, active, onChange }) => (
  <div className="tabs">
    {tabs.map(t => (
      <button key={t.id} className={`tab ${active === t.id ? "active" : ""}`} onClick={() => onChange(t.id)}>
        {t.label}
        {t.count != null && <span className="count">{t.count}</span>}
      </button>
    ))}
  </div>
);

const RBCombobox = ({ value, onChange, options = [], placeholder = "Todos", getLabel, getValue, tag, transform, max = 8 }) => {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const labelOf = (item) => getLabel ? getLabel(item) : String(item ?? "");
  const valueOf = (item) => getValue ? getValue(item) : labelOf(item);
  const normalizedValue = String(value || "");
  const query = normalizedValue.trim().toLowerCase();
  const unique = [];
  const seen = new Set();

  for (const option of options || []) {
    const label = labelOf(option);
    const optionValue = valueOf(option);
    const key = String(optionValue || label).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({ raw: option, label, value: optionValue });
  }

  const filtered = unique
    .filter((item) => !query || `${item.label} ${item.value}`.toLowerCase().includes(query))
    .slice(0, max);

  const select = (item) => {
    onChange(String(item.value || ""));
    setOpen(false);
    setActive(0);
  };

  return (
    <div className="rb-combo" ref={ref}>
      <input
        value={normalizedValue}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const next = transform ? transform(event.target.value) : event.target.value;
          onChange(next);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter" && open && filtered[active]) {
            event.preventDefault();
            select(filtered[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && filtered.length > 0 && (
        <div className="rb-combo-menu">
          {filtered.map((item, index) => (
            <button
              key={`${item.value}-${index}`}
              type="button"
              className={index === active ? "active" : ""}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                select(item);
              }}
            >
              <span>{item.label}</span>
              {tag && <em>{tag(item.raw)}</em>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

Object.assign(window, {
  Icon, StatusBadge, SeverityBadge, Plate, KPI, MiniBar, Sparkline, BarChart, Tabs, RBCombobox,
  fmtNum, fmtKm, pad,
});
