import React from 'react';

const labels = {
  km_atual: 'KM cadastrado', km_proximo_envio: 'KM de aviso', intervalo_km: 'Intervalo (km)',
  km_servico: 'KM do serviço', data_servico: 'Data do serviço', data_ultimo_servico: 'Último serviço',
  data_proximo_envio: 'Data de aviso', intervalo_dias: 'Intervalo (dias)', titulo: 'Título',
  mensagem: 'Mensagem', numeros: 'Destinatários', ativo: 'Plano ativo', tipo_controle: 'Controle',
  placa: 'Placa', descricao: 'Descrição', fornecedor: 'Fornecedor', documento: 'Documento',
  observacao: 'Observação', alertas_componentes: 'Alertas de componentes', contato_nome: 'Contato',
  contato_numero: 'Telefone', contato_id: 'Contato (ID)', automacao_id: 'Plano (ID)', tipo_movimento: 'Serviço',
};
const ignored = new Set(['id', 'criado_em', 'atualizado_em', 'criado_por']);
const kmFields = new Set(['km_atual', 'km_proximo_envio', 'intervalo_km', 'km_servico']);
const statuses = {
  aceito: 'Aceito pelo serviço', falha: 'Falha no envio', inconclusivo: 'Resultado não confirmado',
  iniciado: 'Tentativa iniciada — sem resultado', registro_legado: 'Registro antigo — sem confirmação',
};
const dateTime = value => value ? new Date(value).toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'}) : '—';
const formatValue = (key, value) => {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (kmFields.has(key)) return `${Number(value).toLocaleString('pt-BR')} km`;
  if (/^data_/.test(key) && /^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10).split('-').reverse().join('/');
  return String(value);
};

export function auditChanges(row) {
  const before = row.dados_anteriores || {}, after = row.dados_novos || {};
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(key => !ignored.has(key) && JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null))
    .map(key => ({key, label: labels[key] || key, before: formatValue(key, before[key]), after: formatValue(key, after[key])}));
}

export default function MaintenanceAudit({api, revision = 0, plan, onClearPlan}) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [filters, setFilters] = React.useState({placa: '', tipo: '', inicio: '', fim: ''});
  const [page, setPage] = React.useState(1);
  const [refresh, setRefresh] = React.useState(0);
  React.useEffect(() => { setPage(1); }, [plan?.id]);
  React.useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api.listManutencaoAuditoria({...filters, automacaoId: plan?.id || '', pagina: page})
      .then(result => { if (active) setData(result); })
      .catch(err => { if (active) { setError(err.message); setData(null); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, filters, page, refresh, revision, plan?.id]);
  const filter = (key, value) => { setPage(1); setFilters(current => ({...current, [key]: value})); };
  const run = data?.ultimaExecucao;
  const stale = !run || Date.now() - new Date(run.iniciado_em).getTime() > (data?.agendamentoDiario ? 25 * 60 : 25) * 60000;
  const cell = {padding: '10px 12px', verticalAlign: 'top', borderBottom: '1px solid var(--border)', textAlign: 'left'};
  return <section className="card" style={{padding: 16, marginBottom: 16}} aria-label="Auditoria de manutenção">
    <div className="row" style={{justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'}}>
      <div><h2 style={{fontSize: 16, margin: 0}}>Auditoria de alterações e mensagens</h2>
        <p className="muted" style={{fontSize: 12}}>Datas e horários de Brasília. Alterações salvas dos planos e serviços; não inclui cada leitura da telemetria.</p></div>
      <button className="btn" onClick={() => setRefresh(value => value + 1)} disabled={loading}>Atualizar histórico</button>
    </div>
    {data && <div style={{padding: 12, marginBottom: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12}}>
      <strong>{stale ? 'Sem execução recente registrada' : 'Última execução do agendador'}:</strong>{' '}
      {run ? `${dateTime(run.iniciado_em)} · ${{executando: 'Em execução', concluido: 'Concluída', com_falhas: 'Concluída com falhas', falha: 'Falhou'}[run.status] || run.status} · ${run.aceitos} aceito(s) · ${run.falhas} falha(s)` : 'Nenhuma execução registrada pelo novo histórico.'}
      {run?.erro && <div role="alert">{run.erro}</div>}
      <div className="muted" style={{marginTop: 5}}>
        {data.agendamentoDiario ? `Envios programados diariamente às ${data.agendamentoDiario}.` : 'Responsável pelos envios: backend de manutenção, em processo separado.'} Abrir esta tela não inicia os envios; confira a última execução acima.
        {!data.whatsappConfigurado && ' WhatsApp não configurado nesta API.'}
        {data.somenteConsulta && ' Ambiente em modo somente consulta.'}
      </div>
      <div style={{marginTop: 5}}>“Aceito pelo serviço” confirma a resposta ao pedido de envio, não a entrega ou leitura no WhatsApp. Tentativas sem resultado precisam de conferência antes de reenviar.</div>
    </div>}
    {plan && <div style={{marginBottom: 10}}>Plano: <strong>{plan.placa} · {plan.titulo}</strong> <button className="btn" onClick={onClearPlan}>Ver todos os planos</button></div>}
    <div className="row" style={{gap: 10, flexWrap: 'wrap', marginBottom: 12}}>
      <label>Placa <input aria-label="Placa da auditoria" value={filters.placa} onChange={e => filter('placa', e.target.value)} placeholder="Todas as placas" style={{width: 140}} /></label>
      <label>Tipo <select aria-label="Tipo de evento" value={filters.tipo} onChange={e => filter('tipo', e.target.value)}><option value="">Todos</option><option value="alteracoes">Alterações e serviços</option><option value="envios">Mensagens</option></select></label>
      <label>De <input aria-label="Data inicial" type="date" value={filters.inicio} onChange={e => filter('inicio', e.target.value)} /></label>
      <label>Até <input aria-label="Data final" type="date" value={filters.fim} onChange={e => filter('fim', e.target.value)} /></label>
    </div>
    {error && <p role="alert">Não foi possível carregar a auditoria: {error}</p>}
    {loading ? <p role="status">Carregando auditoria…</p> : data && <>
      <div style={{overflowX: 'auto'}}><table style={{width: '100%', borderCollapse: 'collapse', fontSize: 12}}>
        <thead><tr>{['Data / responsável', 'Placa / plano', 'Evento', 'KM anterior → novo', 'Resultado / detalhes'].map(text => <th key={text} style={cell}>{text}</th>)}</tr></thead>
        <tbody>{data.rows.map(row => {
          const changes = auditChanges(row);
          const kms = changes.filter(change => kmFields.has(change.key));
          const send = row.evento === 'envio';
          return <tr key={row.id}>
            <td style={{...cell, minWidth: 165}}>{dateTime(row.ocorrido_em)}<div className="muted">{row.usuario_login || (row.usuario_id ? `Usuário #${row.usuario_id}` : send ? 'Automação / integração' : 'Autor não informado pela integração')}</div></td>
            <td style={{...cell, minWidth: 150}}><strong>{row.placa || '—'}</strong><div>{row.titulo || '—'}</div>{row.automacao_id && <small>Plano #{row.automacao_id}</small>}</td>
            <td style={cell}>{send ? 'Mensagem' : row.origem === 'historico_manutencao_veiculo' ? `Serviço: ${{criacao: 'registro', alteracao: 'alteração', exclusao: 'exclusão'}[row.evento] || row.evento}` : {criacao: 'Plano criado', alteracao: 'Plano alterado', exclusao: 'Plano excluído'}[row.evento] || row.evento}</td>
            <td style={{...cell, minWidth: 190}}>{send ? <><div>KM no envio: {formatValue('km_atual', row.dados_novos?.km_atual)}</div><div>KM de aviso: {formatValue('km_proximo_envio', row.dados_novos?.km_proximo_envio)}</div></> : kms.length ? kms.map(change => <div key={change.key} style={{marginBottom: 5}}><span className="muted">{change.label}</span><br />{change.before} → <strong>{change.after}</strong></div>) : 'Sem alteração de KM'}</td>
            <td style={{...cell, minWidth: 260, maxWidth: 480, overflowWrap: 'anywhere'}}>
              {send ? <><strong style={{color: ['falha', 'inconclusivo'].includes(row.status) ? 'var(--danger, #ef4444)' : 'var(--text)'}}>{statuses[row.status] || row.status}</strong>
                <div>Destinatário: {row.numero || '—'}</div>
                {row.concluido_em && <div>Resposta em: {dateTime(row.concluido_em)}</div>}
                {row.erro && <div>{row.erro}</div>}
                {row.provedor_id && <div>Protocolo: {row.provedor_id}</div>}
                {row.provedor_status && <div>Status do provedor: {row.provedor_status}</div>}
                <details style={{marginTop: 6}}><summary style={{cursor: 'pointer'}}>Ver mensagem registrada</summary><div style={{whiteSpace: 'pre-wrap', marginTop: 8}}>{row.mensagem}</div></details>
              </> : <details><summary style={{cursor: 'pointer'}}>Ver alterações ({changes.length})</summary>{changes.map(change => <div key={change.key} style={{marginTop: 8, whiteSpace: 'pre-wrap'}}><strong>{change.label}</strong><div>Antes: {change.before}</div><div>Depois: {change.after}</div></div>)}</details>}
            </td>
          </tr>;
        })}</tbody>
      </table></div>
      {!data.rows.length && <p>Nenhum registro encontrado para estes filtros. Isso não comprova que mensagens foram enviadas.</p>}
      <div className="row" style={{gap: 12, marginTop: 12}}><button className="btn" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page}</span><button className="btn" disabled={!data.temMais} onClick={() => setPage(value => value + 1)}>Próxima</button></div>
    </>}
    <p className="muted" style={{fontSize: 12, marginBottom: 0}}>O histórico de alterações começa com a ativação desta auditoria. Registros antigos de envio foram preservados, sem confirmação de entrega.</p>
  </section>;
}
