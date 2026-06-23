import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { FFNode, NodeInput, NodeKind, Link } from './node';
import { newId, prefixFor } from './id';
import { frontmatterSchema, type Frontmatter } from './schema';

export interface QueryFilter {
  kind?: NodeKind | NodeKind[];
  tag?: string; // node has this tag
  parentId?: string | null; // null = roots (no parent)
  status?: FFNode['status'];
  importance?: FFNode['importance'];
}

const nowIso = (): string => new Date().toISOString();

/**
 * File-backed graph store. One node = one markdown file with YAML frontmatter,
 * under `<root>/nodes/<id>.md`. Human-readable and git-friendly by design — the
 * files ARE the graph (see the reframe: graph = memory, build on existing substrate).
 *
 * Personal scale (≪ 100k nodes): we load the directory for queries. No DB, no index,
 * no network. When that stops being enough, an index is added without changing the model.
 */
export class FileNodeStore {
  readonly root: string;
  private readonly nodesDir: string;

  constructor(root: string) {
    this.root = root;
    this.nodesDir = path.join(root, 'nodes');
  }

  private fileFor(id: string): string {
    return path.join(this.nodesDir, `${id}.md`);
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.nodesDir, { recursive: true });
  }

  private serialize(node: FFNode): string {
    const { body, ...front } = node;
    // Drop undefined keys so frontmatter stays clean.
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(front)) {
      if (v !== undefined) clean[k] = v;
    }
    return matter.stringify(body ?? '', clean);
  }

  private parse(raw: string): FFNode {
    const parsed = matter(raw);
    const front: Frontmatter = frontmatterSchema.parse(parsed.data);
    // gray-matter brackets the body with newlines; normalize so create→read is identity.
    const body = parsed.content.replace(/^\n+/, '').replace(/\n+$/, '');
    return { ...front, body };
  }

  async create(input: NodeInput): Promise<FFNode> {
    await this.ensureDir();
    const ts = nowIso();
    const id = input.id ?? newId(prefixFor(input.kind));
    const node: FFNode = {
      id,
      kind: input.kind,
      title: input.title,
      body: input.body ?? '',
      tags: input.tags ?? [],
      links: input.links ?? [],
      importance: input.importance ?? 'normal',
      parentId: input.parentId,
      status: input.status,
      due: input.due,
      context: input.context,
      actor: input.actor,
      meta: input.meta,
      created: ts,
      updated: ts,
    };
    // Validate before persisting.
    frontmatterSchema.parse({ ...node, body: undefined });
    await fs.writeFile(this.fileFor(id), this.serialize(node), 'utf8');
    return node;
  }

  async get(id: string): Promise<FFNode | null> {
    try {
      const raw = await fs.readFile(this.fileFor(id), 'utf8');
      return this.parse(raw);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  /** Get or throw — for call sites where absence is a bug. */
  async require(id: string): Promise<FFNode> {
    const node = await this.get(id);
    if (!node) throw new Error(`Node not found: ${id}`);
    return node;
  }

  async update(
    id: string,
    patch: Partial<Omit<FFNode, 'id' | 'created'>>,
  ): Promise<FFNode> {
    const current = await this.require(id);
    const next: FFNode = { ...current, ...patch, id: current.id, created: current.created, updated: nowIso() };
    frontmatterSchema.parse({ ...next, body: undefined });
    await fs.writeFile(this.fileFor(id), this.serialize(next), 'utf8');
    return next;
  }

  async delete(id: string): Promise<void> {
    try {
      await fs.unlink(this.fileFor(id));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  async list(): Promise<FFNode[]> {
    await this.ensureDir();
    const files = await fs.readdir(this.nodesDir);
    const nodes: FFNode[] = [];
    for (const f of files) {
      if (!f.endsWith('.md')) continue;
      const raw = await fs.readFile(path.join(this.nodesDir, f), 'utf8');
      nodes.push(this.parse(raw));
    }
    return nodes;
  }

  async query(filter: QueryFilter = {}): Promise<FFNode[]> {
    const all = await this.list();
    const kinds = filter.kind
      ? Array.isArray(filter.kind)
        ? filter.kind
        : [filter.kind]
      : null;
    return all.filter((n) => {
      if (kinds && !kinds.includes(n.kind)) return false;
      if (filter.tag && !n.tags.includes(filter.tag)) return false;
      if (filter.parentId === null && n.parentId) return false;
      if (typeof filter.parentId === 'string' && n.parentId !== filter.parentId) return false;
      if (filter.status && n.status !== filter.status) return false;
      if (filter.importance && n.importance !== filter.importance) return false;
      return true;
    });
  }

  /** Direct children (one level) by nesting. */
  async children(id: string): Promise<FFNode[]> {
    return this.query({ parentId: id });
  }

  /** Ancestor chain from root → ... → node's parent (node itself NOT included). */
  async ancestors(id: string): Promise<FFNode[]> {
    const chain: FFNode[] = [];
    let current = await this.get(id);
    const seen = new Set<string>([id]);
    while (current?.parentId) {
      if (seen.has(current.parentId)) break; // cycle guard
      seen.add(current.parentId);
      const parent = await this.get(current.parentId);
      if (!parent) break;
      chain.unshift(parent);
      current = parent;
    }
    return chain;
  }

  /** Add an outgoing link (idempotent on (to, rel)). */
  async link(fromId: string, to: string, rel: string): Promise<FFNode> {
    const node = await this.require(fromId);
    const exists = node.links.some((l) => l.to === to && l.rel === rel);
    const links: Link[] = exists ? node.links : [...node.links, { to, rel }];
    return this.update(fromId, { links });
  }
}
