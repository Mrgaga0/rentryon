import { GoogleGenAI } from "@google/genai";
import * as XLSX from 'xlsx';
import { insertProductDraftWithSpecsSchema, type InsertProductDraftWithSpecs } from "@shared/schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ProductRecommendation {
  productIds: string[];
  reasoning: string;
}

export interface ChatResponse {
  message: string;
  productSuggestions?: string[];
}

export interface ExcelParseResult {
  drafts: InsertProductDraftWithSpecs[];
  stats: {
    totalRows: number;
    successfullyParsed: number;
    errors: number;
  };
  errors: Array<{
    row: number;
    error: string;
    originalData: any;
  }>;
  mapping?: {
    source: 'ai' | 'fallback';
    confidence: number;
    columnMappings: any;
    missingEssentials: string[];
    validationErrors: string[];
  };
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

    // Safe response accessor
    const safeGetResponse = (response: any): string | null => {
      try {
        if (typeof response.text === 'string') {
          return response.text;
        } else if (typeof response.text === 'function') {
          return response.text();
        } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
          return response.candidates[0].content.parts[0].text;
        }
        return null;
      } catch (error) {
        console.error("Error accessing Gemini response:", error);
        return null;
      }
    };

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

    const rawJson = safeGetResponse(response);
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

    // Safe response accessor
    const safeGetResponse = (response: any): string | null => {
      try {
        if (typeof response.text === 'string') {
          return response.text;
        } else if (typeof response.text === 'function') {
          return response.text();
        } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
          return response.candidates[0].content.parts[0].text;
        }
        return null;
      } catch (error) {
        console.error("Error accessing Gemini response:", error);
        return null;
      }
    };

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

    const rawJson = safeGetResponse(response);
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

export async function parseProductsFromExcel(
  buffer: Buffer,
  fileName: string
): Promise<ExcelParseResult> {
  try {
    // 1. Excel 파일을 다양한 옵션으로 파싱 시도
    console.log('Trying to parse Excel with different options...');
    
    // 먼저 기본 옵션으로 시도
    let workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log('Basic parsing - SheetNames:', workbook.SheetNames, 'Sheets keys:', Object.keys(workbook.Sheets));
    
    // 시트 데이터가 없으면 다른 옵션들을 시도
    if (workbook.SheetNames.length > 0 && Object.keys(workbook.Sheets).length === 0) {
      console.log('Empty sheets detected, trying alternative parsing options...');
      
      // 옵션 1: cellStyles 활성화
      workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: true });
      console.log('With cellStyles - Sheets keys:', Object.keys(workbook.Sheets));
      
      if (Object.keys(workbook.Sheets).length === 0) {
        // 옵션 2: cellFormula, cellHTML 등 추가 옵션
        workbook = XLSX.read(buffer, { 
          type: 'buffer', 
          cellStyles: true, 
          cellFormula: true,
          cellHTML: true,
          cellDates: true
        });
        console.log('With extended options - Sheets keys:', Object.keys(workbook.Sheets));
      }
      
      if (Object.keys(workbook.Sheets).length === 0) {
        // 옵션 3: 다른 파싱 옵션 시도
        workbook = XLSX.read(buffer, { type: 'buffer', cellText: false, cellNF: true });
        console.log('With cellText/cellNF options - Sheets keys:', Object.keys(workbook.Sheets));
      }
      
      if (Object.keys(workbook.Sheets).length === 0) {
        // 옵션 4: raw 모드
        workbook = XLSX.read(buffer, { type: 'buffer', raw: true });
        console.log('With raw mode - Sheets keys:', Object.keys(workbook.Sheets));
      }
    }
    const sheetNames = workbook.SheetNames;
    console.log('Excel sheets found:', sheetNames);
    
    console.log('First sheet name:', sheetNames[0]);
    console.log('Available sheet keys in workbook.Sheets:', Object.keys(workbook.Sheets));
    console.log('Sheet names vs actual keys comparison:', {
      sheetNames: sheetNames,
      actualKeys: Object.keys(workbook.Sheets),
      areEqual: JSON.stringify(sheetNames) === JSON.stringify(Object.keys(workbook.Sheets))
    });
    
    // 다양한 방법으로 시트에 접근 시도
    let firstSheet = workbook.Sheets[sheetNames[0]];
    
    if (!firstSheet && Object.keys(workbook.Sheets).length > 0) {
      // 시트 이름 인코딩 문제일 경우 첫 번째 시트를 가져옴
      const actualFirstKey = Object.keys(workbook.Sheets)[0];
      console.log('Trying first available sheet key:', actualFirstKey);
      firstSheet = workbook.Sheets[actualFirstKey];
    }
    
    // 시트 존재 확인
    if (!firstSheet) {
      throw new Error(`Excel 시트를 찾을 수 없습니다. 요청된 시트: "${sheetNames[0]}", 사용 가능한 시트: [${Object.keys(workbook.Sheets).join(', ')}]`);
    }
    
    // 시트 범위 확인 (방어적 코드)
    const sheetRef = firstSheet['!ref'];
    console.log('Sheet ref property:', sheetRef);
    console.log('Sheet keys:', Object.keys(firstSheet).slice(0, 20)); // 디버깅용
    
    if (!sheetRef) {
      // !ref가 없는 경우, 시트가 완전히 비어있거나 다른 구조일 수 있음
      console.log('No !ref found, checking sheet contents directly...');
      const directData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
      console.log('Direct sheet data:', directData.slice(0, 3));
      
      if (directData.length === 0) {
        throw new Error('Excel 시트가 완전히 비어있습니다. 데이터를 확인해주세요.');
      }
    }
    
    // 다양한 옵션으로 JSON 변환 시도
    const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet, { 
      header: 1,
      defval: '', // 빈 셀을 빈 문자열로 처리
      blankrows: false // 빈 행 제외
    });
    
    console.log('Parsed JSON data:', {
      totalRows: jsonData.length,
      sampleRows: jsonData.slice(0, 5),
      hasData: jsonData.length >= 2,
      sheetRef: sheetRef
    });

    // 유효한 데이터 행 검사 (빈 행은 제외)
    const validRows = jsonData.filter(row => 
      row && row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '')
    );
    
    console.log('Valid rows after filtering:', validRows.length);
    
    if (validRows.length < 2) {
      throw new Error(`Excel 파일에 유효한 데이터가 충분하지 않습니다. 유효한 행 수: ${validRows.length}, 필요: 최소 2행 (헤더 + 데이터). 전체 행: ${jsonData.length}`);
    }

    // 2. 샘플 데이터 준비 (헤더 + 첫 5개 행)
    const sampleData = jsonData.slice(0, Math.min(6, jsonData.length));
    
    // 3. Gemini AI를 사용해서 컬럼 매핑 (fallback 포함)
    const headers = jsonData[0];
    let finalMapping: any;
    let confidence = 0;
    let mappingSource: 'ai' | 'fallback' = 'fallback';
    
    const mappingResult = await mapExcelColumnsWithAI(sampleData, fileName);
    
    let validationErrors: string[] = [];
    
    if (mappingResult.success && mappingResult.mapping) {
      confidence = mappingResult.confidence || 0;
      const validation = validateMapping(mappingResult.mapping);
      validationErrors = validation.errors;
      
      if (validation.isValid && confidence >= 0.7) { // 70% confidence minimum
        finalMapping = mappingResult.mapping;
        mappingSource = 'ai';
        console.log(`Using AI mapping with confidence: ${confidence}`);
      } else {
        console.warn(`AI mapping failed validation or low confidence (${confidence}). Using fallback.`);
        finalMapping = createFallbackMapping(headers);
        mappingSource = 'fallback';
      }
    } else {
      console.warn("AI mapping failed. Using deterministic fallback mapping.");
      finalMapping = createFallbackMapping(headers);
      mappingSource = 'fallback';
    }
    
    // Check for essential fields
    const essentialFields = ['nameKo', 'monthlyPrice'];
    const mappedFields = Object.values(finalMapping.columnMappings || {}).map((m: any) => m.field);
    const missingEssentials = essentialFields.filter(field => !mappedFields.includes(field));
    
    if (missingEssentials.length > 0) {
      console.warn(`Missing essential fields: ${missingEssentials.join(', ')}`);
    }

    // 4. 매핑 결과를 사용해서 모든 데이터 변환
    const results: ExcelParseResult = {
      drafts: [],
      stats: {
        totalRows: jsonData.length - 1, // 헤더 제외
        successfullyParsed: 0,
        errors: 0,
      },
      errors: [],
      mapping: {
        source: mappingSource,
        confidence,
        columnMappings: finalMapping.columnMappings,
        missingEssentials,
        validationErrors
      }
    };

    
    for (let i = 1; i < jsonData.length; i++) {
      try {
        const row = jsonData[i];
        if (!row || row.every((cell: any) => !cell)) continue; // 빈 행 스킵

        // 행 데이터를 객체로 변환
        const rowData: any = {};
        headers.forEach((header: string, index: number) => {
          if (header && row[index] !== undefined) {
            rowData[header] = row[index];
          }
        });

        // 최종 매핑 결과를 사용해서 ProductDraft 형식으로 변환
        const draftData = convertRowToDraft(rowData, finalMapping, fileName, sheetNames[0], i);
        
        // 스키마 검증
        const validatedDraft = insertProductDraftWithSpecsSchema.parse(draftData);
        
        results.drafts.push(validatedDraft);
        results.stats.successfullyParsed++;
        
      } catch (error) {
        results.stats.errors++;
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : String(error),
          originalData: jsonData[i],
        });
      }
    }

    return results;
    
  } catch (error) {
    console.error("Excel 파싱 오류:", error);
    throw new Error(`Excel 파일 파싱에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function mapExcelColumnsWithAI(
  sampleData: any[][],
  fileName: string
): Promise<{
  success: boolean;
  mapping?: any;
  confidence?: number;
  error?: string;
}> {
  try {
    // Safe Gemini response accessor with fallback
    const safeGetResponse = (response: any): string | null => {
      try {
        // Try different response access patterns based on SDK version
        if (typeof response.text === 'string') {
          return response.text;
        } else if (typeof response.text === 'function') {
          return response.text();
        } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
          return response.candidates[0].content.parts[0].text;
        }
        return null;
      } catch (error) {
        console.error("Error accessing Gemini response:", error);
        return null;
      }
    };

    // Retry logic for API calls
    const callGeminiWithRetry = async (prompt: string, maxRetries = 3): Promise<string | null> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "object",
                properties: {
                  mapping: {
                    type: "object",
                    properties: {
                      columnMappings: {
                        type: "object",
                        additionalProperties: {
                          type: "object",
                          properties: {
                            field: { type: "string" },
                            transformer: { 
                              type: "string",
                              enum: ["number", "text", "category", "price"] 
                            },
                            defaultValue: { type: "string" }
                          }
                        }
                      },
                      categoryGuess: { type: "string" },
                      brandGuess: { type: "string" }
                    }
                  },
                  confidence: { type: "number" },
                  notes: { type: "string" }
                },
                required: ["mapping", "confidence"]
              }
            },
            contents: prompt,
          });

          const responseText = safeGetResponse(response);
          if (responseText) {
            return responseText;
          }
          
          throw new Error("Empty response from Gemini");
          
        } catch (error: any) {
          console.error(`Gemini API attempt ${attempt} failed:`, error);
          
          // Check if it's a rate limit error (429) or server error (5xx)
          if (error.status === 429 || (error.status >= 500 && error.status <= 599)) {
            if (attempt < maxRetries) {
              // Exponential backoff: 1s, 2s, 4s
              const delay = Math.pow(2, attempt - 1) * 1000;
              console.log(`Waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          
          // If last attempt or non-retryable error, break
          if (attempt === maxRetries) {
            throw error;
          }
        }
      }
      return null;
    };

    const prompt = `당신은 Excel 데이터를 분석해서 제품 정보 스키마로 매핑하는 전문가입니다.

첨부된 Excel 파일 "${fileName}"의 샘플 데이터를 분석해서, 각 컬럼이 어떤 제품 정보 필드에 해당하는지 매핑해주세요.

Excel 샘플 데이터:
${JSON.stringify(sampleData, null, 2)}

매핑해야 할 제품 스키마 필드들:
- name (제품명, 영문)
- nameKo (제품명, 한글)
- brand (브랜드명)
- monthlyPrice (월 렌탈료, 숫자)
- originalPrice (정가, 숫자)  
- categoryId (카테고리)
- descriptionKo (제품 설명, 한글)
- specifications (제품 스펙 - JSON 객체로, 매핑되지 않은 필드들 포함)

중요한 지침:
1. columnMappings 객체의 키는 반드시 Excel 헤더 행의 정확한 텍스트를 사용하세요
2. transformer는 다음 중 하나만 사용: "number", "text", "category", "price"
3. 가격 관련 컬럼(월세, 렌탈료, 정가 등)은 transformer: "price" 사용
4. 일반 숫자는 transformer: "number" 사용
5. 카테고리 관련은 transformer: "category" 사용
6. 나머지는 transformer: "text" 사용

매핑 예시:
{
  "mapping": {
    "columnMappings": {
      "제품명": { "field": "nameKo", "transformer": "text" },
      "Product Name": { "field": "name", "transformer": "text" },
      "브랜드": { "field": "brand", "transformer": "text" },
      "월 렌탈료": { "field": "monthlyPrice", "transformer": "price" },
      "정가": { "field": "originalPrice", "transformer": "price" },
      "카테고리": { "field": "categoryId", "transformer": "category" },
      "설명": { "field": "descriptionKo", "transformer": "text" },
      "용량": { "field": "capacity", "transformer": "text" }
    },
    "categoryGuess": "냉장고",
    "brandGuess": "LG"
  },
  "confidence": 0.9
}

분석 지침:
1. 헤더 행의 정확한 텍스트를 키로 사용하세요
2. 데이터 패턴을 보고 의미를 파악하세요
3. 제품명으로 카테고리를 추정하세요 (냉장고, 세탁기, 에어컨, 정수기, TV, 전자레인지, 로봇청소기)
4. 브랜드명을 찾아주세요 (LG, 삼성, 코웨이, 청호나이스 등)
5. 매핑되지 않는 컬럼들은 specifications에 자동 포함됩니다`;

    // Call Gemini with retry logic
    const rawJson = await callGeminiWithRetry(prompt);
    if (rawJson) {
      const result = JSON.parse(rawJson);
      return {
        success: true,
        mapping: result.mapping,
        confidence: result.confidence || 0
      };
    } else {
      return {
        success: false,
        error: "AI 응답이 비어있습니다."
      };
    }
    
  } catch (error) {
    console.error("AI 컬럼 매핑 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Header normalization utility
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Deterministic fallback mapping when AI fails
function createFallbackMapping(headers: string[]): any {
  const fallbackMappings: any = {};
  const normalizedHeaders = headers.map(h => normalizeHeader(h));
  
  // Common patterns for Korean headers
  const patterns = {
    name: ['제품명', 'product name', '상품명', 'name'],
    nameKo: ['제품명', '상품명', '제품이름', '한글명'],
    brand: ['브랜드', 'brand', '제조사', '회사'],
    monthlyPrice: ['월세', '월 렌탈료', '렌탈료', 'monthly', '월요금'],
    originalPrice: ['정가', '원가', 'price', '가격', '판매가'],
    categoryId: ['카테고리', 'category', '분류', '종류'],
    descriptionKo: ['설명', 'description', '상세설명', '제품설명']
  };
  
  Object.entries(patterns).forEach(([field, keywords]) => {
    for (const header of headers) {
      const normalizedHeader = normalizeHeader(header);
      for (const keyword of keywords) {
        if (normalizedHeader.includes(keyword.toLowerCase())) {
          fallbackMappings[header] = {
            field,
            transformer: field.includes('Price') ? 'price' : 
                       field === 'categoryId' ? 'category' : 'text'
          };
          break;
        }
      }
    }
  });
  
  return {
    columnMappings: fallbackMappings,
    categoryGuess: '',
    brandGuess: ''
  };
}

// Validate mapping field names
function validateMapping(mapping: any): { isValid: boolean; errors: string[] } {
  const allowedFields = ['name', 'nameKo', 'brand', 'monthlyPrice', 'originalPrice', 'categoryId', 'descriptionKo', 'rating'];
  const errors: string[] = [];
  
  if (!mapping.columnMappings) {
    return { isValid: false, errors: ['Missing columnMappings'] };
  }
  
  Object.entries(mapping.columnMappings).forEach(([header, mappingInfo]: [string, any]) => {
    // Keep unknown fields as-is, convertRowToDraft will handle them
    if (mappingInfo.field && !allowedFields.includes(mappingInfo.field)) {
      // Mark as unknown but preserve the original field name for specifications
      mappingInfo.isUnknownField = true;
    }
  });
  
  return { isValid: true, errors };
}

function convertRowToDraft(
  rowData: any,
  mapping: any,
  fileName: string,
  sheetName: string,
  rowIndex: number
): InsertProductDraftWithSpecs {
  const columnMappings = mapping.columnMappings || {};
  
  // 기본 값들
  const draft: any = {
    rawSourceMeta: {
      fileName,
      sheetName,
      rowIndex,
      originalData: rowData
    },
    status: 'pending',
    detailImageUrls: [],
    errors: [],
    specifications: {}
  };

  // 컬럼 매핑 적용
  Object.entries(rowData).forEach(([column, value]) => {
    const mappingInfo = columnMappings[column];
    
    if (mappingInfo && value !== null && value !== undefined && value !== '') {
      const field = mappingInfo.field;
      let transformedValue = value;
      
      // 데이터 변환
      if (mappingInfo.transformer === 'number' || mappingInfo.transformer === 'price') {
        const numStr = String(value).replace(/[^0-9.]/g, '');
        const parsed = parseFloat(numStr);
        
        // 유효한 숫자인 경우에만 할당
        if (!isNaN(parsed) && parsed > 0) {
          transformedValue = parsed;
        } else {
          // 유효하지 않은 숫자는 오류로 기록하고 건너뛰기
          if (!draft.errors) draft.errors = [];
          draft.errors.push(`Invalid number for ${field}: ${value}`);
          return; // 이 필드는 건너뛰기
        }
      } else if (mappingInfo.transformer === 'category') {
        transformedValue = mapToCategory(String(value));
      } else if (mappingInfo.transformer === 'text') {
        transformedValue = String(value).trim();
      }
      
      // 필드 할당
      if (['name', 'nameKo', 'brand', 'descriptionKo', 'categoryId'].includes(field)) {
        draft[field] = transformedValue;
      } else if (['monthlyPrice', 'originalPrice', 'rating'].includes(field)) {
        // 가격 필드는 유효한 숫자인 경우에만 할당
        if (typeof transformedValue === 'number' && transformedValue > 0) {
          draft[field] = transformedValue;
        }
      } else if (mappingInfo.isUnknownField) {
        // 알 수 없는 필드는 원래 컬럼 이름으로 specifications에 저장
        draft.specifications[column] = transformedValue;
      } else {
        // 기타 매핑된 필드들은 필드명으로 specifications에 추가
        draft.specifications[field] = transformedValue;
      }
    } else if (!mappingInfo) {
      // 매핑되지 않은 컬럼은 specifications에 추가
      if (value !== null && value !== undefined && value !== '') {
        draft.specifications[column] = value;
      }
    }
  });

  // 기본값 설정
  if (!draft.categoryId && mapping.categoryGuess) {
    draft.categoryId = mapToCategory(mapping.categoryGuess);
  }
  
  if (!draft.brand && mapping.brandGuess) {
    draft.brand = mapping.brandGuess;
  }
  
  if (!draft.rating) {
    draft.rating = 4.5;
  }

  return draft;
}

function mapToCategory(value: string): string {
  const lowerValue = value.toLowerCase();
  
  if (lowerValue.includes('냉장고') || lowerValue.includes('refrigerator')) {
    return 'cat1'; // 냉장고 (Refrigerator)
  } else if (lowerValue.includes('세탁기') || lowerValue.includes('washer') || lowerValue.includes('드럼')) {
    return 'cat2'; // 세탁기 (Washing Machine)
  } else if (lowerValue.includes('에어컨') || lowerValue.includes('air') || lowerValue.includes('냉난방')) {
    return 'cat3'; // 에어컨 (Air Conditioner)
  } else if (lowerValue.includes('tv') || lowerValue.includes('티비') || lowerValue.includes('텔레비전')) {
    return 'cat4'; // TV
  } else if (lowerValue.includes('전자레인지') || lowerValue.includes('microwave')) {
    return 'cat5'; // 전자레인지 (Microwave)
  } else if (lowerValue.includes('로봇청소기') || lowerValue.includes('robot') || lowerValue.includes('vacuum')) {
    return 'cat6'; // 로봇청소기 (Robot Vacuum)
  } else if (lowerValue.includes('정수기') || lowerValue.includes('물') || lowerValue.includes('water')) {
    return 'water-purifier'; // 정수기 (Water Purifier)
  } else {
    return 'cat6'; // 기타 가전 (기본값으로 로봇청소기 카테고리 사용)
  }
}
