const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// O package.json do projeto pai usa type=module; este projeto estático é independente.
// Executa o arquivo como CommonJS para conferir o export UMD sem mudar o pacote pai.
const engineSource = fs.readFileSync(path.join(__dirname, '..', 'external-booking.js'), 'utf8');
const engineModule = { exports: {} };
new Function('module', engineSource)(engineModule);
const E = engineModule.exports;

process.env.TZ = 'America/Sao_Paulo';
const now = new Date('2026-09-15T09:00:00-03:00');
const query = { startDate: '2026-09-21', endDate: '2026-09-23', start: '13:00', end: '17:00', attendees: 30 };
const input = { ...query, roomId: 'r1', organization: 'Instituto de formação', contact: 'contato@example.org', purpose: 'Formação de profissionais' };
function fixture() {
  return {
    shifts: [{ id: 'manha', start: 8, end: 12 }, { id: 'tarde', start: 13, end: 17 }, { id: 'noite', start: 18, end: 22 }],
    rooms: [
      { id: 'r1', name: 'Sala A', capacity: 30, status: 'ativo', externalBlocked: false },
      { id: 'r2', name: 'Sala B', capacity: 40, status: 'ativo', externalBlocked: false, workingDays: [1, 2, 3, 4, 5] },
    ], allocations: [], externalReservations: [],
  };
}
function occupied(changes = {}) {
  return { id: 'a1', roomId: 'r1', date: '2026-09-23', start: 13, end: 17, status: 'confirmada', ...changes };
}

test('Busca inclui todas as datas, retorna salas e não modifica a base nem a consulta', () => {
  const data = fixture(), snapshot = JSON.stringify(data), request = Object.freeze({ ...query });
  const result = E.search(data, request, now);
  assert.equal(result.error, null);
  assert.deepEqual(result.dates, ['2026-09-21', '2026-09-22', '2026-09-23']);
  assert.deepEqual(result.rooms.map(room => room.id), ['r1', 'r2']);
  assert.equal(JSON.stringify(data), snapshot);
});

test('A mesma implementação funciona como módulo CommonJS e script de navegador', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'external-booking.js'), 'utf8'), context);
  assert.equal(typeof context.SIPAE_EXTERNAL_BOOKING.search, 'function');
  assert.equal(typeof context.SIPAE_EXTERNAL_BOOKING.confirm, 'function');
  assert.equal(typeof context.SIPAE_EXTERNAL_BOOKING.cancel, 'function');
});

test('A confirmação direta cria uma ocorrência aprovada por dia com o mesmo grupo', () => {
  const data = fixture(), result = E.confirm(data, 'diretor', input, now);
  assert.equal(result.error, null);
  assert.equal(result.records.length, 3);
  assert.equal(data.externalReservations.length, 3);
  assert.ok(result.groupId);
  for (const record of result.records) {
    assert.equal(record.groupId, result.groupId);
    assert.equal(record.groupStartDate, query.startDate);
    assert.equal(record.groupEndDate, query.endDate);
    assert.equal(record.start, 13);
    assert.equal(record.end, 17);
    assert.equal(record.shift, 'tarde');
    assert.equal(record.status, 'aprovada');
    assert.equal(record.source, 'diretor');
    assert.equal(record.direct, true);
    assert.equal(record.areaId, 'unidade');
  }
});

test('Conflito somente no último dia impede toda a confirmação, sem gravar parte do período', () => {
  const data = fixture(); data.allocations.push(occupied());
  const snapshot = JSON.stringify(data), result = E.confirm(data, 'diretor', input, now);
  assert.match(result.error, /23\/09\/2026/);
  assert.deepEqual(result.records, []);
  assert.equal(JSON.stringify(data), snapshot);
  assert.deepEqual(E.search(data, query, now).rooms.map(room => room.id), ['r2']);
});

test('Confirmar refaz a busca e detecta uma reserva criada após a escolha da sala', () => {
  const data = fixture(); assert.equal(E.search(data, query, now).rooms.length, 2);
  data.externalReservations.push(occupied({ id: 'ext-other', status: 'aprovada' }));
  const result = E.confirm(data, 'diretor', input, now);
  assert.ok(result.error);
  assert.equal(data.externalReservations.length, 1);
});

test('Confirmar refaz a busca e detecta novo bloqueio externo ou redução de capacidade', () => {
  for (const change of [{ externalBlocked: true }, { capacity: 29 }, { status: 'manutencao' }]) {
    const data = fixture(); assert.equal(E.search(data, query, now).rooms.length, 2);
    Object.assign(data.rooms[0], change);
    assert.ok(E.confirm(data, 'diretor', input, now).error);
    assert.equal(data.externalReservations.length, 0);
  }
});

for (const role of ['docente', 'coordenador', '', 'admin']) {
  test('Perfil ' + JSON.stringify(role) + ' não pode confirmar nem cancelar reserva externa diretamente', () => {
    const data = fixture(), booked = E.confirm(data, 'diretor', input, now);
    const snapshot = JSON.stringify(data);
    assert.ok(E.confirm(data, role, { ...input, roomId: 'r2' }, now).error);
    assert.ok(E.cancel(data, role, booked.records[0].id, 'group', now).error);
    assert.equal(JSON.stringify(data), snapshot);
  });
}

test('Reservas adjacentes são aceitas, mas uma sobreposição de 15 minutos bloqueia', () => {
  const data = fixture(); data.allocations.push(occupied({ start: 8, end: 13 }), occupied({ id: 'a2', start: 17, end: 18 }));
  assert.equal(E.search(data, query, now).rooms.length, 2);
  data.allocations[0].end = 13.25;
  assert.deepEqual(E.search(data, query, now).rooms.map(room => room.id), ['r2']);
});

test('Solicitação externa pendente bloqueia a sala e permanece intacta', () => {
  const data = fixture(); data.externalReservations.push(occupied({ id: 'pending', status: 'pendente', organization: 'Solicitante comum' }));
  const snapshot = JSON.stringify(data.externalReservations[0]);
  const result = E.search(data, query, now);
  assert.match(result.unavailable[0].reason, /pendente/);
  assert.ok(E.confirm(data, 'diretor', input, now).error);
  assert.ok(E.cancel(data, 'diretor', 'pending', 'day', now).error);
  assert.equal(JSON.stringify(data.externalReservations[0]), snapshot);
});

test('Registros cancelados ou recusados não bloqueiam horários', () => {
  const data = fixture();
  data.allocations.push(occupied({ status: 'cancelada' }));
  data.externalReservations.push(occupied({ status: 'cancelada' }), occupied({ status: 'recusada' }));
  assert.equal(E.search(data, query, now).rooms.length, 2);
});

test('O conflito deve corresponder à mesma sala e à mesma data', () => {
  const data = fixture();
  data.allocations.push(occupied({ roomId: 'other' }), occupied({ date: '2026-09-24' }));
  assert.equal(E.search(data, query, now).rooms.length, 2);
});

test('Capacidade exata é aceita e público maior elimina salas pequenas', () => {
  assert.equal(E.search(fixture(), query, now).rooms.length, 2);
  const result = E.search(fixture(), { ...query, attendees: 31 }, now);
  assert.deepEqual(result.rooms.map(room => room.id), ['r2']);
  assert.match(result.unavailable[0].reason, /capacidade/);
});

test('Ambiente bloqueado para externo e ambiente em manutenção ficam indisponíveis', () => {
  const data = fixture(); data.rooms[0].externalBlocked = true; data.rooms[1].status = 'manutencao';
  const result = E.search(data, query, now);
  assert.equal(result.rooms.length, 0);
  assert.equal(result.unavailable.length, 2);
  assert.match(result.unavailable[0].reason, /bloqueado/);
  assert.match(result.unavailable[1].reason, /manutenção/);
});

test('O período não pula sábado ou domingo e exige funcionamento em cada dia', () => {
  const data = fixture(), weekend = { ...query, startDate: '2026-09-25', endDate: '2026-09-28' };
  const result = E.search(data, weekend, now);
  assert.equal(result.dates.length, 4);
  assert.equal(result.rooms.length, 0);
  assert.equal(result.unavailable[0].date, '2026-09-26');
  data.rooms[0].workingDays = [0, 1, 2, 3, 4, 5, 6];
  assert.deepEqual(E.search(data, weekend, now).rooms.map(room => room.id), ['r1']);
});

test('Sala cadastrada depois do início do período não aparece como disponível', () => {
  const data = fixture(); data.rooms[0].createdDate = '2026-09-22';
  assert.deepEqual(E.search(data, query, now).rooms.map(room => room.id), ['r2']);
});

test('Datas ISO inexistentes, formatos incompletos e período invertido são rejeitados', () => {
  for (const dates of [
    { startDate: '2026-02-30' }, { endDate: '2027-02-29' }, { startDate: '21/09/2026' },
    { startDate: '2026-9-21' }, { startDate: '' }, { endDate: '2026-09-20' },
    { startDate: '2026-13-01' }, { startDate: '2026-09-21T00:00:00Z' },
  ]) {
    const result = E.search(fixture(), { ...query, ...dates }, now);
    assert.ok(result.error, JSON.stringify(dates));
    assert.deepEqual(result.dates, []);
  }
});

test('29 de fevereiro válido pode ser reservado e a mudança de mês é inclusiva', () => {
  const data = fixture(); data.rooms[0].workingDays = [0, 1, 2, 3, 4, 5, 6];
  const result = E.search(data, { ...query, startDate: '2028-02-28', endDate: '2028-03-01' }, now);
  assert.equal(result.error, null);
  assert.deepEqual(result.dates, ['2028-02-28', '2028-02-29', '2028-03-01']);
});

test('Períodos superiores a um ano são aceitos com data final definida', () => {
  const data = fixture(); data.rooms[0].workingDays = [0, 1, 2, 3, 4, 5, 6];
  const result = E.search(data, { ...query, startDate: '2026-09-21', endDate: '2027-09-21' }, now);
  assert.equal(result.error, null);
  assert.equal(result.dates.length, 366);
  const extended = E.search(data, { ...query, endDate: '2027-09-22' }, now);
  assert.equal(extended.error, null);
  assert.equal(extended.dates.length, 367);
});

test('Recorrência em dois meses inclui somente os dias da semana escolhidos', () => {
  const data = fixture();
  const request = { ...input, startDate: '2026-10-01', endDate: '2026-12-01', weekdays: [1, 3] };
  const result = E.search(data, request, now);
  assert.equal(result.error, null);
  assert.equal(result.dates.length, 17);
  assert.equal(result.dates[0], '2026-10-05');
  assert.equal(result.dates.at(-1), '2026-11-30');
  assert.ok(result.dates.every(date => [1, 3].includes(new Date(date + 'T12:00Z').getUTCDay())));
  const confirmed = E.confirm(data, 'diretor', request, now);
  assert.equal(confirmed.error, null);
  assert.deepEqual(confirmed.records.map(record => record.date), result.dates);
  assert.ok(confirmed.records.every(record => JSON.stringify(record.groupWeekdays) === '[1,3]'));
});

test('Conflitos em dias excluídos não impedem recorrência; em dias selecionados bloqueiam tudo', () => {
  const data = fixture(), request = { ...input, startDate: '2026-10-01', endDate: '2026-12-01', weekdays: [1, 3] };
  data.allocations.push(occupied({ date: '2026-10-06' }));
  assert.ok(E.search(data, request, now).rooms.some(room => room.id === 'r1'));
  data.allocations.push(occupied({ date: '2026-11-30' }));
  const result = E.confirm(data, 'diretor', request, now);
  assert.match(result.error, /30\/11\/2026/);
  assert.equal(data.externalReservations.length, 0);
});

test('Dias vazios, inválidos ou ausentes no período retornam erro; duplicados não duplicam reservas', () => {
  for (const weekdays of [[], [-1], [7], ['1'], null, 'segunda'])
    assert.ok(E.search(fixture(), { ...query, weekdays }, now).error);
  assert.match(E.search(fixture(), { ...query, weekdays: [5] }, now).error, /não contém/);
  const result = E.confirm(fixture(), 'diretor', { ...input, weekdays: [1, 1, 3] }, now);
  assert.equal(result.error, null);
  assert.deepEqual(result.records.map(record => record.date), ['2026-09-21', '2026-09-23']);
});

test('Recorrência ignora o horário passado de hoje quando hoje não foi selecionado', () => {
  const queryToday = { ...query, startDate: '2026-09-15', endDate: '2026-09-18', weekdays: [3], start: '08:00', end: '09:00' };
  assert.equal(E.search(fixture(), queryToday, now).error, null);
  assert.ok(E.search(fixture(), { ...queryToday, weekdays: [2] }, now).error);
});

test('Horários precisam de intervalos de 15 minutos e ficar dentro de um único turno', () => {
  for (const hours of [
    { start: '13:10' }, { end: '17:01' }, { start: '13:00', end: '13:00' }, { end: '12:00' },
    { start: '11:00', end: '14:00' }, { start: '7:00' }, { start: '24:00' }, { start: '13:60' }, { start: 13 },
  ]) assert.ok(E.search(fixture(), { ...query, ...hours }, now).error, JSON.stringify(hours));
  assert.equal(E.search(fixture(), { ...query, start: '13:15', end: '16:45' }, now).error, null);
});

test('Validação usa os turnos da base e não horários fixos no motor', () => {
  const data = fixture(); data.shifts = [{ id: 'especial', start: 7, end: 11 }];
  const result = E.confirm(data, 'diretor', { ...input, start: '07:00', end: '10:45' }, now);
  assert.equal(result.error, null);
  assert.equal(result.records[0].shift, 'especial');
});

test('Participantes devem ser inteiros entre 1 e 500; valores vindos do formulário são aceitos', () => {
  for (const attendees of [0, -1, 1.5, 501, '', 'abc', Infinity, NaN, true, null, {}])
    assert.ok(E.search(fixture(), { ...query, attendees }, now).error, String(attendees));
  assert.equal(E.search(fixture(), { ...query, attendees: '30' }, now).error, null);
  assert.equal(E.search(fixture(), { ...query, attendees: 500 }, now).error, null);
});

test('Hoje só aceita início estritamente futuro, incluindo segundos do relógio local', () => {
  const today = { ...query, startDate: '2026-09-15', endDate: '2026-09-15', start: '09:00', end: '12:00' };
  assert.ok(E.search(fixture(), today, now).error);
  assert.equal(E.search(fixture(), { ...today, start: '09:15' }, now).error, null);
  assert.ok(E.search(fixture(), today, new Date('2026-09-15T09:00:01-03:00')).error);
  assert.ok(E.search(fixture(), { ...today, startDate: '2026-09-14' }, now).error);
});

test('A comparação de hoje considera a data local quando UTC já mudou de dia', () => {
  const late = new Date('2026-09-14T23:30:00-03:00');
  const nextDay = { ...query, startDate: '2026-09-15', endDate: '2026-09-15', start: '08:00', end: '09:00' };
  assert.equal(E.search(fixture(), nextDay, late).error, null);
});

test('Sala inexistente ou campos de evento vazios não produzem registros parciais', () => {
  for (const changes of [{ roomId: 'inexistente' }, { organization: ' ' }, { contact: '' }, { purpose: null }, { purpose: 'x'.repeat(501) }]) {
    const data = fixture();
    assert.ok(E.confirm(data, 'diretor', { ...input, ...changes }, now).error);
    assert.equal(data.externalReservations.length, 0);
  }
});

test('IDs e grupos permanecem únicos quando várias confirmações usam o mesmo instante', () => {
  const data = fixture();
  const first = E.confirm(data, 'diretor', input, now);
  const second = E.confirm(data, 'diretor', { ...input, roomId: 'r2' }, now);
  assert.equal(second.error, null);
  assert.notEqual(first.groupId, second.groupId);
  assert.equal(new Set(data.externalReservations.map(record => record.id)).size, 6);
  E.cancel(data, 'diretor', first.records[0].id, 'group', now);
  const third = E.confirm(data, 'diretor', input, now);
  assert.equal(third.error, null);
  assert.equal(new Set(data.externalReservations.map(record => record.id)).size, 9);
});

test('Uma segunda confirmação no mesmo horário não duplica a reserva', () => {
  const data = fixture(); E.confirm(data, 'diretor', input, now);
  assert.ok(E.confirm(data, 'diretor', input, now).error);
  assert.equal(data.externalReservations.length, 3);
});

test('Cancelar o grupo libera todos os horários para nova reserva', () => {
  const data = fixture(), booked = E.confirm(data, 'diretor', input, now);
  assert.deepEqual(E.search(data, query, now).rooms.map(room => room.id), ['r2']);
  const cancelled = E.cancel(data, 'diretor', booked.records[1].id, 'group', now);
  assert.equal(cancelled.error, null);
  assert.equal(cancelled.records.length, 3);
  assert.ok(cancelled.records.every(record => record.status === 'cancelada' && record.cancelledBy === 'diretor'));
  assert.equal(E.search(data, query, now).rooms.length, 2);
});

test('Cancelar um dia mantém os demais dias do grupo confirmados', () => {
  const data = fixture(), booked = E.confirm(data, 'diretor', input, now);
  const result = E.cancel(data, 'diretor', booked.records[1].id, 'day', now);
  assert.equal(result.error, null);
  assert.equal(result.records.length, 1);
  assert.deepEqual(booked.records.map(record => record.status), ['aprovada', 'cancelada', 'aprovada']);
  assert.equal(E.search(data, { ...query, startDate: '2026-09-22', endDate: '2026-09-22' }, now).rooms.length, 2);
  assert.equal(E.search(data, query, now).rooms.length, 1);
});

test('Cancelamento de grupo preserva ocorrências passadas, em andamento e solicitações pendentes', () => {
  const data = fixture(), booked = E.confirm(data, 'diretor', input, now);
  data.externalReservations.push(occupied({ id: 'pending-group', groupId: booked.groupId, date: '2026-09-24', status: 'pendente' }));
  const result = E.cancel(data, 'diretor', booked.records[0].id, 'group', new Date('2026-09-22T14:00:00-03:00'));
  assert.equal(result.error, null);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].date, '2026-09-23');
  assert.deepEqual(data.externalReservations.map(record => record.status), ['aprovada', 'aprovada', 'cancelada', 'pendente']);
});

test('Cancelamento individual no instante de início e cancelamento repetido são rejeitados', () => {
  const data = fixture(), booked = E.confirm(data, 'diretor', input, now);
  assert.ok(E.cancel(data, 'diretor', booked.records[0].id, 'day', new Date('2026-09-21T13:00:00-03:00')).error);
  assert.equal(booked.records[0].status, 'aprovada');
  assert.equal(E.cancel(data, 'diretor', booked.records[1].id, 'day', now).error, null);
  assert.ok(E.cancel(data, 'diretor', booked.records[1].id, 'day', now).error);
});

test('Cancelamento de uma reserva comum sem grupo afeta somente esse registro', () => {
  const data = fixture(); data.externalReservations.push(occupied({ id: 'legacy', status: 'aprovada' }), occupied({ id: 'pending', status: 'pendente' }));
  const result = E.cancel(data, 'diretor', 'legacy', 'group', now);
  assert.equal(result.error, null);
  assert.equal(result.records.length, 1);
  assert.equal(data.externalReservations[1].status, 'pendente');
});

test('Escopo inválido, ID desconhecido e relógio inválido não modificam reservas', () => {
  const data = fixture(), booked = E.confirm(data, 'diretor', input, now), snapshot = JSON.stringify(data);
  assert.ok(E.cancel(data, 'diretor', booked.records[0].id, 'all', now).error);
  assert.ok(E.cancel(data, 'diretor', 'missing', 'day', now).error);
  assert.ok(E.cancel(data, 'diretor', booked.records[0].id, 'day', new Date(NaN)).error);
  assert.ok(E.search(data, query, new Date(NaN)).error);
  assert.equal(JSON.stringify(data), snapshot);
});
