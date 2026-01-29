import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PremiumBadge } from "../ui/premium-badge";

describe("PremiumBadge", () => {
  describe("popover visibility", () => {
    it("shows popover when badge is clicked", async () => {
      const user = userEvent.setup();
      render(
        <PremiumBadge title="Test Feature" description="Test description" />,
      );

      const badge = screen.getByRole("button", { name: /pro feature/i });
      await user.click(badge);

      expect(screen.getByText("Test Feature")).toBeInTheDocument();
    });

    it("hides popover when badge is clicked again", async () => {
      const user = userEvent.setup();
      render(
        <PremiumBadge title="Test Feature" description="Test description" />,
      );

      const badge = screen.getByRole("button", { name: /pro feature/i });
      await user.click(badge);
      expect(screen.getByText("Test Feature")).toBeInTheDocument();

      await user.click(badge);
      await waitFor(() => {
        expect(screen.queryByText("Test Feature")).not.toBeInTheDocument();
      });
    });
  });

  describe("title and description rendering", () => {
    it("displays feature title in popover", async () => {
      const user = userEvent.setup();
      render(
        <PremiumBadge
          title="Advanced Autocomplete"
          description="Some description"
        />,
      );

      await user.click(screen.getByRole("button", { name: /pro feature/i }));

      expect(screen.getByText("Advanced Autocomplete")).toBeInTheDocument();
    });

    it("displays feature description in popover", async () => {
      const user = userEvent.setup();
      render(
        <PremiumBadge
          title="Test Feature"
          description="Get intelligent code suggestions"
        />,
      );

      await user.click(screen.getByRole("button", { name: /pro feature/i }));

      expect(
        screen.getByText("Get intelligent code suggestions"),
      ).toBeInTheDocument();
    });
  });

  describe("CTA click handling", () => {
    it("calls onCtaClick callback when CTA clicked", async () => {
      const user = userEvent.setup();
      const mockOnCtaClick = vi.fn();
      render(
        <PremiumBadge
          title="Test Feature"
          description="Test description"
          onCtaClick={mockOnCtaClick}
        />,
      );

      await user.click(screen.getByRole("button", { name: /pro feature/i }));
      await user.click(screen.getByRole("button", { name: /upgrade now/i }));

      expect(mockOnCtaClick).toHaveBeenCalledTimes(1);
    });

    it("does not render CTA button when onCtaClick is not provided", async () => {
      const user = userEvent.setup();
      render(
        <PremiumBadge title="Test Feature" description="Test description" />,
      );

      await user.click(screen.getByRole("button", { name: /pro feature/i }));

      expect(
        screen.queryByRole("button", { name: /upgrade now/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("size variants", () => {
    it("renders small variant with correct sizing", () => {
      render(
        <PremiumBadge size="sm" title="Test" description="Test description" />,
      );

      const badge = screen.getByRole("button", { name: /pro feature/i });
      expect(badge).toHaveClass("h-4", "w-4");
    });

    it("renders medium variant with correct sizing", () => {
      render(
        <PremiumBadge size="md" title="Test" description="Test description" />,
      );

      const badge = screen.getByRole("button", { name: /pro feature/i });
      expect(badge).toHaveClass("h-5", "w-5");
    });

    it("renders large variant with text label", () => {
      render(
        <PremiumBadge
          size="lg"
          tier="pro"
          title="Test"
          description="Test description"
        />,
      );

      expect(screen.getByText("Pro")).toBeInTheDocument();
    });
  });
});
