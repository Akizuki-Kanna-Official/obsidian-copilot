import { t } from "@/lib/i18n";
import { createProductUrl, PRODUCT_URLS } from "@/lib/productLinks";
import { CopilotPlusWelcomeModal } from "@/components/modals/CopilotPlusWelcomeModal";
import { useApp } from "@/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { checkIsPaidUser, navigateToPlusPage, useIsPaidUser, useLicenseState } from "@/plusUtils";
import { updateSetting, useSettingsValue } from "@/settings/model";
import { ExternalLink, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { safeAsyncHandler } from "@/utils/safeAsyncHandler";

function getPlusUsageMock(): { currentPct: number; weeklyPct: number } | null {
  return null;
}

const LIFETIME_PLAN = "believer";

export function PlusSettings() {
  const app = useApp();
  const settings = useSettingsValue();
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const isPaidUser = useIsPaidUser();
  const license = useLicenseState();
  const licenseStatus = isChecking ? "none" : license.status;
  const [localLicenseKey, setLocalLicenseKey] = useState(settings.plusLicenseKey);
  const usageData = getPlusUsageMock();

  return (
    <section className="tw-flex tw-flex-col tw-gap-4 tw-rounded-xl tw-border tw-border-solid tw-border-border tw-p-4 tw-shadow-sm tw-bg-interactive-accent/10">
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-text-lg tw-font-semibold">
        <span>{t("Copilot license", "Copilot 许可证")}</span>
        {licenseStatus === "active" && (
          <Badge className="tw-rounded-full tw-bg-success tw-capitalize tw-text-success">
            {license.plan === LIFETIME_PLAN
              ? t("Lifetime", "终身")
              : (license.plan ?? t("Active", "已激活"))}
          </Badge>
        )}
        {licenseStatus === "inactive" && (
          <Badge className="tw-rounded-full tw-bg-error tw-text-error">
            {t("Inactive", "未激活")}
          </Badge>
        )}
      </div>
      <div className="tw-flex tw-flex-col tw-gap-2 tw-text-sm tw-text-muted">
        <div>
          <a
            href={createProductUrl(PRODUCT_URLS.COPILOT_PRICING, "settings")}
            target="_blank"
            rel="noopener noreferrer"
            className="tw-font-semibold tw-text-accent"
          >
            {t("Copilot paid plans", "Copilot 付费方案")}
          </a>{" "}
          {t("add ", "为你提供")}
          <strong className="tw-font-semibold tw-text-normal">
            {t("premium chat models", "高级聊天模型")}
          </strong>
          ,{" "}
          <strong className="tw-font-semibold tw-text-normal">
            {t("advanced web search", "高级网页搜索")}
          </strong>
          {t(", and", "以及")}{" "}
          <strong className="tw-font-semibold tw-text-normal">
            {t("multi-agent answers", "多智能体回答")}
          </strong>
          {t(" to your Copilot agentic experience. Pair it with", "等智能体功能。搭配")}{" "}
          <a
            href={createProductUrl(PRODUCT_URLS.MIYO, "license_settings")}
            target="_blank"
            rel="noopener noreferrer"
            className="tw-font-semibold tw-text-accent"
          >
            Miyo
          </a>{" "}
          {t(
            "and turn your vault into a centralized workspace for all your AI tools across devices.",
            "，即可将仓库变为跨设备 AI 工具的统一工作空间。"
          )}
        </div>
      </div>

      {(isPaidUser === false || licenseStatus === "inactive") && !isChecking && (
        <div className="tw-flex tw-flex-col tw-gap-2 tw-rounded-lg tw-border tw-border-solid tw-border-border tw-bg-primary tw-p-3">
          <div className="tw-text-sm tw-text-normal">
            {t("All of it for a few dollars a month.", "每月只需几美元，即可享用以上功能。")}
          </div>
          <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
            <Button
              className="tw-text-xs md:tw-text-sm"
              onClick={() => navigateToPlusPage("settings")}
            >
              {t("See plans ", "查看方案")}
              <ExternalLink className="tw-size-2 md:tw-size-4" />
            </Button>
            <a
              href={createProductUrl(PRODUCT_URLS.MIYO, "pairing")}
              target="_blank"
              rel="noopener noreferrer"
              className="tw-inline-flex tw-items-center tw-gap-0.5 tw-text-sm tw-text-accent"
            >
              {t("New: pair Copilot with Miyo ", "新功能：将 Copilot 与 Miyo 配对")}
              <ExternalLink className="tw-size-3.5" />
            </a>
          </div>
        </div>
      )}

      <div className="tw-flex tw-items-center tw-gap-2">
        <PasswordInput
          className="tw-w-full"
          placeholder={t("Enter your license key", "输入许可证密钥")}
          value={localLicenseKey}
          onChange={(value) => {
            setLocalLicenseKey(value);
          }}
        />
        <Button
          disabled={isChecking}
          onClick={safeAsyncHandler(async () => {
            updateSetting("plusLicenseKey", localLicenseKey);
            setIsChecking(true);
            const result = await checkIsPaidUser(app, { trigger: "manual" });
            setIsChecking(false);
            if (!result) {
              setError(t("Invalid license key", "许可证密钥无效"));
            } else {
              setError(null);
              new CopilotPlusWelcomeModal(app).open();
            }
          })}
          className="tw-min-w-10 tw-text-xs md:tw-text-sm"
        >
          {isChecking ? (
            <Loader2 className="tw-size-2 tw-animate-spin md:tw-size-4" />
          ) : (
            t("Apply", "应用")
          )}
        </Button>
      </div>
      {error && <div className="tw-text-error">{error}</div>}

      {isPaidUser && usageData && (
        <div className="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-border-t tw-border-border tw-pt-4 tw-text-sm">
          <div className="tw-flex tw-items-center tw-gap-3 tw-text-muted">
            <span className="tw-flex tw-items-center tw-gap-1.5">
              <span className="tw-text-accent">●</span>
              <span>
                {t("Current 5h ", "当前 5 小时")}
                <strong className="tw-font-semibold">{usageData.currentPct}%</strong>{" "}
                {t("used", "已使用")}
              </span>
            </span>
            <span className="tw-text-faint">·</span>
            <span className="tw-flex tw-items-center tw-gap-1.5">
              <span className="tw-text-accent">●</span>
              <span>
                {t("Weekly ", "本周")}
                <strong className="tw-font-semibold">{usageData.weeklyPct}%</strong>
                {t(" used", "已使用")}
              </span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="tw-gap-1 tw-text-sm tw-text-accent hover:tw-text-accent-hover"
            onClick={() => {
              window.open(
                createProductUrl(PRODUCT_URLS.COPILOT_DASHBOARD, "usage_footer"),
                "_blank"
              );
            }}
          >
            {t("Dashboard ", "控制台")}
            <ExternalLink className="tw-size-3.5" />
          </Button>
        </div>
      )}
    </section>
  );
}
