import { t } from "@/lib/i18n";
import type { BackendAuthStatus, InstallState } from "@/agentMode/session/types";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check } from "lucide-react";
import React from "react";

interface InstallBadgeSpec {
  label: string;
  variant: "outline" | "destructive" | "success";
  showCheck?: boolean;
  showAlert?: boolean;
  title?: string;
}

export function installBadge(
  state: InstallState,
  authStatus?: BackendAuthStatus | null
): InstallBadgeSpec | null {
  if (state.kind === "ready") {
    return (
      authBadge(authStatus) ?? { label: t("Ready", "就绪"), variant: "success", showCheck: true }
    );
  }
  if (state.kind === "checking") {
    return { label: t("Checking…", "正在检查…"), variant: "outline" };
  }
  if (state.kind === "incompatible") {
    return {
      label: t("Incompatible version", "版本不兼容"),
      variant: "destructive",
      title: state.message,
    };
  }
  if (state.kind === "error") {
    return { label: t("Error", "错误"), variant: "destructive", title: state.message };
  }
  return null;
}

function authBadge(authStatus: BackendAuthStatus | null | undefined): InstallBadgeSpec | null {
  if (authStatus === null)
    return { label: t("Checking sign-in…", "正在检查登录状态…"), variant: "outline" };
  if (authStatus?.signedIn === false)
    return { label: t("Sign in required", "需要登录"), variant: "outline" };
  return null;
}

interface ReadinessBadgeProps {
  state: InstallState;
  authStatus?: BackendAuthStatus | null;
}

const CONFIG_STATUS_BADGES: Record<InstallState["kind"], InstallBadgeSpec> = {
  ready: { label: t("Ready", "就绪"), variant: "success", showCheck: true },
  absent: { label: t("Not set up", "尚未配置"), variant: "outline" },
  incompatible: {
    label: t("Update required", "需要更新"),
    variant: "destructive",
    showAlert: true,
  },
  checking: { label: t("Checking…", "正在检查…"), variant: "outline" },
  error: { label: t("Error", "错误"), variant: "destructive" },
};

const StatusBadge: React.FC<{ spec: InstallBadgeSpec }> = ({ spec }) => (
  <Badge variant={spec.variant} className="tw-gap-1" title={spec.title}>
    {spec.showCheck && <Check aria-hidden className="tw-size-icon-xs" />}
    {spec.showAlert && <AlertTriangle aria-hidden className="tw-size-icon-xs" />}
    {spec.label}
  </Badge>
);

export const InstallBadge: React.FC<ReadinessBadgeProps> = ({ state, authStatus }) => {
  const spec = installBadge(state, authStatus);
  if (!spec) return null;
  return <StatusBadge spec={spec} />;
};

export const ConfigStatusBadge: React.FC<ReadinessBadgeProps> = ({ state, authStatus }) => (
  <StatusBadge
    spec={(state.kind === "ready" && authBadge(authStatus)) || CONFIG_STATUS_BADGES[state.kind]}
  />
);
