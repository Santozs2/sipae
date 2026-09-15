const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
process.env.TZ = 'America/Sao_Paulo';
const root = path.resolve(__dirname, '..');

function setup(role = 'diretor') {
  const instant = '2026-09-15T12:00:00-03:00';
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [instant])); }
    static now() { return new Date(instant).getTime(); }
  }
  const elements = new Map(), listeners = {}, toasts = [];
  const element = () => ({ innerHTML: '', value: '', dataset: {}, open: false,
    close() { this.open = false; }, showModal() { this.open = true; },
    classList: { toggle() {}, contains() { return false; }, remove() {}, add() {} },
    setAttribute() {}, removeAttribute() {}, addEventListener() {}, focus() {} });
  const context = vm.createContext({ console, Intl, Date: ClockDate, setTimeout, clearTimeout });
  context.document = { body: element(),
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    querySelector: element, addEventListener(type, fn) { (listeners[type] ||= []).push(fn); } };
  context.location = { hash: '#diretor/externas' };
  context.window = { addEventListener() {}, scrollTo() {} };
  const load = (file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  for (const file of ['data.js', 'metrics.js', 'app.js']) load(file);
  const S = context.SIPAE;
  S.render = () => {};
  S.toast = (message) => toasts.push(message);
  for (const file of ['pages.js', 'actions.js', 'external-booking.js']) load(file);
  S.state.role = role; S.state.page = 'externas';
  const records = ['2026-09-15', '2026-09-16', '2026-09-17'].map((date, index) => ({
    id: 'integration-day-' + index, groupId: 'integration-group', groupStartDate: '2026-09-15', groupEndDate: '2026-09-17',
    organization: 'Instituição & teste', contact: 'contato@example.org', purpose: 'Oficina externa', attendees: 18,
    roomId: 'r1', date, start: 8, end: 9, shift: 'manha', areaId: 'unidade', status: 'aprovada', direct: true, source: 'diretor',
  }));
  S.data.externalReservations.push(...records);
  const click = (action, id = '') => {
    const el = { dataset: { action, id } };
    const event = { target: { closest(selector) { return selector === '[data-action]' ? el : null; } }, preventDefault() {} };
    for (const fn of listeners.click || []) fn(event);
  };
  return { S, records, click, toasts, dialog: elements.get('app-dialog') };
}

test('listagem mostra confirmadas e o período, sem o fluxo de aprovação de sala', () => {
  const { S, records } = setup();
  S.P.local().status = 'confirmada';
  const html = S.views['diretor/externas']();
  for (const record of records) assert.ok(html.includes(record.id));
  assert.match(html, /Período:.*3 dia\(s\)/);
  assert.match(html, /data-action="external-direct"/);
  assert.match(html, />Confirmada<\/span>/);
  assert.doesNotMatch(html, /data-action="external-approve"|data-action="external-reject"|data-action="external-new"/);
  assert.doesNotMatch(html, />Pendente<\/span>|>Aprovada<\/span>|>Recusada<\/span>/);
  S.P.local().status = 'todos';
  const all = S.views['diretor/externas']();
  for (const record of S.data.externalReservations.filter((r) => ['pendente', 'recusada'].includes(r.status)))
    assert.ok(!all.includes(record.id), record.id);
});

test('detalhes mostram contato, participantes, cada dia e cancelamento só de dias futuros', () => {
  const { click, records, dialog } = setup();
  click('booking-detail', 'e:' + records[0].id);
  assert.match(dialog.innerHTML, /contato@example.org/);
  assert.match(dialog.innerHTML, />18<\/strong>/);
  for (const record of records) assert.ok(dialog.innerHTML.includes('e:' + record.id));
  assert.match(dialog.innerHTML, /external-cancel-group/);
  assert.doesNotMatch(dialog.innerHTML, /external-cancel-day/);
  click('booking-detail', 'e:' + records[1].id);
  assert.match(dialog.innerHTML, /external-cancel-day/);
  assert.match(dialog.innerHTML, /Instituição &amp; teste/);
});

test('cancelamento em grupo exige revisão e preserva dia iniciado, liberando os dois futuros', () => {
  const { click, records, dialog, S } = setup();
  click('external-cancel-confirm', 'group|' + records[0].id);
  assert.ok(records.every((record) => record.status === 'aprovada'));
  click('external-cancel-group', records[0].id);
  assert.match(dialog.innerHTML, /cancelamento de <strong>2 dias/);
  assert.doesNotMatch(dialog.innerHTML, /15 de set/);
  assert.ok(records.every((record) => record.status === 'aprovada'));
  click('external-cancel-confirm', 'group|' + records[0].id);
  assert.deepEqual(records.map((record) => record.status), ['aprovada', 'cancelada', 'cancelada']);
  const calendarIds = S.P.allCalendarEvents().map((record) => record.id);
  assert.ok(calendarIds.includes(records[0].id));
  assert.ok(!calendarIds.includes(records[1].id));
  assert.ok(!dialog.open);
});

test('cancelar este dia preserva demais ocorrências do mesmo grupo', () => {
  const { click, records } = setup();
  click('external-cancel-day', records[1].id);
  click('external-cancel-confirm', 'day|' + records[1].id);
  assert.deepEqual(records.map((record) => record.status), ['aprovada', 'cancelada', 'aprovada']);
});

test('coordenação consulta a reserva mas nenhum caminho permite cancelamento externo', () => {
  const { click, records, dialog } = setup('coordenador');
  click('booking-detail', 'e:' + records[1].id);
  assert.match(dialog.innerHTML, /Detalhes da reserva externa/);
  assert.doesNotMatch(dialog.innerHTML, /external-cancel|booking-delete/);
  for (const action of ['booking-delete', 'booking-delete-confirm', 'external-cancel-day', 'external-cancel-group'])
    click(action, action.startsWith('booking-') ? 'e:' + records[1].id : records[1].id);
  click('external-cancel-confirm', 'group|' + records[1].id);
  assert.ok(records.every((record) => record.status === 'aprovada'));
});

test('docente não acessa detalhes externos e confirmação legada não ignora revisão do diretor', () => {
  const { click, records, dialog, S } = setup('docente');
  click('booking-detail', 'e:' + records[1].id);
  assert.equal(dialog.innerHTML, '');
  S.state.role = 'diretor';
  click('booking-delete-confirm', 'e:' + records[1].id);
  assert.equal(records[1].status, 'aprovada');
  click('booking-delete', 'e:' + records[1].id);
  assert.match(dialog.innerHTML, /Confirmar cancelamento/);
  assert.match(dialog.innerHTML, /external-cancel-confirm/);
});

test('voltar aos detalhes invalida a revisão anterior sem cancelar dias', () => {
  const { click, records } = setup();
  click('external-cancel-group', records[0].id);
  click('booking-detail', 'e:' + records[0].id);
  click('external-cancel-confirm', 'group|' + records[0].id);
  assert.ok(records.every((record) => record.status === 'aprovada'));
});
