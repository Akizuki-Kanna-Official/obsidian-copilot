import { t } from "@/lib/i18n";
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Notice } from "obsidian";
import { Send, Square, X, MessageSquareX } from "lucide-react";
import { useDraggable } from "@/hooks/use-draggable";
import type { ResizeDirection } from "@/hooks/use-resizable";
import { useSettingsValue, updateSetting } from "@/settings/model";
import { cleanMessageForCopy } from "@/utils";
import { ModelSelector } from "@/components/ui/ModelSelector";
import { useChatModelPicker } from "@/components/chat-components/useChatModelPicker";
import { Checkbox } from "@/components/ui/checkbox";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { useQuickAskSession } from "./useQuickAskSession";
import { QuickAskMessageComponent } from "./QuickAskMessage";
import { QuickAskInput } from "./QuickAskInput";
import type { QuickAskPanelProps } from "./types";
import type { ReplaceInvalidReason } from "@/editor/replaceGuard";
import { Button } from "@/components/ui/button";
import { safeAsyncHandler } from "@/utils/safeAsyncHandler";

export function QuickAskPanel({
  plugin,
  view,
  selectedText,
  replaceGuard,
  onClose,
  onDragOffset,
  onResizeStart,
  hasCustomHeight,
}: QuickAskPanelProps) {
  const [inputText, setInputText] = useState("");
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isChatPinnedToBottomRef = useRef(true);

  const currentActiveFile = plugin.app.workspace.getActiveFile();
  const filePathSnapshotRef = useRef<string | null>(currentActiveFile?.path ?? null);
  const filePathSnapshot = filePathSnapshotRef.current;

  const settings = useSettingsValue();
  const [selectedModelKey, setSelectedModelKey] = useState(settings.quickCommandModelKey);
  const [includeNoteContext, setIncludeNoteContext] = useState(
    () => settings.quickCommandIncludeNoteContext
  );

  const { hasModel, messages, isStreaming, sendMessage, stop, clear } = useQuickAskSession({
    selectedText,
    selectedModelKey,
    includeNoteContext,
  });

  const hasMessages = messages.length > 0;
  const selectionRange = replaceGuard.getRange();
  const hasSelection = !!selectionRange && selectionRange.from !== selectionRange.to;

  const lastMessageId = messages[messages.length - 1]?.id;
  const lastAssistantIdx = useMemo(() => {
    return messages.reduce((lastIdx, m, i) => (m.role === "assistant" ? i : lastIdx), -1);
  }, [messages]);

  const getCurrentPanelPosition = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect ? { x: rect.left, y: rect.top } : { x: 0, y: 0 };
  }, []);

  const handleDragPositionChange = useCallback(
    (pos: { x: number; y: number }) => {
      onDragOffset?.(pos);
    },
    [onDragOffset]
  );

  const { handleMouseDown: handleDragMouseDown } = useDraggable({
    dragRef: containerRef,
    bounds: null,
    writeToDom: false,
    getPosition: getCurrentPanelPosition,
    onPositionChange: handleDragPositionChange,
  });

  const handleResizeMouseDown = useCallback(
    (direction: ResizeDirection) =>
      (e: React.MouseEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        onResizeStart?.(direction, { x: e.clientX, y: e.clientY });
      },
    [onResizeStart]
  );

  const handleSubmit = useCallback(async () => {
    if (!inputText.trim() || isStreaming) return;
    // Keep the draft until a model is selected. https://github.com/Brevilabs/obsidian-copilot-private/issues/616
    if (!hasModel) {
      new Notice(t("Select a model to continue.", "请选择模型以继续。"));
      return;
    }
    const text = inputText;
    setInputText("");
    await sendMessage(text);
  }, [inputText, isStreaming, sendMessage, hasModel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  const handleStopPropagation = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  useEffect(() => {
    const el = chatAreaRef.current;
    if (!el) return;

    const thresholdPx = 24;

    const isAtBottom = (): boolean => {
      return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
    };

    const handleScroll = () => {
      isChatPinnedToBottomRef.current = isAtBottom();
    };

    isChatPinnedToBottomRef.current = isAtBottom();
    el.addEventListener("scroll", handleScroll);

    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, [hasMessages]);

  useEffect(() => {
    const el = chatAreaRef.current;
    if (!el) return;
    if (!isChatPinnedToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleCopy = useCallback(
    async (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (message && message.role === "assistant") {
        const cleaned = cleanMessageForCopy(message.content);
        try {
          await navigator.clipboard.writeText(cleaned);
          new Notice(t("Copied to clipboard", "已复制到剪贴板"));
        } catch {
          new Notice(t("Failed to copy to clipboard", "复制到剪贴板失败"));
        }
      }
    },
    [messages]
  );

  const handleInsert = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (!message || message.role !== "assistant") return;

      try {
        const cleaned = cleanMessageForCopy(message.content);
        const insertPos = view.state.selection.main.to;

        const insertText = view.state.toText(cleaned);

        view.dispatch({
          changes: { from: insertPos, to: insertPos, insert: insertText },
          selection: { anchor: insertPos, head: insertPos + insertText.length },
        });
        view.focus();

        new Notice("Inserted");
        onClose();
      } catch {
        new Notice(
          t("Failed to insert. Editor may have changed.", "插入失败，编辑器内容可能已更改。")
        );
      }
    },
    [messages, view, onClose]
  );

  const handleReplace = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (!message || message.role !== "assistant") return;

      const cleaned = cleanMessageForCopy(message.content);
      const result = replaceGuard.replace(cleaned);

      if (!result.ok) {
        new Notice(result.message ?? t("Cannot replace.", "无法替换。"));
        return;
      }

      new Notice("Replaced");
      onClose();
    },
    [messages, replaceGuard, onClose]
  );

  const chatPicker = useChatModelPicker({
    value: selectedModelKey,
    onChange: setSelectedModelKey,
    fallbackToFirst: false,
  });

  const handleIncludeNoteContextChange = useCallback((checked: boolean) => {
    setIncludeNoteContext(checked);
    updateSetting("quickCommandIncludeNoteContext", checked);
  }, []);

  const replaceValidation = hasSelection && !isStreaming ? replaceGuard.validate() : null;
  const selectionValid = !!replaceValidation?.ok;
  const replaceInvalidReason: ReplaceInvalidReason | null = replaceValidation?.reason ?? null;
  const isDisabledDueToStreaming = hasSelection && isStreaming;

  return (
    <div
      ref={containerRef}
      className={`tw-group tw-relative tw-flex tw-size-full tw-flex-col tw-rounded-lg tw-rounded-b-none tw-border tw-border-solid tw-border-border tw-bg-primary tw-shadow-lg${
        hasMessages && !hasCustomHeight ? " tw-max-h-[min(500px,70vh)]" : ""
      }`}
      onKeyDown={handleKeyDown}
      onKeyUp={handleStopPropagation}
      onBeforeInput={handleStopPropagation}
      onInput={handleStopPropagation}
      onMouseDown={handleStopPropagation}
      onMouseUp={handleStopPropagation}
      onClick={handleStopPropagation}
    >
      <div className="tw-relative tw-flex-none">
        <div
          className="tw-flex tw-h-4 tw-cursor-grab tw-items-center tw-justify-center hover:tw-bg-[color-mix(in_srgb,var(--background-modifier-hover)_20%,transparent)] active:tw-cursor-grabbing"
          onMouseDown={handleDragMouseDown}
        >
          <div className="tw-h-[5px] tw-w-16 tw-rounded-sm tw-bg-[color-mix(in_srgb,var(--text-muted)_40%,transparent)] hover:tw-bg-[color-mix(in_srgb,var(--text-muted)_65%,transparent)]" />
        </div>
        <Button
          className="tw-absolute tw-right-2 tw-top-1 tw-rounded tw-p-1 tw-text-normal"
          variant="ghost2"
          onClick={onClose}
          title={t("Close", "关闭")}
        >
          <X className="tw-size-4" />
        </Button>
      </div>

      {hasMessages && (
        <div
          ref={chatAreaRef}
          data-quick-ask-scroll="true"
          className="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-gap-2 tw-overflow-y-auto tw-px-3 tw-py-2"
        >
          {messages.map((msg, idx) => (
            <QuickAskMessageComponent
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && msg.id === lastMessageId && msg.role === "assistant"}
              isLastAssistantMessage={msg.role === "assistant" && idx === lastAssistantIdx}
              onCopy={safeAsyncHandler(handleCopy)}
              onInsert={handleInsert}
              onReplace={handleReplace}
              hasSelection={hasSelection}
              isReplaceValid={selectionValid}
              replaceInvalidReason={replaceInvalidReason}
              isDisabledDueToStreaming={isDisabledDueToStreaming}
              filePathSnapshot={filePathSnapshot}
              plugin={plugin}
            />
          ))}
        </div>
      )}

      {!hasMessages && hasCustomHeight && <div className="tw-flex-1" />}

      <div className="tw-px-3 tw-pb-1 tw-pt-2">
        <QuickAskInput
          value={inputText}
          onChange={setInputText}
          onSubmit={safeAsyncHandler(handleSubmit)}
          sendShortcut={settings.defaultSendShortcut}
          placeholder={isStreaming ? "Generating..." : "Ask a question... "}
          currentActiveFile={currentActiveFile}
        />
      </div>

      <div className="tw-mt-auto tw-flex tw-items-center tw-justify-between tw-gap-2 tw-border-0 tw-border-t tw-border-solid tw-border-border tw-px-3 tw-py-1.5">
        <div className="tw-flex tw-items-center tw-gap-1">
          <ModelSelector
            size="sm"
            variant="ghost"
            value={chatPicker.value}
            models={chatPicker.models}
            onChange={chatPicker.onChange}
            disabled={isStreaming}
          />

          <div className="tw-flex tw-items-center tw-gap-1.5">
            <Checkbox
              id="quickAskIncludeContext"
              checked={includeNoteContext}
              onCheckedChange={(checked) => handleIncludeNoteContextChange(!!checked)}
              className="tw-size-3.5"
              disabled={isStreaming}
            />
            <label
              htmlFor="quickAskIncludeContext"
              className="tw-cursor-pointer tw-text-xs tw-text-muted"
            >
              {t("Note", "笔记")}
            </label>
            <HelpTooltip
              content={t(
                "Include the active note's content as context",
                "将当前笔记内容作为上下文"
              )}
              side="top"
            />
          </div>
        </div>

        <div className="tw-flex tw-items-center tw-gap-1">
          {hasMessages && (
            <Button
              variant="ghost2"
              size="icon"
              className="hover:tw-bg-modifier-hover"
              onClick={clear}
              title={t("Clear conversation", "清空对话")}
            >
              <MessageSquareX className="tw-size-4" />
            </Button>
          )}

          {isStreaming ? (
            <Button
              variant="destructive"
              size="icon"
              onClick={stop}
              title={t("Stop generating", "停止生成")}
            >
              <Square className="tw-size-4" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="icon"
              onClick={safeAsyncHandler(handleSubmit)}
              disabled={!inputText.trim()}
              title={t("Send message", "发送消息")}
            >
              <Send className="tw-size-4" />
            </Button>
          )}
        </div>
      </div>

      <div
        className="tw-absolute tw-right-0 tw-top-4 tw-h-[calc(100%-16px)] tw-w-1 tw-cursor-ew-resize"
        onMouseDown={handleResizeMouseDown("right")}
      />
      <div
        className="tw-absolute tw-bottom-0 tw-left-0 tw-h-1 tw-w-full tw-cursor-ns-resize"
        onMouseDown={handleResizeMouseDown("bottom")}
      />
      <div
        className="quick-ask-resize-indicator-left tw-absolute tw-bottom-0 tw-left-0 tw-size-3 tw-cursor-nesw-resize"
        onMouseDown={handleResizeMouseDown("bottom-left")}
      />
      <div
        className="quick-ask-resize-indicator-right tw-absolute tw-bottom-0 tw-right-0 tw-z-[10] tw-size-3 tw-cursor-nwse-resize"
        onMouseDown={handleResizeMouseDown("bottom-right")}
      />
    </div>
  );
}
