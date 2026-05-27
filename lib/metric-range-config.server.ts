import { cookies } from "next/headers";
import {
  METRIC_RANGE_OVERRIDES_COOKIE,
  parseMetricRangeOverrides,
  type MetricRangeOverrides,
} from "./metric-range-config";

export async function readMetricRangeOverridesFromCookies(): Promise<MetricRangeOverrides> {
  const cookieStore = await cookies();
  return parseMetricRangeOverrides(cookieStore.get(METRIC_RANGE_OVERRIDES_COOKIE)?.value);
}