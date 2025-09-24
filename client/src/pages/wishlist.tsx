import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/product-card";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import { Heart, ShoppingBag } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Wishlist } from "@shared/schema";

export default function WishlistPage() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const { data: wishlist, isLoading } = useQuery({
    queryKey: ["/api/wishlist"],
    enabled: isAuthenticated,
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: (productId: string) => apiRequest('DELETE', `/api/wishlist/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: "찜목록에서 제거됨",
        description: "제품이 찜목록에서 제거되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "찜목록에서 제거하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-6">
              <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">로그인이 필요합니다</h2>
              <p className="text-muted-foreground mb-4">
                찜목록을 보려면 로그인해주세요.
              </p>
              <Button onClick={() => window.location.href = "/api/login"} data-testid="button-login">
                로그인
              </Button>
            </CardContent>
          </Card>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />
      
      <div className="container mx-auto px-4 py-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
              찜목록
            </h1>
            <p className="text-muted-foreground">
              관심 있는 제품들을 확인해보세요
            </p>
          </div>
          <Heart className="h-6 w-6 text-red-500" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !wishlist || (wishlist as any[])?.length === 0 ? (
          <div className="text-center py-12">
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold mb-2" data-testid="text-empty-title">
                  찜목록이 비어있습니다
                </h2>
                <p className="text-muted-foreground mb-4">
                  마음에 드는 제품을 찜해보세요!
                </p>
                <Button 
                  onClick={() => window.location.href = "/products"}
                  data-testid="button-browse-products"
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  제품 둘러보기
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(wishlist as any[])?.map((item: Wishlist & { product: any }) => (
              <div key={item.id} className="relative group">
                <ProductCard 
                  product={item.product}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeFromWishlistMutation.mutate(item.productId)}
                  disabled={removeFromWishlistMutation.isPending}
                  data-testid={`button-remove-wishlist-${item.productId}`}
                >
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}