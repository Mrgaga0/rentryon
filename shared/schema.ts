import { sql, relations } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  nameKo: varchar("name_ko", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  nameKo: varchar("name_ko", { length: 200 }).notNull(),
  descriptionKo: text("description_ko").notNull(),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  // 중복 감지 및 월간 업데이트를 위한 새 필드들
  modelNumber: varchar("model_number", { length: 100 }), // 중복 상품 식별 키
  promotionalPrice: decimal("promotional_price", { precision: 10, scale: 2 }), // 월간 프로모션 가격
  promotionStartDate: timestamp("promotion_start_date"), // 프로모션 시작일
  promotionEndDate: timestamp("promotion_end_date"), // 프로모션 종료일
  rating: decimal("rating", { precision: 3, scale: 2 }).notNull().default('4.5'),
  brand: varchar("brand", { length: 100 }).notNull(),
  specifications: jsonb("specifications").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // 중복 감지를 위한 복합 고유 인덱스 (NULL modelNumber는 제외하여 허점 방지)
  uniqueBrandModel: uniqueIndex("uq_products_brand_model").on(table.brand, table.modelNumber).where(sql`model_number IS NOT NULL`),
}));

// Rentals table
export const rentals = pgTable("rentals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, active, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wishlist table
export const wishlist = pgTable("wishlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id").notNull(),
  message: text("message").notNull(),
  isUser: boolean("is_user").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Consultation leads table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id),
  productName: varchar("product_name", { length: 200 }).notNull(),
  rentalPeriodMonths: integer("rental_period_months").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  preferredTime: varchar("preferred_time", { length: 50 }),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product drafts table for Excel import workflow
export const productDrafts = pgTable("product_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Raw source metadata for tracking
  rawSourceMeta: jsonb("raw_source_meta").notNull(), // { fileName, sheetName, rowIndex, originalData }
  // Parsed product data
  name: varchar("name", { length: 200 }),
  nameKo: varchar("name_ko", { length: 200 }),
  descriptionKo: text("description_ko"),
  categoryId: varchar("category_id").references(() => categories.id),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  // 중복 감지 및 월간 업데이트를 위한 새 필드들
  modelNumber: varchar("model_number", { length: 100 }), // 중복 상품 식별 키
  promotionalPrice: decimal("promotional_price", { precision: 10, scale: 2 }), // 월간 프로모션 가격
  promotionStartDate: timestamp("promotion_start_date"), // 프로모션 시작일
  promotionEndDate: timestamp("promotion_end_date"), // 프로모션 종료일
  rating: decimal("rating", { precision: 3, scale: 2 }),
  brand: varchar("brand", { length: 100 }),
  specifications: jsonb("specifications"),
  // Draft-specific fields
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, needs_review, approved, rejected
  mainImageUrl: varchar("main_image_url", { length: 500 }),
  detailImageUrls: jsonb("detail_image_urls").notNull().default('[]'), // string[]
  errors: jsonb("errors").default('[]'), // string[] for validation/parsing errors
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  rentals: many(rentals),
  wishlist: many(wishlist),
  chatMessages: many(chatMessages),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  rentals: many(rentals),
  wishlist: many(wishlist),
}));

export const rentalsRelations = relations(rentals, ({ one }) => ({
  user: one(users, {
    fields: [rentals.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [rentals.productId],
    references: [products.id],
  }),
}));

export const wishlistRelations = relations(wishlist, ({ one }) => ({
  user: one(users, {
    fields: [wishlist.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [wishlist.productId],
    references: [products.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  product: one(products, {
    fields: [leads.productId],
    references: [products.id],
  }),
}));

export const productDraftsRelations = relations(productDrafts, ({ one }) => ({
  category: one(categories, {
    fields: [productDrafts.categoryId],
    references: [categories.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Will be defined after productSpecificationsSchema

export const insertRentalSchema = createInsertSchema(rentals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWishlistSchema = createInsertSchema(wishlist).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});

export const insertProductDraftSchema = createInsertSchema(productDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Product specification schemas
export const productColorSchema = z.object({
  id: z.string(),
  name: z.string(),
  hex: z.string(),
  imageUrl: z.string().optional(),
});

export const productBasicInfoSchema = z.object({
  modelNumber: z.string().optional(),
  maker: z.string().optional(),
  type: z.string().optional(),
  releaseYear: z.string().optional(),
  dimensions: z.string().optional(), // "180 x 340 x 385mm (가로 x 세로 x 높이)"
});

export const productServiceInfoSchema = z.object({
  maintenanceDesc: z.string().optional(),
  warranty: z.string().optional(),
  installLeadTime: z.string().optional(),
});

export const productSpecificationsSchema = z.object({
  features: z.array(z.string()).default([]),
  rentalOptions: z.object({
    minimumPeriod: z.array(z.object({
      months: z.number(),
      monthlyPrice: z.number(),
    })).default([]),
    maintenanceCycle: z.array(z.object({
      months: z.number(),
      additionalFee: z.number(),
      description: z.string(),
    })).default([]),
  }).optional(),
  // Enhanced structure from reference app
  colors: z.array(productColorSchema).default([]),
  functions: z.array(z.string()).default([]), // ["냉수", "온수", "정수"]
  tags: z.array(z.string()).default([]), // ["베스트", "타사상품 혜택"]
  basicInfo: productBasicInfoSchema.optional(),
  extraFeatures: z.array(z.string()).default([]), // ["고온", "UV 살균", "IoT 기능"]
  serviceInfo: productServiceInfoSchema.optional(),
});

// Enhanced product schema with structured specifications validation
export const insertProductWithSpecsSchema = insertProductSchema
  .omit({ rating: true }) // Remove auto-generated rating field
  .merge(z.object({
    specifications: productSpecificationsSchema,
    // Accept number and convert to string for DB decimal type  
    rating: z.number().min(0).max(5).transform(String),
  }));

// Enhanced draft schema with specification validation for Gemini parsing
export const insertProductDraftWithSpecsSchema = insertProductDraftSchema
  .merge(z.object({
    specifications: productSpecificationsSchema.optional(),
    // Accept both numbers and strings, convert to strings for DB decimal fields
    rating: z.union([z.number(), z.string()])
      .transform((val) => {
        if (typeof val === 'string') {
          const num = parseFloat(val);
          return isNaN(num) ? '4.5' : Math.min(Math.max(num, 0), 5).toString();
        }
        return Math.min(Math.max(val, 0), 5).toString();
      }).optional(),
    monthlyPrice: z.union([z.number(), z.string()])
      .transform((val) => {
        if (typeof val === 'string') {
          const num = parseFloat(val.replace(/[^0-9.]/g, ''));
          return isNaN(num) || num <= 0 ? undefined : num.toString();
        }
        return val <= 0 ? undefined : val.toString();
      }).optional(),
    // 프로모션 가격 처리 (monthlyPrice와 동일한 패턴)
    promotionalPrice: z.union([z.number(), z.string()])
      .transform((val) => {
        if (typeof val === 'string') {
          const num = parseFloat(val.replace(/[^0-9.]/g, ''));
          return isNaN(num) || num <= 0 ? undefined : num.toString();
        }
        return val <= 0 ? undefined : val.toString();
      }).optional(),
    originalPrice: z.union([z.number(), z.string()])
      .transform((val) => {
        if (typeof val === 'string') {
          const num = parseFloat(val.replace(/[^0-9.]/g, ''));
          return isNaN(num) || num <= 0 ? undefined : num.toString();
        }
        return val <= 0 ? undefined : val.toString();
      }).optional(),
    // Array fields with proper validation
    detailImageUrls: z.array(z.string().url()).default([]),
    errors: z.array(z.string()).default([]),
  }));

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductColor = z.infer<typeof productColorSchema>;
export type ProductBasicInfo = z.infer<typeof productBasicInfoSchema>;
export type ProductServiceInfo = z.infer<typeof productServiceInfoSchema>;
export type ProductSpecifications = z.infer<typeof productSpecificationsSchema>;
export type Rental = typeof rentals.$inferSelect;
export type InsertRental = z.infer<typeof insertRentalSchema>;
export type Wishlist = typeof wishlist.$inferSelect;
export type InsertWishlist = z.infer<typeof insertWishlistSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type ProductDraft = typeof productDrafts.$inferSelect;
export type InsertProductDraft = z.infer<typeof insertProductDraftSchema>;
export type InsertProductDraftWithSpecs = z.infer<typeof insertProductDraftWithSpecsSchema>;
