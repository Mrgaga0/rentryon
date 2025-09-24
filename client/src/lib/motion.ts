/**
 * 렌탈리움 모션 시스템
 * 브랜드에 맞는 세련되고 효율적인 페이지 전환 효과
 */

// 모션 토큰 - 일관성 있는 애니메이션을 위한 기본값들
export const motionTokens = {
  // 지속 시간 (ms)
  durations: {
    fast: 200,        // 버튼 호버, 작은 요소
    normal: 280,      // 일반적인 페이지 전환
    slow: 320,        // 복잡한 레이아웃 변화
    chat: 40,         // 채팅 메시지 스태거링
  },

  // 이징 커브 - 브랜드 톤에 맞는 부드러운 움직임
  easing: {
    // 기본 전환용 - 자연스럽고 부드러운
    smooth: [0.22, 1, 0.36, 1] as const,
    // 팝업, 등장 효과용 - 약간의 탄성
    bounce: [0.68, -0.55, 0.265, 1.55] as const,
    // 슬라이드 전환용 - 일정한 속도
    linear: [0.25, 0.46, 0.45, 0.94] as const,
    // 퇴장 효과용 - 빠른 가속
    exit: [0.4, 0, 1, 1] as const,
  },

  // 변형 값들
  transforms: {
    slideDistance: 24,    // 슬라이드 거리 (px)
    fadeOffset: 20,       // 페이드 업 오프셋 (px)
    scaleSubtle: 0.98,    // 미묘한 스케일 변화
    scaleHero: 1.02,      // 히어로 요소 강조
  },
};

// 페이지 가중치 - 슬라이드 방향 계산용
export const routeWeights: Record<string, number> = {
  '/': 0,           // Landing
  '/home': 1,       // Home
  '/products': 2,   // Products List
  '/chat': 3,       // Chat
  '/admin': 4,      // Admin
  // ProductDetail은 동적이므로 별도 처리
};

// 페이지별 전환 효과 변형들
export const pageVariants = {
  // Landing → Home: 따뜻한 환영 효과
  warmFadeUp: {
    initial: { 
      opacity: 0, 
      y: motionTokens.transforms.fadeOffset,
      scale: motionTokens.transforms.scaleSubtle 
    },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: motionTokens.durations.normal / 1000,
        ease: motionTokens.easing.smooth,
      }
    },
    exit: { 
      opacity: 0, 
      y: -motionTokens.transforms.fadeOffset,
      transition: {
        duration: motionTokens.durations.fast / 1000,
        ease: motionTokens.easing.exit,
      }
    },
  },

  // Home ↔ Products: 방향성 있는 슬라이드
  slideForward: {
    initial: { 
      opacity: 0, 
      x: motionTokens.transforms.slideDistance 
    },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: motionTokens.durations.normal / 1000,
        ease: motionTokens.easing.smooth,
      }
    },
    exit: { 
      opacity: 0, 
      x: -motionTokens.transforms.slideDistance,
      transition: {
        duration: motionTokens.durations.fast / 1000,
        ease: motionTokens.easing.exit,
      }
    },
  },

  slideBackward: {
    initial: { 
      opacity: 0, 
      x: -motionTokens.transforms.slideDistance 
    },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: motionTokens.durations.normal / 1000,
        ease: motionTokens.easing.smooth,
      }
    },
    exit: { 
      opacity: 0, 
      x: motionTokens.transforms.slideDistance,
      transition: {
        duration: motionTokens.durations.fast / 1000,
        ease: motionTokens.easing.exit,
      }
    },
  },

  // ProductDetail: 확대/드릴다운 효과 (이미지는 layoutId로 별도 처리)
  drillDown: {
    initial: { 
      opacity: 0, 
      scale: motionTokens.transforms.scaleSubtle,
      y: motionTokens.transforms.fadeOffset 
    },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        duration: motionTokens.durations.slow / 1000,
        ease: motionTokens.easing.smooth,
      }
    },
    exit: { 
      opacity: 0, 
      scale: motionTokens.transforms.scaleSubtle,
      transition: {
        duration: motionTokens.durations.fast / 1000,
        ease: motionTokens.easing.exit,
      }
    },
  },

  // Chat: 대화형 팝업 효과
  chatPopup: {
    initial: { 
      opacity: 0, 
      scale: motionTokens.transforms.scaleSubtle,
      y: motionTokens.transforms.fadeOffset 
    },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        duration: motionTokens.durations.normal / 1000,
        ease: motionTokens.easing.bounce,
      }
    },
    exit: { 
      opacity: 0, 
      scale: motionTokens.transforms.scaleSubtle,
      transition: {
        duration: motionTokens.durations.fast / 1000,
        ease: motionTokens.easing.exit,
      }
    },
  },

  // Admin: 전문적이고 효율적인 미니멀 전환
  minimal: {
    initial: { 
      opacity: 0, 
      y: 8 
    },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: motionTokens.durations.fast / 1000,
        ease: motionTokens.easing.linear,
      }
    },
    exit: { 
      opacity: 0,
      transition: {
        duration: motionTokens.durations.fast / 1000,
        ease: motionTokens.easing.exit,
      }
    },
  },
};

// 전환 방향 계산 헬퍼
export function getTransitionDirection(fromPath: string, toPath: string): 'forward' | 'backward' | 'none' {
  // ProductDetail 특별 처리
  if (toPath.startsWith('/products/') && fromPath === '/products') {
    return 'forward'; // Products → ProductDetail
  }
  if (fromPath.startsWith('/products/') && toPath === '/products') {
    return 'backward'; // ProductDetail → Products
  }

  // 일반적인 경로 가중치 비교
  const fromWeight = routeWeights[fromPath] ?? -1;
  const toWeight = routeWeights[toPath] ?? -1;

  if (fromWeight === -1 || toWeight === -1) return 'none';
  
  return toWeight > fromWeight ? 'forward' : 'backward';
}

// 페이지별 변형 선택 헬퍼
export function getPageVariant(fromPath: string, toPath: string): keyof typeof pageVariants {
  // Landing → Home
  if (fromPath === '/' && toPath === '/home') {
    return 'warmFadeUp';
  }

  // Home ↔ Products
  if ((fromPath === '/home' && toPath === '/products') || 
      (fromPath === '/products' && toPath === '/home')) {
    const direction = getTransitionDirection(fromPath, toPath);
    return direction === 'forward' ? 'slideForward' : 'slideBackward';
  }

  // Products → ProductDetail
  if (fromPath === '/products' && toPath.startsWith('/products/')) {
    return 'drillDown';
  }

  // ProductDetail → Products  
  if (fromPath.startsWith('/products/') && toPath === '/products') {
    return 'slideBackward';
  }

  // Chat 페이지
  if (toPath === '/chat') {
    return 'chatPopup';
  }

  // Admin 페이지
  if (toPath === '/admin') {
    return 'minimal';
  }

  // 기본값: 부드러운 페이드
  return 'warmFadeUp';
}

// 채팅 메시지 스태거링용 헬퍼
export function getChatStaggerVariants(index: number) {
  return {
    initial: { opacity: 0, y: 10, scale: 0.95 },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        delay: index * (motionTokens.durations.chat / 1000),
        duration: motionTokens.durations.fast / 1000,
        ease: motionTokens.easing.smooth,
      }
    },
  };
}

// Reduced Motion 지원
export const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.1 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.1 }
  },
};