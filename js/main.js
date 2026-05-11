/* ════════════════════════════════════════════
   main.js — Inicialização
   ════════════════════════════════════════════ */

/**
 * Renderiza todas as views de uma vez.
 * Chamado na inicialização e após qualquer mutação de estado.
 */
function renderAll() {
  renderDashboard();
  renderClientes();
  renderAgenda();
  renderHistorico();
  renderConfig();
}

// ── BOOT ──
renderAll();
