(function () {
  "use strict";
  const S = SIPAE, { data, state, M, U, P } = S;
  const { esc, icon, heading, time, hours, date } = U;
  const drafts = {}, submitted = new Set();
  const teachers = () => data.teachers.filter((t) => t.status !== "inativo");
  function query() {
    if (!drafts[state.role]) drafts[state.role] = { date: SIPAE_DATA.localDate(), teacherId: "t4", classId: "c3", duration: "2", resources: [], resourcesOpen: false };
    const q = drafts[state.role];
    if (state.role === "docente") q.teacherId = P.teacherId;
    const teacher = teachers().find((t) => t.id === q.teacherId) || teachers()[0];
    q.teacherId = teacher?.id || "";
    const groups = data.classes;
    if (!groups.some((c) => c.id === q.classId)) q.classId = groups[0]?.id || "";
    const subjects = data.teacherSubjects.filter((s) => s.teacherId === q.teacherId);
    if (!subjects.some((s) => s.id === q.disciplineId)) q.disciplineId = subjects[0]?.id || "";
    const available = resourceList(q);
    q.resources = q.resources.filter((r) => available.includes(r));
    return q;
  }
  function resourceList(q) {
    return [...new Set(data.rooms.flatMap((r) => r.resources))].sort((a,b) => a.localeCompare(b, "pt-BR"));
  }
  function resultHtml(q) {
    if (!submitted.has(state.role)) return '<div class="finder-intro">' + icon("search") + '<h2>O ambiente certo para sua aula</h2><p>Informe o planejamento e veja horários compatíveis com a turma, o docente e os recursos necessários.</p><div><span>01 · Planeje a aula</span><span>02 · Escolha o ambiente</span><span>03 · Confirme a reserva</span></div></div>';
    const result = SIPAE_ROOM_SEARCH.search(data, M, q, state.role);
    if (result.error) return '<div class="finder-empty"><h2>Revise sua busca</h2><p role="alert">' + esc(result.error) + '</p></div>';
    if (!result.rooms.length) return '<div class="finder-empty">' + icon("calendar") + '<h2>Nenhum horário compatível</h2><p>Tente outra data, uma duração menor ou menos equipamentos. A busca considera a disponibilidade da sala, da turma e do docente.</p></div>';
    return '<div class="finder-result-heading"><div><span class="eyebrow">AMBIENTES COMPATÍVEIS</span><h2>' + result.rooms.length + ' ' + (result.rooms.length === 1 ? 'sala disponível' : 'salas disponíveis') + '</h2><p>' + date(q.date, true) + ' · aula de ' + hours(Number(q.duration)) + '</p></div><span class="badge green">' + icon("check") + ' Disponibilidade verificada</span></div><p class="finder-help">Escolha um horário para revisar e confirmar a reserva.</p><div class="finder-results">' + result.rooms.map(({room, slots}) => '<article class="finder-room">' + (S.RoomMedia ? S.RoomMedia.visual(room, true) : '') + '<div class="finder-room-body"><div class="finder-room-heading"><div><span class="eyebrow">BLOCO ' + esc(room.block) + '</span><h3>' + esc(room.name) + '</h3></div><span>' + room.capacity + ' lugares</span></div><div class="tags">' + room.resources.map((r) => '<span class="tag">' + esc(r) + '</span>').join('') + '</div><label for="finder-slot-' + esc(room.id) + '">Horários para esta aula</label><select id="finder-slot-' + esc(room.id) + '">' + slots.map((slot) => '<option value="' + slot.start + '">' + time(slot.start) + '–' + time(slot.end) + '</option>').join('') + '</select><button type="button" class="button primary" data-finder-book="' + esc(room.id) + '">Agendar neste ambiente ' + icon("arrow") + '</button></div></article>').join('') + '</div><p class="role-note">Os horários são conferidos novamente ao confirmar. O agendamento é direto.</p>';
  }
  /* Equipamentos necessários: dropdown expansível com checkboxes e seleção múltipla.
     O <details> nativo garante teclado e leitores de tela; os listeners abaixo
     acrescentam fechamento por clique externo e por Esc. Os campos mantêm o nome
     finder-resource, preservando o mecanismo de busca existente. */
  const chosenLabel = (n) =>
    n === 0 ? 'Nenhum selecionado' : n + (n === 1 ? ' selecionado' : ' selecionados');
  function resourcesDropdown(q) {
    const list = resourceList(q),
      chosen = list.filter((r) => q.resources.includes(r)),
      summary = chosenLabel(chosen.length);
    return '<fieldset class="finder-resources"><legend id="finder-resources-legend">Equipamentos necessários</legend>' +
      '<details class="multiselect" data-resources-dropdown' + (q.resourcesOpen ? ' open' : '') + '>' +
      '<summary aria-label="Equipamentos necessários. ' + esc(summary) + '. Abrir ou fechar a lista.">' +
      '<span class="multiselect-label">Equipamentos necessários</span>' +
      '<span class="multiselect-count' + (chosen.length ? ' active' : '') + '">' + esc(summary) + '</span>' +
      '<i class="multiselect-caret" aria-hidden="true"></i></summary>' +
      '<div class="multiselect-panel" role="group" aria-labelledby="finder-resources-legend">' +
      (list.length
        ? '<div class="multiselect-options">' + list.map((r) =>
            '<label class="check-label' + (q.resources.includes(r) ? ' checked' : '') + '"><input type="checkbox" name="finder-resource" value="' +
            esc(r) + '"' + (q.resources.includes(r) ? ' checked' : '') + '><span>' + esc(r) + '</span></label>').join('') +
          '</div><div class="multiselect-footer"><span aria-live="polite">' + esc(summary) + '</span>' +
          '<button type="button" class="text-button" data-resources-clear' + (chosen.length ? '' : ' disabled') + '>Limpar seleção</button></div>'
        : '<p class="multiselect-empty">Nenhum equipamento cadastrado nos ambientes da unidade.</p>') +
      '</div></details>' +
      (chosen.length ? '<div class="multiselect-tags">' + chosen.map((r) => '<span class="tag">' + esc(r) + '</span>').join('') + '</div>' : '') +
      '<p class="finder-resources-help">Opcional · marque quantos equipamentos precisar; a lista continua aberta.</p></fieldset>';
  }
  /* Atualiza o resumo e as etiquetas sem redesenhar o formulário, para que o
     dropdown não feche nem a página se desloque ao marcar um equipamento. */
  function refreshResources() {
    const details = document.querySelector('[data-resources-dropdown]');
    if (!details) return;
    const boxes = [...details.querySelectorAll('input[name="finder-resource"]')];
    const chosen = boxes.filter((b) => b.checked).map((b) => b.value);
    const summary = chosenLabel(chosen.length);
    for (const box of boxes) box.closest('.check-label').classList.toggle('checked', box.checked);
    const count = details.querySelector('.multiselect-count');
    if (count) { count.textContent = summary; count.classList.toggle('active', chosen.length > 0); }
    const live = details.querySelector('.multiselect-footer span');
    if (live) live.textContent = summary;
    const clear = details.querySelector('[data-resources-clear]');
    if (clear) clear.disabled = chosen.length === 0;
    details.querySelector('summary')?.setAttribute('aria-label',
      'Equipamentos necessários. ' + summary + '. Abrir ou fechar a lista.');
    const tags = details.parentElement.querySelector('.multiselect-tags');
    const markup = chosen.map((r) => '<span class="tag">' + esc(r) + '</span>').join('');
    if (tags) { tags.innerHTML = markup; tags.hidden = !chosen.length; }
    else if (chosen.length) details.insertAdjacentHTML('afterend', '<div class="multiselect-tags">' + markup + '</div>');
  }
  function page() {
    const q = query(), teacher = data.teachers.find((t) => t.id === q.teacherId), group = data.classes.find((c) => c.id === q.classId);
    const options = (rows, value) => P.options(rows, value);
    return heading(state.role === 'docente' ? 'DOCENTE · PLANEJAMENTO' : 'PLANEJAMENTO DE AULAS', 'Encontrar sala', 'Encontre um espaço que combine com a sua aula.') + '<div class="finder-layout"><section class="card finder-filters" aria-label="Planejamento da aula"><div class="card-head"><div><h2>Planeje a aula</h2><p>A busca usa o turno da turma.</p></div></div><form id="room-finder-form"><div class="form-grid">' +
      P.field('finder-date','Data da aula',P.input('finder-date',q.date,'date','required min="' + SIPAE_DATA.localDate() + '"'),true) +
      (state.role === 'docente' ? '' : P.field('finder-teacher','Docente',P.select('finder-teacher',teachers().map((t)=>[t.id,t.name]),q.teacherId),true)) +
      P.field('finder-class','Turma',P.select('finder-class',data.classes.map((c)=>[c.id,c.code+' · '+U.shift(c.shift)+' · '+c.students+' alunos']),q.classId),true) +
      P.field('finder-subject','Disciplina',P.select('finder-subject',data.teacherSubjects.filter((s)=>s.teacherId===q.teacherId).map((s)=>[s.id,s.name]),q.disciplineId),true) +
      P.field('finder-duration','Duração da aula', '<select id="finder-duration" name="finder-duration">'+options([[.5,'30 minutos'],[.75,'45 minutos'],[1,'1 hora'],[1.5,'1h30'],[2,'2 horas'],[2.5,'2h30'],[3,'3 horas'],[3.5,'3h30'],[4,'4 horas']],q.duration)+'</select>',true) +
      '</div>' + resourcesDropdown(q) + '<p class="finder-turn">'+icon('clock')+' Turno da turma: '+esc(U.shift(group?.shift))+'</p><button class="button primary finder-submit" type="submit">'+icon('search')+' Buscar salas disponíveis</button></form></section><section id="finder-results" class="finder-output" tabindex="-1" aria-label="Resultados da busca">'+resultHtml(q)+'</section></div>';
  }
  function read(form) {
    const f = new FormData(form), q = query();
    Object.assign(q, { date:String(f.get('finder-date')||''), teacherId:state.role==='docente'?P.teacherId:String(f.get('finder-teacher')||''), classId:String(f.get('finder-class')||''), disciplineId:String(f.get('finder-subject')||''), duration:String(f.get('finder-duration')||''), resources:f.getAll('finder-resource').map(String) });
    return q;
  }
  const dropdown = () => document.querySelector('[data-resources-dropdown]');
  function closeDropdown(focusSummary = false) {
    const details = dropdown();
    if (!details || !details.open) return;
    details.open = false;
    query().resourcesOpen = false;
    if (focusSummary) details.querySelector('summary')?.focus({ preventScroll: true });
  }
  document.addEventListener('toggle', (event)=> {
    const details = event.target.closest?.('[data-resources-dropdown]'); if (!details) return;
    query().resourcesOpen = details.open;
  }, true);
  // Clique fora fecha o dropdown; cliques dentro do painel, inclusive nos
  // checkboxes, mantêm a lista aberta para seleções sucessivas.
  document.addEventListener('pointerdown', (event)=> {
    const details = dropdown();
    if (!details || !details.open || details.contains(event.target)) return;
    closeDropdown();
  });
  document.addEventListener('keydown', (event)=> {
    if (event.key !== 'Escape') return;
    const details = dropdown();
    if (!details?.open || !details.contains(document.activeElement)) return;
    event.preventDefault();
    closeDropdown(true);
  });
  document.addEventListener('click', (event)=> {
    const clear = event.target.closest?.('[data-resources-clear]');
    if (!clear || clear.disabled) return;
    event.preventDefault();
    const details = dropdown();
    for (const box of details.querySelectorAll('input[name="finder-resource"]')) box.checked = false;
    query().resources = [];
    submitted.delete(state.role);
    refreshResources();
    document.getElementById('finder-results').innerHTML = resultHtml(query());
    details.querySelector('input[name="finder-resource"]')?.focus({ preventScroll: true });
  });
  document.addEventListener('submit', (event)=> {
    if (event.target.id !== 'room-finder-form') return;
    event.preventDefault(); read(event.target); submitted.add(state.role); S.render();
    document.getElementById('finder-results').focus({preventScroll:true});
    if (window.innerWidth < 850) document.getElementById('finder-results').scrollIntoView({block:'start'});
  });
  document.addEventListener('change', (event)=> {
    const form=event.target.closest?.('#room-finder-form'); if (!form) return;
    read(form); submitted.delete(state.role);
    if (event.target.id === 'finder-teacher' || event.target.id === 'finder-class') {
      const id = event.target.id; S.render(); document.getElementById(id)?.focus();
      return;
    }
    // Marcar um equipamento atualiza apenas o resumo: o dropdown continua aberto
    // e a posição da página não muda.
    if (event.target.name === 'finder-resource') refreshResources();
    document.getElementById('finder-results').innerHTML=resultHtml(query());
  });
  document.addEventListener('click',(event)=> {
    const button=event.target.closest?.('[data-finder-book]'); if (!button || state.page!=='encontrar' || !submitted.has(state.role)) return;
    const roomId=button.dataset.finderBook, start=Number(document.getElementById('finder-slot-'+roomId)?.value);
    const result=SIPAE_ROOM_SEARCH.search(data,M,query(),state.role);
    const slot=result.rooms.find((r)=>r.room.id===roomId)?.slots.find((s)=>s.start===start);
    if (!slot) { S.toast('Este horário não está mais disponível. Faça uma nova busca.'); S.render(); return; }
    P.openBooking({...slot});
  });
  for (const role of ['docente','coordenador','diretor']) S.views[role+'/encontrar']=page;
  S.render();
})();
