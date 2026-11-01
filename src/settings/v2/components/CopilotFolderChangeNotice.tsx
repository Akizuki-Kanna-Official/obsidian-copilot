import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AlertTriangle, FolderSync } from "lucide-react";
import React from "react";

export interface CopilotFolderChangeNoticeProps {
  oldRoot: string;
  newRoot: string;
  containsMarkdown: boolean;
}

export const CopilotFolderChangeNotice: React.FC<CopilotFolderChangeNoticeProps> = ({
  oldRoot,
  newRoot,
  containsMarkdown,
}) => {
  return (
    <div className={cn("tw-flex tw-flex-col tw-gap-4")}>
      <div className={cn("tw-flex tw-items-center tw-gap-3 tw-text-normal")}>
        <FolderSync className={cn("tw-size-6 tw-shrink-0 tw-text-accent")} aria-hidden="true" />
        <h2 className={cn("tw-m-0 tw-text-xl tw-font-bold")}>
          {t("Change Copilot folder", "更改 Copilot 文件夹")}
        </h2>
      </div>
      <p className={cn("tw-m-0 tw-text-muted")}>
        {t("Copilot will keep new chats and data under ", "Copilot 将把新对话和数据保存到")}
        <code>{newRoot}/</code>
        {t(
          ". Your files aren't moved — your old data stays in ",
          "。现有文件不会被移动，原数据仍保留在"
        )}
        <strong className={cn("tw-text-normal")}>{oldRoot}/</strong>
        {t(
          ", which stays permanently excluded from Copilot search. Move it over if you want; Obsidian updates the links.",
          "，此位置会永久排除在 Copilot 搜索之外。你可以自行移动数据，Obsidian 会更新相关链接。"
        )}
      </p>
      {containsMarkdown && (
        <div
          className={cn(
            "tw-flex tw-items-start tw-gap-2 tw-rounded-lg tw-border tw-border-solid tw-border-warning/40",
            "tw-bg-secondary tw-px-3 tw-py-2.5 tw-text-xs tw-text-normal"
          )}
          role="alert"
        >
          <AlertTriangle
            className={cn("tw-mt-0.5 tw-size-4 tw-shrink-0 tw-text-warning")}
            aria-hidden="true"
          />
          <span>
            <strong>
              {t(
                "This folder already contains Markdown files.",
                "此文件夹中已存在 Markdown 文件。"
              )}
            </strong>
            {t(
              " If you continue, every Markdown file under ",
              "如果继续，以下位置中的所有 Markdown 文件"
            )}
            <code>{newRoot}/</code>
            {t(
              " — including regular notes — will be excluded from Copilot search. The folder stays excluded even if you change the Copilot folder later.",
              "（包括普通笔记）都将被排除在 Copilot 搜索之外。即使之后更改 Copilot 文件夹，此文件夹仍会被排除。"
            )}
          </span>
        </div>
      )}
    </div>
  );
};
