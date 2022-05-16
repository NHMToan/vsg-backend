import DataLoader from "dataloader";
import { User } from "../entities/User";

const batchGetUsers = async (userIds: string[]) => {
  const users = await User.findByIds(userIds);
  return userIds.map((userId) => users.find((user) => user.id === userId));
};

export const buildDataLoaders = () => ({
  userLoader: new DataLoader<string, User | undefined>((userIds) =>
    batchGetUsers(userIds as string[])
  ),
});
