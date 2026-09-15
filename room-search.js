/* Busca somente leitura. A confirmação continua nas ações de reserva existentes. */
(function (global) {
  "use strict";
  function search(data, M, query, role, now = new Date()) {
    const fail = (error) => ({ error, rooms: [] });
    if (!["docente", "coordenador", "diretor"].includes(role)) return fail("Perfil inválido.");
    const teacherId = role === "docente" ? "t4" : query.teacherId;
    const teacher = data.teachers.find((t) => t.id === teacherId);
    const group = data.classes.find((c) => c.id === query.classId);
    const duration = Number(query.duration);
    const day = new Date(query.date + "T12:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query.date || "") || !Number.isFinite(day.getTime()) ||
        day.toISOString().slice(0, 10) !== query.date) return fail("Informe uma data válida.");
    const today = SIPAE_DATA.localDate(now);
    if (query.date < today) return fail("Escolha uma data a partir de hoje.");
    if (!teacher || teacher.status === "inativo" || !group) return fail("Selecione uma turma e um docente ativo.");
    if (!Number.isFinite(duration) || duration < 0.5 || duration > 4 || !Number.isInteger(duration * 4))
      return fail("Escolha uma duração entre 30 minutos e 4 horas, em intervalos de 15 minutos.");
    const subject = data.teacherSubjects.find((s) => s.id === query.disciplineId && s.teacherId === teacherId);
    if (!subject) return fail("Selecione uma disciplina vinculada ao docente.");
    const shift = data.shifts.find((s) => s.id === group.shift);
    if (!shift) return fail("A turma não possui turno válido.");
    const resources = Array.isArray(query.resources) ? query.resources : [];
    const base = { teacherId, classId: group.id, disciplineId: subject.id, subject: subject.name,
      date: query.date, shift: shift.id, areaId: "unidade" };
    const creditError = M.creditError(data, { ...base, start: 0, end: duration });
    if (creditError) return fail(creditError);
    const rooms = [];
    for (const room of data.rooms.filter((r) => r.status === "ativo" && (!r.createdDate || r.createdDate <= query.date) &&
      r.capacity >= group.students && resources.every((name) => r.resources.includes(name)))) {
      const slots = [];
      for (let start = shift.start; start + duration <= shift.end; start += 0.25) {
        if (query.date === today && start <= now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600) continue;
        const draft = { ...base, roomId: room.id, start, end: start + duration };
        if (!M.validateBooking(data, draft)) slots.push(draft);
      }
      if (slots.length) rooms.push({ room, slots });
    }
    rooms.sort((a, b) => a.slots[0].start - b.slots[0].start || a.room.capacity - b.room.capacity || a.room.name.localeCompare(b.room.name, "pt-BR"));
    return { error: "", rooms };
  }
  global.SIPAE_ROOM_SEARCH = { search };
})(globalThis);
