/* Petit graphique en anneau (SVG) partagé par plusieurs pages */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";

  function cercle(r, couleur) {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", 60); c.setAttribute("cy", 60); c.setAttribute("r", r);
    c.setAttribute("stroke", couleur); c.setAttribute("stroke-width", 12); c.setAttribute("fill", "none");
    return c;
  }

  // segments : [{ valeur, couleur }]
  function donut(svg, segments) {
    const R = 48, C = 2 * Math.PI * R;
    svg.setAttribute("viewBox", "0 0 120 120");
    svg.innerHTML = "";
    svg.appendChild(cercle(R, "#eef1f7"));
    const total = segments.reduce((s, x) => s + x.valeur, 0) || 1;
    let decalage = 0;
    segments.forEach(sg => {
      const part = sg.valeur / total * C;
      if (part <= 0) return;
      const c = cercle(R, sg.couleur);
      c.style.strokeDasharray = "0 " + C;
      c.style.strokeDashoffset = -decalage;
      c.style.transition = "stroke-dasharray .9s ease";
      svg.appendChild(c);
      const longueur = Math.max(part - (segments.length > 1 ? 1.5 : 0), 0);
      requestAnimationFrame(() => requestAnimationFrame(() => { c.style.strokeDasharray = longueur + " " + C; }));
      decalage += part;
    });
  }

  window.EPRESENCE_CHARTS = { donut };
})();
