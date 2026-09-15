(function () {
  "use strict";
  const { U, M, data } = SIPAE,
    { esc, number, pct, empty } = U;
  function legend(series) {
    return (
      '<div class="legend">' +
      series
        .map(
          (s) =>
            '<span><i style="background:' +
            s.color +
            '"></i>' +
            esc(s.name) +
            "</span>",
        )
        .join("") +
      "</div>"
    );
  }
  function lineChart(
    labels,
    series,
    {
      percent = true,
      height = 235,
      title = "Evolução no período",
      holidays = false,
    } = {},
  ) {
    if (!labels.length || !series.length) return empty();
    const w = 570,
      h = height,
      pad = { left: 37, right: 22, top: 25, bottom: 35 };
    const cw = w - pad.left - pad.right,
      ch = h - pad.top - pad.bottom;
    const maximum = Math.max(...series.flatMap((s) => s.values), 0);
    const max = percent
      ? Math.max(10, Math.ceil(maximum / 10) * 10)
      : Math.max(2, Math.ceil(maximum));
    const x = (i) =>
        pad.left +
        (labels.length === 1 ? cw / 2 : (i * cw) / (labels.length - 1)),
      y = (v) => pad.top + ch - (v / max) * ch;
    let svg =
      '<svg class="chart" viewBox="0 0 ' +
      w +
      " " +
      h +
      '" role="img" aria-label="' +
      esc(title) +
      '"><title>' +
      esc(
        title +
          ". " +
          series
            .map(
              (s) =>
                s.name +
                ": " +
                s.values
                  .map(
                    (v, i) =>
                      labels[i] +
                      " " +
                      number(v, percent ? 1 : 0) +
                      (percent ? "%" : ""),
                  )
                  .join(", "),
            )
            .join("; "),
      ) +
      "</title>";
    if (holidays && labels.includes("Jul")) {
      const i = labels.indexOf("Jul");
      svg +=
        '<rect x="' +
        (x(i) - 22) +
        '" y="14" width="44" height="' +
        (ch + 18) +
        '" rx="5" fill="#f6f5f2"/><text x="' +
        x(i) +
        '" y="18" text-anchor="middle" style="font-size:9px;fill:#b2a797">Férias</text>';
    }
    const ticks = percent ? 4 : Math.min(4, max);
    for (let i = 0; i <= ticks; i++) {
      const value = (max * i) / ticks;
      svg +=
        '<line class="gridline" x1="' +
        pad.left +
        '" x2="' +
        (w - pad.right) +
        '" y1="' +
        y(value) +
        '" y2="' +
        y(value) +
        '"/><text x="' +
        (pad.left - 10) +
        '" y="' +
        (y(value) + 4) +
        '" text-anchor="end">' +
        number(value, value % 1 ? 1 : 0) +
        (percent ? "%" : "") +
        "</text>";
    }
    labels.forEach((label, i) => {
      if (
        labels.length <= 10 ||
        i % Math.ceil(labels.length / 8) === 0 ||
        i === labels.length - 1
      )
        svg +=
          '<text x="' +
          x(i) +
          '" y="' +
          (h - 9) +
          '" text-anchor="middle">' +
          esc(label) +
          "</text>";
    });
    series.forEach((s) => {
      const coordinates = s.values.map((v, i) => x(i) + "," + y(v));
      if (series.length === 1 && labels.length > 1)
        svg +=
          '<path d="M' +
          x(0) +
          " " +
          (pad.top + ch) +
          " L" +
          coordinates.join(" L") +
          " L" +
          x(labels.length - 1) +
          " " +
          (pad.top + ch) +
          ' Z" fill="' +
          s.color +
          '" opacity=".055"/>';
      svg +=
        '<polyline class="line" stroke="' +
        s.color +
        '" points="' +
        coordinates.join(" ") +
        '"/>';
      s.values.forEach((v, i) => {
        svg +=
          '<circle class="point" cx="' +
          x(i) +
          '" cy="' +
          y(v) +
          '" r="' +
          (i === s.values.length - 1 ? 4.5 : 3.7) +
          '" fill="' +
          s.color +
          '"><title>' +
          esc(
            s.name +
              " · " +
              labels[i] +
              ": " +
              number(v, percent ? 1 : 0) +
              (percent ? "%" : ""),
          ) +
          "</title></circle>";
        if (series.length === 1)
          svg +=
            '<text class="value" x="' +
            x(i) +
            '" y="' +
            (y(v) - 12) +
            '" text-anchor="middle">' +
            number(v, percent ? 1 : 0) +
            (percent ? "%" : "") +
            "</text>";
      });
    });
    return svg + "</svg>" + (series.length > 1 ? legend(series) : "");
  }
  function donut(rows, label = "aulas", title = "Aulas por turno") {
    const total = M.sum(rows, (r) => r.value);
    if (!total) return empty("Nenhuma aula no período");
    let offset = 0;
    const radius = 51,
      circ = 2 * Math.PI * radius;
    const svg = rows
      .map((row) => {
        const segment = (row.value / total) * circ;
        const str =
          '<circle cx="75" cy="75" r="' +
          radius +
          '" fill="none" stroke="' +
          row.color +
          '" stroke-width="16" stroke-dasharray="' +
          segment +
          " " +
          (circ - segment) +
          '" stroke-dashoffset="' +
          -offset +
          '" transform="rotate(-90 75 75)"><title>' +
          esc(
            row.name +
              ": " +
              row.value +
              " (" +
              pct((row.value / total) * 100) +
              ")",
          ) +
          "</title></circle>";
        offset += segment;
        return str;
      })
      .join("");
    return (
      '<div class="donut-layout"><svg class="donut" viewBox="0 0 150 150" role="img" aria-label="' + esc(title) + '"><circle cx="75" cy="75" r="51" stroke="#f3f5f8" stroke-width="16" fill="none"/>' +
      svg +
      '<text x="75" y="74" text-anchor="middle" style="font-size:26px;fill:#55677f;font-weight:600">' +
      number(total) +
      '</text><text x="75" y="93" text-anchor="middle" style="font-size:10px;fill:#9aa4b2">' + esc(label) + '</text></svg><div class="donut-list">' +
      rows
        .map(
          (r) =>
            '<div><i style="background:' +
            r.color +
            '"></i><span>' +
            esc(r.name) +
            "</span><strong>" +
            number(r.value) +
            "</strong></div>",
        )
        .join("") +
      "</div></div>"
    );
  }
  function heatmap(f) {
    const rows = M.peak(data, f);
    const colors = ["#f0f3f8", "#dce5f0", "#b9cbe1", "#8da8cb", "#6587b4"];
    const hasData = M.allocations(data, f).length;
    let html =
      '<div class="heatmap"><div></div>' +
      data.days.map((d) => '<div class="heat-label">' + d + "</div>").join("");
    data.shifts.forEach((s) => {
      html += '<div class="heat-label">' + s.name + "</div>";
      for (let day = 0; day < 5; day++) {
        const r = rows.find((r) => r.day === day && r.shift === s.id);
        const excluded = f.shift && f.shift !== "todos" && f.shift !== s.id;
        const color = colors[Math.min(4, Math.floor(r.value / 12))];
        html +=
          '<div class="heat-cell" style="background:' +
          (excluded ? "#f6f7f9" : color) +
          ";color:" +
          (r.value >= 36 && !excluded ? "white" : "#6f829c") +
          '" title="' +
          esc(
            data.days[day] +
              " · " +
              s.name +
              ": " +
              (excluded
                ? "fora do filtro"
                : U.hours(r.used) + " de " + U.hours(r.available)),
          ) +
          '">' +
          (excluded ? "—" : pct(r.value, 0)) +
          "</div>";
      }
    });
    html +=
      '</div><div class="heatmap-key"><span>Menor uso</span>' +
      colors.map((c) => '<i style="background:' + c + '"></i>').join("") +
      "<span>Maior uso</span></div>";
    return hasData ? html : empty();
  }
  function blockStats(f = {}) {
    const filter = { ...f };
    delete filter.area;
    const rooms = M.roomStats(data, filter), items = M.allocations(data, filter);
    const names = [...new Set(data.rooms.map((r) => r.block))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return names.map((block, index) => {
      const selected = rooms.filter((r) => r.block === block), ids = new Set(selected.map((r) => r.id));
      const lessons = items.filter((a) => ids.has(a.roomId)),
        used = M.sum(selected, (r) => r.used), available = M.sum(selected, (r) => r.available);
      return { id: block, name: "Bloco " + block, color: ["#6686b5", "#769887", "#a48cba", "#b59362"][index % 4],
        used, available, occupancy: M.ratio(used, available), hours: M.sum(lessons, (a) => a.end - a.start),
        bookings: lessons.length, teachers: new Set(lessons.map((a) => a.teacherId)).size };
    });
  }
  function stacked(f) {
    const blocks = blockStats(f);
    return blocks.map((block) => {
      const values = data.shifts.map((s) => ({ id: s.id, name: s.name,
        color: { manha: "#c3cedd", tarde: "#95a9c3", noite: "#627fa7" }[s.id],
        hours: f.shift && f.shift !== "todos" && f.shift !== s.id ? 0 : blockStats({ ...f, shift: s.id }).find((b) => b.id === block.id).hours,
      }));
      const total = M.sum(values, (v) => v.hours);
      return '<div class="stacked-row"><div class="stacked-label"><span>' + esc(block.name) + '</span><span>' + U.hours(total) +
        '</span></div><div class="stacked-bar" role="group" aria-label="' + esc(block.name + ": " + values.map((v) => v.name + " " + U.hours(v.hours)).join(", ")) + '">' +
        values.map((v) => '<span' + (v.hours ? ' role="button" tabindex="0" data-report-kind="shift" data-report-metric="lessons" data-report-value="' + esc(v.id) +
          '" data-report-block="' + esc(block.id) + '" aria-label="Ver aulas de ' + esc(block.name + " · " + v.name) + '"' : '') +
          ' style="width:' + M.ratio(v.hours, total) + '%;background:' + v.color + '" title="' + esc(v.name + ": " + U.hours(v.hours)) + '">' +
          (v.hours && M.ratio(v.hours, total) > 15 ? number(v.hours) + " h" : "") + '</span>').join("") +
        '</div><div class="report-turn-buttons">' + values.map((v) => '<button type="button" data-report-kind="shift" data-report-metric="lessons" data-report-value="' + esc(v.id) +
          '" data-report-block="' + esc(block.id) + '" aria-label="Ver aulas de ' + esc(block.name + " · " + v.name) + '">' + esc(v.name) + ' · ' + U.hours(v.hours) + '</button>').join("") + '</div></div>';
    }).join("") + legend([{ name: "Manhã", color: "#c3cedd" }, { name: "Tarde", color: "#95a9c3" }, { name: "Noite", color: "#627fa7" }]);
  }
  function scatter(f) {
    const cap = M.capacity(data, f),
      unique = [];
    const seen = new Set();
    for (const a of [...cap.rows, ...cap.problems]) {
      const key = a.room.id + "|" + a.cls.id;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(a);
    }
    if (!unique.length) return empty();
    const width = 560,
      height = 225,
      left = 39,
      right = 22,
      top = 18,
      bottom = 37,
      maxX = 130,
      maxY = 45;
    const x = (v) => left + (v / maxX) * (width - left - right),
      y = (v) => height - bottom - (v / maxY) * (height - top - bottom);
    let svg =
      '<svg class="chart" viewBox="0 0 ' +
      width +
      " " +
      height +
      '" role="img" aria-label="Alunos da turma versus capacidade do ambiente"><title>Alunos versus capacidade. Vermelho indica uma proposta com superlotação; pontos claros indicam capacidade abaixo de 50%.</title>';
    for (const value of [0, 10, 20, 30, 40])
      svg +=
        '<line class="gridline" x1="' +
        left +
        '" x2="' +
        (width - right) +
        '" y1="' +
        y(value) +
        '" y2="' +
        y(value) +
        '"/><text x="' +
        (left - 9) +
        '" y="' +
        (y(value) + 4) +
        '" text-anchor="end">' +
        value +
        "</text>";
    for (const value of [20, 40, 60, 80, 100, 120])
      svg +=
        '<text x="' +
        x(value) +
        '" y="' +
        (height - 16) +
        '" text-anchor="middle">' +
        value +
        "</text>";
    svg +=
      '<path d="M' +
      x(0) +
      " " +
      y(0) +
      " L" +
      x(45) +
      " " +
      y(45) +
      '" fill="none" stroke="#d2d9e3" stroke-dasharray="4 4"/><text x="' +
      x(42) +
      '" y="' +
      (y(42) - 7) +
      '" style="font-size:9px">Capacidade máxima</text>';
    for (const a of unique) {
      svg +=
        '<circle cx="' +
        x(a.room.capacity) +
        '" cy="' +
        y(a.cls.students) +
        '" r="' +
        (a.proposal ? 6 : 5) +
        '" fill="' +
        (a.fill > 100 ? "#ca6475" : a.fill < 50 ? "#b4c1d4" : "#7b93b4") +
        '" stroke="white" stroke-width="1.5" opacity=".9"><title>' +
        esc(
          a.room.name +
            " · " +
            a.cls.code +
            ": " +
            a.cls.students +
            " alunos / " +
            a.room.capacity +
            " lugares" +
            (a.proposal ? " · proposta em conflito" : ""),
        ) +
        "</title></circle>";
    }
    return (
      svg +
      '</svg><p class="chart-caption">Eixo vertical: alunos · eixo horizontal: lugares disponíveis</p>' +
      legend([
        { name: "Uso adequado", color: "#7b93b4" },
        { name: "Abaixo de 50%", color: "#b4c1d4" },
        { name: "Proposta excedente", color: "#ca6475" },
      ])
    );
  }
  /* Gráfico de colunas: mesma grade e tipografia do gráfico de linhas. */
  function columnChart(
    labels,
    values,
    {
      percent = true,
      height = 258,
      title = "Comparativo no período",
      color = "#7b95b7",
      width: chartWidth = 570,
    } = {},
  ) {
    if (!labels.length || !values.length) return empty();
    const w = chartWidth,
      h = height,
      pad = { left: 37, right: 22, top: 25, bottom: 35 };
    const cw = w - pad.left - pad.right,
      ch = h - pad.top - pad.bottom;
    const maximum = Math.max(...values, 0);
    const max = percent
      ? Math.max(10, Math.ceil(maximum / 10) * 10)
      : Math.max(2, Math.ceil(maximum));
    const step = cw / labels.length,
      width = Math.min(46, Math.max(9, step * 0.58)),
      digits = labels.length > 8 ? 0 : 1;
    const x = (i) => pad.left + step * i + step / 2,
      y = (v) => pad.top + ch - (v / max) * ch;
    let svg =
      '<svg class="chart" viewBox="0 0 ' +
      w +
      " " +
      h +
      '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' +
      esc(title) +
      '"><title>' +
      esc(
        title +
          ". " +
          labels
            .map(
              (label, i) =>
                label +
                ": " +
                number(values[i], percent ? 1 : 0) +
                (percent ? "%" : ""),
            )
            .join(", "),
      ) +
      "</title>";
    const ticks = percent ? 4 : Math.min(4, max);
    for (let i = 0; i <= ticks; i++) {
      const value = (max * i) / ticks;
      svg +=
        '<line class="gridline" x1="' +
        pad.left +
        '" x2="' +
        (w - pad.right) +
        '" y1="' +
        y(value) +
        '" y2="' +
        y(value) +
        '"/><text x="' +
        (pad.left - 10) +
        '" y="' +
        (y(value) + 4) +
        '" text-anchor="end">' +
        number(value, value % 1 ? 1 : 0) +
        (percent ? "%" : "") +
        "</text>";
    }
    labels.forEach((label, i) => {
      const value = values[i],
        top = y(value),
        size = Math.max(0, pad.top + ch - top);
      svg +=
        '<rect class="column" x="' +
        (x(i) - width / 2) +
        '" y="' +
        top +
        '" width="' +
        width +
        '" height="' +
        size +
        '" rx="4" fill="' +
        color +
        '"><title>' +
        esc(
          label +
            ": " +
            number(value, percent ? 1 : 0) +
            (percent ? "%" : ""),
        ) +
        "</title></rect>" +
        '<text class="value" x="' +
        x(i) +
        '" y="' +
        (top - 8) +
        '" text-anchor="middle">' +
        number(value, percent ? digits : 0) +
        (percent ? "%" : "") +
        '</text><text x="' +
        x(i) +
        '" y="' +
        (h - 9) +
        '" text-anchor="middle">' +
        esc(label) +
        "</text>";
    });
    return svg + "</svg>";
  }
  function responsiveColumnChart(labels, values, options = {}) {
    return '<div class="responsive-column-chart" data-column-chart="' +
      esc(JSON.stringify({ labels, values, options })) + '">' +
      columnChart(labels, values, options) + '</div>';
  }
  let columnObserver;
  function resizeColumnCharts() {
    columnObserver?.disconnect();
    if (typeof ResizeObserver === "undefined") return;
    columnObserver = new ResizeObserver((entries) => {
      for (const { target, contentRect } of entries) {
        if (!target.isConnected || !contentRect.width || !contentRect.height) continue;
        const { labels, values, options } = JSON.parse(target.dataset.columnChart);
        target.innerHTML = columnChart(labels, values, {
          ...options,
          width: contentRect.width,
          height: contentRect.height,
        });
      }
    });
    document.querySelectorAll("[data-column-chart]").forEach((el) => columnObserver.observe(el));
  }
  Object.assign(U, { legend, lineChart, columnChart, responsiveColumnChart, resizeColumnCharts, donut, heatmap, stacked, scatter, blockStats });
})();
