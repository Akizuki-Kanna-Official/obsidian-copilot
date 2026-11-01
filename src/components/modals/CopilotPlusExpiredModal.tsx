import { t } from "@/lib/i18n";
import React from "react";
import { App, Modal } from "obsidian";
import { Root } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { isUsingLicensedModels, navigateToPlusPage } from "@/plusUtils";
import { ExternalLink } from "lucide-react";
import { getSettings } from "@/settings/model";
import { createPluginRoot } from "@/utils/react/createPluginRoot";

export interface CopilotPlusExpiredModalContentProps {
  onCancel: () => void;
  isUsingPlusModels: boolean;
}

export function CopilotPlusExpiredModalContent({
  onCancel,
  isUsingPlusModels,
}: CopilotPlusExpiredModalContentProps) {
  return (
    <div className="tw-flex tw-flex-col tw-gap-4">
      <div className="tw-flex tw-flex-col tw-gap-2">
        <div>
          {t(
            "Your Copilot Plus license key is no longer valid. Please renew your subscription to continue using Copilot Plus.",
            "您的 Copilot Plus 许可证密钥已失效。请续订以继续使用 Copilot Plus。"
          )}
        </div>
        {isUsingPlusModels && (
          <div className="tw-text-sm tw-text-warning">
            {t(
              "The Copilot Plus exclusive models will stop working. You can switch to the default models in the Settings.",
              "Copilot Plus 专属模型将停止工作。您可以在设置中切换至默认模型。"
            )}
          </div>
        )}
      </div>
      <div className="tw-flex tw-w-full tw-justify-end tw-gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t("Close", "关闭")}
        </Button>
        <Button
          variant="default"
          onClick={() => {
            navigateToPlusPage("expired_modal");
          }}
        >
          {t("Renew now", "立即续订")} <ExternalLink className="tw-size-4" />
        </Button>
      </div>
    </div>
  );
}

export class CopilotPlusExpiredModal extends Modal {
  private root: Root;

  constructor(app: App) {
    super(app);
    // @ts-ignore
    this.setTitle(t("Thanks for being a Copilot Plus user 👋", "感谢您使用 Copilot Plus 👋"));
  }

  onOpen() {
    const { contentEl } = this;
    this.root = createPluginRoot(contentEl, this.app);

    const handleCancel = () => {
      this.close();
    };

    this.root.render(
      <CopilotPlusExpiredModalContent
        onCancel={handleCancel}
        isUsingPlusModels={isUsingLicensedModels(getSettings())}
      />
    );
  }

  onClose() {
    this.root.unmount();
  }
}
