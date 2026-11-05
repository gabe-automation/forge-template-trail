import { describe, expect, it } from "vitest";
import { canStartSignIn } from "@/lib/signInAccess";

describe("Sign-in consent", () => {
  it("allows Google sign-in without checking Terms & Conditions", () => {
    expect(canStartSignIn("google", false, false)).toBe(true);
    expect(canStartSignIn("google", true, false)).toBe(true);
  });
  it("keeps email sign-in dependent on consent", () => {
    expect(canStartSignIn("email", false, false)).toBe(false);
    expect(canStartSignIn("email", true, false)).toBe(true);
  });
});