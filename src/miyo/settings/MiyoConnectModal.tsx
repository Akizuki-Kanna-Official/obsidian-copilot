import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MIYO_ADD_FOLDER_DEEPLINK_URL, MIYO_DEEPLINK_URL } from "@/miyo/miyoUtils";
import { createPluginRoot } from "@/utils/react/createPluginRoot";
import { ArrowUpRight, CheckSquare, CircleAlert, MonitorDown, RefreshCw } from "lucide-react";
import { App, Modal } from "obsidian";
import React from "react";
import { Root } from "react-dom/client";

export type ConnectStep = "guide" | "addVault";

export type ConnectOutcome = "connected" | "needs-add" | "unreachable" | "error";

const IconTile: React.FC<{ tone: "warning" | "info" | "success"; children: React.ReactNode }> = ({
  tone,
  children,
}) => (
  <div
    className={cn(
      "tw-mb-3 tw-inline-flex tw-size-10 tw-items-center tw-justify-center tw-rounded-lg",
      tone === "warning" && "tw-bg-project-yellow tw-text-warning",
      tone === "info" && "tw-text-accent tw-bg-interactive-accent/20",
      tone === "success" && "tw-bg-project-green tw-text-project-green"
    )}
  >
    {children}
  </div>
);

interface MiyoConnectContentProps {
  step: ConnectStep;
  downloadUrl: string;
  canAutoAdd: boolean;
  onClose: () => void;
  onRetry: () => void;
  onAddVault: () => Promise<"added" | "manual" | "unreachable" | "error">;
}

export const MiyoConnectContent: React.FC<MiyoConnectContentProps> = ({
  step,
  downloadUrl,
  canAutoAdd,
  onClose,
  onRetry,
  onAddVault,
}) => {
  const [adding, setAdding] = React.useState(false);
  const [addError, setAddError] = React.useState(false);

  const handleAddVault = React.useCallback(async () => {
    setAddError(false);
    setAdding(true);
    const outcome = await onAddVault();
    setAdding(false);
    if (outcome === "error") {
      setAddError(true);
    }
  }, [onAddVault]);

  return (
    <div className="tw-flex tw-flex-col tw-gap-4">
      {step === "guide" && (
        <>
          <div className="tw-flex tw-flex-col tw-gap-2">
            <IconTile tone="warning">
              <CircleAlert className="tw-size-5" />
            </IconTile>
            <div className="tw-text-lg tw-font-semibold tw-text-normal">
              {t("Miyo isn't running", "Miyo 未运行")}
            </div>
            <div className="tw-text-sm tw-text-muted">
              {t(
                "Copilot couldn't reach a local Miyo instance. If you haven't installed Miyo yet, download it; if it's installed, open the app, then retry.",
                "Copilot 无法连接本机的 Miyo。如果尚未安装，请先下载；如果已安装，请打开 Miyo 后重试。"
              )}
            </div>
          </div>
          <div className="tw-flex tw-gap-2">
            <Button
              variant="default"
              className="tw-flex-1 tw-justify-center"
              onClick={() => window.open(downloadUrl, "_blank")}
            >
              {t("Download Miyo", "下载 Miyo")}
              <ArrowUpRight className="tw-size-3.5" />
            </Button>
            <Button
              variant="secondary"
              className="tw-flex-1 tw-justify-center tw-border-none tw-shadow-none"
              onClick={() => window.open(MIYO_DEEPLINK_URL, "_blank")}
            >
              <MonitorDown className="tw-size-3.5" /> {t("Open Miyo", "打开 Miyo")}
            </Button>
          </div>
          <div className="tw-flex tw-items-center tw-justify-between">
            <Button variant="ghost2" size="sm" onClick={onClose}>
              {t("Cancel", "取消")}
            </Button>
            <Button
              variant="link"
              size="sm"
              className="tw-border-none tw-bg-transparent tw-shadow-none"
              onClick={onRetry}
            >
              <RefreshCw className="tw-size-3.5" /> {t("Retry connection", "重试连接")}
            </Button>
          </div>
        </>
      )}

      {step === "addVault" && (
        <>
          <div className="tw-flex tw-flex-col tw-gap-2">
            <IconTile tone="success">
              <CheckSquare className="tw-size-5" />
            </IconTile>
            <div className="tw-text-lg tw-font-semibold tw-text-normal">
              {t("Register this vault with Miyo", "将此知识库注册到 Miyo")}
            </div>
            <div className="tw-text-sm tw-text-muted">
              {canAutoAdd ? (
                <>
                  {t("Miyo is running. Copilot will register", "Miyo 已运行。Copilot 将注册")}{" "}
                  <span className="tw-font-semibold tw-text-normal">
                    {t("this vault", "此知识库")}
                  </span>{" "}
                  {t(
                    "so Miyo can index it locally for search and chat — unlimited, no credits. The folders you register are the boundary Miyo works within; if you turn on Miyo's Relay connector, ChatGPT and Claude can reach this vault too.",
                    "，以便 Miyo 在本地建立索引用于搜索和聊天，不限次数、不消耗点数。Miyo 只会访问你注册的文件夹；如果启用 Miyo 的 Relay 连接器，ChatGPT 和 Claude 也可以访问此知识库。"
                  )}
                </>
              ) : (
                <>
                  {t("Miyo is running, but", "Miyo 已运行，但")}{" "}
                  <span className="tw-font-semibold tw-text-normal">
                    {t("this vault", "此知识库")}
                  </span>{" "}
                  {t(
                    "isn't added to it yet. Open Miyo, add this vault as a folder, then retry — Miyo indexes it locally for search and chat, unlimited and no credits. If you turn on Miyo's Relay connector, ChatGPT and Claude can reach it too.",
                    "尚未添加。请打开 Miyo，将此知识库作为文件夹添加，然后重试。Miyo 会在本地建立索引用于搜索和聊天，不限次数、不消耗点数。如果启用 Miyo 的 Relay 连接器，ChatGPT 和 Claude 也可以访问此知识库。"
                  )}
                </>
              )}
            </div>
            {addError && (
              <div className="tw-text-sm tw-text-error">
                {t(
                  "Couldn't register this vault with Miyo. Please try again.",
                  "无法将此知识库注册到 Miyo，请重试。"
                )}
              </div>
            )}
          </div>
          {canAutoAdd ? (
            <div className="tw-flex tw-items-center tw-justify-end tw-gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                {t("Cancel", "取消")}
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={adding}
                onClick={() => void handleAddVault()}
              >
                {adding ? (
                  <>
                    <RefreshCw className="tw-size-3.5 tw-animate-spin" />{" "}
                    {t("Registering…", "正在注册…")}
                  </>
                ) : (
                  t("Register & connect", "注册并连接")
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="tw-flex tw-gap-2">
                <Button
                  variant="default"
                  className="tw-flex-1 tw-justify-center"
                  onClick={() => window.open(MIYO_ADD_FOLDER_DEEPLINK_URL, "_blank")}
                >
                  <MonitorDown className="tw-size-3.5" /> {t("Open Miyo", "打开 Miyo")}
                </Button>
              </div>
              <div className="tw-flex tw-items-center tw-justify-between">
                <Button variant="ghost2" size="sm" onClick={onClose}>
                  {t("Cancel", "取消")}
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  className="tw-border-none tw-bg-transparent tw-shadow-none"
                  onClick={onRetry}
                >
                  <RefreshCw className="tw-size-3.5" /> {t("Retry", "重试")}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export interface MiyoConnectModalOptions {
  initialStep: ConnectStep;
  downloadUrl: string;
  canAutoAdd: boolean;
  onClose?: () => void;
  onRetry: () => Promise<ConnectOutcome>;
  onAddVault: () => Promise<"added" | "manual" | "unreachable" | "error">;
}

export class MiyoConnectModal extends Modal {
  private root: Root | null = null;
  private step: ConnectStep;

  constructor(
    app: App,
    private readonly options: MiyoConnectModalOptions
  ) {
    super(app);
    this.step = options.initialStep;
  }

  onOpen() {
    this.root = createPluginRoot(this.contentEl, this.app);
    this.renderContent();
  }

  onClose() {
    this.root?.unmount();
    this.root = null;
    this.options.onClose?.();
  }

  private advanceTo(step: ConnectStep): void {
    this.step = step;
    this.renderContent();
  }

  private renderContent(): void {
    this.root?.render(
      <MiyoConnectContent
        step={this.step}
        downloadUrl={this.options.downloadUrl}
        canAutoAdd={this.options.canAutoAdd}
        onClose={() => this.close()}
        onRetry={() => {
          void Promise.resolve(this.options.onRetry()).then((outcome) => {
            if (!this.root) {
              return;
            }
            if (outcome === "connected") {
              this.close();
            } else if (outcome === "needs-add") {
              this.advanceTo("addVault");
            } else if (outcome === "unreachable") {
              this.advanceTo("guide");
            }
          });
        }}
        onAddVault={async () => {
          const outcome = await this.options.onAddVault();
          if (this.root && outcome === "added") {
            this.close();
          } else if (this.root && outcome === "unreachable") {
            this.advanceTo("guide");
          }
          return outcome;
        }}
      />
    );
  }
}
