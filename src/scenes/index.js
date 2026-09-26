// Реестр сцен: id → описание сцены
import { roomNight, roomMorning } from './room-np.js';
import { kitchenNight, kitchenMorning, kitchenP } from './kitchen.js';

export const scenes = Object.fromEntries(
  [roomNight, roomMorning, kitchenNight, kitchenMorning, kitchenP].map((s) => [s.id, s]),
);
