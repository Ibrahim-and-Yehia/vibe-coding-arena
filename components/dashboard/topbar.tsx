import { NotificationSheet } from "@/components/dashboard/notification-sheet";
import { UserMenu } from "@/components/dashboard/user-menu";

export function Topbar({ email }: { email: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6">
      <div />
      <div className="flex items-center gap-1">
        <NotificationSheet />
        <UserMenu email={email} />
      </div>
    </header>
  );
}
