import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getProductRecommendations, processChatMessage } from "./gemini";
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
