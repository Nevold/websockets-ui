import { Player, WebSocketMessage } from './types';

export class PlayerManager {
  private players: Player[] = [];

  registerPlayer(name: string, password: string): WebSocketMessage {
    const existingPlayer = this.players.find((p) => p.name === name);

    if (existingPlayer) {
      if (existingPlayer.password === password) {
        const data = JSON.stringify({
          name: existingPlayer.name,
          index: existingPlayer.index,
          error: false,
          errorText: '',
        });

        return {
          type: 'reg',
          data,
          id: 0,
        };
      } else {
        const data = JSON.stringify({
          name,
          index: 0,
          error: true,
          errorText: 'Incorrect password',
        });

        return {
          type: 'reg',
          data,
          id: 0,
        };
      }
    }

    const newPlayer: Player = {
      name,
      password,
      wins: 0,
      index: crypto.randomUUID(),
      error: false,
      errorText: '',
    };
    this.players.push(newPlayer);

    const data = JSON.stringify({
      name: newPlayer.name,
      index: newPlayer.index,
      error: newPlayer.error,
      errorText: newPlayer.errorText,
    });

    return {
      type: 'reg',
      data,
      id: 0,
    };
  }

  getPlayer(index: number | string): Player | undefined {
    return this.players.find((p) => p.index === index);
  }

  incrementWin(index: number): void {
    const player = this.getPlayer(index);
    if (player) {
      player.wins++;
    }
  }

  getWinnersUpdate(): WebSocketMessage {
    const data = JSON.stringify(
      this.players
        .filter((p) => p.wins > 0)
        .map((p) => ({
          name: p.name,
          wins: p.wins,
        })),
    );

    return {
      type: 'update_winners',
      data,
      id: 0,
    };
  }
}
