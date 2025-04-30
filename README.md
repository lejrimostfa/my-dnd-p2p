

# My DnD Peer-to-Peer Dashboard

Cette application web (pure JS) permet à plusieurs joueurs de se connecter en P2P sans serveur ni base de données pour :

- Gérer des feuilles de personnage
- Discuter via un chat intégré
- Partager et annoter une carte interactive avec tokens synchronisés en temps réel

## Démo

<video controls width="640" height="360">
  <source src="DemoVideoDnDP2P.mp4" type="video/mp4">
  Votre navigateur ne supporte pas la balise vidéo.
</video>

## Fonctionnalités

- Chargement d’une carte (upload + synchronisation P2P avec découpage de données)
- Déplacement de tokens avec émissions toutes les secondes
- Sélection de la couleur du token pour chaque peer
- Chat temps réel
- Interface responsive (mobile/tablette/desktop) grâce à Tailwind CSS
- Architecture modulaire et événementielle (EventBus)

## Installation

1. Cloner le dépôt :
   ```bash
   git clone <url-du-repo>
   cd my-dnd-p2p
   ```
2. Lancer un serveur local (par exemple avec `npx serve` ou l’extension Live Server de VS Code) :
   ```bash
   npx serve .
   ```
3. Ouvrir l’url affichée (généralement `http://localhost:5000`) dans deux fenêtres/onglets pour tester la connexion P2P.

## Usage

1. Sélectionnez **Create Offer** dans la première fenêtre et cliquez sur **Connect P2P**.  
2. Copiez l’**OFFER** générée et collez-la dans la seconde fenêtre en mode **Join Offer**.  
3. Copiez l’**ANSWER** de la seconde fenêtre et collez-la dans la première.  
4. La pastille passe au vert lorsque le canal est ouvert.  
5. Testez le chat, le chargement de la carte et le déplacement des tokens.

---

*Développé avec ❤️ et WebRTC DataChannel*  