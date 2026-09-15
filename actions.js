(function () {
  "use strict";
  const S = SIPAE,
    { data, M, state, U, P } = S,
    {
      esc,
      icon,
      number,
      pct,
      hours,
      date,
      time,
      teacher,
      room,
      cls,
      badge,
      empty,
    } = U,
    { field, input, select, textArea, button, formActions, errorBox } = P;
  const dialog = document.getElementById("app-dialog");
  P.openBooking = bookingNew;
  P.openDialog = show;
  const close = () => {
    dialog.close();
    unlockPageScroll();
  };
  /* Trava do scroll de fundo: enquanto o modal está aberto, somente o conteúdo
     do diálogo rola. A posição da página é guardada e devolvida ao fechar. */
  let lockedScroll = null;
  const pageRoot = () => document.documentElement || null;
  function lockPageScroll() {
    if (lockedScroll !== null || !document.body?.classList) return;
    lockedScroll = window.scrollY || pageRoot()?.scrollTop || 0;
    const gutter = (window.innerWidth || 0) - (pageRoot()?.clientWidth || 0);
    pageRoot()?.style?.setProperty?.("--scrollbar-gutter", Math.max(0, gutter) + "px");
    if (document.body.style) document.body.style.top = -lockedScroll + "px";
    document.body.classList.add("dialog-open");
  }
  function unlockPageScroll() {
    if (lockedScroll === null) return;
    const position = lockedScroll;
    lockedScroll = null;
    document.body?.classList?.remove("dialog-open");
    if (document.body?.style) document.body.style.top = "";
    pageRoot()?.style?.removeProperty?.("--scrollbar-gutter");
    window.scrollTo?.(0, position);
  }
  // Esc e o evento close nativo também devolvem o scroll. A troca de etapa
  // dentro de um mesmo fluxo reabre o diálogo e mantém a trava.
  dialog.addEventListener?.("cancel", () => unlockPageScroll());
  // Esc fecha o modal mesmo quando o fechamento nativo do <dialog> não dispara.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !dialog.open) return;
    event.preventDefault();
    externalCancellation = null;
    close();
  });
  dialog.addEventListener?.("close", () => {
    if (!dialog.open) unlockPageScroll();
  });
  function show(title, subtitle, body, wide = false) {
    if (dialog.open) dialog.close();
    dialog.className = wide ? "modal-wide" : "";
    dialog.innerHTML =
      '<div class="dialog-heading"><h2 id="app-dialog-title">' +
      esc(title) +
      '</h2><button type="button" class="icon-button" data-action="close" aria-label="Fechar">×</button></div>' +
      (subtitle ? '<p class="modal-subtitle">' + esc(subtitle) + "</p>" : "") +
      body;
    lockPageScroll();
    dialog.showModal();
    dialog.scrollTop = 0;
  }
  function formError(form, text) {
    const el = form.querySelector(".form-error");
    if (el) {
      el.textContent = text;
      el.hidden = false;
      el.scrollIntoView({ block: "nearest" });
    } else S.toast(text);
    return false;
  }
  function done(message) {
    close();
    S.render();
    S.toast(message);
  }
  const asTime = (value) => {
    const [h, m] = String(value).split(":").map(Number);
    return h + m / 60;
  };
  function validSlot(day, start, end) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start >= end ||
      !Number.isFinite(new Date(day + "T12:00:00Z").getTime()) ||
      new Date(day + "T12:00:00Z").toISOString().slice(0, 10) !== day
    )
      return "Informe uma data válida e um fim posterior ao início.";
    if (day < P.today)
      return "Escolha uma data a partir de hoje, " + date(P.today, true) + ".";
    if (day === P.today && start <= new Date().getHours() + new Date().getMinutes() / 60)
      return "Escolha um horário futuro para o agendamento de hoje.";
    if (!data.shifts.some((s) => start >= s.start && end <= s.end))
      return "Use um único turno: 08h–12h, 13h–17h ou 18h–22h.";
    return null;
  }
  function externalError(r, ignoreId) {
    const target = room(r.roomId);
    if (!target) return "Selecione um ambiente válido.";
    const slot = validSlot(r.date, r.start, r.end);
    if (slot) return slot;
    if (target.status !== "ativo") return "O ambiente está em manutenção.";
    if (target.externalBlocked)
      return "Este ambiente está bloqueado para reservas externas.";
    if (
      !(target.workingDays || [1, 2, 3, 4, 5]).includes(
        new Date(r.date + "T12:00Z").getUTCDay(),
      )
    )
      return "O ambiente não funciona no dia escolhido.";
    if (r.attendees > target.capacity)
      return (
        "O público excede a capacidade de " + target.capacity + " lugares."
      );
    if (
      P.allCalendarEvents().some(
        (a) =>
          a.id !== ignoreId &&
          a.roomId === r.roomId &&
          a.date === r.date &&
          a.start < r.end &&
          r.start < a.end,
      )
    )
      return "O ambiente já tem uma reserva confirmada nesse horário.";
    return null;
  }
  function bookingNew(draft = {}) {
    P.draft = draft;
    show(
      "Nova reserva",
      "Selecione o ambiente, a turma e o horário.",
      '<div class="booking-search-tip">' + button('Buscar sala e horário disponíveis', 'booking-find', '', 'secondary') + '</div>' + P.bookingForm(draft, true),
      true,
    );
    updateDisciplineBalance();
  }
  function updateDisciplineBalance() {
    const box = document.getElementById("discipline-balance");
    if (!box) return;
    const form = box.closest("form");
    const month = form.elements["booking-date"].value.slice(0, 7);
    const id = form.elements["booking-subject"].value;
    const credit = M.disciplineCredits(data, P.teacherId, month).find(
      (d) => d.id === id,
    );
    box.textContent = credit
      ? hours(credit.remaining) +
        " disponíveis em " +
        month.split("-").reverse().join("/") +
        " · " +
        hours(credit.scheduled) +
        " já agendadas. Confirmar o agendamento reserva essas horas imediatamente."
      : "Selecione a disciplina e a data para consultar o saldo.";
  }
  function roomDay(id, day) {
    const target = room(id);
    if (!target || !["docente", "coordenador", "diretor"].includes(state.role))
      return;
    const items = P.allCalendarEvents().filter(
      (a) => a.roomId === id && a.date === day,
    );
    const free = data.shifts.filter(
      (s) => !items.some((a) => a.start < s.end && a.end > s.start),
    );
    const working =
      target.status === "ativo" &&
      target.workingDays.includes(new Date(day + "T12:00Z").getUTCDay());
    let body;
    if (items.length) {
      body =
        '<div class="table-wrap room-daily-table"><table><thead><tr><th>HORÁRIO</th><th>DOCENTE / SOLICITANTE</th><th>DISCIPLINA</th><th>TURMA</th></tr></thead><tbody>' +
        items
          .map(
            (a) =>
              "<tr><td>" +
              time(a.start) +
              "–" +
              time(a.end) +
              "</td><td>" +
              esc(a.subtitle) +
              "</td><td>" +
              esc(a.title) +
              "</td><td>" +
              esc(a.classId ? cls(a.classId).code : "Evento externo") +
              "</td></tr>",
          )
          .join("") +
        free
          .map(
            (s) =>
              "<tr><td>" +
              s.name +
              '</td><td colspan="3">' +
              badge("Horário livre", "green") +
              "</td></tr>",
          )
          .join("") +
        "</tbody></table></div>";
    } else
      body =
        '<div class="empty-room">' +
        icon("calendar") +
        "<h3>" +
        (working ? "Nenhuma reserva neste dia" : "Ambiente indisponível") +
        "</h3><p>" +
        (working
          ? "Este ambiente está disponível nos turnos abaixo."
          : "O ambiente está em manutenção ou não funciona neste dia.") +
        '</p><div class="tags">' +
        (working
          ? data.shifts
              .map((s) =>
                badge(
                  s.name + " · " + time(s.start) + "–" + time(s.end),
                  "green",
                ),
              )
              .join("")
          : "") +
        "</div></div>";
    body +=
      '<div class="form-actions">' +
      button("Fechar", "close", "", "secondary") +
      (working
        ? button("+ Fazer reserva", "booking-room", id + "|" + day)
        : "") +
      "</div>";
    show("Reservas — " + target.name, date(day, true), body, true);
  }
  function roomDetail(id) {
    const r = room(id);
    if (!r || !["docente", "coordenador", "diretor"].includes(state.role)) return;
    const dates = SIPAE_DATA.dates(M.periods.semana.start, M.periods.semana.end);
    show(
      r.name,
      "Agenda e recursos do ambiente",
      (S.RoomMedia ? S.RoomMedia.visual(r) + S.RoomMedia.controls(r) : '') + '<div class="room-preview-meta">' +
        badge(
          r.status === "ativo" ? "Ativo" : "Em manutenção",
          r.status === "ativo" ? "green" : "amber",
        ) +
        '<span class="tag">Bloco ' +
        r.block +
        '</span><span class="tag">' +
        r.capacity +
        ' lugares</span></div><div class="tags">' +
        r.resources
          .map((x) => '<span class="tag">' + esc(x) + "</span>")
          .join("") +
        '</div><div class="weekly-room">' +
        dates
          .map((d, i) => {
            const items = P.allCalendarEvents().filter(
              (a) => a.roomId === id && a.date === d,
            );
            return (
              "<article><h3>" +
              data.days[i] +
              " · " +
              d.slice(8) +
              "</h3>" +
              items
                .slice(0, 2)
                .map((a) => P.eventButton(a, true))
                .join("") +
              (items.length ? "" : '<p class="week-free">Nenhuma reserva</p>') +
              button("Ver dia", "room-day", id + "|" + d, "secondary compact") +
              "</article>"
            );
          })
          .join("") +
        '</div><div class="detail-grid"><div><span>Responsável</span><strong>' +
        esc(r.responsible) +
        "</strong></div><div><span>Observações</span><strong>" +
        esc(r.notes || "Sem observações adicionais.") +
        '</strong></div></div><div class="form-actions">' +
        button("Fechar", "close", "", "secondary") +
        (state.role !== "docente" ? button("Editar ambiente", "room-edit", id) : '') +
        "</div>",
      true,
    );
  }
  function roomForm(id) {
    if (!["coordenador", "diretor"].includes(state.role)) return;
    const r = id
      ? room(id)
      : {
          name: "",
          block: "A",
          capacity: 30,
          type: "Sala teórica",
          status: "ativo",
          resources: ["Projetor", "Internet"],
          areaId: "unidade",
          workingDays: [1, 2, 3, 4, 5],
          externalBlocked: false,
          responsible: "",
          notes: "",
        };
    if (!r) return;
    const types = [...new Set(data.rooms.map((x) => x.type))];
    const resources = [
      ...new Set([
        ...r.resources,
        "Projetor",
        "Computadores",
        "Ar-condicionado",
        "Lousa digital",
        "Internet",
        "Áudio e vídeo",
      ]),
    ];
    show(
      id
        ? "Editar Sala"
        : state.role === "diretor"
          ? "Adicionar Sala"
          : "Cadastrar Nova Sala",
      "Cadastre os recursos e as condições de uso do ambiente.",
      '<form data-form="room" data-edit-id="' +
        (id || "") +
        '"><div class="form-grid">' +
        field(
          "room-name",
          "Nome da sala",
          input(
            "room-name",
            r.name,
            "text",
            'required minlength="3" maxlength="80"',
          ),
          "full",
        ) +
        field(
          "room-block",
          "Bloco / localização",
          select(
            "room-block",
            ["A", "B", "C", "D"].map((b) => [b, "Bloco " + b]),
            r.block,
          ),
        ) +
        field(
          "room-type",
          "Tipo de sala",
          select(
            "room-type",
            types.map((t) => [t, t]),
            r.type,
          ),
        ) +
        field(
          "room-capacity",
          "Capacidade",
          input(
            "room-capacity",
            r.capacity,
            "number",
            'required min="1" max="500"',
          ),
        ) +
        field(
          "room-status",
          "Status",
          select(
            "room-status",
            [
              ["ativo", "Ativo"],
              ["manutencao", "Em manutenção"],
            ],
            r.status,
          ),
        ) +
        '<div class="field full"><span class="field-label">Recursos disponíveis</span><div class="check-group">' +
        resources
          .map(
            (x) =>
              '<label class="check-label"><input type="checkbox" name="resource" value="' +
              esc(x) +
              '"' +
              (r.resources.includes(x) ? " checked" : "") +
              ">" +
              esc(x) +
              "</label>",
          )
          .join("") +
        '</div></div><div class="field full"><span class="field-label">Dias de funcionamento</span><div class="check-group">' +
        data.days
          .map(
            (d, i) =>
              '<label class="check-label"><input type="checkbox" name="working-day" value="' +
              (i + 1) +
              '"' +
              (r.workingDays.includes(i + 1) ? " checked" : "") +
              ">" +
              d +
              "</label>",
          )
          .join("") +
        "</div></div>" +
        (state.role === "diretor"
          ? '<div class="field full"><label class="switch-label">Bloquear para externo<input class="toggle" type="checkbox" name="external-blocked"' +
            (r.externalBlocked ? " checked" : "") +
            "></label></div>"
          : "") +
        field(
          "room-responsible",
          "Responsável",
          input("room-responsible", r.responsible, "text", 'maxlength="100"'),
          "full",
        ) +
        field(
          "room-notes",
          "Observações",
          textArea("room-notes", r.notes),
          "full",
        ) +
        "</div>" +
        formActions(
          id
            ? "Salvar alterações"
            : state.role === "diretor"
              ? "Adicionar sala"
              : "Cadastrar sala",
        ) +
        "</form>",
      true,
    );
  }
  function teacherForm(id) {
    if (!["coordenador", "diretor"].includes(state.role)) return;
    const t = id
      ? teacher(id)
      : {
          name: "",
          nif: "",
          email: "",
          areaId: "unidade",
          contractHours: 30,
          disciplines: [],
          defaultRoomId: "",
          status: "ativo",
        };
    if (!t) return;
    show(
      id ? "Editar Docente" : "Cadastrar Docente",
      "Informações de cadastro e atuação na unidade.",
      '<form data-form="teacher" data-edit-id="' +
        (id || "") +
        '"><div class="form-grid">' +
        field(
          "teacher-name",
          "Nome completo",
          input(
            "teacher-name",
            t.name,
            "text",
            'required minlength="3" maxlength="80"',
          ),
          "full",
        ) +
        field(
          "teacher-nif",
          "NIF / matrícula",
          input(
            "teacher-nif",
            t.nif,
            "text",
            'required pattern="[0-9]{6,9}" maxlength="9" inputmode="numeric"',
          ),
        ) +
        field(
          "teacher-email",
          "E-mail institucional",
          input("teacher-email", t.email, "email", 'required maxlength="120"'),
        ) +
        field(
          "teacher-hours",
          "Carga horária contratada",
          select(
            "teacher-hours",
            [20, 30, 40].map((h) => [h, h + " h / semana"]),
            t.contractHours,
          ),
        ) +
        field(
          "teacher-subjects",
          "Disciplinas ministradas",
          input(
            "teacher-subjects",
            t.disciplines.join(", "),
            "text",
            'required maxlength="180" placeholder="Separe as disciplinas por vírgula"',
          ),
          "full",
        ) +
        field(
          "teacher-room",
          "Sala padrão (opcional)",
          select(
            "teacher-room",
            [
              ["", "Sem sala padrão"],
              ...P.roomList().map((r) => [r.id, r.name]),
            ],
            t.defaultRoomId,
          ),
          "full",
        ) +
        field(
          "teacher-status",
          "Status do docente",
          select(
            "teacher-status",
            [
              ["ativo", "Ativo"],
              ["inativo", "Inativo"],
            ],
            t.status,
          ),
          "full",
        ) +
        "</div>" +
        formActions(id ? "Salvar alterações" : "Cadastrar docente") +
        "</form>",
      true,
    );
  }
  function externalGroup(record) {
    return (record.groupId
      ? data.externalReservations.filter((r) => r.groupId === record.groupId)
      : [record]).slice().sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  }
  function externalIsFuture(record) {
    return record.status === "aprovada" &&
      new Date(record.date + "T00:00:00").getTime() + record.start * 3600000 > Date.now();
  }
  function externalStatus(record) {
    return record.status === "aprovada" ? "confirmada" : record.status;
  }
  function externalOccurrences(records, selectedId) {
    return '<div class="external-occurrences"><h3>Dias da reserva</h3><div class="today-list">' +
      records.map((r) => '<button type="button" class="today-item" data-action="booking-detail" data-id="e:' +
        esc(r.id) + '"' + (r.id === selectedId ? ' aria-current="true"' : '') +
        '><div><strong>' + date(r.date) + '</strong><small>' + time(r.start) + '–' + time(r.end) +
        (r.id === selectedId ? ' · Dia selecionado' : '') + '</small></div>' +
        P.bookingBadge(externalStatus(r)) + '</button>').join('') + '</div></div>';
  }
  function externalDetail(record) {
    if (!["coordenador", "diretor"].includes(state.role)) return;
    const group = externalGroup(record), future = group.filter(externalIsFuture);
    show("Detalhes da reserva externa", room(record.roomId).name,
      '<div class="detail-grid"><div><span>Organização</span><strong>' + esc(record.organization) +
      '</strong></div><div><span>Contato</span><strong>' + esc(record.contact || 'Não informado') +
      '</strong></div><div><span>Participantes</span><strong>' + esc(record.attendees) +
      '</strong></div><div><span>Dia selecionado</span><strong>' + date(record.date) + ' · ' + time(record.start) + '–' + time(record.end) +
      '</strong></div><div><span>Período da reserva</span><strong>' + date(record.groupStartDate || group[0].date) +
      (group.length > 1 ? ' a ' + date(record.groupEndDate || group[group.length - 1].date) : '') +
      ' · ' + group.length + (group.length === 1 ? ' dia' : ' dias') +
      '</strong></div><div><span>Status deste dia</span>' + P.bookingBadge(externalStatus(record)) +
      '</div><div><span>Finalidade</span><strong>' + esc(record.purpose) +
      '</strong></div><div><span>Observações / motivo</span><strong>' + esc(record.reason || record.note || 'Sem observações.') +
      '</strong></div></div>' + (group.length > 1 ? externalOccurrences(group, record.id) : '') +
      '<div class="form-actions">' + button('Fechar', 'close', '', 'secondary') +
      (state.role === 'diretor' && externalIsFuture(record)
        ? button('Cancelar este dia', 'external-cancel-day', record.id, 'secondary') : '') +
      (state.role === 'diretor' && group.length > 1 && future.length > 1
        ? button('Cancelar dias futuros', 'external-cancel-group', record.id) : '') + '</div>', true);
  }
  let externalCancellation = null;
  function cancelExternal(id, scope) {
    if (state.role !== 'diretor') return;
    const record = data.externalReservations.find((r) => r.id === id);
    if (!record || !['day', 'group'].includes(scope)) return;
    const records = (scope === 'group' ? externalGroup(record) : [record]).filter(externalIsFuture);
    if (!records.length) return;
    externalCancellation = { id, scope };
    show(scope === 'group' ? 'Cancelar dias futuros' : 'Cancelar este dia', record.organization,
      '<div class="confirmation-body"><p>Confirme o cancelamento de <strong>' + records.length +
      (records.length === 1 ? ' dia' : ' dias') + '</strong> em ' + esc(room(record.roomId).name) +
      '. Os horários abaixo ficarão disponíveis novamente. Os dias já iniciados e o histórico serão preservados.</p></div>' +
      '<div class="today-list external-cancel-review">' + records.map((r) => '<div class="today-item"><strong>' + date(r.date) +
        '</strong><span>' + time(r.start) + '–' + time(r.end) + '</span></div>').join('') + '</div>' +
      '<div class="form-actions">' + button('Voltar aos detalhes', 'booking-detail', 'e:' + id, 'secondary') +
      button('Confirmar cancelamento', 'external-cancel-confirm', scope + '|' + id) + '</div>', true);
  }
  function bookingDetail(key) {
    externalCancellation = null;
    if (!['a', 's', 'e'].includes(key.split(':')[0])) return;
    const [type, id] = key.split(":"),
      record =
        type === "a"
          ? data.allocations.find((a) => a.id === id)
          : type === "s"
            ? data.requests.find((r) => r.id === id)
            : data.externalReservations.find((r) => r.id === id);
    if (!record) return;
    if (state.role === "docente" && record.teacherId !== P.teacherId) return;
    const external = type === "e";
    if (external) {
      externalDetail(record);
      return;
    }
    show(
      external ? "Reserva Externa" : "Detalhes da Reserva",
      room(record.roomId).name,
      '<div class="detail-grid"><div><span>' +
        (external ? "Organização" : "Docente") +
        "</span><strong>" +
        esc(external ? record.organization : teacher(record.teacherId).name) +
        "</strong></div><div><span>Data e horário</span><strong>" +
        date(record.date) +
        " · " +
        time(record.start) +
        "–" +
        time(record.end) +
        "</strong></div><div><span>" +
        (external ? "Finalidade" : "Turma / disciplina") +
        "</span><strong>" +
        esc(
          external
            ? record.purpose
            : cls(record.classId).code +
                " · " +
                (record.subject || cls(record.classId).name),
        ) +
        "</strong></div><div><span>Status</span>" +
        P.bookingBadge(
          type === "a"
            ? record.status === "cancelada"
              ? "cancelada"
              : record.date < P.today
                ? "concluida"
                : "confirmada"
            : record.status,
        ) +
        "</div><div><span>Observações / motivo</span><strong>" +
        esc(record.reason || record.note || "Sem observações.") +
        '</strong></div></div><div class="form-actions">' +
        button("Fechar", "close", "", "secondary") +
        (record.date >= P.today &&
        !["cancelada", "recusada"].includes(record.status)
          ? button("Cancelar agendamento", "booking-delete", key, "primary")
          : "") +
        "</div>",
    );
  }
  function notificationItems() {
    const visible = (r) => state.role === "diretor" ||
      (state.role === "coordenador" || r.teacherId === P.teacherId);
    const list = data.requests.filter(visible)
      .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
      .slice(0, 3).map((r) => ({
        id: state.role + "-" + r.id + "-" + r.status,
        title: r.status === "cancelada" ? "Agendamento cancelado" : "Agendamento confirmado",
        text: room(r.roomId).name + " · " + date(r.date) + " · " + time(r.start) + "–" + time(r.end),
        tone: r.status === "cancelada" ? "warning" : "success",
        icon: r.status === "cancelada" ? "close" : "check",
      }));
    const upcoming = data.allocations.filter((a) => visible(a) && a.status === "confirmada" &&
      new Date(a.date + "T00:00:00").getTime() + a.end * 3600000 > Date.now())
      .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start).slice(0, 2);
    for (const a of upcoming) list.push({
      id: state.role + "-aula-" + a.id, title: "Próxima aula · " + (a.subject || cls(a.classId).name),
      text: date(a.date) + " · " + time(a.start) + "–" + time(a.end) + " · " + room(a.roomId).name,
      tone: "info", icon: "calendar",
    });
    return list;
  }
  function notifications() {
    const list = notificationItems();
    show("Notificações", "Agendamentos e lembretes do seu perfil.",
      '<div class="notifications-list">' + (list.length ? list.map((n) =>
        '<article class="notification-item notification-' + n.tone + ' ' +
        (P.notificationRead.has(n.id) ? 'read' : '') + '">' + icon(n.icon) +
        '<div><strong>' + esc(n.title) + '</strong><p>' + esc(n.text) + '</p><small>' +
        (P.notificationRead.has(n.id) ? 'Lida' : 'Não lida') + '</small></div></article>'
      ).join('') : empty("Nenhuma notificação", "Seus agendamentos e lembretes aparecerão aqui.")) +
      '</div><div class="form-actions">' + button("Marcar todas como lidas", "notifications-read") + '</div>');
    P.lastNotifications = list.map((n) => n.id);
  }
  /* Detalhes da aula do docente: sala, horários, turma e disciplina do
     agendamento em andamento ou do próximo, com a agenda do dia. */
  function lessonLine(a) {
    return '<button type="button" class="today-item" data-action="booking-detail" data-id="a:' +
      esc(a.id) + '"><div><strong>' + esc(room(a.roomId).name) + '</strong><small>' +
      date(a.date) + " · " + time(a.start) + "–" + time(a.end) + '</small><small>' +
      esc(cls(a.classId).code + " · " + (a.subject || cls(a.classId).name)) +
      '</small></div><span>' + icon("arrow") + '</span></button>';
  }
  function teacherDetail(id) {
    if (!["coordenador", "diretor"].includes(state.role)) return;
    const person = teacher(id);
    if (!person) return;
    const now = new Date(),
      hour = now.getHours() + now.getMinutes() / 60,
      todayLessons = P.teacherSchedule(id, SIPAE_DATA.localDate(now)),
      situation = P.teacherSituation(person, now),
      upcoming = data.allocations
        .filter((a) => a.teacherId === id && a.status === "confirmada" &&
          (a.date > P.today || (a.date === P.today && a.end > hour)))
        .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
    const highlight = todayLessons.find((a) => hour >= a.start && hour < a.end) || upcoming[0];
    show(
      "Detalhes da aula",
      person.name + " · " + person.specialty,
      '<p class="modal-status">' + badge(situation.label, situation.tone) +
        "<span>" + esc(situation.detail) + "</span></p>" +
      (highlight
        ? '<h3 class="detail-title">' +
          (todayLessons.includes(highlight) && hour >= highlight.start && hour < highlight.end
            ? "Aula em andamento"
            : "Próxima aula") +
          '</h3><div class="detail-grid"><div><span>Sala</span><strong>' +
          esc(room(highlight.roomId).name) + "</strong></div><div><span>Horário de início</span><strong>" +
          time(highlight.start) + "</strong></div><div><span>Horário de término</span><strong>" +
          time(highlight.end) + "</strong></div><div><span>Turma</span><strong>" +
          esc(cls(highlight.classId).code + " · " + cls(highlight.classId).name) +
          "</strong></div><div><span>Disciplina</span><strong>" +
          esc(highlight.subject || cls(highlight.classId).name) +
          "</strong></div><div><span>Data</span><strong>" + date(highlight.date, true) +
          "</strong></div></div>"
        : empty("Nenhuma aula agendada", "Este docente não possui aulas em andamento nem futuras.")) +
      '<h3 class="detail-title">Agenda de hoje</h3><div class="today-list">' +
        (todayLessons.length
          ? todayLessons.map(lessonLine).join("")
          : empty("Sem aulas hoje", "Nenhum agendamento para a data atual.")) +
      "</div>" +
      (upcoming.length
        ? '<h3 class="detail-title">Próximos agendamentos</h3><div class="today-list">' +
          upcoming.slice(0, 5).map(lessonLine).join("") + "</div>"
        : "") +
      '<div class="form-actions">' + button("Fechar", "close", "", "secondary") + "</div>",
      true,
    );
  }
  function calendarDay(day) {
    const list = P.calendarRows()
      .filter((a) => a.date === day)
      .sort((a, b) => a.start - b.start);
    const isToday = day === P.today;
    show(
      isToday ? "Reservas de hoje" : "Reservas de " + date(day, true),
      (isToday ? date(day, true) + " · " : "") +
        (list.length
          ? list.length + (list.length === 1 ? " agendamento" : " agendamentos")
          : "nenhum agendamento"),
      '<div class="today-list">' +
        list
          .map(
            (a) =>
              '<button type="button" class="today-item" data-action="booking-detail" data-id="' +
              a.key +
              '"><div><strong>' +
              esc(room(a.roomId).name) +
              "</strong><small>" +
              esc(a.title) +
              " · " +
              esc(a.subtitle) +
              "</small></div><span>" +
              time(a.start) +
              "–" +
              time(a.end) +
              "</span></button>",
          )
          .join("") +
        "</div>" +
        (list.length
          ? ""
          : empty(
              isToday ? "Nenhuma reserva para hoje" : "Nenhuma reserva neste dia",
              "Use “+ Nova reserva” para agendar um horário.",
            )) +
        '<div class="form-actions">' +
        button("Fechar", "close", "", "secondary") +
        button("+ Nova reserva", "booking-date", day) +
        "</div>",
      true,
    );
  }
  function cancelBooking(key) {
    if (key.startsWith('e:')) {
      cancelExternal(key.slice(2), 'day');
      return;
    }
    show(
      "Cancelar agendamento",
      "",
      '<div class="confirmation-body"><div class="confirmation-icon">' +
        icon("alert") +
        '</div><p>Deseja cancelar este agendamento? O horário e as horas da disciplina serão liberados. O histórico será mantido com o status Cancelada.</p></div><div class="form-actions">' +
        button("Voltar", "close", "", "secondary") +
        button("Confirmar cancelamento", "booking-delete-confirm", key) +
        "</div>",
    );
  }
  function afterRender() {
    const dot = document.getElementById("notification-dot");
    if (dot) dot.hidden = notificationItems().every((n) => P.notificationRead.has(n.id));
  }
  /* Âncoras do calendário. As datas são sempre manipuladas ao meio-dia UTC,
     a partir da mesma data local usada para destacar o dia de hoje na grade. */
  const monthStart = (value) => value.slice(0, 7) + "-01";
  const weekStart = (value) => {
    const d = new Date(value + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return SIPAE_DATA.dateString(d);
  };
  function scrollTodayIntoView() {
    const cell = document.querySelector(
      ".calendar-panel .month-day.today, .calendar-panel .week-head.today",
    );
    const scroller = cell?.closest?.(".calendar-scroll");
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    scroller.scrollLeft = Math.max(
      0,
      cell.offsetLeft - scroller.clientWidth / 2 + cell.offsetWidth / 2,
    );
  }
  function setCalendar(mode, direction) {
    const f = P.local();
    // "Hoje" é uma visão de dia na página de Calendário e no card do Painel do
    // Docente; ambos exibem a grade com os ambientes e horários reservados.
    const hasDayView =
      state.page === "calendario" ||
      (state.page === "dashboard" && state.role === "docente");
    if (mode === "today") {
      if (hasDayView) {
        f.view = "day";
        f.anchor = P.today;
      } else {
        f.anchor = f.view === "month" ? monthStart(P.today) : weekStart(P.today);
      }
    } else if (mode === "month" || mode === "week") {
      // Ao trocar de visão, o período exibido que já contém hoje continua mostrando hoje.
      const base =
        f.view === "day" || f.anchor.slice(0, 7) === P.today.slice(0, 7)
          ? f.view === "day"
            ? f.anchor
            : P.today
          : f.anchor;
      f.view = mode;
      f.anchor = mode === "week" ? weekStart(base) : monthStart(base);
    } else {
      const d = new Date(f.anchor + "T12:00:00Z");
      if (f.view === "month") {
        d.setUTCDate(1);
        d.setUTCMonth(d.getUTCMonth() + direction);
      } else if (f.view === "day") d.setUTCDate(d.getUTCDate() + direction);
      else d.setUTCDate(d.getUTCDate() + 7 * direction);
      f.anchor = SIPAE_DATA.dateString(d);
    }
    S.render();
    if (mode === "today") {
      scrollTodayIntoView();
      // No painel, onde não existe grade de dia, "Hoje" abre as reservas da data.
      if (!hasDayView) {
        if (state.role === "docente") P.local().teacher = P.teacherId;
        calendarDay(P.today);
      }
    }
  }
  document.addEventListener("click", (event) => {
    const el = event.target.closest?.("[data-action]");
    if (!el) return;
    const action = el.dataset.action,
      id = el.dataset.id || "";
    if (action === "close") {
      externalCancellation = null;
      close();
      return;
    }
    if (action === "toggle-password") {
      const p = document.getElementById("login-password");
      p.type = p.type === "password" ? "text" : "password";
      el.setAttribute(
        "aria-label",
        p.type === "password" ? "Mostrar senha" : "Ocultar senha",
      );
      return;
    }
    if (action === "forgot-password") {
      show(
        "Recuperar acesso",
        "Este é um ambiente demonstrativo.",
        '<p>Use o NIF <strong>123456789</strong> e a senha <strong>sipae2026</strong> para acessar qualquer um dos três perfis.</p><div class="form-actions">' +
          button("Voltar ao login", "close") +
          "</div>",
      );
      return;
    }
    if (action === "booking-new") {
      bookingNew();
      return;
    }
    if (action === "booking-find") {
      close();
      location.hash = state.role + "/encontrar";
      return;
    }
    if (action === "booking-room") {
      const [roomId, date] = id.split("|");
      bookingNew({ roomId, date });
      return;
    }
    if (action === "booking-date") {
      bookingNew({ date: id });
      return;
    }
    if (action === "room-day") {
      const [roomId, date] = id.split("|");
      roomDay(roomId, date);
      return;
    }
    if (action === "room-detail") {
      roomDetail(id);
      return;
    }
    if (action === "room-new" || action === "room-edit") {
      roomForm(action === "room-edit" ? id : null);
      return;
    }
    if (action === "teacher-new" || action === "teacher-edit") {
      teacherForm(action === "teacher-edit" ? id : null);
      return;
    }
    if (action === "teacher-detail") {
      teacherDetail(id);
      return;
    }
    if (action === "teacher-toggle" && state.role === "diretor") {
      const t = teacher(id);
      show(
        t.status === "ativo" ? "Desativar Docente" : "Reativar Docente",
        t.name,
        "<p>" +
          (t.status === "ativo"
            ? "O docente deixará de receber novas reservas. O histórico e as aulas já planejadas serão preservados."
            : "O docente poderá receber novas reservas.") +
          '</p><div class="form-actions">' +
          button("Voltar", "close", "", "secondary") +
          button("Confirmar", "teacher-toggle-confirm", id) +
          "</div>",
      );
      return;
    }
    if (action === "teacher-toggle-confirm" && state.role === "diretor") {
      const t = teacher(id);
      t.status = t.status === "ativo" ? "inativo" : "ativo";
      done("Status do docente atualizado.");
      return;
    }
    if (action === "booking-detail") {
      bookingDetail(id);
      return;
    }
    if (action === "booking-delete") {
      cancelBooking(id);
      return;
    }
    if (action === 'external-cancel-day' || action === 'external-cancel-group') {
      cancelExternal(id, action === 'external-cancel-group' ? 'group' : 'day');
      return;
    }
    if (action === 'external-cancel-confirm') {
      const [scope, rid] = id.split('|');
      if (state.role !== 'diretor' || externalCancellation?.id !== rid || externalCancellation?.scope !== scope) return;
      if (typeof SIPAE_EXTERNAL_BOOKING === 'undefined') return;
      const result = SIPAE_EXTERNAL_BOOKING.cancel(data, state.role, rid, scope, new Date());
      if (result.error) {
        S.toast(result.error || 'Não foi possível cancelar os dias selecionados.');
        return;
      }
      externalCancellation = null;
      done('Reserva externa cancelada. Os horários selecionados foram liberados.');
      return;
    }
    if (action === "booking-delete-confirm") {
      if (id.startsWith('e:')) return;
      const [type, rid] = id.split(":"),
        record = (
          type === "a"
            ? data.allocations
            : type === "s"
              ? data.requests
              : data.externalReservations
        ).find((r) => r.id === rid);
      if (!record) return;
      if (state.role === "docente" && record.teacherId !== P.teacherId) return;
      if (record.status === "cancelada" || record.date < P.today) return;
      record.status = "cancelada";
      record.updatedAt = new Date().toISOString();
      if (type === "a")
        for (const r of data.requests.filter((r) => r.allocationId === rid)) {
          r.status = "cancelada";
          r.reason = "Cancelamento solicitado";
          r.updatedAt = record.updatedAt;
        }
      if (type === "s" && record.allocationId) {
        const a = data.allocations.find((a) => a.id === record.allocationId);
        if (a) a.status = "cancelada";
      }
      for (const request of data.requests.filter(
        (r) => r.status === "cancelada" && r.needId,
      )) {
        const need = data.needs.find((n) => n.id === request.needId);
        if (need) need.roomId = null;
      }
      done("Agendamento cancelado. Horário e saldo de horas liberados.");
      return;
    }
    if (action === "notifications") {
      notifications();
      return;
    }
    if (action === "notifications-read") {
      P.lastNotifications.forEach((id) => P.notificationRead.add(id));
      P.notificationRead.add("all-" + state.role);
      notifications();
      afterRender();
      S.toast("Todas as notificações foram marcadas como lidas.");
      return;
    }
    if (action === "calendar-day" || action === "teacher-day") {
      if (action === "teacher-day") {
        const f = P.local();
        f.teacher = P.teacherId;
      }
      calendarDay(id);
      return;
    }
    if (action.startsWith("calendar-")) {
      const mode = action.slice(9);
      setCalendar(mode, mode === "prev" ? -1 : 1);
      return;
    }
  });
  document.addEventListener("change", (event) => {
    if (["booking-subject", "booking-date"].includes(event.target.id))
      updateDisciplineBalance();
    if (event.target.matches("[data-room-block]") && state.role === "diretor") {
      room(event.target.dataset.roomBlock).externalBlocked =
        event.target.checked;
      S.toast("Regra para reservas externas atualizada.");
      return;
    }
    if (event.target.dataset.local) {
      const key = event.target.dataset.local;
      P.local()[key] = event.target.value;
      P.local().page = 0;
      S.render();
      document
        .querySelector('[data-local="' + key + '"]')
        ?.focus({ preventScroll: true });
      return;
    }
    if (
      event.target.closest?.(".booking-form") &&
      ["booking-room", "booking-date"].includes(event.target.id)
    ) {
      const form = event.target.form,
        el = document.getElementById("availability-panel");
      if (el)
        el.innerHTML = P.availability(
          form.elements["booking-room"].value,
          form.elements["booking-date"].value,
        );
    }
  });
  document.addEventListener("input", (event) => {
    if (event.target.dataset.local !== "query") return;
    const position = event.target.selectionStart;
    P.local().query = event.target.value;
    P.local().page = 0;
    S.render();
    const input = document.querySelector('[data-local="query"]');
    input?.focus({ preventScroll: true });
    if (position != null) input?.setSelectionRange(position, position);
  });
  document.addEventListener("click", (event) => {
    const el = event.target.closest?.("[data-local-page]");
    if (el) {
      P.local().page = Number(el.dataset.localPage);
      S.render();
    }
  });
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form.dataset.form) return;
    event.preventDefault();
    const values = new FormData(form),
      get = (name) => String(values.get(name) || "").trim();
    const type = form.dataset.form;
    if (type === "login") {
      if (
        get("login-nif") !== "123456789" ||
        get("login-password") !== "sipae2026"
      ) {
        formError(form, "Use as credenciais de demonstração indicadas abaixo.");
        return;
      }
      const role = get("login-role");
      if (!["docente", "coordenador", "diretor"].includes(role)) return;
      try {
        if (values.has("remember"))
          localStorage.setItem("sipae-demo-role", role);
        else localStorage.removeItem("sipae-demo-role");
      } catch {}
      location.hash = role + "/dashboard";
      return;
    }
    if (type === "profile") {
      if (state.role !== "docente" || state.page !== "perfil") return;
      const t = teacher(P.teacherId);
      Object.assign(t, {
        name: get("profile-fullname"),
        email: get("profile-email"),
        phone: get("profile-phone"),
        schedule: get("profile-schedule"),
      });
      t.specialty = t.disciplines[0];
      S.render();
      S.toast("Informações do perfil atualizadas.");
      return;
    }
    if (type === "management-profile") {
      if (!["coordenador", "diretor"].includes(state.role) || state.page !== "perfil") return;
      const profile = data.managementProfiles[state.role];
      const name = get("profile-fullname"), email = get("profile-email"), phone = get("profile-phone");
      if (name.length < 3 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          email.length > 120 || !phone || phone.length > 25)
        return formError(form, "Informe nome, e-mail e telefone válidos.");
      Object.assign(profile, { name, email, phone });
      S.render();
      S.toast("Informações do perfil atualizadas.");
      return;
    }
    if (type === "booking") {
      const base = {
        roomId: get("booking-room"),
        classId: get("booking-class"),
        teacherId:
          state.role === "docente" ? P.teacherId : get("booking-teacher"),
        date: get("booking-date"),
        start: asTime(get("booking-start")),
        end: asTime(get("booking-end")),
        subject: get("booking-subject"),
        note: get("booking-note"),
      };
      const slot = validSlot(base.date, base.start, base.end);
      if (slot) return formError(form, slot);
      base.shift = data.shifts.find(
        (s) => base.start >= s.start && base.end <= s.end,
      ).id;
      const target = room(base.roomId),
        group = cls(base.classId),
        t = teacher(base.teacherId);
      if (!target || !group || !t)
        return formError(form, "Dados da reserva inválidos.");
      if (group.shift !== base.shift)
        return formError(
          form,
          "O horário deve estar no turno da turma: " +
            U.shift(group.shift) +
            ".",
        );
      base.areaId = "unidade";
      if (state.role === "docente") {
        const subject = data.teacherSubjects.find(
          (d) => d.id === base.subject && d.teacherId === P.teacherId,
        );
        if (!subject)
          return formError(
            form,
            "Selecione uma disciplina vinculada ao seu perfil.",
          );
        base.disciplineId = subject.id;
        base.subject = subject.name;
      } else {
        const subject = data.teacherSubjects.find(
          (d) => d.teacherId === base.teacherId && d.name === base.subject,
        );
        if (base.teacherId === P.teacherId && !subject)
          return formError(
            form,
            "Informe uma disciplina vinculada ao docente: " +
              teacher(base.teacherId).disciplines.join(", ") +
              ".",
          );
        if (subject) base.disciplineId = subject.id;
      }
      const count =
        state.role === "docente" ? 1 : Number(get("booking-repeat"));
      if (![1, 2, 4].includes(count)) return;
      const bookings = [];
      for (let i = 0; i < count; i++) {
        const d = new Date(base.date + "T12:00Z");
        d.setUTCDate(d.getUTCDate() + i * 7);
        const r = { ...base, date: SIPAE_DATA.dateString(d) };
        const error = M.validateBooking(data, r);
        if (error) return formError(form, date(r.date) + ": " + error);
        bookings.push(r);
      }
      const creditGroups = new Map();
      for (const r of bookings.filter((r) => r.disciplineId)) {
        const key = r.disciplineId + "|" + r.date.slice(0, 7);
        const duration = (creditGroups.get(key) || 0) + r.end - r.start;
        creditGroups.set(key, duration);
        const error = M.creditError(data, { ...r, start: 0, end: duration });
        if (error) return formError(form, error);
      }
      bookings.forEach((r, i) => {
        const id = "nova-" + Date.now() + "-" + i;
        const request = {
          ...r,
          id,
          status: "confirmada",
          createdAt: new Date().toISOString(),
          decidedAt: new Date().toISOString(),
          reason: null,
        };
        {
          const allocationId = "aloc-" + id;
          data.allocations.push({
            ...r,
            id: allocationId,
            status: "confirmada",
            source: "agendamento",
            createdAt: request.createdAt,
          });
          request.allocationId = allocationId;
        }
        data.requests.push(request);
      });
      close();
      P.draft = {};
      S.render();
      S.toast(
        bookings.length +
          (bookings.length === 1
            ? " reserva registrada"
            : " reservas registradas") +
          ". Agendamento confirmado e agenda atualizada.",
      );
      return;
    }
    if (type === "room") {
      if (!["coordenador", "diretor"].includes(state.role)) return;
      const id = form.dataset.editId,
        existing = id ? room(id) : null,
        days = values.getAll("working-day").map(Number);
      if (!days.length)
        return formError(form, "Selecione pelo menos um dia de funcionamento.");
      const r = {
        name: get("room-name"),
        block: get("room-block"),
        type: get("room-type"),
        capacity: Number(get("room-capacity")),
        status: get("room-status"),
        areaId: "unidade",
        resources: values.getAll("resource").map(String),
        workingDays: days,
        externalBlocked:
          state.role === "diretor"
            ? values.has("external-blocked")
            : existing?.externalBlocked || false,
        responsible: get("room-responsible"),
        notes: get("room-notes"),
      };
      if (
        data.rooms.some(
          (x) => x.id !== id && x.name.toLowerCase() === r.name.toLowerCase(),
        )
      )
        return formError(form, "Já existe um ambiente com esse nome.");
      if (existing) {
        const future = P.allCalendarEvents().filter(
          (a) => a.roomId === id && a.date >= P.today,
        );
        if (
          future.some(
            (a) =>
              r.status !== "ativo" ||
              !days.includes(new Date(a.date + "T12:00Z").getUTCDay()) ||
              (a.external ? a.attendees : cls(a.classId).students) > r.capacity,
          )
        )
          return formError(
            form,
            "Essa alteração inviabiliza reservas confirmadas. Ajuste a agenda antes de alterar capacidade, dias ou manutenção.",
          );
        Object.assign(existing, r);
      } else
        data.rooms.push({
          ...r,
          id: "room-" + Date.now(),
          createdDate: P.today,
        });
      done(
        existing
          ? "Sala atualizada."
          : "Sala cadastrada. Totais de ambientes atualizados.",
      );
      return;
    }
    if (type === "teacher") {
      if (!["coordenador", "diretor"].includes(state.role)) return;
      const id = form.dataset.editId,
        t = id ? teacher(id) : null,
        nif = get("teacher-nif");
      if (data.teachers.some((x) => x.id !== id && x.nif === nif))
        return formError(form, "Já existe um docente com esse NIF.");
      const disciplines = get("teacher-subjects")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const record = {
        name: get("teacher-name"),
        nif,
        email: get("teacher-email"),
        areaId: "unidade",
        contractHours: Number(get("teacher-hours")),
        disciplines,
        specialty: disciplines[0],
        defaultRoomId: get("teacher-room"),
        status: get("teacher-status"),
      };
      if (t) Object.assign(t, record);
      else
        data.teachers.push({
          ...record,
          id: "teacher-" + Date.now(),
          phone: "",
          schedule: "integral",
        });
      done(t ? "Cadastro do docente atualizado." : "Docente cadastrado.");
      return;
    }
  });
  window.addEventListener("hashchange", () => {
    if (dialog.open) close();
    else unlockPageScroll();
  });
  Object.assign(P, {
    show,
    close,
    formError,
    validSlot,
    externalError,
    afterRender,
    roomDay,
    roomDetail,
    bookingNew,
  });
  S.render();
})();
