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
exports.getRemainingTimeFormated = exports.moneyFormatter = void 0;
exports.getEnv = getEnv;
exports.sleep = sleep;
exports.asyncLoopingExec = asyncLoopingExec;
exports.formatUptime = formatUptime;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({
  path: `.env.${process.env.NODE_ENV || "development"}`,
});
function getEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} não foi definido no .env`);
  }
  return value;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function asyncLoopingExec(timeout, functionToExec) {
  return __awaiter(this, void 0, void 0, function* () {
    while (true) {
      yield functionToExec();
      yield new Promise((resolve) => setTimeout(resolve, timeout));
    }
  });
}
const moneyFormatter = (number) => {
  if (number < 0) {
    return number.toString().slice(0, 5);
  } else {
    return number.toString().slice(0, 4);
  }
};
exports.moneyFormatter = moneyFormatter;
const getRemainingTimeFormated = (date) => {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff <= 0) {
    return "Expirado";
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${days}d, ${hours}h, ${minutes}m, ${seconds}s`;
};
exports.getRemainingTimeFormated = getRemainingTimeFormated;
function formatUptime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}
