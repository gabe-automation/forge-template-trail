/** Google consent is handled by the provider; app consent gates email only. */
export function canStartSignIn(method: "google" | "email", agreed: boolean, busy: boolean): boolean {
  return !busy && (method === "google" || agreed);
}