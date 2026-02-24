/**
 * cleanLLMOutput.js
 * Strips backend-specific tags and wrapper tokens from LLM output before
 * rendering so the UI shows clean, readable Markdown.
 */
export function cleanLLMOutput(raw) {
    if (!raw) return "";

    let cleaned = raw;

    // Remove <REASONING>…</REASONING> and <ANSWER>…</ANSWER> wrappers
    cleaned = cleaned.replace(/<\/?REASONING>/gi, "");
    cleaned = cleaned.replace(/<\/?ANSWER>/gi, "");

    // Remove standalone "Intent: …" labels that sometimes leak into the answer
    cleaned = cleaned.replace(/\n?Intent:\s.*$/gim, "");

    // Remove markdown code-fences around JSON blocks
    cleaned = cleaned.replace(/```json/gi, "");
    cleaned = cleaned.replace(/```/g, "");

    return cleaned.trim();
}
