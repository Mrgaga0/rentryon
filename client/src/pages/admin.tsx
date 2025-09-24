import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Settings, Users, Package, BarChart3, MessageCircle, LogOut, Plus, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

// 제품 업로드 폼 스키마
const productFormSchema = z.object({
  nameKo: z.string().min(1, "제품명(한국어)을 입력해주세요"),
  name: z.string().min(1, "제품명(영어)을 입력해주세요"),
  brand: z.string().min(1, "브랜드를 입력해주세요"),
  categoryId: z.string().min(1, "카테고리를 선택해주세요"),
  descriptionKo: z.string().min(10, "제품 설명을 10자 이상 입력해주세요"),
  monthlyPrice: z.string().min(1, "기본 월 렌탈료를 입력해주세요"),
  originalPrice: z.string().optional(),
  imageUrl: z.string().min(1, "제품 이미지를 업로드해주세요"),
  modelNumber: z.string().min(1, "모델명을 입력해주세요"),
  releaseYear: z.string().min(4, "출시년도를 입력해주세요"),
  dimensions: z.string().min(1, "제품 크기를 입력해주세요"),
  features: z.string().min(1, "주요 기능을 입력해주세요"),
  // 의무사용기간 옵션들
  rentalOptions: z.string().min(1, "의무사용기간 옵션을 설정해주세요"),
  maintenanceOptions: z.string().min(1, "관리주기 옵션을 설정해주세요"),
});

type ProductFormData = z.infer<typeof productFormSchema>;

export default function AdminPage() {
  const [, navigate] = useLocation();
  const [showProductForm, setShowProductForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleLogout = () => {
    navigate("/home");
  };

  // 카테고리 조회
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  // 제품 업로드 폼
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      nameKo: "",
      name: "",
      brand: "",
      categoryId: "",
      descriptionKo: "",
      monthlyPrice: "",
      originalPrice: "",
      imageUrl: "",
      modelNumber: "",
      releaseYear: new Date().getFullYear().toString(),
      dimensions: "",
      features: "",
      rentalOptions: "",
      maintenanceOptions: "",
    },
  });

  // 이미지 업로드 함수
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    setUploadingImage(true);
    try {
      const response = await fetch('/api/upload/product-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('이미지 업로드에 실패했습니다.');
      }

      const data = await response.json();
      return data.imageUrl;
    } finally {
      setUploadingImage(false);
    }
  };

  // 제품 생성 뮤테이션
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      // 옵션 파싱
      const rentalOptions = data.rentalOptions ? JSON.parse(data.rentalOptions) : [];
      const maintenanceOptions = data.maintenanceOptions ? JSON.parse(data.maintenanceOptions) : [];

      // specifications JSON 구성
      const specifications = {
        modelNumber: data.modelNumber,
        releaseYear: parseInt(data.releaseYear),
        dimensions: data.dimensions,
        features: data.features.split(',').map(f => f.trim()).filter(f => f),
        rentalOptions: {
          minimumPeriod: rentalOptions,
          maintenanceCycle: maintenanceOptions,
        },
      };

      const productData = {
        nameKo: data.nameKo,
        name: data.name,
        brand: data.brand,
        categoryId: data.categoryId,
        descriptionKo: data.descriptionKo,
        monthlyPrice: data.monthlyPrice,
        originalPrice: data.originalPrice || null,
        imageUrl: data.imageUrl,
        specifications,
      };

      return await apiRequest('POST', '/api/products', productData);
    },
    onSuccess: () => {
      toast({
        title: "제품 업로드 성공",
        description: "새 제품이 성공적으로 등록되었습니다.",
      });
      form.reset();
      setShowProductForm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error: any) => {
      toast({
        title: "제품 업로드 실패", 
        description: error.message || "제품 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    createProductMutation.mutate(data);
  };

  const stats = [
    { title: "전체 사용자", value: "1,234", icon: Users, color: "text-blue-600" },
    { title: "총 제품", value: "456", icon: Package, color: "text-green-600" },
    { title: "활성 대여", value: "89", icon: BarChart3, color: "text-orange-600" },
    { title: "금월 상담", value: "167", icon: MessageCircle, color: "text-purple-600" }
  ];

  const recentUsers = [
    { id: 1, name: "김철수", email: "kim@example.com", joinDate: "2024-01-15", status: "active" },
    { id: 2, name: "이영희", email: "lee@example.com", joinDate: "2024-01-14", status: "active" },
    { id: 3, name: "박민수", email: "park@example.com", joinDate: "2024-01-13", status: "inactive" },
  ];

  const recentRentals = [
    { id: 1, user: "김철수", product: "삼성 냉장고", status: "active", startDate: "2024-01-10" },
    { id: 2, user: "이영희", product: "LG 세탁기", status: "pending", startDate: "2024-01-12" },
    { id: 3, user: "박민수", product: "다이슨 청소기", status: "completed", startDate: "2023-12-01" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="admin-title">
              렌탈리움 관리자
            </h1>
            <p className="text-muted-foreground mt-1">시스템 관리 및 모니터링</p>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              onClick={handleLogout} 
              variant="outline"
              data-testid="button-admin-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card data-testid={`stat-card-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard" data-testid="tab-dashboard">
                <BarChart3 className="h-4 w-4 mr-2" />
                대시보드
              </TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users">
                <Users className="h-4 w-4 mr-2" />
                사용자
              </TabsTrigger>
              <TabsTrigger value="products" data-testid="tab-products">
                <Package className="h-4 w-4 mr-2" />
                제품
              </TabsTrigger>
              <TabsTrigger value="rentals" data-testid="tab-rentals">
                <MessageCircle className="h-4 w-4 mr-2" />
                대여
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">
                <Settings className="h-4 w-4 mr-2" />
                설정
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card data-testid="recent-users-card">
                  <CardHeader>
                    <CardTitle>최근 가입 사용자</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                              {user.status === 'active' ? '활성' : '비활성'}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">{user.joinDate}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="recent-rentals-card">
                  <CardHeader>
                    <CardTitle>최근 대여 현황</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentRentals.map((rental) => (
                        <div key={rental.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{rental.product}</p>
                            <p className="text-sm text-muted-foreground">{rental.user}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              rental.status === 'active' ? 'default' : 
                              rental.status === 'pending' ? 'secondary' : 'outline'
                            }>
                              {rental.status === 'active' ? '진행중' : 
                               rental.status === 'pending' ? '대기중' : '완료'}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">{rental.startDate}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users">
              <Card data-testid="users-management-card">
                <CardHeader>
                  <CardTitle>사용자 관리</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">사용자 관리 기능이 곧 제공될 예정입니다.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              <Card data-testid="products-management-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>제품 관리</CardTitle>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => setShowProductForm(!showProductForm)}
                      data-testid="button-toggle-product-form"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      새 제품 추가
                    </Button>
                  </motion.div>
                </CardHeader>
                <CardContent>
                  {showProductForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border rounded-lg p-6 mb-6"
                    >
                      <h3 className="text-lg font-semibold mb-4">새 제품 등록</h3>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 제품명 (한국어) */}
                            <FormField
                              control={form.control}
                              name="nameKo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>제품명 (한국어) *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="예: 아이콘 냉온정 정수기" {...field} data-testid="input-name-ko" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* 제품명 (영어) */}
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>제품명 (영어) *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="예: Icon Hot & Cold Water Purifier" {...field} data-testid="input-name-en" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* 브랜드 */}
                            <FormField
                              control={form.control}
                              name="brand"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>브랜드 *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="예: 코웨이" {...field} data-testid="input-brand" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* 카테고리 */}
                            <FormField
                              control={form.control}
                              name="categoryId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>카테고리 *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-category">
                                        <SelectValue placeholder="카테고리를 선택하세요" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {categories.map((category: any) => (
                                        <SelectItem key={category.id} value={category.id}>
                                          {category.nameKo}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* 모델명 */}
                            <FormField
                              control={form.control}
                              name="modelNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>모델명 *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="예: CHP-721TN" {...field} data-testid="input-model" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* 출시년도 */}
                            <FormField
                              control={form.control}
                              name="releaseYear"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>출시년도 *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="예: 2024" {...field} data-testid="input-year" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* 월 렌탈료 */}
                            <FormField
                              control={form.control}
                              name="monthlyPrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>월 렌탈료 (원) *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="예: 14200" type="number" {...field} data-testid="input-monthly-price" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* 원가 (선택사항) */}
                            <FormField
                              control={form.control}
                              name="originalPrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>원가 (원)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="예: 300000" type="number" {...field} data-testid="input-original-price" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* 제품 크기 */}
                          <FormField
                            control={form.control}
                            name="dimensions"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>제품 크기 *</FormLabel>
                                <FormControl>
                                  <Input placeholder="예: 180 × 340 × 385mm (가로 × 세로 × 높이)" {...field} data-testid="input-dimensions" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* 제품 이미지 업로드 */}
                          <FormField
                            control={form.control}
                            name="imageUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>제품 이미지 *</FormLabel>
                                <FormControl>
                                  <div className="space-y-4">
                                    {field.value ? (
                                      <div className="relative">
                                        <img 
                                          src={field.value} 
                                          alt="업로드된 제품 이미지" 
                                          className="w-32 h-32 object-cover rounded-lg border"
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => field.onChange("")}
                                          className="mt-2"
                                          data-testid="button-remove-image"
                                        >
                                          이미지 제거
                                        </Button>
                                      </div>
                                    ) : (
                                      <div
                                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                          dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25"
                                        }`}
                                        onDragEnter={(e) => {
                                          e.preventDefault();
                                          setDragActive(true);
                                        }}
                                        onDragLeave={(e) => {
                                          e.preventDefault();
                                          setDragActive(false);
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={async (e) => {
                                          e.preventDefault();
                                          setDragActive(false);
                                          const file = e.dataTransfer.files[0];
                                          if (file && file.type.startsWith('image/')) {
                                            try {
                                              const imageUrl = await uploadImage(file);
                                              field.onChange(imageUrl);
                                              toast({
                                                title: "이미지 업로드 성공",
                                                description: "제품 이미지가 업로드되었습니다.",
                                              });
                                            } catch (error) {
                                              toast({
                                                title: "이미지 업로드 실패",
                                                description: "이미지 업로드 중 오류가 발생했습니다.",
                                                variant: "destructive",
                                              });
                                            }
                                          }
                                        }}
                                      >
                                        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <p className="text-sm text-muted-foreground mb-2">
                                          이미지를 드래그하여 놓거나 클릭하여 업로드
                                        </p>
                                        <Input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              try {
                                                const imageUrl = await uploadImage(file);
                                                field.onChange(imageUrl);
                                                toast({
                                                  title: "이미지 업로드 성공",
                                                  description: "제품 이미지가 업로드되었습니다.",
                                                });
                                              } catch (error) {
                                                toast({
                                                  title: "이미지 업로드 실패",
                                                  description: "이미지 업로드 중 오류가 발생했습니다.",
                                                  variant: "destructive",
                                                });
                                              }
                                            }
                                          }}
                                          data-testid="input-image-file"
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          disabled={uploadingImage}
                                          onClick={() => {
                                            document.querySelector<HTMLInputElement>('[data-testid="input-image-file"]')?.click();
                                          }}
                                          data-testid="button-upload-image"
                                        >
                                          {uploadingImage ? "업로드 중..." : "파일 선택"}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* 주요 기능 */}
                          <FormField
                            control={form.control}
                            name="features"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>주요 기능 * (쉼표로 구분)</FormLabel>
                                <FormControl>
                                  <Input placeholder="예: 고효율, UV 살균, 온수기능, 냉수기능, 정수기능" {...field} data-testid="input-features" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* 제품 설명 */}
                          <FormField
                            control={form.control}
                            name="descriptionKo"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>제품 설명 *</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="온차 수준 직수 사용도는 고객센터를 통해 문의해주세요."
                                    rows={4}
                                    {...field}
                                    data-testid="textarea-description-ko"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* 의무사용기간 옵션 */}
                          <div className="col-span-1 md:col-span-2">
                            <FormField
                              control={form.control}
                              name="rentalOptions"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>의무사용기간 옵션 *</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder='[{"months": 12, "monthlyPrice": 15000}, {"months": 24, "monthlyPrice": 14200}, {"months": 36, "monthlyPrice": 13500}]'
                                      rows={3}
                                      {...field}
                                      data-testid="textarea-rental-options"
                                    />
                                  </FormControl>
                                  <p className="text-xs text-muted-foreground">
                                    JSON 형식으로 입력하세요. 예: months(개월), monthlyPrice(월 렌탈료)
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* 관리주기 옵션 */}
                          <div className="col-span-1 md:col-span-2">
                            <FormField
                              control={form.control}
                              name="maintenanceOptions"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>관리주기 옵션 *</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder='[{"months": 1, "additionalFee": 0, "description": "매월 관리"}, {"months": 3, "additionalFee": 5000, "description": "3개월마다 관리"}]'
                                      rows={3}
                                      {...field}
                                      data-testid="textarea-maintenance-options"
                                    />
                                  </FormControl>
                                  <p className="text-xs text-muted-foreground">
                                    JSON 형식으로 입력하세요. 예: months(주기), additionalFee(추가 비용), description(설명)
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="flex justify-end space-x-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowProductForm(false)}
                              data-testid="button-cancel-product"
                            >
                              취소
                            </Button>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                type="submit"
                                disabled={createProductMutation.isPending}
                                data-testid="button-submit-product"
                              >
                                {createProductMutation.isPending ? (
                                  <>
                                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                                    업로드 중...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    제품 등록
                                  </>
                                )}
                              </Button>
                            </motion.div>
                          </div>
                        </form>
                      </Form>
                    </motion.div>
                  )}
                  
                  <p className="text-muted-foreground">
                    등록된 제품 목록 및 수정 기능은 곧 추가될 예정입니다.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rentals">
              <Card data-testid="rentals-management-card">
                <CardHeader>
                  <CardTitle>대여 관리</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">대여 관리 기능이 곧 제공될 예정입니다.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card data-testid="settings-card">
                <CardHeader>
                  <CardTitle>시스템 설정</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">시스템 설정 기능이 곧 제공될 예정입니다.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}