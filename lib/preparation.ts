export function preparationTips(durationMinutes: number): string[] {
  if (durationMinutes <= 60) {
    return ["Charge your phone", "Charge a power bank if you have one"];
  }
  if (durationMinutes <= 240) {
    return [
      "Charge your phone and laptop",
      "Charge a power bank",
      "Keep an emergency light or torch ready",
      "Fill water storage if you use an electric pump",
    ];
  }
  return [
    "Fully charge backup batteries and power banks",
    "Prepare backup internet (mobile hotspot) if you work from home",
    "Save important work offline before the outage starts",
    "Keep emergency lighting available",
    "Fill water storage if you use an electric pump",
    "Plan for perishables if you have a refrigerator with limited backup",
  ];
}
