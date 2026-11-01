import { t } from "@/lib/i18n";
import React from "react";
import { App, Modal } from "obsidian";
import { Root } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { createPluginRoot } from "@/utils/react/createPluginRoot";
import { createProductUrl, PRODUCT_URLS } from "@/lib/productLinks";
import { logError } from "@/logger";
import { DEFAULT_COPILOT_PLUS_CHAT_MODEL, applyLicenseSettings } from "@/plusUtils";

export interface CopilotPlusWelcomeModalContentProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function CopilotPlusWelcomeModalContent({
  onConfirm,
  onCancel,
}: CopilotPlusWelcomeModalContentProps) {
  return (
    <div className="tw-flex tw-flex-col tw-gap-4">
      <div>
        <p>
          {t(
            "Thanks for purchasing! Your license includes Copilot exclusive models, cross-agent skills, access to the",
            "感谢购买！您的许可证包含 Copilot 专属模型、跨智能体技能，以及"
          )}{" "}
          <a href={createProductUrl(PRODUCT_URLS.OPENARTIFACTS, "welcome_modal")}>OpenArtifacts</a>{" "}
          {t("doc sharing service, and much more!", "文档分享服务等更多功能！")}
        </p>
        <p>
          {t("Would you like to make", "是否现在将")}{" "}
          <b className="tw-text-accent">{DEFAULT_COPILOT_PLUS_CHAT_MODEL}</b>{" "}
          {t(
            "the default model for chat and your agents now? You can always change this later in Settings.",
            "设为聊天和智能体的默认模型？您随时可以在设置中更改。"
          )}
        </p>
      </div>
      <div className="tw-flex tw-w-full tw-justify-end tw-gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t("Apply later", "稍后应用")}
        </Button>
        <Button variant="default" onClick={onConfirm}>
          {t("Apply now", "立即应用")}
        </Button>
      </div>
    </div>
  );
}

export class CopilotPlusWelcomeModal extends Modal {
  private root: Root;

  constructor(app: App) {
    super(app);
    // @ts-ignore
    this.setTitle(t("Welcome to Copilot 🚀", "欢迎使用 Copilot 🚀"));
  }

  onOpen() {
    const { contentEl } = this;
    this.root = createPluginRoot(contentEl, this.app);

    const handleConfirm = () => {
      void applyLicenseSettings().catch((error) =>
        logError(t("Failed to apply the licensed default model", "无法应用授权的默认模型"), error)
      );
      this.close();
    };

    const handleCancel = () => {
      this.close();
    };

    this.root.render(
      <CopilotPlusWelcomeModalContent onConfirm={handleConfirm} onCancel={handleCancel} />
    );
  }

  onClose() {
    this.root.unmount();
  }
}
