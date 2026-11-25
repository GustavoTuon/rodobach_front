import React from 'react';

export default function ExpenseWithoutVehicle({value,onChange,disabled}) {
  return <label className="mp-without-vehicle">
    <input type="checkbox" checked={value} disabled={disabled} onChange={e=>onChange(e.target.checked)}/>
    <span><strong>Despesa sem veículo vinculado</strong><small>Registre sem placa e sem viagem. O valor ficará separado das despesas por veículo.</small></span>
  </label>;
}
