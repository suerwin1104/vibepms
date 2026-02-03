
import { GoogleGenAI } from "@google/genai";

// Antigravity 自動注入 process.env.API_KEY
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeGuestPreferences = async (preferences: string, history: string) => {
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一位資深飯店禮賓主管。請根據以下賓客偏好與歷史紀錄，提供 100 字以內的關鍵服務建議（繁體中文）：
      
      賓客偏好: ${preferences}
      歷史紀錄: ${history}`,
      config: {
        systemInstruction: "你是一個專業的飯店管理 AI 助手，請用專業且溫暖的口吻提供建議。",
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "無法生成 AI 分析，請手動查閱備註。";
  }
};

export const suggestPricing = async (currentOccupancy: number, weather: string) => {
  const response = await genAI.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `目前住房率為 ${currentOccupancy}%，天氣狀況為 ${weather}。請給出動態房價建議。`,
  });
  return response.text;
};
