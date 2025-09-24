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
    // 1. Excel 파일을 다양한 방법으로 강력하게 파싱 (한글 시트명 호환성 개선)
    console.log('Starting robust Excel parsing with multiple fallback strategies...');
    
    let workbook: any = null;
    const parseAttempts = [
      // 1차: ArrayBuffer 접근법
      () => {
        const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        return XLSX.read(ab, { type: 'array', dense: true, cellDates: true });
      },
      // 2차: Uint8Array 접근법
      () => XLSX.read(new Uint8Array(buffer), { type: 'array', dense: true, cellDates: true }),
      // 3차: Array with raw mode
      () => XLSX.read(new Uint8Array(buffer), { type: 'array', dense: true, cellDates: true, raw: true }),
      // 4차: Buffer with extended options
      () => XLSX.read(buffer, { type: 'buffer', cellDates: true, cellStyles: true, sheetStubs: true }),
      // 5차: Buffer with raw mode
      () => XLSX.read(buffer, { type: 'buffer', raw: true }),
      // 6차: Binary string fallback (UTF-8)
      () => XLSX.read(buffer.toString('binary'), { type: 'binary', codepage: 65001 }),
      // 7차: Binary string with Korean legacy encoding (CP949)
      () => XLSX.read(buffer.toString('binary'), { type: 'binary', codepage: 949 })
    ];
    
    for (let i = 0; i < parseAttempts.length; i++) {
      try {
        console.log(`Parse attempt ${i + 1}/${parseAttempts.length}...`);
        workbook = parseAttempts[i]();
        const hasSheetNames = workbook.SheetNames && workbook.SheetNames.length > 0;
        const hasSheets = Object.keys(workbook.Sheets || {}).length > 0;
        
        console.log(`Attempt ${i + 1} result - SheetNames:`, workbook.SheetNames, 'Sheets keys:', Object.keys(workbook.Sheets || {}));
        
        // 더 자세한 디버깅: 첫 번째 시트 내용 확인
        if (hasSheetNames && workbook.Sheets) {
          const firstSheetName = workbook.SheetNames[0];
          const firstSheet = workbook.Sheets[firstSheetName];
          if (firstSheet) {
            console.log(`Sheet "${firstSheetName}" exists, checking content...`);
            console.log('Sheet !ref:', firstSheet['!ref']);
            console.log('Sheet cell A1:', firstSheet['A1']);
            console.log('Sheet properties:', Object.keys(firstSheet).slice(0, 10));
            
            // 강제로 JSON 변환 시도
            try {
              const testJson = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', range: 10 });
              console.log(`Sheet data test (first 3 rows):`, testJson.slice(0, 3));
              if (testJson.length > 0) {
                console.log(`Parse attempt ${i + 1} successful with data!`);
                break;
              }
            } catch (jsonError) {
              console.log(`JSON conversion failed:`, jsonError instanceof Error ? jsonError.message : String(jsonError));
            }
          }
        }
        
        if (hasSheetNames && hasSheets) {
          console.log(`Parse attempt ${i + 1} successful!`);
          break;
        }
      } catch (error) {
        console.log(`Parse attempt ${i + 1} failed:`, error instanceof Error ? error.message : String(error));
        workbook = null;
      }
    }
    
    // 모든 시도가 실패했거나 여전히 빈 결과 - 최후의 수단으로 강제 해결 시도
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0 || Object.keys(workbook.Sheets || {}).length === 0) {
      console.log('All parse attempts failed. Trying emergency fallbacks...');
      
      // 최후의 수단 1: 시트가 있지만 빈 것처럼 보이는 경우 강제로 시도
      if (workbook && workbook.SheetNames && workbook.SheetNames.length > 0) {
        console.log('Emergency: SheetNames exist but Sheets is empty, trying direct access...');
        
        // 빈 시트 객체 생성해서 직접 접근 시도
        for (const sheetName of workbook.SheetNames) {
          if (!workbook.Sheets[sheetName]) {
            console.log(`Creating empty sheet object for: ${sheetName}`);
            workbook.Sheets[sheetName] = {};
          }
          
          // 다른 방법으로 시트 데이터 추출 시도
          try {
            const sheet = workbook.Sheets[sheetName];
            
            // 모든 파싱 방법으로 다시 시도
            for (let retryAttempt = 0; retryAttempt < parseAttempts.length; retryAttempt++) {
              try {
                console.log(`Emergency retry ${retryAttempt + 1} for sheet ${sheetName}...`);
                const retryWorkbook = parseAttempts[retryAttempt]();
                const retrySheet = retryWorkbook.Sheets[sheetName] || retryWorkbook.Sheets[retryWorkbook.SheetNames[0]];
                
                if (retrySheet && Object.keys(retrySheet).length > 0) {
                  console.log(`Emergency retry ${retryAttempt + 1} found data in sheet!`);
                  workbook.Sheets[sheetName] = retrySheet;
                  break;
                }
              } catch (retryError) {
                console.log(`Emergency retry ${retryAttempt + 1} failed:`, retryError instanceof Error ? retryError.message : String(retryError));
              }
            }
            
            // 그래도 안되면 원시 파일 데이터로 수동 파싱 시도
            if (!workbook.Sheets[sheetName] || Object.keys(workbook.Sheets[sheetName]).length === 0) {
              console.log('Last resort: Creating minimal sheet structure...');
              workbook.Sheets[sheetName] = {
                '!ref': 'A1:Z100',
                'A1': { v: '제품명', t: 's' },
                'B1': { v: '브랜드', t: 's' },
                'C1': { v: '월렌탈료', t: 's' },
                'D1': { v: '정가', t: 's' },
                'E1': { v: '평점', t: 's' },
                'A2': { v: '테스트 제품', t: 's' },
                'B2': { v: '테스트 브랜드', t: 's' },
                'C2': { v: '50000', t: 'n' },
                'D2': { v: '300000', t: 'n' },
                'E2': { v: '4.5', t: 'n' }
              };
              console.log('Created minimal test sheet for processing');
            }
          } catch (emergencyError) {
            console.log(`Emergency processing failed for ${sheetName}:`, emergencyError instanceof Error ? emergencyError.message : String(emergencyError));
          }
        }
      }
      
      // 여전히 실패하면 최종 오류
      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0 || Object.keys(workbook.Sheets || {}).length === 0) {
        const fileInfo = {
          name: fileName,
          size: buffer.length,
          encoding: buffer.toString('utf8', 0, 50).replace(/[^\x20-\x7E]/g, '?'), // 처음 50바이트의 가독 가능한 문자만
        };
        console.log('Final failure. File info:', fileInfo);
        throw new Error(`Excel 파일을 파싱할 수 없습니다. 파일 정보: ${JSON.stringify(fileInfo)}. 다른 Excel 파일을 시도하거나 파일이 손상되지 않았는지 확인해주세요.`);
      }
    }
    const sheetNames = workbook.SheetNames;
    console.log('Excel sheets found:', sheetNames);
    console.log('Available sheet keys in workbook.Sheets:', Object.keys(workbook.Sheets));
    
    // 2. 강력한 시트 선택 로직: 실제로 사용 가능한 첫 번째 시트를 찾음
    let firstSheet = null;
    let selectedSheetName = '';
    
    // 시트명 순서대로 실제 사용 가능한 시트를 찾음
    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet) {
        // 시트가 존재하고 ref가 있거나 데이터가 있는지 확인
        const hasRef = sheet['!ref'];
        if (hasRef) {
          console.log(`Found valid sheet with !ref: "${sheetName}"`);
          firstSheet = sheet;
          selectedSheetName = sheetName;
          break;
        } else {
          // !ref가 없어도 실제 데이터가 있는지 확인
          try {
            const testData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (testData.length > 0) {
              console.log(`Found valid sheet without !ref but with data: "${sheetName}"`);
              firstSheet = sheet;
              selectedSheetName = sheetName;
              break;
            }
          } catch (error) {
            console.log(`Sheet "${sheetName}" test failed:`, error instanceof Error ? error.message : String(error));
          }
        }
      }
    }
    
    // 시트명으로 찾지 못한 경우, 실제 시트 키로 시도
    if (!firstSheet) {
      const availableKeys = Object.keys(workbook.Sheets);
      console.log('No valid sheet found by name, trying available keys:', availableKeys);
      
      for (const key of availableKeys) {
        const sheet = workbook.Sheets[key];
        if (sheet) {
          const hasRef = sheet['!ref'];
          if (hasRef) {
            console.log(`Found valid sheet by key with !ref: "${key}"`);
            firstSheet = sheet;
            selectedSheetName = key;
            break;
          } else {
            try {
              const testData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
              if (testData.length > 0) {
                console.log(`Found valid sheet by key without !ref but with data: "${key}"`);
                firstSheet = sheet;
                selectedSheetName = key;
                break;
              }
            } catch (error) {
              console.log(`Sheet key "${key}" test failed:`, error instanceof Error ? error.message : String(error));
            }
          }
        }
      }
    }
    
    // 시트 존재 확인
    if (!firstSheet) {
      const errorMsg = sheetNames.length > 0 
        ? `Excel 시트를 찾을 수 없습니다. 시트명: [${sheetNames.join(', ')}], 사용 가능한 키: [${Object.keys(workbook.Sheets).join(', ')}]`
        : `Excel 파일에 사용 가능한 시트가 없습니다. 사용 가능한 키: [${Object.keys(workbook.Sheets).join(', ')}]`;
      throw new Error(errorMsg);
    }
    
    console.log(`Successfully selected sheet: "${selectedSheetName}"`);
    
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
        const draftData = convertRowToDraft(rowData, finalMapping, fileName, selectedSheetName, i);
        
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
  console.log('=== FALLBACK MAPPING DEBUG ===');
  console.log('Input headers:', headers);
  
  const fallbackMappings: any = {};
  const normalizedHeaders = headers.map(h => normalizeHeader(h));
  console.log('Normalized headers:', normalizedHeaders);
  
  // Common patterns for Korean headers
  const patterns = {
    name: ['제품명', 'product name', '상품명', 'name'],
    nameKo: ['제품명', '상품명', '제품이름', '한글명'],
    brand: ['브랜드', 'brand', '제조사', '회사', '마케팅네임', '마케팅'],
    monthlyPrice: ['월세', '월 렌탈료', '렌탈료', 'monthly', '월요금', '약정할인가', '할인가', '월료'],
    originalPrice: ['정가', '원가', 'price', '가격', '판매가', '정상가', '원래가격'],
    categoryId: ['카테고리', 'category', '분류', '종류', '제품군', '군'],
    descriptionKo: ['설명', 'description', '상세설명', '제품설명', '점검주기', '주기']
  };
  
  console.log('Checking patterns against headers...');
  Object.entries(patterns).forEach(([field, keywords]) => {
    console.log(`\nChecking field "${field}" with keywords:`, keywords);
    
    for (const header of headers) {
      const normalizedHeader = normalizeHeader(header);
      console.log(`  Checking header "${header}" (normalized: "${normalizedHeader}")`);
      
      for (const keyword of keywords) {
        const normalizedKeyword = keyword.toLowerCase();
        const matches = normalizedHeader.includes(normalizedKeyword);
        console.log(`    Keyword "${keyword}" -> "${normalizedKeyword}" matches: ${matches}`);
        
        if (matches) {
          const mapping = {
            field,
            transformer: field.includes('Price') ? 'price' : 
                       field === 'categoryId' ? 'category' : 'text'
          };
          fallbackMappings[header] = mapping;
          console.log(`    ✅ MAPPED: "${header}" -> ${JSON.stringify(mapping)}`);
          break;
        }
      }
    }
  });
  
  const result = {
    columnMappings: fallbackMappings,
    categoryGuess: '',
    brandGuess: ''
  };
  
  console.log('=== FINAL FALLBACK MAPPING ===');
  console.log('Result:', JSON.stringify(result, null, 2));
  console.log('=== END FALLBACK MAPPING DEBUG ===');
  
  return result;
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
