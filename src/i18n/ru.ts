import type { en } from "./en";

export const ru: Record<keyof typeof en, string> = {
    // --- Общее ---
    "app.title": "My Geometry",
    "common.cancel": "Отмена",
    "common.done": "Готово",
    "common.auto": "Авто",

    // --- Подсказка текущего шага построения ---
    "hint.placingPoint": "Кликнете в любом месте, чтобы поставить точку",
    "hint.segmentStart": "Выберите или создайте начальную точку отрезка",
    "hint.segmentEnd": "Выберите или создайте конечную точку отрезка",
    "hint.lineStart": "Выберите или создайте первую точку новой прямой",
    "hint.lineEnd": "Выберите или создайте вторую точку новой прямой",
    "hint.rayStart": "Выберите или создайте начальную точку луча",
    "hint.rayEnd": "Выберите или создайте точку, через которую проходит луч",
    "hint.triangleFirst": "Выберите или создайте первую вершину треугольника",
    "hint.quadFirst": "Выберите или создайте первую вершину четырёхугольника",
    "hint.vertexSecond": "Выберите или создайте вторую вершину",
    "hint.vertexThird": "Выберите или создайте третью вершину",
    "hint.vertexFourth": "Выберите или создайте четвёртую вершину",
    "hint.circleCenter": "Выберите или создайте центр окружности",
    "hint.circleThrough": "Выберите или создайте точку, через которую проходит окружность",
    "hint.eraser": "Кликните по точке или линии, чтобы стереть её",
    "hint.move": "Перетащите точку, чтобы переместить её",

    // --- Очистка холста ---
    "clear.confirm": "Вы уверены, что хотите стереть весь чертёж?",
    "clear.erase": "Стереть",

    // --- Диалог именования точки ---
    "naming.newPoint": "Назовите новую точку",
    "naming.firstPoint": "Назовите первую точку",
    "naming.secondPoint": "Назовите вторую точку",
    "naming.rayStart": "Назовите начало луча",
    "naming.tangency": "Назовите точку касания",
    "naming.center": "Назовите центр",
    "naming.vertexFirst": "Назовите первую вершину",
    "naming.vertexSecond": "Назовите вторую вершину",
    "naming.vertexThird": "Назовите третью вершину",
    "naming.vertexFourth": "Назовите четвёртую вершину",
    "naming.errorEmpty": "Введите имя или нажмите «Авто»",
    "naming.errorSingleLetter": "Должна быть одна латинская буква A-Z",
    "naming.errorTaken": "Имя «{label}» уже занято",

    // --- Панель задачи ---
    "panel.tab.problem": "Задача",
    "panel.tab.solution": "Решение",
    "panel.given": "Дано",
    "panel.found": "Найдено",
    "panel.goal": "Цель",
    "panel.solve": "Решить",
    "panel.noConditions": "Условий пока нет",
    "panel.noFound": "Если удастся вывести что-то новое, мы покажем это здесь",
    "panel.removeCondition": "Удалить условие",

    // --- Поле ввода условия и цели ---
    "box.conditionPlaceholder": "Начните вводить условие...",
    "box.goalPlaceholder": "Укажите искомый объект или доказываемый факт...",
    "box.orNumber": "… или введите число",
    "box.commit": "{preview} — Enter",

    // --- Вкладка решения ---
    "solution.title": "Решение",
    "solution.empty": "Выкладок пока нет — нажмите «Решить».",
    // Источник — это целое утверждение, а не объект, поэтому он уходит в
    // скобки: «для △ABC — прямоугольный» требовало бы родительного падежа,
    // которого у готовой фразы нет. Порядок слов другой, чем в en — ради
    // этого фразы и хранятся целиком, а не собираются из кусков.
    "solution.claimWithSource": "{theorem} (известно: {source}):",
    "solution.claim": "{theorem}:",
    "solution.answer": "Ответ",
    "solution.proved": "{statement} — доказано",

    // --- Названия теорем ---
    "theorem.pythagoras": "Теорема Пифагора",
    "theorem.intersection": "Точка пересечения",
    "theorem.segment_addition": "Сложение отрезков",
    "theorem.pointOnSegment": "Точка на отрезке",
    "theorem.vertical_angles": "Вертикальные углы",
    "theorem.linear_pair": "Смежные углы",
    "theorem.triangle_angle_sum": "По свойству суммы углов треугольника",
    "theorem.right_angle": "Прямой угол",
    "theorem.perpendicular_angles": "Перпендикулярные отрезки",
    "theorem.right_triangle_from_angle": "Прямой угол в треугольнике",
    "theorem.perpendicular_from_angle": "Перпендикулярность из прямого угла",
    "theorem.equilateral": "Равносторонний треугольник",
    "theorem.alternate_angles": "Накрест лежащие углы при секущей",
    "theorem.cointerior_angles": "Односторонние углы при секущей",
    "theorem.parallel_from_angles": "Параллельность прямых по углам при секущей",
    "theorem.perpendicular_through_parallel": "Перпендикуляр к одной из двух параллельных",
    "theorem.parallel_transitive": "Обе параллельны одной прямой",
    "theorem.parallel_from_perpendiculars": "Обе перпендикулярны одной прямой",
    "theorem.given": "По условию",

    // --- Факты и свойства фигур ---
    // Про вершину прямого угла по-русски не пишем, {vertex} здесь не нужен.
    "fact.rightTriangle": "{name} — прямоугольный",
    "fact.equilateral": "{name} — равносторонний",
    "fact.obtuse": "{name} — тупоугольный",
    "fact.acute": "{name} — остроугольный",
    "fact.between": "{point} лежит между {from} и {to}",

    // --- Цель ---
    "goal.find": "Найти {object}",
    "goal.prove": "Доказать {statement}",
    "goal.inputFind": "{object} — ?",
    "goal.inputProve": "Доказать: {statement}",

    // --- Ошибки разбора ввода ---
    "parse.expectedObject": "Ожидается объект, а не «{token}»",
    "parse.expectedNumber": "Ожидается число, а не «{token}»",
    "parse.lengthPositive": "Длина должна быть положительной",
    "parse.angleRange": "Угол должен быть от 0 до 180",
    "parse.unknownObject": "Неизвестный {noun} «{token}»",
    "parse.noun.angle": "угол",
    "parse.noun.segment": "отрезок",
    "parse.noun.object": "объект",
    "parse.incompatible": "Нельзя сравнивать длину и угол",
    "parse.sameObject": "Обе части — один и тот же объект",
    "parse.noLength": "У луча и прямой нет длины",
    "parse.expectedRelationOrPredicate": "Ожидается отношение или свойство треугольника, а не «{token}»",
    "parse.expectedRelation": "Ожидается =, /, ⊥ или ∥, а не «{token}»",
    "parse.expectedVertex": "Ожидается вершина треугольника, а не «{token}»",
    "parse.noTriangle": "Треугольника нет",
    "parse.notAVertex": "«{label}» — не вершина этого треугольника",
    "parse.expectedEquals": "Ожидается «=», а не «{token}»",
    "parse.ratioPositive": "Отношение должно быть положительным",
    "parse.unexpected": "Лишнее: «{token}»",

    // --- Пояснения в выпадающем списке подсказок ---
    "suggest.rightTriangle": "прямоугольный треугольник",
    "suggest.equilateralTriangle": "равносторонний треугольник",
    "suggest.obtuseTriangle": "тупоугольный треугольник (не используется)",
    "suggest.acuteTriangle": "остроугольный треугольник (не используется)",
    "suggest.lengthOrEqualSegment": "длина или равный отрезок",
    "suggest.ratio": "отношение",
    "suggest.perpendicular": "перпендикулярно",
    "suggest.parallel": "параллельно",
    "suggest.valueOrEqualAngle": "величина или равный угол",

    // --- Противоречия в условии ---
    "conflict.valueMismatch": "{label} = {a}, но при этом {label} = {b}{via}",
    "conflict.via": " (через {theorem})",
    "conflict.mustBeEqual": "{aLabel} = {a} и {bLabel} = {b}, но они должны быть равны ({theorem})",
    "conflict.ratioMismatch":
        "{aLabel} = {a} и {bLabel} = {b}, но {aLabel} / {bLabel} должно быть {value} ({theorem})",
    "conflict.negative": "{label} получается отрицательным ({theorem})",
    "conflict.hypotenuseShorter": "Гипотенуза {hyp} = {hypValue} короче катета {leg} = {legValue}",
};
