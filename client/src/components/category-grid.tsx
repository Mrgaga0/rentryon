import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
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
      {categories.map((category) => {
        const IconComponent = getIcon(category.icon);
        
        return (
          <Link key={category.id} href={`/products?categoryId=${category.id}`}>
            <Card className="text-center group cursor-pointer hover:shadow-md transition-shadow border border-border" data-testid={`category-${category.id}`}>
              <CardContent className="p-6">
                <IconComponent className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">{category.nameKo}</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
