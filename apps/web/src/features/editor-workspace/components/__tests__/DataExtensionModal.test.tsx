import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DataExtensionModal } from "../DataExtensionModal";

describe("DataExtensionModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
  };

  describe("field list management", () => {
    it("DataExtensionModal_NoFields_DisplaysEmptyState", () => {
      // Arrange
      render(<DataExtensionModal {...defaultProps} />);

      // Assert
      expect(screen.getByText(/no fields added yet/i)).toBeInTheDocument();
    });

    it("DataExtensionModal_AddFieldClicked_AddsNewFieldRow", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<DataExtensionModal {...defaultProps} />);

      // Act
      await user.click(screen.getByRole("button", { name: /add field/i }));

      // Assert
      expect(screen.getByPlaceholderText("Field name")).toBeInTheDocument();
      expect(
        screen.queryByText(/no fields added yet/i),
      ).not.toBeInTheDocument();
    });

    it("DataExtensionModal_RemoveFieldClicked_RemovesFieldRow", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<DataExtensionModal {...defaultProps} />);

      // Act - Add a field first
      await user.click(screen.getByRole("button", { name: /add field/i }));
      expect(screen.getByPlaceholderText("Field name")).toBeInTheDocument();

      // Act - Remove the field
      await user.click(screen.getByRole("button", { name: /remove field/i }));

      // Assert
      expect(
        screen.queryByPlaceholderText("Field name"),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/no fields added yet/i)).toBeInTheDocument();
    });

    it("DataExtensionModal_FieldNameEdited_UpdatesFieldName", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<DataExtensionModal {...defaultProps} />);

      // Act
      await user.click(screen.getByRole("button", { name: /add field/i }));
      const fieldNameInput = screen.getByPlaceholderText("Field name");
      await user.type(fieldNameInput, "SubscriberKey");

      // Assert
      expect(fieldNameInput).toHaveValue("SubscriberKey");
    });

    it("DataExtensionModal_FieldTypeChanged_UpdatesFieldType", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<DataExtensionModal {...defaultProps} />);

      // Act
      await user.click(screen.getByRole("button", { name: /add field/i }));
      const fieldTypeSelect = screen.getByRole("combobox");
      await user.selectOptions(fieldTypeSelect, "Number");

      // Assert
      expect(fieldTypeSelect).toHaveValue("Number");
    });
  });

  describe("form validation", () => {
    it("DataExtensionModal_EmptyName_DisablesSaveButton", () => {
      // Arrange
      render(<DataExtensionModal {...defaultProps} />);

      // Assert
      const saveButton = screen.getByRole("button", {
        name: /create data extension/i,
      });
      expect(saveButton).toBeDisabled();
    });

    it("DataExtensionModal_EmptyCustomerKey_DisablesSaveButton", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<DataExtensionModal {...defaultProps} />);
      const nameInput = screen.getByLabelText(/^name$/i);

      // Act - Fill only name, leave customer key empty
      await user.type(nameInput, "My Data Extension");

      // Assert
      const saveButton = screen.getByRole("button", {
        name: /create data extension/i,
      });
      expect(saveButton).toBeDisabled();
    });

    it("DataExtensionModal_ValidNameAndCustomerKey_EnablesSaveButton", async () => {
      // Arrange
      const user = userEvent.setup();
      render(<DataExtensionModal {...defaultProps} />);
      const nameInput = screen.getByLabelText(/^name$/i);
      const customerKeyInput = screen.getByLabelText(/customer key/i);

      // Act
      await user.type(nameInput, "My Data Extension");
      await user.type(customerKeyInput, "my_de_key");

      // Assert
      const saveButton = screen.getByRole("button", {
        name: /create data extension/i,
      });
      expect(saveButton).toBeEnabled();
    });
  });

  describe("save callback", () => {
    it("DataExtensionModal_OnSave_CallsWithCorrectDataStructure", async () => {
      // Arrange
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<DataExtensionModal {...defaultProps} onSave={onSave} />);

      const nameInput = screen.getByLabelText(/^name$/i);
      const customerKeyInput = screen.getByLabelText(/customer key/i);

      // Act - Fill form
      await user.type(nameInput, "  Test DE  ");
      await user.type(customerKeyInput, "  test_key  ");

      // Act - Add a field
      await user.click(screen.getByRole("button", { name: /add field/i }));
      const fieldNameInput = screen.getByPlaceholderText("Field name");
      await user.type(fieldNameInput, "EmailAddress");
      const fieldTypeSelect = screen.getByRole("combobox");
      await user.selectOptions(fieldTypeSelect, "Email");

      // Act - Save
      await user.click(
        screen.getByRole("button", { name: /create data extension/i }),
      );

      // Assert
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test DE",
          customerKey: "test_key",
          fields: expect.arrayContaining([
            expect.objectContaining({
              name: "EmailAddress",
              type: "Email",
            }),
          ]),
        }),
      );
    });
  });
});
