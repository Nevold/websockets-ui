import { Ship } from './types';

export class GameLogic {
  static createEmptyBoard(): ('empty' | 'ship' | 'hit' | 'miss')[][] {
    return Array(10)
      .fill(null)
      .map(() => Array(10).fill('empty'));
  }

  static placeShipsOnBoard(ships: Ship[]): ('empty' | 'ship' | 'hit' | 'miss')[][] {
    const board = this.createEmptyBoard();

    for (const ship of ships) {
      const { x, y } = ship.position;
      if (ship.direction) {
        for (let i = 0; i < ship.length; i++) {
          board[y][x + i] = 'ship';
        }
      } else {
        for (let i = 0; i < ship.length; i++) {
          board[y + i][x] = 'ship';
        }
      }
    }

    return board;
  }

  static checkShipPlacement(ships: Ship[]): boolean {
    const board = this.createEmptyBoard();

    for (const ship of ships) {
      const { x, y } = ship.position;

      if (ship.direction) {
        if (x + ship.length > 10) return false;
        for (let i = 0; i < ship.length; i++) {
          if (board[y][x + i] === 'ship') return false;
        }
      } else {
        if (y + ship.length > 10) return false;
        for (let i = 0; i < ship.length; i++) {
          if (board[y + i][x] === 'ship') return false;
        }
      }

      if (ship.direction) {
        for (let i = 0; i < ship.length; i++) {
          board[y][x + i] = 'ship';
        }
      } else {
        for (let i = 0; i < ship.length; i++) {
          board[y + i][x] = 'ship';
        }
      }
    }

    return true;
  }

  static checkAttack(
    x: number,
    y: number,
    ships: Ship[],
    attacks: { x: number; y: number; status: 'miss' | 'shot' | 'killed' }[],
  ): 'miss' | 'shot' | 'killed' {
    if (attacks.some((a) => a.x === x && a.y === y)) {
      return 'miss';
    }

    for (const ship of ships) {
      const { position, direction, length } = ship;
      const shipCells: { x: number; y: number }[] = [];

      if (!direction) {
        for (let i = 0; i < length; i++) {
          shipCells.push({ x: position.x + i, y: position.y });
        }
      } else {
        for (let i = 0; i < length; i++) {
          shipCells.push({ x: position.x, y: position.y + i });
        }
      }

      if (shipCells.some((cell) => cell.x === x && cell.y === y)) {
        const allHit = shipCells.every(
          (cell) =>
            attacks.some((a) => a.x === cell.x && a.y === cell.y && a.status !== 'miss') ||
            (cell.x === x && cell.y === y),
        );

        return allHit ? 'killed' : 'shot';
      }
    }

    return 'miss';
  }

  static getSurroundingCells(x: number, y: number): { x: number; y: number }[] {
    const cells: { x: number; y: number }[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
          cells.push({ x: nx, y: ny });
        }
      }
    }
    return cells;
  }
}
