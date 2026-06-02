// Tela de Veículos — Norte Telemetria
const Vehicles = ({ onGoToVehicle }) => {
  const D = window.NT_DATA;
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("todos");
  const [sort, setSort] = React.useState({ key: "plate", dir: "asc" });
  const [page, setPage] = React.useState(1);
  const perPage = 12;

  const all = D.FLEET;
  let rows = all.filter(v => {
    if (statusFilter !== "todos" && v.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!v.plate.toLowerCase().includes(q) && !v.driver.toLowerCase().includes(q) && !v.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  rows.sort((a, b) => {
    const k = sort.key;
    const av = a[k], bv = b[k];
    if (av < bv) return sort.dir === "asc" ? -1 : 1;
    if (av > bv) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const visible = rows.slice(start, start + perPage);

  const toggleSort = (k) => {
    setSort(s => s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "asc" });
  };

  const Th = ({ k, children, style }) => (
    <th className="sortable" onClick={() => toggleSort(k)} style={style}>
      {children}
      {sort.key === k && <span className="sort">{sort.dir === "asc" ? "↑" : "↓"}</span>}
    </th>
  );

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>Veículos</h1>
          <div className="sub">{total} veículos · {all.filter(v=>v.status==="online").length} online · {all.filter(v=>v.status==="sem-comm").length} sem comunicação</div>
        </div>
        <div className="actions">
          <button className="btn"><Icon name="download"/> Exportar CSV</button>
          <button className="btn primary"><Icon name="plus"/> Cadastrar veículo</button>
        </div>
      </div>

      <div className="tbl-wrap">
        <div className="tbl-toolbar">
          <div className="search">
            <Icon name="search"/>
            <input
              placeholder="Buscar por placa, motorista ou ID…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button className={`tbl-filter ${statusFilter !== "todos" ? "active" : ""}`}
                  onClick={() => {
                    const opts = ["todos", "online", "atrasado", "sem-comm"];
                    setStatusFilter(opts[(opts.indexOf(statusFilter) + 1) % opts.length]);
                    setPage(1);
                  }}>
            <Icon name="filter" size={11}/> Status: <span className="v">{statusFilter}</span>
          </button>
          <button className="tbl-filter"><Icon name="filter" size={11}/> Equipamento</button>
          <button className="tbl-filter"><Icon name="filter" size={11}/> UF</button>
          <button className="tbl-filter"><Icon name="plus" size={11}/> Adicionar filtro</button>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <Th k="plate">Placa</Th>
              <Th k="driver">Motorista</Th>
              <Th k="id">ID</Th>
              <Th k="chassis">Chassi</Th>
              <Th k="status">Status</Th>
              <Th k="city">Última posição</Th>
              <Th k="lastMessageMin">Última msg</Th>
              <Th k="lastMaint">Manutenção</Th>
              <th>Equipamento</th>
              <th style={{width: 40}}></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(v => (
              <tr key={v.plate} className="clickable" onClick={() => onGoToVehicle(v.plate)}>
                <td><Plate value={v.plate}/></td>
                <td>{v.driver}</td>
                <td className="num muted">{v.id}</td>
                <td className="num muted" style={{fontSize: 11.5}}>{v.chassis}</td>
                <td><StatusBadge status={v.status}/></td>
                <td>
                  <span>{v.city}</span>{" "}
                  <span className="muted">– {v.uf}</span>
                </td>
                <td className="muted num">{D.timeAgo(v.lastMessageMin)}</td>
                <td className="muted num" style={{fontSize: 11.5}}>
                  {v.lastMaint}
                  {v.nextMaint < 0 && <span className="badge crit" style={{marginLeft: 6, fontSize: 10}}>Atrasada</span>}
                  {v.nextMaint >= 0 && v.nextMaint < 7 && <span className="badge warn" style={{marginLeft: 6, fontSize: 10}}>{v.nextMaint}d</span>}
                </td>
                <td className="muted">{v.equip}</td>
                <td><button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); onGoToVehicle(v.plate); }}><Icon name="chevron-right" size={12}/></button></td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={10} style={{textAlign: "center", padding: 40}} className="muted">Nenhum veículo encontrado.</td></tr>
            )}
          </tbody>
        </table>

        <div className="tbl-footer">
          <span>Mostrando <b className="num" style={{color: "var(--text)"}}>{start + 1}-{Math.min(start + perPage, total)}</b> de <b className="num" style={{color: "var(--text)"}}>{total}</b></span>
          <div className="pager">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            {Array.from({length: pages}, (_, i) => (
              <button key={i} className={page === i + 1 ? "active" : ""} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
};

window.Vehicles = Vehicles;
