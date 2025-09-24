import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import AiChatButton from "@/components/ai-chat-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Heart, Star, Calendar, Shield, Truck, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ProductDetail() {
  const [match, params] = useRoute("/products/:id");
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rentalPeriod, setRentalPeriod] = useState("3");
  const [startDate, setStartDate] = useState("");

  const { data: product, isLoading } = useQuery({
    queryKey: ["/api/products", params?.id],
    enabled: !!params?.id,
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      return await apiRequest("POST", "/api/wishlist", { productId });
    },
    onSuccess: () => {
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

  const createRentalMutation = useMutation({
    mutationFn: async (rentalData: any) => {
      return await apiRequest("POST", "/api/rentals", rentalData);
    },
    onSuccess: () => {
      toast({
        title: "렌탈 신청 완료",
        description: "렌탈 신청이 성공적으로 접수되었습니다.",
      });
      // Redirect to my rentals page
      window.location.href = "/my-rentals";
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
        description: "렌탈 신청에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Set default start date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleAddToWishlist = () => {
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
    
    if (params?.id) {
      addToWishlistMutation.mutate(params.id);
    }
  };

  const handleRental = () => {
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

    if (!startDate) {
      toast({
        title: "시작일을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(startDateTime);
    endDateTime.setMonth(endDateTime.getMonth() + parseInt(rentalPeriod));

    const monthlyPrice = parseFloat((product as any).monthlyPrice);
    const totalPrice = monthlyPrice * parseInt(rentalPeriod);

    createRentalMutation.mutate({
      productId: params?.id,
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      monthlyPrice: monthlyPrice.toString(),
      totalPrice: totalPrice.toString(),
    });
  };

  if (!match) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">제품을 찾을 수 없습니다</p>
            <Link href="/products">
              <Button>제품 목록으로 돌아가기</Button>
            </Link>
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  const monthlyPrice = parseFloat((product as any).monthlyPrice);
  const totalPrice = monthlyPrice * parseInt(rentalPeriod);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <Link href="/products">
          <Button variant="ghost" size="sm" className="mb-6" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            제품 목록으로
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="aspect-square bg-muted rounded-xl overflow-hidden">
            <img
              src={(product as any).imageUrl || "/api/placeholder/600/600"}
              alt={(product as any).nameKo}
              className="w-full h-full object-cover"
              data-testid="img-product"
            />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground" data-testid="text-product-name">
                  {(product as any).nameKo}
                </h1>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleAddToWishlist}
                  disabled={addToWishlistMutation.isPending}
                  data-testid="button-add-wishlist"
                >
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-4 mb-4">
                <Badge variant="secondary">{(product as any).brand}</Badge>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium" data-testid="text-product-rating">{(product as any).rating}</span>
                </div>
              </div>

              <p className="text-muted-foreground mb-4" data-testid="text-product-description">
                {(product as any).descriptionKo}
              </p>
            </div>

            {/* Pricing */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-foreground" data-testid="text-monthly-price">
                        월 {monthlyPrice.toLocaleString()}원
                      </span>
                      {(product as any).originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          월 {parseFloat((product as any).originalPrice).toLocaleString()}원
                        </span>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Rental Configuration */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">렌탈 기간</label>
                      <Select value={rentalPeriod} onValueChange={setRentalPeriod} data-testid="select-rental-period">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1개월</SelectItem>
                          <SelectItem value="3">3개월</SelectItem>
                          <SelectItem value="6">6개월</SelectItem>
                          <SelectItem value="12">12개월</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">시작일</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Tomorrow
                        data-testid="input-start-date"
                      />
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span>월 렌탈료</span>
                        <span>{monthlyPrice.toLocaleString()}원</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>렌탈 기간</span>
                        <span>{rentalPeriod}개월</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between font-semibold">
                        <span>총 금액</span>
                        <span className="text-primary" data-testid="text-total-price">
                          {totalPrice.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleRental}
                    disabled={createRentalMutation.isPending}
                    data-testid="button-rent"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {createRentalMutation.isPending ? "처리 중..." : "렌탈 신청하기"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Service Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className="bg-secondary/10 p-2 rounded-full">
                    <Truck className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">무료 배송 & 설치</p>
                    <p className="text-xs text-muted-foreground">전국 어디든 무료</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className="bg-accent/10 p-2 rounded-full">
                    <Shield className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">안심 A/S</p>
                    <p className="text-xs text-muted-foreground">무료 수리 & 교체</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Product Specifications */}
        {(product as any).specifications && (
          <Card className="mt-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">제품 사양</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries((product as any).specifications as Record<string, string>).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-border">
                    <span className="font-medium">{key}</span>
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <MobileNav />
      <AiChatButton />
    </div>
  );
}
