// Реестр сцен: id → описание сцены
import roomNp from './room-np.js';
import { kitchenNp, kitchenP } from './kitchen.js';

export const scenes = {
  [roomNp.id]: roomNp,
  [kitchenNp.id]: kitchenNp,
  [kitchenP.id]: kitchenP,
};
