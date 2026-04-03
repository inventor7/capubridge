<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import {
  X,
  Usb,
  Wifi,
  Plus,
  Trash2,
  ArrowRightLeft,
  ArrowLeftRight,
  Link,
  RefreshCw,
  Circle,
  Power,
  RotateCcw,
  Camera,
  Terminal,
  ChevronRight,
  MonitorSmartphone,
} from "lucide-vue-next";
import { devices, portForwards } from "@/data/mock-data";

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; selectDevice: [id: string] }>();

// ── State ─────────────────────────────────────────────────────────────────────
const selectedDeviceId = ref(devices[0].id);
const rightView = ref<"device" | "connect">("device");
type DeviceTab = "connection" | "forwarding" | "reverse" | "actions";
const deviceTab = ref<DeviceTab>("connection");

const selectedDevice = computed(() => devices.find((d) => d.id === selectedDeviceId.value)!);

// Per-device port config
const devicePorts = reactive<
  Record<string, { forwards: typeof portForwards; reverses: typeof portForwards }>
>({
  [devices[0].id]: {
    forwards: portForwards.map((f) => ({ ...f })),
    reverses: [{ id: 10, local: 3000, remote: 3000, description: "React Native Metro" }],
  },
  [devices[1].id]: {
    forwards: [{ id: 20, local: 8081, remote: 8081, description: "Metro Bundler" }],
    reverses: [],
  },
  [devices[2].id]: { forwards: [], reverses: [] },
});

function ensureDevicePorts(id: string) {
  if (!devicePorts[id]) devicePorts[id] = { forwards: [], reverses: [] };
}

// Per-device connection mode (can be switched)
const deviceConn = reactive<Record<string, string>>(
  Object.fromEntries(devices.map((d) => [d.id, d.connection])),
);

// Add forward/reverse form state
const newLocal = ref("");
const newRemote = ref("");
const newDesc = ref("");

function addPort(type: "forwards" | "reverses") {
  if (!newLocal.value || !newRemote.value) return;
  ensureDevicePorts(selectedDeviceId.value);
  devicePorts[selectedDeviceId.value][type].push({
    id: Date.now(),
    local: Number(newLocal.value),
    remote: Number(newRemote.value),
    description: newDesc.value,
  });
  newLocal.value = "";
  newRemote.value = "";
  newDesc.value = "";
}

function removePort(type: "forwards" | "reverses", id: number) {
  ensureDevicePorts(selectedDeviceId.value);
  devicePorts[selectedDeviceId.value][type] = devicePorts[selectedDeviceId.value][type].filter(
    (f) => f.id !== id,
  );
}

// Connect new form
const wifiIp = ref("");
const wifiPort = ref("5555");
const pairAddr = ref("");
const pairCode = ref("");

function selectDevice(id: string) {
  selectedDeviceId.value = id;
  rightView.value = "device";
  deviceTab.value = "connection";
  emit("selectDevice", id);
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-150"
      enter-from-class="opacity-0 scale-[0.98]"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-100"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-[0.98]"
    >
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />

        <!-- Modal -->
        <div
          class="relative flex bg-surface-1 border border-border/40 rounded-xl shadow-2xl overflow-hidden"
          style="width: 900px; height: 560px"
        >
          <!-- ── LEFT SIDEBAR ──────────────────────────────────────────────── -->
          <div class="w-[230px] border-r border-border/25 flex flex-col shrink-0 bg-surface-0/60">
            <!-- Sidebar header -->
            <div class="h-12 flex items-center gap-2 px-4 border-b border-border/20 shrink-0">
              <MonitorSmartphone class="w-3.5 h-3.5 text-primary" />
              <span class="text-xs font-semibold text-foreground">Devices</span>
              <span class="ml-auto text-2xs font-mono text-dimmed">
                {{ devices.filter((d) => d.status === "online").length }}/{{ devices.length }}
              </span>
              <button
                class="w-5 h-5 flex items-center justify-center rounded text-dimmed hover:text-muted-foreground hover:bg-surface-3 transition-colors"
                title="Refresh"
              >
                <RefreshCw class="w-3 h-3" />
              </button>
            </div>

            <!-- Device list -->
            <div class="flex-1 overflow-y-auto p-2 space-y-1">
              <button
                v-for="d in devices"
                :key="d.id"
                @click="selectDevice(d.id)"
                class="w-full text-left p-2.5 rounded-lg border transition-all"
                :class="
                  selectedDeviceId === d.id && rightView === 'device'
                    ? 'border-primary/20 bg-primary/[0.06]'
                    : 'border-transparent hover:border-border/20 hover:bg-surface-2/60'
                "
              >
                <div class="flex items-center gap-2">
                  <Circle
                    class="w-[6px] h-[6px] shrink-0"
                    :class="
                      d.status === 'online'
                        ? 'fill-success text-success'
                        : 'fill-muted-foreground/30 text-muted-foreground/30'
                    "
                  />
                  <span class="text-xs font-medium text-foreground truncate flex-1">{{
                    d.model
                  }}</span>
                  <ChevronRight
                    v-if="selectedDeviceId === d.id && rightView === 'device'"
                    class="w-3 h-3 text-primary shrink-0"
                  />
                </div>
                <div class="flex items-center gap-1.5 mt-1 pl-3.5">
                  <span class="text-2xs font-mono text-dimmed truncate">{{
                    d.id.slice(0, 12)
                  }}</span>
                  <span class="text-2xs text-dimmed shrink-0">·</span>
                  <span
                    class="text-2xs shrink-0"
                    :class="
                      deviceConn[d.id] === 'USB'
                        ? 'text-success/70'
                        : deviceConn[d.id] === 'WiFi'
                          ? 'text-info/70'
                          : 'text-warning/70'
                    "
                    >{{ deviceConn[d.id] }}</span
                  >
                </div>
              </button>
            </div>

            <!-- Connect New -->
            <div class="p-2 border-t border-border/20 shrink-0">
              <button
                @click="rightView = 'connect'"
                class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all text-left"
                :class="
                  rightView === 'connect'
                    ? 'border-primary/20 bg-primary/[0.06] text-primary'
                    : 'border-dashed border-border/30 text-muted-foreground hover:text-secondary-foreground hover:border-border/50'
                "
              >
                <Link class="w-3.5 h-3.5 shrink-0" />
                <div>
                  <div class="text-xs font-medium">Connect New</div>
                  <div class="text-2xs opacity-70">TCP/IP · WiFi Pair</div>
                </div>
              </button>
            </div>
          </div>

          <!-- ── RIGHT PANEL ───────────────────────────────────────────────── -->
          <div class="flex-1 flex flex-col overflow-hidden">
            <!-- Close button -->
            <button
              @click="emit('close')"
              class="absolute top-3 right-3 z-10 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors"
            >
              <X class="w-3.5 h-3.5" />
            </button>

            <!-- ── DEVICE VIEW ──────────────────────────────────────────── -->
            <template v-if="rightView === 'device' && selectedDevice">
              <!-- Device header -->
              <div class="h-12 flex items-center gap-3 px-5 border-b border-border/20 shrink-0">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-foreground">{{
                      selectedDevice.model
                    }}</span>
                    <span
                      class="text-2xs px-1.5 py-0.5 rounded font-medium"
                      :class="
                        selectedDevice.status === 'online'
                          ? 'bg-success/10 text-success'
                          : 'bg-muted-foreground/10 text-muted-foreground'
                      "
                      >{{ selectedDevice.status }}</span
                    >
                  </div>
                  <div class="text-2xs text-dimmed font-mono">
                    Android {{ selectedDevice.androidVersion }} · API
                    {{ selectedDevice.apiLevel }} · {{ selectedDevice.ip }}
                  </div>
                </div>
                <button
                  @click="
                    emit('selectDevice', selectedDevice.id);
                    emit('close');
                  "
                  class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition-all shrink-0"
                >
                  Set Active
                </button>
              </div>

              <!-- Device tab bar -->
              <div
                class="flex items-center gap-0.5 px-1 border-b border-border/15 bg-surface-1/50 shrink-0"
              >
                <button
                  v-for="t in [
                    { id: 'connection', label: 'Connection' },
                    { id: 'forwarding', label: 'Forwarding' },
                    { id: 'reverse', label: 'Reverse' },
                    { id: 'actions', label: 'Actions' },
                  ]"
                  :key="t.id"
                  @click="deviceTab = t.id as DeviceTab"
                  class="relative px-3 py-2.5 text-2xs transition-colors"
                  :class="
                    deviceTab === t.id
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-secondary-foreground'
                  "
                >
                  {{ t.label }}
                  <div
                    v-if="deviceTab === t.id"
                    class="absolute bottom-0 left-1 right-1 h-[2px] bg-primary rounded-full"
                  />
                </button>
              </div>

              <!-- ── CONNECTION TAB ─────────────────────────────────────── -->
              <div v-if="deviceTab === 'connection'" class="flex-1 overflow-y-auto p-5 space-y-5">
                <!-- Connection mode toggle -->
                <div>
                  <div class="text-2xs text-muted-foreground uppercase tracking-wider mb-3">
                    Connection Mode
                  </div>
                  <div class="flex gap-3">
                    <button
                      v-for="mode in ['USB', 'WiFi', 'Emulator']"
                      :key="mode"
                      @click="deviceConn[selectedDevice.id] = mode"
                      class="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all"
                      :class="
                        deviceConn[selectedDevice.id] === mode
                          ? 'border-primary bg-primary/[0.06]'
                          : 'border-border/20 bg-surface-2/40 hover:border-border/40'
                      "
                    >
                      <component
                        :is="mode === 'WiFi' ? Wifi : mode === 'USB' ? Usb : Terminal"
                        class="w-5 h-5"
                        :class="
                          deviceConn[selectedDevice.id] === mode
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        "
                      />
                      <span
                        class="text-xs font-medium"
                        :class="
                          deviceConn[selectedDevice.id] === mode
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        "
                        >{{ mode }}</span
                      >
                      <div
                        v-if="deviceConn[selectedDevice.id] === mode"
                        class="text-2xs text-primary/70 font-medium"
                      >
                        Active
                      </div>
                    </button>
                  </div>
                </div>

                <!-- Device info -->
                <div class="grid grid-cols-2 gap-2">
                  <div
                    v-for="info in [
                      { label: 'Serial', value: selectedDevice.id },
                      { label: 'IP Address', value: selectedDevice.ip },
                      { label: 'Resolution', value: selectedDevice.resolution },
                      { label: 'Storage', value: selectedDevice.storage },
                    ]"
                    :key="info.label"
                    class="bg-surface-2/40 rounded-lg px-3 py-2 border border-border/15"
                  >
                    <div class="text-2xs text-dimmed mb-0.5">{{ info.label }}</div>
                    <div class="text-xs font-mono text-foreground truncate">{{ info.value }}</div>
                  </div>
                </div>

                <!-- WiFi switch instructions -->
                <div
                  v-if="deviceConn[selectedDevice.id] === 'USB'"
                  class="bg-surface-2/30 rounded-lg border border-border/15 p-3 space-y-1.5"
                >
                  <div class="text-2xs text-muted-foreground font-medium">
                    Switch to WiFi Debugging
                  </div>
                  <div class="flex items-center gap-2 text-2xs text-dimmed font-mono">
                    <span class="text-2xs bg-surface-3 px-1.5 py-0.5 rounded text-muted-foreground"
                      >adb tcpip 5555</span
                    >
                    <span class="text-dimmed">→ then connect via</span>
                    <span class="text-info">{{ selectedDevice.ip }}:5555</span>
                  </div>
                </div>
              </div>

              <!-- ── FORWARDING TAB ─────────────────────────────────────── -->
              <div
                v-else-if="deviceTab === 'forwarding'"
                class="flex-1 flex flex-col overflow-hidden"
              >
                <div class="flex-1 overflow-y-auto p-4 space-y-1.5">
                  <div
                    class="text-2xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"
                  >
                    <ArrowRightLeft class="w-2.5 h-2.5" />
                    host → device
                  </div>

                  <div
                    v-if="!devicePorts[selectedDevice.id]?.forwards?.length"
                    class="py-6 text-center text-2xs text-dimmed"
                  >
                    No forwards for this device
                  </div>

                  <div
                    v-for="fwd in devicePorts[selectedDevice.id]?.forwards ?? []"
                    :key="fwd.id"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-2/40 border border-border/15 group"
                  >
                    <span class="font-mono text-xs text-success">:{{ fwd.local }}</span>
                    <ArrowRightLeft class="w-3 h-3 text-dimmed shrink-0" />
                    <span class="font-mono text-xs text-info">:{{ fwd.remote }}</span>
                    <span class="text-2xs text-dimmed flex-1 truncate">{{ fwd.description }}</span>
                    <button
                      @click="removePort('forwards', fwd.id)"
                      class="p-1 rounded text-dimmed hover:text-error hover:bg-surface-3 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 class="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <!-- Add row -->
                <div class="p-3 border-t border-border/20 flex gap-2">
                  <input
                    v-model="newLocal"
                    class="w-20 bg-surface-2/60 border border-border/20 rounded-md px-2 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary/30 transition-colors placeholder:text-dimmed"
                    placeholder="host"
                  />
                  <ArrowRightLeft class="w-3 h-3 text-dimmed self-center shrink-0" />
                  <input
                    v-model="newRemote"
                    class="w-20 bg-surface-2/60 border border-border/20 rounded-md px-2 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary/30 transition-colors placeholder:text-dimmed"
                    placeholder="device"
                  />
                  <input
                    v-model="newDesc"
                    class="flex-1 bg-surface-2/60 border border-border/20 rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/30 transition-colors placeholder:text-dimmed"
                    placeholder="description"
                  />
                  <button
                    @click="addPort('forwards')"
                    class="px-3 py-1.5 rounded-md bg-surface-3 border border-border/20 text-xs text-secondary-foreground hover:text-foreground hover:border-primary/20 transition-all flex items-center gap-1"
                  >
                    <Plus class="w-3 h-3" />
                    Add
                  </button>
                </div>
              </div>

              <!-- ── REVERSE TAB ────────────────────────────────────────── -->
              <div v-else-if="deviceTab === 'reverse'" class="flex-1 flex flex-col overflow-hidden">
                <div class="flex-1 overflow-y-auto p-4 space-y-1.5">
                  <div
                    class="text-2xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"
                  >
                    <ArrowLeftRight class="w-2.5 h-2.5" />
                    device → host
                  </div>

                  <div
                    v-if="!devicePorts[selectedDevice.id]?.reverses?.length"
                    class="py-6 text-center text-2xs text-dimmed"
                  >
                    No reverses for this device
                  </div>

                  <div
                    v-for="rev in devicePorts[selectedDevice.id]?.reverses ?? []"
                    :key="rev.id"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-2/40 border border-border/15 group"
                  >
                    <span class="font-mono text-xs text-info">:{{ rev.local }}</span>
                    <ArrowLeftRight class="w-3 h-3 text-dimmed shrink-0" />
                    <span class="font-mono text-xs text-success">:{{ rev.remote }}</span>
                    <span class="text-2xs text-dimmed flex-1 truncate">{{ rev.description }}</span>
                    <button
                      @click="removePort('reverses', rev.id)"
                      class="p-1 rounded text-dimmed hover:text-error hover:bg-surface-3 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 class="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <!-- Add row -->
                <div class="p-3 border-t border-border/20 flex gap-2">
                  <input
                    v-model="newLocal"
                    class="w-20 bg-surface-2/60 border border-border/20 rounded-md px-2 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary/30 transition-colors placeholder:text-dimmed"
                    placeholder="device"
                  />
                  <ArrowLeftRight class="w-3 h-3 text-dimmed self-center shrink-0" />
                  <input
                    v-model="newRemote"
                    class="w-20 bg-surface-2/60 border border-border/20 rounded-md px-2 py-1.5 text-xs font-mono text-foreground outline-none focus:border-primary/30 transition-colors placeholder:text-dimmed"
                    placeholder="host"
                  />
                  <input
                    v-model="newDesc"
                    class="flex-1 bg-surface-2/60 border border-border/20 rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/30 transition-colors placeholder:text-dimmed"
                    placeholder="description"
                  />
                  <button
                    @click="addPort('reverses')"
                    class="px-3 py-1.5 rounded-md bg-surface-3 border border-border/20 text-xs text-secondary-foreground hover:text-foreground hover:border-primary/20 transition-all flex items-center gap-1"
                  >
                    <Plus class="w-3 h-3" />
                    Add
                  </button>
                </div>
              </div>

              <!-- ── ACTIONS TAB ────────────────────────────────────────── -->
              <div v-else class="flex-1 overflow-y-auto p-4">
                <div class="grid grid-cols-2 gap-2 max-w-sm">
                  <button
                    v-for="action in [
                      { icon: Camera, label: 'Take Screenshot', color: 'text-info' },
                      { icon: RotateCcw, label: 'Restart ADB', color: 'text-warning' },
                      { icon: Wifi, label: 'Enable WiFi Debug', color: 'text-primary' },
                      { icon: Power, label: 'Reboot Device', color: 'text-error' },
                      { icon: Power, label: 'Reboot Recovery', color: 'text-warning' },
                      { icon: Terminal, label: 'Open Shell', color: 'text-success' },
                    ]"
                    :key="action.label"
                    class="flex items-center gap-2.5 px-3 py-3 rounded-xl border border-border/20 bg-surface-2/40 hover:border-border/40 hover:bg-surface-2/70 transition-all text-left group"
                  >
                    <component
                      :is="action.icon"
                      class="w-3.5 h-3.5 shrink-0 transition-colors"
                      :class="action.color"
                    />
                    <span
                      class="text-xs text-secondary-foreground group-hover:text-foreground transition-colors"
                      >{{ action.label }}</span
                    >
                  </button>
                </div>
              </div>
            </template>

            <!-- ── CONNECT NEW VIEW ─────────────────────────────────────── -->
            <template v-else-if="rightView === 'connect'">
              <div class="h-12 flex items-center px-5 border-b border-border/20 shrink-0">
                <span class="text-sm font-semibold text-foreground">Connect New Device</span>
              </div>

              <div class="flex-1 overflow-y-auto p-5 space-y-6">
                <!-- TCP/IP -->
                <div class="space-y-3">
                  <div class="text-2xs font-medium text-muted-foreground uppercase tracking-wider">
                    Connect via TCP/IP
                  </div>
                  <div class="flex gap-2">
                    <div
                      class="flex-1 bg-surface-2/60 border border-border/20 rounded-lg px-3 py-2.5 flex items-center gap-2 focus-within:border-primary/30 transition-colors"
                    >
                      <span class="text-2xs text-dimmed font-mono">IP</span>
                      <input
                        v-model="wifiIp"
                        class="bg-transparent text-xs text-foreground flex-1 outline-none font-mono placeholder:text-dimmed"
                        placeholder="192.168.1.100"
                      />
                    </div>
                    <div
                      class="w-24 bg-surface-2/60 border border-border/20 rounded-lg px-3 py-2.5 flex items-center gap-2 focus-within:border-primary/30 transition-colors"
                    >
                      <span class="text-2xs text-dimmed font-mono">:</span>
                      <input
                        v-model="wifiPort"
                        class="bg-transparent text-xs text-foreground flex-1 outline-none font-mono"
                      />
                    </div>
                    <button
                      class="px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition-all flex items-center gap-1.5"
                    >
                      <Link class="w-3 h-3" />
                      Connect
                    </button>
                  </div>
                  <p class="text-2xs text-dimmed">
                    Run
                    <span class="font-mono bg-surface-3 px-1.5 py-0.5 rounded text-muted-foreground"
                      >adb tcpip 5555</span
                    >
                    on a USB-connected device first, then unplug and connect here.
                  </p>
                </div>

                <!-- WiFi Pair (Android 11+) -->
                <div class="space-y-3">
                  <div class="text-2xs font-medium text-muted-foreground uppercase tracking-wider">
                    Wireless Debugging — Android 11+
                  </div>
                  <div class="bg-surface-2/40 rounded-xl border border-border/15 p-4 space-y-3">
                    <div class="flex gap-2">
                      <div
                        class="flex-1 bg-surface-2/60 border border-border/20 rounded-lg px-3 py-2.5 flex items-center gap-2 focus-within:border-primary/30 transition-colors"
                      >
                        <span class="text-2xs text-dimmed font-mono">addr</span>
                        <input
                          v-model="pairAddr"
                          class="bg-transparent text-xs text-foreground flex-1 outline-none font-mono placeholder:text-dimmed"
                          placeholder="192.168.1.100:37261"
                        />
                      </div>
                      <div
                        class="w-32 bg-surface-2/60 border border-border/20 rounded-lg px-3 py-2.5 flex items-center gap-2 focus-within:border-primary/30 transition-colors"
                      >
                        <span class="text-2xs text-dimmed">code</span>
                        <input
                          v-model="pairCode"
                          class="bg-transparent text-xs text-foreground flex-1 outline-none font-mono"
                          placeholder="123456"
                        />
                      </div>
                      <button
                        class="px-4 rounded-lg bg-surface-3 border border-border/20 text-xs text-secondary-foreground hover:text-foreground hover:border-border/40 transition-all flex items-center gap-1.5"
                      >
                        <Wifi class="w-3 h-3" />
                        Pair
                      </button>
                    </div>
                    <p class="text-2xs text-dimmed leading-relaxed">
                      Settings → Developer options → Wireless debugging → Pair device with pairing
                      code
                    </p>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
