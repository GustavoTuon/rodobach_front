export const vehicleOptions=[['','Todos'],['with','Com placa'],['without','Sem placa']];
export const matchesExpenseVehicle=(row,filter)=>!filter || (filter==='without' ? !row.plate : Boolean(row.plate));
