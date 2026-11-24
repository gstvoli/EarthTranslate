export type ShortcutEvent = {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
};

export function shortcutFromEvent(event: ShortcutEvent): string {
  const key = event.key === " " ? "Space" : event.key.length === 1 ? event.key.toUpperCase() : event.key;
  const parts = [
    event.ctrlKey && "Ctrl",
    event.altKey && "Alt",
    event.shiftKey && "Shift",
    event.metaKey && "Meta",
    !["Control", "Alt", "Shift", "Meta"].includes(event.key) && key,
  ].filter(Boolean);
  return parts.join("+");
}

export function matchesShortcut(event: ShortcutEvent, shortcut: string): boolean {
  return shortcutFromEvent(event).toLowerCase() === shortcut.toLowerCase();
}

export function validateShortcutConfiguration(shortcuts: string[]): string | null {
  if (shortcuts.some((shortcut) => !shortcut.trim())) {
    return "Todos os atalhos precisam ter uma combinação.";
  }

  if (new Set(shortcuts.map((shortcut) => shortcut.toLowerCase())).size !== shortcuts.length) {
    return "Use combinações diferentes para cada atalho.";
  }

  if (!shortcuts[0].includes("+")) {
    return "O atalho global precisa conter Ctrl, Alt, Shift ou Meta.";
  }

  return null;
}
