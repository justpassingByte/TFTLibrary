// Tiny nanoid-like unique ID generator (no dependency needed)
export function nanoid(size = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  const array = new Uint8Array(size);
  if (typeof window !== 'undefined') {
    window.crypto.getRandomValues(array);
  } else {
    // Server-side (Node)
    for (let i = 0; i < size; i++) array[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < size; i++) {
    id += chars[array[i] % chars.length];
  }
  return id;
}
