// Registration numbers stay on the server. The public site shows the model only.
// Daily rates and the optional damage-cover add-on are from Homer's fleet list.

export type FleetVehicle = {
  id: string;
  model: string;
  plate: string;
  category: "saloon" | "suv" | "4x4";
  seats: number;
  rate: number;
  addon: number;
};

export type FleetModel = {
  id: string;
  name: string;
  group: "saloon" | "4x4";
  category: "saloon" | "suv" | "4x4";
  tag: string;
  seatsText: string;
  gear: string;
  fuel: string;
  mileage: string;
  rate: number;
  addon: number;
  vehicleIds: string[];
};

export const FLEET: FleetVehicle[] = [
  { id: "v1", model: "Toyota Axio", plate: "KCF 426V", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v2", model: "Toyota Axio", plate: "KCH 310S", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v3", model: "Toyota Axio", plate: "KCJ 416Z", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v4", model: "Toyota Axio", plate: "KCJ 442Z", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v5", model: "Toyota Axio", plate: "KCP 806X", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v6", model: "Toyota Axio", plate: "KCQ 209B", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v7", model: "Toyota Axio", plate: "KCT 932A", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v8", model: "Toyota Axio", plate: "KCX 765J", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v9", model: "Toyota Axio", plate: "KCX 776J", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v10", model: "Toyota Axio", plate: "KDG 235D", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v11", model: "Toyota Fielder", plate: "KCJ 394G", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v12", model: "Toyota Premio", plate: "KBR 166E", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v13", model: "Toyota NZE", plate: "KBS 446X", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v14", model: "Toyota NZE", plate: "KBU 602S", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v15", model: "Toyota NZE", plate: "KBW 597Z", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v16", model: "Nissan Bluebird", plate: "KCC 985R", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v17", model: "Nissan Bluebird", plate: "KCC 874Y", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v18", model: "Nissan Bluebird", plate: "KCE 254P", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v19", model: "Nissan Bluebird", plate: "KCF 964M", category: "saloon", seats: 5, rate: 3500, addon: 1500 },
  { id: "v21", model: "Nissan X-Trail", plate: "KCD 327C", category: "suv", seats: 5, rate: 7500, addon: 2000 },
  { id: "v22", model: "Nissan X-Trail", plate: "KCS 356S", category: "suv", seats: 5, rate: 7500, addon: 2000 },
  { id: "v24", model: "Toyota Prado", plate: "KBP 406F", category: "4x4", seats: 5, rate: 13000, addon: 2000 },
  { id: "v25", model: "Toyota Prado", plate: "KBW 212C", category: "4x4", seats: 5, rate: 13000, addon: 2000 },
  { id: "v26", model: "Toyota Prado", plate: "KCB 722E", category: "4x4", seats: 5, rate: 13000, addon: 2000 },
  { id: "v27", model: "Toyota Prado", plate: "KCB 749H", category: "4x4", seats: 5, rate: 13000, addon: 2000 },
  { id: "v28", model: "Toyota Prado", plate: "KCE 404B", category: "4x4", seats: 5, rate: 13000, addon: 2000 },
  { id: "v29", model: "Toyota Prado", plate: "KCC 833T", category: "4x4", seats: 5, rate: 13000, addon: 2000 },
  { id: "v30", model: "Toyota Prado 3-door", plate: "KBW 554A", category: "4x4", seats: 3, rate: 13000, addon: 2000 },
  { id: "v31", model: "Toyota Prado", plate: "KCE 132P", category: "4x4", seats: 5, rate: 13000, addon: 2000 },
  { id: "v33", model: "Toyota Land Cruiser", plate: "KAU 675F", category: "4x4", seats: 5, rate: 18000, addon: 2000 },
];

export function modelSlug(model: string) {
  return model
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function describe(vehicle: FleetVehicle, vehicleIds: string[]): FleetModel {
  const manual = vehicle.model === "Toyota Land Cruiser";
  const seatNote = vehicle.model === "Toyota Prado" ? " (more on request)" : "";
  const tag =
    vehicle.category === "saloon"
      ? "Saloon · Self drive"
      : vehicle.category === "suv"
        ? "SUV · Self drive"
        : "4x4 · Self drive";
  return {
    id: modelSlug(vehicle.model),
    name: vehicle.model,
    group: vehicle.category === "saloon" ? "saloon" : "4x4",
    category: vehicle.category,
    tag,
    seatsText: vehicle.seats + " seats" + seatNote,
    gear: manual ? "Manual" : "Automatic",
    fuel: "Petrol", // every vehicle in the hire fleet runs on petrol (confirmed by Homer)
    mileage: vehicle.category === "saloon" ? "100 km/day, then KSh 15/km" : "Unlimited mileage",
    rate: vehicle.rate,
    addon: vehicle.addon,
    vehicleIds,
  };
}

export function fleetModels(): FleetModel[] {
  const grouped = new Map<string, FleetVehicle[]>();
  for (const vehicle of FLEET) {
    const list = grouped.get(vehicle.model) || [];
    list.push(vehicle);
    grouped.set(vehicle.model, list);
  }
  return Array.from(grouped.values()).map((list) =>
    describe(
      list[0],
      list.map((vehicle) => vehicle.id),
    ),
  );
}

export function modelById(id: string) {
  return fleetModels().find((model) => model.id === id) || null;
}

export function vehicleById(id: string) {
  return FLEET.find((vehicle) => vehicle.id === id) || null;
}
