import { SwipeApp } from "@/components/SwipeApp";
import { getOccupationFields } from "@/lib/jobtech";

export default async function Home() {
  return <SwipeApp fields={await getOccupationFields()} />;
}
