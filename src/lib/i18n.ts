import { getLanguage } from "obsidian";

export function t(english: string, simplifiedChinese: string, language = getUiLanguage()): string {
  return /^(zh|zh-cn|zh-hans)$/i.test(language) ? simplifiedChinese : english;
}

export function getUiLanguage(): string {
  return getLanguage?.() ?? "en";
}
