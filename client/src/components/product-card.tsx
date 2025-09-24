import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Star } from "lucide-react";
import { Link } from "wouter";

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
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isWishlisted, setIsWishlisted] = useState(false);

  const addToWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      return await apiRequest("POST", "/api/wishlist", { productId });
    },
    onSuccess: () => {
      setIsWishlisted(true);
      toast({
        title: "찜목록에 추가됨",
        description: "찜목록에서 확인할 수 있습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "로그인이 필요합니다",
          description: "로그인 후 이용해주세요.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "오류 발생",
        description: "찜목록 추가에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast({
        title: "로그인이 필요합니다",
        description: "로그인 후 이용해주세요.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    
    addToWishlistMutation.mutate(product.id);
  };

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

          {/* Wishlist Button */}
          <Button
            variant="outline"
            size="icon"
            className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
            onClick={handleAddToWishlist}
            disabled={addToWishlistMutation.isPending || isWishlisted}
            data-testid="button-wishlist-card"
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
          </Button>
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
              <Button className="w-full mt-3" data-testid="button-rent-card">
                렌탈하기
              </Button>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
