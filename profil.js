(function () {
  "use strict";
  const app = window.EPRESENCE;
  if (!app || !app.session) return;
  const $ = id => document.getElementById(id);
  const reel = app.session.matricule ? window.EPAuth.presences(app.session.matricule) : [];
  const TAUX = window.EPAuth.taux(reel) ?? 0;
  const ETAT = { present: ["Présent", "ok"], retard: ["Retard", "retard"], absent: ["Absent", "absent"], excuse: ["Excusé", "excuse"] };
  const LAST = reel.slice(0, 5).map(p => [p.date.split("-").reverse().join("/"), p.cours, ...(ETAT[p.statut] || ["—", ""])]);
  $("rows").innerHTML = LAST.length
    ? LAST.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><span class="badge ${r[3]}">${r[2]}</span></td></tr>`).join("")
    : '<tr><td colspan="3">Aucune présence enregistrée pour le moment.</td></tr>';
  $("ring-pct").textContent = TAUX + "%";
  window.EPRESENCE_CHARTS.donut($("ring-svg"), [{ valeur: TAUX, couleur: "#1fb893" }, { valeur: 100 - TAUX, couleur: "#ec5b5b" }]);
  $("legend").innerHTML = `<li><span class="dot" style="background:#1fb893"></span>Présence<span class="val">${TAUX}%</span></li><li><span class="dot" style="background:#ec5b5b"></span>Absence<span class="val">${100 - TAUX}%</span></li>`;
  const d = JSON.parse(localStorage.getItem("epresence_profil_" + app.session.email) || "{}");
  [["i-naissance", d.naissance], ["i-email", d.email], ["i-tel", d.tel], ["i-adresse", d.adresse]].forEach(([id, v]) => { $(id).textContent = v || "Non renseigné"; });
})();
