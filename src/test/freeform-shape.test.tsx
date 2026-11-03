import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FreeformShape } from "@/components/editor/FreeformShape";

afterEach(cleanup);
describe("Freeform shape editing", () => {
  it("changes one curve while preserving the other seven", () => {
    const save = vi.fn();
    render(<FreeformShape value="60% 40% 30% 70% / 20% 80% 50% 50%" disabled={false} onChange={save}/>);
    fireEvent.keyDown(screen.getByRole("button", { name: "Top left horizontal curve" }), { key: "ArrowRight" });
    expect(save).toHaveBeenCalledWith("62% 40% 30% 70% / 20% 80% 50% 50%");
  });
  it("cannot mold a read-only block", () => {
    const save = vi.fn();
    render(<FreeformShape disabled onChange={save}/>);
    fireEvent.keyDown(screen.getByRole("button", { name: "Top left horizontal curve" }), { key: "ArrowRight" });
    expect(save).not.toHaveBeenCalled();
  });
});