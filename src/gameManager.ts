import { Game, Ship, WebSocketMessage } from './types';
import { GameLogic } from './gameLogic';

export class GameManager {
  private games: Game[] = [];
  private nextGameId = 1;

  createGame(player1Index: number | string, player2Index: number | string): WebSocketMessage {
    const idGame = this.nextGameId++;
    this.games.push({
      idGame,
      players: {
        [player1Index]: {
          ships: [],
          attacks: [],
          board: GameLogic.createEmptyBoard(),
        },
        [player2Index]: {
          ships: [],
          attacks: [],
          board: GameLogic.createEmptyBoard(),
        },
      },
      currentPlayerIndex: player1Index,
      gameStatus: 'waiting',
    });

    return {
      type: 'create_game',
      data: JSON.stringify({
        idGame,
        idPlayer: player1Index,
      }),
      id: 0,
    };
  }

  addShips(gameId: number, playerIndex: number, ships: Ship[]): WebSocketMessage | null {
    const game = this.games.find((g) => g.idGame === gameId);
    if (!game || !game.players[playerIndex]) return null;
    if (ships.length > 0) {
      game.players[playerIndex].ships = ships.map((ship) => ({
        ...ship,
        hits: 0,
      }));

      return {
        type: 'start_game',
        data: JSON.stringify({
          ships: game?.players[playerIndex].ships,
          currentPlayerIndex: game?.currentPlayerIndex,
        }),
        id: 0,
      };
    }

    return null;
  }

  attack(gameId: number, playerIndex: string, x: number, y: number): WebSocketMessage[] {
    const NUMBER_OF_SHIPS = 10;

    const game = this.games.find((g) => g.idGame === gameId);
    if (!game) {
      return [];
    }

    const enemyIndex = Object.keys(game.players).find((index) => index !== playerIndex);

    if (!enemyIndex || playerIndex !== game.currentPlayerIndex) {
      return [];
    }

    const enemyShips = game.players[enemyIndex].ships;

    const attacks = game.players[playerIndex].attacks;

    const status = GameLogic.checkAttack(x, y, enemyShips, attacks);
    attacks.push({ x, y, status });

    const responses: WebSocketMessage[] = [
      {
        type: 'attack',
        data: JSON.stringify({
          position: { x, y },
          currentPlayer: playerIndex,
          status,
        }),
        id: 0,
      },
    ];

    if (status === 'killed') {
      const surroundingCells = GameLogic.getSurroundingCells(x, y);
      for (const cell of surroundingCells) {
        if (!attacks.some((a) => a.x === cell.x && a.y === cell.y)) {
          attacks.push({ x: cell.x, y: cell.y, status: 'miss' });
          responses.push({
            type: 'attack',
            data: JSON.stringify({
              position: { x: cell.x, y: cell.y },
              currentPlayer: playerIndex,
              status: 'miss',
            }),
            id: 0,
          });
        }
      }
    }

    const allShipsKilled = attacks.filter((attack) => attack.status === 'killed').length;

    if (allShipsKilled === NUMBER_OF_SHIPS) {
      game.gameStatus = 'finished';
      responses.push({
        type: 'finish',
        data: JSON.stringify({
          winPlayer: playerIndex,
        }),
        id: 0,
      });
    } else if (status === 'miss') {
      game.currentPlayerIndex = enemyIndex;
      responses.push({
        type: 'turn',
        data: JSON.stringify({
          currentPlayer: enemyIndex,
        }),
        id: 0,
      });
    } else {
      responses.push({
        type: 'turn',
        data: JSON.stringify({
          currentPlayer: playerIndex,
        }),
        id: 0,
      });
    }

    return responses;
  }

  randomAttack(gameId: number, playerIndex: string): WebSocketMessage[] {
    const game = this.games.find((g) => g.idGame === gameId);
    if (!game) {
      return [];
    }

    const enemyIndex = Object.keys(game.players).find((index) => index !== playerIndex);
    if (!enemyIndex || playerIndex !== game.currentPlayerIndex) {
      return [];
    }
    const attacks = game.players[playerIndex].attacks;

    const possibleCells: { x: number; y: number }[] = [];
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (!attacks.some((a) => a.x === x && a.y === y)) {
          possibleCells.push({ x, y });
        }
      }
    }

    if (possibleCells.length === 0) {
      return [];
    }
    const randomIndex = Math.floor(Math.random() * possibleCells.length);
    const { x, y } = possibleCells[randomIndex];

    return this.attack(gameId, playerIndex, x, y);
  }

  getGame(gameId: number): Game | undefined {
    return this.games.find((g) => g.idGame === gameId);
  }

  removeGame(gameId: number): void {
    this.games = this.games.filter((g) => g.idGame !== gameId);
  }
}
