import { describe, test, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { useTimelineClock } from "../useTimelineClock";

// useTimelineClock uses onUnmounted which requires a Vue instance.
// We mock it so we can test the pure clock logic in isolation.
vi.mock("vue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue")>();
  return { ...actual, onUnmounted: vi.fn() };
});

describe("useTimelineClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test("initial state is paused at position 0", () => {
    const clock = useTimelineClock(5000);
    expect(clock.positionMs.value).toBe(0);
    expect(clock.isPlaying.value).toBe(false);
    expect(clock.progress.value).toBe(0);
  });

  test("seek clamps to [0, duration]", () => {
    const clock = useTimelineClock(5000);
    clock.seek(3000);
    expect(clock.positionMs.value).toBe(3000);

    clock.seek(-100);
    expect(clock.positionMs.value).toBe(0);

    clock.seek(99999);
    expect(clock.positionMs.value).toBe(5000);
  });

  test("setDuration updates duration and clamps position", () => {
    const clock = useTimelineClock(10_000);
    clock.seek(8000);
    clock.setDuration(5000);
    expect(clock.durationMs.value).toBe(5000);
    expect(clock.positionMs.value).toBe(5000);
  });

  test("progress is 0 when duration is 0", () => {
    const clock = useTimelineClock(0);
    expect(clock.progress.value).toBe(0);
  });

  test("play sets isPlaying true", () => {
    const clock = useTimelineClock(5000);
    clock.play();
    expect(clock.isPlaying.value).toBe(true);
    clock.pause();
  });

  test("pause stops playback and sets isPlaying false", () => {
    const clock = useTimelineClock(5000);
    clock.play();
    clock.pause();
    expect(clock.isPlaying.value).toBe(false);
  });

  test("play from end resets position to 0", () => {
    const clock = useTimelineClock(5000);
    clock.seek(5000);
    clock.play();
    expect(clock.positionMs.value).toBe(0);
    clock.pause();
  });

  test("progress reflects seek position", () => {
    const clock = useTimelineClock(10_000);
    clock.seek(5000);
    expect(clock.progress.value).toBeCloseTo(0.5);
  });
});
