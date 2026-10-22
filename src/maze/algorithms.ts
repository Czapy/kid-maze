import type { AlgorithmId, Maze } from "./types";
import { pick, randInt, shuffle, type Rng } from "./rng";

/** Lookup: for each node, list of [neighborId, edgeId]. */
type Adjacency = Array<Array<[number, number]>>;

function buildAdjacency(maze: Maze): Adjacency {
    const adj: Adjacency = maze.nodes.map(() => []);
    for (const e of maze.edges) {
        adj[e.a].push([e.b, e.id]);
        adj[e.b].push([e.a, e.id]);
    }
    return adj;
}

interface Options {
    /** 0..1: higher = prefer continuing in the same direction (longer corridors). */
    twistiness: number;
}

type Carver = (maze: Maze, adj: Adjacency, rng: Rng, opts: Options) => void;

/** Pick a deterministic starting node (first node) - any node works. */
function startNode(maze: Maze, rng: Rng): number {
    return randInt(rng, maze.nodes.length);
}

const backtracker: Carver = (maze, adj, rng, opts) => {
    const visited = new Uint8Array(maze.nodes.length);
    const s = startNode(maze, rng);
    const stack = [s];
    visited[s] = 1;
    while (stack.length) {
        const cur = stack[stack.length - 1];
        const options = adj[cur].filter(([n]) => !visited[n]);
        if (!options.length) {
            stack.pop();
            continue;
        }
        // `twistiness` low => bias toward whichever neighbor is straightest from the previous move.
        let chosen = pick(rng, options);
        if (stack.length > 1 && rng() > opts.twistiness) {
            const prev = maze.nodes[stack[stack.length - 2]].center;
            const c = maze.nodes[cur].center;
            const dx = c.x - prev.x;
            const dy = c.y - prev.y;
            let best = -Infinity;
            for (const o of options) {
                const p = maze.nodes[o[0]].center;
                const score = (p.x - c.x) * dx + (p.y - c.y) * dy;
                if (score > best) {
                    best = score;
                    chosen = o;
                }
            }
        }
        maze.open.add(chosen[1]);
        visited[chosen[0]] = 1;
        stack.push(chosen[0]);
    }
};

const prim: Carver = (maze, adj, rng) => {
    const inMaze = new Uint8Array(maze.nodes.length);
    const frontier: Array<[number, number, number]> = []; // [from, to, edge]
    const add = (n: number) => {
        inMaze[n] = 1;
        for (const [m, e] of adj[n]) if (!inMaze[m]) frontier.push([n, m, e]);
    };
    add(startNode(maze, rng));
    while (frontier.length) {
        const i = randInt(rng, frontier.length);
        const [, to, e] = frontier[i];
        frontier[i] = frontier[frontier.length - 1];
        frontier.pop();
        if (inMaze[to]) continue;
        maze.open.add(e);
        add(to);
    }
};

const kruskal: Carver = (maze, _adj, rng) => {
    const parent = maze.nodes.map((_, i) => i);
    const find = (x: number): number => {
        while (parent[x] !== x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    };
    const order = shuffle(
        rng,
        maze.edges.map((e) => e.id),
    );
    for (const id of order) {
        const e = maze.edges[id];
        const ra = find(e.a);
        const rb = find(e.b);
        if (ra !== rb) {
            parent[ra] = rb;
            maze.open.add(id);
        }
    }
};

const wilson: Carver = (maze, adj, rng) => {
    const n = maze.nodes.length;
    const inTree = new Uint8Array(n);
    inTree[startNode(maze, rng)] = 1;
    const next = new Int32Array(n).fill(-1);
    const nextEdge = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
        if (inTree[i]) continue;
        let u = i;
        while (!inTree[u]) {
            const [v, e] = pick(rng, adj[u]);
            next[u] = v;
            nextEdge[u] = e;
            u = v;
        }
        u = i;
        while (!inTree[u]) {
            inTree[u] = 1;
            maze.open.add(nextEdge[u]);
            u = next[u];
        }
    }
};

const aldousBroder: Carver = (maze, adj, rng) => {
    const n = maze.nodes.length;
    const visited = new Uint8Array(n);
    let cur = startNode(maze, rng);
    visited[cur] = 1;
    let remaining = n - 1;
    while (remaining > 0) {
        const [nb, e] = pick(rng, adj[cur]);
        if (!visited[nb]) {
            visited[nb] = 1;
            maze.open.add(e);
            remaining--;
        }
        cur = nb;
    }
};

const growingTree: Carver = (maze, adj, rng, opts) => {
    const visited = new Uint8Array(maze.nodes.length);
    const s = startNode(maze, rng);
    visited[s] = 1;
    const active = [s];
    while (active.length) {
        // twistiness 0 => always newest (backtracker), 1 => always random (Prim-like)
        const idx =
            rng() < opts.twistiness
                ? randInt(rng, active.length)
                : active.length - 1;
        const cur = active[idx];
        const options = adj[cur].filter(([nb]) => !visited[nb]);
        if (!options.length) {
            active.splice(idx, 1);
            continue;
        }
        const [nb, e] = pick(rng, options);
        visited[nb] = 1;
        maze.open.add(e);
        active.push(nb);
    }
};

const huntAndKill: Carver = (maze, adj, rng) => {
    const n = maze.nodes.length;
    const visited = new Uint8Array(n);
    let cur = startNode(maze, rng);
    visited[cur] = 1;
    let scanFrom = 0;
    for (;;) {
        const options = adj[cur].filter(([nb]) => !visited[nb]);
        if (options.length) {
            const [nb, e] = pick(rng, options);
            maze.open.add(e);
            visited[nb] = 1;
            cur = nb;
            continue;
        }
        // Hunt: find an unvisited cell adjacent to a visited one.
        let found = false;
        for (let i = scanFrom; i < n; i++) {
            if (visited[i]) continue;
            const vis = adj[i].filter(([nb]) => visited[nb]);
            if (vis.length) {
                const [, e] = pick(rng, vis);
                maze.open.add(e);
                visited[i] = 1;
                cur = i;
                found = true;
                break;
            }
        }
        if (!found) break;
        // Advance scanFrom past leading visited cells to keep hunting cheap.
        while (scanFrom < n && visited[scanFrom]) scanFrom++;
    }
};

const CARVERS: Record<AlgorithmId, Carver> = {
    backtracker,
    prim,
    kruskal,
    wilson,
    aldousBroder,
    growingTree,
    huntAndKill,
};

function isConnected(adj: Adjacency): boolean {
    if (!adj.length) return true;
    const seen = new Uint8Array(adj.length);
    const stack = [0];
    seen[0] = 1;
    let count = 0;
    while (stack.length) {
        const u = stack.pop()!;
        count++;
        for (const [v] of adj[u]) {
            if (!seen[v]) {
                seen[v] = 1;
                stack.push(v);
            }
        }
    }
    return count === adj.length;
}

/** Carve a perfect maze (spanning tree) into `maze.open`. */
export function carve(
    maze: Maze,
    algorithm: AlgorithmId,
    rng: Rng,
    twistiness: number,
): void {
    maze.open.clear();
    const adj = buildAdjacency(maze);
    // Random-walk algorithms (Wilson, Aldous-Broder) never terminate on a disconnected graph.
    if (!isConnected(adj)) throw new Error("Maze geometry is not connected");
    CARVERS[algorithm](maze, adj, rng, { twistiness });
}

/**
 * Remove dead ends by opening an extra wall, creating loops.
 * `amount` is the fraction (0..1) of dead ends to remove.
 */
export function braid(maze: Maze, amount: number, rng: Rng): void {
    if (amount <= 0) return;
    const adj = buildAdjacency(maze);
    const degree = (n: number) =>
        adj[n].filter(([, e]) => maze.open.has(e)).length;
    const deadEnds = shuffle(
        rng,
        maze.nodes.map((n) => n.id).filter((id) => degree(id) === 1),
    );
    for (const id of deadEnds) {
        if (degree(id) !== 1) continue;
        if (rng() > amount) continue;
        const closed = adj[id].filter(([, e]) => !maze.open.has(e));
        if (!closed.length) continue;
        // Prefer linking to another dead end so a single removal fixes two.
        const deadNeighbors = closed.filter(([nb]) => degree(nb) === 1);
        const [, e] = pick(rng, deadNeighbors.length ? deadNeighbors : closed);
        maze.open.add(e);
    }
}
