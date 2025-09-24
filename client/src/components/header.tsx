import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, Menu, User } from "lucide-react";
import { Link } from "wouter";

export default function Header() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-backdrop-blur:bg-card/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer" data-testid="logo-link">
              <Home className="text-primary text-2xl h-6 w-6" />
              <h1 className="text-xl font-bold text-foreground">렌탈홈</h1>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/">
              <a className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-home">홈</a>
            </Link>
            <Link href="/products">
              <a className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-products">제품</a>
            </Link>
            {isAuthenticated && (
              <Link href="/my-rentals">
                <a className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-my-rentals">내 렌탈</a>
              </Link>
            )}
            <Link href="/chat">
              <a className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-chat">AI 상담</a>
            </Link>
          </nav>
          
          {/* User Actions */}
          <div className="flex items-center space-x-2">
            {isLoading ? (
              <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={(user as any).profileImageUrl || ""} alt={(user as any).firstName || "User"} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {(user as any).firstName && (
                        <p className="font-medium" data-testid="text-user-name">
                          {(user as any).firstName} {(user as any).lastName}
                        </p>
                      )}
                      {(user as any).email && (
                        <p className="w-[200px] truncate text-sm text-muted-foreground" data-testid="text-user-email">
                          {(user as any).email}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/my-rentals">
                      <span data-testid="menu-my-rentals">내 렌탈</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => window.location.href = "/api/login"}
                  className="hidden md:inline-flex"
                  data-testid="button-login"
                >
                  로그인
                </Button>
                <Button 
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-signup"
                >
                  회원가입
                </Button>
              </>
            )}
            
            {/* Mobile menu button */}
            <Button variant="ghost" size="sm" className="md:hidden" data-testid="button-mobile-menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
