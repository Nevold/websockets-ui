export interface Player {
  name: string;
  password: string;
  wins: number;
  index: number | string;
  error?: boolean;
  errorText?: string;
}

export interface Ship {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
  hits?: number;
}

export interface RoomUser {
  name: string;
  index: number | string;
}

export interface Room {
  roomId: number;
  roomUsers: RoomUser[];
}

export interface Game {
  idGame: number;
  players: {
    [index: string]: {
      ships: Ship[];
      attacks: { x: number; y: number; status: 'miss' | 'shot' | 'killed' }[];
      board: ('empty' | 'ship' | 'hit' | 'miss')[][];
    };
  };
  currentPlayerIndex: number | string;
  gameStatus: 'waiting' | 'playing' | 'finished';
}

export interface WebSocketMessage {
  type: string;
  data: unknown;
  id: number;
}
