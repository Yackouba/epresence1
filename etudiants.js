(function () {
  "use strict";
  const app = window.EPRESENCE;
  if (!app || !app.session) return;

  const CLE = "epresence_etudiants";
  const FILIERE_PAR_CLASSE = { L1A: "Réseaux", L1B: "Informatique", L2A: "Cybersécurité", L2B: "Cybersécurité", L3A: "Informatique" };

  const PAR_DEFAUT = [
    { id: "e1",  matricule: "2024-001", nom: "OUEDRAOGO", prenom: "Ibrahim",  classe: "L1A", filiere: "Réseaux",       statut: "actif" },
    { id: "e2",  matricule: "2024-002", nom: "TRAORE",    prenom: "Awa",      classe: "L1A", filiere: "Réseaux",       statut: "actif" },
    { id: "e3",  matricule: "2024-003", nom: "DIALLO",    prenom: "Moussa",   classe: "L1B", filiere: "Informatique",  statut: "actif" },
    { id: "e4",  matricule: "2024-004", nom: "KABORE",    prenom: "Fatou",    classe: "L1B", filiere: "Informatique",  statut: "actif" },
    { id: "e5",  matricule: "2024-005", nom: "BARRY",     prenom: "Issa",     classe: "L2A", filiere: "Cybersécurité", statut: "actif" },
    { id: "e6",  matricule: "2024-006", nom: "SAWADOGO",  prenom: "Aminata",  classe: "L2A", filiere: "Cybersécurité", statut: "actif" },
    { id: "e7",  matricule: "2024-007", nom: "COMPAORE",  prenom: "Yacouba",  classe: "L2A", filiere: "Cybersécurité", statut: "actif" },
    { id: "e8",  matricule: "2024-008", nom: "ZONGO",     prenom: "Salamata", classe: "L1A", filiere: "Réseaux",       statut: "actif" },
    { id: "e9",  matricule: "2024-009", nom: "SANKARA",   prenom: "Boukary",  classe: "L1B", filiere: "Informatique",  statut: "inactif" },
    { id: "e10", matricule: "2024-010", nom: "OUATTARA",  prenom: "Mariam",   classe: "L2B", filiere: "Cybersécurité", statut: "actif" },
    { id: "e11", matricule: "2024-011", nom: "KONE",      prenom: "Seydou",   classe: "L3A", filiere: "Informatique",  statut: "actif" },
    { id: "e12", matricule: "2024-012", nom: "TIEMTORE",  prenom: "Rasmata",  classe: "L1A", filiere: "Réseaux",       statut: "actif" },
    { id: "e13", matricule: "2024-013", nom: "NIKIEMA",   prenom: "Alain",    classe: "L1B", filiere: "Informatique",  statut: "actif" }
  ];

  const $ = id => document.getElementById(id);
  const rows = $("rows"), pagination = $("pagination");
  const dlg = $("dlg"), form = $("form"), erreur = $("form-error"), dlgDel = $("dlg-del");
  const champs = {
    matricule: $("f-matricule"), nom: $("f-nom"), prenom: $("f-prenom"),
    classe: $("f-classe"), filiere: $("f-filiere"), statut: $("f-statut")
  };

  let etudiants = charger();
  const etat = { q: "", page: 1, parPage: 5, mode: "add", id: null, aSupprimer: null };

  function charger() {
    try {
      const d = JSON.parse(localStorage.getItem(CLE));
      if (Array.isArray(d)) return d;
    } catch (e) {}
    return PAR_DEFAUT.map(e => ({ ...e }));
  }
  function sauver() { try { localStorage.setItem(CLE, JSON.stringify(etudiants)); } catch (e) {} }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  function filtrer() {
    const q = norm(etat.q.trim());
    if (!q) return etudiants;
    return etudiants.filter(s => norm([s.matricule, s.nom, s.prenom, s.classe, s.filiere].join(" ")).includes(q));
  }

  function pagesVisibles(total, cur) {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const nums = [...new Set([1, total, cur - 1, cur, cur + 1])].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
    const out = [];
    nums.forEach((p, i) => { if (i && p - nums[i - 1] > 1) out.push("…"); out.push(p); });
    return out;
  }

  function afficher() {
    const liste = filtrer();
    const pages = Math.max(1, Math.ceil(liste.length / etat.parPage));
    etat.page = Math.min(Math.max(etat.page, 1), pages);
    const debut = (etat.page - 1) * etat.parPage;
    const visibles = liste.slice(debut, debut + etat.parPage);

    rows.innerHTML = visibles.length ? visibles.map(s => `
      <tr>
        <td>${esc(s.matricule)}</td>
        <td>${esc(s.nom)} ${esc(s.prenom)}</td>
        <td>${esc(s.classe)}</td>
        <td>${esc(s.filiere)}</td>
        <td><span class="badge ${s.statut === "actif" ? "ok" : "off"}">${s.statut === "actif" ? "Actif" : "Inactif"}</span></td>
        <td>
          <div class="actions">
            <button class="icon-btn" data-action="edit" data-id="${s.id}" aria-label="Modifier ${esc(s.nom)} ${esc(s.prenom)}"><svg viewBox="0 0 24 24"><use href="#i-edit"/></svg></button>
            <button class="icon-btn" data-action="view" data-id="${s.id}" aria-label="Voir ${esc(s.nom)} ${esc(s.prenom)}"><svg viewBox="0 0 24 24"><use href="#i-eye"/></svg></button>
            <button class="icon-btn danger" data-action="delete" data-id="${s.id}" aria-label="Supprimer ${esc(s.nom)} ${esc(s.prenom)}"><svg viewBox="0 0 24 24"><use href="#i-trash"/></svg></button>
          </div>
        </td>
      </tr>`).join("")
      : `<tr><td class="empty" colspan="6">Aucun étudiant trouvé.</td></tr>`;

    pagination.innerHTML = pagesVisibles(pages, etat.page).map(p =>
      p === "…" ? `<span class="page-gap" aria-hidden="true">…</span>`
        : `<button class="page-btn" data-page="${p}" ${p === etat.page ? 'aria-current="page"' : ""} aria-label="Page ${p}">${p}</button>`
    ).join("");
  }

  /* ---------- Événements du tableau ---------- */
  $("search").addEventListener("input", e => { etat.q = e.target.value; etat.page = 1; afficher(); });
  $("per-page").addEventListener("change", e => { etat.parPage = +e.target.value; etat.page = 1; afficher(); });
  pagination.addEventListener("click", e => {
    const b = e.target.closest("[data-page]");
    if (b) { etat.page = +b.dataset.page; afficher(); }
  });
  rows.addEventListener("click", e => {
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const id = b.dataset.id;
    if (b.dataset.action === "delete") demanderSuppression(id);
    else ouvrir(b.dataset.action, id);
  });
  $("btn-add").addEventListener("click", () => ouvrir("add"));

  /* ---------- Formulaire (ajout / modification / détails) ---------- */
  function prochainMatricule() {
    const max = etudiants.reduce((m, s) => Math.max(m, parseInt((s.matricule.split("-")[1] || "0"), 10) || 0), 0);
    return "2024-" + String(max + 1).padStart(3, "0");
  }

  function ouvrir(mode, id) {
    etat.mode = mode; etat.id = id || null;
    erreur.hidden = true;
    const e = id ? etudiants.find(x => x.id === id) : null;
    $("dlg-title").textContent = { add: "Ajouter un étudiant", edit: "Modifier l'étudiant", view: "Détails de l'étudiant" }[mode];
    champs.matricule.value = e ? e.matricule : prochainMatricule();
    champs.nom.value = e ? e.nom : "";
    champs.prenom.value = e ? e.prenom : "";
    champs.classe.value = e ? e.classe : "L1A";
    champs.filiere.value = e ? e.filiere : FILIERE_PAR_CLASSE.L1A;
    champs.statut.value = e ? e.statut : "actif";
    const lecture = mode === "view";
    Object.values(champs).forEach(c => (c.disabled = lecture));
    $("f-submit").hidden = lecture;
    dlg.showModal();
    if (!lecture) champs.nom.focus();
  }

  champs.classe.addEventListener("change", () => {
    if (FILIERE_PAR_CLASSE[champs.classe.value]) champs.filiere.value = FILIERE_PAR_CLASSE[champs.classe.value];
  });

  form.addEventListener("submit", ev => {
    ev.preventDefault();
    const d = {
      matricule: champs.matricule.value.trim(),
      nom: champs.nom.value.trim().toUpperCase(),
      prenom: champs.prenom.value.trim(),
      classe: champs.classe.value,
      filiere: champs.filiere.value,
      statut: champs.statut.value
    };
    if (!d.matricule || !d.nom || !d.prenom) {
      erreur.textContent = "Renseignez le matricule, le nom et le prénom.";
      erreur.hidden = false; return;
    }
    if (etudiants.some(s => s.matricule === d.matricule && s.id !== etat.id)) {
      erreur.textContent = "Ce matricule est déjà utilisé par un autre étudiant.";
      erreur.hidden = false; return;
    }
    if (etat.mode === "edit") {
      Object.assign(etudiants.find(s => s.id === etat.id), d);
      app.message("Étudiant modifié.");
    } else {
      etudiants.push({ id: "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ...d });
      etat.page = Math.ceil(etudiants.length / etat.parPage);
      app.message("Étudiant ajouté.");
    }
    sauver(); afficher(); dlg.close();
  });

  dlg.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => dlg.close()));

  /* ---------- Suppression ---------- */
  function demanderSuppression(id) {
    const s = etudiants.find(x => x.id === id);
    if (!s) return;
    etat.aSupprimer = id;
    $("del-name").textContent = s.nom + " " + s.prenom;
    dlgDel.showModal();
  }
  $("del-confirm").addEventListener("click", () => {
    etudiants = etudiants.filter(s => s.id !== etat.aSupprimer);
    sauver(); afficher(); dlgDel.close();
    app.message("Étudiant supprimé.");
  });
  dlgDel.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => dlgDel.close()));

  afficher();
})();
