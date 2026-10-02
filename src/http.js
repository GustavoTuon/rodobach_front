export function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = 90000, ...requestOptions } = options;
  const deadline = AbortSignal.timeout(timeoutMs);
  return fetch(url, { ...requestOptions, signal: options.signal ? AbortSignal.any([options.signal, deadline]) : deadline });
}
