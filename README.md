

# My DnD Peer-to-Peer Dashboard

[![Launch App](./index.html)](./index.html)

Cette application web (pure JS) permet à plusieurs joueurs de se connecter en P2P sans serveur ni base de données pour :

- Gérer des feuilles de personnage
- Discuter via un chat intégré
- Partager et annoter une carte interactive avec tokens synchronisés en temps réel

## Démo

[![Demo Video](https://img.youtube.com/vi/yLxos6WJ4L0/0.jpg)](https://youtu.be/yLxos6WJ4L0)

*Cliquez sur l’image pour lancer la démo sur YouTube.*

## Fonctionnalités

- Chargement d’une carte (upload + synchronisation P2P avec découpage de données)
- Déplacement de tokens avec émissions toutes les secondes
- Sélection de la couleur du token pour chaque peer
- Chat temps réel
- Interface responsive (mobile/tablette/desktop) grâce à Tailwind CSS
- Architecture modulaire et événementielle (EventBus)

## Installation

1. Clonez le dépôt :
   ```bash
   git clone <url-du-repo>
   cd my-dnd-p2p
   ```
2. Servez le contenu statique (par exemple avec `npx serve .` ou Live Server de VS Code) :
   ```bash
   npx serve .
   ```
3. Ouvrez l’URL locale dans votre navigateur.

> **PeerJS est chargé via CDN** : aucune dépendance npm n’est requise.

## Usage

1. Ouvrez l’application dans deux fenêtres ou onglets.
2. Dans chaque fenêtre, cliquez sur **Copier ID** pour copier votre Peer ID.
3. Dans l’autre fenêtre, cliquez sur **Coller ID**, puis sur **Connecter**.
4. Lorsque la pastille devient verte, la connexion P2P est établie.
5. Testez le chat, l’upload de cartes et le déplacement des tokens.

---

*Développé avec ❤️ et WebRTC DataChannel*  