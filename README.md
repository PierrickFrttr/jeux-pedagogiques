# Jeux pédagogiques – Pierrick Frottier

Jeux de rôle en équipe, découpés en missions.

```
index.html                  page d'accueil : un bloc par jeu (tableau JEUX en haut du fichier)
etude-de-marche/index.html  missions du jeu Studio Vigie (tableau JEUX en haut du fichier)
etude-de-marche/jeux/       fichiers des missions
supply-chain/index.html     missions du jeu Cellule NOMAD
supply-chain/jeux/          fichiers des missions
supply-chain/ressources/    documents publics pour les étudiants (lexique)
formateur/                  espace formateur chiffré (voir plus bas)
```

## Ajouter une mission à un jeu

**Le plus simple, depuis le site :** connectez-vous à l'Espace formateur, revenez sur la page du jeu (même onglet),
puis cliquez sur « Ajouter une mission » en bas de page. Le bouton fait les étapes 1 à 4 ci-dessous tout seul.
Il demande une fois une clé GitHub : sur github.com, *Settings → Developer settings → Fine-grained tokens →
Generate new token*, dépôt `jeux-pedagogiques` uniquement, permission *Contents : Read and write*.
Après un ajout depuis le site, faites `git pull` avant de modifier le projet sur l'ordinateur.

**À la main :**

1. **Déposez le fichier** dans le dossier `jeux/` du jeu (ex. `supply-chain/jeux/`).
   Nommez-le en minuscules, sans espaces ni accents : `mission-3-mon-titre.html`.

2. **Ajoutez une ligne** dans le tableau `JEUX`, en haut de l'`index.html` du jeu :

   ```js
   { titre: "Mission 3 · Mon titre", fichier: "jeux/mission-3-mon-titre.html", description: "Une phrase qui dit ce que fait la mission.", categorie: "Supply chain", emoji: "📦", couleur: "#1f9e8f" },
   ```

   Chaque ligne se termine par une virgule. Pour un document plutôt qu'un jeu, ajoutez `bouton: "Ouvrir"`.
   Pensez aussi à mettre à jour le nombre de missions dans l'`index.html` de la racine.

3. **Ajoutez le bouton retour** dans la mission : collez ces lignes juste avant `</body>`.

   Étude de marché (Studio Vigie) :
   ```html
   <style>.side{padding-top:2.8rem}@media (max-width:900px){.top{padding-top:2.4rem}}</style>
   <a href="../index.html" id="retour-hub" style="position:fixed;top:.4rem;left:.4rem;z-index:30;padding:.3rem .6rem;font:600 .8rem/1.2 system-ui,sans-serif;color:#ece8dc;background:rgba(29,41,47,.92);border:1px solid rgba(236,232,220,.35);border-radius:6px;text-decoration:none">&larr; Tous les jeux</a>
   ```

   Supply chain (Cellule NOMAD) :
   ```html
   <style>#sidebar{padding-top:2.8rem}</style>
   <a href="../index.html" id="retour-hub" style="position:fixed;top:.4rem;left:.4rem;z-index:1000;padding:.3rem .6rem;font:600 .8rem/1.2 system-ui,sans-serif;color:#ece8dc;background:rgba(20,33,61,.92);border:1px solid rgba(236,232,220,.35);border-radius:6px;text-decoration:none">&larr; Tous les jeux</a>
   ```

4. **Publiez** : `git add .` puis `git commit -m "Ajout mission 3"` puis `git push`.
   Le site se met à jour en une à deux minutes.

## Ajouter un nouveau jeu

Copiez le dossier `supply-chain/` sous un nouveau nom, remplacez ses missions et le tableau `JEUX` de son `index.html`,
puis ajoutez une ligne dans le tableau `JEUX` de l'`index.html` de la racine.

## Espace formateur (protégé par mot de passe)

Page `formateur/index.html` (lien « Espace formateur » en bas de l'accueil).
Les originaux sont dans `prive/` (jamais publié). Seule une version **chiffrée** est mise en ligne dans
`formateur/donnees/` : sans le mot de passe, ces fichiers sont illisibles, même en les téléchargeant depuis GitHub.

**Ajouter ou modifier un fichier :**

1. Déposez-le dans le bon sous-dossier de `prive/`, par exemple `prive/supply-chain/mission-3/`
   (minuscules, sans espaces ni accents). Pour un nouveau dossier, ajoutez son titre dans `SECTIONS`
   (et pour un nouveau jeu dans `JEUX`) en haut de `outils/chiffrer.mjs`. Un titre plus lisible
   pour le fichier peut être ajouté dans `TITRES`.
2. Dans Git Bash, depuis ce dossier :

   ```bash
   MDP_FORMATEUR='le-mot-de-passe' node outils/chiffrer.mjs
   git add formateur && git commit -m "Mise à jour espace formateur" && git push
   ```

**Changer le mot de passe :** relancez la même commande avec le nouveau mot de passe, puis publiez.
L'ancien ne fonctionne plus. Conservez le mot de passe dans un gestionnaire : il n'est enregistré nulle part
dans le projet, et s'il est perdu, il suffit de rechiffrer avec un nouveau.

## À ne pas publier en clair

Les corrigés et documents animateur (`*bonnes_reponses*`, `*.docx`, `*.pptx`, `*.json`) ne doivent jamais être
ajoutés ailleurs que dans `prive/` : le dépôt est public. Le fichier `.gitignore` les bloque par sécurité.
