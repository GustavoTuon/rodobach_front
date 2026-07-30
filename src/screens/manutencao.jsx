const EMPTY_FORM = {
  selecionadas: [], // [{ placa, km_atual }]
  titulo: "",
  mensagem: "",
  intervalo_km: "",
  tipo_controle: "km",
  intervalo_dias: "",
  data_ultimo_servico: "",
  numeros: [], // ["5546999990000", ...]
};

const PLANOS_MANUTENCAO = [
  { id: "volvo-fh-oleo-motor", fabricante: "Volvo", match: /VOLVO\/FH|FH 460|FH/i, titulo: "Volvo FH 460 - Oleo motor e filtros", intervalo: 150000, criticidade: "Plano fabricante", fonte: "Volvo FH D13: ate 150.000 km ou 1 ano com oleo VDS4.", mensagem: "O veiculo atingiu o marco programado para troca de oleo do motor e filtros. Confira aplicacao, oleo VDS4 e historico antes de liberar a viagem." },
  { id: "volvo-vm-oleo-motor", fabricante: "Volvo", match: /VOLVO\/VM|VM 290|VM 330/i, titulo: "Volvo VM - Oleo motor e filtros", intervalo: 80000, criticidade: "Sugestao conservadora", fonte: "Intervalo ajustavel; confirmar no manual do modelo/operacao.", mensagem: "O veiculo atingiu o marco programado para troca de oleo do motor e filtros. Confira aplicacao, especificacao do oleo e historico." },
  { id: "vw-constellation-oleo", fabricante: "VW", match: /VW\/(24|30)\.|CONSTELLATION|CRM|CRC/i, titulo: "VW Constellation - Oleo motor e filtros", intervalo: 40000, criticidade: "Operacao severa", fonte: "Planos Constellation variam por grupo de manutencao; use 40.000 km como base conservadora.", mensagem: "O veiculo atingiu o marco programado para troca de oleo do motor e filtros. Confirmar grupo de manutencao VW antes da execucao." },
  { id: "scania-r460-oleo", fabricante: "Scania", match: /SCANIA|R460|R 460/i, titulo: "Scania R460 - Oleo motor e filtros", intervalo: 60000, criticidade: "Sugestao conservadora", fonte: "Scania define intervalos por aplicacao, oleo e dados operacionais; acima de 30.000 km pode exigir manutencoes intermediarias.", mensagem: "O veiculo atingiu o marco programado para troca de oleo do motor e filtros. Conferir plano Scania por aplicacao e qualidade do oleo." },
  { id: "filtro-combustivel", fabricante: "Geral", match: /.*/i, titulo: "Filtro combustivel", intervalo: 30000, criticidade: "Preventiva", fonte: "Padrao operacional editavel.", mensagem: "O veiculo atingiu o marco programado para troca do filtro de combustivel. Verifique e programe a manutencao." },
  { id: "filtro-ar", fabricante: "Geral", match: /.*/i, titulo: "Filtro de ar", intervalo: 30000, criticidade: "Preventiva", fonte: "Padrao operacional editavel.", mensagem: "O veiculo atingiu o marco programado para inspecao ou troca do filtro de ar. Verifique e programe a manutencao." },
  { id: "oleo-diferencial", fabricante: "Geral", match: /.*/i, titulo: "Oleo diferencial", intervalo: 120000, criticidade: "Preventiva", fonte: "Padrao operacional editavel.", mensagem: "O veiculo atingiu o marco programado para troca do oleo do diferencial. Verifique e programe a manutencao." },
  { id: "oleo-cambio", fabricante: "Geral", match: /.*/i, titulo: "Oleo cambio", intervalo: 240000, criticidade: "Preventiva", fonte: "Padrao operacional editavel.", mensagem: "O veiculo atingiu o marco programado para troca do oleo do cambio. Verifique e programe a manutencao." },
  { id: "afericao-tacografo", fabricante: "Geral", match: /.*/i, titulo: "Aferição de tacógrafo", tipoControle: "data", intervaloDias: 730, criticidade: "Obrigatória", fonte: "Verificação periódica do Inmetro: validade de até 2 anos.", mensagem: "A validade da aferição do tacógrafo está próxima do vencimento. Programe a verificação em posto autorizado e atualize o certificado." },
];

function fmtKm(v) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR") + " km";
}

function proximoKmProgramado(kmAtual, intervaloKm) {
  const km = Number(kmAtual || 0);
  const intervalo = Number(intervaloKm || 0);
  if (!Number.isFinite(km) || !Number.isFinite(intervalo) || intervalo <= 0) return 0;
  if (km <= 0) return intervalo;
  return Math.ceil(km / intervalo) * intervalo;
}

function kmProximoDoItem(item) {
  return Number(item?.km_proximo_envio) || proximoKmProgramado(item?.km_atual, item?.intervalo_km) || 0;
}

function textoVeiculo(veiculo) {
  return [veiculo?.placa, veiculo?.modelo || veiculo?.nome || ""].filter(Boolean).join(" ");
}

function planosParaSelecao(selecionadas, veiculos) {
  const placas = new Set((selecionadas || []).map(s => normalizarPlaca(s.placa)));
  const modelos = (veiculos || [])
    .filter(v => placas.has(normalizarPlaca(v.placa)))
    .map(textoVeiculo)
    .join(" ");
  const especificos = PLANOS_MANUTENCAO.filter(p => p.fabricante !== "Geral" && p.match.test(modelos));
  const gerais = PLANOS_MANUTENCAO.filter(p => p.fabricante === "Geral");
  return [...especificos, ...gerais];
}

function resumoAutomacoes(automacoes) {
  const itens = automacoes || [];
  return {
    total: itens.length,
    ativos: itens.filter(a => a.ativo).length,
    vencidos: itens.filter(a => kmInfo(a).status === "vencido").length,
    perto: itens.filter(a => kmInfo(a).status === "perto").length,
  };
}

function dataBR(value) {
  if (!value) return "-";
  const raw = String(value).slice(0, 10);
  const [ano, mes, dia] = raw.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : "-";
}

function modeloPeloTitulo(titulo) {
  const texto = String(titulo || "").trim();
  const [modelo] = texto.split(" - ");
  return modelo && modelo !== texto ? modelo : "";
}

function modeloDoItem(item) {
  return item?.modelo || item?.veiculoModelo || modeloPeloTitulo(item?.titulo);
}

function agruparPorVeiculo(automacoes) {
  const map = new Map();
  for (const item of automacoes || []) {
    const placa = normalizarPlaca(item.placa) || "SEM PLACA";
    const modelo = modeloDoItem(item);
    if (!map.has(placa)) {
      map.set(placa, {
        placa,
        modelo,
        kmAtual: Number(item.km_atual) || 0,
        ultimaManutencao: item.ultimaManutencao || null,
        planoAutorizado: item.planoAutorizado || null,
        itens: [],
      });
    }
    const grupo = map.get(placa);
    if (!grupo.modelo && modelo) grupo.modelo = modelo;
    if (!grupo.ultimaManutencao && item.ultimaManutencao) grupo.ultimaManutencao = item.ultimaManutencao;
    if (!grupo.planoAutorizado && item.planoAutorizado) grupo.planoAutorizado = item.planoAutorizado;
    if ((Number(item.km_atual) || 0) > grupo.kmAtual) grupo.kmAtual = Number(item.km_atual) || 0;
    grupo.itens.push(item);
  }

  return [...map.values()]
    .map(grupo => ({
      ...grupo,
      itens: grupo.itens.sort((a, b) => (kmInfo(a).faltam ?? 999999999) - (kmInfo(b).faltam ?? 999999999)),
      resumo: resumoKmGrupo({ itens: grupo.itens }),
    }))
    .sort((a, b) => {
      const prio = { vencido: 0, perto: 1, ok: 2, sem_km: 3 };
      return (prio[a.resumo.status] ?? 9) - (prio[b.resumo.status] ?? 9) || a.placa.localeCompare(b.placa);
    });
}

function mensagemPreview(item) {
  const placa = normalizarPlaca(item.placa);
  const titulo = item.titulo || "Manutencao programada";
  const info = kmInfo(item);
  const kmAtual = fmtKm(item.km_atual);
  const kmProgramado = fmtKm(kmProximoDoItem(item));
  const ultima = item.ultimaManutencao;
  const ultimoRegistro = ultima
    ? `${dataBR(ultima.data)} - ${fmtKm(ultima.km)} - ${ultima.descricao || "Manutencao"}${ultima.fornecedor ? ` (${ultima.fornecedor})` : ""}`
    : item.planoAutorizado
      ? `Plano autorizado em ${dataBR(item.planoAutorizado.data)} - ${item.planoAutorizado.fornecedor || "fornecedor nao informado"} - sem KM de execucao`
      : "Sem manutencao com KM encontrada para este servico.";
  return [
    "*ALERTA DE MANUTENCAO POR KM*",
    "",
    `Placa: ${placa}`,
    item.modelo ? `Veiculo: ${item.modelo}` : null,
    `Servico: ${titulo}`,
    `Status: ${info.label}`,
    "",
    `KM atual: ${kmAtual}`,
    `Enviar no KM: ${kmProgramado}`,
    `Ultimo registro: ${ultimoRegistro}`,
    "",
    `Acao: ${item.mensagem || "Verifique e programe a manutencao."}`,
  ].filter(Boolean).join("\n");
}

function kmInfo(item) {
  if (item?.tipo_controle === "data") {
    if (!item.data_proximo_envio) return { status: "sem_km", label: "Informe a última aferição", tone: "var(--text-3)", bg: "var(--surface-2)", faltam: null };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${String(item.data_proximo_envio).slice(0, 10)}T00:00:00`);
    const dias = Math.ceil((due - today) / 86400000);
    if (dias < 0) return { status: "vencido", label: `Vencido há ${Math.abs(dias)} dia(s)`, tone: "#dc2626", bg: "rgba(220,38,38,.10)", faltam: dias };
    if (dias <= 60) return { status: "perto", label: `Vence em ${dias} dia(s)`, tone: "#d97706", bg: "rgba(217,119,6,.11)", faltam: dias };
    return { status: "ok", label: `Vence em ${dataBR(item.data_proximo_envio)}`, tone: "#16a34a", bg: "rgba(22,163,74,.10)", faltam: dias };
  }
  const atual = Number(item?.km_atual);
  const proximo = kmProximoDoItem(item);
  if (!Number.isFinite(atual) || !Number.isFinite(proximo) || proximo <= 0) {
    return { status: "sem_km", label: "Sem KM confiavel", tone: "var(--text-3)", bg: "var(--surface-2)", faltam: null };
  }
  const faltam = proximo - atual;
  if (faltam <= 0) {
    return { status: "vencido", label: `Vencido ${fmtKm(Math.abs(faltam))}`, tone: "#dc2626", bg: "rgba(220,38,38,.10)", faltam };
  }
  if (faltam <= Math.max(Number(item?.intervalo_km) * 0.1, 500)) {
    return { status: "perto", label: `Faltam ${fmtKm(faltam)}`, tone: "#d97706", bg: "rgba(217,119,6,.11)", faltam };
  }
  return { status: "ok", label: `Faltam ${fmtKm(faltam)}`, tone: "#16a34a", bg: "rgba(22,163,74,.10)", faltam };
}

function resumoKmGrupo(automacao) {
  const itens = automacao?.itens || [automacao];
  const infos = itens.map(kmInfo);
  if (infos.some(i => i.status === "vencido")) return { ...infos.find(i => i.status === "vencido"), label: `${infos.filter(i => i.status === "vencido").length} vencido(s)` };
  if (infos.some(i => i.status === "perto")) return { ...infos.find(i => i.status === "perto"), label: `${infos.filter(i => i.status === "perto").length} perto(s)` };
  if (infos.some(i => i.status === "sem_km")) return infos.find(i => i.status === "sem_km");
  const menor = infos.sort((a, b) => a.faltam - b.faltam)[0];
  return { ...menor, label: itens.length > 1 ? `Menor prazo: ${menor.label.toLowerCase()}` : menor.label };
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
  const [open, setOpen] = React.useState(false);
  const [busca, setBusca] = React.useState("");
  const containerRef = React.useRef(null);

  React.useEffect(() => {
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
    textoVeiculo(v).toLowerCase().includes(busca.toLowerCase())
  );

  function toggle(veiculo) {
    const jaEsta = placasSelecionadas.includes(veiculo.placa);
    if (jaEsta) {
      onChange(selecionadas.filter(s => s.placa !== veiculo.placa));
    } else {
      onChange(dedupeSelecionadas([...selecionadas, { placa: veiculo.placa, km_atual: Number(veiculo.odometro) || 0, modelo: veiculo.modelo || "" }]));
    }
  }

  function toggleTodos() {
    if (selecionadasUnicas.length === veiculosUnicos.length) {
      onChange([]);
    } else {
      onChange(veiculosUnicos.map(v => ({ placa: v.placa, km_atual: Number(v.odometro) || 0, modelo: v.modelo || "" })));
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
                  <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                    <CheckBox checked={marcado}/>
                    <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: 13,
                        fontFamily: "var(--font-mono, monospace)",
                        fontWeight: marcado ? 600 : 400,
                        color: marcado ? "var(--brand-blue)" : "var(--text)",
                        letterSpacing: "0.03em",
                      }}>{v.placa}</span>
                      {v.modelo && <span className="muted" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.modelo}</span>}
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
  const [valor, setValor] = React.useState("");

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
  const [novo, setNovo] = React.useState({ nome: "", numero: "" });
  const [criando, setCriando] = React.useState(false);
  const [erro, setErro] = React.useState(null);
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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600 }}>
            Contatos de envio *
          </label>
          <span className="muted" style={{ fontSize: 11 }}>
            {(form.numeros || []).length} selecionado{(form.numeros || []).length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
          Marque para incluir no envio ou desmarque para remover deste alerta.
        </div>
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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
            Cadastrar contato
          </div>
          {(form.numeros || []).length > 0 && (
            <button
              type="button"
              onClick={() => onManualNumbers([])}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: 12,
                padding: 0,
              }}
            >
              Limpar destinos
            </button>
          )}
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
            placeholder="554899503759"
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
  const [automacoes, setAutomacoes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [erro, setErro] = React.useState(null);

  const [veiculos, setVeiculos] = React.useState([]);
  const [veiculosCarregando, setVeiculosCarregando] = React.useState(false);
  const [contatos, setContatos] = React.useState([]);
  const [contatosCarregando, setContatosCarregando] = React.useState(false);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editando, setEditando] = React.useState(null);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [salvando, setSalvando] = React.useState(false);
  const [formErro, setFormErro] = React.useState(null);

  const [deletandoId, setDeletandoId] = React.useState(null);
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  const [kmModal, setKmModal] = React.useState(null);
  const [kmValor, setKmValor] = React.useState("");
  const [kmSalvando, setKmSalvando] = React.useState(false);
  const [registroModal, setRegistroModal] = React.useState(false);
  const [registroSalvando, setRegistroSalvando] = React.useState(false);
  const [registroErro, setRegistroErro] = React.useState("");
  const [registroForm, setRegistroForm] = React.useState({
    placa: "", automacao_id: "", tipo_movimento: "troca_oleo_motor",
    descricao: "Troca de óleo do motor", data_servico: new Date().toISOString().slice(0, 10),
    km_servico: "", fornecedor: "", documento: "", observacao: "",
  });
  const [busca, setBusca] = React.useState("");
  const [filtroStatus, setFiltroStatus] = React.useState("todos");
  const [ordenacao, setOrdenacao] = React.useState("urgencia");
  const [comoFunciona, setComoFunciona] = React.useState(false);
  const [expandidos, setExpandidos] = React.useState(() => new Set());
  const todosVeiculos = agruparPorVeiculo(automacoes);
  const veiculosAgrupados = todosVeiculos
    .filter(veiculo => {
      const termo = busca.trim().toLowerCase();
      const corresponde = !termo || [veiculo.placa, veiculo.modelo, ...veiculo.itens.map(item => item.titulo)]
        .some(value => String(value || "").toLowerCase().includes(termo));
      if (!corresponde) return false;
      if (filtroStatus === "todos") return true;
      if (filtroStatus === "pausado") return veiculo.itens.every(item => !item.ativo);
      if (filtroStatus === "sem_km") return veiculo.resumo.status === "sem_km";
      return veiculo.resumo.status === filtroStatus;
    })
    .sort((a, b) => {
      if (ordenacao === "placa") return a.placa.localeCompare(b.placa);
      if (ordenacao === "km") return Number(a.resumo.faltam ?? 999999999) - Number(b.resumo.faltam ?? 999999999);
      return 0;
    });
  const resumo = resumoAutomacoes(automacoes);
  const veiculosMonitorados = todosVeiculos.length;
  const planosSugeridos = planosParaSelecao(form.selecionadas, veiculos);

  const carregar = React.useCallback(async () => {
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

  React.useEffect(() => { carregar(); }, [carregar]);
  React.useEffect(() => { carregarContatos(); }, []);
  React.useEffect(() => {
    if (!automacoes.length) return;
    setExpandidos(new Set(
      agruparPorVeiculo(automacoes)
        .filter(veiculo => ["vencido", "perto"].includes(veiculo.resumo.status))
        .map(veiculo => veiculo.placa)
    ));
  }, [automacoes]);

  function toggleVeiculo(placa) {
    setExpandidos(current => {
      const next = new Set(current);
      if (next.has(placa)) next.delete(placa); else next.add(placa);
      return next;
    });
  }

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
      intervalo_km: a.intervalo_km ? String(a.intervalo_km) : "",
      tipo_controle: a.tipo_controle || "km",
      intervalo_dias: a.intervalo_dias ? String(a.intervalo_dias) : "",
      data_ultimo_servico: a.data_ultimo_servico ? String(a.data_ultimo_servico).slice(0, 10) : "",
      numeros: String(a.numeros || "").split(",").filter(Boolean),
    });
    setFormErro(null);
    setModalOpen(true);
    if (veiculos.length === 0) carregarVeiculos();
    if (contatos.length === 0) carregarContatos();
  }

  function aplicarPlano(plano) {
    setForm(f => ({
      ...f,
      titulo: plano.titulo,
      mensagem: plano.mensagem,
      tipo_controle: plano.tipoControle || "km",
      intervalo_km: plano.tipoControle === "data" ? "" : String(plano.intervalo),
      intervalo_dias: plano.tipoControle === "data" ? String(plano.intervaloDias) : "",
      data_ultimo_servico: plano.tipoControle === "data" ? f.data_ultimo_servico : "",
    }));
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
    if (!form.titulo.trim() || !form.mensagem.trim() || (form.tipo_controle === "data" ? !form.intervalo_dias : !form.intervalo_km)) {
      setFormErro("Preencha todos os campos obrigatórios.");
      return;
    }
    if (form.tipo_controle === "km" && Number(form.intervalo_km) <= 0) {
      setFormErro("O intervalo de KM deve ser maior que zero.");
      return;
    }
    if (form.tipo_controle === "data" && (!form.data_ultimo_servico || Number(form.intervalo_dias) <= 0)) {
      setFormErro("Informe a data da última aferição e um intervalo em dias.");
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
          tipo_controle: form.tipo_controle,
          intervalo_km: form.tipo_controle === "km" ? Number(form.intervalo_km) : null,
          intervalo_dias: form.tipo_controle === "data" ? Number(form.intervalo_dias) : null,
          data_ultimo_servico: form.tipo_controle === "data" ? form.data_ultimo_servico : null,
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
          tipo_controle: form.tipo_controle,
          intervalo_km: form.tipo_controle === "km" ? Number(form.intervalo_km) : null,
          intervalo_dias: form.tipo_controle === "data" ? Number(form.intervalo_dias) : null,
          data_ultimo_servico: form.tipo_controle === "data" ? form.data_ultimo_servico : null,
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

  function abrirRegistro() {
    if (veiculos.length === 0) carregarVeiculos();
    const primeiraPlaca = veiculosAgrupados[0]?.placa || "";
    setRegistroForm(f => ({ ...f, placa: primeiraPlaca, automacao_id: "", km_servico: "" }));
    setRegistroErro("");
    setRegistroModal(true);
  }

  async function salvarRegistro(e) {
    e.preventDefault();
    setRegistroErro("");
    if (!registroForm.placa || !registroForm.km_servico || !registroForm.data_servico || !registroForm.descricao.trim()) {
      setRegistroErro("Preencha placa, tipo, descrição, data e KM realizado.");
      return;
    }
    setRegistroSalvando(true);
    try {
      await RB_API.createRegistroManutencao({
        ...registroForm,
        automacao_id: registroForm.automacao_id ? Number(registroForm.automacao_id) : null,
        km_servico: Number(registroForm.km_servico),
      });
      setRegistroModal(false);
      await carregar();
    } catch (e) {
      setRegistroErro(e.message);
    } finally {
      setRegistroSalvando(false);
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
          <h1>Manutenção preventiva</h1>
          <div className="sub">Gerencie planos de manutenção, registre serviços e acompanhe os próximos vencimentos.</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={abrirRegistro}>
            <Icon name="wrench" size={14}/> Registrar serviço
          </button>
          <button className="btn btn-primary" onClick={abrirNovo}>
            <Icon name="plus" size={14}/> Novo plano
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: "9px 12px", marginBottom: 12 }}>
        <button type="button" onClick={() => setComoFunciona(value => !value)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,border:0,background:"transparent",color:"var(--text)",cursor:"pointer",padding:0,textAlign:"left"}}>
          <Icon name="info" size={14} style={{color:"var(--brand-blue)"}}/><strong style={{fontSize:12.5}}>Como funciona?</strong>
          <span className="muted" style={{fontSize:12}}>Cadastre o plano → registre o serviço → acompanhe os alertas</span>
          <Icon name="chevron-down" size={14} style={{marginLeft:"auto",transform:comoFunciona?"rotate(180deg)":"none"}}/>
        </button>
        {comoFunciona && <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,paddingTop:10,marginTop:9,borderTop:"1px solid var(--border)"}}>
          {["Defina o serviço e o intervalo por KM ou data.","Informe a data e o KM quando o serviço for executado.","O sistema recalcula o vencimento e alerta os responsáveis."].map((text,index)=><div key={text} style={{fontSize:12,color:"var(--muted)"}}><strong style={{color:"var(--text)"}}>{index+1}. {["Cadastre o plano","Registre quando fizer","Acompanhe o alerta"][index]}</strong><div style={{marginTop:3}}>{text}</div></div>)}
        </div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
        {[
          { label: "Planos ativos", value: resumo.ativos, sub: `${resumo.total} cadastrados`, icon: "wrench", tone: "var(--brand-blue)", filtro: "todos" },
          { label: "Vencidos", value: resumo.vencidos, sub: "pedem ação", icon: "alert", tone: "#dc2626", filtro: "vencido" },
          { label: "Próximos", value: resumo.perto, sub: "janela de alerta", icon: "bell", tone: "#d97706", filtro: "perto" },
          { label: "Veículos monitorados", value: veiculosMonitorados, sub: "com plano cadastrado", icon: "truck", tone: "#16a34a", filtro: "todos" },
        ].map(kpi => (
          <button type="button" key={kpi.label} className="card" onClick={()=>setFiltroStatus(kpi.filtro)} style={{ padding: "12px 14px", borderLeft: `3px solid ${kpi.tone}`,textAlign:"left",cursor:"pointer",color:"inherit",outline:filtroStatus===kpi.filtro?"1px solid var(--accent-border)":"none" }}>
            <div className="row" style={{ gap: 7, color: "var(--muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
              <Icon name={kpi.icon} size={13}/>{kpi.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 5, color: "var(--text)" }}>{kpi.value}</div>
            <div className="muted" style={{ fontSize: 12 }}>{kpi.sub}</div>
          </button>
        ))}
      </div>

      <div className="card manutencao-filtros" style={{padding:10,marginBottom:12,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",position:"sticky",top:0,zIndex:5}}>
        <div style={{position:"relative",flex:"1 1 260px"}}><Icon name="search" size={14} style={{position:"absolute",left:10,top:10,color:"var(--muted)"}}/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por placa, veículo ou serviço" style={{width:"100%",height:34,boxSizing:"border-box",padding:"0 10px 0 32px",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text)"}}/></div>
        <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{height:34,background:"var(--bg)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text)",padding:"0 28px 0 9px"}}><option value="todos">Todos os status</option><option value="vencido">Vencidos</option><option value="perto">Próximos</option><option value="ok">Em dia</option><option value="sem_km">Sem histórico/KM</option><option value="pausado">Pausados</option></select>
        <select value={ordenacao} onChange={e=>setOrdenacao(e.target.value)} style={{height:34,background:"var(--bg)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text)",padding:"0 28px 0 9px"}}><option value="urgencia">Mais urgentes</option><option value="km">Menor KM restante</option><option value="placa">Placa</option></select>
        {(busca||filtroStatus!=="todos"||ordenacao!=="urgencia")&&<button className="btn" onClick={()=>{setBusca("");setFiltroStatus("todos");setOrdenacao("urgencia")}}>Limpar filtros</button>}
        <span className="muted" style={{fontSize:11.5,marginLeft:"auto"}}>{veiculosAgrupados.length} veículo(s) • {veiculosAgrupados.reduce((sum,v)=>sum+v.itens.length,0)} plano(s)</span>
        <button className="btn" onClick={()=>setExpandidos(new Set(veiculosAgrupados.map(v=>v.placa)))}>Expandir todos</button><button className="btn" onClick={()=>setExpandidos(new Set())}>Recolher</button>
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
          {veiculosAgrupados.length === 0 && (
            <div className="card" style={{textAlign:"center",padding:"34px 20px"}}>
              <Icon name="search" size={24} style={{color:"var(--muted)",marginBottom:8}}/>
              <div style={{fontWeight:650}}>Nenhum resultado corresponde aos filtros selecionados.</div>
              <button className="btn" style={{marginTop:12}} onClick={()=>{setBusca("");setFiltroStatus("todos");setOrdenacao("urgencia")}}>Limpar filtros</button>
            </div>
          )}
          {veiculosAgrupados.map(veiculo => {
            const ultima = veiculo.ultimaManutencao;
            const planoAutorizado = veiculo.planoAutorizado;
            return (
            <div key={veiculo.placa} className="card" style={{
              borderLeft: `3px solid ${veiculo.resumo.tone}`,
              padding: "12px 16px",
            }}>
              <div className="row between" style={{ alignItems: "flex-start", gap: 12, marginBottom: expandidos.has(veiculo.placa) ? 10 : 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{
                      background: "var(--accent-soft)",
                      color: "var(--brand-blue)",
                      border: "1px solid var(--accent-border)",
                      borderRadius: 5,
                      padding: "2px 9px",
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono, monospace)",
                    }}>{veiculo.placa}</span>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{veiculo.modelo || "Veiculo sem modelo cadastrado"}</span>
                    <span style={{
                      background: veiculo.resumo.bg,
                      color: veiculo.resumo.tone,
                      border: `1px solid ${veiculo.resumo.tone}`,
                      borderRadius: 999,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 700,
                    }}>{veiculo.resumo.label}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 5 }}>
                    KM atual: <strong style={{ color: "var(--text)" }}>{fmtKm(veiculo.kmAtual)}</strong>
                    {" "} | {veiculo.itens.length} plano(s) ativo(s)
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 180 }}>
                  <div className="muted" style={{ fontSize: 11, fontWeight: 600 }}>Última manutenção</div>
                  {ultima ? (
                    <div style={{ fontSize: 12, lineHeight: 1.45, marginTop: 3 }}>
                      <strong>{dataBR(ultima.data)} - {fmtKm(ultima.km)}</strong>
                      <div className="muted">{ultima.descricao || "Sem descricao"}{ultima.fornecedor ? ` | ${ultima.fornecedor}` : ""}</div>
                      <div className="muted">{ultima.tipoDocumento} {ultima.numeroDocumento}</div>
                    </div>
                  ) : (
                    <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>Sem manutencao com KM para esta placa</div>
                  )}
                  {planoAutorizado && (
                    <div style={{ fontSize: 12, lineHeight: 1.45, marginTop: 7 }}>
                      <div className="muted" style={{ fontWeight: 600, fontSize: 11 }}>Referência encontrada</div>
                      <strong>{dataBR(planoAutorizado.data)} - {planoAutorizado.item}</strong>
                      <div className="muted">{planoAutorizado.fornecedor} | NF {planoAutorizado.documento}</div>
                    </div>
                  )}
                </div>
                <button type="button" className="btn" onClick={()=>toggleVeiculo(veiculo.placa)} aria-label={expandidos.has(veiculo.placa)?"Recolher planos":"Ver planos"} style={{flexShrink:0}}>
                  {expandidos.has(veiculo.placa)?"Recolher":"Ver planos"} <Icon name="chevron-down" size={14} style={{transform:expandidos.has(veiculo.placa)?"rotate(180deg)":"none"}}/>
                </button>
              </div>

              {expandidos.has(veiculo.placa) && <div style={{ display: "grid", gap: 8 }}>
                {veiculo.itens.map(a => {
                  const kmResumo = kmInfo(a);
                  const ultimaPlano = a.ultimaManutencao;
                  return (
                  <div key={a.id} style={{
                    opacity: a.ativo ? 1 : 0.55,
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 7,
                    padding: "10px 12px",
                  }}>
                    <div className="row between" style={{ gap: 12, alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 7 }}>
                          <span style={{ fontWeight: 700, fontSize: 13.5 }}>{a.titulo}</span>
                          <span style={{
                            background: kmResumo.bg,
                            color: kmResumo.tone,
                            border: `1px solid ${kmResumo.tone}`,
                            borderRadius: 999,
                            padding: "2px 8px",
                            fontSize: 11,
                            fontWeight: 700,
                          }}>{kmResumo.label}</span>
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

                        {a.tipo_controle === "data" ? <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 8 }}>
                          <div style={{ fontSize: 12 }}><span className="muted">Periodicidade</span><br/><strong>2 anos</strong></div>
                          <div style={{ fontSize: 12 }}><span className="muted">Última aferição</span><br/><strong>{dataBR(a.data_ultimo_servico)}</strong></div>
                          <div style={{ fontSize: 12 }}><span className="muted">Validade</span><br/><strong style={{ color: "var(--brand-blue)" }}>{dataBR(a.data_proximo_envio)}</strong></div>
                        </div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 8, marginBottom: 8 }}>
                          <div style={{ fontSize: 12 }}><span className="muted">Intervalo</span><br/><strong>{fmtKm(a.intervalo_km)}</strong></div>
                          <div style={{ fontSize: 12 }}><span className="muted">KM atual</span><br/><strong>{fmtKm(a.km_atual)}</strong></div>
                          <div style={{ fontSize: 12 }}><span className="muted">Enviar no KM</span><br/><strong style={{ color: "var(--brand-blue)" }}>{fmtKm(kmProximoDoItem(a))}</strong></div>
                        </div>}

                        <div style={{
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: "7px 9px",
                          marginBottom: 8,
                          background: "var(--surface)",
                          fontSize: 12,
                          lineHeight: 1.45,
                        }}>
                          <span className="muted" style={{ fontWeight: 700 }}>Ultimo registro: </span>
                          {ultimaPlano ? (
                            <>
                              <strong>{dataBR(ultimaPlano.data)} - {fmtKm(ultimaPlano.km)}</strong>
                              <span className="muted"> | {ultimaPlano.descricao || "Sem descricao"}</span>
                              {ultimaPlano.tipoDocumento && <span className="muted"> | {ultimaPlano.tipoDocumento} {ultimaPlano.numeroDocumento || ""}</span>}
                              {ultimaPlano.fornecedor && <span className="muted"> | {ultimaPlano.fornecedor}</span>}
                            </>
                          ) : (
                            <span className="muted">
                              {a.planoAutorizado
                                ? `plano autorizado encontrado em ${dataBR(a.planoAutorizado.data)} (${a.planoAutorizado.fornecedor}, NF ${a.planoAutorizado.documento}), sem KM informado.`
                                : "nao encontrei manutencao com KM para este tipo."}
                            </span>
                          )}
                        </div>

                        {a.numeros && (() => {
                          const destinos = String(a.numeros).split(",").filter(Boolean);
                          const primeiroNome = nomeDoContato(destinos[0]) || "Contato";
                          return (
                          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
                            <span className="muted" style={{ fontSize: 12 }}>Destinatários:</span>
                            <span title={`${destinos.length} destinatário(s) configurado(s)`} style={{background:"var(--accent-soft)",border:"1px solid var(--accent-border)",borderRadius:4,padding:"2px 7px",fontSize:11.5,color:"var(--brand-blue)"}}>
                              {primeiroNome}{destinos.length > 1 ? ` +${destinos.length - 1}` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => abrirEditar(a)}
                              style={{
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                                borderRadius: 4,
                                color: "var(--text)",
                                cursor: "pointer",
                                fontSize: 11.5,
                                padding: "1px 7px",
                              }}
                            >
                              Editar
                            </button>
                          </div>
                        );})()}

                        <details>
                          <summary style={{ cursor: "pointer", color: "var(--brand-blue)", fontSize: 12, fontWeight: 700 }}>
                            Ver mensagem
                          </summary>
                          <div style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            marginTop: 7,
                            maxWidth: 680,
                            whiteSpace: "pre-line",
                            fontSize: 12,
                            lineHeight: 1.45,
                            color: "var(--text)",
                          }}>
                            {mensagemPreview(a)}
                          </div>
                        </details>
                      </div>

                      <div className="row" style={{ gap: 5, flexShrink: 0 }}>
                        {a.tipo_controle !== "data" && <button
                          onClick={() => { setKmModal(a); setKmValor(String(a.km_atual)); }}
                          title="Atualizar KM"
                          style={{
                            background: "var(--surface)", border: "1px solid var(--border)",
                            borderRadius: 6, padding: "5px 10px", cursor: "pointer",
                            fontSize: 12, color: "var(--text)", display: "flex", alignItems: "center", gap: 5,
                          }}
                        >
                          <Icon name="trending-up" size={13}/> Informar KM
                        </button>}
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
                );})}
              </div>}
            </div>
          );})}
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
                {editando ? "Editar plano" : "Novo plano de manutenção"}
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
                              {intervalo ? fmtKm(proximoKmProgramado(kmAtual, intervalo)) : "—"}
                            </span>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!editando && form.selecionadas.length > 0 && (
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 7 }}>
                      Planos sugeridos
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                      {planosSugeridos.map(plano => {
                        const ativo = form.titulo === plano.titulo && (
                          plano.tipoControle === "data"
                            ? form.tipo_controle === "data" && Number(form.intervalo_dias) === Number(plano.intervaloDias)
                            : form.tipo_controle === "km" && Number(form.intervalo_km) === Number(plano.intervalo)
                        );
                        return (
                          <button
                            key={plano.id}
                            type="button"
                            onClick={() => aplicarPlano(plano)}
                            style={{
                              textAlign: "left",
                              border: `1px solid ${ativo ? "var(--brand-blue)" : "var(--border)"}`,
                              background: ativo ? "var(--accent-soft)" : "var(--bg)",
                              color: "var(--text)",
                              borderRadius: 7,
                              padding: "9px 10px",
                              cursor: "pointer",
                              minHeight: 84,
                            }}
                          >
                            <div className="row between" style={{ gap: 8, marginBottom: 5 }}>
                              <strong style={{ fontSize: 12.5 }}>{plano.titulo}</strong>
                              {ativo && <Icon name="check" size={14} style={{ color: "var(--brand-blue)" }}/>}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--brand-blue)", marginBottom: 4 }}>
                              {plano.tipoControle === "data" ? "a cada 2 anos" : `a cada ${fmtKm(plano.intervalo)}`}
                            </div>
                            <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.35 }}>
                              {plano.criticidade} - {plano.fonte}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, display: "block", marginBottom: 5 }}>
                    Nome do plano / serviço *
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

                {form.tipo_controle === "km" ? <div>
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
                </div> : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 500 }}>Data da última aferição *
                    <input type="date" value={form.data_ultimo_servico} onChange={e => setForm(f => ({ ...f, data_ultimo_servico: e.target.value }))} style={{ width: "100%", padding: "8px 10px", marginTop: 5, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--text)", boxSizing: "border-box" }} required/>
                  </label>
                  <label style={{ fontSize: 12.5, fontWeight: 500 }}>Validade *
                    <select value={form.intervalo_dias} onChange={e => setForm(f => ({ ...f, intervalo_dias: e.target.value }))} style={{ width: "100%", padding: "8px 10px", marginTop: 5, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--text)" }}>
                      <option value="730">2 anos</option>
                    </select>
                  </label>
                </div>}

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

      {/* ── Modal registrar manutenção executada ── */}
      {registroModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1100, padding: 16,
        }} onClick={e => { if (e.target === e.currentTarget) setRegistroModal(false); }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 24, width: "100%", maxWidth: 560,
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <div className="row between" style={{ marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16 }}>Registrar troca ou revisão</h2>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Informe o KM em que o serviço foi realmente executado.</div>
              </div>
              <button type="button" onClick={() => setRegistroModal(false)} style={{ background: "none", border: 0, color: "var(--muted)", cursor: "pointer" }}><Icon name="x" size={18}/></button>
            </div>
            <form onSubmit={salvarRegistro}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ fontSize: 12 }}>Placa *
                  <select value={registroForm.placa} onChange={e => setRegistroForm(f => ({ ...f, placa: e.target.value, automacao_id: "" }))} style={{ width: "100%", marginTop: 5, padding: 9, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6 }} required>
                    <option value="">Selecione</option>
                    {[...new Set([...veiculosAgrupados.map(v => v.placa), ...veiculos.map(v => v.placa)].filter(Boolean))].sort().map(placa => <option key={placa} value={placa}>{placa}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 12 }}>Tipo de movimento *
                  <select value={registroForm.tipo_movimento} onChange={e => {
                    const labels = { troca_oleo_motor: "Troca de óleo do motor", revisao: "Revisão preventiva", filtro_combustivel: "Troca do filtro de combustível", filtro_ar: "Troca do filtro de ar", oleo_cambio: "Troca do óleo do câmbio", oleo_diferencial: "Troca do óleo do diferencial", lubrificacao: "Lubrificação", afericao_tacografo: "Aferição de tacógrafo", outro: "Outro serviço" };
                    setRegistroForm(f => ({ ...f, tipo_movimento: e.target.value, descricao: labels[e.target.value] }));
                  }} style={{ width: "100%", marginTop: 5, padding: 9, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6 }}>
                    <option value="troca_oleo_motor">Troca de óleo do motor</option>
                    <option value="revisao">Revisão preventiva</option>
                    <option value="filtro_combustivel">Filtro de combustível</option>
                    <option value="filtro_ar">Filtro de ar</option>
                    <option value="oleo_cambio">Óleo do câmbio</option>
                    <option value="oleo_diferencial">Óleo do diferencial</option>
                    <option value="lubrificacao">Lubrificação</option>
                    <option value="afericao_tacografo">Aferição de tacógrafo</option>
                    <option value="outro">Outro</option>
                  </select>
                </label>
                <label style={{ fontSize: 12 }}>Data do serviço *
                  <input type="date" value={registroForm.data_servico} onChange={e => setRegistroForm(f => ({ ...f, data_servico: e.target.value }))} style={{ width: "100%", marginTop: 5, padding: 9, boxSizing: "border-box", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6 }} required/>
                </label>
                <label style={{ fontSize: 12 }}>KM da execução *
                  <input type="number" min="0" value={registroForm.km_servico} onChange={e => setRegistroForm(f => ({ ...f, km_servico: e.target.value }))} placeholder="Ex.: 278180" style={{ width: "100%", marginTop: 5, padding: 9, boxSizing: "border-box", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6 }} required/>
                </label>
              </div>
              <label style={{ display: "block", fontSize: 12, marginTop: 12 }}>Plano relacionado
                <select value={registroForm.automacao_id} onChange={e => setRegistroForm(f => ({ ...f, automacao_id: e.target.value }))} style={{ width: "100%", marginTop: 5, padding: 9, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6 }}>
                  <option value="">Sem vínculo automático</option>
                  {automacoes.filter(a => a.placa === registroForm.placa).map(a => <option key={a.id} value={a.id}>{a.titulo} — intervalo {fmtKm(a.intervalo_km)}</option>)}
                </select>
              </label>
              <label style={{ display: "block", fontSize: 12, marginTop: 12 }}>Descrição *
                <input value={registroForm.descricao} onChange={e => setRegistroForm(f => ({ ...f, descricao: e.target.value }))} style={{ width: "100%", marginTop: 5, padding: 9, boxSizing: "border-box", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6 }} required/>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <label style={{ fontSize: 12 }}>Fornecedor<input value={registroForm.fornecedor} onChange={e => setRegistroForm(f => ({ ...f, fornecedor: e.target.value }))} style={{ width: "100%", marginTop: 5, padding: 9, boxSizing: "border-box", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6 }}/></label>
                <label style={{ fontSize: 12 }}>NF/OS<input value={registroForm.documento} onChange={e => setRegistroForm(f => ({ ...f, documento: e.target.value }))} style={{ width: "100%", marginTop: 5, padding: 9, boxSizing: "border-box", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6 }}/></label>
              </div>
              <label style={{ display: "block", fontSize: 12, marginTop: 12 }}>Observação<textarea rows="3" value={registroForm.observacao} onChange={e => setRegistroForm(f => ({ ...f, observacao: e.target.value }))} style={{ width: "100%", marginTop: 5, padding: 9, boxSizing: "border-box", resize: "vertical", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6 }}/></label>
              {registroForm.automacao_id && registroForm.km_servico && <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: "var(--accent-soft)", color: "var(--brand-blue)", fontSize: 12 }}>Próximo vencimento: {fmtKm(Number(registroForm.km_servico) + Number(automacoes.find(a => String(a.id) === String(registroForm.automacao_id))?.intervalo_km || 0))}</div>}
              {registroErro && <div style={{ color: "var(--danger)", marginTop: 12, fontSize: 12 }}>{registroErro}</div>}
              <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
                <button type="button" className="btn" onClick={() => setRegistroModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={registroSalvando}>{registroSalvando ? "Salvando…" : "Registrar serviço"}</button>
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
