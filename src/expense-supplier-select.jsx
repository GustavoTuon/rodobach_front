import React, {useEffect, useRef, useState} from "react";
import {supplierOrigin} from './expense-supplier-origin.js';
export default function SupplierSelect({ value, onChange, label = "Fornecedor — obrigatório" }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [warnings,setWarnings]=useState([]);
  const [active, setActive] = useState(-1);
  const input = useRef(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    setError(false);
    setWarnings([]);
    setOptions([]);
    setActive(-1);
    const timer = setTimeout(() => {
      Promise.resolve().then(() => window.RB_API.searchFornecedoresManutencao(value.nome))
        .then((data) => {
          if (live) {setOptions(data.fornecedores || []);setWarnings(data.avisos||[]);}
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
      <label htmlFor="mp-supplier">{label}</label>
      <input
        ref={input}
        id="mp-supplier"
        required
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
          <div className="mp-fleet-caption">FORNECEDORES · NORTE E ERP</div>
          {warnings.map(message=><p key={message} className="mp-fleet-empty" role="status">{message}</p>)}
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
                key={item.codigo!=null?`erp-${item.empresa}-${item.codigo}`:`norte-${item.nome.toLocaleLowerCase()}`}
                id={`mp-supplier-${index}`}
                role="option"
                aria-selected={
                  item.codigo!=null
                    ? String(value.codigo)===String(item.codigo)&&String(value.empresa)===String(item.empresa)
                    : value.codigo==null&&value.nome.trim().toLocaleLowerCase()===item.nome.trim().toLocaleLowerCase()
                }
                className={`mp-fleet-option ${active === index ? "is-active" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                <strong>{item.nome} <span>({supplierOrigin(item)})</span></strong>
                <small>
                  {item.codigo!=null?`Cód. ${item.codigo} · Emp. ${item.empresa}`:'Já utilizado em despesas da Norte. Selecione para reutilizar.'}
                </small>
              </div>
            ))}
          </div>
          {!loading && !error && !options.length && (
            <p className="mp-fleet-empty">
              Nenhum fornecedor encontrado. Use o nome digitado.
            </p>
          )}
          {value.nome.trim() && !options.some(item=>item.codigo==null&&item.nome.trim().toLocaleLowerCase()===value.nome.trim().toLocaleLowerCase()) && (
            <button
              type="button"
              className="mp-supplier-manual"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose({ nome: value.nome.trim() })}
            >
              <span aria-hidden="true">+</span>
              Usar “{value.nome.trim()}” (Cadastrado pela Norte)
            </button>
          )}
        </div>
      )}
      <p className="mp-field-help">
        {value.nome.trim()?`(${supplierOrigin(value)})${value.codigo==null?' · O nome ficará disponível para outras despesas após salvar.':''}`:'Busque fornecedores do ERP ou já utilizados na Norte. Se não encontrar, digite um novo nome.'}
      </p>
    </div>
  );
}
