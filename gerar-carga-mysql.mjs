import {readFileSync, writeFileSync} from 'node:fs';

const sqlPath = new URL('./mysql.sql', import.meta.url);
const dataPath = new URL('./data.js', import.meta.url);
const marker = '-- BEGIN CARGA GERADA';
const sql = readFileSync(sqlPath, 'utf8');
const markerIndex = sql.indexOf(marker);
if (markerIndex < 0) throw new Error('Marcador da carga inicial não encontrado em mysql.sql');

const source = readFileSync(dataPath, 'utf8');
const json = source.replace(/^\s*window\.SIPAE_DATA\s*=\s*/, '').replace(/;\s*$/, '');
const data = JSON.parse(json);
const quote = value => `'${String(value).replaceAll('\\', '\\\\').replaceAll("'", "''")}'`;

function insert(table, columns, rows) {
  const batches = [];
  for (let start = 0; start < rows.length; start += 100) {
    const batch = rows.slice(start, start + 100);
    batches.push(`INSERT IGNORE INTO ${table} (${columns.join(', ')}) VALUES\n` +
      batch.map(row => `  (${row.join(', ')})`).join(',\n') + ';');
  }
  return batches.join('\n\n');
}

const sections = [
  insert('curso', ['id_curso', 'tipo', 'titulo'],
    data.courses.map(item => [item.id, quote(item.type), quote(item.name)])),
  insert('professor', ['id_professor', 'nome', 'atuacao', 'habilitado'],
    data.teachers.map(item => [item.id, quote(item.name), quote(item.type), item.habilitado])),
  insert('ambiente', ['id_ambiente', 'identificacao'],
    data.environments.map(item => [item.id, quote(item.name)])),
  insert('unidade_curricular', ['id_unidade', 'id_curso', 'nome', 'semestres', 'carga_horaria'],
    data.units.map(item => [quote(item.id), item.courseId, quote(item.name),
      quote(JSON.stringify(item.semesters)), item.hours]))
];

writeFileSync(sqlPath, sql.slice(0, markerIndex + marker.length) + '\n\n' +
  sections.join('\n\n') + '\n', 'utf8');
console.log(`mysql.sql atualizado: ${data.courses.length} cursos, ${data.teachers.length} professores, ` +
  `${data.environments.length} ambientes e ${data.units.length} unidades curriculares.`);
