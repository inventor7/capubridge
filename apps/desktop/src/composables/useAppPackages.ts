import { computed } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { runSessionEffect, listPackagesEffect, refreshPackagesEffect } from "@/runtime/session";
import type { SessionRequestOptions } from "@/runtime/effect/cancellation";
import type { AdbPackage } from "@/types/adb.types";

export type PackageFetchScope = "third-party" | "all";

export const PACKAGE_CACHE_STALE_MS = 60_000;

export function useAppPackages(serial: { value: string } | string) {
  const queryClient = useQueryClient();

  const activeSerial = computed(() => {
    return typeof serial === "string" ? serial : serial.value;
  });

  function packageQueryKey(scope: PackageFetchScope) {
    return packageQueryKeyFor(activeSerial.value, scope);
  }

  function packageQueryKeyFor(serialValue: string, scope: PackageFetchScope) {
    return ["packages", serialValue, scope];
  }

  function writePackagesCache(
    serialValue: string,
    scope: PackageFetchScope,
    packages: AdbPackage[],
  ) {
    queryClient.setQueryData(packageQueryKeyFor(serialValue, scope), packages);
    if (scope === "all") {
      queryClient.setQueryData(
        packageQueryKeyFor(serialValue, "third-party"),
        packages.filter((entry) => !entry.system),
      );
    }
  }

  async function loadPackages(
    scope: PackageFetchScope,
    options?: Omit<SessionRequestOptions, "operation">,
  ) {
    const currentSerial = activeSerial.value;
    if (!currentSerial) {
      return [];
    }

    const packages = await runSessionEffect(listPackagesEffect(currentSerial, scope), {
      operation: "session.listPackages",
      signal: options?.signal,
    });

    if (packages.length > 0) {
      writePackagesCache(currentSerial, scope, packages);
      return packages;
    }

    const cachedPackages = queryClient.getQueryData<AdbPackage[]>(
      packageQueryKeyFor(currentSerial, scope),
    );
    if (cachedPackages) {
      return cachedPackages;
    }

    return refreshPackageScope(scope, options);
  }

  async function refreshPackageScope(
    scope: PackageFetchScope,
    options?: Omit<SessionRequestOptions, "operation">,
  ) {
    const currentSerial = activeSerial.value;
    if (!currentSerial) {
      return [];
    }

    const packages = await runSessionEffect(refreshPackagesEffect(currentSerial, scope), {
      operation: "session.refreshPackages",
      signal: options?.signal,
    });

    writePackagesCache(currentSerial, scope, packages);
    return packages;
  }

  function usePackages(scope: PackageFetchScope | { value: PackageFetchScope } = "third-party") {
    const resolvedScope = computed(() => (typeof scope === "string" ? scope : scope.value));

    return useQuery({
      queryKey: computed(() => packageQueryKey(resolvedScope.value)),
      queryFn: ({ signal }) => loadPackages(resolvedScope.value, { signal }),
      enabled: computed(() => !!activeSerial.value),
      staleTime: PACKAGE_CACHE_STALE_MS,
      gcTime: 24 * 60 * 60 * 1000,
    });
  }

  async function refreshPackages(scope: PackageFetchScope = "third-party") {
    await refreshPackageScope(scope);
  }

  function readPackagesCache(
    serial: string,
    scope: PackageFetchScope,
  ): { packages: AdbPackage[] } | null {
    const packages = queryClient.getQueryData<AdbPackage[]>(packageQueryKeyFor(serial, scope));
    return packages ? { packages } : null;
  }

  function getCachedPackage(packageName: string): AdbPackage | null {
    const currentSerial = activeSerial.value;
    if (!currentSerial) {
      return null;
    }

    const scopes: PackageFetchScope[] = ["third-party", "all"];
    for (const scope of scopes) {
      const packages = queryClient.getQueryData<AdbPackage[]>(
        packageQueryKeyFor(currentSerial, scope),
      );
      const packageEntry = packages?.find((entry) => entry.packageName === packageName);
      if (packageEntry) {
        return packageEntry;
      }
    }

    return null;
  }

  return {
    PACKAGE_CACHE_STALE_MS,
    usePackages,
    refreshPackages,
    getCachedPackage,
    readPackagesCache,
  };
}
