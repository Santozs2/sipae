/* Mappa — dados fictícios e determinísticos. Nenhuma informação pessoal real. */
(function (global) {
  "use strict";
  // Estes grupos privados só organizam as fixtures de aulas por afinidade.
  // Não representam áreas do sistema: o modelo público contém uma única unidade.
  const fixtureGroups = [
    {
      id: "ti",
      name: "Tecnologia da Informação",
      short: "TI",
      color: "#6686b5",
    },
    {
      id: "exatas",
      name: "Engenharias e Ciências",
      short: "Exatas",
      color: "#95a79c",
    },
    { id: "gestao", name: "Gestão", short: "Gestão", color: "#b4a3bd" },
  ];
  const fixtureRooms = [
    [
      "ti",
      "Lab. de Desenvolvimento",
      "Laboratório de informática",
      "A",
      32,
      "Computadores;Projetor;Internet",
    ],
    [
      "ti",
      "Lab. de Redes",
      "Laboratório de informática",
      "A",
      24,
      "Computadores;Racks de rede;Internet",
    ],
    [
      "ti",
      "Lab. de Sistemas",
      "Laboratório de informática",
      "A",
      28,
      "Computadores;Projetor;Internet",
    ],
    [
      "ti",
      "Lab. de Multimídia",
      "Laboratório de informática",
      "A",
      20,
      "Computadores;Áudio e vídeo;Internet",
    ],
    ["ti", "Sala A05", "Sala teórica", "A", 40, "Projetor;Lousa;Internet"],
    ["ti", "Sala A06", "Sala teórica", "A", 36, "Projetor;Lousa;Internet"],
    [
      "exatas",
      "Oficina de Mecânica",
      "Oficina de mecânica",
      "B",
      30,
      "Bancadas;Ferramentas;EPIs",
    ],
    [
      "exatas",
      "Oficina Maker",
      "Oficina maker",
      "B",
      20,
      "Impressoras 3D;Cortadora a laser;EPIs",
    ],
    [
      "exatas",
      "Oficina de Prototipagem",
      "Oficina de prototipagem",
      "B",
      24,
      "Fresadora CNC;Bancadas;EPIs",
    ],
    [
      "exatas",
      "Lab. de Eletrônica",
      "Laboratório de eletrônica",
      "B",
      28,
      "Bancadas;Multímetros;Projetor",
    ],
    [
      "exatas",
      "Lab. de Robótica",
      "Laboratório de robótica",
      "B",
      24,
      "Kits de robótica;Robôs;Computadores",
    ],
    [
      "exatas",
      "Lab. de Química",
      "Laboratório de química",
      "C",
      20,
      "Capela;Vidrarias;EPIs",
    ],
    ["exatas", "Sala B07", "Sala teórica", "B", 40, "Projetor;Lousa"],
    ["exatas", "Sala B08", "Sala teórica", "B", 32, "Projetor;Lousa"],
    ["gestao", "Sala C01", "Sala teórica", "C", 40, "Projetor;Lousa;Internet"],
    ["gestao", "Sala C02", "Sala teórica", "C", 30, "Projetor;Lousa;Internet"],
    [
      "gestao",
      "Auditório",
      "Auditório",
      "D",
      120,
      "Palco;Áudio e vídeo;Projetor",
    ],
    [
      "gestao",
      "Sala de Reuniões",
      "Sala de reunião",
      "D",
      20,
      "Videoconferência;Internet;TV",
    ],
  ].map((r, i) => ({
    id: "r" + (i + 1),
    areaId: r[0],
    name: r[1],
    type: r[2],
    block: r[3],
    capacity: r[4],
    resources: r[5].split(";"),
    status: i === 11 ? "manutencao" : "ativo",
  }));
  // O último campo lista as turmas que cada docente pode assumir, de acordo
  // com a sua especialidade. O gerador da agenda respeita essa restrição.
  const fixtureTeachers = [
    ["ti", "Mariana Costa", "Engenharia de software", 20, "c1 c3 c4"],
    ["ti", "Rafael Almeida", "Redes de computadores", 40, "c2"],
    ["ti", "Beatriz Nascimento", "Desenvolvimento web", 30, "c3 c6"],
    ["ti", "Gabriel Oliveira", "Programação e banco de dados", 40, "c3 c5 c6"],
    ["ti", "Fernanda Ribeiro", "Ciência de dados", 20, "c5"],
    ["exatas", "André Oliveira", "Engenharia mecânica", 40, "c7 c12"],
    ["exatas", "Patrícia Santos", "Engenharia elétrica", 30, "c8 c11"],
    ["exatas", "Bruno Rodrigues", "Fabricação digital", 20, "c9"],
    ["exatas", "Jéssica Lima", "Robótica", 40, "c11"],
    ["exatas", "Leandro Souza", "Física", 30, "c10 c12"],
    ["gestao", "Camila Barros", "Administração", 40, "c13 c16"],
    ["gestao", "Diego Martins", "Logística", 30, "c14 c15"],
    ["gestao", "Aline Gomes", "Gestão de projetos", 20, "c16 c13"],
    ["gestao", "Renato Azevedo", "Empreendedorismo", 20, "c15"],
  ].map((r, i) => ({
    id: "t" + (i + 1),
    areaId: r[0],
    name: r[1],
    specialty: r[2],
    contractHours: r[3],
    classIds: r[4].split(" "),
  }));
  const teaches = (teacher, cls) => teacher.classIds.includes(cls.id);
  const fixtureClasses = [
    ["ti", "ESW-01", "Engenharia de Software", "Graduação", "manha", 30],
    ["ti", "RED-01", "Redes de Computadores", "Graduação", "manha", 24],
    ["ti", "WEB-01", "Programação Web", "Extensão", "tarde", 18],
    ["ti", "ESW-02", "Engenharia de Software", "Graduação", "noite", 28],
    ["ti", "DAD-01", "Ciência de Dados", "Curso livre", "noite", 16],
    ["ti", "CMP-01", "Computação Aplicada", "Extensão", "noite", 20],
    ["exatas", "MEC-01", "Engenharia Mecânica", "Graduação", "manha", 26],
    ["exatas", "ELE-01", "Engenharia Elétrica", "Graduação", "manha", 20],
    ["exatas", "FAB-01", "Fabricação Digital", "Extensão", "tarde", 18],
    ["exatas", "FIS-01", "Física Experimental", "Graduação", "tarde", 22],
    ["exatas", "ROB-01", "Robótica e Controle", "Pós-graduação", "noite", 24],
    [
      "exatas",
      "SEG-01",
      "Segurança em Laboratórios",
      "Curso livre",
      "noite",
      16,
    ],
    ["gestao", "ADM-01", "Administração", "Graduação", "manha", 38],
    ["gestao", "LOG-01", "Logística", "Graduação", "tarde", 28],
    ["gestao", "EMP-01", "Empreendedorismo", "Curso livre", "noite", 12],
    ["gestao", "GPR-01", "Gestão de Projetos", "Pós-graduação", "noite", 26],
  ].map((r, i) => ({
    id: "c" + (i + 1),
    areaId: r[0],
    code: r[1],
    name: r[2],
    modality: r[3],
    shift: r[4],
    students: r[5],
  }));
  const shifts = [
    { id: "manha", name: "Manhã", start: 8, end: 12 },
    { id: "tarde", name: "Tarde", start: 13, end: 17 },
    { id: "noite", name: "Noite", start: 18, end: 22 },
  ];
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex"];
  const reference = "2026-08-26T12:00:00-03:00";
  const refusals = [
    "Indisponibilidade de horário",
    "Capacidade insuficiente",
    "Recursos incompatíveis",
    "Ambiente em manutenção",
    "Solicitação fora do prazo",
  ];
  const kinds = {
    ambiente: { label: "Sobreposição de ambiente", color: "#cc6978" },
    docente: { label: "Docente em dois locais", color: "#7795b9" },
    capacidade: { label: "Capacidade excedida", color: "#b59b75" },
    manutencao: { label: "Ambiente em manutenção", color: "#a594b7" },
  };
  function hash(n) {
    return (((n * 2654435761) >>> 0) % 1000) / 1000;
  }
  function dateString(d) {
    return d.toISOString().slice(0, 10);
  }
  function localDate(d = new Date()) {
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")].join("-");
  }
  function dates(start, end) {
    const out = [];
    for (
      let d = new Date(start + "T12:00:00Z");
      dateString(d) <= end;
      d.setUTCDate(d.getUTCDate() + 1)
    )
      out.push(dateString(d));
    return out;
  }
  function copyData(value, normalizeScope = false) {
    if (Array.isArray(value))
      return value.map((item) => copyData(item, normalizeScope));
    if (value && typeof value === "object")
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key,
        normalizeScope && key === "areaId" ? "unidade" : copyData(item, normalizeScope),
      ]));
    return value;
  }
  function makeData() {
    // Cada geração trabalha em cópias para não alterar os grupos privados nem
    // reaproveitar cadastros modificados em uma chamada anterior de create().
    const areas = copyData(fixtureGroups);
    const rooms = copyData(fixtureRooms);
    const teachers = copyData(fixtureTeachers);
    const classes = copyData(fixtureClasses);
    const template = [];
    const freeClass = (room, day, shift) =>
      classes.filter(
        (c) =>
          c.areaId === room.areaId &&
          c.shift === shift &&
          c.students <= room.capacity &&
          !template.some(
            (a) => a.day === day && a.shift === shift && a.classId === c.id,
          ),
      );
    const add = (room, day, shift, forceTeacher) => {
      if (
        template.some(
          (a) => a.roomId === room.id && a.day === day && a.shift === shift,
        )
      )
        return false;
      const cs = freeClass(room, day, shift);
      if (!cs.length) return false;
      const ts = teachers.filter(
        (t) =>
          t.areaId === room.areaId &&
          !template.some(
            (a) => a.teacherId === t.id && a.day === day && a.shift === shift,
          ),
      );
      if (!ts.length) return false;
      // Só formam par turma e docente habilitado para ela.
      let pairs = cs.flatMap((c) => ts.filter((t) => teaches(t, c)).map((t) => [c, t]));
      if (forceTeacher && pairs.some(([, t]) => t.id === forceTeacher))
        pairs = pairs.filter(([, t]) => t.id === forceTeacher);
      if (!pairs.length) return false;
      const [cls, teacher] = pairs[(day + template.length) % pairs.length];
      const slot = shifts.find((s) => s.id === shift);
      template.push({
        day,
        shift,
        roomId: room.id,
        classId: cls.id,
        teacherId: teacher.id,
        areaId: room.areaId,
        start: slot.start,
        end: slot.end,
        status: "confirmada",
      });
      return true;
    };
    // Os dois ambientes mais disputados ocupam 14 e 13 dos 15 blocos semanais.
    for (let day = 0; day < 5; day++)
      for (const s of shifts) {
        if (!(day === 4 && s.id === "tarde")) add(rooms[0], day, s.id, "t1");
        if (
          !(day === 4 && s.id === "tarde") &&
          !(day === 1 && s.id === "tarde")
        )
          add(rooms[6], day, s.id, "t6");
      }
    const lowRooms = rooms
      .filter((r) => r.status === "ativo" && !["r1", "r7"].includes(r.id))
      .sort((a, b) => a.capacity - b.capacity);
    lowRooms.forEach((room, ri) => {
      const count = room.id === "r2" ? 4 : room.id === "r10" ? 3 : 2;
      const candidateSlots = [];
      for (const shift of ["noite", "manha", "tarde"])
        for (let i = 0; i < 5; i++) {
          const day = (i + ri) % 5;
          if (!(day === 4 && shift === "tarde"))
            candidateSlots.push({ day, shift });
        }
      let added = 0;
      for (const slot of candidateSlots) {
        if (add(room, slot.day, slot.shift) && ++added === count) break;
      }
      if (added !== count)
        throw new Error("Não foi possível construir a agenda de " + room.name);
    });
    // Aulas de 3h a 4h diversificam o uso dos ambientes com menor demanda.
    template.forEach((a, i) => {
      if (!["r1", "r7"].includes(a.roomId))
        a.end =
          a.start + 3 + ((Number(a.roomId.slice(1)) + a.day + i) % 5) * 0.25;
    });
    const allocations = [];
    let sequence = 0;
    const monthlyFactors = {
      3: 0.62,
      4: 0.74,
      5: 0.83,
      6: 0.76,
      7: 0.34,
      8: 1,
    };
    for (const date of dates("2026-03-01", "2026-08-31")) {
      const d = new Date(date + "T12:00Z"),
        day = d.getUTCDay() - 1,
        month = d.getUTCMonth() + 1;
      if (day < 0 || day > 4) continue;
      for (let i = 0; i < template.length; i++) {
        const t = template[i];
        if (t.day !== day) continue;
        const keep =
          month === 8
            ? date < "2026-08-24"
              ? hash(i + Math.floor(d.getTime() / 604800000) * 11) > 0.09
              : true
            : hash(i + Math.floor(d.getTime() / 604800000) * 17) <
              monthlyFactors[month];
        if (keep)
          allocations.push({
            ...t,
            id: "a" + ++sequence,
            date,
            source: "planejamento",
          });
      }
    }
    const requests = [];
    let reqSeq = 0;
    // Solicitações históricas aprovadas se vinculam a alocações confirmadas existentes.
    for (let month = 3; month <= 8; month++)
      for (let ai = 0; ai < areas.length; ai++) {
        const area = areas[ai];
        const pool = allocations.filter(
          (a) =>
            a.areaId === area.id &&
            Number(a.date.slice(5, 7)) === month &&
            a.date <= "2026-08-26",
        );
        const count = Math.min(35 + ai * 3, pool.length);
        for (let i = 0; i < count; i++) {
          const a = pool[Math.floor((i * pool.length) / count)];
          const rejected =
            (i + month) % (ai === 0 ? 7 : ai === 1 ? 6 : 4) === 1;
          const status = rejected
            ? "recusada"
            : i % 11 === 2
              ? "cancelada"
              : "aprovada";
          const created = new Date(a.date + "T08:00:00-03:00");
          created.setUTCDate(created.getUTCDate() - 2);
          const wait =
            month === 8
              ? 6 + ai * 5 + ((i * 7) % 21)
              : month === 7
                ? 13 + ai * 7 + ((i * 3) % 23)
                : 10 + ai * 4 + ((i * 5) % 25);
          const decided = new Date(created.getTime() + wait * 3600000);
          requests.push({
            id: "s" + ++reqSeq,
            areaId: area.id,
            teacherId: a.teacherId,
            classId: a.classId,
            roomId: a.roomId,
            date: a.date,
            start: a.start,
            end: a.end,
            shift: a.shift,
            status,
            createdAt: created.toISOString(),
            decidedAt: decided.toISOString(),
            reason:
              status === "recusada"
                ? refusals[
                    [0, 0, 1, 0, 2, 0, 1, 3, 4, 0][(i + ai + month) % 10]
                  ]
                : null,
            allocationId: status === "aprovada" ? a.id : null,
          });
        }
      }
    const needs = [];
    const occupied = (roomId, teacherId, classId, date, shift) =>
      allocations.some(
        (a) =>
          a.date === date &&
          a.shift === shift &&
          (a.roomId === roomId ||
            a.teacherId === teacherId ||
            a.classId === classId),
      );
    for (let ai = 0; ai < areas.length; ai++) {
      const area = areas[ai];
      const count = ai === 0 ? 3 : 2;
      for (let n = 0; n < count; n++) {
        let booking = null;
        outer: for (const date of [
          "2026-08-27",
          "2026-08-28",
          "2026-08-26",
          "2026-08-31",
        ])
          for (const shift of ["tarde", "manha", "noite"])
            for (const room of rooms.filter(
              (r) => r.areaId === area.id && r.status === "ativo",
            ))
              for (const cls of classes.filter(
                (c) =>
                  c.areaId === area.id &&
                  c.shift === shift &&
                  c.students <= room.capacity,
              ))
                for (const teacher of teachers.filter(
                  (t) => t.areaId === area.id && teaches(t, cls),
                )) {
                  if (date === "2026-08-26" && shift === "manha") continue;
                  if (
                    occupied(room.id, teacher.id, cls.id, date, shift) ||
                    requests.some(
                      (r) =>
                        r.status === "pendente" &&
                        r.date === date &&
                        r.shift === shift &&
                        (r.roomId === room.id ||
                          r.teacherId === teacher.id ||
                          r.classId === cls.id),
                    )
                  )
                    continue;
                  const s = shifts.find((s) => s.id === shift);
                  booking = {
                    areaId: area.id,
                    roomId: room.id,
                    teacherId: teacher.id,
                    classId: cls.id,
                    date,
                    shift,
                    start: s.start,
                    end: s.end,
                  };
                  break outer;
                }
        if (!booking) continue;
        const createdAt = new Date(
          new Date(reference).getTime() -
            (ai === 0 ? [62, 28, 9][n] : 18 + n * 8) * 3600000,
        ).toISOString();
        const request = {
          ...booking,
          id: "s" + ++reqSeq,
          status: "pendente",
          createdAt,
          decidedAt: null,
          reason: null,
        };
        requests.push(request);
        if (n < 2) {
          const need = {
            id: "need-" + request.id,
            classId: request.classId,
            areaId: area.id,
            date: request.date,
            shift: request.shift,
            roomId: null,
            requestId: request.id,
          };
          needs.push(need);
          request.needId = need.id;
        }
      }
    }
    const activeConflicts = [];
    const week = allocations.filter(
      (a) => a.date >= "2026-08-24" && a.date <= "2026-08-28",
    );
    const base =
      week.find((a) => a.areaId === "ti" && a.date === "2026-08-26") ||
      week.find((a) => a.areaId === "ti");
    activeConflicts.push({
      id: "cf-ambiente",
      areaId: "ti",
      kind: "ambiente",
      status: "ativo",
      date: base.date,
      shift: base.shift,
      teacherId: base.teacherId,
      roomId: base.roomId,
      classId: base.classId,
      allocationId: base.id,
      title: "Duas reservas para o mesmo ambiente",
      detail:
        "Uma solicitação adicional coincide com a reserva de " +
        rooms.find((r) => r.id === base.roomId).name +
        ".",
      detectedAt: "2026-08-24T09:00:00-03:00",
    });
    const second =
      week.find((a) => a.areaId === "ti" && a.date === "2026-08-27") || base;
    activeConflicts.push({
      id: "cf-docente",
      areaId: "ti",
      kind: "docente",
      status: "ativo",
      date: second.date,
      shift: second.shift,
      teacherId: second.teacherId,
      roomId: second.roomId,
      classId: second.classId,
      allocationId: second.id,
      title: "Docente com horários sobrepostos",
      detail:
        teachers.find((t) => t.id === second.teacherId).name +
        " foi solicitado em dois ambientes no mesmo turno.",
      detectedAt: "2026-08-25T10:00:00-03:00",
    });
    activeConflicts.push({
      id: "cf-capacidade",
      areaId: "gestao",
      kind: "capacidade",
      status: "ativo",
      date: "2026-08-27",
      shift: "manha",
      teacherId: "t11",
      roomId: "r16",
      classId: "c13",
      title: "Turma maior que a capacidade",
      detail: "ADM-01: 38 alunos para 30 lugares na Sala C02.",
      detectedAt: "2026-08-25T11:00:00-03:00",
    });
    activeConflicts.push({
      id: "cf-manutencao",
      areaId: "exatas",
      kind: "manutencao",
      status: "ativo",
      date: "2026-08-28",
      shift: "tarde",
      teacherId: "t7",
      roomId: "r12",
      classId: "c8",
      title: "Reserva em ambiente em manutenção",
      detail:
        "O Lab. de Química está indisponível para revisão da capela de exaustão.",
      detectedAt: "2026-08-24T14:00:00-03:00",
    });
    const conflicts = [...activeConflicts];
    let cseq = 0;
    for (let month = 3; month <= 8; month++)
      for (let ai = 0; ai < 3; ai++)
        for (let n = 0; n < 6 + ai; n++) {
          const day = 3 + n * 3;
          const date =
            "2026-" +
            String(month).padStart(2, "0") +
            "-" +
            String(day).padStart(2, "0");
          conflicts.push({
            id: "hc" + ++cseq,
            areaId: areas[ai].id,
            kind: Object.keys(kinds)[(n + ai + month) % 4],
            status: "resolvido",
            date,
            shift: shifts[n % 3].id,
            teacherId: teachers.filter((t) => t.areaId === areas[ai].id)[
              n % teachers.filter((t) => t.areaId === areas[ai].id).length
            ].id,
            detectedAt: date + "T09:00:00-03:00",
            resolvedAt: date + "T16:00:00-03:00",
          });
        }
    const externalReservations = [
      {
        id: "ext-01",
        organization: "Associação Comercial e Empresarial",
        contact: "eventos@example.org",
        roomId: "r17",
        areaId: "gestao",
        date: "2026-08-28",
        start: 13,
        end: 16,
        shift: "tarde",
        purpose: "Encontro de inovação e desenvolvimento regional",
        attendees: 70,
        status: "pendente",
        priority: "normal",
      },
      {
        id: "ext-02",
        organization: "Núcleo de Empreendedores",
        contact: "contato@example.org",
        roomId: "r18",
        areaId: "gestao",
        date: "2026-08-27",
        start: 8,
        end: 11,
        shift: "manha",
        purpose: "Mentoria de novos negócios",
        attendees: 16,
        status: "aprovada",
        priority: "normal",
      },
      {
        id: "ext-03",
        organization: "Fórum de Educação e Inovação",
        contact: "forum@example.org",
        roomId: "r17",
        areaId: "gestao",
        date: "2026-08-31",
        start: 13,
        end: 17,
        shift: "tarde",
        purpose: "Formação de educadores",
        attendees: 80,
        status: "aprovada",
        priority: "normal",
      },
      {
        id: "ext-04",
        organization: "Coletivo de Tecnologia",
        contact: "coletivo@example.org",
        roomId: "r4",
        areaId: "ti",
        date: "2026-08-28",
        start: 18,
        end: 21,
        shift: "noite",
        purpose: "Oficina de produção audiovisual",
        attendees: 35,
        status: "recusada",
        priority: "normal",
        reason: "Capacidade insuficiente",
      },
      {
        id: "ext-05",
        organization: "Rede de Economia Criativa",
        contact: "rede@example.org",
        roomId: "r18",
        areaId: "gestao",
        date: "2026-08-25",
        start: 13,
        end: 15,
        shift: "tarde",
        purpose: "Reunião de planejamento",
        attendees: 12,
        status: "cancelada",
        priority: "normal",
      },
    ];
    teachers.forEach((t, i) =>
      Object.assign(t, {
        email: "docente" + (i + 1) + "@example.org",
        phone: "(00) 0000-0000",
        nif: String(100001 + i),
        status: "ativo",
        disciplines: [t.specialty],
        defaultRoomId: "",
        schedule: "integral",
      }),
    );
    rooms.forEach((r) =>
      Object.assign(r, {
        workingDays: [1, 2, 3, 4, 5],
        externalBlocked: r.id === "r1" || r.id === "r11",
        responsible: "Coordenação da unidade",
        notes: "",
      }),
    );
    // A base acompanha a semana de acesso, preservando os dias úteis do exemplo.
    const now = new Date();
    const today = localDate(now);
    const monday = new Date(today + "T12:00:00Z");
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
    const offset = monday.getTime() - new Date("2026-08-24T12:00:00Z").getTime();
    for (const record of [...allocations, ...requests, ...needs, ...conflicts, ...externalReservations]) {
      if (record.date) record.date = dateString(new Date(new Date(record.date + "T12:00:00Z").getTime() + offset));
      for (const key of ["createdAt", "decidedAt", "detectedAt", "resolvedAt"]) {
        if (record[key]) record[key] = new Date(new Date(record[key]).getTime() + offset).toISOString();
      }
    }
    // Reservas internas são confirmadas ao agendar; não existe etapa de aprovação.
    const slotIsFree = (r) => ![...allocations.filter((a) => a.status === "confirmada"),
      ...externalReservations.filter((a) => a.status === "aprovada")].some((a) =>
      a.date === r.date && a.start < r.end && r.start < a.end &&
      (a.roomId === r.roomId || a.teacherId === r.teacherId || a.classId === r.classId));
    for (const r of requests) {
      if (r.status === "aprovada") r.status = "confirmada";
      if (r.status === "pendente") {
        if (slotIsFree(r)) {
          r.status = "confirmada";
          r.allocationId = "agendamento-" + r.id;
          allocations.push({ ...r, id: r.allocationId, source: "agendamento" });
          const need = needs.find((n) => n.id === r.needId);
          if (need) need.roomId = r.roomId;
        } else r.status = "cancelada";
      }
      if (r.status === "recusada") r.status = "cancelada";
      r.reason = r.status === "cancelada" ? "Agendamento cancelado na demonstração." : null;
      r.decidedAt = r.createdAt;
    }
    // As propostas fictícias de conflito não fazem parte do novo fluxo.
    conflicts.length = 0;
    // Algumas aulas futuras do docente, sempre em horários livres e com capacidade válida.
    let nextLesson = 0;
    for (let dayOffset = 1; dayOffset <= 14 && nextLesson < 5; dayOffset++) {
      const day = new Date(today + "T12:00:00Z");
      day.setUTCDate(day.getUTCDate() + dayOffset);
      if ([0, 6].includes(day.getUTCDay())) continue;
      const classId = ["c3", "c5", "c6"][nextLesson % 3];
      const group = classes.find((c) => c.id === classId);
      const slot = shifts.find((s) => s.id === group.shift);
      for (const target of rooms.filter((r) => r.areaId === "ti" && r.status === "ativo" && r.capacity >= group.students)) {
        const lesson = { id: "demo-proxima-" + nextLesson, areaId: "ti", roomId: target.id,
          teacherId: "t4", classId, date: dateString(day), shift: slot.id, start: slot.start,
          end: slot.start + 2, status: "confirmada", source: "demonstracao", note: "Aula demonstrativa." };
        if (!slotIsFree(lesson)) continue;
        allocations.push(lesson);
        requests.push({ ...lesson, id: "registro-" + lesson.id, allocationId: lesson.id,
          createdAt: now.toISOString(), decidedAt: now.toISOString() });
        nextLesson++;
        break;
      }
    }
    // Créditos mensais fixados ao preparar a demonstração; as operações nunca ampliam a cota.
    // Cada turma tem uma disciplina coerente com o seu curso.
    const subjectNames = {
      c1: "Engenharia de Requisitos",
      c2: "Redes de Computadores",
      c3: "Desenvolvimento Web",
      c4: "Arquitetura de Software",
      c5: "Banco de Dados",
      c6: "Lógica de Programação",
      c7: "Resistência dos Materiais",
      c8: "Circuitos Elétricos",
      c9: "Impressão 3D e Prototipagem",
      c10: "Laboratório de Física",
      c11: "Sistemas de Controle",
      c12: "Segurança em Laboratórios",
      c13: "Teoria Geral da Administração",
      c14: "Cadeia de Suprimentos",
      c15: "Plano de Negócios",
      c16: "Gestão Ágil de Projetos",
    };
    const teacherSubjects = [];
    for (const t of teachers) {
      const records = [...allocations, ...requests].filter(
        (a) => a.teacherId === t.id,
      );
      // Disciplinas do docente: as das turmas que ele pode assumir.
      const names = [
        ...new Set([
          ...records.map((a) => subjectNames[a.classId] || t.specialty),
          ...t.classIds.map((id) => subjectNames[id]),
        ]),
      ];
      if (t.id === "t4" && !names.includes("Banco de Dados"))
        names.push("Banco de Dados");
      names.forEach((name, i) => {
        const id = t.id + "-disciplina-" + i;
        const selected = records.filter(
          (a) => (subjectNames[a.classId] || t.specialty) === name,
        );
        selected.forEach((a) => {
          a.disciplineId = id;
          a.subject = name;
        });
        const monthly = {};
        [...allocations, ...requests.filter((r) => r.status === "pendente")]
          .filter((a) => a.disciplineId === id)
          .forEach((a) => {
            const month = a.date.slice(0, 7);
            monthly[month] = (monthly[month] || 0) + a.end - a.start;
          });
        teacherSubjects.push({
          id,
          teacherId: t.id,
          name,
          monthlyHours: Math.max(
            15,
            Math.ceil(Math.max(0, ...Object.values(monthly)) / 15) * 15,
          ),
        });
      });
      t.disciplines = names;
    }
    const instance = {
      managementProfiles: {
        coordenador: { name: "Helena Duarte", email: "coordenacao@example.org", phone: "(00) 0000-0000",
          nif: "100015", roleLabel: "Coordenação", areaLabel: "Unidade" },
        diretor: { name: "Ricardo Moreira", email: "direcao@example.org", phone: "(00) 0000-0000",
          nif: "100016", roleLabel: "Direção da unidade", areaLabel: "Unidade" },
      },
      teacherSubjects,
      externalReservations,
      areas: [{ id: "unidade", name: "Unidade", short: "Unidade", color: "#6686b5" }],
      rooms,
      teachers,
      classes,
      shifts,
      days,
      reference: now.toISOString(),
      today,
      refusals,
      kinds,
      allocations,
      requests,
      conflicts,
      needs,
      template,
    };
    // A normalização pública preserva aulas, referências e datas; os identificadores
    // de grupos das fixtures nunca ficam expostos como escopo ou permissão.
    return copyData(instance, true);
  }
  global.MAPPA_DATA = { create: makeData, dates, dateString, localDate };
})(globalThis);
