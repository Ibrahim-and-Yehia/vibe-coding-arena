import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ icon: Icon, title, phase, description }: { icon: LucideIcon; title: string; phase: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {phase}
        </span>
      </CardContent>
    </Card>
  );
}
