import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Package, BarChart3, MessageCircle, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

export default function AdminPage() {
  const [, navigate] = useLocation();

  const handleLogout = () => {
    navigate("/home");
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

            <TabsContent value="products">
              <Card data-testid="products-management-card">
                <CardHeader>
                  <CardTitle>제품 관리</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">제품 관리 기능이 곧 제공될 예정입니다.</p>
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