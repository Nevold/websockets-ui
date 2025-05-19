import { Room, WebSocketMessage } from './types';

export class RoomManager {
  public rooms: Room[] = [];
  public nextRoomId = 1;
  public currentTempRoom: Room[] = [];

  createRoom(playerName: string, playerIndex: number | string): WebSocketMessage {
    const newRoom: Room = {
      roomId: this.nextRoomId++,
      roomUsers: [{ name: playerName, index: playerIndex }],
    };
    this.rooms.push(newRoom);

    return this.getRoomsUpdate();
  }

  addUserToRoom(
    roomId: number,
    playerName: string,
    playerIndex: number | string,
  ): WebSocketMessage | null {
    const room = this.rooms.find((r) => r.roomId === roomId);
    if (!room || room.roomUsers.length >= 2) return null;

    if (!room.roomUsers.find((user) => user.name === playerName)) {
      room.roomUsers.push({ name: playerName, index: playerIndex });
    }
    this.currentTempRoom = [...this.rooms];

    this.rooms = this.rooms.filter((room) => room.roomId !== roomId && room.roomUsers.length !== 2);

    return this.getRoomsUpdate();
  }

  getRoomsUpdate(): WebSocketMessage {
    const data = JSON.stringify(
      this.rooms.map((room) => ({
        roomId: room.roomId,
        roomUsers: room.roomUsers.map((user) => ({
          name: user.name,
          index: user.index,
        })),
      })),
    );

    return {
      type: 'update_room',
      data,
      id: 0,
    };
  }

  removePlayerFromRooms(playerIndex: number | string): void {
    this.rooms = this.rooms
      .map((room) => ({
        ...room,
        roomUsers: room.roomUsers.filter((user) => user.index !== playerIndex),
      }))
      .filter((room) => room.roomUsers.length > 0);
  }
}
