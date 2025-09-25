import {
  users,
  categories,
  products,
  rentals,
  wishlist,
  chatMessages,
  leads,
  productDrafts,
  type User,
  type UpsertUser,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type Rental,
  type InsertRental,
  type Wishlist,
  type InsertWishlist,
  type ChatMessage,
  type InsertChatMessage,
  type Lead,
  type InsertLead,
  type ProductDraft,
  type InsertProductDraft,
  type InsertProductDraftWithSpecs,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, like, and, gte, lte, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Product operations
  getProducts(filters?: {
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
  }): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsWithCategory(): Promise<(Product & { category: Category })[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  
  // Rental operations
  getRentals(userId: string): Promise<(Rental & { product: Product })[]>;
  createRental(rental: InsertRental): Promise<Rental>;
  updateRental(id: string, updates: Partial<Rental>): Promise<Rental | undefined>;
  
  // Wishlist operations
  getWishlist(userId: string): Promise<(Wishlist & { product: Product })[]>;
  addToWishlist(wishlist: InsertWishlist): Promise<Wishlist>;
  removeFromWishlist(userId: string, productId: string): Promise<boolean>;
  
  // Chat operations
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Lead operations
  createLead(lead: InsertLead): Promise<Lead>;
  getLeads(): Promise<Lead[]>;

  // ProductDraft operations for Excel import workflow
  createDrafts(drafts: InsertProductDraftWithSpecs[]): Promise<ProductDraft[]>;
  listDrafts(filters?: { status?: string; limit?: number; offset?: number }): Promise<(ProductDraft & { category?: Category })[]>;
  getDraft(id: string): Promise<(ProductDraft & { category?: Category }) | undefined>;
  updateDraft(id: string, updates: Partial<InsertProductDraft>): Promise<ProductDraft | undefined>;
  attachImage(id: string, params: { role: 'main' | 'detail'; url: string }): Promise<ProductDraft | undefined>;
  approveDraft(id: string): Promise<Product | undefined>;
  deleteDraft(id: string): Promise<boolean>;
  deleteAllDrafts(): Promise<number>;
  
  // 월간 병합 파이프라인용 메서드
  mergeProducts(drafts: InsertProductDraftWithSpecs[]): Promise<{
    updated: Product[];
    created: Product[];
    needsReview: ProductDraft[];
    errors: { draft: InsertProductDraftWithSpecs; error: string }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  // Product operations
  async getProducts(filters?: {
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
  }): Promise<Product[]> {
    const conditions = [eq(products.isActive, true)];
    
    if (filters?.categoryId) {
      conditions.push(eq(products.categoryId, filters.categoryId));
    }
    
    if (filters?.search) {
      conditions.push(
        like(products.nameKo, `%${filters.search}%`)
      );
    }
    
    if (filters?.minPrice) {
      conditions.push(gte(products.monthlyPrice, filters.minPrice.toString()));
    }
    
    if (filters?.maxPrice) {
      conditions.push(lte(products.monthlyPrice, filters.maxPrice.toString()));
    }

    let baseQuery = db.select().from(products).where(and(...conditions)).orderBy(desc(products.createdAt));

    if (filters?.limit) {
      if (filters?.offset) {
        return await baseQuery.limit(filters.limit).offset(filters.offset);
      } else {
        return await baseQuery.limit(filters.limit);
      }
    }

    return await baseQuery;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.isActive, true)));
    return product;
  }

  async getProductsWithCategory(): Promise<(Product & { category: Category })[]> {
    return await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.isActive, true))
      .then(rows => rows.map(row => ({
        ...row.products,
        category: row.categories!
      })));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  // Rental operations
  async getRentals(userId: string): Promise<(Rental & { product: Product })[]> {
    return await db
      .select()
      .from(rentals)
      .leftJoin(products, eq(rentals.productId, products.id))
      .where(eq(rentals.userId, userId))
      .orderBy(desc(rentals.createdAt))
      .then(rows => rows.map(row => ({
        ...row.rentals,
        product: row.products!
      })));
  }

  async createRental(rental: InsertRental): Promise<Rental> {
    const [newRental] = await db.insert(rentals).values(rental).returning();
    return newRental;
  }

  async updateRental(id: string, updates: Partial<Rental>): Promise<Rental | undefined> {
    const [updatedRental] = await db
      .update(rentals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rentals.id, id))
      .returning();
    return updatedRental;
  }

  // Wishlist operations
  async getWishlist(userId: string): Promise<(Wishlist & { product: Product })[]> {
    return await db
      .select()
      .from(wishlist)
      .leftJoin(products, eq(wishlist.productId, products.id))
      .where(eq(wishlist.userId, userId))
      .orderBy(desc(wishlist.createdAt))
      .then(rows => rows.map(row => ({
        ...row.wishlist,
        product: row.products!
      })));
  }

  async addToWishlist(wishlistItem: InsertWishlist): Promise<Wishlist> {
    const [newWishlist] = await db.insert(wishlist).values(wishlistItem).returning();
    return newWishlist;
  }

  async removeFromWishlist(userId: string, productId: string): Promise<boolean> {
    const result = await db
      .delete(wishlist)
      .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)))
      .returning();
    return result.length > 0;
  }

  // Chat operations
  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);
  }

  async saveChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  // Lead operations
  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  // ProductDraft operations for Excel import workflow
  async createDrafts(drafts: InsertProductDraftWithSpecs[]): Promise<ProductDraft[]> {
    if (drafts.length === 0) return [];
    
    const result = await db.insert(productDrafts).values(drafts).returning();
    return result;
  }

  async listDrafts(filters?: { status?: string; limit?: number; offset?: number }): Promise<(ProductDraft & { category?: Category })[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(productDrafts.status, filters.status));
    }

    let query: any = db
      .select()
      .from(productDrafts)
      .leftJoin(categories, eq(productDrafts.categoryId, categories.id))
      .orderBy(desc(productDrafts.createdAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
      if (filters?.offset) {
        query = query.offset(filters.offset);
      }
    }

    const rows = await query;
    return rows.map((row: any) => ({
      ...row.product_drafts,
      category: row.categories || undefined
    }));
  }

  async getDraft(id: string): Promise<(ProductDraft & { category?: Category }) | undefined> {
    const [row] = await db
      .select()
      .from(productDrafts)
      .leftJoin(categories, eq(productDrafts.categoryId, categories.id))
      .where(eq(productDrafts.id, id));
    
    if (!row) return undefined;
    
    return {
      ...row.product_drafts,
      category: row.categories || undefined
    };
  }

  async updateDraft(id: string, updates: Partial<InsertProductDraft>): Promise<ProductDraft | undefined> {
    const [updatedDraft] = await db
      .update(productDrafts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(productDrafts.id, id))
      .returning();
    return updatedDraft;
  }

  async attachImage(id: string, params: { role: 'main' | 'detail'; url: string }): Promise<ProductDraft | undefined> {
    const draft = await this.getDraft(id);
    if (!draft) return undefined;

    let updates: Partial<InsertProductDraft> = {};

    if (params.role === 'main') {
      updates.mainImageUrl = params.url;
    } else {
      // Add to detail images array
      const currentDetailUrls = Array.isArray(draft.detailImageUrls) ? draft.detailImageUrls : [];
      updates.detailImageUrls = [...currentDetailUrls, params.url];
    }

    return await this.updateDraft(id, updates);
  }

  async approveDraft(id: string): Promise<Product | undefined> {
    const draft = await this.getDraft(id);
    if (!draft || !draft.name || !draft.nameKo || !draft.descriptionKo || !draft.categoryId || !draft.monthlyPrice || !draft.brand) {
      throw new Error("Draft missing required fields for product creation");
    }

    // Create product from draft
    const productData: InsertProduct = {
      name: draft.name,
      nameKo: draft.nameKo,
      descriptionKo: draft.descriptionKo,
      imageUrl: draft.mainImageUrl || '/placeholder-product.jpg',
      categoryId: draft.categoryId,
      monthlyPrice: draft.monthlyPrice,
      originalPrice: draft.originalPrice,
      rating: draft.rating || '4.5',
      brand: draft.brand,
      specifications: draft.specifications || {},
    };

    const [newProduct] = await db.insert(products).values(productData).returning();
    
    // Mark draft as approved
    await this.updateDraft(id, { status: 'approved' });
    
    return newProduct;
  }

  async deleteDraft(id: string): Promise<boolean> {
    const result = await db
      .delete(productDrafts)
      .where(eq(productDrafts.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteAllDrafts(): Promise<number> {
    // Performance optimization: count first, then delete without returning all rows
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productDrafts);
    
    if (countResult.count === 0) {
      return 0;
    }
    
    await db.delete(productDrafts);
    return countResult.count;
  }

  // 월간 병합 파이프라인 구현
  // 데이터 정규화 함수: trim + lowercase 처리로 중복 감지 정확도 향상
  private normalizeForDuplicateCheck(value: string): string {
    return value.trim().toLowerCase();
  }

  async mergeProducts(drafts: InsertProductDraftWithSpecs[]): Promise<{
    updated: Product[];
    created: Product[];
    needsReview: ProductDraft[];
    errors: { draft: InsertProductDraftWithSpecs; error: string }[];
  }> {
    const results = {
      updated: [] as Product[],
      created: [] as Product[],
      needsReview: [] as ProductDraft[],
      errors: [] as { draft: InsertProductDraftWithSpecs; error: string }[]
    };

    for (const draft of drafts) {
      try {
        // 1. modelNumber 또는 brand가 없으면 manual review로 분기
        if (!draft.modelNumber || draft.modelNumber.trim() === '' || 
            !draft.brand || draft.brand.trim() === '') {
          const reviewDraft = await db.insert(productDrafts).values({
            ...draft,
            status: 'needs_review'
          }).returning();
          results.needsReview.push(reviewDraft[0]);
          continue;
        }

        // 2. 정규화된 중복 감지: brand + modelNumber 대소문자/공백 무관 비교
        const normalizedBrand = this.normalizeForDuplicateCheck(draft.brand!);
        const normalizedModelNumber = this.normalizeForDuplicateCheck(draft.modelNumber!);
        
        const existingProduct = await db
          .select()
          .from(products)
          .where(and(
            sql`LOWER(TRIM(${products.brand})) = ${normalizedBrand}`,
            sql`LOWER(TRIM(${products.modelNumber})) = ${normalizedModelNumber}`
          ))
          .limit(1);

        if (existingProduct.length > 0) {
          // 3. 기존 제품 업데이트 (가격 및 프로모션 정보)
          const [updatedProduct] = await db
            .update(products)
            .set({
              monthlyPrice: draft.monthlyPrice,
              originalPrice: draft.originalPrice,
              promotionalPrice: draft.promotionalPrice,
              promotionStartDate: draft.promotionStartDate,
              promotionEndDate: draft.promotionEndDate,
              updatedAt: new Date()
            })
            .where(eq(products.id, existingProduct[0].id))
            .returning();
          
          results.updated.push(updatedProduct);
        } else {
          // 4. 새 제품 생성 (필수 필드 검증)
          if (!draft.name || !draft.nameKo || !draft.descriptionKo || !draft.categoryId || !draft.monthlyPrice || !draft.brand) {
            const reviewDraft = await db.insert(productDrafts).values({
              ...draft,
              status: 'needs_review'
            }).returning();
            results.needsReview.push(reviewDraft[0]);
            continue;
          }

          const productData: InsertProduct = {
            name: draft.name,
            nameKo: draft.nameKo,
            descriptionKo: draft.descriptionKo,
            imageUrl: draft.mainImageUrl || '/placeholder-product.jpg',
            categoryId: draft.categoryId,
            monthlyPrice: draft.monthlyPrice,
            originalPrice: draft.originalPrice,
            rating: draft.rating || '4.5',
            // 저장시 정규화: trim 처리 (DB unique constraint에서 정확한 매칭 보장)
            brand: draft.brand.trim(),
            modelNumber: draft.modelNumber.trim(),
            promotionalPrice: draft.promotionalPrice,
            promotionStartDate: draft.promotionStartDate,
            promotionEndDate: draft.promotionEndDate,
            specifications: draft.specifications || {},
          };

          const [newProduct] = await db.insert(products).values(productData).returning();
          results.created.push(newProduct);
        }
      } catch (error) {
        // 5. 에러 발생시 에러 배열에 추가
        results.errors.push({
          draft,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }
}

export const storage = new DatabaseStorage();
