# T.N.Thune

Machine à sous de simulation qui se joue dans le navigateur. Tout se joue en argent fictif : aucun paiement, aucun gain réel.

**[Jouer](https://leo478930.github.io/tnthune/)**

## Le jeu

- 5 rouleaux, 3 rangées, 20 lignes. Mises de 0,20 € à 100 €, solde de départ de 2 000 € fictifs.
- Bonus : Déflagration, Roue à 3 niveaux, Free spins à multiplicateur, Hold & Blast.
- 5 jackpots, du Mini au Super, et un gain maximum de 25 000× la mise.
- 6 bonus à acheter, de 50× à 430× la mise.
- Mode auto avec limites d'arrêt, turbo, quitte ou double.

Pour voir les plus grosses animations sans attendre : bouton **i**, onglet **Réglages**, « Voir les animations ». Le solde n'est pas touché.

## Les chiffres

Mesurés sur 60 millions de spins. Le détail est dans [`sim-final.txt`](sim-final.txt).

| | |
|---|---|
| Retour au joueur (RTP) | 96,11 % |
| Spins gagnants | 1 sur 3,5 |
| Roue | 1 spin sur 292 |
| Hold & Blast | 1 spin sur 355 |
| Mini Jackpot | 1 spin sur 877 |
| Super Jackpot | 1 spin sur 2,9 millions |

## Ce qui reste à vérifier

- Le son : il n'a été contrôlé que par mesure, jamais à l'oreille.
- Un vrai téléphone : l'affichage n'a été testé qu'en format simulé.
- Le ressenti en temps réel des animations et du rythme.

Les remarques vont dans l'onglet [Issues](https://github.com/Leo478930/tnthune/issues).

## Le code

Aucune dépendance à installer : JavaScript, Canvas et WebAudio, avec tous les graphismes et les sons générés par le code. Seules les polices viennent de Google Fonts.

| Fichier | Rôle |
|---|---|
| `src/engine.js` | Les maths : tirages, gains, bonus, jackpots. Aucun affichage. |
| `src/game.js` | Déroulement des parties et interface. |
| `src/art.js` | Dessin des symboles, de la roue et du décor. |
| `src/fx.js` | Particules et animations de gros gains. |
| `src/audio.js` | Musique et effets sonores. |
| `src/index.html`, `src/style.css` | Structure et style de la page. |
| `build.js` | Assemble `src/` en un seul fichier : `node build.js`. |
| `sim.js` | Simulation des stats : `node sim.js [spins] [parties par bonus]`. |

`index.html` est généré par `build.js` : il faut modifier `src/`, pas ce fichier.
