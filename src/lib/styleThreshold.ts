// Single source of truth for the style-match pass threshold. Shared by the
// server-side scored-generation retry gate, the auto-pipeline's Telegram
// send gate, and client-side score display so all three stay in sync.
// Keep this module dependency-free so client components can import it.
export const STYLE_PASS_THRESHOLD = 50;
