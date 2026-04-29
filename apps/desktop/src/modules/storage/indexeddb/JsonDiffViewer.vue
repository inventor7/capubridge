<script setup lang="ts">
import { computed, ref } from "vue";
import JsonEditor from "@/modules/storage/localstorage/JsonEditor.vue";

type DiffKind = "same" | "add" | "remove" | "change" | "empty";

interface DiffRow {
  leftLine: number | null;
  rightLine: number | null;
  leftKind: DiffKind;
  rightKind: DiffKind;
}

const props = defineProps<{
  beforeValue?: unknown;
  afterText: string;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  "update:afterText": [value: string];
  "validity-change": [valid: boolean];
}>();

const beforeEditorRef = ref<InstanceType<typeof JsonEditor> | null>(null);
const afterEditorRef = ref<InstanceType<typeof JsonEditor> | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function encodePrimitive(value: unknown) {
  const encoded = JSON.stringify(value);
  return encoded === undefined ? "null" : encoded;
}

function orderedKeys(value: Record<string, unknown>, preferred: unknown) {
  const keys = new Set<string>();
  if (isRecord(preferred)) {
    for (const key of Object.keys(preferred)) keys.add(key);
  }
  for (const key of Object.keys(value)) keys.add(key);
  return Array.from(keys).filter((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function stringifyWithPreferredOrder(value: unknown, preferred: unknown, level = 0): string {
  const indent = "  ".repeat(level);
  const nextIndent = "  ".repeat(level + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const preferredItems = Array.isArray(preferred) ? preferred : [];
    const lines = value.map(
      (item, index) =>
        `${nextIndent}${stringifyWithPreferredOrder(item, preferredItems[index], level + 1)}`,
    );
    return `[\n${lines.join(",\n")}\n${indent}]`;
  }

  if (isRecord(value)) {
    const keys = orderedKeys(value, preferred);
    if (keys.length === 0) return "{}";
    const preferredRecord = isRecord(preferred) ? preferred : {};
    const lines = keys.map(
      (key) =>
        `${nextIndent}${JSON.stringify(key)}: ${stringifyWithPreferredOrder(
          value[key],
          preferredRecord[key],
          level + 1,
        )}`,
    );
    return `{\n${lines.join(",\n")}\n${indent}}`;
  }

  return encodePrimitive(value);
}

function parseJson(text: string) {
  try {
    return { ok: true as const, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false as const };
  }
}

const beforeText = computed(() => {
  if (props.beforeValue === undefined) return "";
  const parsedAfter = parseJson(props.afterText);
  if (!parsedAfter.ok) return JSON.stringify(props.beforeValue, null, 2) ?? "";
  return stringifyWithPreferredOrder(props.beforeValue, parsedAfter.value);
});

const beforeLineCount = computed(() => beforeText.value.split("\n").length);
const afterLineCount = computed(() => props.afterText.split("\n").length);

function buildSimpleDiff(beforeLines: string[], afterLines: string[]): DiffRow[] {
  const rows: DiffRow[] = [];
  const maxLength = Math.max(beforeLines.length, afterLines.length);

  for (let index = 0; index < maxLength; index += 1) {
    const same = beforeLines[index] === afterLines[index];
    const leftMissing = index >= beforeLines.length;
    const rightMissing = index >= afterLines.length;

    rows.push({
      leftLine: leftMissing ? null : index,
      rightLine: rightMissing ? null : index,
      leftKind: same ? "same" : leftMissing ? "empty" : rightMissing ? "remove" : "change",
      rightKind: same ? "same" : rightMissing ? "empty" : leftMissing ? "add" : "change",
    });
  }

  return rows;
}

function buildLcsDiff(beforeLines: string[], afterLines: string[]): DiffRow[] {
  const leftLength = beforeLines.length;
  const rightLength = afterLines.length;
  const cells = Array.from({ length: leftLength + 1 }, () =>
    Array<number>(rightLength + 1).fill(0),
  );

  function getCell(left: number, right: number) {
    return cells[left]?.[right] ?? 0;
  }

  function setCell(left: number, right: number, value: number) {
    const row = cells[left];
    if (row) row[right] = value;
  }

  for (let left = leftLength - 1; left >= 0; left -= 1) {
    for (let right = rightLength - 1; right >= 0; right -= 1) {
      setCell(
        left,
        right,
        beforeLines[left] === afterLines[right]
          ? getCell(left + 1, right + 1) + 1
          : Math.max(getCell(left + 1, right), getCell(left, right + 1)),
      );
    }
  }

  const rows: DiffRow[] = [];
  let left = 0;
  let right = 0;

  while (left < leftLength || right < rightLength) {
    if (left < leftLength && right < rightLength && beforeLines[left] === afterLines[right]) {
      rows.push({
        leftLine: left,
        rightLine: right,
        leftKind: "same",
        rightKind: "same",
      });
      left += 1;
      right += 1;
      continue;
    }

    const removedStart = left;
    const addedStart = right;
    const removed: number[] = [];
    const added: number[] = [];

    while (
      left < leftLength &&
      (right >= rightLength || getCell(left + 1, right) >= getCell(left, right + 1))
    ) {
      removed.push(left);
      left += 1;
    }

    while (
      right < rightLength &&
      (left >= leftLength || getCell(left, right + 1) > getCell(left + 1, right))
    ) {
      added.push(right);
      right += 1;
    }

    const pairCount = Math.max(removed.length, added.length);

    for (let index = 0; index < pairCount; index += 1) {
      const hasRemoved = index < removed.length;
      const hasAdded = index < added.length;

      rows.push({
        leftLine: hasRemoved ? removedStart + index : null,
        rightLine: hasAdded ? addedStart + index : null,
        leftKind: hasRemoved ? (hasAdded ? "change" : "remove") : "empty",
        rightKind: hasAdded ? (hasRemoved ? "change" : "add") : "empty",
      });
    }
  }

  return rows;
}

function diffClass(kind: DiffKind) {
  if (kind === "add") return "border-l-2 border-emerald-500/70 bg-emerald-500/10";
  if (kind === "remove") return "border-l-2 border-red-500/70 bg-red-500/10";
  if (kind === "change") return "border-l-2 border-amber-500/70 bg-amber-500/10";
  return "";
}

const diffRows = computed(() => {
  const beforeLines = beforeText.value.split("\n");
  const afterLines = props.afterText.split("\n");
  const cellCount = beforeLines.length * afterLines.length;
  return cellCount > 48400
    ? buildSimpleDiff(beforeLines, afterLines)
    : buildLcsDiff(beforeLines, afterLines);
});

const diffStats = computed(() => {
  let add = 0;
  let update = 0;
  let remove = 0;

  for (const row of diffRows.value) {
    if (row.rightKind === "add") add += 1;
    if (row.leftKind === "remove") remove += 1;
    if (row.leftKind === "change" || row.rightKind === "change") update += 1;
  }

  return { add, update, remove };
});

const diffLineClasses = computed(() => {
  const before = new Map<number, string>();
  const after = new Map<number, string>();

  for (const row of diffRows.value) {
    if (row.leftLine !== null) before.set(row.leftLine, diffClass(row.leftKind));
    if (row.rightLine !== null) after.set(row.rightLine, diffClass(row.rightKind));
  }

  return {
    before: (lineIndex: number) => before.get(lineIndex) ?? "",
    after: (lineIndex: number) => after.get(lineIndex) ?? "",
  };
});

function focusSearch() {
  afterEditorRef.value?.filterInputRef?.focus();
  afterEditorRef.value?.filterInputRef?.select();
}

function focusEditor() {
  afterEditorRef.value?.textareaRef?.focus();
}

function collapseAll() {
  beforeEditorRef.value?.collapseAll();
  afterEditorRef.value?.collapseAll();
}

function expandAll() {
  beforeEditorRef.value?.expandAll();
  afterEditorRef.value?.expandAll();
}

defineExpose({
  focusSearch,
  focusEditor,
  collapseAll,
  expandAll,
});
</script>

<template>
  <div
    class="grid h-full min-h-0 grid-cols-2 overflow-hidden rounded-md border border-border/30 bg-surface-1"
  >
    <div class="flex min-h-0 min-w-0 flex-col border-r border-border/30">
      <div
        class="flex h-8 shrink-0 items-center justify-between border-b border-red-500/20 bg-red-500/[0.035] px-3 py-1.5 text-xs"
      >
        <span class="font-medium text-red-300/90">Before</span>
        <span class="font-mono text-[10px] text-muted-foreground/45">
          {{ beforeLineCount }} lines
        </span>
      </div>
      <div
        class="flex h-7 shrink-0 items-center gap-1 border-b border-border/20 bg-surface-2/50 px-2"
      >
        <span
          v-if="diffStats.remove"
          class="rounded border border-red-500/25 bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] text-red-400"
        >
          -{{ diffStats.remove }}
        </span>
        <span
          v-if="diffStats.update"
          class="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400"
        >
          ~{{ diffStats.update }}
        </span>
        <span
          v-if="!diffStats.remove && !diffStats.update"
          class="text-[10px] text-muted-foreground/35"
        >
          no changed lines
        </span>
      </div>
      <div class="min-h-0 flex-1 overflow-hidden">
        <JsonEditor
          ref="beforeEditorRef"
          :value="beforeText"
          readonly
          :line-class="diffLineClasses.before"
        />
      </div>
    </div>

    <div class="flex min-h-0 min-w-0 flex-col">
      <div
        class="flex h-8 shrink-0 items-center justify-between border-b border-emerald-500/20 bg-emerald-500/[0.035] px-3 py-1.5 text-xs"
      >
        <span class="font-medium text-emerald-300/90">After</span>
        <span class="font-mono text-[10px] text-muted-foreground/45">
          {{ afterLineCount }} lines
        </span>
      </div>
      <div
        class="flex h-7 shrink-0 items-center gap-1 border-b border-border/20 bg-surface-2/50 px-2"
      >
        <span
          v-if="diffStats.add"
          class="rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400"
        >
          +{{ diffStats.add }}
        </span>
        <span
          v-if="diffStats.update"
          class="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400"
        >
          ~{{ diffStats.update }}
        </span>
        <span
          v-if="!diffStats.add && !diffStats.update"
          class="text-[10px] text-muted-foreground/35"
        >
          no changed lines
        </span>
      </div>
      <div class="min-h-0 flex-1 overflow-hidden">
        <JsonEditor
          ref="afterEditorRef"
          :value="afterText"
          :readonly="readonly"
          :line-class="diffLineClasses.after"
          @update:value="emit('update:afterText', $event)"
          @validity-change="emit('validity-change', $event)"
        />
      </div>
    </div>
  </div>
</template>
