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
exports.notifyChannelLog = exports.notifyUser = void 0;
const __1 = __importDefault(require(".."));
const databases_1 = __importDefault(require("../databases"));
const notifyUser = (_a) =>
  __awaiter(void 0, [_a], void 0, function* ({ userId, message }) {
    try {
      const user = yield __1.default.users.cache.get(userId);
      if (!user) {
        console.error(`User with ID ${userId} not found.`);
        return;
      }
      user.send(message);
    } catch (error) {
      console.error(`Error notifying user ${userId}:`, error);
    }
  });
exports.notifyUser = notifyUser;
const notifyChannelLog = (_a) =>
  __awaiter(void 0, [_a], void 0, function* ({ logName, message }) {
    try {
      if (!logName || !message) {
        return;
      }
      const channelId_db = yield databases_1.default.userSettings.findOne({
        key: "logs",
      });
      if (!channelId_db) {
        return;
      }
      const channelId =
        channelId_db === null || channelId_db === void 0
          ? void 0
          : channelId_db.value[logName];
      if (!channelId) {
        return;
      }
      const channel = __1.default.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) {
        console.error(
          `Channel with ID ${channelId} not found or is not a text channel.`,
        );
        return;
      }
      yield channel === null || channel === void 0
        ? void 0
        : channel.send(message);
    } catch (error) {
      console.error(`Error notifying log ${logName}:`, error);
    }
  });
exports.notifyChannelLog = notifyChannelLog;
