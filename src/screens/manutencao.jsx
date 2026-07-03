const { useState, useEffect, useCallback, useRef } = React;

const EMPTY_FORM = {
  selecionadas: [], // [{ placa, km_atual }]
  titulo: "",
  mensagem: "",
  intervalo_km: "",
  numeros: [], // ["5546999990000", ...]
};

function fmtKm(v) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR") + " km";
}

function normalizarPlaca(placa) {
  return String(placa || "").trim().toUpperCase();
}

function dedupeVeiculos(veiculos) {
  const porPlaca = new Map();
  for (const veiculo of veiculos || []) {
    const placa = normalizarPlaca(veiculo.placa);
    if (!placa) continue;
    const atual = porPlaca.get(placa);
    const odometro = Number(veiculo.odometro) || 0;
    if (!atual || odometro > (Number(atual.odometro) || 0)) {
      porPlaca.set(placa, { ...veiculo, placa });
    }
  }
  return [...porPlaca.values()].sort((a, b) => a.placa.localeCompare(b.placa));
}

function dedupeSelecionadas(selecionadas) {
  const porPlaca = new Map();
  for (const item of selecionadas || []) {
    const placa = normalizarPlaca(item.placa);
    if (!placa || porPlaca.has(placa)) continue;
    porPlaca.set(placa, { ...item, placa, km_atual: Number(item.km_atual) || 0 });
  }
  return [...porPlaca.values()];
}

function normalizarNumero(numero) {
  return String(numero || "").replace(/[^\d]/g, "");
}

function agruparAutomacoes(automacoes) {
  const grupos = new Map();
  for (const item of automacoes || []) {
    const chave = [
      String(item.titulo || "").trim().toLowerCase(),
      String(item.mensagem || "").trim().toLowerCase(),
      Number(item.intervalo_km) || 0,
      Boolean(item.ativo),
      String(item.numeros || "").trim().toLowerCase(),
    ].join("|");

    if (!grupos.has(chave)) {
      grupos.set(chave, {
        ...item,
        ids: [item.id],
        placas: [item.placa],
        itens: [item],
      });
      continue;
    }

    const grupo = grupos.get(chave);
    grupo.ids.push(item.id);
    grupo.placas.push(item.placa);
    grupo.itens.push(item);
  }

  return [...grupos.values()].map(grupo => ({
    ...grupo,
    placas: [...new Set(grupo.placas.map(normalizarPlaca).filter(Boolean))].sort(),
  }));
}

// ── Multi-select de placas com odômetro ──────────────────────────────────────
function MultiSelectVeiculos({ selecionadas, onChange, veiculos, carregando }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    function onClickFora(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setBusca("");
      }
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  const veiculosUnicos = dedupeVeiculos(veiculos);
  const selecionadasUnicas = dedupeSelecionadas(selecionadas);
  const placasSelecionadas = selecionadasUnicas.map(s => s.placa);

  const filtrados = veiculosUnicos.filter(v =>
    v.placa.toLowerCase().includes(busca.toLowerCase())
  );

  function toggle(veiculo) {
    const jaEsta = placasSelecionadas.includes(veiculo.placa);
    if (jaEsta) {
      onChange(selecionadas.filter(s => s.placa !== veiculo.placa));
    } else {
      onChange(dedupeSelecionadas([...selecionadas, { placa: veiculo.placa, km_atual: Number(veiculo.odometro) || 0 }]));
    }
  }

  function toggleTodos() {
    if (selecionadasUnicas.length === veiculosUnicos.length) {
      onChange([]);
    } else {
      onChange(veiculosUnicos.map(v => ({ placa: v.placa, km_atual: Number(v.odometro) || 0 })));
    }
  }

  const todasMarcadas = veiculosUnicos.length > 0 && selecionadasUnicas.length === veiculosUnicos.length;
  const algumasMarcadas = selecionadasUnicas.length > 0 && !todasMarcadas;

  function remover(placa, e) {
    e.stopPropagation();
    onChange(selecionadasUnicas.filter(s => s.placa !== normalizarPlaca(placa)));
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div
        onClick={() => !carregando && setOpen(o => !o)}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 5,
          padding: selecionadasUnicas.length === 0 ? "8px 10px" : "6px 8px",
          border: `1px solid ${open ? "var(--brand-blue)" : "var(--border)"}`,
          borderRadius: 6,
          background: "var(--bg)",
          cursor: carregando ? "wait" : "pointer",
          minHeight: 38,
          alignItems: "center",
          userSelect: "none",
          boxShadow: open ? "0 0 0 3px color-mix(in oklab, var(--brand-blue) 12%, transparent)" : "none",
          transition: "border-color 120ms, box-shadow 120ms",
        }}
      >
        {selecionadasUnicas.length === 0 ? (
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {carregando ? "Carregando veículos…" : "Selecione os veículos…"}
          </span>
        ) : (
          selecionadasUnicas.map(s => (
            <span key={s.placa} style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "var(--accent-soft)",
              color: "var(--brand-blue)",
              border: "1px solid var(--accent-border)",
              borderRadius: 4,
              padding: "2px 6px 2px 8px",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "0.04em",
            }}>
              {s.placa}
              <button
                type="button"
                onClick={e => remover(s.placa, e)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: 0, lineHeight: 1, color: "var(--brand-blue)",
                  display: "flex", alignItems: "center", opacity: 0.7,
                }}
              >
                <Icon name="x" size={11}/>
              </button>
            </span>
          ))
        )}
        <div style={{ marginLeft: "auto", color: "var(--muted)", display: "flex", alignItems: "center", paddingLeft: 4 }}>
          <Icon name={open ? "chevron-up" : "chevron-down"} size={14}/>
        </div>
      </div>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          zIndex: 200,
          overflow: "hidden",
        }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
            <input
              autoFocus
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar placa…"
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%",
                border: "1px solid var(--border)",
                borderRadius: 5,
                padding: "5px 9px",
                fontSize: 12.5,
                background: "var(--bg)",
                color: "var(--text)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {veiculosUnicos.length > 0 && (
            <div
              onClick={e => { e.stopPropagation(); toggleTodos(); }}
              style={{
                padding: "7px 12px",
                display: "flex", alignItems: "center", gap: 9,
                cursor: "pointer",
                borderBottom: "1px solid var(--divider, var(--border))",
                fontSize: 12.5, color: "var(--muted)",
                background: "var(--surface)",
              }}
              onMouseOver={e => e.currentTarget.style.background = "var(--hover, #f4f4f5)"}
              onMouseOut={e => e.currentTarget.style.background = "var(--surface)"}
            >
              <CheckBox checked={todasMarcadas} indeterminate={algumasMarcadas}/>
              <span>Selecionar todos</span>
            </div>
          )}

          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtrados.length === 0 ? (
              <div style={{ padding: "12px", color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
                {veiculos.length === 0 ? "Nenhum veículo encontrado no banco" : "Nenhuma placa encontrada"}
              </div>
            ) : filtrados.map(v => {
              const marcado = placasSelecionadas.includes(v.placa);
              return (
                <div
                  key={v.placa}
                  onClick={e => { e.stopPropagation(); toggle(v); }}
                  style={{
                    padding: "7px 12px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    cursor: "pointer",
                    background: marcado ? "var(--accent-soft)" : "transparent",
                    gap: 8,
                  }}
                  onMouseOver={e => { if (!marcado) e.currentTarget.style.background = "var(--hover, #f4f4f5)"; }}
                  onMouseOut={e => { if (!marcado) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <CheckBox checked={marcado}/>
                    <span style={{
                      fontSize: 13,
                      fontFamily: "var(--font-mono, monospace)",
                      fontWeight: marcado ? 600 : 400,
                      color: marcado ? "var(--brand-blue)" : "var(--text)",
                      letterSpacing: "0.03em",
                    }}>
                      {v.placa}
                    </span>
                  </div>
                  {v.odometro != null && (
                    <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      {fmtKm(v.odometro)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {selecionadasUnicas.length > 0 && (
            <div style={{
              padding: "7px 12px",
              borderTop: "1px solid var(--border)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontSize: 12, color: "var(--muted)",
            }}>
              <span>{selecionadasUnicas.length} selecionado{selecionadasUnicas.length !== 1 ? "s" : ""}</span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onChange([]); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--danger, #e54d2e)", fontSize: 12, padding: 0,
                }}
              >
                Limpar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Input de números de destino (chips) ─────────────────────────────────────
function InputNumeros({ numeros, onChange }) {
  const [valor, setValor] = useState("");

  function adicionar(texto) {
    const limpos = String(texto)
      .split(/[,;\s]+/)
      .map(n => n.replace(/[^\d+]/g, ""))
      .filter(Boolean);
    if (limpos.length === 0) { setValor(""); return; }
    const novos = [...numeros];
    for (const n of limpos) if (!novos.includes(n)) novos.push(n);
    onChange(novos);
    setValor("");
  }

  function onKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      adicionar(valor);
    } else if (e.key === "Backspace" && valor === "" && numeros.length > 0) {
      onChange(numeros.slice(0, -1));
    }
  }

  return (
    <div>
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 5,
        padding: numeros.length === 0 ? "4px 6px" : "6px 8px",
        border: "1px solid var(--border)",
        borderRadius: 6,
        background: "var(--bg)",
        minHeight: 38,
        alignItems: "center",
        boxSizing: "border-box",
      }}>
        {numeros.map(n => (
          <span key={n} style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "var(--accent-soft)",
            color: "var(--brand-blue)",
            border: "1px solid var(--accent-border)",
            borderRadius: 4,
            padding: "2px 6px 2px 8px",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "var(--font-mono, monospace)",
            letterSpacing: "0.03em",
          }}>
            {n}
            <button
              type="button"
              onClick={() => onChange(numeros.filter(x => x !== n))}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 0, lineHeight: 1, color: "var(--brand-blue)",
                display: "flex", alignItems: "center", opacity: 0.7,
              }}
            >
              <Icon name="x" size={11}/>
            </button>
          </span>
        ))}
        <input
          type="text"
          inputMode="tel"
          value={valor}
          onChange={e => setValor(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => valor.trim() && adicionar(valor)}
          placeholder={numeros.length === 0 ? "Ex: 5546999990000 — Enter para adicionar" : ""}
          style={{
            flex: 1,
            minWidth: 140,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--text)",
            fontSize: 13,
            padding: "4px 4px",
          }}
        />
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
        Digite o número com DDI + DDD e pressione Enter (ou vírgula). Pode colar vários separados por vírgula.
      </div>
    </div>
  );
}

function ContatoEnvio({ contatos, carregando, form, onToggle, onAdd, onManualNumbers, onCreate }) {
  const [novo, setNovo] = useState({ nome: "", numero: "" });
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState(null);
  const numerosSelecionados = new Set((form.numeros || []).map(normalizarNumero).filter(Boolean));

  async function salvarContato() {
    const nome = novo.nome.trim();
    const numero = normalizarNumero(novo.numero);
    setErro(null);
    if (!nome || !numero) {
      setErro("Informe nome e numero.");
      return;
    }

    setCriando(true);
    try {
      const contato = await onCreate({ nome, numero });
      setNovo({ nome: "", numero: "" });
      onAdd(contato);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCriando(false);
    }
  }

  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: 8,
      background: "var(--bg)",
      overflow: "hidden",
    }}>
      <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
          Contatos de envio *
        </label>
        {carregando ? (
          <div className="muted" style={{ fontSize: 12 }}>Carregando contatos...</div>
        ) : contatos.length === 0 ? (
          <div className="muted" style={{ fontSize: 12 }}>Nenhum contato cadastrado.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto" }}>
            {contatos.map(contato => {
              const numero = normalizarNumero(contato.numero);
              const marcado = numerosSelecionados.has(numero);
              return (
                <button
                  key={contato.id}
                  type="button"
                  onClick={() => onToggle(contato)}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    background: marcado ? "var(--accent-soft)" : "var(--surface)",
                    color: "var(--text)",
                    padding: "7px 9px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <CheckBox checked={marcado}/>
                  <span style={{ fontWeight: 600, fontSize: 12.5 }}>{contato.nome}</span>
                  <span className="muted" style={{ fontSize: 12, marginLeft: "auto", fontFamily: "var(--font-mono, monospace)" }}>
                    {numero}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>
          Cadastrar contato
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            value={novo.nome}
            onChange={e => setNovo(n => ({ ...n, nome: e.target.value }))}
            placeholder="Nome"
            style={{
              minWidth: 0,
              padding: "8px 10px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 13,
            }}
          />
          <input
            type="tel"
            inputMode="tel"
            value={novo.numero}
            onChange={e => setNovo(n => ({ ...n, numero: e.target.value }))}
            placeholder="5548996523702"
            style={{
              minWidth: 0,
              padding: "8px 10px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 13,
            }}
          />
          <button
            type="button"
            className="btn"
            disabled={criando}
            onClick={salvarContato}
            style={{ fontSize: 13, whiteSpace: "nowrap" }}
          >
            {criando ? "Salvando..." : "Salvar"}
          </button>
        </div>
        {erro && <div style={{ color: "var(--danger, #e54d2e)", fontSize: 12, marginTop: 6 }}>{erro}</div>}

        <div style={{ marginTop: 12 }}>
          <InputNumeros
            numeros={form.numeros}
            onChange={onManualNumbers}
          />
        </div>
      </div>
    </div>
  );
}

function CheckBox({ checked, indeterminate }) {
  return (
    <div style={{
      width: 15, height: 15, borderRadius: 3, flexShrink: 0,
      border: `1.5px solid ${checked || indeterminate ? "var(--brand-blue)" : "var(--border-strong, #aaa)"}`,
      background: checked || indeterminate ? "var(--brand-blue)" : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 120ms",
    }}>
      {indeterminate && !checked && (
        <div style={{ width: 7, height: 1.5, background: "#fff", borderRadius: 1 }}/>
      )}
      {checked && <Icon name="check" size={9} strokeWidth={3} style={{ color: "#fff" }}/>}
    </div>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────
function ManutencaoMensagens() {
  const [automacoes, setAutomacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const [veiculos, setVeiculos] = useState([]);
  const [veiculosCarregando, setVeiculosCarregando] = useState(false);
  const [contatos, setContatos] = useState([]);
  const [contatosCarregando, setContatosCarregando] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [salvando, setSalvando] = useState(false);
  const [formErro, setFormErro] = useState(null);

  const [deletandoId, setDeletandoId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [kmModal, setKmModal] = useState(null);
  const [kmValor, setKmValor] = useState("");
  const [kmSalvando, setKmSalvando] = useState(false);
  const automacoesAgrupadas = agruparAutomacoes(automacoes);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const data = await RB_API.listManutencao();
      setAutomacoes(data.automacoes || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  async function carregarVeiculos() {
    setVeiculosCarregando(true);
    try {
      const data = await RB_API.listVeiculosManutencao();
      setVeiculos(dedupeVeiculos(data.veiculos || []));
    } catch (e) {
      console.error("Erro ao carregar veículos:", e.message);
      setVeiculos([]);
    } finally {
      setVeiculosCarregando(false);
    }
  }

  async function carregarContatos() {
    setContatosCarregando(true);
    try {
      const data = await RB_API.listContatosManutencao();
      setContatos(data.contatos || []);
    } catch (e) {
      console.error("Erro ao carregar contatos:", e.message);
      setContatos([]);
    } finally {
      setContatosCarregando(false);
    }
  }

  function alternarContato(contato) {
    if (!contato) return;
    const numero = normalizarNumero(contato.numero);
    if (!numero) return;
    setForm(f => ({
      ...f,
      numeros: f.numeros.map(normalizarNumero).includes(numero)
        ? f.numeros.map(normalizarNumero).filter(n => n !== numero)
        : [...f.numeros.map(normalizarNumero).filter(Boolean), numero],
    }));
  }

  function adicionarContato(contato) {
    if (!contato) return;
    const numero = normalizarNumero(contato.numero);
    if (!numero) return;
    setForm(f => {
      const numeros = f.numeros.map(normalizarNumero).filter(Boolean);
      return {
        ...f,
        numeros: numeros.includes(numero) ? numeros : [...numeros, numero],
      };
    });
  }

  function alterarNumeros(nums) {
    const limpos = nums.map(normalizarNumero).filter(Boolean);
    setForm(f => ({
      ...f,
      numeros: limpos,
    }));
  }

  async function criarContato(payload) {
    const data = await RB_API.createContatoManutencao(payload);
    const contato = data.contato;
    setContatos(lista => {
      const semDuplicado = lista.filter(c => String(c.id) !== String(contato.id) && c.numero !== contato.numero);
      return [...semDuplicado, contato].sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
    });
    return contato;
  }

  function nomeDoContato(numero) {
    const limpo = normalizarNumero(numero);
    return contatos.find(c => normalizarNumero(c.numero) === limpo)?.nome || "";
  }

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { carregarContatos(); }, []);

  function abrirNovo() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setFormErro(null);
    setModalOpen(true);
    if (veiculos.length === 0) carregarVeiculos();
    if (contatos.length === 0) carregarContatos();
  }

  function abrirEditar(a) {
    const itens = a.itens || [a];
    setEditando(a);
    setForm({
      selecionadas: dedupeSelecionadas(itens.map(item => ({ placa: item.placa, km_atual: item.km_atual }))),
      titulo: a.titulo,
      mensagem: a.mensagem,
      intervalo_km: String(a.intervalo_km),
      numeros: String(a.numeros || "").split(",").filter(Boolean),
    });
    setFormErro(null);
    setModalOpen(true);
    if (veiculos.length === 0) carregarVeiculos();
    if (contatos.length === 0) carregarContatos();
  }

  function fecharModal() {
    setModalOpen(false);
    setEditando(null);
    setFormErro(null);
  }

  async function salvar(e) {
    e.preventDefault();
    setFormErro(null);

    if (form.selecionadas.length === 0) {
      setFormErro("Selecione ao menos um veículo.");
      return;
    }
    if (!form.titulo.trim() || !form.mensagem.trim() || !form.intervalo_km) {
      setFormErro("Preencha todos os campos obrigatórios.");
      return;
    }
    if (Number(form.intervalo_km) <= 0) {
      setFormErro("O intervalo de KM deve ser maior que zero.");
      return;
    }
    if (form.numeros.length === 0) {
      setFormErro("Adicione ao menos um número de destino.");
      return;
    }

    setSalvando(true);
    try {
      const contatoPayload = {
        numeros: form.numeros.map(normalizarNumero).filter(Boolean).join(","),
        contato_id: null,
        contato_nome: null,
        contato_numero: null,
      };
      if (editando) {
        // Edição: atualiza apenas o registro específico
        const ids = editando.ids || [editando.id];
        const payload = {
          titulo: form.titulo.trim(),
          mensagem: form.mensagem.trim(),
          intervalo_km: Number(form.intervalo_km),
          ...contatoPayload,
        };
        if (ids.length === 1) {
          payload.km_atual = form.selecionadas[0]?.km_atual ?? editando.km_atual;
        }
        await Promise.all(ids.map(id => RB_API.updateManutencao(id, payload)));
      } else {
        // Criação: um registro por placa selecionada
        await RB_API.createManutencao({
          placas: dedupeSelecionadas(form.selecionadas),
          titulo: form.titulo.trim(),
          mensagem: form.mensagem.trim(),
          intervalo_km: Number(form.intervalo_km),
          ...contatoPayload,
        });
      }
      fecharModal();
      await carregar();
    } catch (e) {
      setFormErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarDelete(item) {
    const ids = item.ids || [item.id];
    setDeletandoId(item.id);
    try {
      await Promise.all(ids.map(id => RB_API.deleteManutencao(id)));
      setConfirmDelete(null);
      await carregar();
    } catch (e) {
      alert(e.message);
    } finally {
      setDeletandoId(null);
    }
  }

  async function salvarKm(e) {
    e.preventDefault();
    setKmSalvando(true);
    try {
      await RB_API.updateManutencao(kmModal.id, { km_atual: Number(kmValor) });
      setKmModal(null);
      setKmValor("");
      await carregar();
    } catch (e) {
      alert(e.message);
    } finally {
      setKmSalvando(false);
    }
  }

  async function toggleAtivo(a) {
    try {
      const ids = a.ids || [a.id];
      await Promise.all(ids.map(id => RB_API.updateManutencao(id, { ativo: !a.ativo })));
      await carregar();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>Automações</h1>
          <div className="sub">Automação de mensagens de manutenção por KM rodado</div>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>
          <Icon name="plus" size={14}/> Nova Automação
        </button>
      </div>

      {erro && (
        <div className="card" style={{ color: "var(--danger)", marginBottom: 16, fontSize: 13 }}>
          Erro ao carregar: {erro}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ color: "var(--muted)", fontSize: 13 }}>Carregando…</div>
      ) : automacoes.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🔧</div>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>Nenhuma automação cadastrada</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
            Crie automações para enviar mensagens de manutenção quando o veículo atingir um determinado KM.
          </div>
          <button className="btn btn-primary" onClick={abrirNovo}>
            <Icon name="plus" size={14}/> Criar primeira automação
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {automacoesAgrupadas.map(a => (
            <div key={(a.ids || [a.id]).join("-")} className="card" style={{
              opacity: a.ativo ? 1 : 0.55,
              borderLeft: `3px solid ${a.ativo ? "var(--brand-blue)" : "var(--border)"}`,
              padding: "12px 16px",
            }}>
              <div className="row between" style={{ alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 5, flexWrap: "wrap" }}>
                    {(a.placas || [a.placa]).map(placa => (
                      <span key={placa} style={{
                        background: "var(--accent-soft)",
                        color: "var(--brand-blue)",
                        border: "1px solid var(--accent-border)",
                        borderRadius: 5,
                        padding: "2px 9px",
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono, monospace)",
                        letterSpacing: "0.05em",
                      }}>{placa}</span>
                    ))}
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{a.titulo}</span>
                    {!a.ativo && (
                      <span style={{
                        background: "var(--surface-alt, #f4f4f5)",
                        color: "var(--muted)",
                        borderRadius: 4,
                        padding: "1px 7px",
                        fontSize: 11,
                        border: "1px solid var(--border)",
                      }}>Inativa</span>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, marginBottom: 8, lineHeight: 1.5 }}>
                    {a.mensagem}
                  </div>
                  {a.numeros && (
                    <div className="row" style={{ gap: 5, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
                      <span className="muted" style={{ fontSize: 12 }}>Enviar para:</span>
                      {String(a.numeros).split(",").filter(Boolean).map(n => {
                        const nome = nomeDoContato(n);
                        return (
                        <span key={n} style={{
                          background: "var(--accent-soft)",
                          border: "1px solid var(--accent-border)",
                          borderRadius: 4,
                          padding: "1px 7px",
                          fontSize: 11.5,
                          fontFamily: "var(--font-mono, monospace)",
                          color: "var(--brand-blue)",
                        }}>
                          {nome ? `${nome} - ${normalizarNumero(n)}` : normalizarNumero(n)}
                        </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="row" style={{ gap: 20, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12 }}>
                      <span className="muted">Intervalo: </span>
                      <strong>a cada {fmtKm(a.intervalo_km)}</strong>
                    </div>
                    <div style={{ fontSize: 12 }}>
                      <span className="muted">KM atual: </span>
                      <strong>{(a.itens || [a]).length > 1 ? "por placa" : fmtKm(a.km_atual)}</strong>
                    </div>
                    <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                      <span className="muted">Enviar no KM: </span>
                      <strong style={{
                        color: "var(--brand-blue)",
                        background: "var(--accent-soft)",
                        border: "1px solid var(--accent-border)",
                        borderRadius: 4,
                        padding: "1px 7px",
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: 12,
                      }}>
                        {(a.itens || [a]).length > 1 ? "por placa" : fmtKm(a.km_proximo_envio)}
                      </strong>
                    </div>
                  </div>
                  {(a.itens || []).length > 1 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {a.itens.map(item => (
                        <span key={item.id} className="muted" style={{
                          border: "1px solid var(--border)",
                          borderRadius: 5,
                          padding: "2px 7px",
                          fontSize: 11,
                        }}>
                          {item.placa}: {fmtKm(item.km_atual)} -> {fmtKm(item.km_proximo_envio)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="row" style={{ gap: 5, flexShrink: 0 }}>
                  {(a.itens || [a]).length === 1 && (
                    <button
                      onClick={() => { setKmModal(a); setKmValor(String(a.km_atual)); }}
                      title="Atualizar KM"
                      style={{
                        background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: 6, padding: "5px 10px", cursor: "pointer",
                        fontSize: 12, color: "var(--text)", display: "flex", alignItems: "center", gap: 5,
                      }}
                    >
                      <Icon name="trending-up" size={13}/> KM
                    </button>
                  )}
                  <button
                    onClick={() => toggleAtivo(a)}
                    title={a.ativo ? "Desativar" : "Ativar"}
                    style={{
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: 6, padding: "5px 8px", cursor: "pointer",
                      color: a.ativo ? "var(--danger, #e54d2e)" : "var(--muted)",
                    }}
                  >
                    <Icon name={a.ativo ? "x" : "check"} size={14}/>
                  </button>
                  <button
                    onClick={() => abrirEditar(a)}
                    title="Editar"
                    style={{
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "var(--muted)",
                    }}
                  >
                    <Icon name="edit" size={14}/>
                  </button>
                  <button
                    onClick={() => setConfirmDelete(a)}
                    title="Excluir"
                    style={{
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: 6, padding: "5px 8px", cursor: "pointer",
                      color: "var(--danger, #e54d2e)",
                    }}
                  >
                    <Icon name="trash" size={14}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal criar / editar ── */}
      {modalOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 16,
        }} onClick={e => { if (e.target === e.currentTarget) fecharModal(); }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 24, width: "100%", maxWidth: 520,
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <div className="row between" style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>
                {editando ? "Editar automação" : "Nova automação"}
              </h2>
              <button onClick={fecharModal} style={{
                background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4,
              }}>
                <Icon name="x" size={18}/>
              </button>
            </div>

            <form onSubmit={salvar}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, display: "block", marginBottom: 5 }}>
                    Veículos *
                  </label>
                  {editando ? (
                    // Em edição: só mostra a placa atual, sem trocar
                    <div style={{
                      padding: "8px 10px", border: "1px solid var(--border)",
                      borderRadius: 6, background: "var(--bg)", fontSize: 13,
                      fontFamily: "var(--font-mono, monospace)", fontWeight: 600,
                      color: "var(--brand-blue)",
                    }}>
                      {(editando.placas || [editando.placa]).join(", ")}
                    </div>
                  ) : (
                    <MultiSelectVeiculos
                      selecionadas={form.selecionadas}
                      onChange={sel => setForm(f => ({ ...f, selecionadas: sel }))}
                      veiculos={veiculos}
                      carregando={veiculosCarregando}
                    />
                  )}
                  {!editando && form.selecionadas.length > 0 && (
                    <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                      As placas selecionadas ficarao agrupadas nesta automacao.
                    </div>
                  )}
                </div>

                {/* Prévia dos KMs selecionados (apenas no modo criação) */}
                {!editando && form.selecionadas.length > 0 && (
                  <div style={{
                    background: "var(--accent-soft)",
                    border: "1px solid var(--accent-border)",
                    borderRadius: 6,
                    padding: "10px 12px",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 7, color: "var(--brand-blue)" }}>
                      Resumo por veículo
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "4px 12px", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>Placa</span>
                      <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>KM atual</span>
                      <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>Enviar no KM</span>
                      {form.selecionadas.map(s => {
                        const kmAtual = Number(s.km_atual) || 0;
                        const intervalo = Number(form.intervalo_km) || 0;
                        return (
                          <React.Fragment key={s.placa}>
                            <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, fontSize: 12, color: "var(--brand-blue)" }}>{s.placa}</span>
                            <span style={{ fontSize: 12 }}>{fmtKm(kmAtual)}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: intervalo ? "var(--text)" : "var(--muted)" }}>
                              {intervalo ? fmtKm(kmAtual + intervalo) : "—"}
                            </span>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, display: "block", marginBottom: 5 }}>
                    Título da mensagem *
                  </label>
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                    placeholder="Ex: Troca de óleo"
                    style={{
                      width: "100%", padding: "8px 10px", border: "1px solid var(--border)",
                      borderRadius: 6, background: "var(--bg)", color: "var(--text)",
                      fontSize: 13, boxSizing: "border-box",
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, display: "block", marginBottom: 5 }}>
                    Mensagem *
                  </label>
                  <textarea
                    value={form.mensagem}
                    onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                    placeholder="Ex: Olá! O veículo atingiu 10.000 km. Realize a troca de óleo."
                    rows={4}
                    style={{
                      width: "100%", padding: "8px 10px", border: "1px solid var(--border)",
                      borderRadius: 6, background: "var(--bg)", color: "var(--text)",
                      fontSize: 13, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                    }}
                    required
                  />
                </div>

                <ContatoEnvio
                  contatos={contatos}
                  carregando={contatosCarregando}
                  form={form}
                  onToggle={alternarContato}
                  onAdd={adicionarContato}
                  onManualNumbers={alterarNumeros}
                  onCreate={criarContato}
                />

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, display: "block", marginBottom: 5 }}>
                    Enviar a cada (KM) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.intervalo_km}
                    onChange={e => setForm(f => ({ ...f, intervalo_km: e.target.value }))}
                    placeholder="Ex: 10000"
                    style={{
                      width: "100%", padding: "8px 10px", border: "1px solid var(--border)",
                      borderRadius: 6, background: "var(--bg)", color: "var(--text)",
                      fontSize: 13, boxSizing: "border-box",
                    }}
                    required
                  />
                </div>

                {formErro && (
                  <div style={{
                    background: "color-mix(in oklab, var(--danger, #e54d2e) 10%, transparent)",
                    border: "1px solid color-mix(in oklab, var(--danger, #e54d2e) 30%, transparent)",
                    borderRadius: 6, padding: "8px 12px",
                    color: "var(--danger, #e54d2e)", fontSize: 13,
                  }}>
                    {formErro}
                  </div>
                )}

                <div className="row" style={{ gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                  <button type="button" onClick={fecharModal} className="btn" style={{ fontSize: 13 }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={salvando} style={{ fontSize: 13 }}>
                    {salvando ? "Salvando…" : editando
                      ? "Salvar alterações"
                      : "Criar automacao"
                    }
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal atualizar KM ── */}
      {kmModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 16,
        }} onClick={e => { if (e.target === e.currentTarget) { setKmModal(null); setKmValor(""); }}}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 24, width: "100%", maxWidth: 360,
          }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 15 }}>Atualizar KM — {kmModal.placa}</h2>
              <button onClick={() => { setKmModal(null); setKmValor(""); }} style={{
                background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4,
              }}>
                <Icon name="x" size={16}/>
              </button>
            </div>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>
              KM atual registrado: <strong>{fmtKm(kmModal.km_atual)}</strong>
            </div>
            <form onSubmit={salvarKm}>
              <input
                type="number"
                min="0"
                value={kmValor}
                onChange={e => setKmValor(e.target.value)}
                placeholder="Novo KM do veículo"
                autoFocus
                style={{
                  width: "100%", padding: "9px 11px", border: "1px solid var(--border)",
                  borderRadius: 6, background: "var(--bg)", color: "var(--text)",
                  fontSize: 14, boxSizing: "border-box", marginBottom: 14,
                }}
                required
              />
              <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn" onClick={() => { setKmModal(null); setKmValor(""); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={kmSalvando}>
                  {kmSalvando ? "Salvando…" : "Atualizar KM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmação de exclusão ── */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 16,
        }} onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 24, width: "100%", maxWidth: 380,
          }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15 }}>Excluir automação</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--muted)" }}>
              Tem certeza que deseja excluir <strong>"{confirmDelete.titulo}"</strong> do veículo <strong>{confirmDelete.placa}</strong>?
            </p>
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button
                className="btn"
                disabled={deletandoId === confirmDelete.id}
                onClick={() => confirmarDelete(confirmDelete)}
                style={{ background: "var(--danger, #e54d2e)", color: "#fff", border: "none" }}
              >
                {deletandoId === confirmDelete.id ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.ManutencaoMensagens = ManutencaoMensagens;
