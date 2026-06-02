// Detalhe do veículo — Norte Telemetria
const VehicleDetail = ({ plate, onBack, onGoToVehicle }) => {
  const D = window.NT_DATA;
  const v = D.getVehicle(plate);
  const [tab, setTab] = React.useState("overview");
  const mapRef = React.useRef(null);
  const mapInstance = React.useRef(null);

  // Init mini map showing route
  React.useEffect(() => {
    if (!window.L || !mapRef.current || mapInstance.current) return;
    const m = window.L.map(mapRef.current, {
      center: [v.lat, v.lng], zoom: 9,
      zoomControl: true, attributionControl: false,
      preferCanvas: true,
    });
    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd", maxZoom: 18,
    }).addTo(m);
    const route = D.vehicleRoute(plate);
    const polyline = window.L.polyline(route, {
      color: "#4f7fab", weight: 3, opacity: 0.9,
    }).addTo(m);
    // start + end markers
    const start = route[0];
    const end = route[route.length - 1];
    window.L.circleMarker(start, { radius: 5, color: "#52525b", fillColor: "#fff", fillOpacity: 1, weight: 2 }).addTo(m).bindTooltip("Início");
    const cls = v.status === "online" ? "ok" : v.status === "atrasado" ? "warn" : "crit";
    const icon = window.L.divIcon({
      className: "truck-marker-wrap",
      html: `<div class="truck-marker ${cls}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
        </svg>
      </div>`,
      iconSize: [26,26], iconAnchor: [13,13],
    });
    window.L.marker(end, { icon }).addTo(m);
    m.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    mapInstance.current = m;
    return () => { m.remove(); mapInstance.current = null; };
  }, [plate]);

  const timeline = D.vehicleTimeline(plate);
  const vehAlerts = D.ALERTS.filter(a => a.veh === v.plate);

  const tabs = [
    { id: "overview", label: "Visão geral" },
    { id: "messages", label: "Mensagens", count: 142 },
    { id: "telemetry", label: "Telemetria" },
    { id: "maint", label: "Manutenção" },
    { id: "alerts", label: "Alertas", count: vehAlerts.length },
  ];

  return (
    <div className="view">
      <div className="row" style={{marginBottom: 14, gap: 6, fontSize: 12.5}}>
        <a className="muted" onClick={onBack} style={{cursor: "pointer"}}>Veículos</a>
        <Icon name="chevron-right" size={11} className="dim"/>
        <span><Plate value={v.plate}/></span>
      </div>

      <div className="veh-head">
        <div className="veh-icon"><Icon name="truck" size={22}/></div>
        <div className="veh-meta">
          <div className="veh-title">
            <Plate value={v.plate} lg/>
            <StatusBadge status={v.status}/>
            <span className="muted" style={{fontSize: 12}}>· {v.model}</span>
          </div>
          <div className="veh-sub">
            <span><b>Motorista</b> {v.driver}</span>
            <span><b>ID</b> <span className="num">{v.id}</span></span>
            <span><b>Chassi</b> <span className="num">{v.chassis}</span></span>
            <span><b>Equipamento</b> {v.equip}</span>
            <span><b>Última msg</b> <span className="num">{D.timeAgo(v.lastMessageMin)}</span></span>
          </div>
        </div>
        <div className="actions row" style={{gap: 6}}>
          <button className="btn"><Icon name="bell"/> Configurar alertas</button>
          <button className="btn"><Icon name="external"/> Histórico completo</button>
          <button className="btn primary"><Icon name="refresh"/> Reenviar comando</button>
        </div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab}/>

      {tab === "overview" && (
        <div className="col" style={{gap: 16}}>
          {/* Metric tiles */}
          <div className="grid cols-5">
            <KPI label="Velocidade média" icon="speedometer" value={v.avgSpeed} unit="km/h" sub="período: 7 dias"/>
            <KPI label="Velocidade máxima" icon="speedometer" value={v.maxSpeed} unit="km/h" sub="ontem 14:32"/>
            <KPI label="Distância" icon="chart" value={fmtNum(v.distance7d)} unit="km" sub="7 dias"/>
            <KPI label="Consumo médio" icon="fuel" value={v.fuel} unit="km/l" sub="meta 3,0"/>
            <KPI label="Hodômetro" icon="gauge" value={fmtNum(v.odometer)} unit="km"/>
          </div>
          <div className="grid cols-5">
            <KPI label="RPM médio" icon="gauge" value={fmtNum(Math.max(800, v.rpm))} unit="rpm" sub=""/>
            <KPI label="RPM máximo" icon="gauge" value="2.860" unit="rpm" sub="ontem 09:14"/>
            <KPI label="Motor ligado" icon="clock" value={v.motorOnH} unit="h" sub="7 dias"/>
            <KPI label="Motor desligado" icon="clock" value={(168 - v.motorOnH).toFixed(1)} unit="h" sub="7 dias"/>
            <KPI label="Parado c/ motor ligado" icon="idle" value={v.idleH} unit="h" sub={`${((v.idleH/v.motorOnH)*100).toFixed(0)}% do tempo`}/>
          </div>

          <div className="grid cols-2-1">
            <div className="card card-flush">
              <div className="card-header">
                <h3>Histórico de posições · últimas 24h</h3>
                <span className="meta">
                  <span className="row" style={{gap: 6}}>
                    <span className="dot" style={{background: "var(--brand-blue)"}}/> Rota
                    <span className="dot" style={{background: "var(--text-3)", marginLeft: 6}}/> Início
                  </span>
                </span>
              </div>
              <div ref={mapRef} style={{ width: "100%", height: 360 }}/>
            </div>

            <div className="card card-flush">
              <div className="card-header">
                <h3>Linha do tempo</h3>
                <span className="meta">{timeline.length} eventos</span>
              </div>
              <div className="card-body" style={{maxHeight: 360, overflow: "auto"}}>
                <div className="timeline">
                  {timeline.map(t => (
                    <div key={t.id} className={`timeline-item ${t.sev || "info"}`}>
                      <div className="when">{t.when}</div>
                      <div className="what">{t.label}{t.speed && <span className="muted num" style={{marginLeft: 6}}>{t.speed} km/h</span>}</div>
                      <div className="where">{t.location}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid cols-2-1">
            <div className="card">
              <div className="section-head">
                <h2>Alertas recentes · 7 dias</h2>
                <a className="link muted">Ver todos <Icon name="arrow-right" size={11}/></a>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Evento</th>
                    <th>Severidade</th>
                    <th>Local</th>
                  </tr>
                </thead>
                <tbody>
                  {vehAlerts.slice(0, 6).map(a => (
                    <tr key={a.id} className={`row-${a.sev}`}>
                      <td className="muted num">{a.when}</td>
                      <td>{a.label}</td>
                      <td><SeverityBadge sev={a.sev}/></td>
                      <td className="muted">{a.location}</td>
                    </tr>
                  ))}
                  {vehAlerts.length === 0 && <tr><td colSpan={4} className="muted" style={{textAlign:"center", padding: 24}}>Sem alertas no período.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="card">
              <div className="section-head"><h2>Ficha técnica</h2></div>
              <dl className="spec">
                <dt>Modelo</dt><dd style={{fontFamily: "var(--font-sans)"}}>{v.model}</dd>
                <dt>ID Trucks</dt><dd>{v.id}</dd>
                <dt>Chassi</dt><dd>{v.chassis}</dd>
                <dt>Equipamento</dt><dd style={{fontFamily: "var(--font-sans)"}}>{v.equip}</dd>
                <dt>Última manut.</dt><dd>{v.lastMaint}</dd>
                <dt>Próxima manut.</dt><dd style={{color: v.nextMaint < 0 ? "var(--crit)" : "var(--text)"}}>
                  {v.nextMaint < 0 ? `${Math.abs(v.nextMaint)}d atrasada` : `em ${v.nextMaint}d`}
                </dd>
                <dt>Hodômetro</dt><dd>{fmtNum(v.odometer)} km</dd>
              </dl>
            </div>
          </div>
        </div>
      )}

      {tab === "messages" && (
        <div className="card card-flush">
          <div className="card-header">
            <h3>Mensagens de bordo · últimas 142</h3>
            <span className="meta">stream <span className="num">mensagens_cb</span></span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Tipo</th>
                <th>Conteúdo</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {[
                { t: "14:31", typ: "Posição", c: "lat -19.97 lng -44.05 spd 64", o: "GPS" },
                { t: "14:30", typ: "Telemetria", c: "rpm 1820 fuel 33% odo 248.391", o: "CANBus" },
                { t: "14:28", typ: "Macro", c: "Resposta: \"OK\" (msg #4421)", o: "Motorista" },
                { t: "14:27", typ: "Posição", c: "lat -19.95 lng -44.02 spd 71", o: "GPS" },
                { t: "14:24", typ: "Evento", c: "ignição acionada", o: "ECU" },
                { t: "14:18", typ: "Telemetria", c: "rpm 2120 fuel 34% odo 248.378", o: "CANBus" },
                { t: "14:11", typ: "Posição", c: "lat -19.90 lng -43.97 spd 88", o: "GPS" },
                { t: "14:05", typ: "Macro", c: "Envio: \"Confirmar entrega Belo Horizonte?\"", o: "Operador" },
              ].map((m, i) => (
                <tr key={i}>
                  <td className="muted num">{m.t}</td>
                  <td>{m.typ}</td>
                  <td className="num" style={{fontSize: 11.5}}>{m.c}</td>
                  <td className="muted">{m.o}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "telemetry" && (
        <div className="grid cols-2-1">
          <div className="card">
            <div className="section-head"><h2>Telemetria · 24h</h2></div>
            <div className="col" style={{gap: 18}}>
              {[
                { label: "Velocidade", values: [42,52,68,71,80,76,65,58,52,40,32,28], unit: "km/h" },
                { label: "RPM", values: [820,1100,1620,1820,2100,1900,1650,1420,1300,1100,900,820], unit: "rpm" },
                { label: "Consumo instantâneo", values: [3.4,3.1,2.9,2.7,2.5,2.6,2.8,3.0,3.2,3.5,3.4,3.2], unit: "km/l" },
              ].map((s, i) => (
                <div key={i}>
                  <div className="row between" style={{marginBottom: 4}}>
                    <span style={{fontSize: 12}}>{s.label}</span>
                    <span className="muted num" style={{fontSize: 11.5}}>{s.values[s.values.length-1]} {s.unit}</span>
                  </div>
                  <Sparkline values={s.values} width={520} height={42} color="var(--text)"/>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="section-head"><h2>Distribuição do tempo</h2></div>
            <div className="row" style={{gap: 16, alignItems: "center"}}>
              <div className="donut" style={{["--p"]: Math.round((v.motorOnH-v.idleH)/v.motorOnH*100), ["--c"]: "var(--text)"}}>
                <div className="donut-val">{Math.round((v.motorOnH-v.idleH)/v.motorOnH*100)}%</div>
              </div>
              <div className="col" style={{gap: 8, fontSize: 12.5, flex: 1}}>
                <div className="row between"><span><span className="dot" style={{background: "var(--brand-navy)"}}/> Em movimento</span><b className="num">{(v.motorOnH-v.idleH).toFixed(1)}h</b></div>
                <div className="row between"><span><span className="dot" style={{background: "var(--warn)"}}/> Parado motor ligado</span><b className="num">{v.idleH}h</b></div>
                <div className="row between"><span><span className="dot" style={{background: "var(--surface-3)", border: "1px solid var(--border)"}}/> Motor desligado</span><b className="num">{(168-v.motorOnH).toFixed(1)}h</b></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "maint" && (
        <div className="card card-flush">
          <div className="card-header"><h3>Histórico de manutenção</h3><span className="meta">9 registros</span></div>
          <table className="tbl">
            <thead>
              <tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Hodômetro</th><th>Oficina</th><th>Custo</th></tr>
            </thead>
            <tbody>
              {[
                { d: "12/05/2026", typ: "Preventiva", desc: "Troca de óleo + filtros", od: "247.812", of: "Truck Center BH", c: "R$ 1.842,00" },
                { d: "28/03/2026", typ: "Corretiva", desc: "Substituição da bomba d'água", od: "241.220", of: "Volvo Pampulha", c: "R$ 4.310,00" },
                { d: "14/02/2026", typ: "Preventiva", desc: "Revisão dos 240 mil km", od: "239.040", of: "Volvo Pampulha", c: "R$ 6.890,00" },
                { d: "03/01/2026", typ: "Corretiva", desc: "Troca do sensor MAP", od: "232.110", of: "Truck Center BH", c: "R$ 920,00" },
              ].map((r, i) => (
                <tr key={i}>
                  <td className="num muted">{r.d}</td>
                  <td><span className={`badge ${r.typ === "Preventiva" ? "ok" : "warn"}`}>{r.typ}</span></td>
                  <td>{r.desc}</td>
                  <td className="num">{r.od}</td>
                  <td className="muted">{r.of}</td>
                  <td className="num">{r.c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "alerts" && (
        <div className="card card-flush">
          <div className="card-header"><h3>Alertas · {vehAlerts.length} registros</h3></div>
          <table className="tbl">
            <thead>
              <tr><th>Quando</th><th>Tipo</th><th>Severidade</th><th>Velocidade</th><th>Local</th><th>Status</th></tr>
            </thead>
            <tbody>
              {vehAlerts.map(a => (
                <tr key={a.id} className={`row-${a.sev}`}>
                  <td className="num muted">{a.when}</td>
                  <td>{a.label}</td>
                  <td><SeverityBadge sev={a.sev}/></td>
                  <td className="num">{a.speed ? a.speed + " km/h" : "—"}</td>
                  <td className="muted">{a.location}</td>
                  <td><span className={`badge ${a.status === "Pendente" ? "warn" : ""}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

window.VehicleDetail = VehicleDetail;
