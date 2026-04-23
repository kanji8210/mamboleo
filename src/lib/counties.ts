// Kenya counties and subcounties (minimal example)
// In production, use a full dataset or fetch from API
export const COUNTIES = [
  {
    name: "Nairobi",
    center: [-1.286389, 36.817223],
    subcounties: [
      { name: "Westlands", center: [-1.2647, 36.8121] },
      { name: "Lang'ata", center: [-1.3621, 36.7672] },
      { name: "Kibra", center: [-1.3127, 36.7924] },
      { name: "Dagoretti North", center: [-1.2833, 36.7667] },
      { name: "Starehe", center: [-1.2833, 36.8333] },
      { name: "Embakasi South", center: [-1.3342, 36.8947] },
      { name: "Makadara", center: [-1.3000, 36.8667] },
      { name: "Kamukunji", center: [-1.2833, 36.8667] },
      { name: "Mathare", center: [-1.2667, 36.8667] },
      { name: "Kasarani", center: [-1.2333, 36.9000] },
      { name: "Roysambu", center: [-1.2000, 36.9000] },
      { name: "Embakasi East", center: [-1.3167, 36.9000] },
      { name: "Embakasi West", center: [-1.2833, 36.8500] },
      { name: "Embakasi North", center: [-1.2500, 36.9000] },
      { name: "Embakasi Central", center: [-1.2833, 36.9000] },
      { name: "Embakasi South", center: [-1.3333, 36.9000] },
    ]
  },
  {
    name: "Mombasa",
    center: [-4.0435, 39.6682],
    subcounties: [
      { name: "Changamwe", center: [-4.0256, 39.6206] },
      { name: "Jomvu", center: [-4.0435, 39.6682] },
      { name: "Kisauni", center: [-4.0177, 39.7137] },
      { name: "Nyali", center: [-4.0435, 39.6682] },
      { name: "Likoni", center: [-4.0951, 39.6667] },
      { name: "Mvita", center: [-4.0629, 39.6667] },
    ]
  },
  // ...add more counties as needed
];
