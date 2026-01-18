import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createNotification, getUserNotifications, markNotificationAsRead, deleteNotification } from "../db";

export const notificationRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getUserNotifications(ctx.user.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        message: z.string().min(1),
        type: z.enum(["info", "success", "warning", "error"]).optional(),
        actionUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await createNotification(ctx.user.id, input);
    }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await markNotificationAsRead(input.id);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await deleteNotification(input.id);
    }),
});
