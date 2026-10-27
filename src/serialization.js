// Firestore forbids arrays directly nested inside arrays. Keep a convenient
// three-row array in React; store a named map at every Firebase boundary.
export function encodeFirestore(value) {
  if (Array.isArray(value)) return value.map(encodeFirestore);
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        key === "levels" && Array.isArray(v)
          ? {
              t1: encodeFirestore(v[0]),
              t2: encodeFirestore(v[1]),
              t3: encodeFirestore(v[2]),
            }
          : encodeFirestore(v),
      ]),
    );
  }
  return value;
}
export function decodeFirestore(value) {
  if (Array.isArray(value)) return value.map(decodeFirestore);
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        key === "levels" && v && !Array.isArray(v)
          ? [
              decodeFirestore(v.t1),
              decodeFirestore(v.t2),
              decodeFirestore(v.t3),
            ]
          : decodeFirestore(v),
      ]),
    );
  }
  return value;
}
