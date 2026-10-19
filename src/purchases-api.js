import { fetchWithTimeout } from "./http.js";
export async function purchasesApi(
  path,
  body,
  method = "POST",
  publicAccess = false,
) {
  const response = await fetchWithTimeout(
    `${window.RB_API_BASE_URL}/${publicAccess ? "compras-publico" : "compras"}${path}`,
    {
      method: body === undefined ? "GET" : method,
      headers: {
        "Content-Type": "application/json",
        ...(publicAccess &&
        JSON.parse(sessionStorage.getItem("RB_SUPPLIER_SESSION") || "null")
          ?.token
          ? {
              Authorization: `Bearer ${JSON.parse(sessionStorage.getItem("RB_SUPPLIER_SESSION")).token}`,
            }
          : {}),
        ...(!publicAccess && window.RB_AUTH?.getToken()
          ? { Authorization: `Bearer ${window.RB_AUTH.getToken()}` }
          : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      data?.error || `Não foi possível concluir (${response.status}).`,
    );
  return data;
}
export function rankedOffers(item, invitations) {
  return invitations
    .flatMap((invite) => {
      const offer = invite.resposta?.itens.find(
        (i) => i.id === item.id && i.disponivel,
      );
      return offer
        ? [
            {
              ...offer,
              fornecedor: invite.nome,
              frete: invite.resposta.frete,
              prazoEntrega: invite.resposta.prazoEntrega,
              pagamento: invite.resposta.pagamento,
              completa: offer.quantidade >= item.quantidade,
            },
          ]
        : [];
    })
    .sort(
      (a, b) => Number(b.completa) - Number(a.completa) || a.valor - b.valor,
    );
}
