import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getProductRecommendations, processChatMessage } from "./gemini";
import {
  insertLeadSchema,
  insertChatMessageSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {

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
