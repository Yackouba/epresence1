document.addEventListener("DOMContentLoaded", () => {
  // La session, le menu et la déconnexion sont gérés par layout.js
  const app = window.EPRESENCE;
  if (!app || !app.session) return;

  /* ---------- Compteurs animés ---------- */
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("[data-count]").forEach(el => {
    const cible = +el.dataset.count;
    if (reduit) return;
    const debut = performance.now(), duree = 900;
    (function etape(t) {
      const p = Math.min((t - debut) / duree, 1);
      el.textContent = Math.round(cible * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(etape);
    })(debut);
  });

  /* ---------- Présences du jour (données modifiables) ---------- */
  const presences = [
    { label: "Présents", valeur: 227, couleur: "#2fb36d" },
    { label: "Absents",  valeur: 12,  couleur: "#ec5b5b" },
    { label: "Retards",  valeur: 6,   couleur: "#f5b324" },
    { label: "Excusés",  valeur: 3,   couleur: "#1fb893" }
  ];
  const total = presences.reduce((s, p) => s + p.valeur, 0);
  const taux = Math.round(presences[0].valeur / total * 100);
  document.getElementById("donut-pct").textContent = taux + "%";

  const NS = "http://www.w3.org/2000/svg", R = 70, C = 2 * Math.PI * R;
  const svg = document.getElementById("donut");
  let decalage = 0;
  presences.forEach(p => {
    const part = p.valeur / total * C;
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("class", "donut-seg");
    c.setAttribute("cx", 90); c.setAttribute("cy", 90); c.setAttribute("r", R);
    c.setAttribute("stroke", p.couleur);
    c.setAttribute("stroke-dasharray", "0 " + C);
    c.setAttribute("stroke-dashoffset", -decalage);
    svg.appendChild(c);
    requestAnimationFrame(() => requestAnimationFrame(() =>
      c.setAttribute("stroke-dasharray", Math.max(part - 1.5, 0) + " " + (C - part + 1.5))));
    decalage += part;
  });

  document.getElementById("legend").innerHTML = presences.map(p =>
    `<li><span class="dot" style="background:${p.couleur}"></span>${p.label}<span class="val">${p.valeur}</span></li>`
  ).join("");

  /* ---------- Dernières activités (données modifiables) ---------- */
  const activites = [
    { icone: "i-plus",      classe: "",     titre: "Nouveau cours ajouté",    detail: "Réseaux et sécurité - 2ème année", temps: "Il y a 2 heures" },
    { icone: "i-edit",      classe: "blue", titre: "Modification d'une présence", detail: "par M. Diallo - Mathématiques", temps: "Il y a 3 heures" },
    { icone: "i-user-plus", classe: "",     titre: "Ajout d'un étudiant",     detail: "OUEDRAOGO Ibrahim - 1ère année", temps: "Il y a 5 heures" }
  ];
  document.getElementById("activities").innerHTML = activites.map(a => `
    <li>
      <span class="act-ico ${a.classe}"><svg viewBox="0 0 24 24"><use href="#${a.icone}"/></svg></span>
      <div class="act-text"><strong>${a.titre}</strong><span>${a.detail}</span><small>${a.temps}</small></div>
    </li>`).join("");
});
