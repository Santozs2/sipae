const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
process.env.TZ = 'America/Sao_Paulo';
const root = path.resolve(__dirname, '..');
function setup() {
  const elements = new Map(), listeners = {}, opened = [];
  const element = () => ({ innerHTML: '', value: '', dataset: {}, classList: {toggle(){return false;},contains(){return false;},remove(){},add(){}}, setAttribute(){}, removeAttribute(){}, addEventListener(){}, focus(){} });
  const context = vm.createContext({ console, Intl, Date, setTimeout, clearTimeout });
  context.document = { body: element(), getElementById(id) {if(!elements.has(id))elements.set(id,element()); return elements.get(id);},
    querySelector: element, addEventListener(type, fn) {(listeners[type] ||= []).push(fn);} };
  context.location = {hash:'#coordenador/relatorios'};
  context.window = {addEventListener(){},scrollTo(){}};
  for(const file of ['data.js','metrics.js','app.js','charts.js','views.js'])
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  const S = context.SIPAE;
  S.P = { button: (label,action,id) => `<button data-action="${action}" data-id="${id}">${label}</button>`,
    openDialog: (...args) => opened.push(args) };
  vm.runInContext(fs.readFileSync(path.join(root,'report-details.js'),'utf8'),context,{filename:'report-details.js'});
  function activate(dataset, type='click', key) {
    const el = {dataset};
    const event = {target:{closest(selector){return selector.startsWith('[data-report-kind]')?el:null;}}, key, preventDefault(){this.prevented=true;}};
    for(const fn of listeners[type] || []) fn(event);
    return event;
  }
  return {S,context,collect:context.SIPAE_REPORT_DETAILS.collect,opened,activate};
}
const scenario = setup();
const {S,collect,opened,activate} = scenario;
const d=S.data, M=S.M;
const filter={period:'mes',shift:'todos',teacher:'todos'};
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('relatórios da coordenação apresentam somente a área de filtros',()=>{
  S.state.role='coordenador';
  const html=S.views['coordenador/relatorios']();
  assert.ok(html.includes('Relatórios da unidade'));
  assert.ok(html.includes('id="report-filters"'));
  for(const t of d.teachers) assert.ok(html.includes(`<option value="${t.id}"`),t.name);
  for(const p of ['period','shift','teacher']) assert.ok(html.includes(`data-filter="${p}"`),p);
  assert.doesNotMatch(html,/<section class="card|data-report-kind|class="chart"|<table/);
  assert.doesNotMatch(html,/area-filter|data-filter="area"|TECNOLOGIA DA INFORMAÇÃO|Relatórios da área|Visão restrita/);
});
test('relatório executivo apresenta somente a área de filtros',()=>{
  S.state.role='diretor';
  const html=S.views['diretor/relatorios']();
  assert.ok(html.includes('Relatório executivo'));
  assert.ok(html.includes('id="report-filters"'));
  for(const p of ['period','shift','teacher']) assert.ok(html.includes(`data-filter="${p}"`),p);
  assert.doesNotMatch(html,/<section class="card|data-report-kind|data-report-block|class="chart"|<table/);
  assert.doesNotMatch(html,/data-report-area|data-report-kind="area"|coordenações|area-filter|NaN|undefined/);
});
test('soma dos blocos reproduz horas, disponibilidade e aulas da unidade',()=>{
  for(const period of Object.keys(M.periods))for(const shift of ['todos','manha','tarde','noite']) {
    const f={period,shift}, rows=S.U.blockStats(f), unit=M.overview(d,f);
    approx(M.sum(rows,r=>r.used),unit.used);approx(M.sum(rows,r=>r.available),unit.available);
    approx(M.sum(rows,r=>r.hours),unit.hours);assert.equal(M.sum(rows,r=>r.bookings),unit.bookings);
  }
});
test('detalhe de cada bloco corresponde exatamente à barra de ocupação',()=>{
  for(const b of S.U.blockStats(filter)) {
    const result=collect(d,M,filter,'coordenador','block',b.id,'occupancy');
    approx(result.used,b.used);approx(result.available,b.available);
    for(const r of result.records)assert.equal(d.rooms.find(x=>x.id===r.roomId).block,b.id);
  }
});
test('coordenação acessa reservas de todos os blocos sem restrição legada de área',()=>{
  for(const room of d.rooms) {
    const result=collect(d,M,{...filter,area:'ti'},'coordenador','room',room.id,'occupancy');
    assert.ok(result,room.name);assert.ok(!Object.hasOwn(result.filter,'area'));
    const expected=M.roomStats(d,filter).find(r=>r.id===room.id);
    approx(result.used,expected.used);approx(result.available,expected.available);
  }
});
test('filtro de docente e turno limita resultados sem ocultar ambientes',()=>{
  for(const teacher of d.teachers) {
    const f={...filter,teacher:teacher.id,shift:'noite'};
    for(const b of S.U.blockStats(f)) {
      const result=collect(d,M,f,'coordenador','block',b.id,'occupancy');
      approx(result.used,b.used);approx(result.available,b.available);
      for(const r of result.records) {assert.equal(r.teacherId,teacher.id);assert.equal(r.shift,'noite');}
    }
  }
});
test('segmentos por bloco e turno reproduzem as horas acadêmicas',()=>{
  for(const block of new Set(d.rooms.map(r=>r.block)))for(const shift of d.shifts) {
    const result=collect(d,M,filter,'diretor','shift',shift.id,'lessons',block);
    const expected=S.U.blockStats({...filter,shift:shift.id}).find(b=>b.id===block);
    approx(result.used,expected.hours);assert.equal(result.records.length,expected.bookings);
    assert.ok(result.records.every(r=>!r.external));
  }
});
test('reservas externas aprovadas entram na ocupação mas não nas horas de aula',()=>{
  const day=M.period(filter).start, room=d.rooms.find(r=>r.status==='ativo');
  const fixture={id:'regression-external',date:day,start:8,end:10,roomId:room.id,areaId:'unidade',shift:'manha',status:'aprovada',purpose:'Evento teste',organization:'Instituição teste'};
  d.externalReservations.push(fixture);
  try {
    const occupied=collect(d,M,filter,'coordenador','room',room.id,'occupancy');
    assert.ok(occupied.records.some(r=>r.id===fixture.id && r.external));
    assert.ok(!collect(d,M,filter,'diretor','shift','manha','lessons',room.block).records.some(r=>r.id===fixture.id));
    fixture.status='pendente';assert.ok(!collect(d,M,filter,'coordenador','room',room.id,'occupancy').records.some(r=>r.id===fixture.id));
  } finally {d.externalReservations.pop();}
});
test('intervalos sobrepostos no mesmo ambiente contam uma vez',()=>{
  const source=d.allocations.find(r=>r.status==='confirmada'&&M.inRange(r.date,filter));
  assert.ok(source);const original=collect(d,M,filter,'diretor','room',source.roomId,'occupancy');
  d.allocations.push({...source,id:'overlap-probe'});
  try {const result=collect(d,M,filter,'diretor','room',source.roomId,'occupancy');approx(result.used,original.used);assert.equal(result.records.length,original.records.length+1);}
  finally {d.allocations.pop();}
});
test('docente não recebe acesso a relatórios administrativos; valores inválidos são negados',()=>{
  assert.equal(collect(d,M,filter,'docente','block','A','occupancy'),null);
  assert.equal(collect(d,M,filter,'coordenador','block','INEXISTENTE','occupancy'),null);
  assert.equal(collect(d,M,filter,'diretor','area','unidade','occupancy'),null);
  assert.equal(collect(d,M,filter,'diretor','shift','manha','lessons','INEXISTENTE'),null);
});
test('clique, Enter e Espaço abrem detalhes do mesmo bloco',()=>{
  S.state.role='coordenador';S.state.page='relatorios';
  const dataset={reportKind:'block',reportValue:'B',reportMetric:'occupancy'};
  const before=opened.length;activate(dataset);activate(dataset,'keydown','Enter');const event=activate(dataset,'keydown',' ');
  assert.equal(opened.length,before+3);assert.ok(event.prevented);
  const [title,subtitle,body]=opened.at(-1);assert.equal(title,'Agendamentos · Bloco B');assert.ok(subtitle.includes(M.period(S.filter()).label));
  assert.ok(body.includes('Unidade inteira · Bloco B'));assert.ok(body.includes('Todos os docentes'));
});
test('vazio e turno excluído mostram contexto sem registros fora do filtro',()=>{
  const excluded=collect(d,M,{...filter,shift:'manha'},'coordenador','shift','noite','lessons','B');
  assert.ok(excluded.excluded);assert.equal(excluded.records.length,0);
  const empty=collect(d,M,{start:'1900-01-01',end:'1900-01-31'},'coordenador','block','D','occupancy');
  assert.equal(empty.records.length,0);assert.equal(empty.used,0);
});
test('todos os períodos e turnos renderizam sem datas ou números inválidos',()=>{
  for(const role of ['coordenador','diretor'])for(const period of Object.keys(M.periods))for(const shift of ['todos','manha','tarde','noite']){
    S.state.role=role;S.state.filters[role]={period,shift,teacher:'todos'};
    assert.doesNotMatch(S.views[role+'/relatorios'](),/NaN|undefined|Invalid Date|data-report-area|coordenações/);
  }
});
