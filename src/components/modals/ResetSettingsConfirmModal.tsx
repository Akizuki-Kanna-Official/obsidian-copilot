import { t } from "@/lib/i18n";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { App } from "obsidian";

export class ResetSettingsConfirmModal extends ConfirmModal {
  constructor(app: App, onConfirm: () => void | Promise<void>) {
    super(
      app,
      onConfirm,
      t(
        "Resetting settings will restore the default values. " +
          'API keys are not cleared by this action — use "Delete All Keys" in Advanced Settings ' +
          "→ API Key Storage if you also want to remove them. Are you sure you want to continue?",
        "重置设置将恢复默认值，但不会清除 API 密钥。如需一并移除密钥，请前往高级设置 → API 密钥存储，使用“删除所有密钥”。确定要继续吗？"
      ),
      t("Reset Settings", "重置设置")
    );
  }
}
