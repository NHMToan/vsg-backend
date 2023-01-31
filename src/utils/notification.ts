import { Client } from "onesignal-node";
import { Publisher } from "type-graphql";
import { Notification } from "../entities/Notification";
import { Profile } from "../entities/Profile";
import { UserNotification } from "../entities/UserNotification";
import { NewNotiPayload, NotiMessageKey } from "../types/Notification";

const client = new Client(
  process.env.ONESIGNAL_APPID as any,
  process.env.ONESIGNAL_APIID as any
);

interface NotiContent {
  amount?: number;
  actorName?: string;
  actorAvatar?: string;
  actionObject?: string;
  messageKey: NotiMessageKey;
}
export const createNotification = async (
  pubsub: Publisher<NewNotiPayload>,
  profileIds: string[],
  notiContent: NotiContent
) => {
  const newNoti = Notification.create({
    messageKey: notiContent.messageKey,
    amount: notiContent.amount,
    actor_name: notiContent.actorName,
    actor_avatar: notiContent.actorAvatar,
    action_object: notiContent.actionObject,
  });

  await newNoti.save();

  for (let i = 0; i < profileIds.length; i++) {
    const profileId = profileIds[i];
    const profile = await Profile.findOne(profileId);

    const newUserNoti = UserNotification.create({
      notification: newNoti,
      profile,
    });
    await newUserNoti.save();

    await pubsub({
      profileId,
      notification: newUserNoti,
    });
  }
};
export const sendNotification = async (playerIds: string[]) => {
  try {
    const response = await client.createNotification({
      contents: {
        en: "Hello, world!",
      },
      include_player_ids: playerIds,
    });
    console.log(response.statusCode);
  } catch (error) {
    console.error(error);
  }
};
