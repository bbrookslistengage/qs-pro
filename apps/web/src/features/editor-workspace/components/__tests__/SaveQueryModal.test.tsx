import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Folder } from "@/features/editor-workspace/types";

import { SaveQueryModal } from "../SaveQueryModal";

function createMockFolders(): Folder[] {
  return [
    { id: "lib-1", name: "My Queries", parentId: null, type: "library" },
    { id: "lib-2", name: "Shared Queries", parentId: null, type: "library" },
    { id: "de-1", name: "Data Extensions", parentId: null, type: "data-extension" },
    { id: "de-2", name: "Contact Data", parentId: null, type: "data-extension" },
  ];
}

describe("SaveQueryModal", () => {
  const defaultProps = {
    isOpen: true,
    folders: createMockFolders(),
    onClose: vi.fn(),
    onSave: vi.fn(),
  };

  it("SaveQueryModal_EmptyName_DisablesSaveButton", () => {
    // Arrange
    render(<SaveQueryModal {...defaultProps} initialName="" />);

    // Assert
    const saveButton = screen.getByRole("button", { name: /save to workspace/i });
    expect(saveButton).toBeDisabled();
  });

  it("SaveQueryModal_WhitespaceOnlyName_DisablesSaveButton", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SaveQueryModal {...defaultProps} initialName="" />);
    const nameInput = screen.getByLabelText(/query name/i);

    // Act
    await user.type(nameInput, "   ");

    // Assert
    const saveButton = screen.getByRole("button", { name: /save to workspace/i });
    expect(saveButton).toBeDisabled();
  });

  it("SaveQueryModal_FolderDropdown_OnlyShowsLibraryFolders", () => {
    // Arrange
    render(<SaveQueryModal {...defaultProps} />);

    // Assert
    const folderSelect = screen.getByLabelText(/target folder/i);
    const options = folderSelect.querySelectorAll("option");

    expect(options).toHaveLength(2);
    expect(screen.getByRole("option", { name: "My Queries" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Shared Queries" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Data Extensions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Contact Data" })).not.toBeInTheDocument();
  });

  it("SaveQueryModal_OnSave_CallsWithTrimmedNameAndFolderId", async () => {
    // Arrange
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <SaveQueryModal
        {...defaultProps}
        onSave={onSave}
        initialName=""
      />,
    );
    const nameInput = screen.getByLabelText(/query name/i);
    const folderSelect = screen.getByLabelText(/target folder/i);

    // Act
    await user.type(nameInput, "  My Test Query  ");
    await user.selectOptions(folderSelect, "lib-2");
    await user.click(screen.getByRole("button", { name: /save to workspace/i }));

    // Assert
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("My Test Query", "lib-2");
  });
});
