import * as obsidian from "obsidian";
import {
  CopilotFolderChangeNotice,
  type CopilotFolderChangeNoticeProps,
} from "@/settings/v2/components/CopilotFolderChangeNotice";
import { render, screen } from "@testing-library/react";
import React from "react";

const DEFAULT_PROPS: CopilotFolderChangeNoticeProps = {
  oldRoot: "copilot",
  newRoot: "90 System/copilot",
  containsMarkdown: false,
};

describe("CopilotFolderChangeNotice", () => {
  describe("CopilotFolderChangeNotice()", () => {
    it("shows the Chinese exclusion warning while preserving both folder paths", () => {
      const language = jest.spyOn(obsidian, "getLanguage").mockReturnValue("zh");
      try {
        render(<CopilotFolderChangeNotice {...DEFAULT_PROPS} containsMarkdown />);
        expect(screen.getByText("更改 Copilot 文件夹")).not.toBeNull();
        expect(screen.getByRole("alert").textContent).toContain("包括普通笔记");
        expect(screen.getByRole("alert").textContent).toContain("90 System/copilot/");
        expect(screen.getByText("copilot/", { selector: "strong" })).not.toBeNull();
      } finally {
        language.mockRestore();
      }
    });

    it("explains where new and existing Copilot data will remain", () => {
      render(<CopilotFolderChangeNotice {...DEFAULT_PROPS} />);

      expect(screen.getByText("90 System/copilot/", { selector: "code" })).not.toBeNull();
      expect(screen.getByText("copilot/", { selector: "strong" })).not.toBeNull();
      expect(screen.getByText(/stays permanently excluded from Copilot search/)).not.toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("warns that every Markdown file in a non-empty folder will stay excluded", () => {
      render(<CopilotFolderChangeNotice {...DEFAULT_PROPS} containsMarkdown />);

      const warning = screen.getByRole("alert");
      expect(warning.textContent).toContain("This folder already contains Markdown files.");
      expect(warning.textContent).toContain("including regular notes");
      expect(warning.textContent).toContain("excluded from Copilot search");
      expect(warning.textContent).toContain("stays excluded even if you change");
    });
  });
});
