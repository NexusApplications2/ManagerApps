"use strict";

const runtimeConfig = require("./runtime-config");
const {
  LICENSE_STATUS,
  getLicenseByGuildId,
  isExpiredByDate,
} = require("./license-bridge");

function getProfileFromLicense(license) {
  return (license && license.profile) || {};
}

function canUseProfile(license) {
  return (
    license &&
    license.status === LICENSE_STATUS.ACTIVE &&
    !isExpiredByDate(license)
  );
}

async function applyLicenseProfileToGuild(guild, license, logger = console) {
  if (!guild || !canUseProfile(license)) {
    return false;
  }

  const profile = getProfileFromLicense(license);
  const nickname = String(profile.nickname || "").trim().slice(0, 32);
  const avatarUrl = String(profile.avatarUrl || "").trim();

  if (nickname) {
    await guild.members
      .fetchMe()
      .then((member) => member.setNickname(nickname))
      .catch((error) => {
        logger.warn?.(
          `Nao foi possivel aplicar o nickname em ${guild.name}.`,
          error,
        );
      });
  }

  if (avatarUrl && runtimeConfig.shouldApplyGlobalAvatarFromLicense()) {
    await guild.client.user.setAvatar(avatarUrl).catch((error) => {
      logger.warn?.(
        "Nao foi possivel aplicar o avatar da licenca. O avatar de bot e global.",
        error,
      );
    });
  }

  return true;
}

async function syncKnownGuildProfiles(bot) {
  const guilds = [...bot.guilds.cache.values()];
  let applied = 0;

  for (const guild of guilds) {
    const license = await getLicenseByGuildId(guild.id).catch(() => null);
    const didApply = await applyLicenseProfileToGuild(
      guild,
      license,
      bot.painel,
    );

    if (didApply) {
      applied += 1;
    }
  }

  return applied;
}

module.exports = {
  applyLicenseProfileToGuild,
  syncKnownGuildProfiles,
};
