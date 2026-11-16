export function supplierOrigin(supplier) {
  const code=supplier.codigo ?? supplier.supplierCode;
  return code!=null&&String(code).trim()!==''?'Cadastrado pelo ERP':'Cadastrado pela Norte';
}
export function supplierLabel(supplier) {
  const name=supplier.nome ?? supplier.supplier;
  return name?`${name} (${supplierOrigin(supplier)})`:'Fornecedor não informado';
}
