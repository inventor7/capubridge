import { computed, type Ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { IDBDomain } from "utils";
import { useCDP } from "./useCDP";
import { useTargetsStore } from "@/stores/targets.store";

export function useIDB() {
  const { getClient } = useCDP();
  const targetsStore = useTargetsStore();

  const targetId = computed(() => targetsStore.selectedTarget?.id ?? "");
  const targetOrigin = computed(() => {
    const url = targetsStore.selectedTarget?.url;
    if (!url) return "";
    try {
      return new URL(url).origin;
    } catch {
      return url;
    }
  });

  function getDomain() {
    const client = getClient(targetId.value);
    if (!client) throw new Error("No active CDP connection");
    return new IDBDomain(client);
  }

  function useDatabases() {
    return useQuery({
      queryKey: computed(() => ["idb-databases", targetId.value]),
      queryFn: async () => {
        const domain = getDomain();
        await domain.enable();
        return domain.getDatabases(targetOrigin.value);
      },
      enabled: computed(() => !!targetId.value && !!targetOrigin.value),
    });
  }

  function useRecords(
    dbName: Ref<string>,
    storeName: Ref<string>,
    page: Ref<number>,
    pageSize: Ref<number>,
  ) {
    return useQuery({
      queryKey: computed(() => [
        "idb-records",
        targetId.value,
        dbName.value,
        storeName.value,
        page.value,
        pageSize.value,
      ]),
      queryFn: async () => {
        const domain = getDomain();
        return domain.getData({
          securityOrigin: targetOrigin.value,
          databaseName: dbName.value,
          objectStoreName: storeName.value,
          skipCount: page.value * pageSize.value,
          pageSize: pageSize.value,
        });
      },
      enabled: computed(
        () => !!targetId.value && !!targetOrigin.value && !!dbName.value && !!storeName.value,
      ),
    });
  }

  return { targetId, targetOrigin, useDatabases, useRecords };
}
