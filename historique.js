(function () {
  "use strict";
  const app = window.EPRESENCE;
  if (!app || !app.session) return;

  // Date de référence : celle de la maquette. Pour utiliser la date du jour : new Date()
  const REF = new Date(2025, 2, 27);

  const STATUTS = { present: ["Présent", "ok"], retard: ["Retard", "retard"], absent: ["Absent", "absent"], excuse: ["Excusé", "excuse"] };

  // Présences réelles de l'étudiant connecté (appels enregistrés par les enseignants)
  const reelles = app.session.matricule ? window.EPAuth.presences(app.session.matricule) : [];
  const HISTORIQUE = reelles.map(p => {
    const [a, m, jr] = p.date.split("-").map(Number);
    return { date: new Date(a, m - 1, jr), cours: p.cours, statut: p.statut, heure: "—" };
  });
  const ASSIDUITE = window.EPAuth.taux(reelles) ?? 0;

  const FILTRES = {
    semaine: d => { const debut = new Date(REF); debut.setDate(REF.getDate() - 6); return d >= debut && d <= REF; },
    mois: d => d.getMonth() === REF.getMonth() && d.getFullYear() === REF.getFullYear() && d <= REF,
    annee: d => d.getFullYear() === REF.getFullYear() && d <= REF
  };

  const $ = id => document.getElementById(id);
  const rows = $("rows"), tabs = document.querySelectorAll(".tab");
  const fmt = d => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function afficher(periode) {
    const liste = HISTORIQUE.filter(h => FILTRES[periode](h.date)).sort((a, b) => b.date - a.date);
    rows.innerHTML = liste.length ? liste.map(h => `
      <tr>
        <td>${fmt(h.date)}</td>
        <td>${esc(h.cours)}</td>
        <td><span class="badge ${STATUTS[h.statut][1]}">${STATUTS[h.statut][0]}</span></td>
        <td>${h.heure}</td>
      </tr>`).join("")
      : `<tr><td class="empty" colspan="4">Aucune séance sur cette période.</td></tr>`;
  }

  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.setAttribute("aria-selected", String(x === t)));
    afficher(t.dataset.periode);
  }));

  // Taux d'assiduité
  $("ring-pct").textContent = ASSIDUITE + "%";
  window.EPRESENCE_CHARTS.donut($("ring-svg"), [
    { valeur: ASSIDUITE, couleur: "#1fb893" },
    { valeur: 100 - ASSIDUITE, couleur: "#e3e9f4" }
  ]);

  afficher("semaine");
})();
