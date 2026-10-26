# Jeux pédagogiques – Pierrick Frottier

Jeux de rôle en équipe, découpés en missions, publiés sur GitHub Pages :
https://pierrickfrttr.github.io/jeux-pedagogiques/

## Trois rôles

| Rôle | Ce qu'il voit et fait |
|---|---|
| **Visiteur** (étudiant) | Les jeux, les missions et les ressources publiques. Aucune connexion. |
| **Formateur** | Les mêmes pages, avec en plus des boutons pour ajouter des jeux, des missions, des ressources publiques et des documents formateur (chiffrés). Il ne peut modifier, réordonner, masquer ou supprimer que ce qu'il a créé lui-même (cadenas « Créé par … » sur le reste). |
| **Admin** | Peut tout modifier, quel que soit l'auteur (y compris le titre de l'accueil et ce qui existait avant la règle des auteurs), plus la gestion des comptes : créer un accès, donner un nouveau mot de passe, supprimer un accès, remplacer la clé GitHub, révoquer toutes les sessions. |

Connexion : lien **« Espace formateur »** en bas de chaque page (`formateur/`).
Tant que vous êtes connecté, une barre jaune « Mode formateur » apparaît en haut et les boutons d'édition s'affichent.
Chaque modification est publiée sur GitHub et visible par tous **1 à 2 minutes** plus tard.

## Tout se gère depuis le site

- **Nouveau jeu** : accueil → « + Nouveau jeu ».
- **Nouvelle mission** : page du jeu → « + Mission » → choisir le fichier HTML. Le bouton « ← Tous les jeux » est ajouté automatiquement.
- **Ressource ou cours** : page du jeu → « + Ressource ou cours ». Fichier ou lien, au choix :
  - **publique** : une carte visible par les étudiants ;
  - **réservée aux formateurs** : chiffrée, dans la partie « Documents formateur » de la page du jeu.
- **Modifier, déplacer, supprimer** : petits boutons ↑ ↓ ✎ 🗑 sur chaque carte.
- **Comptes** (admin) : page « Espace formateur ».

## Organisation des fichiers

```
index.html                 accueil (affiché à partir de donnees/catalogue.js)
<jeu>/index.html           page d'un jeu (même gabarit pour tous les jeux)
404.html                   page de secours : affiche un jeu pas encore en ligne, ou « publication en cours »
<jeu>/jeux/                fichiers HTML des missions
<jeu>/ressources/          ressources publiques (PDF…)
donnees/catalogue.js       contenu du site : jeux, missions, ressources (modifié par l'espace formateur)
donnees/comptes.js         comptes, chiffrés (aucun mot de passe ni clé en clair)
formateur/                 connexion, mon compte, comptes ; documents formateur chiffrés dans formateur/donnees/
commun/                    styles et scripts communs (site.js = visiteurs ; admin.js, noyau.js, fenetre.js = mode formateur)
outils/serveur-test.mjs    serveur de test local qui imite GitHub
prive/                     originaux des documents formateur (jamais publié, ignoré par git)
```

## Sécurité, en bref

- `donnees/comptes.js` est public mais chiffré (AES-256-GCM, PBKDF2 600 000 itérations).
  Chaque compte y a une « enveloppe » que seul son mot de passe ouvre. Elle donne accès à la clé GitHub de publication
  et à la clé des documents formateur. D'où la règle : **mots de passe de 12 caractères minimum**.
- Pas de « mot de passe oublié » par email : l'admin génère un mot de passe provisoire.
- Les rôles sont appliqués par le site, pas par un serveur : réservez les accès à des formateurs de confiance.
  Après le départ d'un formateur : supprimez son accès, puis « Révoquer toutes les sessions » et remplacez la clé GitHub.
- La clé GitHub est un *fine-grained token* limité au dépôt `jeux-pedagogiques`, avec le droit « Contents : Read and write ».
  Quand elle expire, la publication affiche « clé refusée » : l'admin la remplace dans l'espace formateur.

## Modifier le code en local

Le site reçoit des enregistrements depuis le navigateur : faites toujours `git pull` avant de modifier en local.

Tester sans toucher au vrai site (copie du site + faux GitHub) :

```bash
node outils/serveur-test.mjs <dossier-copie-du-site> 8765 cle-de-test
```

Puis ouvrez http://127.0.0.1:8765/. Avec ce serveur, la « clé GitHub » est `cle-de-test`.
