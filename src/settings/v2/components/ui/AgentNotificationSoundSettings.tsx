import { t } from "@/lib/i18n";
import { SettingItem } from "@/components/ui/setting-item";
import React from "react";

interface NotificationSoundOption {
  label: string;
  value: string;
}

export interface AgentNotificationSoundSettingsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onSoundChange: (soundId: string) => void;
  soundId: string;
  soundOptions: ReadonlyArray<NotificationSoundOption>;
}

export const AgentNotificationSoundSettings: React.FC<AgentNotificationSoundSettingsProps> = ({
  enabled,
  onEnabledChange,
  onSoundChange,
  soundId,
  soundOptions,
}) => (
  <>
    <SettingItem
      type="switch"
      title={t("Notification", "通知音效")}
      description={t(
        "Plays a short sound when an agent finishes a turn.",
        "智能体完成一轮回复时播放短提示音。"
      )}
      checked={enabled}
      onCheckedChange={onEnabledChange}
    />
    {enabled && (
      <SettingItem
        type="select"
        title={t("Sound", "提示音")}
        description={t("Choose which sound to play.", "选择要播放的提示音。")}
        value={soundId}
        onChange={onSoundChange}
        options={[...soundOptions]}
      />
    )}
  </>
);
