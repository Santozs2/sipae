(function () {
  "use strict";
  const S = SIPAE,
    { data, M, state, U } = S,
    {
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
      bars,
      heading,
    } = U;
  const today = data.today,
    teacherId = "t4";
  const addDays = (value, count) => {
    const day = new Date(value + "T12:00Z");
    day.setUTCDate(day.getUTCDate() + count);
    return SIPAE_DATA.dateString(day);
  };
  const monthLabel = (value = today) =>
    new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value + "T12:00Z"));
  const P = {
    today,
    teacherId,
    local: {},
    draft: {},
    notificationRead: new Set(),
  };
  const area = () => "Unidade";
  const field = (name, label, input, full = false) =>
    '<div class="field' +
    (full ? " full" : "") +
    '"><label for="' +
    name +
    '">' +
    label +
    "</label>" +
    input +
    "</div>";
  const input = (name, value = "", type = "text", extra = "") =>
    '<input id="' +
    name +
    '" name="' +
    name +
    '" type="' +
    type +
    '" value="' +
    esc(value) +
    '" ' +
    extra +
    ">";
  const options = (rows, value) =>
    rows
      .map(
        ([v, label]) =>
          '<option value="' +
          esc(v) +
          '"' +
          (String(v) === String(value) ? " selected" : "") +
          ">" +
          esc(label) +
          "</option>",
      )
      .join("");
  const select = (name, rows, value, extra = "") =>
    '<select id="' +
    name +
    '" name="' +
    name +
    '" ' +
    extra +
    ">" +
    options(rows, value) +
    "</select>";
  const textArea = (name, value = "", extra = "") =>
    '<textarea id="' +
    name +
    '" name="' +
    name +
    '" maxlength="400" ' +
    extra +
    ">" +
    esc(value) +
    "</textarea>";
  const button = (label, action, value = "", tone = "primary") =>
    '<button type="button" class="button ' +
    tone +
    '" data-action="' +
    action +
    '" data-id="' +
    esc(value) +
    '">' +
    label +
    "</button>";
  const link = (label, page, tone = "primary") =>
    '<a class="button ' +
    tone +
    '" href="#' +
    state.role +
    "/" +
    page +
    '">' +
    label +
    "</a>";
  const scopeArea = () => "todas";
  const roomList = () => data.rooms;
  function local() {
    const key = state.role + "/" + state.page;
    if (!P.local[key])
      P.local[key] = {
        query: "",
        status: "todos",
        block: "todos",
        area: "todas",
        sort: "name",
        period: "mes",
        room: "todos",
        teacher: "todos",
        page: 0,
        view: state.role === "docente" ? "month" : "week",
        anchor: state.role === "docente" ? today.slice(0, 7) + "-01" : today,
      };
    return P.local[key];
  }
  function search(label) {
    return (
      '<label class="search-box">' +
      icon("search") +
      '<span class="sr-only">' +
      label +
      '</span><input type="search" data-local="query" value="' +
      esc(local().query) +
      '" placeholder="' +
      label +
      '"></label>'
    );
  }
  function localSelect(name, label, rows) {
    if (["room", "block", "teacher"].includes(name)) return localMultiSelect(name, label, rows);
    return (
      '<label class="sr-only" for="local-' +
      name +
      '">' +
      label +
      "</label>" +
      select("local-" + name, rows, local()[name], 'data-local="' + name + '"')
    );
  }
  const selectedValues = (value) => Array.isArray(value) ? value : value && value !== "todos" ? [value] : [];
  const filterMatches = (value, item) => !selectedValues(value).length || selectedValues(value).includes(item);
  function localMultiSelect(name, label, rows) {
    const selected = selectedValues(local()[name]), choices = rows.filter(([id]) => id !== "todos");
    const summary = !selected.length ? rows[0][1] : selected.length === 1
      ? choices.find(([id]) => id === selected[0])?.[1] || label
      : selected.length + " " + ({ room: "salas", block: "blocos", teacher: "docentes" }[name]);
    return '<details class="multi-filter" id="local-' + name + '"><summary aria-label="' + esc(label) + '">' +
      esc(summary) + '</summary><div class="multi-filter-options" role="group" aria-label="' + esc(label) + '">' +
      rows.map(([id, text]) => '<label><input type="checkbox" data-local-multi="' + name + '" value="' + esc(id) + '"' +
        ((id === "todos" ? !selected.length : selected.includes(id)) ? ' checked' : '') + '><span>' + esc(text) + '</span></label>').join("") +
      '</div></details>';
  }
  function errorBox() {
    return '<p class="form-error" role="alert" hidden></p>';
  }
  function formActions(label = "Salvar", cancel = true) {
    return (
      errorBox() +
      '<div class="form-actions">' +
      (cancel ? button("Cancelar", "close", "", "secondary") : "") +
      '<button type="submit" class="button primary">' +
      label +
      "</button></div>"
    );
  }
  function ownAllocations(f = { period: "mes" }) {
    return M.allocations(data, { ...f, teacher: teacherId });
  }
  function reservations() {
    const items = data.allocations
      .filter((a) => a.teacherId === teacherId)
      .map((a) => ({
        ...a,
        key: "a:" + a.id,
        displayStatus:
          a.status === "cancelada"
            ? "cancelada"
            : a.date < today
              ? "concluida"
              : "confirmada",
      }));
    for (const r of data.requests.filter(
      (r) => r.teacherId === teacherId && ["confirmada", "aprovada", "cancelada"].includes(r.status),
    )) {
      if (r.allocationId && items.some((a) => a.id === r.allocationId))
        continue;
      items.push({
        ...r,
        key: "s:" + r.id,
        displayStatus: r.status === "cancelada" ? "cancelada" : r.date < today ? "concluida" : "confirmada",
      });
    }
    return items.sort(
      (a, b) => b.date.localeCompare(a.date) || a.start - b.start,
    );
  }
  function bookingBadge(status) {
    return status === "confirmada"
      ? badge("Confirmada", "green")
      : status === "concluida"
        ? badge("Concluída", "amber")
        : statusBadge(status);
  }
  function login() {
    let remembered = "docente";
    try {
      remembered = localStorage.getItem("sipae-demo-role") || "docente";
    } catch {}
    return (
      `<div class="login-layout">
        <aside class="login-story" aria-label="Sobre o SIPAE">
          <div class="login-story-brand"><span class="login-logo">SENAI</span><span class="login-story-brand-name">SIPAE<small>GESTÃO DE ESPAÇOS</small></span></div>
          <div class="login-story-copy"><span class="login-eyebrow">O ENSINO COMEÇA COM UM BOM PLANEJAMENTO</span><h2>Mais espaço <br>para <em>ensinar.</em></h2><p>Planeje aulas, encontre ambientes e acompanhe seus agendamentos em um só lugar.</p></div>
          <div class="login-illustration" aria-hidden="true">
            <div class="login-visual-orbit"></div>
            <div class="login-agenda"><div class="login-agenda-top"><span><i></i> Sua agenda</span><b>•••</b></div><div class="login-agenda-head"><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span></div><div class="login-agenda-grid"><span class="login-agenda-event event-one"><b>Aula prática</b><i>Laboratório</i></span><span class="login-agenda-event event-two"><b>Projeto</b><i>Sala de aula</i></span><span class="login-agenda-event event-three"><b>Oficina</b><i>Laboratório</i></span><span class="login-agenda-event event-four"><b>Aula teórica</b><i>Sala de aula</i></span></div></div>
            <div class="login-space-note"><span class="login-space-icon">` + icon("calendar") + `</span><span><strong>Tudo no seu lugar.</strong><small>Uma agenda. Muitas possibilidades.</small></span></div>
          </div>
          <div class="login-story-footer"><span>SENAI São José do Rio Preto</span><span class="login-story-line"></span></div>
        </aside>
        <section class="login-box" aria-labelledby="login-title"><div class="login-brand"><span class="login-form-kicker">BEM-VINDO DE VOLTA</span><h1 id="login-title">Entre no SIPAE<span>.</span></h1><p>Seu próximo planejamento começa aqui.</p></div><form id="login-form" data-form="login">` +
      field(
        "login-nif",
        "Digite seu NIF",
        input(
          "login-nif",
          "123456789",
          "text",
          'required inputmode="numeric" maxlength="9" autocomplete="username"',
        ),
      ) +
      field(
        "login-password",
        "Senha",
        '<div class="password-wrap">' +
          input(
            "login-password",
            "sipae2026",
            "password",
            'required autocomplete="current-password"',
          ) +
          '<button type="button" class="icon-button" data-action="toggle-password" aria-label="Mostrar senha">◉</button></div>',
      ) +
      field(
        "login-role",
        "Perfil de demonstração",
        select(
          "login-role",
          [
            ["docente", "Docente"],
            ["coordenador", "Coordenador"],
            ["diretor", "Diretor"],
          ],
          remembered,
        ),
      ) +
      '<div class="login-tools"><label class="check-label"><input type="checkbox" name="remember"> Lembrar perfil</label><button type="button" class="text-button" data-action="forgot-password">Esqueceu a senha?</button></div>' +
      errorBox() +
      '<button class="button primary" type="submit">Entrar no SIPAE<span aria-hidden="true">↗</span></button></form><div class="login-demo"><span class="login-demo-mark" aria-hidden="true">i</span><div><strong>Explore a versão de demonstração</strong><p>NIF: 123456789 · senha: sipae2026<br>Escolha o perfil para conhecer o protótipo.</p></div></div><p class="login-form-footer">Sistema Integrado de Planejamento<br>e Agendamento de Espaços</p></section></div>'
    );
  }
  function miniCalendar(anchor = today) {
    const month = anchor.slice(0, 7),
      first = new Date(month + "-01T12:00Z"),
      offset = first.getUTCDay(),
      count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate(),
      counts = data.allocations
        .filter((a) => a.teacherId === teacherId && a.status === "confirmada")
        .reduce((map, a) => map.set(a.date, (map.get(a.date) || 0) + 1), new Map()),
      bookedDays = new Set(counts.keys());
    let html =
      '<div class="mini-month">' +
      ["D", "S", "T", "Q", "Q", "S", "S"]
        .map((x) => "<span>" + x + "</span>")
        .join("");
    for (let i = 0; i < offset; i++) html += "<span></span>";
    for (let n = 1; n <= count; n++) {
      const d = month + "-" + String(n).padStart(2, "0"),
        has = bookedDays.has(d);
      html +=
        '<button type="button" class="' +
        (d === today ? "today " : "") +
        (has ? "has-booking" : "") +
        '" data-action="teacher-day" data-id="' +
        d +
        '" aria-label="' +
        (has ? counts.get(d) + (counts.get(d) === 1 ? " reserva em " : " reservas em ") : "Sem reservas em ") +
        date(d) +
        '">' +
        n +
        "</button>";
    }
    return html + "</div>";
  }
  function teacherDashboard() {
    const current = teacher(teacherId),
      upcoming = data.allocations
        .filter((a) => a.teacherId === teacherId && a.status === "confirmada" && a.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)
        .slice(0, 4);
    const f = local(),
      anchor = f.anchor || today.slice(0, 7) + "-01",
      dayView = f.view === "day",
      own = data.allocations.filter(
        (a) => a.teacherId === teacherId && a.status === "confirmada",
      ),
      cardCount = dayView
        ? own.filter((a) => a.date === anchor).length
        : own.filter((a) => a.date.slice(0, 7) === anchor.slice(0, 7)).length;
    const creditMonth = f.creditMonth || today.slice(0, 7);
    const credits = M.disciplineCredits(data, teacherId, creditMonth);
    return (
      heading(
        "DOCENTE · TECNOLOGIA DA INFORMAÇÃO",
        (new Date(data.reference).getHours() < 12 ? "Bom dia" : new Date(data.reference).getHours() < 18 ? "Boa tarde" : "Boa noite") + ", " + esc(current.name.split(" ")[0]),
        "Suas aulas, reservas e ambientes em um só lugar.",
        link(icon("calendar") + "Ver calendário", "calendario", "secondary") +
          link("Minhas reservas", "reservas", "secondary") +
          button("+ Nova reserva", "booking-new"),
      ) +
      '<div class="teacher-dashboard-grid">' +
      card(
        "Próximas aulas",
        "Agendamentos a partir de " + date(today) + " · dados de demonstração",
        upcoming.length
          ? '<div class="upcoming-lessons">' +
              upcoming
                .map(
                  (a) =>
                    '<article class="lesson-item"><div class="lesson-date"><strong>' +
                    a.date.slice(8) +
                    '</strong><span>' +
                    new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(new Date(a.date + "T12:00Z")) +
                    '</span></div><div class="lesson-content"><span class="lesson-time">' +
                    time(a.start) +
                    "–" +
                    time(a.end) +
                    '</span><strong>' +
                    esc(a.subject || cls(a.classId).name) +
                    '</strong><small>' +
                    esc(cls(a.classId).code + " · " + room(a.roomId).name) +
                    '</small>' +
                    button("Ver detalhes da reserva", "booking-detail", "a:" + a.id, "secondary compact lesson-detail") +
                    '</div></article>',
                )
                .join("") +
              "</div>"
          : empty(
              "Nenhuma aula futura agendada",
              "Agende uma aula para acompanhar seus próximos horários aqui.",
            ),
      ) +
      card(
        "Calendário de reservas",
        dayView
          ? "Ambientes e horários reservados no dia"
          : "Selecione um dia para consultar suas reservas",
        '<div class="calendar-toolbar compact"><div><button type="button" class="button secondary" data-action="calendar-prev" aria-label="' +
          (dayView ? "Dia anterior" : "Mês anterior") +
          '">‹</button><h2>' +
          esc(
            dayView
              ? date(anchor) + (anchor === today ? " · hoje" : "")
              : monthLabel(anchor),
          ) +
          '</h2><button type="button" class="button secondary" data-action="calendar-next" aria-label="' +
          (dayView ? "Próximo dia" : "Próximo mês") +
          '">›</button></div><div><button type="button" class="button ' +
          (dayView ? "primary" : "secondary") +
          '" data-action="calendar-today" aria-pressed="' + dayView + '">Hoje</button>' +
          '<button type="button" class="button ' +
          (dayView ? "secondary" : "primary") +
          '" data-action="calendar-month" aria-pressed="' + !dayView + '">Mês</button></div></div>' +
          (dayView
            ? '<div class="calendar-scroll" tabindex="0" role="region" aria-label="Reservas do dia. Role horizontalmente para consultar todos os turnos.">' +
              dayGrid(true) +
              "</div>"
            : miniCalendar(anchor)) +
          '<div class="reservation-card-footer">' +
          link("Ver todas as reservas", "reservas", "secondary compact") +
          "</div>",
        {
          count: cardCount,
          insight: dayView
            ? "Selecione uma reserva para abrir os detalhes. Use as setas para consultar outros dias."
            : "Os dias marcados possuem aulas agendadas. Selecione um dia para abrir os detalhes.",
        },
      ) +
      card(
        "Horas por disciplina",
        "Créditos mensais · realizadas / carga do mês",
        '<label class="credit-month" for="credit-month">Mês de referência' +
          input(
            "credit-month",
            creditMonth,
            "month",
            'data-local="creditMonth"',
          ) +
          '</label><div class="credit-list">' +
          credits
            .map(
              (d) =>
                '<article class="discipline-credit" data-discipline="' +
                esc(d.id) +
                '"><div class="bar-label"><strong>' +
                esc(d.name) +
                '</strong><span class="credit-ratio">' +
                number(d.realized, d.realized % 1 ? 2 : 0) +
                "h / " +
                number(d.monthlyHours) +
                'h</span></div><div class="credit-track" aria-hidden="true"><i style="width:' +
                Math.min(100, M.ratio(d.realized, d.monthlyHours)) +
                '%"></i><b style="width:' +
                Math.min(
                  100 - M.ratio(d.realized, d.monthlyHours),
                  M.ratio(d.scheduled, d.monthlyHours),
                ) +
                '%"></b></div><div class="credit-detail"><span>' +
                hours(d.realized) +
                " realizadas</span><span>" +
                hours(d.scheduled) +
                " agendadas</span><strong>" +
                hours(d.remaining) +
                " disponíveis</strong></div></article>",
            )
            .join("") +
          "</div>",
        {
          className: "span-full",
          insight:
            "Agendamentos confirmados reservam créditos; cancelamentos liberam o saldo. Horas realizadas são simuladas pela data da aula.",
        },
      ) +
      "</div>"
    );
  }
  function myReservations() {
    const f = local();
    let list = reservations().filter(
      (r) =>
        (f.period === "todos" || M.inRange(r.date, { period: f.period })) &&
        (f.status === "todos" || r.displayStatus === f.status) &&
        filterMatches(f.room, r.roomId) &&
        [room(r.roomId).name, cls(r.classId).code, cls(r.classId).name, r.id]
          .join(" ")
          .toLowerCase()
          .includes(f.query.toLowerCase()),
    );
    const total = list.length,
      size = 8,
      pages = Math.max(1, Math.ceil(total / size));
    f.page = Math.min(f.page, pages - 1);
    list = list.slice(f.page * size, f.page * size + size);
    return (
      heading(
        "DOCENTE",
        "Minhas Reservas",
        "Consulte, acompanhe ou cancele seus agendamentos.",
        button("+ Nova reserva", "booking-new"),
      ) +
      '<div class="page-toolbar">' +
      search("Buscar reserva…") +
      localSelect("status", "Status", [
        ["todos", "Todos os status"],
        ["confirmada", "Confirmada"],
        ["concluida", "Concluída"],
        ["cancelada", "Cancelada"],
      ]) +
      localSelect("room", "Ambiente", [
        ["todos", "Todos os ambientes"],
        ...roomList().map((r) => [r.id, r.name]),
      ]) +
      localSelect("period", "Período", [
        ["mes", monthLabel()],
        ["semana", "Semana atual"],
        ["semestre", "Últimos seis meses"],
        ["todos", "Todos os registros"],
      ]) +
      "</div>" +
      card(
        "Histórico de reservas",
        total + " registros encontrados",
        '<div class="table-wrap"><table><thead><tr><th>ID</th><th>AMBIENTE</th><th>DATA</th><th>INÍCIO</th><th>FIM</th><th>TURMA</th><th>STATUS</th><th>AÇÕES</th></tr></thead><tbody>' +
          list
            .map(
              (r) =>
                "<tr><td>" +
                esc(r.id) +
                "</td><td><strong>" +
                esc(room(r.roomId).name) +
                "</strong></td><td>" +
                date(r.date) +
                "</td><td>" +
                time(r.start) +
                "</td><td>" +
                time(r.end) +
                "</td><td>" +
                esc(cls(r.classId).code) +
                "</td><td>" +
                bookingBadge(r.displayStatus) +
                "</td><td>" +
                button(
                  "Ver detalhes da reserva",
                  "booking-detail",
                  r.key,
                  "secondary compact",
                ) +
                "</td></tr>",
            )
            .join("") +
          "</tbody></table></div>" +
          (total ? "" : empty("Nenhuma reserva encontrada")) +
          '<div class="pagination"><span>' +
          total +
          " registros · página " +
          (f.page + 1) +
          " de " +
          pages +
          '</span><div><button type="button" data-local-page="' +
          (f.page - 1) +
          '"' +
          (!f.page ? " disabled" : "") +
          '>Anterior</button><button type="button" data-local-page="' +
          (f.page + 1) +
          '"' +
          (f.page >= pages - 1 ? " disabled" : "") +
          ">Próxima</button></div></div>",
      )
    );
  }
  function bookingForm(draft = {}, modal = false) {
    const role = state.role,
      t = role === "docente" ? teacherId : draft.teacherId || teacherId;
    const rooms = roomList(),
      classes = data.classes;
    return (
      '<form data-form="booking" class="booking-form">' +
      (role !== "docente"
        ? '<div class="form-grid">' +
          field(
            "booking-teacher",
            "Docente",
            select(
              "booking-teacher",
              data.teachers
                .filter(
                  (t) => t.status !== "inativo",
                )
                .map((t) => [t.id, t.name]),
              t,
            ),
            "full",
          ) +
          "</div>"
        : "") +
      '<div class="form-grid">' +
      field(
        "booking-room",
        "Selecionar sala",
        select(
          "booking-room",
          rooms.map((r) => [
            r.id,
            r.name +
              " · " +
              r.capacity +
              " lugares" +
              (r.status !== "ativo" ? " · Manutenção" : ""),
          ]),
          draft.roomId || "r3",
        ),
        "full",
      ) +
      field(
        "booking-date",
        "Data da reserva",
        input(
          "booking-date",
          draft.date || today,
          "date",
          'required min="' + today + '"',
        ),
      ) +
      field(
        "booking-class",
        "Turma solicitante",
        select(
          "booking-class",
          classes.map((c) => [c.id, c.code + " · " + c.name]),
          draft.classId || "c3",
        ),
      ) +
      field(
        "booking-start",
        "Horário de início",
        input(
          "booking-start",
          draft.start != null ? time(draft.start) : "13:00",
          "time",
          'required step="900"',
        ),
      ) +
      field(
        "booking-end",
        "Horário de fim",
        input(
          "booking-end",
          draft.end != null ? time(draft.end) : "16:00",
          "time",
          'required step="900"',
        ),
      ) +
      (role === "docente"
        ? field(
            "booking-subject",
            "Disciplina",
            select(
              "booking-subject",
              M.disciplineCredits(data, teacherId).map((d) => [d.id, d.name]),
              draft.disciplineId || "",
              "required",
            ),
            true,
          ) +
          '<div id="discipline-balance" class="booking-credit full" role="status"></div>'
        : field(
            "booking-subject",
            "Disciplina",
            input(
              "booking-subject",
              draft.subject || "Programação Web",
              "text",
              'required maxlength="100"',
            ),
          ) +
          field(
            "booking-repeat",
            "Recorrência",
            select(
              "booking-repeat",
              [
                ["1", "Única"],
                ["2", "Semanal · 2 semanas"],
                ["4", "Semanal · 4 semanas"],
              ],
              "1",
            ),
          )) +
      field(
        "booking-note",
        "Observações e recursos necessários",
        textArea(
          "booking-note",
          draft.note || "",
          'placeholder="Descreva os recursos necessários para a aula."',
        ),
        "full",
      ) +
      "</div>" +
      errorBox() +
      '<div class="form-actions">' +
      (modal
        ? button("Cancelar", "close", "", "secondary")
        : link("Sair da reserva", "reservas", "secondary")) +
      '<button class="button primary" type="submit">Confirmar reserva</button></div></form>'
    );
  }
  function availability(roomId = "r3", day = today) {
    const space = room(roomId);
    if (!space) return empty();
    if (space.status !== "ativo")
      return empty("Ambiente em manutenção", "Selecione outro ambiente.");
    const bookings = allCalendarEvents().filter(
      (a) => a.roomId === roomId && a.date === day,
    );
    return (
      '<p class="visible-summary">' +
      esc(space.name) +
      " · " +
      date(day) +
      "</p>" +
      data.shifts
        .map((s) => {
          const items = bookings.filter(
            (a) => a.start < s.end && a.end > s.start,
          );
          return (
            '<div class="availability-item ' +
            (!items.length ? "free" : "") +
            '"><div><strong>' +
            time(s.start) +
            "–" +
            time(s.end) +
            "</strong>" +
            badge(
              items.length ? "Ocupado" : "Livre",
              items.length ? "gray" : "green",
            ) +
            "</div><p>" +
            (items.length
              ? items
                  .map(
                    (a) =>
                      esc(a.title) + " · " + time(a.start) + "–" + time(a.end),
                  )
                  .join("<br>")
              : "Disponível para solicitação") +
            "</p></div>"
          );
        })
        .join("") +
      '<p class="role-note">A disponibilidade é validada novamente ao confirmar.</p>'
    );
  }
  function profile() {
    const t = teacher(teacherId),
      all = ownAllocations({ period: "semestre" }),
      month = ownAllocations();
    return (
      heading(
        "DOCENTE",
        "Perfil do Docente",
        "Seus dados de cadastro e histórico de reservas.",
      ) +
      '<div class="profile-grid">' +
      card(
        "",
        "",
        '<div class="profile-summary"><div class="profile-picture">' +
          initials(t.name) +
          "</div><h2>" +
          esc(t.name) +
          '</h2><p>Docente</p><div class="profile-details"><div><span>E-MAIL</span><strong>' +
          esc(t.email) +
          "</strong></div><div><span>TELEFONE</span><strong>" +
          esc(t.phone) +
          "</strong></div><div><span>MATRÍCULA · NIF</span><strong>" +
          esc(t.nif) +
          "</strong></div></div></div>",
      ) +
      card(
        "Informações de cadastro",
        "Atualize seus contatos e preferências.",
        '<form data-form="profile"><div class="form-grid">' +
          field(
            "profile-fullname",
            "Nome completo",
            input(
              "profile-fullname",
              t.name,
              "text",
              'required minlength="3" maxlength="80"',
            ),
          ) +
          field(
            "profile-email",
            "E-mail institucional",
            input(
              "profile-email",
              t.email,
              "email",
              'required maxlength="120"',
            ),
          ) +
          field(
            "profile-phone",
            "Telefone de contato",
            input("profile-phone", t.phone, "tel", 'required maxlength="25"'),
          ) +
          field(
            "profile-subjects",
            "Matérias ministradas",
            input(
              "profile-subjects",
              t.disciplines.join(", "),
              "text",
              "readonly",
            ),
            "full",
          ) +
          field(
            "profile-schedule",
            "Horário de aula",
            select(
              "profile-schedule",
              [
                ["integral", "Integral"],
                ["manha", "Manhã"],
                ["tarde", "Tarde"],
                ["noite", "Noite"],
              ],
              t.schedule,
            ),
            "full",
          ) +
          "</div>" +
          formActions("Salvar alterações", false) +
          "</form>",
      ) +
      '</div><div class="sub-grid">' +
      kpi(
        "Reservas nos últimos seis meses",
        number(all.length),
        "",
        "Aulas confirmadas no período de " + M.periods.semestre.label,
        "calendar",
      ) +
      kpi(
        "Reservas neste mês",
        number(month.length),
        "",
        month.filter((a) => a.date < today).length + " aulas já realizadas",
        "file",
      ) +
      "</div>"
    );
  }
  function managementProfile() {
    const account = data.managementProfiles[state.role],
      isDirector = state.role === "diretor";
    return (
      heading(
        isDirector ? "DIREÇÃO" : "COORDENAÇÃO",
        isDirector ? "Perfil do Diretor" : "Perfil do Coordenador",
        "Atualize seus dados de contato e consulte suas informações de cadastro.",
      ) +
      '<div class="profile-grid">' +
      card(
        "",
        "",
        '<div class="profile-summary"><div class="profile-picture">' +
          initials(account.name) +
          "</div><h2>" +
          esc(account.name) +
          "</h2><p>" +
          esc(account.roleLabel) +
          '</p><div class="profile-details"><div><span>E-MAIL</span><strong>' +
          esc(account.email) +
          "</strong></div><div><span>TELEFONE</span><strong>" +
          esc(account.phone) +
          "</strong></div><div><span>MATRÍCULA · NIF</span><strong>" +
          esc(account.nif) +
          "</strong></div></div></div>",
      ) +
      card(
        "Informações de cadastro",
        "Atualize seus dados de contato.",
        '<form data-form="management-profile"><div class="form-grid">' +
          field(
            "profile-fullname",
            "Nome completo",
            input(
              "profile-fullname",
              account.name,
              "text",
              'required minlength="3" maxlength="80"',
            ),
          ) +
          field(
            "profile-email",
            "E-mail institucional",
            input(
              "profile-email",
              account.email,
              "email",
              'required maxlength="120"',
            ),
          ) +
          field(
            "profile-phone",
            "Telefone de contato",
            input("profile-phone", account.phone, "tel", 'required maxlength="25"'),
          ) +
          field(
            "management-role",
            "Função",
            input("management-role", account.roleLabel, "text", "readonly"),
          ) +
          "</div>" +
          formActions("Salvar alterações", false) +
          '</form><p class="role-note">Dados demonstrativos. As alterações valem durante esta sessão.</p>',
      ) +
      "</div>"
    );
  }
  function roomsPage() {
    const f = local();
    let rows = roomList().filter(
      (r) =>
        filterMatches(f.block, r.block) &&
        (f.status === "todos" || r.status === f.status) &&
        [r.name, r.type, ...r.resources]
          .join(" ")
          .toLowerCase()
          .includes(f.query.toLowerCase()),
    );
    rows.sort((a, b) =>
      f.sort === "capacity"
        ? b.capacity - a.capacity
        : a.name.localeCompare(b.name, "pt-BR"),
    );
    return (
      heading(
        state.role === "diretor"
          ? "DIREÇÃO · INFRAESTRUTURA"
          : "COORDENAÇÃO",
        "Gerenciamento de Salas",
        "Consulte ambientes, recursos e a agenda de cada espaço.",
        button(
          "+ " + (state.role === "diretor" ? "Adicionar sala" : "Nova sala"),
          "room-new",
        ),
      ) +
      '<div class="page-toolbar">' +
      search("Buscar sala por nome ou recurso…") +
      localSelect("block", "Bloco", [
        ["todos", "Todos os blocos"],
        ...["A", "B", "C", "D"].map((b) => [b, "Bloco " + b]),
      ]) +
      localSelect("status", "Status", [
        ["todos", "Todos os status"],
        ["ativo", "Ativo"],
        ["manutencao", "Em manutenção"],
      ]) +
      localSelect("sort", "Ordenar por", [
        ["name", "Ordenar por nome"],
        ["capacity", "Maior capacidade"],
      ]) +
      '</div><p class="page-count">' +
      rows.length +
      " de " +
      roomList().length +
      ' ambientes · clique em um dia para consultar as reservas</p><div class="room-grid">' +
      rows
        .map((r) => {
          const stats = M.roomStats(data, {
            period: "semana",
            area: scopeArea(),
          }).find((a) => a.id === r.id);
          return (
            '<article class="room-tile">' + (S.RoomMedia ? S.RoomMedia.visual(r) + S.RoomMedia.controls(r) : '') + '<div class="room-tile-header"><h2>' +
            esc(r.name) +
            '</h2><button type="button" class="icon-button" data-action="room-edit" data-id="' +
            r.id +
            '" aria-label="Editar ' +
            esc(r.name) +
            '">' +
            icon("file") +
            "</button></div><p>Bloco " +
            r.block +
            " · " +
            r.capacity +
            ' pessoas</p><div class="room-days">' +
            data.days
              .map((day, i) => {
                const dayDate = addDays(M.periods.semana.start, i),
                  busy = allCalendarEvents().some(
                    (a) => a.roomId === r.id && a.date === dayDate,
                  );
                return (
                  '<button type="button" class="day-chip ' +
                  (r.status !== "ativo" ? "off" : busy ? "busy" : "") +
                  '" data-action="room-day" data-id="' +
                  r.id +
                  "|" +
                  dayDate +
                  '" aria-label="' +
                  esc(r.name + " · " + day) +
                  '">' +
                  day.toUpperCase() +
                  "</button>"
                );
              })
              .join("") +
            '</div><div class="tile-tags">' +
            r.resources
              .slice(0, 3)
              .map(
                (resource) => '<span class="tag">' + esc(resource) + "</span>",
              )
              .join(" ") +
            '</div><div class="room-tile-foot"><span>' +
            (r.status === "ativo"
              ? pct(stats.occupancy) + " ocupado na semana"
              : "Indisponível para reservas") +
            "</span>" +
            button("Detalhes", "room-detail", r.id, "secondary") +
            "</div>" +
            (state.role === "diretor"
              ? '<label class="switch-label">Bloquear para externo<input type="checkbox" class="toggle" data-room-block="' +
                r.id +
                '"' +
                (r.externalBlocked ? " checked" : "") +
                ' aria-label="Bloquear ' +
                esc(r.name) +
                ' para externo"></label>'
              : "") +
            "</article>"
          );
        })
        .join("") +
      "</div>" +
      (rows.length ? "" : empty("Nenhum ambiente encontrado"))
    );
  }
  /* Situação do docente no horário atual, calculada a partir da agenda do dia,
     dos turnos da unidade e das janelas entre turnos (almoço e intervalo). */
  const LUNCH = { start: 12, end: 13 },
    BREAK = { start: 17, end: 18 };
  function teacherSchedule(id, day = SIPAE_DATA.localDate()) {
    return data.allocations
      .filter((a) => a.teacherId === id && a.status === "confirmada" && a.date === day)
      .sort((a, b) => a.start - b.start);
  }
  function teacherSituation(t, now = new Date()) {
    if (t.status !== "ativo")
      return { label: "Inativo", tone: "gray", detail: "Cadastro inativo" };
    const day = SIPAE_DATA.localDate(now),
      hour = now.getHours() + now.getMinutes() / 60,
      lessons = teacherSchedule(t.id, day);
    const current = lessons.find((a) => hour >= a.start && hour < a.end);
    if (current)
      return {
        label: "Em aula",
        tone: "green",
        detail: room(current.roomId).name + " · até " + time(current.end),
      };
    if (hour >= LUNCH.start && hour < LUNCH.end)
      return {
        label: "No horário de almoço",
        tone: "amber",
        detail: time(LUNCH.start) + "–" + time(LUNCH.end),
      };
    const next = lessons.find((a) => a.start > hour),
      previous = [...lessons].reverse().find((a) => a.end <= hour);
    if (hour >= BREAK.start && hour < BREAK.end)
      return {
        label: "No intervalo",
        tone: "blue",
        detail: time(BREAK.start) + "–" + time(BREAK.end),
      };
    if (previous && next)
      return {
        label: "No intervalo",
        tone: "blue",
        detail: "Retorna às " + time(next.start),
      };
    const openShift = data.shifts.find((s) => hour >= s.start && hour < s.end);
    if (!openShift)
      return { label: "Fora do expediente", tone: "gray", detail: "Nenhum turno em andamento" };
    return {
      label: "Disponível",
      tone: "blue",
      detail: next ? "Próxima aula às " + time(next.start) : "Sem aulas restantes hoje",
    };
  }
  function teachersPage() {
    const f = local();
    let rows = data.teachers.filter(
      (t) =>
        (f.status === "todos" || t.status === f.status) &&
        [t.name, t.specialty, t.nif]
          .join(" ")
          .toLowerCase()
          .includes(f.query.toLowerCase()),
    );
    return (
      heading(
        state.role === "diretor" ? "DIREÇÃO · EQUIPE" : "COORDENAÇÃO",
        "Gerenciamento de Docentes",
        "Consulte a equipe, as especialidades e os agendamentos.",
        button("+ Cadastrar docente", "teacher-new"),
      ) +
      '<div class="page-toolbar">' +
      search("Buscar docente por nome…") +
      localSelect("status", "Status", [
        ["todos", "Todos os status"],
        ["ativo", "Ativo"],
        ["inativo", "Inativo"],
      ]) +
      "</div>" +
      card(
        "Docentes cadastrados",
        rows.length + " docentes no recorte",
        '<div class="table-wrap"><table><thead><tr><th>NOME / NIF</th><th>DISCIPLINAS</th><th>CARGA HORÁRIA</th><th>AULAS HOJE</th><th>STATUS</th><th>AÇÕES</th></tr></thead><tbody>' +
          rows
            .map((t) => {
              const todayA = M.allocations(data, {
                start: today,
                end: today,
                teacher: t.id,
              });
              return (
                '<tr><td><div class="person-cell"><div class="person-avatar">' +
                initials(t.name) +
                "</div><div><strong>" +
                esc(t.name) +
                "</strong><small>" +
                t.nif +
                "</small></div></div></td><td>" +
                esc(t.disciplines.join(", ")) +
                "</td><td>" +
                t.contractHours +
                " h / semana</td><td>" +
                todayA.length +
                "<small>" +
                (todayA[0]
                  ? esc(room(todayA[0].roomId).name)
                  : "Sem aulas hoje") +
                "</small></td><td>" +
                (() => {
                  const situation = teacherSituation(t);
                  return '<div class="status-stack">' +
                    badge(
                      t.status === "ativo" ? "Ativo" : "Inativo",
                      t.status === "ativo" ? "green" : "gray",
                    ) +
                    badge(situation.label, situation.tone) +
                    "<small>" + esc(situation.detail) + "</small></div>";
                })() +
                '</td><td><div class="table-actions">' +
                button("Editar", "teacher-edit", t.id, "secondary") +
                button("Detalhes", "teacher-detail", t.id, "secondary") +
                (state.role === "diretor"
                  ? button(
                      t.status === "ativo" ? "Desativar" : "Reativar",
                      "teacher-toggle",
                      t.id,
                      "secondary",
                    )
                  : "") +
                "</div></td></tr>"
              );
            })
            .join("") +
          "</tbody></table></div>" +
          (rows.length ? "" : empty("Nenhum docente encontrado")),
      )
    );
  }
  function allCalendarEvents() {
    return [
      ...data.allocations
        .filter((a) => a.status === "confirmada")
        .map((a) => ({
          ...a,
          key: "a:" + a.id,
          title: cls(a.classId).name,
          subtitle: teacher(a.teacherId).name,
          external: false,
        })),
      ...(data.externalReservations || [])
        .filter((e) => e.status === "aprovada")
        .map((e) => ({
          ...e,
          key: "e:" + e.id,
          title: e.purpose,
          subtitle: e.organization,
          external: true,
        })),
    ];
  }
  // A cor pertence ao curso, independentemente da turma, do perfil e da data.
  const courseHues = {
    "Desenvolvimento de Sistemas": 145,
    "Redes de Computadores": 185,
    "Programação Web": 265,
    "Python para Iniciantes": 45,
    "Informática Aplicada": 315,
    "Mecânica de Precisão": 25,
    "Eletroeletrônica": 210,
    "Soldagem": 0,
    "Usinagem Convencional": 75,
    "Automação Industrial": 240,
    "Segurança em Eletricidade": 195,
    "Administração": 290,
    "Logística": 165,
    "Empreendedorismo": 345,
    "Assistente Administrativo": 95,
  };
  function calendarEventStyle(a) {
    const name = a.external ? "Reserva externa" : cls(a.classId)?.name || a.title;
    const hue = a.external ? 330 : courseHues[name] ??
      [...name].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 360, 0);
    return ' style="--course-color:hsl(' + hue + ',65%,34%);--course-bg:hsl(' + hue + ',65%,95%)"';
  }
  function calendarLegend() {
    const courses = [...new Map(calendarRows().map((a) => [a.external ? "Reserva externa" : a.title, a])).entries()]
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
    return '<details class="calendar-legend"><summary>Cores por curso</summary><div>' +
      courses.map(([name, a]) => '<span' + calendarEventStyle(a) + '><i aria-hidden="true"></i>' + esc(name) + '</span>').join("") +
      '</div></details>';
  }
  function eventButton(a, month = false) {
    return (
      '<button type="button" class="calendar-event course-event"' + calendarEventStyle(a) +
      ' data-action="booking-detail" data-id="' +
      a.key +
      '" title="' +
      esc(a.title + " · " + a.subtitle + " · " + room(a.roomId).name) +
      '"><strong>' +
      esc(month ? room(a.roomId).name : a.title) +
      "</strong>" +
      time(a.start) +
      "–" +
      time(a.end) +
      (month
        ? "<br>" + esc(a.title)
        : "<br>" + esc(a.subtitle) + "<br>" + esc(room(a.roomId).name)) +
      "</button>"
    );
  }
  function calendarRows() {
    const f = local();
    return allCalendarEvents().filter(
      (a) =>
        (state.role !== "docente" || a.teacherId === teacherId) &&
        filterMatches(f.teacher, a.teacherId) &&
        filterMatches(f.room, a.roomId) &&
        filterMatches(f.block, room(a.roomId).block),
    ).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start || a.key.localeCompare(b.key));
  }
  function calendarRange() {
    const f = local(), d = new Date(f.anchor + "T12:00Z");
    if (f.view === "day") return { start: f.anchor, end: f.anchor };
    if (f.view === "month") {
      d.setUTCMonth(d.getUTCMonth() + 1, 0);
      return { start: f.anchor.slice(0, 7) + "-01", end: SIPAE_DATA.dateString(d) };
    }
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const start = SIPAE_DATA.dateString(d);
    return { start, end: addDays(start, 4) };
  }
  function calendarSummary(rows) {
    const lessons = rows.filter((a) => !a.external).length,
      external = rows.length - lessons;
    return lessons + (lessons === 1 ? " aula agendada" : " aulas agendadas") +
      " · " + external + (external === 1 ? " reserva externa" : " reservas externas");
  }
  function monthGrid() {
    const f = local(),
      d = new Date(f.anchor + "T12:00Z"),
      year = d.getUTCFullYear(),
      month = d.getUTCMonth(),
      first = new Date(Date.UTC(year, month, 1, 12)),
      start = new Date(first);
    start.setUTCDate(1 - first.getUTCDay());
    const events = calendarRows();
    let html =
      '<div class="month-grid">' +
      ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]
        .map((n) => '<div class="month-day-name">' + n + "</div>")
        .join("");
    const days =
      Math.ceil(
        (first.getUTCDay() +
          new Date(Date.UTC(year, month + 1, 0)).getUTCDate()) /
          7,
      ) * 7;
    for (let i = 0; i < days; i++) {
      const day = new Date(start);
      day.setUTCDate(day.getUTCDate() + i);
      const ds = SIPAE_DATA.dateString(day),
        items = events.filter((a) => a.date === ds);
      html +=
        '<div class="month-day ' +
        (day.getUTCMonth() !== month ? "other " : "") +
        (ds === today ? "today" : "") +
        '"><button type="button" class="month-number" data-action="calendar-day" data-id="' +
        ds +
        '">' +
        day.getUTCDate() +
        "</button>" +
        items
          .slice(0, 2)
          .map((a) => eventButton(a, true))
          .join("") +
        (items.length > 2
          ? '<button type="button" class="calendar-more" data-action="calendar-day" data-id="' +
            ds +
            '">Ver ' +
            items.length +
            " reservas</button>"
          : "") +
        "</div>";
    }
    return html + "</div>";
  }
  function weekGrid() {
    const f = local(),
      d = new Date(f.anchor + "T12:00Z");
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const days = Array.from({ length: 5 }, (_, i) => {
        const day = new Date(d);
        day.setUTCDate(day.getUTCDate() + i);
        return SIPAE_DATA.dateString(day);
      }),
      events = calendarRows();
    let html =
      '<div class="week-grid"><div class="week-head">TURNO</div>' +
      days
        .map(
          (ds, i) =>
            '<div class="week-head ' +
            (ds === today ? "today" : "") +
            '">' +
            data.days[i] +
            " " +
            ds.slice(8) +
            "/" +
            ds.slice(5, 7) +
            "</div>",
        )
        .join("");
    for (const s of data.shifts) {
      html +=
        '<div class="week-cell time-label">' +
        s.name +
        "<br>" +
        time(s.start) +
        "</div>";
      for (const ds of days) {
        const items = events.filter((a) => a.date === ds && a.shift === s.id);
        html +=
          '<div class="week-cell">' +
          items
            .slice(0, 3)
            .map((a) => eventButton(a))
            .join("") +
          (items.length > 3
            ? '<button type="button" class="calendar-more" data-action="calendar-day" data-id="' +
              ds +
              '" data-shift="' + s.id + '">Ver ' +
              items.length +
              " agendamentos</button>"
            : "") +
          "</div>";
      }
    }
    return html + "</div>";
  }
  /* Visão de dia: mesma estrutura das grades de mês e semana, com os ambientes
     reservados nas linhas e os turnos nas colunas. Mostra apenas as salas que
     possuem reserva na data, com os horários de cada agendamento. */
  function dayGrid(compact = false) {
    const f = local(),
      day = f.anchor,
      events = calendarRows().filter((a) => a.date === day);
    if (!events.length)
      return (
        '<div class="day-empty">' +
        empty(
          day === today
            ? "Nenhuma reserva para hoje"
            : "Nenhuma reserva em " + date(day, true),
          "Os ambientes reservados na data aparecerão aqui, com sala e horário.",
        ) +
        "</div>"
      );
    const rooms = [...new Set(events.map((a) => a.roomId))]
      .map((id) => room(id))
      .sort((a, b) => a.block.localeCompare(b.block) || a.name.localeCompare(b.name, "pt-BR"));
    let html =
      '<div class="week-grid day-grid' + (compact ? " compact" : "") + '"><div class="week-head">AMBIENTE</div>' +
      data.shifts
        .map(
          (shift) =>
            '<div class="week-head">' +
            esc(shift.name) +
            "<small>" +
            time(shift.start) +
            "–" +
            time(shift.end) +
            "</small></div>",
        )
        .join("");
    for (const space of rooms) {
      const inRoom = events.filter((a) => a.roomId === space.id);
      html +=
        '<div class="week-cell time-label day-room"><strong>' +
        esc(space.name) +
        "</strong><span>Bloco " +
        esc(space.block) +
        " · " +
        space.capacity +
        " lugares</span></div>";
      for (const shift of data.shifts) {
        const items = inRoom
          .filter((a) => a.shift === shift.id)
          .sort((a, b) => a.start - b.start);
        html +=
          '<div class="week-cell">' +
          items.map((a) => eventButton(a)).join("") +
          "</div>";
      }
    }
    return html + "</div>";
  }
  function calendar() {
    const f = local(),
      range = calendarRange(),
      periodRows = calendarRows().filter((a) => a.date >= range.start && a.date <= range.end),
      anchor = new Date(f.anchor + "T12:00Z"),
      label =
        f.view === "month"
          ? new Intl.DateTimeFormat("pt-BR", {
              month: "long",
              year: "numeric",
            }).format(anchor)
          : f.view === "day"
            ? date(f.anchor, true) +
              (f.anchor === today ? " · hoje" : "")
            : date(range.start) + " a " + date(range.end) + " · visão semanal";
    const upcoming = calendarRows()
        .filter((a) =>
          state.role === "docente"
            ? a.date >= today && a.date < addDays(today, 7)
            : a.date === today,
        )
        .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
    const side = card(
      state.role === "docente" ? "Próximos 7 dias" : "Reservas de hoje",
      upcoming.length + (upcoming.length === 1 ? " agendamento" : " agendamentos") + (state.role === "docente" ? " a partir de " + date(today) : " hoje"),
      '<div class="today-list scroll-list" tabindex="0" role="region" aria-label="Todos os agendamentos da lista">' +
        upcoming
          .map(
            (a) =>
              '<button type="button" class="today-item course-event"' + calendarEventStyle(a) + ' data-action="booking-detail" data-id="' +
              a.key +
              '"><div><strong>' +
              esc(room(a.roomId).name) +
              "</strong><small>" +
              date(a.date) +
              " · " +
              time(a.start) +
              "–" +
              time(a.end) +
              "</small><small>" +
              esc(a.title) +
              "</small></div></button>",
          )
          .join("") +
        (upcoming.length ? "" : empty("Nenhum agendamento", "Nenhuma reserva para os filtros selecionados neste período.")) + "</div>",
    );
    const filters =
      '<div class="page-toolbar calendar-filters">' +
      localSelect("room", "Sala específica", [
        ["todos", "Todas as salas"],
        ...roomList().map((r) => [r.id, r.name]),
      ]) +
      (state.role !== "docente"
        ? localSelect("block", "Bloco", [
            ["todos", "Todos os blocos"],
            ...["A", "B", "C", "D"].map((b) => [b, "Bloco " + b]),
          ]) +
          localSelect("teacher", "Docente", [
            ["todos", "Todos os docentes"],
            ...data.teachers.map((t) => [t.id, t.name]),
          ])
        : "") + "</div>";
    const panel =
      '<section class="calendar-panel"><div class="calendar-toolbar"><div><button type="button" class="button secondary" data-action="calendar-prev" aria-label="Período anterior">‹</button><h2>' +
      esc(label) +
      '</h2><button type="button" class="button secondary" data-action="calendar-next" aria-label="Próximo período">›</button></div><div><button type="button" class="button ' +
      (f.view === "day" ? "primary" : "secondary") +
      '" data-action="calendar-today" aria-pressed="' + (f.view === "day") + '">Hoje</button><button type="button" class="button ' +
      (f.view === "month" ? "primary" : "secondary") +
      '" data-action="calendar-month" aria-pressed="' + (f.view === "month") + '">Mês</button><button type="button" class="button ' +
      (f.view === "week" ? "primary" : "secondary") +
      '" data-action="calendar-week" aria-pressed="' + (f.view === "week") + '">Semana</button></div></div><p class="calendar-count" role="status">' +
      calendarSummary(periodRows) + ' no período selecionado</p><p class="calendar-scroll-hint">' +
      icon("arrow") +
      (f.view === "day"
        ? "Deslize para os lados para ver todos os turnos"
        : "Deslize para os lados para ver todos os dias") +
      '</p><div class="calendar-scroll" tabindex="0" role="region" aria-label="Grade de reservas. Role horizontalmente para consultar todas as colunas.">' +
      (f.view === "month" ? monthGrid() : f.view === "day" ? dayGrid() : weekGrid()) +
      "</div>" + calendarLegend() + "</section>";
    return (
      heading(
        state.role === "docente"
          ? "DOCENTE"
          : state.role === "diretor"
            ? "DIREÇÃO · UNIDADE"
            : "COORDENAÇÃO",
        state.role === "docente"
          ? "Calendário de Reservas"
          : state.role === "diretor"
            ? "Calendário Geral de Reservas"
            : "Calendário Escolar",
        "Selecione uma reserva para consultar os detalhes.",
        button("+ Nova reserva", "booking-new"),
      ) +
      filters +
      '<div class="calendar-layout ' +
      (state.role === "docente" ? "teacher-calendar" : "") +
      '">' +
      (state.role === "docente"
        ? '<aside class="calendar-side">' + side + "</aside>" + panel
        : panel + '<aside class="calendar-side">' + side + "</aside>") +
      "</div>"
    );
  }
  function externalForm() {
    return (
      '<form data-form="external"><div class="form-grid">' +
      field(
        "external-name",
        "Nome do solicitante / instituição",
        input(
          "external-name",
          "",
          "text",
          'required minlength="3" maxlength="100" placeholder="Nome da organização"',
        ),
      ) +
      field(
        "external-contact",
        "Contato do solicitante",
        input(
          "external-contact",
          "",
          "text",
          'required maxlength="120" placeholder="E-mail ou telefone"',
        ),
      ) +
      field(
        "external-room",
        "Sala requerida",
        select(
          "external-room",
          data.rooms.map((r) => [
            r.id,
            r.name +
              " · " +
              r.capacity +
              " lugares" +
              (r.externalBlocked ? " · Bloqueado para externo" : ""),
          ]),
          "r17",
        ),
      ) +
      field(
        "external-date",
        "Data do evento",
        input(
          "external-date",
          today,
          "date",
          'required min="' + today + '"',
        ),
      ) +
      field(
        "external-start",
        "Início",
        input("external-start", "13:00", "time", 'required step="900"'),
      ) +
      field(
        "external-end",
        "Fim",
        input("external-end", "16:00", "time", 'required step="900"'),
      ) +
      field(
        "external-attendees",
        "Quantidade de participantes",
        input("external-attendees", 30, "number", 'required min="1" max="500"'),
      ) +
      field(
        "external-priority",
        "Prioridade",
        select(
          "external-priority",
          [
            ["normal", "Normal"],
            ["urgente", "Urgente"],
          ],
          "normal",
        ),
      ) +
      field(
        "external-purpose",
        "Motivo / finalidade",
        textArea(
          "external-purpose",
          "",
          'required minlength="5" placeholder="Descreva a atividade e os recursos necessários."',
        ),
        "full",
      ) +
      "</div>" +
      formActions("Registrar solicitação") +
      "</form>"
    );
  }
  function externalPage() {
    const f = local(),
      // Não existe aprovação de sala: pendentes e recusadas não fazem parte da gestão.
      list = data.externalReservations.filter(
        (r) =>
          !["pendente", "recusada"].includes(r.status) &&
          (f.status === "todos" || (r.status === "aprovada" ? "confirmada" : r.status) === f.status) &&
          (f.period === "todos" || M.inRange(r.date, { period: f.period })),
      );
    return (
      heading(
        "DIREÇÃO · RELACIONAMENTO COM A COMUNIDADE",
        "Gerenciamento de Reservas Externas",
        "Agende atividades externas de instituições e acompanhe os registros da unidade.",
        button("Agendar reserva externa", "external-direct"),
      ) +
      '<div class="page-toolbar">' +
      localSelect("status", "Status", [
        ["todos", "Todos os status"],
        ["confirmada", "Confirmada"],
        ["cancelada", "Cancelada"],
      ]) +
      localSelect("period", "Período", [
        ["mes", monthLabel()],
        ["semana", "Semana atual"],
        ["todos", "Todos os registros"],
      ]) +
      "</div>" +
      card(
        "Reservas externas",
        list.length + " registros",
        '<div class="table-wrap"><table><thead><tr><th>ID</th><th>SOLICITANTE / ORGANIZAÇÃO</th><th>SALA</th><th>DATA / HORÁRIO</th><th>FINALIDADE</th><th>STATUS</th><th>AÇÕES</th></tr></thead><tbody>' +
          list
            .map(
              (r) =>
                "<tr><td>" +
                esc(r.id.toUpperCase()) +
                "</td><td><strong>" +
                esc(r.organization) +
                "</strong><small>" +
                r.attendees +
                " participantes</small></td><td>" +
                esc(room(r.roomId).name) +
                "</td><td>" +
                date(r.date) +
                "<small>" +
                time(r.start) +
                "–" +
                time(r.end) +
                (r.groupId ? '</small><small>Período: ' + date(r.groupStartDate || r.date, true) +
                  ' a ' + date(r.groupEndDate || r.date, true) + ' · ' +
                  data.externalReservations.filter((item) => item.groupId === r.groupId).length + ' dia(s)' : '') +
                "</small></td><td>" +
                esc(r.purpose) +
                "</td><td>" +
                bookingBadge(r.status === "aprovada" ? "confirmada" : r.status) +
                '</td><td><div class="table-actions">' +
                button("Detalhes", "booking-detail", "e:" + r.id, "secondary") +
                "</div></td></tr>",
            )
            .join("") +
          "</tbody></table></div>" +
          (list.length ? "" : empty("Nenhuma reserva externa neste recorte")),
      )
    );
  }
  Object.assign(P, {
    area,
    field,
    input,
    select,
    options,
    textArea,
    button,
    link,
    scopeArea,
    roomList,
    local,
    selectedValues,
    filterMatches,
    errorBox,
    formActions,
    ownAllocations,
    reservations,
    bookingBadge,
    bookingForm,
    availability,
    allCalendarEvents,
    calendarRows,
    calendarEventStyle,
    calendarRange,
    calendarSummary,
    eventButton,
    externalForm,
    teacherSchedule,
    teacherSituation,
  });
  Object.assign(S.views, {
    login,
    "docente/dashboard": teacherDashboard,
    "docente/reservas": myReservations,
    "docente/calendario": calendar,
    "docente/perfil": profile,
    "coordenador/salas": roomsPage,
    "coordenador/docentes": teachersPage,
    "coordenador/calendario": calendar,
    "coordenador/perfil": managementProfile,
    "diretor/salas": roomsPage,
    "diretor/docentes": teachersPage,
    "diretor/calendario": calendar,
    "diretor/externas": externalPage,
    "diretor/perfil": managementProfile,
  });
  S.P = P;
  S.render();
})();
