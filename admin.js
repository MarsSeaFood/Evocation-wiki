(function () {
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
        { prefix: "U", key: "unit", label: "单位" }
      ]
    }
  };

  let config = defaultConfig;

  const els = {
    siteName: document.querySelector("#siteNameInput"),
    tagline: document.querySelector("#taglineInput"),
    dataFile: document.querySelector("#dataFileInput"),
    categorySource: document.querySelector("#categorySourceInput"),
    defaultCategory: document.querySelector("#defaultCategoryInput"),
    fieldTable: document.querySelector("#fieldTable"),
    ruleTable: document.querySelector("#ruleTable"),
    addField: document.querySelector("#addField"),
    addRule: document.querySelector("#addRule"),
    downloadConfig: document.querySelector("#downloadConfig")
  };

  loadConfig();
  bindEvents();

  async function loadConfig() {
    try {
      const response = await fetch(`site-config.json?v=${Date.now()}`);
      config = response.ok ? await response.json() : defaultConfig;
    } catch (error) {
      config = defaultConfig;
    }
    render();
  }

  function bindEvents() {
    [els.siteName, els.tagline, els.dataFile, els.categorySource, els.defaultCategory].forEach((input) => {
      input.addEventListener("input", readForm);
    });
    els.addField.addEventListener("click", () => {
      config.fields.push({
        key: `field${config.fields.length + 1}`,
        label: "新字段",
        header: "",
        role: "body",
        showInCard: false,
        showInDetail: true,
        searchable: true
      });
      render();
    });
    els.addRule.addEventListener("click", () => {
      config.category.rules.push({ prefix: "", key: "custom", label: "新分类" });
      render();
    });
    els.downloadConfig.addEventListener("click", downloadConfig);
  }

  function render() {
    els.siteName.value = config.siteName || "";
    els.tagline.value = config.tagline || "";
    els.dataFile.value = config.dataFile || "cards.csv";
    els.categorySource.value = config.category?.sourceRole || "id";
    els.defaultCategory.value = config.category?.defaultLabel || "其他";
    renderFields();
    renderRules();
  }

  function renderFields() {
    els.fieldTable.innerHTML = `
      <div class="field-row field-head">
        <span>属性键</span><span>显示名称</span><span>CSV 表头</span><span>角色</span><span>卡片</span><span>详情</span><span>搜索</span><span></span>
      </div>
    `;
    config.fields.forEach((field, index) => {
      const row = document.createElement("div");
      row.className = "field-row";
      row.innerHTML = `
        <input value="${escapeHtml(field.key)}" data-field="${index}" data-prop="key">
        <input value="${escapeHtml(field.label)}" data-field="${index}" data-prop="label">
        <input value="${escapeHtml(field.header)}" data-field="${index}" data-prop="header">
        <select data-field="${index}" data-prop="role">
          ${["id", "primaryName", "secondaryName", "body", "meta"].map((role) => `<option value="${role}" ${field.role === role ? "selected" : ""}>${role}</option>`).join("")}
        </select>
        <input type="checkbox" ${field.showInCard ? "checked" : ""} data-field="${index}" data-prop="showInCard">
        <input type="checkbox" ${field.showInDetail ? "checked" : ""} data-field="${index}" data-prop="showInDetail">
        <input type="checkbox" ${field.searchable ? "checked" : ""} data-field="${index}" data-prop="searchable">
        <button class="text-button danger" type="button" data-remove-field="${index}">删除</button>
      `;
      els.fieldTable.append(row);
    });
    els.fieldTable.querySelectorAll("input, select").forEach((control) => control.addEventListener("input", readFieldControl));
    els.fieldTable.querySelectorAll("[data-remove-field]").forEach((button) => {
      button.addEventListener("click", () => {
        config.fields.splice(Number(button.dataset.removeField), 1);
        renderFields();
      });
    });
  }

  function renderRules() {
    els.ruleTable.innerHTML = `
      <div class="rule-row field-head"><span>ID 前缀</span><span>分类键</span><span>显示名称</span><span></span></div>
    `;
    config.category.rules.forEach((rule, index) => {
      const row = document.createElement("div");
      row.className = "rule-row";
      row.innerHTML = `
        <input value="${escapeHtml(rule.prefix)}" data-rule="${index}" data-prop="prefix">
        <input value="${escapeHtml(rule.key)}" data-rule="${index}" data-prop="key">
        <input value="${escapeHtml(rule.label)}" data-rule="${index}" data-prop="label">
        <button class="text-button danger" type="button" data-remove-rule="${index}">删除</button>
      `;
      els.ruleTable.append(row);
    });
    els.ruleTable.querySelectorAll("input").forEach((control) => control.addEventListener("input", readRuleControl));
    els.ruleTable.querySelectorAll("[data-remove-rule]").forEach((button) => {
      button.addEventListener("click", () => {
        config.category.rules.splice(Number(button.dataset.removeRule), 1);
        renderRules();
      });
    });
  }

  function readForm() {
    config.siteName = els.siteName.value.trim();
    config.tagline = els.tagline.value.trim();
    config.dataFile = els.dataFile.value.trim() || "cards.csv";
    config.category = config.category || {};
    config.category.sourceRole = els.categorySource.value.trim() || "id";
    config.category.defaultLabel = els.defaultCategory.value.trim() || "其他";
  }

  function readFieldControl(event) {
    const index = Number(event.target.dataset.field);
    const prop = event.target.dataset.prop;
    config.fields[index][prop] = event.target.type === "checkbox" ? event.target.checked : event.target.value.trim();
  }

  function readRuleControl(event) {
    const index = Number(event.target.dataset.rule);
    const prop = event.target.dataset.prop;
    config.category.rules[index][prop] = event.target.value.trim();
  }

  function downloadConfig() {
    readForm();
    const blob = new Blob([`${JSON.stringify(config, null, 2)}\n`], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "site-config.json";
    link.click();
    URL.revokeObjectURL(url);
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
