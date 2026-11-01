import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SettingItem } from "@/components/ui/setting-item";
import { SettingSection } from "@/components/ui/setting-section";
import { SettingSwitch } from "@/components/ui/setting-switch";
import React from "react";

export interface DebuggingSupportSectionProps {
  debug: boolean;
  onDebugChange: (checked: boolean) => void;
  frameLogEnabled: boolean;
  onFrameLogChange: (checked: boolean) => void;
  frameLogPath: string;
  onReportIssue: () => void;
  offerFeedbackCards: boolean;
  onOfferFeedbackCardsChange: (checked: boolean) => void;
  onOpenFrameLog: React.MouseEventHandler<HTMLButtonElement>;
  onClearFrameLog: React.MouseEventHandler<HTMLButtonElement>;
}

export const DebuggingSupportSection: React.FC<DebuggingSupportSectionProps> = ({
  debug,
  onDebugChange,
  frameLogEnabled,
  onFrameLogChange,
  frameLogPath,
  onReportIssue,
  offerFeedbackCards,
  onOfferFeedbackCardsChange,
  onOpenFrameLog,
  onClearFrameLog,
}) => (
  <SettingSection label={t("Debugging & support", "调试与支持")}>
    <SettingItem
      type="custom"
      title={t("Report an issue", "报告问题")}
      description={t(
        "Walks you through collecting a screenshot and recent logs, packs them into a single zip you can review, uploads it privately, and opens a prefilled GitHub issue with the report ID already in it.",
        "引导你收集截图和近期日志，打包为可供检查的 ZIP 文件，私密上传后打开已预填报告编号的 GitHub 问题页面。"
      )}
    >
      <Button variant="default" size="sm" onClick={onReportIssue}>
        {t("Report an issue", "报告问题")}
      </Button>
    </SettingItem>

    <SettingItem
      type="switch"
      title={t("Offer feedback reports in Agent Chat", "在智能体聊天中提供反馈报告")}
      description={t(
        "When something goes wrong in Agent Chat, or a reply fails with an error, Copilot drafts a report for you to review. Nothing is sent unless you press Report.",
        "智能体聊天出错或回复失败时，Copilot 会起草报告供你检查。只有点击“报告”后才会发送。"
      )}
      checked={offerFeedbackCards}
      onCheckedChange={onOfferFeedbackCardsChange}
    />

    <SettingItem
      type="switch"
      title={t("Debug mode", "调试模式")}
      description={t(
        "Logs Copilot chat activity to the developer console (View → Toggle Developer Tools), and pre-selects the chat log when you report an issue.",
        "将 Copilot 聊天活动记录到开发者控制台（查看 → 切换开发者工具），并在报告问题时默认勾选聊天日志。"
      )}
      checked={debug}
      onCheckedChange={onDebugChange}
    />

    <SettingItem
      type="custom"
      title={t("Agent activity log", "智能体活动日志")}
      description={t(
        `Records the behind-the-scenes messages between Copilot and the agent so a report always has recent activity to attach. Stored on this device only, outside your vault (${frameLogPath}), and can include your prompts and note contents in plain text.`,
        `记录 Copilot 与智能体之间的后台消息，便于在报告中附上近期活动。仅保存在此设备上、仓库之外的位置（${frameLogPath}），可能包含明文提示词和笔记内容。`
      )}
    >
      <div className="tw-flex tw-items-center tw-gap-2">
        <SettingSwitch checked={frameLogEnabled} onCheckedChange={onFrameLogChange} />
        <Button variant="secondary" size="sm" onClick={onOpenFrameLog}>
          {t("Open", "打开")}
        </Button>
        <Button variant="secondary" size="sm" onClick={onClearFrameLog}>
          {t("Clear", "清空")}
        </Button>
      </div>
    </SettingItem>
  </SettingSection>
);
