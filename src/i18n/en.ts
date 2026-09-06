// Словарь-источник: набор его ключей и есть тип Key, а ru.ts обязан покрыть
// их все — иначе ошибка компиляции. Плейсхолдеры пишутся как {name}.
//
// Математическая запись (AB, ∠ABC, △ABC, ⟂, ∥, числа) языконезависима и в
// словарь не попадает: переводятся только слова вокруг неё.
export const en = {
    // --- Общее ---
    "app.title": "My Geometry",
    "common.cancel": "Cancel",
    "common.done": "Done",
    "common.auto": "Auto",

    // --- Подсказка текущего шага построения ---
    "hint.placingPoint": "Click anywhere to place a point",
    "hint.segmentStart": "Select or create the starting point of the segment",
    "hint.segmentEnd": "Select or create the endpoint of the segment",
    "hint.lineStart": "Select or create the first point on the new line",
    "hint.lineEnd": "Select or create the second point on the new line",
    "hint.rayStart": "Select or create the starting point of the ray",
    "hint.rayEnd": "Select or create a second point the ray passes through",
    "hint.triangleFirst": "Select or create the first vertex of the triangle",
    "hint.quadFirst": "Select or create the first vertex of the quadrilateral",
    "hint.vertexSecond": "Select or create the second vertex",
    "hint.vertexThird": "Select or create the third vertex",
    "hint.vertexFourth": "Select or create the fourth vertex",
    "hint.circleCenter": "Select or create the center of the circle",
    "hint.circleThrough": "Select or create a point the circle passes through",
    "hint.eraser": "Click a point or line to erase it",
    "hint.move": "Drag a point to move it",

    // --- Очистка холста ---
    "clear.confirm": "Are you sure you want to erase the whole drawing?",
    "clear.erase": "Erase",

    // --- Диалог именования точки ---
    "naming.newPoint": "Name the new point",
    "naming.firstPoint": "Name the first point",
    "naming.secondPoint": "Name the second point",
    "naming.rayStart": "Name the start of the ray",
    "naming.tangency": "Name the point of tangency",
    "naming.center": "Name the center",
    "naming.vertexFirst": "Name the first vertex",
    "naming.vertexSecond": "Name the second vertex",
    "naming.vertexThird": "Name the third vertex",
    "naming.vertexFourth": "Name the fourth vertex",
    "naming.errorEmpty": "Please enter a name or choose “Auto”",
    "naming.errorSingleLetter": "Must be a single letter A-Z",
    "naming.errorTaken": "Name “{label}” is already taken",

    // --- Панель задачи ---
    "panel.tab.problem": "Problem",
    "panel.tab.solution": "Solution",
    "panel.given": "Given",
    "panel.found": "Found",
    "panel.goal": "Goal",
    "panel.solve": "Solve",
    "panel.noConditions": "No conditions yet",
    "panel.noFound": "If we can find any new values we'll show them here",
    "panel.removeCondition": "Remove condition",

    // --- Поле ввода условия и цели ---
    "box.conditionPlaceholder": "Start entering the condition...",
    "box.goalPlaceholder": "Object to find or statement to prove...",
    "box.orNumber": "… or type a number",
    "box.commit": "{preview} — Enter",

    // --- Вкладка решения ---
    "solution.title": "Solution",
    "solution.empty": "No derivation steps yet — press Solve.",
    "solution.claimWithSource": "For {source}, according to {theorem}:",
    "solution.claim": "{theorem}:",
    "solution.answer": "Answer",
    "solution.proved": "{statement} — proved",

    // --- Названия теорем ---
    "theorem.pythagoras": "Pythagorean theorem",
    "theorem.intersection": "Point of intersection",
    "theorem.segment_addition": "Segment addition",
    "theorem.pointOnSegment": "Point on segment",
    "theorem.vertical_angles": "Vertical angles",
    "theorem.linear_pair": "Linear pair",
    "theorem.triangle_angle_sum": "Sum of angles in a triangle",
    "theorem.right_angle": "Right angle",
    "theorem.perpendicular_angles": "Perpendicular segments",
    "theorem.right_triangle_from_angle": "Right angle in a triangle",
    "theorem.perpendicular_from_angle": "Perpendicularity from a right angle",
    "theorem.equilateral": "Equilateral triangle",
    "theorem.alternate_angles": "Alternate angles at a transversal",
    "theorem.cointerior_angles": "Co-interior angles at a transversal",
    "theorem.parallel_from_angles": "Parallel lines from the angles at a transversal",
    "theorem.perpendicular_through_parallel": "Perpendicular to one of two parallels",
    "theorem.parallel_transitive": "Both parallel to the same line",
    "theorem.parallel_from_perpendiculars": "Both perpendicular to the same line",
    "theorem.given": "By the given condition",

    // --- Факты и свойства фигур ---
    "fact.rightTriangle": "{name} is right-angled at {vertex}",
    "fact.equilateral": "{name} is equilateral",
    "fact.obtuse": "{name} is obtuse",
    "fact.acute": "{name} is acute",
    "fact.between": "{point} is between {from} and {to}",

    // --- Цель ---
    "goal.find": "Find {object}",
    "goal.prove": "Prove {statement}",
    "goal.inputFind": "{object} — ?",
    "goal.inputProve": "Prove: {statement}",

    // --- Ошибки разбора ввода ---
    "parse.expectedObject": "Expected an object, got “{token}”",
    "parse.expectedNumber": "Expected a number, got “{token}”",
    "parse.lengthPositive": "Length must be positive",
    "parse.angleRange": "Angle must be between 0 and 180",
    "parse.unknownObject": "Unknown {noun} “{token}”",
    "parse.noun.angle": "angle",
    "parse.noun.segment": "segment",
    "parse.noun.object": "object",
    "parse.incompatible": "Cannot compare a length and an angle",
    "parse.sameObject": "Both sides refer to the same object",
    "parse.noLength": "A ray or a line has no length",
    "parse.expectedRelationOrPredicate": "Expected a relation or triangle property, got “{token}”",
    "parse.expectedRelation": "Expected =, /, ⊥ or ∥, got “{token}”",
    "parse.expectedVertex": "Expected a triangle vertex, got “{token}”",
    "parse.noTriangle": "No triangle",
    "parse.notAVertex": "“{label}” is not a vertex of the triangle",
    "parse.expectedEquals": "Expected “=”, got “{token}”",
    "parse.ratioPositive": "Ratio must be positive",
    "parse.unexpected": "Unexpected “{token}”",

    // --- Пояснения в выпадающем списке подсказок ---
    "suggest.rightTriangle": "right triangle",
    "suggest.equilateralTriangle": "equilateral triangle",
    "suggest.obtuseTriangle": "obtuse triangle (inert)",
    "suggest.acuteTriangle": "acute triangle (inert)",
    "suggest.lengthOrEqualSegment": "length or equal segment",
    "suggest.ratio": "ratio",
    "suggest.perpendicular": "perpendicular",
    "suggest.parallel": "parallel",
    "suggest.valueOrEqualAngle": "value or equal angle",

    // --- Противоречия в условии ---
    "conflict.valueMismatch": "{label} = {a}, but also {label} = {b}{via}",
    "conflict.via": " (via {theorem})",
    "conflict.mustBeEqual": "{aLabel} = {a} and {bLabel} = {b}, but they must be equal ({theorem})",
    "conflict.ratioMismatch":
        "{aLabel} = {a} and {bLabel} = {b}, but {aLabel} / {bLabel} must be {value} ({theorem})",
    "conflict.negative": "{label} would be negative ({theorem})",
    "conflict.hypotenuseShorter": "Hypotenuse {hyp} = {hypValue} is shorter than leg {leg} = {legValue}",
} as const;
