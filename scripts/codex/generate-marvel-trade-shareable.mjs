#!/usr/bin/env node
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const shareableSlug = "marvel-trade-binder";
const outputDir = path.join(repoRoot, "docs", "shareables", shareableSlug);
const dataDir = path.join(outputDir, "data");
const localCardImageDir = path.join(outputDir, "assets", "local-card-images");
const localCardImages = new Map();
const generatedAt = new Date().toISOString();

const deckTradeRules = {
  avengers: {
    deckId: "avengers-assemble",
    label: "Avengers Assemble deck",
  },
  scrappy: {
    deckId: "scrappy-survivors",
    label: "Scrappy Survivors deck",
  },
};

const setFamilyDefinitions = [
  {
    id: "marvel",
    name: "Marvel Universes Beyond",
    codes: ["MAR", "MSC", "MSH", "SPM"],
    matchNames: ["marvel", "spider-man"],
  },
  {
    id: "final-fantasy",
    name: "Final Fantasy Universes Beyond",
    codes: ["FIN", "FIC"],
    matchNames: ["final fantasy"],
  },
  {
    id: "fallout",
    name: "Fallout Universes Beyond",
    codes: ["PIP"],
    matchNames: ["fallout"],
  },
  {
    id: "assassins-creed",
    name: "Assassin's Creed Universes Beyond",
    codes: ["ACR"],
    matchNames: ["assassin"],
  },
  {
    id: "avatar",
    name: "Avatar: The Last Airbender Universes Beyond",
    codes: ["TLA"],
    matchNames: ["avatar"],
  },
  {
    id: "middle-earth",
    name: "Middle-earth Universes Beyond",
    codes: ["LTC", "HOB"],
    matchNames: ["middle-earth", "hobbit"],
  },
  {
    id: "tmnt",
    name: "Teenage Mutant Ninja Turtles Universes Beyond",
    codes: ["PZA", "TMC", "TMT"],
    matchNames: ["teenage mutant ninja turtles"],
  },
  {
    id: "bloomburrow",
    name: "Bloomburrow",
    codes: ["BLB", "BLC"],
    matchNames: ["bloomburrow"],
  },
  {
    id: "strixhaven",
    name: "Strixhaven",
    codes: ["C21", "SOA", "SOC", "SOS", "STX"],
    matchNames: ["strixhaven"],
  },
  {
    id: "dominaria",
    name: "Dominaria",
    codes: ["DMR", "DMU", "DOM"],
    matchNames: ["dominaria"],
  },
  {
    id: "modern-horizons",
    name: "Modern Horizons",
    codes: ["H2R", "M3C", "MH1", "MH2", "MH3"],
    matchNames: ["modern horizons"],
  },
  {
    id: "karlov-manor",
    name: "Murders at Karlov Manor",
    codes: ["MKC", "MKM"],
    matchNames: ["karlov manor"],
  },
  {
    id: "eldraine",
    name: "Wilds of Eldraine",
    codes: ["WOE", "WOT"],
    matchNames: ["eldraine"],
  },
  {
    id: "zendikar",
    name: "Zendikar",
    codes: ["BFZ", "WWK", "ZEN", "ZNC", "ZNR"],
    matchNames: ["zendikar"],
  },
  {
    id: "ravnica",
    name: "Ravnica",
    codes: ["CLU", "DGM", "GRN", "RAV", "RNA", "RTR", "RVR"],
    matchNames: ["ravnica"],
  },
  {
    id: "alara",
    name: "Alara",
    codes: ["ALA", "ARB"],
    matchNames: ["alara"],
  },
  {
    id: "tarkir",
    name: "Tarkir",
    codes: ["FRF", "KTK", "TDC", "TDM"],
    matchNames: ["tarkir", "khans", "fate reforged"],
  },
  {
    id: "duskmourn",
    name: "Duskmourn",
    codes: ["DSC", "DSK"],
    matchNames: ["duskmourn"],
  },
  {
    id: "edge-of-eternities",
    name: "Edge of Eternities",
    codes: ["EOC", "EOE"],
    matchNames: ["edge of eternities"],
  },
  {
    id: "lorwyn",
    name: "Lorwyn",
    codes: ["ECC", "ECL", "LRW"],
    matchNames: ["lorwyn"],
  },
  {
    id: "ixalan",
    name: "Ixalan",
    codes: ["LCC", "LCI", "XLN"],
    matchNames: ["ixalan"],
  },
  {
    id: "new-capenna",
    name: "New Capenna",
    codes: ["NCC", "SNC"],
    matchNames: ["capenna"],
  },
  {
    id: "kamigawa",
    name: "Kamigawa",
    codes: ["NEC", "NEO"],
    matchNames: ["kamigawa"],
  },
  {
    id: "outlaws-thunder-junction",
    name: "Outlaws of Thunder Junction",
    codes: ["OTC", "OTJ"],
    matchNames: ["thunder junction"],
  },
  {
    id: "brothers-war",
    name: "The Brothers' War",
    codes: ["BRO", "BRR"],
    matchNames: ["brothers' war", "brothers war"],
  },
  {
    id: "amonkhet",
    name: "Amonkhet",
    codes: ["AKH"],
    matchNames: ["amonkhet"],
  },
  {
    id: "innistrad",
    name: "Innistrad",
    codes: ["EMN", "INR", "MIC"],
    matchNames: ["innistrad", "midnight hunt", "eldritch moon"],
  },
  {
    id: "phyrexia",
    name: "Phyrexia",
    codes: ["ONE"],
    matchNames: ["phyrexia"],
  },
  {
    id: "core-sets",
    name: "Core Sets and Foundations",
    codes: ["10E", "FDN", "M10", "M11", "M12", "M13", "M14", "M15", "M19", "M20", "M21", "ORI", "W16", "W17"],
    matchNames: ["core set", "magic 20", "magic 201", "magic origins", "foundations", "tenth edition", "welcome deck"],
  },
  {
    id: "commander",
    name: "Commander and Multiplayer",
    codes: ["AFC", "BBD", "CLB", "CM2", "CMD", "CMR", "CNS", "LTC", "PCA"],
    matchNames: ["commander", "battlebond", "conspiracy", "planechase"],
  },
  {
    id: "masters",
    name: "Masters and Reprints",
    codes: ["2XM", "EMA", "IMA", "MM2", "MM3", "TSR", "UMA"],
    matchNames: ["masters", "remastered"],
  },
  {
    id: "classic-magic",
    name: "Classic Magic",
    codes: ["3ED", "ATH", "BRB", "DDE", "DDG", "DDQ", "EXO", "INV", "ITP", "JVC", "MIR", "MMQ", "PCY", "PLC", "POR", "ROE", "SHM", "TMP", "TOR", "TSP", "UDS", "UGL", "ULG", "USG", "WC98", "WC99"],
    matchNames: ["duel decks", "world championship", "portal", "urza", "tempest", "torment", "time spiral"],
  },
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((value) => value.trim() !== ""));
}

function csvRowsToObjects(text) {
  const [headers, ...rows] = parseCsv(text);
  if (!headers) return [];
  return rows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])),
  );
}

function escapeControlCharacters(value) {
  return String(value).replace(/[\u0000-\u001f]/g, (char) => {
    if (char === "\n") return "\\n";
    if (char === "\r") return "";
    if (char === "\t") return "\\t";
    return " ";
  });
}

function parseMaybeJson(value) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    try {
      return JSON.parse(escapeControlCharacters(value));
    } catch {
      return {};
    }
  }
}

function parseBoolean(value) {
  return String(value).toLowerCase() === "true";
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNonEmpty(...values) {
  return values.find((value) => value !== null && value !== undefined && String(value).trim() !== "") ?? "";
}

function normalizeToken(value, fallback = "unknown") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function splitTags(value) {
  return String(value || "")
    .split(";")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function publicTags(tags) {
  const noisy = new Set([
    "owned",
    "manabox",
    "magic-marvel",
    "universes-beyond",
    "owned-card-scan",
    "partner-owned",
  ]);
  return tags
    .filter((tag) => !noisy.has(tag))
    .filter((tag) => !tag.startsWith("batch-"))
    .filter((tag) => !tag.startsWith("set-"))
    .filter((tag) => !tag.startsWith("rarity-"))
    .filter((tag) => !tag.startsWith("owner-"))
    .slice(0, 12);
}

function money(value, currency = "USD") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value));
}

function getScryfallRecord(sourceRow) {
  return sourceRow.scryfall || sourceRow.enrichment || {};
}

function publicImageUri(value) {
  const uri = String(value || "");
  return /^https?:\/\//i.test(uri) || uri.startsWith("./") ? uri : "";
}

function apiAssetPath(value) {
  const uri = String(value || "");
  if (!uri.startsWith("/api/asset?")) return "";
  try {
    const parsed = new URL(uri, "http://homebrew-forge.local");
    return parsed.searchParams.get("path") || "";
  } catch {
    return "";
  }
}

function sourceLocalPhotoPath(sourceRow, size = "normal") {
  const localPreview = sourceRow?.localPreview || {};
  const sizedPath = apiAssetPath(localPreview?.imageUris?.[size]) || apiAssetPath(sourceRow?.image_uris?.[size]);
  return sizedPath || localPreview.primaryPhoto || "";
}

function publicLocalImageUri(sourcePath, collectionId) {
  if (!sourcePath) return "";
  const normalized = path.normalize(String(sourcePath)).replace(/^(\.\.[/\\])+/, "");
  const absolute = path.join(repoRoot, normalized);
  if (!existsSync(absolute)) return "";
  const publicName = `${normalizeToken(collectionId, "collection")}-${path.basename(normalized)}`;
  localCardImages.set(publicName, absolute);
  return `./assets/local-card-images/${publicName}`;
}

function getCardImage(scryfall, sourceRow, collectionId, size = "normal") {
  const localUri = publicLocalImageUri(sourceLocalPhotoPath(sourceRow, size), collectionId);
  if (localUri) return localUri;
  if (publicImageUri(scryfall?.image_uris?.[size])) return scryfall.image_uris[size];
  for (const face of scryfall?.card_faces || []) {
    if (publicImageUri(face?.image_uris?.[size])) return face.image_uris[size];
  }
  const original = sourceRow?.scryfallOriginalImages || {};
  if (publicImageUri(original?.image_uris?.[size])) return original.image_uris[size];
  for (const face of original?.card_faces || []) {
    if (publicImageUri(face?.image_uris?.[size])) return face.image_uris[size];
  }
  return "";
}

function getOracleText(scryfall) {
  if (scryfall?.oracle_text) return scryfall.oracle_text;
  if (Array.isArray(scryfall?.card_faces)) {
    return scryfall.card_faces
      .map((face) => [face.name, face.oracle_text].filter(Boolean).join(": "))
      .filter(Boolean)
      .join("\n\n");
  }
  return "";
}

function getTypeLine(scryfall, sourceRow = {}) {
  if (scryfall?.type_line) return scryfall.type_line;
  if (Array.isArray(scryfall?.card_faces)) {
    return scryfall.card_faces.map((face) => face.type_line).filter(Boolean).join(" // ");
  }
  if (sourceRow.type_line) return sourceRow.type_line;
  return "";
}

function getManaValue(scryfall) {
  return parseNumber(scryfall.cmc ?? scryfall.mana_value);
}

function getColors(scryfall, fallbackTags) {
  if (Array.isArray(scryfall?.colors) && scryfall.colors.length > 0) return scryfall.colors;
  if (Array.isArray(scryfall?.color_identity) && scryfall.color_identity.length > 0) {
    return scryfall.color_identity;
  }
  return fallbackTags
    .filter((tag) => tag.startsWith("color-"))
    .map((tag) => tag.replace("color-", "").toUpperCase());
}

function typeBucket(typeLine) {
  const lower = typeLine.toLowerCase();
  if (lower.includes("creature")) return "Creature";
  if (lower.includes("planeswalker")) return "Planeswalker";
  if (lower.includes("artifact")) return "Artifact";
  if (lower.includes("enchantment")) return "Enchantment";
  if (lower.includes("instant")) return "Instant";
  if (lower.includes("sorcery")) return "Sorcery";
  if (lower.includes("land")) return "Land";
  if (lower.includes("battle")) return "Battle";
  return "Other";
}

function setSortNumber(value) {
  const numeric = String(value || "").match(/\d+/);
  return numeric ? Number(numeric[0]) : 9999;
}

function publicNote(value) {
  const note = String(value || "").trim();
  if (!note) return "";
  if (/manabox|csv row imported|source row|imported on|wizards label/i.test(note)) return "";
  return note;
}

function collectionIsPublicOwnedBinder(metadata, rows) {
  if (metadata?.purpose !== "owned" || metadata?.kind !== "binder") return false;
  return rows.some((row) => row.ownership_status === "owned" || row.ownership_status === "proxy");
}

function rowIsPublicOwned(row) {
  return (
    row.ownership_status === "owned" &&
    !parseBoolean(row.homebrew) &&
    !parseBoolean(row.marked_for_deletion)
  );
}

function inferOwner(row, collectionId, metadata, tags) {
  const raw = row.owner_name || metadata.ownerName || metadata.owner_name || "";
  if (/eleni/i.test(raw) || tags.includes("owner-eleni") || collectionId.startsWith("partner-") || collectionId === "squirrel-away") {
    return "Eleni";
  }
  return "Kyle";
}

function nayaOnly(colorIdentity) {
  if (!Array.isArray(colorIdentity) || colorIdentity.length === 0) return false;
  const allowed = new Set(["R", "G", "W"]);
  return colorIdentity.every((color) => allowed.has(color)) && colorIdentity.some((color) => allowed.has(color));
}

function deriveTradability({ owner, collectionId, tags, name, colorIdentity, decks }) {
  const normalized = normalizeName(name);
  if (owner === "Eleni") {
    return {
      key: "not_tradable",
      label: "Not tradable",
      rank: 3,
      personalValue: 5,
      reason: "Owned by Eleni",
    };
  }
  if (/dogmeat/i.test(name)) {
    return {
      key: "not_tradable",
      label: "Not tradable",
      rank: 3,
      personalValue: 5,
      reason: "Dogmeat commander copy",
    };
  }
  if (collectionId === "custom-token-photos" || tags.includes("custom-token")) {
    return {
      key: "not_tradable",
      label: "Not tradable",
      rank: 3,
      personalValue: 4,
      reason: "Custom token photo reference",
    };
  }
  if (collectionId === "artist-signed-cards" || tags.includes("artist-signed") || tags.includes("signed-by-artist")) {
    return {
      key: "high_value",
      label: "Hard trade",
      rank: 2,
      personalValue: 5,
      reason: "Signed artist card",
    };
  }
  if (decks.avengers.has(normalized) || tags.includes("avengers-assemble")) {
    return {
      key: "high_value",
      label: "Hard trade",
      rank: 2,
      personalValue: 5,
      reason: deckTradeRules.avengers.label,
    };
  }
  if (collectionId === "fallout-themed-cards") {
    if (decks.scrappy.has(normalized) || tags.includes("deck-scrappy-survivors")) {
      return {
        key: "high_value",
        label: "Hard trade",
        rank: 2,
        personalValue: 5,
        reason: deckTradeRules.scrappy.label,
      };
    }
    if (nayaOnly(colorIdentity)) {
      return {
        key: "high_value",
        label: "Hard trade",
        rank: 2,
        personalValue: 5,
        reason: "Fallout red/green/white fit",
      };
    }
  }
  return {
    key: "neutral",
    label: "Tradable",
    rank: 1,
    personalValue: 3,
    reason: "Neutral trade value",
  };
}

function toPublicCard(row, context) {
  const sourceRow = parseMaybeJson(row.source_row);
  const scryfall = getScryfallRecord(sourceRow);
  const tags = splitTags(row.tags);
  const isProxy = row.ownership_status === "proxy" || parseBoolean(row.proxy);
  const quantity = parseNumber(row.quantity) ?? 1;
  const marketPrice = isProxy ? null : parseNumber(firstNonEmpty(row.estimated_market_price, scryfall.prices?.usd));
  const typeLine = getTypeLine(scryfall, sourceRow) || row.card_type || "";
  const colors = getColors(scryfall, tags);
  const colorIdentity = Array.isArray(scryfall.color_identity) ? scryfall.color_identity : colors;
  const owner = inferOwner(row, context.collectionId, context.metadata, tags);
  const name = row.card_name || scryfall.name || sourceRow.manabox?.Name || sourceRow.csv?.["Card Name"] || "Unknown card";
  const tradability = isProxy
    ? {
        key: "not_tradable",
        label: "Proxy - not tradable",
        rank: 3,
        personalValue: 5,
        reason: "Custom proxy, not official owned inventory",
      }
    : deriveTradability({
        owner,
        collectionId: context.collectionId,
        tags,
        name,
        colorIdentity,
        decks: context.decks,
      });

  return {
    id: `${context.collectionId}-${String(context.rowIndex + 1).padStart(4, "0")}`,
    collectionId: context.collectionId,
    binderName: context.metadata.name || context.collectionId,
    binderTags: Array.isArray(context.metadata.tags) ? context.metadata.tags : [],
    name,
    quantity,
    owner,
    setCode: row.set_code || scryfall.set?.toUpperCase() || "",
    setName: row.set_name || scryfall.set_name || "",
    collectorNumber: row.collector_number || scryfall.collector_number || "",
    collectorSort: setSortNumber(row.collector_number || scryfall.collector_number),
    finish: normalizeToken(row.finish),
    condition: normalizeToken(row.condition),
    language: normalizeToken(row.language || scryfall.lang || "en", "en"),
    publicLocation: context.metadata.name || "Owned binder",
    marketPrice,
    marketCurrency: row.estimated_market_currency || "USD",
    marketPriceSource: row.market_price_source || (scryfall.prices ? "scryfall" : "snapshot"),
    marketPriceUpdatedAt: row.market_price_updated_at || "",
    marketTotal: marketPrice === null ? null : Number((marketPrice * quantity).toFixed(2)),
    notes: publicNote(row.notes),
    starred: parseBoolean(row.starred),
    flagged: parseBoolean(row.flagged),
    altered: parseBoolean(row.altered),
    misprint: parseBoolean(row.misprint),
    proxy: isProxy,
    homebrew: parseBoolean(row.homebrew),
    rarity: row.tags?.match(/rarity-([^;]+)/)?.[1] || scryfall.rarity || "",
    manaCost: scryfall.mana_cost || "",
    manaValue: getManaValue(scryfall),
    typeLine,
    typeBucket: typeBucket(typeLine),
    oracleText: getOracleText(scryfall),
    colors,
    colorIdentity,
    keywords: Array.isArray(scryfall.keywords) ? scryfall.keywords : [],
    imageUrl: getCardImage(scryfall, sourceRow, context.collectionId, "normal"),
    largeImageUrl: getCardImage(scryfall, sourceRow, context.collectionId, "large"),
    scryfallUri: scryfall.scryfall_uri || "",
    releasedAt: scryfall.released_at || "",
    artist: scryfall.artist || "",
    publicTags: publicTags(tags),
    tradability,
  };
}

function addGroup(map, key, seed, card) {
  const current = map.get(key) || { ...seed, rows: 0, quantity: 0, marketTotal: 0 };
  current.rows += 1;
  current.quantity += card.quantity;
  current.marketTotal += card.marketTotal || 0;
  map.set(key, current);
}

function setFamilyForSet(set) {
  const code = String(set.code || "").toUpperCase();
  const name = String(set.name || "").toLowerCase();
  const match = setFamilyDefinitions.find((definition) => {
    if (definition.codes.includes(code)) return true;
    return definition.matchNames.some((needle) => name.includes(needle));
  });
  return match || {
    id: "other-magic",
    name: "Other Magic Sets",
    codes: [],
    matchNames: [],
  };
}

function buildSetFamilies(sets) {
  const families = new Map();
  for (const set of sets) {
    const definition = setFamilyForSet(set);
    const current =
      families.get(definition.id) ||
      {
        id: definition.id,
        name: definition.name,
        rows: 0,
        quantity: 0,
        marketTotal: 0,
        sets: [],
      };
    current.rows += set.rows;
    current.quantity += set.quantity;
    current.marketTotal += set.marketTotal || 0;
    current.sets.push(set);
    families.set(definition.id, current);
  }
  return Array.from(families.values())
    .map((family) => ({
      ...family,
      marketTotal: Number(family.marketTotal.toFixed(2)),
      codes: family.sets.map((set) => set.code).sort((a, b) => a.localeCompare(b)),
      sets: family.sets.sort((a, b) => a.code.localeCompare(b.code)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildSummary(cards, includedCollections) {
  const binders = new Map();
  const sets = new Map();
  const owners = new Map();
  const tradability = new Map();
  for (const card of cards) {
    addGroup(
      binders,
      card.collectionId,
      {
        id: card.collectionId,
        name: card.binderName,
        owner: card.owner,
        setCodes: [],
      },
      card,
    );
    addGroup(
      sets,
      card.setCode || "UNK",
      {
        code: card.setCode || "UNK",
        name: card.setName || card.setCode || "Unknown set",
      },
      card,
    );
    owners.set(card.owner, (owners.get(card.owner) || 0) + card.quantity);
    tradability.set(card.tradability.key, (tradability.get(card.tradability.key) || 0) + card.quantity);
  }

  for (const binder of binders.values()) {
    binder.marketTotal = Number(binder.marketTotal.toFixed(2));
    binder.setCodes = Array.from(new Set(cards.filter((card) => card.collectionId === binder.id).map((card) => card.setCode).filter(Boolean))).sort();
  }
  for (const set of sets.values()) {
    set.marketTotal = Number(set.marketTotal.toFixed(2));
  }

  const marketTotal = cards.reduce((total, card) => total + (card.marketTotal || 0), 0);
  const sortedSets = Array.from(sets.values()).sort((a, b) => a.code.localeCompare(b.code));
  return {
    title: "Owned Card Trade Binders",
    slug: shareableSlug,
    generatedAt,
    rowCount: cards.length,
    totalQuantity: cards.reduce((total, card) => total + card.quantity, 0),
    uniqueNames: new Set(cards.map((card) => card.name)).size,
    binderCount: includedCollections.length,
    setCount: sets.size,
    marketTotal: Number(marketTotal.toFixed(2)),
    marketTotalFormatted: money(marketTotal),
    owners: Object.fromEntries(owners),
    tradability: Object.fromEntries(tradability),
    binders: Array.from(binders.values()).sort((a, b) => a.name.localeCompare(b.name)),
    sets: sortedSets,
    setFamilies: buildSetFamilies(sortedSets),
  };
}

async function loadDeckNameSet(deckId) {
  const entriesPath = path.join(repoRoot, "decks", deckId, "entries.csv");
  if (!existsSync(entriesPath)) return new Set();
  const rows = csvRowsToObjects(await readFile(entriesPath, "utf8"));
  return new Set(
    rows
      .filter((row) => !parseBoolean(row.marked_for_deletion))
      .map((row) => normalizeName(row.name_snapshot))
      .filter(Boolean),
  );
}

async function loadCards() {
  const collectionsDir = path.join(repoRoot, "collections");
  const collectionIds = (await readdir(collectionsDir)).sort();
  const decks = {
    avengers: await loadDeckNameSet(deckTradeRules.avengers.deckId),
    scrappy: await loadDeckNameSet(deckTradeRules.scrappy.deckId),
  };
  const cards = [];
  const includedCollections = [];

  for (const collectionId of collectionIds) {
    const dir = path.join(collectionsDir, collectionId);
    const metadataPath = path.join(dir, "metadata.json");
    const entriesPath = path.join(dir, "entries.csv");
    if (!existsSync(metadataPath) || !existsSync(entriesPath)) continue;
    const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
    const rows = csvRowsToObjects(await readFile(entriesPath, "utf8"));
    if (!collectionIsPublicOwnedBinder(metadata, rows)) continue;
    includedCollections.push({ id: collectionId, name: metadata.name || collectionId });
    rows.filter(rowIsPublicOwned).forEach((row, rowIndex) => {
      cards.push(toPublicCard(row, { collectionId, metadata, rowIndex, decks }));
    });
  }

  cards.sort((a, b) => a.binderName.localeCompare(b.binderName) || a.setCode.localeCompare(b.setCode) || a.collectorSort - b.collectorSort || a.name.localeCompare(b.name));
  return { cards, includedCollections };
}

function pageHtml(summary) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Browse Kyle and Eleni owned Magic card binders with filters, tradability notes, comparison, preview, and export.">
    <meta name="theme-color" content="#141413">
    <title>${summary.title} | Homebrew Forge</title>
    <script>document.documentElement.classList.add("js-enhanced");</script>
    <link rel="stylesheet" href="./styles.css">
  </head>
  <body>
    <a class="skip-link" href="#results">Skip to cards</a>
    <header class="app-header">
      <div>
        <p class="eyebrow">Homebrew Forge shareable</p>
        <h1>${summary.title}</h1>
      </div>
      <div class="header-stats" aria-label="Collection summary">
        <span><strong>${summary.totalQuantity}</strong> cards</span>
        <span><strong>${summary.uniqueNames}</strong> names</span>
        <span><strong>${summary.binderCount}</strong> binders</span>
        <span><strong>${summary.setCount}</strong> sets</span>
        <span><strong>${summary.marketTotalFormatted}</strong> snapshot</span>
      </div>
    </header>

    <main>
      <section class="binder-panel" aria-label="Binder switcher">
        <div class="section-label">Binders</div>
        <div id="binderShelf" class="binder-shelf"></div>
      </section>

      <section class="set-family-panel" aria-label="Set family filters">
        <div class="section-label">Set families</div>
        <div id="setFamilyShelf" class="set-family-shelf"></div>
      </section>

      <section class="toolbar" aria-label="Browse controls">
        <div class="search-row">
          <label class="field field-search" for="searchInput">
            <span>Search</span>
            <input id="searchInput" type="search" placeholder="Name, type, rules text, tags" autocomplete="off">
          </label>
          <label class="field" for="sortSelect">
            <span>Sort</span>
            <select id="sortSelect">
              <option value="tradability-asc">Most tradable</option>
              <option value="name-asc">Name A-Z</option>
              <option value="set-asc">Set and number</option>
              <option value="market-desc">Market high-low</option>
              <option value="market-asc">Market low-high</option>
              <option value="quantity-desc">Quantity high-low</option>
              <option value="owner-asc">Owner</option>
              <option value="rarity-desc">Rarity</option>
            </select>
          </label>
          <div class="view-toggle" role="group" aria-label="View mode">
            <button type="button" data-view="grid" aria-pressed="true">Grid</button>
            <button type="button" data-view="table" aria-pressed="false">Table</button>
            <button type="button" data-view="sets" aria-pressed="false">Sets</button>
            <button type="button" data-view="review" aria-pressed="false">Review</button>
            <button type="button" data-view="compare" aria-pressed="false">Compare</button>
          </div>
        </div>

        <div class="filter-grid">
          <label class="field" for="binderFilter"><span>Add binder</span><select id="binderFilter" data-filter="binder"></select></label>
          <label class="field" for="setFamilyFilter"><span>Add set family</span><select id="setFamilyFilter" data-filter="setFamily"></select></label>
          <label class="field" for="setFilter"><span>Add set</span><select id="setFilter" data-filter="set"></select></label>
          <label class="field" for="ownerFilter"><span>Add owner</span><select id="ownerFilter" data-filter="owner"></select></label>
          <label class="field" for="tradabilityFilter"><span>Add tradability</span><select id="tradabilityFilter" data-filter="tradability"></select></label>
          <label class="field" for="colorFilter"><span>Add color</span><select id="colorFilter" data-filter="color"></select></label>
          <label class="field" for="typeFilter"><span>Add type</span><select id="typeFilter" data-filter="type"></select></label>
          <label class="field" for="rarityFilter"><span>Add rarity</span><select id="rarityFilter" data-filter="rarity"></select></label>
          <label class="field" for="finishFilter"><span>Add finish</span><select id="finishFilter" data-filter="finish"></select></label>
          <label class="field" for="conditionFilter"><span>Add condition</span><select id="conditionFilter" data-filter="condition"></select></label>
          <button id="resetFilters" class="secondary-action" type="button">Reset</button>
        </div>
        <div id="activeFilters" class="active-filters" aria-label="Active filters"></div>
      </section>

      <section class="selection-bar" aria-label="Selection actions">
        <div>
          <strong id="resultCount">${summary.rowCount}</strong>
          <span id="resultLabel">cards shown</span>
          <span class="bar-dot" aria-hidden="true"></span>
          <strong id="selectedCount">0</strong>
          <span>selected</span>
          <span class="bar-dot" aria-hidden="true"></span>
          <strong id="markedCount">0</strong>
          <span>marked</span>
        </div>
        <div class="selection-actions">
          <button id="selectVisible" type="button">Select shown</button>
          <button id="selectMarked" type="button">Select marked</button>
          <button id="compareSelected" type="button">Compare selected</button>
          <button id="clearSelection" type="button">Clear</button>
          <button id="downloadCsv" type="button">CSV</button>
          <button id="downloadTxt" type="button">TXT</button>
          <button id="downloadXml" type="button">XML</button>
        </div>
      </section>

      <section id="results" class="results" aria-live="polite"></section>
    </main>

    <div id="previewModal" class="preview-modal" hidden></div>

    <template id="emptyTemplate">
      <div class="empty-state">
        <h2>No cards match</h2>
        <p>Adjust search or reset filters.</p>
      </div>
    </template>

    <script src="./script.js"></script>
  </body>
</html>
`;
}

function stylesCss() {
  return `:root {
  color-scheme: dark;
  --bg: #141413;
  --panel: #24231f;
  --panel-strong: #302e28;
  --line: #464036;
  --line-soft: #332f29;
  --text: #f6f0e4;
  --muted: #c8bdac;
  --dim: #978b7d;
  --accent: #e2b35f;
  --accent-strong: #f0c873;
  --green: #7bc99b;
  --red: #f08b79;
  --blue: #8dbdf5;
  --shadow: 0 20px 70px rgba(0, 0, 0, 0.32);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }
body {
  min-width: 320px;
  margin: 0;
  background: linear-gradient(135deg, rgba(226, 179, 95, 0.08), transparent 34rem), linear-gradient(180deg, #171614 0%, #11110f 100%);
  color: var(--text);
}
button, input, select { font: inherit; }
button, select, input { border-radius: 8px; }
button {
  min-height: 42px;
  border: 1px solid var(--line);
  background: #2b2924;
  color: var(--text);
  cursor: pointer;
}
button:hover { border-color: var(--accent); }
button:focus-visible, input:focus-visible, select:focus-visible, a:focus-visible {
  outline: 3px solid rgba(226, 179, 95, 0.45);
  outline-offset: 2px;
}
button[disabled] { cursor: not-allowed; opacity: 0.45; }
a { color: #b9c7ff; }

.skip-link {
  position: absolute;
  left: 1rem;
  top: -5rem;
  z-index: 20;
  background: var(--accent);
  color: #15120c;
  padding: 0.75rem 1rem;
  border-radius: 8px;
}
.skip-link:focus { top: 1rem; }

.app-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1.5rem;
  align-items: end;
  padding: 1.5rem clamp(1rem, 4vw, 2rem) 1rem;
  border-bottom: 1px solid var(--line-soft);
}
.eyebrow, .section-label {
  margin: 0 0 0.35rem;
  color: var(--accent-strong);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 4.2rem);
  line-height: 0.95;
  letter-spacing: 0;
}
.header-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.55rem;
  max-width: 42rem;
}
.header-stats span, .selection-bar, .toolbar, .binder-panel, .set-family-panel, .card, .compare-card, .set-group, .empty-state, .preview-dialog {
  border: 1px solid var(--line-soft);
  background: rgba(36, 35, 31, 0.94);
  box-shadow: var(--shadow);
}
.header-stats span {
  padding: 0.62rem 0.72rem;
  border-radius: 8px;
  color: var(--muted);
}
.header-stats strong { color: var(--text); }

main {
  width: min(1760px, 100%);
  margin: 0 auto;
  padding: 1rem clamp(0.75rem, 3vw, 2rem) 2rem;
}
.binder-panel, .set-family-panel, .toolbar {
  display: grid;
  gap: 0.8rem;
  padding: 0.9rem;
  border-radius: 8px;
}
.binder-panel, .set-family-panel { margin-bottom: 0.8rem; }
.binder-shelf, .set-family-shelf {
  display: flex;
  gap: 0.55rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}
.binder-shelf button, .set-family-shelf button {
  flex: 0 0 auto;
  min-width: 12rem;
  max-width: 17rem;
  padding: 0.65rem 0.75rem;
  text-align: left;
}
.set-family-shelf button {
  min-width: 13rem;
}
.binder-shelf button[aria-pressed="true"], .set-family-shelf button[aria-pressed="true"] {
  background: var(--accent);
  border-color: var(--accent);
  color: #17130c;
  font-weight: 800;
}
.set-family-shelf button[data-active-state="partial"] {
  border-color: rgba(212, 173, 102, 0.72);
  box-shadow: inset 0 0 0 1px rgba(212, 173, 102, 0.22);
}
.binder-shelf strong, .binder-shelf span, .set-family-shelf strong, .set-family-shelf span { display: block; }
.binder-shelf span, .set-family-shelf span { margin-top: 0.25rem; font-size: 0.78rem; opacity: 0.78; }

.toolbar {
  position: static;
}
.search-row, .filter-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 0.65rem;
  align-items: end;
}
.field { display: grid; gap: 0.32rem; }
.field span {
  color: var(--dim);
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
}
.field input, .field select {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--line);
  background: #191916;
  color: var(--text);
  padding: 0.65rem 0.75rem;
}
.field-search { grid-column: span 6; }
.search-row > .field:not(.field-search) { grid-column: span 2; }
.view-toggle {
  grid-column: span 4;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.35rem;
}
.view-toggle button[aria-pressed="true"] {
  background: var(--accent);
  border-color: var(--accent);
  color: #17130c;
  font-weight: 800;
}
.filter-grid > .field { grid-column: span 2; }
.secondary-action { grid-column: span 2; }
.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  min-height: 2.1rem;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2rem;
  padding: 0.24rem 0.35rem 0.24rem 0.55rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #181814;
  color: var(--muted);
}
.filter-chip button {
  min-height: 1.45rem;
  width: 1.45rem;
  border-radius: 50%;
  padding: 0;
}

.selection-bar {
  position: static;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  margin: 0.8rem 0;
  padding: 0.75rem;
  border-radius: 8px;
  color: var(--muted);
}
.selection-bar strong { color: var(--text); }
.bar-dot {
  display: inline-block;
  width: 0.32rem;
  height: 0.32rem;
  margin: 0 0.48rem;
  border-radius: 50%;
  background: var(--accent);
  vertical-align: middle;
}
.selection-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.45rem;
}
.selection-actions button { padding-inline: 0.75rem; }

.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.85rem;
}
.card {
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  border-radius: 8px;
}
.card.is-selected { border-color: var(--accent); }
.card.is-marked { box-shadow: 0 0 0 1px rgba(123, 201, 155, 0.35), var(--shadow); }
.card-media {
  position: relative;
  aspect-ratio: 488 / 680;
  background: #0f0f0d;
}
.card-media button {
  width: 100%;
  height: 100%;
  display: block;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.card-media img, .preview-image, .compare-card img {
  width: 100%;
  display: block;
}
.card-media img { height: 100%; object-fit: cover; }
.no-image {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 1rem;
  color: var(--muted);
  text-align: center;
}
.card-pills {
  position: absolute;
  inset: 0.55rem 0.55rem auto;
  display: flex;
  justify-content: space-between;
  gap: 0.4rem;
  pointer-events: none;
}
.pill {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  max-width: 100%;
  padding: 0.25rem 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background: rgba(10, 10, 9, 0.78);
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 800;
}
.pill.not_tradable { background: rgba(240, 139, 121, 0.86); color: #190d0a; }
.pill.high_value { background: rgba(226, 179, 95, 0.9); color: #17130c; }
.pill.neutral { background: rgba(123, 201, 155, 0.86); color: #101711; }
.card-body {
  display: grid;
  gap: 0.65rem;
  padding: 0.8rem;
}
.card-title {
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
  align-items: start;
}
.card-title h2 {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.18;
}
.card-title button {
  min-height: auto;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0;
  text-align: left;
}
.market {
  white-space: nowrap;
  color: var(--accent-strong);
  font-weight: 800;
}
.meta-row, .tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.meta-row span, .tag-row span {
  max-width: 100%;
  padding: 0.24rem 0.42rem;
  border: 1px solid var(--line-soft);
  border-radius: 999px;
  color: var(--muted);
  font-size: 0.78rem;
}
.oracle {
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.38;
  white-space: pre-line;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}
.trade-note {
  color: var(--muted);
  font-size: 0.86rem;
}
.card-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}
.card-actions button:last-child:nth-child(odd) { grid-column: 1 / -1; }
.card-actions button {
  min-width: 0;
  min-height: 38px;
  padding: 0 0.3rem;
}
.card-actions button.is-on {
  background: var(--green);
  border-color: var(--green);
  color: #101711;
  font-weight: 800;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  background: var(--panel);
}
table { width: 100%; min-width: 980px; border-collapse: collapse; }
th, td {
  padding: 0.72rem;
  border-bottom: 1px solid var(--line-soft);
  text-align: left;
  vertical-align: top;
}
th { color: var(--dim); font-size: 0.75rem; text-transform: uppercase; }
td { color: var(--muted); }
td strong { color: var(--text); }
.table-actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.table-actions button { min-height: 34px; padding-inline: 0.55rem; }

.set-view { display: grid; gap: 1.15rem; }
.set-family-group {
  display: grid;
  gap: 0.75rem;
}
.set-family-title {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 0.85rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.1rem;
}
.set-family-title button {
  text-align: left;
}
.set-family-title strong, .set-family-title span {
  display: block;
}
.set-family-title span {
  margin-top: 0.15rem;
  color: var(--muted);
  font-size: 0.86rem;
}
.set-group { border-radius: 8px; overflow: hidden; }
.set-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: baseline;
  justify-content: space-between;
  padding: 0.8rem 0.9rem;
  border-bottom: 1px solid var(--line-soft);
  background: var(--panel-strong);
}
.set-header h2 { margin: 0; font-size: 1.1rem; }
.set-header p { margin: 0; color: var(--muted); }
.set-group .grid-view { padding: 0.85rem; }
.set-list {
  display: grid;
  gap: 0.35rem;
  padding: 0.75rem;
}
.set-row {
  display: grid;
  grid-template-columns: minmax(12rem, 1.4fr) minmax(8rem, 0.8fr) minmax(8rem, 0.7fr) minmax(6rem, 0.5fr) auto;
  gap: 0.65rem;
  align-items: center;
  padding: 0.55rem;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  background: rgba(25, 25, 22, 0.74);
}
.set-row strong, .set-row span { display: block; }
.set-row span { color: var(--muted); font-size: 0.84rem; }
.set-row-actions {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.set-row-actions button {
  min-height: 34px;
  padding-inline: 0.55rem;
}

.review-view {
  display: grid;
  gap: 0.85rem;
}
.review-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  background: var(--panel);
}
.review-toolbar p { margin: 0; color: var(--muted); }
.review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.review-card {
  display: grid;
  grid-template-columns: minmax(260px, 420px) minmax(0, 1fr);
  gap: 1rem;
  padding: 0.9rem;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: var(--shadow);
}
.review-card img {
  width: 100%;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
}
.review-card h2 { margin: 0; font-size: 1.55rem; }
.review-card .card-actions { margin-top: 0.85rem; }

.compare-view { display: grid; gap: 0.9rem; }
.view-exit {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  background: var(--panel);
}
.view-exit p { margin: 0; color: var(--muted); }
.compare-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.9rem;
}
.compare-slot { min-width: 0; }
.compare-card {
  display: grid;
  grid-template-columns: minmax(130px, 220px) minmax(0, 1fr);
  gap: 0.85rem;
  padding: 0.85rem;
  border-radius: 8px;
}
.compare-card img { border-radius: 8px; border: 1px solid var(--line-soft); }
.compare-card h2 { margin: 0; font-size: 1.35rem; }
.compare-tools {
  display: grid;
  gap: 0.7rem;
  padding: 0.85rem;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  background: var(--panel);
}
.compare-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.55rem;
}
.compare-search input {
  min-height: 42px;
  border: 1px solid var(--line);
  background: #191916;
  color: var(--text);
  padding: 0.65rem 0.75rem;
}
.scryfall-results {
  display: grid;
  gap: 0.45rem;
  max-height: 28rem;
  overflow: auto;
}
.scryfall-result {
  display: grid;
  grid-template-columns: 3.2rem minmax(0, 1fr) auto;
  gap: 0.65rem;
  align-items: center;
  text-align: left;
  padding: 0.45rem;
}
.scryfall-result img { width: 3.2rem; border-radius: 5px; }
.scryfall-result strong, .scryfall-result span { display: block; }
.scryfall-result span { color: var(--muted); font-size: 0.82rem; }
.scryfall-placeholder { margin: 0; color: var(--muted); }
.candidate-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}
.candidate-controls label {
  display: grid;
  gap: 0.28rem;
  color: var(--dim);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}
.candidate-controls select {
  min-height: 38px;
  border: 1px solid var(--line);
  background: #191916;
  color: var(--text);
  padding: 0.45rem 0.55rem;
}
.check-row {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  color: var(--muted);
}
.comparison-breakdown {
  display: grid;
  gap: 0.45rem;
  padding: 0.85rem;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  background: var(--panel);
}
.comparison-row {
  display: grid;
  grid-template-columns: 9rem minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--line-soft);
}
.comparison-row:last-child { border-bottom: 0; }
.comparison-row strong { color: var(--dim); text-transform: uppercase; font-size: 0.75rem; }

.detail-list {
  display: grid;
  grid-template-columns: 8.5rem minmax(0, 1fr);
  gap: 0.4rem 0.75rem;
  margin: 0.75rem 0 0;
}
.detail-list dt { color: var(--dim); font-size: 0.78rem; font-weight: 800; text-transform: uppercase; }
.detail-list dd { margin: 0; color: var(--muted); }

.preview-modal[hidden] { display: none; }
.preview-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.78);
}
.preview-dialog {
  width: min(1120px, 100%);
  max-height: min(92vh, 980px);
  overflow: auto;
  display: grid;
  grid-template-columns: minmax(260px, 420px) minmax(0, 1fr);
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
}
.preview-close {
  position: sticky;
  top: 0;
  justify-self: end;
}
.preview-image {
  border-radius: 8px;
  border: 1px solid var(--line-soft);
}
.empty-state {
  padding: 2rem;
  border-radius: 8px;
  text-align: center;
}
.empty-state h2 { margin: 0 0 0.4rem; }
.empty-state p { margin: 0; color: var(--muted); }

@media (max-width: 1080px) {
  .app-header, .selection-bar, .compare-grid { grid-template-columns: 1fr; }
  .header-stats, .selection-actions { justify-content: start; }
  .field-search, .search-row > .field:not(.field-search), .view-toggle, .filter-grid > .field, .secondary-action { grid-column: span 6; }
  .selection-bar { top: 12.2rem; }
}
@media (max-width: 660px) {
  main { padding-inline: 0.55rem; }
  .app-header { padding-inline: 0.75rem; }
  .header-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); justify-content: stretch; }
  .toolbar, .selection-bar { position: static; }
  .field-search, .search-row > .field:not(.field-search), .view-toggle, .filter-grid > .field, .secondary-action { grid-column: 1 / -1; }
  .view-toggle { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid-view, .compare-card, .preview-dialog, .candidate-controls, .comparison-row, .review-card { grid-template-columns: 1fr; }
  .set-row { grid-template-columns: 1fr; }
  .set-row-actions { justify-content: flex-start; }
  .binder-shelf button, .set-family-shelf button { min-width: 10rem; }
  .card-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`;
}

function extractBlock(fn) {
  const source = String(fn);
  const start = source.indexOf("/*");
  const end = source.lastIndexOf("*/");
  if (start === -1 || end === -1 || end <= start) throw new Error("Missing embedded template block");
  return `${source.slice(start + 2, end).replace(/^\n/, "")}\n`;
}

function scriptJs() {
  return extractBlock(function () { /*
const state = {
  cards: [],
  summary: null,
  filtered: [],
  view: "grid",
  selected: new Set(),
  marked: new Set(),
  previewId: null,
  reviewId: null,
  filters: {
    search: "",
    binder: new Set(),
    setFamily: new Set(),
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
  setFamily: "Set family",
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
function fillSetFamilySelect(select) {
  select.innerHTML = "";
  select.append(new Option("Choose set family", ""));
  for (const family of state.summary.setFamilies || []) {
    const option = new Option(`${family.name} (${family.codes.length} sets)`, family.id);
    select.append(option);
  }
}
function fillSetSelectGrouped(select) {
  select.innerHTML = "";
  select.append(new Option("Choose set", ""));
  const seen = new Set();
  for (const family of state.summary.setFamilies || []) {
    const group = document.createElement("optgroup");
    group.label = family.name;
    for (const set of family.sets || []) {
      seen.add(set.code);
      group.append(new Option(`${set.code} - ${set.name || set.code}`, set.code));
    }
    if (group.children.length > 0) select.append(group);
  }
  const extras = uniqueOptions(
    state.cards.filter((card) => !seen.has(card.setCode)),
    (card) => card.setCode,
    (value, card) => value + " - " + (card.setName || value),
  );
  if (extras.length > 0) {
    const group = document.createElement("optgroup");
    group.label = "Other sets";
    for (const [value, optionLabel] of extras) group.append(new Option(optionLabel, value));
    select.append(group);
  }
}
function initFilters() {
  fillSelect(els.binderFilter, uniqueOptions(state.cards, (card) => card.collectionId, (value, card) => card.binderName), "Choose binder");
  fillSetFamilySelect(els.setFamilyFilter);
  fillSetSelectGrouped(els.setFilter);
  fillSelect(els.ownerFilter, uniqueOptions(state.cards, (card) => card.owner), "Choose owner");
  fillSelect(els.tradabilityFilter, uniqueOptions(state.cards, (card) => card.tradability.key, (value, card) => card.tradability.label), "Choose tradability");
  fillSelect(els.colorFilter, [["W", "White"], ["U", "Blue"], ["B", "Black"], ["R", "Red"], ["G", "Green"], ["Colorless", "Colorless"]], "Choose color");
  fillSelect(els.typeFilter, uniqueOptions(state.cards, (card) => card.typeBucket), "Choose type");
  fillSelect(els.rarityFilter, uniqueOptions(state.cards, (card) => card.rarity), "Choose rarity");
  fillSelect(els.finishFilter, uniqueOptions(state.cards, (card) => card.finish), "Choose finish");
  fillSelect(els.conditionFilter, uniqueOptions(state.cards, (card) => card.condition), "Choose condition");
}

function optionLabel(key, value) {
  if (key === "setFamily") {
    return (state.summary.setFamilies || []).find((family) => family.id === value)?.name || value;
  }
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

function setCodesForFamily(family) {
  return family.codes || (family.sets || []).map((set) => set.code).filter(Boolean);
}
function familyActiveState(family) {
  const codes = setCodesForFamily(family);
  if (state.filters.setFamily.has(family.id)) return "all";
  const activeCount = codes.filter((code) => state.filters.set.has(code)).length;
  if (activeCount === 0) return "none";
  if (activeCount === codes.length) return "all";
  return "partial";
}
function renderSetFamilyShelf() {
  const buttons = [`<button type="button" data-set-family-all aria-pressed="${state.filters.setFamily.size === 0}"><strong>All set families</strong><span>${state.summary.totalQuantity} cards</span></button>`];
  for (const family of state.summary.setFamilies || []) {
    const activeState = familyActiveState(family);
    buttons.push(`<button type="button" data-set-family-id="${escapeHtml(family.id)}" data-active-state="${activeState}" aria-pressed="${activeState === "all"}">
      <strong>${escapeHtml(family.name)}</strong>
      <span>${family.quantity} cards - ${family.codes.slice(0, 5).map(escapeHtml).join(", ")}</span>
    </button>`);
  }
  els.setFamilyShelf.innerHTML = buttons.join("");
}
function toggleSetFamily(familyId) {
  const family = (state.summary.setFamilies || []).find((candidate) => candidate.id === familyId);
  if (!family) return;
  state.filters.setFamily.has(family.id) ? state.filters.setFamily.delete(family.id) : state.filters.setFamily.add(family.id);
  applyFilters();
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
  for (const key of ["binder", "setFamily", "set", "owner", "tradability", "color", "type", "rarity", "finish", "condition"]) state.filters[key].clear();
  state.filters.search = "";
  state.filters.sort = "tradability-asc";
  els.searchInput.value = "";
  els.sortSelect.value = "tradability-asc";
  document.querySelectorAll("select[data-filter]").forEach((select) => { select.value = ""; });
  applyFilters();
}
function renderActiveFilters() {
  const chips = [];
  for (const key of ["binder", "setFamily", "set", "owner", "tradability", "color", "type", "rarity", "finish", "condition"]) {
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
function familyMatch(card) {
  if (state.filters.setFamily.size === 0) return true;
  return (state.summary.setFamilies || []).some((family) => {
    return state.filters.setFamily.has(family.id) && setCodesForFamily(family).includes(card.setCode);
  });
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
  if (!familyMatch(card)) return false;
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
  if (state.view === "review" && !state.filtered.some((card) => card.id === state.reviewId)) {
    state.reviewId = state.filtered[0]?.id || null;
  }
  renderBinderShelf();
  renderSetFamilyShelf();
  renderActiveFilters();
  render();
}
function setView(view) {
  state.view = view;
  if (view === "review" && !state.filtered.some((card) => card.id === state.reviewId)) {
    state.reviewId = state.filtered[0]?.id || null;
  }
  document.querySelectorAll(".view-toggle button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  });
  render();
  if (view === "compare" || view === "review") {
    requestAnimationFrame(() => {
      els.results.scrollIntoView({ block: "start" });
      if (view === "compare") byId("scryfallQuery")?.focus({ preventScroll: true });
    });
  }
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
function startReview(cardId) {
  state.reviewId = cardId;
  setView("review");
}
function reviewIndex() {
  if (state.filtered.length === 0) return -1;
  const index = state.filtered.findIndex((card) => card.id === state.reviewId);
  return index === -1 ? 0 : index;
}
function reviewCard() {
  const index = reviewIndex();
  if (index === -1) return null;
  const card = state.filtered[index];
  state.reviewId = card.id;
  return card;
}
function moveReview(step) {
  if (state.filtered.length === 0) return;
  const nextIndex = (reviewIndex() + step + state.filtered.length) % state.filtered.length;
  state.reviewId = state.filtered[nextIndex].id;
  render();
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
        <button type="button" data-action="review" data-card-id="${escapeHtml(card.id)}">Review</button>
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
      <button type="button" data-action="review" data-card-id="${escapeHtml(card.id)}">Review</button>
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
      <button type="button" data-action="review" data-card-id="${escapeHtml(card.id)}">Review</button>
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
  const renderSetSection = ([setCode, cards]) => {
    const quantity = cards.reduce((total, card) => total + card.quantity, 0);
    const value = cards.reduce((total, card) => total + (card.marketTotal || 0), 0);
    const owners = Array.from(new Set(cards.map((card) => card.owner))).join(", ");
    return `<section class="set-group"><div class="set-header">
      <h2>${escapeHtml(setCode)} - ${escapeHtml(cards[0]?.setName || setCode)}</h2>
      <p>${cards.length} rows - ${quantity} cards - ${owners} - ${money(value)}</p>
    </div><div class="set-list">${cards.map(setRow).join("")}</div></section>`;
  };
  const familySections = (state.summary.setFamilies || []).map((family) => {
    const familySets = (family.sets || [])
      .map((set) => [set.code, groups.get(set.code)])
      .filter((entry) => entry[1]?.length)
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (familySets.length === 0) return "";
    const quantity = familySets.reduce((total, [, cards]) => total + cards.reduce((sum, card) => sum + card.quantity, 0), 0);
    const value = familySets.reduce((total, [, cards]) => total + cards.reduce((sum, card) => sum + (card.marketTotal || 0), 0), 0);
    const activeState = familyActiveState(family);
    return `<section class="set-family-group">
      <div class="set-family-title">
        <button type="button" data-set-family-id="${escapeHtml(family.id)}" data-active-state="${activeState}" aria-pressed="${activeState === "all"}">
          <strong>${escapeHtml(family.name)}</strong>
          <span>${familySets.length} sets - ${quantity} cards - ${money(value)}</span>
        </button>
      </div>
      ${familySets.map(renderSetSection).join("")}
    </section>`;
  }).filter(Boolean);
  const fallbackSections = Array.from(groups.entries())
    .filter(([setCode]) => !(state.summary.sets || []).some((set) => set.code === setCode))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(renderSetSection);
  return `<div class="set-view">${familySections.concat(fallbackSections).join("")}</div>`;
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
function renderReview() {
  const card = reviewCard();
  if (!card) return renderEmpty();
  const index = reviewIndex();
  return `<div class="review-view">
    <div class="review-toolbar">
      <p><strong>${index + 1}</strong> of ${state.filtered.length} shown</p>
      <div class="review-actions">
        <button type="button" data-review-step="-1">Previous</button>
        <button type="button" data-review-step="1">Next</button>
        <button type="button" data-view-jump="grid">Back to grid</button>
      </div>
    </div>
    <article class="review-card">
      <div>${card.largeImageUrl || card.imageUrl ? `<img src="${escapeHtml(card.largeImageUrl || card.imageUrl)}" alt="${escapeHtml(card.name)} card image">` : `<div class="no-image">${escapeHtml(card.name)}</div>`}</div>
      <div>
        <h2>${escapeHtml(card.name)}</h2>
        <p class="oracle">${escapeHtml(card.oracleText || card.typeLine)}</p>
        ${detailList(card)}
        <div class="card-actions">
          <button type="button" data-action="select" data-card-id="${escapeHtml(card.id)}" class="${state.selected.has(card.id) ? "is-on" : ""}">${state.selected.has(card.id) ? "Selected" : "Select"}</button>
          <button type="button" data-action="mark" data-card-id="${escapeHtml(card.id)}" class="${state.marked.has(card.id) ? "is-on" : ""}">${state.marked.has(card.id) ? "Marked" : "Mark"}</button>
          <button type="button" data-action="compare" data-card-id="${escapeHtml(card.id)}">Compare</button>
          <button type="button" data-action="preview" data-card-id="${escapeHtml(card.id)}">View</button>
          <button type="button" data-view-jump="grid">Grid</button>
        </div>
      </div>
    </article>
  </div>`;
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
function renderScryfallResultsMarkup() {
  return state.compare.results.map((card, index) => `<button type="button" class="scryfall-result" data-scryfall-index="${index}">
    ${scryfallImage(card) ? `<img loading="lazy" src="${escapeHtml(scryfallImage(card))}" alt="">` : "<span></span>"}
    <span><strong>${escapeHtml(card.name)}</strong><span>${escapeHtml((card.set || "").toUpperCase())} #${escapeHtml(card.collector_number || "")} - ${escapeHtml(card.rarity || "")} - ${money(scryfallPrice(card))}</span></span>
    <span>${state.compare.selected?.id === card.id ? "On" : "Use"}</span>
  </button>`).join("");
}
function renderScryfallTools() {
  const results = renderScryfallResultsMarkup();
  const status = state.compare.loading ? "Searching Scryfall..." : state.compare.error;
  return `<div class="compare-tools">
    <div class="compare-search">
      <input id="scryfallQuery" type="search" value="${escapeHtml(state.compare.query)}" placeholder="Search all Scryfall cards">
      <button id="scryfallSearch" type="button" ${state.compare.loading ? "disabled" : ""}>${state.compare.loading ? "Searching" : "Search"}</button>
    </div>
    <p id="scryfallStatus" class="trade-note" ${status ? "" : "hidden"}>${escapeHtml(status)}</p>
    <div class="scryfall-results">${results || '<p class="scryfall-placeholder">No Scryfall results selected yet.</p>'}</div>
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
    <div class="view-exit">
      <p><strong>Compare view</strong></p>
      <button type="button" data-view-jump="grid">Back to grid</button>
    </div>
    <div class="compare-grid"><div id="ownedCompareSlot" class="compare-slot">${ownedCompareCard(left)}</div><div id="candidateCompareSlot" class="compare-slot">${candidateCompareCard()}</div></div>
    ${renderScryfallTools()}
    <div id="comparisonBreakdownSlot">${comparisonBreakdown(left)}</div>
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
  else if (state.view === "review") els.results.innerHTML = renderReview();
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

let scryfallRequest = null;
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
function syncScryfallStatus() {
  const button = byId("scryfallSearch");
  const status = byId("scryfallStatus");
  if (button) {
    button.disabled = state.compare.loading;
    button.textContent = state.compare.loading ? "Searching" : "Search";
  }
  if (status) {
    const text = state.compare.loading ? "Searching Scryfall..." : state.compare.error;
    status.hidden = !text;
    status.textContent = text;
  }
}
function syncScryfallResults() {
  const list = document.querySelector(".scryfall-results");
  if (list) list.innerHTML = renderScryfallResultsMarkup() || '<p class="scryfall-placeholder">No Scryfall results selected yet.</p>';
}
async function searchScryfall() {
  const query = state.compare.query.trim();
  if (scryfallRequest) scryfallRequest.abort();
  if (query.length < 2) {
    state.compare.results = [];
    state.compare.error = "";
    state.compare.loading = false;
    syncScryfallStatus();
    syncScryfallResults();
    return;
  }
  const controller = new AbortController();
  scryfallRequest = controller;
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  state.compare.loading = true;
  state.compare.error = "";
  state.compare.results = [];
  syncScryfallStatus();
  try {
    const response = await fetch("https://api.scryfall.com/cards/search?unique=prints&order=name&q=" + encodeURIComponent(buildScryfallQuery(query)), { signal: controller.signal });
    if (scryfallRequest !== controller) return;
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
    if (scryfallRequest !== controller) return;
    state.compare.error = error.name === "AbortError" ? "Scryfall search timed out. Try again." : "Scryfall search failed. Try again in a moment.";
    state.compare.results = [];
  } finally {
    clearTimeout(timeoutId);
    if (scryfallRequest === controller) {
      scryfallRequest = null;
      state.compare.loading = false;
      syncScryfallStatus();
      syncScryfallResults();
    }
  }
}
function syncCompareControls() {
  const finish = byId("candidateFinish");
  const condition = byId("candidateCondition");
  if (finish) finish.value = state.compare.finish;
  if (condition) condition.value = state.compare.condition;
}
function syncCandidateComparison() {
  const left = cardById(state.compare.leftId) || state.filtered[0] || state.cards[0];
  const candidateSlot = byId("candidateCompareSlot");
  const breakdownSlot = byId("comparisonBreakdownSlot");
  if (candidateSlot) candidateSlot.innerHTML = candidateCompareCard();
  if (breakdownSlot) breakdownSlot.innerHTML = comparisonBreakdown(left);
  syncCompareControls();
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
  els.setFamilyShelf.addEventListener("click", (event) => {
    const all = event.target.closest("[data-set-family-all]");
    const button = event.target.closest("[data-set-family-id]");
    if (all) {
      state.filters.setFamily.clear();
      applyFilters();
      return;
    }
    if (button) toggleSetFamily(button.dataset.setFamilyId);
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
    if (button.dataset.action === "review") startReview(cardId);
    if (button.dataset.action === "compare") startCompare(cardId);
    if (button.dataset.action === "preview") openPreview(cardId);
  });
  els.results.addEventListener("input", (event) => {
    if (event.target.id === "scryfallQuery") {
      state.compare.query = event.target.value;
    }
  });
  els.results.addEventListener("keydown", (event) => {
    if (event.target.id === "scryfallQuery" && event.key === "Enter") {
      event.preventDefault();
      state.compare.query = event.target.value;
      searchScryfall();
    }
  });
  els.results.addEventListener("click", (event) => {
    const viewJump = event.target.closest("[data-view-jump]");
    if (viewJump) {
      setView(viewJump.dataset.viewJump);
      return;
    }
    const reviewStep = event.target.closest("[data-review-step]");
    if (reviewStep) {
      moveReview(Number(reviewStep.dataset.reviewStep));
      return;
    }
    const familyButton = event.target.closest("[data-set-family-id]");
    if (familyButton) {
      toggleSetFamily(familyButton.dataset.setFamilyId);
      return;
    }
    if (event.target.closest("#scryfallSearch")) {
      const input = byId("scryfallQuery");
      if (input) state.compare.query = input.value;
      searchScryfall();
    }
    const result = event.target.closest("[data-scryfall-index]");
    if (result) {
      state.compare.selected = state.compare.results[Number(result.dataset.scryfallIndex)];
      syncCandidateComparison();
    }
  });
  els.results.addEventListener("change", (event) => {
    if (event.target.id === "candidateFinish") state.compare.finish = event.target.value;
    if (event.target.id === "candidateCondition") state.compare.condition = event.target.value;
    if (event.target.id === "candidateAltered") state.compare.altered = event.target.checked;
    if (event.target.id === "candidateMisprint") state.compare.misprint = event.target.checked;
    if (event.target.id?.startsWith("candidate")) syncCandidateComparison();
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
    "binderShelf", "setFamilyShelf", "searchInput", "sortSelect", "binderFilter", "setFamilyFilter", "setFilter", "ownerFilter", "tradabilityFilter", "colorFilter", "typeFilter", "rarityFilter", "finishFilter", "conditionFilter", "resetFilters", "activeFilters", "selectVisible", "selectMarked", "compareSelected", "clearSelection", "downloadCsv", "downloadTxt", "downloadXml", "resultCount", "resultLabel", "selectedCount", "markedCount", "results", "previewModal",
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
*/ });
}

function readme(summary) {
  return `---
status: live
lane: shareables
type: public-shareable
pin: false
---

# Owned Card Trade Binders Shareable

Static GitHub Pages artifact for browsing Kyle and Eleni owned collection binders.

## Scope

- Public artifact: \`docs/shareables/${shareableSlug}/\`
- Generated at: \`${summary.generatedAt}\`
- Binders: ${summary.binderCount}
- Sets: ${summary.setCount}
- Rows: ${summary.rowCount}
- Total quantity: ${summary.totalQuantity}
- Market snapshot: ${summary.marketTotalFormatted}

The public data excludes raw import rows, local file paths, source spreadsheet paths, purchase-source details, importer IDs, and auto-generated import notes. Partner-owned cards are visible for browsing but marked not tradable.

## MVP Features

- Prominent binder switching across owned collection binders.
- Set-family switching plus family-grouped set dropdowns.
- Persistent multi-select filters with active filter chips and per-chip removal.
- Owner and tradability filters, plus tradability sorting.
- Grid, table, single-card review, set-grouped, and compare views.
- Full-card preview modal.
- Local-only select and mark state in the browser.
- Download selected rows as CSV, TXT, or XML.
- Scryfall-backed compare search for a visitor's possible trade card.

## Current Tradability Rules

- Eleni-owned cards, including Squirrel Away and partner precons, are not tradable.
- Dogmeat commander copies are not tradable.
- Avengers Assemble deck cards are hard trades.
- Fallout Scrappy Survivors deck cards and red/green/white Fallout cards without blue or black are hard trades.
- Artist-signed cards are hard trades.
- Other Kyle-owned cards default to neutral tradability.

## Future Auto Shareables

1. Move this generator behind an in-app Shareable Builder action on Collections.
2. Let Kyle choose a privacy profile before writing public data.
3. Keep tradability rules in a small editable policy file instead of this script.
4. Generate to \`docs/shareables/<slug>/\` with \`data/cards.json\` and \`shareable-spec.json\`.
5. Add a publish step that commits and pushes only the generated artifact after visual QA.
`;
}

function specJson(summary) {
  return {
    slug: shareableSlug,
    title: summary.title,
    type: "owned-collection-trade-shareable",
    status: "live",
    generatedAt: summary.generatedAt,
    source: {
      collectionPurpose: "owned",
      collectionKind: "binder",
      binderCount: summary.binderCount,
      setCount: summary.setCount,
    },
    privacy: {
      excludes: [
        "raw source rows",
        "local file paths",
        "source import file paths",
        "purchase source details",
        "importer IDs",
        "auto-generated import notes",
        "full private collection records",
      ],
      includes: [
        "card identity",
        "owned quantity",
        "owner",
        "tradability label and reason",
        "finish",
        "condition",
        "set and collector metadata",
        "public Scryfall links and image URLs",
        "market snapshot fields",
        "public tags",
        "public notes when present",
      ],
    },
    features: [
      "binder switcher",
      "persistent multi-select filters",
      "active filter chips",
      "owner filter",
      "tradability filter and sort",
      "search",
      "grid view",
      "table view",
      "set grouped view",
      "full-card preview",
      "Scryfall compare search",
      "select and mark",
      "CSV export",
      "TXT export",
      "XML export",
    ],
    summary,
  };
}

async function main() {
  const { cards, includedCollections } = await loadCards();
  const summary = buildSummary(cards, includedCollections);
  await mkdir(dataDir, { recursive: true });
  await rm(localCardImageDir, { recursive: true, force: true });
  await mkdir(localCardImageDir, { recursive: true });
  await Promise.all(Array.from(localCardImages, ([publicName, sourcePath]) => copyFile(sourcePath, path.join(localCardImageDir, publicName))));
  await Promise.all([
    writeFile(path.join(dataDir, "cards.json"), `${JSON.stringify({ summary, cards }, null, 2)}\n`),
    writeFile(path.join(outputDir, "index.html"), pageHtml(summary)),
    writeFile(path.join(outputDir, "styles.css"), stylesCss()),
    writeFile(path.join(outputDir, "script.js"), scriptJs()),
    writeFile(path.join(outputDir, "README.md"), readme(summary)),
    writeFile(path.join(outputDir, "shareable-spec.json"), `${JSON.stringify(specJson(summary), null, 2)}\n`),
  ]);
  console.log(`Wrote ${cards.length} public rows to ${path.relative(repoRoot, outputDir)}`);
  console.log(`${summary.totalQuantity} physical cards across ${summary.binderCount} binders and ${summary.setCount} sets, ${summary.marketTotalFormatted} market snapshot`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
