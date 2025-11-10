import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";

import ensureSeeds from "./routes/users/ensureSeeds";
import login from "./routes/users/login";
import getMe from "./routes/users/getMe";
import updateMe from "./routes/users/updateMe";

import listMachines from "./routes/machines/list";
import createMachine from "./routes/machines/create";
import updateMachine from "./routes/machines/update";
import removeMachine from "./routes/machines/remove";

import listRentalOffers from "./routes/rental_offers/list";
import createRentalOffer from "./routes/rental_offers/create";
import updateRentalOffer from "./routes/rental_offers/update";
import removeRentalOffer from "./routes/rental_offers/remove";

import listParts from "./routes/parts/list";
import createPart from "./routes/parts/create";
import updatePart from "./routes/parts/update";
import removePart from "./routes/parts/remove";

import createTicket from "./routes/tickets/create";
import listMineTickets from "./routes/tickets/listMine";
import listByAreaTickets from "./routes/tickets/listByArea";
import updateStatusTicket from "./routes/tickets/updateStatus";
import assignTicket from "./routes/tickets/assign";

import listMineConversations from "./routes/conversations/listMine";
import createForTicket from "./routes/conversations/createForTicket";
import archiveForUser from "./routes/conversations/archiveForUser";

import listByConversation from "./routes/messages/listByConversation";
import sendMessage from "./routes/messages/send";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  users: createTRPCRouter({
    ensureSeeds,
    login,
    getMe,
    updateMe,
  }),
  machines: createTRPCRouter({
    list: listMachines,
    create: createMachine,
    update: updateMachine,
    remove: removeMachine,
  }),
  rental_offers: createTRPCRouter({
    list: listRentalOffers,
    create: createRentalOffer,
    update: updateRentalOffer,
    remove: removeRentalOffer,
  }),
  parts: createTRPCRouter({
    list: listParts,
    create: createPart,
    update: updatePart,
    remove: removePart,
  }),
  tickets: createTRPCRouter({
    create: createTicket,
    listMine: listMineTickets,
    listByArea: listByAreaTickets,
    updateStatus: updateStatusTicket,
    assign: assignTicket,
  }),
  conversations: createTRPCRouter({
    listMine: listMineConversations,
    createForTicket,
    archiveForUser,
  }),
  messages: createTRPCRouter({
    listByConversation,
    send: sendMessage,
  }),
});

export type AppRouter = typeof appRouter;
