import { Card, CardContent } from "@/components/ui/card";
import { MotionButton } from "@/components/ui/motion-button";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { SharedElement } from "@/components/PageTransition";
import KakaoChatButton from "@/components/kakao-chat-button";
import { interactiveVariants, springPresets } from "@/lib/motion";

interface Product {
  id: string;
  nameKo: string;
  descriptionKo: string;
  imageUrl: string;
  monthlyPrice: string;
  originalPrice?: string;
  rating: string;
  brand: string;
}

interface ProductCardProps {
  product: Product;
  compact?: boolean;
  showRecommendedBadge?: boolean;
}

export default function ProductCard({ product, compact = false, showRecommendedBadge = false }: ProductCardProps) {
  const monthlyPrice = parseFloat(product.monthlyPrice);
  const originalPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;

  const handleKakaoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPresets.gentle}
      whileHover={interactiveVariants.cardHover}
      whileTap={interactiveVariants.cardPress}
      className="group h-full"
      style={{
        willChange: 'transform, box-shadow',
      }}
    >
      <Card className="overflow-hidden border-2 border-border/30 hover:border-primary/20 bg-card/95 backdrop-blur-sm h-full flex flex-col transition-colors duration-300" data-testid={`card-product-${product.id}`}>
        <div className="relative">
          <Link href={`/products/${product.id}`} className="block cursor-pointer">
            <SharedElement 
              layoutId={`product-image-${product.id}`}
              className={`${compact ? "h-40" : "h-48"} bg-muted overflow-hidden relative`}
            >
              <motion.img
                src={product.imageUrl || "/api/placeholder/400/300"}
                alt={product.nameKo}
                className="w-full h-full object-cover"
                data-testid="img-product-card"
                whileHover={interactiveVariants.imageZoom}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
              {/* 호버 시 미묘한 오버레이 효과 */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            </SharedElement>
          </Link>
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {showRecommendedBadge && (
              <Badge className="bg-secondary text-secondary-foreground" data-testid="badge-recommended">
                추천
              </Badge>
            )}
            {originalPrice && originalPrice > monthlyPrice && (
              <Badge className="bg-accent text-accent-foreground" data-testid="badge-discount">
                할인
              </Badge>
            )}
          </div>

          {/* Consultation Button (top right) */}
          <div className="absolute top-2 right-2" onClick={handleKakaoClick}>
            <KakaoChatButton 
              variant="outline" 
              size="sm"
              className="bg-background/80 backdrop-blur-sm"
              productName={product.nameKo}
            />
          </div>
        </div>

        <CardContent className="p-4">
          <div className="space-y-2">
            <Link href={`/products/${product.id}`} className="block cursor-pointer">
              <div className="flex items-start justify-between">
                <h3 className={`font-semibold text-foreground line-clamp-1 ${compact ? "text-sm" : "text-base"}`} data-testid="text-product-name">
                  {product.nameKo}
                </h3>
                <div className="flex items-center space-x-1 ml-2">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-muted-foreground" data-testid="text-product-rating">
                    {product.rating}
                  </span>
                </div>
              </div>
            </Link>

            <Link href={`/products/${product.id}`} className="block cursor-pointer">
              <p className={`text-muted-foreground line-clamp-2 ${compact ? "text-xs" : "text-sm"}`} data-testid="text-product-description">
                {product.descriptionKo}
              </p>

              <div className="flex items-center justify-between mt-2">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`font-bold text-foreground ${compact ? "text-base" : "text-lg"}`} data-testid="text-product-price">
                      월 {monthlyPrice.toLocaleString()}원
                    </span>
                    {originalPrice && originalPrice > monthlyPrice && (
                      <span className={`text-muted-foreground line-through ${compact ? "text-xs" : "text-sm"}`}>
                        월 {originalPrice.toLocaleString()}원
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {product.brand}
                  </Badge>
                </div>
              </div>
            </Link>

            {!compact && (
              <motion.div 
                className="mt-3 space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, ...springPresets.gentle }}
              >
                <Link href={`/products/${product.id}`}>
                  <MotionButton 
                    variant="outline" 
                    className="w-full hover:bg-primary/5" 
                    data-testid="button-view-details"
                    motionVariant="button"
                  >
                    상품 상세보기
                  </MotionButton>
                </Link>
                <div onClick={handleKakaoClick}>
                  <KakaoChatButton 
                    className="w-full"
                    productName={product.nameKo}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}