(function () {
  "use strict";
  const app = window.EPRESENCE;
  if (!app || !app.session) return;

  const N = 25; // séances par étudiant sur la période
  const COULEURS = { present: "#1fb893", absent: "#ec5b5b", retard: "#f5b324", excuse: "#2f7bff" };
  const COURS = ["Réseaux informatiques", "Système d'exploitation", "Base de données", "Anglais", "Algorithmique", "Mathématiques"];
  const MOIS = { "Janvier 2025": 0, "Février 2025": 1, "Mars 2025": 2 };

  const ROSTER = {
    L1A: ["OUEDRAOGO Ibrahim", "TRAORE Awa", "DIALLO Moussa", "KABORE Fatou", "BARRY Issa"],
    L1B: ["SANKARA Boukary", "ZONGO Salamata", "NIKIEMA Alain", "SOME Clarisse", "DABIRE Eric"],
    L2A: ["SAWADOGO Aminata", "COMPAORE Yacouba", "YAMEOGO Pauline", "TAPSOBA Moussa", "BELEM Nadège"],
    L2B: ["OUATTARA Mariam", "LOMPO Abdoul", "KAMBOU Estelle", "ILBOUDO Rodrigue", "ZIDA Josiane"],
    L3A: ["KONE Seydou", "THIOMBIANO Awa", "BAMOGO Hamed", "GUIRA Souleymane", "TIEMTORE Rasmata"]
  };

  // Données exactes de la maquette (L1A, mars 2025)
  const MAQUETTE = {
    comptes: [{ p: 25, r: 0, a: 0, e: 0 }, { p: 24, r: 1, a: 0, e: 0 }, { p: 22, r: 1, a: 2, e: 0 }, { p: 20, r: 1, a: 3, e: 1 }, { p: 23, r: 0, a: 2, e: 0 }],
    repartition: [92, 5, 2, 1]
  };

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Génération de données (reproductible) ---------- */
  function graine(texte) {
    let h = 1779033703 ^ texte.length;
    for (let i = 0; i < texte.length; i++) { h = Math.imul(h ^ texte.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }

  function repartir(valeurs) {
    const total = valeurs.reduce((a, b) => a + b, 0) || 1;
    const brut = valeurs.map(v => v / total * 100), bas = brut.map(Math.floor);
    let reste = 100 - bas.reduce((a, b) => a + b, 0);
    brut.map((x, i) => [x - bas[i], i]).sort((a, b) => b[0] - a[0]).slice(0, reste).forEach(([, i]) => bas[i]++);
    return bas;
  }

  function calculer(periode, classe) {
    const maquette = classe === "L1A" && periode === "Mars 2025";
    const eleves = ROSTER[classe].map((nom, i) => {
      let c;
      if (maquette) c = { ...MAQUETTE.comptes[i] };
      else {
        const rnd = graine(periode + classe + nom);
        const r = rnd();
        const non = r < .25 ? 0 : r < .55 ? 1 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 5);
        c = { p: N - non, r: 0, a: 0, e: 0 };
        for (let k = 0; k < non; k++) { const x = rnd(); x < .45 ? c.a++ : x < .8 ? c.r++ : c.e++; }
      }
      return { nom, ...c, taux: Math.round(c.p / N * 100) };
    });

    const somme = k => eleves.reduce((s, e) => s + e[k], 0);
    const repartition = maquette ? MAQUETTE.repartition : repartir([somme("p"), somme("a"), somme("r"), somme("e")]);

    // Liste des absences (dates reproductibles dans le mois choisi)
    const absences = [];
    eleves.forEach(e => {
      const rnd = graine("abs" + periode + classe + e.nom);
      const ajouter = (n, statut) => {
        for (let k = 0; k < n; k++) {
          let jour = 1 + Math.floor(rnd() * 28);
          const d = new Date(2025, MOIS[periode], jour);
          if (d.getDay() === 0) jour += 1; else if (d.getDay() === 6) jour += 2;
          absences.push({ date: new Date(2025, MOIS[periode], jour), nom: e.nom, cours: COURS[Math.floor(rnd() * COURS.length)], statut });
        }
      };
      ajouter(e.a, "Absent"); ajouter(e.e, "Excusé");
    });
    absences.sort((a, b) => b.date - a.date);

    return { periode, classe, eleves, repartition, absences };
  }

  /* ---------- Affichage ---------- */
  let rapport = null;
  const fmt = d => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  function afficher(r) {
    rapport = r;
    $("print-title").textContent = `Rapport de présence — Classe ${r.classe} — ${r.periode}`;

    // Barres
    $("bars").innerHTML = r.eleves.map(e => `
      <li class="bar-row">
        <span>${esc(e.nom)}</span>
        <div class="bar-track" role="img" aria-label="${e.taux}%"><div class="bar-fill ${e.taux === 100 ? "top" : ""}" data-w="${e.taux}"></div></div>
        <span class="bar-val">${e.taux}%</span>
      </li>`).join("");
    requestAnimationFrame(() => requestAnimationFrame(() =>
      document.querySelectorAll(".bar-fill").forEach(b => (b.style.width = b.dataset.w + "%"))));

    // Anneau + légende
    const [p, a, rt, ex] = r.repartition;
    $("ring-pct").textContent = p + "%";
    window.EPRESENCE_CHARTS.donut($("ring-svg"), [
      { valeur: p, couleur: COULEURS.present }, { valeur: a, couleur: COULEURS.absent },
      { valeur: rt, couleur: COULEURS.retard }, { valeur: ex, couleur: COULEURS.excuse }
    ]);
    $("legend").innerHTML = [["Présents", p, "present"], ["Absents", a, "absent"], ["Retards", rt, "retard"], ["Excusés", ex, "excuse"]]
      .map(([l, v, c]) => `<li><span class="dot" style="background:${COULEURS[c]}"></span>${l}<span class="val">${v}%</span></li>`).join("");

    // Liste des absents
    $("absents-rows").innerHTML = r.absences.length ? r.absences.map(x => `
      <tr><td>${fmt(x.date)}</td><td>${esc(x.nom)}</td><td>${esc(x.cours)}</td>
      <td><span class="badge ${x.statut === "Absent" ? "absent" : "excuse"}">${x.statut}</span></td></tr>`).join("")
      : `<tr><td class="empty" colspan="4">Aucune absence sur cette période.</td></tr>`;
  }

  /* ---------- Onglets ---------- */
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.setAttribute("aria-selected", String(x === t)));
    document.querySelectorAll(".tab-panel").forEach(p => (p.hidden = p.id !== t.getAttribute("aria-controls")));
  }));

  /* ---------- Génération ---------- */
  $("btn-generer").addEventListener("click", () => {
    afficher(calculer($("periode").value, $("classe").value));
    app.message(`Rapport généré : classe ${$("classe").value}, ${$("periode").value}.`);
  });

  /* ---------- Exports ---------- */
  function telecharger(nom, texte, type) {
    const url = URL.createObjectURL(new Blob([texte], { type }));
    const a = document.createElement("a");
    a.href = url; a.download = nom;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const ligne = cols => cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";");

  $("btn-excel").addEventListener("click", () => {
    const r = rapport, lignes = [ligne(["Rapport de présence", "Classe " + r.classe, r.periode]), ""];
    if ($("opt-taux").checked) {
      lignes.push(ligne(["Étudiant", "Présents", "Retards", "Absents", "Excusés", "Taux de présence"]));
      r.eleves.forEach(e => lignes.push(ligne([e.nom, e.p, e.r, e.a, e.e, e.taux + "%"])));
      lignes.push("");
    }
    if ($("opt-absents").checked) {
      lignes.push(ligne(["Date", "Étudiant", "Cours", "Statut"]));
      r.absences.forEach(x => lignes.push(ligne([fmt(x.date), x.nom, x.cours, x.statut])));
    }
    const nom = `rapport-presence-${r.classe}-${r.periode.toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.csv`;
    telecharger(nom, "\ufeff" + lignes.join("\r\n"), "text/csv;charset=utf-8");
    app.message("Fichier téléchargé : il s'ouvre directement dans Excel.");
  });

  // PDF : on utilise l'impression du navigateur (« Enregistrer au format PDF »)
  $("btn-pdf").addEventListener("click", () => window.print());

  afficher(calculer("Mars 2025", "L1A"));
})();
