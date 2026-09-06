import { createElement, Fragment, useSyncExternalStore, type ReactNode } from "react";
import { en } from "./en";
import { ru } from "./ru";

export type Lang = "en" | "ru";
export type Key = keyof typeof en;

const DICTS: Record<Lang, Record<Key, string>> = { en, ru };
const STORAGE_KEY = "mygeometry.lang";

let current: Lang = readStored() ?? "en";
const listeners = new Set<() => void>();

function isLang(value: unknown): value is Lang {
    return value === "en" || value === "ru";
}

// В vitest нет ни localStorage, ни document, а движок тянет этот модуль
function readStored(): Lang | null {
    if (typeof localStorage === "undefined") return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLang(stored) ? stored : null;
}

function syncDocumentLang(): void {
    if (typeof document !== "undefined") document.documentElement.lang = current;
}

syncDocumentLang();

export function getLanguage(): Lang {
    return current;
}

export function setLanguage(lang: Lang): void {
    if (lang === current) return;
    current = lang;
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, lang);
    syncDocumentLang();
    for (const notify of listeners) notify();
}

export function toggleLanguage(): void {
    setLanguage(current === "en" ? "ru" : "en");
}

function subscribe(notify: () => void): () => void {
    listeners.add(notify);
    return () => { listeners.delete(notify); };
}

export function useLanguage(): Lang {
    return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}

// Перевод с подстановкой: t("fact.between", { point: "C", from: "A", to: "B" }).
export function t(key: Key, params?: Record<string, string | number>): string {
    const template = DICTS[current][key];
    if (params === undefined) return template;
    return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
        name in params ? String(params[name]) : whole);
}

// Тот же перевод, но подставляются узлы JSX, а не строки: «{theorem} для
// {source}:» — каждый кусок в своём <span>. Порядок слов задаёт словарь, и
// вёрстка больше не может зашить его в себя: в en источник идёт первым,
// в ru — последним.
export function tNodes(key: Key, params: Record<string, ReactNode>): ReactNode[] {
    const template = DICTS[current][key];
    const parts: ReactNode[] = [];
    const pattern = /\{(\w+)\}/g;
    let tail = 0;
    for (let match = pattern.exec(template); match !== null; match = pattern.exec(template)) {
        const name = match[1]!;
        // Неизвестное имя оставляем в тексте как {name} — так же, как в t().
        if (!(name in params)) continue;
        if (match.index > tail) parts.push(template.slice(tail, match.index));
        parts.push(createElement(Fragment, { key: `${name}-${match.index}` }, params[name]));
        tail = match.index + match[0].length;
    }
    if (tail < template.length) parts.push(template.slice(tail));
    return parts;
}
