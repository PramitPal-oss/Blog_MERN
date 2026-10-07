import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SafeText } from "../components/SafeText";
import { Pagination } from "../components/Pagination";

describe("shared UI", () => {
  it("renders supplied markup as inert text", () => {
    render(<SafeText>{"<script>alert('unsafe')</script>"}</SafeText>);
    expect(screen.getByText("<script>alert('unsafe')</script>")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });
  it("emits the requested page and disables unavailable directions", async () => {
    const onPage = vi.fn(); const user = userEvent.setup();
    render(<Pagination meta={{ page: 1, limit: 10, total: 21, totalPages: 3 }} onPage={onPage} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPage).toHaveBeenCalledWith(2);
  });
});
