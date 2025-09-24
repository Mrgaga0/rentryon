import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Package, Star } from "lucide-react";
import { Link } from "wouter";

export default function MyRentals() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: rentals, isLoading: rentalsLoading } = useQuery({
    queryKey: ["/api/rentals"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
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
  }, [isAuthenticated, authLoading, toast]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">신청 중</Badge>;
      case 'active':
        return <Badge variant="default" className="bg-primary">렌탈 중</Badge>;
      case 'completed':
        return <Badge variant="secondary">완료</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">취소</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-20 h-20 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="w-16 h-6" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" data-testid="text-rentals-title">내 렌탈 현황</h1>
          <Link href="/products">
            <Button variant="outline" data-testid="button-browse-products">
              <Package className="mr-2 h-4 w-4" />
              제품 둘러보기
            </Button>
          </Link>
        </div>

        {rentalsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-20 h-20 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="w-16 h-6" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : rentals && (rentals as any[]).length > 0 ? (
          <div className="space-y-4">
            {(rentals as any[]).map((rental: any) => (
              <Card key={rental.id} className="hover:shadow-md transition-shadow" data-testid={`card-rental-${rental.id}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Product Image */}
                    <div className="w-full md:w-24 h-48 md:h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={rental.product?.imageUrl || "/api/placeholder/200/200"}
                        alt={rental.product?.nameKo}
                        className="w-full h-full object-cover"
                        data-testid="img-rental-product"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg" data-testid="text-rental-product-name">
                          {rental.product?.nameKo}
                        </h3>
                        {getStatusBadge(rental.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span data-testid="text-rental-period">
                            {formatDate(rental.startDate)} ~ {formatDate(rental.endDate)}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-foreground" data-testid="text-rental-price">
                            월 {parseFloat(rental.monthlyPrice).toLocaleString()}원
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4 text-yellow-400" />
                          <span>{rental.product?.rating}</span>
                        </div>

                        <div>
                          <span className="font-medium text-foreground" data-testid="text-rental-total">
                            총 {parseFloat(rental.totalPrice).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 min-w-0 md:min-w-[120px]">
                      <Link href={`/products/${rental.product?.id}`}>
                        <Button variant="outline" size="sm" className="w-full" data-testid="button-view-product">
                          제품 보기
                        </Button>
                      </Link>
                      
                      {rental.status === 'active' && (
                        <Button variant="outline" size="sm" className="w-full" data-testid="button-manage-rental">
                          관리
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12" data-testid="text-no-rentals">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">아직 렌탈 중인 제품이 없습니다</h3>
            <p className="text-muted-foreground mb-6">
              다양한 가전제품을 렌탈해보세요
            </p>
            <Link href="/products">
              <Button data-testid="button-start-rental">
                <Package className="mr-2 h-4 w-4" />
                제품 둘러보기
              </Button>
            </Link>
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
