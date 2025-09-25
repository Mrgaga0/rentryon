import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getProductRecommendations, processChatMessage, parseProductsFromExcel } from "./gemini";
import { isAuthenticated, isAdmin } from "./replitAuth";
import {
  insertLeadSchema,
  insertChatMessageSchema,
  insertProductSchema,
  insertProductWithSpecsSchema,
  insertCategorySchema,
  insertProductDraftWithSpecsSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// 파일 업로드 설정
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/products';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: uploadStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 이미지 파일만 허용
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// Excel 파일 업로드를 위한 별도 설정 (메모리 저장소 사용)
const excelUpload = multer({
  storage: multer.memoryStorage(), // 메모리에 저장하여 buffer로 접근
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer file filter:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Excel 파일만 허용
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/excel',
      'application/x-excel',
      'application/x-msexcel'
    ];
    
    const isValidMime = allowedMimes.includes(file.mimetype);
    const isValidExtension = file.originalname.match(/\.(xlsx|xls)$/i);
    
    if (isValidMime || isValidExtension) {
      console.log('File accepted by multer');
      cb(null, true);
    } else {
      console.log('File rejected by multer');
      cb(new Error(`지원되지 않는 파일 형식입니다. Excel 파일(.xlsx, .xls)만 업로드 가능합니다. (받은 타입: ${file.mimetype})`));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {

  // 정적 파일 서빙 설정
  app.use('/uploads', express.static('uploads'));

  // 파일 업로드 엔드포인트
  app.post('/api/upload/product-image', upload.single('image'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: '이미지 파일을 선택해주세요.' });
      }
      
      const imageUrl = `/uploads/products/${req.file.filename}`;
      res.json({ 
        message: '이미지가 성공적으로 업로드되었습니다.',
        imageUrl 
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ message: '이미지 업로드에 실패했습니다.' });
    }
  });

  // 월간 병합 파이프라인 엔드포인트 (관리자 권한 필요)
  app.post('/api/imports/merge', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { drafts } = req.body;
      
      if (!Array.isArray(drafts) || drafts.length === 0) {
        return res.status(400).json({ message: '병합할 Draft 데이터를 제공해주세요.' });
      }

      // Non-blocking validation: 개별 아이템별 처리
      const validDrafts = [];
      const invalidDrafts = [];
      
      for (let i = 0; i < drafts.length; i++) {
        const draft = drafts[i];
        const parseResult = insertProductDraftWithSpecsSchema.safeParse(draft);
        
        if (parseResult.success) {
          validDrafts.push(parseResult.data);
        } else {
          console.log(`Draft validation failed for item ${i + 1}:`, parseResult.error.message);
          invalidDrafts.push({
            index: i + 1,
            draft,
            error: parseResult.error.message
          });
        }
      }
      
      // Valid 아이템만 병합 파이프라인 실행 (Non-blocking 처리)
      let mergeResults: Awaited<ReturnType<typeof storage.mergeProducts>> = {
        updated: [],
        created: [],
        needsReview: [],
        errors: []
      };
      
      if (validDrafts.length > 0) {
        mergeResults = await storage.mergeProducts(validDrafts);
      }
      
      // 통합 결과 보고 (Valid + Invalid + Processing errors)
      res.json({
        message: `제품 병합 완료 - 전체: ${drafts.length}, 처리성공: ${validDrafts.length}, 검증실패: ${invalidDrafts.length}`,
        results: {
          summary: {
            total: drafts.length,
            processed: validDrafts.length,
            validationFailed: invalidDrafts.length,
            updated: mergeResults.updated.length,
            created: mergeResults.created.length,
            needsReview: mergeResults.needsReview.length,
            processingErrors: mergeResults.errors.length
          },
          // 처리 결과들
          updated: mergeResults.updated,
          created: mergeResults.created,
          needsReview: mergeResults.needsReview,
          processingErrors: mergeResults.errors,
          
          // 검증 실패 아이템들 (개별 보고)
          validationErrors: invalidDrafts
        }
      });
    } catch (error) {
      console.error("Error in merge pipeline:", error);
      res.status(500).json({ 
        message: "제품 병합에 실패했습니다.",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Excel 파일 업로드 및 파싱 엔드포인트
  app.post('/api/upload/excel-products', (req, res, next) => {
    console.log('=== Excel Upload Route Hit ===');
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    excelUpload.single('excel')(req, res, next);
  }, async (req, res) => {
    console.log('=== Excel Upload Started ===');
    try {
      if (!req.file) {
        console.log('ERROR: No file provided');
        return res.status(400).json({ message: 'Excel 파일을 선택해주세요.' });
      }

      console.log(`Processing Excel file: ${req.file.originalname}, Size: ${req.file.size} bytes`);
      
      // 파일 크기 체크 (10MB 제한)
      if (req.file.size > 10 * 1024 * 1024) {
        console.log('ERROR: File too large');
        return res.status(400).json({ message: '파일이 너무 큽니다. 10MB 이하의 파일을 업로드해주세요.' });
      }

      console.log('Starting Excel parsing...');
      
      // parseProductsFromExcel 함수를 사용하여 Excel 파일 파싱
      const result = await parseProductsFromExcel(req.file.buffer, req.file.originalname);
      
      console.log('Excel parsing completed successfully');
      console.log(`Stats: ${result.stats.successfullyParsed} success, ${result.stats.errors} errors`);
      
      // Return complete draft objects for saving (not truncated)
      const responseData = {
        ...result,
        drafts: result.drafts // Return full draft objects with all fields including rawSourceMeta
      };
      
      res.json({
        message: 'Excel 파일이 성공적으로 파싱되었습니다.',
        data: responseData
      });
      
    } catch (error) {
      console.error('=== Excel parsing error ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('========================');
      
      res.status(500).json({ 
        message: 'Excel 파일 파싱에 실패했습니다.',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Category routes
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Product routes
  app.get('/api/products', async (req, res) => {
    try {
      const {
        categoryId,
        search,
        minPrice,
        maxPrice,
        limit = 20,
        offset = 0
      } = req.query;

      const filters = {
        categoryId: categoryId as string,
        search: search as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      const products = await storage.getProducts(filters);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Admin - Create product
  app.post('/api/products', async (req, res) => {
    try {
      // Use enhanced schema with specifications validation
      const productData = insertProductWithSpecsSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "유효하지 않은 제품 정보입니다.", errors: (error as any).errors });
      }
      res.status(500).json({ message: "제품 생성에 실패했습니다." });
    }
  });

  // Admin - Create category
  app.post('/api/categories', async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "유효하지 않은 카테고리 정보입니다.", errors: (error as any).errors });
      }
      res.status(500).json({ message: "카테고리 생성에 실패했습니다." });
    }
  });

  // AI Recommendations
  app.post('/api/recommendations', async (req, res) => {
    try {
      const userPreferences = req.body;
      const recommendations = await getProductRecommendations(userPreferences);
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({ message: "Failed to get recommendations" });
    }
  });

  // Consultation leads routes
  app.post('/api/leads', async (req, res) => {
    try {
      const leadData = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(leadData);
      res.status(201).json({ message: "상담 신청이 완료되었습니다. 공기간 내 연락드리겠습니다." });
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "상담 신청에 실패했습니다." });
    }
  });

  // Chat routes
  app.get('/api/chat/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      
      // Validate sessionId
      if (!sessionId) {
        return res.status(400).json({ message: 'sessionId is required' });
      }

      // Save user message (no userId required for anonymous chat)
      const userMessage = await storage.saveChatMessage({
        userId: null,
        sessionId,
        message,
        isUser: true,
      });

      // Process with AI
      const aiResponse = await processChatMessage(message, {});

      // Save AI response
      const aiMessage = await storage.saveChatMessage({
        userId: null,
        sessionId,
        message: aiResponse.message,
        isUser: false,
      });

      res.json({
        userMessage,
        aiMessage,
        productSuggestions: aiResponse.productSuggestions || []
      });
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ message: "AI 상담 처리에 실패했습니다." });
    }
  });

  // Draft Management Routes
  
  // Create drafts from parsed Excel data
  app.post('/api/drafts', async (req, res) => {
    try {
      const { drafts } = req.body;
      
      if (!Array.isArray(drafts) || drafts.length === 0) {
        return res.status(400).json({ message: '저장할 Draft 데이터를 제공해주세요.' });
      }

      // Validate each draft using InsertProductDraftWithSpecs schema
      const validDrafts = [];
      for (const draft of drafts) {
        try {
          const validatedDraft = insertProductDraftWithSpecsSchema.parse(draft);
          validDrafts.push(validatedDraft);
        } catch (error) {
          console.error('Draft validation failed:', error);
          return res.status(400).json({ 
            message: 'Draft 데이터 검증에 실패했습니다.',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      const savedDrafts = await storage.createDrafts(validDrafts);
      
      res.json(savedDrafts);
    } catch (error) {
      console.error("Error creating drafts:", error);
      res.status(500).json({ 
        message: "Draft 저장에 실패했습니다.",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get all drafts with filtering and pagination
  app.get('/api/drafts', async (req, res) => {
    try {
      const {
        status,
        limit = 20,
        offset = 0
      } = req.query;

      const filters = {
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      const drafts = await storage.listDrafts(filters);
      res.json(drafts);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      res.status(500).json({ message: "Draft 목록 조회에 실패했습니다." });
    }
  });

  // Get specific draft by ID
  app.get('/api/drafts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const draft = await storage.getDraft(id);
      
      if (!draft) {
        return res.status(404).json({ message: "Draft를 찾을 수 없습니다." });
      }
      
      res.json(draft);
    } catch (error) {
      console.error("Error fetching draft:", error);
      res.status(500).json({ message: "Draft 조회에 실패했습니다." });
    }
  });

  // Update draft
  app.put('/api/drafts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // TODO: Add Zod validation for updateData using partial InsertProductDraft schema
      
      const updatedDraft = await storage.updateDraft(id, updateData);
      
      if (!updatedDraft) {
        return res.status(404).json({ message: "Draft를 찾을 수 없습니다." });
      }
      
      res.json(updatedDraft);
    } catch (error) {
      console.error("Error updating draft:", error);
      res.status(500).json({ message: "Draft 수정에 실패했습니다." });
    }
  });

  // Delete draft
  app.delete('/api/drafts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteDraft(id);
      
      if (!success) {
        return res.status(404).json({ message: "Draft를 찾을 수 없습니다." });
      }
      
      res.json({ message: "Draft가 삭제되었습니다." });
    } catch (error) {
      console.error("Error deleting draft:", error);
      res.status(500).json({ message: "Draft 삭제에 실패했습니다." });
    }
  });

  // Attach image to draft (main or detail)
  app.post('/api/drafts/:id/images', upload.single('image'), async (req, res) => {
    try {
      const { id: draftId } = req.params;
      const { role } = req.body; // 'main' or 'detail'
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: '이미지 파일을 선택해주세요.' });
      }

      if (!role || !['main', 'detail'].includes(role)) {
        return res.status(400).json({ message: 'role은 "main" 또는 "detail"이어야 합니다.' });
      }

      // Check if draft exists
      const draft = await storage.getDraft(draftId);
      if (!draft) {
        return res.status(404).json({ message: "Draft를 찾을 수 없습니다." });
      }

      // Build correct image URL path
      const imageUrl = `/uploads/products/${file.filename}`;
      
      // Use storage.attachImage() with correct parameters
      const updatedDraft = await storage.attachImage(draftId, {
        role: role as 'main' | 'detail',
        url: imageUrl
      });

      res.json({
        message: `${role === 'main' ? '메인' : '상세'} 이미지가 추가되었습니다.`,
        imageUrl: imageUrl,
        draft: updatedDraft
      });
    } catch (error) {
      console.error('Error attaching image to draft:', error);
      res.status(500).json({ message: '이미지 첨부에 실패했습니다.' });
    }
  });

  // Remove image from draft (clear main or remove from detail)
  app.delete('/api/drafts/:id/images', async (req, res) => {
    try {
      const { id: draftId } = req.params;
      const { role, imageUrl } = req.body;
      
      if (!role || !['main', 'detail'].includes(role)) {
        return res.status(400).json({ message: 'role은 "main" 또는 "detail"이어야 합니다.' });
      }

      const draft = await storage.getDraft(draftId);
      if (!draft) {
        return res.status(404).json({ message: "Draft를 찾을 수 없습니다." });
      }

      let updatedDraft;

      if (role === 'main') {
        // Clear main image
        updatedDraft = await storage.updateDraft(draftId, {
          mainImageUrl: null
        });
      } else {
        // Remove specific image from detail images
        if (!imageUrl) {
          return res.status(400).json({ message: 'detail 이미지 삭제시 imageUrl을 지정해주세요.' });
        }
        
        const currentDetailUrls = Array.isArray(draft.detailImageUrls) ? draft.detailImageUrls : [];
        const updatedDetailUrls = currentDetailUrls.filter((url: string) => url !== imageUrl);
        
        updatedDraft = await storage.updateDraft(draftId, {
          detailImageUrls: updatedDetailUrls
        });
      }

      res.json({
        message: `${role === 'main' ? '메인' : '상세'} 이미지가 삭제되었습니다.`,
        draft: updatedDraft
      });
    } catch (error) {
      console.error('Error removing image from draft:', error);
      res.status(500).json({ message: '이미지 삭제에 실패했습니다.' });
    }
  });

  // Approve draft (convert to product)
  app.post('/api/drafts/:id/approve', async (req, res) => {
    try {
      const { id: draftId } = req.params;
      
      // Use storage.approveDraft() which handles the entire conversion process
      const product = await storage.approveDraft(draftId);
      
      if (!product) {
        return res.status(404).json({ message: "Draft를 찾을 수 없거나 필수 필드가 누락되었습니다." });
      }

      res.json({
        message: 'Draft가 승인되어 제품으로 등록되었습니다.',
        product: product,
        draftId: draftId
      });
    } catch (error) {
      console.error('Error approving draft:', error);
      res.status(500).json({ 
        message: 'Draft 승인에 실패했습니다.', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Bulk approve multiple drafts
  app.post('/api/drafts/bulk-approve', async (req, res) => {
    try {
      const { draftIds } = req.body;
      
      if (!Array.isArray(draftIds) || draftIds.length === 0) {
        return res.status(400).json({ message: '승인할 Draft ID 목록을 제공해주세요.' });
      }

      const results = [];
      const errors = [];

      // Process each draft individually using storage.approveDraft()
      for (const draftId of draftIds) {
        try {
          const product = await storage.approveDraft(draftId);
          if (product) {
            results.push({ draftId, productId: product.id });
          } else {
            errors.push({ draftId, error: 'Draft를 찾을 수 없거나 필수 필드가 누락되었습니다.' });
          }
        } catch (error) {
          errors.push({ draftId, error: error instanceof Error ? error.message : String(error) });
        }
      }

      res.json({
        message: `${results.length}개의 Draft가 승인되었습니다.`,
        approved: results,
        errors: errors
      });
    } catch (error) {
      console.error('Error bulk approving drafts:', error);
      res.status(500).json({ message: '일괄 승인에 실패했습니다.' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
