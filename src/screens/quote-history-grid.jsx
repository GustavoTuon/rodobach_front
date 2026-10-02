import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './quote-history-grid.css';

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const number = value => Number(value || 0).toLocaleString('pt-BR');
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const UF_LABELS = { ufOrigem: 'UF origem', ufDestino: 'UF destino' };
export const HISTORY_COLUMNS = [
  ['data', 'Data', 'date', 7], ['origem', 'Origem', 'text', 10],
  ['destino', 'Destino', 'text', 10], ['clienteInicial', 'Cliente inicial', 'text', 12],
  ['clienteFinal', 'Cliente final', 'text', 12], ['material', 'Material', 'text', 12],
  ['peso', 'Peso (kg)', 'number', 7], ['placa', 'Placa', 'text', 7],
  ['km', 'KM', 'number', 5], ['valor', 'Frete (R$)', 'number', 9],
  ['valorTonelada', 'Valor por tonelada (R$/t)', 'number', 10],
  ['valorMotorista', 'Motorista (R$)', 'number', 9],
];
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
export const historyValue = (row, field) => {
  if (field === 'ufOrigem' || field === 'ufDestino') return String(row[field] || String(row[field === 'ufOrigem' ? 'origem' : 'destino'] || '').match(/\/\s*([A-Za-z]{2})\s*$/)?.[1] || '').toUpperCase();
  if (field === 'valorTonelada') return Number(row.peso) > 0 ? String(row.valorTonelada ?? Number(row.valor || 0) * 1000 / Number(row.peso)) : '';
  return field === 'data' ? String(row[field] || '').slice(0, 10) : String(row[field] ?? '');
};
export function filterHistory(rows, filters, except) {
  return rows.filter(row => Object.entries(filters).every(([field, selected]) => field === except || selected.includes(historyValue(row, field))));
}
export function sortHistory(rows, field, direction) {
  const numeric = HISTORY_COLUMNS.find(column => column[0] === field)?.[2] === 'number';
  return [...rows].sort((a, b) => {
    const left = historyValue(a, field), right = historyValue(b, field);
    const diff = numeric ? Number(left || 0) - Number(right || 0) : left.localeCompare(right, 'pt-BR');
    return direction === 'asc' ? diff : -diff;
  });
}
function display(value, field) {
  if (value === '') return field === 'valorTonelada' ? '—' : '(Vazio)';
  if (field === 'data') return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value;
  if (field === 'valor' || field === 'valorMotorista' || field === 'valorTonelada') return money(value);
  if (field === 'peso' || field === 'km') return number(value);
  return value;
}

function ColumnFilter({ field, label, values, selected, anchor, onApply, onClear, onSort, onClose, remote = false, filters = {} }) {
  const [search, setSearch] = useState(typeof selected === 'string' ? selected : '');
  const [draft, setDraft] = useState(Array.isArray(selected) ? selected : (remote ? [] : selected ? [selected] : values));
  const [options, setOptions] = useState([]);
  const [optionPage, setOptionPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(remote);
  const [error, setError] = useState('');
  const context = JSON.stringify(filters);
  useEffect(() => {
    if (!remote) return;
    let active = true;
    setBusy(true); setError('');
    const timer = setTimeout(() => {
      window.RB_API.consultarCotacaoFretesV2({ meses: "24", filters: JSON.parse(context), optionsField: field, optionsSearch: search, optionsPage: optionPage })
        .then(result => { if (active) { setOptions(current => optionPage === 1 ? result.options : [...new Set([...current, ...result.options])]); setHasMore(result.hasMore); } })
        .catch(err => { if (active) setError(err?.message || 'Não foi possível carregar as opções.'); })
        .finally(() => { if (active) setBusy(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [remote, context, field, search, optionPage]);
  const panel = useRef(null);
  const shown = remote ? options : values.filter(value => normalize(display(value, field)).includes(normalize(search)));
  const allShown = shown.length > 0 && shown.every(value => draft.includes(value));
  useEffect(() => {
    panel.current?.querySelector('input[type="search"]')?.focus();
    const close = event => { if (!panel.current?.contains(event.target) && !anchor.contains(event.target)) onClose(); };
    const escape = event => { if (event.key === 'Escape') { onClose(); anchor.focus(); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [anchor, onClose]);
  const rect = anchor.getBoundingClientRect();
  return createPortal(<div ref={panel} role="dialog" aria-label={`Filtrar ${label}`} className="qh-filter" style={{ left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)), top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 440)) }}>
    <strong>{label}</strong>
    {!UF_LABELS[field] && <><button type="button" onClick={() => onSort('asc')}>Ordenar crescente ↑</button>
    <button type="button" onClick={() => onSort('desc')}>Ordenar decrescente ↓</button></>}
    <button type="button" onClick={onClear}>Limpar filtro desta coluna</button>
    <input type="search" aria-label={`Pesquisar em ${label}`} placeholder="Digite para encontrar opções…" value={search} onChange={event => { setSearch(event.target.value); setOptionPage(1); setOptions([]); }} />
    <label><input type="checkbox" disabled={busy || !shown.length} checked={allShown} onChange={() => setDraft(current => allShown ? current.filter(value => !shown.includes(value)) : [...new Set([...current, ...shown])])} />Selecionar opções exibidas</label>
    <small>{draft.length} opção(ões) selecionada(s) · as escolhas são mantidas ao pesquisar</small>
    <button type="button" disabled={!draft.length} onClick={() => setDraft([])}>Desmarcar todas</button>
    {error && <p role="alert">{error}</p>}{busy && <p role="status">Buscando opções…</p>}
    <div className="qh-filter-values">{shown.map(value => <label key={value}><input type="checkbox" checked={draft.includes(value)} onChange={() => setDraft(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value])} />{display(value, field)}</label>)}{!busy && !error && !shown.length && <p>Nenhum valor encontrado.</p>}</div>
    {remote && hasMore && <button type="button" disabled={busy} onClick={() => setOptionPage(value => value + 1)}>Carregar mais opções</button>}
    <footer><button type="button" onClick={onClose}>Cancelar</button><button type="button" onClick={() => onApply(draft)}>Aplicar</button></footer>
  </div>, document.body);
}

export function QuoteHistoryGrid({ fretes, paging, onPagingChange, loading = false }) {
  const [localFilters, setLocalFilters] = useState({});
  const [localSort, setLocalSort] = useState({ field: 'data', direction: 'desc' });
  const filters = paging ? paging.filters : localFilters;
  const sort = paging ? paging.sort : localSort;
  const setFilters = update => {
    const next = typeof update === 'function' ? update(filters) : update;
    if (paging) onPagingChange({ filters: Object.fromEntries(Object.entries(next).filter(([, value]) => value)), page: 1 });
    else setLocalFilters(next);
  };
  const setSort = next => paging ? onPagingChange({ sort: next, page: 1 }) : setLocalSort(next);
  const [open, setOpen] = useState(null);
  const [compact, setCompact] = useState(false);
  const [order, setOrder] = useState(() => {
    const defaults = HISTORY_COLUMNS.map(column => column[0]);
    try { const saved = JSON.parse(localStorage.getItem('cv2-quote-column-order-v2')); return Array.isArray(saved) ? [...new Set([...saved.filter(id => defaults.includes(id)), ...defaults])] : defaults; } catch { return defaults; }
  });
  const [hidden, setHidden] = useState(['valorMotorista']);
  const drag = useRef(null);
  const rows = paging ? fretes : sortHistory(filterHistory(fretes, filters), sort.field, sort.direction);
  const visible = order.map(id => HISTORY_COLUMNS.find(column => column[0] === id)).filter(column => !hidden.includes(column[0]));
  const totalWidth = visible.reduce((sum, column) => sum + column[3], 0);
  const mean = rows.length ? rows.reduce((sum, row) => sum + Number(row.valor || 0), 0) / rows.length : null;
  const close = React.useCallback(() => setOpen(null), []);
  const clear = field => setFilters(current => { const next = { ...current }; delete next[field]; return next; });
  const move = target => {
    if (!drag.current || drag.current === target) return;
    const next = order.filter(id => id !== drag.current); next.splice(next.indexOf(target), 0, drag.current);
    setOrder(next); drag.current = null;
    try { localStorage.setItem('cv2-quote-column-order-v2', JSON.stringify(next)); } catch { /* optional preference */ }
  };
  return <section className="qh-sheet" aria-label="Planilha de fretes">
    <div className="qh-toolbar"><div><b>{paging ? `${rows.length} fretes nesta página` : `${rows.length} de ${fretes.length} fretes`}</b><span>Média exibida: {mean === null ? '—' : money(mean)}</span></div>
      <div><button type="button" className="btn" onClick={() => { setFilters({}); close(); }} disabled={!Object.keys(filters).length}>Limpar filtros</button>
        <button type="button" className="btn" onClick={() => setCompact(value => !value)}>{compact ? 'Visual confortável' : 'Visual compacto'}</button>
        <details><summary>Colunas</summary><div>{HISTORY_COLUMNS.map(([id, label]) => <label key={id}><input type="checkbox" checked={!hidden.includes(id)} disabled={visible.length === 1 && !hidden.includes(id)} onChange={() => setHidden(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])} />{label}</label>)}<button type="button" onClick={() => { setHidden(['valorMotorista']); setOrder(HISTORY_COLUMNS.map(column => column[0])); }}>Restaurar padrão</button></div></details>
      </div></div>
    <div className="qh-route-filters">{Object.entries(UF_LABELS).map(([field, label]) => <div key={field}><span>{label}</span><button type="button" className="btn" aria-label={label} aria-expanded={open?.field === field} onClick={event => { const anchor = event.currentTarget; setOpen(current => current?.field === field ? null : { field, label, anchor }); }}>{Array.isArray(filters[field]) ? filters[field].length ? filters[field].join(", ") : "Nenhuma UF" : filters[field] || "Todas as UFs"} ▾</button></div>)}</div>    <div className="qh-hint">Últimos 24 meses. Filtre e ordene pelo ▾ de cada coluna{paging ? ": a pesquisa considera todo o histórico." : "."} Valor por tonelada = frete ÷ (peso em kg ÷ 1.000). Sem peso, o valor aparece como —.</div>
    {!!Object.keys(filters).length && <div className="qh-active">{Object.keys(filters).map(field => <button type="button" key={field} onClick={() => clear(field)}>{UF_LABELS[field] || HISTORY_COLUMNS.find(column => column[0] === field)?.[1]} · remover ×</button>)}</div>}
    <div className={`qh-scroll ${compact ? 'compact' : ''}`}><table><colgroup>{visible.map(([id,,, width]) => <col key={id} style={{ width: `${width / totalWidth * 100}%` }} />)}</colgroup>
      <thead><tr>{visible.map(([id, label]) => <th key={id} scope="col" aria-sort={sort.field === id ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} onDragOver={event => event.preventDefault()} onDrop={() => move(id)}><div><span draggable onDragStart={() => { drag.current = id; }} onDragEnd={() => { drag.current = null; }}>{label}</span><button type="button" className={filters[id] ? 'active' : ''} aria-label={`Filtrar ${label}`} aria-expanded={open?.field === id} onClick={event => { const anchor = event.currentTarget; setOpen(current => current?.field === id ? null : { field: id, label, anchor }); }}>{filters[id] ? '●' : sort.field === id ? (sort.direction === 'asc' ? '↑' : '↓') : '▾'}</button></div></th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={`${row.id}-${index}`}>{visible.map(([id, label, type]) => <td key={id} data-label={label} className={type === 'number' ? 'numeric' : ''}>{display(historyValue(row, id), id)}</td>)}</tr>)}{!rows.length && <tr><td colSpan={visible.length}>{loading ? "Carregando fretes..." : "Nenhum frete corresponde aos filtros."}</td></tr>}</tbody>
    </table></div>
    {paging && <nav className="qh-pagination" aria-label="Paginação da cotação">
      <label>Linhas por página <select aria-label="Linhas por página" value={paging.pageSize} disabled={loading} onChange={event => onPagingChange({ pageSize: Number(event.target.value), page: 1 })}>{[25,50,100].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
      <span aria-live="polite">Página {paging.page}{rows.length ? ` · ${(paging.page - 1) * paging.pageSize + 1}–${(paging.page - 1) * paging.pageSize + rows.length}` : ''}</span>
      <div><button className="btn" disabled={loading || paging.page === 1} onClick={() => onPagingChange({ page: paging.page - 1 })}>Anterior</button><button className="btn" disabled={loading || !paging.hasMore} onClick={() => onPagingChange({ page: paging.page + 1 })}>Próxima</button></div>
    </nav>}
    {open && <ColumnFilter filters={filters} remote={Boolean(paging) && !UF_LABELS[open.field]} key={open.field} {...open} values={UF_LABELS[open.field] ? UFS : paging ? [] : [...new Set(filterHistory(fretes, filters, open.field).map(row => historyValue(row, open.field)))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))} selected={filters[open.field]} onClose={close} onApply={selected => { setFilters(current => ({ ...current, [open.field]: selected })); close(); }} onClear={() => { clear(open.field); close(); }} onSort={direction => { setSort({ field: open.field, direction }); close(); }} />}
  </section>;
}
