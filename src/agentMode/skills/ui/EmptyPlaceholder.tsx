import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LayoutGrid } from "lucide-react";
import React from "react";

interface EmptyPlaceholderProps {
  folder: string;
}

export const EmptyPlaceholder: React.FC<EmptyPlaceholderProps> = ({ folder }) => {
  return (
    <div
      className={cn(
        "tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-2",
        "tw-min-h-[320px] tw-rounded-md tw-border tw-border-dashed tw-border-border",
        "tw-p-12 tw-text-faint"
      )}
    >
      <div
        className={cn(
          "tw-flex tw-items-center tw-justify-center",
          "tw-rounded-md tw-border tw-border-dashed tw-border-border tw-p-3"
        )}
      >
        <LayoutGrid className="tw-size-6 tw-text-faint" aria-hidden="true" />
      </div>
      <div className="tw-text-smaller tw-font-medium tw-text-muted">
        {t("No skills yet", "暂无技能")}
      </div>
      <div className="tw-max-w-[420px] tw-text-center tw-text-ui-smaller tw-text-faint">
        {t(
          "Skills you create or save into your shared folder show up here. Skills under",
          "在共享文件夹中创建或保存的技能会显示在这里。位于"
        )}{" "}
        <code>.claude/skills/</code>, <code>.agents/skills/</code>
        {t(", or", " 或")} <code>.opencode/skills/</code>
        {t(" show up here automatically too.", "中的技能也会自动显示在这里。")}
      </div>
      <div className="tw-mt-3.5 tw-font-mono tw-text-smallest tw-text-faint">
        {t("shared home · ", "共享目录 ·")}
        <code>&lt;vault&gt;/{folder}/</code>
      </div>
    </div>
  );
};
