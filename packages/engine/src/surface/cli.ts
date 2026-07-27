#!/usr/bin/env node
/**
 * CLI-SurfacePort — the engine-internal developer/operator surface. This is the ONLY module in
 * @ff/engine where `process.exit` may appear (M0-spec §3.1 / ADR-0004 Consequences #3: exit lives
 * only in surface/cli, never in core/*).
 *
 * FROZEN verbs: validate · view · resolve · load · rebuild · write · bench.
 * EXTENSIBLE: flags/output format; an HTTP surface (not built at M0).
 */
import { readFileSync } from 'node:fs';
import { load } from '../core/loader.js';
import { validate } from '../core/envelope-validator.js';
import { FIXED_POLICY } from '../core/resolve.js';
import { compile, costTree } from '../core/view-compiler.js';
import { MemoryStore } from '../adapters/store-memory.js';
import { Engine } from '../engine.js';
import type { EnvelopeNode, ViewDef } from '../core/types.js';

function loadCorpus(path: string): EnvelopeNode[] {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as { nodes: EnvelopeNode[] };
  return raw.nodes;
}

/** Pure command runner (no exit). Returns an exit code; the CLI wrapper is the only thing that exits. */
export function runCli(argv: string[]): number {
  const [verb, ...rest] = argv;
  const flag = (name: string): string | undefined => {
    const i = rest.indexOf('--' + name);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  const corpusPath = flag('corpus');
  if (!verb) {
    process.stdout.write('usage: engine <validate|view|resolve|load|rebuild|write|bench> --corpus <nodes.json> [...]\n');
    return 1;
  }
  const nodes = corpusPath ? loadCorpus(corpusPath) : [];
  const graph = load(nodes);
  const store = new MemoryStore(nodes);
  const engine = new Engine(store, FIXED_POLICY);

  switch (verb) {
    case 'load':
      process.stdout.write(`loaded ${nodes.length} nodes\n`);
      return 0;
    case 'validate': {
      const problems = validate(graph);
      if (problems.length === 0) {
        process.stdout.write('OK — valid\n');
        return 0;
      }
      for (const p of problems) process.stdout.write('  - ' + p.message + '\n');
      return 1;
    }
    case 'resolve': {
      const key = flag('key') ?? 'read';
      const viewer = flag('viewer') ?? '';
      const node = graph.byId.get(flag('node') ?? '');
      if (!node) {
        process.stdout.write('node not found\n');
        return 1;
      }
      process.stdout.write(engine.resolve(key, viewer, node) + '\n');
      return 0;
    }
    case 'view': {
      const kind = (flag('kind') ?? 'visible-to') as ViewDef['kind'];
      const viewer = flag('viewer') ?? '';
      const def: ViewDef =
        kind === 'cost-tree'
          ? { kind, body: { from: flag('root') ?? '', traverse: [{ pred: 'delegates-to', depth: '*' }], cost_via: { field: 'body.tokens' } } }
          : kind === 'actions-by-agent'
            ? { kind, body: { from: { type: 'action' } } }
            : { kind: 'visible-to', body: { from: { type: '*' }, filter: [{ visible_to: '$viewer' }] } };
      process.stdout.write(JSON.stringify(engine.view(def, viewer)) + '\n');
      return 0;
    }
    case 'bench': {
      const root = flag('root') ?? '';
      const depth = Number(flag('depth') ?? '10000');
      const t = costTree(graph, root, { viewer: flag('viewer') ?? '', policy: FIXED_POLICY, maxDelegationDepth: depth });
      process.stdout.write(`cost-tree subtree=${t.subtree} (finite, no overflow)\n`);
      return 0;
    }
    case 'rebuild': {
      const from = (flag('from') ?? 'files') as 'journal' | 'files';
      engine.rebuild(from);
      process.stdout.write(`rebuilt from ${from}\n`);
      return 0;
    }
    case 'write': {
      process.stdout.write('write requires an act payload on stdin (not wired at M0 CLI)\n');
      return 1;
    }
    default:
      process.stdout.write(`unknown verb: ${verb}\n`);
      return 1;
  }
}

// Exit ONLY here (surface boundary). Guarded so importing this module never exits.
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runCli(process.argv.slice(2)));
}
