import type { Component } from "vue";

export interface InspectPlugin {
  id: string;
  name: string;
  icon: Component;
  routeName: string;
  routeSegment: string;
  component: () => Promise<Component>;
  detect: (evaluate: (expr: string) => Promise<unknown>) => Promise<boolean>;
}
