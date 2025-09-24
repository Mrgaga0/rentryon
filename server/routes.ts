import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getProductRecommendations, processChatMessage } from "./gemini";
import {
  insertRentalSchema,
  insertWishlistSchema,
  insertChatMessageSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

  // Rental routes (protected)
  app.get('/api/rentals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rentals = await storage.getRentals(userId);
      res.json(rentals);
    } catch (error) {
      console.error("Error fetching rentals:", error);
      res.status(500).json({ message: "Failed to fetch rentals" });
    }
  });

  app.post('/api/rentals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rentalData = insertRentalSchema.parse({
        ...req.body,
        userId,
      });

      const rental = await storage.createRental(rentalData);
      res.status(201).json(rental);
    } catch (error) {
      console.error("Error creating rental:", error);
      res.status(500).json({ message: "Failed to create rental" });
    }
  });

  // Wishlist routes (protected)
  app.get('/api/wishlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wishlist = await storage.getWishlist(userId);
      res.json(wishlist);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).json({ message: "Failed to fetch wishlist" });
    }
  });

  app.post('/api/wishlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wishlistData = insertWishlistSchema.parse({
        ...req.body,
        userId,
      });

      const wishlistItem = await storage.addToWishlist(wishlistData);
      res.status(201).json(wishlistItem);
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      res.status(500).json({ message: "Failed to add to wishlist" });
    }
  });

  app.delete('/api/wishlist/:productId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { productId } = req.params;

      const removed = await storage.removeFromWishlist(userId, productId);
      
      if (!removed) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }
      
      res.json({ message: "Removed from wishlist" });
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      res.status(500).json({ message: "Failed to remove from wishlist" });
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
      const { message, sessionId, userId } = req.body;
      
      // Debug logging
      console.log('Chat request body:', { message, sessionId, userId });
      
      // Validate sessionId
      if (!sessionId) {
        return res.status(400).json({ message: 'sessionId is required' });
      }

      // Save user message
      const userMessage = await storage.saveChatMessage({
        userId,
        sessionId,
        message,
        isUser: true,
      });

      // Process with AI
      const aiResponse = await processChatMessage(message, {});

      // Save AI response
      const aiMessage = await storage.saveChatMessage({
        userId,
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
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
