/*
 * Charts for section 2 ("AI adoption in European enterprises").
 *
 * Data: Eurostat, isoc_eb_ai, prepared by scripts/prepare_data.py into
 *   data/ai_adoption.csv   (share of enterprises using AI, per country/size/year)
 *   data/ai_intensity.csv  (EU, latest year, enterprises by number of AI technologies)
 *
 * Every chart has its own function (drawBarChart, drawGroupedBarChart, ...).
 * Each function empties its container and draws an SVG whose width equals
 * the container width, so text stays readable on phones. The SVG also gets
 * a viewBox, so it scales smoothly; on window resize all charts are redrawn.
 */

// ---------------------------------------------------------------------------
// Shared settings
// ---------------------------------------------------------------------------

const COLORS = {
  main: "#002677", // header blue: default colour for marks
  accent: "#199bfc", // highlight (e.g. the EU average)
  grey: "#dfe4ec", // "no AI" / empty squares
};

// Size classes are ordered (small < medium < large), so they get three steps
// of one blue hue: light = small, dark = large. Checked for colour-blind safety.
const SIZE_COLORS = {
  "10-49": "#7db9ee",
  "50-249": "#2b78d0",
  GE250: "#002677",
};

const SIZE_NAMES = {
  "10-49": "Small (10–49 employees)",
  "50-249": "Medium (50–249)",
  GE250: "Large (250+)",
  GE10: "All enterprises (10+)",
};

// Countries for the charts that only have room for a few categories.
const SELECTED = ["EU27_2020", "DK", "NL", "DE", "FR", "IT", "ES", "PL", "RO"];

const EU = "EU27_2020";

// Format a number as a percentage with one decimal, e.g. 19.95 -> "20.0%"
const pct = (v) => d3.format(".1f")(v) + "%";

// Text for Eurostat flags shown in the tooltip
const FLAG_TEXT = { b: "break in time series" };

// ---------------------------------------------------------------------------
// Tooltip helpers (one tooltip <div> in index.html is shared by all charts)
// ---------------------------------------------------------------------------

const tooltip = d3.select("#tooltip");

function showTooltip(event, html) {
  tooltip.html(html).classed("visible", true);
  moveTooltip(event);
}

function moveTooltip(event) {
  // Place the tooltip next to the mouse, but keep it inside the window.
  const box = tooltip.node().getBoundingClientRect();
  let x = event.pageX + 14;
  if (x + box.width > window.scrollX + window.innerWidth - 10) {
    x = event.pageX - box.width - 14;
  }
  tooltip.style("left", x + "px").style("top", event.pageY - box.height - 10 + "px");
}

function hideTooltip() {
  tooltip.classed("visible", false);
}

// Adds hover/tap behaviour to a d3 selection. `htmlFor(d)` returns the text.
function addTooltip(selection, htmlFor) {
  selection
    .on("pointerenter", (event, d) => showTooltip(event, htmlFor(d)))
    .on("pointermove", moveTooltip)
    .on("pointerleave", hideTooltip);
}

function flagNote(d) {
  return d.flag ? `<br><span class="muted">Eurostat flag: ${FLAG_TEXT[d.flag] || d.flag}</span>` : "";
}

// ---------------------------------------------------------------------------
// Small helpers for repeated chart parts
// ---------------------------------------------------------------------------

// Creates an empty SVG in the container and returns it with its width.
function createSvg(containerId, height) {
  const container = d3.select(containerId);
  container.selectAll("*").remove();
  const width = container.node().clientWidth;
  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("aria-hidden", "true"); // the container already has role="img" + aria-label
  return { container, svg, width };
}

// HTML legend: items = [{ label, color, dot? }]
function addLegend(container, items) {
  const legend = container.insert("div", ":first-child").attr("class", "legend");
  items.forEach((item) => {
    const el = legend.append("span").attr("class", "legend-item");
    el.append("span")
      .attr("class", "legend-swatch" + (item.dot ? " dot" : ""))
      .style("background-color", item.color);
    el.append("span").text(item.label);
  });
}

// Horizontal percentage axis at the top plus light vertical grid lines.
function addPercentAxis(g, x, innerHeight, label) {
  const ticks = x.ticks(Math.max(2, Math.floor(x.range()[1] / 80)));

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisBottom(x).tickValues(ticks).tickSize(innerHeight).tickFormat(""));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisTop(x).tickValues(ticks).tickFormat((d) => d + "%"));

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", x.range()[1])
    .attr("y", -28)
    .attr("text-anchor", "end")
    .text(label);
}

// Margin on the left: wider on desktop, narrower on phones.
function leftMargin(width) {
  return width < 500 ? 85 : 110;
}

// ---------------------------------------------------------------------------
// Chart 1: bar chart - AI use per country, latest year, sorted
// ---------------------------------------------------------------------------

function drawBarChart(adoption, year) {
  const data = adoption
    .filter((d) => d.size === "GE10" && d.year === year)
    .sort((a, b) => b.value - a.value);

  const barHeight = 18;
  const gap = 4;
  const margin = { top: 45, right: 50, bottom: 10 };
  const innerHeight = data.length * (barHeight + gap);
  const height = innerHeight + margin.top + margin.bottom;

  const { svg, width } = createSvg("#chart-bar", height);
  margin.left = leftMargin(width);
  const innerWidth = width - margin.left - margin.right;

  const x = d3.scaleLinear().domain([0, 50]).range([0, innerWidth]);
  const y = d3
    .scaleBand()
    .domain(data.map((d) => d.country))
    .range([0, innerHeight])
    .paddingInner(gap / (barHeight + gap));

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  addPercentAxis(g, x, innerHeight, "% of enterprises using AI");

  // Country names on the left (EU in bold)
  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0).tickPadding(8))
    .call((axis) => axis.select(".domain").remove())
    .selectAll("text")
    .style("font-weight", (name) => (name === "EU-27" ? 700 : 400));

  // Bars: EU average in the accent colour, all countries in the main colour
  const bars = g
    .selectAll("rect.bar")
    .data(data)
    .join("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", (d) => y(d.country))
    .attr("width", (d) => x(d.value))
    .attr("height", y.bandwidth())
    .attr("rx", 2)
    .attr("fill", (d) => (d.geo === EU ? COLORS.accent : COLORS.main));

  addTooltip(bars, (d) => `<strong>${d.country}</strong><br>${pct(d.value)} of enterprises use AI (${d.year})${flagNote(d)}`);

  // Value label at the end of each bar
  g.selectAll("text.value-label")
    .data(data)
    .join("text")
    .attr("class", "value-label")
    .attr("x", (d) => x(d.value) + 4)
    .attr("y", (d) => y(d.country) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .text((d) => d3.format(".0f")(d.value) + "%");
}

// ---------------------------------------------------------------------------
// Chart 2: grouped bar chart - AI use by size class for selected countries
// ---------------------------------------------------------------------------

function drawGroupedBarChart(adoption, year) {
  const sizes = ["10-49", "50-249", "GE250"];

  // Countries in the order of SELECTED; EU first
  const countries = SELECTED.map((geo) => adoption.find((d) => d.geo === geo).country);
  const data = adoption.filter((d) => SELECTED.includes(d.geo) && sizes.includes(d.size) && d.year === year);

  const groupHeight = 3 * 14 + 16; // three bars + space between countries
  const margin = { top: 45, right: 50, bottom: 10 };
  const innerHeight = countries.length * groupHeight;
  const height = innerHeight + margin.top + margin.bottom;

  const { container, svg, width } = createSvg("#chart-grouped", height);
  margin.left = leftMargin(width);
  const innerWidth = width - margin.left - margin.right;

  addLegend(
    container,
    sizes.map((s) => ({ label: SIZE_NAMES[s], color: SIZE_COLORS[s] }))
  );

  const x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
  const y = d3.scaleBand().domain(countries).range([0, innerHeight]).paddingInner(0.25);
  // Inner scale: position of each size class inside a country group
  const ySize = d3.scaleBand().domain(sizes).range([0, y.bandwidth()]).paddingInner(0.12);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  addPercentAxis(g, x, innerHeight, "% of enterprises using AI");

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0).tickPadding(8))
    .call((axis) => axis.select(".domain").remove())
    .selectAll("text")
    .style("font-weight", (name) => (name === "EU-27" ? 700 : 400));

  const bars = g
    .selectAll("rect.bar")
    .data(data)
    .join("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", (d) => y(d.country) + ySize(d.size))
    .attr("width", (d) => x(d.value))
    .attr("height", ySize.bandwidth())
    .attr("rx", 2)
    .attr("fill", (d) => SIZE_COLORS[d.size]);

  addTooltip(bars, (d) => `<strong>${d.country}</strong>, ${SIZE_NAMES[d.size]}<br>${pct(d.value)} use AI (${d.year})${flagNote(d)}`);

  // Value labels only for the large enterprises, to keep the chart calm
  g.selectAll("text.value-label")
    .data(data.filter((d) => d.size === "GE250"))
    .join("text")
    .attr("class", "value-label")
    .attr("x", (d) => x(d.value) + 4)
    .attr("y", (d) => y(d.country) + ySize(d.size) + ySize.bandwidth() / 2)
    .attr("dy", "0.35em")
    .text((d) => d3.format(".0f")(d.value) + "%");
}

// ---------------------------------------------------------------------------
// Chart 3: heatmap - countries x years
// ---------------------------------------------------------------------------

function drawHeatmap(adoption, latestYear) {
  const data = adoption.filter((d) => d.size === "GE10");
  const years = Array.from(new Set(data.map((d) => d.year))).sort();

  // Sort countries by their value in the latest year
  const countries = data
    .filter((d) => d.year === latestYear)
    .sort((a, b) => b.value - a.value)
    .map((d) => d.country);

  const cellHeight = 22;
  const margin = { top: 30, right: 10, bottom: 10 };
  const innerHeight = countries.length * cellHeight;
  const height = innerHeight + margin.top + margin.bottom;

  const { container, svg, width } = createSvg("#chart-heatmap", height);
  margin.left = leftMargin(width);
  // The heatmap does not need the full width; at most 110px per year.
  const innerWidth = Math.min(width - margin.left - margin.right, years.length * 110);

  const x = d3.scaleBand().domain(years).range([0, innerWidth]).padding(0.04);
  const y = d3.scaleBand().domain(countries).range([0, innerHeight]).padding(0.08);

  // Sequential scale: one hue (blue), light = low, dark = high
  const maxValue = d3.max(data, (d) => d.value);
  const color = d3.scaleSequential(d3.interpolateRgb("#eef4fc", COLORS.main)).domain([0, maxValue]);

  // Simple legend: three example colours
  addLegend(
    container,
    [5, 20, 40].map((v) => ({ label: v + "%", color: color(v) }))
  );

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisTop(x).tickSize(0).tickPadding(8))
    .call((axis) => axis.select(".domain").remove());

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0).tickPadding(8))
    .call((axis) => axis.select(".domain").remove())
    .selectAll("text")
    .style("font-weight", (name) => (name === "EU-27" ? 700 : 400));

  const cells = g
    .selectAll("rect.cell")
    .data(data)
    .join("rect")
    .attr("class", "cell")
    .attr("x", (d) => x(d.year))
    .attr("y", (d) => y(d.country))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 2)
    .attr("fill", (d) => color(d.value));

  addTooltip(cells, (d) => `<strong>${d.country}</strong>, ${d.year}<br>${pct(d.value)} of enterprises use AI${flagNote(d)}`);

  // Value inside each cell; white text on dark cells, dark text on light cells
  g.selectAll("text.cell-label")
    .data(data)
    .join("text")
    .attr("class", "value-label")
    .attr("x", (d) => x(d.year) + x.bandwidth() / 2)
    .attr("y", (d) => y(d.country) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .attr("pointer-events", "none")
    .style("fill", (d) => (d.value > maxValue * 0.45 ? "white" : "#25282a"))
    .text((d) => d3.format(".0f")(d.value));
}

// ---------------------------------------------------------------------------
// Chart 4: 100% stacked bar chart - number of AI technologies per size class
// ---------------------------------------------------------------------------

function drawStackedBarChart(intensity) {
  const categories = ["three_plus", "two", "one", "none"];
  const categoryNames = {
    three_plus: "3 or more AI technologies",
    two: "2 AI technologies",
    one: "1 AI technology",
    none: "No AI",
  };
  // Ordered blues from dark (many technologies) to grey (no AI)
  const categoryColors = {
    three_plus: COLORS.main,
    two: "#2b78d0",
    one: "#7db9ee",
    none: COLORS.grey,
  };
  const sizes = ["GE10", "10-49", "50-249", "GE250"];

  // Reshape: one object per size class, e.g. { size: "GE10", none: 80.05, one: 7, ... }
  const rows = sizes.map((size) => {
    const row = { size };
    intensity
      .filter((d) => d.size === size)
      .forEach((d) => {
        row[d.category] = d.value;
      });
    return row;
  });
  const year = intensity[0].year;

  // d3.stack computes the start and end of every segment
  const series = d3.stack().keys(categories)(rows);

  const barHeight = 34;
  const margin = { top: 45, right: 15, bottom: 10 };
  const innerHeight = sizes.length * (barHeight + 14);
  const height = innerHeight + margin.top + margin.bottom;

  const { container, svg, width } = createSvg("#chart-stacked", height);
  margin.left = width < 500 ? 95 : 160;
  const innerWidth = width - margin.left - margin.right;

  addLegend(
    container,
    categories.map((c) => ({ label: categoryNames[c], color: categoryColors[c] }))
  );

  const x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
  const y = d3.scaleBand().domain(sizes).range([0, innerHeight]).paddingInner(0.3);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  addPercentAxis(g, x, innerHeight, "% of enterprises in the size class");

  const shortNames = { GE10: "All (10+)", "10-49": "Small", "50-249": "Medium", GE250: "Large" };
  g.append("g")
    .attr("class", "axis")
    .call(
      d3
        .axisLeft(y)
        .tickSize(0)
        .tickPadding(8)
        .tickFormat((s) => (width < 500 ? shortNames[s] : SIZE_NAMES[s].replace(" employees", "")))
    )
    .call((axis) => axis.select(".domain").remove());

  // One <g> per category, one <rect> per size class
  g.selectAll("g.layer")
    .data(series)
    .join("g")
    .attr("class", "layer")
    .attr("fill", (layer) => categoryColors[layer.key])
    .each(function (layer) {
      const rects = d3
        .select(this)
        .selectAll("rect")
        .data(layer.map((seg) => ({ key: layer.key, size: seg.data.size, start: seg[0], end: seg[1] })))
        .join("rect")
        .attr("x", (d) => x(d.start))
        .attr("y", (d) => y(d.size))
        .attr("width", (d) => Math.max(0, x(d.end) - x(d.start)))
        .attr("height", y.bandwidth())
        .attr("stroke", "white") // thin white gap between segments
        .attr("stroke-width", 1.5);

      addTooltip(
        rects,
        (d) => `<strong>${SIZE_NAMES[d.size]}</strong>, EU-27 ${year}<br>${categoryNames[d.key]}: ${pct(d.end - d.start)}`
      );
    });

  // Label inside a segment if it is wide enough
  g.selectAll("text.seg-label")
    .data(series.flatMap((layer) => layer.map((seg) => ({ key: layer.key, size: seg.data.size, start: seg[0], end: seg[1] }))))
    .join("text")
    .attr("class", "value-label")
    .filter((d) => x(d.end) - x(d.start) > 34)
    .attr("x", (d) => x(d.start) + (x(d.end) - x(d.start)) / 2)
    .attr("y", (d) => y(d.size) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .attr("pointer-events", "none")
    .style("fill", (d) => (d.key === "three_plus" || d.key === "two" ? "white" : "#25282a"))
    .text((d) => d3.format(".0f")(d.end - d.start) + "%");
}

// ---------------------------------------------------------------------------
// Chart 5: waffle charts - out of 100 enterprises, how many use AI?
// ---------------------------------------------------------------------------

function drawWaffleCharts(adoption, year) {
  const container = d3.select("#chart-waffle");
  container.selectAll("*").remove();

  addLegend(container, [
    { label: "Uses AI", color: COLORS.main },
    { label: "Does not use AI", color: COLORS.grey },
  ]);

  const wrapper = container.append("div").attr("class", "waffles");

  const waffles = [
    { size: "GE10", title: "All EU enterprises (10+ employees)" },
    { size: "GE250", title: "Large EU enterprises (250+ employees)" },
  ];

  waffles.forEach((w) => {
    const d = adoption.find((r) => r.geo === EU && r.size === w.size && r.year === year);
    const filled = Math.round(d.value); // number of coloured squares out of 100

    const box = wrapper.append("div").attr("class", "waffle");
    box.append("p").attr("class", "waffle-title").html(`<strong>${filled}</strong> out of 100 &middot; ${w.title}`);

    // 10 x 10 grid, filled row by row from the bottom left
    const cell = 30;
    const gap = 4;
    const size = 10 * cell;
    const svg = box
      .append("svg")
      .attr("viewBox", `0 0 ${size} ${size}`)
      .attr("aria-hidden", "true");

    const squares = d3.range(100).map((i) => ({
      index: i,
      col: i % 10,
      row: 9 - Math.floor(i / 10),
      uses: i < filled,
    }));

    const rects = svg
      .selectAll("rect")
      .data(squares)
      .join("rect")
      .attr("x", (s) => s.col * cell + gap / 2)
      .attr("y", (s) => s.row * cell + gap / 2)
      .attr("width", cell - gap)
      .attr("height", cell - gap)
      .attr("rx", 3)
      .attr("fill", (s) => (s.uses ? COLORS.main : COLORS.grey));

    addTooltip(
      rects,
      () => `<strong>${w.title}</strong>, ${year}<br>${pct(d.value)} use AI (${filled} of 100 squares)`
    );
  });
}

// ---------------------------------------------------------------------------
// Chart 6 (extra): dumbbell plot - first vs latest year per country
// ---------------------------------------------------------------------------

function drawDumbbell(adoption, firstYear, latestYear) {
  const all = adoption.filter((d) => d.size === "GE10");

  // One object per country with both values
  const data = Array.from(d3.group(all, (d) => d.geo), ([geo, rows]) => {
    const first = rows.find((r) => r.year === firstYear);
    const last = rows.find((r) => r.year === latestYear);
    return { geo, country: first.country, first: first.value, last: last.value, change: last.value - first.value };
  }).sort((a, b) => b.change - a.change);

  const rowHeight = 22;
  const margin = { top: 45, right: 60, bottom: 10 };
  const innerHeight = data.length * rowHeight;
  const height = innerHeight + margin.top + margin.bottom;

  const { container, svg, width } = createSvg("#chart-dumbbell", height);
  margin.left = leftMargin(width);
  const innerWidth = width - margin.left - margin.right;

  addLegend(container, [
    { label: firstYear, color: COLORS.accent, dot: true },
    { label: latestYear, color: COLORS.main, dot: true },
  ]);

  const x = d3.scaleLinear().domain([0, 50]).range([0, innerWidth]);
  const y = d3.scalePoint().domain(data.map((d) => d.country)).range([0, innerHeight]).padding(0.5);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  addPercentAxis(g, x, innerHeight, "% of enterprises using AI");

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0).tickPadding(8))
    .call((axis) => axis.select(".domain").remove())
    .selectAll("text")
    .style("font-weight", (name) => (name === "EU-27" ? 700 : 400));

  const rows = g
    .selectAll("g.row")
    .data(data)
    .join("g")
    .attr("class", "row")
    .attr("transform", (d) => `translate(0,${y(d.country)})`);

  // Invisible wide rectangle: makes the whole row hoverable (bigger target)
  rows
    .append("rect")
    .attr("x", 0)
    .attr("y", -rowHeight / 2)
    .attr("width", innerWidth)
    .attr("height", rowHeight)
    .attr("fill", "transparent");

  rows
    .append("line")
    .attr("x1", (d) => x(d.first))
    .attr("x2", (d) => x(d.last))
    .attr("stroke", "#9aa6b8")
    .attr("stroke-width", 2);

  rows.append("circle").attr("cx", (d) => x(d.first)).attr("r", 5).attr("fill", COLORS.accent);
  rows.append("circle").attr("cx", (d) => x(d.last)).attr("r", 5).attr("fill", COLORS.main);

  // Increase in percentage points to the right of the latest value
  rows
    .append("text")
    .attr("class", "value-label")
    .attr("x", (d) => x(d.last) + 10)
    .attr("dy", "0.35em")
    .text((d) => "+" + d3.format(".0f")(d.change) + " pp");

  addTooltip(
    rows,
    (d) =>
      `<strong>${d.country}</strong><br>${firstYear}: ${pct(d.first)}<br>${latestYear}: ${pct(d.last)}<br>Change: +${d3.format(".1f")(d.change)} percentage points`
  );
}

// ---------------------------------------------------------------------------
// Load the data and draw all charts
// ---------------------------------------------------------------------------

Promise.all([
  // CSV values are text: "+d.value" turns "19.95" into the number 19.95.
  // "year" is kept as text ("2025"), which is fine for labels and filtering.
  d3.csv("data/ai_adoption.csv", (d) => ({ ...d, value: +d.value })),
  d3.csv("data/ai_intensity.csv", (d) => ({ ...d, value: +d.value })),
])
  .then(([adoption, intensity]) => {
    const years = Array.from(new Set(adoption.map((d) => d.year))).sort();
    const firstYear = years[0];
    const latestYear = years[years.length - 1];

    function drawAll() {
      drawBarChart(adoption, latestYear);
      drawGroupedBarChart(adoption, latestYear);
      drawHeatmap(adoption, latestYear);
      drawStackedBarChart(intensity);
      drawWaffleCharts(adoption, latestYear);
      drawDumbbell(adoption, firstYear, latestYear);
    }

    drawAll();

    // Redraw when the window width changes (e.g. phone rotated)
    let lastWidth = window.innerWidth;
    let timer;
    window.addEventListener("resize", () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      clearTimeout(timer);
      timer = setTimeout(drawAll, 200);
    });
  })
  .catch((error) => {
    console.error(error);
    d3.selectAll(".chart").html('<p class="placeholder">The data could not be loaded.</p>');
  });
