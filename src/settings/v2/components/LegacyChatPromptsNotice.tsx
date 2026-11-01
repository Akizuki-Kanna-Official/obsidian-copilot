import { t } from "@/lib/i18n";
import { getEffectiveSystemPromptsFolder } from "@/settings/copilotFolder";
import { useSystemPrompts } from "@/system-prompts/state";
import React from "react";

export interface LegacyChatPromptsNoticeViewProps {
  promptCount: number;
  folderPath: string;
}

export const LegacyChatPromptsNoticeView: React.FC<LegacyChatPromptsNoticeViewProps> = ({
  promptCount,
  folderPath,
}) => {
  if (promptCount === 0) return null;

  return (
    <div className="tw-mb-3 tw-rounded-md tw-border tw-border-border tw-bg-secondary tw-px-3 tw-py-2 tw-text-ui-smaller tw-text-muted">
      {t("Agent Chat now reads your instructions from ", "智能体聊天现在从以下文件读取你的指令：")}
      <code>AGENTS.md</code>
      {t(". Your", "。你的")}{" "}
      {promptCount === 1
        ? t("saved system prompt is", "已保存的系统提示词")
        : t(`${promptCount} saved system prompts are`, `${promptCount} 个已保存的系统提示词`)}{" "}
      {t("still in ", "仍位于")}
      <code>{folderPath}</code>
      {t(
        " — open one there and paste anything you want the agent to keep following.",
        "，可打开原提示词，将希望智能体继续遵循的内容复制过去。"
      )}
    </div>
  );
};

export const LegacyChatPromptsNotice: React.FC = () => {
  const prompts = useSystemPrompts();
  return (
    <LegacyChatPromptsNoticeView
      promptCount={prompts.length}
      folderPath={getEffectiveSystemPromptsFolder()}
    />
  );
};
