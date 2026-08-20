import type {
  OrderRow,
  OrderItemRow,
  TableSessionRow,
  AlertRow,
  FloorObjectRow,
  FloorAreaRow,
} from "@/lib/types";

/** Everything the live dashboard needs, in one poll. */
export interface LiveVenuePayload {
  areas: FloorAreaRow[];
  objects: FloorObjectRow[];
  sessions: TableSessionRow[];
  orders: OrderRow[];
  orderItems: OrderItemRow[];
  alerts: AlertRow[];
  slaAmberPct: number;
  slaRedPct: number;
  currency: string;
  kitchenLabel: string;
  fetchedAt: string;
}

export const ACTIVE_ORDER_STATUSES = ["queued", "preparing", "ready"] as const;
