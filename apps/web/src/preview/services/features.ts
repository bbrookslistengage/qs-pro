import { getTierFeatures, type TenantFeatures } from "@qs-pro/shared-types";

export async function getTenantFeatures(): Promise<TenantFeatures> {
  return getTierFeatures("enterprise");
}
