/** Each request owns a token. Only the latest may publish results or errors. */
export function createRequestGuard() {
  let generation = 0
  return {
    begin() {
      const request = ++generation
      return () => request === generation
    },
    invalidate() {
      generation++
    },
  }
}
