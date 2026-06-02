// ── SnagAI namespace + shared utilities ──────────────────────────────────────
// Loaded first — all other content modules attach to this object
window.SnagAI = window.SnagAI || {};

window.SnagAI.state = {
  isOpen: false,
  refineInstruction: '',
  jobStats: {},
  profile: {}
};

window.SnagAI.esc = function(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};
