const { SlashCommandBuilder } = require("discord.js");
const {
  guardInteractionLicense,
} = require("../../utils/license-gate");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("exemplo_pago")
    .setDescription("Exemplo de comando protegido por licenca ativa."),

  async run(client, interaction) {
    const licenseGate = await guardInteractionLicense(interaction);

    if (!licenseGate.ok) {
      return;
    }

    return interaction.reply({
      content: "Licenca ativa. Execute aqui a funcao paga do seu bot.",
      ephemeral: true,
    });
  },
};
