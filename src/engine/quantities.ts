import type { Fact } from "./facts";

// Number value of an object
export type QuantityId = string;

// Fact used for solution
export type Premise =
    | { kind: "fact"; fact: Fact }
    | { kind: "quantity"; id: QuantityId };

export type QReason =
    | { kind: "given" }
    | { kind: "derived"; theorem: string; premises: Premise[] };

export interface Quantity {
    readonly id: QuantityId;
    readonly labelOf: () => string;
    value: number | null;
    reason: QReason | null;
}

export interface Assignment {
    readonly quantity: Quantity;
    readonly value: number;
    readonly reason: QReason;
}

export interface Conflict {
    readonly message: string;
}

const EPS = 0.000001;

export class QuantityStore {
    private byId: Map<QuantityId, Quantity> = new Map();
    readonly assignments: Assignment[] = [];
    readonly conflicts: Conflict[] = [];

    ensure(id: QuantityId, labelOf: () => string): Quantity {
        const existing = this.byId.get(id);
        if (existing !== undefined) return existing;
        const quantity: Quantity = { id, labelOf, value: null, reason: null };
        this.byId.set(id, quantity);
        return quantity;
    }

    get(id: QuantityId): Quantity | undefined {
        return this.byId.get(id);
    }

    value(id: QuantityId): number | null {
        return this.byId.get(id)?.value ?? null;
    }

    label(id: QuantityId): string {
        return this.byId.get(id)?.labelOf() ?? id;
    }

    // Returns true if a new value was recorded
    assign(id: QuantityId, value: number, reason: QReason): boolean {
        const quantity = this.byId.get(id);
        if (quantity === undefined) {
            throw new Error(`Unknown quantity "${id}". Create it via ensure first.`);
        }
        if (quantity.value !== null) {
            if (Math.abs(quantity.value - value) > EPS) {
                const via = reason.kind === "derived" ? ` (via ${reason.theorem})` : "";
                const label = quantity.labelOf();
                this.conflict(`${label} = ${quantity.value}, but also ${label} = ${value}${via}`);
            }
            return false;
        }
        quantity.value = value;
        quantity.reason = reason;
        this.assignments.push({ quantity, value, reason });
        return true;
    }

    conflict(message: string): void {
        if (this.conflicts.some(c => c.message === message)) return;
        this.conflicts.push({ message });
    }
    
}
