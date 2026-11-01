import { t } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VerificationResult } from "@/modelManagement/types/runtime";
import { Loader2 } from "lucide-react";
import React from "react";

export interface ProviderVerificationStatusProps {
  result?: VerificationResult;
}

export function ProviderVerificationStatus({ result }: ProviderVerificationStatusProps) {
  // https://github.com/logancyang/obsidian-copilot/issues/3147:
  // Only a fresh successful probe earns a success badge. Connection failures
  // remain inconclusive rather than accusing a valid key of being invalid.
  const label = !result
    ? t("Checking…", "正在检查…")
    : result.ok
      ? t("Verified", "已验证")
      : result.code === "missing_api_key"
        ? t("No key", "无密钥")
        : result.code === "invalid_api_key"
          ? t("Invalid key", "密钥无效")
          : t("Check failed", "检查失败");
  return (
    <Badge
      variant={result && !result.ok ? "destructive" : "secondary"}
      title={result?.message}
      className={cn("tw-shrink-0 tw-rounded-full", result?.ok && "tw-bg-success tw-text-success")}
    >
      {label}
    </Badge>
  );
}

export interface ProviderVerificationProgressProps {
  pending: number;
}

export function ProviderVerificationProgress({ pending }: ProviderVerificationProgressProps) {
  if (pending === 0) return null;
  return (
    <div
      role="status"
      className="tw-pointer-events-none tw-absolute tw-right-0 tw-top-0 tw-flex -tw-translate-y-1/2 tw-items-center tw-gap-1.5 tw-rounded-full tw-bg-primary tw-px-2 tw-py-1 tw-text-xs tw-text-muted tw-shadow-sm"
    >
      <Loader2 className="tw-size-3 tw-animate-spin" aria-hidden="true" />
      {t("Verifying providers…", "正在验证服务商…")}
    </div>
  );
}
