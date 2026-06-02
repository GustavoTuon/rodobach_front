// Relatórios de Desempenho — Norte Telemetria
const Reports = ({ onGoToVehicle }) => {
  const D = window.NT_DATA;
  const fleet = D.FLEET;

  const totalKm = fleet.reduce((s, v) => s + v.distance7d, 0);
  const avgSpeed = (fleet.reduce((s, v) => s + v.avgSpeed, 0) / fleet.length).toFixed(0);
  const avgFuel = (fleet.reduce((s, v) => s + v.fuel, 0) / fleet.length).toFixed(2);
  const totalIdle = fleet.reduce((s, v) => s + v.idleH, 0).toFixed(0);

  const mostEfficient = [...fleet].sort((a, b) => b.fuel - a.fuel).slice(0, 5);
  const leastEfficient = [...fleet].sort((a, b) => a.fuel - b.fuel).slice(0, 5);

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>Relatórios de desempenho</h1>
          <div className="sub">Visão comparativa da frota · 19 — 26 mai 2026</div>
        </div>
        <div className="actions">
          <button className="btn"><Icon name="calendar"/> 19 mai — 26 mai</button>
          <button className="btn"><Icon name="filter"/> Agrupar por: veículo</button>
          <button className="btn primary"><Icon name="download"/> Exportar relatório</button>
        </div>
      </div>

      <div className="grid cols-4" style={{marginBottom: 16}}>
        <KPI label="Distância total" icon="chart" value={fmtNum(totalKm)} unit="km"
             delta="+ 8,4%" deltaDir="up" sub="vs período anterior"/>
        <KPI label="Velocidade média" icon="speedometer" value={avgSpeed} unit="km/h"
             delta="estável" deltaDir="flat"/>
        <KPI label="Consumo médio" icon="fuel" value={avgFuel} unit="km/l"
             delta="− 0,07" deltaDir="down" sub="meta: 3,0 km/l"/>
        <KPI label="Motor ligado parado" icon="idle" value={totalIdle} unit="h"
             delta="− 4%" deltaDir="up" sub="economia: R$ 2.140"/>
      </div>

      <div className="grid cols-2" style={{marginBottom: 16}}>
        <div className="card">
          <div className="section-head">
            <h2>Distância por veículo · 7 dias</h2>
            <span className="muted num" style={{fontSize: 11.5}}>20 veículos</span>
          </div>
          <BarChart rows={[...fleet]
            .sort((a, b) => b.distance7d - a.distance7d)
            .slice(0, 10)
            .map(v => ({ label: v.plate, value: v.distance7d }))}/>
        </div>
        <div className="card">
          <div className="section-head">
            <h2>Distribuição da operação · frota</h2>
            <span className="muted" style={{fontSize: 11.5}}>tempo total</span>
          </div>
          {(() => {
            const moving = fleet.reduce((s, v) => s + (v.motorOnH - v.idleH), 0);
            const idle = fleet.reduce((s, v) => s + v.idleH, 0);
            const off = fleet.reduce((s, v) => s + (168 - v.motorOnH), 0);
            const total = moving + idle + off;
            return (
              <div className="col" style={{gap: 16, marginTop: 8}}>
                <div style={{height: 28, display: "flex", borderRadius: 4, overflow: "hidden", border: "1px solid var(--border)"}}>
                  <div style={{width: `${(moving/total)*100}%`, background: "var(--brand-navy)"}}/>
                  <div style={{width: `${(idle/total)*100}%`, background: "var(--warn)"}}/>
                  <div style={{width: `${(off/total)*100}%`, background: "var(--surface-3)"}}/>
                </div>
                <div className="grid cols-3" style={{gap: 14}}>
                  <div>
                    <div className="row" style={{gap: 6, marginBottom: 4}}>
                      <span className="dot" style={{background: "var(--brand-navy)"}}/>
                      <span className="muted" style={{fontSize: 11.5}}>Em movimento</span>
                    </div>
                    <div className="num" style={{fontSize: 17, fontWeight: 500}}>{fmtNum(Math.round(moving))}h</div>
                    <div className="muted num" style={{fontSize: 11.5}}>{((moving/total)*100).toFixed(0)}% do tempo</div>
                  </div>
                  <div>
                    <div className="row" style={{gap: 6, marginBottom: 4}}>
                      <span className="dot warn"/>
                      <span className="muted" style={{fontSize: 11.5}}>Parado · motor ligado</span>
                    </div>
                    <div className="num" style={{fontSize: 17, fontWeight: 500}}>{fmtNum(Math.round(idle))}h</div>
                    <div className="muted num" style={{fontSize: 11.5}}>{((idle/total)*100).toFixed(0)}% · perda estimada</div>
                  </div>
                  <div>
                    <div className="row" style={{gap: 6, marginBottom: 4}}>
                      <span className="dot" style={{background: "var(--text-4)"}}/>
                      <span className="muted" style={{fontSize: 11.5}}>Motor desligado</span>
                    </div>
                    <div className="num" style={{fontSize: 17, fontWeight: 500}}>{fmtNum(Math.round(off))}h</div>
                    <div className="muted num" style={{fontSize: 11.5}}>{((off/total)*100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="grid cols-2" style={{marginBottom: 16}}>
        <div className="card card-flush">
          <div className="card-header">
            <h3>Mais eficientes · consumo</h3>
            <span className="meta">km/l</span>
          </div>
          <table className="tbl">
            <thead><tr><th>#</th><th>Placa</th><th>Motorista</th><th style={{textAlign: "right"}}>Consumo</th><th>Tendência</th></tr></thead>
            <tbody>
              {mostEfficient.map((v, i) => (
                <tr key={v.plate} className="clickable" onClick={() => onGoToVehicle(v.plate)}>
                  <td className="muted num">{i + 1}</td>
                  <td><Plate value={v.plate}/></td>
                  <td className="muted">{v.driver}</td>
                  <td className="num" style={{textAlign: "right", color: "var(--ok)"}}>{v.fuel}</td>
                  <td><MiniBar values={[2.4, 2.6, 2.8, 2.9, v.fuel - 0.1, v.fuel, v.fuel]} accent/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card card-flush">
          <div className="card-header">
            <h3>Menos eficientes · consumo</h3>
            <span className="meta">km/l</span>
          </div>
          <table className="tbl">
            <thead><tr><th>#</th><th>Placa</th><th>Motorista</th><th style={{textAlign: "right"}}>Consumo</th><th>Tendência</th></tr></thead>
            <tbody>
              {leastEfficient.map((v, i) => (
                <tr key={v.plate} className="clickable" onClick={() => onGoToVehicle(v.plate)}>
                  <td className="muted num">{i + 1}</td>
                  <td><Plate value={v.plate}/></td>
                  <td className="muted">{v.driver}</td>
                  <td className="num" style={{textAlign: "right", color: "var(--crit)"}}>{v.fuel}</td>
                  <td><MiniBar values={[3.1, 2.9, 2.8, 2.6, 2.5, v.fuel + 0.1, v.fuel]}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card card-flush">
        <div className="card-header">
          <h3>Desempenho por veículo · período</h3>
          <span className="meta">20 veículos</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Placa</th>
              <th>Motorista</th>
              <th style={{textAlign:"right"}}>Distância</th>
              <th style={{textAlign:"right"}}>Vel. média</th>
              <th style={{textAlign:"right"}}>Vel. máx</th>
              <th style={{textAlign:"right"}}>Consumo</th>
              <th style={{textAlign:"right"}}>Motor ligado</th>
              <th style={{textAlign:"right"}}>Em mov.</th>
              <th style={{textAlign:"right"}}>Parado lig.</th>
              <th style={{textAlign:"right"}}>Alertas</th>
            </tr>
          </thead>
          <tbody>
            {fleet.map(v => (
              <tr key={v.plate} className="clickable" onClick={() => onGoToVehicle(v.plate)}>
                <td><Plate value={v.plate}/></td>
                <td className="muted">{v.driver}</td>
                <td className="num" style={{textAlign:"right"}}>{fmtNum(v.distance7d)}</td>
                <td className="num" style={{textAlign:"right"}}>{v.avgSpeed}</td>
                <td className="num" style={{textAlign:"right", color: v.maxSpeed > 110 ? "var(--crit)" : "inherit"}}>{v.maxSpeed}</td>
                <td className="num" style={{textAlign:"right", color: v.fuel < 2.5 ? "var(--crit)" : v.fuel > 3.1 ? "var(--ok)" : "inherit"}}>{v.fuel}</td>
                <td className="num" style={{textAlign:"right"}}>{v.motorOnH}h</td>
                <td className="num" style={{textAlign:"right"}}>{(v.motorOnH - v.idleH).toFixed(1)}h</td>
                <td className="num" style={{textAlign:"right", color: v.idleH > 15 ? "var(--warn)" : "inherit"}}>{v.idleH}h</td>
                <td className="num" style={{textAlign:"right"}}>{v.alerts7d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

window.Reports = Reports;
