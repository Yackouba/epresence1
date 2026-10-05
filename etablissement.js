/* Applique les paramètres sur toutes les pages : infos de l'établissement, logo, durée de session. */
(function () {
  "use strict";
  let p = {};
  try { p = JSON.parse(localStorage.getItem("epresence_parametres")) || {}; } catch (e) {}
  const g = p.general || {};
  window.EPParams = { get: section => p[section] || {} };

  const pret = f => (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", f) : f());
  pret(() => {
    document.querySelectorAll("[data-etab]").forEach(el => {
      const v = g[el.dataset.etab];
      if (!v) return;
      el.textContent = v;
      if (el.dataset.lien) el.href = el.dataset.lien + (el.dataset.lien === "tel:" ? v.replace(/[^\d+]/g, "") : v);
    });
    if (g.logo) document.querySelectorAll(".brand-icon, .logo-icon").forEach(s => {
      const i = new Image(); i.src = g.logo; i.alt = ""; i.className = s.getAttribute("class") || "";
      i.style.objectFit = "contain"; s.replaceWith(i);
    });
  });

  // Fin de session automatique
  const min = { "30 minutes": 30, "1 heure": 60, "4 heures": 240 }[(p.session || {}).duree] || 60;
  const verifier = () => {
    try {
      const s = JSON.parse(sessionStorage.getItem("epresence_session"));
      if (s && s.debut && Date.now() - s.debut > min * 60000) { sessionStorage.removeItem("epresence_session"); location.href = "connexion.html"; }
    } catch (e) {}
  };
  verifier(); setInterval(verifier, 60000);
})();
