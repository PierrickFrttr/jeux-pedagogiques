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
  // Jeux et éléments « masque: true » : invisibles pour les visiteurs, affichés en grisé pour une personne connectée
  function visible(x) { return !x.masque || !!session(); }
  function marquerMasque(carte, x) {
    if (!x.masque) return;
    carte.classList.add("masquee");
    carte.appendChild(el("span", "etiquette-masque", "Masqué aux visiteurs"));
  }
  function nbMissions(jeu) {
    var n = jeu.elements.filter(function (x) { return x.type === "mission" && visible(x); }).length;
    return n + (n > 1 ? " missions" : " mission");
  }
  function lien(texte, href, cls) { var a = el("a", cls, texte); a.href = href; return a; }
  // « Mission 3 · Le bras de fer » → numéro 3 + « Le bras de fer »
  function decouper(titre, rang) {
    var m = /^\s*mission\s*(\d+)\s*[·:–-]\s*(.+)$/i.exec(titre || "");
    return m ? { num: m[1], titre: m[2] } : { num: String(rang), titre: titre };
  }
  function entete() {
    var h = el("header", "entete");
    var m = lien("", BASE + "index.html", "marque");
    var logo = el("span", "logo"); logo.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 4; i++) logo.appendChild(el("i"));
    m.appendChild(logo); m.appendChild(document.createTextNode(catalogue().site.titre));
    h.appendChild(m);
    h.appendChild(lien("Espace formateur", BASE + "formateur/index.html", "lien-discret"));
    return h;
  }
  function pied(main) {
    var f = el("footer", "pied");
    f.innerHTML = '<span><strong>Pierrick Frottier</strong>, formateur indépendant</span>' +
      '<a href="mailto:pierrick.frottier.pro@gmail.com">pierrick.frottier.pro@gmail.com</a>' +
      '<a href="https://www.linkedin.com/in/pierrick-frottier/" target="_blank" rel="noopener">LinkedIn</a>';
    f.appendChild(lien("Espace formateur", BASE + "formateur/index.html"));
    main.appendChild(f);
  }
  function zoneAdmin(parent) { var z = el("div"); z.id = "zone-admin"; parent.appendChild(z); }

  // Polices chargées sans bloquer l'affichage (le texte apparaît tout de suite, puis prend sa police)
  if (!document.getElementById("polices")) {
    var lp = document.createElement("link"); lp.id = "polices"; lp.rel = "stylesheet";
    lp.href = "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&display=swap";
    document.head.appendChild(lp);
  }
  var SITE = window.SITE = { BASE: BASE, page: page, jeuId: jeuId, session: session, catalogue: catalogue, el: el, nbMissions: nbMissions, sansAccents: sansAccents, decorer: null };

  // Accueil : une « boîte » par jeu
  function rendreAccueil(haut, main, cat) {
    document.title = cat.site.titre + " – Pierrick Frottier";
    var hero = el("section", "hero");
    hero.appendChild(el("h1", null, cat.site.titre));
    hero.appendChild(el("p", null, cat.site.intro));
    main.appendChild(hero);
    zoneAdmin(main);
    var ul = el("ul", "grille jeux");
    ul.style.marginTop = "1.5rem";
    cat.jeux.forEach(function (j, i) {
      if (!visible(j)) return;
      var li = el("li"), carte = el("article", "couverture");
      carte.style.setProperty("--c", j.couleur);
      var couv = el("div", "couv");
      var em = el("span", "gros-emoji", j.emoji || "🎲"); em.setAttribute("aria-hidden", "true");
      couv.appendChild(em); couv.appendChild(el("span", "compte", nbMissions(j)));
      var corps = el("div", "corps");
      corps.appendChild(el("h2", null, j.titre));
      corps.appendChild(el("p", null, j.resume));
      var a = lien("Voir les missions", BASE + j.id + "/index.html", "jouer");
      a.setAttribute("aria-label", "Voir les missions : " + j.titre);
      corps.appendChild(a);
      carte.appendChild(couv); carte.appendChild(corps); marquerMasque(carte, j);
      li.appendChild(carte); ul.appendChild(li);
      if (SITE.decorer) SITE.decorer(carte, "jeu", i, cat.jeux.length);
    });
    main.appendChild(ul);
  }

  // Page d'un jeu : bandeau aux couleurs du jeu, parcours des missions, ressources
  function rendreJeu(haut, main, cat) {
    var jeu = cat.jeux.filter(function (j) { return j.id === jeuId; })[0];
    if (!jeu || !visible(jeu)) {
      main.appendChild(el("h1", "titre-page", jeu ? "Jeu bientôt disponible" : "Jeu introuvable"));
      main.appendChild(el("p", "aide", jeu ? "Ce jeu n’est pas encore ouvert. Revenez plus tard." : "Ce jeu n’existe plus."));
      main.appendChild(lien("Retour à l’accueil", BASE + "index.html", "btn principal"));
      return;
    }
    document.title = jeu.titrePage || jeu.titre;
    var missions = [], ressources = [];
    jeu.elements.forEach(function (x, i) { if (visible(x)) (x.type === "mission" ? missions : ressources).push({ x: x, i: i }); });

    var b = el("section", "bandeau"); b.style.setProperty("--c", jeu.couleur);
    var int = el("div", "interieur");
    var med = el("div", "medaillon", jeu.emoji || "🎲"); med.setAttribute("aria-hidden", "true");
    var txt = el("div");
    int.appendChild(lien("← Tous les jeux", BASE + "index.html", "fil"));
    txt.appendChild(el("h1", null, jeu.titrePage || jeu.titre));
    txt.appendChild(el("p", "intro", jeu.intro));
    var ch = el("div", "chiffres");
    ch.appendChild(el("span", null, nbMissions(jeu)));
    if (ressources.length) ch.appendChild(el("span", null, ressources.length + (ressources.length > 1 ? " ressources" : " ressource")));
    if (jeu.masque) ch.appendChild(el("span", "etiquette-masque", "Jeu masqué aux visiteurs"));
    txt.appendChild(ch);
    int.appendChild(med); int.appendChild(txt); b.appendChild(int);
    haut.appendChild(b);
    main.style.setProperty("--c", jeu.couleur);
    zoneAdmin(main);

    var tete = el("div", "section-titre");
    tete.appendChild(el("h2", null, "Missions"));
    var recherche = null;
    if (missions.length > 5) {
      recherche = el("input", "recherche");
      recherche.type = "search"; recherche.placeholder = "Rechercher une mission";
      recherche.setAttribute("aria-label", "Rechercher une mission");
      tete.appendChild(recherche);
    }
    main.appendChild(tete);
    var ol = el("ol", "parcours"); main.appendChild(ol);
    var vide = el("p", "vide"); main.appendChild(vide);

    function carteMission(m, rang) {
      var d = decouper(m.x.titre, rang);
      var li = el("li"), c = el("article", "etape");
      var num = el("span", "num", d.num); num.setAttribute("aria-hidden", "true");
      var em = el("span", "emoji", m.x.emoji || "🎯"); em.setAttribute("aria-hidden", "true");
      var t = el("div"); t.appendChild(el("h3", null, d.titre)); t.appendChild(el("p", null, m.x.description));
      var a = lien(m.x.bouton || "Jouer", m.x.url || BASE + jeu.id + "/" + m.x.fichier, "jouer");
      a.target = "_blank"; // chaque mission s'ouvre dans un nouvel onglet
      a.setAttribute("aria-label", "Jouer : " + m.x.titre);
      c.appendChild(num); c.appendChild(em); c.appendChild(t); c.appendChild(a); marquerMasque(c, m.x);
      li.appendChild(c); ol.appendChild(li);
      if (SITE.decorer) SITE.decorer(c, "element", m.i, jeu.elements.length, { premier: rang === 1, dernier: rang === missions.length });
    }
    function afficher() {
      var q = recherche ? sansAccents(recherche.value.trim()) : "", n = 0;
      ol.innerHTML = "";
      missions.forEach(function (m, k) {
        if (q && sansAccents(m.x.titre + " " + m.x.description).indexOf(q) < 0) return;
        n++; carteMission(m, k + 1);
      });
      vide.hidden = n > 0;
      vide.textContent = missions.length ? "Aucune mission ne correspond à « " + (recherche ? recherche.value : "") + " »." : "Les missions de ce jeu arrivent bientôt.";
    }
    if (recherche) recherche.addEventListener("input", afficher);
    afficher();

    if (ressources.length) {
      var t2 = el("div", "section-titre"); t2.appendChild(el("h2", null, "Ressources")); main.appendChild(t2);
      var ul = el("ul", "grille"); main.appendChild(ul);
      ressources.forEach(function (r, k) {
        var li = el("li"), c = el("article", "ressource");
        var em = el("span", "emoji", r.x.emoji || "📄"); em.setAttribute("aria-hidden", "true");
        c.appendChild(em); c.appendChild(el("h3", null, r.x.titre)); c.appendChild(el("p", null, r.x.description));
        var a = lien(r.x.bouton || "Ouvrir", r.x.url || BASE + jeu.id + "/" + r.x.fichier, "jouer");
        a.target = "_blank"; if (r.x.url) a.rel = "noopener";
        a.setAttribute("aria-label", a.textContent + " : " + r.x.titre);
        c.appendChild(a); marquerMasque(c, r.x); li.appendChild(c); ul.appendChild(li);
        if (SITE.decorer) SITE.decorer(c, "element", r.i, jeu.elements.length, { premier: k === 0, dernier: k === ressources.length - 1 });
      });
    }
    var zf = el("div"); zf.id = "zone-formateur"; main.appendChild(zf);
  }

  SITE.rendre = function () {
    var main = document.getElementById("contenu");
    var haut = document.getElementById("haut");
    if (!haut) { haut = el("div"); haut.id = "haut"; main.parentNode.insertBefore(haut, main); }
    haut.innerHTML = ""; main.innerHTML = "";
    haut.appendChild(entete());
    var cat = catalogue();
    if (page === "accueil") rendreAccueil(haut, main, cat); else rendreJeu(haut, main, cat);
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
