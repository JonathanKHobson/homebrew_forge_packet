const tableAidDefinitions = window.tableAidData.definitions;
const tableAidSheets = window.tableAidData.sheets;
const root = document.querySelector("#print-root");

function makeEl(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function renderCover(sheet) {
  const page = makeEl("section", "cover-page");
  page.appendChild(makeEl("p", "eyebrow", "UNOFFICIAL TABLE AID - NOT FOR SALE"));
  page.appendChild(makeEl("h1", "", sheet.title));
  page.appendChild(makeEl("p", "subtitle", sheet.subtitle));

  const grid = makeEl("div", "cover-grid");
  [
    ["Duplex pairs", "Print pages 2-11 double-sided: 2/3, 4/5, 6/7, 8/9, and 10/11 share paper."],
    ["Token cards", "Pages 2-7 are aligned 3x3 card fronts/backs for sleeving with bulk cards."],
    ["Reminders", "Pages 8-9 are board-state reminder cards for messy turns."],
    ["Labels", "Pages 10-11 are dense front/back chips for counters, stats, abilities, and state."]
  ].forEach(([title, body]) => {
    const block = makeEl("article", "cover-block");
    block.appendChild(makeEl("h2", "", title));
    block.appendChild(makeEl("p", "", body));
    grid.appendChild(block);
  });

  page.appendChild(grid);
  page.appendChild(makeEl("p", "fine-print", "No official Magic card frames, logos, or token art are used. For private casual play only."));
  return page;
}

function renderCard(id) {
  const data = tableAidDefinitions[id];
  const card = makeEl("article", `aid-card accent-${data.accent || "gray"}`);
  card.dataset.cardId = id;

  const top = makeEl("div", "card-top");
  top.appendChild(makeEl("span", "card-kind", data.kind));
  top.appendChild(makeEl("span", "card-tag", data.tags.join(" / ")));
  card.appendChild(top);

  card.appendChild(makeEl("h2", "", data.title));
  card.appendChild(makeEl("p", "type-line", data.subtitle));
  card.appendChild(makeEl("p", "rules", data.text));

  if (data.writeLine) {
    card.appendChild(makeEl("div", "write-line", data.writeLine));
  }

  const bottom = makeEl("div", "card-bottom");
  bottom.appendChild(makeEl("span", "", "UNOFFICIAL TABLE AID"));
  if (data.pt) bottom.appendChild(makeEl("strong", "pt", data.pt));
  card.appendChild(bottom);

  return card;
}

function renderTokenSheet(sheet, pageNumber) {
  const page = makeEl("section", "sheet-page");
  page.dataset.sheetTitle = sheet.title;
  page.dataset.pageNumber = String(pageNumber);

  sheet.cards.forEach((id) => {
    page.appendChild(renderCard(id));
  });

  return page;
}

function renderCounterSheet(sheet) {
  const page = makeEl("section", "counter-page");

  const titleCard = makeEl("article", "counter-info");
  titleCard.appendChild(makeEl("p", "eyebrow", "UNOFFICIAL TABLE AID"));
  titleCard.appendChild(makeEl("h2", "", sheet.title));
  titleCard.appendChild(makeEl("p", "", sheet.note));
  titleCard.appendChild(makeEl("p", "", "Suggested print: one copy now, then reprint only if your counter pile is not enough."));
  page.appendChild(titleCard);

  const chipLabels = [
    "+1/+1", "+1/+1", "+1/+1", "+1/+1", "+1/+1", "+1/+1",
    "-1/-1", "-1/-1", "charge", "quest", "acorn", "loyalty",
    "rad", "rad", "copy", "copy", "death", "life",
    "tapped", "exile", "grave", "monarch", "city", "blank"
  ];

  const grid = makeEl("div", "counter-grid");
  chipLabels.forEach((label) => {
    grid.appendChild(makeEl("div", "counter-chip", label));
  });
  page.appendChild(grid);

  const strips = makeEl("div", "strip-grid");
  ["+1/+1 counters", "quest/acorn counters", "radiation counters", "commander damage", "graveyard targets", "blank labels"].forEach((label) => {
    const strip = makeEl("div", "counter-strip");
    strip.appendChild(makeEl("span", "", label));
    strip.appendChild(makeEl("b", "", "1 2 3 4 5 6 7 8 9 10"));
    strips.appendChild(strip);
  });
  page.appendChild(strips);

  return page;
}

function renderLabelSheet(sheet) {
  const page = makeEl("section", "label-page");
  page.dataset.sheetTitle = sheet.title;

  sheet.labels.forEach((label) => {
    const chip = makeEl("div", "mini-label");
    if (label.length >= 13) chip.classList.add("is-very-long");
    else if (label.length >= 9) chip.classList.add("is-long");
    chip.appendChild(makeEl("span", "", label));
    page.appendChild(chip);
  });

  return page;
}

tableAidSheets.forEach((sheet, index) => {
  if (sheet.type === "cover") {
    root.appendChild(renderCover(sheet));
    return;
  }

  if (sheet.type === "label-sheet") {
    root.appendChild(renderLabelSheet(sheet));
    return;
  }

  if (sheet.type === "counter-sheet") {
    root.appendChild(renderCounterSheet(sheet));
    return;
  }

  root.appendChild(renderTokenSheet(sheet, index + 1));
});

document.documentElement.dataset.rendered = "true";
