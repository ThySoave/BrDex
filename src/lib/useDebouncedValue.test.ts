import { act, renderHook } from "@testing-library/react-native";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("retorna o valor inicial imediatamente", () => {
    const { result } = renderHook(() => useDebouncedValue("pikachu", 300));

    expect(result.current).toBe("pikachu");
  });

  it("mantém o valor antigo antes do atraso e aplica o novo depois", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "pika" }
    });

    rerender({ value: "pikachu" });
    expect(result.current).toBe("pika");

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe("pikachu");
  });

  it("reinicia o atraso a cada mudança e só aplica a última", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: "p" }
    });

    rerender({ value: "pi" });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    rerender({ value: "pik" });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe("p");

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe("pik");
  });
});
