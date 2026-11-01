import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import type {
  RelevantNotesSearchStatus,
  RelevantNotesStatusDetails,
} from "@/miyo/findRelevantNotes";
import { Download, Loader2 } from "lucide-react";
import React from "react";

type RelevantNotesPaneStatus = RelevantNotesSearchStatus | "idle" | "loading";

interface RelevantNotesIndexingReviewAction {
  destination: "miyo" | "settings";
  onSelect: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface RelevantNotesPaneActions {
  miyoDownloadUrl: string;
  onOpenMiyoSettings: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onRefresh: () => void;
  reviewIndexing: RelevantNotesIndexingReviewAction;
}

export interface RelevantNotesPaneProps {
  status: RelevantNotesPaneStatus;
  details?: RelevantNotesStatusDetails;
  noteRows: readonly React.ReactNode[];
  actions: RelevantNotesPaneActions;
}

interface GuidancePanelProps {
  id:
    | "download"
    | "unavailable"
    | "vault-not-registered"
    | "no-matches"
    | "no-text"
    | "indexing"
    | "index-error"
    | "excluded"
    | "no-usable-context"
    | "request-too-large"
    | "request-error"
    | "not-indexed";
  title: string;
  description: string;
  children?: React.ReactNode;
}

function GuidancePanel({
  id,
  title,
  description,
  children,
}: GuidancePanelProps): React.ReactElement {
  return (
    <div className="tw-flex tw-w-full tw-justify-center">
      <div
        data-miyo-guidance={id}
        className="tw-flex tw-w-full tw-max-w-xs tw-flex-col tw-items-start tw-gap-3 tw-rounded-lg tw-border tw-border-solid tw-border-border tw-bg-secondary tw-p-5 tw-text-left"
      >
        <div className="tw-flex tw-flex-col tw-gap-1">
          <span className="tw-text-sm tw-font-semibold tw-text-normal">{title}</span>
          <span className="tw-text-xs tw-leading-normal tw-text-muted">{description}</span>
        </div>
        {children && (
          <div className="tw-flex tw-flex-wrap tw-justify-start tw-gap-2">{children}</div>
        )}
      </div>
    </div>
  );
}

export function RelevantNotesPane({
  status,
  details,
  noteRows,
  actions,
}: RelevantNotesPaneProps): React.ReactElement {
  if (status === "loading") {
    return (
      <div className="tw-flex tw-h-full tw-items-center tw-justify-center tw-gap-2 tw-text-sm tw-text-normal">
        <Loader2 className="tw-size-4 tw-animate-spin" />
        {t("Finding relevant notes…", "正在查找相关笔记…")}
      </div>
    );
  }

  // Only a successful match renders rows, even if a stale caller supplies them.
  // https://github.com/Brevilabs/obsidian-copilot-private/issues/280
  let guidancePanel: React.ReactNode = null;
  switch (status) {
    case "no-usable-context":
      guidancePanel = (
        <GuidancePanel
          id="no-usable-context"
          title={t("No usable chat context", "没有可用的聊天上下文")}
          description={t(
            "The attachments aren't available in Miyo. Write a message or add an indexed note to find related notes.",
            "Miyo 无法使用这些附件。请输入消息或添加已索引的笔记，以查找相关笔记。"
          )}
        />
      );
      break;
    case "request-too-large":
      guidancePanel = (
        <GuidancePanel
          id="request-too-large"
          title={t("Chat context is too large", "聊天上下文过大")}
          description={t(
            "Miyo couldn't accept this request. Remove some attached context or try a shorter conversation.",
            "Miyo 无法接受此请求。请移除部分附加上下文，或缩短对话。"
          )}
        />
      );
      break;
    case "request-error":
      guidancePanel = (
        <GuidancePanel
          id="request-error"
          title={t("Miyo couldn't use this chat context", "Miyo 无法使用此聊天上下文")}
          description={t(
            "Check that this vault is registered in Miyo, then try again.",
            "请确认此仓库已在 Miyo 中注册，然后重试。"
          )}
        >
          <Button variant="default" size="sm" onClick={actions.onOpenMiyoSettings}>
            {t("Open Miyo settings", "打开 Miyo 设置")}
          </Button>
        </GuidancePanel>
      );
      break;
    case "disabled":
      guidancePanel = (
        <GuidancePanel
          id="download"
          title={t("Add semantic matches with Miyo", "使用 Miyo 添加语义匹配结果")}
          description={t(
            "Download Miyo, then connect it in Copilot settings to find related notes.",
            "下载 Miyo 并在 Copilot 设置中连接，即可查找相关笔记。"
          )}
        >
          <Button asChild variant="secondary" size="sm">
            <a href={actions.miyoDownloadUrl} target="_blank" rel="noopener noreferrer">
              <Download className="tw-size-3.5" />
              {t("Download Miyo", "下载 Miyo")}
            </a>
          </Button>
          <Button variant="default" size="sm" onClick={actions.onOpenMiyoSettings}>
            {t("Set up in Copilot", "在 Copilot 中配置")}
          </Button>
        </GuidancePanel>
      );
      break;
    case "vault-not-registered": {
      const reviewInMiyo = actions.reviewIndexing.destination === "miyo";
      const vaultLabel = details?.folderName
        ? `“${details.folderName}”`
        : t("This vault", "此仓库");
      guidancePanel = (
        <GuidancePanel
          id="vault-not-registered"
          title={t("This vault isn't registered in Miyo", "此仓库尚未在 Miyo 中注册")}
          description={
            reviewInMiyo
              ? `Miyo is connected, but ${vaultLabel} isn't registered. Add this vault in Miyo to find relevant notes.`
              : `Miyo is connected, but ${vaultLabel} isn't registered. Add this vault in Miyo on the host machine.`
          }
        >
          <Button variant="secondary" size="sm" onClick={actions.reviewIndexing.onSelect}>
            {reviewInMiyo
              ? t("Open folder settings in Miyo", "在 Miyo 中打开文件夹设置")
              : t("Review Miyo connection", "检查 Miyo 连接")}
          </Button>
        </GuidancePanel>
      );
      break;
    }
    case "unavailable":
      guidancePanel = (
        <GuidancePanel
          id="unavailable"
          title={t("Miyo is not connected", "Miyo 未连接")}
          description={t(
            "Make sure Miyo is running and this vault is registered.",
            "请确认 Miyo 正在运行，且此仓库已注册。"
          )}
        >
          <Button variant="default" size="sm" onClick={actions.onOpenMiyoSettings}>
            {t("Open Miyo settings", "打开 Miyo 设置")}
          </Button>
        </GuidancePanel>
      );
      break;
    case "no-matches":
      guidancePanel = (
        <GuidancePanel
          id="no-matches"
          title={t("No semantic matches yet", "暂无语义匹配结果")}
          description={t(
            "Miyo is connected, but no related notes were found.",
            "Miyo 已连接，但未找到相关笔记。"
          )}
        />
      );
      break;
    case "no-text":
      guidancePanel = (
        <GuidancePanel
          id="no-text"
          title={t("Miyo found no text in this note", "Miyo 未在此笔记中找到文本")}
          description={t(
            "The note may be empty or contain only content Miyo can't read.",
            "笔记可能为空，或只包含 Miyo 无法读取的内容。"
          )}
        >
          <Button variant="default" size="sm" onClick={actions.onRefresh}>
            {t("Refresh", "刷新")}
          </Button>
        </GuidancePanel>
      );
      break;
    case "indexing":
      guidancePanel = (
        <GuidancePanel
          id="indexing"
          title={t("Miyo is still indexing this note", "Miyo 仍在为此笔记建立索引")}
          description={t(
            "Miyo hasn't finished processing this note. Try again shortly.",
            "Miyo 尚未处理完此笔记，请稍后重试。"
          )}
        >
          <Button variant="default" size="sm" onClick={actions.onRefresh}>
            {t("Refresh", "刷新")}
          </Button>
        </GuidancePanel>
      );
      break;
    case "index-error": {
      const reviewInMiyo = actions.reviewIndexing.destination === "miyo";
      const errorMessage =
        details?.errorMessage?.trim() ||
        t("Miyo reported an error while processing this note.", "Miyo 处理此笔记时报告了错误。");
      guidancePanel = (
        <GuidancePanel
          id="index-error"
          title={t("Miyo couldn't index this note", "Miyo 无法为此笔记建立索引")}
          description={
            reviewInMiyo
              ? errorMessage
              : `${errorMessage} Review the folder in Miyo on the host machine.`
          }
        >
          {reviewInMiyo && (
            <Button variant="default" size="sm" onClick={actions.reviewIndexing.onSelect}>
              {t("Open Miyo", "打开 Miyo")}
            </Button>
          )}
        </GuidancePanel>
      );
      break;
    }
    case "excluded": {
      const reviewInMiyo = actions.reviewIndexing.destination === "miyo";
      let reason: string;
      switch (details?.exclusionReason) {
        case "exclude_folder":
          reason = details.exclusionRule
            ? `Excluded by folder ${details.exclusionRule}.`
            : t("Excluded by a folder filter.", "已被文件夹筛选规则排除。");
          break;
        case "exclude_pattern":
          reason = details.exclusionRule
            ? `Excluded by pattern ${details.exclusionRule}.`
            : t("Excluded by a pattern filter.", "已被模式筛选规则排除。");
          break;
        case "include_folder":
          reason = details.exclusionRule
            ? `Not included by folder ${details.exclusionRule}.`
            : t("Not included by the folder filters.", "未被文件夹筛选规则包含。");
          break;
        case "include_pattern":
          reason = details.exclusionRule
            ? `Not included by pattern ${details.exclusionRule}.`
            : t("Not included by the pattern filters.", "未被模式筛选规则包含。");
          break;
        case "extension":
          reason = t(
            "This file type isn't included in Miyo's folder settings.",
            "Miyo 的文件夹设置未包含此文件类型。"
          );
          break;
        case "hidden":
          reason = t("Miyo excludes hidden files.", "Miyo 会排除隐藏文件。");
          break;
        default:
          reason = "Miyo's folder filters exclude this note.";
      }
      guidancePanel = (
        <GuidancePanel
          id="excluded"
          title={t("This note is excluded in Miyo", "此笔记已在 Miyo 中排除")}
          description={
            reviewInMiyo
              ? reason
              : `${reason} Adjust this folder's filters in Miyo on the host machine.`
          }
        >
          {reviewInMiyo && (
            <Button variant="default" size="sm" onClick={actions.reviewIndexing.onSelect}>
              {t("Open folder settings in Miyo", "在 Miyo 中打开文件夹设置")}
            </Button>
          )}
        </GuidancePanel>
      );
      break;
    }
    case "not-indexed": {
      const reviewInMiyo = actions.reviewIndexing.destination === "miyo";
      guidancePanel = (
        <GuidancePanel
          id="not-indexed"
          title={t("This note isn't indexed in Miyo", "此笔记尚未在 Miyo 中建立索引")}
          description={t(
            "It may still be indexing or be excluded from Miyo. Update Miyo to the latest version to see why.",
            "可能仍在建立索引，或已被 Miyo 排除。请将 Miyo 更新至最新版以查看原因。"
          )}
        >
          <Button variant="secondary" size="sm" onClick={actions.onRefresh}>
            {t("Refresh", "刷新")}
          </Button>
          <Button variant="default" size="sm" onClick={actions.reviewIndexing.onSelect}>
            {reviewInMiyo
              ? t("Open Miyo", "打开 Miyo")
              : t("Review Miyo connection", "检查 Miyo 连接")}
          </Button>
        </GuidancePanel>
      );
      break;
    }
    case "matches":
    case "idle":
      break;
  }

  const notices = !!details?.skippedAttachments && (
    <p role="status" className="tw-m-0 tw-p-2 tw-text-xs tw-text-muted">
      {t("Skipped attachments:", "已跳过的附件：")} {details.skippedAttachments}
      {t(". They aren't available for this request.", "。这些附件无法用于本次请求。")}
    </p>
  );

  return (
    <div className="tw-flex tw-h-full tw-flex-col tw-gap-0.5">
      {notices}
      {status !== "matches" || noteRows.length === 0 ? (
        <div
          data-relevant-notes-empty-state
          className="tw-flex tw-flex-1 tw-items-center tw-justify-center tw-px-4"
        >
          {guidancePanel ?? (
            <span className="tw-text-sm tw-text-muted">
              {t("No relevant notes found", "未找到相关笔记")}
            </span>
          )}
        </div>
      ) : (
        noteRows
      )}
    </div>
  );
}
