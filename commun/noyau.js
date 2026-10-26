// Cœur de l'espace formateur : chiffrement, comptes, session et publication sur GitHub.
// Aucun secret dans ce fichier. donnees/comptes.js contient, pour chaque compte, une « enveloppe »
// (clé maîtresse chiffrée par le mot de passe du compte) ; la clé maîtresse ouvre le « coffre »
// qui contient la clé GitHub de publication et la clé des documents formateur.
(function () {
  var DEPOT = "PierrickFrttr/jeux-pedagogiques", BRANCHE = "main", ITERATIONS = 600000;
  var BASE = window.SITE ? window.SITE.BASE : document.currentScript.src.replace(/commun\/noyau\.js(\?.*)?$/, "");
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var API = LOCAL ? location.origin + "/_api" : "https://api.github.com"; // en local : faux GitHub de outils/serveur-test.mjs

  // ---------- Outils ----------
  function octets(texte) { return new TextEncoder().encode(texte); }
  function texte(o) { return new TextDecoder().decode(o); }
  function versB64(o) {
    var s = "";
    for (var i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function depuisB64(b) { return Uint8Array.from(atob(b), function (c) { return c.charCodeAt(0); }); }
  function aleatoire(n) { return crypto.getRandomValues(new Uint8Array(n)); }
  function concat(a, b) { var r = new Uint8Array(a.length + b.length); r.set(a); r.set(b, a.length); return r; }
  function slug(t) {
    return (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "sans-titre";
  }
  function mdpProvisoire() {
    var a = "abcdefghjkmnpqrstuvwxyz23456789", r = aleatoire(16), s = "";
    for (var i = 0; i < 16; i++) s += a[r[i] % a.length] + (i % 4 === 3 && i < 15 ? "-" : "");
    return s;
  }

  // ---------- Chiffrement (AES-256-GCM ; clé dérivée du mot de passe par PBKDF2-SHA256) ----------
  function deriver(mdp, sel) {
    return crypto.subtle.importKey("raw", octets(mdp), "PBKDF2", false, ["deriveKey"]).then(function (base) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: sel, iterations: ITERATIONS, hash: "SHA-256" },
        base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    });
  }
  function deriverBrut(mdp, sel) { // 32 octets bruts (sert à reprendre l'ancien mot de passe des documents)
    return crypto.subtle.importKey("raw", octets(mdp), "PBKDF2", false, ["deriveBits"]).then(function (base) {
      return crypto.subtle.deriveBits({ name: "PBKDF2", salt: sel, iterations: ITERATIONS, hash: "SHA-256" }, base, 256);
    }).then(function (b) { return new Uint8Array(b); });
  }
  function cleBrute(o) { return crypto.subtle.importKey("raw", o, "AES-GCM", false, ["encrypt", "decrypt"]); }
  function chiffrer(cle, o) { // → IV (12 octets) + contenu chiffré + étiquette
    var iv = aleatoire(12);
    return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, cle, o).then(function (c) { return concat(iv, new Uint8Array(c)); });
  }
  function dechiffrer(cle, o) {
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: o.slice(0, 12) }, cle, o.slice(12)).then(function (c) { return new Uint8Array(c); });
  }

  // ---------- Fichiers de données (window.X = {...};) ----------
  function lireDonnees(t, nom) { return JSON.parse(t.replace(new RegExp("^\\s*window\\." + nom + "\\s*=\\s*"), "").replace(/;\s*$/, "")); }
  function ecrireDonnees(nom, obj) { return "window." + nom + " = " + JSON.stringify(obj, null, 2) + ";\n"; }
  function versionLocale(cleStockage, publiee) {
    try { var l = JSON.parse(sessionStorage.getItem(cleStockage) || "null"); if (l && (!publiee || l.version > publiee.version)) return l; } catch (e) {}
    return publiee;
  }
  function comptes() { return versionLocale("jp-comptes", window.COMPTES); }

  // ---------- Session ----------
  function session() {
    try { return JSON.parse(sessionStorage.getItem("jp-session") || localStorage.getItem("jp-session") || "null"); } catch (e) { return null; }
  }
  function garderSession(s, rester) {
    try {
      sessionStorage.setItem("jp-session", JSON.stringify(s));
      if (rester) localStorage.setItem("jp-session", JSON.stringify(s));
      else if (localStorage.getItem("jp-session")) localStorage.setItem("jp-session", JSON.stringify(s));
    } catch (e) {}
  }
  function deconnecter() {
    try { ["jp-session", "jp-catalogue", "jp-comptes"].forEach(function (k) { sessionStorage.removeItem(k); localStorage.removeItem(k); }); } catch (e) {}
  }
  function trouver(c, id) { return (c && c.comptes || []).filter(function (x) { return x.id.toLowerCase() === (id || "").trim().toLowerCase(); })[0]; }

  function ouvrirEnveloppe(compte, mdp) {
    return deriver(mdp, depuisB64(compte.sel)).then(function (k) { return dechiffrer(k, depuisB64(compte.enveloppe)); })
      .catch(function () { throw new Error("Identifiant ou mot de passe incorrect."); });
  }
  function fermerEnveloppe(ms, mdp) {
    var sel = aleatoire(16);
    return deriver(mdp, sel).then(function (k) { return chiffrer(k, ms); })
      .then(function (env) { return { sel: versB64(sel), enveloppe: versB64(env) }; });
  }
  function connecter(id, mdp, rester) {
    var c = comptes(), compte = trouver(c, id);
    if (!compte) return Promise.reject(new Error("Identifiant ou mot de passe incorrect."));
    return ouvrirEnveloppe(compte, mdp).then(function (ms) {
      var s = { id: compte.id, role: compte.role, ms: versB64(ms) };
      garderSession(s, rester);
      return { id: compte.id, role: compte.role, provisoire: !!compte.provisoire };
    });
  }
  var coffreOuvert = null;
  function coffre() { // { github: "clé", documents: CryptoKey, ms: Uint8Array }
    if (coffreOuvert) return coffreOuvert;
    var s = session(), c = comptes();
    if (!s || !c) return Promise.reject(new Error("Session expirée : reconnectez-vous."));
    var ms = depuisB64(s.ms);
    coffreOuvert = cleBrute(ms).then(function (k) { return dechiffrer(k, depuisB64(c.coffre)); }).then(function (o) {
      var v = JSON.parse(texte(o));
      return cleBrute(depuisB64(v.documents)).then(function (kd) { return { github: v.github, documents: kd, documentsBrut: v.documents, ms: ms }; });
    }).catch(function (e) { coffreOuvert = null; throw new Error("Session expirée ou compte supprimé : reconnectez-vous."); });
    return coffreOuvert;
  }
  function fermerCoffre(ms, github, documentsB64) {
    return cleBrute(ms).then(function (k) { return chiffrer(k, octets(JSON.stringify({ github: github, documents: documentsB64 }))); })
      .then(versB64);
  }

  // ---------- GitHub ----------
  function appel(cle, chemin, options) {
    options = options || {};
    var h = { "Authorization": "Bearer " + cle, "Accept": options.brut ? "application/vnd.github.raw" : "application/vnd.github+json" };
    var init = { method: options.method || "GET", headers: h, cache: "no-store" };
    if (options.corps) { init.body = JSON.stringify(options.corps); h["Content-Type"] = "application/json"; }
    return fetch(API + "/repos/" + DEPOT + chemin, init).then(function (r) {
      if (r.status === 404 && options.absentOk) return null;
      if (r.status === 401) throw new Error("La clé GitHub est refusée (expirée ?). L’admin doit la remplacer dans l’espace formateur.");
      if (r.status === 403) throw new Error("La clé GitHub n’a pas le droit d’écrire dans le dépôt.");
      if (r.status === 409 || r.status === 422) { var e = new Error("conflit"); e.conflit = true; throw e; }
      if (!r.ok) throw new Error("GitHub a répondu " + r.status + ".");
      return options.brut ? r.arrayBuffer().then(function (b) { return new Uint8Array(b); }) : r.json();
    });
  }
  function lire(cle, chemin) { // contenu actuel d'un fichier du dépôt (ou null s'il n'existe pas)
    return appel(cle, "/contents/" + chemin.split("/").map(encodeURIComponent).join("/") + "?ref=" + BRANCHE, { brut: true, absentOk: true });
  }
  function lister(cle, prefixe) { // chemins de tous les fichiers sous un dossier
    return appel(cle, "/git/ref/heads/" + BRANCHE).then(function (ref) { return appel(cle, "/git/trees/" + ref.object.sha + "?recursive=1"); })
      .then(function (t) { return t.tree.filter(function (x) { return x.type === "blob" && x.path.indexOf(prefixe) === 0; }).map(function (x) { return x.path; }); });
  }
  // Publie plusieurs fichiers en un seul enregistrement. changements : [{ chemin, texte | octets | supprimer: true }]
  function envoyer(cle, changements, message) {
    var parent;
    return appel(cle, "/git/ref/heads/" + BRANCHE).then(function (ref) {
      parent = ref.object.sha;
      return appel(cle, "/git/commits/" + parent);
    }).then(function (commit) {
      return Promise.all(changements.map(function (c) {
        if (c.supprimer) return Promise.resolve({ path: c.chemin, mode: "100644", type: "blob", sha: null });
        var o = c.octets || octets(c.texte);
        return appel(cle, "/git/blobs", { method: "POST", corps: { content: versB64(o), encoding: "base64" } })
          .then(function (b) { return { path: c.chemin, mode: "100644", type: "blob", sha: b.sha }; });
      })).then(function (arbre) {
        return appel(cle, "/git/trees", { method: "POST", corps: { base_tree: commit.tree.sha, tree: arbre } });
      });
    }).then(function (t) {
      return appel(cle, "/git/commits", { method: "POST", corps: { message: message, tree: t.sha, parents: [parent] } });
    }).then(function (c) {
      return appel(cle, "/git/refs/heads/" + BRANCHE, { method: "PATCH", corps: { sha: c.sha } });
    });
  }
  // Relit les fichiers à jour, applique la modification et publie (réessaie si quelqu'un a publié entre-temps)
  function publier(preparer, message) {
    return coffre().then(function (cf) {
      var essai = function (n) {
        return preparer(cf).then(function (changements) {
          if (!changements || !changements.length) return null;
          return envoyer(cf.github, changements, message + "\n\nPublié depuis le site par " + session().id).then(function () { return changements; });
        }).catch(function (e) { if (e.conflit && n < 3) return essai(n + 1); throw e; });
      };
      return essai(1);
    });
  }

  // ---------- Catalogue (donnees/catalogue.js) ----------
  function catalogueActuel() { return versionLocale("jp-catalogue", window.CATALOGUE); }
  function modifierCatalogue(modifier, message, autres) { // modifier(catalogue) peut renvoyer des changements de fichiers en plus
    var nouveau;
    return publier(function (cf) {
      return lire(cf.github, "donnees/catalogue.js").then(function (o) {
        var cat = lireDonnees(texte(o), "CATALOGUE");
        return Promise.resolve(modifier(cat, cf)).then(function (extra) {
          cat.version = Math.max(cat.version || 0, (catalogueActuel() || {}).version || 0) + 1;
          nouveau = cat;
          return [{ chemin: "donnees/catalogue.js", texte: ecrireDonnees("CATALOGUE", cat) }].concat(extra || [], autres || []);
        });
      });
    }, message).then(function (r) {
      try { sessionStorage.setItem("jp-catalogue", JSON.stringify(nouveau)); } catch (e) {}
      return r;
    });
  }

  // ---------- Comptes (donnees/comptes.js) ----------
  function modifierComptes(modifier, message) {
    var nouveau;
    return publier(function (cf) {
      return lire(cf.github, "donnees/comptes.js").then(function (o) {
        var c = lireDonnees(texte(o), "COMPTES");
        return Promise.resolve(modifier(c, cf)).then(function () {
          c.version = Math.max(c.version || 0, (comptes() || {}).version || 0) + 1;
          nouveau = c;
          return [{ chemin: "donnees/comptes.js", texte: ecrireDonnees("COMPTES", c) }];
        });
      });
    }, message).then(function () {
      try { sessionStorage.setItem("jp-comptes", JSON.stringify(nouveau)); } catch (e) {}
      coffreOuvert = null;
    });
  }

  // ---------- Documents formateur (formateur/donnees/, chiffrés) ----------
  var MANIFESTE = "formateur/donnees/manifeste.bin";
  function lireManifeste(cf) { // → { sel, entrees }  (le sel en tête du fichier est conservé tel quel)
    return lire(cf.github, MANIFESTE).then(function (o) {
      if (!o) return { sel: aleatoire(16), entrees: [] };
      return dechiffrer(cf.documents, o.slice(16)).then(function (c) { return { sel: o.slice(0, 16), entrees: JSON.parse(texte(c)) }; });
    });
  }
  function ecrireManifeste(cf, m) {
    return chiffrer(cf.documents, octets(JSON.stringify(m.entrees))).then(function (c) { return { chemin: MANIFESTE, octets: concat(m.sel, c) }; });
  }
  function modifierDocuments(modifier, message) { // modifier(entrees, cf) renvoie des changements de fichiers en plus
    return publier(function (cf) {
      return lireManifeste(cf).then(function (m) {
        return Promise.resolve(modifier(m.entrees, cf)).then(function (extra) {
          return ecrireManifeste(cf, m).then(function (ch) { return [ch].concat(extra || []); });
        });
      });
    }, message);
  }
  function telechargerDocument(cf, entree) { // → Blob déchiffré
    return lire(cf.github, "formateur/donnees/" + entree.id + ".bin").then(function (o) {
      if (!o) throw new Error("Fichier introuvable.");
      return dechiffrer(cf.documents, o);
    }).then(function (c) { return new Blob([c], { type: entree.type || "application/octet-stream" }); });
  }

  window.NOYAU = {
    DEPOT: DEPOT, BASE: BASE, LOCAL: LOCAL,
    octets: octets, texte: texte, versB64: versB64, depuisB64: depuisB64, aleatoire: aleatoire, slug: slug, mdpProvisoire: mdpProvisoire,
    deriver: deriver, deriverBrut: deriverBrut, cleBrute: cleBrute, chiffrer: chiffrer, dechiffrer: dechiffrer,
    lireDonnees: lireDonnees, ecrireDonnees: ecrireDonnees,
    session: session, garderSession: garderSession, deconnecter: deconnecter, comptes: comptes, trouver: trouver, connecter: connecter,
    ouvrirEnveloppe: ouvrirEnveloppe, fermerEnveloppe: fermerEnveloppe, coffre: coffre, fermerCoffre: fermerCoffre,
    appel: appel, lire: lire, lister: lister, envoyer: envoyer, publier: publier,
    catalogueActuel: catalogueActuel, modifierCatalogue: modifierCatalogue, modifierComptes: modifierComptes,
    lireManifeste: lireManifeste, modifierDocuments: modifierDocuments, telechargerDocument: telechargerDocument,
    oublierCoffre: function () { coffreOuvert = null; }
  };
})();
