import FabricationPage from "../../components/FabricationPage";

// Server component: the page itself is FabricationPage (Homer's "D · Combined" design, Nov 2026).
export const metadata = {
  title: "Vehicle fabrication",
  description:
    "Roof hatches, racks, game viewers, trailers and structural repairs, made in-house at The Chequered Flag workshop in Karen, Nairobi.",
};

export default function Fabrication() {
  const years = new Date().getFullYear() - 1975;
  return <FabricationPage years={years} />;
}
