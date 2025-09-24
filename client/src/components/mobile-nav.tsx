import { Home, Search, MessageCircle, Bot } from "lucide-react";
import { Link, useLocation } from "wouter";
import KakaoChatButton from "@/components/kakao-chat-button";

export default function MobileNav() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { icon: Home, label: "홈", path: "/home", testId: "nav-mobile-home" },
    { icon: Search, label: "제품", path: "/products", testId: "nav-mobile-products" },
    { icon: Bot, label: "AI상담", path: "/chat", testId: "nav-mobile-chat" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link 
              key={item.path} 
              href={item.path}
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
            </Link>
          );
        })}
        
        {/* KakaoTalk consultation button */}
        <div className="flex flex-col items-center py-2 px-3" data-testid="nav-mobile-kakao">
          <div className="flex items-center justify-center">
            <KakaoChatButton variant="ghost" size="sm" className="p-1 h-auto bg-transparent hover:bg-transparent text-[#FEE500]" />
          </div>
        </div>
      </div>
    </nav>
  );
}
