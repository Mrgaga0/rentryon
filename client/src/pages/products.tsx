import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import ProductCard from "@/components/product-card";
import AiChatButton from "@/components/ai-chat-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter } from "lucide-react";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products", {
      search: searchTerm || undefined,
      categoryId: categoryId !== "all" ? categoryId : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      limit: 20,
    }],
  });

  const handleSearch = () => {
    // The query will automatically refetch when searchTerm changes
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      <div className="container mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="제품 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-product-search"
                />
              </div>
            </div>
            <Button onClick={handleSearch} data-testid="button-search-products">
              <Search className="mr-2 h-4 w-4" />
              검색
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">카테고리</label>
                  <Select value={categoryId} onValueChange={setCategoryId} data-testid="select-category">
                    <SelectTrigger>
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {(categories as any[])?.map((category: any) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.nameKo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">최소 가격</label>
                  <Input
                    placeholder="최소 가격"
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    data-testid="input-min-price"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">최대 가격</label>
                  <Input
                    placeholder="최대 가격"
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    data-testid="input-max-price"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">정렬</label>
                  <Select value={sortBy} onValueChange={setSortBy} data-testid="select-sort">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">최신순</SelectItem>
                      <SelectItem value="price-low">가격 낮은순</SelectItem>
                      <SelectItem value="price-high">가격 높은순</SelectItem>
                      <SelectItem value="rating">평점순</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setSearchTerm("");
                      setCategoryId("all");
                      setMinPrice("");
                      setMaxPrice("");
                      setSortBy("newest");
                    }}
                    data-testid="button-clear-filters"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    초기화
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold" data-testid="text-products-title">
              가전제품 목록
            </h1>
            <div className="text-sm text-muted-foreground" data-testid="text-products-count">
              {products ? `${(products as any[]).length}개 제품` : ''}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productsLoading ? (
              [...Array(12)].map((_, i) => (
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
            ) : products && (products as any[]).length > 0 ? (
              (products as any[]).map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center py-12" data-testid="text-no-products">
                <p className="text-muted-foreground text-lg mb-4">검색 조건에 맞는 제품이 없습니다</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryId("all");
                    setMinPrice("");
                    setMaxPrice("");
                  }}
                  data-testid="button-reset-search"
                >
                  전체 제품 보기
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileNav />
      <AiChatButton />
    </div>
  );
}
