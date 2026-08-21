function elementsByLocalName(root, name) {
  return Array.from(root.getElementsByTagName("*")).filter(
    (element) => element.localName === name,
  );
}

function firstElement(root, name) {
  return elementsByLocalName(root, name)[0] || null;
}

function text(root, name) {
  return firstElement(root, name)?.textContent?.trim() || "";
}

function number(root, name) {
  const value = Number(text(root, name).replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

function normalizeNcm(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

export function parseNfeXml(xmlText, fileName = "arquivo.xml", Parser = DOMParser) {
  const document = new Parser().parseFromString(xmlText, "application/xml");
  if (firstElement(document, "parsererror")) {
    throw new Error("XML malformado.");
  }

  const infNfe = firstElement(document, "infNFe");
  if (!infNfe) {
    throw new Error("O arquivo não contém uma NF-e autorizada.");
  }

  const ide = firstElement(infNfe, "ide") || infNfe;
  const emit = firstElement(infNfe, "emit") || infNfe;
  const dest = firstElement(infNfe, "dest") || null;
  const total = firstElement(infNfe, "ICMSTot") || infNfe;
  const transport = firstElement(infNfe, "transp") || infNfe;
  const products = elementsByLocalName(infNfe, "det").map((detail) => {
    const product = firstElement(detail, "prod") || detail;
    return {
      ncm: normalizeNcm(text(product, "NCM")),
      descricao: text(product, "xProd"),
      quantidade: number(product, "qCom"),
      valor: number(product, "vProd"),
    };
  });

  if (!products.length) {
    throw new Error("A NF-e não possui itens de produto.");
  }

  const volumes = elementsByLocalName(transport, "vol");
  const sumVolume = (field) =>
    volumes.reduce((sum, volume) => sum + number(volume, field), 0);
  const pesoBruto = sumVolume("pesoB");
  const pesoLiquido = sumVolume("pesoL");
  const modalidadeFrete = text(transport, "modFrete");
  const emitenteDocumento = text(emit, "CNPJ") || text(emit, "CPF");
  const destinatario = dest ? text(dest, "xNome") : "";
  const destinatarioDocumento = dest ? text(dest, "CNPJ") || text(dest, "CPF") : "";
  const tomadorConhecido = modalidadeFrete === "0" || modalidadeFrete === "1";
  const tomadorCte = modalidadeFrete === "0" ? text(emit, "xNome") : modalidadeFrete === "1" ? destinatario : "";
  const tomadorCteDocumento = modalidadeFrete === "0" ? emitenteDocumento : modalidadeFrete === "1" ? destinatarioDocumento : "";
  const id = infNfe.getAttribute("Id") || "";
  const chave = id.replace(/^NFe/i, "") || text(document, "chNFe");

  return {
    arquivo: fileName,
    chave,
    numero: text(ide, "nNF"),
    serie: text(ide, "serie"),
    emissao: text(ide, "dhEmi") || text(ide, "dEmi"),
    emitente: text(emit, "xNome"),
    emitenteDocumento,
    cliente: destinatario,
    clienteDocumento: destinatarioDocumento,
    modalidadeFrete,
    tomadorConhecido,
    tomadorCte,
    tomadorCteDocumento,
    valorNota: number(total, "vNF") || number(total, "vProd"),
    pesoBruto,
    pesoLiquido,
    pesoConsiderado: pesoBruto || pesoLiquido,
    produtos: products,
  };
}

export function consolidateNfes(notes) {
  const byNcm = new Map();
  for (const note of notes) {
    for (const product of note.produtos || []) {
      if (!product.ncm) continue;
      const current = byNcm.get(product.ncm) || {
        ncm: product.ncm,
        valorProdutos: 0,
        quantidade: 0,
        itens: 0,
      };
      current.valorProdutos += Number(product.valor || 0);
      current.quantidade += Number(product.quantidade || 0);
      current.itens += 1;
      byNcm.set(product.ncm, current);
    }
  }

  const ncms = Array.from(byNcm.values()).sort(
    (a, b) =>
      b.valorProdutos - a.valorProdutos || b.quantidade - a.quantidade || a.ncm.localeCompare(b.ncm),
  );
  const valorTotal = notes.reduce((sum, note) => sum + Number(note.valorNota || 0), 0);
  const pesoTotal = notes.reduce((sum, note) => sum + Number(note.pesoConsiderado || 0), 0);

  return {
    quantidadeNotas: notes.length,
    valorTotal,
    pesoTotal,
    valorPorKg: pesoTotal > 0 ? valorTotal / pesoTotal : null,
    ncmPredominante: ncms[0]?.ncm || "",
    ncms,
  };
}
