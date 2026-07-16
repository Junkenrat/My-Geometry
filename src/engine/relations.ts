import type { Premise, QuantityId, QReason, QuantityStore } from "./quantities";

export interface RelationReason {
    readonly theorem: string;
    readonly premises: Premise[];
}

export type Relation =
    // a = b
    | { kind: "equal"; a: QuantityId; b: QuantityId; reason: RelationReason }
    // parts[0] + parts[1] + ... = total (another quantity, or a constant like 180)
    | { kind: "sum"; parts: QuantityId[]; total: QuantityId | number; reason: RelationReason }
    // legs[0]² + legs[1]² = hyp²
    | { kind: "pythagoras"; legs: [QuantityId, QuantityId]; hyp: QuantityId; reason: RelationReason }
    // a = value · b
    | { kind: "ratio"; a: QuantityId; b: QuantityId; value: number; reason: RelationReason };

export function relationKey(rel: Relation): string {
    if (rel.kind === "equal") return `equal:${[rel.a, rel.b].sort().join("|")}`;
    if (rel.kind === "sum") return `sum:${[...rel.parts].sort().join("+")}=${rel.total}`;
    if (rel.kind === "ratio") return `ratio:${rel.a}=${rel.value}*${rel.b}`;
    return `pyth:${[...rel.legs].sort().join("+")}=${rel.hyp}`;
}

const EPS = 0.000001;


export function propagate(store: QuantityStore, relations: Iterable<Relation>): void {
    const all = Array.from(relations);
    let changed = true;
    while (changed) {
        changed = false;
        for (const rel of all) {
            if (trySolveRelation(store, rel)) changed = true;
        }
    }
}

function derivedReason(rel: Relation, usedIds: QuantityId[]): QReason {
    return {
        kind: "derived",
        theorem: rel.reason.theorem,
        premises: [
            ...rel.reason.premises,
            ...usedIds.map(id => ({ kind: "quantity" as const, id })),
        ],
    };
}

function trySolveRelation(store: QuantityStore, rel: Relation): boolean {
    if (rel.kind === "equal") return trySolveEqual(store, rel);
    if (rel.kind === "sum") return trySolveSum(store, rel);
    if (rel.kind === "ratio") return trySolveRatio(store, rel);
    return trySolvePythagoras(store, rel);
}

function trySolveEqual(store: QuantityStore, rel: Relation & { kind: "equal" }): boolean {
    const va = store.value(rel.a);
    const vb = store.value(rel.b);
    if (va !== null && vb === null) {
        return store.assign(rel.b, va, derivedReason(rel, [rel.a]));
    }
    if (vb !== null && va === null) {
        return store.assign(rel.a, vb, derivedReason(rel, [rel.b]));
    }
    if (va !== null && vb !== null && Math.abs(va - vb) > EPS) {
        store.conflict(`${store.label(rel.a)} = ${va} and ${store.label(rel.b)} = ${vb}, `
            + `but they must be equal (${rel.reason.theorem})`);
    }
    return false;
}

// a = value · b; lengths are positive, so value must be positive too —
// the input layer is expected to reject value <= 0 before it gets here.
function trySolveRatio(store: QuantityStore, rel: Relation & { kind: "ratio" }): boolean {
    if (rel.value <= 0) return false;
    const va = store.value(rel.a);
    const vb = store.value(rel.b);
    if (va !== null && vb === null) {
        return store.assign(rel.b, va / rel.value, derivedReason(rel, [rel.a]));
    }
    if (vb !== null && va === null) {
        return store.assign(rel.a, vb * rel.value, derivedReason(rel, [rel.b]));
    }
    if (va !== null && vb !== null && Math.abs(va - rel.value * vb) > EPS) {
        store.conflict(`${store.label(rel.a)} = ${va} and ${store.label(rel.b)} = ${vb}, `
            + `but ${store.label(rel.a)} / ${store.label(rel.b)} must be ${rel.value} (${rel.reason.theorem})`);
    }
    return false;
}

function trySolveSum(store: QuantityStore, rel: Relation & { kind: "sum" }): boolean {
    const totalValue = typeof rel.total === "number" ? rel.total : store.value(rel.total);
    const unknownParts = rel.parts.filter(id => store.value(id) === null);
    const knownSum = rel.parts.reduce((acc, id) => acc + (store.value(id) ?? 0), 0);

    if (unknownParts.length === 0) {
        if (totalValue === null && typeof rel.total === "string") {
            return store.assign(rel.total, knownSum, derivedReason(rel, rel.parts));
        }
        if (totalValue !== null && Math.abs(knownSum - totalValue) > EPS) {
            const partLabels = rel.parts.map(id => store.label(id)).join(" + ");
            const totalLabel = typeof rel.total === "number" ? `${rel.total}` : store.label(rel.total);
            store.conflict(`${partLabels} = ${knownSum} ≠ ${totalLabel}`
                + (typeof rel.total === "number" ? "" : ` = ${totalValue}`));
        }
        return false;
    }

    if (unknownParts.length === 1 && totalValue !== null) {
        const target = unknownParts[0];
        if (target === undefined) return false;
        const missing = totalValue - knownSum;
        if (missing < -EPS) {
            store.conflict(`${store.label(target)} would be negative (${rel.reason.theorem})`);
            return false;
        }
        const usedParts = rel.parts.filter(id => id !== target);
        const usedIds = typeof rel.total === "string" ? [...usedParts, rel.total] : usedParts;
        return store.assign(target, Math.max(0, missing), derivedReason(rel, usedIds));
    }
    return false;
}

function trySolvePythagoras(store: QuantityStore, rel: Relation & { kind: "pythagoras" }): boolean {
    const [leg1, leg2] = rel.legs;
    const v1 = store.value(leg1);
    const v2 = store.value(leg2);
    const vh = store.value(rel.hyp);

    if (v1 !== null && v2 !== null && vh === null) {
        return store.assign(rel.hyp, Math.hypot(v1, v2), derivedReason(rel, [leg1, leg2]));
    }
    if (v1 !== null && vh !== null && v2 === null) {
        return solveLeg(store, rel, leg2, vh, leg1, v1);
    }
    if (v2 !== null && vh !== null && v1 === null) {
        return solveLeg(store, rel, leg1, vh, leg2, v2);
    }
    if (v1 !== null && v2 !== null && vh !== null && Math.abs(v1 * v1 + v2 * v2 - vh * vh) > EPS) {
        store.conflict(`${store.label(leg1)}² + ${store.label(leg2)}² ≠ ${store.label(rel.hyp)}² `
            + `(${v1}² + ${v2}² ≠ ${vh}²)`);
    }
    return false;
}

function solveLeg(
    store: QuantityStore,
    rel: Relation & { kind: "pythagoras" },
    target: QuantityId,
    hypValue: number,
    knownLeg: QuantityId,
    knownLegValue: number,
): boolean {
    const sq = hypValue * hypValue - knownLegValue * knownLegValue;
    if (sq < -EPS) {
        store.conflict(`Hypotenuse ${store.label(rel.hyp)} = ${hypValue} is shorter than `
            + `leg ${store.label(knownLeg)} = ${knownLegValue}`);
        return false;
    }
    return store.assign(target, Math.sqrt(Math.max(0, sq)), derivedReason(rel, [rel.hyp, knownLeg]));
}
