import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DataExtension } from "@/features/editor-workspace/types";

import { QueryActivityModal } from "../QueryActivityModal";

function createMockDataExtensions(): DataExtension[] {
  return [
    {
      id: "de-1",
      name: "Subscribers",
      customerKey: "subscribers_key",
      folderId: "f1",
      description: "Subscriber data",
      fields: [],
    },
    {
      id: "de-2",
      name: "Products",
      customerKey: "products_key",
      folderId: "f1",
      description: "Product catalog",
      fields: [],
    },
    {
      id: "de-3",
      name: "Orders",
      customerKey: "orders_key",
      folderId: "f1",
      description: "Order history",
      fields: [],
    },
  ];
}

describe("QueryActivityModal", () => {
  const defaultProps = {
    isOpen: true,
    dataExtensions: createMockDataExtensions(),
    onClose: vi.fn(),
    onCreate: vi.fn(),
  };

  describe("search filtering", () => {
    it("QueryActivityModal_SearchWithTerm_FiltersActivityList", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<QueryActivityModal {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText(
        /search by name or customer key/i,
      );

      // Act
      await user.click(searchInput);
      await user.type(searchInput, "Sub");

      // Assert - Only "Subscribers" should be visible in dropdown
      expect(screen.getByText("Subscribers")).toBeInTheDocument();
      expect(screen.queryByText("Products")).not.toBeInTheDocument();
      expect(screen.queryByText("Orders")).not.toBeInTheDocument();
    });

    it("QueryActivityModal_SearchCleared_ShowsAllItemsOnFocus", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<QueryActivityModal {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText(
        /search by name or customer key/i,
      );

      // Act - Type then clear
      await user.click(searchInput);
      await user.type(searchInput, "Sub");
      await user.clear(searchInput);

      // Assert - All items should be visible when search is empty and focused
      expect(screen.getByText("Subscribers")).toBeInTheDocument();
      expect(screen.getByText("Products")).toBeInTheDocument();
      expect(screen.getByText("Orders")).toBeInTheDocument();
    });

    it("QueryActivityModal_NoMatchingSearch_ShowsNoResultsMessage", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<QueryActivityModal {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText(
        /search by name or customer key/i,
      );

      // Act
      await user.click(searchInput);
      await user.type(searchInput, "xyz123nonexistent");

      // Assert
      expect(
        screen.getByText(/no matching data extensions found/i),
      ).toBeInTheDocument();
    });
  });

  describe("target selection", () => {
    it("QueryActivityModal_TargetClicked_SelectsTarget", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<QueryActivityModal {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText(
        /search by name or customer key/i,
      );

      // Act - Focus search to show dropdown, then click a target
      await user.click(searchInput);
      await user.click(screen.getByRole("button", { name: /subscribers/i }));

      // Assert - Selected target card should be visible
      // The search input should be replaced with the selected target display
      expect(
        screen.queryByPlaceholderText(/search by name or customer key/i),
      ).not.toBeInTheDocument();
      // The selected target name should be visible in the selection card
      expect(screen.getByText("Subscribers")).toBeInTheDocument();
      expect(screen.getByText("subscribers_key")).toBeInTheDocument();
    });

    it("QueryActivityModal_TargetSelected_DisplaysSelectedTargetCard", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<QueryActivityModal {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText(
        /search by name or customer key/i,
      );

      // Act - Select a target
      await user.click(searchInput);
      await user.click(screen.getByRole("button", { name: /products/i }));

      // Assert - Verify the selected target card structure
      expect(screen.getByText("Products")).toBeInTheDocument();
      expect(screen.getByText("products_key")).toBeInTheDocument();
      // A clear/remove button should be available to deselect
      const clearButtons = screen.getAllByRole("button");
      const closeButton = clearButtons.find(
        (btn) =>
          btn.querySelector("svg") && !btn.textContent?.includes("Deploy"),
      );
      expect(closeButton).toBeDefined();
    });
  });

  describe("form validation and submit", () => {
    it("QueryActivityModal_NoTargetSelected_DisablesDeployButton", () => {
      // Arrange
      render(<QueryActivityModal {...defaultProps} />);

      // Assert - Deploy button should be disabled when no target is selected
      const deployButton = screen.getByRole("button", {
        name: /deploy activity/i,
      });
      expect(deployButton).toBeDisabled();
    });

    it("QueryActivityModal_TargetSelectedAndNameFilled_CallsOnCreateWithCorrectData", async () => {
      // Arrange
      const user = userEvent.setup();
      const onCreate = vi.fn();
      render(<QueryActivityModal {...defaultProps} onCreate={onCreate} />);

      // Act - Fill activity name
      const activityNameInput = screen.getByLabelText(/activity name/i);
      await user.type(activityNameInput, "My Query Activity");

      // Act - Select target
      const searchInput = screen.getByPlaceholderText(
        /search by name or customer key/i,
      );
      await user.click(searchInput);
      await user.click(screen.getByRole("button", { name: /subscribers/i }));

      // Act - Click deploy
      const deployButton = screen.getByRole("button", {
        name: /deploy activity/i,
      });
      await user.click(deployButton);

      // Assert
      expect(onCreate).toHaveBeenCalledTimes(1);
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My Query Activity",
          targetDataExtensionId: "de-1",
          dataAction: "Overwrite",
        }),
      );
    });
  });
});
