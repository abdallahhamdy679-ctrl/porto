function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderProjectCard(project) {
  const imageBlock = project.image
    ? `<img class="project-thumb" src="${escapeHtml(project.image)}" alt="" loading="lazy" />`
    : "";
  const links =
    project.links?.length > 0
      ? `<div class="project-links">${project.links
          .map(
            (link) =>
              `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`
          )
          .join("")}</div>`
      : "";
  return `<article class="project-card" data-id="${escapeHtml(project.id)}">
    ${imageBlock}
    <div class="project-tag">${escapeHtml(project.tag || "")}</div>
    <h3>${escapeHtml(project.title)}</h3>
    <p>${escapeHtml(project.description)}</p>
    ${links}
  </article>`;
}

export function renderSite(data) {
  document.title = data.meta?.title ?? document.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc && data.meta?.description) desc.setAttribute("content", data.meta.description);

  const p = data.profile;
  if (p) {
    const eyebrow = document.querySelector(".eyebrow");
    if (eyebrow) eyebrow.textContent = p.eyebrow ?? "";
    const title = document.querySelector(".hero-title");
    if (title) {
      title.innerHTML = `${escapeHtml(p.nameBefore ?? "")} <span class="text-accent">${escapeHtml(p.nameHighlight ?? "")}</span>`;
    }
    const role = document.querySelector(".hero-role");
    if (role) role.textContent = p.role ?? "";
    const lead = document.querySelector(".hero-lead");
    if (lead) lead.textContent = p.lead ?? "";
    const logo = document.querySelector(".logo-text");
    if (logo) logo.textContent = p.logoText ?? "";
    const cvBtn = document.querySelector(".hero-actions .btn-cv");
    if (cvBtn && p.cvPath) {
      cvBtn.href = p.cvPath;
      cvBtn.download = p.cvDownloadName || "CV.pdf";
    }
  }

  const statsEl = document.querySelector(".hero-stats");
  if (statsEl && data.stats) {
    statsEl.innerHTML = data.stats
      .map(
        (s) => `<li><strong>${escapeHtml(s.value)}</strong><span>${escapeHtml(s.label)}</span></li>`
      )
      .join("");
  }

  const codeEl = document.querySelector(".code-snippet code");
  if (codeEl && data.codeSnippetHtml) {
    codeEl.innerHTML = data.codeSnippetHtml;
  }

  const about = data.about;
  if (about) {
    const aboutSection = document.querySelector("#about");
    const title = aboutSection?.querySelector(".section-title");
    if (title) title.textContent = about.title ?? "عني";
    const container = aboutSection?.querySelector(".container");
    if (container) {
      const paras = (about.paragraphs ?? [])
        .map((t) => `<p class="section-text">${escapeHtml(t)}</p>`)
        .join("");
      container.innerHTML = `<h2 class="section-title">${escapeHtml(about.title ?? "عني")}</h2>${paras}`;
    }
  }

  const edu = data.education;
  if (edu) {
    const section = document.querySelector("#education");
    const list = edu.items
      ?.map(
        (item) => `<li class="timeline-item">
        <p class="timeline-meta">${escapeHtml(item.meta)}</p>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </li>`
      )
      .join("");
    if (section) {
      section.innerHTML = `<div class="container">
        <h2 class="section-title">${escapeHtml(edu.title ?? "")}</h2>
        <ul class="timeline">${list ?? ""}</ul>
      </div>`;
    }
  }

  const skills = data.skills;
  if (skills) {
    const section = document.querySelector("#skills");
    const cards = skills.items
      ?.map(
        (s) => `<li class="skill-card"><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.description)}</p></li>`
      )
      .join("");
    if (section) {
      section.innerHTML = `<div class="container">
        <h2 class="section-title">${escapeHtml(skills.title ?? "")}</h2>
        <ul class="skills-grid">${cards ?? ""}</ul>
      </div>`;
    }
  }

  const projects = data.projects;
  if (projects) {
    const section = document.querySelector("#projects");
    const count = projects.items?.length ?? 0;
    const gridClass =
      count <= 2 ? "projects-grid projects-grid--two" : "projects-grid";
    const cards = projects.items?.map(renderProjectCard).join("") ?? "";
    if (section) {
      section.innerHTML = `<div class="container">
        <div class="section-head">
          <h2 class="section-title">${escapeHtml(projects.title ?? "")}</h2>
          <p class="section-sub">${escapeHtml(projects.subtitle ?? "")}</p>
        </div>
        <div class="${gridClass}">${cards}</div>
      </div>`;
    }
  }

  const c = data.contact;
  if (c) {
    const section = document.querySelector("#contact");
    const social = c.social
      ?.map(
        (s) =>
          `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a></li>`
      )
      .join("");
    if (section) {
      section.innerHTML = `<div class="container narrow contact-block">
        <h2 class="section-title">${escapeHtml(c.title ?? "")}</h2>
        <p class="section-text">${escapeHtml(c.text ?? "")}</p>
        <a class="contact-email" href="mailto:${escapeHtml(c.email ?? "")}">${escapeHtml(c.email ?? "")}</a>
        <p class="contact-phone"><a href="tel:${escapeHtml(c.phone ?? "")}">${escapeHtml(c.phoneDisplay ?? c.phone ?? "")}</a></p>
        <p class="contact-cv"><a href="${escapeHtml(c.cvPath ?? "")}" download="${escapeHtml(c.cvDownloadName ?? "CV.pdf")}">تحميل السيرة الذاتية (PDF)</a></p>
        <ul class="social-links">${social ?? ""}</ul>
      </div>`;
    }
  }

  const footerName = document.querySelector(".site-footer .footer-inner p");
  if (footerName && data.footer?.name) {
    footerName.innerHTML = `© <span id="year"></span> ${escapeHtml(data.footer.name)}. صُنع باهتمام.`;
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }
}

export async function loadSiteData() {
  const res = await fetch("/data/site.json", { cache: "no-store" });
  if (!res.ok) throw new Error("failed");
  return res.json();
}
