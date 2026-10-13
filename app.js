(function () {
  const fallbackRows = window.CARD_WIKI_DATA || [];
  const defaultConfig = {
    siteName: "神力有限公司 Wiki",
    tagline: "Card Wiki Framework",
    dataFile: "cards.csv",
    fields: [
      { key: "id", label: "ID", header: "id", role: "id", showInCard: true, showInDetail: true, searchable: true },
      { key: "nameCn", label: "中文名", header: "cardname_cn", role: "primaryName", showInCard: false, showInDetail: true, searchable: true },
      { key: "nameEn", label: "英文名", header: "cardname_en", role: "secondaryName", showInCard: false, showInDetail: true, searchable: true },
      { key: "effectCn", label: "中文效果", header: "cardeffect_cn", role: "body", showInCard: true, showInDetail: true, searchable: true },
      { key: "effectEn", label: "English Effect", header: "cardeffect_en", role: "body", showInCard: true, showInDetail: true, searchable: true }
    ],
    category: {
      sourceRole: "id",
      defaultLabel: "其他",
      rules: [
        { prefix: "A", key: "action", label: "行动" },
        { prefix: "U", key: "unit", label: "单位" },
        { prefix: "E", key: "event", label: "事件" },
        { prefix: "S", key: "spell", label: "法术" },
        { prefix: "P", key: "passive", label: "被动" }
      ]
    }
  };

  let config = defaultConfig;
  let cards = normalizeRows(fallbackRows);
  let changelog = [];

  const state = {
    lang: "cn",
    type: "all",
    query: "",
    sort: "id",
    selectedId: cards[0]?.id || ""
  };

  const els = {
    pageTitle: document.querySelector("title"),
    tagline: document.querySelector("#siteTagline"),
    siteName: document.querySelector("#siteName"),
    adminLink: document.querySelector("#adminLink"),
    langCn: document.querySelector("#langCn"),
    langEn: document.querySelector("#langEn"),
    search: document.querySelector("#searchInput"),
    changelogList: document.querySelector("#changelogList"),
    downloadChangelog: document.querySelector("#downloadChangelog"),
    typeFilters: document.querySelector("#typeFilters"),
    sort: document.querySelector("#sortSelect"),
    grid: document.querySelector("#cardGrid"),
    empty: document.querySelector("#emptyState"),
    totalCount: document.querySelector("#totalCount"),
    visibleCount: document.querySelector("#visibleCount"),
    listTitle: document.querySelector("#listTitle"),
    detailArt: document.querySelector("#detailArt"),
    detailType: document.querySelector("#detailType"),
    detailName: document.querySelector("#detailName"),
    detailSubname: document.querySelector("#detailSubname"),
    detailFields: document.querySelector("#detailFields")
  };

  bindEvents();
  applyConfig();
  render();
  loadSiteData();

  function bindEvents() {
    els.langCn.addEventListener("click", () => setLang("cn"));
    els.langEn.addEventListener("click", () => setLang("en"));
    els.search.addEventListener("input", (event) => {
      state.query = event.target.value.trim().toLowerCase();
      render();
    });
    els.sort.addEventListener("change", (event) => {
      state.sort = event.target.value;
      render();
    });
    els.downloadChangelog.addEventListener("click", downloadChangelogCsv);
  }

  async function loadSiteData() {
    config = mergeConfig(defaultConfig, await fetchJson("site-config.json", defaultConfig));
    applyConfig();

    try {
      const [csvText, publicChangelog] = await Promise.all([
        fetchText(config.dataFile || "cards.csv"),
        fetchJson("changelog.json", [])
      ]);
      cards = normalizeRows(parseCsv(csvText));
      validateCards(cards);
      changelog = Array.isArray(publicChangelog) ? publicChangelog : [];
      state.selectedId = cards[0]?.id || "";
      renderTypeFilters();
      render();
    } catch (error) {
      changelog = [];
      render();
    }
  }

  function applyConfig() {
    els.pageTitle.textContent = config.siteName || defaultConfig.siteName;
    els.siteName.textContent = config.siteName || defaultConfig.siteName;
    els.tagline.textContent = config.tagline || defaultConfig.tagline;
    renderTypeFilters();
  }

  function setLang(lang) {
    state.lang = lang;
    els.langCn.classList.toggle("active", lang === "cn");
    els.langEn.classList.toggle("active", lang === "en");
    els.langCn.setAttribute("aria-pressed", String(lang === "cn"));
    els.langEn.setAttribute("aria-pressed", String(lang === "en"));
    els.search.placeholder = lang === "cn" ? "名称、ID、效果文本" : "Name, ID, effect text";
    render();
  }

  function renderTypeFilters() {
    els.typeFilters.innerHTML = "";
    getTypeOrder().forEach((key) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.type = key;
      button.textContent = key === "all" ? "全部" : getTypeLabel(key);
      button.addEventListener("click", () => {
        state.type = key;
        render();
      });
      els.typeFilters.append(button);
    });
  }

  function render() {
    const visible = getVisibleCards();
    const selected = visible.find((card) => card.id === state.selectedId) || visible[0] || cards[0];

    if (selected) {
      state.selectedId = selected.id;
    }

    els.totalCount.textContent = cards.length;
    els.visibleCount.textContent = visible.length;
    els.listTitle.textContent = state.type === "all" ? "全部卡牌" : getTypeLabel(state.type);
    els.empty.hidden = visible.length > 0;

    document.querySelectorAll("#typeFilters button").forEach((button) => {
      button.classList.toggle("active", button.dataset.type === state.type);
    });

    els.grid.innerHTML = "";
    visible.forEach((card) => els.grid.append(renderCard(card)));
    renderChangelog();
    renderDetail(selected);
  }

  function renderChangelog() {
    els.downloadChangelog.disabled = changelog.length === 0;
    els.changelogList.innerHTML = "";

    if (!changelog.length) {
      const empty = document.createElement("p");
      empty.className = "changelog-empty";
      empty.textContent = "还没有由 GitHub Action 生成的公共更新记录。";
      els.changelogList.append(empty);
      return;
    }

    changelog.forEach((entry) => {
      const item = document.createElement("article");
      item.className = "changelog-item";
      const summary = entry.changes?.summary || { added: 0, removed: 0, updated: 0, unchanged: 0 };
      const commitLink = entry.commitUrl
        ? `<a href="${escapeHtml(entry.commitUrl)}" target="_blank" rel="noreferrer">查看提交</a>`
        : "";

      item.innerHTML = `
        <div class="changelog-title">
          <strong>${escapeHtml(entry.action || "更新卡牌数据")}</strong>
          <time datetime="${escapeHtml(entry.time || "")}">${escapeHtml(formatTime(entry.time))}</time>
        </div>
        <p>${escapeHtml(entry.source || "cards.csv")}</p>
        <p class="change-summary">新增 ${summary.added}，删除 ${summary.removed}，修改 ${summary.updated}，未变 ${summary.unchanged}</p>
        ${renderChangeDetails(entry.changes || {})}
        ${commitLink}
      `;
      els.changelogList.append(item);
    });
  }

  function renderChangeDetails(changes) {
    const lines = [
      ...(changes.added || []).map((card) => `新增：${getRawId(card)} ${getDisplayName({ raw: card })}`),
      ...(changes.removed || []).map((card) => `删除：${getRawId(card)} ${getDisplayName({ raw: card })}`),
      ...(changes.updated || []).map((change) => {
        if (change.fieldChanges?.length) {
          const fields = change.fieldChanges.map((field) => field.label || field.field).join("、");
          return `修改：${getRawId(change.after)} ${getDisplayName({ raw: change.after })}（${fields}）`;
        }
        const fields = (change.fields || []).map((field) => getFieldLabel(field)).join("、");
        return `修改：${getRawId(change.after)} ${getDisplayName({ raw: change.after })}（${fields}）`;
      })
    ];

    if (!lines.length) {
      return '<p class="change-detail">没有检测到卡牌内容变化。</p>';
    }

    return `
      <ul class="change-detail">
        ${lines.slice(0, 12).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
        ${lines.length > 12 ? `<li>${escapeHtml(`还有 ${lines.length - 12} 项变化未展开`)}</li>` : ""}
      </ul>
    `;
  }

  function downloadChangelogCsv() {
    const rows = [["修改时间", "原文内容", "修改后内容"]];
    changelog.forEach((entry) => {
      const time = formatTime(entry.time);
      (entry.changes?.added || []).forEach((card) => {
        rows.push([time, "", formatCardSnapshot(card)]);
      });
      (entry.changes?.removed || []).forEach((card) => {
        rows.push([time, formatCardSnapshot(card), ""]);
      });
      (entry.changes?.updated || []).forEach((change) => {
        if (change.fieldChanges?.length) {
          change.fieldChanges.forEach((field) => {
            rows.push([time, `${field.label || field.field}: ${field.before || ""}`, `${field.label || field.field}: ${field.after || ""}`]);
          });
        } else {
          rows.push([time, formatCardSnapshot(change.before), formatCardSnapshot(change.after)]);
        }
      });
    });

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "changelog.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function getVisibleCards() {
    const filtered = cards.filter((card) => {
      const matchesType = state.type === "all" || card.type.key === state.type;
      const haystack = getSearchText(card);
      return matchesType && haystack.includes(state.query);
    });

    return filtered.sort((a, b) => {
      if (state.sort === "name") {
        return getDisplayName(a).localeCompare(getDisplayName(b), state.lang === "cn" ? "zh-Hans-CN" : "en");
      }
      return a.id.localeCompare(b.id, "en", { numeric: true });
    });
  }

  function renderCard(card) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.classList.toggle("selected", card.id === state.selectedId);
    button.addEventListener("click", () => {
      state.selectedId = card.id;
      render();
    });

    const visibleFields = config.fields.filter((field) => field.showInCard && field.role !== "id");
    button.innerHTML = `
      <div class="card-top">
        <span class="card-id">${escapeHtml(card.id)}</span>
        <span class="card-type">${escapeHtml(card.type.label)}</span>
      </div>
      <h3>${escapeHtml(getDisplayName(card))}</h3>
      <div class="card-effects">
        ${visibleFields.map((field) => `<p>${escapeHtml(getValue(card, field))}</p>`).join("")}
      </div>
    `;
    return button;
  }

  function renderDetail(card) {
    if (!card) {
      return;
    }

    els.detailArt.textContent = getArtGlyph(card);
    els.detailType.textContent = card.type.label;
    els.detailName.textContent = getDisplayName(card);
    els.detailSubname.textContent = getSecondaryName(card);
    els.detailFields.innerHTML = "";

    config.fields
      .filter((field) => field.showInDetail)
      .forEach((field) => {
        const box = document.createElement("div");
        box.className = field.role === "body" ? "effect-box" : "meta-box";
        box.innerHTML = `
          <span>${escapeHtml(field.label || field.key)}</span>
          <p>${escapeHtml(getValue(card, field))}</p>
        `;
        els.detailFields.append(box);
      });
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
      throw new Error("CSV 是空的。");
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

  function normalizeRows(rows) {
    return rows.map((row) => {
      const raw = { ...row };
      const id = getRawRoleValue(raw, "id") || getRawValue(raw, "id") || "";
      return {
        id: String(id).trim(),
        raw,
        type: getType(raw)
      };
    }).filter((card) => card.id);
  }

  function validateCards(nextCards) {
    if (!nextCards.length) {
      throw new Error("没有找到卡牌数据。");
    }
  }

  function fetchText(url) {
    return fetch(`${url}?v=${Date.now()}`).then((response) => {
      if (!response.ok) {
        throw new Error(`读取失败：${url}`);
      }
      return response.arrayBuffer();
    }).then((buffer) => {
      return decodeText(buffer);
    });
  }

  async function fetchJson(url, fallback) {
    try {
      const response = await fetch(`${url}?v=${Date.now()}`);
      if (!response.ok) {
        return fallback;
      }
      return response.json();
    } catch (error) {
      return fallback;
    }
  }

  function validateCsvRows(rows) {
    const firstRow = rows[0] || {};
    const missing = getRequiredHeaders().filter((header) => !Object.prototype.hasOwnProperty.call(firstRow, header));
    if (missing.length) {
      throw new Error(`缺少必要字段：${missing.join(", ")}`);
    }
  }

  function getRequiredHeaders() {
    return config.fields
      .filter((field) => ["id", "primaryName"].includes(field.role))
      .map((field) => field.header)
      .filter(Boolean);
  }

  function getTypeOrder() {
    return ["all", ...Array.from(new Set(cards.map((card) => card.type.key)))];
  }

  function getType(raw) {
    const source = getRawRoleValue(raw, config.category?.sourceRole || "id");
    const matched = (config.category?.rules || []).find((rule) => String(source).toUpperCase().startsWith(String(rule.prefix || "").toUpperCase()));
    return matched || { key: "other", label: config.category?.defaultLabel || "其他" };
  }

  function getTypeLabel(key) {
    if (key === "all") {
      return "全部";
    }
    const rule = (config.category?.rules || []).find((item) => item.key === key);
    return rule?.label || config.category?.defaultLabel || key;
  }

  function getDisplayName(card) {
    return getRoleValue(card, state.lang === "cn" ? "primaryName" : "secondaryName")
      || getRoleValue(card, "primaryName")
      || card.id;
  }

  function getSecondaryName(card) {
    return getRoleValue(card, state.lang === "cn" ? "secondaryName" : "primaryName") || "";
  }

  function getRoleValue(card, role) {
    return getRawRoleValue(card.raw, role);
  }

  function getRawRoleValue(raw, role) {
    const field = config.fields.find((item) => item.role === role);
    return field ? getRawValue(raw, field.header) : "";
  }

  function getRawId(raw) {
    return getRawRoleValue(raw, "id") || getRawValue(raw, "id");
  }

  function getValue(card, field) {
    return getRawValue(card.raw, field.header);
  }

  function getRawValue(raw, header) {
    return String(raw?.[header] || "").trim();
  }

  function getSearchText(card) {
    return config.fields
      .filter((field) => field.searchable)
      .map((field) => getValue(card, field))
      .join(" ")
      .toLowerCase();
  }

  function getFieldLabel(field) {
    const match = config.fields.find((item) => item.key === field || item.header === field);
    return match?.label || field;
  }

  function formatCardSnapshot(raw) {
    return config.fields
      .map((field) => `${field.label || field.key}: ${getRawValue(raw, field.header)}`)
      .join(" | ");
  }

  function formatTime(value) {
    if (!value) {
      return "";
    }
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date(value));
  }

  function getArtGlyph(card) {
    return getDisplayName(card).replace("+", "").trim().slice(0, 1).toUpperCase();
  }

  function mergeConfig(base, override) {
    return {
      ...base,
      ...override,
      fields: Array.isArray(override?.fields) ? override.fields : base.fields,
      category: {
        ...base.category,
        ...(override?.category || {}),
        rules: Array.isArray(override?.category?.rules) ? override.category.rules : base.category.rules
      }
    };
  }

  function csvEscape(value) {
    const text = String(value || "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function decodeText(buffer) {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    const utf8Text = new TextDecoder("utf-8").decode(bytes);
    if (!looksBroken(utf8Text)) {
      return utf8Text;
    }

    try {
      return new TextDecoder("gb18030").decode(bytes);
    } catch (error) {
      return utf8Text;
    }
  }

  function looksBroken(text) {
    const replacementCount = (text.match(/\uFFFD/g) || []).length;
    return replacementCount > 0;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
