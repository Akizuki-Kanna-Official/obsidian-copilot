import { t } from "@/lib/i18n";
import type { BackendAuthStatus } from "@/agentMode/session/types";
import { Button } from "@/components/ui/button";
import React from "react";

export interface SignInActionProps {
  status: BackendAuthStatus | null;
  onSignIn: () => void;
  signingIn: boolean;
  url: string | null;
  onCancel?: () => void;
  failed?: boolean;
  signInLabel?: string;
}

export const SignInAction: React.FC<SignInActionProps> = (auth) => (
  <div className="tw-flex tw-flex-col tw-items-start tw-gap-2" aria-live="polite">
    {auth.status?.signedIn ? (
      <span>
        {t(
          `Signed in${auth.status.label ? ` as ${auth.status.label}` : ""}.`,
          `已登录${auth.status.label ? `：${auth.status.label}` : ""}。`
        )}
      </span>
    ) : (
      <>
        {auth.signingIn && (
          <p className="tw-my-0 tw-text-sm tw-text-muted">
            {t("Finish signing in in your browser.", "请在浏览器中完成登录。")}
          </p>
        )}
        {auth.failed && (
          <p className="tw-my-0 tw-text-sm tw-text-muted">
            {t("Sign-in didn't complete. Try again.", "登录未完成，请重试。")}
          </p>
        )}
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
          {auth.signingIn && auth.url ? (
            <Button asChild variant="default" size="sm">
              <a href={auth.url} target="_blank" rel="noopener noreferrer">
                {t("Open sign-in page", "打开登录页面")}
              </a>
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={auth.onSignIn}
              disabled={auth.signingIn || auth.status === null}
            >
              {auth.signingIn
                ? t("Signing in…", "正在登录…")
                : auth.failed
                  ? t("Try again", "重试")
                  : auth.status === null
                    ? t("Checking sign-in…", "正在检查登录状态…")
                    : (auth.signInLabel ?? t("Sign in", "登录"))}
            </Button>
          )}
          {auth.signingIn && auth.onCancel && (
            <Button variant="ghost" size="sm" onClick={auth.onCancel}>
              {t("Cancel sign-in", "取消登录")}
            </Button>
          )}
        </div>
      </>
    )}
  </div>
);
