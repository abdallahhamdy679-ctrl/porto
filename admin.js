const AUTH_KEY = "portfolio-admin-token";

/** @type {Record<string, unknown>} */
let siteData = {};

function getToken() {
  return sessionStorage.getItem(AUTH_KEY) || "";
}

function setToken(value) {
  if (value) sessionStorage.setItem(AUTH_KEY, value);
  else sessionStorage.removeItem(AUTH_KEY);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

function uid() {
  return `proj-${Date.now().toString(36)}`;
}

async function apiGetContent() {
  const res = await fetch("/api/content");
  if (!res.ok) throw new Error("load");
  return res.json();
}

async function apiSaveContent(data) {
  const res = await fetch("/api/content", {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "save");
}

async function apiUpload(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "upload");
  return body;
}

function showLogin(show) {
  document.getElementById("login-screen").hidden = !show;
  document.getElementById("admin-app").hidden = show;
}

function setStatus(msg, isError = false) {
  const el = document.getElementById("save-status");
  el.textContent = msg;
  el.classList.toggle("is-error", isError);
}

// --- Login ---
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = document.getElementById("login-password").value;
  setToken(password);
  const errEl = document.getElementById("login-error");
  try {
    const authRes = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!authRes.ok) {
      setToken("");
      throw new Error("كلمة مرور غير صحيحة.");
    }
    await loadAdmin();
    showLogin(false);
    errEl.hidden = true;
  } catch (err) {
    setToken("");
    errEl.hidden = false;
    errEl.textContent = err.message === "load" ? "تعذّر الاتصال. شغّل npm run dev." : err.message;
  }
});

document.getElementById("logout").addEventListener("click", () => {
  setToken("");
  showLogin(true);
});

// --- Tabs ---
document.querySelectorAll(".admin-tabs .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tabs .tab").forEach((t) => t.classList.remove("is-active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("is-active"));
    tab.classList.add("is-active");
    document.querySelector(`[data-panel="${tab.dataset.tab}"]`)?.classList.add("is-active");
  });
});

function projectLinksHtml(links, projectIndex) {
  return (links || [])
    .map(
      (link, li) => `
    <div class="inline-2">
      <input data-p="${projectIndex}" data-link="${li}" data-field="label" placeholder="التسمية" value="${escapeAttr(link.label)}" />
      <input data-p="${projectIndex}" data-link="${li}" data-field="url" placeholder="https://..." value="${escapeAttr(link.url)}" />
      <button type="button" class="btn btn-ghost btn-sm" data-remove-link="${projectIndex}:${li}">حذف</button>
    </div>`
    )
    .join("");
}

function escapeAttr(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function renderProjectsAdmin() {
  const list = document.getElementById("projects-list");
  const items = siteData.projects?.items ?? [];
  list.innerHTML = items
    .map(
      (proj, i) => `
    <article class="admin-card" data-project="${i}">
      <div class="admin-card-head">
        <strong>${escapeAttr(proj.title || "مشروع بدون عنوان")}</strong>
        <button type="button" class="btn btn-ghost btn-sm" data-delete-project="${i}">حذف</button>
      </div>
      <label>الوسم (Tag)<input data-p="${i}" data-field="tag" value="${escapeAttr(proj.tag)}" /></label>
      <label>العنوان<input data-p="${i}" data-field="title" value="${escapeAttr(proj.title)}" /></label>
      <label>الوصف<textarea data-p="${i}" data-field="description" rows="3">${escapeAttr(proj.description)}</textarea></label>
      <label>صورة (رابط من الرفع)<input data-p="${i}" data-field="image" value="${escapeAttr(proj.image)}" placeholder="/uploads/..." /></label>
      <fieldset>
        <legend>روابط</legend>
        <div class="links-wrap" data-links-wrap="${i}">${projectLinksHtml(proj.links, i)}</div>
        <button type="button" class="btn btn-ghost btn-sm" data-add-link="${i}">+ رابط</button>
      </fieldset>
    </article>`
    )
    .join("");

  list.querySelectorAll("[data-field]").forEach((el) => {
    el.addEventListener("input", onProjectFieldInput);
  });
  list.querySelectorAll("[data-delete-project]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.deleteProject);
      siteData.projects.items.splice(i, 1);
      renderProjectsAdmin();
    });
  });
  list.querySelectorAll("[data-add-link]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.addLink);
      const links = siteData.projects.items[i].links || [];
      links.push({ label: "معاينة", url: "https://" });
      siteData.projects.items[i].links = links;
      renderProjectsAdmin();
    });
  });
  list.querySelectorAll("[data-remove-link]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [pi, li] = btn.dataset.removeLink.split(":").map(Number);
      siteData.projects.items[pi].links.splice(li, 1);
      renderProjectsAdmin();
    });
  });
}

function onProjectFieldInput(e) {
  const el = e.target;
  const i = Number(el.dataset.p);
  const field = el.dataset.field;
  if (el.dataset.link !== undefined) {
    const li = Number(el.dataset.link);
    siteData.projects.items[i].links[li][field] = el.value;
    return;
  }
  siteData.projects.items[i][field] = el.value;
}

function field(label, id, value, type = "text") {
  return `<label>${label}<input id="${id}" type="${type}" value="${escapeAttr(value)}" /></label>`;
}

function renderProfileForm() {
  const p = siteData.profile || {};
  document.getElementById("form-profile").innerHTML = [
    field("الترحيب", "pf-eyebrow", p.eyebrow),
    field("الاسم (قبل التمييز)", "pf-nameBefore", p.nameBefore),
    field("جزء مميز من الاسم", "pf-nameHighlight", p.nameHighlight),
    field("المسمى", "pf-role", p.role),
    `<label>نبذة<textarea id="pf-lead" rows="3">${escapeAttr(p.lead)}</textarea></label>`,
    field("اختصار الشعار", "pf-logoText", p.logoText),
    field("رابط CV", "pf-cvPath", p.cvPath),
    field("اسم ملف CV عند التحميل", "pf-cvDownloadName", p.cvDownloadName),
  ].join("");

  const statsEl = document.getElementById("form-stats");
  statsEl.innerHTML = (siteData.stats || [])
    .map(
      (s, i) => `<div class="inline-2" data-stat="${i}">
      <input data-stat-field="value" value="${escapeAttr(s.value)}" placeholder="القيمة" />
      <input data-stat-field="label" value="${escapeAttr(s.label)}" placeholder="الوصف" />
      <button type="button" class="btn btn-ghost btn-sm" data-remove-stat="${i}">حذف</button>
    </div>`
    )
    .join("");
  statsEl.querySelectorAll("[data-remove-stat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      siteData.stats.splice(Number(btn.dataset.removeStat), 1);
      renderProfileForm();
    });
  });
}

function renderAboutContact() {
  const about = siteData.about || { paragraphs: [] };
  document.getElementById("form-about").innerHTML = `
    ${field("عنوان القسم", "ab-title", about.title)}
    <label>فقرات (سطر = فقرة)<textarea id="ab-paragraphs" rows="5">${escapeAttr((about.paragraphs || []).join("\n"))}</textarea></label>
  `;

  const c = siteData.contact || {};
  document.getElementById("form-contact").innerHTML = [
    field("عنوان", "ct-title", c.title),
    `<label>نص<textarea id="ct-text" rows="2">${escapeAttr(c.text)}</textarea></label>`,
    field("البريد", "ct-email", c.email, "email"),
    field("الهاتف (للرابط tel)", "ct-phone", c.phone),
    field("عرض الهاتف", "ct-phoneDisplay", c.phoneDisplay),
    field("رابط CV", "ct-cvPath", c.cvPath),
    field("اسم تحميل CV", "ct-cvDownloadName", c.cvDownloadName),
  ].join("");

  const socialEl = document.getElementById("form-social");
  socialEl.innerHTML = (c.social || [])
    .map(
      (s, i) => `<div class="inline-2" data-social="${i}">
      <input data-social-field="label" value="${escapeAttr(s.label)}" placeholder="LinkedIn" />
      <input data-social-field="url" value="${escapeAttr(s.url)}" placeholder="https://" />
      <button type="button" class="btn btn-ghost btn-sm" data-remove-social="${i}">حذف</button>
    </div>`
    )
    .join("");
  socialEl.querySelectorAll("[data-remove-social]").forEach((btn) => {
    btn.addEventListener("click", () => {
      siteData.contact.social.splice(Number(btn.dataset.removeSocial), 1);
      renderAboutContact();
    });
  });
}

function renderSkillsEducation() {
  const skills = siteData.skills?.items || [];
  document.getElementById("form-skills").innerHTML = skills
    .map(
      (s, i) => `<article class="admin-card compact" data-skill="${i}">
      <input data-skill-field="title" value="${escapeAttr(s.title)}" placeholder="العنوان" />
      <textarea data-skill-field="description" rows="2" placeholder="الوصف">${escapeAttr(s.description)}</textarea>
      <button type="button" class="btn btn-ghost btn-sm" data-remove-skill="${i}">حذف</button>
    </article>`
    )
    .join("");

  document.getElementById("form-skills").querySelectorAll("[data-remove-skill]").forEach((btn) => {
    btn.addEventListener("click", () => {
      siteData.skills.items.splice(Number(btn.dataset.removeSkill), 1);
      renderSkillsEducation();
    });
  });

  const edu = siteData.education?.items || [];
  document.getElementById("form-education").innerHTML = edu
    .map(
      (item, i) => `<article class="admin-card compact" data-edu="${i}">
      <input data-edu-field="meta" value="${escapeAttr(item.meta)}" placeholder="2026 · NTI" />
      <input data-edu-field="title" value="${escapeAttr(item.title)}" placeholder="العنوان" />
      <textarea data-edu-field="description" rows="2">${escapeAttr(item.description)}</textarea>
      <button type="button" class="btn btn-ghost btn-sm" data-remove-edu="${i}">حذف</button>
    </article>`
    )
    .join("");

  document.getElementById("form-education").querySelectorAll("[data-remove-edu]").forEach((btn) => {
    btn.addEventListener("click", () => {
      siteData.education.items.splice(Number(btn.dataset.removeEdu), 1);
      renderSkillsEducation();
    });
  });
}

function collectFormsIntoData() {
  const p = siteData.profile;
  p.eyebrow = document.getElementById("pf-eyebrow")?.value ?? p.eyebrow;
  p.nameBefore = document.getElementById("pf-nameBefore")?.value ?? p.nameBefore;
  p.nameHighlight = document.getElementById("pf-nameHighlight")?.value ?? p.nameHighlight;
  p.role = document.getElementById("pf-role")?.value ?? p.role;
  p.lead = document.getElementById("pf-lead")?.value ?? p.lead;
  p.logoText = document.getElementById("pf-logoText")?.value ?? p.logoText;
  p.cvPath = document.getElementById("pf-cvPath")?.value ?? p.cvPath;
  p.cvDownloadName = document.getElementById("pf-cvDownloadName")?.value ?? p.cvDownloadName;

  document.querySelectorAll("[data-stat]").forEach((row) => {
    const i = Number(row.dataset.stat);
    siteData.stats[i].value = row.querySelector('[data-stat-field="value"]').value;
    siteData.stats[i].label = row.querySelector('[data-stat-field="label"]').value;
  });

  siteData.about.title = document.getElementById("ab-title")?.value ?? siteData.about.title;
  siteData.about.paragraphs = (document.getElementById("ab-paragraphs")?.value ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const c = siteData.contact;
  c.title = document.getElementById("ct-title")?.value ?? c.title;
  c.text = document.getElementById("ct-text")?.value ?? c.text;
  c.email = document.getElementById("ct-email")?.value ?? c.email;
  c.phone = document.getElementById("ct-phone")?.value ?? c.phone;
  c.phoneDisplay = document.getElementById("ct-phoneDisplay")?.value ?? c.phoneDisplay;
  c.cvPath = document.getElementById("ct-cvPath")?.value ?? c.cvPath;
  c.cvDownloadName = document.getElementById("ct-cvDownloadName")?.value ?? c.cvDownloadName;

  document.querySelectorAll("[data-social]").forEach((row) => {
    const i = Number(row.dataset.social);
    c.social[i].label = row.querySelector('[data-social-field="label"]').value;
    c.social[i].url = row.querySelector('[data-social-field="url"]').value;
  });

  document.querySelectorAll("[data-skill]").forEach((card) => {
    const i = Number(card.dataset.skill);
    siteData.skills.items[i].title = card.querySelector('[data-skill-field="title"]').value;
    siteData.skills.items[i].description = card.querySelector('[data-skill-field="description"]').value;
  });

  document.querySelectorAll("[data-edu]").forEach((card) => {
    const i = Number(card.dataset.edu);
    siteData.education.items[i].meta = card.querySelector('[data-edu-field="meta"]').value;
    siteData.education.items[i].title = card.querySelector('[data-edu-field="title"]').value;
    siteData.education.items[i].description = card.querySelector('[data-edu-field="description"]').value;
  });

  siteData.meta.title = `${p.nameBefore} ${p.nameHighlight} | Portfolio`.replace(/\s+/g, " ").trim();
}

async function saveAll() {
  collectFormsIntoData();
  try {
    await apiSaveContent(siteData);
    setStatus("تم الحفظ بنجاح. حدّث صفحة الموقع لرؤية التغييرات.");
  } catch (err) {
    setStatus(err.message || "فشل الحفظ.", true);
  }
}

document.getElementById("save-all").addEventListener("click", saveAll);

document.getElementById("add-project").addEventListener("click", () => {
  siteData.projects.items.unshift({
    id: uid(),
    tag: "جديد",
    title: "مشروع جديد",
    description: "وصف المشروع...",
    image: "",
    links: [],
  });
  renderProjectsAdmin();
});

document.getElementById("add-stat").addEventListener("click", () => {
  siteData.stats.push({ value: "1", label: "جديد" });
  renderProfileForm();
});

document.getElementById("add-social").addEventListener("click", () => {
  siteData.contact.social.push({ label: "GitHub", url: "https://github.com/" });
  renderAboutContact();
});

document.getElementById("add-skill").addEventListener("click", () => {
  siteData.skills.items.push({ title: "مهارة", description: "" });
  renderSkillsEducation();
});

document.getElementById("add-education").addEventListener("click", () => {
  siteData.education.items.push({ meta: "2026", title: "عنوان", description: "" });
  renderSkillsEducation();
});

const uploadHistory = JSON.parse(localStorage.getItem("upload-history") || "[]");

function renderUploadHistory() {
  const ul = document.getElementById("upload-history");
  ul.innerHTML = uploadHistory
    .slice(0, 12)
    .map(
      (u) => `<li><code>${escapeAttr(u.path)}</code> — ${escapeAttr(u.name)}
      <button type="button" class="btn btn-ghost btn-sm" data-copy="${escapeAttr(u.path)}">نسخ</button></li>`
    )
    .join("");
  ul.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(btn.dataset.copy);
      setStatus("تم نسخ الرابط.");
    });
  });
}

document.getElementById("upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("upload-file");
  const file = input.files?.[0];
  if (!file) return;
  const result = document.getElementById("upload-result");
  result.textContent = "جاري الرفع...";
  try {
    const body = await apiUpload(file);
    result.innerHTML = `تم: <code>${body.path}</code>`;
    uploadHistory.unshift({ path: body.path, name: body.name });
    localStorage.setItem("upload-history", JSON.stringify(uploadHistory.slice(0, 20)));
    renderUploadHistory();
    input.value = "";
  } catch (err) {
    result.textContent = err.message || "فشل الرفع.";
  }
});

async function loadAdmin() {
  siteData = await apiGetContent();
  if (!siteData.projects) siteData.projects = { title: "", subtitle: "", items: [] };
  if (!siteData.projects.items) siteData.projects.items = [];
  if (!siteData.stats) siteData.stats = [];
  if (!siteData.contact) siteData.contact = { social: [] };
  if (!siteData.contact.social) siteData.contact.social = [];
  if (!siteData.skills) siteData.skills = { items: [] };
  if (!siteData.skills.items) siteData.skills.items = [];
  if (!siteData.education) siteData.education = { items: [] };
  if (!siteData.education.items) siteData.education.items = [];

  renderProjectsAdmin();
  renderProfileForm();
  renderAboutContact();
  renderSkillsEducation();
  renderUploadHistory();
}

async function tryAutoLogin() {
  if (!getToken()) {
    showLogin(true);
    return;
  }
  try {
    await loadAdmin();
    showLogin(false);
  } catch {
    setToken("");
    showLogin(true);
  }
}

tryAutoLogin();
