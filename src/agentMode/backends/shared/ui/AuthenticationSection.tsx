import { t } from "@/lib/i18n";
import { ConfigSection } from "@/agentMode/backends/shared/ui/ConfigDialogShell";
import { SignInAction, type SignInActionProps } from "@/agentMode/backends/shared/ui/SignInAction";
import { CommandBlock } from "@/agentMode/backends/shared/ui/SetupSteps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import React from "react";

export interface AuthenticationState extends SignInActionProps {
  onSignOut: () => void;
  signingOut: boolean;
  terminalCommand: string | null;
}

interface AuthenticationSectionProps {
  ready: boolean;
  unavailableMessage: string;
  auth: AuthenticationState;
}

export const AuthenticationSection: React.FC<AuthenticationSectionProps> = ({
  ready,
  unavailableMessage,
  auth,
}) => (
  <ConfigSection
    title={t("Authentication", "身份验证")}
    badge={
      ready && (
        <Badge variant={auth.status?.signedIn ? "success" : "outline"} role="status">
          {auth.status === null
            ? t("Checking…", "正在检查…")
            : auth.status.signedIn
              ? t("Signed in", "已登录")
              : t("Not signed in", "未登录")}
        </Badge>
      )
    }
  >
    {/* An unavailable CLI cannot authenticate; terminal instructions apply only to a confirmed signed-out profile.
        https://github.com/Brevilabs/obsidian-copilot-private/issues/379 */}
    {!ready ? (
      <div
        role="alert"
        className="tw-flex tw-items-start tw-gap-2 tw-rounded-md tw-border tw-border-solid tw-bg-callout-warning/20 tw-p-3 tw-text-sm tw-border-warning/40"
      >
        <AlertTriangle aria-hidden className="tw-mt-0.5 tw-size-4 tw-shrink-0 tw-text-warning" />
        <p className="tw-my-0">{unavailableMessage}</p>
      </div>
    ) : auth.status?.signedIn ? (
      <div className="tw-flex tw-flex-col tw-items-start tw-gap-2">
        <div className="tw-flex tw-w-full tw-flex-wrap tw-items-center tw-gap-3">
          {auth.status.label && (
            <p className="tw-my-0 tw-min-w-0 tw-break-words tw-text-sm tw-text-muted">
              {t(`Signed in as ${auth.status.label}.`, `已登录为 ${auth.status.label}。`)}
            </p>
          )}
          <Button variant="secondary" onClick={auth.onSignOut} disabled={auth.signingOut}>
            {auth.signingOut ? t("Signing out…", "正在退出登录…") : t("Sign out", "退出登录")}
          </Button>
        </div>
        {auth.failed && (
          <p className="tw-my-0 tw-text-sm tw-text-error">
            {t("Sign-out didn't complete. Try again.", "退出登录未完成，请重试。")}
          </p>
        )}
      </div>
    ) : (
      <>
        <SignInAction {...auth} signInLabel={t("Sign in with your browser", "通过浏览器登录")} />
        {auth.status?.signedIn === false && auth.terminalCommand && (
          <div className="tw-mt-2 tw-flex tw-flex-col tw-gap-2">
            <p className="tw-my-0 tw-text-sm tw-font-medium">
              {t("Sign in using a terminal instead", "也可以通过终端登录")}
            </p>
            <CommandBlock command={auth.terminalCommand} />
          </div>
        )}
      </>
    )}
  </ConfigSection>
);
