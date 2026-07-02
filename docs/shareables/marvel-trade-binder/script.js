const state = {
  cards: [],
  filtered: [],
  view: "grid",
  selected: new Set(),
  marked: new Set(),
  compare: [],
  filters: {
    search: "",
    set: "all",
    rarity: "all",
    color: "all",
    type: "all",
    finish: "all",
    condition: "all",
    selection: "all",
    sort: "name-asc",
  },
};

const els = {};
const rarityRank = { mythic: 5, rare: 4, uncommon: 3, common: 2, special: 1 };
const conditionRank = { mint: 1, near_mint: 2, lightly_played: 3, moderately_played: 4, heavily_played: 5, damaged: 6, unknown: 7 };

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value, currency = "USD") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "n/a";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value));
}

function normalize(value) {
  return String(value || "").toLowerCase();
}

function colorLabel(colors) {
  if (!colors || colors.length === 0) return "Colorless";
  return colors.join("");
}

function compareValue(value) {
  if (value === null || value === undefined) return -Infinity;
  return Number(value);
}

function cardSearchText(card) {
  return [
    card.name,
    card.setCode,
    card.setName,
    card.collectorNumber,
    card.typeLine,
    card.oracleText,
    card.rarity,
    card.finish,
    card.condition,
    card.keywords.join(" "),
    card.publicTags.join(" "),
  ].join(" ");
}

function uniqueOptions(cards, getValue, labeler = (value) => value) {
  const values = new Map();
  for (const card of cards) {
    const value = getValue(card);
    if (!value) continue;
    values.set(value, labeler(value, card));
  }
  return Array.from(values.entries()).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
}

function fillSelect(select, options, allLabel) {
  select.innerHTML = "";
  select.append(new Option(allLabel, "all"));
  for (const [value, label] of options) {
    select.append(new Option(label, value));
  }
}

function initFilters() {
  fillSelect(
    els.setFilter,
    uniqueOptions(state.cards, (card) => card.setCode, (value, card) => value + " - " + (card.setName || value)),
    "All sets",
  );
  fillSelect(els.rarityFilter, uniqueOptions(state.cards, (card) => card.rarity), "All rarities");
  fillSelect(
    els.colorFilter,
    uniqueOptions(state.cards, (card) => colorLabel(card.colorIdentity)),
    "All colors",
  );
  fillSelect(els.typeFilter, uniqueOptions(state.cards, (card) => card.typeBucket), "All types");
  fillSelect(els.finishFilter, uniqueOptions(state.cards, (card) => card.finish), "All finishes");
  fillSelect(els.conditionFilter, uniqueOptions(state.cards, (card) => card.condition), "All conditions");
  fillSelect(
    els.selectionFilter,
    [
      ["selected", "Selected"],
      ["marked", "Marked"],
      ["unselected", "Unselected"],
    ],
    "All rows",
  );
}

function matchesFilters(card) {
  const search = normalize(state.filters.search);
  if (search && !normalize(cardSearchText(card)).includes(search)) return false;
  if (state.filters.set !== "all" && card.setCode !== state.filters.set) return false;
  if (state.filters.rarity !== "all" && card.rarity !== state.filters.rarity) return false;
  if (state.filters.color !== "all" && colorLabel(card.colorIdentity) !== state.filters.color) return false;
  if (state.filters.type !== "all" && card.typeBucket !== state.filters.type) return false;
  if (state.filters.finish !== "all" && card.finish !== state.filters.finish) return false;
  if (state.filters.condition !== "all" && card.condition !== state.filters.condition) return false;
  if (state.filters.selection === "selected" && !state.selected.has(card.id)) return false;
  if (state.filters.selection === "marked" && !state.marked.has(card.id)) return false;
  if (state.filters.selection === "unselected" && state.selected.has(card.id)) return false;
  return true;
}

function sortCards(cards) {
  const sorted = [...cards];
  sorted.sort((a, b) => {
    switch (state.filters.sort) {
      case "set-asc":
        return (
          a.setCode.localeCompare(b.setCode) ||
          a.collectorSort - b.collectorSort ||
          a.name.localeCompare(b.name)
        );
      case "market-desc":
        return compareValue(b.marketPrice) - compareValue(a.marketPrice) || a.name.localeCompare(b.name);
      case "market-asc":
        return compareValue(a.marketPrice) - compareValue(b.marketPrice) || a.name.localeCompare(b.name);
      case "quantity-desc":
        return b.quantity - a.quantity || a.name.localeCompare(b.name);
      case "condition-asc":
        return (conditionRank[a.condition] || 99) - (conditionRank[b.condition] || 99) || a.name.localeCompare(b.name);
      case "rarity-desc":
        return (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0) || a.name.localeCompare(b.name);
      case "name-asc":
      default:
        return a.name.localeCompare(b.name);
    }
  });
  return sorted;
}

function applyFilters() {
  state.filtered = sortCards(state.cards.filter(matchesFilters));
  render();
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".view-toggle button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  });
  render();
}

function toggleSelected(cardId) {
  if (state.selected.has(cardId)) {
    state.selected.delete(cardId);
  } else {
    state.selected.add(cardId);
  }
  applyFilters();
}

function toggleMarked(cardId) {
  if (state.marked.has(cardId)) {
    state.marked.delete(cardId);
  } else {
    state.marked.add(cardId);
  }
  applyFilters();
}

function toggleCompare(cardId) {
  if (state.compare.includes(cardId)) {
    state.compare = state.compare.filter((id) => id !== cardId);
  } else {
    state.compare = [...state.compare, cardId].slice(-2);
  }
  setView("compare");
}

function cardById(cardId) {
  return state.cards.find((card) => card.id === cardId);
}

function cardShell(card) {
  const selected = state.selected.has(card.id);
  const marked = state.marked.has(card.id);
  const comparing = state.compare.includes(card.id);
  const tags = [card.rarity, card.finish, card.condition, card.typeBucket].filter(Boolean);
  return `<article class="card${selected ? " is-selected" : ""}${marked ? " is-marked" : ""}" data-card-id="${escapeHtml(card.id)}">
    <div class="card-media">
      ${card.imageUrl ? `<img loading="lazy" src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.name)} card image">` : ""}
      <div class="card-pills">
        <span class="pill">x${card.quantity}</span>
        <span class="pill">${escapeHtml(card.setCode)} #${escapeHtml(card.collectorNumber)}</span>
      </div>
    </div>
    <div class="card-body">
      <div class="card-title">
        <h2>${escapeHtml(card.name)}</h2>
        <span class="market">${money(card.marketPrice, card.marketCurrency)}</span>
      </div>
      <div class="meta-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <p class="oracle">${escapeHtml(card.typeLine)}${card.oracleText ? "\\n" + escapeHtml(card.oracleText) : ""}</p>
      <div class="tag-row">${card.publicTags.slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="card-actions">
        <button type="button" data-action="select" data-card-id="${escapeHtml(card.id)}" class="${selected ? "is-on" : ""}">${selected ? "Selected" : "Select"}</button>
        <button type="button" data-action="mark" data-card-id="${escapeHtml(card.id)}" class="${marked ? "is-on" : ""}">${marked ? "Marked" : "Mark"}</button>
        <button type="button" data-action="compare" data-card-id="${escapeHtml(card.id)}" class="${comparing ? "is-on" : ""}">Compare</button>
      </div>
    </div>
  </article>`;
}

function renderGrid(cards = state.filtered) {
  return `<div class="grid-view">${cards.map(cardShell).join("")}</div>`;
}

function renderTable() {
  return `<div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Set</th>
          <th>Qty</th>
          <th>Finish</th>
          <th>Condition</th>
          <th>Market</th>
          <th>Type</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${state.filtered
          .map(
            (card) => `<tr>
              <td><strong>${escapeHtml(card.name)}</strong><br>${escapeHtml(card.rarity)}</td>
              <td>${escapeHtml(card.setCode)} #${escapeHtml(card.collectorNumber)}<br>${escapeHtml(card.setName)}</td>
              <td>${card.quantity}</td>
              <td>${escapeHtml(card.finish)}</td>
              <td>${escapeHtml(card.condition)}</td>
              <td>${money(card.marketPrice, card.marketCurrency)}</td>
              <td>${escapeHtml(card.typeLine)}</td>
              <td>
                <div class="table-actions">
                  <button type="button" data-action="select" data-card-id="${escapeHtml(card.id)}">${state.selected.has(card.id) ? "Selected" : "Select"}</button>
                  <button type="button" data-action="mark" data-card-id="${escapeHtml(card.id)}">${state.marked.has(card.id) ? "Marked" : "Mark"}</button>
                  <button type="button" data-action="compare" data-card-id="${escapeHtml(card.id)}">Compare</button>
                </div>
              </td>
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </div>`;
}

function renderSets() {
  const groups = new Map();
  for (const card of state.filtered) {
    const key = card.setCode || "UNK";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(card);
  }
  const sections = Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([setCode, cards]) => {
      const quantity = cards.reduce((total, card) => total + card.quantity, 0);
      const value = cards.reduce((total, card) => total + (card.marketTotal || 0), 0);
      const setName = cards[0]?.setName || setCode;
      return `<section class="set-group">
        <div class="set-header">
          <h2>${escapeHtml(setCode)} - ${escapeHtml(setName)}</h2>
          <p>${cards.length} rows · ${quantity} cards · ${money(value)}</p>
        </div>
        ${renderGrid(cards)}
      </section>`;
    });
  return `<div class="set-view">${sections.join("")}</div>`;
}

function detailList(card) {
  const rows = [
    ["Set", card.setCode + " # " + card.collectorNumber + " - " + card.setName],
    ["Quantity", card.quantity],
    ["Finish", card.finish],
    ["Condition", card.condition],
    ["Market", money(card.marketPrice, card.marketCurrency) + " / " + money(card.marketTotal, card.marketCurrency) + " total"],
    ["Rarity", card.rarity],
    ["Colors", colorLabel(card.colorIdentity)],
    ["Type", card.typeLine],
    ["Keywords", card.keywords.join(", ") || "n/a"],
    ["Snapshot", card.marketPriceSource + (card.marketPriceUpdatedAt ? " - " + card.marketPriceUpdatedAt.slice(0, 10) : "")],
    ["Tags", card.publicTags.join(", ") || "n/a"],
  ];
  return `<dl class="detail-list">${rows
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join("")}</dl>`;
}

function renderCompare() {
  const cards = state.compare.map(cardById).filter(Boolean);
  const compareCards =
    cards.length > 0
      ? `<div class="compare-grid">${cards
          .map(
            (card) => `<article class="compare-card">
              ${card.imageUrl ? `<img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.name)} card image">` : ""}
              <div>
                <h2>${escapeHtml(card.name)}</h2>
                <p class="oracle">${escapeHtml(card.oracleText || card.typeLine)}</p>
                ${detailList(card)}
                ${card.scryfallUri ? `<p><a href="${escapeHtml(card.scryfallUri)}" target="_blank" rel="noreferrer">Scryfall</a></p>` : ""}
              </div>
            </article>`,
          )
          .join("")}</div>`
      : "";
  const picks = state.filtered
    .slice(0, 24)
    .map(
      (card) => `<button type="button" class="quick-pick" data-action="compare" data-card-id="${escapeHtml(card.id)}">
        ${card.imageUrl ? `<img loading="lazy" src="${escapeHtml(card.imageUrl)}" alt="">` : "<span></span>"}
        <span><strong>${escapeHtml(card.name)}</strong><span>${escapeHtml(card.setCode)} #${escapeHtml(card.collectorNumber)} · ${money(card.marketPrice, card.marketCurrency)}</span></span>
        <span>${state.compare.includes(card.id) ? "On" : "Add"}</span>
      </button>`,
    )
    .join("");
  return `<div class="compare-view">${compareCards}<div class="quick-picks">${picks}</div></div>`;
}

function renderEmpty() {
  return byId("emptyTemplate").innerHTML;
}

function updateCounts() {
  els.resultCount.textContent = String(state.filtered.length);
  els.resultLabel.textContent = state.filtered.length === 1 ? "card shown" : "cards shown";
  els.selectedCount.textContent = String(state.selected.size);
  els.markedCount.textContent = String(state.marked.size);
  const hasSelected = state.selected.size > 0;
  els.downloadCsv.disabled = !hasSelected;
  els.downloadTxt.disabled = !hasSelected;
  els.downloadXml.disabled = !hasSelected;
  els.compareSelected.disabled = state.selected.size < 2;
  els.selectMarked.disabled = state.marked.size === 0;
}

function render() {
  updateCounts();
  if (state.filtered.length === 0) {
    els.results.innerHTML = renderEmpty();
    return;
  }
  if (state.view === "table") els.results.innerHTML = renderTable();
  else if (state.view === "sets") els.results.innerHTML = renderSets();
  else if (state.view === "compare") els.results.innerHTML = renderCompare();
  else els.results.innerHTML = renderGrid();
}

function selectedCards() {
  return state.cards.filter((card) => state.selected.has(card.id));
}

function csvCell(value) {
  return '"' + String(value ?? "").replaceAll('"', '""') + '"';
}

function exportRows() {
  return selectedCards().map((card) => ({
    name: card.name,
    quantity: card.quantity,
    set_code: card.setCode,
    set_name: card.setName,
    collector_number: card.collectorNumber,
    finish: card.finish,
    condition: card.condition,
    market_price: card.marketPrice ?? "",
    market_currency: card.marketCurrency,
    market_total: card.marketTotal ?? "",
    rarity: card.rarity,
    type_line: card.typeLine,
    colors: colorLabel(card.colorIdentity),
    marked: state.marked.has(card.id) ? "yes" : "no",
    scryfall_uri: card.scryfallUri,
  }));
}

function download(filename, type, text) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCsv() {
  const rows = exportRows();
  const headers = Object.keys(rows[0] || {});
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\\n");
  download("marvel-trade-binder-selection.csv", "text/csv", csv);
}

function downloadTxt() {
  const text = exportRows()
    .map((row) => [
      row.name + " x" + row.quantity,
      row.set_code + " #" + row.collector_number + " - " + row.set_name,
      row.finish + ", " + row.condition + ", " + row.rarity,
      "Market: " + row.market_price + " " + row.market_currency + " (" + row.market_total + " total)",
      "Marked: " + row.marked,
      row.scryfall_uri,
    ].join("\\n"))
    .join("\\n\\n---\\n\\n");
  download("marvel-trade-binder-selection.txt", "text/plain", text);
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function downloadXml() {
  const rows = exportRows();
  const body = rows
    .map(
      (row) => `  <card>${Object.entries(row)
        .map(([key, value]) => `\\n    <${key}>${xmlEscape(value)}</${key}>`)
        .join("")}\\n  </card>`,
    )
    .join("\\n");
  download("marvel-trade-binder-selection.xml", "application/xml", `<?xml version="1.0" encoding="UTF-8"?>\\n<tradeSelection>\\n${body}\\n</tradeSelection>\\n`);
}

function wireEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    applyFilters();
  });
  for (const [id, key] of [
    ["setFilter", "set"],
    ["rarityFilter", "rarity"],
    ["colorFilter", "color"],
    ["typeFilter", "type"],
    ["finishFilter", "finish"],
    ["conditionFilter", "condition"],
    ["selectionFilter", "selection"],
    ["sortSelect", "sort"],
  ]) {
    els[id].addEventListener("change", (event) => {
      state.filters[key] = event.target.value;
      applyFilters();
    });
  }
  document.querySelectorAll(".view-toggle button").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  els.resetFilters.addEventListener("click", () => {
    state.filters = { search: "", set: "all", rarity: "all", color: "all", type: "all", finish: "all", condition: "all", selection: "all", sort: "name-asc" };
    els.searchInput.value = "";
    els.setFilter.value = "all";
    els.rarityFilter.value = "all";
    els.colorFilter.value = "all";
    els.typeFilter.value = "all";
    els.finishFilter.value = "all";
    els.conditionFilter.value = "all";
    els.selectionFilter.value = "all";
    els.sortSelect.value = "name-asc";
    applyFilters();
  });
  els.selectVisible.addEventListener("click", () => {
    for (const card of state.filtered) state.selected.add(card.id);
    applyFilters();
  });
  els.selectMarked.addEventListener("click", () => {
    for (const cardId of state.marked) state.selected.add(cardId);
    applyFilters();
  });
  els.compareSelected.addEventListener("click", () => {
    state.compare = Array.from(state.selected).slice(0, 2);
    setView("compare");
  });
  els.clearSelection.addEventListener("click", () => {
    state.selected.clear();
    state.marked.clear();
    state.compare = [];
    applyFilters();
  });
  els.downloadCsv.addEventListener("click", downloadCsv);
  els.downloadTxt.addEventListener("click", downloadTxt);
  els.downloadXml.addEventListener("click", downloadXml);
  els.results.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const cardId = button.dataset.cardId;
    if (button.dataset.action === "select") toggleSelected(cardId);
    if (button.dataset.action === "mark") toggleMarked(cardId);
    if (button.dataset.action === "compare") toggleCompare(cardId);
  });
}

async function init() {
  for (const id of [
    "searchInput",
    "sortSelect",
    "setFilter",
    "rarityFilter",
    "colorFilter",
    "typeFilter",
    "finishFilter",
    "conditionFilter",
    "selectionFilter",
    "resetFilters",
    "selectVisible",
    "selectMarked",
    "compareSelected",
    "clearSelection",
    "downloadCsv",
    "downloadTxt",
    "downloadXml",
    "resultCount",
    "resultLabel",
    "selectedCount",
    "markedCount",
    "results",
  ]) {
    els[id] = byId(id);
  }

  const response = await fetch("./data/cards.json");
  const payload = await response.json();
  state.cards = payload.cards;
  initFilters();
  wireEvents();
  applyFilters();
}

init().catch((error) => {
  console.error(error);
  byId("results").innerHTML = '<div class="empty-state"><h2>Unable to load cards</h2><p>Refresh or check the shareable data file.</p></div>';
});

