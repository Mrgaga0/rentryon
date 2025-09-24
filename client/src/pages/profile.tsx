import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, LogOut, Settings } from "lucide-react";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import type { User as UserType } from "@shared/schema";

export default function Profile() {
  const { user, isAuthenticated } = useAuth();
  const typedUser = user as UserType | undefined;

  if (!isAuthenticated || !typedUser) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-500">로그인이 필요합니다.</p>
        </div>
        <MobileNav />
      </div>
    );
  }

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-2xl pb-20">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-lg bg-blue-100 text-blue-600">
                  {typedUser.firstName?.[0]}{typedUser.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
              {typedUser.firstName} {typedUser.lastName}
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-300" data-testid="text-user-email">
              {typedUser.email}
            </p>
          </CardHeader>
        </Card>

        {/* Profile Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              개인 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium">
                  이름
                </Label>
                <Input
                  id="firstName"
                  value={typedUser.firstName || ""}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800"
                  data-testid="input-first-name"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium">
                  성
                </Label>
                <Input
                  id="lastName"
                  value={typedUser.lastName || ""}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800"
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                이메일
              </Label>
              <Input
                id="email"
                value={typedUser.email || ""}
                readOnly
                className="bg-gray-50 dark:bg-gray-800"
                data-testid="input-email"
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              계정 설정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">알림 설정</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    렌탈 알림 및 업데이트 수신
                  </p>
                </div>
                <Button variant="outline" size="sm" data-testid="button-notifications">
                  설정
                </Button>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">언어 설정</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    앱 언어 변경
                  </p>
                </div>
                <Button variant="outline" size="sm" data-testid="button-language">
                  한국어
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </CardContent>
        </Card>
      </div>
      <MobileNav />
    </div>
  );
}