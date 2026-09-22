export function fetchWithTimeout(url, options = {}) {
  const deadline = AbortSignal.timeout(90000);
  return fetch(url, { ...options, signal: options.signal ? AbortSignal.any([options.signal, deadline]) : deadline });
}
