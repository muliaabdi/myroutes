/**
 * Helper to determine CCTV provider & managing agency from camera name or region
 */
export function getCCTVProvider(name: string, region?: string): string {
  const upper = (name || "").toUpperCase();

  if (upper.startsWith("PELINDUNG")) {
    return "Pelindung Diskominfo Bandung";
  }
  if (upper.startsWith("KOTA")) {
    return "ATCS Dishub Kota Bandung";
  }
  if (upper.startsWith("KBB")) {
    return "ATCS Dishub Bandung Barat";
  }
  if (upper.startsWith("KAB")) {
    return "Dishub Kabupaten Bandung";
  }
  if (upper.startsWith("CIMAHI")) {
    return "Dishub Kota Cimahi";
  }

  if (region) {
    const regLower = region.toLowerCase();
    if (regLower.includes("barat")) return "ATCS Dishub Bandung Barat";
    if (regLower.includes("kabupaten")) return "Dishub Kabupaten Bandung";
    if (regLower.includes("cimahi")) return "Dishub Kota Cimahi";
    if (regLower.includes("kota bandung")) return "ATCS Dishub Kota Bandung";
    return `CCTV ${region}`;
  }

  return "Dishub Bandung";
}
