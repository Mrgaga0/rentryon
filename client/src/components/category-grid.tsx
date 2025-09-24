import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { interactiveVariants, springPresets } from "@/lib/motion";
import { 
  Snowflake, 
  ShirtIcon, 
  Wind, 
  Tv, 
  Microwave, 
  Bot,
  Utensils,
  Coffee,
  WashingMachine,
  AirVent
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  nameKo: string;
  icon: string;
}

interface CategoryGridProps {
  categories: Category[];
}

const iconMap: Record<string, any> = {
  "snowflake": Snowflake,
  "shirt": ShirtIcon,
  "wind": Wind,
  "tv": Tv,
  "microwave": Microwave,
  "robot": Bot,
  "utensils": Utensils,
  "coffee": Coffee,
  "washing-machine": WashingMachine,
  "air-vent": AirVent,
};

export default function CategoryGrid({ categories }: CategoryGridProps) {
  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Bot;
    return IconComponent;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {categories.map((category, index) => {
        const IconComponent = getIcon(category.icon);
        
        return (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              ...springPresets.gentle,
              delay: index * 0.1, // 스태거 효과
            }}
            whileHover={interactiveVariants.categoryHover}
            whileTap={interactiveVariants.categoryPress}
            className="group"
            style={{
              willChange: 'transform, box-shadow',
            }}
          >
            <Link href={`/products?categoryId=${category.id}`}>
              <Card className="text-center cursor-pointer border-2 border-border/50 hover:border-primary/30 transition-colors duration-200 bg-card/80 backdrop-blur-sm" data-testid={`category-${category.id}`}>
                <CardContent className="p-6">
                  <motion.div
                    whileHover={{
                      scale: 1.1,
                      rotate: [0, -5, 5, 0],
                      transition: { 
                        duration: 0.3,
                        ease: "easeInOut"
                      }
                    }}
                    className="mb-3 flex justify-center"
                  >
                    <IconComponent className="h-8 w-8 text-primary group-hover:text-primary/80 transition-colors duration-200" />
                  </motion.div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary/90 transition-colors duration-200">
                    {category.nameKo}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
