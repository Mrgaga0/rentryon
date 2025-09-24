import { useAuth } from "@/hooks/useAuth";
import { Home, Search, Heart, Package, User } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function MobileNav() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { icon: Home, label: "홈", path: "/", testId: "nav-mobile-home" },
    { icon: Search, label: "검색", path: "/products", testId: "nav-mobile-products" },
    ...(isAuthenticated ? [
      { icon: Heart, label: "찜목록", path: "/wishlist", testId: "nav-mobile-wishlist" },
      { icon: Package, label: "내 렌탈", path: "/my-rentals", testId: "nav-mobile-rentals" },
    ] : []),
    { icon: User, label: "내 정보", path: isAuthenticated ? "/profile" : "/api/login", testId: "nav-mobile-profile" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link key={item.path} href={item.path}>
              <a
                className={`flex flex-col items-center py-2 px-3 transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={item.testId}
              >
                <Icon className={`text-lg mb-1 h-5 w-5 ${active ? "text-primary" : ""}`} />
                <span className={`text-xs ${active ? "text-primary font-medium" : ""}`}>
                  {item.label}
                </span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
