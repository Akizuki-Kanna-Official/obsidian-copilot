import { t } from "@/lib/i18n";
const LANDING_GREETINGS: readonly string[] = Object.freeze([
  t("What can I help with?", "需要我帮些什么？"),
  t("Where should we start?", "我们从哪里开始？"),
  t("What's on your mind?", "你在想些什么？"),
  t("What are you working on?", "你正在忙些什么？"),
  t("How can I help today?", "今天有什么可以帮你的？"),
  t("Ready when you are.", "准备好就开始吧。"),
  t("What would you like to explore?", "你想探索什么？"),
  t("Let's pick up where you left off.", "我们接着上次的内容继续吧。"),
  t("What can I do for you?", "有什么可以帮你的？"),
  t("Got something to capture?", "有什么想记录的吗？"),
  t("What's next on your list?", "接下来要做什么？"),
  t("Where to begin?", "从哪里开始呢？"),
  t("What shall we dig into?", "我们来深入探索什么？"),
  t("Ask me anything.", "有什么问题都可以问我。"),
]);

export function pickRandomGreeting(): string {
  const index = Math.floor(Math.random() * LANDING_GREETINGS.length);
  return LANDING_GREETINGS[index];
}
