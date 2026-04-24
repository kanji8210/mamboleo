// ─── Kenya counties dataset ──────────────────────────────────────────────
//
// All 47 Kenyan counties with approximate geographic centres (latitude,
// longitude). Subcounties are only populated for the two most-used cities
// (Nairobi & Mombasa) — the rest expose an empty list so the UI still
// shows a "Subcounty…" placeholder without offering ambiguous choices.
//
// Sources: Kenya National Bureau of Statistics + Humanitarian Data Exchange.

export interface Subcounty {
  name: string
  center: [number, number]
}

export interface County {
  name: string
  center: [number, number]
  subcounties: Subcounty[]
}

export const COUNTIES: County[] = [
  {
    name: 'Nairobi',
    center: [-1.286389, 36.817223],
    subcounties: [
      { name: "Westlands",        center: [-1.2647, 36.8121] },
      { name: "Dagoretti North",  center: [-1.2833, 36.7667] },
      { name: "Dagoretti South",  center: [-1.3000, 36.7300] },
      { name: "Lang'ata",         center: [-1.3621, 36.7672] },
      { name: "Kibra",            center: [-1.3127, 36.7924] },
      { name: "Roysambu",         center: [-1.2000, 36.9000] },
      { name: "Kasarani",         center: [-1.2333, 36.9000] },
      { name: "Ruaraka",          center: [-1.2500, 36.8700] },
      { name: "Embakasi South",   center: [-1.3342, 36.8947] },
      { name: "Embakasi North",   center: [-1.2500, 36.9000] },
      { name: "Embakasi Central", center: [-1.2833, 36.9000] },
      { name: "Embakasi East",    center: [-1.3167, 36.9000] },
      { name: "Embakasi West",    center: [-1.2833, 36.8500] },
      { name: "Makadara",         center: [-1.3000, 36.8667] },
      { name: "Kamukunji",        center: [-1.2833, 36.8667] },
      { name: "Starehe",          center: [-1.2833, 36.8333] },
      { name: "Mathare",          center: [-1.2667, 36.8667] },
    ],
  },
  {
    name: 'Mombasa',
    center: [-4.0435, 39.6682],
    subcounties: [
      { name: 'Changamwe', center: [-4.0256, 39.6206] },
      { name: 'Jomvu',     center: [-4.0167, 39.6333] },
      { name: 'Kisauni',   center: [-4.0177, 39.7137] },
      { name: 'Nyali',     center: [-4.0300, 39.7000] },
      { name: 'Likoni',    center: [-4.0951, 39.6667] },
      { name: 'Mvita',     center: [-4.0629, 39.6667] },
    ],
  },
  { name: 'Kwale',            center: [-4.1816, 39.4606], subcounties: [] },
  { name: 'Kilifi',           center: [-3.5107, 39.9093], subcounties: [] },
  { name: 'Tana River',       center: [-1.6518, 39.6518], subcounties: [] },
  { name: 'Lamu',             center: [-2.2717, 40.9020], subcounties: [] },
  { name: 'Taita-Taveta',     center: [-3.3961, 38.4850], subcounties: [] },
  { name: 'Garissa',          center: [-0.4569, 39.6583], subcounties: [] },
  { name: 'Wajir',            center: [1.7471, 40.0629],  subcounties: [] },
  { name: 'Mandera',          center: [3.9366, 41.8569],  subcounties: [] },
  { name: 'Marsabit',         center: [2.3354, 37.9900],  subcounties: [] },
  { name: 'Isiolo',           center: [0.3536, 37.5822],  subcounties: [] },
  { name: 'Meru',             center: [0.0466, 37.6560],  subcounties: [] },
  { name: 'Tharaka-Nithi',    center: [-0.2964, 37.7260], subcounties: [] },
  { name: 'Embu',             center: [-0.5384, 37.4571], subcounties: [] },
  { name: 'Kitui',            center: [-1.3667, 38.0100], subcounties: [] },
  { name: 'Machakos',         center: [-1.5177, 37.2634], subcounties: [] },
  { name: 'Makueni',          center: [-1.8040, 37.6242], subcounties: [] },
  { name: 'Nyandarua',        center: [-0.1800, 36.5200], subcounties: [] },
  { name: 'Nyeri',            center: [-0.4201, 36.9476], subcounties: [] },
  { name: 'Kirinyaga',        center: [-0.6590, 37.3827], subcounties: [] },
  { name: "Murang'a",         center: [-0.7839, 37.0400], subcounties: [] },
  { name: 'Kiambu',           center: [-1.1714, 36.8356], subcounties: [] },
  { name: 'Turkana',          center: [3.1167, 35.6000],  subcounties: [] },
  { name: 'West Pokot',       center: [1.4024, 35.1119],  subcounties: [] },
  { name: 'Samburu',          center: [1.2152, 36.9545],  subcounties: [] },
  { name: 'Trans Nzoia',      center: [1.0226, 34.9906],  subcounties: [] },
  { name: 'Uasin Gishu',      center: [0.5143, 35.2698],  subcounties: [] },
  { name: 'Elgeyo-Marakwet',  center: [0.8542, 35.5330],  subcounties: [] },
  { name: 'Nandi',            center: [0.1667, 35.1000],  subcounties: [] },
  { name: 'Baringo',          center: [0.6554, 35.8800],  subcounties: [] },
  { name: 'Laikipia',         center: [0.3606, 36.7820],  subcounties: [] },
  { name: 'Nakuru',           center: [-0.3031, 36.0800], subcounties: [] },
  { name: 'Narok',            center: [-1.0781, 35.8711], subcounties: [] },
  { name: 'Kajiado',          center: [-1.8527, 36.7765], subcounties: [] },
  { name: 'Kericho',          center: [-0.3689, 35.2833], subcounties: [] },
  { name: 'Bomet',            center: [-0.7816, 35.3418], subcounties: [] },
  { name: 'Kakamega',         center: [0.2827, 34.7519],  subcounties: [] },
  { name: 'Vihiga',           center: [0.0765, 34.7225],  subcounties: [] },
  { name: 'Bungoma',          center: [0.5695, 34.5584],  subcounties: [] },
  { name: 'Busia',            center: [0.4608, 34.1115],  subcounties: [] },
  { name: 'Siaya',            center: [0.0611, 34.2881],  subcounties: [] },
  { name: 'Kisumu',           center: [-0.0917, 34.7680], subcounties: [] },
  { name: 'Homa Bay',         center: [-0.5273, 34.4571], subcounties: [] },
  { name: 'Migori',           center: [-1.0634, 34.4731], subcounties: [] },
  { name: 'Kisii',            center: [-0.6817, 34.7720], subcounties: [] },
  { name: 'Nyamira',          center: [-0.5633, 34.9358], subcounties: [] },
]
