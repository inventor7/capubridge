import { Atom } from "lucide-vue-next";
import { registerInspectPlugin } from "./registry";

registerInspectPlugin({
  id: "react-devtools",
  name: "React",
  icon: Atom,
  routeName: "inspect-react",
  routeSegment: "react",
  component: async () => (await import("../ReactDevtoolsPlaceholder.vue")).default,
  detect: async (evaluate) => {
    const result = await evaluate("!!window.__REACT_DEVTOOLS_GLOBAL_HOOK__");
    return result === true;
  },
});
