import { GameMap } from './GameMap';
import { Tank } from './Tank';

export interface PowerUpItem {
  id: number;
  x: number;
  y: number;
  tipo: 'aceite' | 'botiquin' | 'escudo' | 'falla' | 'oruga' | 'sobrecarga';
  imagePath: string;
  imageElement?: HTMLImageElement;
  loaded: boolean;
}

export class ItemManager {
  public activeItems: PowerUpItem[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 300; // Cada ~5 segundos (a 60 fps)

  private possibleTypes: ('aceite' | 'botiquin' | 'escudo' | 'falla' | 'oruga' | 'sobrecarga')[] = [
    'aceite', 'botiquin', 'escudo', 'falla', 'oruga', 'sobrecarga'
  ];

  constructor() { }

  public update(gameMap: GameMap, canvasWidth: number, canvasHeight: number, playerTank: Tank, onCollect: (tipo: string) => void) {
    this.spawnTimer++;
    if (this.spawnTimer >= this.spawnInterval && this.activeItems.length < 5) {
      this.spawnTimer = 0;
      this.spawnRandomItem(gameMap, canvasWidth, canvasHeight);
    }

    // Comprobar colisión del tanque con las cajas
    const tankRadius = 35;
    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      const item = this.activeItems[i];
      const dist = Math.hypot(playerTank.x - item.x, playerTank.y - item.y);

      if (dist < tankRadius + 25) {
        onCollect(item.tipo); // Notifica al componente el power-up/nerf recolectado
        this.activeItems.splice(i, 1); // Desaparecer caja al instante
      }
    }
  }

  private spawnRandomItem(gameMap: GameMap, canvasWidth: number, canvasHeight: number) {
    const matriz = gameMap.currentMap.matrizColisiones;
    const rows = matriz.length;
    const cols = matriz[0].length;
    const tileW = canvasWidth / cols;
    const tileH = canvasHeight / rows;

    const emptyCells: { r: number, c: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (matriz[r][c] === 0) {
          emptyCells.push({ r, c });
        }
      }
    }

    if (emptyCells.length === 0) return;

    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const posX = (randomCell.c + 0.5) * tileW;
    const posY = (randomCell.r + 0.5) * tileH;

    const randomType = this.possibleTypes[Math.floor(Math.random() * this.possibleTypes.length)];
    const imagePaths: Record<string, string> = {
      botiquin: 'assets/imgs/powers/botiquin.png',
      sobrecarga: 'assets/imgs/powers/sobrecarga.png',
      escudo: 'assets/imgs/powers/escudo.png',
      aceite: 'assets/imgs/powers/aceite.png',
      oruga: 'assets/imgs/powers/oruga.png',
      falla: 'assets/imgs/powers/falla.png'
    };
    const imagePath = imagePaths[randomType] ?? 'assets/imgs/powers/botiquin.png';

    const img = new Image();
    img.src = imagePath;

    const newItem: PowerUpItem = {
      id: Date.now() + Math.random(),
      x: posX,
      y: posY,
      tipo: randomType,
      imagePath: imagePath,
      imageElement: img,
      loaded: false
    };

    img.onload = () => { newItem.loaded = true; };
    img.onerror = () => { newItem.loaded = false; newItem.imageElement = undefined; };

    this.activeItems.push(newItem);
  }

  public draw(ctx: CanvasRenderingContext2D) {
    this.activeItems.forEach(item => {
      ctx.save();
      ctx.translate(item.x, item.y);

      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 18;

      const itemSize = 64;

      if (item.loaded && item.imageElement) {
        ctx.drawImage(item.imageElement, -itemSize / 2, -itemSize / 2, itemSize, itemSize);
      } else {
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(-itemSize / 2, -itemSize / 2, itemSize, itemSize);
      }

      ctx.restore();
    });
  }
}
