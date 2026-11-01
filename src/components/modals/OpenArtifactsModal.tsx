import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { createPluginRoot } from "@/utils/react/createPluginRoot";
import { SegmentedControl, type SegmentedControlOption } from "@/components/ui/segmented-control";
import {
  OpenArtifactsClientError,
  PRIVATE_UNAVAILABLE_CODE,
} from "@/openArtifacts/OpenArtifactsClient";
import type {
  OpenArtifactsAccess,
  OpenArtifactsAction,
  OpenArtifactsLinkAccess,
  OpenArtifactsReceipt,
} from "@/openArtifacts/types";
import { App, Modal } from "obsidian";
import React, { useEffect, useState } from "react";
import type { Root } from "react-dom/client";
import { safeAsyncHandler } from "@/utils/safeAsyncHandler";

export interface OpenArtifactsSuccessResult {
  kind: "success";
  action: OpenArtifactsAction;
  receipt?: OpenArtifactsReceipt;
}

export interface OpenArtifactsFailureResult {
  kind: "failure";
  action: OpenArtifactsAction;
  message: string;
  accessNotice: boolean;
  retryable: boolean;
  // The plan refusal's upgrade link, so a 402 on the first private publish can show it.
  // https://github.com/Brevilabs/obsidian-copilot-private/issues/707
  upgradeUrl?: string;
}

export interface OpenArtifactsPersistenceResult {
  kind: "persistence";
  action: OpenArtifactsAction;
  message: string;
  receipt?: OpenArtifactsReceipt;
  retrySave?: () => Promise<OpenArtifactsModalResult>;
}

export type OpenArtifactsModalResult =
  | OpenArtifactsSuccessResult
  | OpenArtifactsFailureResult
  | OpenArtifactsPersistenceResult;

export interface OpenArtifactsAccessPort {
  load(docId: string): Promise<OpenArtifactsAccess>;
  setLinkAccess(docId: string, linkAccess: OpenArtifactsLinkAccess): Promise<OpenArtifactsAccess>;
  open(docId: string): Promise<string>;
}

export interface OpenArtifactsModalOptions {
  fileName: string;
  docId: string | null;
  docUrl?: string | null;
  initialResult?: OpenArtifactsModalResult;
  access?: OpenArtifactsAccessPort;
  onConfirm: (
    action: OpenArtifactsAction,
    ownerDocument: Document,
    linkAccess?: OpenArtifactsLinkAccess
  ) => Promise<OpenArtifactsModalResult>;
  onClosed?: () => void;
}

export interface OpenArtifactsModalContentProps extends OpenArtifactsModalOptions {
  onClose: () => void;
}

function actionLabel(action: OpenArtifactsAction): string {
  return `${action[0].toUpperCase()}${action.slice(1)}`;
}

const WORKING_LABELS: Record<OpenArtifactsAction, string> = {
  publish: "Publishing…",
  update: "Updating…",
  delete: "Deleting…",
};

const LINK_ACCESS_OPTIONS: SegmentedControlOption<OpenArtifactsLinkAccess>[] = [
  { label: t("Anyone with the link", "任何获得链接的人"), value: "anyone" },
  { label: t("Only those invited", "仅受邀者"), value: "invited" },
];

// https://github.com/Brevilabs/obsidian-copilot-private/issues/707
const COPY_NOTICE = t(
  "People who opened it while it was public may have kept a copy.",
  "公开期间访问过此页面的人可能已保留副本。"
);

// Keyed on the code alone so a port, or a gallery story, can raise it without the client class.
// https://github.com/Brevilabs/obsidian-copilot-private/issues/707
function isPrivateUnavailable(error: unknown): error is Error {
  return error instanceof Error && (error as { code?: unknown }).code === PRIVATE_UNAVAILABLE_CODE;
}

function errorText(error: unknown): string {
  return error instanceof OpenArtifactsClientError
    ? error.message
    : t(
        "Copilot could not complete this OpenArtifacts action.",
        "Copilot 无法完成此 OpenArtifacts 操作。"
      );
}

interface OpenArtifactsReceiptViewProps {
  receipt: OpenArtifactsReceipt;
  access?: OpenArtifactsAccessPort;
  actions?: React.ReactNode;
}

function OpenArtifactsReceiptView({ receipt, access, actions }: OpenArtifactsReceiptViewProps) {
  const [copyMessage, setCopyMessage] = useState("");

  const copyUrl = async (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      await event.currentTarget.win.navigator.clipboard.writeText(receipt.url);
      setCopyMessage("Copied");
    } catch {
      setCopyMessage(t("Could not copy the link", "无法复制链接"));
    }
  };

  const openUrl = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const win = event.currentTarget.win;
    if (!access) {
      win.open(receipt.url, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      win.open(await access.open(receipt.docId), "_blank", "noopener,noreferrer");
    } catch (error) {
      setCopyMessage(errorText(error));
    }
  };

  return (
    <div className="tw-flex tw-flex-col tw-gap-3">
      <code className="tw-break-all tw-rounded-md tw-bg-secondary tw-p-2 tw-text-small">
        <a
          href={receipt.url}
          target="_blank"
          rel="noopener noreferrer"
          className="tw-text-accent tw-underline"
        >
          {receipt.url}
        </a>
      </code>
      <div className="tw-text-small tw-text-muted">
        {t("Document", "文档")} {receipt.docId} {t("· Version", "· 版本")} {receipt.version}
      </div>
      {receipt.guidance && (
        <p className="tw-m-0 tw-text-small tw-text-muted">
          {receipt.guidance.message}{" "}
          <a href={receipt.guidance.url} target="_blank" rel="noopener noreferrer">
            {t("Link account", "关联账户")}
          </a>
        </p>
      )}
      <div className="tw-flex tw-items-center tw-justify-end tw-gap-2">
        {copyMessage && <span className="tw-text-small tw-text-muted">{copyMessage}</span>}
        {actions}
        <Button variant="secondary" onClick={safeAsyncHandler(copyUrl)}>
          {t("Copy", "复制")}
        </Button>
        <Button onClick={safeAsyncHandler(openUrl)}>{t("Open", "打开")}</Button>
      </div>
    </div>
  );
}

function AccessPanel({
  docId,
  docUrl,
  access,
  showLinkActions = true,
}: {
  docId: string;
  docUrl?: string | null;
  access: OpenArtifactsAccessPort;
  showLinkActions?: boolean;
}) {
  const [state, setState] = useState<OpenArtifactsAccess | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; upgradeUrl?: string } | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  // Set when the server answers the access family with 404: an old or unconfigured server.
  // https://github.com/Brevilabs/obsidian-copilot-private/issues/707
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [showCopyNotice, setShowCopyNotice] = useState(false);

  const run = async (call: () => Promise<OpenArtifactsAccess>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      setState(await call());
      return true;
    } catch (caught) {
      if (isPrivateUnavailable(caught)) {
        setUnavailable(caught.message);
        return false;
      }
      setError({
        message: errorText(caught),
        upgradeUrl: caught instanceof OpenArtifactsClientError ? caught.upgradeUrl : undefined,
      });
      return false;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void run(() => access.load(docId));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per document; run and access are stable enough
  }, [docId]);

  const switchLinkAccess = async (next: OpenArtifactsLinkAccess) => {
    const previous = state?.linkAccess;
    if (await run(() => access.setLinkAccess(docId, next))) {
      // Only a real switch from public to private can leave copies behind.
      // https://github.com/Brevilabs/obsidian-copilot-private/issues/707
      setShowCopyNotice(previous === "anyone" && next === "invited");
    }
  };

  const copyLink = async (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      await event.currentTarget.win.navigator.clipboard.writeText(state?.url ?? docUrl ?? "");
      setCopyMessage("Copied");
    } catch {
      setCopyMessage(t("Could not copy the link", "无法复制链接"));
    }
  };

  const openPage = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const win = event.currentTarget.win;
    try {
      win.open(await access.open(docId), "_blank", "noopener,noreferrer");
    } catch (caught) {
      setError({
        message: errorText(caught),
        upgradeUrl: caught instanceof OpenArtifactsClientError ? caught.upgradeUrl : undefined,
      });
    }
  };

  return (
    <div className="tw-flex tw-flex-col tw-gap-3">
      {error && (
        <p className="tw-m-0 tw-text-error" role="alert">
          {error.message}
          {error.upgradeUrl && (
            <>
              {" "}
              <a href={error.upgradeUrl} target="_blank" rel="noopener noreferrer">
                {t("Upgrade", "升级")}
              </a>
            </>
          )}
        </p>
      )}
      {unavailable && <p className="tw-m-0 tw-text-small tw-text-muted">{unavailable}</p>}
      {state && !unavailable && (
        <>
          <div className="tw-flex tw-flex-col tw-gap-1">
            <div className="tw-text-small tw-text-muted">{t("Link access", "链接访问权限")}</div>
            <SegmentedControl
              aria-label={t("Link access", "链接访问权限")}
              className="tw-self-start"
              options={LINK_ACCESS_OPTIONS}
              value={state.linkAccess}
              disabled={busy}
              onChange={(next) => void switchLinkAccess(next)}
            />
            {showCopyNotice && <p className="tw-m-0 tw-text-small tw-text-muted">{COPY_NOTICE}</p>}
          </div>
        </>
      )}
      {showLinkActions && (
        <div className="tw-flex tw-items-center tw-justify-end tw-gap-2">
          {copyMessage && <span className="tw-text-small tw-text-muted">{copyMessage}</span>}
          <Button variant="secondary" onClick={safeAsyncHandler(copyLink)}>
            {t("Copy link", "复制链接")}
          </Button>
          <Button variant="secondary" onClick={safeAsyncHandler(openPage)}>
            {t("Open", "打开")}
          </Button>
        </div>
      )}
    </div>
  );
}

export function OpenArtifactsModalContent({
  fileName,
  docId,
  docUrl,
  initialResult,
  access,
  onConfirm,
  onClose,
}: OpenArtifactsModalContentProps) {
  const [confirmationAction, setConfirmationAction] = useState<OpenArtifactsAction | null>(
    docId ? null : "publish"
  );
  const [result, setResult] = useState<OpenArtifactsModalResult | null>(initialResult ?? null);
  const [linkAccess, setLinkAccess] = useState<OpenArtifactsLinkAccess>("anyone");
  const [workingAction, setWorkingAction] = useState<OpenArtifactsAction | null>(null);
  const working = workingAction !== null;

  const runAction = async (nextAction: OpenArtifactsAction, ownerDocument: Document) => {
    setWorkingAction(nextAction);
    try {
      setResult(await onConfirm(nextAction, ownerDocument, linkAccess));
    } finally {
      setWorkingAction(null);
    }
  };

  const retry = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (result?.kind === "failure") {
      void runAction(result.action, event.currentTarget.doc);
    }
  };

  const retrySave = async () => {
    if (result?.kind !== "persistence" || !result.retrySave) {
      return;
    }
    setWorkingAction(result.action);
    try {
      setResult(await result.retrySave());
    } finally {
      setWorkingAction(null);
    }
  };

  if (result?.kind === "success") {
    const closeButton = (
      <Button variant="secondary" onClick={onClose}>
        {t("Close", "关闭")}
      </Button>
    );
    return (
      <div className="tw-flex tw-flex-col tw-gap-4">
        <div className="tw-font-semibold tw-text-normal">
          {result.action === "delete"
            ? t("Removed from OpenArtifacts", "已从 OpenArtifacts 移除")
            : `${actionLabel(result.action)} complete`}
        </div>
        {result.receipt ? (
          <OpenArtifactsReceiptView
            receipt={result.receipt}
            access={access}
            actions={closeButton}
          />
        ) : (
          <div className="tw-flex tw-justify-end">{closeButton}</div>
        )}
        {result.receipt && result.action !== "delete" && access && (
          <AccessPanel docId={result.receipt.docId} access={access} showLinkActions={false} />
        )}
      </div>
    );
  }

  if (result?.kind === "failure") {
    return (
      <div className="tw-flex tw-flex-col tw-gap-4" role="alert">
        <div className="tw-font-semibold tw-text-normal">
          {result.accessNotice
            ? t("OpenArtifacts access required", "需要 OpenArtifacts 访问权限")
            : `${actionLabel(result.action)} failed`}
        </div>
        <p className="tw-m-0 tw-text-muted">{result.message}</p>
        <div className="tw-flex tw-justify-end tw-gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t("Close", "关闭")}
          </Button>
          {/* The upgrade is the screen's one way forward, so it is the primary action. https://github.com/Brevilabs/obsidian-copilot-private/issues/746 */}
          {result.upgradeUrl && (
            <Button asChild>
              <a href={result.upgradeUrl} target="_blank" rel="noopener noreferrer">
                {t("Upgrade to Copilot Plus", "升级到 Copilot Plus")}
              </a>
            </Button>
          )}
          {result.retryable && (
            <Button onClick={retry} disabled={working}>
              {working ? "Retrying…" : "Retry"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (result?.kind === "persistence") {
    const actions = (
      <>
        <Button variant="secondary" onClick={onClose}>
          {t("Close", "关闭")}
        </Button>
        {result.retrySave && (
          <Button onClick={() => void retrySave()} disabled={working}>
            {working ? "Saving…" : t("Retry save", "重新保存")}
          </Button>
        )}
      </>
    );
    return (
      <div className="tw-flex tw-flex-col tw-gap-4" role="alert">
        <div className="tw-font-semibold tw-text-normal">
          {result.action === "publish"
            ? "Published, but not saved to the note"
            : result.action === "update"
              ? t("Page updated; note identity not verified", "页面已更新；笔记身份未验证")
              : t("Page withdrawn; note unchanged", "页面已撤回；笔记未更改")}
        </div>
        <p className="tw-m-0 tw-text-muted">{result.message}</p>
        {result.receipt ? (
          <OpenArtifactsReceiptView receipt={result.receipt} access={access} actions={actions} />
        ) : (
          <div className="tw-flex tw-justify-end tw-gap-2">{actions}</div>
        )}
      </div>
    );
  }

  const heading = confirmationAction
    ? `${actionLabel(confirmationAction)} “${fileName}”?`
    : `Manage “${fileName}”`;
  const description =
    confirmationAction === "delete"
      ? t(
          "Yes withdraws the link and deletes OpenArtifacts’s stored copy. Previously fetched or cached copies cannot be recalled.",
          "确认后将撤回链接并删除 OpenArtifacts 存储的副本。此前已获取或缓存的副本无法收回。"
        )
      : confirmationAction === "update"
        ? t(
            "Yes replaces the current page with this note’s latest content.",
            "确认后将使用此笔记的最新内容替换当前页面。"
          )
        : confirmationAction === "publish"
          ? linkAccess === "invited"
            ? t(
                "Yes publishes this note privately. Only people you invite can open it.",
                "确认后将以私密方式发布此笔记，仅受邀者可访问。"
              )
            : t(
                "Yes makes this note available to anyone with the public link.",
                "确认后，任何获得公开链接的人都可访问此笔记。"
              )
          : t(
              "Choose whether to replace the current page or withdraw it.",
              "请选择替换当前页面或将其撤回。"
            );

  return (
    <div className="tw-flex tw-flex-col tw-gap-4">
      <div>
        <div className="tw-font-semibold tw-text-normal">{heading}</div>
        <p className="tw-mb-0 tw-mt-2 tw-text-muted">{description}</p>
      </div>

      {confirmationAction === "publish" && (
        <SegmentedControl
          aria-label={t("Link access", "链接访问权限")}
          className="tw-self-start"
          options={LINK_ACCESS_OPTIONS}
          value={linkAccess}
          disabled={working}
          onChange={(next) => setLinkAccess(next)}
        />
      )}
      {!confirmationAction && docId && access && (
        <AccessPanel docId={docId} docUrl={docUrl} access={access} />
      )}

      <div
        className="tw-flex tw-flex-wrap tw-justify-end tw-gap-2"
        aria-label={t("OpenArtifacts actions", "OpenArtifacts 操作")}
      >
        {confirmationAction ? (
          <>
            <Button variant="secondary" onClick={onClose} disabled={working}>
              {t("No, cancel", "不，取消")}
            </Button>
            <Button
              variant={confirmationAction === "delete" ? "destructive" : "default"}
              onClick={(event) => void runAction(confirmationAction, event.currentTarget.doc)}
              disabled={working}
            >
              {working ? WORKING_LABELS[confirmationAction] : `Yes, ${confirmationAction}`}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              {t("Cancel", "取消")}
            </Button>
            <Button onClick={() => setConfirmationAction("update")}>{t("Update", "更新")}</Button>
            <Button variant="destructive" onClick={() => setConfirmationAction("delete")}>
              {t("Delete", "删除")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export class OpenArtifactsModal extends Modal {
  private root: Root | null = null;

  constructor(
    app: App,
    private readonly options: OpenArtifactsModalOptions
  ) {
    super(app);
    this.modalEl.classList.add("copilot-openartifacts-modal");
    this.titleEl.setText(t("Share with OpenArtifacts", "通过 OpenArtifacts 分享"));
  }

  onOpen(): void {
    this.contentEl.empty();
    this.root = createPluginRoot(this.contentEl, this.app);
    this.root.render(<OpenArtifactsModalContent {...this.options} onClose={() => this.close()} />);
  }

  onClose(): void {
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
    this.options.onClosed?.();
  }
}
