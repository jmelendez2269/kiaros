// Preload hook for check-access-02-staging.mts: the app's `server-only`
// import throws outside Next.js's webpack "react-server" build condition.
// This is a plain Node/tsx run, so short-circuit that one package to a
// no-op instead of loading real code through it.
const Module = require('node:module')
const originalLoad = Module._load
Module._load = function (request, ...rest) {
  if (request === 'server-only') return {}
  const exported = originalLoad.call(this, request, ...rest)
  // React 18 (installed) has no `cache()`; that's a Next.js RSC-canary
  // export. Outside Next.js's runtime, make it the identity wrapper so
  // memoized loaders still just call straight through.
  if (request === 'react' && typeof exported.cache !== 'function') {
    exported.cache = (fn) => fn
  }
  return exported
}
