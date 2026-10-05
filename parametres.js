/* Page Paramètres : tout se modifie ici, sans toucher au code.
   Les valeurs sont enregistrées dans le navigateur (clé epresence_parametres). */
(function () {
  "use strict";
  const app = window.EPRESENCE;
  if (!app || !app.session) return;

  const CLE = "epresence_parametres";
  const EXCLUS = /^epresence_(comptes|session|email|notifs_lues_)/;   // jamais exportés ni effacés
  const $ = id => document.getElementById(id);
  const dire = t => app.message && app.message(t);
  const lire = () => { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch (e) { return {}; } };
  let params = lire();

  /* ---------- Onglets ---------- */
  const onglets = [...document.querySelectorAll(".settings-nav [data-panel]")];
  function afficher(nom) {
    if (!$("p-" + nom)) nom = "general";
    onglets.forEach(b => b.setAttribute("aria-selected", String(b.dataset.panel === nom)));
    document.querySelectorAll(".settings-panel").forEach(p => (p.hidden = p.id !== "p-" + nom));
    history.replaceState(null, "", "#" + nom);
  }
  onglets.forEach(b => b.addEventListener("click", () => afficher(b.dataset.panel)));
  afficher(location.hash.slice(1) || "general");

  /* ---------- Remplir les formulaires avec les valeurs enregistrées ---------- */
  const forms = [...document.querySelectorAll("form[data-section]")];
  forms.forEach(f => {
    const d = params[f.dataset.section];
    if (!d) return;
    [...f.elements].forEach(el => {
      if (!el.name || !(el.name in d)) return;
      if (el.type === "checkbox") el.checked = !!d[el.name]; else el.value = d[el.name];
    });
  });

  /* ---------- Logo ---------- */
  let logo = (params.general && params.general.logo) || "";
  const apercu = $("logo-preview"), vide = apercu.innerHTML;
  const retirer = document.createElement("button");
  retirer.type = "button"; retirer.className = "btn-ghost"; retirer.textContent = "Retirer le logo"; retirer.style.marginLeft = "8px";
  $("btn-logo").after(retirer);
  function majLogo() {
    apercu.innerHTML = vide; retirer.hidden = !logo;
    if (!logo) return;
    const i = new Image(); i.alt = "Logo de l'établissement"; i.src = logo;
    apercu.replaceChildren(i);
  }
  majLogo();
  $("btn-logo").addEventListener("click", () => $("logo-file").click());
  retirer.addEventListener("click", () => { logo = ""; majLogo(); dire("Logo retiré : cliquez sur Enregistrer."); });
  $("logo-file").addEventListener("change", e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    if (!/^image\/(png|jpeg)$/.test(f.type)) return dire("Format refusé : utilisez PNG ou JPG.");
    if (f.size > 2 * 1024 * 1024) return dire("Fichier trop lourd : 2 Mo maximum.");
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const img = new Image();
      img.onload = () => {                       // réduit à 256 px max pour économiser la place
        const k = Math.min(1, 256 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        logo = c.toDataURL(f.type === "image/png" ? "image/png" : "image/jpeg", .9);
        majLogo(); dire("Logo chargé : cliquez sur Enregistrer.");
      };
      img.onerror = () => dire("Image illisible.");
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(f);
  });

  /* ---------- Validation ---------- */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, TEL = /^\+?[0-9 ().-]{8,20}$/;
  const nb = (el, min, max) => { const v = Number(el.value); return el.value !== "" && Number.isInteger(v) && v >= min && (max === undefined || v <= max); };
  const REGLES = {
    general: f => {
      const e = f.elements;
      if (!e.nom.value.trim()) return ["Le nom de l'établissement est obligatoire.", e.nom];
      if (!e.adresse.value.trim()) return ["L'adresse est obligatoire.", e.adresse];
      if (!TEL.test(e.tel.value.trim())) return ["Numéro de téléphone invalide (ex. +226 25 12 34 56).", e.tel];
      if (!EMAIL.test(e.email.value.trim())) return ["Adresse email invalide.", e.email];
    },
    annee: f => { const e = f.elements; if (e.debut.value && e.fin.value && e.fin.value <= e.debut.value) return ["La date de fin doit suivre la date de début.", e.fin]; },
    edt: f => {
      const e = f.elements;
      if (!e.debut_h.value || !e.fin_h.value || e.fin_h.value <= e.debut_h.value) return ["L'heure de fin doit suivre l'heure de début.", e.fin_h];
      if (!["lun", "mar", "mer", "jeu", "ven", "sam"].some(j => e[j].checked)) return ["Choisissez au moins un jour de cours.", e.lun];
    },
    limites: f => {
      const e = f.elements;
      if (!nb(e.seuil_abs, 1)) return ["Le seuil d'absences doit être un entier d'au moins 1.", e.seuil_abs];
      if (!nb(e.taux_min, 0, 100)) return ["Le taux minimal doit être compris entre 0 et 100.", e.taux_min];
      if (!nb(e.retard_min, 1)) return ["Le retard doit être d'au moins 1 minute.", e.retard_min];
      if (!nb(e.delai_h, 0)) return ["Le délai doit être un nombre d'heures (0 ou plus).", e.delai_h];
    }
  };

  /* ---------- Enregistrement ---------- */
  forms.forEach(f => f.addEventListener("submit", e => {
    e.preventDefault();
    f.querySelectorAll("[aria-invalid]").forEach(x => x.removeAttribute("aria-invalid"));
    const err = REGLES[f.dataset.section] && REGLES[f.dataset.section](f);
    if (err) { err[1].setAttribute("aria-invalid", "true"); err[1].focus(); return dire(err[0]); }
    const d = {};
    [...f.elements].forEach(el => { if (el.name) d[el.name] = el.type === "checkbox" ? el.checked : el.value.trim(); });
    if (f.dataset.section === "general") d.logo = logo;
    params = lire(); params[f.dataset.section] = d;
    try { localStorage.setItem(CLE, JSON.stringify(params)); dire("Paramètres enregistrés."); }
    catch (x) { dire("Enregistrement impossible : espace de stockage plein (logo trop lourd ?)."); }
  }));

  /* ---------- Nombre de filières et de classes ---------- */
  if (window.EPData) {
    $("n-filieres").textContent = EPData.load("filieres").length;
    $("n-classes").textContent = EPData.load("classes").length;
  }

  /* ---------- Mot de passe du compte connecté ---------- */
  $("form-mdp").addEventListener("submit", e => {
    e.preventDefault();
    const actuel = $("mdp-actuel").value, nouveau = $("mdp-nouveau").value, conf = $("mdp-conf").value;
    const liste = EPAuth.comptes(), c = liste.find(x => x.email === app.session.email);
    if (!c || c.mdp !== actuel) return dire("Mot de passe actuel incorrect.");
    if (nouveau.length < 8) return dire("Le nouveau mot de passe doit contenir au moins 8 caractères.");
    if (nouveau === actuel) return dire("Choisissez un mot de passe différent de l'actuel.");
    if (nouveau !== conf) return dire("La confirmation ne correspond pas.");
    c.mdp = nouveau;
    localStorage.setItem("epresence_comptes", JSON.stringify(liste));
    e.target.reset(); dire("Mot de passe modifié.");
  });

  /* ---------- Sauvegarde : exporter / restaurer / réinitialiser ---------- */
  const cles = () => Object.keys(localStorage).filter(k => /^epresence_/.test(k) && !EXCLUS.test(k));
  $("btn-export").addEventListener("click", () => {
    const donnees = {}; cles().forEach(k => (donnees[k] = localStorage.getItem(k)));
    const blob = new Blob([JSON.stringify({ app: "ePresence", version: 1, date: new Date().toISOString(), donnees }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "epresence-sauvegarde-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click(); URL.revokeObjectURL(a.href); dire("Sauvegarde exportée.");
  });
  $("btn-import").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    f.text().then(t => {
      let o; try { o = JSON.parse(t); } catch (x) { return dire("Fichier invalide."); }
      const d = o && o.app === "ePresence" && o.donnees;
      if (!d || typeof d !== "object") return dire("Ce n'est pas une sauvegarde ePrésence.");
      const ok = Object.keys(d).filter(k => /^epresence_[a-z_]+$/.test(k) && !EXCLUS.test(k) && typeof d[k] === "string");
      if (!ok.length) return dire("La sauvegarde ne contient aucune donnée utilisable.");
      if (!confirm("Remplacer les données actuelles par cette sauvegarde (" + ok.length + " jeux de données) ?")) return;
      ok.forEach(k => localStorage.setItem(k, d[k]));
      dire("Sauvegarde restaurée."); setTimeout(() => location.reload(), 800);
    });
  });
  $("btn-reset").addEventListener("click", () => {
    if (!confirm("Réinitialiser toutes les données (filières, classes, étudiants, emploi du temps, paramètres) ? Les comptes et mots de passe sont conservés.")) return;
    cles().forEach(k => localStorage.removeItem(k));
    dire("Données réinitialisées."); setTimeout(() => location.reload(), 800);
  });
})();
