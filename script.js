document.addEventListener("DOMContentLoaded", () => {
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");
  const liens = nav.querySelectorAll("a");

  // Menu mobile
  burger.addEventListener("click", () => {
    const ouvert = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", ouvert);
    burger.setAttribute("aria-label", ouvert ? "Fermer le menu" : "Ouvrir le menu");
  });

  // Fermer le menu après un clic sur un lien
  liens.forEach(lien => lien.addEventListener("click", () => {
    nav.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  }));

  // Surlignage du lien actif selon la section visible
  const sections = [
    { id: "accueil", lien: nav.querySelector('a[href="index.html"]') },
    { id: "fonctionnalites", lien: nav.querySelector('a[href="#fonctionnalites"]') },
    { id: "avantages", lien: nav.querySelector('a[href="#avantages"]') }
  ];

  const observer = new IntersectionObserver(entrees => {
    entrees.forEach(e => {
      if (!e.isIntersecting) return;
      liens.forEach(l => l.classList.remove("active"));
      const cible = sections.find(s => s.id === e.target.id);
      if (cible && cible.lien) cible.lien.classList.add("active");
    });
  }, { rootMargin: "-40% 0px -50% 0px" });

  sections.forEach(s => {
    const el = document.getElementById(s.id);
    if (el) observer.observe(el);
  });
});
