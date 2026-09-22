export function formatOutsideDuration(hours) {
  if (hours == null || !Number.isFinite(Number(hours)) || Number(hours)<0) return 'Sem dados';
  const minutes=Math.round(Number(hours)*60);
  return `${Math.floor(minutes/1440)}d ${Math.floor(minutes%1440/60)}h ${String(minutes%60).padStart(2,'0')}min`;
}

// Planning reference, not a finding of entitlement or a payroll balance.
// The user supplies the actual end of work; a geofence return is not used.
export function planDriverRest(endOfWork, kind) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(endOfWork || '')) return null;
  if (!['daily','weekly'].includes(kind)) return null;
  const start=new Date(`${endOfWork}:00-03:00`);
  if (!Number.isFinite(start.getTime())) return null;
  if (new Date(start.getTime()-3*3600000).toISOString().slice(0,16)!==endOfWork) return null;
  const hours=kind==='weekly'?35:11;
  return {hours,start:start.toISOString(),end:new Date(start.getTime()+hours*3600000).toISOString()};
}
