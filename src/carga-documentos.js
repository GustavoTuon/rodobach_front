const clean = value => String(value ?? "").trim();
const numeric = value => clean(value).replace(/^0+(?=\d)/, "");

export function sameCargaDocumento(a, b) {
  const type = value => clean(value).toUpperCase().replace(/[^A-Z]/g, "");
  if (type(a.tipo) !== type(b.tipo)) return false;
  if (a.chave && b.chave) return a.chave === b.chave;
  if (a.empresa && a.serie && b.empresa && b.serie) {
    return clean(a.empresa) === clean(b.empresa) && clean(a.serie) === clean(b.serie)
      && numeric(a.numero) === numeric(b.numero);
  }
  // Do not collapse a new identified document into an ambiguous legacy link.
  if (a.empresa || a.serie || b.empresa || b.serie) return false;
  return Boolean(clean(a.numero)) && numeric(a.numero) === numeric(b.numero);
}
