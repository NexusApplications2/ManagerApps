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
exports.ChartColor = exports.ChartType = void 0;
exports.generateChartBuffer = generateChartBuffer;
const canvas_1 = require("canvas");
const chart_js_1 = require("chart.js");
chart_js_1.Chart.register(...chart_js_1.registerables);
const CHART_FONT_FAMILY = process.env.CHART_FONT_FAMILY || "sans-serif";
chart_js_1.Chart.defaults.font.size = 14;
chart_js_1.Chart.defaults.font.family = CHART_FONT_FAMILY;
let currentChartInstance = null;
var ChartType;
(function (ChartType) {
  ChartType["LINE"] = "line";
  ChartType["BAR"] = "bar";
  ChartType["RADAR"] = "radar";
  ChartType["DOUGHNUT"] = "doughnut";
  ChartType["POLAR_AREA"] = "polarArea";
  ChartType["PIE"] = "pie";
  ChartType["BUBBLE"] = "bubble";
  ChartType["SCATTER"] = "scatter";
})(ChartType || (exports.ChartType = ChartType = {}));
var ChartColor;
(function (ChartColor) {
  ChartColor["RED"] = "rgb(255, 99, 132)";
  ChartColor["ORANGE"] = "rgb(255, 159, 64)";
  ChartColor["YELLOW"] = "rgb(255, 205, 86)";
  ChartColor["GREEN"] = "rgb(75, 192, 192)";
  ChartColor["BLUE"] = "rgb(54, 162, 235)";
  ChartColor["PURPLE"] = "rgb(153, 102, 255)";
  ChartColor["GREY"] = "rgb(201, 203, 207)";
  ChartColor["TRANSPARENT"] = "transparent";
})(ChartColor || (exports.ChartColor = ChartColor = {}));
function generateChartBuffer(data) {
  return __awaiter(this, void 0, void 0, function* () {
    const canvas = (0, canvas_1.createCanvas)(
      data.width || 440,
      data.height || 250,
    );
    const ctx = canvas.getContext("2d");
    const plugin = {
      id: "customCanvasBackgroundColor",
      beforeDraw: (chart) => {
        const { ctx } = chart;
        ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = data.backgroundColor || ChartColor.TRANSPARENT;
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
      },
    };
    currentChartInstance = new chart_js_1.Chart(ctx, {
      type: data.type || ChartType.LINE,
      data: {
        labels: data.labels,
        datasets: [
          {
            data: data.values,
            borderWidth: 1,
            borderColor: data.borderColor || undefined,
            borderRadius: data.borderRadius || 0,
            backgroundColor: data.chartColor || undefined,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            text: "@CamposCloud - All Rights Reserved",
            display: true,
            align: "end",
            color: "rgba(255,255,255,0.2)",
            font: {
              size: 12,
              weight: "normal",
              family: CHART_FONT_FAMILY,
            },
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value, index, values) {
                const valueWithPrefix = data.prefix
                  ? data.prefix + value
                  : value;
                return valueWithPrefix;
              },
              font: {
                size: 12,
                family: CHART_FONT_FAMILY,
              },
            },
          },
          x: {
            ticks: {
              font: {
                size: 11,
                family: CHART_FONT_FAMILY,
              },
            },
          },
        },
      },
      plugins: [plugin],
    });
    return canvas.toBuffer("image/png");
  });
}
