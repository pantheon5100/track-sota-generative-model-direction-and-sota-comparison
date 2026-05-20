const DATA_URL = "data/imagenet-256-leaderboard.csv";
const TIMELINE_ZOOM_LEVELS = [1, 1.5, 2.25, 3.4];

const state = {
  rows: [],
  filtered: [],
  view: "all",
  trend: "all",
  timelineZoomIndex: 0,
  trendPoints: [],
  sort: { key: "fid", dir: "asc" },
  filters: {
    search: "",
    family: "",
    backbone: "",
    training: "",
    latent: ""
  }
};

const els = {
  searchInput: document.querySelector("#searchInput"),
  familyFilter: document.querySelector("#familyFilter"),
  backboneFilter: document.querySelector("#backboneFilter"),
  trainingFilter: document.querySelector("#trainingFilter"),
  latentFilter: document.querySelector("#latentFilter"),
  segments: document.querySelectorAll(".segment"),
  timelineToggles: document.querySelectorAll(".timeline-toggle"),
  zoomButtons: document.querySelectorAll(".zoom-button"),
  body: document.querySelector("#leaderboardBody"),
  rowCount: document.querySelector("#rowCount"),
  fidTimeline: document.querySelector("#fidTimeline"),
  timelineTooltip: document.querySelector("#timelineTooltip"),
  timelineCard: document.querySelector(".timeline-card"),
  statMethods: document.querySelector("#statMethods"),
  statRows: document.querySelector("#statRows"),
  statBestUncond: document.querySelector("#statBestUncond"),
  statBestCond: document.querySelector("#statBestCond"),
  statDateRange: document.querySelector("#statDateRange"),
  tableHeaders: document.querySelectorAll("th[data-sort]")
};

const SORT_KEYS = {
  method: { get: (r) => r.method.toLowerCase(), numeric: false },
  paper: { get: (r) => (r.paper_title || "").toLowerCase(), numeric: false },
  date: { get: (r) => r.submitted_date || "", numeric: false },
  backbone: { get: (r) => `${r.backbone_family}-${r.backbone_size}`.toLowerCase(), numeric: false },
  latent: { get: (r) => (r.latent_or_pixel || "").toLowerCase(), numeric: false },
  guidance: { get: (r) => guidanceLabel(r.guidance), numeric: false },
  fid: { get: (r) => numberValue(r.fid), numeric: true },
  is: { get: (r) => numberValue(r.inception_score), numeric: true },
  precision: { get: (r) => numberValue(r.precision), numeric: true },
  recall: { get: (r) => numberValue(r.recall), numeric: true },
  epochs: { get: (r) => numberValue(r.epochs), numeric: true },
  training: { get: (r) => (r.training_type || "").toLowerCase(), numeric: false }
};

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("view")) state.view = params.get("view");
  if (params.has("trend")) state.trend = params.get("trend");
  if (params.has("q")) state.filters.search = params.get("q");
  if (params.has("family")) state.filters.family = params.get("family");
  if (params.has("backbone")) state.filters.backbone = params.get("backbone");
  if (params.has("training")) state.filters.training = params.get("training");
  if (params.has("latent")) state.filters.latent = params.get("latent");
  if (params.has("sort")) state.sort.key = params.get("sort");
  if (params.has("dir")) state.sort.dir = params.get("dir");
}

function writeUrlState() {
  const params = new URLSearchParams();
  if (state.view !== "all") params.set("view", state.view);
  if (state.trend !== "all") params.set("trend", state.trend);
  if (state.filters.search) params.set("q", state.filters.search);
  if (state.filters.family) params.set("family", state.filters.family);
  if (state.filters.backbone) params.set("backbone", state.filters.backbone);
  if (state.filters.training) params.set("training", state.filters.training);
  if (state.filters.latent) params.set("latent", state.filters.latent);
  if (state.sort.key !== "fid") params.set("sort", state.sort.key);
  if (state.sort.dir !== "asc") params.set("dir", state.sort.dir);
  const qs = params.toString();
  history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}

function syncUiFromState() {
  els.searchInput.value = state.filters.search;
  els.familyFilter.value = state.filters.family;
  els.backboneFilter.value = state.filters.backbone;
  els.trainingFilter.value = state.filters.training;
  els.latentFilter.value = state.filters.latent;
  els.segments.forEach((s) => s.classList.toggle("is-active", s.dataset.view === state.view));
  els.timelineToggles.forEach((t) => t.classList.toggle("is-active", t.dataset.trend === state.trend));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  const [header, ...records] = rows;
  return records.map((record) => {
    const obj = {};
    header.forEach((key, index) => {
      obj[key] = record[index] ?? "";
    });
    return obj;
  });
}

function numberValue(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function labelValue(value) {
  return value && value !== "unknown" ? value : "unknown";
}

function guidanceLabel(value) {
  if (value === "none") return "unconditional";
  if (!value || value === "unknown") return "unknown";
  return "conditional";
}

function rowSearchText(row) {
  return [
    row.method,
    row.method_variant,
    row.paper_title,
    row.method_family,
    row.backbone_family,
    row.backbone_size,
    row.latent_or_pixel,
    row.encoder_or_tokenizer,
    row.guidance,
    row.training_type,
    row.notes
  ]
    .join(" ")
    .toLowerCase();
}

function sortRows(rows) {
  const config = SORT_KEYS[state.sort.key];
  if (!config || typeof config.get !== "function") {
    return [...rows].sort((a, b) => {
      const af = numberValue(a.fid) ?? Number.POSITIVE_INFINITY;
      const bf = numberValue(b.fid) ?? Number.POSITIVE_INFINITY;
      return af - bf;
    });
  }
  const dir = state.sort.dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = config.get(a);
    const bv = config.get(b);
    if (config.numeric) {
      return ((av ?? Number.POSITIVE_INFINITY) - (bv ?? Number.POSITIVE_INFINITY)) * dir;
    }
    return String(av).localeCompare(String(bv)) * dir;
  });
}

function isGuided(row) {
  return row.guidance && row.guidance !== "none" && row.guidance !== "unknown";
}

function matchesTrend(row) {
  if (state.trend === "unguided") return row.guidance === "none";
  if (state.trend === "guided") return isGuided(row);
  return true;
}

function applyView(row) {
  if (state.view === "unguided") return row.guidance === "none";
  if (state.view === "guided") return isGuided(row);
  if (state.view === "rae") return row.latent_or_pixel === "rae_latent" || row.method.toLowerCase().includes("rae");
  if (state.view === "ditxl") return row.backbone_family.includes("DiT") && row.backbone_size === "XL";
  if (state.view === "sitxl") return row.backbone_family === "SiT" && row.backbone_size === "XL";
  return true;
}

function applyFilters() {
  const search = state.filters.search.trim().toLowerCase();
  state.filtered = sortRows(
    state.rows.filter((row) => {
      if (!applyView(row)) return false;
      if (state.filters.family && row.method_family !== state.filters.family) return false;
      if (state.filters.backbone && row.backbone_family !== state.filters.backbone) return false;
      if (state.filters.training && row.training_type !== state.filters.training) return false;
      if (state.filters.latent && row.latent_or_pixel !== state.filters.latent) return false;
      if (search && !rowSearchText(row).includes(search)) return false;
      return true;
    })
  );
}

function optionList(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function populateSelect(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value.replaceAll("_", " ");
    select.append(option);
  });
}

function formatDateLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateString || "unknown";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatAxisDate(time) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function compactMethodName(method) {
  return String(method || "")
    .replace("RAE DiT-DH-XL", "RAE-DH")
    .replace("RAE DiT-XL", "RAE")
    .replace("PixelFlow", "PixFlow");
}

function buildTrendPoints() {
  return state.rows
    .filter((row) => row.submitted_date && numberValue(row.fid) !== null && matchesTrend(row))
    .map((row, rowIndex) => ({
      row,
      rowIndex,
      date: row.submitted_date,
      fid: numberValue(row.fid),
      time: new Date(`${row.submitted_date}T00:00:00Z`).getTime()
    }))
    .filter((item) => Number.isFinite(item.time))
    .sort((a, b) => a.time - b.time || a.fid - b.fid);
}

function buildMilestonePoints(points) {
  let bestFid = Number.POSITIVE_INFINITY;
  return points.filter((point) => {
    if (point.fid < bestFid - 0.0001) {
      bestFid = point.fid;
      return true;
    }
    return false;
  });
}

function buildBestFidPath(milestones, minTime, maxTime, xScale, yScale, yMin, yMax) {
  if (!milestones.length) return "";

  const visibleMilestones = milestones.filter((point) => point.time >= minTime && point.time <= maxTime);
  const activeBeforeWindow = milestones.filter((point) => point.time <= minTime).at(-1);
  const firstVisible = activeBeforeWindow ?? visibleMilestones[0];
  if (!firstVisible || firstVisible.time > maxTime || firstVisible.fid < yMin || firstVisible.fid > yMax) return "";

  const commands = [`M ${xScale(activeBeforeWindow ? minTime : firstVisible.time).toFixed(1)} ${yScale(firstVisible.fid).toFixed(1)}`];
  let current = firstVisible;
  const changes = activeBeforeWindow ? visibleMilestones.filter((point) => point.time > minTime) : visibleMilestones.slice(1);

  changes.forEach((point) => {
    if (point.fid < yMin || point.fid > yMax || current.fid < yMin || current.fid > yMax) return;
    const x = xScale(point.time).toFixed(1);
    commands.push(`L ${x} ${yScale(current.fid).toFixed(1)}`);
    commands.push(`L ${x} ${yScale(point.fid).toFixed(1)}`);
    current = point;
  });

  commands.push(`L ${xScale(maxTime).toFixed(1)} ${yScale(current.fid).toFixed(1)}`);
  return commands.join(" ");
}

function getZoomedDomain(minTime, maxTime, yMinFull, yMaxFull) {
  const zoom = TIMELINE_ZOOM_LEVELS[state.timelineZoomIndex] ?? 1;
  const oneDay = 24 * 60 * 60 * 1000;
  const timeRange = Math.max(maxTime - minTime, oneDay);
  const fidRange = Math.max(yMaxFull - yMinFull, 0.1);

  if (zoom === 1) {
    return { minTime, maxTime, yMin: yMinFull, yMax: yMaxFull };
  }

  return {
    minTime: maxTime - timeRange / zoom,
    maxTime,
    yMin: yMinFull,
    yMax: yMinFull + fidRange / zoom
  };
}

function updateTimelineZoomControls() {
  els.zoomButtons.forEach((button) => {
    if (button.dataset.zoom === "out") button.disabled = state.timelineZoomIndex === 0;
    if (button.dataset.zoom === "in") button.disabled = state.timelineZoomIndex === TIMELINE_ZOOM_LEVELS.length - 1;
    if (button.dataset.zoom === "reset") button.disabled = state.timelineZoomIndex === 0;
  });
}

function renderTimeline() {
  const svg = els.fidTimeline;
  if (!svg) return;

  const width = 900;
  const height = 390;
  const margin = { top: 64, right: 34, bottom: 68, left: 70 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const bottom = margin.top + innerHeight;
  const allPoints = buildTrendPoints();
  updateTimelineZoomControls();

  if (!allPoints.length) {
    state.trendPoints = [];
    svg.innerHTML = `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" class="tick-label">No dated FID rows for this trend view.</text>`;
    return;
  }

  const times = allPoints.map((point) => point.time);
  const fids = allPoints.map((point) => point.fid);
  const fullMinTime = Math.min(...times);
  const fullMaxTime = Math.max(...times);
  const minFid = Math.min(...fids);
  const maxFid = Math.max(...fids);
  const yPad = Math.max((maxFid - minFid) * 0.18, 0.08);
  const yMinFull = Math.max(0, minFid - yPad);
  const yMaxFull = maxFid + yPad;
  const zoomedDomain = getZoomedDomain(fullMinTime, fullMaxTime, yMinFull, yMaxFull);
  const { minTime, maxTime, yMin, yMax } = zoomedDomain;
  const points = allPoints.filter((point) => point.time >= minTime && point.time <= maxTime && point.fid >= yMin && point.fid <= yMax);
  state.trendPoints = points;

  if (!points.length) {
    svg.innerHTML = `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" class="tick-label">No visible FID rows at this zoom level.</text>`;
    return;
  }

  const xScale = (time) => {
    if (minTime === maxTime) return margin.left + innerWidth / 2;
    return margin.left + ((time - minTime) / (maxTime - minTime)) * innerWidth;
  };
  const yScale = (fid) => {
    if (yMin === yMax) return margin.top + innerHeight / 2;
    return bottom - ((fid - yMin) / (yMax - yMin)) * innerHeight;
  };
  const duplicateCounts = new Map();
  const coords = points.map((point) => {
    const key = `${point.time}|${point.fid.toFixed(4)}`;
    const count = duplicateCounts.get(key) ?? 0;
    duplicateCounts.set(key, count + 1);
    const direction = count % 2 === 0 ? -1 : 1;
    const magnitude = Math.ceil(count / 2) * 5;
    return { ...point, x: xScale(point.time) + direction * magnitude, y: yScale(point.fid) };
  });
  const milestonePoints = buildMilestonePoints(allPoints);
  const bestFidPath = buildBestFidPath(milestonePoints, minTime, maxTime, xScale, yScale, yMin, yMax);
  const milestoneCoords = milestonePoints
    .filter((point) => point.time >= minTime && point.time <= maxTime && point.fid >= yMin && point.fid <= yMax)
    .map((point) => ({ ...point, x: xScale(point.time), y: yScale(point.fid) }));
  const yTicks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) * index) / 4);
  const xTickTimes =
    minTime === maxTime
      ? [minTime]
      : Array.from({ length: 4 }, (_, index) => minTime + ((maxTime - minTime) * index) / 3);
  const labelBoxes = [];
  const labelCandidates = [
    { dx: 0, dy: -10 },
    { dx: 0, dy: 16 },
    { dx: 30, dy: -4 },
    { dx: -30, dy: -4 },
    { dx: 30, dy: 14 },
    { dx: -30, dy: 14 },
    { dx: 0, dy: -24 },
    { dx: 0, dy: 30 }
  ];
  const pointLabels = milestoneCoords.map((point) => {
    const text = `${compactMethodName(point.row.method)} ${point.fid.toFixed(2)}`;
    const textWidth = text.length * 5.2;
    const textHeight = 11;
    const minX = margin.left + textWidth / 2;
    const maxX = width - margin.right - textWidth / 2;
    let placed = null;
    for (const candidate of labelCandidates) {
      const x = Math.max(minX, Math.min(point.x + candidate.dx, maxX));
      const y = Math.max(margin.top + textHeight, Math.min(point.y + candidate.dy, bottom - 6));
      const box = {
        left: x - textWidth / 2 - 3,
        right: x + textWidth / 2 + 3,
        top: y - textHeight,
        bottom: y + 3
      };
      const overlaps = labelBoxes.some((existing) => box.left < existing.right && box.right > existing.left && box.top < existing.bottom && box.bottom > existing.top);
      if (!overlaps) {
        placed = { x, y, text, textWidth, box };
        break;
      }
    }
    if (!placed) {
      const x = Math.max(minX, Math.min(point.x, maxX));
      const y = Math.max(margin.top + textHeight, Math.min(point.y - 11, bottom - 6));
      placed = {
        x,
        y,
        text,
        textWidth,
        box: {
          left: x - textWidth / 2 - 3,
          right: x + textWidth / 2 + 3,
          top: y - textHeight,
          bottom: y + 3
        }
      };
    }
    labelBoxes.push(placed.box);
    return { ...placed, point };
  });

  svg.innerHTML = `
    <line class="axis-line" x1="${margin.left}" y1="${bottom}" x2="${width - margin.right}" y2="${bottom}"></line>
    <line class="axis-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${bottom}"></line>
    ${yTicks
      .map((tick) => {
        const y = yScale(tick);
        return `
          <line class="grid-line" x1="${margin.left}" y1="${y.toFixed(1)}" x2="${width - margin.right}" y2="${y.toFixed(1)}"></line>
          <text class="tick-label" x="${margin.left - 12}" y="${(y + 4).toFixed(1)}" text-anchor="end">${tick.toFixed(2)}</text>
        `;
      })
      .join("")}
    ${xTickTimes
      .map(
        (time) => `
          <text class="tick-label" x="${xScale(time).toFixed(1)}" y="${bottom + 28}" text-anchor="middle">${escapeHtml(formatAxisDate(time))}</text>
        `
      )
      .join("")}
    ${bestFidPath ? `<path class="milestone-line" d="${bestFidPath}"></path>` : ""}
    ${coords
      .map(
        (point, index) => `
          <circle class="trend-point ${point.row.guidance === "none" ? "unguided" : "guided"}" tabindex="0" data-index="${index}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.8">
            <title>${escapeHtml(`${formatDateLabel(point.date)}: FID ${point.fid.toFixed(2)} (${point.row.method}, ${guidanceLabel(point.row.guidance)})`)}</title>
          </circle>
        `
      )
      .join("")}
    ${pointLabels
      .map((label) => {
        const point = label.point;
        const distance = Math.hypot(label.x - point.x, label.y - point.y);
        return `
          ${distance > 22 ? `<line class="label-leader" x1="${point.x.toFixed(1)}" y1="${point.y.toFixed(1)}" x2="${label.x.toFixed(1)}" y2="${(label.y - 7).toFixed(1)}"></line>` : ""}
          <text class="point-label" x="${label.x.toFixed(1)}" y="${label.y.toFixed(1)}" text-anchor="middle">${escapeHtml(label.text)}</text>
        `;
      })
      .join("")}
    <text class="axis-label" x="${margin.left + innerWidth / 2}" y="${height - 12}" text-anchor="middle">Submission date</text>
    <text class="axis-label" transform="translate(20 ${margin.top + innerHeight / 2}) rotate(-90)" text-anchor="middle">FID</text>
  `;

  bindTimelinePoints();
}

function bindTimelinePoints() {
  const points = els.fidTimeline.querySelectorAll(".trend-point");
  points.forEach((point) => {
    point.addEventListener("mouseenter", (event) => showTimelineTooltip(point, event));
    point.addEventListener("mousemove", (event) => showTimelineTooltip(point, event));
    point.addEventListener("mouseleave", hideTimelineTooltip);
    point.addEventListener("focus", () => showTimelineTooltip(point));
    point.addEventListener("blur", hideTimelineTooltip);
    point.addEventListener("click", () => scrollToTableRow(Number(point.dataset.index)));
  });
}

function showTimelineTooltip(point, event) {
  const item = state.trendPoints[Number(point.dataset.index)];
  if (!item || !els.timelineTooltip || !els.timelineCard) return;

  const variant = item.row.method_variant ? `, ${item.row.method_variant}` : "";
  els.timelineTooltip.innerHTML = `
    <strong>${escapeHtml(formatDateLabel(item.date))}</strong>
    FID ${escapeHtml(item.fid.toFixed(2))} · ${escapeHtml(item.row.method)}${escapeHtml(variant)}<br>
    ${escapeHtml(item.row.backbone_family)}-${escapeHtml(item.row.backbone_size)} · ${escapeHtml(guidanceLabel(item.row.guidance))}
  `;
  els.timelineTooltip.hidden = false;

  const cardRect = els.timelineCard.getBoundingClientRect();
  const pointRect = point.getBoundingClientRect();
  const rawLeft = event ? event.clientX - cardRect.left + 12 : pointRect.left - cardRect.left + pointRect.width + 10;
  const rawTop = event ? event.clientY - cardRect.top + 12 : pointRect.top - cardRect.top - 8;
  const left = Math.max(10, Math.min(rawLeft, cardRect.width - 290));
  const top = Math.max(10, Math.min(rawTop, cardRect.height - 90));
  els.timelineTooltip.style.left = `${left}px`;
  els.timelineTooltip.style.top = `${top}px`;
}

function hideTimelineTooltip() {
  if (els.timelineTooltip) els.timelineTooltip.hidden = true;
}

function scrollToTableRow(pointIndex) {
  const item = state.trendPoints[pointIndex];
  if (!item) return;
  const rowIndex = state.rows.indexOf(item.row);
  if (rowIndex === -1) return;

  let tr = els.body.querySelector(`tr[data-row-index="${rowIndex}"]`);
  if (!tr) {
    state.view = "all";
    state.filters.search = "";
    state.filters.family = "";
    state.filters.backbone = "";
    state.filters.training = "";
    state.filters.latent = "";
    syncUiFromState();
    render();
    tr = els.body.querySelector(`tr[data-row-index="${rowIndex}"]`);
  }
  if (!tr) return;

  els.body.querySelectorAll(".highlight-row").forEach((el) => el.classList.remove("highlight-row"));
  tr.scrollIntoView({ behavior: "smooth", block: "center" });
  tr.classList.add("highlight-row");
  tr.addEventListener("animationend", () => tr.classList.remove("highlight-row"), { once: true });
}

function badgeClassForGuidance(row) {
  return row.guidance === "none" ? "badge unguided" : "badge guided";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function rowTldr(row) {
  return row.tldr || row.notes || "TL;DR pending extraction.";
}

function renderTable() {
  const rows = state.filtered;
  els.rowCount.textContent = `${rows.length} visible rows`;

  if (!rows.length) {
    els.body.innerHTML = '<tr><td colspan="13" class="empty-cell">No rows match the current filters.</td></tr>';
    return;
  }

  els.body.innerHTML = rows
    .map((row) => {
      const methodVariant = row.method_variant ? `<span>${escapeHtml(row.method_variant)}</span>` : "";
      const backbone = [row.backbone_family, row.backbone_size].filter(Boolean).join("-");
      const sourceLabel = row.source_table || "source";
      const rowIndex = state.rows.indexOf(row);
      const methodUrl = /^https?:\/\//.test(row.source_url) ? escapeHtml(row.source_url) : "";
      const methodName = methodUrl
        ? `<a href="${methodUrl}" target="_blank" rel="noopener"><strong>${escapeHtml(row.method)}</strong></a>`
        : `<strong>${escapeHtml(row.method)}</strong>`;
      return `
        <tr data-row-index="${rowIndex}">
          <td class="method-cell">${methodName}${methodVariant}</td>
          <td class="date-cell">${escapeHtml(row.submitted_date ? formatDateLabel(row.submitted_date) : "--")}</td>
          <td>${escapeHtml(labelValue(backbone))}</td>
          <td>${escapeHtml(labelValue(row.latent_or_pixel).replaceAll("_", " "))}</td>
          <td><span class="${badgeClassForGuidance(row)}">${escapeHtml(guidanceLabel(row.guidance))}</span></td>
          <td class="fid-cell">${escapeHtml(row.fid || "--")}</td>
          <td>${escapeHtml(row.inception_score || "--")}</td>
          <td>${escapeHtml(row.precision || "--")}</td>
          <td>${escapeHtml(row.recall || "--")}</td>
          <td>${escapeHtml(row.epochs || "--")}</td>
          <td><span class="badge train">${escapeHtml(labelValue(row.training_type).replaceAll("_", " "))}</span></td>
          <td class="source-cell"><a href="${/^https?:\/\//.test(row.source_url) ? escapeHtml(row.source_url) : "#"}">${escapeHtml(sourceLabel)}</a></td>
          <td class="tldr-cell" title="${escapeHtml(row.paper_title || "")}">${escapeHtml(row.paper_title || "--")}</td>
        </tr>
      `;
    })
    .join("");
}

function renderStats() {
  if (!state.rows.length) return;
  const methods = new Set(state.rows.map((r) => r.method));
  els.statMethods.textContent = methods.size;
  els.statRows.textContent = state.rows.length;
  const uncondRows = state.rows.filter((r) => r.guidance === "none" && numberValue(r.fid) !== null);
  const condRows = state.rows.filter((r) => isGuided(r) && numberValue(r.fid) !== null);
  const bestUncond = uncondRows.length ? Math.min(...uncondRows.map((r) => numberValue(r.fid))) : null;
  const bestCond = condRows.length ? Math.min(...condRows.map((r) => numberValue(r.fid))) : null;
  els.statBestUncond.textContent = bestUncond !== null ? bestUncond.toFixed(2) : "--";
  els.statBestCond.textContent = bestCond !== null ? bestCond.toFixed(2) : "--";
  const dates = state.rows.map((r) => r.submitted_date).filter(Boolean).sort();
  if (dates.length) {
    const latestDate = formatDateLabel(dates[dates.length - 1]);
    els.statDateRange.textContent = latestDate;
    els.statDateRange.title = `Latest paper date: ${latestDate}`;
    els.statDateRange.setAttribute("aria-label", `Latest paper date: ${latestDate}`);
  }
}

function updateSortHeaders() {
  els.tableHeaders.forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
    if (th.dataset.sort === state.sort.key) {
      th.classList.add(state.sort.dir === "desc" ? "sort-desc" : "sort-asc");
    }
  });
}

function render() {
  applyFilters();
  renderTimeline();
  renderTable();
  renderStats();
  updateSortHeaders();
  writeUrlState();
}

function bindEvents() {
  const debouncedRender = debounce(() => render(), 200);
  els.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    debouncedRender();
  });

  els.familyFilter.addEventListener("change", (event) => {
    state.filters.family = event.target.value;
    render();
  });

  els.backboneFilter.addEventListener("change", (event) => {
    state.filters.backbone = event.target.value;
    render();
  });

  els.trainingFilter.addEventListener("change", (event) => {
    state.filters.training = event.target.value;
    render();
  });

  els.latentFilter.addEventListener("change", (event) => {
    state.filters.latent = event.target.value;
    render();
  });

  els.segments.forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      els.segments.forEach((segment) => segment.classList.toggle("is-active", segment === button));
      render();
    });
  });

  els.timelineToggles.forEach((button) => {
    button.addEventListener("click", () => {
      state.trend = button.dataset.trend;
      els.timelineToggles.forEach((toggle) => toggle.classList.toggle("is-active", toggle === button));
      render();
    });
  });

  els.zoomButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.zoom === "in") {
        state.timelineZoomIndex = Math.min(state.timelineZoomIndex + 1, TIMELINE_ZOOM_LEVELS.length - 1);
      } else if (button.dataset.zoom === "out") {
        state.timelineZoomIndex = Math.max(state.timelineZoomIndex - 1, 0);
      } else {
        state.timelineZoomIndex = 0;
      }
      renderTimeline();
    });
  });

  els.tableHeaders.forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (state.sort.key === key) {
        state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
      } else {
        state.sort.key = key;
        state.sort.dir = "asc";
      }
      render();
    });
  });
}

async function init() {
  readUrlState();
  try {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csv = await response.text();
    state.rows = parseCsv(csv);

    populateSelect(els.familyFilter, optionList(state.rows, "method_family"));
    populateSelect(els.backboneFilter, optionList(state.rows, "backbone_family"));
    populateSelect(els.trainingFilter, optionList(state.rows, "training_type"));
    populateSelect(els.latentFilter, optionList(state.rows, "latent_or_pixel"));
    syncUiFromState();
    bindEvents();
    render();
  } catch (error) {
    els.body.innerHTML = `<tr><td colspan="13" class="empty-cell">Could not load ${escapeHtml(DATA_URL)}.</td></tr>`;
    if (els.fidTimeline) {
      els.fidTimeline.innerHTML = `<text x="450" y="195" text-anchor="middle" class="tick-label">Could not load timeline data.</text>`;
    }
    console.error(error);
  }
}

init();
