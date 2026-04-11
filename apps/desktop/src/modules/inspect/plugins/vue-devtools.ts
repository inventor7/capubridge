import { Hexagon } from "lucide-vue-next";
import { registerInspectPlugin } from "./registry";

registerInspectPlugin({
  id: "vue-devtools",
  name: "Vue",
  icon: Hexagon,
  routeName: "inspect-vue",
  routeSegment: "vue",
  component: async () => (await import("../VueDevtoolsPanel.vue")).default,
  detect: async (evaluate) => {
    const result = await evaluate(`(() => {
      if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.apps?.length) return true;
      if (window.__VUE__ || window.__NUXT__) return true;
      const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT);
      let current = walker.currentNode;
      while (current) {
        if (
          "__vue_app__" in current ||
          "__vueParentComponent" in current ||
          "__vnode" in current
        ) {
          return true;
        }
        current = walker.nextNode();
      }
      return false;
    })()`);
    return result === true;
  },
});
