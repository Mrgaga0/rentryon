/**
 * PageTransition 컴포넌트
 * 렌트리온의 브랜드에 맞는 페이지 전환 효과를 제공
 */

import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { useLocation } from "wouter";
import { useRef, useEffect } from "react";
import { 
  getPageVariant, 
  pageVariants, 
  reducedMotionVariants,
  motionTokens 
} from "@/lib/motion";

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();
  const previousPathRef = useRef<string>('/');

  // 이전 경로 추적 - 렌더링 중에 올바른 이전 경로 확보
  useEffect(() => {
    previousPathRef.current = location;
  }, [location]);

  // 현재 전환에 적합한 변형 선택
  const variantKey = getPageVariant(previousPathRef.current, location);
  const variants = pageVariants[variantKey];

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          className="page-transition-container"
          style={{
            // GPU 가속을 위한 will-change 최적화
            willChange: 'transform, opacity',
            // 레이아웃 시프트 방지
            minHeight: '100vh',
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}

/**
 * 페이지 컴포넌트에서 사용할 수 있는 공통 스타일드 래퍼
 * 일관된 페이지 레이아웃과 모션 최적화를 제공
 */
export function PageWrapper({ 
  children, 
  className = "",
  withPadding = true 
}: { 
  children: React.ReactNode;
  className?: string;
  withPadding?: boolean;
}) {
  return (
    <div 
      className={`
        relative 
        min-h-screen 
        ${withPadding ? 'pb-20 md:pb-6' : ''} 
        ${className}
      `}
      style={{
        // 모션 최적화
        transform: 'translateZ(0)', // 하드웨어 가속 강제
        backfaceVisibility: 'hidden', // 플리커링 방지
      }}
    >
      {children}
    </div>
  );
}

/**
 * 공유 요소 전환을 위한 헬퍼 컴포넌트
 * 제품 이미지 등에서 사용
 */
export function SharedElement({
  layoutId,
  children,
  className = "",
  ...props
}: {
  layoutId: string;
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <motion.div
      layoutId={layoutId}
      className={className}
      transition={{
        duration: motionTokens.durations.slow / 1000,
        ease: motionTokens.easing.smooth,
      }}
      style={{
        willChange: 'transform',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * 채팅 메시지용 스태거링 컨테이너
 */
export function ChatStaggerContainer({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: motionTokens.durations.chat / 1000,
            delayChildren: 0.1,
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 개별 채팅 메시지 아이템
 */
export function ChatStaggerItem({ 
  children,
  delay = 0
}: { 
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      variants={{
        initial: { 
          opacity: 0, 
          y: 10, 
          scale: 0.95 
        },
        animate: { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          transition: {
            delay,
            duration: motionTokens.durations.fast / 1000,
            ease: motionTokens.easing.smooth,
          }
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 관리자 페이지용 효율적인 카드 애니메이션
 */
export function AdminCard({ 
  children,
  index = 0,
  className = ""
}: { 
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: {
          delay: index * 0.05, // 미묘한 스태거링
          duration: motionTokens.durations.fast / 1000,
          ease: motionTokens.easing.linear,
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * 제품 카드용 호버 효과가 있는 모션 래퍼
 */
export function ProductCardMotion({ 
  children,
  className = "",
  ...props
}: { 
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <motion.div
      whileHover={{ 
        scale: 1.02,
        y: -2,
        transition: {
          duration: motionTokens.durations.fast / 1000,
          ease: motionTokens.easing.smooth,
        }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: {
          duration: 0.1,
          ease: motionTokens.easing.linear,
        }
      }}
      className={className}
      style={{
        willChange: 'transform',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}