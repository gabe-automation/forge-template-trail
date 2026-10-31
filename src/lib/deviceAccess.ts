export const MOBILE_MAX_WIDTH = 767;

/** Membership permissions apply equally on touch and desktop devices. */
export function canEditOnDevice(width: number | undefined, role?: string) {
  return width !== undefined && width > 0 && (role === "owner" || role === "editor");
}