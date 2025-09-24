import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import CategoryGrid from "@/components/category-grid";
import ProductCard from "@/components/product-card";
import AiChatButton from "@/components/ai-chat-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowRight, Bot, Truck, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [rentalPeriod, setRentalPeriod] = useState("");
  
  // Advertisement Carousel
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "center" },
    [Autoplay({ delay: 4000, stopOnInteraction: false })]
  );
  
  const adBanners = [
    {
      id: 1,
      title: "봄맞이 특가 이벤트",
      subtitle: "모든 가전제품 렌탈료 30% 할인!",
      bgColor: "from-blue-500 to-purple-600",
      action: "지금 보기"
    },
    {
      id: 2,
      title: "프리미엄 냉장고",
      subtitle: "LG 디오스 냉장고 월 39,000원부터",
      bgColor: "from-green-500 to-teal-600",
      action: "렌탈 신청"
    },
    {
      id: 3,
      title: "에어컨 시즌 준비",
      subtitle: "삼성 무풍에어컨 설치비 무료",
      bgColor: "from-orange-500 to-red-600",
      action: "상담 신청"
    },
    {
      id: 4,
      title: "세탁기 + 건조기 세트",
      subtitle: "세트 렌탈시 추가 10% 할인 혜택",
      bgColor: "from-indigo-500 to-purple-600",
      action: "혜택 확인"
    }
  ];

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: featuredProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products", { limit: 6 }],
  });

  const { data: popularProducts, isLoading: popularLoading } = useQuery({
    queryKey: ["/api/products", { limit: 4, offset: 6 }],
  });

  const handleSearch = () => {
    if (searchTerm.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchTerm.trim())}&period=${rentalPeriod}`;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      {/* Advertisement Banner Carousel */}
      <section className="relative overflow-hidden bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="embla" ref={emblaRef} data-testid="carousel-advertisement">
          <div className="embla__container flex">
            {adBanners.map((banner) => (
              <motion.div 
                key={banner.id} 
                className="embla__slide flex-[0_0_100%] min-w-0"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                <div className={`h-48 md:h-64 bg-gradient-to-r ${banner.bgColor} flex items-center justify-center text-white relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/20"></div>
                  <motion.div 
                    className="text-center z-10 px-4"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  >
                    <motion.h2 
                      className="text-2xl md:text-4xl font-bold mb-2"
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    >
                      {banner.title}
                    </motion.h2>
                    <p className="text-sm md:text-lg mb-4 opacity-90">{banner.subtitle}</p>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Button 
                        variant="secondary" 
                        size="lg" 
                        className="bg-white text-gray-800 hover:bg-gray-100 font-semibold shadow-lg"
                        data-testid={`button-ad-${banner.id}`}
                      >
                        {banner.action}
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        >
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </motion.div>
                      </Button>
                    </motion.div>
                  </motion.div>
                  
                  {/* Decorative Elements */}
                  <motion.div 
                    className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                  ></motion.div>
                  <motion.div 
                    className="absolute bottom-6 left-6 w-12 h-12 bg-white/10 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  ></motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Carousel Dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {adBanners.map((_, index) => (
            <motion.div 
              key={index}
              className="w-2 h-2 bg-white/50 rounded-full cursor-pointer"
              whileHover={{ scale: 1.2, backgroundColor: "rgba(255,255,255,0.8)" }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      </section>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-hero-title">
              필요한 가전제품을<br className="md:hidden" /> 합리적으로 렌탈하세요
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto" data-testid="text-hero-description">
              AI 추천으로 딱 맞는 가전제품을 찾고, 원하는 기간만큼 렌탈하세요
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-lg">
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">어떤 가전제품이 필요하세요?</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input 
                        placeholder="냉장고, 세탁기, 에어컨..." 
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        data-testid="input-search-product"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">렌탈 기간</label>
                    <Select value={rentalPeriod} onValueChange={setRentalPeriod} data-testid="select-rental-period">
                      <SelectTrigger>
                        <SelectValue placeholder="기간 선택" />
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
                    <label className="block text-sm font-medium text-foreground mb-2">&nbsp;</label>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Button 
                        className="w-full" 
                        onClick={handleSearch}
                        data-testid="button-search"
                      >
                        <motion.div
                          animate={{ rotate: [0, 15, 0] }}
                          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                        >
                          <Search className="mr-2 h-4 w-4" />
                        </motion.div>
                        검색
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-6" data-testid="text-categories-title">인기 카테고리</h3>
          {categoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <CategoryGrid categories={(categories as any[]) || []} />
          )}
        </div>
      </section>

      {/* AI Recommendations */}
      <section className="py-8 md:py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground" data-testid="text-recommendations-title">AI 맞춤 추천</h3>
              <p className="text-sm text-muted-foreground mt-1">당신에게 딱 맞는 가전제품을 추천해드려요</p>
            </div>
            <Link href="/products">
              <Button variant="ghost" size="sm" data-testid="link-view-more-recommendations">
                더보기 <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productsLoading ? (
              [...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="w-full h-48" />
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-3" />
                    <div className="flex justify-between items-center mb-3">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              (featuredProducts as any[])?.slice(0, 6).map((product: any) => (
                <ProductCard key={product.id} product={product} showRecommendedBadge />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Popular Products */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl md:text-2xl font-bold text-foreground" data-testid="text-popular-title">인기 렌탈 상품</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">전체</Button>
              <Button size="sm">주방가전</Button>
              <Button variant="outline" size="sm">생활가전</Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularLoading ? (
              [...Array(4)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="w-full h-40" />
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-full mb-2" />
                    <div className="flex justify-between items-center mb-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              (popularProducts as any[])?.slice(0, 4).map((product: any) => (
                <ProductCard key={product.id} product={product} compact />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 md:py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4" data-testid="text-features-title">렌탈홈을 선택하는 이유</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              합리적인 가격과 편리한 서비스로 가전제품 렌탈의 새로운 기준을 제시합니다
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center" data-testid="feature-ai-recommendation">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="text-primary h-8 w-8" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">AI 맞춤 추천</h4>
              <p className="text-sm text-muted-foreground">Google Gemini 2.5 Pro 기반의 똑똑한 추천 시스템으로 최적의 제품을 찾아드려요</p>
            </div>
            
            <div className="text-center" data-testid="feature-free-delivery">
              <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="text-secondary h-8 w-8" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">무료 배송 & 설치</h4>
              <p className="text-sm text-muted-foreground">전국 어디든 무료 배송과 전문 기사님의 설치 서비스를 제공해드립니다</p>
            </div>
            
            <div className="text-center" data-testid="feature-warranty">
              <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-accent h-8 w-8" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">안심 보상 서비스</h4>
              <p className="text-sm text-muted-foreground">고장 시 무료 A/S와 교체 서비스로 걱정 없이 이용하세요</p>
            </div>
          </div>
        </div>
      </section>

      <MobileNav />
      <AiChatButton />
    </div>
  );
}
