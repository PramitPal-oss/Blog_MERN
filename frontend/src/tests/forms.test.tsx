import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PageHeading } from "../components/PageHeading";
import { StatCard } from "../components/StatCard";
import { PostCard } from "../components/PostCard";
import { UserAvatar } from "../components/UserAvatar";
import type { Post } from "../types/api";
import { vi } from "vitest";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    status: "anonymous",
    user: null,
  })),
}));

describe("Shared presentation components", () => {
  describe("PageHeading", () => {
    it("renders title, description, and action", () => {
      render(
        <PageHeading
          title="Stories"
          description="Read thoughtful essays"
          action={<button>New Story</button>}
        />
      );

      expect(screen.getByRole("heading", { level: 1, name: "Stories" })).toBeInTheDocument();
      expect(screen.getByText("Read thoughtful essays")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "New Story" })).toBeInTheDocument();
    });
  });

  describe("StatCard", () => {
    it("renders label, value, and description", () => {
      render(
        <StatCard
          title="Total Readers"
          value={1240}
          description="Active over past 30 days"
        />
      );

      expect(screen.getByText("Total Readers")).toBeInTheDocument();
      expect(screen.getByText("1240")).toBeInTheDocument();
      expect(screen.getByText("Active over past 30 days")).toBeInTheDocument();
    });
  });

  describe("PostCard", () => {
    const mockPost: Post = {
      id: "post-1",
      slug: "thoughtful-post",
      title: "Thoughtful Post Title",
      excerpt: "This is an excerpt preview of the thoughtful post.",
      content: "Full content of the post...",
      author: {
        id: "auth-1",
        name: "Arthur Conan",
      },
      deletedAt: null,
      createdAt: "2025-01-15T12:00:00.000Z",
      updatedAt: "2025-01-15T12:00:00.000Z",
    };

    it("renders post title, excerpt, and author information", () => {
      render(
        <MemoryRouter>
          <PostCard post={mockPost} />
        </MemoryRouter>
      );

      expect(screen.getByText("Thoughtful Post Title")).toBeInTheDocument();
      expect(
        screen.getByText("This is an excerpt preview of the thoughtful post.")
      ).toBeInTheDocument();
      expect(screen.getByText("Arthur Conan")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /read story/i })).toHaveAttribute(
        "href",
        "/posts/thoughtful-post"
      );
    });
  });

  describe("UserAvatar", () => {
    it("computes initials correctly", () => {
      const { rerender } = render(<UserAvatar name="Jane Doe" />);
      expect(screen.getByText("JD")).toBeInTheDocument();

      rerender(<UserAvatar name="Alice" />);
      expect(screen.getByText("AL")).toBeInTheDocument();

      rerender(<UserAvatar name={null} />);
      expect(screen.getByText("U")).toBeInTheDocument();
    });
  });
});
