export const MOBILE_MAX_WIDTH = 767;

/** Device restrictions supplement membership permissions. */
export function canEditOnDevice(width: number | undefined, role?: string) {
  return width !== undefined && width > MOBILE_MAX_WIDTH && (role === "owner" || role === "editor");
}