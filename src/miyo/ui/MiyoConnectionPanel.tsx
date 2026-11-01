import { t } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import type { CapabilityStatus } from "@/miyo/miyoStatusStore";
import { Input } from "@/components/ui/input";
import { SettingSection } from "@/components/ui/setting-section";
import { cn } from "@/lib/utils";
import React from "react";

export interface MiyoConnectionPanelProps {
  mode: "local" | "remote";
  address: string;
  onModeChange: (mode: "local" | "remote") => void;
  onAddressChange: (address: string) => void;
  downloadUrl: string;
  activeMode: "local" | "remote";
  enabled: boolean;
  status: CapabilityStatus;
  checking: boolean;
  localSupported?: boolean;
  error?: string;
  children: React.ReactNode;
}

export function MiyoConnectionPanel({
  mode,
  address,
  onModeChange,
  onAddressChange,
  downloadUrl,
  activeMode,
  enabled,
  status,
  checking,
  localSupported = true,
  error,
  children,
}: MiyoConnectionPanelProps) {
  const groupId = React.useId();
  const connected = enabled && (status === "available" || status === "stale");
  const statusLabel = checking
    ? t("Checking…", "正在检查…")
    : connected
      ? t("Connected", "已连接")
      : t("Offline", "离线");
  return (
    <SettingSection label={t("Connection", "连接")}>
      <div className="tw-space-y-3 tw-py-4">
        <div
          role="radiogroup"
          aria-label={t("Miyo connection", "Miyo 连接")}
          className="tw-flex tw-flex-wrap tw-gap-3"
        >
          {(["local", "remote"] as const).map((value) => {
            const unavailable = value === "local" && !localSupported;
            return (
              <label
                key={value}
                className={cn(
                  "tw-min-w-0 tw-flex-1 tw-basis-48 tw-space-y-1 tw-rounded-lg tw-border tw-border-solid tw-p-3 focus-within:tw-ring-2 focus-within:tw-ring-ring",
                  unavailable ? "tw-cursor-not-allowed tw-opacity-45" : "tw-cursor-pointer",
                  mode === value
                    ? "tw-border-interactive-accent tw-bg-interactive-accent/10"
                    : "tw-border-border tw-bg-secondary"
                )}
                aria-disabled={unavailable}
              >
                <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-1.5">
                  <span className="tw-inline-flex tw-items-center tw-gap-2">
                    <input
                      type="radio"
                      className="tw-m-0 tw-size-4 tw-shrink-0"
                      name={groupId}
                      value={value}
                      checked={mode === value}
                      disabled={unavailable}
                      onChange={() => onModeChange(value)}
                    />
                    <span className="tw-text-sm tw-font-medium">
                      {value === "local" ? t("Local", "本机") : t("Remote server", "远程服务器")}
                    </span>
                  </span>
                  {activeMode === value && !unavailable && (
                    <Badge
                      role="status"
                      variant={connected && !checking ? "success" : "secondary"}
                      className="tw-px-1 tw-text-xs"
                    >
                      {statusLabel}
                    </Badge>
                  )}
                </div>
                <span className="tw-block tw-text-xs tw-text-muted">
                  {value === "remote"
                    ? t("Connect using a server address.", "通过服务器地址连接。")
                    : unavailable
                      ? t(
                          "Needs Miyo running on this device. Use Remote server instead.",
                          "需要在此设备上运行 Miyo，请改用“远程服务器”。"
                        )
                      : t("Connect to Miyo running locally.", "连接本机运行的 Miyo。")}
                </span>
              </label>
            );
          })}
        </div>
        {mode === "remote" ? (
          <div className="tw-space-y-2">
            <label htmlFor={`${groupId}-address`} className="tw-block tw-text-xs tw-font-medium">
              {t("Server address", "服务器地址")}
            </label>
            <Input
              id={`${groupId}-address`}
              value={address}
              onChange={(event) => onAddressChange(event.target.value)}
              placeholder="http://miyo-home:8742"
              aria-invalid={Boolean(error)}
            />
          </div>
        ) : (
          <div className="tw-text-xs tw-text-muted">
            {t(
              "Open Miyo on this computer, then connect. Don't have it yet?",
              "请在此电脑上打开 Miyo 后再连接。还没有安装？"
            )}{" "}
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tw-text-accent"
            >
              {t("Download", "下载")}
            </a>
          </div>
        )}
        {error && (
          <div role="alert" className="tw-text-xs tw-text-error">
            {error}
          </div>
        )}
        {children}
      </div>
    </SettingSection>
  );
}
