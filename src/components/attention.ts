// Мигание окна, которое ждёт ответа пользователя
export function attentionClass(nudge: number): string {
    if (nudge === 0) return "";
    return nudge % 2 === 1 ? "attn-a" : "attn-b";
}
