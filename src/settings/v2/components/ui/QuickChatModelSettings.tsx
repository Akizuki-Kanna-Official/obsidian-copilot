import { t } from "@/lib/i18n";
import { SettingItem } from "@/components/ui/setting-item";
import { SettingSection } from "@/components/ui/setting-section";
import React from "react";

interface ModelOption {
  label: string;
  value: string;
}

export interface QuickChatModelSettingsProps {
  defaultModelId: string | undefined;
  options: ModelOption[];
  onDefaultModelChange: (modelId: string) => void;
  children: React.ReactNode;
}

export const QuickChatModelSettings: React.FC<QuickChatModelSettingsProps> = ({
  defaultModelId,
  options,
  onDefaultModelChange,
  children,
}) => (
  <SettingSection>
    <div className="tw-flex tw-min-w-0 tw-flex-col tw-py-4">
      <span className="tw-text-base tw-font-semibold">
        {t("Quick Chat models", "快捷聊天模型")}
      </span>
      <span className="tw-text-xs tw-text-muted">
        {t(
          "Models shown in the chat model picker. Add providers on the BYOK tab.",
          "在聊天模型选择器中显示的模型。可在“自备密钥（BYOK）”页添加服务商。"
        )}
      </span>
    </div>
    <SettingItem
      type="select"
      title={t("Default model", "默认模型")}
      description={t(
        "The model new chats start with. Pick from your enabled Quick Chat models.",
        "新对话默认使用的模型，请从已启用的快捷聊天模型中选择。"
      )}
      value={defaultModelId ?? "Select model"}
      onChange={(value) => {
        if (value === "Select model") return;
        onDefaultModelChange(value);
      }}
      options={
        defaultModelId !== undefined
          ? options
          : [{ label: t("Select model", "选择模型"), value: "Select model" }, ...options]
      }
      placeholder={t("Model", "模型")}
    />
    <div className="tw-py-4">{children}</div>
  </SettingSection>
);
