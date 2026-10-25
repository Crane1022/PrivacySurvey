import { config } from '../../config'

let cached
// mock => browser storage, live => Cloud Firestore (loaded lazily so mock mode never touches Firebase)
export function getStore() {
  if (!cached) {
    cached = config.isMock
      ? import('./mock').then(m => m.store)
      : import('./firestore').then(m => m.store)
  }
  return cached
}
