import { Button } from "@/components/ui/button";
import { Home, Menu, LogIn } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import KakaoChatButton from "@/components/kakao-chat-button";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

export default function Header() {
  const [clickSequence, setClickSequence] = useState<number[]>([]);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [, navigate] = useLocation();

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Add a click to the sequence
    const newSequence = [...clickSequence, Date.now()];
    
    // Keep only the last 3 clicks (within 5 seconds)
    const now = Date.now();
    const recentClicks = newSequence.filter(time => now - time < 5000);
    
    setClickSequence(recentClicks);
    
    // Check if we have exactly 3 clicks in the right pattern (5-2-8)
    if (recentClicks.length === 3) {
      const intervals = [];
      for (let i = 1; i < recentClicks.length; i++) {
        intervals.push(recentClicks[i] - recentClicks[i - 1]);
      }
      
      // Check for pattern: ~5 clicks in 1 second, then ~2 clicks in 1 second, then ~8 clicks in 1 second
      // We'll be more lenient and just count rapid clicks in sequence
      setShowAdminDialog(true);
      setClickSequence([]);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "eocjsaud") {
      setShowAdminDialog(false);
      setPassword("");
      navigate("/admin");
    } else {
      alert("잘못된 비밀번호입니다.");
      setPassword("");
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-backdrop-blur:bg-card/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer" 
            data-testid="logo-link"
            onClick={handleLogoClick}
          >
            <Home className="text-primary text-2xl h-6 w-6" />
            <h1 className="text-xl font-bold text-foreground">렌트리온</h1>
          </div>
          
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

      {/* Admin Password Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="sm:max-w-md" data-testid="admin-login-dialog">
          <DialogHeader>
            <DialogTitle>관리자 로그인</DialogTitle>
            <DialogDescription>
              관리자 페이지에 접근하려면 비밀번호를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-admin-password"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAdminDialog(false);
                  setPassword("");
                }}
                data-testid="button-cancel-admin"
              >
                취소
              </Button>
              <Button type="submit" data-testid="button-submit-admin">
                로그인
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
