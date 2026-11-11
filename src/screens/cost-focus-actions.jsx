import React from 'react';
import {ecCategory,ecGroups,ecGrowth,ecMoney,ecPct,ecSum} from './cost-analysis-model.js';

export function CostFocusActions({rows,previous,month,onView,onOpen,onCategory}) {
  const total=ecSum(rows), prior=ecSum(previous), growth=month?null:ecGrowth(total,prior);
  const vehicle=ecGroups(rows.filter(row=>row.placa),row=>row.placa)[0];
  const category=ecGroups(rows,ecCategory)[0];
  return <section className="ec-focus-actions" aria-label="Caminhos para investigar">
    <div className="ec-focus-heading"><div><span className="ec-eyebrow">SEU PRÓXIMO PASSO</span><h2>Por onde começar?</h2></div><p>Três caminhos a partir do recorte atual.</p></div>
    <div className="ec-focus-grid">
      <button className="ec-focus-card" onClick={()=>onView('deviations')}>
        <span className="ec-focus-tag">01 · ENTENDER A VARIAÇÃO</span>
        <strong>{growth===null?'Comparar períodos':`${growth>0?'+':''}${ecPct(growth)}`}</strong>
        <p>{month?'Remova o mês selecionado para comparar períodos completos.':growth===null?'Sem base anterior positiva para calcular a variação percentual.':`${ecMoney(total-prior)} de diferença frente ao período anterior.`}</p>
        <span className="ec-focus-link">Investigar desvios <span aria-hidden="true">↗</span></span>
      </button>
      <button className="ec-focus-card" disabled={!vehicle} onClick={()=>onOpen(vehicle.name)}>
        <span className="ec-focus-tag">02 · EXPLORAR O VEÍCULO</span>
        <strong>{vehicle?.name||'Sem veículo'}</strong>
        <p>{vehicle?`${ecMoney(vehicle.value)} · maior custo total entre as placas identificadas.`:'Nenhuma placa com lançamentos neste recorte.'}</p>
        <span className="ec-focus-link">Abrir raio-X do veículo <span aria-hidden="true">↗</span></span>
      </button>
      <button className="ec-focus-card" disabled={!category} onClick={()=>onCategory(category.name)}>
        <span className="ec-focus-tag">03 · RASTREAR A CATEGORIA</span>
        <strong>{category?.name||'Sem categoria'}</strong>
        <p>{category?`${ecMoney(category.value)}${total>0?` · ${ecPct(category.value/total*100)} do custo total`:''}.`:'Nenhuma categoria com lançamentos neste recorte.'}</p>
        <span className="ec-focus-link">Ver origem dos gastos <span aria-hidden="true">↗</span></span>
      </button>
    </div>
    <p className="ec-focus-note">Os destaques indicam onde investigar. Maior gasto não significa menor eficiência; considere distância, atividade e tipo de veículo.</p>
  </section>;
}
