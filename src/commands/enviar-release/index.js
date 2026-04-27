"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const discord_js_1 = require("discord.js");
const fast_discord_js_1 = require("fast-discord-js");
const databases_1 = __importDefault(require("@root/src/databases"));
const semver_1 = __importDefault(require("semver"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const functions_1 = require("@root/src/functions");
const MAX_RELEASES = 10;
new fast_discord_js_1.SlashCommand({
  name: "enviar-release",
  description: "Envia uma nova release para um produto",
  type: 1,
  options: [
    {
      name: "store",
      description: "Selecione a loja",
      type: discord_js_1.ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
    {
      name: "product",
      description: "Selecione o produto",
      type: discord_js_1.ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
    {
      name: "file",
      description: "Envie o arquivo .zip da release",
      type: discord_js_1.ApplicationCommandOptionType.Attachment,
      required: true,
    },
  ],
  run: (_client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      let savedFilePath = "";
      try {
        const storeId = interaction.options.get("store");
        if (!storeId || !storeId.value) {
          return interaction.reply({
            content: "`❌`・Loja não informada!",
            flags: 64,
          });
        }
        const hasPermission = yield (0,
        functions_1.getUserHasPermissionOnStore)({
          userId: interaction.user.id,
          storeId: storeId.value.toString(),
          permission: functions_1.PermissionsStore.ADMIN,
        });
        if (!hasPermission) {
          return interaction.reply({
            content: "`❌`・Você não tem permissão para usar este comando.",
            flags: 64,
          });
        }
        const file = interaction.options.get("file");
        if (
          !((_a =
            file === null || file === void 0 ? void 0 : file.attachment) ===
            null || _a === void 0
            ? void 0
            : _a.url)
        ) {
          return interaction.reply({
            content: "`❌`・Arquivo não informado!",
            flags: 64,
          });
        }
        const fileSize = file.attachment.size;
        if (!fileSize) {
          return interaction.reply({
            content: "`❌`・Não foi possível determinar o tamanho do arquivo!",
            flags: 64,
          });
        }
        if (fileSize > 50 * 1024 * 1024) {
          // 50MB
          return interaction.reply({
            content:
              "`❌`・O arquivo é muito grande! O tamanho máximo permitido é 50MB.",
            flags: 64,
          });
        }
        const productId = interaction.options.get("product");
        if (!productId || !productId.value) {
          return interaction.reply({
            content: "`❌`・Produto não informado!",
            flags: 64,
          });
        }
        const userInfo = yield databases_1.default.userSettings.findOne({
          userId_discord: interaction.user.id,
        });
        if (!userInfo) {
          return interaction.reply({
            content: "`❌`・Você não está cadastrado!",
            flags: 64,
          });
        }
        const product = yield databases_1.default.products.findOne({
          _id: productId.value,
          storeId: storeId.value,
        });
        if (!product) {
          return interaction.reply({
            content: "`❌`・Produto não encontrado!",
            flags: 64,
          });
        }
        const productReleases = product.releases || [];
        if (productReleases.length >= MAX_RELEASES) {
          return interaction.reply({
            content: `\`❌\`・O Máximo de release permitidas é de ${MAX_RELEASES}! Por favor, remova uma release antes de enviar uma nova.`,
            flags: 64,
          });
        }
        // Fazer o download do arquivo
        const response = yield axios_1.default.get(file.attachment.url, {
          responseType: "arraybuffer",
        });
        // transforma em buffer
        const buffer = Buffer.from(response.data);
        const lastReleaseCreatedVersion = product.lastReleaseCreatedVersion;
        const nextRelease = semver_1.default.inc(
          lastReleaseCreatedVersion,
          "major",
        );
        // diretório e arquivo
        const releaseDir = path_1.default.join(
          "releases",
          product._id.toString(),
        );
        savedFilePath = path_1.default.join(releaseDir, `${nextRelease}.zip`);
        // cria pasta se não existir
        yield promises_1.default.mkdir(releaseDir, { recursive: true });
        const zip = new adm_zip_1.default(buffer);
        const strippedBuffer = yield stripRootFolderFromZip({
          originalZip: zip,
          exclude_path_list: [
            "node_modules",
            ".git",
            "venv",
            ".vscode",
            "__pycache__/",
            ".next/",
          ],
        });
        // salva o arquivo no disco
        yield promises_1.default.writeFile(savedFilePath, strippedBuffer);
        yield databases_1.default.products.updateOne(
          { _id: product._id },
          {
            $set: { lastReleaseCreatedVersion: nextRelease },
            $push: {
              releases: {
                version: nextRelease,
                date: new Date(),
                path: savedFilePath,
              },
            },
          },
        );
        return interaction.reply({
          content: `\`✅\`・Release \`${nextRelease}\` enviada com sucesso para o produto \`${product.name}\`!`,
          flags: 64,
        });
      } catch (error) {
        /**
         * Fallback - caso dê algum erro, tenta remover o arquivo que foi salvo
         * para evitar lixo no sistema
         */
        if (savedFilePath) {
          try {
            yield promises_1.default.unlink(savedFilePath);
          } catch (_b) {
            // não faz nada
            console.warn(
              "Não foi possível remover o arquivo de release após erro.",
            );
          }
        }
        return interaction.reply({
          content: `\`❌\`・${error.message}`,
          flags: 64,
        });
      }
    }),
});
const stripRootFolderFromZip = (_a) =>
  __awaiter(
    void 0,
    [_a],
    void 0,
    function* ({ originalZip, exclude_path_list }) {
      const entries = originalZip.getEntries();
      if (entries.length === 0) {
        return originalZip.toBuffer(); // ZIP vazio
      }
      // 🔍 Descobre se todos os arquivos estão dentro de um único diretório pai
      const firstPathPart = entries[0].entryName.split("/")[0];
      const allInsideSameDir = entries.every((e) =>
        e.entryName.startsWith(firstPathPart + "/"),
      );
      const parentDir = allInsideSameDir ? firstPathPart + "/" : "";
      const newZip = new adm_zip_1.default();
      entries.forEach((entry) => {
        // Remove a pasta pai, se existir
        const relativePath = parentDir
          ? entry.entryName.substring(parentDir.length)
          : entry.entryName;
        if (!relativePath || relativePath.trim() === "") return; // ignora pasta raiz
        // 🚨 Verifica se deve excluir (match no início ou caminho exato de pasta)
        const shouldExclude =
          exclude_path_list === null || exclude_path_list === void 0
            ? void 0
            : exclude_path_list.some(
                (excluded) =>
                  relativePath === excluded ||
                  relativePath.startsWith(excluded + "/"),
              );
        if (shouldExclude) return;
        if (entry.isDirectory) {
          newZip.addFile(
            relativePath.endsWith("/") ? relativePath : relativePath + "/",
            Buffer.alloc(0),
          );
        } else {
          newZip.addFile(relativePath, entry.getData());
        }
      });
      return newZip.toBuffer();
    },
  );
