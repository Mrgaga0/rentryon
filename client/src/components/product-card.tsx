import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { Link } from "wouter";
import KakaoChatButton from "@/components/kakao-chat-button";

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

  return (
    <Card className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1" data-testid={`card-product-${product.id}`}>
      <Link href={`/products/${product.id}`}>
        <div className="relative">
          <div className={`${compact ? "h-40" : "h-48"} bg-muted overflow-hidden`}>
            <img
              src={product.imageUrl || "/api/placeholder/400/300"}
              alt={product.nameKo}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              data-testid="img-product-card"
            />
          </div>
          
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
          <div className="absolute top-2 right-2">
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

            <p className={`text-muted-foreground line-clamp-2 ${compact ? "text-xs" : "text-sm"}`} data-testid="text-product-description">
              {product.descriptionKo}
            </p>

            <div className="flex items-center justify-between">
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

            {!compact && (
              <div className="mt-3 space-y-2">
                <Link href={`/products/${product.id}`}>
                  <Button variant="outline" className="w-full" data-testid="button-view-details">
                    상품 상세보기
                  </Button>
                </Link>
                <KakaoChatButton 
                  className="w-full"
                  productName={product.nameKo}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}