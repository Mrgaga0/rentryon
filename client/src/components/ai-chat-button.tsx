import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bot, X, MessageCircle } from "lucide-react";
import { Link } from "wouter";

export default function AiChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50">
      {/* Chat Interface */}
      {isOpen && (
        <Card className="absolute bottom-16 right-0 w-80 h-96 shadow-xl border">
          <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <span className="font-medium">AI 상담사</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleChat}
              className="text-primary-foreground hover:text-primary-foreground/80 hover:bg-primary-foreground/20"
              data-testid="button-close-chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-4 h-64 overflow-y-auto bg-muted/30">
            <div className="mb-4">
              <Card className="bg-background">
                <CardContent className="p-3">
                  <p className="text-sm text-foreground">
                    안녕하세요! 가전제품 선택에 도움이 필요하시면 언제든 말씀해주세요. 😊
                  </p>
                  <p className="text-sm text-foreground mt-2">
                    더 자세한 상담을 원하시면 아래 버튼을 클릭해주세요!
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="p-4 border-t border-border">
            <Link href="/chat">
              <Button className="w-full" data-testid="button-open-full-chat">
                <MessageCircle className="mr-2 h-4 w-4" />
                전체 화면으로 채팅하기
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Chat Toggle Button */}
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg"
        onClick={toggleChat}
        data-testid="button-ai-chat"
      >
        <Bot className="h-6 w-6" />
      </Button>
    </div>
  );
}
