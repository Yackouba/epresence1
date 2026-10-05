(function () {
  "use strict";
  const app = window.EPRESENCE;
  if (!app || !app.session) return;

  const CLE = "epresence_edt";
  const COULEURS = ["#ec5b5b", "#f5b324", "#2fb36d", "#8b5cf6", "#2f7bff", "#ee8a1e"];

  // Emploi du temps hebdomadaire type : classe -> jour (1 = lundi … 5 = vendredi) -> [début, fin, cours, enseignant, salle]
  const MODELE = {
    L1A: {
      1: [["08:00", "10:00", "Algorithmique", "Mme Traoré", "Salle 201"], ["10:00", "12:00", "Mathématiques", "M. Diallo", "Salle 101"]],
      2: [["08:00", "10:00", "Anglais", "M. Koné", "Salle 203"], ["10:00", "12:00", "Base de données", "Mme Traoré", "Salle 201"]],
      3: [["08:00", "10:00", "Réseaux informatiques", "M. Diallo", "Salle 101"], ["14:00", "16:00", "Système d'exploitation", "M. Ouédraogo", "Salle 102"]],
      4: [["08:00", "10:00", "Réseaux informatiques", "M. Diallo", "Salle 101"], ["10:00", "12:00", "Système d'exploitation", "M. Ouédraogo", "Salle 102"],
          ["14:00", "16:00", "Base de données", "Mme Traoré", "Salle 201"], ["16:00", "18:00", "Anglais", "M. Koné", "Salle 203"]],
      5: [["08:00", "10:00", "Base de données", "Mme Traoré", "Salle 201"], ["10:00", "12:00", "Réseaux informatiques", "M. Diallo", "Salle 101"]]
    },
    L1B: {
      1: [["08:00", "10:00", "Programmation web", "M. Ouédraogo", "Salle 102"], ["14:00", "16:00", "Anglais", "M. Koné", "Salle 203"]],
      3: [["10:00", "12:00", "Algorithmique", "Mme Traoré", "Salle 201"], ["14:00", "16:00", "Mathématiques", "M. Diallo", "Salle 101"]],
      4: [["08:00", "10:00", "Base de données", "Mme Traoré", "Salle 201"], ["10:00", "12:00", "Programmation web", "M. Ouédraogo", "Salle 102"]]
    },
    L2A: {
      2: [["08:00", "10:00", "Sécurité des réseaux", "M. Diallo", "Salle 101"], ["10:00", "12:00", "Cryptographie", "M. Ouédraogo", "Salle 102"]],
      4: [["14:00", "16:00", "Administration système", "M. Ouédraogo", "Salle 102"], ["16:00", "18:00", "Anglais", "M. Koné", "Salle 203"]]
    }
  };
  const CLASSES = ["L1A", "L1B", "L2A", "L2B", "L3A"];

  const $ = id => document.getElementById(id);
  const rows = $("rows"), dateInput = $("date"), dateLabel = $("date-label"), classeSel = $("classe");
  const dlg = $("dlg"), form = $("form"), erreur = $("form-error");

  const etat = { date: dateInput.value, classe: classeSel.value };
  let ajouts = charger();

  function charger() { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch (e) { return {}; } }
  function sauver() { try { localStorage.setItem(CLE, JSON.stringify(ajouts)); } catch (e) {} }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cle = () => etat.date + "|" + etat.classe;

  function dateLocale(v) { const [a, m, j] = v.split("-").map(Number); return new Date(a, m - 1, j); }
  function formatDate(v) {
    const t = dateLocale(v).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function coursDuJour() {
    const jour = dateLocale(etat.date).getDay();
    const modele = ((MODELE[etat.classe] || {})[jour] || []).map(c => ({ debut: c[0], fin: c[1], cours: c[2], enseignant: c[3], salle: c[4], id: null }));
    const perso = (ajouts[cle()] || []).map(c => ({ ...c }));
    return modele.concat(perso).sort((a, b) => a.debut.localeCompare(b.debut));
  }

  function afficher() {
    dateLabel.textContent = formatDate(etat.date);
    const liste = coursDuJour();
    rows.innerHTML = liste.length ? liste.map((c, i) => `
      <tr style="--bar:${COULEURS[i % COULEURS.length]}">
        <td>${c.debut} - ${c.fin}</td>
        <td>${esc(c.cours)}</td>
        <td>${esc(c.enseignant)}</td>
        <td>${esc(c.salle)}${c.id ? `<button class="icon-btn danger row-del" data-id="${c.id}" aria-label="Supprimer le cours ${esc(c.cours)}"><svg viewBox="0 0 24 24"><use href="#i-trash"/></svg></button>` : ""}</td>
      </tr>`).join("")
      : `<tr><td class="empty" colspan="4">Aucun cours programmé pour cette journée.</td></tr>`;
  }

  /* ---------- Filtres ---------- */
  classeSel.innerHTML = CLASSES.map(c => `<option value="${c}">${c}</option>`).join("");
  classeSel.value = etat.classe = "L1A";
  classeSel.addEventListener("change", () => { etat.classe = classeSel.value; afficher(); });

  dateInput.addEventListener("change", () => { if (dateInput.value) { etat.date = dateInput.value; afficher(); } });
  dateInput.addEventListener("click", () => { try { dateInput.showPicker(); } catch (e) {} });

  /* ---------- Ajout d'un cours ---------- */
  $("btn-add").addEventListener("click", () => {
    form.reset();
    erreur.hidden = true;
    $("dlg-sub").textContent = formatDate(etat.date) + " · classe " + etat.classe;
    dlg.showModal();
    $("f-debut").focus();
  });
  dlg.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => dlg.close()));

  form.addEventListener("submit", ev => {
    ev.preventDefault();
    const c = {
      debut: $("f-debut").value, fin: $("f-fin").value,
      cours: $("f-cours").value.trim(), enseignant: $("f-ens").value.trim(), salle: $("f-salle").value.trim()
    };
    const fail = msg => { erreur.textContent = msg; erreur.hidden = false; };

    if (!c.debut || !c.fin || !c.cours || !c.enseignant || !c.salle) return fail("Renseignez tous les champs.");
    if (c.fin <= c.debut) return fail("L'heure de fin doit être après l'heure de début.");
    const conflit = coursDuJour().find(x => c.debut < x.fin && x.debut < c.fin);
    if (conflit) return fail(`Ce créneau chevauche « ${conflit.cours} » (${conflit.debut} - ${conflit.fin}).`);

    c.id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    (ajouts[cle()] = ajouts[cle()] || []).push(c);
    sauver(); afficher(); dlg.close();
    app.message("Cours ajouté à l'emploi du temps.");
  });

  /* ---------- Suppression d'un cours ajouté ---------- */
  rows.addEventListener("click", e => {
    const b = e.target.closest(".row-del");
    if (!b) return;
    ajouts[cle()] = (ajouts[cle()] || []).filter(c => c.id !== b.dataset.id);
    if (!ajouts[cle()].length) delete ajouts[cle()];
    sauver(); afficher();
    app.message("Cours supprimé.");
  });

  afficher();
})();
