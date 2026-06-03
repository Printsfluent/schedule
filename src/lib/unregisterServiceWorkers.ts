export async function unregisterAllServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
  } catch {
    /* ignore */
  }
}

export async function deleteAllCaches(): Promise<void> {
  if (!('caches' in window)) return
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  } catch {
    /* ignore */
  }
}
