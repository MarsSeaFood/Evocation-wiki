import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const defaultConfig = {
  dataFile: "cards.csv",
  fields: [
    { key: "id", label: "ID", header: "id", role: "id" },
    { key: "nameCn", label: "中文名", header: "cardname_cn", role: "primaryName" },
    { key: "nameEn", label: "英文名", header: "cardname_en", role: "secondaryName" },
    { key: "effectCn", label: "中文效果", header: "cardeffect_cn", role: "body" },
    { key: "effectEn", label: "English Effect", header: "cardeffect_en", role: "body" }
  ]
};

const config = loadConfig();
const cardFile = config.dataFile || "cards.csv";
const outputFile = "changelog.json";
const idField = config.fields.find((field) => field.role === "id") || config.fields[0];
const compareFields = config.fields.filter((field) => field.role !== "id");

const commits = getCommits(cardFile);
const entries = commits.map((commit) => {
  const currentCards = readCardsAt(`${commit.hash}:${cardFile}`);
  const previousCards = commit.parent ? readCardsAt(`${commit.parent}:${cardFile}`) : [];

  return {
    id: commit.hash,
    time: commit.time,
    action: commit.subject || "更新卡牌数据",
    source: cardFile,
    commitUrl: getCommitUrl(commit.hash),
    changes: compareCards(previousCards, currentCards)
  };
});

writeFileSync(outputFile, `${JSON.stringify(entries, null, 2)}\n`, "utf8");

function loadConfig() {
  if (!existsSync("site-config.json")) {
    return defaultConfig;
  }

  try {
    const loaded = JSON.parse(readFileSync("site-config.json", "utf8"));
    return {
      ...defaultConfig,
      ...loaded,
      fields: Array.isArray(loaded.fields) ? loaded.fields : defaultConfig.fields
    };
  } catch (error) {
    return defaultConfig;
  }
}

function getCommits(file) {
  const output = git(["log", "--follow", "--format=%H%x09%cI%x09%s", "--", file]);
  if (!output.trim()) {
    return [];
  }

  return output
    .trim()
    .split("\n")
    .map((line) => {
      const [hash, time, ...subjectParts] = line.split("\t");
      return {
        hash,
        time,
        subject: subjectParts.join("\t"),
        parent: getFirstParent(hash)
      };
    });
}

function getFirstParent(hash) {
  const line = git(["rev-list", "--parents", "-n", "1", hash]).trim();
  return line.split(" ")[1] || "";
}

function readCardsAt(spec) {
  try {
    return normalizeCards(parseCsv(gitText(["show", spec])));
  } catch (error) {
    return [];
  }
}

function compareCards(previousCards, nextCards) {
  const previousMap = new Map(previousCards.map((card) => [getCardId(card), card]));
  const nextMap = new Map(nextCards.map((card) => [getCardId(card), card]));
  const added = [];
  const removed = [];
  const updated = [];
  let unchanged = 0;

  nextMap.forEach((nextCard, id) => {
    const previousCard = previousMap.get(id);
    if (!previousCard) {
      added.push(nextCard);
      return;
    }

    const fieldChanges = compareFields
      .map((field) => ({
        field: field.key || field.header,
        header: field.header,
        label: field.label || field.key || field.header,
        before: getValue(previousCard, field.header),
        after: getValue(nextCard, field.header)
      }))
      .filter((change) => change.before !== change.after);

    if (fieldChanges.length) {
      updated.push({
        before: previousCard,
        after: nextCard,
        fields: fieldChanges.map((field) => field.field),
        fieldChanges
      });
    } else {
      unchanged += 1;
    }
  });

  previousMap.forEach((previousCard, id) => {
    if (!nextMap.has(id)) {
      removed.push(previousCard);
    }
  });

  return {
    summary: {
      added: added.length,
      removed: removed.length,
      updated: updated.length,
      unchanged
    },
    added,
    removed,
    updated
  };
}

function parseCsv(text) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const records = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if (char === "\n" && !inQuotes) {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    records.push(row);
  }

  const [header, ...body] = records.filter((record) => record.some((value) => value.trim()));
  if (!header) {
    return [];
  }

  const keys = header.map((key) => key.trim());
  return body.map((record) => {
    const item = {};
    keys.forEach((key, index) => {
      item[key] = (record[index] || "").trim();
    });
    return item;
  });
}

function normalizeCards(rows) {
  return rows.filter((card) => getCardId(card));
}

function getCardId(card) {
  return getValue(card, idField.header || "id");
}

function getValue(card, header) {
  return String(card?.[header] || "").trim();
}

function getCommitUrl(hash) {
  const repo = process.env.GITHUB_REPOSITORY;
  const server = process.env.GITHUB_SERVER_URL || "https://github.com";
  return repo ? `${server}/${repo}/commit/${hash}` : "";
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function gitText(args) {
  return decodeText(execFileSync("git", args));
}

function decodeText(buffer) {
  const utf8Text = new TextDecoder("utf-8").decode(buffer);
  if (!looksBroken(utf8Text)) {
    return utf8Text;
  }

  try {
    return new TextDecoder("gb18030").decode(buffer);
  } catch (error) {
    return utf8Text;
  }
}

function looksBroken(text) {
  return text.includes("\uFFFD");
}
