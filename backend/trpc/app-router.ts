import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";

import ensureSeeds from "./routes/users/ensureSeeds";
import login from "./routes/users/login";
import register from "./routes/users/register";
import getMe from "./routes/users/getMe";
import updateMe from "./routes/users/updateMe";
import listEmployees from "./routes/users/listEmployees";
import createEmployee from "./routes/users/createEmployee";
import updateEmployee from "./routes/users/updateEmployee";
import removeEmployee from "./routes/users/removeEmployee";

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
import takeTicket from "./routes/tickets/takeTicket";
import listAvailableTickets from "./routes/tickets/listAvailable";
import listAssignedToMeTickets from "./routes/tickets/listAssignedToMe";
import listResolvedTickets from "./routes/tickets/listResolved";
import getByIdTicket from "./routes/tickets/getById";

import listMineConversations from "./routes/conversations/listMine";
import createForTicket from "./routes/conversations/createForTicket";
import archiveForUser from "./routes/conversations/archiveForUser";
import getByIdConversation from "./routes/conversations/getById";

import listByConversation from "./routes/messages/listByConversation";
import sendMessage from "./routes/messages/send";

import createPasswordReset from "./routes/password_reset/create";
import listPasswordResets from "./routes/password_reset/list";
import approvePasswordReset from "./routes/password_reset/approve";
import rejectPasswordReset from "./routes/password_reset/reject";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  users: createTRPCRouter({
    ensureSeeds,
    login,
    register,
    getMe,
    updateMe,
    listEmployees,
    createEmployee,
    updateEmployee,
    removeEmployee,
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
    take: takeTicket,
    listAvailable: listAvailableTickets,
    listAssignedToMe: listAssignedToMeTickets,
    listResolved: listResolvedTickets,
    getById: getByIdTicket,
  }),
  conversations: createTRPCRouter({
    listMine: listMineConversations,
    createForTicket,
    archiveForUser,
    getById: getByIdConversation,
  }),
  messages: createTRPCRouter({
    listByConversation,
    send: sendMessage,
  }),
  passwordReset: createTRPCRouter({
    create: createPasswordReset,
    list: listPasswordResets,
    approve: approvePasswordReset,
    reject: rejectPasswordReset,
  }),
});

export type AppRouter = typeof appRouter;
