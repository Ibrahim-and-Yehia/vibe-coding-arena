"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function OrdersTabs({ live, history }: { live: React.ReactNode; history: React.ReactNode }) {
  return (
    <Tabs defaultValue="live">
      <TabsList>
        <TabsTrigger value="live">Live</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="live" className="pt-4">
        {live}
      </TabsContent>
      <TabsContent value="history" className="pt-4">
        {history}
      </TabsContent>
    </Tabs>
  );
}
