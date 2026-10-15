(() => {
  'use strict';

  const data = window.SIPAE_DATA;
  const storageKey = 'sipae.coordenador.alocacoes.v1';
  const teachers = new Map(data.teachers.map(item => [String(item.id), item]));
  const courses = new Map(data.courses.map(item => [String(item.id), item]));
  const units = new Map(data.units.map(item => [item.id, item]));
  const environments = new Map(data.environments.map(item => [String(item.id), item]));

  const $ = id => document.getElementById(id);
  const courseSelect = $('course-select');
  const unitSearch = $('unit-search');
  const unitList = $('unit-list');
  const locationSearch = $('location-search');
  const locationList = $('location-list');
  const saveButton = $('save-button');
  const coordinatorApproval = $('coordinator-approval');
  const decisionBox = $('decision-box');
  const removeDialog = $('remove-dialog');
  const clearDialog = $('clear-dialog');
  const message = $('form-message');
  const selectedUnitIds = new Set();
  const selectedEnvironmentIds = new Set();
  let teacherCombo;
  let editingRecordId = null;
  let pendingRemovalId = null;
  let removalTrigger = null;
  let records = loadRecords();

  function selectedTeacher() { return teachers.get(teacherCombo?.getId()); }
  function selectedCourse() { return courses.get(courseSelect.value); }
  function normalize(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR'); }
  function text(node, value) { node.textContent = value; }

  function createElement(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }

  function environmentIcon(name) {
    const icon = createElement('span', 'location-icon');
    icon.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const normalizedName = normalize(name);
    let shapes;
    if (normalizedName.startsWith('oficina')) {
      shapes = [['path', {d: 'M14.7 6.3a6 6 0 0 0-8.4 8.4l-4.1 4.1a2 2 0 0 0 2.8 2.8l4.1-4.1a6 6 0 0 0 8.4-8.4l-4.2 4.2-2.8-2.8z'}]];
    } else if (normalizedName === 'metrologia') {
      shapes = [['path', {d: 'M4 18 18 4l3 3L7 21l-3-3Zm5-5 2 2m1-5 2 2m1-5 2 2'}]];
    } else if (normalizedName === 'costura') {
      shapes = [['circle', {cx: '5', cy: '7', r: '2'}], ['circle', {cx: '5', cy: '17', r: '2'}], ['path', {d: 'm7 8 13 12M7 16 20 4M12 12l8 8'}]];
    } else if (/^(ti\d|redes|automacao|clp|robotica|simulador)/.test(normalizedName)) {
      shapes = [['rect', {x: '3', y: '4', width: '18', height: '13', rx: '2'}], ['path', {d: 'M8 21h8m-4-4v4'}]];
    } else {
      shapes = [['rect', {x: '4', y: '3', width: '16', height: '18', rx: '2'}], ['path', {d: 'M8 7h2m4 0h2M8 11h2m4 0h2M9 21v-5h6v5'}]];
    }
    for (const [tag, attributes] of shapes) {
      const shape = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, value);
      svg.append(shape);
    }
    icon.append(svg);
    return icon;
  }

  function createTeacherPicker({inputId, toggleId, clearId, optionsId, items, onChange}) {
    const input = $(inputId);
    const toggle = $(toggleId);
    const clearButton = $(clearId);
    const list = $(optionsId);
    const root = input.closest('.teacher-picker');
    const desktopLayout = window.matchMedia('(min-width: 801px)');
    const byId = new Map(items.map(item => [String(item.id), item]));
    let selectedId = '';
    let visible = items;
    let activeIndex = -1;

    function render(showAll = false) {
      const term = normalize(input.value.trim());
      visible = showAll ? items : items.filter(item => normalize(`${item.name} ${item.type}`).includes(term));
      list.replaceChildren();
      if (!visible.length) list.append(createElement('p', 'picker-empty', 'Nenhum professor encontrado.'));
      for (const item of visible) {
        const option = createElement('div', 'teacher-option');
        option.id = `${optionsId}-${item.id}`;
        option.dataset.id = item.id;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(selectedId === String(item.id)));
        option.tabIndex = 0;
        const initials = item.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
        const avatar = createElement('span', 'teacher-avatar', initials);
        const copy = createElement('span', 'teacher-option-copy');
        copy.append(createElement('strong', '', item.name), createElement('small', '', item.type === 'CT' ? 'Curso técnico' : 'CAI'));
        option.append(avatar, copy, createElement('span', 'teacher-chevron', '›'));
        list.append(option);
      }
      text($('available-teachers-count'), `${items.length} docentes`);
      clearButton.hidden = !input.value && !selectedId;
    }

    function open(showAll = false) {
      render(showAll);
      list.hidden = false;
      root.classList.add('is-open');
      input.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-expanded', 'true');
    }

    function close() {
      list.hidden = !desktopLayout.matches;
      root.classList.toggle('is-open', desktopLayout.matches);
      input.setAttribute('aria-expanded', String(desktopLayout.matches));
      toggle.setAttribute('aria-expanded', String(desktopLayout.matches));
      input.removeAttribute('aria-activedescendant');
      activeIndex = -1;
    }

    function choose(item) {
      if (!item) return;
      const changed = selectedId !== String(item.id);
      selectedId = String(item.id);
      input.value = desktopLayout.matches ? '' : item.name;
      input.removeAttribute('aria-invalid');
      render(desktopLayout.matches);
      close();
      if (desktopLayout.matches) list.querySelector('[aria-selected="true"]')?.scrollIntoView({block: 'nearest'});
      if (changed) onChange();
    }

    function clear() {
      selectedId = '';
      input.value = '';
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
      input.removeAttribute('aria-invalid');
      render();
      close();
    }

    input.addEventListener('focus', () => open(Boolean(selectedId) && !desktopLayout.matches));
    input.addEventListener('input', () => {
      if (selectedId && input.value !== byId.get(selectedId)?.name) { selectedId = ''; onChange(); }
      activeIndex = -1;
      input.removeAttribute('aria-invalid');
      open();
    });
    input.addEventListener('keydown', event => {
      if (selectedId && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault();
        clear();
        onChange();
        open(true);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (list.hidden) open(Boolean(selectedId));
        activeIndex = Math.max(0, Math.min(visible.length - 1, activeIndex + (event.key === 'ArrowDown' ? 1 : -1)));
        const active = list.querySelectorAll('.teacher-option')[activeIndex];
        if (active) { input.setAttribute('aria-activedescendant', active.id); active.scrollIntoView({block: 'nearest'}); }
      } else if (event.key === 'Enter' && !list.hidden && visible.length) {
        event.preventDefault();
        choose(visible[activeIndex < 0 ? 0 : activeIndex]);
      } else if (event.key === 'Escape') {
        close();
      } else if (event.key === 'Tab') {
        const exact = items.find(item => normalize(item.name) === normalize(input.value.trim()));
        if (!selectedId && exact) choose(exact);
        else close();
      }
    });
    input.addEventListener('blur', () => {
      if (!selectedId && input.value.trim()) {
        const exact = items.find(item => normalize(item.name) === normalize(input.value.trim()));
        if (exact) choose(exact);
        else input.setAttribute('aria-invalid', 'true');
      }
    });
    toggle.addEventListener('click', () => {
      if (list.hidden) { input.focus(); open(true); }
      else close();
    });
    list.addEventListener('click', event => choose(byId.get(event.target.closest('.teacher-option')?.dataset.id)));
    list.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        const option = event.target.closest('.teacher-option');
        if (option) { event.preventDefault(); choose(byId.get(option.dataset.id)); }
      }
    });
    clearButton.addEventListener('click', () => { const hadSelection = Boolean(selectedId); clear(); if (hadSelection) onChange(); input.focus(); open(true); });
    document.addEventListener('pointerdown', event => { if (!root.contains(event.target)) close(); });
    function syncLayout() {
      input.placeholder = desktopLayout.matches ? 'Buscar por nome ou atuação...' : 'Digite ou escolha um professor';
      input.value = selectedId && !desktopLayout.matches ? byId.get(selectedId).name : '';
      render(true);
      if (desktopLayout.matches) open(true);
      else close();
    }
    desktopLayout.addEventListener('change', syncLayout);
    render();
    syncLayout();
    return {getId: () => selectedId, clear, setId(id) { choose(byId.get(String(id))); }};
  }

  function loadRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(parsed)) return [];
      const result = [];
      for (const record of parsed) {
        const teacher = teachers.get(String(record.teacherId));
        const course = courses.get(String(record.courseId));
        const unitIds = [...new Set(Array.isArray(record.unitIds) ? record.unitIds : [record.unitId])]
          .filter(id => units.get(id)?.courseId === course?.id);
        const environmentIds = [...new Set(Array.isArray(record.environmentIds) ? record.environmentIds : [record.environmentId])]
          .map(String).filter(id => environments.has(id));
        const legacyLocation = environmentIds.length ? '' :
          (typeof record.location === 'string' ? record.location.trim() : '');
        if (!teacher || !course || teacher.type !== course.type || !unitIds.length ||
            (!environmentIds.length && !legacyLocation)) continue;

        const entry = {
          id: String(record.id), teacherId: teacher.id, courseId: course.id, unitIds,
          environmentIds, ...(legacyLocation ? {legacyLocation} : {}),
          coordinatorApproved: Boolean(record.coordinatorApproved),
          savedAt: record.savedAt, updatedAt: record.updatedAt
        };
        const previous = result.at(-1);
        const legacy = !Array.isArray(record.unitIds);
        const closeInTime = Math.abs(Date.parse(previous?.savedAt) - Date.parse(entry.savedAt)) <= 100;
        if (legacy && previous?._legacy && closeInTime &&
            previous.teacherId === entry.teacherId && previous.courseId === entry.courseId &&
            previous.environmentIds.join(',') === entry.environmentIds.join(',') &&
            previous.legacyLocation === entry.legacyLocation &&
            previous.coordinatorApproved === entry.coordinatorApproved) {
          for (const id of unitIds) if (!previous.unitIds.includes(id)) previous.unitIds.push(id);
        } else {
          entry._legacy = legacy;
          result.push(entry);
        }
      }
      return result.map(({_legacy, ...entry}) => entry);
    } catch {
      return [];
    }
  }

  function persistRecords() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(records));
      return true;
    } catch {
      return false;
    }
  }

  function populateCourses() {
    const teacher = selectedTeacher();
    courseSelect.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = !teacher ? 'Selecione primeiro um professor' : 'Selecione um curso';
    courseSelect.append(placeholder);
    courseSelect.disabled = !teacher;
    if (!courseSelect.disabled) {
      for (const course of data.courses.filter(item => item.type === teacher.type)) {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = `${course.type} · ${course.name}`;
        courseSelect.append(option);
      }
    }
  }

  function renderUnits() {
    const course = selectedCourse();
    const teacher = selectedTeacher();
    const eligible = teacher && course && teacher.type === course.type;
    unitSearch.disabled = !eligible;
    unitList.replaceChildren();

    if (!eligible) {
      unitList.className = 'unit-list empty';
      unitList.append(createElement('p', '', 'Selecione um curso para ver suas unidades curriculares.'));
      return;
    }

    const term = unitSearch.value.trim().toLocaleLowerCase('pt-BR');
    const visible = data.units.filter(unit => unit.courseId === course.id && unit.name.toLocaleLowerCase('pt-BR').includes(term));
    unitList.className = visible.length ? 'unit-list' : 'unit-list empty';
    if (!visible.length) {
      unitList.append(createElement('p', '', 'Nenhuma unidade curricular encontrada.'));
      return;
    }

    for (const unit of visible) {
      const label = createElement('label', 'unit-option');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = unit.id;
      checkbox.checked = selectedUnitIds.has(unit.id);
      checkbox.setAttribute('aria-label', unit.name);
      const copy = createElement('span', 'unit-copy');
      copy.append(
        createElement('span', 'unit-name', unit.name),
        createElement('span', 'unit-meta', `Semestre${unit.semesters.length > 1 ? 's' : ''} ${unit.semesters.join(' e ')} · ${unit.hours} h`)
      );
      label.append(checkbox, copy);
      unitList.append(label);
    }
  }

  function renderEnvironments() {
    const teacher = selectedTeacher();
    const course = selectedCourse();
    const eligible = teacher && course && teacher.type === course.type;
    locationSearch.disabled = !eligible;
    locationList.replaceChildren();
    if (!eligible) {
      locationList.className = 'unit-list empty';
      locationList.append(createElement('p', '', 'Selecione um curso para ver os ambientes.'));
      return;
    }

    const term = normalize(locationSearch.value.trim());
    const visible = data.environments.filter(environment => normalize(environment.name).includes(term));
    locationList.className = visible.length ? 'unit-list' : 'unit-list empty';
    if (!visible.length) {
      locationList.append(createElement('p', '', 'Nenhum ambiente encontrado.'));
      return;
    }
    for (const environment of visible) {
      const label = createElement('label', 'unit-option location-option');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = environment.id;
      checkbox.checked = selectedEnvironmentIds.has(String(environment.id));
      checkbox.setAttribute('aria-label', environment.name);
      const copy = createElement('span', 'unit-copy');
      copy.append(createElement('span', 'unit-name', environment.name), createElement('span', 'unit-meta', 'Ambiente de ensino'));
      label.append(checkbox, environmentIcon(environment.name), copy);
      locationList.append(label);
    }
  }

  function updateFormState() {
    const teacher = selectedTeacher();
    const course = selectedCourse();
    text($('selected-units-count'), `${selectedUnitIds.size} selecionada${selectedUnitIds.size === 1 ? '' : 's'}`);
    text($('selected-locations-count'), `${selectedEnvironmentIds.size} selecionado${selectedEnvironmentIds.size === 1 ? '' : 's'}`);
    const completed = Number(Boolean(teacher)) + Number(Boolean(course && selectedUnitIds.size)) + Number(Boolean(selectedEnvironmentIds.size));
    text($('step-progress'), `${completed} de 3 etapas`);
    [...document.querySelectorAll('.progress-bars i')].forEach((bar, index) => bar.classList.toggle('is-complete', index < completed));
    text($('teacher-panel-note'), teacher ? teacher.name : 'Nenhum professor selecionado');
    text($('course-panel-note'), course ? `${course.type} · ${course.name}` : 'Curso técnico ou CAI');
    text($('location-panel-note'), selectedEnvironmentIds.size ? `${selectedEnvironmentIds.size} ambiente${selectedEnvironmentIds.size === 1 ? '' : 's'} selecionado${selectedEnvironmentIds.size === 1 ? '' : 's'}` :
      course ? `${data.environments.length} ambientes de ensino disponíveis` : 'Selecione professor e curso para ver os ambientes');
    saveButton.disabled = !teacher || !course ||
      teacher.type !== course.type || selectedUnitIds.size === 0 || selectedEnvironmentIds.size === 0 ||
      (teacher.habilitado === 1 && !coordinatorApproval.checked);
  }

  function setMessage(value, success = false) {
    message.textContent = value;
    message.className = success ? 'form-message success' : 'form-message';
  }

  function addCell(record, label, value, detail) {
    const cell = createElement('div', 'record-cell');
    cell.append(createElement('small', '', label), createElement('strong', '', value));
    if (detail) cell.append(createElement('span', 'record-sub', detail));
    record.append(cell);
  }

  function formatDate(value) {
    if (!value) return 'Data não registrada';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Data não registrada' :
      new Intl.DateTimeFormat('pt-BR', {dateStyle: 'short', timeStyle: 'short'}).format(date);
  }

  function actionButton(label, action, id) {
    const button = createElement('button', `record-action ${action}-button`, label);
    button.type = 'button';
    button.dataset.action = action;
    button.dataset.id = id;
    return button;
  }

  function renderRecords() {
    const list = $('records');
    list.replaceChildren();
    text($('record-count'), records.length);
    text($('records-badge'), `${records.length} alocaç${records.length === 1 ? 'ão' : 'ões'}`);
    if (!records.length) {
      const empty = createElement('div', 'empty-records');
      const content = document.createElement('div');
      content.append(createElement('div', 'empty-icon', '+'), createElement('strong', '', 'Nenhuma alocação salva ainda'),
        createElement('p', '', 'Preencha o formulário acima e seus registros aparecerão aqui.'));
      empty.append(content);
      list.append(empty);
      return;
    }

    for (const [index, entry] of records.entries()) {
      const teacher = teachers.get(String(entry.teacherId));
      const course = courses.get(String(entry.courseId));
      const selectedUnits = entry.unitIds.map(id => units.get(id)).filter(Boolean);
      const locationNames = entry.environmentIds.map(id => environments.get(id)?.name).filter(Boolean);
      if (entry.legacyLocation) locationNames.push(entry.legacyLocation);
      const firstUnit = selectedUnits[0];
      const remaining = selectedUnits.length - 1;
      const row = createElement('article', 'record');
      const main = createElement('div', 'record-main');
      addCell(main, 'Professor', teacher.name,
        `${teacher.type} · ${teacher.habilitado === 0 ? 'Recomendado · apto para dar aula' : entry.coordinatorApproved ? 'Autorizado pela coordenação' : 'Definir pela Coordenação'}`);
      addCell(main, 'Curso', course.name, course.type);
      addCell(main, 'Unidades curriculares',
        `${selectedUnits.length} unidade${selectedUnits.length === 1 ? '' : 's'}`,
        `${firstUnit.name}${remaining ? ` + ${remaining} outra${remaining === 1 ? '' : 's'}` : ''}`);
      addCell(main, 'Locais', locationNames.length === 1 ? locationNames[0] : `${locationNames.length} locais`,
        locationNames.length > 1 ? `${locationNames[0]} + ${locationNames.length - 1} outro${locationNames.length === 2 ? '' : 's'}` : '');
      addCell(main, 'Salvo em', formatDate(entry.savedAt));
      row.append(main);

      const actions = createElement('div', 'record-actions');
      const detailsButton = actionButton('Ver detalhes', 'details', entry.id);
      const detailsId = `allocation-details-${index}`;
      detailsButton.setAttribute('aria-controls', detailsId);
      detailsButton.setAttribute('aria-expanded', 'false');
      const editButton = actionButton('Editar', 'edit', entry.id);
      const removeButton = actionButton('Remover', 'remove', entry.id);
      removeButton.setAttribute('aria-label', `Remover alocação de ${teacher.name}`);
      actions.append(detailsButton, editButton, removeButton);
      row.append(actions);

      const details = createElement('div', 'record-details');
      details.id = detailsId;
      details.hidden = true;
      details.append(createElement('h3', '', 'Todas as unidades curriculares'));
      const unitList = createElement('ul', 'record-unit-list');
      for (const unit of selectedUnits) {
        const item = createElement('li', 'record-unit');
        item.append(createElement('strong', '', unit.name),
          createElement('span', '', `${unit.hours} h · Semestre${unit.semesters.length > 1 ? 's' : ''} ${unit.semesters.join(' e ')}`));
        unitList.append(item);
      }
      details.append(unitList);
      details.append(createElement('h3', 'record-details-subtitle', 'Todos os locais de atuação'));
      const environmentList = createElement('ul', 'record-unit-list');
      for (const name of locationNames) {
        const item = createElement('li', 'record-unit');
        item.append(createElement('strong', '', name));
        environmentList.append(item);
      }
      details.append(environmentList);
      if (entry.updatedAt) details.append(createElement('p', 'record-updated', `Última edição: ${formatDate(entry.updatedAt)}`));
      row.append(details);
      list.append(row);
    }
  }

  function resetAfterTeacherChange() {
    const teacher = selectedTeacher();
    const recommendation = $('teacher-recommendation');
    recommendation.hidden = !teacher;
    recommendation.replaceChildren();
    if (teacher) {
      const recommended = teacher.habilitado === 0;
      recommendation.className = `teacher-recommendation ${recommended ? 'recommended' : 'coordination'}`;
      recommendation.append(
        createElement('strong', '', recommended ? 'Recomendado' : 'Definir pela Coordenação'),
        createElement('span', '', recommended ? 'Apto para dar aula' : 'A coordenação decide se pode atuar no local escolhido.')
      );
    }
    courseSelect.value = '';
    selectedUnitIds.clear();
    unitSearch.value = '';
    selectedEnvironmentIds.clear();
    locationSearch.value = '';
    coordinatorApproval.checked = false;
    decisionBox.hidden = teacher?.habilitado !== 1;
    populateCourses();
    renderUnits();
    renderEnvironments();
    setMessage('');
    updateFormState();
  }

  function resetForm() {
    editingRecordId = null;
    teacherCombo.clear();
    resetAfterTeacherChange();
    text($('form-kicker'), 'NOVA ALOCAÇÃO');
    text($('form-title'), 'Nova alocação');
    text($('save-button-label'), 'Salvar alocação');
    $('cancel-edit-button').hidden = true;
  }

  function startEditing(entry) {
    editingRecordId = entry.id;
    teacherCombo.clear();
    teacherCombo.setId(entry.teacherId);
    courseSelect.value = String(entry.courseId);
    selectedUnitIds.clear();
    entry.unitIds.forEach(id => selectedUnitIds.add(id));
    renderUnits();
    selectedEnvironmentIds.clear();
    entry.environmentIds.forEach(id => selectedEnvironmentIds.add(id));
    renderEnvironments();
    coordinatorApproval.checked = Boolean(entry.coordinatorApproved);
    text($('form-kicker'), 'EDITAR ALOCAÇÃO');
    text($('form-title'), 'Editar alocação');
    text($('save-button-label'), 'Salvar alterações');
    $('cancel-edit-button').hidden = false;
    setMessage(selectedEnvironmentIds.size ? '' : 'Escolha um ambiente para concluir a edição desta alocação.');
    updateFormState();
    $('allocation-form').scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  $('cancel-edit-button').addEventListener('click', () => {
    resetForm();
    setMessage('Edição cancelada.');
  });
  $('clear-form-button').addEventListener('click', () => {
    document.documentElement.classList.add('modal-open');
    clearDialog.showModal();
    $('clear-no').focus();
  });

  function closeClearDialog() {
    if (clearDialog.open) clearDialog.close();
    document.documentElement.classList.remove('modal-open');
    $('clear-form-button').focus({preventScroll: true});
  }

  $('clear-no').addEventListener('click', closeClearDialog);
  clearDialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeClearDialog();
  });
  $('clear-yes').addEventListener('click', () => {
    resetForm();
    closeClearDialog();
    setMessage('Formulário limpo. As alocações salvas foram mantidas.', true);
  });

  courseSelect.addEventListener('change', () => {
    selectedUnitIds.clear();
    unitSearch.value = '';
    selectedEnvironmentIds.clear();
    locationSearch.value = '';
    coordinatorApproval.checked = false;
    renderUnits();
    renderEnvironments();
    setMessage('');
    updateFormState();
  });

  unitSearch.addEventListener('input', renderUnits);
  unitList.addEventListener('change', event => {
    if (event.target.type !== 'checkbox') return;
    if (event.target.checked) selectedUnitIds.add(event.target.value);
    else selectedUnitIds.delete(event.target.value);
    setMessage('');
    updateFormState();
  });
  locationSearch.addEventListener('input', renderEnvironments);
  locationList.addEventListener('change', event => {
    if (event.target.type !== 'checkbox') return;
    if (event.target.checked) selectedEnvironmentIds.add(event.target.value);
    else selectedEnvironmentIds.delete(event.target.value);
    coordinatorApproval.checked = false;
    setMessage('');
    updateFormState();
  });
  coordinatorApproval.addEventListener('change', () => { setMessage(''); updateFormState(); });

  $('allocation-form').addEventListener('submit', event => {
    event.preventDefault();
    const teacher = selectedTeacher();
    const course = selectedCourse();
    if (!teacher || !course || teacher.type !== course.type || !selectedEnvironmentIds.size || !selectedUnitIds.size ||
        (teacher.habilitado === 1 && !coordinatorApproval.checked)) {
      setMessage('Selecione professor, curso, unidade e ao menos um ambiente; confirme a decisão da coordenação quando solicitada.');
      return;
    }
    const validIds = [...selectedUnitIds].filter(id => units.get(id)?.courseId === course.id);
    const validEnvironmentIds = [...selectedEnvironmentIds].filter(id => environments.has(id));
    const duplicate = validIds.some(unitId => validEnvironmentIds.some(environmentId => records.some(entry =>
      entry.id !== editingRecordId && String(entry.teacherId) === String(teacher.id) &&
      entry.unitIds.includes(unitId) &&
      (entry.environmentIds.includes(environmentId) ||
        (entry.legacyLocation && normalize(entry.legacyLocation) === normalize(environments.get(environmentId).name))))));
    if (!validIds.length || !validEnvironmentIds.length || duplicate) {
      setMessage(duplicate ? 'Uma das unidades já está alocada a este professor em um dos locais escolhidos.' :
        'Selecione ao menos uma unidade curricular e um ambiente válidos.');
      return;
    }
    const previous = records;
    const original = editingRecordId ? records.find(entry => entry.id === editingRecordId) : null;
    const now = new Date().toISOString();
    const allocation = {
      id: original?.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      teacherId: teacher.id,
      courseId: course.id,
      unitIds: validIds,
      environmentIds: validEnvironmentIds,
      coordinatorApproved: teacher.habilitado === 1,
      savedAt: original?.savedAt || now,
      ...(original ? {updatedAt: now} : {})
    };
    records = original ? records.map(entry => entry.id === original.id ? allocation : entry) : [allocation, ...records];
    if (!persistRecords()) {
      records = previous;
      setMessage('Não foi possível salvar neste navegador. Verifique o armazenamento local.');
      return;
    }
    resetForm();
    renderRecords();
    setMessage(original ? 'Alocação atualizada com sucesso.' : 'Alocação salva com sucesso.', true);
  });

  $('records').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const entry = records.find(item => item.id === button.dataset.id);
    if (!entry) return;
    if (button.dataset.action === 'details') {
      const details = document.getElementById(button.getAttribute('aria-controls'));
      details.hidden = !details.hidden;
      button.setAttribute('aria-expanded', String(!details.hidden));
      text(button, details.hidden ? 'Ver detalhes' : 'Ocultar detalhes');
      return;
    }
    if (button.dataset.action === 'edit') {
      startEditing(entry);
      return;
    }
    if (button.dataset.action !== 'remove' || removeDialog.open) return;
    pendingRemovalId = entry.id;
    removalTrigger = button;
    text($('remove-teacher-name'), teachers.get(String(entry.teacherId)).name);
    document.documentElement.classList.add('modal-open');
    removeDialog.showModal();
    $('remove-no').focus();
  });

  function closeRemovalDialog(restoreFocus = true) {
    if (removeDialog.open) removeDialog.close();
    document.documentElement.classList.remove('modal-open');
    pendingRemovalId = null;
    if (restoreFocus && removalTrigger?.isConnected) removalTrigger.focus({preventScroll: true});
    removalTrigger = null;
  }

  $('remove-no').addEventListener('click', () => closeRemovalDialog());
  removeDialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeRemovalDialog();
  });
  $('remove-yes').addEventListener('click', () => {
    const entry = records.find(item => item.id === pendingRemovalId);
    if (!entry) { closeRemovalDialog(); return; }
    const previous = records;
    records = records.filter(item => item.id !== entry.id);
    if (!persistRecords()) {
      records = previous;
      closeRemovalDialog();
      setMessage('Não foi possível remover o registro neste navegador.');
      return;
    }
    if (editingRecordId === entry.id) resetForm();
    closeRemovalDialog(false);
    renderRecords();
    setMessage('Alocação removida.', true);
    $('records-title').focus({preventScroll: true});
  });

  teacherCombo = createTeacherPicker({
    inputId: 'teacher-input', toggleId: 'teacher-toggle', clearId: 'teacher-clear',
    optionsId: 'teacher-options',
    items: [...data.teachers].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    onChange: resetAfterTeacherChange
  });
  text($('teacher-count'), data.teachers.length);
  text($('course-count'), data.courses.length);
  populateCourses();
  renderUnits();
  renderEnvironments();
  renderRecords();
  updateFormState();
})();
