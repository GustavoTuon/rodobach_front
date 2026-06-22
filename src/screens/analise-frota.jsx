function afTodayISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function afDaysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function afNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function afRows(value) {
  return Array.isArray(value) ? value : [];
}

function afBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(afNum(value));
}

function afPlain(value, digits = 0) {
  return afNum(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function afPct(value) {
  return `${afNum(value).toFixed(1).replace(".", ",")}%`;
}

function afShort(value, prefix = "R$ ") {
  const raw = afNum(value);
  const n = Math.abs(raw);
  const sign = raw < 0 ? "-" : "";
  if (n >= 1000000) return `${sign}${prefix}${(n / 1000000).toFixed(1).replace(".", ",")} Mi`;
  if (n >= 1000) return `${sign}${prefix}${(n / 1000).toFixed(1).replace(".", ",")} Mil`;
  return `${sign}${prefix}${Math.round(n).toLocaleString("pt-BR")}`;
}

function afDate(value) {
  if (!value) return "-";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "-";
}

function afMax(rows, key) {
  return Math.max(1, ...afRows(rows).map((row) => Math.abs(afNum(row[key]))));
}

function afGroup(rows, key, valueKey) {
  const map = new Map();
  afRows(rows).forEach((row) => {
    const label = row[key] || "Nao informado";
    const current = map.get(label) || { label, value: 0, count: 0 };
    current.value += afNum(row[valueKey]);
    current.count += 1;
    map.set(label, current);
  });
  return [...map.values()].sort((a, b) => b.value - a.value);
}

function afFormat(format, value, row) {
  return typeof format === "function" && format.length >= 2 ? format(value, row) : format(value);
}

const AF_STATUS_LABEL = { pago: "Pago", aberto: "Em aberto", vencido: "Vencido", cancelado: "Cancelado" };
const AF_STATUS_COLOR = { pago: "#28a86b", aberto: "#f0c84b", vencido: "#e74b4b", cancelado: "#7f8b9a" };
const AF_COLORS = ["#2f8f5b", "#4d8fe8", "#f0c84b", "#d68a31", "#9d7bea", "#e35d6a"];

function afInjectStyles() {
  const id = "rb-analise-frota-style";
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const s = document.createElement("style");
  s.id = id;
  s.textContent = `
    .fb-view { height:100%; min-height:0; display:flex; flex-direction:column; gap:12px; overflow:hidden; color:var(--text); }
    .fb-shell { min-height:0; flex:1; display:grid; grid-template-rows:auto auto auto minmax(0, 1fr); gap:12px; overflow:hidden; }
    .fb-top { display:grid; grid-template-columns:minmax(220px, 1fr) auto; gap:14px; align-items:start; }
    .fb-title h1 { margin:0; font-size:25px; line-height:1.1; letter-spacing:0; font-weight:760; }
    .fb-title .sub { margin-top:5px; color:var(--muted); font-size:12.5px; }
    .fb-tabs { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:6px; }
    .fb-tab { height:36px; border:1px solid var(--border); background:var(--surface); color:var(--text-2); border-radius:9px; padding:0 12px; display:inline-flex; align-items:center; gap:7px; font-size:12.5px; cursor:pointer; transition:background .15s,border-color .15s; }
    .fb-tab:hover { border-color:color-mix(in oklab, #2f8f5b 40%, var(--border)); }
    .fb-tab.active { color:#fff; border-color:#2f8f5b; background:#1f6f45; }
    .fb-exec-summary { display:flex; align-items:center; gap:10px; border:1px solid var(--border); border-left:4px solid #4d8fe8; background:linear-gradient(180deg, var(--surface), color-mix(in oklab, var(--surface) 86%, #000)); border-radius:10px; padding:10px 14px; font-size:13px; color:var(--text-2); }
    .fb-exec-summary strong { color:var(--text); }
    .fb-filters-bar { display:flex; flex-wrap:wrap; align-items:end; gap:10px; padding:12px 14px; border:1px solid var(--border); background:linear-gradient(180deg, var(--surface), color-mix(in oklab, var(--surface) 84%, #000)); border-radius:10px; }
    .fb-filters-row { display:flex; flex-wrap:wrap; align-items:end; gap:10px; flex:1; min-width:0; }
    .fb-filters-advanced { width:100%; display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-top:10px; padding-top:10px; border-top:1px dashed var(--divider); }
    .fb-filters-toggle { height:32px; border:1px solid var(--border); background:var(--surface-2); color:var(--text-2); border-radius:7px; padding:0 12px; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; white-space:nowrap; }
    .fb-field { display:flex; flex-direction:column; gap:4px; min-width:118px; }
    .fb-field label { color:var(--muted); font-size:10.5px; text-transform:uppercase; letter-spacing:.03em; }
    .fb-field input, .fb-field select { height:32px; min-width:0; border:1px solid var(--border); border-radius:7px; background:var(--surface-2); color:var(--text); padding:0 9px; font-size:12.5px; }
    .fb-stage { min-height:0; overflow:auto; padding-right:2px; }
    .fb-screen { min-height:0; display:grid; grid-template-rows:auto minmax(0, 1fr); gap:12px; }
    .fb-kpis { display:grid; grid-template-columns:repeat(6, minmax(0, 1fr)); gap:10px; }
    .fb-kpi { min-width:0; min-height:96px; border:1px solid var(--border); border-radius:10px; background:linear-gradient(180deg, color-mix(in oklab, var(--surface) 92%, #fff), var(--surface)); padding:13px 14px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 10px 24px rgba(0,0,0,.14); border-top:3px solid var(--tone, #4d8fe8); }
    .fb-kpi .label { color:var(--muted); font-size:11.5px; display:flex; align-items:center; gap:6px; min-width:0; }
    .fb-kpi .value { font-size:23px; line-height:1.12; font-weight:760; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .fb-kpi .hint { font-size:11px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .fb-grid { min-height:0; display:grid; gap:12px; }
    .fb-grid.general { grid-template-columns:1.55fr .9fr .95fr; grid-template-rows: minmax(250px, 1fr) minmax(190px, .75fr); }
    .fb-grid.fuel { grid-template-columns:1fr 1.05fr 1fr; grid-template-rows:minmax(230px, .95fr) minmax(220px, 1fr) minmax(150px, .55fr); }
    .fb-grid.maint { grid-template-columns:1.05fr .92fr 1.08fr; grid-template-rows:minmax(230px, 1fr) minmax(210px, .92fr); }
    .fb-grid.costs { grid-template-columns:1.05fr .82fr 1fr; grid-template-rows:minmax(230px, 1fr) minmax(210px, .86fr); }
    .fb-grid.profit { grid-template-columns:1.12fr .9fr .98fr; grid-template-rows:minmax(250px, 1fr) minmax(210px, .86fr); }
    .fb-grid.audit { grid-template-columns:1fr 1fr; grid-template-rows:auto minmax(260px, 1fr); }
    .fb-panel { min-width:0; min-height:0; overflow:hidden; border:1px solid var(--border); border-radius:10px; background:var(--surface); padding:14px; display:flex; flex-direction:column; box-shadow:0 12px 28px rgba(0,0,0,.16); }
    .fb-panel.hero { background:linear-gradient(145deg, color-mix(in oklab, #1f6f45 26%, var(--surface)), var(--surface) 72%); border-color:color-mix(in oklab, #2f8f5b 36%, var(--border)); }
    .fb-panel-head { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:11px; flex-shrink:0; }
    .fb-panel h2 { margin:0; font-size:15px; line-height:1.15; letter-spacing:0; font-weight:700; }
    .fb-panel .meta { color:var(--muted); font-size:11px; margin-top:2px; }
    .fb-span-2 { grid-column:span 2; }
    .fb-line { width:100%; height:100%; min-height:160px; display:block; overflow:visible; }
    .fb-legend { display:flex; flex-wrap:wrap; gap:13px; color:var(--text-2); font-size:11px; }
    .fb-legend i { display:inline-block; width:9px; height:9px; border-radius:3px; margin-right:5px; vertical-align:middle; }
    .fb-hbars, .fb-columns, .fb-alerts, .fb-list { min-height:0; overflow:auto; display:grid; gap:9px; align-content:start; }
    .fb-hbar { display:grid; grid-template-columns:minmax(72px, .82fr) 1fr auto; gap:8px; align-items:center; font-size:12.5px; color:var(--text-2); }
    .fb-hbar .name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .fb-hbar .track { height:13px; background:var(--surface-3); border-radius:6px; overflow:hidden; }
    .fb-hbar .fill { height:100%; border-radius:6px; }
    .fb-hbar strong { font-family:var(--font-mono); font-size:11.5px; color:var(--text); white-space:nowrap; }
    .fb-columns { grid-auto-flow:column; grid-auto-columns:1fr; align-items:end; gap:11px; padding-top:8px; }
    .fb-col { min-width:0; display:grid; grid-template-rows:1fr auto; gap:6px; height:100%; }
    .fb-col .bar { align-self:end; border-radius:6px 6px 0 0; min-height:8px; }
    .fb-col span { color:var(--muted); font-size:10px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .fb-donut-wrap { min-height:0; display:grid; grid-template-columns:150px 1fr; gap:14px; align-items:center; }
    .fb-donut { width:138px; aspect-ratio:1; border-radius:50%; background:conic-gradient(var(--surface-3) 0 360deg); position:relative; margin:auto; }
    .fb-donut:after { content:""; position:absolute; inset:31px; border-radius:50%; background:var(--surface); border:1px solid var(--border); }
    .fb-donut .center { position:absolute; inset:0; display:grid; place-items:center; z-index:1; text-align:center; padding:38px; }
    .fb-donut .center strong { font-size:16px; line-height:1; }
    .fb-legend-list { display:grid; gap:8px; min-width:0; }
    .fb-legend-row { display:grid; grid-template-columns:10px minmax(0, 1fr) auto; gap:8px; align-items:center; font-size:12px; color:var(--text-2); }
    .fb-dot { width:9px; height:9px; border-radius:50%; }
    .fb-gauge-box { height:100%; min-height:0; display:grid; place-items:center; text-align:center; }
    .fb-gauge { width:min(315px, 90%); aspect-ratio:2 / 1; border-radius:999px 999px 0 0; background:conic-gradient(from 270deg at 50% 100%, #e74b4b 0deg, #f0c84b 62deg, #2f8f5b var(--angle), var(--surface-3) var(--angle) 180deg); position:relative; overflow:hidden; }
    .fb-gauge:after { content:""; position:absolute; left:13%; right:13%; bottom:0; height:74%; border-radius:999px 999px 0 0; background:var(--surface); border:1px solid var(--border); border-bottom:0; }
    .fb-gauge-value { margin-top:-44px; position:relative; z-index:1; }
    .fb-gauge-value strong { display:block; font-size:38px; line-height:1; font-weight:760; }
    .fb-gauge-value span { display:block; color:var(--muted); font-size:12px; margin-top:4px; }
    .fb-alert { border:1px solid var(--border); border-left:4px solid #f0c84b; border-radius:9px; padding:10px 11px; background:var(--surface-2); display:flex; justify-content:space-between; gap:10px; align-items:center; font-size:12.5px; }
    .fb-alert.crit { border-left-color:#e74b4b; }
    .fb-alert.ok { border-left-color:#2f8f5b; }
    .fb-alert span { color:var(--text-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .fb-alert strong { color:var(--text); font-family:var(--font-mono); white-space:nowrap; }
    .fb-table-wrap { min-height:0; overflow:auto; }
    .fb-table { width:100%; border-collapse:collapse; font-size:12.5px; }
    .fb-table th { position:sticky; top:0; background:var(--surface); color:var(--muted); text-align:left; font-weight:600; padding:8px 7px; border-bottom:1px solid var(--divider); }
    .fb-table td { color:var(--text-2); padding:8px 7px; border-bottom:1px solid var(--divider); white-space:nowrap; }
    .fb-table .num { text-align:right; font-family:var(--font-mono); color:var(--text); }
    .fb-grouped-bars { min-height:0; overflow:auto; display:grid; gap:11px; align-content:start; }
    .fb-grouped-bar { display:grid; grid-template-columns:minmax(60px, .5fr) 1fr; gap:10px; align-items:center; }
    .fb-grouped-bar .name { font-size:12px; color:var(--text-2); font-family:var(--font-mono); }
    .fb-grouped-bar .bars { display:grid; gap:3px; }
    .fb-grouped-bar .bar { height:9px; border-radius:4px; min-width:2px; }
    .fb-grouped-bar .bar.receita { background:#2f8f5b; }
    .fb-grouped-bar .bar.custo { background:#e74b4b; }
    .fb-badge { display:inline-flex; align-items:center; gap:5px; border-radius:999px; padding:2px 9px; font-size:10.5px; font-weight:700; }
    .fb-badge.warn { background:color-mix(in oklab, #f0c84b 22%, transparent); color:#f0c84b; border:1px solid color-mix(in oklab, #f0c84b 45%, transparent); }
    .fb-empty { height:100%; min-height:80px; display:grid; place-items:center; color:var(--muted); font-size:12px; text-align:center; padding:16px; }
    .fb-modal-backdrop { position:fixed; inset:0; z-index:1000; background:rgba(0,0,0,.56); display:grid; place-items:center; padding:18px; }
    .fb-modal { width:min(1040px, calc(100vw - 32px)); max-height:82vh; min-height:360px; }
    @media (max-width: 1240px) {
      .fb-kpis { grid-template-columns:repeat(3, minmax(0, 1fr)); }
      .fb-grid.general, .fb-grid.fuel, .fb-grid.maint, .fb-grid.costs, .fb-grid.profit, .fb-grid.audit { grid-template-columns:1fr; grid-template-rows:none; }
      .fb-span-2 { grid-column:auto; }
      .fb-view, .fb-shell { overflow:auto; height:auto; }
      .fb-filters-row, .fb-filters-advanced { grid-template-columns:repeat(2, minmax(0, 1fr)); }
      .fb-top { grid-template-columns:1fr; }
      .fb-tabs { justify-content:flex-start; }
    }
  `;
  document.head.appendChild(s);
}

const AF_TABS = [
  { id: "geral", label: "Visão Geral", icon: "dashboard" },
  { id: "abastecimento", label: "Abastecimento", icon: "fuel" },
  { id: "manutencao", label: "Manutenção", icon: "wrench" },
  { id: "custos", label: "Custos", icon: "money" },
  { id: "lucro", label: "Lucro por Veículo", icon: "trending-up" },
  { id: "auditoria", label: "Auditoria", icon: "alert" },
];

const BIKpi = ({ label, value, hint, icon, tone }) => (
  <div className="fb-kpi" style={{ "--tone": tone || "#4d8fe8" }}>
    <div className="label"><Icon name={icon || "chart"} size={14}/><span>{label}</span></div>
    <div className="value" title={String(value)}>{value}</div>
    <div className="hint">{hint || " "}</div>
  </div>
);

const BIPanel = ({ title, meta, children, className, action }) => (
  <section className={`fb-panel${className ? ` ${className}` : ""}`}>
    <div className="fb-panel-head">
      <div><h2>{title}</h2>{meta && <div className="meta">{meta}</div>}</div>
      {action}
    </div>
    {children}
  </section>
);

const BIHBar = ({ rows, labelKey = "label", valueKey = "value", format = afShort, color = "#2f8f5b", limit = 5, emptyMessage }) => {
  const items = afRows(rows).slice(0, limit);
  const max = afMax(items, valueKey);
  if (!items.length) return <div className="fb-empty">{emptyMessage || "Sem dados no período."}</div>;
  return (
    <div className="fb-hbars">
      {items.map((row, index) => (
        <div className="fb-hbar" key={`${row[labelKey] || row.placa || index}-${index}`}>
          <span className="name" title={row[labelKey]}>{row[labelKey]}</span>
          <div className="track"><div className="fill" style={{ width: `${Math.min(100, Math.abs(afNum(row[valueKey])) / max * 100).toFixed(1)}%`, background: row.color || color }}/></div>
          <strong>{afFormat(format, row[valueKey], row)}</strong>
        </div>
      ))}
    </div>
  );
};

const BIColumns = ({ rows, labelKey = "label", valueKey = "value", color = "#2f8f5b", format, emptyMessage }) => {
  const items = afRows(rows).slice(0, 7);
  const max = afMax(items, valueKey);
  if (!items.length) return <div className="fb-empty">{emptyMessage || "Sem dados no período."}</div>;
  return (
    <div className="fb-columns">
      {items.map((row, index) => (
        <div className="fb-col" key={`${row[labelKey] || index}-${index}`} title={`${row[labelKey]} - ${format ? afFormat(format, row[valueKey], row) : row[valueKey]}`}>
          <div className="bar" style={{ height: `${Math.max(8, Math.abs(afNum(row[valueKey])) / max * 100).toFixed(1)}%`, background: row.color || color }}/>
          <span>{row[labelKey]}</span>
        </div>
      ))}
    </div>
  );
};

function donutGradient(rows) {
  const total = afRows(rows).reduce((sum, row) => sum + Math.abs(afNum(row.value)), 0);
  let cursor = 0;
  const parts = afRows(rows).slice(0, 6).map((row, index) => {
    const pct = total > 0 ? Math.abs(afNum(row.value)) / total * 100 : 0;
    const start = cursor;
    cursor += pct;
    return `${row.color || AF_COLORS[index % AF_COLORS.length]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });
  if (cursor < 100) parts.push(`var(--surface-3) ${cursor.toFixed(2)}% 100%`);
  return `conic-gradient(${parts.join(", ")})`;
}

const BIDonut = ({ rows, center, format = afShort, emptyMessage }) => {
  const items = afRows(rows).slice(0, 6);
  if (!items.length) return <div className="fb-empty">{emptyMessage || "Sem dados no período."}</div>;
  return (
    <div className="fb-donut-wrap">
      <div className="fb-donut" style={{ background: donutGradient(items) }}>
        <div className="center"><strong>{center}</strong></div>
      </div>
      <div className="fb-legend-list">
        {items.map((row, index) => (
          <div className="fb-legend-row" key={`${row.label}-${index}`}>
            <i className="fb-dot" style={{ background: row.color || AF_COLORS[index % AF_COLORS.length] }}/>
            <span title={row.label}>{row.label}</span>
            <strong>{afFormat(format, row.value, row)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const BIGauge = ({ value, max = 4, label, sub, color }) => {
  const ratio = Math.max(0, Math.min(1, afNum(value) / Math.max(1, max)));
  const angle = 25 + ratio * 155;
  return (
    <div className="fb-gauge-box">
      <div>
        <div className="fb-gauge" style={{ "--angle": `${angle}deg` }}/>
        <div className="fb-gauge-value">
          <strong style={{ color: color || "var(--text)" }}>{afPlain(value, 2)}</strong>
          <span>{label}</span>
          {sub && <span>{sub}</span>}
        </div>
      </div>
    </div>
  );
};

const BILine = ({ data, series, format = afShort, emptyMessage }) => {
  const rows = afRows(data);
  if (!rows.length) return <div className="fb-empty">{emptyMessage || "Sem evolução no período."}</div>;
  const w = 760, h = 230, p = { l: 14, r: 16, t: 14, b: 18 };
  const values = rows.flatMap((row) => series.map((s) => afNum(row[s.key])));
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = max - min || 1;
  const xFor = (i) => p.l + (rows.length === 1 ? 0 : i * ((w - p.l - p.r) / (rows.length - 1)));
  const yFor = (v) => p.t + (h - p.t - p.b) * (1 - ((afNum(v) - min) / range));
  const points = (key) => rows.map((row, i) => `${xFor(i).toFixed(1)},${yFor(row[key]).toFixed(1)}`).join(" ");
  const zeroY = yFor(0);
  const step = Math.max(1, Math.ceil(rows.length / 6));
  return (
    <>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="fb-line">
        <line x1={p.l} y1={zeroY} x2={w - p.r} y2={zeroY} stroke="var(--divider)" strokeDasharray="4 6"/>
        {[0.25, 0.5, 0.75].map((k) => <line key={k} x1={p.l} x2={w - p.r} y1={p.t + (h - p.t - p.b) * k} y2={p.t + (h - p.t - p.b) * k} stroke="var(--divider)" opacity=".55"/>)}
        {series.map((s) => (
          <polyline key={s.key} points={points(s.key)} fill="none" stroke={s.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        ))}
        {series.slice(0, 1).map((s) => rows.map((row, i) => <circle key={`${s.key}-${i}`} cx={xFor(i)} cy={yFor(row[s.key])} r="3.2" fill={s.color}/>))}
      </svg>
      <div className="fb-legend">
        {series.map((s) => {
          const total = rows.reduce((sum, row) => sum + afNum(row[s.key]), 0);
          return <span key={s.key}><i style={{ background:s.color }}/>{s.label}: {format(total)}</span>;
        })}
      </div>
      <div className="fb-legend" style={{ justifyContent:"space-between", marginTop:4 }}>
        {rows.map((row, i) => (i % step === 0 || i === rows.length - 1 ? <span key={`${row.mes}-${i}`}>{row.label || row.mes}</span> : null))}
      </div>
    </>
  );
};

const BIGroupedBars = ({ rows, limit = 8, emptyMessage }) => {
  const items = afRows(rows)
    .filter((r) => afNum(r.receita) !== 0 || afNum(r.custo) !== 0)
    .sort((a, b) => Math.abs(afNum(b.lucro)) - Math.abs(afNum(a.lucro)))
    .slice(0, limit);
  if (!items.length) return <div className="fb-empty">{emptyMessage || "Sem dados para comparar no período."}</div>;
  const max = Math.max(1, ...items.flatMap((r) => [Math.abs(afNum(r.receita)), Math.abs(afNum(r.custo)), Math.abs(afNum(r.lucro))]));
  return (
    <>
      <div className="fb-grouped-bars">
        {items.map((row, index) => (
          <div className="fb-grouped-bar" key={`${row.placa}-${index}`}>
            <span className="name" title={row.placa}>{row.placa}</span>
            <div className="bars">
              <div className="bar receita" style={{ width: `${Math.min(100, Math.abs(afNum(row.receita)) / max * 100).toFixed(1)}%` }} title={`Receita: ${afBRL(row.receita)}`}/>
              <div className="bar custo" style={{ width: `${Math.min(100, Math.abs(afNum(row.custo)) / max * 100).toFixed(1)}%` }} title={`Custo: ${afBRL(row.custo)}`}/>
              <div className="bar" style={{ width: `${Math.min(100, Math.abs(afNum(row.lucro)) / max * 100).toFixed(1)}%`, background: afNum(row.lucro) >= 0 ? "#2f8f5b" : "#e74b4b" }} title={`Lucro: ${afBRL(row.lucro)}`}/>
            </div>
          </div>
        ))}
      </div>
      <div className="fb-legend" style={{ marginTop:10 }}>
        <span><i style={{ background:"#2f8f5b" }}/>Receita</span>
        <span><i style={{ background:"#e74b4b" }}/>Custo</span>
        <span><i style={{ background:"#4d8fe8" }}/>Lucro (verde = positivo, vermelho = prejuízo)</span>
      </div>
    </>
  );
};

const BIAlertList = ({ rows, emptyMessage }) => {
  const items = afRows(rows).slice(0, 5);
  if (!items.length) return <div className="fb-empty">{emptyMessage || "Nenhum alerta crítico no período."}</div>;
  return (
    <div className="fb-alerts">
      {items.map((row, index) => (
        <div className={`fb-alert ${row.tone || ""}`} key={index}>
          <span title={row.label}>{row.label}</span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  );
};

const BITinyTable = ({ columns, rows, limit = 6, emptyMessage }) => {
  const items = afRows(rows).slice(0, limit);
  if (!items.length) return <div className="fb-empty">{emptyMessage || "Sem registros para exibir."}</div>;
  return (
    <div className="fb-table-wrap">
      <table className="fb-table">
        <thead><tr>{columns.map((c) => <th key={c.key} className={c.num ? "num" : ""}>{c.label}</th>)}</tr></thead>
        <tbody>
          {items.map((row, index) => (
            <tr key={row.id || row.placa || row.label || index}>
              {columns.map((c) => <td key={c.key} className={c.num ? "num" : ""}>{c.render ? c.render(row) : row[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AnaliseFrota = () => {
  const [tab, setTab] = React.useState("geral");
  const [dataInicio, setDataInicio] = React.useState(afDaysAgoISO(120));
  const [dataFim, setDataFim] = React.useState(afTodayISO());
  const [placa, setPlaca] = React.useState("");
  const [centro, setCentro] = React.useState("");
  const [proprietario, setProprietario] = React.useState("frota");
  const [fornecedor, setFornecedor] = React.useState("");
  const [modelo, setModelo] = React.useState("");
  const [marca, setMarca] = React.useState("");
  const [ano, setAno] = React.useState("");
  const [tipoCusto, setTipoCusto] = React.useState("");
  const [situacao, setSituacao] = React.useState("");
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [filters, setFilters] = React.useState({ dataInicio: afDaysAgoISO(120), dataFim: afTodayISO(), proprietario: "frota" });
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [detail, setDetail] = React.useState(null);

  React.useEffect(() => { afInjectStyles(); }, []);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    window.RB_API.getAnaliseFrota({ ...filters, limit: 260 })
      .then((payload) => { if (active) setData(payload); })
      .catch((err) => { if (active) { setData(null); setError(err?.message || "Não foi possível carregar a análise de frota."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [JSON.stringify(filters)]);

  const applyFilters = () => setFilters({ dataInicio, dataFim, placa, centro, proprietario, fornecedor, modelo, marca, ano, tipoCusto, situacao });
  const clearFilters = () => {
    const start = afDaysAgoISO(120);
    const end = afTodayISO();
    setDataInicio(start); setDataFim(end); setPlaca(""); setCentro(""); setProprietario("frota"); setFornecedor("");
    setModelo(""); setMarca(""); setAno(""); setTipoCusto(""); setSituacao("");
    setFilters({ dataInicio:start, dataFim:end, proprietario:"frota" });
  };

  const geral = data?.visaoGeral || {};
  const custos = data?.custos || {};
  const manutBi = data?.manutencaoBi || {};
  const abastecimento = data?.abastecimento || {};
  const lucro = data?.lucro || {};
  const auditoria = data?.auditoria || {};
  const relatorio = data?.relatorio || {};
  const monthly = afRows(custos.monthly);
  const fuel = abastecimento.summary || {};
  const maint = manutBi.resumo || {};
  const tipoOptions = afRows(custos.types).map((row) => row.tipo).filter(Boolean);
  const situacaoOptions = afRows(custos.status).map((row) => row.situacao).filter(Boolean);
  const costByCenter = afGroup(custos.launches, "centroCusto", "valor").slice(0, 5);

  const placasCriticas = (() => {
    const rows = afRows(manutBi.rankingPlacas);
    if (!rows.length) return [];
    const maxValor = afMax(rows, "valor");
    const maxQtd = afMax(rows, "quantidade");
    return rows
      .map((r) => ({ ...r, score: (afNum(r.valor) / maxValor) * 0.6 + (afNum(r.quantidade) / maxQtd) * 0.4 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  })();

  const alerts = [
    ...afRows(abastecimento.alertas?.veiculosConsumoBaixo).map((r) => ({ tone:"crit", label:`Consumo abaixo da média: ${r.placa}`, value:`${afPlain(r.media, 2)} km/l` })),
    ...afRows(abastecimento.alertas?.postosPrecoAlto).map((r) => ({ tone:"", label:`Posto acima da média: ${r.fornecedor}`, value:afBRL(r.valorMedio) })),
    ...(afNum(auditoria.registrosSemPlaca) ? [{ tone:"crit", label:"Custos sem placa resolvida", value:afPlain(auditoria.registrosSemPlaca) }] : []),
    ...(afNum(auditoria.receitasSemVeiculo) ? [{ tone:"crit", label:"Receitas sem placa", value:afPlain(auditoria.receitasSemVeiculo) }] : []),
    ...(afNum(auditoria.abastecimentosSemKm) ? [{ tone:"", label:"Abastecimentos sem km", value:afPlain(auditoria.abastecimentosSemKm) }] : []),
  ];

  const renderLoading = () => {
    if (loading) return <div className="fb-empty">Carregando dashboard de frota...</div>;
    if (error) return <div className="fb-empty" style={{ color:"#e74b4b" }}>{error}</div>;
    if (!data) return <div className="fb-empty">Sem dados para o período selecionado.</div>;
    return null;
  };

  const renderKpis = (items) => <div className="fb-kpis">{items.map((item) => <BIKpi key={item.label} {...item}/>)}</div>;

  const renderExecSummary = (text) => <div className="fb-exec-summary"><Icon name="dashboard" size={15}/><span>{text}</span></div>;

  const renderGeral = () => {
    const tone = afNum(geral.lucroTotal) >= 0 ? "lucro" : "prejuízo";
    const summaryText = data
      ? <>Frota em <strong>{tone}</strong> de <strong>{afBRL(geral.lucroTotal)}</strong> no período (margem {afPct(geral.margem)}), com custo de <strong>{afBRL(geral.custoPorKm)}</strong> por km.</>
      : "Carregando resumo executivo...";
    return (
      <div className="fb-screen">
        {renderExecSummary(summaryText)}
        {renderKpis([
          { label:"Veículos em operação", value:afPlain(geral.veiculosOperacao), hint:`${data?.inventario?.frota || 0} frota | ${data?.inventario?.terceiros || 0} terceiros`, icon:"truck", tone:"#4d8fe8" },
          { label:"Receita total", value:afBRL(geral.receitaTotal), hint:"logística.conhecimentos (CT-e)", icon:"trending-up", tone:"#2f8f5b" },
          { label:"Custo total", value:afBRL(geral.custoTotal), hint:"financeiro + operacional", icon:"money", tone:"#e74b4b" },
          { label:"Lucro / prejuízo", value:afBRL(geral.lucroTotal), hint:"receita - custos", icon:"chart", tone:afNum(geral.lucroTotal) >= 0 ? "#2f8f5b" : "#e74b4b" },
          { label:"Margem", value:afPct(geral.margem), hint:"lucro / receita", icon:"gauge", tone:afNum(geral.margem) >= 0 ? "#2f8f5b" : "#e74b4b" },
          { label:"Custo por km", value:afBRL(geral.custoPorKm), hint:"abastecimento / km", icon:"speedometer", tone:"#9d7bea" },
        ])}
        <div className="fb-grid general">
          <BIPanel title="Receita x Custo x Lucro" meta="Evolução mensal da frota" className="fb-span-2">
            <BILine data={monthly} series={[
              { key:"receita", label:"Receita", color:"#2f8f5b" },
              { key:"custo", label:"Custo", color:"#e74b4b" },
              { key:"lucro", label:"Lucro", color:"#4d8fe8" },
            ]}/>
          </BIPanel>
          <BIPanel title="Alertas executivos" meta="Top problemas do período">
            <BIAlertList rows={alerts} emptyMessage="Nenhum alerta crítico no período."/>
          </BIPanel>
          <BIPanel title="Custos por categoria">
            <BIDonut rows={afRows(custos.types).slice(0, 6).map((r, i) => ({ label:r.tipo, value:r.custo, color:AF_COLORS[i] }))} center={afShort(geral.custoTotal)}/>
          </BIPanel>
          <BIPanel title="Top 5 veículos com maior custo">
            <BIHBar rows={afRows(custos.ranking).map((r) => ({ label:r.placa, value:r.custo }))} color="#e74b4b" limit={5}/>
          </BIPanel>
          <BIPanel title="Margem da frota">
            <BIGauge value={Math.max(0, afNum(geral.margem))} max={35} label="margem geral" sub={afBRL(geral.lucroTotal)} color={afNum(geral.lucroTotal) >= 0 ? "#2f8f5b" : "#e74b4b"}/>
          </BIPanel>
        </div>
      </div>
    );
  };

  const renderAbastecimento = () => {
    const worst = [...afRows(abastecimento.ranking)].filter((r) => afNum(r.media) > 0).sort((a, b) => afNum(a.media) - afNum(b.media)).slice(0, 5);
    const summaryText = data
      ? <>Frota consumindo em média <strong>{afPlain(fuel.mediaFrota, 2)} km/l</strong>, com custo de <strong>{afBRL(fuel.reaisKm)}</strong> por km no período.</>
      : "Carregando resumo executivo...";
    return (
      <div className="fb-screen">
        {renderExecSummary(summaryText)}
        {renderKpis([
          { label:"Veículos abastecidos", value:afPlain(fuel.veiculos), hint:`${afPlain(fuel.abastecimentos)} abastecimentos`, icon:"truck", tone:"#4d8fe8" },
          { label:"Km rodado", value:afPlain(fuel.km), hint:"diferença de odômetro", icon:"route", tone:"#9d7bea" },
          { label:"Litros", value:afPlain(fuel.litros, 0), hint:"diesel abastecido", icon:"fuel", tone:"#f0c84b" },
          { label:"Valor abastecido", value:afBRL(fuel.valor), hint:"total operacional", icon:"money", tone:"#e74b4b" },
          { label:"Preço médio", value:afBRL(fuel.precoMedio), hint:"por litro", icon:"chart", tone:"#4d8fe8" },
          { label:"R$/km", value:afBRL(fuel.reaisKm), hint:"valor / km", icon:"speedometer", tone:"#2f8f5b" },
        ])}
        <div className="fb-grid fuel">
          <BIPanel title="Média geral da frota" meta="km/l em destaque" className="hero">
            <BIGauge value={fuel.mediaFrota} max={4} label="km/l médio" sub="Meta visual: quanto maior, melhor" color="#2f8f5b"/>
          </BIPanel>
          <BIPanel title="Preço diesel por mês" className="fb-span-2">
            <BILine data={abastecimento.monthly} series={[{ key:"precoMedio", label:"Preço médio/litro", color:"#4d8fe8" }]} format={(v) => afBRL(v)} emptyMessage="Sem histórico de preço no período."/>
          </BIPanel>
          <BIPanel title="Média por tipo">
            <BIColumns rows={afRows(abastecimento.modelos).slice(0, 5).map((r, i) => ({ label:r.modelo, value:r.media, color:i < 2 ? "#2f8f5b" : "#f0c84b" }))} valueKey="value" format={(v) => `${afPlain(v, 2)} km/l`}/>
          </BIPanel>
          <BIPanel title="Média por marca">
            <BIDonut rows={afRows(abastecimento.marcas).map((r, i) => ({ label:r.marca, value:r.total || r.media, media:r.media, color:AF_COLORS[i] }))} center={`${afPlain(fuel.mediaFrota, 2)} km/l`} format={(v, r) => `${afPlain(r.media, 2)} km/l`}/>
          </BIPanel>
          <BIPanel title="Média por modelo">
            <BIHBar rows={afRows(abastecimento.modelos).map((r) => ({ label:r.modelo, value:r.media }))} format={(v) => `${afPlain(v, 2)} km/l`} color="#2f8f5b" limit={5}/>
          </BIPanel>
          <BIPanel title="Pior consumo">
            <BIHBar rows={worst.map((r) => ({ label:r.placa, value:r.media }))} format={(v) => `${afPlain(v, 2)} km/l`} color="#e74b4b" limit={5} emptyMessage="Nenhum veículo com consumo abaixo da média."/>
          </BIPanel>
          <BIPanel title="Postos mais caros">
            <BIHBar rows={afRows(abastecimento.postosCaros).map((r) => ({ label:r.fornecedor, value:r.precoMedio }))} format={(v) => afBRL(v)} color="#d68a31" limit={5} emptyMessage="Sem postos com preço acima da média no período."/>
          </BIPanel>
          <BIPanel title="Alertas de consumo">
            <BIAlertList rows={alerts.filter((a) => /Consumo|Posto/.test(a.label))} emptyMessage="Nenhum alerta de consumo no período."/>
          </BIPanel>
        </div>
      </div>
    );
  };

  const renderManutencao = () => {
    const summaryText = data
      ? <>Manutenção custou <strong>{afBRL(maint.custoTotal)}</strong> no período, média de <strong>{afBRL(maint.custoMedioVeiculo)}</strong> por veículo em <strong>{afPlain(maint.veiculos)}</strong> placas.</>
      : "Carregando resumo executivo...";
    return (
      <div className="fb-screen">
        {renderExecSummary(summaryText)}
        {renderKpis([
          { label:"Custo total manutenção", value:afBRL(maint.custoTotal), hint:"peças + serviços, OS interna/externa", icon:"wrench", tone:"#e74b4b" },
          { label:"Quantidade de OS", value:afPlain(maint.quantidadeTotal), hint:"registros operacionais", icon:"file", tone:"#4d8fe8" },
          { label:"Custo OS interna", value:afBRL(maint.custoOsInterna), hint:`${afPlain(maint.quantidadeOsInterna)} registros (NF/estoque próprio)`, icon:"settings", tone:"#f0c84b" },
          { label:"Custo OS externa", value:afBRL(maint.custoOsExterna), hint:`${afPlain(maint.quantidadeOsExterna)} registros (terceiros)`, icon:"external", tone:"#d68a31" },
          { label:"Média por veículo", value:afBRL(maint.custoMedioVeiculo), hint:"custo / veículos", icon:"gauge", tone:"#9d7bea" },
          { label:"Veículos com manutenção", value:afPlain(maint.veiculos), hint:"placas afetadas", icon:"truck", tone:"#2f8f5b" },
        ])}
        <div className="fb-grid maint">
          <BIPanel title="Custo médio por veículo" className="hero">
            <BIGauge value={maint.custoMedioVeiculo / 1000} max={4} label="mil R$ por veículo" sub={afBRL(maint.custoMedioVeiculo)} color="#f0c84b"/>
          </BIPanel>
          <BIPanel title="Custo por marca">
            <BIDonut rows={afRows(manutBi.marcas).map((r, i) => ({ label:r.nome, value:r.valor, color:AF_COLORS[i] }))} center={afShort(maint.custoTotal)}/>
          </BIPanel>
          <BIPanel title="Manutenção por ano/modelo">
            <BIHBar rows={afRows(manutBi.anosModelo).map((r) => ({ label:r.nome, value:r.valor }))} color="#2f8f5b" limit={5}/>
          </BIPanel>
          <BIPanel title="Tipos de manutenção">
            <BIColumns rows={afRows(manutBi.categorias).map((r, i) => ({ label:r.nome, value:r.valor, color:AF_COLORS[i] }))}/>
          </BIPanel>
          <BIPanel title="Placas críticas" meta="maior custo e maior quantidade de OS">
            <BIHBar rows={placasCriticas.map((r) => ({ label:r.placa, value:r.valor, quantidade:r.quantidade }))} color="#e74b4b" limit={5} format={(v, r) => `${afBRL(v)} · ${afPlain(r.quantidade)} OS`} emptyMessage="Sem placas críticas no período."/>
          </BIPanel>
          <BIPanel title="Resumo por placa" meta="placa, modelo, OS, custo total e médio por OS" action={<button className="btn" onClick={() => setDetail("manutencao")}><Icon name="file" size={13}/> Ver detalhes</button>}>
            <BITinyTable columns={[
              { key:"placa", label:"Placa" },
              { key:"modelo", label:"Modelo" },
              { key:"quantidade", label:"Qtd OS", num:true },
              { key:"valor", label:"Custo total", num:true, render:(r) => afBRL(r.valor) },
              { key:"custoMedio", label:"Custo médio/OS", num:true, render:(r) => afBRL(afNum(r.valor) / Math.max(1, afNum(r.quantidade))) },
            ]} rows={manutBi.rankingPlacas} limit={6}/>
          </BIPanel>
        </div>
      </div>
    );
  };

  const renderCustos = () => {
    const summary = custos.summary || {};
    const summaryText = data
      ? <>Custo total de <strong>{afBRL(summary.custoTotal)}</strong> no período, sendo <strong>{afBRL(summary.custoVencido)}</strong> vencido.</>
      : "Carregando resumo executivo...";
    return (
      <div className="fb-screen">
        {renderExecSummary(summaryText)}
        {renderKpis([
          { label:"Custo total", value:afBRL(summary.custoTotal), hint:`${afPlain(summary.quantidadeLancamentos)} lançamentos`, icon:"money", tone:"#e74b4b" },
          { label:"Custo pago", value:afBRL(summary.custoPago), hint:"status pago", icon:"check", tone:"#2f8f5b" },
          { label:"Em aberto", value:afBRL(summary.custoAberto), hint:"a vencer + vencido", icon:"clock", tone:"#f0c84b" },
          { label:"Vencido", value:afBRL(summary.custoVencido), hint:afNum(summary.custoVencido) > 0 ? "atenção: aberto com vencimento passado" : "nenhum valor vencido", icon:"alert", tone:"#e74b4b" },
          { label:"Média por veículo", value:afBRL(summary.custoMedioVeiculo), hint:`${afPlain(summary.totalVeiculos)} veículos`, icon:"gauge", tone:"#9d7bea" },
          { label:"Maior fornecedor", value:summary.maiorFornecedor || "-", hint:afBRL(summary.maiorFornecedorValor), icon:"truck", tone:"#4d8fe8" },
        ])}
        <div className="fb-grid costs">
          <BIPanel title="Custo por tipo de despesa" meta="operacional, abastecimento, manutenção, pedágio, seguro, multas, motorista/frete">
            <BIColumns rows={afRows(custos.types).map((r, i) => ({ label:r.tipo, value:r.custo, color:AF_COLORS[i] }))}/>
          </BIPanel>
          <BIPanel title="Status financeiro">
            <BIDonut rows={afRows(custos.status).map((r) => ({ label:AF_STATUS_LABEL[r.situacao] || r.situacao, value:r.custo, color:AF_STATUS_COLOR[r.situacao] }))} center={afShort(summary.custoTotal)}/>
          </BIPanel>
          <BIPanel title="Top 5 fornecedores" action={<button className="btn" onClick={() => setDetail("custos")}><Icon name="file" size={13}/> Ver detalhes</button>}>
            <BIHBar rows={afRows(custos.suppliers).map((r) => ({ label:r.fornecedor, value:r.custo }))} color="#4d8fe8" limit={5}/>
          </BIPanel>
          <BIPanel title="Evolução mensal dos custos" className="fb-span-2">
            <BILine data={monthly} series={[
              { key:"custo", label:"Custo", color:"#e74b4b" },
              { key:"pago", label:"Pago", color:"#2f8f5b" },
              { key:"aberto", label:"Em aberto", color:"#f0c84b" },
            ]}/>
          </BIPanel>
          <BIPanel title="Custo por centro de custo / placa" action={<button className="btn" onClick={() => setDetail("custos")}><Icon name="file" size={13}/> Ver detalhes</button>}>
            <BIHBar rows={costByCenter} color="#9d7bea" limit={5}/>
          </BIPanel>
        </div>
      </div>
    );
  };

  const renderLucro = () => {
    const summary = lucro.summary || {};
    const profitRows = afRows(lucro.vehicles);
    const topLucro = afRows(lucro.rankings?.lucro).slice(0, 5);
    const topPrejuizo = afRows(lucro.rankings?.prejuizo).slice(0, 5);
    const summaryText = data
      ? <>Margem média de <strong>{afPct(summary.margem)}</strong> — <strong>{afPlain(summary.veiculosLucro)}</strong> veículos com lucro e <strong>{afPlain(summary.veiculosPrejuizo)}</strong> com prejuízo no período.</>
      : "Carregando resumo executivo...";
    return (
      <div className="fb-screen">
        {renderExecSummary(summaryText)}
        {renderKpis([
          { label:"Receita total", value:afBRL(summary.receitaTotal), hint:"CT-e emitidos", icon:"trending-up", tone:"#2f8f5b" },
          { label:"Custo total", value:afBRL(summary.custoTotal), hint:"custos por placa", icon:"money", tone:"#e74b4b" },
          { label:"Lucro total", value:afBRL(summary.lucroTotal), hint:"receita - custos", icon:"chart", tone:afNum(summary.lucroTotal) >= 0 ? "#2f8f5b" : "#e74b4b" },
          { label:"Margem média", value:afPct(summary.margem), hint:`${afPlain(summary.veiculosLucro)} lucro | ${afPlain(summary.veiculosPrejuizo)} prejuízo`, icon:"gauge", tone:afNum(summary.margem) >= 0 ? "#2f8f5b" : "#e74b4b" },
          { label:"Mais lucrativo", value:topLucro[0]?.placa || "-", hint:afBRL(topLucro[0]?.lucro), icon:"arrow-up", tone:"#2f8f5b" },
          { label:"Maior prejuízo", value:topPrejuizo[0]?.placa || "-", hint:afBRL(topPrejuizo[0]?.lucro), icon:"arrow-down", tone:"#e74b4b" },
        ])}
        {afNum(summary.veiculosCustoSemReceita) > 0 && (
          <div className="fb-alert" style={{ marginBottom:-2 }}>
            <span><Icon name="alert" size={13}/> {afPlain(summary.veiculosCustoSemReceita)} veículo(s) com custo lançado mas sem receita (CT-e) no período selecionado — confira o filtro de datas e o vínculo placa x conhecimento.</span>
          </div>
        )}
        <div className="fb-grid profit">
          <BIPanel title="Receita x Custo x Lucro por placa" meta="comparativo entre os veículos mais relevantes" className="fb-span-2">
            <BIGroupedBars rows={profitRows}/>
          </BIPanel>
          <BIPanel title="Margem geral" className="hero">
            <BIGauge value={Math.max(0, afNum(summary.margem))} max={35} label="margem da frota" sub={afBRL(summary.lucroTotal)} color={afNum(summary.lucroTotal) >= 0 ? "#2f8f5b" : "#e74b4b"}/>
          </BIPanel>
          <BIPanel title="Top 5 mais lucrativos">
            <BIHBar rows={topLucro.map((r) => ({ label:r.placa, value:r.lucro }))} color="#2f8f5b" limit={5}/>
          </BIPanel>
          <BIPanel title="Top 5 prejuízo">
            <BIHBar rows={topPrejuizo.map((r) => ({ label:r.placa, value:Math.abs(afNum(r.lucro)) }))} color="#e74b4b" limit={5} emptyMessage="Nenhum veículo em prejuízo no período."/>
          </BIPanel>
          <BIPanel title="Resumo por placa" action={<button className="btn" onClick={() => setDetail("lucro")}><Icon name="file" size={13}/> Ver detalhes</button>}>
            <BITinyTable columns={[
              { key:"placa", label:"Placa" },
              { key:"receita", label:"Receita", num:true, render:(r) => afBRL(r.receita) },
              { key:"custo", label:"Custo", num:true, render:(r) => afBRL(r.custo) },
              { key:"lucro", label:"Lucro", num:true, render:(r) => <span style={{ color:afNum(r.lucro) >= 0 ? "#2f8f5b" : "#e74b4b" }}>{afBRL(r.lucro)}</span> },
              { key:"margem", label:"Margem", num:true, render:(r) => afNum(r.receita) === 0 ? <span className="fb-badge warn">Sem receita no período</span> : afPct(r.margem) },
            ]} rows={profitRows} limit={6}/>
          </BIPanel>
        </div>
      </div>
    );
  };

  const renderAuditoria = () => {
    const inconsistent = afNum(auditoria.registrosSemPlaca) + afNum(auditoria.registrosSemCentro) + afNum(auditoria.receitasSemVeiculo) + afNum(auditoria.abastecimentosSemKm) + afNum(auditoria.possiveisDivergenciasPlaca);
    const cards = [
      { label:"Registros inconsistentes", value:afPlain(inconsistent), hint:"soma dos alertas", icon:"alert", tone:"#e74b4b" },
      { label:"Abastecimentos sem km", value:afPlain(auditoria.abastecimentosSemKm), hint:"impacta km/l", icon:"fuel", tone:"#f0c84b" },
      { label:"Custos sem placa", value:afPlain(auditoria.registrosSemPlaca), hint:"placa não resolvida", icon:"truck", tone:"#e74b4b" },
      { label:"Receitas sem placa", value:afPlain(auditoria.receitasSemVeiculo), hint:"CT-e sem veículo", icon:"trending-up", tone:"#e74b4b" },
      { label:"Sem centro de custo", value:afPlain(auditoria.registrosSemCentro), hint:"cadastro/rateio", icon:"filter", tone:"#f0c84b" },
      { label:"Veículos sem receita", value:afPlain(lucro.summary?.veiculosCustoSemReceita), hint:"custo lançado sem CT-e no período", icon:"copy", tone:"#9d7bea" },
    ];
    const issueRows = [
      { label:"Sem placa", value:afNum(auditoria.registrosSemPlaca), color:"#e74b4b" },
      { label:"Sem centro", value:afNum(auditoria.registrosSemCentro), color:"#f0c84b" },
      { label:"Centro administrativo", value:afNum(auditoria.registrosCentroAdministrativo), color:"#d68a31" },
      { label:"Receitas sem placa", value:afNum(auditoria.receitasSemVeiculo), color:"#e35d6a" },
      { label:"Abastecimentos sem km", value:afNum(auditoria.abastecimentosSemKm), color:"#9d7bea" },
    ];
    return (
      <div className="fb-screen">
        {renderKpis(cards)}
        <div className="fb-grid audit">
          <BIPanel title="Inconsistências por tipo">
            <BIHBar rows={issueRows} format={(v) => afPlain(v)} color="#e74b4b" limit={6}/>
          </BIPanel>
          <BIPanel title="Origens dos dados">
            <div className="fb-list">
              {afRows(relatorio.origemIndicadores).slice(0, 8).map((row) => (
                <div className="fb-alert ok" key={row.indicador}>
                  <span>{row.indicador}</span><strong>{row.confianca}</strong>
                </div>
              ))}
            </div>
          </BIPanel>
          <BIPanel title="Registros que precisam correção" action={<button className="btn" onClick={() => setDetail("auditoria")}><Icon name="file" size={13}/> Abrir lista</button>}>
            <BIAlertList rows={[
              ...issueRows.filter((r) => r.value > 0).map((r) => ({ tone:r.value > 10 ? "crit" : "", label:r.label, value:afPlain(r.value) })),
              ...afRows(auditoria.avisos).slice(0, 3).map((label) => ({ label, value:"validar" })),
            ]}/>
          </BIPanel>
          <BIPanel title="Tabelas revisadas">
            <div className="fb-list">
              {afRows(relatorio.usadas).map((table) => <div className="fb-alert ok" key={table}><span>{table}</span><strong>usada</strong></div>)}
            </div>
          </BIPanel>
        </div>
      </div>
    );
  };

  const renderScreen = () => {
    const blocked = renderLoading();
    if (blocked) return blocked;
    if (tab === "geral") return renderGeral();
    if (tab === "abastecimento") return renderAbastecimento();
    if (tab === "manutencao") return renderManutencao();
    if (tab === "custos") return renderCustos();
    if (tab === "lucro") return renderLucro();
    if (tab === "auditoria") return renderAuditoria();
    return null;
  };

  const modalData = (() => {
    if (detail === "custos") return {
      title:"Detalhamento de custos",
      columns:[
        { key:"data", label:"Data", render:(r) => afDate(r.data) },
        { key:"placa", label:"Placa" },
        { key:"tipoCusto", label:"Tipo" },
        { key:"fornecedor", label:"Fornecedor" },
        { key:"situacao", label:"Status", render:(r) => AF_STATUS_LABEL[r.situacao] || r.situacao },
        { key:"valor", label:"Valor", num:true, render:(r) => afBRL(r.valor) },
      ],
      rows: custos.launches,
    };
    if (detail === "manutencao") return {
      title:"Detalhamento de manutenção",
      columns:[
        { key:"data", label:"Data", render:(r) => afDate(r.data) },
        { key:"placa", label:"Placa" },
        { key:"fornecedor", label:"Fornecedor" },
        { key:"produto", label:"Produto" },
        { key:"valorTotal", label:"Valor", num:true, render:(r) => afBRL(r.valorTotal) },
      ],
      rows: manutBi.detalhe,
    };
    if (detail === "lucro") return {
      title:"Detalhamento de lucro por veículo",
      columns:[
        { key:"placa", label:"Placa" },
        { key:"receita", label:"Receita", num:true, render:(r) => afBRL(r.receita) },
        { key:"custo", label:"Custo", num:true, render:(r) => afBRL(r.custo) },
        { key:"lucro", label:"Lucro", num:true, render:(r) => afBRL(r.lucro) },
        { key:"margem", label:"Margem", num:true, render:(r) => afNum(r.receita) === 0 ? "Sem receita" : afPct(r.margem) },
      ],
      rows: lucro.vehicles,
    };
    if (detail === "auditoria") return {
      title:"Pendências de auditoria",
      columns:[{ key:"label", label:"Item" }, { key:"value", label:"Quantidade", num:true }],
      rows:[
        { label:"Custos sem placa", value:afPlain(auditoria.registrosSemPlaca) },
        { label:"Sem centro de custo", value:afPlain(auditoria.registrosSemCentro) },
        { label:"Receitas sem placa", value:afPlain(auditoria.receitasSemVeiculo) },
        { label:"Abastecimentos sem km", value:afPlain(auditoria.abastecimentosSemKm) },
        { label:"Veículos com custo sem receita", value:afPlain(lucro.summary?.veiculosCustoSemReceita) },
      ],
    };
    return null;
  })();

  return (
    <div className="view fb-view">
      <div className="fb-shell">
        <div className="fb-top">
          <div className="fb-title">
            <h1>Frota BI</h1>
            <div className="sub">Dashboard executivo de custos, abastecimento, manutenção, lucro e auditoria</div>
          </div>
          <div className="fb-tabs">
            {AF_TABS.map((item) => (
              <button key={item.id} className={`fb-tab ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>
                <Icon name={item.icon} size={14}/><span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="fb-filters-bar">
          <div className="fb-filters-row">
            <div className="fb-field"><label>Início</label><input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}/></div>
            <div className="fb-field"><label>Fim</label><input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}/></div>
            <div className="fb-field"><label>Placa</label><input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="Todas"/></div>
            <div className="fb-field"><label>Proprietário</label><select value={proprietario} onChange={(e) => setProprietario(e.target.value)}><option value="frota">Frota</option><option value="todos">Todos</option><option value="terceiro">Terceiros</option></select></div>
            <button type="button" className="fb-filters-toggle" onClick={() => setShowAdvanced((v) => !v)}>
              <Icon name="filter" size={13}/> Filtros avançados {showAdvanced ? "▲" : "▼"}
            </button>
            <button className="btn primary" onClick={applyFilters} style={{ height:32 }}><Icon name="filter" size={13}/> Aplicar</button>
            <button className="btn" onClick={clearFilters} style={{ height:32 }}><Icon name="x" size={13}/> Limpar</button>
          </div>
          {showAdvanced && (
            <div className="fb-filters-advanced">
              <div className="fb-field"><label>Centro</label><input value={centro} onChange={(e) => setCentro(e.target.value)} placeholder="Todos"/></div>
              <div className="fb-field"><label>Fornecedor</label><input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Todos"/></div>
              <div className="fb-field"><label>Modelo</label><input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Todos"/></div>
              <div className="fb-field"><label>Marca</label><input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Todas"/></div>
              <div className="fb-field"><label>Ano</label><input value={ano} onChange={(e) => setAno(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Todos"/></div>
              <div className="fb-field"><label>Tipo despesa</label><select value={tipoCusto} onChange={(e) => setTipoCusto(e.target.value)}><option value="">Todos</option>{tipoOptions.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="fb-field"><label>Status</label><select value={situacao} onChange={(e) => setSituacao(e.target.value)}><option value="">Todos</option>{situacaoOptions.map((s) => <option key={s} value={s}>{AF_STATUS_LABEL[s] || s}</option>)}</select></div>
            </div>
          )}
        </div>

        <div className="fb-stage">{renderScreen()}</div>
      </div>

      {modalData && (
        <div className="fb-modal-backdrop" onMouseDown={() => setDetail(null)}>
          <section className="fb-panel fb-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="fb-panel-head">
              <div><h2>{modalData.title}</h2><div className="meta">Tabela de apoio fora da tela principal do BI</div></div>
              <button className="icon-btn" onClick={() => setDetail(null)} title="Fechar"><Icon name="x"/></button>
            </div>
            <BITinyTable columns={modalData.columns} rows={modalData.rows} limit={120}/>
          </section>
        </div>
      )}
    </div>
  );
};

window.AnaliseFrota = AnaliseFrota;
