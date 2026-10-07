import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import { EditCommentDialog } from "../components/EditCommentDialog";

describe("Dialog components", () => {
  describe("ConfirmActionDialog", () => {
    it("renders title, description, and triggers onConfirm", async () => {
      const onConfirm = vi.fn();
      const onOpenChange = vi.fn();
      const user = userEvent.setup();

      render(
        <ConfirmActionDialog
          open={true}
          onOpenChange={onOpenChange}
          title="Delete story?"
          description="It will be hidden from readers."
          confirmLabel="Delete"
          onConfirm={onConfirm}
        />
      );

      expect(screen.getByText("Delete story?")).toBeInTheDocument();
      expect(screen.getByText("It will be hidden from readers.")).toBeInTheDocument();

      const confirmBtn = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmBtn);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("displays error message and disables buttons when loading", () => {
      render(
        <ConfirmActionDialog
          open={true}
          onOpenChange={vi.fn()}
          title="Delete story?"
          description="Warning"
          confirmLabel="Delete"
          isLoading={true}
          error="Network error occurred"
          onConfirm={vi.fn()}
        />
      );

      expect(screen.getByText("Network error occurred")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    });

    it("invokes onOpenChange(false) when cancelled", async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();

      render(
        <ConfirmActionDialog
          open={true}
          onOpenChange={onOpenChange}
          title="Deactivate account?"
          description="Warning message"
          onConfirm={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("EditCommentDialog", () => {
    it("renders initial content and allows updating", async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onOpenChange = vi.fn();
      const user = userEvent.setup();

      render(
        <EditCommentDialog
          open={true}
          onOpenChange={onOpenChange}
          initialContent="Original thought"
          onSave={onSave}
        />
      );

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("Original thought");

      await user.clear(textarea);
      await user.type(textarea, "Refined insight");

      await user.click(screen.getByRole("button", { name: "Save changes" }));

      expect(onSave).toHaveBeenCalledWith("Refined insight");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("shows error when onSave throws", async () => {
      const onSave = vi.fn().mockRejectedValue(new Error("Save failed"));
      const user = userEvent.setup();

      render(
        <EditCommentDialog
          open={true}
          onOpenChange={vi.fn()}
          initialContent="Comment text"
          onSave={onSave}
        />
      );

      await user.click(screen.getByRole("button", { name: "Save changes" }));
      expect(await screen.findByText("Save failed")).toBeInTheDocument();
    });
  });
});
