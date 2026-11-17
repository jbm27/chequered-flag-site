import WorkshopPage from "../../components/WorkshopPage";
import { FLEET } from "../../lib/fleet";

// Server component: only the fleet size is passed to the page, never the vehicle list.
export const metadata = {
  title: "Workshop",
  description:
    "Servicing, repairs and 4x4 work at The Chequered Flag workshop on Ngong Road, Karen, Nairobi.",
};

export default function Workshop() {
  const years = new Date().getFullYear() - 1975;
  return <WorkshopPage years={years} fleetSize={FLEET.length} />;
}
