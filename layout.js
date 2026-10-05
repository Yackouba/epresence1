/* Logique commune à toutes les pages connectées (administrateur, enseignant, étudiant) */
(function () {
  "use strict";

  const A = window.EPAuth;
  const ACCUEIL = A.ACCUEIL;
  const PAGES = A.pagesRoles();
  const LIBRES = ["index.html", "connexion.html"];
  const ROLES = { admin: "Administrateur", enseignant: "Enseignant", etudiant: "Étudiant" };

  // Entrées de la recherche rapide de l'en-tête
  const RECHERCHE = [
    ["Tableau de bord", "tableau-de-bord.html"], ["Filières", "filieres.html"], ["Classes", "classes.html"],
    ["Étudiants", "etudiants.html"], ["Enseignants", "enseignants.html"], ["Cours", "cours.html"],
    ["Emploi du temps", "emploi-du-temps.html"], ["Présences (appel)", "seances.html"], ["Rapports", "rapports.html"],
    ["Paramètres", "parametres.html"], ["Mon profil", "profil.html"], ["Mes présences", "historique.html"]
  ];

  const NOTIFS = {
    admin: [["2 absences non justifiées aujourd'hui", "Il y a 1 heure"], ["Nouvel étudiant ajouté : OUEDRAOGO Ibrahim", "Il y a 5 heures"], ["Le rapport de mars est disponible", "Hier"]],
    enseignant: [["Appel à effectuer : Réseaux informatiques, 08:00", "Aujourd'hui"], ["1 retard enregistré hier en L1 Réseaux", "Hier"]],
    etudiant: [["Vous avez été marqué en retard le 24/03/2025", "Il y a 2 jours"], ["Votre taux d'assiduité est de 92 %", "Cette semaine"]]
  };

  const page = decodeURIComponent(location.pathname.split("/").pop()) || "index.html";

  let session = null;
  try { session = JSON.parse(sessionStorage.getItem("epresence_session")); } catch (e) {}
  if (!session || !ACCUEIL[session.role]) {
    window.EPRESENCE = { session: null };
    window.location.replace("connexion.html");
    return;
  }
  if (PAGES[page] && !PAGES[page].includes(session.role)) {
    window.EPRESENCE = { session: null };
    window.location.replace(ACCUEIL[session.role]);
    return;
  }

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const autorise = href => PAGES[href] && PAGES[href].includes(session.role);

  /* ---------- Profil ---------- */
  const nomCourt = session.role === "admin" ? "Admin" : session.nom;
  const initiale = session.nom.replace(/^(M\.|Mme)\s+/, "").charAt(0).toUpperCase();
  const mettre = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };
  mettre("user-name", nomCourt); mettre("avatar", initiale); mettre("user-role", ROLES[session.role]);
  mettre("side-name", nomCourt); mettre("side-avatar", initiale); mettre("side-role", ROLES[session.role]);

  /* ---------- Déconnexion ---------- */
  const deconnexion = () => sessionStorage.removeItem("epresence_session");
  $("logout").addEventListener("click", deconnexion);
  $("logout-top").addEventListener("click", deconnexion);

  /* ---------- Message temporaire ---------- */
  const toast = $("toast");
  function message(texte) {
    toast.textContent = texte;
    toast.hidden = false;
    clearTimeout(message.t);
    message.t = setTimeout(() => (toast.hidden = true), 3200);
  }

  /* ---------- Menu latéral ---------- */
  const sidebar = $("sidebar"), backdrop = $("backdrop"), burger = $("hamburger");
  const mobile = () => window.innerWidth <= 860;
  function fermerMenu() { sidebar.classList.remove("open"); backdrop.classList.remove("show"); burger.setAttribute("aria-expanded", "false"); }
  burger.addEventListener("click", () => {
    if (!mobile()) { document.body.classList.toggle("menu-closed"); return; }
    const ouvert = sidebar.classList.toggle("open");
    backdrop.classList.toggle("show", ouvert);
    burger.setAttribute("aria-expanded", String(ouvert));
  });
  backdrop.addEventListener("click", fermerMenu);

  /* ---------- Menus déroulants (utilisateur, notifications) ---------- */
  const userBtn = $("user-btn"), dropdown = $("dropdown");
  const bell = $("bell"), bellMenu = $("bell-menu");
  const resultats = $("search-results");
  const champ0 = () => $("top-search");
  function fermerPanneaux() {
    dropdown.hidden = true; userBtn.setAttribute("aria-expanded", "false");
    if (bell) { bellMenu.hidden = true; bell.setAttribute("aria-expanded", "false"); }
    if (resultats) resultats.hidden = true;
  }
  userBtn.addEventListener("click", e => {
    e.stopPropagation();
    const ouvrir = dropdown.hidden;
    fermerPanneaux();
    dropdown.hidden = !ouvrir;
    userBtn.setAttribute("aria-expanded", String(ouvrir));
  });
  document.addEventListener("click", fermerPanneaux);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { fermerMenu(); fermerPanneaux(); } });
  [dropdown, bellMenu, resultats].filter(Boolean).forEach(p => p.addEventListener("click", e => e.stopPropagation()));

  if (bell && champ0()) {
  /* ---------- Notifications ---------- */
  const notifs = NOTIFS[session.role] || [];
  const CLE_LUES = "epresence_notifs_lues_" + session.role;
  let lues = sessionStorage.getItem(CLE_LUES) === "1";
  const pastille = $("bell-count");
  function afficherPastille() { pastille.hidden = lues || !notifs.length; pastille.textContent = notifs.length; }
  bellMenu.innerHTML = '<p class="notif-title">Notifications</p>' + (notifs.length
    ? notifs.map(n => `<div class="notif-item"><span>${esc(n[0])}</span><small>${esc(n[1])}</small></div>`).join("")
    : '<p class="notif-empty">Aucune notification.</p>');
  bell.addEventListener("click", e => {
    e.stopPropagation();
    const ouvrir = bellMenu.hidden;
    fermerPanneaux();
    bellMenu.hidden = !ouvrir;
    bell.setAttribute("aria-expanded", String(ouvrir));
    if (ouvrir) { lues = true; sessionStorage.setItem(CLE_LUES, "1"); afficherPastille(); }
  });
  afficherPastille();

  /* ---------- Recherche rapide (navigation) ---------- */
  const champ = $("top-search");
  let courant = -1;
  function afficherResultats() {
    const q = champ.value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!q) { resultats.hidden = true; return; }
    const trouves = RECHERCHE.filter(([l, h]) => autorise(h) && l.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q));
    resultats.innerHTML = trouves.length
      ? trouves.map(([l, h], i) => `<a href="${h}" role="option" class="${i === 0 ? "focus" : ""}">${esc(l)}</a>`).join("")
      : '<span class="notif-empty">Aucune page trouvée.</span>';
    courant = trouves.length ? 0 : -1;
    resultats.hidden = false;
  }
  champ.addEventListener("input", afficherResultats);
  champ.addEventListener("focus", afficherResultats);
  champ.addEventListener("click", e => e.stopPropagation());
  champ.addEventListener("keydown", e => {
    const liens = [...resultats.querySelectorAll("a")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!liens.length) return;
      courant = (courant + (e.key === "ArrowDown" ? 1 : -1) + liens.length) % liens.length;
      liens.forEach((l, i) => l.classList.toggle("focus", i === courant));
    } else if (e.key === "Enter" && liens[courant]) {
      window.location.href = liens[courant].getAttribute("href");
    }
  });

  }

  /* ---------- Menu selon le rôle + lecture seule ---------- */
  if (!$("i-profil")) document.body.insertAdjacentHTML("afterbegin", '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><symbol id="i-profil" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/></symbol><symbol id="i-presence" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></symbol></defs></svg>');
  const nav = document.querySelector(".menu");
  if (nav) nav.innerHTML = A.menu(session.role).map(([h, i, l]) =>
    `<a href="${h}"${h === page ? ' class="active" aria-current="page"' : ""}><svg><use href="#${i}"/></svg>${l}</a>`).join("");
  document.querySelectorAll(".dropdown a:not(#logout-top)").forEach(l => { if (!autorise(l.getAttribute("href"))) l.remove(); });
  const me = A.etudiant();
  if (me) document.querySelectorAll("[data-me]").forEach(el => {
    const v = { nom: me.nomComplet, matricule: me.matricule, classe1: me.classe, filiere: me.filiere, classe: [me.classe, me.filiere].filter(Boolean).join(" - ") }[el.dataset.me];
    el.textContent = v || "Non renseigné";
  });
  const lecture = !A.ecriture(session.role, page);
  if (lecture) {
    document.body.classList.add("lecture-seule");
    const st = document.createElement("style");
    st.textContent = ".lecture-seule #btn-add,.lecture-seule .row-del,.lecture-seule #btn-edit{display:none!important}";
    document.head.appendChild(st);
  }

  /* ---------- Liens : pages pas encore créées ou réservées à un autre profil ---------- */
  document.querySelectorAll(".menu a, .dropdown a").forEach(a => {
    const cible = a.getAttribute("href");
    if (LIBRES.includes(cible)) return;
    let msg = null;
    if (!PAGES[cible]) msg = "Cette page sera disponible prochainement.";
    else if (!autorise(cible)) msg = "Cette page n'est pas accessible avec votre profil.";
    if (msg) a.addEventListener("click", e => { e.preventDefault(); message(msg); fermerMenu(); fermerPanneaux(); });
  });

  window.EPRESENCE = { session, message, lectureSeule: lecture };
})();
