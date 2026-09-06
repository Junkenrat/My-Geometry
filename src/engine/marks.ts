import type { Problem } from "./problem";
import type { Angle, Segment } from "./types";
import { formatNumber } from "./format";

const EPS = 0.000001;
const STRAIGHT = 180;
const RIGHT = 90;

export interface Mark {
    // Номер класса среди классов своего происхождения. Какой это будет штрих,
    // решает холст — здесь только нумерация.
    index: number;
    // Равенство вывел движок, а не задал пользователь.
    derived: boolean;
}

// Разбиение на классы равных величин. Равные объекты принято помечать
// одинаковым значком, поэтому нужен не сам факт равенства, а именно классы:
// все объекты одного класса получат одну пометку.
//
// Отрезки и углы устроены одинаково — различаются только тем, какой величиной
// измеряются, — поэтому обе задачи решает один проход.
function equalClasses<T>(problem: Problem, items: T[], idOf: (item: T) => string): Map<T, Mark> {
    const ids = new Map<T, string>();
    for (const item of items) ids.set(item, idOf(item));

    // Система непересекающихся множеств по величинам-длинам.
    const parent = new Map<string, string>();
    // Класс собран только из пользовательских равенств. Достаточно одного
    // выведенного шага, чтобы весь класс считался выводом движка: цепочка
    // равенств не крепче своего слабого звена.
    const purelyGiven = new Map<string, boolean>();

    function find(id: string): string {
        const up = parent.get(id);
        if (up === undefined || up === id) return id;
        const root = find(up);
        parent.set(id, root);
        return root;
    }
    function union(a: string, b: string, given: boolean): void {
        const rootA = find(a), rootB = find(b);
        const pure = (purelyGiven.get(rootA) ?? true)
            && (purelyGiven.get(rootB) ?? true) && given;
        if (rootA !== rootB) parent.set(rootA, rootB);
        // Флаг кладём на новый корень: старый больше не корень и не читается.
        purelyGiven.set(find(a), pure);
    }

    // Равенства, заданные условием или выведенные теоремами. Отношения для
    // отрезков и для углов лежат вперемешку, но чужие сюда не просочатся:
    // группируются только те объекты, что пришли в items.
    for (const relation of problem.relations.values()) {
        if (relation.kind !== "equal") continue;
        union(relation.a, relation.b, relation.reason.theorem === "given");
    }

    // Совпавшие числа: равенство ровно такое же, просто записано не
    // отношением, а двумя значениями (AB = 3 и CD = 3). Пользовательским оно
    // считается, только если оба числа задал пользователь.
    const measured: { id: string; value: number; given: boolean }[] = [];
    for (const item of items) {
        const id = ids.get(item)!;
        const quantity = problem.quantities.get(id);
        if (quantity === undefined || quantity.value === null) continue;
        measured.push({
            id,
            value: quantity.value,
            given: quantity.reason !== null && quantity.reason.kind === "given",
        });
    }
    for (let i = 0; i < measured.length; i++) {
        for (let j = i + 1; j < measured.length; j++) {
            const a = measured[i]!, b = measured[j]!;
            if (Math.abs(a.value - b.value) < EPS) union(a.id, b.id, a.given && b.given);
        }
    }

    const byRoot = new Map<string, T[]>();
    for (const item of items) {
        const root = find(ids.get(item)!);
        const found = byRoot.get(root);
        if (found === undefined) byRoot.set(root, [item]); else found.push(item);
    }

    // Номера классов не должны прыгать при перерисовке, иначе пометки будут
    // менять вид от одного действия к другому: упорядочиваем по «самому
    // раннему» объекту класса.
    const classes = Array.from(byRoot.entries())
        .filter(([, group]) => group.length > 1)
        .map(([root, group]) => ({
            group,
            derived: !(purelyGiven.get(root) ?? true),
            key: group.map(item => ids.get(item)!).sort()[0]!,
        }))
        .sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

    // Нумеруем отдельно внутри каждого происхождения: цвет теперь сам по себе
    // различает пометки, поэтому виды штрихов незачем тратить на то, что уже
    // разведено цветом.
    const result = new Map<T, Mark>();
    let givenCount = 0, derivedCount = 0;
    for (const { group, derived } of classes) {
        const index = derived ? derivedCount++ : givenCount++;
        for (const item of group) result.set(item, { index, derived });
    }
    return result;
}

// Равные отрезки: одинаковые чёрточки поперёк середины.
export function equalSegmentMarks(problem: Problem): Map<Segment, Mark> {
    return equalClasses(problem, Array.from(problem.segments.values()),
        seg => problem.lengthId(seg));
}

// Равные углы: одинаковые дуги у вершины.
//
// Из разбиения выпадают два случая. Развёрнутый угол — не «равные углы», а
// прямая (нулевой тем более). Прямой угол носит собственную пометку-уголок, и
// дуга рядом с ней была бы дублем: все прямые углы равны и без напоминания.
export function equalAngleMarks(problem: Problem): Map<Angle, Mark> {
    const angles = Array.from(problem.angles.values()).filter(angle => {
        const value = problem.quantities.value(problem.angleId(angle));
        if (value === null) return true;
        return value > EPS && value < STRAIGHT - EPS && Math.abs(value - RIGHT) > EPS;
    });
    return equalClasses(problem, angles, angle => problem.angleId(angle));
}

// Прямые углы: вместо дуги у вершины ставят «уголок» — квадратик на сторонах.
// Цвет, как и у прочих пометок, говорит о происхождении: 90° мог задать
// пользователь, а мог вывести движок.
export function rightAngleMarks(problem: Problem): Map<Angle, { derived: boolean }> {
    const result = new Map<Angle, { derived: boolean }>();
    for (const angle of problem.angles.values()) {
        const quantity = problem.quantities.get(problem.angleId(angle));
        if (quantity === undefined || quantity.value === null) continue;
        if (Math.abs(quantity.value - RIGHT) > EPS) continue;
        result.set(angle, {
            derived: quantity.reason === null || quantity.reason.kind !== "given",
        });
    }
    return result;
}

export interface ValueLabel {
    text: string;
    // Значение вывел движок, а не задал пользователь — как и у пометок равенства.
    derived: boolean;
}

function valueLabel(problem: Problem, id: string, unit: string): ValueLabel | null {
    const quantity = problem.quantities.get(id);
    if (quantity === undefined || quantity.value === null) return null;
    return {
        text: `${formatNumber(quantity.value)}${unit}`,
        derived: quantity.reason === null || quantity.reason.kind !== "given",
    };
}

// Длины отрезков для подписи посередине отрезка. Без известного числа подписи
// нет: чертёж символьный, и начерченная длина ничего не значит.
export function segmentValueLabels(problem: Problem): Map<Segment, ValueLabel> {
    const result = new Map<Segment, ValueLabel>();
    for (const seg of problem.segments.values()) {
        const label = valueLabel(problem, problem.lengthId(seg), "");
        if (label !== null) result.set(seg, label);
    }
    return result;
}

// Величины углов для подписи у вершины.
//
// Два случая пропускаем. Развёрнутый угол появляется сам собой там, где точка
// легла внутрь отрезка, и «180°» посреди прямой — чистый шум. Прямой угол
// подписывать не принято: за него говорит уголок, а число рядом с ним только
// теснит букву вершины.
export function angleValueLabels(problem: Problem): Map<Angle, ValueLabel> {
    const result = new Map<Angle, ValueLabel>();
    for (const angle of problem.angles.values()) {
        const id = problem.angleId(angle);
        const value = problem.quantities.value(id);
        if (value === null || value <= EPS || value >= STRAIGHT - EPS) continue;
        if (Math.abs(value - RIGHT) <= EPS) continue;
        const label = valueLabel(problem, id, "°");
        if (label !== null) result.set(angle, label);
    }
    return result;
}
