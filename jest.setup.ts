import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

// Polyfill structuredClone for jsdom environment
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: unknown) => JSON.parse(JSON.stringify(obj))
}
