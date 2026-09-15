(function (global) {
  "use strict";
  const data = SIPAE_DATA.create(),
    M = SIPAE_METRICS;
  const state = {
    role: "coordenador",
    page: "dashboard",
    filters: {
      coordenador: { period: "mes", shift: "todos", teacher: "todos" },
      diretor: { period: "semestre" },
    },
    query: "",
    sort: "date",
    sortDir: 1,
    tablePage: 0,
  };
  const paths = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    chart: "M4 19V5 M4 19h17 M8 15v-4 M13 15V7 M18 15V3",
    calendar: "M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4",
    clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2",
    alert: "M12 3 2 21h20L12 3z M12 9v5 M12 17h.01",
    room: "M4 21V3h12v18 M2 21h20 M16 8h4v13 M11 12h.01",
    people:
      "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-2a7 7 0 0 1 14 0v2 M16 4a4 4 0 0 1 0 8 M18 15a5 5 0 0 1 4 5v1",
    check: "M5 12l4 4L19 6",
    close: "m6 6 12 12 M18 6 6 18",
    arrow: "M5 12h14 M14 7l5 5-5 5",
    download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
    up: "M5 15 10 10l4 4 6-8 M15 6h5v5",
    info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 11v6 M12 7h.01",
    search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6",
    sort: "M8 4v16 M5 7l3-3 3 3 M16 20V4 M13 17l3 3 3-3",
    filter: "M3 5h18 M6 12h12 M9 19h6",
    spark:
      "M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l3 3 M15 15l3 3 M6 18l3-3 M15 9l3-3",
    file: "M5 3h9l5 5v13H5z M14 3v6h5 M9 13h6 M9 17h6",
    refresh:
      "M20 7v5h-5 M4 17v-5h5 M5 7a8 8 0 0 1 13-2l2 3 M4 16l2 3a8 8 0 0 0 13-2",
  };
  const icon = (name, extra = "") =>
    '<svg class="icon ' +
    extra +
    '" viewBox="0 0 24 24" aria-hidden="true"><path d="' +
    (paths[name] || paths.info) +
    '"/></svg>';
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const number = (n, d = 0) =>
    n == null
      ? "—"
      : new Intl.NumberFormat("pt-BR", {
          minimumFractionDigits: d,
          maximumFractionDigits: d,
        }).format(n);
  const pct = (n, d = 1) => number(n, d) + "%";
  const hours = (n) =>
    number(n, n % 1 ? (Number.isInteger(n * 4) ? 2 : 1) : 0) + " h";
  const date = (str, full = false) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: full ? "long" : "short",
    })
      .format(new Date(str + "T12:00:00-03:00"))
      .replace(".", "");
  const time = (n) =>
    String(Math.floor(n)).padStart(2, "0") +
    ":" +
    String(Math.round((n % 1) * 60)).padStart(2, "0");
  const teacher = (id) => data.teachers.find((x) => x.id === id);
  const room = (id) => data.rooms.find((x) => x.id === id);
  const cls = (id) => data.classes.find((x) => x.id === id);
  const shift = (id) => data.shifts.find((x) => x.id === id)?.name || id;
  const initials = (name) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((x) => x[0])
      .slice(0, 2)
      .join("");
  const empty = (
    title = "Sem dados para este recorte",
    detail = "Ajuste os filtros para consultar outro período.",
  ) =>
    '<div class="empty">' +
    icon("calendar") +
    "<strong>" +
    esc(title) +
    "</strong><span>" +
    esc(detail) +
    "</span></div>";
  const badge = (text, tone = "gray") =>
    '<span class="badge ' + tone + '">' + esc(text) + "</span>";
  const statusInfo = {
    confirmada: ["Agendada", "green"],
    concluida: ["Concluída", "blue"],
    pendente: ["Pendente", "amber"],
    aprovada: ["Aprovada", "green"],
    recusada: ["Recusada", "red"],
    cancelada: ["Cancelada", "gray"],
  };
  const statusBadge = (status) =>
    badge(...(statusInfo[status] || [status, "gray"]));
  function card(title, subtitle, body, options = {}) {
    return (
      '<section class="card ' +
      (options.className || "") +
      '"' +
      (options.id ? ' id="' + options.id + '"' : "") +
      ' aria-label="' +
      esc(title) +
      '"><div class="card-head"><div><div class="card-title-line"><h2>' +
      esc(title) +
      "</h2>" +
      (options.count != null
        ? '<span class="count-pill">' + options.count + "</span>"
        : "") +
      "</div>" +
      (subtitle ? "<p>" + esc(subtitle) + "</p>" : "") +
      "</div>" +
      (options.action || "") +
      '</div><div class="card-body">' +
      body +
      "</div>" +
      (options.insight
        ? '<div class="card-foot">' +
          icon("info") +
          "<span>" +
          options.insight +
          "</span></div>"
        : "") +
      "</section>"
    );
  }
  const kpi = (label, value, unit, detail, iconName, tone = "", delta = "") =>
    '<article class="kpi ' +
    tone +
    '" aria-label="' +
    esc(label) +
    '"><div class="kpi-top"><span class="kpi-label">' +
    esc(label) +
    '</span><span class="kpi-icon">' +
    icon(iconName) +
    '</span></div><div class="kpi-value">' +
    value +
    (unit ? "<small>" + esc(unit) + "</small>" : "") +
    '</div><div class="kpi-bottom">' +
    delta +
    "<span>" +
    detail +
    "</span></div></article>";
  const delta = (value, suffix = "p.p.", positiveGood = true) =>
    '<span class="delta ' +
    (value >= 0 === positiveGood ? "" : "down") +
    '">' +
    (value > 0 ? "+" : "") +
    number(value, 1) +
    " " +
    suffix +
    "</span>";
  // options.scroll coloca as barras em uma área com rolagem própria; o eixo
  // permanece fixo abaixo dela.
  function bars(rows, options = {}) {
    if (!rows.length) return empty();
    const max = options.max || 100;
    return (
      (options.scroll
        ? '<div class="scroll-list"' +
          (rows.some((r) => r.detail)
            ? ""
            : ' tabindex="0" role="region" aria-label="' +
              esc(options.scrollLabel || "Lista de indicadores. Role para consultar todos os itens.") +
              '"') +
          ">"
        : "") +
      '<div class="bars">' +
      rows
        .map(
          (r) =>
            '<div class="bar-row"' + (r.detail ? ' role="button" tabindex="0" data-report-kind="' + esc(r.detail.kind) + '" data-report-value="' + esc(r.detail.value) + '" data-report-metric="occupancy" aria-label="Ver agendamentos de ' + esc(r.label || r.name) + '"' : '') + '><div class="bar-label"><span>' +
            esc(r.label || r.name) +
            "</span><strong>" +
            esc(r.display || pct(r.value ?? r.occupancy)) +
            '</strong></div><div class="bar-track" role="img" aria-label="' +
            esc(
              (r.label || r.name) +
                ": " +
                (r.display || pct(r.value ?? r.occupancy)),
            ) +
            '"><div class="bar-fill ' +
            ((r.value ?? r.occupancy) > 85
              ? "critical"
              : (r.value ?? r.occupancy) < 30
                ? "low"
                : "") +
            '" style="width:' +
            Math.min(100, ((r.value ?? r.occupancy) / max) * 100) +
            "%;" +
            (r.color ? "background:" + r.color : "") +
            '"></div></div>' +
            (r.caption ? "<small>" + esc(r.caption) + "</small>" : "") +
            (r.detail ? '<span class="bar-detail-hint">Ver agendamentos ↗</span>' : '') +
            "</div>",
        )
        .join("") +
      "</div>" +
      (options.scroll ? "</div>" : "") +
      (options.axis
        ? '<div class="bar-axis"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>'
        : "")
    );
  }
  function heading(eyebrow, title, description, actions = "") {
    return (
      '<div class="page-heading"><div><span class="eyebrow">' +
      esc(eyebrow) +
      "</span><h1>" +
      title +
      "</h1><p>" +
      esc(description) +
      '</p></div><div class="heading-actions">' +
      actions +
      "</div></div>"
    );
  }
  const reportLink = (role, label = "Ver relatório") =>
    '<a class="button secondary" href="#' +
    role +
    '/relatorios">' +
    icon("chart") +
    esc(label) +
    "</a>";
  const longToday = () => new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(data.today + "T12:00:00"));
  const calendarPill = () =>
    '<div class="date-pill">' + icon("calendar") + esc(longToday()) + "</div>";
  function upcomingBookings() {
    const now = new Date(data.reference);
    const hour = now.getHours() + now.getMinutes() / 60;
    return data.allocations
      .filter((a) => a.status === "confirmada" &&
        (a.date > data.today || (a.date === data.today && a.end > hour)))
      .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  }
  function upcomingQueue(items) {
    if (!items.length) return empty("Nenhuma aula futura agendada", "Novos agendamentos da unidade aparecerão aqui.");
    // Os cartões ficam em uma área com rolagem própria, para o card não crescer.
    return '<div class="scroll-list queue-list">' + items.slice(0, 5).map((a, i) => {
      const person = teacher(a.teacherId), group = cls(a.classId), space = room(a.roomId);
      return '<article class="queue-item"><div class="queue-top"><div class="person-avatar tone-' +
        (i % 3) + '">' + initials(person.name) + '</div><div><div class="queue-title">' +
        esc(a.subject || group.name) + '</div><div class="queue-subtitle">' +
        esc(person.name + " · " + group.code) + '</div></div>' +
        badge(a.date === data.today ? "Hoje" : "Agendada", a.date === data.today ? "blue" : "green") +
        '</div><div class="queue-info"><span>' + icon("room") + esc(space.name) +
        '</span><span>' + icon("calendar") + date(a.date) + '</span><span>' +
        icon("clock") + time(a.start) + "–" + time(a.end) +
        '</span></div><div class="queue-actions"><span>' + group.students +
        ' alunos · Bloco ' + esc(space.block) + '</span><div><button type="button" class="button secondary" data-action="booking-detail" data-id="a:' +
        esc(a.id) + '">' + icon("info") + 'Ver detalhes</button></div></div></article>';
    }).join("") + '</div>';
  }
  function availableRoomsToday() {
    const now = new Date(data.reference),
      earliest = Math.ceil((now.getHours() + now.getMinutes() / 60) * 4) / 4,
      weekday = new Date(data.today + "T12:00:00").getDay();
    const occupied = [
      ...data.allocations.filter((a) => a.status === "confirmada" && a.date === data.today),
      ...(data.externalReservations || []).filter((a) => a.status === "aprovada" && a.date === data.today),
    ];
    return data.rooms.filter((r) => r.status === "ativo" &&
      (!r.createdDate || r.createdDate <= data.today) &&
      (r.workingDays || [1, 2, 3, 4, 5]).includes(weekday)).map((r) => {
      const intervals = occupied.filter((a) => a.roomId === r.id).sort((a, b) => a.start - b.start);
      const slots = data.shifts.flatMap((s) => {
        let cursor = Math.max(s.start, earliest);
        const free = [];
        for (const busy of intervals) {
          if (busy.end <= cursor || busy.start >= s.end) continue;
          if (busy.start > cursor) free.push({ shift: s.name, start: cursor, end: Math.min(busy.start, s.end) });
          cursor = Math.max(cursor, busy.end);
          if (cursor >= s.end) break;
        }
        if (cursor < s.end) free.push({ shift: s.name, start: cursor, end: s.end });
        return free;
      });
      return { ...r, slots };
    }).filter((r) => r.slots.length);
  }
  // A lista fica dentro de uma área com rolagem própria, para o card não crescer
  // com a quantidade de ambientes livres.
  function availableRoomsList(rooms) {
    return rooms.length ? '<div class="scroll-list" tabindex="0" role="region" aria-label="Ambientes disponíveis hoje. Role para consultar todos os ' + rooms.length + ' ambientes."><div class="ranking-list">' + rooms.map((r) =>
      '<div class="rank-row"><span class="kpi-icon">' + icon("room") +
      '</span><div><strong>' + esc(r.name) + '</strong><small>' +
      r.slots.map((slot) => esc(slot.shift) + " · " + time(slot.start) + "–" + time(slot.end)).join("<br>") +
      '</small></div>' + badge(r.capacity + " lugares", "green") + '</div>'
    ).join("") + '</div></div>' : empty("Sem horários livres restantes hoje", "Consulte o calendário para agendar em outro dia.");
  }
  function availableRoomsCard(options = {}) {
    const available = availableRoomsToday();
    return card("Ambientes disponíveis hoje", "Horários livres restantes, por turno", availableRoomsList(available), {
      count: available.length,
      insight: "Disponibilidade calculada a partir do horário de entrada. Ambientes em manutenção não são exibidos.",
      ...options,
    });
  }
  function agenda(items) {
    if (!items.length) return empty("Nenhuma aula agendada hoje", "Os agendamentos da unidade para a data atual aparecerão aqui.");
    return '<div class="table-wrap table-scroll"><table><thead><tr><th>HORÁRIO</th><th>TURMA / DOCENTE</th><th>AMBIENTE</th><th>DETALHES</th></tr></thead><tbody>' +
      items.map((a) => '<tr><td class="time-cell">' + time(a.start) + "–" + time(a.end) +
      '</td><td><strong>' + esc(cls(a.classId).code) + '</strong><small>' +
      esc(teacher(a.teacherId).name) + '</small></td><td><strong>' + esc(room(a.roomId).name) +
      '</strong><small>' + esc(shift(a.shift)) + ' · Bloco ' + esc(room(a.roomId).block) +
      '</small></td><td><button type="button" class="text-button" data-action="booking-detail" data-id="a:' + esc(a.id) +
      '">Ver detalhes</button></td></tr>').join("") + '</tbody></table></div>';
  }
  function coordinatorDashboard() {
    const f = { start: data.today, end: data.today },
      stats = M.overview(data, f),
      todayItems = M.allocations(data, f).sort((a, b) => a.start - b.start || room(a.roomId).name.localeCompare(room(b.roomId).name)),
      upcoming = upcomingBookings(),
      // Ambientes sem nenhuma ocupação no dia não entram no comparativo.
      rows = stats.rooms
        .filter((r) => r.status === "ativo" && r.occupancy > 0)
        .sort((a, b) => b.occupancy - a.occupancy);
    const currentHour = new Date(data.reference).getHours(),
      greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";
    return heading(
      "COORDENAÇÃO", greeting + ", " + esc(data.managementProfiles.coordenador.name.split(" ")[0]),
      "Acompanhe as aulas da unidade e consulte os horários disponíveis hoje.",
      calendarPill() + reportLink("coordenador"),
    ) + '<div class="kpi-grid">' +
      kpi("Aulas agendadas hoje", number(todayItems.length), "", "Agendamentos da unidade na data atual", "calendar") +
      kpi("Docentes com aulas hoje", number(new Set(todayItems.map((a) => a.teacherId)).size), "", "Profissionais com aulas na unidade", "people") +
      kpi("Ocupação da unidade hoje", number(stats.occupancy, 1), "%", hours(stats.used) + " de " + hours(stats.available) + " disponíveis", "chart") +
      kpi("Horas de aula hoje", number(stats.hours, 1), "h", "Total de aulas agendadas para hoje", "clock") +
      '</div><div class="dashboard-grid"><div class="stack">' +
      card("Próximos agendamentos da unidade", "Aulas em andamento e futuras, em ordem de data e horário", upcomingQueue(upcoming), {
        count: upcoming.length,
        insight: "Exibindo até cinco agendamentos. Consulte os detalhes de cada reserva.",
      }) +
      card("Agenda de hoje", longToday() + " · Unidade", agenda(todayItems), { count: todayItems.length }) +
      '</div><div class="stack">' +
      availableRoomsCard() +
      card("Ocupação por ambiente", "Data atual · " + date(data.today, true),
        rows.length
          ? bars(rows.map((r) => ({ ...r, detail: { kind: "room", value: r.id }, caption: hours(r.used) + " de " + hours(r.available) + " disponíveis" })), {
              axis: true,
              scroll: true,
              scrollLabel: "Ocupação por ambiente. Role para consultar todos os " + rows.length + " ambientes.",
            })
          : empty("Nenhum ambiente ocupado hoje", "Os ambientes com aulas ou eventos no dia aparecerão aqui."), {
        count: rows.length,
        insight: rows.length ? "Selecione um ambiente para ver os agendamentos de hoje. " + esc(rows[0].name) + " concentra " + hours(rows[0].used) + " de uso." : "Nenhuma ocupação registrada para hoje.",
      }) + '</div></div>';
  }
  const views = { "coordenador/dashboard": coordinatorDashboard };
  function toast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 6500);
  }
  function filter() {
    return state.role === "coordenador"
      ? { ...state.filters.coordenador }
      : { ...state.filters.diretor };
  }
  const menus = {
    docente: [
      ["dashboard", "Painel do Docente", "grid"],
      ["encontrar", "Encontrar sala", "search"],
      ["reservas", "Minhas Reservas", "file"],
      ["calendario", "Calendário", "calendar"],
    ],
    coordenador: [
      ["dashboard", "Visão geral", "grid"],
      ["encontrar", "Encontrar sala", "search"],
      ["salas", "Salas", "room"],
      ["docentes", "Docentes", "people"],
      ["relatorios", "Relatórios", "chart"],
      ["calendario", "Calendário", "calendar"],
    ],
    diretor: [
      ["dashboard", "Visão geral", "grid"],
      ["encontrar", "Encontrar sala", "search"],
      ["calendario", "Calendário Geral", "calendar"],
      ["salas", "Salas", "room"],
      ["docentes", "Docentes", "people"],
      ["externas", "Reservas Externas", "file"],
      ["relatorios", "Relatório executivo", "chart"],
    ],
  };
  function render() {
    const parts = location.hash.replace(/^#/, "").split("/");
    const login = !parts[0] || parts[0] === "login";
    document.body.classList.toggle("login-mode", login);
    document.body.dataset.page = login ? "login" : (parts[1] || "dashboard");
    if (login) {
      closeMobileMenu();
      state.page = "login";
      document.title = "SIPAE · Entrar";
      document.getElementById("main").innerHTML = views.login
        ? views.login()
        : "";
      return;
    }
    state.role = Object.keys(menus).includes(parts[0]) ? parts[0] : "docente";
    state.page =
      parts[1] === "perfil" ||
      menus[state.role].some((p) => p[0] === parts[1])
        ? parts[1]
        : "dashboard";
    document.body.classList.toggle("docente-mode", state.role === "docente");
    document
      .getElementById("avatar")
      .setAttribute(
        "href",
        "#" + state.role + "/perfil",
      );
    document.getElementById("role-switch").value = state.role;
    const profile =
      state.role === "docente"
        ? data.teachers.find((t) => t.id === "t4").name
        : data.managementProfiles[state.role].name;
    document.getElementById("profile-name").textContent = profile;
    document.getElementById("profile-role").textContent =
      state.role === "docente"
        ? "Docente"
        : state.role === "coordenador"
          ? "Coordenação"
          : "Direção da unidade";
    document.getElementById("avatar").textContent = initials(profile);
    const label =
      state.page === "perfil"
        ? "Meu Perfil"
        : menus[state.role].find((p) => p[0] === state.page)[1];
    document.getElementById("page-crumb").textContent = label;
    document.title = "SIPAE · " + label;
    document.getElementById("navigation").innerHTML =
      menus[state.role]
        .map(
          ([id, label, name]) =>
            '<a href="#' +
            state.role +
            "/" +
            id +
            '" class="' +
            (state.page === id ? "active" : "") +
            '"' +
            (state.page === id ? ' aria-current="page"' : "") +
            ">" +
            icon(name) +
            label +
            "</a>",
        )
        .join("");
    const view = views[state.role + "/" + state.page];
    document.getElementById("main").innerHTML = view ? view() : "";
    global.SIPAE?.U?.resizeColumnCharts?.();
    document.querySelector(".brand").href = "#" + state.role + "/dashboard";
    closeMobileMenu();
    if (global.SIPAE?.P?.afterRender) global.SIPAE.P.afterRender();
  }
  document.addEventListener("click", (event) => {
    const exp = event.target.closest?.("[data-export]");
    if (exp) {
      toast(
        "Exportação " +
          exp.dataset.export +
          " simulada. Os dados exibidos respeitam os filtros selecionados.",
      );
      return;
    }
  });
  document.getElementById("role-switch").addEventListener("change", (event) => {
    location.hash =
      event.target.value +
      "/" +
      (state.page === "perfil" || menus[event.target.value].some((p) => p[0] === state.page)
        ? state.page
        : "dashboard");
  });
  function closeMobileMenu(returnFocus = false) {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.remove("open");
    sidebar.removeAttribute("role");
    sidebar.removeAttribute("aria-modal");
    document.querySelector(".workspace").inert = false;
    document.getElementById("sidebar-backdrop").hidden = true;
    document.getElementById("menu-toggle").setAttribute("aria-expanded", "false");
    document.body.classList.remove("sidebar-open");
    if (returnFocus) document.getElementById("menu-toggle").focus();
  }
  document.getElementById("menu-toggle").addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    const open = !sidebar.classList.contains("open");
    if (!open) return closeMobileMenu(true);
    sidebar.classList.add("open");
    sidebar.setAttribute("role", "dialog");
    sidebar.setAttribute("aria-modal", "true");
    document.querySelector(".workspace").inert = true;
    document.getElementById("sidebar-backdrop").hidden = false;
    document.getElementById("menu-toggle").setAttribute("aria-expanded", "true");
    document.body.classList.add("sidebar-open");
    document.getElementById("sidebar-close").focus();
  });
  for (const id of ["sidebar-close", "sidebar-backdrop"])
    document.getElementById(id).addEventListener("click", () => closeMobileMenu(true));
  document.addEventListener("keydown", (event) => {
    if (!document.body.classList.contains("sidebar-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMobileMenu(true);
    }
    if (event.key === "Tab") {
      const items = [...document.getElementById("sidebar").querySelectorAll('a[href], button:not([disabled])')];
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 700) closeMobileMenu();
  });
  window.addEventListener("hashchange", () => {
    state.query = "";
    state.tablePage = 0;
    render();
    window.scrollTo(0, 0);
  });
  global.SIPAE = {
    data,
    M,
    state,
    views,
    render,
    filter,
    toast,
    U: {
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
      initials,
      empty,
      badge,
      statusBadge,
      card,
      kpi,
      delta,
      bars,
      heading,
      reportLink,
      availableRoomsCard,
    },
  };
  render();
})(globalThis);
