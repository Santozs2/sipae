const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');

process.env.TZ = 'America/Sao_Paulo';
const source = fs.readFileSync(path.resolve(__dirname, '..', 'data.js'), 'utf8');

function createFactory(instant = '2026-09-12T12:00:00-03:00') {
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [instant])); }
    static now() { return new Date(instant).getTime(); }
  }
  const context = vm.createContext({ Date: FixedDate });
  vm.runInContext(source, context, { filename: 'data.js' });
  return context.SIPAE_DATA.create;
}

function visit(value, fn, location = 'data') {
  if (!value || typeof value !== 'object') return;
  fn(value, location);
  for (const [key, child] of Object.entries(value)) visit(child, fn, location + '.' + key);
}

test('O modelo público tem uma unidade e nenhum escopo legado em registros aninhados', () => {
  const data = createFactory()();
  assert.equal(data.areas.length, 1);
  assert.equal(data.areas[0].id, 'unidade');
  assert.equal(data.areas[0].name, 'Unidade');
  assert.equal(data.areas[0].short, 'Unidade');
  let scoped = 0;
  visit(data, (record, location) => {
    if (!Object.hasOwn(record, 'areaId')) return;
    scoped++;
    assert.equal(record.areaId, 'unidade', location);
  });
  assert.ok(scoped > data.allocations.length, 'Valida cadastros e outros registros além das aulas.');
  for (const key of ['rooms', 'teachers', 'classes', 'allocations', 'requests', 'externalReservations', 'needs', 'template']) {
    assert.ok(data[key].length, key);
    assert.ok(data[key].every(record => record.areaId === 'unidade'), key);
  }
  assert.ok(data.rooms.every(room => room.responsible === 'Coordenação da unidade'));
});

test('A normalização preserva docentes, ambientes, turmas e a identidade dos gestores', () => {
  const data = createFactory()();
  assert.equal(data.rooms.length, 18);
  assert.equal(data.teachers.length, 14);
  assert.equal(data.classes.length, 16);
  assert.equal(data.teachers.find(record => record.id === 't4').name, 'Daniel Oliveira');
  assert.equal(data.rooms.find(record => record.id === 'r7').name, 'Oficina de Mecânica');
  assert.equal(data.rooms.find(record => record.id === 'r7').capacity, 30);
  assert.equal(data.classes.find(record => record.id === 'c7').code, 'MEC-01');
  const coordinator = data.managementProfiles.coordenador;
  assert.equal(coordinator.name, 'Edvaldo Saran');
  assert.equal(coordinator.email, 'coordenacao@example.org');
  assert.equal(coordinator.nif, '100015');
  assert.equal(coordinator.roleLabel, 'Coordenação');
  assert.equal(coordinator.areaLabel, 'Unidade');
  assert.equal(data.managementProfiles.diretor.name, 'Roberto Malta');
  assert.equal(data.managementProfiles.diretor.email, 'direcao@example.org');
  assert.equal(data.managementProfiles.diretor.nif, '100016');
});

test('Aulas, solicitações e necessidades mantêm identificadores e referências válidas', () => {
  const data = createFactory()();
  const index = {};
  for (const key of ['rooms', 'teachers', 'classes', 'teacherSubjects', 'allocations', 'requests', 'externalReservations', 'needs']) {
    index[key] = new Map(data[key].map(record => [record.id, record]));
    assert.equal(index[key].size, data[key].length, 'IDs únicos em ' + key);
  }
  for (const record of [...data.allocations, ...data.requests, ...data.template]) {
    const room = index.rooms.get(record.roomId);
    const teacher = index.teachers.get(record.teacherId);
    const group = index.classes.get(record.classId);
    assert.ok(room && teacher && group, record.id || 'template');
    assert.ok(group.students <= room.capacity, record.id || 'template');
    if (record.disciplineId) {
      const subject = index.teacherSubjects.get(record.disciplineId);
      assert.equal(subject?.teacherId, record.teacherId);
      assert.equal(subject?.name, record.subject);
    }
  }
  for (const request of data.requests.filter(record => record.allocationId)) {
    const allocation = index.allocations.get(request.allocationId);
    assert.ok(allocation, request.id);
    for (const key of ['teacherId', 'classId', 'roomId', 'date', 'start', 'end'])
      assert.equal(allocation[key], request[key], request.id + '.' + key);
  }
  for (const need of data.needs) {
    assert.ok(index.classes.has(need.classId));
    assert.ok(index.requests.has(need.requestId));
    assert.ok(need.roomId === null || index.rooms.has(need.roomId));
  }
  for (const external of data.externalReservations) assert.ok(index.rooms.has(external.roomId));
});

test('create() repetido não compartilha objetos nem modifica as fixtures privadas', () => {
  const create = createFactory();
  const first = create();
  const expected = JSON.stringify(first);
  const firstObjects = new Set();
  visit(first, record => { firstObjects.add(record); Object.freeze(record); });
  const second = create();
  assert.equal(JSON.stringify(second), expected);
  visit(second, (record, location) => assert.ok(!firstObjects.has(record), location));
  second.areas[0].name = 'Alterada';
  second.rooms[0].areaId = 'alterada';
  second.rooms[0].resources.push('Recurso temporário');
  second.rooms[0].workingDays.length = 0;
  second.teachers[0].disciplines.length = 0;
  second.classes[0].students = 999;
  second.allocations[0].date = '2099-01-01';
  second.shifts[0].start = 0;
  second.days[0] = 'Alterado';
  second.refusals.length = 0;
  second.kinds.ambiente.label = 'Alterado';
  second.managementProfiles.coordenador.name = 'Alterado';
  assert.equal(JSON.stringify(create()), expected);
  assert.equal(JSON.stringify(first), expected);
});

test('Datas e cinco próximas aulas úteis continuam corretas em fins de semana e viradas', () => {
  for (const instant of [
    '2026-09-12T12:00:00-03:00', '2026-09-13T23:50:00-03:00',
    '2026-09-30T12:00:00-03:00', '2026-12-31T23:50:00-03:00',
    '2027-01-01T00:10:00-03:00', '2028-02-29T12:00:00-03:00',
  ]) {
    const data = createFactory(instant)();
    assert.equal(data.today, instant.slice(0, 10));
    assert.equal(data.reference, new Date(instant).toISOString());
    const future = data.allocations.filter(record => record.source === 'demonstracao');
    assert.equal(future.length, 5);
    for (const lesson of future) {
      assert.equal(lesson.teacherId, 't4');
      assert.equal(lesson.status, 'confirmada');
      assert.ok(lesson.date > data.today);
      assert.ok(![0, 6].includes(new Date(lesson.date + 'T12:00Z').getUTCDay()));
    }
    assert.equal(data.conflicts.length, 0);
    assert.ok(data.requests.every(record => ['confirmada', 'cancelada'].includes(record.status)));
  }
});

test('Unificar o escopo não cria sobreposição de ambiente, docente ou turma', () => {
  const data = createFactory()();
  const events = [...data.allocations.filter(record => record.status === 'confirmada'),
    ...data.externalReservations.filter(record => record.status === 'aprovada')];
  const byDate = new Map();
  for (const event of events) {
    for (const other of byDate.get(event.date) || []) {
      const overlaps = other.start < event.end && event.start < other.end;
      const shared = ['roomId', 'teacherId', 'classId'].filter(key => other[key] && other[key] === event[key]);
      assert.ok(!overlaps || shared.length === 0,
        `${other.id} + ${event.id}, ${event.date}: ${shared.join(', ')}`);
    }
    const day = byDate.get(event.date) || [];
    day.push(event);
    byDate.set(event.date, day);
  }
});
