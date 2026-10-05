/* Contrôle d'accès par rôle (RBAC) — à charger AVANT layout.js */
(function () {
  "use strict";
  const ROLES = { admin: "Administrateur", enseignant: "Enseignant", etudiant: "Étudiant" };
  const TOUT = [
    ["tableau-de-bord.html", "i-dash", "Tableau de bord"], ["filieres.html", "i-filiere", "Filières"],
    ["classes.html", "i-classe", "Classes"], ["etudiants.html", "i-etudiant", "Étudiants"],
    ["enseignants.html", "i-enseignant", "Enseignants"], ["cours.html", "i-cours", "Cours"],
    ["emploi-du-temps.html", "i-edt", "Emploi du temps"], ["seances.html", "i-seance", "Séances"],
    ["rapports.html", "i-rapport", "Rapports"], ["parametres.html", "i-param", "Paramètres"],
    ["profil.html", "i-profil", "Mon profil"], ["historique.html", "i-presence", "Mes présences"]
  ];
  // pages = pages visibles ; ecriture = pages où le rôle peut modifier (le reste est en lecture seule)
  const DROITS = {
    admin:      { pages: "*", ecriture: "*", accueil: "tableau-de-bord.html" },
    enseignant: { pages: ["seances.html", "emploi-du-temps.html", "rapports.html"], ecriture: ["seances.html"], accueil: "seances.html" },
    etudiant:   { pages: ["profil.html", "historique.html"], ecriture: [], accueil: "profil.html" }
  };
  const a = (r, k, p) => DROITS[r][k] === "*" || DROITS[r][k].includes(p);
  const CLE = "epresence_comptes";
  const DEFAUT = [
    { email: "admin@ecole.local", nom: "Administrateur", role: "admin", mdp: "12345678", actif: true },
    { email: "enseignant@ecole.local", nom: "M. Diallo", role: "enseignant", mdp: "12345678", actif: true },
    { email: "etudiant@ecole.local", nom: "OUEDRAOGO Ibrahim", role: "etudiant", matricule: "2024-001", classe: "L1A", filiere: "Réseaux", mdp: "12345678", actif: true }
  ];
  const lire = () => { try { const d = JSON.parse(localStorage.getItem(CLE)); if (Array.isArray(d)) return d; } catch (e) {} return DEFAUT.map(c => ({ ...c })); };
  const session = () => { try { return JSON.parse(sessionStorage.getItem("epresence_session")); } catch (e) { return null; } };

  const normMat = m => String(m || "").toUpperCase().replace(/\s+/g, "");
  const json = (k, defaut) => { try { const d = JSON.parse(localStorage.getItem(k)); return d == null ? defaut : d; } catch (e) { return defaut; } };
  const fiche = m => (json("epresence_etudiants", []) || []).find(e => normMat(e.matricule) === normMat(m));
  const MAX_ESSAIS = 5, VERROU_MIN = 5;

  window.EPAuth = {
    ROLES, DROITS, ACCUEIL: Object.fromEntries(Object.keys(DROITS).map(r => [r, DROITS[r].accueil])),
    comptes: lire, session,
    peut: (role, page) => !!DROITS[role] && a(role, "pages", page),
    ecriture: (role, page) => !!DROITS[role] && a(role, "ecriture", page),
    menu: role => TOUT.filter(([p]) => a(role, "pages", p) && !(role === "admin" && /^(profil|historique)\./.test(p))),
    pagesRoles: () => Object.fromEntries(TOUT.map(([p]) => [p, Object.keys(DROITS).filter(r => a(r, "pages", p))])),
    // Étudiant : connexion UNIQUEMENT par numéro matricule. Autres rôles : email.
    connecter(identifiant, mdp, role) {
      const id = String(identifiant || "").trim();
      if (role === "etudiant" && id.includes("@")) return { erreur: "Étudiants : connectez-vous avec votre numéro matricule." };
      const cle = role + "|" + (role === "etudiant" ? normMat(id) : id.toLowerCase());
      const essais = json("epresence_tentatives", {}), e = essais[cle] || {};
      if (e.jusque && Date.now() < e.jusque) return { erreur: "Trop de tentatives. Réessayez dans " + Math.ceil((e.jusque - Date.now()) / 60000) + " min." };
      const c = lire().find(x => x.role === role && (role === "etudiant" ? x.matricule && normMat(x.matricule) === normMat(id) : x.email === id.toLowerCase()));
      if (!c || c.mdp !== mdp) {
        essais[cle] = (e.n || 0) + 1 >= MAX_ESSAIS ? { n: 0, jusque: Date.now() + VERROU_MIN * 60000 } : { n: (e.n || 0) + 1 };
        localStorage.setItem("epresence_tentatives", JSON.stringify(essais));
        return { erreur: role === "etudiant" ? "Matricule ou mot de passe incorrect." : "Identifiant ou mot de passe incorrect." };
      }
      if (c.actif === false) return { erreur: "Ce compte est désactivé." };
      if (role === "etudiant") {
        const f = fiche(c.matricule);
        if (f && f.statut === "inactif") return { erreur: "Cet étudiant est désactivé. Contactez l'administration." };
      }
      delete essais[cle]; localStorage.setItem("epresence_tentatives", JSON.stringify(essais));
      sessionStorage.setItem("epresence_session", JSON.stringify({ email: c.email, role: c.role, nom: c.nom, matricule: c.matricule || null, debut: Date.now() }));
      return { compte: c };
    },
    // Fiche de l'étudiant connecté : toujours déduite de SON matricule (jamais d'un paramètre modifiable)
    etudiant() {
      const s = session();
      if (!s || s.role !== "etudiant" || !s.matricule) return null;
      const f = fiche(s.matricule), c = lire().find(x => x.email === s.email) || {};
      return { matricule: s.matricule, nomComplet: f ? f.nom + " " + f.prenom : s.nom, classe: (f || c).classe || "", filiere: (f || c).filiere || "" };
    },
    // Présences réelles d'un matricule, issues des appels enregistrés par les enseignants
    presences(m) {
      return Object.entries(json("epresence_appel", {})).filter(([, v]) => v && v[m])
        .map(([id, v]) => { const [date, classe, cours] = id.split("|"); return { date, classe, cours: cours || "—", statut: v[m] }; })
        .sort((x, y) => y.date.localeCompare(x.date));
    },
    taux: l => (l.length ? Math.round(100 * l.filter(p => p.statut === "present" || p.statut === "retard").length / l.length) : null),
    // Création d'un accès : réservée à l'administrateur
    ajouterCompte(c) {
      const s = session();
      if (!s || s.role !== "admin") return { erreur: "Action réservée à l'administrateur." };
      if (!DROITS[c.role]) return { erreur: "Rôle inconnu." };
      if (c.role === "etudiant") {
        if (!c.matricule) return { erreur: "Le matricule est obligatoire pour un étudiant." };
        if (lire().some(x => x.matricule && normMat(x.matricule) === normMat(c.matricule))) return { erreur: "Ce matricule a déjà un compte." };
        c = { ...c, matricule: normMat(c.matricule), email: c.email || normMat(c.matricule).toLowerCase() + "@etudiant.local" };
      }
      const l = lire();
      if (l.some(x => x.email === c.email)) return { erreur: "Cet identifiant existe déjà." };
      l.push({ actif: true, ...c }); localStorage.setItem(CLE, JSON.stringify(l)); return { ok: true };
    }
  };
})();
