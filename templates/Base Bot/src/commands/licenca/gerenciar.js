"use strict";

const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const {
  LICENSE_STATUS,
  getLicenseByGuildId,
  isExpiredByDate,
} = require("../../utils/license-bridge");
const {
  applyLicenseProfileToGuild,
} = require("../../utils/license-profile");

function formatDate(value) {
  if (!value) {
    return "Sem vencimento";
  }

  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getStatusLabel(license) {
  if (!license) {
    return "Nao ativada";
  }

  if (isExpiredByDate(license) || license.status === LICENSE_STATUS.EXPIRED) {
    return "Expirada";
  }

  const labels = {
    [LICENSE_STATUS.PENDING_BIND]: "Aguardando ativacao",
    [LICENSE_STATUS.ACTIVE]: "Ativa",
    [LICENSE_STATUS.GRACE_PERIOD]: "Periodo de carencia",
  };

  return labels[license.status] || license.status || "Desconhecida";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gerenciar")
    .setDescription("Mostra a licenca vinculada a este servidor.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async run(bot, interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: "Use este comando dentro de um servidor.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const license = await getLicenseByGuildId(interaction.guildId);

    if (!license) {
      return interaction.editReply({
        content:
          "Este servidor ainda nao tem licenca ativa. Use /resgatar-key com a key enviada pelo manager.",
      });
    }

    await applyLicenseProfileToGuild(
      interaction.guild,
      license,
      bot.painel,
    );

    const profile = license.profile || {};
    const lines = [
      "# Licenca do servidor",
      `- Status: **${getStatusLabel(license)}**`,
      `- Produto: \`${license.productId || "nao informado"}\``,
      `- Aplicacao: \`${license.applicationId || "nao informada"}\``,
      `- Comprador: <@${license.buyerDiscordId || "0"}>`,
      `- Vinculada em: \`${formatDate(license.boundAt)}\``,
      `- Vence em: \`${formatDate(license.expiresAt)}\``,
      `- Nick configurado: \`${profile.nickname || "padrao do bot"}\``,
    ];

    return interaction.editReply({ content: lines.join("\n") });
  },
};
