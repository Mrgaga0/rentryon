import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Button, type ButtonProps } from "@/components/ui/button"
import { interactiveVariants, springPresets } from "@/lib/motion"

interface MotionButtonProps extends ButtonProps {
  motionVariant?: "button" | "category" | "subtle"
  enablePulse?: boolean
}

const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ 
    className, 
    children, 
    motionVariant = "button",
    enablePulse = false,
    disabled,
    ...props 
  }, ref) => {
    
    const shouldReduceMotion = useReducedMotion();
    
    // 모션 variant에 따른 애니메이션 선택
    const getMotionProps = () => {
      if (disabled || shouldReduceMotion) {
        return {}; // 비활성화되거나 reduced-motion 사용자는 애니메이션 없음
      }

      const baseMotion: any = {
        whileHover: motionVariant === "category" 
          ? interactiveVariants.categoryHover 
          : interactiveVariants.buttonHover,
        whileTap: motionVariant === "category"
          ? interactiveVariants.categoryPress 
          : interactiveVariants.buttonPress,
        transition: springPresets.snappy,
      };

      // Pulse 효과 추가
      if (enablePulse) {
        baseMotion.animate = interactiveVariants.attentionPulse;
      }

      return baseMotion;
    };

    return (
      <motion.div
        {...getMotionProps()}
        className="inline-block"
        style={{
          // GPU 가속을 위한 최적화
          willChange: 'transform, box-shadow',
          transformStyle: 'preserve-3d',
        }}
      >
        <Button 
          ref={ref}
          className={className}
          disabled={disabled}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    )
  }
)

MotionButton.displayName = "MotionButton"

export { MotionButton, type MotionButtonProps }