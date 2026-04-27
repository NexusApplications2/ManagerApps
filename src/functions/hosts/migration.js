"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.runMultiHostBackfill = runMultiHostBackfill;

let migrationPromise = null;
const LEGACY_MANAGED_SERVICE_TYPE = Buffer.from(
  "aW5maW5pdHlfc2VydmljZQ==",
  "base64",
).toString("utf8");

function runMultiHostBackfill(databases) {
  if (migrationPromise) {
    return migrationPromise;
  }

  migrationPromise = (async () => {
    const [userSettings, stores, applications, products] = await Promise.all([
      databases.userSettings.find({}).lean(),
      databases.stores.find({}).lean(),
      databases.applications.find({}).lean(),
      databases.products.find({}).lean(),
    ]);

    for (const userSetting of userSettings) {
      const setOperation = {};

      if (
        userSetting.userId_campos &&
        !(((userSetting.hostAccounts || {}).campos || {}).accountId)
      ) {
        setOperation["hostAccounts.campos.accountId"] = userSetting.userId_campos;
      }

      if (
        userSetting.token_campos &&
        !(((userSetting.hostAccounts || {}).campos || {}).apiToken)
      ) {
        setOperation["hostAccounts.campos.apiToken"] = userSetting.token_campos;
      }

      if (Object.keys(setOperation).length) {
        await databases.userSettings.updateOne(
          { _id: userSetting._id },
          { $set: setOperation },
        );
      }
    }

    for (const store of stores) {
      const setOperation = {};

      if (!store.hostProvider) {
        setOperation.hostProvider = "campos";
      }

      if (!store.hostOwnerId && store.ownerId_campos) {
        setOperation.hostOwnerId = store.ownerId_campos;
      }

      if (!store.hostWorkspaceId && store.teamId_campos) {
        setOperation.hostWorkspaceId = store.teamId_campos;
      }

      if (!store.ownerDiscordId && store.ownerId_campos) {
        const ownerSettings = userSettings.find(
          (userSetting) => userSetting.userId_campos === store.ownerId_campos,
        );

        if (ownerSettings === null || ownerSettings === void 0 ? void 0 : ownerSettings.userId_discord) {
          setOperation.ownerDiscordId = ownerSettings.userId_discord;
        }
      }

      if (Object.keys(setOperation).length) {
        await databases.stores.updateOne({ _id: store._id }, { $set: setOperation });
      }
    }

    const storesById = new Map(stores.map((store) => [String(store._id), store]));

    for (const application of applications) {
      if (application.hostProvider) {
        continue;
      }

      const store = storesById.get(String(application.storeId));
      const hostProvider = (store === null || store === void 0 ? void 0 : store.hostProvider) || "campos";

      await databases.applications.updateOne(
        { _id: application._id },
        { $set: { hostProvider } },
      );
    }

    for (const product of products) {
      if (product.productType !== LEGACY_MANAGED_SERVICE_TYPE) {
        continue;
      }

      await databases.products.updateOne(
        { _id: product._id },
        { $set: { productType: "managed_service" } },
      );
    }
  })().catch((error) => {
    migrationPromise = null;
    console.error("Erro ao executar backfill multi-host:", error);
  });

  return migrationPromise;
}
