const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

/** Natural-order string compare (so `page2` sorts before `page10`). */
export function naturalCompare(a: string, b: string): number {
  return collator.compare(a, b);
}
