/** Stable, sortable-ish, human-glanceable ids: `<prefix>_<base36 time><random>`. */
export function newId(prefix = 'n'): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${t}${r}`;
}

/** A short prefix per kind so ids are readable in filenames and links. */
export function prefixFor(kind: string): string {
  switch (kind) {
    case 'task':
      return 't';
    case 'note':
      return 'note';
    case 'thought':
      return 'thx';
    case 'group':
      return 'grp';
    case 'chat':
      return 'chat';
    case 'agent':
      return 'agt';
    case 'message':
      return 'msg';
    case 'trace':
      return 'trc';
    case 'summary':
      return 'sum';
    default:
      return 'n';
  }
}
