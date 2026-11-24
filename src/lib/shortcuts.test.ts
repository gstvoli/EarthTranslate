import { describe, expect, it } from "vitest";
import {
  matchesShortcut,
  shortcutFromEvent,
  validateShortcutConfiguration,
} from "./shortcuts";

describe("shortcutFromEvent", () => {
  it("normaliza modificadores e teclas alfabéticas", () => {
    expect(
      shortcutFromEvent({
        key: "t",
        ctrlKey: true,
        altKey: true,
        shiftKey: false,
        metaKey: false,
      }),
    ).toBe("Ctrl+Alt+T");
  });

  it("não inclui modificadores isolados como teclas", () => {
    expect(
      shortcutFromEvent({
        key: "Control",
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      }),
    ).toBe("Ctrl");
  });
});

describe("matchesShortcut", () => {
  it("compara atalhos sem considerar maiúsculas e minúsculas", () => {
    expect(
      matchesShortcut(
        { key: "enter", ctrlKey: true, altKey: false, shiftKey: false, metaKey: false },
        "Ctrl+Enter",
      ),
    ).toBe(true);
  });
});

describe("validateShortcutConfiguration", () => {
  const valid = ["Ctrl+Alt+T", "Ctrl+Alt+Q", "Ctrl+Enter", "Ctrl+Shift+C", "Escape"];

  it("aceita uma configuração válida", () => {
    expect(validateShortcutConfiguration(valid)).toBeNull();
  });

  it("rejeita atalhos duplicados", () => {
    expect(validateShortcutConfiguration(["Ctrl+Alt+T", "Ctrl+Alt+T", "Ctrl+C", "Ctrl+Shift+C", "Escape"])).toBe(
      "Use combinações diferentes para cada atalho.",
    );
  });

  it("rejeita um atalho global sem modificador", () => {
    expect(validateShortcutConfiguration(["T", "Ctrl+Alt+Q", "Ctrl+Enter", "Ctrl+C", "Escape"])).toBe(
      "O atalho global precisa conter Ctrl, Alt, Shift ou Meta.",
    );
  });

  it("rejeita um atalho rápido sem modificador", () => {
    expect(validateShortcutConfiguration(["Ctrl+Alt+T", "Q", "Ctrl+Enter", "Ctrl+C", "Escape"])).toBe(
      "O atalho rápido precisa conter Ctrl, Alt, Shift ou Meta.",
    );
  });
});
