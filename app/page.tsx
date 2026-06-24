import { getDashboardData } from "@/lib/repository";
import { Dashboard } from "@/components/dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getDashboardData();
  return <Dashboard initialData={data} />;
}
