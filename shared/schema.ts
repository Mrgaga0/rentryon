import { sql, relations } from 'drizzle-orm';
import {
  index,
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
  description: text("description").notNull(),
  descriptionKo: text("description_ko").notNull(),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).notNull().default('4.5'),
  brand: varchar("brand", { length: 100 }).notNull(),
  specifications: jsonb("specifications").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Rental = typeof rentals.$inferSelect;
export type InsertRental = z.infer<typeof insertRentalSchema>;
export type Wishlist = typeof wishlist.$inferSelect;
export type InsertWishlist = z.infer<typeof insertWishlistSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
