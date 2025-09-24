import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion } from "framer-motion";
import { SharedElement } from "@/components/PageTransition";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Star, Shield, Truck, ArrowLeft, MessageSquare, Phone, X } from "lucide-react";
import { Link } from "wouter";
import { insertLeadSchema } from "@shared/schema";

// Consultation form schema - match the insertLeadSchema exactly
const consultationFormSchema = insertLeadSchema;

type ConsultationFormData = z.infer<typeof insertLeadSchema>;


export default function ProductDetail() {
  const [match, params] = useRoute("/products/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [selectedRentalOption, setSelectedRentalOption] = useState<any>(null);
  const [selectedMaintenanceOption, setSelectedMaintenanceOption] = useState<any>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["/api/products", params?.id],
    enabled: !!params?.id,
  });

  const form = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: {
      productId: params?.id || "",
      productName: "", // Will be set when product loads
      rentalPeriodMonths: selectedRentalOption?.months || 3, // Use selected rental option
      name: "",
      phone: "",
      preferredTime: "",
      message: "",
    },
  });

  const submitConsultationMutation = useMutation({
    mutationFn: async (data: ConsultationFormData) => {
      const submissionData = {
        ...data,
        productId: params?.id || null,
        productName: (product as any)?.nameKo || data.productName,
      };
      return await apiRequest("POST", "/api/leads", submissionData);
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
      toast({
        title: "오류 발생",
        description: "상담 신청에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  // 기본 옵션 설정 (product가 로드된 후 한 번만)
  useEffect(() => {
    if (!product) return;
    
    const specs = (product as any)?.specifications || {};
    const rentals = specs?.rentalOptions?.minimumPeriod || [];
    const maintenance = specs?.rentalOptions?.maintenanceCycle || [];
    
    if (rentals.length > 0 && !selectedRentalOption) {
      setSelectedRentalOption(rentals[0]);
    }
    if (maintenance.length > 0 && !selectedMaintenanceOption) {
      setSelectedMaintenanceOption(maintenance[0]);
    }
  }, [product]); // product만 dependency로 설정

  // 선택된 옵션과 상담 폼 동기화
  useEffect(() => {
    if (selectedRentalOption) {
      form.setValue("rentalPeriodMonths", selectedRentalOption.months);
    }
  }, [selectedRentalOption, form]);

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

  // 제품 옵션 가져오기
  const specifications = (product as any)?.specifications || {};
  const rentalOptions = specifications?.rentalOptions?.minimumPeriod || [];
  const maintenanceOptions = specifications?.rentalOptions?.maintenanceCycle || [];

  // 가격 계산
  const calculateTotalPrice = () => {
    let basePrice = selectedRentalOption ? selectedRentalOption.monthlyPrice : monthlyPrice;
    let additionalFee = selectedMaintenanceOption ? selectedMaintenanceOption.additionalFee : 0;
    return basePrice + additionalFee;
  };

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
          <SharedElement 
            layoutId={`product-image-${params?.id}`}
            className="aspect-square bg-muted rounded-xl overflow-hidden"
          >
            <img
              src={(product as any).imageUrl || "/api/placeholder/600/600"}
              alt={(product as any).nameKo}
              className="w-full h-full object-cover"
              data-testid="img-product"
            />
          </SharedElement>

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
                        월 {calculateTotalPrice().toLocaleString()}원
                      </span>
                      {(product as any).originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          월 {parseFloat((product as any).originalPrice).toLocaleString()}원
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      선택한 옵션에 따라 렌탈료가 변동됩니다
                    </p>
                  </div>

                  {/* 의무사용기간 선택 */}
                  {rentalOptions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        의무사용기간
                      </label>
                      <Select
                        value={selectedRentalOption?.months?.toString() || ""}
                        onValueChange={(value) => {
                          const option = rentalOptions.find(opt => opt.months.toString() === value);
                          setSelectedRentalOption(option);
                        }}
                      >
                        <SelectTrigger data-testid="select-rental-period">
                          <SelectValue placeholder="기간을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {rentalOptions.map((option) => (
                            <SelectItem 
                              key={option.months} 
                              value={option.months.toString()}
                            >
                              {option.months}개월 - 월 {option.monthlyPrice.toLocaleString()}원
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* 관리주기 선택 */}
                  {maintenanceOptions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        관리주기
                      </label>
                      <Select
                        value={selectedMaintenanceOption?.months?.toString() || ""}
                        onValueChange={(value) => {
                          const option = maintenanceOptions.find(opt => opt.months.toString() === value);
                          setSelectedMaintenanceOption(option);
                        }}
                      >
                        <SelectTrigger data-testid="select-maintenance-cycle">
                          <SelectValue placeholder="관리주기를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {maintenanceOptions.map((option) => (
                            <SelectItem 
                              key={option.months} 
                              value={option.months.toString()}
                            >
                              {option.description} 
                              {option.additionalFee > 0 && ` (+${option.additionalFee.toLocaleString()}원)`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator />

                  {/* Consultation Actions */}
                  <div className="space-y-3">
                    <KakaoChatButton 
                      className="w-full" 
                      size="lg"
                      productName={(product as any).nameKo}
                    />
                    
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Button
                        variant="outline"
                        className="w-full"
                        size="lg"
                        onClick={() => setShowConsultationForm(true)}
                        data-testid="button-consultation-form"
                      >
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        >
                          <Phone className="mr-2 h-4 w-4" />
                        </motion.div>
                        상담 신청하기
                      </Button>
                    </motion.div>
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
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowConsultationForm(false)}
          >
            <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  상담 신청하기
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowConsultationForm(false)}
                  data-testid="button-consultation-close"
                >
                  <X className="h-4 w-4" />
                </Button>
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
                      name="rentalPeriodMonths"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>렌탈 기간</FormLabel>
                          <FormControl>
                            <select 
                              {...field} 
                              className="w-full px-3 py-2 border border-input rounded-md bg-background"
                              data-testid="consultation-select-rental-period"
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              value={field.value}
                            >
                              <option value={1}>1개월</option>
                              <option value={3}>3개월</option>
                              <option value={6}>6개월</option>
                              <option value={12}>12개월</option>
                              <option value={24}>24개월</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="preferredTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>선호 상담 시간 (선택)</FormLabel>
                          <FormControl>
                            <select 
                              {...field}
                              value={field.value || ""}
                              className="w-full px-3 py-2 border border-input rounded-md bg-background"
                              data-testid="select-preferred-time"
                            >
                              <option value="">선택해주세요</option>
                              <option value="오전 9-12시">오전 9-12시</option>
                              <option value="오후 1-6시">오후 1-6시</option>
                              <option value="저녁 6-9시">저녁 6-9시</option>
                              <option value="주말">주말</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>문의사항 (선택)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              value={field.value || ""}
                              placeholder="추가 문의사항이 있으시면 적어주세요"
                              rows={3}
                              data-testid="textarea-consultation-message"
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
                {Object.entries((product as any).specifications as Record<string, any>).map(([key, value]) => {
                  // nested objects(rentalOptions) 제외하고 기본 사양만 표시
                  if (key === 'rentalOptions' || typeof value === 'object') {
                    return null;
                  }
                  return (
                    <div key={key} className="flex justify-between py-2 border-b border-border">
                      <span className="font-medium">{key}</span>
                      <span className="text-muted-foreground">{String(value)}</span>
                    </div>
                  );
                })}
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