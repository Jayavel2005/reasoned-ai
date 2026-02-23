/**
 * generateDocumentIntelligenceSummary(indexedFiles)
 *
 * Derives a structured intelligence summary from a batch of indexed files.
 * Runs entirely client-side — no backend required.
 * Called once per upload batch, right after all files reach "indexed" state.
 *
 * Returns:
 *   {
 *     totalFiles:    number,
 *     totalChunks:   number,
 *     fileTypes:     string[],     // unique extensions, uppercased
 *     docTypes:      string[],     // inferred document categories
 *     themes:        string[],     // inferred primary themes
 *     systemType:    string,       // inferred system classification
 *     hasDecisionRules: boolean,
 *     hasHumanInLoop:   boolean,
 *     constraints:   string[],     // notable constraints / risks
 *     fileNames:     string[],     // original file names
 *   }
 */

const EXT_DOC_TYPE = {
    pdf: ["Policy Document", "Standard Operating Procedure", "Technical Specification"],
    docx: ["Process Manual", "Operational Guideline", "Workflow Document"],
    doc: ["Process Manual", "Operational Guideline"],
    csv: ["Structured Data Log", "Event Record", "Analytics Dataset"],
    json: ["Configuration Schema", "Rule Definition", "API Contract"],
    xlsx: ["Tabular Dataset", "Tracking Log", "Compliance Matrix"],
    md: ["Technical Reference", "Developer Guide", "Runbook"],
    txt: ["Freeform Log", "Annotation Record"],
};

const EXT_THEMES = {
    pdf: ["compliance", "governance", "process control"],
    docx: ["workflow", "process documentation", "policy enforcement"],
    doc: ["workflow", "process documentation"],
    csv: ["data ingestion", "event tracing", "operational metrics"],
    json: ["system configuration", "rule engine", "integration schema"],
    xlsx: ["performance tracking", "audit trails", "compliance reporting"],
    md: ["technical documentation", "system architecture", "developer ops"],
    txt: ["log analysis", "annotation"],
};

const EXT_SYSTEM_SCORE = {
    json: { automated: 3, ruleEngine: 2 },
    csv: { semiAuto: 2, eventDriven: 1 },
    pdf: { manual: 2, governance: 1 },
    docx: { manual: 2, workflow: 1 },
    doc: { manual: 2 },
    xlsx: { semiAuto: 2 },
    md: { automated: 1, devops: 1 },
    txt: { manual: 1 },
};

function extOf(name) {
    return (name ?? "").split(".").pop().toLowerCase();
}

function deriveSystemType(scores) {
    const s = { automated: 0, semiAuto: 0, manual: 0, ruleEngine: 0, ...scores };
    if (s.ruleEngine >= 2) return "Rule-Based Engine";
    if (s.automated >= 3) return "Automated Pipeline";
    if (s.semiAuto >= 2) return "Semi-Automated System";
    if (s.manual >= 3) return "Manual / Human-Driven Process";
    return "Hybrid System";
}

function detectConstraints(fileTypes) {
    const c = [];
    if (fileTypes.includes("csv") || fileTypes.includes("xlsx"))
        c.push("Structured data may contain schema drift risks");
    if (fileTypes.includes("pdf"))
        c.push("PDF parsing may miss embedded images or tables");
    if (fileTypes.includes("json"))
        c.push("Configuration schemas may include environment-specific values");
    if (fileTypes.length > 4)
        c.push("Multi-format corpus — cross-document consistency not guaranteed");
    return c.slice(0, 3); // max 3
}

export function generateDocumentIntelligenceSummary(indexedFiles) {
    const files = Array.isArray(indexedFiles) ? indexedFiles : [];
    const total = files.length;
    const chunks = files.reduce((acc, f) => acc + (f.chunks ?? 0), 0);
    const names = files.map(f => f.name ?? "unnamed");

    // Unique extensions
    const exts = [...new Set(files.map(f => extOf(f.name)))].filter(Boolean);

    // Doc types: collect from each extension, deduplicate
    const docTypeSet = new Set();
    exts.forEach(e => (EXT_DOC_TYPE[e] ?? []).forEach(t => docTypeSet.add(t)));
    const docTypes = [...docTypeSet].slice(0, 4);

    // Themes: collect + deduplicate
    const themeSet = new Set();
    exts.forEach(e => (EXT_THEMES[e] ?? []).forEach(t => themeSet.add(t)));
    const themes = [...themeSet].slice(0, 4);

    // System type score accumulation
    const scoreTally = {};
    exts.forEach(e => {
        const entry = EXT_SYSTEM_SCORE[e] ?? {};
        Object.entries(entry).forEach(([k, v]) => {
            scoreTally[k] = (scoreTally[k] ?? 0) + v;
        });
    });
    const systemType = deriveSystemType(scoreTally);

    // Decision rules: present if json/xlsx/csv docs are included
    const hasDecisionRules = exts.some(e => ["json", "xlsx", "csv"].includes(e));

    // Human-in-loop: present if pdf/docx/doc (manual/SOP) docs are included
    const hasHumanInLoop = exts.some(e => ["pdf", "docx", "doc", "txt"].includes(e));

    const constraints = detectConstraints(exts);

    return {
        totalFiles: total,
        totalChunks: chunks,
        fileTypes: exts.map(e => e.toUpperCase()),
        docTypes,
        themes,
        systemType,
        hasDecisionRules,
        hasHumanInLoop,
        constraints,
        fileNames: names,
    };
}
