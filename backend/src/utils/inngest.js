import { Inngest } from "inngest";
import { connectDB } from "./db.js";
import User from "../models/User.model.js";
import { logger } from "./logger.js";

export const inngest = new Inngest({ id: "evaluate-Dev" });

const syncUser = inngest.createFunction(
  { id: "sync-user" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    logger.info(`Received clerk/user.created event for user: ${event.data.id}`);
    try {
      await connectDB();
      const { id, email_addresses, first_name, last_name, image_url } =
        event.data;

      const newUser = {
        clerkId: id,
        email: email_addresses[0]?.email_address,
        name: `${first_name || ""} ${last_name || ""}`,
        profileImage: image_url,
      };
      await User.create(newUser);
      logger.success(`Successfully synced user: ${id}`);
          await upsertStreamUser({
      id: newUser.clerkId.toString(),
      name: newUser.name,
      image: newUser.profileImage,
    });

    } catch (error) {
      logger.error(`Error syncing user: ${event.data.id}`, error);
      throw error;
    }
  },
);

const deleteUserFromDB = inngest.createFunction(
  { id: "delete-user-from-db" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    logger.info(`Received clerk/user.deleted event for user: ${event.data.id}`);
    try {
      await connectDB();

      const { id } = event.data;
      const result = await User.deleteOne({ clerkId: id });
      if (result.deletedCount > 0) {
        logger.success(`Successfully deleted user: ${id}`);
      } else {
        logger.warn(`User not found for deletion: ${id}`);
      }
      await deleteStreamUser(id.toString());
    } catch (error) {
      logger.error(`Error deleting user: ${event.data.id}`, error);
      throw error;
    }
  },
);
export const functions = [syncUser, deleteUserFromDB];
