import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ProductRecommendation {
  productIds: string[];
  reasoning: string;
}

export interface ChatResponse {
  message: string;
  productSuggestions?: string[];
}

export async function getProductRecommendations(
  userPreferences: {
    budget?: number;
    category?: string;
    livingSpace?: string;
    familySize?: number;
    previousRentals?: string[];
  }
): Promise<ProductRecommendation> {
  try {
    const prompt = `당신은 한국의 가전제품 렌탈 서비스 AI 상담사입니다. 
사용자 정보를 바탕으로 최적의 가전제품을 추천해주세요.

사용자 정보:
- 예산: ${userPreferences.budget || '제한없음'}원/월
- 관심 카테고리: ${userPreferences.category || '전체'}
- 거주 공간: ${userPreferences.livingSpace || '미정'}
- 가족 구성원: ${userPreferences.familySize || '미정'}명
- 이전 렌탈 이력: ${userPreferences.previousRentals?.join(', ') || '없음'}

위 정보를 바탕으로 적합한 제품들을 추천하고 그 이유를 설명해주세요.
응답은 JSON 형식으로 해주세요.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            productIds: { 
              type: "array", 
              items: { type: "string" }
            },
            reasoning: { type: "string" },
          },
          required: ["productIds", "reasoning"],
        },
      },
      contents: prompt,
    });

    const rawJson = response.text;
    if (rawJson) {
      const data: ProductRecommendation = JSON.parse(rawJson);
      return data;
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error) {
    console.error("Error getting product recommendations:", error);
    return {
      productIds: [],
      reasoning: "추천 시스템에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
    };
  }
}

export async function processChatMessage(
  message: string,
  context: {
    availableProducts?: any[];
    userHistory?: any[];
  }
): Promise<ChatResponse> {
  try {
    const prompt = `당신은 한국의 가전제품 렌탈 서비스 AI 상담사입니다.
사용자의 질문에 친근하고 전문적으로 답변해주세요.

사용자 메시지: "${message}"

다음 사항을 고려해서 답변해주세요:
1. 가전제품 추천이 필요한 경우, 구체적인 제품을 제안해주세요
2. 렌탈 관련 질문에는 정확한 정보를 제공해주세요
3. 친근하고 도움이 되는 톤으로 답변해주세요
4. 한국어로 답변해주세요

응답은 JSON 형식으로 해주세요.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            message: { type: "string" },
            productSuggestions: { 
              type: "array", 
              items: { type: "string" }
            },
          },
          required: ["message"],
        },
      },
      contents: prompt,
    });

    const rawJson = response.text;
    if (rawJson) {
      const data: ChatResponse = JSON.parse(rawJson);
      return data;
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error) {
    console.error("Error processing chat message:", error);
    return {
      message: "죄송합니다. 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      productSuggestions: []
    };
  }
}
