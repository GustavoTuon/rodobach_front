// Movimentação de Pneus — Norte GestÃ£o de Frota
// Mobile-first: cÃ³digo do pneu sempre legÃ­vel, action sheet ao tocar.
//
// Banco do cliente → somente SELECT (via backend).
// MovimentaÃ§Ãµes → somente no banco prÃ³prio (tabela movimentacoes_pneus).

const { useState, useEffect, useRef } = React;

// â”€â”€ Constantes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DESTINOS = [
  { id: "ESTOQUE",  label: "Estoque",  cor: "info",  icone: "wrench"     },
  { id: "CONSERTO", label: "Conserto", cor: "warn",  icone: "wrench"     },
  { id: "BAIXA",    label: "Baixa",    cor: "crit",  icone: "arrow-down" },
  { id: "DESCARTE", label: "Descarte", cor: "crit",  icone: "x"          },
];

const TIPO_LABELS = {
  MONTAGEM:      { label: "Montagem",         cor: "ok"   },
  DESMONTAGEM:   { label: "Desmontagem",      cor: "warn" },
  TROCA_POSICAO: { label: "Troca de posição", cor: "info" },
  ESTOQUE:       { label: "Estoque",          cor: "info" },
  CONSERTO:      { label: "Conserto",         cor: "warn" },
  BAIXA:         { label: "Baixa",            cor: "crit" },
  DESCARTE:      { label: "Descarte",         cor: "crit" },
};

const LOCAL_LABELS = {
  veiculo:  "No veículo",
  estoque:  "Estoque",
  conserto: "Conserto",
  baixa:    "Baixa",
  descarte: "Descarte",
};

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmtKm(km) {
  if (!km && km !== 0) return "—";
  return Number(km).toLocaleString("pt-BR") + " km";
}

function fmtDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function kmPerc(pneu) {
  if (!pneu.kmmaximapne || pneu.kmmaximapne <= 0) return null;
  return Math.min(Math.round((pneu.kmacumuladopne / pneu.kmmaximapne) * 100), 100);
}

function kmCor(pneu) {
  const p = kmPerc(pneu);
  if (p === null) return "neutro";
  if (p >= 90) return "crit";
  if (p >= 75) return "warn";
  return "ok";
}

function pneuCodigo(pneu) {
  const candidates = [
    pneu?.codigopne,
    pneu?.codigo,
    pneu?.numero,
    pneu?.numeroPneu,
    pneu?.codPneu,
    pneu?.idPneu,
    pneu?.codigo_pneu,
    pneu?.numeropneu,
    pneu?.codigoPneuCliente,
    pneu?.codigo_pneu_cliente,
  ];
  const code = candidates.map(v => String(v ?? "").trim()).find(Boolean);
  return code || "SEM CODIGO";
}

function pneuNomeSecundario(pneu) {
  const parts = [
    pneu?.nomepne,
    pneu?.marcapne,
    pneu?.modelopne,
  ].map(v => String(v ?? "").trim()).filter(Boolean);
  return [...new Set(parts)].join(" - ");
}

function pneuLabel(pneu) {
  return pneuCodigo(pneu);
}

// â”€â”€ Barra de vida Ãºtil â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function pneuCodigoDisplay(pneu) {
  const code = pneuCodigo(pneu);
  return code === "SEM CODIGO" ? code : `#${code}`;
}

const VidaBar = ({ pneu }) => {
  const p = kmPerc(pneu);
  if (p === null) return null;
  const cor = kmCor(pneu);
  const colors = { ok: "var(--ok)", warn: "var(--warn)", crit: "var(--crit)", neutro: "var(--border-strong)" };
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ height: 4, background: "var(--surface-3)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${p}%`, background: colors[cor], borderRadius: 2, transition: "width 300ms" }}/>
      </div>
      <div style={{ fontSize: 10, color: colors[cor], fontWeight: 600, marginTop: 2 }}>{p}% usado</div>
    </div>
  );
};

// â”€â”€ Card de pneu no slot (versÃ£o compacta no esquema) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// O cÃ³digo/nÃºmero do pneu Ã© o elemento dominante — nunca truncado.

const SlotTireCard = ({ pneu, posicao, selecionado, onClick, onDragStart, onDragEnd }) => {
  const cor = kmCor(pneu);
  const p = kmPerc(pneu);
  const borderColors = { ok: "var(--ok)", warn: "var(--warn)", crit: "var(--crit)", neutro: "var(--border-strong)" };

  return (
    <div
      className={`slot-tire-card ${selecionado ? "slot-tire-selected" : ""}`}
      style={{ borderColor: selecionado ? "var(--brand-blue)" : borderColors[cor] }}
      onClick={onClick}
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={`${pneuCodigo(pneu)} - ${pneuNomeSecundario(pneu) || "sem descrição"} - ${posicao.abreviacaopop || posicao.nomepop}`}
    >
      {/* Código do pneu — elemento dominante, nunca truncado */}
      <div className="slot-tire-num">{pneuCodigoDisplay(pneu)}</div>

      <div className="slot-tire-meta">
        <span className="slot-tire-pos">{posicao.abreviacaopop}</span>
        {p !== null && <span className={`slot-tire-pct slot-pct-${cor}`}>{p}%</span>}
      </div>

      {/* Barra de vida */}
      {p !== null && (
        <div className="slot-tire-bar-wrap">
          <div className="slot-tire-bar" style={{ width: `${p}%`, background: borderColors[cor] }}/>
        </div>
      )}

      {/* Marca — secundÃ¡ria */}
    </div>
  );
};

// â”€â”€ Slot de posiÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PositionSlot = ({
  posicao, pneu, pneuSelecionado, isDragOver, isHighlighted,
  onSlotClick, onDragOver, onDragLeave, onDrop, onDragStart, onDragEnd,
}) => {
  const isEmpty = !pneu;
  const canReceive = pneuSelecionado && pneuSelecionado.codigopne !== pneu?.codigopne;
  const selecionado = pneuSelecionado?.codigopne === pneu?.codigopne;

  return (
    <div
      className={`pslot ${isEmpty ? "pslot-empty" : "pslot-filled"}
        ${isDragOver ? "pslot-dragover" : ""}
        ${isHighlighted && canReceive ? "pslot-target" : ""}
        ${selecionado ? "pslot-selecionado" : ""}
      `}
      title={`${posicao.abreviacaopop || ""} ${posicao.nomepop || ""}`.trim()}
      onDragOver={(e) => { e.preventDefault(); onDragOver(posicao.codigopop); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(posicao, pneu); }}
      onClick={() => onSlotClick(posicao, pneu)}
    >
      {/* RÃ³tulo da posiÃ§Ã£o sempre visÃ­vel */}
      <div className="pslot-label">{posicao.abreviacaopop}</div>

      {pneu ? (
        <SlotTireCard
          pneu={pneu}
          posicao={posicao}
          selecionado={selecionado}
          onClick={(e) => { e.stopPropagation(); onSlotClick(posicao, pneu); }}
          onDragStart={(e) => onDragStart(e, pneu)}
          onDragEnd={onDragEnd}
        />
      ) : (
        <div className="pslot-vazio">
          {canReceive
            ? <><Icon name="plus" size={16} style={{ color: "var(--brand-blue)" }}/><span>Montar</span></>
            : <span>Vazio</span>
          }
        </div>
      )}
    </div>
  );
};

// â”€â”€ Linha de eixo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const AxleRow = ({ eixo, positions, pneusMap, pneuSelecionado, dragOver,
  onSlotClick, onDragOver, onDragLeave, onDrop, onDragStart, onDragEnd,
}) => {
  const left  = positions.filter(p => p.lado === "esquerdo").sort((a, b) => a.ordemVisual - b.ordemVisual);
  const right = positions.filter(p => p.lado === "direito").sort((a, b) => a.ordemVisual - b.ordemVisual);
  const other = positions.filter(p => p.lado !== "esquerdo" && p.lado !== "direito" && p.lado !== "estepe");

  const slotProps = (pos) => ({
    posicao: pos,
    pneu: pneusMap.get(pos.codigopop) || null,
    pneuSelecionado,
    isDragOver: dragOver === pos.codigopop,
    isHighlighted: !!pneuSelecionado,
    onSlotClick,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragStart,
    onDragEnd,
  });

  return (
    <div className="axle-row">
      <div className="axle-side axle-left">
        {left.map(p => <PositionSlot key={p.codigopop} {...slotProps(p)}/>)}
        {other.map(p => <PositionSlot key={p.codigopop} {...slotProps(p)}/>)}
      </div>
      <div className="axle-center">
        <div className="axle-eixo-label">{eixo}</div>
        <div className="axle-bar"/>
      </div>
      <div className="axle-side axle-right">
        {right.map(p => <PositionSlot key={p.codigopop} {...slotProps(p)}/>)}
      </div>
    </div>
  );
};

// â”€â”€ Esquema visual do veÃ­culo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const layoutSlot = (label, aliases = []) => ({ label, aliases: [label, ...aliases] });
const layoutDualLeft = (axis) => [layoutSlot(`${axis}-EE`), layoutSlot(`${axis}-EI`)];
const layoutDualRight = (axis) => [layoutSlot(`${axis}-DI`), layoutSlot(`${axis}-DE`)];

const LAYOUT_CONFIGS = {
  CARRETA_4_EIXOS: {
    label: "Carreta 4 eixos",
    className: "layout-carreta",
    nose: "trailer",
    sections: [
      {
        id: "trailer",
        label: "Carreta",
        axles: ["1ET", "2ET", "3ET", "4ET"].map((axis) => ({
          id: axis,
          label: axis,
          type: "trailer",
          left: layoutDualLeft(axis),
          right: layoutDualRight(axis),
        })),
      },
    ],
    spares: [layoutSlot("EST-E", ["EST1", "ESTEPE-E", "ESTEPE-1"]), layoutSlot("EST-D", ["EST2", "ESTEPE-D", "ESTEPE-2"])],
  },
  CAVALO_MECANICO: {
    label: "Cavalo mecanico",
    className: "layout-cavalo",
    nose: "cab",
    sections: [
      { id: "front", label: "Dianteira", axles: [
        { id: "ED", label: "Direcional", type: "steer", left: [layoutSlot("ED-E", ["D-E"])], right: [layoutSlot("ED-D", ["D-D"])] },
      ] },
      { id: "rear", label: "Tracao", axles: ["1ET", "2ET"].map((axis) => ({
        id: axis,
        label: axis,
        type: "drive",
        left: layoutDualLeft(axis),
        right: layoutDualRight(axis),
      })) },
    ],
    spares: [layoutSlot("EST-E", ["EST1", "ESTEPE-E", "ESTEPE-1"]), layoutSlot("EST-D", ["EST2", "ESTEPE-D", "ESTEPE-2"])],
  },
  TRUCK: {
    label: "Truck",
    className: "layout-truck",
    nose: "truck",
    sections: [
      { id: "front", label: "Dianteira", axles: [
        { id: "ED", label: "Direcional", type: "steer", left: [layoutSlot("ED-E", ["D-E"])], right: [layoutSlot("ED-D", ["D-D"])] },
      ] },
      { id: "rear", label: "Traseira", axles: ["1ET", "2ET"].map((axis) => ({
        id: axis,
        label: axis,
        type: "drive",
        left: layoutDualLeft(axis),
        right: layoutDualRight(axis),
      })) },
    ],
    spares: [layoutSlot("EST-E", ["EST1", "ESTEPE-E", "ESTEPE-1"]), layoutSlot("EST-D", ["EST2", "ESTEPE-D", "ESTEPE-2"])],
  },
  BITRUCK: {
    label: "Bitruck",
    className: "layout-bitruck",
    nose: "truck",
    sections: [
      { id: "front", label: "Dianteira dupla", axles: [
        { id: "ED", label: "Direcional 1", type: "steer", left: [layoutSlot("ED-E", ["1ED-E", "1D-E"])], right: [layoutSlot("ED-D", ["1ED-D", "1D-D"])] },
        { id: "2ED", label: "Direcional 2", type: "steer", left: [layoutSlot("2ED-E", ["1ED-E"])], right: [layoutSlot("2ED-D", ["1ED-D"])] },
      ] },
      { id: "rear", label: "Traseira", axles: ["2ET", "3ET"].map((axis, index) => ({
        id: axis,
        label: `Traseiro ${index + 1}`,
        type: "drive",
        left: layoutDualLeft(axis),
        right: layoutDualRight(axis),
      })) },
    ],
    spares: [layoutSlot("EST-E", ["EST1", "ESTEPE-E", "ESTEPE-1"]), layoutSlot("EST-D", ["EST2", "ESTEPE-D", "ESTEPE-2"])],
  },
};

function normalizeLayoutText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function inferLayoutKey(veiculo, pneusNoVeiculo = []) {
  const text = normalizeLayoutText([veiculo?.tipo, veiculo?.modelo, veiculo?.nome, veiculo?.label].filter(Boolean).join(" "));
  const mountedPositions = pneusNoVeiculo.map((pneu) => normalizeLayoutText(pneu.posicao)).join(" ");
  if (/4ET/.test(mountedPositions)) return "CARRETA_4_EIXOS";
  if (/2ED/.test(mountedPositions)) return "BITRUCK";
  if (/CARRETA|SEMI|REBOQUE|SR\/|4\s*EIXOS|QUATRO\s*EIXOS/.test(text)) return "CARRETA_4_EIXOS";
  if (/BITRUCK|BI\s*TRUCK|8X2|8X4/.test(text)) return "BITRUCK";
  if (/CAVALO|MECANICO|SCANIA|VOLVO|IVECO|ACTROS|AXOR|R114|R124|FH|FM/.test(text)) return "CAVALO_MECANICO";
  if (/TRUCK|6X2|6X4|CONSTELLATION|ATEGO/.test(text)) return "TRUCK";
  return "TRUCK";
}

function findPositionForLayoutSlot(slotConfig, posicoes, used) {
  const aliases = slotConfig.aliases.map(normalizeLayoutText);
  const found = posicoes.find((pos) => {
    if (used.has(pos.codigopop)) return false;
    const values = [pos.abreviacaopop, pos.codigopop, pos.nomepop].map(normalizeLayoutText);
    return aliases.some((alias) => values.some((value) => value === alias || value.includes(alias)));
  });
  if (found) {
    used.add(found.codigopop);
    return found;
  }
  return {
    codigopop: slotConfig.label,
    nomepop: slotConfig.label,
    abreviacaopop: slotConfig.label,
    eixoveiculopop: "",
    lado: null,
    _layoutVirtual: true,
  };
}

function resolveVehicleLayout(config, posicoes) {
  const used = new Set();
  const sections = config.sections.map((section) => ({
    ...section,
    axles: section.axles.map((axle) => ({
      ...axle,
      left: axle.left.map((item) => findPositionForLayoutSlot(item, posicoes, used)),
      right: axle.right.map((item) => findPositionForLayoutSlot(item, posicoes, used)),
    })),
  }));
  const spares = config.spares.map((item) => findPositionForLayoutSlot(item, posicoes, used));
  const extraSpares = posicoes.filter((pos) => !used.has(pos.codigopop) && pos.lado === "estepe");
  return { sections, spares: [...spares, ...extraSpares] };
}

const TruckSchematic = ({ veiculo, posicoes, pneusNoVeiculo, pneuSelecionado, dragOver,
  onSlotClick, onDragOver, onDragLeave, onDrop, onDragStart, onDragEnd,
}) => {
  const pneusMap = new Map(pneusNoVeiculo.filter(p => p.posicao).map(p => [p.posicao, p]));
  const layoutKey = inferLayoutKey(veiculo, pneusNoVeiculo);
  const config = LAYOUT_CONFIGS[layoutKey] || LAYOUT_CONFIGS.TRUCK;
  const resolved = resolveVehicleLayout(config, posicoes);
  const commonProps = { pneusMap, pneuSelecionado, dragOver, onSlotClick, onDragOver, onDragLeave, onDrop, onDragStart, onDragEnd };

  const slotProps = (pos) => ({
    posicao: pos,
    pneu: pneusMap.get(pos.codigopop) || pneusMap.get(pos.abreviacaopop) || null,
    pneuSelecionado,
    isDragOver: dragOver === pos.codigopop,
    isHighlighted: !!pneuSelecionado,
    ...commonProps,
  });

  if (!posicoes.length) {
    return (
      <div className="truck-empty">
        <Icon name="truck" size={40} style={{ opacity: 0.25 }}/>
        <div className="muted">Nenhuma posição cadastrada para este veículo.</div>
      </div>
    );
  }

  return (
    <div className={`vehicle-layout ${config.className}`}>
      <div className="vehicle-layout-head">
        <div className={`vehicle-nose vehicle-nose-${config.nose}`}>
          <Icon name="truck" size={18}/>
        </div>
        <div>
          <div className="vehicle-layout-title">{config.label}</div>
          <div className="vehicle-layout-sub">{veiculo?.placa || "Veículo"}</div>
        </div>
      </div>

      <div className="vehicle-body-frame">
        {resolved.sections.map(section => (
          <section key={section.id} className={`vehicle-section vehicle-section-${section.id}`}>
            <div className="vehicle-section-title">{section.label}</div>
            <div className="vehicle-axles">
              {section.axles.map(axle => (
                <div key={axle.id} className={`vehicle-axle-row vehicle-axle-${axle.type}`}>
                  <div className="vehicle-side vehicle-side-left">
                    {axle.left.map(pos => <PositionSlot key={`l-${axle.id}-${pos.codigopop}`} {...slotProps(pos)}/>)}
                  </div>
                  <div className="vehicle-axle-center">
                    <span>{axle.label}</span>
                    <div className="vehicle-axle-line"/>
                  </div>
                  <div className="vehicle-side vehicle-side-right">
                    {axle.right.map(pos => <PositionSlot key={`r-${axle.id}-${pos.codigopop}`} {...slotProps(pos)}/>)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {resolved.spares.length > 0 && (
        <section className="vehicle-spares-section">
          <div className="vehicle-section-title">Estepes</div>
          <div className="vehicle-spares-grid">
            {resolved.spares.map((pos, index) => (
              <PositionSlot key={`spare-${index}-${pos.codigopop}`} {...slotProps(pos)}/>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
// â”€â”€ Action Sheet — abre ao clicar em pneu ou slot vazio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// UX mobile: sheet sobe da parte inferior com opÃ§Ãµes claras de aÃ§Ã£o.

const ActionSheet = ({ posicao, pneu, veiculo, pneusEstoque, onMoverParaDestino, onMontarPneu, onDetalhes, onClose }) => {
  const [abaEstoque, setAbaEstoque] = useState(false);
  const [searchEstoque, setSearchEstoque] = useState("");
  const isEmpty = !pneu;
  const cor = pneu ? kmCor(pneu) : "neutro";
  const p = pneu ? kmPerc(pneu) : null;

  const estoqueFiltrado = pneusEstoque.filter(e => {
    if (!searchEstoque) return true;
    const q = searchEstoque.toLowerCase();
    return [
      pneuCodigo(e),
      pneuNomeSecundario(e),
      e.tamanhopne,
    ].join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="action-sheet-overlay" onClick={onClose}>
      <div className="action-sheet" onClick={e => e.stopPropagation()}>

        {/* Handle visual */}
        <div className="action-sheet-handle"/>

        {/* CabeÃ§alho: posiÃ§Ã£o + pneu */}
        <div className="action-sheet-head">
          <div className="action-sheet-pos-badge">{posicao.abreviacaopop}</div>
          <div className="action-sheet-pos-nome">{posicao.nomepop}</div>
          {!isEmpty && (
            <div className="action-sheet-pneu-num">{pneuCodigoDisplay(pneu)}</div>
          )}
          {isEmpty && <div className="action-sheet-vazio-hint">Posição vazia</div>}
        </div>

        {/* Info do pneu (se houver) */}
        {!isEmpty && (
          <div className="action-sheet-info">
            {pneu.marcapne && <span className="as-info-chip">{pneu.marcapne}</span>}
            {pneu.tamanhopne && <span className="as-info-chip">{pneu.tamanhopne}</span>}
            {pneu.modelopne && <span className="as-info-chip">{pneu.modelopne}</span>}
            {p !== null && (
              <span className={`as-info-chip as-chip-${cor}`}>{p}% desgaste</span>
            )}
          </div>
        )}

        {/* ConteÃºdo: pneu ocupado → mover; vazio → montar do estoque */}
        {!isEmpty ? (
          <>
            <div className="action-sheet-section-label">Mover pneu para:</div>
            <div className="action-sheet-destinos">
              {DESTINOS.map(d => (
                <button
                  key={d.id}
                  className={`as-destino-btn as-btn-${d.cor}`}
                  onClick={() => onMoverParaDestino(pneu, posicao, d)}
                >
                  <Icon name={d.icone} size={16}/>
                  {d.label}
                </button>
              ))}
            </div>
            <button className="as-detalhes-btn" onClick={() => onDetalhes(pneu)}>
              <Icon name="info" size={14}/> Ver detalhes completos
            </button>
          </>
        ) : (
          <>
            <div className="action-sheet-section-label">Selecionar pneu do estoque para montar:</div>
            <div style={{ padding: "0 0 8px" }}>
              <input
                className="field-input"
                placeholder="Buscar pneu..."
                value={searchEstoque}
                onChange={e => setSearchEstoque(e.target.value)}
                autoFocus
              />
            </div>
            <div className="as-estoque-list">
              {estoqueFiltrado.length === 0 && (
                <div className="muted" style={{ padding: "12px 0", textAlign: "center", fontSize: "var(--font-sm)" }}>
                  {searchEstoque ? "Nenhum pneu encontrado." : "Estoque vazio."}
                </div>
              )}
              {estoqueFiltrado.map(e => (
                <button key={e.codigopne} className="as-estoque-item" onClick={() => onMontarPneu(e, posicao)}>
                  <div className="as-estoque-num">{pneuCodigoDisplay(e)}</div>
                  <div className="as-estoque-info">
                    {[e.marcapne, e.tamanhopne].filter(Boolean).join(" · ") || "—"}
                    {kmPerc(e) !== null && <span className={`as-info-chip as-chip-${kmCor(e)}`} style={{ marginLeft: 6 }}>{kmPerc(e)}%</span>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        <button className="as-cancelar-btn" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
};

// â”€â”€ Modal de detalhes do pneu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ModalDetalhe = ({ pneu, posicao, onClose, onMover, onHistorico }) => {
  const p = kmPerc(pneu);
  const cor = kmCor(pneu);
  const colors = { ok: "var(--ok)", warn: "var(--warn)", crit: "var(--crit)", neutro: "var(--border-strong)" };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2 style={{ margin: 0 }}>{pneuCodigoDisplay(pneu)}</h2>
            {posicao && <div className="muted" style={{ fontSize: "var(--font-xs)", marginTop: 2 }}>{posicao.nomepop}</div>}
          </div>
          <button className="modal-close" onClick={onClose}><Icon name="x" size={16}/></button>
        </div>

        {/* Barra de vida grande */}
        {p !== null && (
          <div style={{ padding: "12px 20px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "var(--font-xs)", color: "var(--text-2)" }}>
              <span>Vida útil: {fmtKm(pneu.kmacumuladopne)} / {fmtKm(pneu.kmmaximapne)}</span>
              <span style={{ fontWeight: 700, color: colors[cor] }}>{p}%</span>
            </div>
            <div style={{ height: 8, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${p}%`, background: colors[cor], borderRadius: 4 }}/>
            </div>
          </div>
        )}

        <div className="modal-body">
          <div className="detail-grid">
            {[
              { l: "Código",      v: pneu.codigopne },
              { l: "Nome / Fogo", v: pneu.nomepne },
              { l: "Marca",       v: pneu.marcapne },
              { l: "Modelo",      v: pneu.modelopne },
              { l: "Tamanho",     v: pneu.tamanhopne },
              { l: "KM Atual",    v: fmtKm(pneu.kmatualpne) },
              { l: "KM Acumulado",v: fmtKm(pneu.kmacumuladopne) },
              { l: "KM Máximo",   v: fmtKm(pneu.kmmaximapne) },
              { l: "Recapagens",  v: pneu.quantidaderecapagenspne || "0" },
              { l: "Local",       v: LOCAL_LABELS[pneu.local] || pneu.local },
              { l: "Posição",     v: posicao?.nomepop || pneu.posicao || null },
              { l: "Fornecedor",  v: pneu.fornecedorpne },
              { l: "Nota Fiscal", v: pneu.notafiscalpne },
            ].filter(r => r.v).map(r => (
              <div key={r.l} className="detail-row">
                <span className="detail-label">{r.l}</span>
                <span className="detail-value">{r.v}</span>
              </div>
            ))}
            {pneu.observacaopne && (
              <div className="detail-row full">
                <span className="detail-label">Observação</span>
                <span className="detail-value">{pneu.observacaopne}</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Fechar</button>
          <button className="btn" onClick={() => onHistorico?.(pneu)}>
            <Icon name="clock" size={14}/> Historico
          </button>
          {onMover && (
            <button className="btn primary" onClick={onMover}>Movimentar pneu</button>
          )}
        </div>
      </div>
    </div>
  );
};

// â”€â”€ Modal de confirmaÃ§Ã£o de movimentaÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ModalMovimento = ({ dados, onClose, onConfirmar, loading }) => {
  const [km, setKm] = useState("");
  const [obs, setObs] = useState("");
  const [tipo, setTipo] = useState(dados.tipoSugerido || "ESTOQUE");
  const [erro, setErro] = useState(null);
  const kmRef = useRef(null);

  useEffect(() => { kmRef.current?.focus(); }, []);

  const precisaKm = ["MONTAGEM", "DESMONTAGEM", "TROCA_POSICAO"].includes(tipo);

  async function handleConfirmar() {
    setErro(null);
    if (precisaKm && !km) { setErro("Informe o KM atual do veículo."); return; }
    try {
      await onConfirmar({ kmVeiculo: precisaKm ? Number(km) : null, observacao: obs.trim() || null, tipoMovimento: tipo });
    } catch (e) { setErro(e.message); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-movimento" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Confirmar Movimentação</h2>
          <button className="modal-close" onClick={onClose}><Icon name="x" size={16}/></button>
        </div>
        <div className="modal-body">
          <div className="movimento-resumo">
            <div className="mov-row"><span className="mov-label">Pneu</span>
              <span className="mov-value mono" style={{ fontSize: 15, fontWeight: 700 }}>{pneuLabel(dados.pneu)}</span>
            </div>
            {(dados.pneu.marcapne || dados.pneu.tamanhopne) && (
              <div className="mov-row"><span className="mov-label">Especificação</span>
                <span className="mov-value">{[dados.pneu.marcapne, dados.pneu.tamanhopne].filter(Boolean).join(" · ")}</span>
              </div>
            )}
            <div className="mov-row"><span className="mov-label">De</span><span className="mov-value">{dados.origemLabel}</span></div>
            <div className="mov-row"><span className="mov-label">Para</span>
              <span className="mov-value mov-destino">{dados.destinoLabel}</span>
            </div>
            {dados.veiculo && <div className="mov-row"><span className="mov-label">Veículo</span><span className="mov-value mono">{dados.veiculo}</span></div>}
            {dados.posicaoDestino && <div className="mov-row"><span className="mov-label">Posição</span><span className="mov-value">{dados.posicaoDestinoLabel || dados.posicaoDestino}</span></div>}
          </div>

          <div className="form-field">
            <label className="field-label">Tipo de movimentação</label>
            <select className="field-select" value={tipo} onChange={e => setTipo(e.target.value)}>
              {Object.entries(TIPO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="field-label">
              KM atual do veículo {precisaKm && <span className="field-required">*</span>}
            </label>
            <input ref={kmRef} type="number" className="field-input" placeholder="Ex: 125000"
              value={km} onChange={e => setKm(e.target.value)}/>
          </div>

          <div className="form-field">
            <label className="field-label">Observação (opcional)</label>
            <textarea className="field-textarea" rows={2} placeholder="Alguma observação..."
              value={obs} onChange={e => setObs(e.target.value)}/>
          </div>

          {erro && <div className="form-error"><Icon name="alert" size={14}/> {erro}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn primary" onClick={handleConfirmar} disabled={loading}>
            {loading ? "Registrando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€ HistÃ³rico de movimentaÃ§Ãµes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const HistoricoPanel = ({ veiculo }) => {
  const [aberto, setAberto] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!aberto || !veiculo) return;
    setLoading(true);
    window.RB_API.getHistoricoPneus({ veiculo, limit: 50 })
      .then(setHistorico).catch(() => setHistorico([]))
      .finally(() => setLoading(false));
  }, [aberto, veiculo]);

  return (
    <div className="historico-panel card">
      <button className="historico-toggle" onClick={() => setAberto(v => !v)}>
        <div className="row" style={{ gap: 8 }}>
          <Icon name="clock" size={15}/>
          <span>Histórico de Movimentações</span>
        </div>
        <Icon name={aberto ? "chevron-down" : "chevron-right"} size={14}/>
      </button>
      {aberto && (
        <div className="historico-body">
          {loading && <div className="muted" style={{ padding: "12px 0" }}>Carregando...</div>}
          {!loading && historico.length === 0 && (
            <div className="muted" style={{ padding: "12px 0" }}>Nenhuma movimentação registrada.</div>
          )}
          {!loading && historico.length > 0 && (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Data</th><th>Pneu</th><th>Tipo</th>
                    <th>De</th><th>Para</th><th>KM Veículo</th><th>Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map(h => {
                    const tipoKey = (h.tipo_movimento || "").toUpperCase();
                    const tip = TIPO_LABELS[tipoKey] || { label: h.tipo_movimento, cor: "" };
                    const origemLabel = `${LOCAL_LABELS[h.local_origem] || h.local_origem || ""}${h.posicao_origem ? ` (${h.posicao_origem})` : ""}`;
                    const destinoLabel = `${LOCAL_LABELS[h.local_destino] || h.local_destino || ""}${h.posicao_destino ? ` (${h.posicao_destino})` : ""}`;
                    return (
                      <tr key={h.id}>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(h.data_movimento)}</td>
                        <td className="mono">{h.codigo_pneu_cliente}</td>
                        <td><span className={`badge badge-${tip.cor}`}>{tip.label}</span></td>
                        <td>{origemLabel}</td>
                        <td>{destinoLabel}</td>
                        <td>{h.km_veiculo ? Number(h.km_veiculo).toLocaleString("pt-BR") : "—"}</td>
                        <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={h.observacao || ""}>{h.observacao || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ModalHistoricoPneu = ({ pneu, onClose }) => {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!pneu) return;
    setLoading(true);
    setErro(null);
    window.RB_API.getHistoricoPneus({ pneu: pneuCodigo(pneu), limit: 100 })
      .then(setHistorico)
      .catch(e => {
        setErro(e.message);
        setHistorico([]);
      })
      .finally(() => setLoading(false));
  }, [pneu]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-historico-pneu" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2 style={{ margin: 0 }}>Historico do pneu {pneuCodigoDisplay(pneu)}</h2>
            {pneuNomeSecundario(pneu) && (
              <div className="muted" style={{ fontSize: "var(--font-xs)", marginTop: 2 }}>
                {pneuNomeSecundario(pneu)}
              </div>
            )}
          </div>
          <button className="modal-close" onClick={onClose}><Icon name="x" size={16}/></button>
        </div>

        <div className="modal-body">
          {loading && <div className="muted">Carregando historico...</div>}
          {!loading && erro && <div className="form-error"><Icon name="alert" size={14}/> {erro}</div>}
          {!loading && !erro && historico.length === 0 && (
            <div className="pneu-history-empty">
              <Icon name="clock" size={28}/>
              <span>Nenhuma movimentacao registrada para este pneu.</span>
            </div>
          )}
          {!loading && !erro && historico.length > 0 && (
            <div className="pneu-history-list">
              {historico.map(h => {
                const tipoKey = (h.tipo_movimento || "").toUpperCase();
                const tip = TIPO_LABELS[tipoKey] || { label: h.tipo_movimento || "Movimento", cor: "info" };
                const origem = `${LOCAL_LABELS[h.local_origem] || h.local_origem || "Origem"}${h.posicao_origem ? ` - ${h.posicao_origem}` : ""}`;
                const destino = `${LOCAL_LABELS[h.local_destino] || h.local_destino || "Destino"}${h.posicao_destino ? ` - ${h.posicao_destino}` : ""}`;

                return (
                  <div key={h.id} className="pneu-history-item">
                    <div className="pneu-history-top">
                      <span className={`badge badge-${tip.cor}`}>{tip.label}</span>
                      <span className="muted">{fmtDate(h.data_movimento)}</span>
                    </div>
                    <div className="pneu-history-route">
                      <span>{origem}</span>
                      <Icon name="arrow-right" size={14}/>
                      <span>{destino}</span>
                    </div>
                    <div className="pneu-history-meta">
                      {h.veiculo_origem && <span>Origem: {h.veiculo_origem}</span>}
                      {h.veiculo_destino && <span>Destino: {h.veiculo_destino}</span>}
                      {h.km_veiculo && <span>KM veiculo: {Number(h.km_veiculo).toLocaleString("pt-BR")}</span>}
                    </div>
                    {h.observacao && <div className="pneu-history-obs">{h.observacao}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

// â”€â”€ Componente principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const Pneus = ({ onNavigate }) => {
  // Veículo
  const [veiculoSearch, setVeiculoSearch] = useState("");
  const [veiculos, setVeiculos] = useState([]);
  const [selectedVeiculo, setSelectedVeiculo] = useState(null);
  const [showVeiculoList, setShowVeiculoList] = useState(false);
  const [loadingVeiculos, setLoadingVeiculos] = useState(false);
  const [erroVeiculos, setErroVeiculos] = useState(null);

  // Estado dos pneus no veÃ­culo
  const [posicoes, setPosicoes] = useState([]);
  const [pneusNoVeiculo, setPneusNoVeiculo] = useState([]);
  const [loadingEstado, setLoadingEstado] = useState(false);
  const [erroEstado, setErroEstado] = useState(null);

  // Estoque
  const [pneusEstoque, setPneusEstoque] = useState([]);
  const [loadingEstoque, setLoadingEstoque] = useState(false);
  const [erroEstoque, setErroEstoque] = useState(null);

  // Drag & drop (desktop)
  const [draggedPneu, setDraggedPneu] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // Action sheet (mobile)
  const [actionSheet, setActionSheet] = useState(null); // { posicao, pneu }

  // Modais
  const [modalDetalhe, setModalDetalhe] = useState(null);      // { pneu, posicao }
  const [modalMovimento, setModalMovimento] = useState(null);   // payload completo
  const [modalHistoricoPneu, setModalHistoricoPneu] = useState(null);
  const [loadingMovimento, setLoadingMovimento] = useState(false);

  // â”€â”€ Autocomplete de veÃ­culos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (!showVeiculoList) return;
    setErroVeiculos(null);
    setLoadingVeiculos(true);
    window.RB_API.searchPneusVeiculos(veiculoSearch)
      .then(setVeiculos)
      .catch(e => { setErroVeiculos(e.message); setVeiculos([]); })
      .finally(() => setLoadingVeiculos(false));
  }, [veiculoSearch, showVeiculoList]);

  // â”€â”€ Carrega pneus do veÃ­culo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (!selectedVeiculo) { setPneusNoVeiculo([]); setPosicoes([]); return; }
    setErroEstado(null);
    setLoadingEstado(true);
    window.RB_API.getEstadoPneus(selectedVeiculo.placa)
      .then(({ pneusNoVeiculo: pneus, posicoes: pos }) => {
        setPneusNoVeiculo(pneus);
        setPosicoes(pos);
      })
      .catch(e => setErroEstado(e.message))
      .finally(() => setLoadingEstado(false));
  }, [selectedVeiculo]);

  // â”€â”€ Carrega estoque â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function recarregarEstoque() {
    setErroEstoque(null);
    setLoadingEstoque(true);
    window.RB_API.getPneusEstoque()
      .then(setPneusEstoque)
      .catch(e => { setErroEstoque(e.message); setPneusEstoque([]); })
      .finally(() => setLoadingEstoque(false));
  }

  useEffect(() => { recarregarEstoque(); }, []);

  function recarregarTudo() {
    if (selectedVeiculo) {
      setLoadingEstado(true);
      window.RB_API.getEstadoPneus(selectedVeiculo.placa)
        .then(({ pneusNoVeiculo: pneus, posicoes: pos }) => { setPneusNoVeiculo(pneus); setPosicoes(pos); })
        .catch(() => {})
        .finally(() => setLoadingEstado(false));
    }
    recarregarEstoque();
  }

  // â”€â”€ Helpers de movimentaÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function deriveTipo(pneu, destino, posicao) {
    if (posicao) {
      return pneu.local === "veiculo" && pneu.veiculo === selectedVeiculo?.placa
        ? "TROCA_POSICAO" : "MONTAGEM";
    }
    const id = destino?.id || destino || "";
    if (id === "ESTOQUE") return pneu.local === "veiculo" ? "DESMONTAGEM" : "ESTOQUE";
    return id; // CONSERTO, BAIXA, DESCARTE
  }

  function origemLabel(pneu) {
    if (pneu.local === "veiculo") return `Veículo ${pneu.veiculo || ""}${pneu.posicao ? ` — ${pneu.posicao}` : ""}`;
    return LOCAL_LABELS[pneu.local] || pneu.local;
  }

  function destinoLabel(destino, posicao) {
    if (posicao) return `Posição ${posicao.abreviacaopop} — ${posicao.nomepop}`;
    if (destino?.label) return destino.label;
    return LOCAL_LABELS[String(destino || "").toLowerCase()] || String(destino);
  }

  function abrirModalMovimento(pneu, destino, posicao) {
    setActionSheet(null);
    setModalMovimento({
      pneu,
      destino,
      posicao,
      origemLabel: origemLabel(pneu),
      destinoLabel: destinoLabel(destino, posicao),
      veiculo: selectedVeiculo?.placa,
      posicaoDestino: posicao?.codigopop || null,
      posicaoDestinoLabel: posicao?.nomepop || null,
      tipoSugerido: deriveTipo(pneu, destino, posicao),
    });
  }

  async function confirmarMovimento({ kmVeiculo, observacao, tipoMovimento }) {
    if (!modalMovimento) return;
    const { pneu, posicao, destino } = modalMovimento;
    const localDestino = posicao ? "veiculo" : (destino?.id || String(destino || "ESTOQUE")).toLowerCase();

    setLoadingMovimento(true);
    try {
      await window.RB_API.registrarMovimentacaoPneu({
        empresa: pneu.empresapne || null,
        codigoPneuCliente: pneu.codigopne,
        nomePneu: pneuNomeSecundario(pneu) || pneu.nomepne || null,
        veiculoDestino: posicao ? selectedVeiculo?.placa : null,
        veiculoOrigem: pneu.local === "veiculo" ? (pneu.veiculo || selectedVeiculo?.placa) : null,
        posicaoOrigem: pneu.posicao || null,
        posicaoDestino: posicao?.codigopop || null,
        localOrigem: pneu.local || "estoque",
        localDestino,
        tipoMovimento,
        kmVeiculo: kmVeiculo || null,
        kmPneuAtual: pneu.kmatualpne || null,
        observacao: observacao || null,
        snapshotPneuJson: { ...pneu },
      });
      setModalMovimento(null);
      setDraggedPneu(null);
      recarregarTudo();
    } finally {
      setLoadingMovimento(false);
    }
  }

  // â”€â”€ Handlers de clique nos slots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function handleSlotClick(posicao, pneu) {
    // Abre action sheet para o slot clicado
    setActionSheet({ posicao, pneu: pneu || null });
  }

  function handleMoverParaDestino(pneu, posicao, destino) {
    abrirModalMovimento(pneu, destino, null);
  }

  function handleMontarPneu(pneuEstoque, posicao) {
    abrirModalMovimento(pneuEstoque, null, posicao);
  }

  // â”€â”€ Drag & drop (desktop) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function handleDragStart(e, pneu) {
    setDraggedPneu(pneu);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDraggedPneu(null);
    setDragOver(null);
  }

  function handleDropSlot(posicao, pneuNoSlot) {
    const pneu = draggedPneu;
    if (!pneu || (pneuNoSlot && pneuNoSlot.codigopne !== pneu.codigopne)) return;
    abrirModalMovimento(pneu, null, posicao);
    handleDragEnd();
  }

  function handleDropDestino(destino) {
    const pneu = draggedPneu;
    if (!pneu) return;
    abrirModalMovimento(pneu, destino, null);
    handleDragEnd();
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="view pneus-view">

      {/* CabeÃ§alho */}
      <div className="page-head">
        <div>
          <h1>Movimentação de Pneus</h1>
          <div className="sub">Toque em uma posição para ver opções de movimentação</div>
        </div>
        {selectedVeiculo && (
          <button className="btn" onClick={recarregarTudo} title="Atualizar">
            <Icon name="refresh" size={14}/> Atualizar
          </button>
        )}
      </div>

      {/* Seletor de veÃ­culo */}
      <div className="card pneus-selector-card">
        <div className="pneus-selector-row">
          <div className="pneus-vehicle-field" style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <label className="field-label">Veículo</label>
            <div className="autocomplete-wrap" style={{ position: "relative" }}>
              <Icon name="search" size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)", pointerEvents: "none" }}/>
              <input
                className="field-input"
                style={{ paddingLeft: 32 }}
                placeholder="Buscar por placa ou nome..."
                value={selectedVeiculo ? selectedVeiculo.label : veiculoSearch}
                onChange={e => { setVeiculoSearch(e.target.value); setSelectedVeiculo(null); setShowVeiculoList(true); }}
                onFocus={() => setShowVeiculoList(true)}
                onBlur={() => setTimeout(() => setShowVeiculoList(false), 200)}
              />
              {selectedVeiculo && (
                <button className="autocomplete-clear" onClick={() => { setSelectedVeiculo(null); setVeiculoSearch(""); }}>
                  <Icon name="x" size={12}/>
                </button>
              )}
            </div>
            {showVeiculoList && (
              <div className="autocomplete-list">
                {loadingVeiculos && <div className="autocomplete-item muted">Buscando...</div>}
                {!loadingVeiculos && erroVeiculos && (
                  <div className="autocomplete-item" style={{ color: "var(--crit)", fontSize: "var(--font-xs)" }}>Erro: {erroVeiculos}</div>
                )}
                {!loadingVeiculos && !erroVeiculos && veiculos.length === 0 && (
                  <div className="autocomplete-item muted">Nenhum veículo encontrado.</div>
                )}
                {veiculos.map(v => (
                  <button key={v.placa} className="autocomplete-item"
                    onMouseDown={() => { setSelectedVeiculo(v); setVeiculoSearch(""); setShowVeiculoList(false); }}>
                    <div style={{ fontWeight: 600 }}>{v.placa}</div>
                    {v.nome && <div className="muted" style={{ fontSize: "var(--font-xs)" }}>{v.nome}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedVeiculo && (
            <div className="vehicle-info-chips">
              {selectedVeiculo.nome && <span className="chip">{selectedVeiculo.nome}</span>}
              <span className="chip chip-ok">
                <Icon name="check" size={11}/> {pneusNoVeiculo.length} montados
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Estados de carregamento / erro */}
      {!selectedVeiculo && !loadingEstado && (
        <div className="pneus-empty-state card">
          <Icon name="truck" size={48} style={{ opacity: 0.2, color: "var(--brand-blue)" }}/>
          <div style={{ marginTop: 12, color: "var(--text-3)" }}>Selecione um veículo para ver os pneus</div>
        </div>
      )}
      {loadingEstado && (
        <div className="pneus-empty-state card">
          <div className="muted">Carregando pneus do veículo...</div>
        </div>
      )}
      {erroEstado && (
        <div className="form-error card" style={{ marginBottom: 12 }}>
          <Icon name="alert" size={14}/> {erroEstado}
        </div>
      )}

      {/* Área principal: esquema + destinos */}
      {selectedVeiculo && !loadingEstado && (
        <div className="pneus-main-area">

          {/* Esquema do veículo */}
          <div className="card pneus-schematic-card">
            <TruckSchematic
              veiculo={selectedVeiculo}
              posicoes={posicoes}
              pneusNoVeiculo={pneusNoVeiculo}
              pneuSelecionado={draggedPneu}
              dragOver={dragOver}
              onSlotClick={handleSlotClick}
              onDragOver={setDragOver}
              onDragLeave={() => setDragOver(null)}
              onDrop={handleDropSlot}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          </div>

          {/* Destinos (somente drag/drop no desktop) */}
          <div className="pneus-destinos-col">
            <div className="destinos-label">Arrastar para:</div>
            {DESTINOS.map(d => (
              <div
                key={d.id}
                className={`dest-area dest-${d.cor} ${dragOver === d.id ? "dest-drag-over" : ""} ${draggedPneu ? "dest-active" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragOver(d.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => { e.preventDefault(); handleDropDestino(d); }}
                title={d.label}
              >
                <Icon name={d.icone} size={18}/>
                <span className="dest-label">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Painel de estoque */}
      <div className="card pneus-estoque-card">
        <div className="section-head" style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <Icon name="wrench" size={15}/>
            <h2 style={{ margin: 0, fontSize: 14 }}>Pneus em Estoque</h2>
            <span className="badge badge-info">{pneusEstoque.length}</span>
          </div>
          <button className="btn" onClick={recarregarEstoque} title="Atualizar estoque">
            <Icon name="refresh" size={13}/>
          </button>
        </div>

        {loadingEstoque && <div className="muted" style={{ padding: "8px 0" }}>Carregando...</div>}
        {!loadingEstoque && erroEstoque && (
          <div className="form-error" style={{ marginTop: 8 }}>
            <Icon name="alert" size={13}/> {erroEstoque}
          </div>
        )}
        {!loadingEstoque && !erroEstoque && pneusEstoque.length === 0 && (
          <div className="muted" style={{ padding: "8px 0" }}>Estoque vazio ou não configurado.</div>
        )}
        {!loadingEstoque && pneusEstoque.length > 0 && (
          <div className="estoque-grid">
            {pneusEstoque.map(p => {
              const pc = kmPerc(p);
              const cor = kmCor(p);
              const colors = { ok: "var(--ok)", warn: "var(--warn)", crit: "var(--crit)", neutro: "var(--border-strong)" };
              return (
                <div
                  key={p.codigopne}
                  className="estoque-card"
                  draggable={!!selectedVeiculo}
                  onDragStart={e => handleDragStart(e, p)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setModalDetalhe({ pneu: p, posicao: null })}
                  title={`${pneuCodigo(p)} - ${pneuNomeSecundario(p) || "sem descrição"}`}
                >
                  <div className="estoque-card-num">{pneuCodigoDisplay(p)}</div>
                  {pneuNomeSecundario(p) && <div className="estoque-card-subtitle">{pneuNomeSecundario(p)}</div>}
                  <div className="estoque-card-info">{[p.marcapne, p.tamanhopne].filter(Boolean).join(" · ") || "—"}</div>
                  {pc !== null && (
                    <>
                      <div style={{ height: 3, background: "var(--surface-3)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pc}%`, background: colors[cor], borderRadius: 2 }}/>
                      </div>
                      <div style={{ fontSize: 10, color: colors[cor], marginTop: 2 }}>{pc}%</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* HistÃ³rico */}
      {selectedVeiculo && <HistoricoPanel veiculo={selectedVeiculo.placa}/>}

      {/* Action Sheet — toque em posiÃ§Ã£o */}
      {actionSheet && (
        <ActionSheet
          posicao={actionSheet.posicao}
          pneu={actionSheet.pneu}
          veiculo={selectedVeiculo?.placa}
          pneusEstoque={pneusEstoque}
          onMoverParaDestino={handleMoverParaDestino}
          onMontarPneu={handleMontarPneu}
          onDetalhes={(pneu) => { setActionSheet(null); setModalDetalhe({ pneu, posicao: actionSheet.posicao }); }}
          onClose={() => setActionSheet(null)}
        />
      )}

      {/* Modal de detalhes */}
      {modalDetalhe && (
        <ModalDetalhe
          pneu={modalDetalhe.pneu}
          posicao={modalDetalhe.posicao}
          onClose={() => setModalDetalhe(null)}
          onHistorico={(pneu) => { setModalHistoricoPneu(pneu); setModalDetalhe(null); }}
          onMover={modalDetalhe.posicao ? () => { setActionSheet({ posicao: modalDetalhe.posicao, pneu: modalDetalhe.pneu }); setModalDetalhe(null); } : null}
        />
      )}

      {modalHistoricoPneu && (
        <ModalHistoricoPneu
          pneu={modalHistoricoPneu}
          onClose={() => setModalHistoricoPneu(null)}
        />
      )}

      {/* Modal de confirmaÃ§Ã£o */}
      {modalMovimento && (
        <ModalMovimento
          dados={modalMovimento}
          loading={loadingMovimento}
          onClose={() => setModalMovimento(null)}
          onConfirmar={confirmarMovimento}
        />
      )}
    </div>
  );
};

window.Pneus = Pneus;

