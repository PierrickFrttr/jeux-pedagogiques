// Fenêtres de saisie et de confirmation utilisées par l'espace formateur.
(function () {
  var N = window.NOYAU;

  // champs : [{ nom, type: texte|zone|mdp|emoji|couleur|fichier|choix|case|liste|info, label, aide, valeur, requis, options:[[valeur, libellé]], accept, suggestions:[], visibleSi(valeurs) }]
  // valider(valeurs, etat) : Promise ; renvoie un message de réussite (ou { message, garderOuvert })
  N.formulaire = function (o) {
    var d = document.createElement("dialog");
    d.className = "fenetre";
    var f = document.createElement("form");
    var h = document.createElement("h2"); h.textContent = o.titre; f.appendChild(h);
    if (o.intro) { var p = document.createElement("p"); p.className = "aide"; p.textContent = o.intro; f.appendChild(p); }
    var blocs = [], conteneur = f, duo = null;
    o.champs.forEach(function (c, i) {
      var id = "f" + Math.random().toString(36).slice(2) + i;
      var b = document.createElement("div"); b.className = "champ";
      if (c.type === "info") { b.innerHTML = ""; var t = document.createElement("p"); t.className = "aide"; t.textContent = c.label; b.appendChild(t); }
      else if (c.type === "choix") {
        var et = document.createElement("span"); et.className = "etiquette"; et.textContent = c.label; b.appendChild(et);
        var ch = document.createElement("div"); ch.className = "choix"; ch.setAttribute("role", "radiogroup");
        c.options.forEach(function (op) {
          var l = document.createElement("label"), r = document.createElement("input");
          r.type = "radio"; r.name = id; r.value = op[0]; r.checked = op[0] === c.valeur;
          l.appendChild(r); l.appendChild(document.createTextNode(op[1])); ch.appendChild(l);
        });
        b.appendChild(ch);
      } else if (c.type === "case") {
        var l2 = document.createElement("label"), cb = document.createElement("input");
        l2.className = "case"; cb.type = "checkbox"; cb.id = id; cb.checked = !!c.valeur;
        l2.appendChild(cb); l2.appendChild(document.createTextNode(" " + c.label)); b.appendChild(l2);
      } else {
        var lab = document.createElement("label"); lab.htmlFor = id; lab.textContent = c.label + (c.requis ? "" : " (facultatif)"); b.appendChild(lab);
        var e;
        if (c.type === "zone") { e = document.createElement("textarea"); e.rows = c.lignes || 3; }
        else if (c.type === "liste") { e = document.createElement("select"); c.options.forEach(function (op) { var x = document.createElement("option"); x.value = op[0]; x.textContent = op[1]; e.appendChild(x); }); }
        else {
          e = document.createElement("input");
          e.type = { mdp: "password", couleur: "color", fichier: "file" }[c.type] || "text";
          if (c.type === "fichier" && c.accept) e.accept = c.accept;
          if (c.type === "emoji") e.maxLength = 8;
          if (c.type === "mdp") e.autocomplete = "new-password";
          if (c.suggestions) {
            var dl = document.createElement("datalist"); dl.id = id + "l";
            c.suggestions.forEach(function (s) { var x = document.createElement("option"); x.value = s; dl.appendChild(x); });
            b.appendChild(dl); e.setAttribute("list", dl.id);
          }
        }
        e.id = id;
        if (c.valeur != null && c.type !== "fichier") e.value = c.valeur;
        if (c.requis) e.required = true;
        b.appendChild(e);
      }
      if (c.aide) { var a = document.createElement("p"); a.className = "aide"; a.textContent = c.aide; b.appendChild(a); }
      if (c.cote) { if (!duo) { duo = document.createElement("div"); duo.className = "duo"; f.appendChild(duo); } duo.appendChild(b); }
      else { duo = null; f.appendChild(b); }
      blocs.push({ c: c, b: b, id: id });
    });
    var etat = document.createElement("p"); etat.className = "etat"; etat.setAttribute("role", "status"); f.appendChild(etat);
    var pied = document.createElement("div"); pied.className = "pied-fenetre";
    var annuler = document.createElement("button"); annuler.type = "button"; annuler.className = "btn"; annuler.textContent = "Fermer";
    var ok = document.createElement("button"); ok.type = "submit"; ok.className = "btn " + (o.danger ? "danger" : "principal"); ok.textContent = o.bouton || "Enregistrer";
    pied.appendChild(annuler); pied.appendChild(ok); f.appendChild(pied);
    d.appendChild(f); document.body.appendChild(d);

    function valeurs() {
      var v = {};
      blocs.forEach(function (x) {
        var c = x.c;
        if (c.type === "info") return;
        if (c.type === "choix") { var r = x.b.querySelector("input:checked"); v[c.nom] = r ? r.value : ""; }
        else if (c.type === "case") v[c.nom] = x.b.querySelector("input").checked;
        else if (c.type === "fichier") v[c.nom] = x.b.querySelector("input").files[0] || null;
        else v[c.nom] = x.b.querySelector("#" + x.id).value.trim();
      });
      return v;
    }
    function maj() {
      var v = valeurs();
      blocs.forEach(function (x) {
        var vis = !x.c.visibleSi || x.c.visibleSi(v);
        x.b.hidden = !vis;
        x.b.querySelectorAll("input,textarea,select").forEach(function (e) { e.disabled = !vis; });
      });
    }
    f.addEventListener("change", maj); f.addEventListener("input", maj); maj();
    annuler.onclick = function () { d.close(); };
    d.addEventListener("close", function () { d.remove(); if (o.apresFermeture) o.apresFermeture(); });
    f.onsubmit = function (e) {
      e.preventDefault();
      var v = valeurs();
      etat.className = "etat"; etat.textContent = o.attente || "Publication en cours…"; ok.disabled = true;
      Promise.resolve().then(function () { return o.valider(v, etat); }).then(function (r) {
        var msg = r && r.message != null ? r.message : r;
        etat.className = "etat ok"; etat.textContent = msg || "C’est fait.";
        if (r && r.garderOuvert) { ok.hidden = true; annuler.textContent = "Fermer"; return; }
        setTimeout(function () { if (d.open) d.close(); }, 1400);
      }).catch(function (err) {
        etat.className = "etat err"; etat.textContent = err.message || String(err); ok.disabled = false;
      });
    };
    d.showModal();
    return d;
  };

  N.confirmer = function (titre, message, bouton, agir) {
    return N.formulaire({ titre: titre, intro: message, champs: [], bouton: bouton || "Supprimer", danger: true, attente: "Suppression en cours…", valider: agir });
  };

  N.taille = function (n) { return n > 1e6 ? (n / 1e6).toFixed(1).replace(".", ",") + " Mo" : Math.max(1, Math.ceil(n / 1e3)) + " ko"; };
  N.telecharger = function (blob, nom) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = nom;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
  };
})();
