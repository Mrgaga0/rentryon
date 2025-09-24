import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import AiChatButton from "@/components/ai-chat-button";
import KakaoChatButton from "@/components/kakao-chat-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Star, Shield, Truck, ArrowLeft, MessageSquare, Phone } from "lucide-react";
import { Link } from "wouter";
import { insertLeadSchema } from "@shared/schema";

// Consultation form schema
const consultationFormSchema = insertLeadSchema.extend({
  phone: z.string().min(10, "연락처를 입력해주세요"),
  notes: z.string().optional(),
});

type ConsultationFormData = z.infer<typeof consultationFormSchema>;

export default function ProductDetail() {
  const [match, params] = useRoute("/products/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConsultationForm, setShowConsultationForm] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["/api/products", params?.id],
    enabled: !!params?.id,
  });

  const form = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: {
      productId: params?.id || "",
      name: "",
      phone: "",
      notes: "",
    },
  });

  const submitConsultationMutation = useMutation({
    mutationFn: async (data: ConsultationFormData) => {
      return await apiRequest("POST", "/api/leads", {
        ...data,
        productId: params?.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "상담 신청 완료",
        description: "상담 신청이 성공적으로 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.",
      });
      form.reset();
      setShowConsultationForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: (error) => {
      console.error("Consultation submission error:", error);
      toast({
        title: "오류 발생",
        description: "상담 신청에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const onSubmitConsultation = (data: ConsultationFormData) => {
    submitConsultationMutation.mutate(data);
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
            <Link href="/home">
              <Button>제품 목록으로 돌아가기</Button>
            </Link>
          </div>
        </div>
        <MobileNav />
      </div>
    );
  }

  const monthlyPrice = parseFloat((product as any).monthlyPrice);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <Link href="/home">
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
                    <p className="text-sm text-muted-foreground">
                      렌탈 요금은 기간과 조건에 따라 달라질 수 있습니다
                    </p>
                  </div>

                  <Separator />

                  {/* Consultation Actions */}
                  <div className="space-y-3">
                    <KakaoChatButton 
                      className="w-full" 
                      size="lg"
                      productName={(product as any).nameKo}
                    />
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      size="lg"
                      onClick={() => setShowConsultationForm(true)}
                      data-testid="button-consultation-form"
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      상담 신청하기
                    </Button>
                  </div>
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

        {/* Consultation Form Modal */}
        {showConsultationForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  상담 신청하기
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitConsultation)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>성함</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="성함을 입력해주세요" data-testid="input-consultation-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>연락처</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="010-0000-0000" data-testid="input-consultation-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>문의사항 (선택)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="렌탈 기간, 설치 관련 문의사항 등을 적어주세요"
                              rows={3}
                              data-testid="textarea-consultation-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowConsultationForm(false)}
                        data-testid="button-consultation-cancel"
                      >
                        취소
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={submitConsultationMutation.isPending}
                        data-testid="button-consultation-submit"
                      >
                        {submitConsultationMutation.isPending ? "처리 중..." : "신청하기"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}

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