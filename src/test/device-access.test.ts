import { describe, expect, it } from "vitest";
import { canEditOnDevice } from "@/lib/deviceAccess";

describe("Device access", () => {
  it("limits phone owners and editors to viewing", () => {
    for (const width of [320, 390, 640, 767]) {
      expect(canEditOnDevice(width, "owner")).toBe(false);
      expect(canEditOnDevice(width, "editor")).toBe(false);
    }
  });
  it("retains editing for tablet owners and editors", () => {
    for (const width of [768, 820, 1024]) {
      expect(canEditOnDevice(width, "owner")).toBe(true);
      expect(canEditOnDevice(width, "editor")).toBe(true);
    }
  });
  it("does not grant editing to viewers or unknown memberships", () => {
    expect(canEditOnDevice(1280, "viewer")).toBe(false);
    expect(canEditOnDevice(1280)).toBe(false);
    expect(canEditOnDevice(undefined, "owner")).toBe(false);
  });
});