// crypto.randomUUID() fails over plain http on your phone, so use a simple id
export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);