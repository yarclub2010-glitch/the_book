// Реестр сцен: id → описание сцены
import { roomNight, roomMorning, roomEvening } from './room-np.js';
import { kitchenNight, kitchenMorning, kitchenEvening, kitchenP, kitchenPEvening, kitchenPFridge, sillNP } from './kitchen.js';
import { phone, phoneNew, miriClose } from './phone.js';
import { veraRoom, veraDesk } from './vera-np.js';
import { hallNight, hallEvening, roomP, hallP } from './hall.js';
import { veraP, breadP } from './p-world.js';
import { noteP } from './note.js';
import { bookNP, bookP } from './book.js';

export const scenes = Object.fromEntries(
  [
    roomNight, roomMorning, roomEvening,
    kitchenNight, kitchenMorning, kitchenEvening, kitchenP, kitchenPEvening, kitchenPFridge, sillNP,
    phone, phoneNew, miriClose, veraRoom, veraDesk,
    hallNight, hallEvening, roomP, bookNP, bookP,
    hallP, veraP, breadP, noteP,
  ].map((s) => [s.id, s]),
);
