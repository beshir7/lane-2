import { route } from "@/lib/http";
import { listNotifications } from "@/features/notifications/queries";
import { markAllNotificationsRead } from "@/features/notifications/actions";

export const { GET, PATCH } = route({
  GET: () => listNotifications(),
  PATCH: () => markAllNotificationsRead(),
});
