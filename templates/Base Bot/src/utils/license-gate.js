"use strict";

const {
  LICENSE_STATUS,
  getLicenseByGuildId,
  isExpiredByDate,
} = require("./license-bridge");

function getLicenseBlockMessage(reason) {
  const messages = {
    dm_not_supported:
      "Este comando so pode ser usado dentro de um servidor.",
    not_bound:
      "Este servidor ainda nao ativou a licenca. Use /resgatar-key com a key enviada pelo manager.",
    grace_period:
      "A licenca deste servidor esta em periodo de carencia. Renove no manager para liberar o uso.",
    expired:
      "A licenca deste servidor expirou. Renove no manager para reativar o bot.",
    inactive:
      "A licenca deste servidor nao esta ativa no momento.",
  };

  return messages[reason] || messages.inactive;
}

async function assertGuildHasActiveLicense(guildId) {
  if (!guildId) {
    return {
      ok: false,
      reason: "dm_not_supported",
      message: getLicenseBlockMessage("dm_not_supported"),
    };
  }

  const license = await getLicenseByGuildId(guildId);

  if (!license) {
    return {
      ok: false,
      reason: "not_bound",
      message: getLicenseBlockMessage("not_bound"),
    };
  }

  if (isExpiredByDate(license) || license.status === LICENSE_STATUS.EXPIRED) {
    return {
      ok: false,
      reason: "expired",
      license,
      message: getLicenseBlockMessage("expired"),
    };
  }

  if (license.status === LICENSE_STATUS.GRACE_PERIOD) {
    return {
      ok: false,
      reason: "grace_period",
      license,
      message: getLicenseBlockMessage("grace_period"),
    };
  }

  if (license.status !== LICENSE_STATUS.ACTIVE) {
    return {
      ok: false,
      reason: "inactive",
      license,
      message: getLicenseBlockMessage("inactive"),
    };
  }

  return { ok: true, license };
}

async function guardInteractionLicense(interaction) {
  const result = await assertGuildHasActiveLicense(interaction.guildId);

  if (result.ok) {
    return result;
  }

  const payload = {
    content: result.message,
    ephemeral: true,
  };

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload).catch(() => null);
  } else {
    await interaction.reply(payload).catch(() => null);
  }

  return result;
}

module.exports = {
  assertGuildHasActiveLicense,
  guardInteractionLicense,
  getLicenseBlockMessage,
};
