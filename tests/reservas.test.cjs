/* Independent regression probe for the SIPAE demonstration. No application edits. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
process.env.TZ = 'America/Sao_Paulo';
const root = path.resolve(__dirname, '..');
const results = [];
function check(name, fn) {
  try { fn(); results.push({ name, pass: true }); }
  catch (error) { results.push({ name, pass: false, error: error.message }); }
}
function setup(instant) {
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [instant])); }
    static now() { return new Date(instant).getTime(); }
  }
  const context = vm.createContext({ Date: ClockDate, Intl, console });
  for (const file of ['data.js', 'metrics.js'])
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  const data = context.SIPAE_DATA.create();
  const listeners = {}, toasts = [];
  const dialog = { open: false, close() { this.open = false; }, showModal() { this.open = true; } };
  context.document = {
    getElementById(id) { return id === 'app-dialog' ? dialog : null; },
    querySelector() { return null; },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
  };
  context.window = { addEventListener() {} };
  context.FormData = class {
    constructor(form) { this.values = form.values; }
    get(name) { return this.values[name] ?? null; }
    getAll(name) { const val = this.get(name); return Array.isArray(val) ? val : val === null ? [] : [val]; }
    has(name) { return Object.hasOwn(this.values, name); }
  };
  const P = {
    today: data.today, teacherId: 't4', draft: {}, notificationRead: new Set(),
    allCalendarEvents: () => [...data.allocations.filter(a => a.status === 'confirmada'), ...data.externalReservations.filter(a => a.status === 'aprovada')],
  };
  const U = {
    esc: String, date: String, shift: String,
    teacher: id => data.teachers.find(x => x.id === id),
    room: id => data.rooms.find(x => x.id === id),
    cls: id => data.classes.find(x => x.id === id),
  };
  context.SIPAE = { data, M: context.SIPAE_METRICS, state: { role: 'docente' }, U, P,
    render() {}, toast(message) { toasts.push(message); } };
  vm.runInContext(fs.readFileSync(path.join(root, 'actions.js'), 'utf8'), context, { filename: 'actions.js' });
  function submitForm(type, values, extra = {}) {
    const error = { textContent: '', hidden: true, scrollIntoView() {} };
    const form = { dataset: { ...extra, form: type }, values, querySelector: () => error };
    listeners.submit.forEach(fn => fn({ target: form, preventDefault() {} }));
    return error.textContent;
  }
  const submit = values => submitForm('booking', values);
  function click(action, id) {
    const el = { dataset: { action, id }, closest() { return null; } };
    const target = { closest(selector) { return selector === '[data-action]' ? el : null; } };
    listeners.click.forEach(fn => fn({ target, preventDefault() {} }));
  }
  return { context, data, M: context.SIPAE_METRICS, P, submit, submitForm, click, toasts };
}
const instants = [
  '2026-09-10T23:30:00-03:00', '2026-09-13T12:00:00-03:00',
  '2026-09-30T12:00:00-03:00', '2026-12-31T23:50:00-03:00',
  '2027-01-01T00:10:00-03:00', '2028-02-29T12:00:00-03:00',
];
for (const instant of instants) {
  const { data, M } = setup(instant);
  check(`${instant}: local login date and current month`, () => {
    assert.equal(data.today, instant.slice(0, 10));
    assert.equal(M.periods.mes.start, data.today.slice(0, 7) + '-01');
    assert.ok(M.periods.mes.end >= data.today);
    const nextMonth = new Date(data.today + 'T12:00:00Z');
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 0);
    assert.equal(M.periods.mes.end, nextMonth.toISOString().slice(0, 10));
  });
  check(`${instant}: five future weekday lessons and no approval flow`, () => {
    const next = data.allocations.filter(a => a.source === 'demonstracao');
    assert.equal(next.length, 5);
    for (const lesson of next) {
      assert.equal(lesson.teacherId, 't4');
      assert.ok(lesson.date > data.today);
      assert.ok(![0, 6].includes(new Date(lesson.date + 'T12:00Z').getUTCDay()));
      assert.equal(lesson.status, 'confirmada');
    }
    assert.equal(data.conflicts.length, 0);
    assert.equal(data.requests.filter(r => !['confirmada', 'cancelada'].includes(r.status)).length, 0);
  });
  check(`${instant}: no overlaps among active room/teacher/class allocations`, () => {
    const events = [...data.allocations.filter(a => a.status === 'confirmada'),
      ...data.externalReservations.filter(a => a.status === 'aprovada')];
    const byDate = new Map();
    for (const event of events) {
      for (const old of byDate.get(event.date) || []) {
        const overlaps = old.start < event.end && event.start < old.end;
        const shared = ['roomId', 'teacherId', 'classId'].filter(key => old[key] && old[key] === event[key]);
        assert.ok(!overlaps || shared.length === 0,
          `${old.id} + ${event.id} at ${event.date} (${shared.join(',')})`);
      }
      const group = byDate.get(event.date) || [];
      group.push(event); byDate.set(event.date, group);
    }
  });
  check(`${instant}: demo hours fit monthly discipline quotas`, () => {
    const months = [...new Set(data.allocations.map(a => a.date.slice(0, 7)))];
    for (const teacher of data.teachers) for (const month of months)
      for (const row of M.disciplineCredits(data, teacher.id, month)) {
        assert.ok(row.realized + row.scheduled <= row.monthlyHours);
        assert.equal(row.remaining, row.monthlyHours - row.realized - row.scheduled);
      }
  });
}
const app = setup('2026-09-10T12:00:00-03:00');
const { data, M, P, submit, click } = app;
const subject = data.teacherSubjects.find(d => d.teacherId === 't4' && d.name === 'Banco de Dados');
const form = {
  'booking-room': 'r1', 'booking-class': 'c3', 'booking-date': '2026-10-05',
  'booking-start': '13:00', 'booking-end': '15:00', 'booking-subject': subject.id,
  'booking-note': 'Independent VM test',
};
const initial = M.disciplineCredits(data, 't4', '2026-10').find(d => d.id === subject.id).remaining;
let created;
check('Actual action submission confirms immediately, creates one linked allocation and debits 2h', () => {
  const before = data.allocations.length, requestsBefore = data.requests.length;
  assert.equal(submit(form), '');
  assert.equal(data.allocations.length, before + 1);
  assert.equal(data.requests.length, requestsBefore + 1);
  created = data.allocations.at(-1);
  assert.equal(created.status, 'confirmada');
  assert.equal(data.requests.at(-1).status, 'confirmada');
  assert.equal(data.requests.at(-1).allocationId, created.id);
  assert.equal(M.disciplineCredits(data, 't4', '2026-10').find(d => d.id === subject.id).remaining, initial - 2);
});
check('Room, teacher and class overlap denied; adjacent times accepted', () => {
  assert.match(M.validateBooking(data, created), /ambiente já/);
  assert.match(M.validateBooking(data, { ...created, roomId: 'r2' }), /docente já/);
  assert.match(M.validateBooking(data, { ...created, roomId: 'r2', teacherId: 't2', disciplineId: undefined }), /turma já/);
  assert.equal(M.validateBooking(data, { ...created, start: 15, end: 16 }), null);
});
check('Duplicate real submission denied without allocation or request mutations', () => {
  const before = data.allocations.length, requestsBefore = data.requests.length;
  assert.match(submit(form), /ambiente já/);
  assert.equal(data.allocations.length, before);
  assert.equal(data.requests.length, requestsBefore);
});
check('Discipline quota denial does not raise the quota', () => {
  const monthlyHours = subject.monthlyHours;
  assert.match(M.creditError(data, { ...created, start: 0, end: initial + 1 }), /Saldo insuficiente/);
  assert.equal(subject.monthlyHours, monthlyHours);
});
check('Teacher cannot cancel another teacher reservation', () => {
  const foreign = data.allocations.find(a => a.teacherId !== 't4' && a.date >= P.today);
  assert.ok(foreign);
  click('booking-delete-confirm', 'a:' + foreign.id);
  assert.equal(foreign.status, 'confirmada');
});
check('Cancellation synchronizes linked records, releases slot and exactly 2h', () => {
  click('booking-delete-confirm', 'a:' + created.id);
  assert.equal(created.status, 'cancelada');
  assert.equal(data.requests.at(-1).status, 'cancelada');
  assert.equal(M.disciplineCredits(data, 't4', '2026-10').find(d => d.id === subject.id).remaining, initial);
  assert.equal(M.validateBooking(data, created), null);
  click('booking-delete-confirm', 'a:' + created.id);
  assert.equal(M.disciplineCredits(data, 't4', '2026-10').find(d => d.id === subject.id).remaining, initial);
});
check('Current date rejects elapsed or invalid time; past date and weekend denied', () => {
  assert.match(P.validSlot('2026-09-10', 11, 12), /horário futuro/);
  assert.match(P.validSlot('2026-09-09', 13, 15), /a partir de hoje/);
  assert.match(P.validSlot('2026-10-05', 15, 13), /fim posterior/);
  assert.match(P.validSlot('2026-10-05', 11, 14), /único turno/);
  assert.match(M.validateBooking(data, { ...created, date: '2026-10-04' }), /não funciona/);
});
check('Data reload resets the demo reservation changes (documented lack of persistence)', () => {
  const fresh = setup('2026-09-10T12:00:00-03:00').data;
  assert.equal(fresh.allocations.find(a => a.id === created.id), undefined);
});
check('Teacher can book an available room from any former group in own name', () => {
  const a=setup('2026-09-10T12:00:00-03:00');
  assert.equal(a.submit({...form, 'booking-room':'r7', 'booking-teacher':'t7'}),'');
  const record=a.data.allocations.at(-1);
  assert.equal(record.roomId,'r7'); assert.equal(record.teacherId,'t4'); assert.equal(record.areaId,'unidade');
});
check('Coordinator books any teacher and cancels their future reservation across the unit', () => {
  const a=setup('2026-09-10T12:00:00-03:00'); a.context.SIPAE.state.role='coordenador';
  const subject=a.data.teacherSubjects.find(s=>s.teacherId==='t7');
  assert.equal(a.submit({...form,'booking-room':'r1','booking-teacher':'t7','booking-subject':subject.name,'booking-repeat':'1'}),'');
  const record=a.data.allocations.at(-1); assert.equal(record.teacherId,'t7'); assert.equal(record.areaId,'unidade');
  a.click('booking-delete-confirm','a:'+record.id); assert.equal(record.status,'cancelada');
});
check('Legacy emergency attribute and room approval flow cannot issue an external reservation', () => {
  const a=setup('2026-09-10T12:00:00-03:00'); a.context.SIPAE.state.role='diretor';
  const target=a.data.rooms.find(r=>r.status==='ativo'&&!r.externalBlocked);
  const before=a.data.externalReservations.length;
  a.submitForm('external',{'external-name':'Organização de teste','external-contact':'teste@example.org','external-room':target.id,'external-date':'2026-10-05','external-start':'08:00','external-end':'09:00','external-attendees':'10','external-purpose':'Atividade demonstrativa','external-priority':'normal'},{emergency:'true'});
  assert.equal(a.data.externalReservations.length,before);
  const pendente=a.data.externalReservations.find(r=>r.status==='pendente');
  a.click('external-approve',pendente.id); assert.equal(pendente.status,'pendente');
  const pages=fs.readFileSync(path.join(root,'pages.js'),'utf8');
  assert.doesNotMatch(pages,/data-emergency|Criar reserva externa emergencial/);
  assert.doesNotMatch(pages,/external-approve|external-reject|external-new/);
});
check('Coordinator updates a teacher from the whole unit without department fields', () => {
  const a=setup('2026-09-10T12:00:00-03:00'); a.context.SIPAE.state.role='coordenador';
  const t=a.data.teachers.find(t=>t.id==='t7');
  assert.equal(a.submitForm('teacher',{'teacher-name':t.name+' Teste','teacher-nif':t.nif,'teacher-email':t.email,'teacher-hours':String(t.contractHours),'teacher-subjects':t.disciplines.join(', '),'teacher-room':t.defaultRoomId,'teacher-status':'ativo'},{editId:t.id}),'');
  assert.match(t.name,/Teste$/);assert.equal(t.areaId,'unidade');
});
check('Unifying coordination does not grant the teacher management edits', () => {
  const a=setup('2026-09-10T12:00:00-03:00'); const before=JSON.stringify([a.data.rooms,a.data.teachers]);
  a.submitForm('teacher',{'teacher-name':'Alteração indevida'},{editId:'t7'});
  a.submitForm('room',{'room-name':'Alteração indevida'},{editId:'r7'});
  assert.equal(JSON.stringify([a.data.rooms,a.data.teachers]),before);
});
const failures = results.filter(r => !r.pass);
console.log(JSON.stringify({ passed: results.length - failures.length, total: results.length, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
