import { Badge } from "@/components/ui/badge";
import { COMPETITOR_TYPE_INFO, type CompetitorType } from "@/lib/competitors/constants";

export function CompetitorTypeBadge({ type }: { type: CompetitorType }) {
  const info = COMPETITOR_TYPE_INFO[type];
  return <Badge variant={info.badge} data-competitor-type={type}>{info.label}</Badge>;
}
