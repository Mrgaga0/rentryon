import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, Search, Snowflake, ShirtIcon, Wind, Tv, Microwave, Bot, Truck, Shield, Facebook, Instagram, Youtube } from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/header";
import { SITE_COPYRIGHT, SITE_NAME_KO } from "@shared/branding";

export default function Landing() {
  const { toast } = useToast();

  const handleSearch = () => {
    // Redirect to home page with search
    window.location.href = "/home";
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

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
                        data-testid="input-search-product"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">렌탈 기간</label>
                    <Select data-testid="select-rental-period">
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
                    <Button 
                      className="w-full" 
                      onClick={handleSearch}
                      data-testid="button-search"
                    >
                      <Search className="mr-2 h-4 w-4" />검색
                    </Button>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Snowflake, name: "냉장고", testId: "category-refrigerator" },
              { icon: ShirtIcon, name: "세탁기", testId: "category-washing-machine" },
              { icon: Wind, name: "에어컨", testId: "category-air-conditioner" },
              { icon: Tv, name: "TV", testId: "category-tv" },
              { icon: Microwave, name: "전자레인지", testId: "category-microwave" },
              { icon: Bot, name: "청소기", testId: "category-vacuum" }
            ].map((category, index) => (
              <Card key={index} className="text-center group cursor-pointer hover:shadow-md transition-shadow" data-testid={category.testId}>
                <CardContent className="p-6">
                  <category.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">{category.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 md:py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4" data-testid="text-features-title">{`${SITE_NAME_KO}을 선택하는 이유`}</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              합리적인 가격과 편리한 서비스로 가전제품 렌탈의 새로운 기준을 제시합니다
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center" data-testid="feature-ai-recommendation">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="text-primary text-2xl h-8 w-8" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">AI 맞춤 추천</h4>
              <p className="text-sm text-muted-foreground">Google Gemini 2.5 Pro 기반의 똑똑한 추천 시스템으로 최적의 제품을 찾아드려요</p>
            </div>
            
            <div className="text-center" data-testid="feature-free-delivery">
              <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="text-secondary text-2xl h-8 w-8" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">무료 배송 & 설치</h4>
              <p className="text-sm text-muted-foreground">전국 어디든 무료 배송과 전문 기사님의 설치 서비스를 제공해드립니다</p>
            </div>
            
            <div className="text-center" data-testid="feature-warranty">
              <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-accent text-2xl h-8 w-8" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">안심 보상 서비스</h4>
              <p className="text-sm text-muted-foreground">고장 시 무료 A/S와 교체 서비스로 걱정 없이 이용하세요</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div>
              <h5 className="font-semibold text-foreground mb-3">서비스</h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">가전렌탈</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">AI 추천</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">배송 & 설치</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">A/S 신청</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-foreground mb-3">고객지원</h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">자주 묻는 질문</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">고객센터</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">1:1 문의</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">이용약관</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-foreground mb-3">회사</h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">회사소개</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">채용정보</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">보도자료</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">파트너십</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-foreground mb-3">소셜</h5>
              <div className="flex space-x-3">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Youtube className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <Home className="text-primary h-5 w-5" />
                <span className="font-bold text-foreground">{SITE_NAME_KO}</span>
              </div>
              <p className="text-sm text-muted-foreground">{SITE_COPYRIGHT}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
