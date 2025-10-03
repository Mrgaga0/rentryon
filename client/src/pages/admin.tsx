import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Settings, Users, Package, BarChart3, MessageCircle, LogOut, Plus, Upload, Eye, Edit, Trash2, Check, X, Image, FileText, Save, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

// 구조화된 제품 업로드 폼 스키마 (레퍼런스 앱 패턴 적용)
const productFormSchema = z.object({
  nameKo: z.string().min(1, "제품명(한국어)을 입력해주세요"),
  name: z.string().min(1, "제품명(영어)을 입력해주세요"),
  brand: z.string().min(1, "브랜드를 입력해주세요"),
  categoryId: z.string().min(1, "카테고리를 선택해주세요"),
  descriptionKo: z.string().min(10, "제품 설명을 10자 이상 입력해주세요"),
  monthlyPrice: z.string().min(1, "기본 월 렌탈료를 입력해주세요"),
  originalPrice: z.string().optional(),
  imageUrl: z.string().min(1, "제품 이미지를 업로드해주세요"),
  rating: z.number().min(0).max(5).default(4.5),
  // 구조화된 스펙 정보
  modelNumber: z.string().optional(),
  maker: z.string().optional(),
  type: z.string().optional(),
  releaseYear: z.string().optional(),
  dimensions: z.string().optional(),
  // 렌탈/관리 옵션
  rentalOptions: z.array(z.object({
    months: z.number().min(1),
    monthlyPrice: z.number().min(0),
  })).default([]),
  maintenanceOptions: z.array(z.object({
    months: z.number().min(1),
    additionalFee: z.number().min(0),
    description: z.string().min(1),
  })).default([]),
  // 색상/기능/태그
  colors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    hex: z.string(),
  })).default([]),
  functions: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  extraFeatures: z.array(z.string()).default([]),
  // 서비스 정보
  maintenanceDesc: z.string().optional(),
  warranty: z.string().optional(),
  installLeadTime: z.string().optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

// Draft 편집 폼 스키마 
const editDraftSchema = z.object({
  nameKo: z.string().min(1, "제품명(한국어)을 입력해주세요"),
  name: z.string().optional(),
  brand: z.string().min(1, "브랜드를 입력해주세요"),
  categoryId: z.string().optional(), // categoryId를 optional로 변경
  descriptionKo: z.string().optional(),
  monthlyPrice: z.number().min(0, "월 렌탈료를 입력해주세요"),
  originalPrice: z.number().optional(),
  imageUrl: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
});

type EditDraftFormData = z.infer<typeof editDraftSchema>;

export default function AdminPage() {
  const [, navigate] = useLocation();
  const [showProductForm, setShowProductForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelResults, setExcelResults] = useState<any>(null);
  
  // Imports 탭 상태 관리
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [editingDraft, setEditingDraft] = useState<any>(null);
  
  const { toast } = useToast();

  const handleLogout = () => {
    navigate("/home");
  };

  // Excel 파일 선택 처리
  const handleExcelFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingExcel(true);
    setExcelResults(null);

    try {
      const formData = new FormData();
      formData.append('excel', file);

      const response = await fetch('/api/upload/excel-products', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = 'Excel 파일 업로드에 실패했습니다.';
        try {
          const errorData = await response.json();
          if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          console.error('Failed to parse Excel upload error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setExcelResults(result.data);

      toast({
        title: "Excel 파싱 완료",
        description: `${result.data.stats.successfullyParsed}개 제품이 성공적으로 파싱되었습니다.`,
      });

    } catch (error) {
      console.error('Excel upload error:', error);
      toast({
        title: "Excel 업로드 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setUploadingExcel(false);
      // 파일 input 초기화
      event.target.value = '';
    }
  };

  // 제품 초안 저장 처리  
  const handleSaveDrafts = async () => {
    if (!excelResults?.drafts?.length) return;

    try {
      const response = await fetch('/api/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ drafts: excelResults.drafts }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Draft 저장에 실패했습니다.');
      }

      const savedDrafts = await response.json();
      
      toast({
        title: "Draft 저장 완료",
        description: `${savedDrafts.length}개의 제품 초안이 저장되었습니다.`,
      });
      
      // Clear Excel results after successful save
      setExcelResults(null);
      
      // Refresh the drafts query if we're on the imports tab
      queryClient.invalidateQueries({ queryKey: ['/api/drafts'] });
      
    } catch (error) {
      console.error('Save drafts error:', error);
      toast({
        title: "저장 실패",
        description: error instanceof Error ? error.message : "제품 초안 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 카테고리 조회
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  // Draft 목록 조회 (Imports 탭용)
  // Monthly Merge State
  const [mergeResults, setMergeResults] = useState<any>(null);
  const [showMergeResults, setShowMergeResults] = useState(false);

  const { data: drafts = [], isLoading: draftsLoading, refetch: refetchDrafts } = useQuery<any[]>({
    queryKey: ['/api/drafts', { status: statusFilter !== 'all' ? statusFilter : undefined }],
    enabled: statusFilter !== undefined,
  });

  // Draft 승인 뮤테이션
  const approveDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const response = await fetch(`/api/drafts/${draftId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Draft 승인에 실패했습니다.');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Draft 승인 완료",
        description: `"${data.product?.nameKo || 'Unknown'}" 제품이 생성되었습니다.`,
      });
      refetchDrafts();
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error: any) => {
      toast({
        title: "승인 실패",
        description: error.message || "Draft 승인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Draft 삭제 뮤테이션
  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const response = await fetch(`/api/drafts/${draftId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Draft 삭제에 실패했습니다.');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Draft 삭제 완료",
        description: "제품 초안이 삭제되었습니다.",
      });
      refetchDrafts();
      setSelectedDrafts(prev => prev.filter(id => !prev.includes(id)));
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error.message || "Draft 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Draft 편집 뮤테이션
  const editDraftMutation = useMutation({
    mutationFn: async ({ draftId, data }: { draftId: string, data: EditDraftFormData }) => {
      console.log('Editing draft:', draftId, data); // Debug log
      const response = await fetch(`/api/drafts/${draftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Edit failed:', errorData); // Debug log
        throw new Error(errorData.message || 'Draft 편집에 실패했습니다.');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Draft 편집 완료",
        description: "제품 초안이 성공적으로 수정되었습니다.",
      });
      refetchDrafts();
      setEditingDraft(null);
    },
    onError: (error: any) => {
      toast({
        title: "편집 실패",
        description: error.message || "Draft 편집 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Monthly Merge Mutation
  const monthlyMergeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/imports/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ drafts }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '월간 병합에 실패했습니다.');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Merge results:', data); // Debug log
      setMergeResults(data);
      setShowMergeResults(true);
      
      const { results } = data;
      const summary = results?.summary;
      
      toast({
        title: "월간 병합 완료",
        description: `처리: ${summary?.processed || 0}, 업데이트: ${summary?.updated || 0}, 신규: ${summary?.created || 0}`,
      });
      
      // Refresh data
      refetchDrafts();
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error: any) => {
      console.error('Merge failed:', error);
      toast({
        title: "병합 실패",
        description: error.message || "월간 병합 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Delete All Drafts Mutation
  const deleteAllDraftsMutation = useMutation<{ deletedCount: number; message: string }>({
    mutationFn: async () => {
      const response = await fetch('/api/drafts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest', // CSRF protection
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '모든 초안 삭제에 실패했습니다.');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "초안 모두 삭제 완료",
        description: `${data.deletedCount}개의 초안이 삭제되었습니다.`,
      });
      
      // Refresh data using queryClient
      queryClient.invalidateQueries({ queryKey: ['/api/drafts'] });
      setSelectedDrafts([]);
      setShowMergeResults(false);
      setMergeResults(null);
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error.message || "모든 초안 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
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
      rating: 4.5,
      modelNumber: "",
      maker: "",
      type: "",
      releaseYear: new Date().getFullYear().toString(),
      dimensions: "",
      rentalOptions: [{ months: 12, monthlyPrice: 0 }],
      maintenanceOptions: [{ months: 1, additionalFee: 0, description: "매월 관리" }],
      colors: [],
      functions: [],
      tags: [],
      extraFeatures: [],
      maintenanceDesc: "",
      warranty: "",
      installLeadTime: "",
    },
  });

  // Draft 편집 폼
  const editForm = useForm<EditDraftFormData>({
    resolver: zodResolver(editDraftSchema),
    defaultValues: {
      nameKo: "",
      name: "",
      brand: "",
      categoryId: "",
      descriptionKo: "",
      monthlyPrice: 0,
      originalPrice: 0,
      imageUrl: "",
      rating: 4.5,
    },
  });

  // 편집할 draft가 변경될 때 폼 값 설정
  useEffect(() => {
    if (editingDraft) {
      console.log('EditingDraft:', editingDraft);
      console.log('EditingDraft rating:', editingDraft.rating, 'type:', typeof editingDraft.rating);
      
      const ratingValue = editingDraft.rating ? Number(editingDraft.rating) : 4.5;
      console.log('Setting rating to:', ratingValue, 'type:', typeof ratingValue);
      
      editForm.reset({
        nameKo: editingDraft.nameKo || "",
        name: editingDraft.name || "",
        brand: editingDraft.brand || "",
        categoryId: editingDraft.categoryId || "",
        descriptionKo: editingDraft.descriptionKo || "",
        monthlyPrice: editingDraft.monthlyPrice || 0,
        originalPrice: editingDraft.originalPrice || 0,
        imageUrl: editingDraft.imageUrl || "",
        rating: ratingValue,
      });
    }
  }, [editingDraft, editForm]);

  const onEditSubmit = (data: EditDraftFormData) => {
    console.log('Form submit triggered!', data); // Debug log
    console.log('Form errors:', editForm.formState.errors); // Debug validation errors
    if (editingDraft) {
      console.log('Submitting edit for draft:', editingDraft.id); // Debug log
      editDraftMutation.mutate({ draftId: editingDraft.id, data });
    } else {
      console.error('No editing draft selected'); // Debug log
    }
  };

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
      // specifications JSON 구성
      const specifications = {
        features: data.functions || [],
        colors: data.colors || [],
        functions: data.functions || [],
        tags: data.tags || [],
        basicInfo: {
          modelNumber: data.modelNumber,
          maker: data.maker,
          type: data.type,
          releaseYear: data.releaseYear,
          dimensions: data.dimensions,
        },
        extraFeatures: data.extraFeatures || [],
        serviceInfo: {
          maintenanceDesc: data.maintenanceDesc,
          warranty: data.warranty,
          installLeadTime: data.installLeadTime,
        },
        rentalOptions: {
          minimumPeriod: data.rentalOptions || [],
          maintenanceCycle: data.maintenanceOptions || [],
        },
      };

      const productData = {
        nameKo: data.nameKo,
        name: data.name,
        brand: data.brand,
        categoryId: data.categoryId,
        descriptionKo: data.descriptionKo,
        monthlyPrice: data.monthlyPrice,
        // Send undefined instead of null for optional fields to match Drizzle-Zod expectations
        ...(data.originalPrice && { originalPrice: data.originalPrice }),
        imageUrl: data.imageUrl,
        rating: data.rating,
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
              렌트리온 관리자
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
            <TabsList className="grid w-full grid-cols-7">
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
              <TabsTrigger value="imports" data-testid="tab-imports">
                <Upload className="h-4 w-4 mr-2" />
                Imports
              </TabsTrigger>
              <TabsTrigger value="excel" data-testid="tab-excel">
                <Upload className="h-4 w-4 mr-2" />
                Excel 업로드
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

                          {/* 컬러 옵션 */}
                          <div className="col-span-1 md:col-span-2">
                            <FormField
                              control={form.control}
                              name="colors"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>컬러 옵션</FormLabel>
                                  <div className="space-y-2">
                                    {field.value.map((color, index) => (
                                      <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                                        <div 
                                          className="w-6 h-6 rounded-full border"
                                          style={{ backgroundColor: color.hex }}
                                        />
                                        <span className="flex-1">{color.name}</span>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const newColors = field.value.filter((_, i) => i !== index);
                                            field.onChange(newColors);
                                          }}
                                          data-testid={`button-remove-color-${index}`}
                                        >
                                          제거
                                        </Button>
                                      </div>
                                    ))}
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="컬러명 (예: 화이트)"
                                        id="new-color-name"
                                        data-testid="input-new-color-name"
                                      />
                                      <Input
                                        type="color"
                                        id="new-color-hex"
                                        className="w-16"
                                        data-testid="input-new-color-hex"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          const nameInput = document.getElementById('new-color-name') as HTMLInputElement;
                                          const hexInput = document.getElementById('new-color-hex') as HTMLInputElement;
                                          if (nameInput.value && hexInput.value) {
                                            const newColor = {
                                              id: nameInput.value.toLowerCase().replace(/\s+/g, '-'),
                                              name: nameInput.value,
                                              hex: hexInput.value,
                                            };
                                            field.onChange([...field.value, newColor]);
                                            nameInput.value = '';
                                            hexInput.value = '#000000';
                                          }
                                        }}
                                        data-testid="button-add-color"
                                      >
                                        추가
                                      </Button>
                                    </div>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* 주요 기능 */}
                          <div className="col-span-1 md:col-span-2">
                            <FormField
                              control={form.control}
                              name="functions"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>주요 기능</FormLabel>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {['냉수', '온수', '정수', 'UV 살균', '얼음 제조', 'IoT 기능', '자동 청소', '절전 모드'].map((func) => (
                                      <div key={func} className="flex items-center space-x-2">
                                        <input
                                          type="checkbox"
                                          id={`function-${func}`}
                                          checked={field.value.includes(func)}
                                          onChange={(e) => {
                                            const newFunctions = e.target.checked
                                              ? [...field.value, func]
                                              : field.value.filter((f) => f !== func);
                                            field.onChange(newFunctions);
                                          }}
                                          data-testid={`checkbox-function-${func}`}
                                        />
                                        <label htmlFor={`function-${func}`} className="text-sm">
                                          {func}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* 태그 */}
                          <div className="col-span-1 md:col-span-2">
                            <FormField
                              control={form.control}
                              name="tags"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>태그</FormLabel>
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                      {field.value.map((tag, index) => (
                                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                          {tag}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newTags = field.value.filter((_, i) => i !== index);
                                              field.onChange(newTags);
                                            }}
                                            className="ml-1 text-xs hover:text-red-500"
                                            data-testid={`button-remove-tag-${index}`}
                                          >
                                            ×
                                          </button>
                                        </Badge>
                                      ))}
                                    </div>
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="태그 입력 (예: 베스트, 신제품)"
                                        id="new-tag"
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const input = e.target as HTMLInputElement;
                                            if (input.value && !field.value.includes(input.value)) {
                                              field.onChange([...field.value, input.value]);
                                              input.value = '';
                                            }
                                          }
                                        }}
                                        data-testid="input-new-tag"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          const input = document.getElementById('new-tag') as HTMLInputElement;
                                          if (input.value && !field.value.includes(input.value)) {
                                            field.onChange([...field.value, input.value]);
                                            input.value = '';
                                          }
                                        }}
                                        data-testid="button-add-tag"
                                      >
                                        추가
                                      </Button>
                                    </div>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

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
                                  <div className="space-y-3">
                                    {field.value.map((option, index) => (
                                      <div key={index} className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                                        <div className="flex items-center gap-2 flex-1">
                                          <label className="text-sm font-medium min-w-12">기간:</label>
                                          <Input
                                            type="number"
                                            placeholder="12"
                                            value={option.months}
                                            onChange={(e) => {
                                              const newOptions = [...field.value];
                                              newOptions[index] = { ...option, months: parseInt(e.target.value) || 0 };
                                              field.onChange(newOptions);
                                            }}
                                            className="w-20"
                                            data-testid={`input-rental-months-${index}`}
                                          />
                                          <span className="text-sm">개월</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-1">
                                          <label className="text-sm font-medium min-w-16">월 렌탈료:</label>
                                          <Input
                                            type="number"
                                            placeholder="15000"
                                            value={option.monthlyPrice}
                                            onChange={(e) => {
                                              const newOptions = [...field.value];
                                              newOptions[index] = { ...option, monthlyPrice: parseInt(e.target.value) || 0 };
                                              field.onChange(newOptions);
                                            }}
                                            className="w-24"
                                            data-testid={`input-rental-price-${index}`}
                                          />
                                          <span className="text-sm">원</span>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const newOptions = field.value.filter((_, i) => i !== index);
                                            field.onChange(newOptions);
                                          }}
                                          data-testid={`button-remove-rental-${index}`}
                                        >
                                          제거
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        field.onChange([...field.value, { months: 12, monthlyPrice: 0 }]);
                                      }}
                                      className="w-full"
                                      data-testid="button-add-rental-option"
                                    >
                                      + 의무사용기간 옵션 추가
                                    </Button>
                                  </div>
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
                                  <div className="space-y-3">
                                    {field.value.map((option, index) => (
                                      <div key={index} className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                                        <div className="flex items-center gap-2">
                                          <label className="text-sm font-medium min-w-12">주기:</label>
                                          <Input
                                            type="number"
                                            placeholder="1"
                                            value={option.months}
                                            onChange={(e) => {
                                              const newOptions = [...field.value];
                                              newOptions[index] = { ...option, months: parseInt(e.target.value) || 0 };
                                              field.onChange(newOptions);
                                            }}
                                            className="w-20"
                                            data-testid={`input-maintenance-months-${index}`}
                                          />
                                          <span className="text-sm">개월</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <label className="text-sm font-medium min-w-16">추가 비용:</label>
                                          <Input
                                            type="number"
                                            placeholder="0"
                                            value={option.additionalFee}
                                            onChange={(e) => {
                                              const newOptions = [...field.value];
                                              newOptions[index] = { ...option, additionalFee: parseInt(e.target.value) || 0 };
                                              field.onChange(newOptions);
                                            }}
                                            className="w-24"
                                            data-testid={`input-maintenance-fee-${index}`}
                                          />
                                          <span className="text-sm">원</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-1">
                                          <label className="text-sm font-medium">설명:</label>
                                          <Input
                                            placeholder="매월 무료 관리"
                                            value={option.description}
                                            onChange={(e) => {
                                              const newOptions = [...field.value];
                                              newOptions[index] = { ...option, description: e.target.value };
                                              field.onChange(newOptions);
                                            }}
                                            data-testid={`input-maintenance-desc-${index}`}
                                          />
                                        </div>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const newOptions = field.value.filter((_, i) => i !== index);
                                            field.onChange(newOptions);
                                          }}
                                          data-testid={`button-remove-maintenance-${index}`}
                                        >
                                          제거
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        field.onChange([...field.value, { months: 1, additionalFee: 0, description: "매월 관리" }]);
                                      }}
                                      className="w-full"
                                      data-testid="button-add-maintenance-option"
                                    >
                                      + 관리주기 옵션 추가
                                    </Button>
                                  </div>
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

            <TabsContent value="imports" className="space-y-6">
              {/* Monthly Merge Section */}
              <Card data-testid="monthly-merge-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        월간 제품 병합
                      </CardTitle>
                      <p className="text-muted-foreground mt-1">
                        새로운 Excel 데이터를 기존 제품과 병합하여 가격 및 프로모션 정보를 업데이트합니다.
                      </p>
                    </div>
                    <Badge variant="secondary">Beta</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Monthly merge functionality */}
                    {drafts.length === 0 ? (
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                        <div className="space-y-2">
                          <Package className="h-8 w-8 mx-auto text-muted-foreground" />
                          <h3 className="font-medium">월간 병합 준비 중</h3>
                          <p className="text-sm text-muted-foreground">
                            먼저 Excel 탭에서 새로운 제품 데이터를 업로드하고 Draft로 저장하세요.
                          </p>
                          <Button variant="outline" size="sm" disabled data-testid="button-start-merge">
                            병합 시작 (Draft 없음)
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                                {drafts.length}개의 Draft가 병합 준비됨
                              </h4>
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                기존 제품과 중복을 확인하고, 가격 정보를 업데이트합니다.
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => refetchDrafts()}
                                disabled={draftsLoading}
                                data-testid="button-refresh-merge-drafts"
                              >
                                새로고침
                              </Button>
                              <Button 
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => monthlyMergeMutation.mutate()}
                                disabled={monthlyMergeMutation.isPending}
                                data-testid="button-start-merge"
                              >
                                <Package className="h-4 w-4 mr-1" />
                                {monthlyMergeMutation.isPending ? '병합 중...' : '병합 시작'}
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Draft Preview Table */}
                        <div className="rounded-lg border bg-card">
                          <div className="p-4 border-b">
                            <h4 className="font-medium">병합 대상 미리보기</h4>
                            <p className="text-sm text-muted-foreground">
                              아래 Draft들이 중복 감지 및 병합 처리됩니다.
                            </p>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            <div className="grid grid-cols-5 gap-4 p-3 text-sm font-medium bg-muted/50">
                              <div>제품명</div>
                              <div>브랜드</div>
                              <div>모델번호</div>
                              <div>월 렌탈료</div>
                              <div>상태</div>
                            </div>
                            {drafts.slice(0, 10).map((draft) => (
                              <div key={draft.id} className="grid grid-cols-5 gap-4 p-3 border-t text-sm">
                                <div className="truncate">{draft.nameKo || draft.name || 'N/A'}</div>
                                <div className="truncate">{draft.brand || 'N/A'}</div>
                                <div className="truncate text-muted-foreground">
                                  {draft.modelNumber || 'N/A'}
                                </div>
                                <div>{draft.monthlyPrice ? `${draft.monthlyPrice.toLocaleString()}원` : 'N/A'}</div>
                                <div>
                                  <Badge variant="secondary" className="text-xs">
                                    {draft.status === 'pending' ? '대기중' : draft.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            {drafts.length > 10 && (
                              <div className="p-3 border-t text-center text-sm text-muted-foreground">
                                ... 및 {drafts.length - 10}개 더
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Merge Results Display */}
                    {showMergeResults && mergeResults && (
                      <div className="space-y-4 mt-6 border-t pt-6">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-lg">병합 결과</h4>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowMergeResults(false)}
                            data-testid="button-close-results"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Results Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                              {mergeResults.results?.summary?.updated || 0}
                            </div>
                            <div className="text-sm text-green-600 dark:text-green-400">업데이트됨</div>
                          </div>
                          
                          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                              {mergeResults.results?.summary?.created || 0}
                            </div>
                            <div className="text-sm text-blue-600 dark:text-blue-400">신규 생성</div>
                          </div>
                          
                          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                              {mergeResults.results?.summary?.needsReview || 0}
                            </div>
                            <div className="text-sm text-yellow-600 dark:text-yellow-400">수동 검토</div>
                          </div>
                          
                          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                              {(mergeResults.results?.summary?.validationFailed || 0) + (mergeResults.results?.summary?.processingErrors || 0)}
                            </div>
                            <div className="text-sm text-red-600 dark:text-red-400">에러</div>
                          </div>
                        </div>
                        
                        {/* Updated Products Detail */}
                        {mergeResults.results?.updated?.length > 0 && (
                          <div className="rounded-lg border bg-card">
                            <div className="p-4 border-b bg-green-50 dark:bg-green-950/50">
                              <h5 className="font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                                <Check className="h-4 w-4" />
                                업데이트된 제품 ({mergeResults.results.updated.length}개)
                              </h5>
                              <p className="text-sm text-green-600 dark:text-green-400">
                                기존 제품의 가격 및 프로모션 정보가 업데이트되었습니다.
                              </p>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {mergeResults.results.updated.slice(0, 5).map((product: any, index: number) => (
                                <div key={product.id} className="p-3 border-b last:border-b-0 flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium">{product.nameKo}</p>
                                    <p className="text-sm text-muted-foreground">{product.brand} • {product.modelNumber}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium">
                                      {product.monthlyPrice ? `${Number(product.monthlyPrice).toLocaleString()}원/월` : 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {mergeResults.results.updated.length > 5 && (
                                <div className="p-3 text-center text-sm text-muted-foreground border-b-0">
                                  ... 및 {mergeResults.results.updated.length - 5}개 더
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Created Products Detail */}
                        {mergeResults.results?.created?.length > 0 && (
                          <div className="rounded-lg border bg-card">
                            <div className="p-4 border-b bg-blue-50 dark:bg-blue-950/50">
                              <h5 className="font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                신규 생성된 제품 ({mergeResults.results.created.length}개)
                              </h5>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {mergeResults.results.created.slice(0, 5).map((product: any, index: number) => (
                                <div key={product.id} className="p-3 border-b last:border-b-0">
                                  <p className="font-medium">{product.nameKo}</p>
                                  <p className="text-sm text-muted-foreground">{product.brand} • {product.modelNumber}</p>
                                </div>
                              ))}
                              {mergeResults.results.created.length > 5 && (
                                <div className="p-3 text-center text-sm text-muted-foreground border-b-0">
                                  ... 및 {mergeResults.results.created.length - 5}개 더
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Validation Errors */}
                        {mergeResults.results?.validationErrors?.length > 0 && (
                          <div className="rounded-lg border bg-card">
                            <div className="p-4 border-b bg-red-50 dark:bg-red-950/50">
                              <h5 className="font-medium text-red-800 dark:text-red-200 flex items-center gap-2">
                                <X className="h-4 w-4" />
                                검증 실패 ({mergeResults.results.validationErrors.length}개)
                              </h5>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {mergeResults.results.validationErrors.slice(0, 5).map((error: any, index: number) => (
                                <div key={index} className="p-3 border-b last:border-b-0">
                                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                    아이템 #{error.index}: {error.error}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {error.draft?.nameKo || error.draft?.name || '이름 없음'}
                                  </p>
                                </div>
                              ))}
                              {mergeResults.results.validationErrors.length > 5 && (
                                <div className="p-3 text-center text-sm text-muted-foreground border-b-0">
                                  ... 및 {mergeResults.results.validationErrors.length - 5}개 더
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Imports Tab - Draft Management System */}
              <div className="space-y-6">
                {/* Header with actions */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">제품 Import 관리</h2>
                    <p className="text-muted-foreground">Excel에서 가져온 제품 초안을 관리하고 승인합니다.</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => refetchDrafts()}
                      disabled={draftsLoading}
                      data-testid="button-refresh-drafts"
                    >
                      새로고침
                    </Button>
                    <Button 
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`정말로 모든 초안 ${drafts.length}개를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
                          deleteAllDraftsMutation.mutate();
                        }
                      }}
                      disabled={drafts.length === 0 || deleteAllDraftsMutation.isPending}
                      data-testid="button-delete-all-drafts"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {deleteAllDraftsMutation.isPending ? '삭제 중...' : `모든 초안 삭제 (${drafts.length})`}
                    </Button>
                    <Button 
                      disabled={selectedDrafts.length === 0}
                      data-testid="button-bulk-approve"
                    >
                      일괄 승인 ({selectedDrafts.length})
                    </Button>
                  </div>
                </div>

                {/* Draft List Card */}
                <Card data-testid="drafts-list-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>제품 초안 목록</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-32" data-testid="select-status-filter">
                            <SelectValue placeholder="상태" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            <SelectItem value="pending">대기중</SelectItem>
                            <SelectItem value="approved">승인됨</SelectItem>
                            <SelectItem value="rejected">거절됨</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {draftsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        제품 초안 목록을 로드하는 중...
                      </div>
                    ) : drafts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {statusFilter === 'all' ? '등록된 제품 초안이 없습니다.' : `${statusFilter} 상태의 제품 초안이 없습니다.`}
                        <p className="text-sm mt-2">Excel 업로드 탭에서 제품을 업로드하고 저장해보세요.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Draft 목록 테이블 */}
                        <div className="rounded-md border">
                          <div className="grid grid-cols-6 gap-4 p-4 font-medium text-sm bg-muted/50">
                            <div>제품명</div>
                            <div>브랜드</div>
                            <div>카테고리</div>
                            <div>월 렌탈료</div>
                            <div>상태</div>
                            <div>작업</div>
                          </div>
                          {drafts.map((draft) => (
                            <div key={draft.id} className="grid grid-cols-6 gap-4 p-4 border-t items-center">
                              <div>
                                <p className="font-medium">{draft.nameKo || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">{draft.name || 'N/A'}</p>
                              </div>
                              <div>{draft.brand || 'N/A'}</div>
                              <div>{draft.category?.nameKo || 'N/A'}</div>
                              <div>
                                {draft.monthlyPrice ? `${draft.monthlyPrice.toLocaleString()}원` : 'N/A'}
                              </div>
                              <div>
                                <Badge 
                                  variant={
                                    draft.status === 'approved' ? 'default' : 
                                    draft.status === 'pending' ? 'secondary' : 'destructive'
                                  }
                                >
                                  {draft.status === 'approved' ? '승인됨' : 
                                   draft.status === 'pending' ? '대기중' : '거절됨'}
                                </Badge>
                              </div>
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingDraft(draft)}
                                  data-testid={`button-edit-draft-${draft.id}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                {draft.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => approveDraftMutation.mutate(draft.id)}
                                    disabled={approveDraftMutation.isPending}
                                    data-testid={`button-approve-draft-${draft.id}`}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteDraftMutation.mutate(draft.id)}
                                  disabled={deleteDraftMutation.isPending}
                                  data-testid={`button-delete-draft-${draft.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* 페이지네이션 (향후 추가 예정) */}
                        <div className="text-center text-sm text-muted-foreground">
                          총 {drafts.length}개 항목
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="excel" className="space-y-6">
              <Card data-testid="excel-upload-card">
                <CardHeader>
                  <CardTitle>Excel 파일로 제품 일괄 등록</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Excel 파일을 업로드하여 여러 제품을 한 번에 등록할 수 있습니다. AI가 자동으로 컬럼을 분석하여 매핑합니다.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Excel 파일 업로드 UI */}
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <div className="space-y-2">
                        <p className="text-lg font-medium">Excel 파일을 선택하세요</p>
                        <p className="text-sm text-gray-600">
                          .xlsx 또는 .xls 파일만 업로드 가능합니다. (최대 10MB)
                        </p>
                      </div>
                      <div className="mt-4">
                        <Input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleExcelFileSelect}
                          className="hidden"
                          id="excel-file-input"
                          data-testid="input-excel-file"
                        />
                        <Button
                          type="button"
                          onClick={() => document.getElementById('excel-file-input')?.click()}
                          disabled={uploadingExcel}
                          data-testid="button-select-excel"
                        >
                          {uploadingExcel ? (
                            <>
                              <Upload className="h-4 w-4 mr-2 animate-spin" />
                              업로드 중...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              파일 선택
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* 업로드 결과 표시 */}
                    {excelResults && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">파싱 결과</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="pt-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-green-600">{excelResults.stats?.successfullyParsed || 0}</p>
                                <p className="text-sm text-gray-600">성공</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-red-600">{excelResults.stats?.errors || 0}</p>
                                <p className="text-sm text-gray-600">오류</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600">{excelResults.stats?.totalRows || 0}</p>
                                <p className="text-sm text-gray-600">전체 행</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        {/* 매핑 정보 */}
                        {excelResults.mapping && (
                          <Card>
                            <CardContent className="pt-4">
                              <h4 className="font-semibold mb-2">매핑 정보</h4>
                              <div className="space-y-2">
                                <p className="text-sm">
                                  <span className="font-medium">매핑 방식:</span> {excelResults.mapping.source === 'ai' ? 'AI 자동 매핑' : '키워드 기반 매핑'}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">신뢰도:</span> {Math.round((excelResults.mapping.confidence || 0) * 100)}%
                                </p>
                                {excelResults.mapping.missingEssentials?.length > 0 && (
                                  <p className="text-sm text-yellow-600">
                                    <span className="font-medium">누락된 필수 필드:</span> {excelResults.mapping.missingEssentials.join(', ')}
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
                        {/* 오류 목록 */}
                        {excelResults.errors?.length > 0 && (
                          <Card>
                            <CardContent className="pt-4">
                              <h4 className="font-semibold mb-2">오류 목록</h4>
                              <div className="max-h-40 overflow-y-auto space-y-2">
                                {excelResults.errors.slice(0, 10).map((error: any, index: number) => (
                                  <div key={index} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                                    <p className="font-medium">행 {error.row}: {error.error}</p>
                                  </div>
                                ))}
                                {excelResults.errors.length > 10 && (
                                  <p className="text-sm text-gray-600">... 및 {excelResults.errors.length - 10}개 추가 오류</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => setExcelResults(null)}
                            variant="outline"
                            data-testid="button-clear-results"
                          >
                            결과 지우기
                          </Button>
                          <Button
                            onClick={handleSaveDrafts}
                            disabled={!excelResults.drafts?.length}
                            data-testid="button-save-drafts"
                          >
                            제품 초안 저장 ({excelResults.drafts?.length || 0}개)
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
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

      {/* Edit Draft Modal */}
      <Dialog open={!!editingDraft} onOpenChange={() => setEditingDraft(null)}>
        <DialogContent className="max-w-md" data-testid="edit-draft-modal">
          <DialogHeader>
            <DialogTitle>제품 초안 편집</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                {/* 제품명 (한국어) */}
                <FormField
                  control={editForm.control}
                  name="nameKo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제품명 (한국어) *</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 아이콘 냉온정 정수기" {...field} data-testid="input-edit-name-ko" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 브랜드 */}
                <FormField
                  control={editForm.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>브랜드 *</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 코웨이" {...field} data-testid="input-edit-brand" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 카테고리 */}
                <FormField
                  control={editForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>카테고리</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-category">
                            <SelectValue placeholder="카테고리 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">카테고리 선택 안함</SelectItem>
                          {categories.map((category) => (
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

                {/* 월 렌탈료 */}
                <FormField
                  control={editForm.control}
                  name="monthlyPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>월 렌탈료 *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="15000" 
                          value={field.value || 0}
                          onChange={(e) => {
                            const value = e.target.value ? Number(e.target.value) : 0;
                            console.log('Monthly price changed:', value); // Debug log
                            field.onChange(value);
                          }}
                          data-testid="input-edit-monthly-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 정상가 */}
                <FormField
                  control={editForm.control}
                  name="originalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>정상가</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="50000" 
                          value={field.value || 0}
                          onChange={(e) => {
                            const value = e.target.value ? Number(e.target.value) : 0;
                            field.onChange(value);
                          }}
                          data-testid="input-edit-original-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingDraft(null)}
                    data-testid="button-cancel-edit"
                  >
                    <X className="h-4 w-4 mr-2" />
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={editDraftMutation.isPending}
                    onClick={(e) => {
                      console.log('Save button clicked!');
                      console.log('Form is valid:', editForm.formState.isValid);
                      console.log('Form values:', editForm.getValues());
                      if (!editForm.formState.isValid) {
                        console.log('Form validation errors:', editForm.formState.errors);
                      }
                    }}
                    data-testid="button-save-edit"
                  >
                    {editDraftMutation.isPending ? (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        저장
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}