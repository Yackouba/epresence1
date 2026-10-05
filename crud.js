/* Gestionnaire générique de tableaux : recherche, filtres, pagination,
   ajout / modification / consultation / suppression. Utilisé par Filières, Classes, Enseignants et Cours. */
(function () {
  "use strict";
  const app = window.EPRESENCE;
  if (!app || !app.session) return;

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const COULEURS = ["#2f7bff", "#8b5cf6", "#1fb893", "#ee8a1e", "#ec5b5b", "#0ea5e9"];
  const paire = o => (typeof o === "string" ? [o, o] : o);
  const resoudre = v => (typeof v === "function" ? v() : v);

  function avatar(nom) {
    let h = 0;
    for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const ini = nom.split(" ").map(x => x.charAt(0)).slice(0, 2).join("");
    return `<span class="mini-avatar" style="background:${COULEURS[h % COULEURS.length]}">${esc(ini)}</span>`;
  }

  function init(cfg) {
    const lib = cfg.libStatut || ["Actif", "Inactif"];
    const L = cfg.libelles;
    let donnees = EPData.load(cfg.nom);
    const etat = { q: "", page: 1, parPage: cfg.parPage || 8, filtres: {}, mode: "add", id: null, aSupprimer: null };

    const champs = cfg.champs.concat([{ k: "statut", label: "Statut", type: "select", plein: true, options: [["actif", lib[0]], ["inactif", lib[1]]] }]);
    const sauver = () => EPData.save(cfg.nom, donnees);

    /* ----- En-tête du tableau ----- */
    $("head").innerHTML = "<tr>" + cfg.colonnes.map(c =>
      `<th>${c === "statut" ? "Statut" : c === "actions" ? "Actions" : c.h}</th>`).join("") + "</tr>";

    /* ----- Filtres ----- */
    (cfg.filtres || []).forEach(f => {
      const sel = $(f.id);
      const opts = f.options ? f.options() : [...new Set(donnees.map(r => r[f.champ]))].sort();
      sel.innerHTML = `<option value="">${f.tous}</option>` + opts.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join("");
      sel.addEventListener("change", () => { etat.filtres[f.champ] = sel.value; etat.page = 1; afficher(); });
    });
    if ($("search")) $("search").addEventListener("input", e => { etat.q = e.target.value; etat.page = 1; afficher(); });
    if ($("per-page")) $("per-page").addEventListener("change", e => { etat.parPage = +e.target.value; etat.page = 1; afficher(); });

    /* ----- Affichage ----- */
    function filtrer() {
      const q = norm(etat.q.trim());
      return donnees.filter(r => {
        if (q && !norm(cfg.recherche(r)).includes(q)) return false;
        return (cfg.filtres || []).every(f => !etat.filtres[f.champ] || r[f.champ] === etat.filtres[f.champ]);
      });
    }

    function pagesVisibles(total, cur) {
      if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
      const nums = [...new Set([1, total, cur - 1, cur, cur + 1])].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
      const out = [];
      nums.forEach((p, i) => { if (i && p - nums[i - 1] > 1) out.push("…"); out.push(p); });
      return out;
    }

    function cellule(c, r) {
      if (c === "statut") return `<td><span class="badge ${r.statut === "actif" ? "ok" : "ko"}">${r.statut === "actif" ? lib[0] : lib[1]}</span></td>`;
      if (c === "actions") {
        const n = esc(cfg.nomAffiche(r));
        return `<td><div class="actions">
          <button class="icon-btn" data-action="view" data-id="${r.id}" aria-label="Voir ${n}"><svg viewBox="0 0 24 24"><use href="#i-eye"/></svg></button>
          <button class="icon-btn" data-action="edit" data-id="${r.id}" aria-label="Modifier ${n}"><svg viewBox="0 0 24 24"><use href="#i-edit"/></svg></button>
          <button class="icon-btn danger" data-action="delete" data-id="${r.id}" aria-label="Supprimer ${n}"><svg viewBox="0 0 24 24"><use href="#i-trash"/></svg></button>
        </div></td>`;
      }
      return `<td>${c.c(r, donnees.indexOf(r) + 1)}</td>`;
    }

    function afficher() {
      const liste = filtrer();
      const pages = Math.max(1, Math.ceil(liste.length / etat.parPage));
      etat.page = Math.min(Math.max(etat.page, 1), pages);
      const debut = (etat.page - 1) * etat.parPage;
      const vis = liste.slice(debut, debut + etat.parPage);

      $("rows").innerHTML = vis.length
        ? vis.map(r => "<tr>" + cfg.colonnes.map(c => cellule(c, r)).join("") + "</tr>").join("")
        : `<tr><td class="empty" colspan="${cfg.colonnes.length}">Aucun résultat.</td></tr>`;

      $("info").textContent = liste.length
        ? `Affichage de ${debut + 1} à ${debut + vis.length} sur ${liste.length} entrées`
        : "Aucune entrée";

      $("pagination").innerHTML =
        `<button class="page-btn" data-page="${etat.page - 1}" aria-label="Page précédente" ${etat.page === 1 ? "disabled" : ""}>‹</button>` +
        pagesVisibles(pages, etat.page).map(p => p === "…" ? `<span class="page-gap" aria-hidden="true">…</span>`
          : `<button class="page-btn" data-page="${p}" ${p === etat.page ? 'aria-current="page"' : ""} aria-label="Page ${p}">${p}</button>`).join("") +
        `<button class="page-btn" data-page="${etat.page + 1}" aria-label="Page suivante" ${etat.page === pages ? "disabled" : ""}>›</button>`;

      // Cartes de statistiques
      const set = (id, v) => { if ($(id)) $(id).textContent = v; };
      set("st-total", donnees.length);
      set("st-actif", donnees.filter(r => r.statut === "actif").length);
      set("st-inactif", donnees.filter(r => r.statut !== "actif").length);
    }

    $("pagination").addEventListener("click", e => {
      const b = e.target.closest("[data-page]");
      if (b && !b.disabled) { etat.page = +b.dataset.page; afficher(); }
    });
    $("rows").addEventListener("click", e => {
      const b = e.target.closest("[data-action]");
      if (!b) return;
      if (b.dataset.action === "delete") demanderSuppression(b.dataset.id);
      else ouvrir(b.dataset.action, b.dataset.id);
    });
    $("btn-add").addEventListener("click", () => ouvrir("add"));

    /* ----- Fenêtres ----- */
    const dlg = document.createElement("dialog");
    dlg.className = "modal";
    dlg.setAttribute("aria-labelledby", "crud-title");
    dlg.innerHTML = `<form novalidate>
      <div class="modal-head"><h2 id="crud-title"></h2><button type="button" class="modal-close" data-close aria-label="Fermer">×</button></div>
      <div class="form-grid" id="crud-fields"></div>
      <p class="form-error" id="crud-error" role="alert" hidden></p>
      <div class="modal-foot"><button type="button" class="btn-ghost" data-close>Fermer</button><button type="submit" class="btn-primary" id="crud-submit">Enregistrer</button></div>
    </form>`;
    const dlgDel = document.createElement("dialog");
    dlgDel.className = "modal modal-sm";
    dlgDel.setAttribute("aria-labelledby", "del-title");
    dlgDel.innerHTML = `<div class="modal-body">
      <div class="modal-head"><h2 id="del-title"></h2></div>
      <p class="modal-sub"><strong id="del-name"></strong> sera supprimé(e). Cette action est définitive.</p>
      <div class="modal-foot"><button type="button" class="btn-ghost" data-close>Annuler</button><button type="button" class="btn-danger" id="del-confirm">Supprimer</button></div>
    </div>`;
    document.body.append(dlg, dlgDel);
    [dlg, dlgDel].forEach(d => d.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => d.close())));

    function champHTML(f, val) {
      const id = "c-" + f.k;
      let ctrl;
      if (f.type === "select") {
        const opts = resoudre(f.options).map(paire);
        if (val !== undefined && val !== "" && !opts.some(o => String(o[0]) === String(val))) opts.push([val, val]);
        ctrl = `<select id="${id}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
      } else {
        const sug = f.suggestions ? f.suggestions() : null;
        ctrl = `<input id="${id}" type="${f.type || "text"}" value="${esc(val === undefined ? "" : val)}" autocomplete="off"
          ${f.min != null ? `min="${f.min}"` : ""} ${sug ? `list="${id}-liste"` : ""}>` +
          (sug ? `<datalist id="${id}-liste">${sug.map(s => `<option value="${esc(s)}">`).join("")}</datalist>` : "");
      }
      return `<div class="f ${f.plein ? "full" : ""}"><label for="${id}">${f.label}${f.requis ? " *" : ""}</label>${ctrl}</div>`;
    }

    function ouvrir(mode, id) {
      etat.mode = mode; etat.id = id || null;
      const r = id ? donnees.find(x => x.id === id) : null;
      const valeurs = r || Object.assign({ statut: "actif" }, cfg.defaut || {});
      $("crud-title").textContent = { add: L.ajouter, edit: L.modifier, view: L.voir }[mode];
      $("crud-fields").innerHTML = champs.map(f => champHTML(f, valeurs[f.k])).join("");
      $("crud-error").hidden = true;
      const lecture = mode === "view";
      dlg.querySelectorAll("input, select").forEach(c => (c.disabled = lecture));
      $("crud-submit").hidden = lecture;
      dlg.showModal();
      if (!lecture) dlg.querySelector("input, select").focus();
    }

    dlg.querySelector("form").addEventListener("submit", ev => {
      ev.preventDefault();
      const err = $("crud-error");
      const fail = m => { err.textContent = m; err.hidden = false; };
      const d = {};
      for (const f of champs) {
        let v = $("c-" + f.k).value.trim();
        if (f.requis && v === "") return fail(`Renseignez le champ « ${f.label} ».`);
        if (f.type === "email" && v && !/^\S+@\S+\.\S+$/.test(v)) return fail("L'adresse email n'est pas valide.");
        if (f.type === "number") {
          v = Number(v);
          if (Number.isNaN(v) || (f.min != null && v < f.min)) return fail(`« ${f.label} » doit être un nombre valide.`);
        }
        if (f.maj) v = v.toUpperCase();
        d[f.k] = v;
      }
      for (const k of cfg.unique || []) {
        if (donnees.some(x => x.id !== etat.id && norm(String(x[k])) === norm(String(d[k])))) return fail(`Cette valeur existe déjà (${k}).`);
      }
      if (etat.mode === "edit") {
        Object.assign(donnees.find(x => x.id === etat.id), d);
        app.message(L.modifie);
      } else {
        donnees.push({ id: cfg.nom.charAt(0) + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), ...d });
        etat.q = ""; if ($("search")) $("search").value = "";
        etat.page = Math.ceil(donnees.length / etat.parPage);
        app.message(L.ajoute);
      }
      sauver(); afficher(); dlg.close();
    });

    function demanderSuppression(id) {
      const r = donnees.find(x => x.id === id);
      if (!r) return;
      etat.aSupprimer = id;
      $("del-title").textContent = L.suppr;
      $("del-name").textContent = cfg.nomAffiche(r);
      dlgDel.showModal();
    }
    $("del-confirm").addEventListener("click", () => {
      donnees = donnees.filter(x => x.id !== etat.aSupprimer);
      sauver(); afficher(); dlgDel.close();
      app.message(L.supprime);
    });

    afficher();
  }

  window.EPCrud = { init, esc, avatar };
})();
