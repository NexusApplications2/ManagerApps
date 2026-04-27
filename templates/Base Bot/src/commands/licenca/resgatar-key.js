"use strict";

const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { bindClaimKeyToGuild } = require("../../utils/license-bridge");
const {
  applyLicenseProfileToGuild,
} = require("../../utils/license-profile");

const REASON_MESSAGES = {
  claim_not_found: "Key nao encontrada. Confira se copiou a key completa enviada pelo manager.",
  claim_already_used: "Essa key ja foi usada em outro servidor.",
  claim_expired: "Essa key pertence a uma licenca expirada. Renove no manager para continuar.",
  guild_already_bound: "Este servidor ja possui uma licenca vinculada.",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resgatar-key")
    .setDescription("Ativa a licenca do manager neste servidor.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName("key")
        .setDescription("Key enviada pelo manager apos a compra.")
        .setRequired(true),
    ),

  async run(bot, interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: "Use este comando dentro do servidor que recebera o bot.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const claimKey = interaction.options.getString("key", true);
    const result = await bindClaimKeyToGuild({
      guildId: interaction.guildId,
      guildName: interaction.guild.name,
      claimKey,
      userId: interaction.user.id,
    });

    if (!result.ok) {
      return interaction.editReply({
        content:
          REASON_MESSAGES[result.reason] ||
          "Nao foi possivel ativar essa key.",
      });
    }

    await applyLicenseProfileToGuild(
      interaction.guild,
      result.entitlement,
      bot.painel,
    );

    return interaction.editReply({
      content:
        "Licenca ativada com sucesso. Este servidor ja pode usar os recursos liberados pelo manager.",
    });
  },
};
