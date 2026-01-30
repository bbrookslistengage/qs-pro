import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTabsStore } from "@/store/tabs-store";

import { QueryTabBar } from "./QueryTabBar";

describe("QueryTabBar", () => {
  beforeEach(() => {
    useTabsStore.getState().reset();
  });

  describe("empty state", () => {
    it("renders empty state when no tabs open", () => {
      render(<QueryTabBar />);

      expect(screen.getByText("No open queries.")).toBeInTheDocument();
      expect(screen.getByText("Create new query")).toBeInTheDocument();
    });

    it("creates new tab when clicking 'Create new query' in empty state", async () => {
      const user = userEvent.setup();
      render(<QueryTabBar />);

      await user.click(screen.getByText("Create new query"));

      expect(useTabsStore.getState().tabs).toHaveLength(1);
      expect(useTabsStore.getState().tabs[0]?.name).toBe("Untitled-1");
    });

    it("creates new tab when clicking header add button in empty state", async () => {
      const user = userEvent.setup();
      render(<QueryTabBar />);

      await user.click(screen.getByTitle("New Query"));

      expect(useTabsStore.getState().tabs).toHaveLength(1);
    });
  });

  describe("tab rendering", () => {
    it("renders open tabs with their names", () => {
      useTabsStore.getState().createNewTab();
      useTabsStore.getState().openQuery("q1", "My Query", "SELECT 1");

      render(<QueryTabBar />);

      expect(screen.getByText("Untitled-1")).toBeInTheDocument();
      expect(screen.getByText("My Query")).toBeInTheDocument();
    });

    it("displays header with 'Open Tabs' title", () => {
      useTabsStore.getState().createNewTab();

      render(<QueryTabBar />);

      expect(screen.getByText("Open Tabs")).toBeInTheDocument();
    });
  });

  describe("active tab highlighting", () => {
    it("highlights active tab with border-primary class", () => {
      useTabsStore.getState().createNewTab();
      useTabsStore.getState().createNewTab();

      render(<QueryTabBar />);

      const activeTab = screen
        .getByText("Untitled-2")
        .closest("[role='button']");
      expect(activeTab).toHaveClass("border-primary");
    });

    it("switches active tab on click", async () => {
      const user = userEvent.setup();
      useTabsStore.getState().createNewTab();
      useTabsStore.getState().createNewTab();

      render(<QueryTabBar />);

      await user.click(screen.getByText("Untitled-1"));

      expect(useTabsStore.getState().activeTabId).toBe("untitled-1");
    });

    it("switches active tab on keyboard Enter", async () => {
      const user = userEvent.setup();
      useTabsStore.getState().createNewTab();
      useTabsStore.getState().createNewTab();
      useTabsStore.getState().setActiveTab("untitled-2");

      render(<QueryTabBar />);

      const tab1 = screen.getByText("Untitled-1").closest("[role='button']");
      tab1?.focus();
      await user.keyboard("{Enter}");

      expect(useTabsStore.getState().activeTabId).toBe("untitled-1");
    });
  });

  describe("dirty indicator", () => {
    it("shows dirty indicator for modified tabs", () => {
      useTabsStore.getState().createNewTab();
      useTabsStore.getState().updateTabContent("untitled-1", "SELECT 1");

      render(<QueryTabBar />);

      expect(screen.getByTestId("dirty-indicator")).toBeInTheDocument();
    });

    it("does not show dirty indicator for clean tabs", () => {
      useTabsStore.getState().openQuery("q1", "Clean Query", "SELECT 1");

      render(<QueryTabBar />);

      expect(screen.queryByTestId("dirty-indicator")).not.toBeInTheDocument();
    });
  });

  describe("close button", () => {
    it("closes tab when close button clicked", async () => {
      const user = userEvent.setup();
      useTabsStore.getState().createNewTab();
      useTabsStore.getState().createNewTab();

      render(<QueryTabBar />);

      const closeBtn = screen.getByLabelText("Close Untitled-1");
      await user.click(closeBtn);

      expect(useTabsStore.getState().tabs).toHaveLength(1);
      expect(screen.queryByText("Untitled-1")).not.toBeInTheDocument();
    });

    it("calls onCloseWithConfirm for dirty tabs instead of closing", async () => {
      const user = userEvent.setup();
      const onCloseWithConfirm = vi.fn();

      useTabsStore.getState().createNewTab();
      useTabsStore.getState().updateTabContent("untitled-1", "unsaved changes");

      render(<QueryTabBar onCloseWithConfirm={onCloseWithConfirm} />);

      const closeBtn = screen.getByLabelText("Close Untitled-1");
      await user.click(closeBtn);

      expect(onCloseWithConfirm).toHaveBeenCalledWith("untitled-1");
      expect(useTabsStore.getState().tabs).toHaveLength(1);
    });

    it("closes clean tab directly without confirmation", async () => {
      const user = userEvent.setup();
      const onCloseWithConfirm = vi.fn();

      useTabsStore.getState().openQuery("q1", "Clean Query", "SELECT 1");

      render(<QueryTabBar onCloseWithConfirm={onCloseWithConfirm} />);

      const closeBtn = screen.getByLabelText("Close Clean Query");
      await user.click(closeBtn);

      expect(onCloseWithConfirm).not.toHaveBeenCalled();
      expect(useTabsStore.getState().tabs).toHaveLength(0);
    });
  });

  describe("context menu", () => {
    it("shows context menu on right-click", async () => {
      useTabsStore.getState().createNewTab();

      render(<QueryTabBar />);

      fireEvent.contextMenu(screen.getByText("Untitled-1"));

      await waitFor(() => {
        expect(screen.getByText("Rename")).toBeInTheDocument();
        expect(screen.getByText("Close")).toBeInTheDocument();
        expect(screen.getByText("Close Others")).toBeInTheDocument();
      });
    });

    it("shows Save option for dirty tabs in context menu", async () => {
      useTabsStore.getState().createNewTab();
      useTabsStore.getState().updateTabContent("untitled-1", "changes");

      render(<QueryTabBar onSaveTab={vi.fn()} />);

      fireEvent.contextMenu(screen.getByText("Untitled-1"));

      await waitFor(() => {
        expect(screen.getByText("Save")).toBeInTheDocument();
      });
    });

    it("does not show Save option for clean tabs", async () => {
      useTabsStore.getState().openQuery("q1", "Clean Query", "SELECT 1");

      render(<QueryTabBar onSaveTab={vi.fn()} />);

      fireEvent.contextMenu(screen.getByText("Clean Query"));

      await waitFor(() => {
        expect(screen.getByText("Rename")).toBeInTheDocument();
      });
      expect(screen.queryByText("Save")).not.toBeInTheDocument();
    });

    it("calls onSaveTab when Save clicked in context menu", async () => {
      const user = userEvent.setup();
      const onSaveTab = vi.fn();

      useTabsStore.getState().createNewTab();
      useTabsStore.getState().updateTabContent("untitled-1", "changes");

      render(<QueryTabBar onSaveTab={onSaveTab} />);

      fireEvent.contextMenu(screen.getByText("Untitled-1"));

      await waitFor(() => expect(screen.getByText("Save")).toBeInTheDocument());
      await user.click(screen.getByText("Save"));

      expect(onSaveTab).toHaveBeenCalledWith("untitled-1");
    });

    it("closes tab via context menu Close option", async () => {
      const user = userEvent.setup();
      useTabsStore.getState().createNewTab();
      useTabsStore.getState().createNewTab();

      render(<QueryTabBar />);

      fireEvent.contextMenu(screen.getByText("Untitled-1"));

      await waitFor(() =>
        expect(screen.getByText("Close")).toBeInTheDocument(),
      );
      await user.click(screen.getByText("Close"));

      expect(useTabsStore.getState().tabs).toHaveLength(1);
    });

    it("closes other tabs via context menu Close Others option", async () => {
      const user = userEvent.setup();
      useTabsStore.getState().createNewTab();
      useTabsStore.getState().createNewTab();
      useTabsStore.getState().openQuery("q1", "Query", "SELECT 1");

      render(<QueryTabBar />);

      fireEvent.contextMenu(screen.getByText("Untitled-2"));

      await waitFor(() =>
        expect(screen.getByText("Close Others")).toBeInTheDocument(),
      );
      await user.click(screen.getByText("Close Others"));

      expect(useTabsStore.getState().tabs).toHaveLength(1);
      expect(useTabsStore.getState().tabs[0]?.name).toBe("Untitled-2");
    });
  });

  describe("drag and drop", () => {
    it("renders tabs in sortable context", () => {
      useTabsStore.getState().createNewTab();
      useTabsStore.getState().createNewTab();

      render(<QueryTabBar />);

      expect(screen.getByText("Untitled-1")).toBeInTheDocument();
      expect(screen.getByText("Untitled-2")).toBeInTheDocument();
    });

    it("tabs have role button for accessibility", () => {
      useTabsStore.getState().createNewTab();

      render(<QueryTabBar />);

      const tab = screen.getByText("Untitled-1").closest("[role='button']");
      expect(tab).toBeInTheDocument();
      expect(tab).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("new tab button", () => {
    it("creates new tab when header add button clicked", async () => {
      const user = userEvent.setup();
      useTabsStore.getState().createNewTab();

      render(<QueryTabBar />);

      await user.click(screen.getByTitle("New Query"));

      expect(useTabsStore.getState().tabs).toHaveLength(2);
      expect(useTabsStore.getState().tabs[1]?.name).toBe("Untitled-2");
    });
  });

  describe("inline rename", () => {
    it("enables inline rename on double-click", async () => {
      const user = userEvent.setup();
      useTabsStore.getState().createNewTab();

      render(<QueryTabBar />);

      const tab = screen.getByText("Untitled-1").closest("[role='button']");
      if (!tab) {
        throw new Error("Tab not found");
      }
      await user.dblClick(tab);

      await waitFor(() => {
        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("Untitled-1");
      });
    });

    it("saves new name on Enter", async () => {
      const user = userEvent.setup();
      useTabsStore.getState().createNewTab();

      render(<QueryTabBar />);

      const tab = screen.getByText("Untitled-1").closest("[role='button']");
      if (!tab) {
        throw new Error("Tab not found");
      }
      await user.dblClick(tab);

      await waitFor(() => {
        expect(screen.getByRole("textbox")).toBeInTheDocument();
      });

      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "New Name{Enter}");

      expect(useTabsStore.getState().tabs[0]?.name).toBe("New Name");
    });

    it("cancels rename on Escape", async () => {
      const user = userEvent.setup();
      useTabsStore.getState().createNewTab();

      render(<QueryTabBar />);

      const tab = screen.getByText("Untitled-1").closest("[role='button']");
      if (!tab) {
        throw new Error("Tab not found");
      }
      await user.dblClick(tab);

      await waitFor(() => {
        expect(screen.getByRole("textbox")).toBeInTheDocument();
      });

      const input = screen.getByRole("textbox");
      await user.type(input, "Changed{Escape}");

      expect(useTabsStore.getState().tabs[0]?.name).toBe("Untitled-1");
    });

    it("starts rename via context menu", async () => {
      const user = userEvent.setup();
      useTabsStore.getState().createNewTab();

      render(<QueryTabBar />);

      fireEvent.contextMenu(screen.getByText("Untitled-1"));

      await waitFor(() =>
        expect(screen.getByText("Rename")).toBeInTheDocument(),
      );
      await user.click(screen.getByText("Rename"));

      await waitFor(() => {
        expect(screen.getByRole("textbox")).toBeInTheDocument();
      });
    });
  });
});
