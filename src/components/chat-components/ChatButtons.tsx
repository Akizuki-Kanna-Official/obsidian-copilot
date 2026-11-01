import { t } from "@/lib/i18n";
import { CopyButton } from "@/components/chat-components/CopyButton";
import { MessageActionButton } from "@/components/chat-components/MessageActionButton";
import { USER_SENDER } from "@/constants";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/types/message";
import { cleanMessageForCopy } from "@/utils";
import { LibraryBig, PenSquare, RotateCw, TextCursorInput, Trash2 } from "lucide-react";
import { Platform } from "obsidian";
import React from "react";

interface ChatButtonsProps {
  message: ChatMessage;
  onInsertIntoEditor?: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShowSources?: () => void;
  hasSources: boolean;
}

export const ChatButtons: React.FC<ChatButtonsProps> = ({
  message,
  onInsertIntoEditor,
  onRegenerate,
  onEdit,
  onDelete,
  onShowSources,
  hasSources,
}) => {
  return (
    <div
      className={cn("tw-flex tw-gap-1", {
        "group-hover:opacity-100 opacity-0": !Platform.isMobile,
      })}
    >
      {message.sender === USER_SENDER ? (
        <>
          <CopyButton text={cleanMessageForCopy(message.message)} />
          {onEdit && (
            <MessageActionButton label={t("Edit", "编辑")} icon={PenSquare} onClick={onEdit} />
          )}
          {onDelete && (
            <MessageActionButton label={t("Delete", "删除")} icon={Trash2} onClick={onDelete} />
          )}
        </>
      ) : (
        <>
          {hasSources && (
            <MessageActionButton
              label={t("Show sources", "显示来源")}
              icon={LibraryBig}
              onClick={onShowSources}
            />
          )}
          <MessageActionButton
            label={t("Insert / Replace at cursor", "在光标处插入 / 替换")}
            icon={TextCursorInput}
            onClick={onInsertIntoEditor}
          />
          <CopyButton text={cleanMessageForCopy(message.message)} />
          {onRegenerate && (
            <MessageActionButton
              label={t("Regenerate", "重新生成")}
              icon={RotateCw}
              onClick={onRegenerate}
            />
          )}
          {onDelete && (
            <MessageActionButton label={t("Delete", "删除")} icon={Trash2} onClick={onDelete} />
          )}
        </>
      )}
    </div>
  );
};
