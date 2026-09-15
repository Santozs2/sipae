(function (global) {
  "use strict";
  function collect(data, M, filter, role, kind, value, metric, blockValue) {
    if (!["coordenador", "diretor"].includes(role) || !["room", "block", "shift"].includes(kind) ||
      !["occupancy", "lessons"].includes(metric)) return null;
    const f = { ...filter };
    // Coordenação e Direção consultam todos os ambientes da mesma unidade.
    delete f.area;
    const blocks = new Set(data.rooms.map((r) => r.block));
    if (blockValue && !blocks.has(blockValue)) return null;
    let label, block = blockValue || null;
    if (kind === "block") {
      if (!blocks.has(value) || (block && block !== value)) return null;
      block = value;
      label = "Bloco " + value;
    } else if (kind === "room") {
      const room = data.rooms.find((r) => r.id === value);
      if (!room || (block && room.block !== block)) return null;
      label = room.name;
      block = room.block;
    } else {
      const shift = data.shifts.find((s) => s.id === value);
      if (!shift) return null;
      label = (block ? "Bloco " + block + " · " : "") + shift.name;
      if (f.shift && f.shift !== "todos" && f.shift !== value)
        return { records: [], used: 0, available: 0, label, filter: f, block, excluded: true, metric };
      f.shift = value;
    }
    const rooms = data.rooms.filter((r) => (!block || r.block === block) && (kind !== "room" || r.id === value));
    const ids = new Set(rooms.map((r) => r.id));
    const academic = M.allocations(data, f).filter((r) => ids.has(r.roomId)).map((r) => ({ ...r, key: "a:" + r.id, external: false }));
    const external = metric === "occupancy" ? (data.externalReservations || [])
      .filter((r) => r.status === "aprovada" && ids.has(r.roomId) && M.inRange(r.date, f) && M.scope(r, f))
      .map((r) => ({ ...r, key: "e:" + r.id, external: true })) : [];
    const records = [...academic, ...external].sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
    const available = metric === "occupancy" ? M.sum(M.roomStats(data, f).filter((r) => ids.has(r.id)), (r) => r.available) : 0;
    const used = metric === "occupancy" ? M.unionHours(records, (r) => r.roomId + "|" + r.date) : M.sum(records, (r) => r.end - r.start);
    return { records, used, available, label, filter: f, block, metric, excluded: false };
  }
  global.SIPAE_REPORT_DETAILS = { collect };
  if (!global.SIPAE || typeof document === "undefined") return;
  const S = global.SIPAE, { U, M, data, state } = S;
  function open(button) {
    if (!["relatorios", "dashboard"].includes(state.page)) return;
    // Nos relatórios vale o filtro da página. No painel, o recorte é a data atual,
    // salvo quando o próprio indicador declara o período que representa.
    const period = button.dataset.reportPeriod;
    const scopeFilter = state.page !== "dashboard"
      ? S.filter()
      : period && M.periods[period]
        ? { period, shift: "todos", teacher: "todos" }
        : { start: data.today, end: data.today, label: "Data atual", shift: "todos", teacher: "todos" };
    const result = collect(data, M, scopeFilter, state.role, button.dataset.reportKind, button.dataset.reportValue,
      button.dataset.reportMetric || "occupancy", button.dataset.reportBlock);
    if (!result) return;
    const { records, used, available, label, filter, metric, block } = result;
    const p = M.period(filter);
    const scope = ["Unidade inteira", block ? "Bloco " + block : null,
      filter.shift && filter.shift !== "todos" ? U.shift(filter.shift) : "Todos os turnos",
      filter.teacher && filter.teacher !== "todos" ? U.teacher(filter.teacher)?.name : "Todos os docentes"].filter(Boolean).join(" · ");
    const body = '<div class="report-detail-summary"><div><strong>' + records.length + '</strong><span>' +
      (metric === "occupancy" ? "Agendamentos" : "Aulas agendadas") + '</span></div><div><strong>' + U.hours(used) + '</strong><span>' +
      (metric === "occupancy" ? "Horas ocupadas" : "Horas de aula") + '</span></div>' +
      (metric === "occupancy" ? '<div><strong>' + U.pct(M.ratio(used, available)) + '</strong><span>De ' + U.hours(available) + ' disponíveis</span></div>' : '') +
      '</div><p class="role-note">' + U.esc(scope) + '</p>' +
      (records.length ? '<p class="report-scroll-hint">Deslize a tabela para os lados para consultar todas as informações.</p>' +
        '<div class="table-wrap report-detail-table" tabindex="0" role="region" aria-label="Agendamentos do indicador. Role horizontalmente para consultar todas as colunas.">' +
        '<table><thead><tr><th>Data e horário</th><th>Ambiente</th><th>Aula ou evento</th><th>Responsável</th><th>Ação</th></tr></thead><tbody>' +
        records.map((r) => '<tr><td>' + U.date(r.date) + '<small>' + U.time(r.start) + '–' + U.time(r.end) + '</small></td><td>' +
          U.esc(U.room(r.roomId)?.name || "Ambiente removido") + '</td><td>' +
          U.esc(r.external ? r.purpose : r.subject || U.cls(r.classId)?.name || "Aula") + '<small>' +
          (r.external ? U.badge("Reserva externa", "blue") : U.esc(U.cls(r.classId)?.code || "")) + '</small></td><td>' +
          U.esc(r.external ? r.organization : U.teacher(r.teacherId)?.name) + '</td><td>' +
          S.P.button("Ver detalhes", "booking-detail", r.key, "secondary compact") + '</td></tr>').join("") + '</tbody></table></div>' :
        U.empty(result.excluded ? "Turno fora do filtro atual" : "Nenhum agendamento neste recorte",
          result.excluded ? "Altere o filtro de turno para consultar este indicador." : "Nenhum registro corresponde aos filtros aplicados.")) +
      '<p class="role-note">' + (metric === "occupancy" ?
        "A ocupação inclui aulas e reservas externas confirmadas. Horários sobrepostos no mesmo ambiente são contados uma única vez." :
        "Este indicador inclui apenas aulas acadêmicas confirmadas.") + '</p><div class="form-actions">' + S.P.button("Fechar", "close", "", "secondary") + '</div>';
    S.P.openDialog("Agendamentos · " + label, U.date(p.start) + " a " + U.date(p.end) + " · " + p.label, body, true);
  }
  document.addEventListener("click", (event) => {
    const el = event.target.closest?.("[data-report-kind]");
    if (el) open(el);
  });
  document.addEventListener("keydown", (event) => {
    const el = event.target.closest?.('[data-report-kind][role="button"]');
    if (el && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      open(el);
    }
  });
})(globalThis);
