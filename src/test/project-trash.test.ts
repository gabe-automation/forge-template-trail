import { describe, expect, it } from "vitest";
import { canManageProject, inProjectSection } from "@/lib/projectTrash";
describe("Project trash", () => {
  it("only owners on editing devices can remove or restore projects", () => {
    expect(canManageProject("owner", false)).toBe(true);
    expect(canManageProject("editor", false)).toBe(false);
    expect(canManageProject("viewer", false)).toBe(false);
    expect(canManageProject("owner", true)).toBe(false);
  });
  it("keeps removed projects in Trash and active projects in Projects", () => {
    expect(inProjectSection("2026-11-04T00:00:00Z", "Projects")).toBe(false);
    expect(inProjectSection("2026-11-04T00:00:00Z", "Trash")).toBe(true);
    expect(inProjectSection(null, "Trash")).toBe(false);
    expect(inProjectSection(null, "Projects")).toBe(true);
  });
});