import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { InstructionsTextarea } from "@/instructions/InstructionsTextarea";
import { ArrowUpRight } from "lucide-react";
import React from "react";

export interface VaultInstructionsSettingProps {
  value: string;
  onChange: (next: string) => void;
  onOpen: () => void;
}

export const VaultInstructionsSetting: React.FC<VaultInstructionsSettingProps> = ({
  value,
  onChange,
  onOpen,
}) => (
  <div className="tw-flex tw-w-full tw-flex-col tw-gap-4 tw-py-4">
    <div className="tw-grid tw-w-full tw-grid-cols-[minmax(0,1fr)_auto] tw-items-center tw-gap-4">
      <div className="tw-space-y-1.5">
        <div className="tw-text-sm tw-font-medium tw-leading-none">
          {t("Custom vault instructions", "仓库自定义指令")}
        </div>
        <div className="tw-text-xs tw-text-muted">
          {t(
            "Your custom instructions for the agent to follow for every vault interaction. Saved to AGENTS.md in your vault root, which you can also edit as a note.",
            "智能体每次与此仓库交互时遵循的自定义指令。保存在仓库根目录的 AGENTS.md 中，也可作为笔记直接编辑。"
          )}
        </div>
      </div>
      <Button variant="secondary" onClick={onOpen}>
        <ArrowUpRight className="tw-size-4" />
        {t("Open AGENTS.md", "打开 AGENTS.md")}
      </Button>
    </div>
    <InstructionsTextarea
      label={t("Custom vault instructions", "仓库自定义指令")}
      value={value}
      onChange={onChange}
    />
  </div>
);
