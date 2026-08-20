import { LiveFloor } from "@/components/floor/live-floor";

export default function FloorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Live floor</h1>
        <p className="text-muted-foreground">Every table, every order, updating in real time.</p>
      </div>
      <LiveFloor />
    </div>
  );
}
