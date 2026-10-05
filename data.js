/* Données partagées entre les pages (filières, classes, enseignants, cours).
   Elles sont conservées dans le navigateur (localStorage) : une modification faite
   dans une page est visible dans les autres (listes déroulantes, tableau de bord…). */
(function () {
  "use strict";

  const CLES = {
    filieres: "epresence_filieres", classes: "epresence_classes",
    enseignants: "epresence_enseignants", cours: "epresence_cours"
  };

  const fil = (code, nom, description, statut = "actif") => ({ code, nom, description, statut });
  const cl = (nom, filiere, effectif, statut = "actif") => ({ nom, filiere, annee: "2024 - 2025", effectif, statut });
  const sansAccent = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ens = (nom, prenom, specialite, statut = "actif") => ({ nom, prenom, specialite, email: sansAccent(prenom) + "@ecole.local", statut });
  const co = (intitule, filiere, classe, enseignant, statut = "actif") => ({ intitule, filiere, classe, enseignant, statut });

  const DEFAUTS = {
    filieres: [
      fil("RI", "Réseaux informatiques", "Administration des réseaux"),
      fil("SI", "Systèmes informatiques", "Gestion des systèmes et serveurs"),
      fil("CS", "Cybersécurité", "Sécurité des réseaux et systèmes"),
      fil("GD", "Génie logiciel", "Développement d'applications"),
      fil("CA", "Comptabilité - Gestion", "Gestion et administration"),
      fil("ME", "Maintenance informatique", "Maintenance des équipements", "inactif")
    ],
    classes: [
      cl("L1 Réseaux", "Réseaux informatiques", 28), cl("L2 Réseaux", "Réseaux informatiques", 26),
      cl("L1 Systèmes", "Systèmes informatiques", 24), cl("L2 Systèmes", "Systèmes informatiques", 22),
      cl("L1 Cybersécurité", "Cybersécurité", 20), cl("L2 Cybersécurité", "Cybersécurité", 18),
      cl("L1 Génie logiciel", "Génie logiciel", 25), cl("L2 Génie logiciel", "Génie logiciel", 19),
      cl("L1 Comptabilité - Gestion", "Comptabilité - Gestion", 30), cl("L2 Comptabilité - Gestion", "Comptabilité - Gestion", 27),
      cl("L1 Maintenance", "Maintenance informatique", 15, "inactif"), cl("L2 Maintenance", "Maintenance informatique", 17)
    ],
    enseignants: [
      ens("OUEDRAOGO", "Ibrahim", "Réseaux informatiques"), ens("TRAORE", "Awa", "Systèmes informatiques"),
      ens("DIALLO", "Moussa", "Cybersécurité"), ens("KABORE", "Fatou", "Génie logiciel"),
      ens("BARRY", "Issa", "Base de données"), ens("SOME", "Oumar", "Maintenance informatique", "inactif"),
      ens("OUATTARA", "Mariam", "Réseaux informatiques"), ens("SANOGO", "Daouda", "Systèmes informatiques"),
      ens("SAWADOGO", "Aminata", "Cybersécurité"), ens("COMPAORE", "Yacouba", "Génie logiciel"),
      ens("ZONGO", "Salamata", "Comptabilité - Gestion"), ens("SANKARA", "Boukary", "Base de données"),
      ens("TAPSOBA", "Moussa", "Réseaux informatiques"), ens("YAMEOGO", "Pauline", "Comptabilité - Gestion"),
      ens("BELEM", "Nadège", "Anglais"), ens("LOMPO", "Abdoul", "Systèmes informatiques", "inactif"),
      ens("KAMBOU", "Estelle", "Génie logiciel"), ens("ZIDA", "Josiane", "Anglais")
    ],
    cours: [
      co("Réseaux informatiques", "RI", "L1 Réseaux", "OUEDRAOGO Ibrahim"),
      co("Administration réseau", "RI", "L2 Réseaux", "OUEDRAOGO Ibrahim"),
      co("Systèmes d'exploitation", "SI", "L1 Systèmes", "TRAORE Awa"),
      co("Base de données", "SI", "L2 Systèmes", "DIALLO Moussa"),
      co("Cybersécurité", "CS", "L1 Cybersécurité", "KABORE Fatou"),
      co("Développement web", "GD", "L1 Génie logiciel", "BARRY Issa"),
      co("Maintenance matériel", "ME", "L1 Maintenance", "SOME Oumar", "inactif"),
      co("Anglais", "Général", "Tous", "OUATTARA Mariam"),
      co("Programmation Java", "GD", "L1 Génie logiciel", "COMPAORE Yacouba"),
      co("Algorithmique", "GD", "L1 Génie logiciel", "KAMBOU Estelle"),
      co("Sécurité des réseaux", "CS", "L2 Cybersécurité", "SAWADOGO Aminata"),
      co("Cryptographie", "CS", "L2 Cybersécurité", "DIALLO Moussa"),
      co("Administration système", "SI", "L2 Systèmes", "LOMPO Abdoul"),
      co("Virtualisation", "SI", "L2 Systèmes", "TRAORE Awa"),
      co("Routage et commutation", "RI", "L1 Réseaux", "TAPSOBA Moussa"),
      co("Téléphonie IP", "RI", "L2 Réseaux", "OUEDRAOGO Ibrahim"),
      co("Comptabilité générale", "CA", "L1 Comptabilité - Gestion", "ZONGO Salamata"),
      co("Gestion financière", "CA", "L2 Comptabilité - Gestion", "YAMEOGO Pauline"),
      co("Droit des affaires", "CA", "L2 Comptabilité - Gestion", "YAMEOGO Pauline"),
      co("Électronique de base", "ME", "L1 Maintenance", "SOME Oumar", "inactif"),
      co("Développement mobile", "GD", "L2 Génie logiciel", "COMPAORE Yacouba"),
      co("Bases de données avancées", "SI", "L2 Systèmes", "SANKARA Boukary"),
      co("Anglais technique", "Général", "Tous", "BELEM Nadège"),
      co("Mathématiques appliquées", "Général", "Tous", "KABORE Fatou")
    ]
  };

  const copie = nom => DEFAUTS[nom].map((r, i) => ({ id: nom.charAt(0) + (i + 1), ...r }));

  function load(nom) {
    try {
      const d = JSON.parse(localStorage.getItem(CLES[nom]));
      if (Array.isArray(d)) return d;
    } catch (e) {}
    return copie(nom);
  }
  function save(nom, liste) { try { localStorage.setItem(CLES[nom], JSON.stringify(liste)); } catch (e) {} }

  window.EPData = { load, save, CLES };
})();
