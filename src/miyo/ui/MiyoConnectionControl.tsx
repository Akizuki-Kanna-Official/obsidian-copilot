import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";
import React from "react";

export interface MiyoConnectionControlProps {
  checking: boolean;
  onDisconnect: () => void;
  onRetry: () => void;
}

export interface MiyoAvailabilityNoticeProps {
  enabled: boolean;
  available: boolean;
  checking: boolean;
}

export const MiyoAvailabilityNotice: React.FC<MiyoAvailabilityNoticeProps> = ({
  enabled,
  available,
  checking,
}) => {
  // A probe in flight is neither connected nor unavailable. Showing the
  // unavailable warning while the control reads "Checking…" would give the user
  // two contradictory verdicts about the same endpoint.
  // https://github.com/Brevilabs/obsidian-copilot-private/issues/356
  if (available || checking) return null;

  return (
    <div className="tw-flex tw-items-start tw-gap-2 tw-rounded-lg tw-border tw-border-solid tw-border-border tw-bg-secondary tw-px-3 tw-py-2.5 tw-text-left tw-text-xs tw-text-normal">
      <TriangleAlert className="tw-size-4 tw-shrink-0 tw-text-warning" />
      <span className="tw-min-w-0 tw-flex-1">
        {enabled
          ? t(
              "Miyo is unavailable. Check your server, then retry the connection above.",
              "Miyo 不可用。请检查服务器，然后在上方重试连接。"
            )
          : t("Connect to Miyo to configure these capabilities.", "连接 Miyo 后即可配置这些功能。")}
      </span>
    </div>
  );
};

export const MiyoConnectionControl: React.FC<MiyoConnectionControlProps> = ({
  checking,
  onDisconnect,
  onRetry,
}) => (
  <div className="tw-flex tw-w-full tw-flex-wrap tw-items-center tw-justify-end tw-gap-2">
    <Button
      variant="secondary"
      size="sm"
      className="tw-shadow-none"
      onClick={onRetry}
      disabled={checking}
    >
      {t("Check connection", "检查连接")}
    </Button>
    <Button
      variant="secondary"
      size="sm"
      className="tw-shadow-none"
      onClick={onDisconnect}
      disabled={checking}
    >
      {t("Disconnect", "断开连接")}
    </Button>
  </div>
);
