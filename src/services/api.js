// Re-export the full API layer from its canonical location.
// Any component or module that imports from "services/api" instead of "lib/api"
// will use the same implementation without duplication.
export * from "../lib/api";
