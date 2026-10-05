document.addEventListener("DOMContentLoaded", () => {
  const A = window.EPAuth, $ = id => document.getElementById(id);
  const form = $("login-form"), role = $("role"), ident = $("identifiant"), mdp = $("motdepasse"), erreur = $("form-error"), toggle = $("toggle-pwd");
  const memo = localStorage.getItem("epresence_email");
  if (memo) ident.value = memo;
  const label = document.querySelector('label[for="identifiant"]');
  function adapter(remplir) {
    const etu = role.value === "etudiant";
    label.textContent = etu ? "Numéro matricule" : "Identifiant ou email";
    ident.placeholder = etu ? "ex. 2024-001" : "";
    ident.autocomplete = etu ? "off" : "username";
    if (!remplir) return;
    const c = A.comptes().find(x => x.role === role.value && x.actif !== false);
    ident.value = c ? (etu ? c.matricule : c.email) : "";
  }
  role.addEventListener("change", () => adapter(true));
  adapter(false);
  toggle.addEventListener("click", () => {
    const v = mdp.type === "text"; mdp.type = v ? "password" : "text";
    toggle.setAttribute("aria-pressed", String(!v)); toggle.setAttribute("aria-label", v ? "Afficher le mot de passe" : "Masquer le mot de passe");
  });
  const fail = (m, champs = []) => { erreur.textContent = m; erreur.hidden = false; [ident, mdp, role].forEach(c => c.classList.remove("invalid")); champs.forEach(c => c.classList.add("invalid")); };
  form.addEventListener("submit", e => {
    e.preventDefault(); erreur.hidden = true;
    const email = ident.value.trim();
    if (!email) return fail(role.value === "etudiant" ? "Saisissez votre numéro matricule." : "Saisissez votre identifiant ou votre email.", [ident]);
    if (!mdp.value) return fail("Saisissez votre mot de passe.", [mdp]);
    const r = A.connecter(email, mdp.value, role.value);
    if (r.erreur) return fail(r.erreur, [ident, mdp, role]);
    if ($("souvenir").checked) localStorage.setItem("epresence_email", email); else localStorage.removeItem("epresence_email");
    form.querySelector(".btn-login").disabled = true;
    window.location.href = A.ACCUEIL[r.compte.role];
  });
});
