import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

interface KakaoChatButtonProps {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  productName?: string;
  rentalPeriod?: string;
}

export default function KakaoChatButton({ 
  variant = "default", 
  size = "default",
  className = "",
  productName,
  rentalPeriod
}: KakaoChatButtonProps) {
  const handleKakaoChat = () => {
    // 카카오톡 채널로 연결 (실제 채널 ID로 교체 필요)
    let message = "안녕하세요! 가전제품 렌탈 상담을 받고 싶습니다.";
    
    if (productName) {
      message += `\n\n관심 제품: ${productName}`;
    }
    if (rentalPeriod) {
      message += `\n렌탈 희망 기간: ${rentalPeriod}개월`;
    }
    
    // 카카오톡 플러스친구 채팅방으로 이동
    // 실제 운영시에는 카카오톡 채널의 실제 URL로 교체해야 함
    const kakaoUrl = `https://open.kakao.com/o/상담채널ID`;
    
    // 모바일에서는 카카오톡 앱으로, 데스크톱에서는 웹 카카오톡으로
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // 모바일에서 카카오톡 앱 실행 시도
      window.location.href = `kakaoplus://plusfriend/chat/_xeUxjxl`;
      // 앱이 없는 경우를 대비해 웹 버전으로 대체
      setTimeout(() => {
        window.open(kakaoUrl, '_blank');
      }, 1000);
    } else {
      // 데스크톱에서는 바로 웹 버전 카카오톡으로
      window.open(kakaoUrl, '_blank');
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Button 
        onClick={handleKakaoChat}
        variant={variant}
        size={size}
        className={`bg-[#FEE500] hover:bg-[#FDD835] text-black border-0 ${className}`}
        data-testid="button-kakao-chat"
      >
        <motion.div
          animate={{ rotate: [0, 10, 0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
        </motion.div>
        카카오 상담
      </Button>
    </motion.div>
  );
}