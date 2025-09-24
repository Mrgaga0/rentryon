import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import MobileNav from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Send, User, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  createdAt: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest("POST", "/api/chat", {
        message,
        sessionId,
        userId: null, // Anonymous for now
      });
    },
    onSuccess: (data: any) => {
      // Add both user and AI messages to the state
      setMessages(prev => [
        ...prev,
        data.userMessage,
        data.aiMessage
      ]);
      setInputMessage("");
    },
    onError: (error) => {
      console.error("Chat error:", error);
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          message: "죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.",
          isUser: false,
          createdAt: new Date().toISOString(),
        }
      ]);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    setMessages([
      {
        id: "welcome",
        message: "안녕하세요! 가전제품 렌탈 AI 상담사입니다. 😊\n\n어떤 가전제품을 찾고 계신지 말씀해주시면 최적의 제품을 추천해드릴게요!\n\n예를 들어:\n• \"4인 가족용 냉장고 추천해주세요\"\n• \"원룸에 맞는 소형 세탁기가 필요해요\"\n• \"에어컨 렌탈 비용이 궁금해요\"",
        isUser: false,
        createdAt: new Date().toISOString(),
      }
    ]);
  }, []);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || sendMessageMutation.isPending) return;

    const userMessage = {
      id: `user_${Date.now()}`,
      message: inputMessage.trim(),
      isUser: true,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    sendMessageMutation.mutate(inputMessage.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Chat Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4 mr-2" />
                홈으로
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold" data-testid="text-chat-title">AI 상담사</h2>
                <p className="text-xs text-muted-foreground">가전제품 렌탈 전문 상담</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto h-full px-4 py-6">
          <div className="h-full overflow-y-auto space-y-4 mb-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                data-testid={`message-${message.isUser ? 'user' : 'ai'}-${message.id}`}
              >
                <div className={`flex items-start space-x-2 max-w-[80%] md:max-w-[60%] ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className={message.isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                      {message.isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <Card className={message.isUser ? 'bg-primary text-primary-foreground' : ''}>
                    <CardContent className="p-3">
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      <p className={`text-xs mt-1 ${message.isUser ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {formatTime(message.createdAt)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {sendMessageMutation.isPending && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2 max-w-[80%] md:max-w-[60%]">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-secondary">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-card border-t border-border p-4">
        <div className="container mx-auto">
          <div className="flex space-x-2">
            <Input
              placeholder="궁금한 것을 물어보세요..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sendMessageMutation.isPending}
              className="flex-1"
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
