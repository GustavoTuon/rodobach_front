const listeners = new Set();
let snapshot = { pending: 0, startedAt: null };

export const getLoadingActivity = () => snapshot;
export function subscribeLoadingActivity(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function notify() { listeners.forEach(listener => listener()); }

export function beginLoadingActivity() {
  snapshot = { pending: snapshot.pending + 1, startedAt: snapshot.startedAt ?? Date.now() };
  notify();
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    const pending = snapshot.pending - 1;
    snapshot = { pending, startedAt: pending ? snapshot.startedAt : null };
    notify();
  };
}

export async function trackLoadingActivity(task) {
  const finish = beginLoadingActivity();
  try { return await task(); }
  finally { finish(); }
}
