// Bouton « Ajouter une mission » des pages de jeu : publie un fichier HTML de mission sur GitHub
// (dossier jeux/ du jeu + ligne dans le tableau JEUX + nombre de missions de l'accueil).
// Nécessite une clé GitHub (fine-grained token, dépôt jeux-pedagogiques, droit « Contents : Read and write »),
// saisie une fois et gardée dans ce navigateur uniquement.
(function(){
// Visible seulement après connexion à l'espace formateur dans cet onglet (simple masquage : publier exige la clé GitHub)
try { if (sessionStorage.getItem("formateur-connecte") !== "1") return; } catch(e){ return; }
var DEPOT = "PierrickFrttr/jeux-pedagogiques", BRANCHE = "main", CLE_STOCKAGE = "jeux-pedagogiques-cle-github";
var JEU = document.currentScript.getAttribute("data-jeu"); // dossier du jeu, ex. "supply-chain"
// Bouton retour collé avant </body> de chaque mission (voir README)
var RETOURS = {
  "etude-de-marche": '<style>.side{padding-top:2.8rem}@media (max-width:900px){.top{padding-top:2.4rem}}</style>\n<a href="../index.html" id="retour-hub" style="position:fixed;top:.4rem;left:.4rem;z-index:30;padding:.3rem .6rem;font:600 .8rem/1.2 system-ui,sans-serif;color:#ece8dc;background:rgba(29,41,47,.92);border:1px solid rgba(236,232,220,.35);border-radius:6px;text-decoration:none">&larr; Tous les jeux</a>\n',
  "supply-chain": '<style>#sidebar{padding-top:2.8rem}</style>\n<a href="../index.html" id="retour-hub" style="position:fixed;top:.4rem;left:.4rem;z-index:1000;padding:.3rem .6rem;font:600 .8rem/1.2 system-ui,sans-serif;color:#ece8dc;background:rgba(20,33,61,.92);border:1px solid rgba(236,232,220,.35);border-radius:6px;text-decoration:none">&larr; Tous les jeux</a>\n'
};

function lireCle(){ try { return localStorage.getItem(CLE_STOCKAGE) || ""; } catch(e){ return ""; } }
function garderCle(c){ try { c ? localStorage.setItem(CLE_STOCKAGE, c) : localStorage.removeItem(CLE_STOCKAGE); } catch(e){} }

function versBase64(texte){
  var o = new TextEncoder().encode(texte), s = "";
  for (var i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000));
  return btoa(s);
}
function depuisBase64(b64){
  return new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), function(c){ return c.charCodeAt(0); }));
}
function nomFichier(titre){
  return titre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".html";
}

function api(cle, chemin, options){
  options = options || {};
  options.headers = { "Authorization": "Bearer " + cle, "Accept": "application/vnd.github+json" };
  return fetch("https://api.github.com/repos/" + DEPOT + "/contents/" + chemin + (options.method ? "" : "?ref=" + BRANCHE), options)
    .then(function(r){
      if (r.status === 404 && !options.method) return null;
      if (r.status === 401) throw new Error("Clé GitHub refusée : vérifiez-la ou créez-en une nouvelle.");
      if (r.status === 403) throw new Error("Cette clé n'a pas le droit d'écrire dans le dépôt (Contents : Read and write).");
      if (!r.ok) throw new Error("GitHub a répondu " + r.status + " pour " + chemin + ".");
      return r.json();
    });
}
function lire(cle, chemin){
  return api(cle, chemin).then(function(f){ return f && { sha: f.sha, texte: depuisBase64(f.content) }; });
}
function ecrire(cle, chemin, texte, sha, message){
  return api(cle, chemin, { method: "PUT", body: JSON.stringify({ message: message, content: versBase64(texte), sha: sha, branch: BRANCHE }) });
}

// Ajoute la ligne de la mission après la dernière mission du tableau JEUX (donc avant les documents)
function ajouterLigne(index, ligne){
  var lignes = index.split("\n"), derniere = -1, fin = -1;
  for (var i = 0; i < lignes.length; i++) {
    if (/^\s*var JEUX = \[/.test(lignes[i])) { for (var k = i + 1; k < lignes.length; k++) { if (/^\s*\];/.test(lignes[k])) { fin = k; break; } if (/fichier: "jeux\//.test(lignes[k])) derniere = k; } break; }
  }
  if (fin < 0) throw new Error("Tableau JEUX introuvable dans " + JEU + "/index.html.");
  var pos = derniere >= 0 ? derniere + 1 : fin;
  if (pos === fin && pos > 0 && !/,\s*$/.test(lignes[pos - 1]) && !/\[\s*$/.test(lignes[pos - 1])) lignes[pos - 1] = lignes[pos - 1].replace(/\s*$/, ",");
  lignes.splice(pos, 0, "  " + ligne + (pos === fin ? "" : ","));
  return lignes.join("\n");
}

var css = document.createElement("style");
css.textContent =
  "#ajout-mission{max-width:560px;width:calc(100% - 2rem);border:1px solid var(--line);border-radius:14px;background:var(--card);color:var(--ink);padding:1.5rem}" +
  "#ajout-mission::backdrop{background:rgba(0,0,0,.5)}" +
  "#ajout-mission h2{margin:0 0 1rem;font-size:1.3rem}" +
  "#ajout-mission label{display:block;margin:.8rem 0 .3rem;font-weight:600}" +
  "#ajout-mission input,#ajout-mission textarea{width:100%;font:inherit;padding:.6rem .8rem;border:2px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink)}" +
  "#ajout-mission .ligne{display:flex;gap:1rem}#ajout-mission .ligne>div{flex:1}#ajout-mission input[type=color]{height:2.9rem;padding:.2rem}" +
  "#ajout-mission .aide{font-size:.9rem;color:var(--muted);margin:.3rem 0 0}" +
  "#ajout-mission .actions{display:flex;gap:.75rem;justify-content:flex-end;margin-top:1.4rem}" +
  "#ajout-mission button{font:inherit;padding:.7rem 1.2rem;border-radius:10px;border:2px solid var(--line);background:var(--card);color:var(--ink);cursor:pointer}" +
  "#ajout-mission button.principal{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700}" +
  "#ajout-mission .etat{margin:1rem 0 0;font-weight:600}#ajout-mission .etat:empty{display:none}" +
  ".pied button.ajouter{font:inherit;color:var(--ink);background:none;border:0;padding:.3rem 0;text-decoration:underline;text-underline-offset:3px;cursor:pointer}";
document.head.appendChild(css);

var n = JEUX.filter(function(j){ return j.fichier.indexOf("jeux/") === 0; }).length + 1;
var d = document.createElement("dialog");
d.id = "ajout-mission";
d.innerHTML =
  '<form method="dialog">' +
  '<h2>Ajouter une mission</h2>' +
  '<label for="am-fichier">Fichier HTML de la mission</label><input id="am-fichier" type="file" accept=".html,.htm" required>' +
  '<label for="am-titre">Titre</label><input id="am-titre" required value="Mission ' + n + ' · ">' +
  '<label for="am-description">Description (une phrase)</label><textarea id="am-description" rows="3" required></textarea>' +
  '<div class="ligne"><div><label for="am-emoji">Emoji</label><input id="am-emoji" value="🎯" maxlength="4"></div>' +
  '<div><label for="am-couleur">Couleur</label><input id="am-couleur" type="color" value="#1d4f63"></div></div>' +
  '<label for="am-cle">Clé GitHub</label><input id="am-cle" type="password" autocomplete="off" required>' +
  '<p class="aide">Gardée seulement dans ce navigateur. Laissez vide puis enregistrez pour l\'oublier.</p>' +
  '<p class="etat" id="am-etat" role="status"></p>' +
  '<div class="actions"><button type="button" id="am-fermer">Fermer</button><button type="submit" class="principal" id="am-publier">Publier la mission</button></div>' +
  '</form>';
document.body.appendChild(d);

var bouton = document.createElement("button");
bouton.type = "button"; bouton.className = "ajouter"; bouton.textContent = "Ajouter une mission";
document.querySelector(".pied").appendChild(bouton);
bouton.onclick = function(){ d.querySelector("#am-cle").value = lireCle(); d.querySelector("#am-etat").textContent = ""; d.showModal(); };
d.querySelector("#am-fermer").onclick = function(){ d.close(); };

d.querySelector("form").onsubmit = function(e){
  e.preventDefault();
  var etat = d.querySelector("#am-etat"), publier = d.querySelector("#am-publier");
  var cle = d.querySelector("#am-cle").value.trim(), fichier = d.querySelector("#am-fichier").files[0];
  var titre = d.querySelector("#am-titre").value.trim(), description = d.querySelector("#am-description").value.trim();
  var nom = nomFichier(titre), chemin = JEU + "/jeux/" + nom;
  if (!fichier || !/\.html?$/i.test(fichier.name)) { etat.textContent = "Choisissez un fichier .html."; return; }
  garderCle(cle);
  var ligne = "{ titre: " + JSON.stringify(titre) + ", fichier: " + JSON.stringify("jeux/" + nom) + ", description: " + JSON.stringify(description) +
    ", categorie: " + JSON.stringify(JEUX[0] ? JEUX[0].categorie : "") + ", emoji: " + JSON.stringify(d.querySelector("#am-emoji").value.trim() || "🎯") +
    ", couleur: " + JSON.stringify(d.querySelector("#am-couleur").value) + " }";
  publier.disabled = true;
  etat.textContent = "Envoi de la mission…";
  var message = "Ajout " + titre;
  fichier.text().then(function(html){
    if (html.indexOf("retour-hub") < 0 && RETOURS[JEU]) {
      var i = html.toLowerCase().lastIndexOf("</body>");
      html = i < 0 ? html + RETOURS[JEU] : html.slice(0, i) + RETOURS[JEU] + html.slice(i);
    }
    return Promise.all([lire(cle, chemin), lire(cle, JEU + "/index.html")]).then(function(r){
      var existant = r[0], index = r[1];
      var dejaListee = index.texte.indexOf('"jeux/' + nom + '"') >= 0;
      return ecrire(cle, chemin, html, existant && existant.sha, message).then(function(){
        if (dejaListee) return false;
        etat.textContent = "Ajout de la carte…";
        return ecrire(cle, JEU + "/index.html", ajouterLigne(index.texte, ligne), index.sha, message).then(function(){ return true; });
      });
    });
  }).then(function(nouvelle){
    if (!nouvelle) return false;
    etat.textContent = "Mise à jour de l'accueil…";
    return lire(cle, "index.html").then(function(accueil){
      var total = JEUX.filter(function(j){ return j.fichier.indexOf("jeux/") === 0; }).length + 1;
      var re = new RegExp('(dossier: "' + JEU + '/".*?missions: ")\\d+ missions?(")');
      var texte = accueil.texte.replace(re, function(t, avant, apres){ return avant + total + (total > 1 ? " missions" : " mission") + apres; });
      return texte === accueil.texte ? true : ecrire(cle, "index.html", texte, accueil.sha, message).then(function(){ return true; });
    });
  }).then(function(nouvelle){
    etat.textContent = nouvelle === false
      ? "Mission remplacée. Le site sera à jour dans 1 à 2 minutes."
      : "Mission publiée ! Elle apparaîtra sur le site dans 1 à 2 minutes.";
    d.querySelector("#am-fichier").value = "";
  }).catch(function(err){
    etat.textContent = "Échec : " + err.message;
  }).then(function(){ publier.disabled = false; });
};
})();
