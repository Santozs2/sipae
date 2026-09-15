/* Reservas externas por período: busca sem efeitos e confirmação atômica. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SIPAE_EXTERNAL_BOOKING = api;
})(globalThis, function () {
  "use strict";
  const DAY = 86400000;
  const fail = (error) => ({ error, dates: [], rooms: [], unavailable: [] });
  const localDate = (now) => [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  const localHour = (now) => now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600 + now.getMilliseconds() / 3600000;

  function dateValue(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const stamp = Date.parse(value + "T12:00:00Z");
    return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value ? stamp : NaN;
  }
  function timeValue(value) {
    if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
    const [hours, minutes] = value.split(":").map(Number);
    return minutes % 15 === 0 ? hours + minutes / 60 : NaN;
  }
  function prepare(data, query, now) {
    if (!now || typeof now.getTime !== "function" || !Number.isFinite(now.getTime()))
      return { error: "Não foi possível conferir a data atual. Atualize a página." };
    const first = dateValue(query.startDate), last = dateValue(query.endDate);
    if (!Number.isFinite(first) || !Number.isFinite(last)) return { error: "Informe datas inicial e final válidas." };
    if (last < first) return { error: "A data final deve ser igual ou posterior à data inicial." };
    const weekdays = query.weekdays === undefined ? [0, 1, 2, 3, 4, 5, 6] : query.weekdays;
    if (!Array.isArray(weekdays) || !weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6))
      return { error: "Selecione pelo menos um dia da semana válido." };
    const start = timeValue(query.start), end = timeValue(query.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end)
      return { error: "Informe início e fim em intervalos de 15 minutos, com o fim posterior ao início." };
    const shift = (data.shifts || []).find((item) => start >= item.start && end <= item.end);
    if (!shift) return { error: "Escolha horários dentro de um único turno de funcionamento." };
    const today = localDate(now);
    if (query.startDate < today)
      return { error: "Escolha uma data e um horário de início futuros." };
    const attendees = typeof query.attendees === "number" || typeof query.attendees === "string" ? Number(query.attendees) : NaN;
    if (!Number.isInteger(attendees) || attendees < 1 || attendees > 500)
      return { error: "Informe um público inteiro entre 1 e 500 participantes." };
    const dates = [];
    for (let stamp = first; stamp <= last; stamp += DAY) {
      const date = new Date(stamp);
      if (weekdays.includes(date.getUTCDay())) dates.push(date.toISOString().slice(0, 10));
    }
    if (!dates.length) return { error: "O período não contém os dias da semana selecionados. Ajuste as datas ou os dias." };
    if (dates[0] === today && start <= localHour(now)) return { error: "Escolha uma data e um horário de início futuros." };
    return { error: null, dates, weekdays: [...new Set(weekdays)].sort(), start, end, shift: shift.id, attendees };
  }
  function roomProblem(room, slot, events) {
    if (room.status !== "ativo") return { date: slot.dates[0], reason: "Ambiente em manutenção ou inativo." };
    if (room.externalBlocked) return { date: slot.dates[0], reason: "Ambiente bloqueado para reservas externas." };
    if (!Number.isFinite(Number(room.capacity)) || Number(room.capacity) < slot.attendees)
      return { date: slot.dates[0], reason: "A capacidade do ambiente é menor que o público informado." };
    for (const date of slot.dates) {
      if (room.createdDate && room.createdDate > date) return { date, reason: "O ambiente ainda não está disponível nessa data." };
      if (!(room.workingDays || [1, 2, 3, 4, 5]).includes(new Date(date + "T12:00:00Z").getUTCDay()))
        return { date, reason: "O ambiente não funciona nesse dia; todas as ocorrências selecionadas precisam estar disponíveis." };
      const conflict = events.find((event) => event.roomId === room.id && event.date === date && event.start < slot.end && slot.start < event.end);
      if (conflict) return { date, reason: conflict.status === "pendente" ? "Há uma solicitação externa pendente nesse horário." : "O ambiente já possui uma reserva nesse horário." };
    }
    return null;
  }
  function search(data, query = {}, now = new Date()) {
    const slot = prepare(data, query || {}, now);
    if (slot.error) return fail(slot.error);
    const events = [
      ...(data.allocations || []).filter((event) => event.status === "confirmada"),
      ...(data.externalReservations || []).filter((event) => ["aprovada", "pendente"].includes(event.status)),
    ];
    const rooms = [], unavailable = [];
    for (const room of data.rooms || []) {
      const problem = roomProblem(room, slot, events);
      if (problem) unavailable.push({ room, ...problem });
      else rooms.push(room);
    }
    rooms.sort((a, b) => Number(a.capacity) - Number(b.capacity) || String(a.name).localeCompare(String(b.name), "pt-BR"));
    return { error: null, dates: slot.dates, rooms, unavailable };
  }
  function confirm(data, role, input = {}, now = new Date()) {
    const rejected = (error) => ({ error, records: [], groupId: null });
    if (role !== "diretor") return rejected("Somente a Direção pode confirmar uma reserva externa diretamente.");
    input = input || {};
    const details = {};
    for (const [key, label, max] of [["organization", "a instituição ou o responsável", 160], ["contact", "o contato", 200], ["purpose", "a finalidade da reserva", 500]]) {
      const value = typeof input[key] === "string" ? input[key].trim() : "";
      if (!value) return rejected("Informe " + label + ".");
      if (value.length > max) return rejected("Use até " + max + " caracteres para " + label + ".");
      details[key] = value;
    }
    // Reconfere todos os dias com os dados atuais; nenhuma ocorrência é criada parcialmente.
    const result = search(data, input, now);
    if (result.error) return rejected(result.error);
    if (!result.rooms.some((room) => room.id === input.roomId)) {
      const unavailable = result.unavailable.find((item) => item.room.id === input.roomId);
      return rejected(unavailable ? unavailable.date.split("-").reverse().join("/") + ": " + unavailable.reason : "Selecione um ambiente disponível para todo o período.");
    }
    const slot = prepare(data, input, now);
    const existing = data.externalReservations || [];
    const identifiers = new Set(existing.flatMap((record) => [record.id, record.groupId]).filter(Boolean));
    let suffix = 1, groupId, ids;
    do {
      const token = now.getTime().toString(36) + "-" + suffix++;
      groupId = "ext-group-" + token;
      ids = result.dates.map((_, index) => "ext-direct-" + token + "-" + (index + 1));
    } while (identifiers.has(groupId) || ids.some((id) => identifiers.has(id)));
    const records = result.dates.map((date, index) => ({
      ...details, id: ids[index], groupId, groupStartDate: input.startDate, groupEndDate: input.endDate,
      groupWeekdays: [...slot.weekdays],
      roomId: input.roomId, date, start: slot.start, end: slot.end, shift: slot.shift,
      attendees: slot.attendees, areaId: "unidade", status: "aprovada", priority: "normal",
      source: "diretor", direct: true, createdAt: now.toISOString(), decidedAt: now.toISOString(),
    }));
    if (!data.externalReservations) data.externalReservations = [];
    data.externalReservations.push(...records);
    return { error: null, records, groupId };
  }
  function cancel(data, role, id, scope = "day", now = new Date()) {
    const rejected = (error) => ({ error, records: [] });
    if (role !== "diretor") return rejected("Somente a Direção pode cancelar uma reserva externa.");
    if (!["day", "group"].includes(scope)) return rejected("Selecione o cancelamento deste dia ou de todo o período futuro.");
    if (!now || typeof now.getTime !== "function" || !Number.isFinite(now.getTime())) return rejected("Não foi possível conferir a data atual.");
    const existing = data.externalReservations || [];
    const target = existing.find((record) => record.id === id);
    if (!target) return rejected("Reserva externa não encontrada.");
    const today = localDate(now), hour = localHour(now);
    const records = existing.filter((record) =>
      (scope === "group" && target.groupId ? record.groupId === target.groupId : record.id === target.id) &&
      record.status === "aprovada" && (record.date > today || record.date === today && record.start > hour));
    if (!records.length) return rejected("Não há reservas confirmadas futuras para cancelar nesse período.");
    for (const record of records) {
      record.status = "cancelada";
      record.cancelledAt = now.toISOString();
      record.cancelledBy = "diretor";
    }
    return { error: null, records };
  }
  return { search, confirm, cancel };
});
