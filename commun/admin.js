// Outils d'édition affichés sur l'accueil et les pages de jeu pour une personne connectée (formateur ou admin).
// Chargé par site.js seulement s'il y a une session. Chaque action publie un enregistrement sur GitHub.
(function () {
  var SITE = window.SITE, BASE = SITE.BASE;
  function charger(src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement("script"); s.src = BASE + src + "?v=" + Date.now();
      s.onload = ok; s.onerror = function () { ko(new Error("Impossible de charger " + src)); };
      document.body.appendChild(s);
    });
  }
  charger("donnees/comptes.js").then(function () { return charger("commun/noyau.js"); }).then(function () { return charger("commun/fenetre.js"); }).then(demarrer)
    .catch(function (e) { console.error(e); });

  function demarrer() {
    var N = window.NOYAU, el = SITE.el, s = N.session();
    var RETOUR_A = '<a href="../index.html" id="retour-hub" style="position:fixed;top:.4rem;left:.4rem;z-index:1000;padding:.3rem .6rem;font:600 .8rem/1.2 system-ui,sans-serif;color:#ece8dc;background:rgba(20,33,61,.92);border:1px solid rgba(236,232,220,.35);border-radius:6px;text-decoration:none">&larr; Tous les jeux</a>\n';

    // ---------- Barre « mode formateur » ----------
    var barre = el("div", "barre-admin");
    var qui = el("span", "qui");
    qui.appendChild(document.createTextNode("Mode édition, connecté en tant que "));
    qui.appendChild(el("strong", null, s.id));
    qui.appendChild(document.createTextNode(" "));
    qui.appendChild(el("span", "badge", s.role === "admin" ? "Admin" : "Formateur"));
    var nav = el("nav");
    var lienEspace = el("a", null, "Mon espace"); lienEspace.href = BASE + "formateur/index.html";
    var sortir = el("button", null, "Se déconnecter"); sortir.type = "button";
    sortir.onclick = function () { N.deconnecter(); location.reload(); };
    nav.appendChild(lienEspace); nav.appendChild(sortir);
    barre.appendChild(qui); barre.appendChild(nav);
    document.body.insertBefore(barre, document.body.firstChild);

    var sessionKo = false; // session expirée ou révoquée : pas de boutons d'édition
    N.coffre().catch(function (e) {
      qui.textContent = e.message;
      lienEspace.textContent = "Se reconnecter";
      sessionKo = true; SITE.decorer = null; SITE.apresRendu = null; rafraichir();
    });

    function rafraichir() { SITE.rendre(); }
    function catalogue() { return SITE.catalogue(); }
    function jeuCourant(cat) { return cat.jeux.filter(function (j) { return j.id === SITE.jeuId; })[0]; }
    function trouverJeu(cat, id) { var j = cat.jeux.filter(function (x) { return x.id === id; })[0]; if (!j) throw new Error("Ce jeu n’existe plus."); return j; }
    function cle(x) { return x.fichier || x.url; }
    function trouverElement(jeu, k) { var i = jeu.elements.map(cle).indexOf(k); if (i < 0) throw new Error("Cet élément n’existe plus (modifié par quelqu’un d’autre ?)."); return i; }
    function bouton(texte, cls, action) { var b = el("button", "btn " + (cls || ""), texte); b.type = "button"; b.onclick = action; return b; }
    function extension(nom) { var m = /\.[a-z0-9]{1,6}$/i.exec(nom || ""); return m ? m[0].toLowerCase() : ""; }
    function lireOctets(fichier) { return fichier.arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
    function publie(m) { return (m || "Publié") + ". En ligne d’ici 1 à 2 minutes."; }
    var EMOJI = { cote: true }, COULEUR = { cote: true };
    function champsVisuels(x, defEmoji) {
      return [
        Object.assign({ nom: "emoji", type: "emoji", label: "Emoji", valeur: x ? x.emoji : defEmoji, requis: true }, EMOJI),
        Object.assign({ nom: "couleur", type: "couleur", label: "Couleur", valeur: x ? x.couleur : "#1d4f63", requis: true }, COULEUR)
      ];
    }

    // ---------- Petits boutons sur chaque carte ----------
    SITE.decorer = function (carte, genre, i, n, bornes) {
      if (sessionKo) return;
      var o = el("div", "outils-carte");
      var cible = genre === "jeu" ? catalogue().jeux[i] : jeuCourant(catalogue()).elements[i];
      var haut = el("button", null, "↑"), bas = el("button", null, "↓"), modif = el("button", null, "✎"), suppr = el("button", null, "🗑");
      var oeil = el("button", null, cible.masque ? "👁" : "🙈");
      [haut, bas, oeil, modif, suppr].forEach(function (b) { b.type = "button"; o.appendChild(b); });
      haut.title = "Monter"; bas.title = "Descendre"; modif.title = "Modifier"; suppr.title = "Supprimer";
      oeil.title = cible.masque ? "Rendre visible aux visiteurs" : "Masquer aux visiteurs";
      [haut, bas, oeil, modif, suppr].forEach(function (b) { b.setAttribute("aria-label", b.title); });
      haut.disabled = bornes ? bornes.premier : i === 0; bas.disabled = bornes ? bornes.dernier : i === n - 1;
      carte.insertBefore(o, carte.firstChild);
      if (genre === "jeu") {
        var j = cible;
        haut.onclick = function () { deplacerJeu(j.id, -1, o); };
        bas.onclick = function () { deplacerJeu(j.id, 1, o); };
        oeil.onclick = function () { basculer(function (cat) { return trouverJeu(cat, j.id); }, j, o); };
        modif.onclick = function () { formJeu(j); };
        suppr.onclick = function () { supprimerJeu(j); };
      } else {
        var x = cible;
        haut.onclick = function () { deplacerElement(cle(x), -1, o); };
        bas.onclick = function () { deplacerElement(cle(x), 1, o); };
        oeil.onclick = function () { basculer(function (cat) { var jj = trouverJeu(cat, SITE.jeuId); return jj.elements[trouverElement(jj, cle(x))]; }, x, o); };
        modif.onclick = function () { x.type === "mission" ? formMission(x) : formRessourcePublique(x); };
        suppr.onclick = function () { supprimerElement(x); };
      }
    };
    // Masquer / rendre visible un jeu ou un élément pour les visiteurs
    function basculer(trouver, x, o) {
      patienter(o);
      var masquer = !x.masque;
      N.modifierCatalogue(function (cat) {
        var c = trouver(cat);
        if (masquer) c.masque = true; else delete c.masque;
      }, (masquer ? "Masqué aux visiteurs : " : "Visible par les visiteurs : ") + x.titre).then(rafraichir, echec);
    }
    function champMasque(x) {
      return { nom: "masque", type: "case", label: "Masquer aux visiteurs (seuls les formateurs le voient)", valeur: x ? x.masque : false };
    }
    function appliquerMasque(e, v) { if (v.masque) e.masque = true; else delete e.masque; }
    function patienter(o) { o.querySelectorAll("button").forEach(function (b) { b.disabled = true; }); }
    function echec(e) { alerte("Échec", e.message); rafraichir(); }
    function alerte(titre, message) { N.formulaire({ titre: titre, intro: message, champs: [], bouton: "OK", valider: function () { return ""; } }); }

    // ---------- Zone d'actions sous le titre ----------
    SITE.apresRendu = function () {
      if (sessionKo) return;
      var z = document.getElementById("zone-admin");
      if (!z) return;
      z.className = "actions-admin";
      if (SITE.page === "accueil") {
        z.appendChild(bouton("+ Nouveau jeu", "principal", function () { formJeu(null); }));
        z.appendChild(bouton("✎ Modifier l’accueil", "", formAccueil));
      } else {
        var jeu = jeuCourant(catalogue());
        if (!jeu) return;
        z.appendChild(bouton("+ Mission", "principal", function () { formMission(null); }));
        z.appendChild(bouton("+ Ressource ou cours", "", function () { formRessource(); }));
        z.appendChild(bouton("✎ Modifier le jeu", "", function () { formJeu(jeu); }));
        zoneDocuments(jeu);
      }
    };

    // ---------- Accueil et jeux ----------
    function formAccueil() {
      var c = catalogue().site;
      N.formulaire({
        titre: "Modifier l’accueil",
        champs: [
          { nom: "titre", type: "texte", label: "Titre", valeur: c.titre, requis: true },
          { nom: "intro", type: "zone", label: "Phrase d’introduction", valeur: c.intro, requis: true },
          { nom: "slogan", type: "texte", label: "Slogan (pied de page)", valeur: c.slogan || "Apprendre l’entreprise en la jouant.", requis: true }
        ],
        valider: function (v) {
          return N.modifierCatalogue(function (cat) { cat.site.titre = v.titre; cat.site.intro = v.intro; cat.site.slogan = v.slogan; }, "Accueil modifié")
            .then(function () { rafraichir(); return publie("Accueil mis à jour"); });
        }
      });
    }
    function gabaritJeu(id) {
      return '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
        '<title>Entreprise en Jeu</title>\n<link rel="icon" type="image/png" href="../favicon.png">\n<link rel="apple-touch-icon" href="../commun/logo-180.png">\n<link rel="stylesheet" href="../commun/site.css">\n</head>\n' +
        '<body data-page="jeu" data-jeu="' + id + '">\n<main class="wrap" id="contenu"><noscript>Cette page nécessite JavaScript.</noscript></main>\n' +
        '<script src="../donnees/catalogue.js"></script>\n<script src="../commun/site.js"></script>\n</body>\n</html>\n';
    }
    function formJeu(j) {
      N.formulaire({
        titre: j ? "Modifier le jeu" : "Nouveau jeu",
        intro: j ? null : "Le jeu apparaît sur l’accueil. Ajoutez ensuite ses missions depuis sa page.",
        champs: [
          { nom: "titre", type: "texte", label: "Nom du jeu (carte de l’accueil)", valeur: j && j.titre, requis: true, aide: "Ex. « Cellule NOMAD – Supply chain »" },
          { nom: "titrePage", type: "texte", label: "Titre de la page du jeu", valeur: j && j.titrePage !== j.titre ? j.titrePage : "", aide: "Laissez vide pour reprendre le nom du jeu." },
          { nom: "resume", type: "zone", label: "Résumé (carte de l’accueil)", valeur: j && j.resume, requis: true },
          { nom: "intro", type: "zone", label: "Introduction (page du jeu)", valeur: j && j.intro, requis: true, lignes: 4 },
          { nom: "categorie", type: "texte", label: "Étiquette des cartes de mission", valeur: j && j.categorie, requis: true, aide: "Ex. « Supply chain »" }
        ].concat(champsVisuels(j, "🎲"), [champMasque(j)], j ? [{ nom: "retourCss", type: "texte", label: "Réglage du bouton retour (CSS, pour experts)", valeur: j.retourCss, aide: "Espace à réserver dans les missions pour le bouton « ← Tous les jeux ». Laissez tel quel si vous ne savez pas." }] : []),
        valider: function (v) {
          var champs = { titre: v.titre, titrePage: v.titrePage || v.titre, resume: v.resume, intro: v.intro, categorie: v.categorie, emoji: v.emoji, couleur: v.couleur };
          if (j) {
            return N.modifierCatalogue(function (cat) {
              var x = trouverJeu(cat, j.id); Object.assign(x, champs); x.retourCss = v.retourCss || ""; appliquerMasque(x, v);
            }, "Jeu modifié : " + v.titre).then(function () { rafraichir(); return publie("Jeu mis à jour"); });
          }
          var id;
          return N.modifierCatalogue(function (cat, cf) {
            id = N.slug(v.titre); var base = id, k = 2;
            var pris = cat.jeux.map(function (x) { return x.id; }).concat(["commun", "donnees", "formateur", "outils", "prive"]);
            while (pris.indexOf(id) >= 0) id = base + "-" + k++;
            var nouveau = Object.assign({ id: id }, champs, { retourCss: "", elements: [] }); appliquerMasque(nouveau, v); cat.jeux.push(nouveau);
            return [{ chemin: id + "/index.html", texte: gabaritJeu(id) }];
          }, "Nouveau jeu : " + v.titre).then(function () { rafraichir(); return publie("Jeu créé (page " + id + "/)"); });
        }
      });
    }
    function deplacerJeu(id, sens, o) {
      patienter(o);
      N.modifierCatalogue(function (cat) {
        var i = cat.jeux.map(function (x) { return x.id; }).indexOf(id), k = i + sens;
        if (i < 0 || k < 0 || k >= cat.jeux.length) return;
        cat.jeux.splice(k, 0, cat.jeux.splice(i, 1)[0]);
      }, "Ordre des jeux").then(rafraichir, echec);
    }
    function supprimerJeu(j) {
      N.formulaire({
        titre: "Supprimer le jeu « " + j.titre + " » ?",
        intro: "Ses " + j.elements.length + " missions et ressources, ses fichiers et ses documents formateur seront supprimés du site. Pour confirmer, tapez SUPPRIMER.",
        champs: [{ nom: "ok", type: "texte", label: "Confirmation", requis: true }],
        bouton: "Supprimer définitivement", danger: true, attente: "Suppression en cours…",
        valider: function (v) {
          if (v.ok !== "SUPPRIMER") throw new Error("Tapez SUPPRIMER en majuscules pour confirmer.");
          return N.modifierCatalogue(function (cat, cf) {
            cat.jeux = cat.jeux.filter(function (x) { return x.id !== j.id; });
            return Promise.all([N.lister(cf.github, j.id + "/"), N.lireManifeste(cf)]).then(function (r) {
              var ch = r[0].map(function (p) { return { chemin: p, supprimer: true }; });
              var m = r[1], gardes = [];
              m.entrees.forEach(function (e) {
                if (e.jeuId === j.id || e.jeu === j.titre) { if (e.id) ch.push({ chemin: "formateur/donnees/" + e.id + ".bin", supprimer: true }); }
                else gardes.push(e);
              });
              if (gardes.length === m.entrees.length) return ch;
              m.entrees = gardes;
              return N.chiffrer(cf.documents, N.octets(JSON.stringify(gardes))).then(function (c) {
                var o = new Uint8Array(16 + c.length); o.set(m.sel); o.set(c, 16);
                return ch.concat([{ chemin: "formateur/donnees/manifeste.bin", octets: o }]);
              });
            });
          }, "Suppression du jeu " + j.titre).then(function () { rafraichir(); return publie("Jeu supprimé"); });
        }
      });
    }

    // ---------- Missions ----------
    function insererBoutonRetour(html, jeu) {
      if (html.indexOf("retour-hub") >= 0) return html;
      var bloc = "<!-- Bouton retour vers l'accueil du jeu (ajouté par l'espace formateur) -->\n" + (jeu.retourCss ? "<style>" + jeu.retourCss + "</style>\n" : "") + RETOUR_A;
      var i = html.toLowerCase().lastIndexOf("</body>");
      return i < 0 ? html + bloc : html.slice(0, i) + bloc + html.slice(i);
    }
    function formMission(x) {
      var jeu = jeuCourant(catalogue());
      var n = jeu.elements.filter(function (e) { return e.type === "mission"; }).length + 1;
      N.formulaire({
        titre: x ? "Modifier la mission" : "Nouvelle mission",
        champs: [
          { nom: "fichier", type: "fichier", label: x ? "Remplacer le fichier HTML" : "Fichier HTML de la mission", accept: ".html,.htm", requis: !x,
            aide: "Le bouton « ← Tous les jeux » est ajouté automatiquement." },
          { nom: "titre", type: "texte", label: "Titre", valeur: x ? x.titre : "Mission " + n + " · ", requis: true },
          { nom: "description", type: "zone", label: "Description (une phrase)", valeur: x && x.description, requis: true }
        ].concat(champsVisuels(x, "🎯"), [champMasque(x)]),
        valider: function (v) {
          if (v.fichier && !/\.html?$/i.test(v.fichier.name)) throw new Error("Choisissez un fichier .html.");
          var lecture = v.fichier ? v.fichier.text().then(function (h) { return insererBoutonRetour(h, jeu); }) : Promise.resolve(null);
          return lecture.then(function (html) {
            return N.modifierCatalogue(function (cat) {
              var j = trouverJeu(cat, jeu.id), donnees = { titre: v.titre, description: v.description, emoji: v.emoji, couleur: v.couleur };
              if (x) {
                var e = j.elements[trouverElement(j, cle(x))]; Object.assign(e, donnees); appliquerMasque(e, v);
                return html ? [{ chemin: jeu.id + "/" + e.fichier, texte: html }] : [];
              }
              var nom = "jeux/" + N.slug(v.titre) + ".html", base = nom.slice(0, -5), k = 2;
              while (j.elements.map(cle).indexOf(nom) >= 0) nom = base + "-" + k++ + ".html";
              var derniere = -1;
              j.elements.forEach(function (e, i) { if (e.type === "mission") derniere = i; });
              var e2 = Object.assign({ type: "mission", fichier: nom }, donnees); appliquerMasque(e2, v);
              j.elements.splice(derniere + 1, 0, e2);
              return [{ chemin: jeu.id + "/" + nom, texte: html }];
            }, (x ? "Mission modifiée : " : "Nouvelle mission : ") + v.titre);
          }).then(function () { rafraichir(); return publie(x ? "Mission mise à jour" : "Mission publiée"); });
        }
      });
    }
    function deplacerElement(k, sens, o) {
      patienter(o);
      N.modifierCatalogue(function (cat) {
        var j = trouverJeu(cat, SITE.jeuId), i = trouverElement(j, k), d = i + sens;
        if (d < 0 || d >= j.elements.length) return;
        j.elements.splice(d, 0, j.elements.splice(i, 1)[0]);
      }, "Ordre des missions").then(rafraichir, echec);
    }
    function supprimerElement(x) {
      N.confirmer("Supprimer « " + x.titre + " » ?",
        x.fichier ? "La carte et son fichier seront supprimés du site." : "La carte sera supprimée du site.", "Supprimer",
        function () {
          return N.modifierCatalogue(function (cat) {
            var j = trouverJeu(cat, SITE.jeuId); j.elements.splice(trouverElement(j, cle(x)), 1);
            return x.fichier ? [{ chemin: SITE.jeuId + "/" + x.fichier, supprimer: true }] : [];
          }, "Suppression : " + x.titre).then(function () { rafraichir(); return publie("Supprimé"); });
        });
    }

    // ---------- Ressources et cours ----------
    function sectionsConnues() {
      return (docsDuJeu || []).map(function (e) { return e.section; }).filter(function (s, i, t) { return s && t.indexOf(s) === i; })
        .concat(["Supports de cours", "Documents de séquence"]).filter(function (s, i, t) { return t.indexOf(s) === i; });
    }
    function formRessource() {
      var publics = [["public", "Publique : visible par les étudiants"], ["formateur", "Réservée aux formateurs (chiffrée)"]];
      N.formulaire({
        titre: "Nouvelle ressource ou cours",
        champs: [
          { nom: "visibilite", type: "choix", label: "Qui peut la voir ?", options: publics, valeur: "public" },
          { nom: "genre", type: "choix", label: "Type", options: [["fichier", "Fichier (PDF, Word, PowerPoint…)"], ["lien", "Lien (Google Slides, vidéo, site…)"]], valeur: "fichier" },
          { nom: "fichier", type: "fichier", label: "Fichier", requis: true, visibleSi: function (v) { return v.genre === "fichier"; } },
          { nom: "url", type: "texte", label: "Adresse du lien", requis: true, aide: "Commence par https://", visibleSi: function (v) { return v.genre === "lien"; } },
          { nom: "titre", type: "texte", label: "Titre", requis: true },
          { nom: "description", type: "zone", label: "Description (une phrase)", requis: true, visibleSi: function (v) { return v.visibilite === "public"; } },
          { nom: "section", type: "texte", label: "Rubrique", valeur: "Supports de cours", requis: true, suggestions: sectionsConnues(), visibleSi: function (v) { return v.visibilite === "formateur"; } },
          { nom: "bouton", type: "texte", label: "Texte du bouton", valeur: "Ouvrir", requis: true, visibleSi: function (v) { return v.visibilite === "public"; } },
          Object.assign({ nom: "emoji", type: "emoji", label: "Emoji", valeur: "📄", requis: true, visibleSi: function (v) { return v.visibilite === "public"; } }, EMOJI),
          Object.assign({ nom: "couleur", type: "couleur", label: "Couleur", valeur: "#5b6b9a", requis: true, visibleSi: function (v) { return v.visibilite === "public"; } }, COULEUR),
          Object.assign(champMasque(null), { visibleSi: function (v) { return v.visibilite === "public"; } })
        ],
        valider: function (v) {
          if (v.genre === "lien" && !/^https?:\/\//i.test(v.url)) throw new Error("L’adresse doit commencer par https://");
          if (v.genre === "fichier" && !v.fichier) throw new Error("Choisissez un fichier.");
          return v.visibilite === "public" ? ajouterRessourcePublique(v) : ajouterDocument(v, jeuCourant(catalogue()));
        }
      });
    }
    function ajouterRessourcePublique(v) {
      var jeu = jeuCourant(catalogue());
      var lecture = v.genre === "fichier" ? lireOctets(v.fichier) : Promise.resolve(null);
      return lecture.then(function (o) {
        return N.modifierCatalogue(function (cat) {
          var j = trouverJeu(cat, jeu.id), e = { type: "ressource", titre: v.titre, description: v.description, emoji: v.emoji, couleur: v.couleur, bouton: v.bouton || "Ouvrir" };
          appliquerMasque(e, v);
          if (!o) { e.url = v.url; j.elements.push(e); return []; }
          var ext = extension(v.fichier.name), nom = "ressources/" + N.slug(v.titre) + ext, base = nom.slice(0, nom.length - ext.length), k = 2;
          while (j.elements.map(cle).indexOf(nom) >= 0) nom = base + "-" + k++ + ext;
          e.fichier = nom; j.elements.push(e);
          return [{ chemin: jeu.id + "/" + nom, octets: o }];
        }, "Nouvelle ressource : " + v.titre);
      }).then(function () { rafraichir(); return publie("Ressource publiée"); });
    }
    function formRessourcePublique(x) {
      N.formulaire({
        titre: "Modifier la ressource",
        champs: [
          x.url ? { nom: "url", type: "texte", label: "Adresse du lien", valeur: x.url, requis: true } : { nom: "fichier", type: "fichier", label: "Remplacer le fichier" },
          { nom: "titre", type: "texte", label: "Titre", valeur: x.titre, requis: true },
          { nom: "description", type: "zone", label: "Description", valeur: x.description, requis: true },
          { nom: "bouton", type: "texte", label: "Texte du bouton", valeur: x.bouton || "Ouvrir", requis: true }
        ].concat(champsVisuels(x, "📄"), [champMasque(x)]),
        valider: function (v) {
          if (x.url && !/^https?:\/\//i.test(v.url)) throw new Error("L’adresse doit commencer par https://");
          var lecture = v.fichier ? lireOctets(v.fichier) : Promise.resolve(null);
          return lecture.then(function (o) {
            return N.modifierCatalogue(function (cat) {
              var j = trouverJeu(cat, SITE.jeuId), e = j.elements[trouverElement(j, cle(x))];
              Object.assign(e, { titre: v.titre, description: v.description, bouton: v.bouton, emoji: v.emoji, couleur: v.couleur }); appliquerMasque(e, v);
              if (x.url) { e.url = v.url; return []; }
              if (!o) return [];
              var ext = extension(v.fichier.name);
              if (ext === extension(e.fichier)) return [{ chemin: SITE.jeuId + "/" + e.fichier, octets: o }];
              var ancien = e.fichier; e.fichier = ancien.replace(/\.[a-z0-9]+$/i, "") + ext;
              return [{ chemin: SITE.jeuId + "/" + ancien, supprimer: true }, { chemin: SITE.jeuId + "/" + e.fichier, octets: o }];
            }, "Ressource modifiée : " + v.titre);
          }).then(function () { rafraichir(); return publie("Ressource mise à jour"); });
        }
      });
    }

    // ---------- Documents formateur (chiffrés) du jeu ----------
    var docsDuJeu = null;
    function duJeu(e, jeu) { return e.jeuId ? e.jeuId === jeu.id : e.jeu === jeu.titre; }
    function ajouterDocument(v, jeu) {
      var lecture = v.genre === "fichier" ? lireOctets(v.fichier) : Promise.resolve(null);
      return lecture.then(function (o) {
        return N.modifierDocuments(function (entrees, cf) {
          var e = { jeu: jeu.titre, jeuId: jeu.id, section: v.section, libelle: v.titre };
          if (!o) { e.lien = v.url; entrees.push(e); return []; }
          e.nom = v.fichier.name; e.id = Array.from(N.aleatoire(8)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
          e.taille = o.length; e.type = v.fichier.type || "application/octet-stream";
          entrees.push(e);
          return N.chiffrer(cf.documents, o).then(function (c) { return [{ chemin: "formateur/donnees/" + e.id + ".bin", octets: c }]; });
        }, "Document formateur ajouté : " + v.titre);
      }).then(function () { chargerDocuments(jeu); return "Document ajouté à l’espace formateur."; });
    }
    function zoneDocuments(jeu) {
      var z = document.getElementById("zone-formateur");
      z.className = "zone-formateur";
      z.innerHTML = "";
      z.appendChild(el("h2", null, "Documents formateur"));
      z.appendChild(el("p", "aide", "Visibles uniquement par les formateurs connectés. Les étudiants ne voient pas cette partie."));
      var actions = el("div"); actions.style.marginBottom = "1rem";
      actions.appendChild(bouton("+ Document formateur", "", function () {
        N.formulaire({
          titre: "Nouveau document formateur",
          champs: [
            { nom: "genre", type: "choix", label: "Type", options: [["fichier", "Fichier"], ["lien", "Lien"]], valeur: "fichier" },
            { nom: "fichier", type: "fichier", label: "Fichier", requis: true, visibleSi: function (v) { return v.genre === "fichier"; } },
            { nom: "url", type: "texte", label: "Adresse du lien", requis: true, visibleSi: function (v) { return v.genre === "lien"; } },
            { nom: "titre", type: "texte", label: "Titre", requis: true, aide: "Ex. « Guide formateur – Mission 3 »" },
            { nom: "section", type: "texte", label: "Rubrique", valeur: "Supports de cours", requis: true, suggestions: sectionsConnues() }
          ],
          valider: function (v) {
            if (v.genre === "lien" && !/^https?:\/\//i.test(v.url)) throw new Error("L’adresse doit commencer par https://");
            if (v.genre === "fichier" && !v.fichier) throw new Error("Choisissez un fichier.");
            return ajouterDocument(v, jeu);
          }
        });
      }));
      z.appendChild(actions);
      var liste = el("div", "docs"); liste.appendChild(el("p", "aide", "Chargement des documents…"));
      z.appendChild(liste);
      chargerDocuments(jeu);
    }
    function chargerDocuments(jeu) {
      var liste = document.querySelector("#zone-formateur .docs");
      if (!liste) return;
      N.coffre().then(function (cf) { return N.lireManifeste(cf).then(function (m) { return { cf: cf, m: m }; }); }).then(function (r) {
        docsDuJeu = r.m.entrees.filter(function (e) { return duJeu(e, jeu); });
        liste.innerHTML = "";
        if (!docsDuJeu.length) { liste.appendChild(el("p", "aide", "Aucun document pour ce jeu.")); return; }
        var section = null, ul;
        docsDuJeu.forEach(function (e) {
          if (e.section !== section) { section = e.section; liste.appendChild(el("h3", null, section)); ul = el("ul"); liste.appendChild(ul); }
          var li = el("li"), info = el("span");
          info.appendChild(el("strong", null, e.libelle));
          info.appendChild(el("small", null, e.lien ? e.lien : e.nom + " · " + N.taille(e.taille)));
          var g = el("span", "gestes");
          if (e.lien) { var a = el("a", "btn", "Ouvrir"); a.href = e.lien; a.target = "_blank"; a.rel = "noopener"; g.appendChild(a); }
          else g.appendChild(bouton("Télécharger", "", function () {
            var b = this; b.disabled = true; b.textContent = "Préparation…";
            N.telechargerDocument(r.cf, e).then(function (blob) { N.telecharger(blob, e.nom); b.textContent = "Télécharger"; })
              .catch(function (err) { b.textContent = "Erreur"; alerte("Téléchargement impossible", err.message); }).then(function () { b.disabled = false; });
          }));
          g.appendChild(bouton("✎", "", function () { formDocument(e, jeu); }));
          g.appendChild(bouton("🗑", "danger", function () { supprimerDocument(e, jeu); }));
          li.appendChild(info); li.appendChild(g); ul.appendChild(li);
        });
      }).catch(function (err) { liste.innerHTML = ""; liste.appendChild(el("p", "aide", "Documents indisponibles : " + err.message)); });
    }
    function memeDoc(a, b) { return a.id ? a.id === b.id : a.lien === b.lien && a.libelle === b.libelle; }
    function formDocument(e, jeu) {
      N.formulaire({
        titre: "Modifier le document",
        champs: [
          { nom: "titre", type: "texte", label: "Titre", valeur: e.libelle, requis: true },
          { nom: "section", type: "texte", label: "Rubrique", valeur: e.section, requis: true, suggestions: sectionsConnues() },
          e.lien ? { nom: "url", type: "texte", label: "Adresse du lien", valeur: e.lien, requis: true } : { nom: "fichier", type: "fichier", label: "Remplacer le fichier" }
        ],
        valider: function (v) {
          var lecture = v.fichier ? lireOctets(v.fichier) : Promise.resolve(null);
          return lecture.then(function (o) {
            return N.modifierDocuments(function (entrees, cf) {
              var x = entrees.filter(function (y) { return memeDoc(y, e); })[0];
              if (!x) throw new Error("Ce document n’existe plus.");
              x.libelle = v.titre; x.section = v.section; x.jeuId = jeu.id;
              if (e.lien) { x.lien = v.url; return []; }
              if (!o) return [];
              x.nom = v.fichier.name; x.taille = o.length; x.type = v.fichier.type || x.type;
              return N.chiffrer(cf.documents, o).then(function (c) { return [{ chemin: "formateur/donnees/" + x.id + ".bin", octets: c }]; });
            }, "Document formateur modifié : " + v.titre);
          }).then(function () { chargerDocuments(jeu); return "Document mis à jour."; });
        }
      });
    }
    function supprimerDocument(e, jeu) {
      N.confirmer("Supprimer « " + e.libelle + " » ?", "Le document sera retiré de l’espace formateur.", "Supprimer", function () {
        return N.modifierDocuments(function (entrees) {
          var i = -1; entrees.forEach(function (y, k) { if (memeDoc(y, e)) i = k; });
          if (i < 0) return [];
          entrees.splice(i, 1);
          return e.id ? [{ chemin: "formateur/donnees/" + e.id + ".bin", supprimer: true }] : [];
        }, "Document formateur supprimé : " + e.libelle).then(function () { chargerDocuments(jeu); return "Document supprimé."; });
      });
    }

    rafraichir();
  }
})();
