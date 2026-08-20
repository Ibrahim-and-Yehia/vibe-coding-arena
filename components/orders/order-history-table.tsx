import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OrderRow, OrderStatus } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  queued: "In queue",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export interface HistoryRow extends OrderRow {
  tableLabel: string;
  customerName: string;
  itemCount: number;
}

export function OrderHistoryTable({ rows, currency }: { rows: HistoryRow[]; currency: string }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
        No completed orders yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">#</TableHead>
          <TableHead>Placed</TableHead>
          <TableHead>Table</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((order) => {
          const durationMinutes = order.delivered_at
            ? Math.round((new Date(order.delivered_at).getTime() - new Date(order.placed_at).getTime()) / 60000)
            : null;
          const onTime = durationMinutes !== null ? durationMinutes <= order.target_minutes : null;

          return (
            <TableRow key={order.id}>
              <TableCell className="font-semibold tabular-nums">{order.order_number}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(order.placed_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </TableCell>
              <TableCell>{order.tableLabel}</TableCell>
              <TableCell>{order.customerName}</TableCell>
              <TableCell className="text-muted-foreground">{order.itemCount} items</TableCell>
              <TableCell>
                {currency} {order.total_amount.toFixed(2)}
              </TableCell>
              <TableCell className={onTime === false ? "text-status-red" : "text-muted-foreground"}>
                {durationMinutes !== null ? `${durationMinutes} min` : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={order.status === "cancelled" ? "destructive" : "secondary"}>
                  {STATUS_LABEL[order.status]}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
