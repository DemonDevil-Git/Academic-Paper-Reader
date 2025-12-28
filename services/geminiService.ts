
import { BilingualSentence } from "../types";

export const translatePageContent = async (text: string): Promise<BilingualSentence[]> => {
  if (!text || text.trim().length === 0) return [];

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error("Translation service currently busy");
    
    const data = await response.json();
    
    if (!data || !data[0]) throw new Error("Empty response from engine");

    // 聚合翻译结果，尝试按段落重新组合以匹配排版
    const bilingual: BilingualSentence[] = data[0]
      .filter((part: any) => part[0] && part[1])
      .map((part: any) => ({
        src: part[1].trim(),
        tgt: part[0].trim()
      }));

    return bilingual;
  } catch (error) {
    console.error("Translation logic failed:", error);
    throw new Error("翻译引擎响应超时，请重试。");
  }
};

const splitIntoSentences = (text: string): string[] => {
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g;
  const matches = text.match(sentenceRegex);
  return matches ? matches.map(s => s.trim()).filter(Boolean) : [text];
};
