import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { getLoadingActivity, subscribeLoadingActivity } from './loading-activity.js';
import './global-loading.css';

export function GlobalLoading() {
  const { pending, startedAt } = useSyncExternalStore(subscribeLoadingActivity, getLoadingActivity);
  const [visible, setVisible] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (startedAt === null) { setVisible(false); setSlow(false); return; }
    const elapsed = Date.now() - startedAt;
    const show = setTimeout(() => setVisible(true), Math.max(0, 180 - elapsed));
    const delay = setTimeout(() => setSlow(true), Math.max(0, 8000 - elapsed));
    return () => { clearTimeout(show); clearTimeout(delay); };
  }, [startedAt]);
  if (!pending || !visible) return null;
  return <div className="rb-global-loading">
    <div className="rb-global-loading-bar" aria-hidden="true"><span /></div>
    <div className="rb-global-loading-notice" role="status" aria-live="polite" aria-atomic="true">
      <span className="rb-global-loading-spinner" aria-hidden="true" />
      <div><strong>{slow ? 'Ainda carregando…' : 'Carregando informações…'}</strong>
        <span>{slow ? 'A consulta está demorando. Aguarde a conclusão.' : 'Aguarde a conclusão da atualização.'}</span></div>
    </div>
  </div>;
}
