/**
 * envelope-validator — ported from run-view.validate().
 *
 * Checks: 10-field envelope · no stray top-level (domain) fields · edge targets exist ·
 * every predicate declared as a meta:pred pair · every node type declared as a meta:type ·
 * every domain type carries an `example` edge (DEC-13).
 *
 * Fail-closed is enforced BY BEHAVIOUR (not exit code): `RefusalError` + `assertValid()` let
 * callers (the view-compiler) REFUSE to compute a lens over an invalid graph before doing any work.
 */
import { ENVELOPE_FIELDS, type Graph, type Problem } from './types.js';

/** Thrown when the engine refuses to operate on an invalid graph (fail-closed, refuse-before-compute). */
export class RefusalError extends Error {
  readonly problems: Problem[];
  constructor(problems: Problem[]) {
    super(`engine refused: graph invalid (${problems.length} problem(s)): ${problems[0]?.message ?? ''}`);
    this.name = 'RefusalError';
    this.problems = problems;
  }
}

/** The meta-layer fixpoint types describe themselves; envelope is a one-off descriptor. */
const META_LAYER_TYPES = new Set(['type', 'predicate', 'envelope']);

export function validate(graph: Graph): Problem[] {
  const problems: Problem[] = [];
  const push = (message: string) => problems.push({ message });
  const nodes = graph.nodes;
  const byId = graph.byId;

  const declaredTypes = new Set(
    nodes.filter((n) => n.type === 'type').map((n) => n.body?.name as string | undefined),
  );
  const declaredPreds = new Set(
    nodes.filter((n) => n.type === 'predicate').map((n) => n.body?.name as string | undefined),
  );
  const typeHasExample = new Map<string | undefined, boolean>(
    nodes
      .filter((n) => n.type === 'type')
      .map((n) => [
        n.body?.name as string | undefined,
        (n.edges ?? []).some((e) => e.predicate === 'example'),
      ]),
  );

  for (const n of nodes) {
    // envelope (B1): all system fields present
    for (const f of ENVELOPE_FIELDS) {
      if (!(f in n)) push(`конверт: ${n.id} без поля '${f}'`);
    }
    // domain fields only in body — no stray top-level keys
    for (const k of Object.keys(n)) {
      if (!(ENVELOPE_FIELDS as readonly string[]).includes(k)) {
        push(`конверт: ${n.id} лишнее верхнеуровневое поле '${k}'`);
      }
    }
    // edges: target exists + predicate declared as a meta:pred pair
    for (const e of n.edges ?? []) {
      if (!byId.has(e.target)) {
        push(`ребро: ${n.id} --${e.predicate}--> ${e.target} (цель не существует)`);
      }
      if (!declaredPreds.has(e.predicate)) {
        push(`ребро: предикат '${e.predicate}' (у ${n.id}) не объявлен в meta:pred`);
      }
    }
    // node type declared as a meta:type (except the fixpoint meta layer)
    if (!declaredTypes.has(n.type) && !META_LAYER_TYPES.has(n.type)) {
      push(`тип: '${n.type}' (у ${n.id}) не объявлен узлом meta:type`);
    }
  }
  // every domain type has a live example (DEC-13)
  for (const [t, has] of typeHasExample) {
    if (!has && t !== undefined && !META_LAYER_TYPES.has(t)) {
      push(`meta: тип '${t}' без ребра example (недоказанный тип)`);
    }
  }

  return problems;
}

/** Fail-closed guard: refuse (throw) before any downstream computation if the graph is invalid. */
export function assertValid(graph: Graph): void {
  const problems = validate(graph);
  if (problems.length > 0) throw new RefusalError(problems);
}
