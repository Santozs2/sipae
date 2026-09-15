(function (global) {
  "use strict";
  const sum = (list, fn = (x) => x) => list.reduce((n, x) => n + fn(x), 0);
  const mean = (list) => (list.length ? sum(list) / list.length : null);
  const ratio = (n, d) => (d > 0 ? (n / d) * 100 : 0);
  const current = new Date(SIPAE_DATA.localDate() + "T12:00:00Z");
  const monthDate = (offset, day = 1) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, day, 12));
  const labelMonth = (d) => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  const monday = new Date(current);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const friday = new Date(monday);
  friday.setUTCDate(friday.getUTCDate() + 4);
  const periods = {
    semana: { start: SIPAE_DATA.dateString(monday), end: SIPAE_DATA.dateString(friday), label: "Semana atual" },
    mes: { start: SIPAE_DATA.dateString(monthDate(0)), end: SIPAE_DATA.dateString(monthDate(1, 0)), label: labelMonth(current) },
    anterior: { start: SIPAE_DATA.dateString(monthDate(-1)), end: SIPAE_DATA.dateString(monthDate(0, 0)), label: labelMonth(monthDate(-1)) },
    semestre: { start: SIPAE_DATA.dateString(monthDate(-5)), end: SIPAE_DATA.dateString(monthDate(1, 0)), label: labelMonth(monthDate(-5)) + " a " + labelMonth(current) },
  };
  function period(f = {}) {
    return f.start && f.end
      ? {
          start: f.start,
          end: f.end,
          label: f.label || f.start + " a " + f.end,
        }
      : periods[f.period || "mes"];
  }
  function inRange(date, f) {
    const p = period(f);
    return date >= p.start && date <= p.end;
  }
  function scope(record, f) {
    return (
      (!f.area || f.area === "todas" || record.areaId === f.area) &&
      (!f.shift || f.shift === "todos" || record.shift === f.shift) &&
      (!f.teacher || f.teacher === "todos" || record.teacherId === f.teacher)
    );
  }
  function allocations(data, f = {}) {
    return data.allocations.filter(
      (a) => a.status === "confirmada" && inRange(a.date, f) && scope(a, f),
    );
  }
  function requests(data, f = {}) {
    return data.requests.filter((r) => inRange(r.date, f) && scope(r, f));
  }
  function conflicts(data, f = {}) {
    return data.conflicts.filter((c) => inRange(c.date, f) && scope(c, f));
  }
  function businessDays(f) {
    const p = period(f);
    return SIPAE_DATA.dates(p.start, p.end).filter((date) => {
      const day = new Date(date + "T12:00Z").getUTCDay();
      return day > 0 && day < 6;
    });
  }
  function availableHours(room, f = {}) {
    return room.status === "ativo"
      ? businessDays(f).filter(
          (d) =>
            (!room.createdDate || d >= room.createdDate) &&
            (room.workingDays || [1, 2, 3, 4, 5]).includes(
              new Date(d + "T12:00Z").getUTCDay(),
            ),
        ).length * (f.shift && f.shift !== "todos" ? 4 : 12)
      : 0;
  }
  // União de intervalos: colisões nunca duplicam as horas efetivamente ocupadas.
  function unionHours(items, keyFn) {
    const groups = new Map();
    items.forEach((a) => {
      const key = keyFn(a);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push([a.start, a.end]);
    });
    let total = 0;
    for (const list of groups.values()) {
      list.sort((a, b) => a[0] - b[0]);
      let start = null,
        end = null;
      for (const interval of list) {
        if (start === null) {
          [start, end] = interval;
        } else if (interval[0] <= end) {
          end = Math.max(end, interval[1]);
        } else {
          total += end - start;
          [start, end] = interval;
        }
      }
      if (start !== null) total += end - start;
    }
    return total;
  }
  function roomStats(data, f = {}) {
    const selected = [
      ...allocations(data, f),
      ...(data.externalReservations || []).filter(
        (r) => r.status === "aprovada" && inRange(r.date, f) && scope(r, f),
      ),
    ];
    return data.rooms
      .filter((r) => !f.area || f.area === "todas" || r.areaId === f.area)
      .map((room) => {
        const items = selected.filter((a) => a.roomId === room.id);
        const used = unionHours(items, (a) => a.date);
        const available = availableHours(room, f);
        return {
          ...room,
          used,
          available,
          idle: Math.max(0, available - used),
          occupancy: ratio(used, available),
          bookings: items.length,
        };
      });
  }
  function overview(data, f = {}) {
    const roomRows = roomStats(data, f);
    const available = sum(roomRows, (r) => r.available),
      used = sum(roomRows, (r) => r.used);
    const selected = allocations(data, f),
      cs = conflicts(data, f),
      rs = requests(data, f);
    const approved = rs.filter((r) => r.status === "aprovada" && r.decidedAt);
    return {
      used,
      available,
      occupancy: ratio(used, available),
      rooms: roomRows,
      hours: sum(selected, (a) => a.end - a.start),
      bookings: selected.length,
      requests: rs.length,
      approvalHours: mean(
        approved.map(
          (r) => (new Date(r.decidedAt) - new Date(r.createdAt)) / 3600000,
        ),
      ),
      active: cs.filter((c) => c.status === "ativo").length,
      resolved: cs.filter((c) => c.status === "resolvido").length,
      resolvedRate: ratio(
        cs.filter((c) => c.status === "resolvido").length,
        cs.length,
      ),
      refusalRate: ratio(
        rs.filter((r) => r.status === "recusada").length,
        rs.filter((r) => ["aprovada", "recusada"].includes(r.status)).length,
      ),
    };
  }
  function areaStats(data, f = {}) {
    return data.areas
      .filter((a) => !f.area || f.area === "todas" || a.id === f.area)
      .map((a) => ({ ...a, ...overview(data, { ...f, area: a.id }) }));
  }
  function monthly(data, f = {}) {
    const p = period(f);
    const result = [];
    const cursor = new Date(p.start.slice(0, 7) + "-01T12:00:00Z");
    while (SIPAE_DATA.dateString(cursor) <= p.end) {
      const m = cursor.getUTCMonth() + 1;
      const start = SIPAE_DATA.dateString(cursor);
      const end = SIPAE_DATA.dateString(new Date(Date.UTC(cursor.getUTCFullYear(), m, 0, 12)));
      const filter = {
        ...f,
        start: start > p.start ? start : p.start,
        end: end < p.end ? end : p.end,
      };
      result.push({
        month: m,
        label: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(cursor).replace(".", ""),
        ...overview(data, filter),
        areas: areaStats(data, filter),
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return result;
  }
  function statusCounts(data, f) {
    const list = requests(data, f);
    return ["confirmada", "cancelada"].map((status) => ({
      status,
      count: list.filter((r) => r.status === status).length,
    }));
  }
  function teacherLoad(data, f) {
    const weekdays = businessDays(f).length;
    return data.teachers
      .filter(
        (t) =>
          (!f.area || f.area === "todas" || t.areaId === f.area) &&
          (!f.teacher || f.teacher === "todos" || t.id === f.teacher),
      )
      .map((t) => {
        const items = allocations(data, f).filter((a) => a.teacherId === t.id);
        const hours = unionHours(items, (a) => a.date);
        const contracted = (t.contractHours * weekdays) / 5;
        return { ...t, hours, contracted, load: ratio(hours, contracted) };
      })
      .sort((a, b) => b.load - a.load);
  }
  function peak(data, f) {
    const rows = [];
    for (const s of data.shifts)
      for (let day = 0; day < 5; day++) {
        const sf = { ...f, shift: s.id };
        const dates = businessDays(sf).filter(
          (d) => new Date(d + "T12:00Z").getUTCDay() === day + 1,
        );
        const rooms = data.rooms.filter(
          (r) =>
            r.status === "ativo" &&
            (!f.area || f.area === "todas" || r.areaId === f.area),
        );
        const selected = allocations(data, sf).filter((a) =>
          dates.includes(a.date),
        );
        const used = unionHours(selected, (a) => a.roomId + "|" + a.date);
        const available = sum(
          rooms,
          (r) =>
            dates.filter(
              (d) =>
                (!r.createdDate || d >= r.createdDate) &&
                (r.workingDays || [1, 2, 3, 4, 5]).includes(day + 1),
            ).length * 4,
        );
        rows.push({
          day,
          shift: s.id,
          used,
          available,
          value: ratio(used, available),
        });
      }
    return rows;
  }
  function weeklyConflicts(data, f) {
    const p = period(f);
    const buckets = [];
    const d = new Date(p.start + "T12:00Z");
    const offset = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - offset);
    while (d.toISOString().slice(0, 10) <= p.end) {
      const start = d.toISOString().slice(0, 10);
      d.setUTCDate(d.getUTCDate() + 6);
      const end = d.toISOString().slice(0, 10);
      const list = conflicts(data, f).filter(
        (c) => c.date >= start && c.date <= end,
      );
      buckets.push({
        start,
        label: start.slice(8) + "/" + start.slice(5, 7),
        counts: Object.fromEntries(
          Object.keys(data.kinds).map((k) => [
            k,
            list.filter((c) => c.kind === k).length,
          ]),
        ),
      });
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return buckets;
  }
  function capacity(data, f) {
    const rows = allocations(data, f).map((a) => {
      const room = data.rooms.find((r) => r.id === a.roomId),
        cls = data.classes.find((c) => c.id === a.classId);
      return {
        ...a,
        room,
        cls,
        fill: ratio(cls.students, room.capacity),
        wastedSeatsHours:
          Math.max(0, room.capacity - cls.students) * (a.end - a.start),
      };
    });
    const problems = conflicts(data, f)
      .filter((c) => c.kind === "capacidade" && c.status === "ativo")
      .map((c) => {
        const room = data.rooms.find((r) => r.id === c.roomId),
          cls = data.classes.find((t) => t.id === c.classId);
        return {
          ...c,
          room,
          cls,
          fill: ratio(cls.students, room.capacity),
          proposal: true,
        };
      });
    return { rows, problems, wasted: sum(rows, (r) => r.wastedSeatsHours) };
  }
  function validateBooking(data, r) {
    const room = data.rooms.find((x) => x.id === r.roomId),
      cls = data.classes.find((x) => x.id === r.classId);
    if (!room || !cls) return "Ambiente ou turma não encontrado.";
    const t = data.teachers.find((t) => t.id === r.teacherId);
    if (!t || t.status === "inativo")
      return "Docente indisponível para novas reservas.";
    if (
      !(room.workingDays || [1, 2, 3, 4, 5]).includes(
        new Date(r.date + "T12:00Z").getUTCDay(),
      )
    )
      return "O ambiente não funciona nesse dia.";
    if (
      (data.externalReservations || []).some(
        (e) =>
          e.status === "aprovada" &&
          e.roomId === r.roomId &&
          e.date === r.date &&
          e.start < r.end &&
          r.start < e.end,
      )
    )
      return "O ambiente já está reservado para um evento externo.";
    if (room.status !== "ativo") return "O ambiente está em manutenção.";
    if (cls.students > room.capacity)
      return "A turma excede a capacidade do ambiente.";
    const match = data.allocations.filter(
      (a) =>
        a.date === r.date &&
        a.status === "confirmada" &&
        a.start < r.end &&
        r.start < a.end,
    );
    if (match.some((a) => a.roomId === r.roomId))
      return "O ambiente já está reservado nesse horário.";
    if (match.some((a) => a.teacherId === r.teacherId))
      return "O docente já está alocado nesse horário.";
    if (match.some((a) => a.classId === r.classId))
      return "A turma já tem uma aula nesse horário.";
    return creditError(data, r);
  }
  function disciplineCredits(
    data,
    teacherId,
    month = data.today.slice(0, 7),
  ) {
    return (data.teacherSubjects || [])
      .filter((d) => d.teacherId === teacherId)
      .map((d) => {
        const lessons = data.allocations.filter(
          (a) =>
            a.status === "confirmada" &&
            a.teacherId === teacherId &&
            a.disciplineId === d.id &&
            a.date.slice(0, 7) === month,
        );
        let realized = 0,
          scheduled = 0;
        for (const a of lessons) {
          const end =
            new Date(a.date + "T00:00:00").getTime() + a.end * 3600000;
          if (end <= new Date(data.reference).getTime())
            realized += a.end - a.start;
          else scheduled += a.end - a.start;
        }
        return {
          ...d,
          realized,
          scheduled,
          remaining: Math.max(0, d.monthlyHours - realized - scheduled),
          month,
        };
      });
  }
  function creditError(data, r) {
    if (!r.disciplineId) return null;
    const row = disciplineCredits(data, r.teacherId, r.date.slice(0, 7)).find(
      (d) => d.id === r.disciplineId,
    );
    if (!row) return "Selecione uma disciplina vinculada ao docente.";
    if (r.end - r.start > row.remaining + 0.00001)
      return (
        "Saldo insuficiente para " +
        row.name +
        ": restam " +
        row.remaining.toLocaleString("pt-BR") +
        " h neste mês."
      );
    return null;
  }
  global.SIPAE_METRICS = {
    sum,
    mean,
    ratio,
    periods,
    period,
    inRange,
    scope,
    allocations,
    requests,
    conflicts,
    businessDays,
    availableHours,
    unionHours,
    roomStats,
    overview,
    areaStats,
    monthly,
    statusCounts,
    teacherLoad,
    peak,
    weeklyConflicts,
    capacity,
    disciplineCredits,
    creditError,
    validateBooking,
  };
})(globalThis);
