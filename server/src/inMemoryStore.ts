/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  THULIR — In-Memory Firestore-compatible Store (Fallback)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  When Firestore credentials are unavailable, this module provides an
 *  in-memory implementation that mirrors the Firestore API surface used
 *  throughout the app. Data lives only for the duration of the server process.
 *
 *  This allows the full demo (mock generator → telemetry → IEI engine →
 *  dashboard) to work end-to-end without any cloud credentials.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

type DocData = Record<string, any>;

class InMemoryDocRef {
  constructor(
    private store: Map<string, Map<string, DocData>>,
    private collectionName: string,
    public readonly id: string
  ) {}

  async get() {
    const col = this.store.get(this.collectionName);
    const data = col?.get(this.id);
    return {
      exists: !!data,
      id: this.id,
      data: () => (data ? { ...data } : undefined),
    };
  }

  async set(data: DocData) {
    if (!this.store.has(this.collectionName)) {
      this.store.set(this.collectionName, new Map());
    }
    this.store.get(this.collectionName)!.set(this.id, { ...data });
  }

  async delete() {
    const col = this.store.get(this.collectionName);
    if (col) col.delete(this.id);
  }
}

class InMemoryQuery {
  private _where: Array<{ field: string; op: string; value: any }> = [];
  private _orderBy: Array<{ field: string; dir: string }> = [];
  private _limit: number | null = null;

  constructor(
    private store: Map<string, Map<string, DocData>>,
    private collectionName: string
  ) {}

  where(field: string, op: string, value: any): InMemoryQuery {
    const q = this._clone();
    q._where.push({ field, op, value });
    return q;
  }

  orderBy(field: string, dir: string = 'asc'): InMemoryQuery {
    const q = this._clone();
    q._orderBy.push({ field, dir });
    return q;
  }

  limit(n: number): InMemoryQuery {
    const q = this._clone();
    q._limit = n;
    return q;
  }

  async get() {
    const col = this.store.get(this.collectionName) || new Map<string, DocData>();
    let docs = Array.from(col.entries()).map(([id, data]) => ({
      id,
      exists: true,
      data: () => ({ ...data }),
    }));

    // Apply where filters
    for (const w of this._where) {
      docs = docs.filter((d) => {
        const val = d.data()[w.field];
        switch (w.op) {
          case '==': return val === w.value;
          case '!=': return val !== w.value;
          case '>': return val > w.value;
          case '>=': return val >= w.value;
          case '<': return val < w.value;
          case '<=': return val <= w.value;
          default: return true;
        }
      });
    }

    // Apply orderBy
    for (const ob of this._orderBy) {
      docs.sort((a, b) => {
        const va = a.data()[ob.field];
        const vb = b.data()[ob.field];
        if (va < vb) return ob.dir === 'desc' ? 1 : -1;
        if (va > vb) return ob.dir === 'desc' ? -1 : 1;
        return 0;
      });
    }

    // Apply limit
    if (this._limit !== null) {
      docs = docs.slice(0, this._limit);
    }

    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
    };
  }

  private _clone(): InMemoryQuery {
    const q = new InMemoryQuery(this.store, this.collectionName);
    q._where = [...this._where];
    q._orderBy = [...this._orderBy];
    q._limit = this._limit;
    return q;
  }
}

class InMemoryCollectionRef extends InMemoryQuery {
  private _store: Map<string, Map<string, DocData>>;
  private _name: string;
  private _autoId = 0;

  constructor(store: Map<string, Map<string, DocData>>, name: string) {
    super(store, name);
    this._store = store;
    this._name = name;
  }

  doc(id: string): InMemoryDocRef {
    return new InMemoryDocRef(this._store, this._name, id);
  }

  async add(data: DocData) {
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const id = `auto_${this._name}_${Date.now()}_${randomSuffix}`;
    if (!this._store.has(this._name)) {
      this._store.set(this._name, new Map());
    }
    this._store.get(this._name)!.set(id, { ...data });
    return { id };
  }
}

class InMemoryBatch {
  private ops: Array<() => void> = [];

  set(ref: InMemoryDocRef, data: DocData) {
    this.ops.push(() => ref.set(data));
  }

  async commit() {
    for (const op of this.ops) {
      await op();
    }
  }
}

export class InMemoryFirestore {
  private store = new Map<string, Map<string, DocData>>();

  collection(name: string): InMemoryCollectionRef {
    return new InMemoryCollectionRef(this.store, name);
  }

  batch(): InMemoryBatch {
    return new InMemoryBatch();
  }
}
