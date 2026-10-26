// Affichage des pages publiques à partir de donnees/catalogue.js.
// Visiteurs : rien d'autre. Personne connectée (formateur, admin) : charge en plus commun/admin.js.
(function () {
  var script = document.currentScript;
  var BASE = script.src.replace(/commun\/site\.js(\?.*)?$/, ""); // adresse de la racine du site
  var page = document.body.getAttribute("data-page");            // "accueil" ou "jeu"
  var jeuId = document.body.getAttribute("data-jeu");

  function session() {
    try { return JSON.parse(sessionStorage.getItem("jp-session") || localStorage.getItem("jp-session") || "null"); }
    catch (e) { return null; }
  }
  // Après une modification, la version publiée met 1 à 2 minutes à arriver : la personne connectée voit tout de suite la sienne
  function catalogue() {
    var c = window.CATALOGUE;
    if (session()) {
      try {
        var local = JSON.parse(sessionStorage.getItem("jp-catalogue") || "null");
        if (local && local.version > c.version) c = local;
      } catch (e) {}
    }
    return c;
  }
  function sansAccents(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function el(tag, cls, texte) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texte != null) e.textContent = texte;
    return e;
  }
  function pastille(emoji, couleur) {
    var p = el("div", "pastille", emoji || "🎯");
    p.setAttribute("aria-hidden", "true");
    p.style.background = couleur + "33"; p.style.border = "2px solid " + couleur;
    return p;
  }
  function nbMissions(jeu) {
    var n = jeu.elements.filter(function (x) { return x.type === "mission"; }).length;
    return n + (n > 1 ? " missions" : " mission");
  }
  function pied(main) {
    var f = el("footer", "pied");
    f.innerHTML = '<span><strong>Pierrick Frottier</strong> · Formateur indépendant</span>' +
      '<a href="mailto:pierrick.frottier.pro@gmail.com">pierrick.frottier.pro@gmail.com</a>' +
      '<a href="https://www.linkedin.com/in/pierrick-frottier/" target="_blank" rel="noopener">LinkedIn</a>';
    var a = el("a", null, "Espace formateur"); a.href = BASE + "formateur/index.html";
    f.appendChild(a);
    main.appendChild(f);
  }

  var SITE = window.SITE = { BASE: BASE, page: page, jeuId: jeuId, session: session, catalogue: catalogue, el: el, pastille: pastille, nbMissions: nbMissions, sansAccents: sansAccents, decorer: null };

  // Accueil : une carte par jeu
  function rendreAccueil(main, cat) {
    document.title = cat.site.titre + " – Pierrick Frottier";
    main.appendChild(el("h1", null, cat.site.titre));
    main.appendChild(el("p", "intro", cat.site.intro));
    var zone = el("div"); zone.id = "zone-admin"; main.appendChild(zone);
    var ul = el("ul", "grille jeux");
    cat.jeux.forEach(function (j, i) {
      var li = el("li"), carte = el("article", "carte");
      carte.style.setProperty("--c", j.couleur);
      carte.appendChild(pastille(j.emoji, j.couleur));
      carte.appendChild(el("h2", null, j.titre));
      carte.appendChild(el("p", null, j.resume));
      carte.appendChild(el("span", "cat", nbMissions(j)));
      var a = el("a", "jouer", "Voir les missions");
      a.href = BASE + j.id + "/index.html";
      a.setAttribute("aria-label", "Voir les missions : " + j.titre);
      carte.appendChild(a);
      li.appendChild(carte); ul.appendChild(li);
      if (SITE.decorer) SITE.decorer(carte, "jeu", i, cat.jeux.length);
    });
    main.appendChild(ul);
  }

  // Page d'un jeu : missions et ressources publiques, avec recherche
  function rendreJeu(main, cat) {
    var jeu = cat.jeux.filter(function (j) { return j.id === jeuId; })[0];
    var retour = el("a", "retour", "← Tous les jeux"); retour.href = BASE + "index.html";
    main.appendChild(retour);
    if (!jeu) { main.appendChild(el("h1", null, "Jeu introuvable")); main.appendChild(el("p", "intro", "Ce jeu n’existe plus.")); return; }
    document.title = jeu.titrePage || jeu.titre;
    main.appendChild(el("h1", null, jeu.titrePage || jeu.titre));
    main.appendChild(el("p", "intro", jeu.intro));
    var zone = el("div"); zone.id = "zone-admin"; main.appendChild(zone);
    var recherche = el("input", "recherche");
    recherche.type = "search"; recherche.placeholder = "Rechercher une mission…";
    recherche.setAttribute("aria-label", "Rechercher une mission");
    main.appendChild(recherche);
    var ul = el("ul", "grille"), vide = el("p", "vide", "Aucune mission ne correspond à votre recherche.");
    main.appendChild(ul); main.appendChild(vide);
    var zf = el("div"); zf.id = "zone-formateur"; main.appendChild(zf);

    function afficher() {
      var q = sansAccents(recherche.value.trim()), n = 0;
      ul.innerHTML = "";
      jeu.elements.forEach(function (x, i) {
        if (sansAccents(x.titre + " " + x.description + " " + jeu.categorie).indexOf(q) < 0) return;
        n++;
        var li = el("li"), carte = el("article", "carte");
        carte.appendChild(pastille(x.emoji, x.couleur));
        carte.appendChild(el("h2", null, x.titre));
        carte.appendChild(el("p", null, x.description));
        carte.appendChild(el("span", "cat", jeu.categorie));
        var a = el("a", "jouer", x.bouton || (x.type === "mission" ? "Jouer" : "Ouvrir"));
        a.href = x.url || BASE + jeu.id + "/" + x.fichier;
        a.target = "_blank"; // chaque mission ou ressource s'ouvre dans un nouvel onglet
        if (x.url) a.rel = "noopener";
        a.setAttribute("aria-label", a.textContent + " : " + x.titre);
        carte.appendChild(a);
        li.appendChild(carte); ul.appendChild(li);
        if (SITE.decorer) SITE.decorer(carte, "element", i, jeu.elements.length);
      });
      vide.hidden = n > 0;
    }
    recherche.addEventListener("input", afficher);
    afficher();
  }

  SITE.rendre = function () {
    var main = document.getElementById("contenu");
    main.innerHTML = "";
    var cat = catalogue();
    if (page === "accueil") rendreAccueil(main, cat); else rendreJeu(main, cat);
    pied(main);
    if (SITE.apresRendu) SITE.apresRendu();
  };

  SITE.rendre();
  if (session()) {
    var s = document.createElement("script");
    s.src = BASE + "commun/admin.js";
    document.body.appendChild(s);
  }
})();
