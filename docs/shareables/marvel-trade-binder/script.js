const state = {
  cards: [],
  summary: null,
  filtered: [],
  view: "grid",
  selected: new Set(),
  marked: new Set(),
  previewId: null,
  filters: {
    search: "",
    binder: new Set(),
    set: new Set(),
    owner: new Set(),
    tradability: new Set(),
    color: new Set(),
    type: new Set(),
    rarity: new Set(),
    finish: new Set(),
    condition: new Set(),
    sort: "tradability-asc",
  },
  compare: {
    leftId: null,
    query: "",
    loading: false,
    error: "",
    results: [],
    selected: null,
    finish: "nonfoil",
    condition: "near_mint",
    altered: false,
    misprint: false,
  },
};

const els = {};
const filterLabels = {
  binder: "Binder",
  set: "Set",
  owner: "Owner",
  tradability: "Tradability",
  color: "Color",
  type: "Type",
  rarity: "Rarity",
  finish: "Finish",
  condition: "Condition",
};
const rarityRank = { mythic: 5, rare: 4, uncommon: 3, common: 2, special: 1 };
const conditionRank = { near_mint: 1, lightly_played: 2, moderately_played: 3, heavily_played: 4, damaged: 5, unknown: 9 };
const conditionFactors = { near_mint: 1, lightly_played: 0.9, moderately_played: 0.8, heavily_played: 0.65, damaged: 0.45 };
const colorNames = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green", Colorless: "Colorless" };

function byId(id) { return document.getElementById(id); }
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
function normalize(value) { return String(value || "").toLowerCase(); }
function colorLabel(colors) { return !colors || colors.length === 0 ? "Colorless" : colors.join(""); }
function compareValue(value) { return value === null || value === undefined ? -Infinity : Number(value); }
function cardById(cardId) { return state.cards.find((card) => card.id === cardId); }
function scryfallImage(card) {
  return card?.image_uris?.normal || card?.card_faces?.[0]?.image_uris?.normal || "";
}
function scryfallLargeImage(card) {
  return card?.image_uris?.large || card?.card_faces?.[0]?.image_uris?.large || scryfallImage(card);
}
function scryfallOracle(card) {
  if (card?.oracle_text) return card.oracle_text;
  return (card?.card_faces || []).map((face) => [face.name, face.oracle_text].filter(Boolean).join(": ")).filter(Boolean).join("\\n\\n");
}
function scryfallType(card) {
  if (card?.type_line) return card.type_line;
  return (card?.card_faces || []).map((face) => face.type_line).filter(Boolean).join(" // ");
}
function scryfallColors(card) {
  return card?.color_identity?.length ? card.color_identity : card?.colors || [];
}
function scryfallPrice(card, finish = "nonfoil") {
  if (!card?.prices) return null;
  if (finish === "foil") return Number(card.prices.usd_foil || card.prices.usd || 0) || null;
  if (finish === "etched") return Number(card.prices.usd_etched || card.prices.usd_foil || card.prices.usd || 0) || null;
  return Number(card.prices.usd || card.prices.usd_foil || 0) || null;
}
function adjustedCandidatePrice() {
  const base = scryfallPrice(state.compare.selected, state.compare.finish);
  if (base === null) return null;
  let factor = conditionFactors[state.compare.condition] || 1;
  if (state.compare.altered) factor *= 0.8;
  if (state.compare.misprint) factor *= 1;
  return Number((base * factor).toFixed(2));
}

function cardSearchText(card) {
  return [
    card.name,
    card.binderName,
    card.owner,
    card.setCode,
    card.setName,
    card.collectorNumber,
    card.typeLine,
    card.oracleText,
    card.rarity,
    card.finish,
    card.condition,
    card.tradability.label,
    card.tradability.reason,
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
function fillSelect(select, options, label) {
  select.innerHTML = "";
  select.append(new Option(label, ""));
  for (const [value, optionLabel] of options) select.append(new Option(optionLabel, value));
}
function initFilters() {
  fillSelect(els.binderFilter, uniqueOptions(state.cards, (card) => card.collectionId, (value, card) => card.binderName), "Choose binder");
  fillSelect(els.setFilter, uniqueOptions(state.cards, (card) => card.setCode, (value, card) => value + " - " + (card.setName || value)), "Choose set");
  fillSelect(els.ownerFilter, uniqueOptions(state.cards, (card) => card.owner), "Choose owner");
  fillSelect(els.tradabilityFilter, uniqueOptions(state.cards, (card) => card.tradability.key, (value, card) => card.tradability.label), "Choose tradability");
  fillSelect(els.colorFilter, [["W", "White"], ["U", "Blue"], ["B", "Black"], ["R", "Red"], ["G", "Green"], ["Colorless", "Colorless"]], "Choose color");
  fillSelect(els.typeFilter, uniqueOptions(state.cards, (card) => card.typeBucket), "Choose type");
  fillSelect(els.rarityFilter, uniqueOptions(state.cards, (card) => card.rarity), "Choose rarity");
  fillSelect(els.finishFilter, uniqueOptions(state.cards, (card) => card.finish), "Choose finish");
  fillSelect(els.conditionFilter, uniqueOptions(state.cards, (card) => card.condition), "Choose condition");
}

function optionLabel(key, value) {
  const card = state.cards.find((candidate) => {
    if (key === "binder") return candidate.collectionId === value;
    if (key === "set") return candidate.setCode === value;
    if (key === "tradability") return candidate.tradability.key === value;
    if (key === "color") return colorLabel(candidate.colorIdentity) === value;
    if (key === "type") return candidate.typeBucket === value;
    return candidate[key] === value;
  });
  if (!card) return value;
  if (key === "binder") return card.binderName;
  if (key === "set") return card.setCode + " - " + card.setName;
  if (key === "tradability") return card.tradability.label;
  if (key === "color") return colorNames[value] || value;
  return value;
}

function renderBinderShelf() {
  const buttons = [`<button type="button" data-binder-all aria-pressed="${state.filters.binder.size === 0}"><strong>All binders</strong><span>${state.summary.totalQuantity} cards</span></button>`];
  for (const binder of state.summary.binders) {
    buttons.push(`<button type="button" data-binder-id="${escapeHtml(binder.id)}" aria-pressed="${state.filters.binder.has(binder.id)}">
      <strong>${escapeHtml(binder.name)}</strong>
      <span>${binder.quantity} cards - ${escapeHtml(binder.setCodes.slice(0, 4).join(", "))}</span>
    </button>`);
  }
  els.binderShelf.innerHTML = buttons.join("");
}

function addFilter(key, value) {
  if (!value || !state.filters[key]) return;
  state.filters[key].add(value);
  applyFilters();
}
function removeFilter(key, value) {
  state.filters[key].delete(value);
  applyFilters();
}
function clearFilters() {
  for (const key of ["binder", "set", "owner", "tradability", "color", "type", "rarity", "finish", "condition"]) state.filters[key].clear();
  state.filters.search = "";
  state.filters.sort = "tradability-asc";
  els.searchInput.value = "";
  els.sortSelect.value = "tradability-asc";
  document.querySelectorAll("select[data-filter]").forEach((select) => { select.value = ""; });
  applyFilters();
}
function renderActiveFilters() {
  const chips = [];
  for (const key of ["binder", "set", "owner", "tradability", "color", "type", "rarity", "finish", "condition"]) {
    for (const value of state.filters[key]) {
      chips.push(`<span class="filter-chip">${filterLabels[key]}: ${escapeHtml(optionLabel(key, value))}
        <button type="button" aria-label="Remove ${escapeHtml(filterLabels[key])} ${escapeHtml(value)}" data-remove-filter="${key}" data-filter-value="${escapeHtml(value)}">x</button>
      </span>`);
    }
  }
  if (state.filters.search) chips.unshift(`<span class="filter-chip">Search: ${escapeHtml(state.filters.search)}
    <button type="button" aria-label="Clear search" data-clear-search>x</button>
  </span>`);
  els.activeFilters.innerHTML = chips.length ? chips.join("") : '<span class="filter-chip">No active filters</span>';
}

function multiMatch(set, value) {
  return set.size === 0 || set.has(value);
}
function colorMatch(card) {
  if (state.filters.color.size === 0) return true;
  const label = colorLabel(card.colorIdentity);
  if (state.filters.color.has(label)) return true;
  if (label === "Colorless" && state.filters.color.has("Colorless")) return true;
  return card.colorIdentity.some((color) => state.filters.color.has(color));
}
function matchesFilters(card) {
  const search = normalize(state.filters.search);
  if (search && !normalize(cardSearchText(card)).includes(search)) return false;
  if (!multiMatch(state.filters.binder, card.collectionId)) return false;
  if (!multiMatch(state.filters.set, card.setCode)) return false;
  if (!multiMatch(state.filters.owner, card.owner)) return false;
  if (!multiMatch(state.filters.tradability, card.tradability.key)) return false;
  if (!colorMatch(card)) return false;
  if (!multiMatch(state.filters.type, card.typeBucket)) return false;
  if (!multiMatch(state.filters.rarity, card.rarity)) return false;
  if (!multiMatch(state.filters.finish, card.finish)) return false;
  if (!multiMatch(state.filters.condition, card.condition)) return false;
  return true;
}
function sortCards(cards) {
  return [...cards].sort((a, b) => {
    switch (state.filters.sort) {
      case "set-asc":
        return a.setCode.localeCompare(b.setCode) || a.collectorSort - b.collectorSort || a.name.localeCompare(b.name);
      case "market-desc":
        return compareValue(b.marketPrice) - compareValue(a.marketPrice) || a.name.localeCompare(b.name);
      case "market-asc":
        return compareValue(a.marketPrice) - compareValue(b.marketPrice) || a.name.localeCompare(b.name);
      case "quantity-desc":
        return b.quantity - a.quantity || a.name.localeCompare(b.name);
      case "owner-asc":
        return a.owner.localeCompare(b.owner) || a.binderName.localeCompare(b.binderName) || a.name.localeCompare(b.name);
      case "rarity-desc":
        return (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0) || a.name.localeCompare(b.name);
      case "tradability-asc":
        return a.tradability.rank - b.tradability.rank || b.tradability.personalValue - a.tradability.personalValue || a.name.localeCompare(b.name);
      case "name-asc":
      default:
        return a.name.localeCompare(b.name);
    }
  });
}
function applyFilters() {
  state.filtered = sortCards(state.cards.filter(matchesFilters));
  renderBinderShelf();
  renderActiveFilters();
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
  state.selected.has(cardId) ? state.selected.delete(cardId) : state.selected.add(cardId);
  applyFilters();
}
function toggleMarked(cardId) {
  state.marked.has(cardId) ? state.marked.delete(cardId) : state.marked.add(cardId);
  applyFilters();
}
function startCompare(cardId) {
  state.compare.leftId = cardId;
  setView("compare");
}
function openPreview(cardId) {
  state.previewId = cardId;
  renderPreview();
}
function closePreview() {
  state.previewId = null;
  els.previewModal.hidden = true;
  els.previewModal.innerHTML = "";
}

function cardShell(card) {
  const selected = state.selected.has(card.id);
  const marked = state.marked.has(card.id);
  const tags = [card.owner, card.rarity, card.finish, card.condition, card.typeBucket].filter(Boolean);
  return `<article class="card${selected ? " is-selected" : ""}${marked ? " is-marked" : ""}" data-card-id="${escapeHtml(card.id)}">
    <div class="card-media">
      <button type="button" data-action="preview" data-card-id="${escapeHtml(card.id)}" aria-label="Preview ${escapeHtml(card.name)}">
        ${card.imageUrl ? `<img loading="lazy" src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.name)} card image">` : `<span class="no-image">${escapeHtml(card.name)}</span>`}
      </button>
      <div class="card-pills">
        <span class="pill">x${card.quantity}</span>
        <span class="pill ${escapeHtml(card.tradability.key)}">${escapeHtml(card.tradability.label)}</span>
      </div>
    </div>
    <div class="card-body">
      <div class="card-title">
        <h2><button type="button" data-action="preview" data-card-id="${escapeHtml(card.id)}">${escapeHtml(card.name)}</button></h2>
        <span class="market">${money(card.marketPrice, card.marketCurrency)}</span>
      </div>
      <div class="meta-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <p class="trade-note">${escapeHtml(card.binderName)} - ${escapeHtml(card.setCode)} #${escapeHtml(card.collectorNumber)} - ${escapeHtml(card.tradability.reason)}</p>
      <p class="oracle">${escapeHtml(card.typeLine)}${card.oracleText ? "\\n" + escapeHtml(card.oracleText) : ""}</p>
      <div class="tag-row">${card.publicTags.slice(0, 5).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="card-actions">
        <button type="button" data-action="select" data-card-id="${escapeHtml(card.id)}" class="${selected ? "is-on" : ""}">${selected ? "Selected" : "Select"}</button>
        <button type="button" data-action="mark" data-card-id="${escapeHtml(card.id)}" class="${marked ? "is-on" : ""}">${marked ? "Marked" : "Mark"}</button>
        <button type="button" data-action="compare" data-card-id="${escapeHtml(card.id)}">Compare</button>
        <button type="button" data-action="preview" data-card-id="${escapeHtml(card.id)}">View</button>
      </div>
    </div>
  </article>`;
}
function renderGrid(cards = state.filtered) {
  return `<div class="grid-view">${cards.map(cardShell).join("")}</div>`;
}
function renderTable() {
  return `<div class="table-wrap"><table><thead><tr>
    <th>Name</th><th>Binder</th><th>Owner</th><th>Tradability</th><th>Set</th><th>Qty</th><th>Market</th><th>Type</th><th>Actions</th>
  </tr></thead><tbody>${state.filtered.map((card) => `<tr>
    <td><strong>${escapeHtml(card.name)}</strong><br>${escapeHtml(card.rarity)}</td>
    <td>${escapeHtml(card.binderName)}</td>
    <td>${escapeHtml(card.owner)}</td>
    <td>${escapeHtml(card.tradability.label)}<br>${escapeHtml(card.tradability.reason)}</td>
    <td>${escapeHtml(card.setCode)} #${escapeHtml(card.collectorNumber)}<br>${escapeHtml(card.setName)}</td>
    <td>${card.quantity}</td>
    <td>${money(card.marketPrice, card.marketCurrency)}</td>
    <td>${escapeHtml(card.typeLine)}</td>
    <td><div class="table-actions">
      <button type="button" data-action="select" data-card-id="${escapeHtml(card.id)}">${state.selected.has(card.id) ? "Selected" : "Select"}</button>
      <button type="button" data-action="mark" data-card-id="${escapeHtml(card.id)}">${state.marked.has(card.id) ? "Marked" : "Mark"}</button>
      <button type="button" data-action="compare" data-card-id="${escapeHtml(card.id)}">Compare</button>
      <button type="button" data-action="preview" data-card-id="${escapeHtml(card.id)}">View</button>
    </div></td>
  </tr>`).join("")}</tbody></table></div>`;
}
function setRow(card) {
  return `<div class="set-row">
    <div><strong>${escapeHtml(card.name)}</strong><span>${escapeHtml(card.typeLine || card.rarity || "")}</span></div>
    <div><strong>${escapeHtml(card.binderName)}</strong><span>${escapeHtml(card.owner)}</span></div>
    <div><strong>${escapeHtml(card.tradability.label)}</strong><span>${escapeHtml(card.tradability.reason)}</span></div>
    <div><strong>${money(card.marketPrice, card.marketCurrency)}</strong><span>x${card.quantity} - ${escapeHtml(card.finish)}</span></div>
    <div class="set-row-actions">
      <button type="button" data-action="select" data-card-id="${escapeHtml(card.id)}">${state.selected.has(card.id) ? "Selected" : "Select"}</button>
      <button type="button" data-action="mark" data-card-id="${escapeHtml(card.id)}">${state.marked.has(card.id) ? "Marked" : "Mark"}</button>
      <button type="button" data-action="compare" data-card-id="${escapeHtml(card.id)}">Compare</button>
      <button type="button" data-action="preview" data-card-id="${escapeHtml(card.id)}">View</button>
    </div>
  </div>`;
}
function renderSets() {
  const groups = new Map();
  for (const card of state.filtered) {
    const key = card.setCode || "UNK";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(card);
  }
  const sections = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([setCode, cards]) => {
    const quantity = cards.reduce((total, card) => total + card.quantity, 0);
    const value = cards.reduce((total, card) => total + (card.marketTotal || 0), 0);
    const owners = Array.from(new Set(cards.map((card) => card.owner))).join(", ");
    return `<section class="set-group"><div class="set-header">
      <h2>${escapeHtml(setCode)} - ${escapeHtml(cards[0]?.setName || setCode)}</h2>
      <p>${cards.length} rows - ${quantity} cards - ${owners} - ${money(value)}</p>
    </div><div class="set-list">${cards.map(setRow).join("")}</div></section>`;
  });
  return `<div class="set-view">${sections.join("")}</div>`;
}
function detailList(card) {
  const rows = [
    ["Binder", card.binderName],
    ["Owner", card.owner],
    ["Tradability", card.tradability.label + " - " + card.tradability.reason],
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
  ];
  return `<dl class="detail-list">${rows.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>`;
}
function ownedCompareCard(card) {
  if (!card) return `<article class="compare-card"><div></div><div><h2>Select one of Kyle's cards</h2></div></article>`;
  return `<article class="compare-card">
    ${card.imageUrl ? `<img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.name)} card image">` : `<div class="no-image">${escapeHtml(card.name)}</div>`}
    <div><h2>${escapeHtml(card.name)}</h2><p class="oracle">${escapeHtml(card.oracleText || card.typeLine)}</p>${detailList(card)}${card.scryfallUri ? `<p><a href="${escapeHtml(card.scryfallUri)}" target="_blank" rel="noreferrer">Scryfall</a></p>` : ""}</div>
  </article>`;
}
function candidateCompareCard() {
  const card = state.compare.selected;
  if (!card) return `<article class="compare-card"><div></div><div><h2>Search Scryfall</h2><p class="trade-note">Choose a print to compare against the owned card.</p></div></article>`;
  const adjusted = adjustedCandidatePrice();
  return `<article class="compare-card">
    ${scryfallImage(card) ? `<img src="${escapeHtml(scryfallLargeImage(card))}" alt="${escapeHtml(card.name)} card image">` : ""}
    <div><h2>${escapeHtml(card.name)}</h2><p class="oracle">${escapeHtml(scryfallOracle(card) || scryfallType(card))}</p>
      <dl class="detail-list">
        <dt>Set</dt><dd>${escapeHtml((card.set || "").toUpperCase())} #${escapeHtml(card.collector_number || "")} - ${escapeHtml(card.set_name || "")}</dd>
        <dt>Finish</dt><dd>${escapeHtml(state.compare.finish)}</dd>
        <dt>Condition</dt><dd>${escapeHtml(state.compare.condition)}</dd>
        <dt>Market</dt><dd>${money(scryfallPrice(card, state.compare.finish))} / adjusted ${money(adjusted)}</dd>
        <dt>Rarity</dt><dd>${escapeHtml(card.rarity || "")}</dd>
        <dt>Colors</dt><dd>${escapeHtml(colorLabel(scryfallColors(card)))}</dd>
        <dt>Type</dt><dd>${escapeHtml(scryfallType(card))}</dd>
      </dl>
      ${card.scryfall_uri ? `<p><a href="${escapeHtml(card.scryfall_uri)}" target="_blank" rel="noreferrer">Scryfall</a></p>` : ""}
    </div>
  </article>`;
}
function renderScryfallTools() {
  const results = state.compare.results.map((card, index) => `<button type="button" class="scryfall-result" data-scryfall-index="${index}">
    ${scryfallImage(card) ? `<img loading="lazy" src="${escapeHtml(scryfallImage(card))}" alt="">` : "<span></span>"}
    <span><strong>${escapeHtml(card.name)}</strong><span>${escapeHtml((card.set || "").toUpperCase())} #${escapeHtml(card.collector_number || "")} - ${escapeHtml(card.rarity || "")} - ${money(scryfallPrice(card))}</span></span>
    <span>${state.compare.selected?.id === card.id ? "On" : "Use"}</span>
  </button>`).join("");
  return `<div class="compare-tools">
    <div class="compare-search">
      <input id="scryfallQuery" type="search" value="${escapeHtml(state.compare.query)}" placeholder="Search all Scryfall cards">
      <button id="scryfallSearch" type="button">${state.compare.loading ? "Searching" : "Search"}</button>
    </div>
    ${state.compare.error ? `<p class="trade-note">${escapeHtml(state.compare.error)}</p>` : ""}
    <div class="scryfall-results">${results || '<p class="trade-note">No Scryfall results selected yet.</p>'}</div>
    <div class="candidate-controls">
      <label>Finish<select id="candidateFinish"><option value="nonfoil">Nonfoil</option><option value="foil">Foil</option><option value="etched">Etched</option></select></label>
      <label>Condition<select id="candidateCondition"><option value="near_mint">Near mint</option><option value="lightly_played">Lightly played</option><option value="moderately_played">Moderately played</option><option value="heavily_played">Heavily played</option><option value="damaged">Damaged</option></select></label>
    </div>
    <div class="check-row">
      <label><input id="candidateAltered" type="checkbox" ${state.compare.altered ? "checked" : ""}> Altered</label>
      <label><input id="candidateMisprint" type="checkbox" ${state.compare.misprint ? "checked" : ""}> Misprint</label>
    </div>
  </div>`;
}
function comparisonBreakdown(left) {
  const right = state.compare.selected;
  if (!left || !right) return "";
  const rows = [
    ["Market", money(left.marketPrice, left.marketCurrency), money(adjustedCandidatePrice())],
    ["Rarity", left.rarity || "n/a", right.rarity || "n/a"],
    ["Mana value", left.manaValue ?? "n/a", right.cmc ?? "n/a"],
    ["Colors", colorLabel(left.colorIdentity), colorLabel(scryfallColors(right))],
    ["Condition", left.condition, state.compare.condition],
    ["Finish", left.finish, state.compare.finish],
    ["Tradability", left.tradability.label, state.compare.altered || state.compare.misprint ? "Special handling" : "Visitor card"],
  ];
  return `<div class="comparison-breakdown">${rows.map(([label, a, b]) => `<div class="comparison-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(a)}</span><span>${escapeHtml(b)}</span></div>`).join("")}</div>`;
}
function renderCompare() {
  const left = cardById(state.compare.leftId) || state.filtered[0] || state.cards[0];
  if (left && !state.compare.leftId) state.compare.leftId = left.id;
  return `<div class="compare-view">
    <div class="compare-grid">${ownedCompareCard(left)}${candidateCompareCard()}</div>
    ${renderScryfallTools()}
    ${comparisonBreakdown(left)}
  </div>`;
}
function renderEmpty() { return byId("emptyTemplate").innerHTML; }
function updateCounts() {
  els.resultCount.textContent = String(state.filtered.length);
  els.resultLabel.textContent = state.filtered.length === 1 ? "card shown" : "cards shown";
  els.selectedCount.textContent = String(state.selected.size);
  els.markedCount.textContent = String(state.marked.size);
  const hasSelected = state.selected.size > 0;
  els.downloadCsv.disabled = !hasSelected;
  els.downloadTxt.disabled = !hasSelected;
  els.downloadXml.disabled = !hasSelected;
  els.compareSelected.disabled = state.selected.size < 1;
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
  syncCompareControls();
}
function renderPreview() {
  const card = cardById(state.previewId);
  if (!card) return closePreview();
  els.previewModal.hidden = false;
  els.previewModal.innerHTML = `<div class="preview-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(card.name)} preview">
    <div>${card.largeImageUrl || card.imageUrl ? `<img class="preview-image" src="${escapeHtml(card.largeImageUrl || card.imageUrl)}" alt="${escapeHtml(card.name)} card image">` : `<div class="no-image">${escapeHtml(card.name)}</div>`}</div>
    <div><button class="preview-close" type="button" data-action="close-preview">Close</button><h2>${escapeHtml(card.name)}</h2><p class="oracle">${escapeHtml(card.oracleText || card.typeLine)}</p>${detailList(card)}</div>
  </div>`;
}

function selectedCards() { return state.cards.filter((card) => state.selected.has(card.id)); }
function csvCell(value) { return '"' + String(value ?? "").replaceAll('"', '""') + '"'; }
function exportRows() {
  return selectedCards().map((card) => ({
    name: card.name,
    quantity: card.quantity,
    owner: card.owner,
    tradability: card.tradability.label,
    tradability_reason: card.tradability.reason,
    binder: card.binderName,
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
  download("owned-card-trade-binder-selection.csv", "text/csv", [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\\n"));
}
function downloadTxt() {
  const text = exportRows().map((row) => [
    row.name + " x" + row.quantity,
    row.owner + " - " + row.tradability + " - " + row.tradability_reason,
    row.binder + " - " + row.set_code + " #" + row.collector_number,
    row.finish + ", " + row.condition + ", " + row.rarity,
    "Market: " + row.market_price + " " + row.market_currency + " (" + row.market_total + " total)",
    row.scryfall_uri,
  ].join("\\n")).join("\\n\\n---\\n\\n");
  download("owned-card-trade-binder-selection.txt", "text/plain", text);
}
function xmlEscape(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
function downloadXml() {
  const body = exportRows().map((row) => `  <card>${Object.entries(row).map(([key, value]) => `\\n    <${key}>${xmlEscape(value)}</${key}>`).join("")}\\n  </card>`).join("\\n");
  download("owned-card-trade-binder-selection.xml", "application/xml", `<?xml version="1.0" encoding="UTF-8"?>\\n<tradeSelection>\\n${body}\\n</tradeSelection>\\n`);
}

let scryfallTimer = null;
function buildScryfallQuery(query) {
  const trimmed = query.trim();
  if (/[:!<>=]/.test(trimmed)) return trimmed;
  const safe = trimmed.replace(/"/g, "");
  if (/\s/.test(safe)) return `name:"${safe}"`;
  return trimmed
    .split(/\s+/)
    .map((part) => "name:" + part)
    .join(" ");
}
async function searchScryfall() {
  const query = state.compare.query.trim();
  if (query.length < 2) {
    state.compare.results = [];
    state.compare.error = "";
    render();
    return;
  }
  state.compare.loading = true;
  state.compare.error = "";
  render();
  try {
    const response = await fetch("https://api.scryfall.com/cards/search?unique=prints&order=name&q=" + encodeURIComponent(buildScryfallQuery(query)));
    if (response.status === 404) {
      state.compare.results = [];
      state.compare.error = "No Scryfall cards matched.";
    } else if (!response.ok) {
      throw new Error("Scryfall returned " + response.status);
    } else {
      const payload = await response.json();
      state.compare.results = (payload.data || []).slice(0, 24);
      state.compare.error = "";
    }
  } catch (error) {
    state.compare.error = "Scryfall search failed. Try again in a moment.";
    state.compare.results = [];
  } finally {
    state.compare.loading = false;
    render();
  }
}
function debounceScryfallSearch() {
  clearTimeout(scryfallTimer);
  scryfallTimer = setTimeout(searchScryfall, 450);
}
function syncCompareControls() {
  const finish = byId("candidateFinish");
  const condition = byId("candidateCondition");
  if (finish) finish.value = state.compare.finish;
  if (condition) condition.value = state.compare.condition;
}

function wireEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    applyFilters();
  });
  els.sortSelect.addEventListener("change", (event) => {
    state.filters.sort = event.target.value;
    applyFilters();
  });
  document.querySelectorAll("select[data-filter]").forEach((select) => {
    select.addEventListener("change", (event) => {
      addFilter(event.target.dataset.filter, event.target.value);
      event.target.value = "";
    });
  });
  document.querySelectorAll(".view-toggle button").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  els.resetFilters.addEventListener("click", clearFilters);
  els.binderShelf.addEventListener("click", (event) => {
    const all = event.target.closest("[data-binder-all]");
    const button = event.target.closest("[data-binder-id]");
    if (all) {
      state.filters.binder.clear();
      applyFilters();
      return;
    }
    if (button) {
      const id = button.dataset.binderId;
      state.filters.binder.has(id) ? state.filters.binder.delete(id) : state.filters.binder.add(id);
      applyFilters();
    }
  });
  els.activeFilters.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-filter]");
    if (remove) removeFilter(remove.dataset.removeFilter, remove.dataset.filterValue);
    if (event.target.closest("[data-clear-search]")) {
      state.filters.search = "";
      els.searchInput.value = "";
      applyFilters();
    }
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
    state.compare.leftId = Array.from(state.selected)[0] || state.filtered[0]?.id || null;
    setView("compare");
  });
  els.clearSelection.addEventListener("click", () => {
    state.selected.clear();
    state.marked.clear();
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
    if (button.dataset.action === "compare") startCompare(cardId);
    if (button.dataset.action === "preview") openPreview(cardId);
  });
  els.results.addEventListener("input", (event) => {
    if (event.target.id === "scryfallQuery") {
      state.compare.query = event.target.value;
      debounceScryfallSearch();
    }
  });
  els.results.addEventListener("click", (event) => {
    if (event.target.closest("#scryfallSearch")) searchScryfall();
    const result = event.target.closest("[data-scryfall-index]");
    if (result) {
      state.compare.selected = state.compare.results[Number(result.dataset.scryfallIndex)];
      render();
    }
  });
  els.results.addEventListener("change", (event) => {
    if (event.target.id === "candidateFinish") state.compare.finish = event.target.value;
    if (event.target.id === "candidateCondition") state.compare.condition = event.target.value;
    if (event.target.id === "candidateAltered") state.compare.altered = event.target.checked;
    if (event.target.id === "candidateMisprint") state.compare.misprint = event.target.checked;
    render();
  });
  els.previewModal.addEventListener("click", (event) => {
    if (event.target === els.previewModal || event.target.closest("[data-action='close-preview']")) closePreview();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.previewModal.hidden) closePreview();
  });
}

async function init() {
  for (const id of [
    "binderShelf", "searchInput", "sortSelect", "binderFilter", "setFilter", "ownerFilter", "tradabilityFilter", "colorFilter", "typeFilter", "rarityFilter", "finishFilter", "conditionFilter", "resetFilters", "activeFilters", "selectVisible", "selectMarked", "compareSelected", "clearSelection", "downloadCsv", "downloadTxt", "downloadXml", "resultCount", "resultLabel", "selectedCount", "markedCount", "results", "previewModal",
  ]) els[id] = byId(id);

  const response = await fetch("./data/cards.json");
  const payload = await response.json();
  state.summary = payload.summary;
  state.cards = payload.cards;
  initFilters();
  wireEvents();
  applyFilters();
}

init().catch((error) => {
  console.error(error);
  byId("results").innerHTML = '<div class="empty-state"><h2>Unable to load cards</h2><p>Refresh or check the shareable data file.</p></div>';
});

