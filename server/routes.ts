import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getProductRecommendations, processChatMessage, parseProductsFromExcel } from "./gemini";
import {
  insertLeadSchema,
  insertChatMessageSchema,
  insertProductSchema,
  insertProductWithSpecsSchema,
  insertCategorySchema
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

  // Excel 파일 업로드 및 파싱 엔드포인트
  app.post('/api/upload/excel-products', excelUpload.single('excel'), async (req, res) => {
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
      
      // 응답 크기를 제한하기 위해 drafts는 개수만 전송
      const responseData = {
        ...result,
        drafts: result.drafts.map(draft => ({
          nameKo: draft.nameKo || 'N/A',
          brand: draft.brand || 'N/A', 
          categoryId: draft.categoryId || 'N/A',
          monthlyPrice: draft.monthlyPrice || 0,
          status: draft.status
        }))
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

  const httpServer = createServer(app);
  return httpServer;
}
