const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
process.env.TZ = 'America/Sao_Paulo';
const root = path.resolve(__dirname, '..');

function setup(role = 'diretor') {
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-09-15T12:00:00-03:00'])); }
  }
  const elements = new Map(), listeners = {};
  const element = () => ({ innerHTML: '', value: '', dataset: {}, open: false,
    close() { this.open = false; }, showModal() { this.open = true; },
    classList: { toggle() {}, contains() { return false; }, remove() {}, add() {} },
    setAttribute() {}, removeAttribute() {}, addEventListener() {}, focus() {}, querySelector() { return { focus() {} }; } });
  const context = vm.createContext({ console, Intl, Date: ClockDate, setTimeout, clearTimeout });
  context.document = { body: element(),
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    querySelector: element, addEventListener(type, fn) { (listeners[type] ||= []).push(fn); } };
  context.location = { hash: '#diretor/calendario' };
  context.window = { addEventListener() {}, scrollTo() {} };
  for (const file of ['data.js', 'metrics.js', 'app.js', 'charts.js', 'views.js', 'pages.js', 'actions.js'])
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  const S = context.SIPAE;
  S.state.role = role; S.state.page = 'calendario';
  const base = { date: S.data.today, teacherId: 't4', classId: 'c1', roomId: 'r1',
    shift: 'manha', start: 8, end: 9, status: 'confirmada', areaId: 'unidade' };
  S.data.allocations = [
    ...Array.from({ length: 8 }, (_, i) => ({ ...base, id: 'morning-' + i, start: 8 + i / 4, end: 8.25 + i / 4 })),
    { ...base, id: 'afternoon', shift: 'tarde', start: 13, end: 14 },
    { ...base, id: 'other-room', roomId: 'r2' },
    { ...base, id: 'other-teacher', teacherId: 't1' },
    { ...base, id: 'cancelled', status: 'cancelada' },
    { ...base, id: 'next-day', date: '2026-09-16' },
  ];
  S.data.externalReservations = [
    { id: 'external', date: base.date, roomId: 'r1', shift: 'manha', start: 11, end: 12,
      purpose: 'Evento externo', organization: 'Unidade', status: 'aprovada' },
    { id: 'pending', date: base.date, roomId: 'r1', shift: 'manha', start: 11, end: 12,
      purpose: 'Evento pendente', organization: 'Unidade', status: 'pendente' },
  ];
  function click(action, id, shift) {
    const el = { dataset: { action, id, shift } };
    const event = { target: { closest(selector) { return selector === '[data-action]' ? el : null; } }, preventDefault() {} };
    for (const fn of listeners.click || []) fn(event);
  }
  const html = () => S.views[role + '/calendario']();
  function select(key, value, checked = true) {
    S.render = () => {};
    const event = { target: { dataset: { localMulti: key }, value, checked } };
    for (const fn of listeners.change || []) fn(event);
  }
  return { S, html, click, select, dialog: elements.get('app-dialog') };
}

for (const role of ['docente', 'coordenador', 'diretor']) {
  test(`${role}: salas múltiplas preservam seleção, nomes simples e escopo do perfil`, () => {
    const { S, html, select } = setup(role);
    select('room', 'r1'); select('room', 'r2');
    assert.deepEqual(Array.from(S.P.local().room), ['r1', 'r2']);
    assert.ok(S.P.calendarRows().some(a => a.roomId === 'r1'));
    assert.ok(S.P.calendarRows().some(a => a.roomId === 'r2'));
    assert.match(html(), /2 salas/);
    assert.doesNotMatch(html(), /Lab\. de Desenvolvimento · Bloco A/);
    if (role === 'docente') assert.ok(S.P.calendarRows().every(a => a.teacherId === 't4'));
    select('room', 'r1', false);
    assert.ok(S.P.calendarRows().every(a => a.roomId === 'r2'));
    select('room', 'todos');
    assert.equal(S.P.local().room.length, 0);
    assert.ok(S.P.calendarRows().some(a => a.roomId === 'r1'));
  });
  test(`${role}: filtro de sala vale para dia, semana, mês, lista e detalhes`, () => {
    const { S, html, click, dialog } = setup(role);
    const f = S.P.local();
    f.room = 'r1'; f.anchor = S.data.today;
    for (const view of ['day', 'week', 'month']) {
      f.view = view;
      const markup = html();
      assert.match(markup, /id="local-room"/);
      assert.doesNotMatch(markup, /data-id="a:other-room"|data-id="a:cancelled"|data-id="e:pending"/);
      assert.ok(S.P.calendarRows().every(a => a.roomId === 'r1'));
      if (role === 'docente') {
        assert.doesNotMatch(markup, /data-id="a:other-teacher"|data-id="e:external"/);
        assert.ok(S.P.calendarRows().every(a => a.teacherId === 't4'));
      }
      click('calendar-day', S.data.today);
      assert.doesNotMatch(dialog.innerHTML, /data-id="a:other-room"/);
      const expected = role === 'docente' ? 9 : 11;
      assert.equal((dialog.innerHTML.match(/data-action="booking-detail"/g) || []).length, expected);
      assert.ok(dialog.innerHTML.includes(expected + ' agendamentos'));
    }
    f.room = 'r18';
    assert.equal(S.P.calendarRows().length, 0);
    assert.match(html(), /Nenhum agendamento/);
  });

  test(`${role}: total do turno abre exatamente os mesmos agendamentos`, () => {
    const { S, html, click, dialog } = setup(role);
    Object.assign(S.P.local(), { room: 'r1', view: 'week', anchor: S.data.today });
    const count = role === 'docente' ? 8 : 10;
    assert.ok(html().includes(`data-shift="manha">Ver ${count} agendamentos`));
    click('calendar-day', S.data.today, 'manha');
    assert.match(dialog.innerHTML, /Manhã/);
    assert.ok(dialog.innerHTML.includes(count + ' agendamentos'));
    assert.equal((dialog.innerHTML.match(/data-action="booking-detail"/g) || []).length, count);
    assert.doesNotMatch(dialog.innerHTML, /data-id="a:afternoon"|data-id="a:next-day"/);
  });
}

test('blocos A e B e dois docentes usam união em cada filtro e interseção entre filtros', () => {
  const { S, select, click, dialog } = setup();
  const base = S.data.allocations[0];
  S.data.allocations.push({ ...base, id: 'block-b', roomId: 'r7', teacherId: 't1' },
    { ...base, id: 'block-c', roomId: 'r15', teacherId: 't1' },
    { ...base, id: 'third-teacher', roomId: 'r7', teacherId: 't2' });
  select('block', 'A'); select('block', 'B');
  select('teacher', 't1'); select('teacher', 't4');
  const rows = S.P.calendarRows();
  assert.ok(rows.some(a => a.id === 'block-b'));
  assert.ok(rows.some(a => a.id === 'morning-0'));
  assert.ok(!rows.some(a => ['block-c', 'third-teacher', 'external'].includes(a.id)));
  click('calendar-day', S.data.today);
  assert.match(dialog.innerHTML, /data-id="a:block-b"/);
  assert.doesNotMatch(dialog.innerHTML, /data-id="a:block-c"|data-id="a:third-teacher"/);
});

test('lista lateral inclui todos os registros contados, mesmo acima de cinco', () => {
  const { S, html } = setup();
  S.P.local().room = 'r1';
  const side = html().match(/<aside class="calendar-side">([\s\S]*?)<\/aside>/)[1];
  assert.match(side, /11 agendamentos hoje/);
  assert.equal((side.match(/data-action="booking-detail"/g) || []).length, 11);
});

test('cores são por curso, iguais entre turmas, perfis e datas; externa tem cor própria', () => {
  const { S } = setup();
  const base = { ...S.P.calendarRows()[0], classId: 'c1' };
  const green = S.P.calendarEventStyle(base);
  assert.match(green, /hsl\(145,/);
  assert.equal(S.P.calendarEventStyle({ ...base, classId: 'c4' }), green);
  assert.match(S.P.calendarEventStyle({ ...base, classId: 'c8' }), /hsl\(210,/);
  for (const role of ['docente', 'coordenador', 'diretor']) {
    S.state.role = role;
    for (const date of ['2026-09-14', '2026-09-15', '2026-09-16'])
      assert.ok(S.P.eventButton({ ...base, date }).includes(green));
  }
  assert.notEqual(S.P.calendarEventStyle({ ...base, external: true }), green);
});

test('resumo do período separa aulas e externas e respeita filtros combinados', () => {
  const { S, html } = setup();
  const f = S.P.local();
  Object.assign(f, { view: 'day', room: 'r1', anchor: S.data.today });
  assert.match(html(), /10 aulas agendadas · 1 reserva externa no período selecionado/);
  f.teacher = 't4';
  assert.match(html(), /9 aulas agendadas · 0 reservas externas no período selecionado/);
  f.block = 'B';
  assert.equal(S.P.calendarRows().length, 0);
  f.block = 'todos'; f.view = 'week';
  assert.deepEqual(JSON.parse(JSON.stringify(S.P.calendarRange())), { start: '2026-09-14', end: '2026-09-18' });
  assert.match(html(), /10 aulas agendadas · 0 reservas externas no período selecionado/);
});
