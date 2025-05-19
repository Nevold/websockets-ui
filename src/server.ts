import WebSocket, { WebSocketServer } from 'ws';
import { PlayerManager } from './playerManager';
import { RoomManager } from './roomManager';
import { GameManager } from './gameManager';
import { Player, WebSocketMessage } from './types';

export class BattleshipServer {
  private wss: WebSocketServer;
  private playerManager: PlayerManager;
  private roomManager: RoomManager;
  private gameManager: GameManager;
  private connections: Map<number | string, WebSocket>;
  private currentUserIndex: string | number;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.playerManager = new PlayerManager();
    this.roomManager = new RoomManager();
    this.gameManager = new GameManager();
    this.connections = new Map();
    this.currentUserIndex = '';

    console.log(`WebSocket server started on the ${port} port!`);

    this.wss.on('connection', (ws) => {
      console.log(`[${new Date().toLocaleTimeString()}] New WebSocket client connected`);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        for (const [index, connection] of this.connections.entries()) {
          if (connection === ws) {
            this.connections.delete(index);
            this.roomManager.removePlayerFromRooms(index);
            break;
          }
        }
      });
    });
  }

  private handleMessage(ws: WebSocket, message: WebSocketMessage) {
    console.log('Received message:', message);

    switch (message.type) {
      case 'reg':
        this.handleRegistration(ws, message.data);
        break;
      case 'create_room':
        this.handleCreateRoom(ws);
        break;
      case 'add_user_to_room':
        this.handleAddUserToRoom(ws, message.data);
        break;
      case 'add_ships':
        this.handleAddShips(ws, message.data);
        break;
      case 'attack':
        this.handleAttack(ws, message.data);
        break;
      case 'randomAttack':
        this.handleRandomAttack(ws, message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private handleRegistration(ws: WebSocket, data: string) {
    const { name, password } = JSON.parse(data);

    const response = this.playerManager.registerPlayer(name, password);

    if (!response.data.error) {
      this.currentUserIndex = (JSON.parse(response.data) as Player).index;
      this.connections.set(this.currentUserIndex, ws);

      this.broadcast(this.roomManager.getRoomsUpdate());
      this.broadcast(this.playerManager.getWinnersUpdate());
    }

    ws.send(JSON.stringify(response));
  }

  private handleCreateRoom(ws: WebSocket) {
    const { name, index } = this.playerManager.getPlayer(this.currentUserIndex) as Player;
    const createRoomResponse = this.roomManager.createRoom(name, index);
    this.broadcast(createRoomResponse);
    ws.send(JSON.stringify(createRoomResponse));
  }

  private handleAddUserToRoom(ws: WebSocket, data: string) {
    const playerIndex = this.getPlayerIndexByConnection(ws);
    if (!playerIndex) return;

    const player = this.playerManager.getPlayer(playerIndex);
    if (!player) return;

    const { indexRoom } = JSON.parse(data);
    const response = this.roomManager.addUserToRoom(indexRoom, player.name, playerIndex);

    if (response) {
      this.broadcast(response);

      const room = this.roomManager.currentTempRoom.find((r) => r.roomId === indexRoom);

      if (room && room.roomUsers.length === 2) {
        const [player1, player2] = room.roomUsers;

        const gameResponse = this.gameManager.createGame(player1.index, player2.index);

        const player1Ws = this.connections.get(player1.index);

        const player2Ws = this.connections.get(player2.index);

        if (player1Ws) {
          player1Ws.send(JSON.stringify(gameResponse));
        }

        if (player2Ws) {
          player2Ws.send(
            JSON.stringify({
              ...gameResponse,
              data: JSON.stringify({
                ...JSON.parse(gameResponse.data),
                idPlayer: player2.index,
              }),
            }),
          );
        }
      }
    }
  }

  private handleAddShips(ws: WebSocket, data: string) {
    const { gameId, ships, indexPlayer } = JSON.parse(data);

    const response = this.gameManager.addShips(gameId, indexPlayer, ships);

    if (response) {
      ws.send(JSON.stringify(response));

      const game = this.gameManager.getGame(gameId);
      if (game) {
        const otherPlayerIndex = Object.keys(game.players)
          .map(Number)
          .find((index) => index !== indexPlayer);

        if (otherPlayerIndex) {
          const otherPlayerWs = this.connections.get(otherPlayerIndex);
          if (otherPlayerWs) {
            otherPlayerWs.send(
              JSON.stringify({
                type: 'start_game',
                data: JSON.stringify({
                  ships: game.players[otherPlayerIndex].ships,
                  currentPlayerIndex: game.currentPlayerIndex,
                }),
                id: 0,
              }),
            );
          }
        }
      }
    }
  }

  private handleAttack(ws: WebSocket, data: unknown) {
    const { gameId, x, y, indexPlayer } = JSON.parse(data as string);

    const responses = this.gameManager.attack(gameId, indexPlayer, x, y);

    for (const response of responses) {
      if (response.type === 'finish') {
        this.playerManager.incrementWin(indexPlayer);
        this.broadcast(this.playerManager.getWinnersUpdate());
      }

      const game = this.gameManager.getGame(gameId);
      if (game) {
        Object.keys(game.players).forEach((playerIndex) => {
          const playerWs = this.connections.get(playerIndex);
          if (playerWs) {
            playerWs.send(JSON.stringify(response));
            this.broadcast(response);
          }
        });
      }
    }
  }

  private handleRandomAttack(ws: WebSocket, data: unknown) {
    const { gameId, indexPlayer } = JSON.parse(data as string);
    const responses = this.gameManager.randomAttack(gameId, indexPlayer);

    for (const response of responses) {
      if (response.type === 'finish') {
        this.playerManager.incrementWin(indexPlayer);
        this.broadcast(this.playerManager.getWinnersUpdate());
      }

      const game = this.gameManager.getGame(gameId);
      if (game) {
        Object.keys(game.players).forEach((playerIndex) => {
          const playerWs = this.connections.get(playerIndex);
          if (playerWs) {
            playerWs.send(JSON.stringify(response));
            this.broadcast(response);
          }
        });
      }
    }
  }

  private getPlayerIndexByConnection(ws: WebSocket): number | undefined | string {
    for (const [index, connection] of this.connections.entries()) {
      if (connection === ws) {
        return index;
      }
    }
    return undefined;
  }

  private broadcast(message: WebSocketMessage): void {
    try {
      const jsonString = JSON.stringify(message);
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(jsonString);
        }
      });
      console.log('Broadcast message:', message);
    } catch (err) {
      console.error('Broadcast error:', err, message);
    }
  }

  close(): void {
    this.wss.close();
    console.log('WebSocket server closed');
  }
}
