import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Button, StatusPill, type StatusPillTone } from '../forge-ui/index.js';
import { Icon } from '../Icon.js';
import { OverlayShell } from '../overlays/OverlayShell.js';

export interface CommandPaletteCommand {
  id: string;
  label: string;
  description: string;
  group: string;
  run: () => void;
  shortcut?: string;
  disabled?: boolean;
  disabledReason?: string;
  tone?: StatusPillTone;
}

interface CommandPaletteProps {
  commands: CommandPaletteCommand[];
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ commands, open, onClose }: CommandPaletteProps) {
  if (!open) {
    return null;
  }
  return (
    <OverlayShell
      eyebrow="Command"
      title="Command Palette"
      subtitle="Search app actions, focused layouts, transfer flows, and workspace navigation."
      dirty={false}
      onClose={onClose}
      footer={(requestClose) => (
        <Button variant="secondary" compact onClick={requestClose}>
          Close
        </Button>
      )}
    >
      <CommandPaletteBody commands={commands} onRunCommand={onClose} />
    </OverlayShell>
  );
}

function CommandPaletteBody({ commands, onRunCommand }: { commands: CommandPaletteCommand[]; onRunCommand: () => void }) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredCommands = useMemo(() => {
    const needle = normalizeCommandText(query);
    if (!needle) {
      return commands;
    }
    return commands.filter((command) =>
      normalizeCommandText(`${command.label} ${command.description} ${command.group} ${command.shortcut ?? ''}`).includes(needle)
    );
  }, [commands, query]);

  const groupedCommands = useMemo(() => {
    const groups: Array<{ group: string; commands: CommandPaletteCommand[] }> = [];
    for (const command of filteredCommands) {
      const lastGroup = groups.at(-1);
      if (lastGroup?.group === command.group) {
        lastGroup.commands.push(command);
      } else {
        groups.push({ group: command.group, commands: [command] });
      }
    }
    return groups;
  }, [filteredCommands]);

  useEffect(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    setActiveIndex((index) => clampIndex(index, filteredCommands.length));
  }, [filteredCommands.length]);

  const runCommand = (command: CommandPaletteCommand) => {
    if (command.disabled) {
      return;
    }
    onRunCommand();
    window.setTimeout(command.run, 0);
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => clampIndex(index + 1, filteredCommands.length));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => clampIndex(index - 1, filteredCommands.length));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const command = filteredCommands[activeIndex];
      if (command) {
        runCommand(command);
      }
    }
  };

  const activeCommand = filteredCommands[activeIndex];

  return (
    <section className="command-palette" aria-label="Command palette">
      <label className="command-palette-search">
        <Icon name="search" />
        <span className="sr-only">Search commands</span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Search commands..."
          aria-controls={listId}
          aria-activedescendant={activeCommand ? commandOptionId(listId, activeCommand.id) : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleSearchKeyDown}
        />
        <kbd>⌘K</kbd>
      </label>

      <div id={listId} className="command-palette-list" role="listbox" aria-label="Available commands">
        {groupedCommands.length ? groupedCommands.map((group) => (
          <div key={group.group} className="command-palette-group">
            <div className="command-palette-group-label">{group.group}</div>
            {group.commands.map((command) => {
              const index = filteredCommands.findIndex((candidate) => candidate.id === command.id);
              const selected = index === activeIndex;
              return (
                <button
                  key={command.id}
                  id={commandOptionId(listId, command.id)}
                  type="button"
                  className={`command-palette-row ${selected ? 'active' : ''}`}
                  role="option"
                  aria-selected={selected}
                  disabled={command.disabled}
                  title={command.disabled ? command.disabledReason : command.description}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => runCommand(command)}
                >
                  <span className="command-palette-row-copy">
                    <strong>{command.label}</strong>
                    <span>{command.disabled ? command.disabledReason ?? command.description : command.description}</span>
                  </span>
                  <span className="command-palette-row-meta">
                    {command.shortcut ? <kbd>{command.shortcut}</kbd> : null}
                    {command.tone ? <StatusPill tone={command.tone}>{command.tone}</StatusPill> : null}
                  </span>
                </button>
              );
            })}
          </div>
        )) : (
          <div className="command-palette-empty" role="status">
            <strong>No commands found</strong>
            <span>Try a workspace, create, export, health, or focused layout command.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function normalizeCommandText(value: string): string {
  return value.trim().toLowerCase();
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(index, length - 1));
}

function commandOptionId(listId: string, commandId: string): string {
  return `${listId}-${commandId}`;
}
