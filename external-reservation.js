(function () {
  "use strict";
  const S = SIPAE, { data, state, U, P } = S;
  const { esc, date, time, hours, icon } = U;
  const engine = SIPAE_EXTERNAL_BOOKING;
  let draft = null, matches = null, created = null;
  const action = (label, name, id = "", tone = "secondary") =>
    '<button type="button" class="button ' + tone + '" data-external-action="' + name + '" data-id="' + esc(id) + '">' + label + '</button>';
  const decimalTime = (value) => { const [h, m] = value.split(":").map(Number); return h + m / 60; };
  const fullDate = (value) => date(value) + " de " + value.slice(0, 4);
  const dateRange = () => draft.startDate === draft.endDate ? fullDate(draft.startDate) : fullDate(draft.startDate) + " a " + fullDate(draft.endDate);
  const dayCount = (n) => n + (n === 1 ? " dia" : " dias");
  const weekdays = [[1, "Segunda-feira"], [2, "Terça-feira"], [3, "Quarta-feira"], [4, "Quinta-feira"], [5, "Sexta-feira"], [6, "Sábado"], [0, "Domingo"]];
  const weekdaySummary = (days) => weekdays.filter(([id]) => days.includes(id)).map(([, label]) => label).join(", ");
  const periodSummary = () => '<div class="external-period-summary"><span>' + icon("calendar") + esc(dateRange()) + '</span><strong>' + esc(draft.start + "–" + draft.end) + ' em cada dia selecionado</strong><span>' + esc(weekdaySummary(draft.weekdays)) + '</span><span>' + draft.attendees + ' participantes</span></div>';
  function steps(current) {
    return '<ol class="external-steps" aria-label="Etapas da reserva">' + ["Período", "Ambiente", "Evento", "Confirmar"].map((name, i) =>
      '<li' + (i === current ? ' aria-current="step"' : '') + '><span>' + (i + 1) + '</span>' + name + '</li>').join("") + '</ol>';
  }
  function show(step, body) {
    if (state.role !== "diretor" || !draft) return;
    P.openDialog("Agendar reserva externa", "Reserve um ambiente para um ou mais dias.", '<div class="external-reservation">' + steps(step) + body + '</div>', true);
  }
  function defaultDay() {
    const d = new Date(); d.setDate(d.getDate() + 1);
    while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function open() {
    if (state.role !== "diretor") return;
    const day = defaultDay();
    draft = { startDate: day, endDate: day, weekdays: [1, 2, 3, 4, 5], start: "13:00", end: "17:00", attendees: 30, organization: "", contact: "", purpose: "", roomId: "" };
    matches = null; created = null;
    period();
  }
  function period() {
    const today = SIPAE_DATA.localDate();
    show(0, '<form data-external-form="period"><h3>Quando será o evento?</h3><p class="external-help">Escolha o período e os dias da semana. O horário será reservado somente nesses dias, entre a data inicial e a final. Você pode escolher um dia, vários meses ou um período maior.</p><div class="form-grid">' +
      P.field("direct-first", "Data inicial", P.input("direct-first", draft.startDate, "date", 'required min="' + today + '"')) +
      P.field("direct-last", "Data final", P.input("direct-last", draft.endDate, "date", 'required min="' + draft.startDate + '"')) +
      P.field("direct-months", "Definir data final a partir do início", P.select("direct-months", [["", "Escolher data manualmente"], ["1", "Daqui a 1 mês"], ["2", "Daqui a 2 meses"], ["3", "Daqui a 3 meses"], ["6", "Daqui a 6 meses"], ["12", "Daqui a 12 meses"]], ""), true) +
      '<fieldset class="external-weekdays full"><legend>Dias da semana</legend><div>' + weekdays.map(([id, label]) =>
        '<label><input type="checkbox" name="direct-weekday" value="' + id + '"' + (draft.weekdays.includes(id) ? ' checked' : '') + '><span>' + label + '</span></label>').join("") + '</div></fieldset>' +
      P.field("direct-start", "Horário de início", P.input("direct-start", draft.start, "time", 'required step="900"')) +
      P.field("direct-end", "Horário de término", P.input("direct-end", draft.end, "time", 'required step="900"')) +
      P.field("direct-attendees", "Quantidade de participantes", P.input("direct-attendees", draft.attendees, "number", 'required min="1" max="500" step="1"'), true) +
      '</div><p class="external-help">Horários dentro de um turno: 08h–12h, 13h–17h ou 18h–22h. A disponibilidade será conferida para o período completo.</p>' + P.formActions("Mostrar salas disponíveis") + '</form>');
  }
  function results(message = "") {
    matches = engine.search(data, draft);
    if (matches.error) { period(); P.formError(document.querySelector('[data-external-form="period"]'), matches.error); return; }
    const list = matches.rooms;
    const unavailable = matches.unavailable.length ? '<details class="external-unavailable"><summary>Por que outros ambientes não estão disponíveis? (' + matches.unavailable.length + ')</summary><ul>' + matches.unavailable.map((item) => '<li><strong>' + esc(item.room.name) + '</strong> — ' + (item.date ? esc(date(item.date)) + ': ' : '') + esc(item.reason) + '</li>').join("") + '</ul></details>' : '';
    show(1, periodSummary() + (message ? '<p class="form-error" role="alert">' + esc(message) + '</p>' : '') +
      '<div class="finder-result-heading"><h3>' + list.length + (list.length === 1 ? ' sala disponível' : ' salas disponíveis') + '</h3>' + (list.length ? '<span class="badge green">Disponível por ' + dayCount(matches.dates.length) + '</span>' : '') + '</div>' +
      (list.length ? '<p class="external-help">Escolha o ambiente para continuar com os dados do evento.</p><div class="external-room-grid">' + list.map((r) => '<article class="finder-room">' + (S.RoomMedia ? S.RoomMedia.visual(r, true) : '') + '<div class="finder-room-body"><div class="finder-room-heading"><div><span class="eyebrow">BLOCO ' + esc(r.block) + '</span><h3>' + esc(r.name) + '</h3></div><span>' + r.capacity + ' lugares</span></div><div class="tags">' + r.resources.map((x) => '<span class="tag">' + esc(x) + '</span>').join("") + '</div>' + action('Selecionar ' + esc(r.name), "room", r.id, "primary") + '</div></article>').join("") + '</div>' : '<div class="finder-empty"><h3>Nenhuma sala atende ao período completo</h3><p>Altere as datas, os horários ou o número de participantes. Nenhum dia foi reservado.</p></div>') + unavailable + '<div class="form-actions">' + action("Alterar período", "period") + '</div>');
  }
  function selectedRoom() { return data.rooms.find((r) => r.id === draft.roomId); }
  function eventForm() {
    const r = selectedRoom();
    show(2, periodSummary() + '<div class="external-selected"><div><span class="eyebrow">AMBIENTE SELECIONADO</span><h3>' + esc(r.name) + '</h3><p>Bloco ' + esc(r.block) + ' · ' + r.capacity + ' lugares</p></div>' + action("Trocar sala", "rooms") + '</div><form data-external-form="event"><div class="form-grid">' +
      P.field("direct-organization", "Instituição ou responsável", P.input("direct-organization", draft.organization, "text", 'required minlength="3" maxlength="100" placeholder="Quem utilizará o espaço?"'), true) +
      P.field("direct-contact", "Contato (e-mail ou telefone)", P.input("direct-contact", draft.contact, "text", 'required minlength="3" maxlength="120"'), true) +
      P.field("direct-purpose", "Finalidade do evento", P.textArea("direct-purpose", draft.purpose, 'required minlength="5" maxlength="400" placeholder="Descreva a atividade que será realizada."'), true) + '</div>' + P.errorBox() + '<div class="form-actions">' + action("Voltar às salas", "rooms") + '<button class="button primary" type="submit">Revisar reserva</button></div></form>');
  }
  function rememberEvent() {
    const form = document.querySelector('[data-external-form="event"]');
    if (!form) return;
    const fields = new FormData(form);
    draft.organization = String(fields.get("direct-organization") || "").trim();
    draft.contact = String(fields.get("direct-contact") || "").trim();
    draft.purpose = String(fields.get("direct-purpose") || "").trim();
  }
  function review() {
    const result = engine.search(data, draft);
    if (result.error || !result.rooms.some((r) => r.id === draft.roomId)) { results(result.error || "A disponibilidade mudou. Escolha uma sala para o período completo."); return; }
    matches = result;
    const r = selectedRoom();
    const duration = decimalTime(draft.end) - decimalTime(draft.start);
    show(3, '<div class="external-review-heading"><span class="eyebrow">CONFIRA ANTES DE AGENDAR</span><h3>' + esc(r.name) + '</h3><p>Bloco ' + esc(r.block) + ' · ' + r.capacity + ' lugares</p></div>' + periodSummary() +
      '<div class="report-detail-summary"><div><strong>' + dayCount(result.dates.length) + '</strong><span>No mesmo ambiente</span></div><div><strong>' + hours(duration) + '</strong><span>Em cada dia</span></div><div><strong>' + hours(duration * result.dates.length) + '</strong><span>Tempo total reservado</span></div></div><dl class="external-event-summary"><div><dt>Instituição ou responsável</dt><dd>' + esc(draft.organization) + '</dd></div><div><dt>Contato</dt><dd>' + esc(draft.contact) + '</dd></div><div><dt>Finalidade</dt><dd>' + esc(draft.purpose) + '</dd></div></dl>' +
      '<details class="external-date-list"><summary>Conferir os ' + dayCount(result.dates.length) + ' do agendamento</summary><ul>' + result.dates.map((d) => '<li>' + esc(fullDate(d)) + '<span>' + esc(draft.start + "–" + draft.end) + '</span></li>').join("") + '</ul></details><p class="external-confirm-note">Ao confirmar, todos os dias serão agendados diretamente e aparecerão no calendário. Nenhum dia será salvo se houver impedimento.</p><form data-external-form="confirm">' + P.errorBox() + '<div class="form-actions">' + action("Voltar aos dados", "event") + '<button type="submit" class="button primary">Confirmar reserva externa</button></div></form>');
  }
  function success(records) {
    created = records;
    const r = selectedRoom(), range = dateRange(), q = { ...draft };
    draft = null; matches = null;
    S.render();
    P.openDialog("Reserva externa confirmada", "Todos os dias selecionados foram agendados.", '<div class="external-success"><div class="external-success-icon">' + icon("check") + '</div><h3>' + esc(r.name) + '</h3><p>' + esc(q.organization) + '</p><div class="external-period-summary"><strong>' + dayCount(records.length) + (records.length === 1 ? ' confirmado' : ' confirmados') + '</strong><span>' + esc(range) + '</span><span>' + esc(weekdaySummary(q.weekdays)) + '</span><span>' + esc(q.start + "–" + q.end) + ' em cada dia</span></div><p class="external-help">Você pode consultar os detalhes e cancelar um dia ou os dias futuros deste agendamento.</p><div class="form-actions">' + P.button("Ver detalhes da reserva", "booking-detail", "e:" + records[0].id) + action("Ver reservas externas", "list") + '</div></div>', true);
    S.toast("Reserva externa confirmada em " + dayCount(records.length) + ".");
  }
  document.addEventListener("click", (event) => {
    const opener = event.target.closest?.('[data-action="external-direct"]');
    const control = event.target.closest?.("[data-external-action]");
    if ((!opener && !control) || state.role !== "diretor") return;
    event.preventDefault();
    if (opener) { open(); return; }
    const name = control.dataset.externalAction;
    if (name === "list" && created) {
      P.local["diretor/externas"] = { ...(P.local["diretor/externas"] || {}), status: "todos", period: "todos" };
      P.close();
      if (state.page === "externas") S.render(); else location.hash = "diretor/externas";
      return;
    }
    if (!draft) return;
    if (name === "period") period();
    if (name === "rooms") { rememberEvent(); results(); }
    if (name === "event") eventForm();
    if (name === "room") {
      const result = engine.search(data, draft);
      if (result.error || !result.rooms.some((r) => r.id === control.dataset.id)) { results("A disponibilidade mudou. Confira os ambientes disponíveis."); return; }
      draft.roomId = control.dataset.id;
      eventForm();
    }
  });
  document.addEventListener("change", (event) => {
    if (!draft) return;
    if (event.target.id === "direct-last") document.getElementById("direct-months").value = "";
    if (!["direct-first", "direct-months"].includes(event.target.id)) return;
    const first = document.getElementById("direct-first");
    const last = document.getElementById("direct-last");
    last.min = first.value;
    const months = Number(document.getElementById("direct-months").value);
    if (months && first.value) {
      const start = new Date(first.value + "T12:00:00Z"), target = new Date(start);
      target.setUTCDate(1);
      target.setUTCMonth(target.getUTCMonth() + months);
      const maxDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
      target.setUTCDate(Math.min(start.getUTCDate(), maxDay));
      last.value = target.toISOString().slice(0, 10);
    } else if (last.value < first.value) last.value = first.value;
  });
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form.dataset.externalForm) return;
    event.preventDefault();
    if (state.role !== "diretor" || !draft) return;
    const kind = form.dataset.externalForm;
    if (kind === "period") {
      const values = new FormData(form);
      Object.assign(draft, { startDate: String(values.get("direct-first") || ""), endDate: String(values.get("direct-last") || ""), weekdays: values.getAll("direct-weekday").map(Number), start: String(values.get("direct-start") || ""), end: String(values.get("direct-end") || ""), attendees: Number(values.get("direct-attendees")), roomId: "" });
      const result = engine.search(data, draft);
      if (result.error) { P.formError(form, result.error); return; }
      results();
    }
    if (kind === "event") {
      rememberEvent();
      if (draft.organization.length < 3 || draft.organization.length > 100 || draft.contact.length < 3 || draft.contact.length > 120 || draft.purpose.length < 5 || draft.purpose.length > 400) { P.formError(form, "Preencha a instituição, um contato e a finalidade do evento."); return; }
      review();
    }
    if (kind === "confirm") {
      const result = engine.confirm(data, state.role, draft);
      if (result.error) { P.formError(form, result.error); return; }
      success(result.records);
    }
  });
  window.addEventListener("hashchange", () => { draft = null; matches = null; created = null; });
})();
