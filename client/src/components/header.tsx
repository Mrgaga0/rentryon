import { Button } from "@/components/ui/button";
import { Home, Menu, LogIn } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import KakaoChatButton from "@/components/kakao-chat-button";

export default function Header() {

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-backdrop-blur:bg-card/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/home">
            <div className="flex items-center space-x-2 cursor-pointer" data-testid="logo-link">
              <Home className="text-primary text-2xl h-6 w-6" />
              <h1 className="text-xl font-bold text-foreground">렌탈리움</h1>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/home" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-home">
              홈
            </Link>
            <Link href="/products" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-products">
              제품
            </Link>
            <Link href="/chat" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-chat">
              AI 상담
            </Link>
          </nav>
          
          {/* Actions */}
          <div className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button 
                variant="outline" 
                size="sm"
                data-testid="button-login"
                className="hidden md:inline-flex"
              >
                <LogIn className="h-4 w-4 mr-2" />
                로그인
              </Button>
            </motion.div>
            
            <KakaoChatButton 
              variant="default" 
              size="sm"
              className="hidden md:inline-flex"
            />
            
            {/* Mobile menu button - removed as we'll use bottom nav */}
          </div>
        </div>
      </div>
    </header>
  );
}
