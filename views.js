(function () {
  "use strict";
  const S = SIPAE,
    { data, M, state, U } = S;
  const {
    icon,
    esc,
    number,
    pct,
    hours,
    date,
    time,
    teacher,
    room,
    cls,
    shift,
    empty,
    badge,
    card,
    kpi,
    delta,
    bars,
    heading,
    lineChart,
    columnChart,
    legend,
    donut,
    heatmap,
    stacked,
    scatter,
    blockStats,
  } = U;
  const exportButton = (format, label) =>
    '<button type="button" class="button ' +
    (format === "PDF" ? "primary" : "secondary") +
    '" data-export="' +
    format +
    '">' +
    icon("download") +
    label +
    "</button>";
  const selected = (a, b) => (a === b ? " selected" : "");
  // Sem nenhum filtro alterado, "Limpar filtros" fica desabilitado.
  const defaults = (role) =>
    role === "coordenador"
      ? { period: "mes", shift: "todos", teacher: "todos" }
      : { period: "semestre", shift: "todos", teacher: "todos" };
  const pristine = (f) => {
    const base = defaults(state.role);
    return Object.keys(base).every((key) => (f[key] || base[key]) === base[key]);
  };
  function filterBar() {
    const f = S.filter();
    const options = (values, current) => values.map(([id, label]) => '<option value="' + esc(id) + '"' + selected(current, id) + '>' + esc(label) + '</option>').join("");
    return '<form class="filters" id="report-filters" aria-label="Filtros do relatório">' +
      '<div class="filter"><label for="period-filter">PERÍODO</label><select id="period-filter" data-filter="period">' +
      options(Object.entries(M.periods).map(([id, p]) => [id, p.label]), f.period) + '</select></div>' +
      '<div class="filter"><label for="shift-filter">TURNO</label><select id="shift-filter" data-filter="shift">' +
      options([["todos", "Todos os turnos"], ...data.shifts.map((s) => [s.id, s.name])], f.shift || "todos") + '</select></div>' +
      '<div class="filter"><label for="teacher-filter">DOCENTE</label><select id="teacher-filter" data-filter="teacher">' +
      options([["todos", "Todos os docentes"], ...data.teachers.map((t) => [t.id, t.name])], f.teacher || "todos") + '</select></div>' +
      '<button type="button" class="text-button" data-reset-filters' + (pristine(f) ? ' disabled' : '') + '>' + icon("refresh") +
      'Limpar filtros</button><span class="filter-summary">Todos os ambientes da unidade</span></form>';
  }
  function periodLabel(f) {
    return (
      M.period(f).label +
      (f.shift && f.shift !== "todos" ? " · " + shift(f.shift) : "") +
      (f.teacher && f.teacher !== "todos"
        ? " · " + teacher(f.teacher).name
        : "")
    );
  }
  function methodology(extra = "") {
    return '<details class="methodology"><summary>Como os indicadores são calculados</summary><p>Dados fictícios de demonstração. Ocupação = horas agendadas ÷ horas disponíveis, nos dias de funcionamento de cada ambiente, das 8h às 12h, das 13h às 17h e das 18h às 22h. A manutenção é excluída da disponibilidade; intervalos sobrepostos são contados uma única vez. Os blocos identificam a localização física dos ambientes. Os agendamentos são filtrados pela data da aula e as reservas canceladas não ocupam horários. Uma hora-aula equivale a 60 minutos neste protótipo. ' +
      extra + ' A data de referência é ' + esc(date(data.today, true)) + '. Alterações permanecem durante a navegação e são reiniciadas ao recarregar a página.</p></details>';
  }
  function teacherChart(f) {
    const rows = M.teacherLoad(data, f);
    const max = Math.max(100, ...rows.map((t) => t.load));
    return rows.length
      ? rows
          .map(
            (t) =>
              '<div class="teacher-row"><div class="teacher-title"><span>' +
              esc(t.name) +
              "</span>" +
              badge(
                t.load > 100
                  ? "Acima do contrato"
                  : t.load < 40
                    ? "Carga reduzida"
                    : "Equilibrada",
                t.load > 100 ? "red" : t.load < 40 ? "amber" : "gray",
              ) +
              '</div><div class="teacher-track" role="img" aria-label="' +
              esc(
                t.name +
                  ": " +
                  hours(t.hours) +
                  " alocadas de " +
                  hours(t.contracted) +
                  " contratadas",
              ) +
              '"><span style="width:' +
              (t.load / max) * 100 +
              "%;background:" +
              (t.load > 100 ? "#ca7885" : t.load < 40 ? "#bcc7d7" : "#839ab9") +
              '"></span><i style="left:' +
              (100 / max) * 100 +
              '%"></i></div><small>' +
              hours(t.hours) +
              " alocadas / " +
              hours(t.contracted) +
              " contratadas</small></div>",
          )
          .join("") +
          '<p class="insight-line">A marca vertical indica o contrato proporcional aos dias úteis do período.</p>'
      : empty();
  }
  function allocationTable(f) {
    const query = state.query.toLocaleLowerCase("pt-BR");
    let rows = M.allocations(data, f).filter((a) =>
      [
        cls(a.classId).code,
        cls(a.classId).name,
        teacher(a.teacherId).name,
        room(a.roomId).name,
        a.date,
        shift(a.shift),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(query),
    );
    const value = (a) =>
      state.sort === "teacher"
        ? teacher(a.teacherId).name
        : state.sort === "room"
          ? room(a.roomId).name
          : state.sort === "class"
            ? cls(a.classId).code
            : state.sort === "hours"
              ? a.end - a.start
              : a.date + " " + time(a.start);
    rows.sort((a, b) => {
      const x = value(a),
        y = value(b);
      return (
        state.sortDir *
        (typeof x === "number"
          ? x - y
          : String(x).localeCompare(String(y), "pt-BR"))
      );
    });
    const pageSize = 8,
      pages = Math.max(1, Math.ceil(rows.length / pageSize));
    state.tablePage = Math.min(state.tablePage, pages - 1);
    const start = state.tablePage * pageSize,
      slice = rows.slice(start, start + pageSize);
    const columns = [
      ["date", "DATA / HORÁRIO"],
      ["class", "TURMA"],
      ["teacher", "DOCENTE"],
      ["room", "AMBIENTE"],
      ["hours", "HORAS"],
    ];
    return (
      '<div class="table-toolbar"><label class="search-box">' +
      icon("search") +
      '<span class="sr-only">Buscar alocações</span><input id="allocation-search" type="search" placeholder="Buscar turma, docente ou ambiente…" value="' +
      esc(state.query) +
      '"></label><button type="button" class="button secondary" data-export="CSV">' +
      icon("download") +
      'Exportar</button></div><div class="table-wrap"><table><caption class="sr-only">Alocações detalhadas da unidade</caption><thead><tr>' +
      columns
        .map(
          ([key, label]) =>
            '<th scope="col" aria-sort="' +
            (state.sort === key
              ? state.sortDir === 1
                ? "ascending"
                : "descending"
              : "none") +
            '"><button type="button" class="sort-button" data-sort="' +
            key +
            '">' +
            label +
            icon("sort") +
            "</button></th>",
        )
        .join("") +
      "</tr></thead><tbody>" +
      slice
        .map(
          (a) =>
            '<tr><td class="time-cell"><strong>' +
            date(a.date) +
            "</strong><small>" +
            time(a.start) +
            "–" +
            time(a.end) +
            "</small></td><td><strong>" +
            esc(cls(a.classId).code) +
            "</strong><small>" +
            esc(cls(a.classId).modality) +
            "</small></td><td>" +
            esc(teacher(a.teacherId).name) +
            "</td><td><strong>" +
            esc(room(a.roomId).name) +
            "</strong><small>Bloco " +
            room(a.roomId).block +
            " · " +
            shift(a.shift) +
            "</small></td><td>" +
            hours(a.end - a.start) +
            "</td></tr>",
        )
        .join("") +
      "</tbody></table>" +
      (rows.length
        ? ""
        : empty(
            "Nenhum resultado encontrado",
            "Tente outra busca ou ajuste os filtros.",
          )) +
      '</div><div class="pagination"><span>' +
      (rows.length
        ? start +
          1 +
          "–" +
          Math.min(start + pageSize, rows.length) +
          " de " +
          number(rows.length) +
          " alocações"
        : "0 alocações") +
      '</span><div><button type="button" data-table-page="' +
      (state.tablePage - 1) +
      '"' +
      (state.tablePage === 0 ? " disabled" : "") +
      ">Anterior</button><span>" +
      (state.tablePage + 1) +
      " / " +
      pages +
      '</span><button type="button" data-table-page="' +
      (state.tablePage + 1) +
      '"' +
      (state.tablePage >= pages - 1 ? " disabled" : "") +
      ">Próxima</button></div></div>"
    );
  }
  function tableCard(f) {
    return (
      '<section class="card col-12" id="detail-table" aria-label="Alocações detalhadas"><div class="card-head"><div><h2>Alocações detalhadas</h2><p>' +
      esc(periodLabel(f)) +
      ' · registros confirmados</p></div></div><div id="allocation-table-content">' +
      allocationTable(f) +
      "</div></section>"
    );
  }
  function weeklyBookings(f, items) {
    const period = M.period(f), result = [];
    let cursor = new Date(period.start + "T12:00:00Z");
    while (SIPAE_DATA.dateString(cursor) <= period.end) {
      const start = SIPAE_DATA.dateString(cursor), finish = new Date(cursor);
      const daysToSunday = (7 - cursor.getUTCDay()) % 7;
      finish.setUTCDate(finish.getUTCDate() + daysToSunday);
      const end = SIPAE_DATA.dateString(finish) > period.end ? period.end : SIPAE_DATA.dateString(finish);
      result.push({ label: date(start), count: items.filter((a) => a.date >= start && a.date <= end).length });
      cursor = new Date(end + "T12:00:00Z");
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result;
  }
  /* Relatórios da Coordenação: a página apresenta somente a área de filtros.
     Os cálculos e os blocos continuam disponíveis nas funções acima. */
  function coordinatorReports() {
    return (
      heading(
        "COORDENAÇÃO · UNIDADE",
        "Relatórios da unidade",
        "Selecione o período, o turno e o docente do recorte.",
      ) + filterBar()
    );
  }
  function comparison(f) {
    return '<div class="table-wrap"><table><thead><tr><th>BLOCO</th><th>OCUPAÇÃO</th><th>AULAS AGENDADAS</th><th>HORAS DE AULA</th></tr></thead><tbody>' +
      blockStats(f).map((r) => '<tr><td><strong>' + esc(r.name) + '</strong></td><td><strong>' +
      pct(r.occupancy) + '</strong></td><td>' + badge(number(r.bookings), "blue") + '</td><td>' +
      hours(r.hours) + '</td></tr>').join("") + '</tbody></table></div>';
  }
  function topRooms(rows, hot) {
    return (
      '<div class="ranking-list">' +
      rows
        .slice(0, 3)
        .map(
          (r, i) =>
            '<div class="rank-row"><span class="rank-number">0' +
            (i + 1) +
            "</span><div><strong>" +
            esc(r.name) +
            "</strong><small>Bloco " +
            r.block +
            " · " +
            "Unidade" +
            '</small></div><span class="rank-value ' +
            (hot && r.occupancy > 85 ? "hot" : "") +
            '">' +
            pct(r.occupancy) +
            "</span></div>",
        )
        .join("") +
      "</div>"
    );
  }
  function strategicAlerts() {
    const current = M.roomStats(data, { period: "semana" }).filter(
        (r) => r.status === "ativo",
      ),
      warnings = [];
    for (const room of current.filter((r) => r.occupancy > 85)) {
      let consecutive = 0;
      for (const offset of [0, 7, 14, 21]) {
        const start = new Date(M.periods.semana.start + "T12:00Z"),
          end = new Date(M.periods.semana.end + "T12:00Z");
        start.setUTCDate(start.getUTCDate() - offset);
        end.setUTCDate(end.getUTCDate() - offset);
        const stat = M.roomStats(data, {
          start: SIPAE_DATA.dateString(start),
          end: SIPAE_DATA.dateString(end),
        }).find((r) => r.id === room.id);
        if (stat.occupancy > 85) consecutive++;
        else break;
      }
      warnings.push({
        title: room.name + " sob pressão",
        description:
          pct(room.occupancy) +
          " de ocupação nesta semana" +
          (consecutive > 1
            ? " e acima de 85% por " + consecutive + " semanas consecutivas."
            : ".") +
          " Avalie redistribuir aulas compatíveis.",
      });
    }
    const auditorium = M.roomStats(data, { period: "mes" }).find(
      (r) => r.type === "Auditório",
    );
    if (auditorium?.occupancy < 30)
      warnings.push({
        title: "Auditório com disponibilidade elevada",
        description:
          "Apenas " +
          pct(auditorium.occupancy) +
          " de uso neste mês; " +
          hours(auditorium.idle) +
          " disponíveis para eventos e atividades coletivas.",
      });
    return warnings.length
      ? warnings
          .slice(0, 3)
          .map(
            (w) =>
              '<article class="alert-banner"><strong>' +
              esc(w.title) +
              "</strong><p>" +
              esc(w.description) +
              "</p></article>",
          )
          .join("")
      : empty(
          "Sem alertas estratégicos",
          "Os ambientes estão dentro das faixas monitoradas.",
        );
  }
  function directorDashboard() {
    const f = { period: "mes" },
      stats = M.overview(data, f),
      previous = M.overview(data, { period: "anterior" }),
      low = stats.rooms.filter((r) => r.status === "ativo" && r.occupancy < 30),
      // O gráfico do painel percorre os doze meses do ano corrente, na ordem
      // cronológica; meses sem agendamentos permanecem no eixo com 0%.
      year = data.today.slice(0, 4),
      history = M.monthly(data, {
        start: year + "-01-01",
        end: year + "-12-31",
        label: "Ano de " + year,
      }),
      weekRooms = M.roomStats(data, { period: "semana" })
        .filter((r) => r.status === "ativo")
        .sort((a, b) => b.occupancy - a.occupancy),
      mostOccupied = weekRooms.slice(0, 3),
      leastOccupied = [...weekRooms]
        .sort((a, b) => a.occupancy - b.occupancy)
        .slice(0, 3);
    const currentHour = new Date(data.reference).getHours(),
      greeting =
        currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite",
      directorName = data.managementProfiles.diretor.name.split(" ").slice(-1)[0];
    const bestMonth = history.reduce(
      (a, b) => (b.occupancy > a.occupancy ? b : a),
      history[0],
    );
    return (
      heading(
        "DIREÇÃO · SENAI SÃO JOSÉ DO RIO PRETO",
        greeting + ", Sr. " + esc(directorName) + "<span>.</span>",
        "Compare os blocos, acompanhe tendências e direcione o próximo passo.",
        '<div class="date-pill">' +
          icon("calendar") +
          esc(M.periods.mes.label) + "</div>" +
          '<button type="button" class="button primary" data-action="external-direct">' + icon("calendar") + 'Agendar reserva externa</button>' +
          U.reportLink("diretor", "Relatório executivo"),
      ) +
      '<div class="kpi-grid">' +
      kpi(
        "Ocupação da unidade",
        number(stats.occupancy, 1),
        "%",
        "vs. " + M.periods.anterior.label.toLowerCase(),
        "chart",
        "",
        delta(stats.occupancy - previous.occupancy),
      ) +
      kpi(
        "Ambientes subutilizados",
        number(low.length),
        "",
        hours(M.sum(low, (r) => r.idle)) + " ociosas no mês",
        "room",
      ) +
      kpi(
        "Horas-aula alocadas",
        number(stats.hours),
        "h",
        "Planejamento do mês · 60 min/aula",
        "calendar",
      ) +
      kpi(
        "Docentes com aulas",
        number(new Set(M.allocations(data, f).map((a) => a.teacherId)).size),
        "",
        "Profissionais com aulas agendadas no mês",
        "people",
      ) +
      "</div>" +
      '<div class="strategic-grid"><div class="stack director-chart-stack">' +
      card(
        "Ocupação em perspectiva",
        "Janeiro a dezembro de " + year + " · unidade inteira",
        U.responsiveColumnChart(
          history.map((m) => m.label),
          history.map((m) => m.occupancy),
          {
            height: 258,
            color: "#7b95b7",
            title: "Ocupação geral mês a mês em " + year,
          },
        ),
        {
          className: "director-occupancy",
          insight: bestMonth && bestMonth.occupancy
            ? bestMonth.label +
              " apresenta o maior uso do ano, com " +
              pct(bestMonth.occupancy) +
              ". Meses sem agendamentos aparecem com 0%."
            : "Nenhuma ocupação registrada no ano.",
        },
      ) +
      '</div><div class="stack">' +
      card(
        "Como estão os blocos?",
        M.periods.semana.label + " · acompanhamento da semana",
        comparison({ period: "semana" }),
        {
          insight:
            "A ocupação considera as horas disponíveis nos ambientes de cada bloco.",
        },
      ) +
      U.availableRoomsCard({ className: "director-availability" }) +
      '</div><div class="top-pair wide">' +
      card(
        "Os 3 ambientes com maior Ocupação",
        M.periods.semana.label + " · maiores índices de ocupação",
        topRooms(mostOccupied, true),
        {
          insight: mostOccupied.length
            ? esc(mostOccupied[0].name) +
              " lidera a semana, com " +
              pct(mostOccupied[0].occupancy) +
              " de ocupação."
            : "Nenhum ambiente ativo no recorte.",
        },
      ) +
      card(
        "Os 3 ambientes com menor Ocupação",
        M.periods.semana.label + " · menores índices de ocupação",
        topRooms(leastOccupied, false),
        {
          insight: leastOccupied.length
            ? esc(leastOccupied[0].name) +
              " apresenta a menor ocupação da semana, com " +
              pct(leastOccupied[0].occupancy) +
              "."
            : "Nenhum ambiente ativo no recorte.",
        },
      ) +
      "</div></div>" +
      methodology(
        "Taxas da unidade são ponderadas pelas horas disponíveis; os percentuais dos blocos não são somados.",
      )
    );
  }
  function executiveSummary(f) {
    const blocks = blockStats(f),
      capacity = M.capacity(data, f),
      stats = M.overview(data, f),
      turns = data.shifts
        .map((s) => ({
          ...s,
          hours: f.shift && f.shift !== "todos" && f.shift !== s.id ? 0 : M.overview(data, { ...f, shift: s.id }).hours,
        }))
        .sort((a, b) => b.hours - a.hours);
    const difference = blocks.length
      ? Math.max(...blocks.map((a) => a.occupancy)) -
        Math.min(...blocks.map((a) => a.occupancy))
      : 0;
    const most = turns[0];
    return (
      '<section class="executive-summary" aria-label="Resumo executivo"><div><span class="eyebrow">LEITURA DO PERÍODO</span><h2>' +
      (stats.hours
        ? "A demanda se concentra à " + most.name.toLowerCase() + "."
        : "Nenhuma alocação neste período.") +
      "</h2><p>" +
      (blocks.length > 1
        ? "Há espaço para equilibrar a utilização entre os blocos."
        : "O recorte permite avaliar a distribuição das aulas na unidade.") +
      '</p></div><div class="executive-stat"><span>Diferença entre blocos</span><strong>' +
      number(difference, 1) +
      ' <small style="display:inline;font-size:.75rem">p.p.</small></strong><small>' +
      (blocks.length > 1
        ? "Entre a maior e a menor ocupação"
        : "Um bloco disponível") +
      '</small></div><div class="executive-stat"><span>Demanda no turno de pico</span><strong>' +
      pct(M.ratio(most.hours, stats.hours), 0) +
      "</strong><small>" +
      most.name +
      ' · participação nas horas alocadas</small></div><div class="executive-stat"><span>Vagas-hora não aproveitadas</span><strong>' +
      number(capacity.wasted) +
      "</strong><small>Lugares vazios durante aulas confirmadas</small></div></section>"
    );
  }
  /* Alocação por ambiente. Com options.detail, cada linha abre os agendamentos
     que compõem o indicador, no mesmo período do card. */
  function fullRanking(f, options = {}) {
    const rows = M.roomStats(data, f)
      .filter((r) => r.status === "ativo")
      .sort((a, b) => b.occupancy - a.occupancy);
    if (!rows.length) return empty("Nenhum ambiente ativo no recorte");
    return (
      '<div class="table-wrap' + (options.scroll ? " table-scroll" : "") +
      '"><table><thead><tr><th>#</th><th>AMBIENTE</th><th>USO</th><th>HORAS</th></tr></thead><tbody>' +
      rows
        .map(
          (r, i) =>
            "<tr" +
            (options.detail
              ? ' role="button" tabindex="0" data-report-kind="room" data-report-value="' +
                esc(r.id) +
                '" data-report-metric="occupancy" data-report-period="' +
                esc(options.detail) +
                '" aria-label="Ver agendamentos de ' +
                esc(r.name) +
                '"'
              : "") +
            "><td>" +
            String(i + 1).padStart(2, "0") +
            "</td><td><strong>" +
            esc(r.name) +
            "</strong><small>" +
            "Unidade" +
            " · Bloco " +
            r.block +
            "</small></td><td>" +
            badge(
              pct(r.occupancy),
              r.occupancy > 85 ? "red" : r.occupancy < 30 ? "gray" : "blue",
            ) +
            "</td><td>" +
            hours(r.used) +
            "</td></tr>",
        )
        .join("") +
      "</tbody></table></div>"
    );
  }
  function performance(f) {
    return '<div class="table-wrap"><table><thead><tr><th>BLOCO</th><th>AULAS</th><th>DOCENTES</th><th>DURAÇÃO MÉDIA</th></tr></thead><tbody>' +
      blockStats(f).map((a) => '<tr><td><strong>' + esc(a.name) + '</strong></td><td>' +
      number(a.bookings) + '</td><td>' + a.teachers +
      '</td><td>' + (a.bookings ? hours(a.hours / a.bookings) : "—") + '</td></tr>').join("") + '</tbody></table></div>';
  }
  function idleTypes(f) {
    const rooms = M.roomStats(data, f).filter((r) => r.status === "ativo");
    const getType = (r) =>
      r.type.startsWith("Laboratório")
        ? "Laboratórios"
        : r.type.startsWith("Oficina")
          ? "Oficinas"
          : r.type === "Sala teórica"
            ? "Salas teóricas"
            : r.type === "Auditório"
              ? "Auditório"
              : "Sala de reunião";
    const map = new Map();
    rooms.forEach((r) => {
      const type = getType(r);
      if (!map.has(type)) map.set(type, { name: type, value: 0, count: 0 });
      const row = map.get(type);
      row.value += r.idle;
      row.count++;
    });
    return [...map.values()].sort((a, b) => b.value - a.value);
  }
  /* Relatório executivo: a página apresenta somente a área de filtros.
     Os blocos analíticos permanecem implementados nas funções acima. */
  function directorReports() {
    return (
      heading(
        "DIREÇÃO · INTELIGÊNCIA DE PLANEJAMENTO",
        "Relatório executivo",
        "Selecione o período, o turno e o docente do recorte.",
      ) + filterBar()
    );
  }
  Object.assign(S.views, {
    "coordenador/relatorios": coordinatorReports,
    "diretor/dashboard": directorDashboard,
    "diretor/relatorios": directorReports,
  });
  function updateTable() {
    const container = document.getElementById("allocation-table-content");
    if (container) container.innerHTML = allocationTable(S.filter());
  }
  document.addEventListener("change", (event) => {
    const key = event.target.dataset.filter;
    if (!key) return;
    const allowed = {
      period: Object.keys(M.periods),
      shift: ["todos", ...data.shifts.map((s) => s.id)],
      teacher: [
        "todos",
        ...data.teachers.map((t) => t.id),
      ],
    };
    if (!allowed[key]?.includes(event.target.value)) return;
    state.filters[state.role][key] = event.target.value;
    state.tablePage = 0;
    state.query = "";
    S.render();
    document
      .querySelector('[data-filter="' + key + '"]')
      ?.focus({ preventScroll: true });
  });
  document.addEventListener("input", (event) => {
    if (event.target.id !== "allocation-search") return;
    const position = event.target.selectionStart;
    state.query = event.target.value;
    state.tablePage = 0;
    updateTable();
    const input = document.getElementById("allocation-search");
    input.focus();
    if (position !== null) input.setSelectionRange(position, position);
  });
  document.addEventListener("click", (event) => {
    const reset = event.target.closest?.("[data-reset-filters]"),
      sort = event.target.closest?.("[data-sort]"),
      page = event.target.closest?.("[data-table-page]");
    if (reset) {
      if (reset.disabled) return;
      state.filters[state.role] = defaults(state.role);
      state.query = "";
      state.tablePage = 0;
      S.render();
    }
    if (sort) {
      if (state.sort === sort.dataset.sort) state.sortDir *= -1;
      else {
        state.sort = sort.dataset.sort;
        state.sortDir = 1;
      }
      state.tablePage = 0;
      updateTable();
    }
    if (page) {
      state.tablePage = Number(page.dataset.tablePage);
      updateTable();
    }
  });
  S.render();
})();
