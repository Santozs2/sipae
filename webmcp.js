/* Integração progressiva. Navegadores sem WebMCP usam normalmente a interface. */
(function () {
  "use strict";
  const context = document.modelContext;
  if (!context || typeof context.registerTool !== "function") return;
  const S = globalThis.SIPAE,
    lifecycle = new AbortController();
  function noExtra(input, allowed) {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some((k) => !allowed.includes(k))
    )
      throw new Error("Parâmetros inválidos.");
  }
  const tools = [
    {
      name: "consultar_indicadores_sipae",
      title: "Consultar indicadores do SIPAE",
      description:
        "Consulta os indicadores calculados do perfil e dos filtros atualmente visíveis, sem alterar dados.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        noExtra(input, []);
        if (
          S.state.role === "docente" ||
          !["dashboard", "relatorios"].includes(S.state.page)
        )
          throw new Error(
            "Abra um painel ou relatório da coordenação ou direção para consultar seus indicadores.",
          );
        const f =
          S.state.page === "dashboard"
            ? {
                ...(S.state.role === "coordenador" ? { start: S.data.today, end: S.data.today } : { period: "mes" }),
                area: S.state.role === "coordenador" ? "ti" : "todas",
              }
            : S.filter();
        const result = S.M.overview(S.data, f);
        return {
          perfil: S.state.role,
          pagina: S.state.page,
          periodo: S.M.period(f).label,
          horasAlocadas: result.hours,
          ocupacao: result.occupancy,
          aulasAgendadas: result.bookings,
          agendamentos: result.requests,
        };
      },
    },
  ];
  for (const tool of tools) {
    try {
      Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {
      /* A integração opcional não bloqueia a interface. */
    }
  }
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
})();
