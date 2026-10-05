(function () {
  "use strict";
  const app = window.EPRESENCE;
  if (!app || !app.session) return;

  const CLE = "epresence_appel";
  const SEANCE = { id: "2025-03-27|L1A|Réseaux informatiques" };

  const STATUTS = { present: "Présent", absent: "Absent", retard: "Retard", excuse: "Excusé" };
  const FILTRES = [["tous", "Tous"], ["present", "Présents"], ["absent", "Absents"], ["retard", "Retards"], ["excuse", "Excusés"]];

  // [matricule, nom, prénom, statut initial]
  const LISTE = [
    ["2024-001", "OUEDRAOGO", "Ibrahim", "present"], ["2024-002", "TRAORE", "Awa", "present"],
    ["2024-003", "DIALLO", "Moussa", "present"],     ["2024-004", "KABORE", "Fatou", "retard"],
    ["2024-005", "BARRY", "Issa", "present"],        ["2024-006", "SAWADOGO", "Aminata", "present"],
    ["2024-007", "COMPAORE", "Yacouba", "absent"],   ["2024-008", "ZONGO", "Salamata", "present"],
    ["2024-009", "SANKARA", "Boukary", "present"],   ["2024-010", "OUATTARA", "Mariam", "present"],
    ["2024-011", "KONE", "Seydou", "present"],       ["2024-012", "TIEMTORE", "Rasmata", "present"],
    ["2024-013", "NIKIEMA", "Alain", "present"],     ["2024-014", "SOME", "Clarisse", "present"],
    ["2024-015", "DABIRE", "Eric", "present"],       ["2024-016", "YAMEOGO", "Pauline", "absent"],
    ["2024-017", "TAPSOBA", "Moussa", "present"],    ["2024-018", "BELEM", "Nadège", "present"],
    ["2024-019", "LOMPO", "Abdoul", "present"],      ["2024-020", "KAMBOU", "Estelle", "present"],
    ["2024-021", "ILBOUDO", "Rodrigue", "present"],  ["2024-022", "THIOMBIANO", "Awa", "present"],
    ["2024-023", "BAMOGO", "Hamed", "present"],      ["2024-024", "ZIDA", "Josiane", "present"],
    ["2024-025", "GUIRA", "Souleymane", "present"]
  ];

  const eleves = LISTE.map(([matricule, nom, prenom, statut]) => ({ matricule, nom, prenom, statut }));
  try {
    const sauve = (JSON.parse(localStorage.getItem(CLE)) || {})[SEANCE.id];
    if (sauve) eleves.forEach(e => { if (STATUTS[sauve[e.matricule]]) e.statut = sauve[e.matricule]; });
  } catch (e) {}

  const $ = id => document.getElementById(id);
  const rows = $("rows"), chips = $("chips"), bulk = $("bulk"), tout = $("check-all");
  const etat = { filtre: "tous", selection: new Set() };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const compter = s => s === "tous" ? eleves.length : eleves.filter(e => e.statut === s).length;
  const visibles = () => eleves.filter(e => etat.filtre === "tous" || e.statut === etat.filtre);

  function afficherFiltres() {
    chips.innerHTML = FILTRES.map(([s, l]) =>
      `<button type="button" class="chip" data-s="${s}" aria-pressed="${s === etat.filtre}">${l} (${compter(s)})</button>`).join("");
  }

  function afficherLignes() {
    const liste = visibles();
    rows.innerHTML = liste.length ? liste.map(e => `
      <tr class="${etat.selection.has(e.matricule) ? "selected" : ""}">
        <td>${eleves.indexOf(e) + 1}</td>
        <td>${e.matricule}</td>
        <td>${esc(e.nom)} ${esc(e.prenom)}</td>
        <td>
          <span class="st-wrap st-${e.statut}">
            <select class="st-select st-${e.statut}" data-m="${e.matricule}" aria-label="Statut de ${esc(e.nom)} ${esc(e.prenom)}">
              ${Object.entries(STATUTS).map(([k, v]) => `<option value="${k}" ${k === e.statut ? "selected" : ""}>${v}</option>`).join("")}
            </select>
          </span>
        </td>
        <td class="col-check"><input type="checkbox" data-m="${e.matricule}" ${etat.selection.has(e.matricule) ? "checked" : ""} aria-label="Sélectionner ${esc(e.nom)} ${esc(e.prenom)}"></td>
      </tr>`).join("")
      : `<tr><td class="empty" colspan="5">Aucun étudiant avec ce statut.</td></tr>`;
    majSelection();
  }

  function majSelection() {
    const vis = visibles();
    const nb = vis.filter(e => etat.selection.has(e.matricule)).length;
    tout.checked = vis.length > 0 && nb === vis.length;
    tout.indeterminate = nb > 0 && nb < vis.length;
    $("bulk-count").textContent = etat.selection.size + (etat.selection.size > 1 ? " sélectionnés" : " sélectionné");
    bulk.hidden = etat.selection.size === 0;
  }

  const tout_afficher = () => { afficherFiltres(); afficherLignes(); };

  chips.addEventListener("click", ev => {
    const b = ev.target.closest("[data-s]");
    if (b) { etat.filtre = b.dataset.s; tout_afficher(); }
  });

  rows.addEventListener("change", ev => {
    const m = ev.target.dataset.m;
    if (!m) return;
    if (ev.target.matches("select")) {
      eleves.find(e => e.matricule === m).statut = ev.target.value;
      tout_afficher();
    } else {
      ev.target.checked ? etat.selection.add(m) : etat.selection.delete(m);
      ev.target.closest("tr").classList.toggle("selected", ev.target.checked);
      majSelection();
    }
  });

  tout.addEventListener("change", () => {
    visibles().forEach(e => tout.checked ? etat.selection.add(e.matricule) : etat.selection.delete(e.matricule));
    afficherLignes();
  });

  // Action groupée sur la sélection
  $("bulk-apply").addEventListener("click", () => {
    const s = $("bulk-status").value;
    eleves.forEach(e => { if (etat.selection.has(e.matricule)) e.statut = s; });
    app.message(etat.selection.size + " étudiant(s) marqué(s) « " + STATUTS[s] + " ».");
    etat.selection.clear();
    tout_afficher();
  });
  $("bulk-clear").addEventListener("click", () => { etat.selection.clear(); afficherLignes(); });

  $("btn-all").addEventListener("click", () => {
    eleves.forEach(e => (e.statut = "present"));
    etat.selection.clear();
    tout_afficher();
    app.message("Tous les étudiants sont marqués présents. Pensez à enregistrer.");
  });

  $("btn-save").addEventListener("click", () => {
    const etatSauve = {};
    eleves.forEach(e => (etatSauve[e.matricule] = e.statut));
    try {
      const tous = JSON.parse(localStorage.getItem(CLE)) || {};
      tous[SEANCE.id] = etatSauve;
      localStorage.setItem(CLE, JSON.stringify(tous));
    } catch (e) {}
    const n = s => compter(s);
    app.message(`Appel enregistré : ${n("present")} présents, ${n("absent")} absents, ${n("retard")} retard(s), ${n("excuse")} excusé(s).`);
  });

  tout_afficher();
})();
