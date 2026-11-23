"use strict";

const field = (id) => document.getElementById(id);
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const wholeCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0
});
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 });

function project({ initial, monthly, years, annualRate }) {
  const monthlyRate = Math.expm1(Math.log1p(annualRate / 100) / 12);
  let balance = initial;
  const points = [{ month: 0, balance, contributed: initial }];

  for (let month = 1; month <= years * 12; month += 1) {
    balance = balance * (1 + monthlyRate) + monthly;
    points.push({ month, balance, contributed: initial + monthly * month });
  }

  return points;
}

const chart = field("growth-chart");
const inputs = ["initial", "monthly", "years", "rate"].map(field);
const scenarios = document.querySelectorAll(".scenarios button");
const chartNumber = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1
});

function chartElement(name, attributes, content = "") {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  element.textContent = content;
  return element;
}

function drawChart(points, years) {
  const width = Math.max(220, Math.round(chart.getBoundingClientRect().width));
  const height = width < 400 ? 180 : 225;
  const left = 68;
  const right = width - 18;
  const top = 16;
  const bottom = height - 30;
  const maxMonth = years * 12;
  const peak = Math.max(1, ...points.map(({ balance, contributed }) => Math.max(balance, contributed)));
  const stepSize = 10 ** Math.floor(Math.log10(peak / 3));
  const step = Math.ceil(peak / (3 * stepSize)) * stepSize;
  const x = (month) => left + (right - left) * month / maxMonth;
  const y = (value) => bottom - (bottom - top) * value / (step * 3);
  const title = chartElement("title", { id: "chart-title" },
    "Evolução do saldo simulado e do total aportado ao longo do tempo");
  const grid = chartElement("g", { fill: "#dce9dd", "font-size": 12, "font-family": "inherit" });

  for (let tick = 0; tick <= 3; tick += 1) {
    const value = tick * step;
    const row = y(value);
    grid.append(
      chartElement("line", { x1: left, x2: right, y1: row, y2: row, stroke: "#52715f" }),
      chartElement("text", { x: left - 7, y: row + 4, "text-anchor": "end" }, "R$ " + chartNumber.format(value))
    );
  }

  const yearTicks = [...new Set([0, Math.round(years / 3), Math.round(2 * years / 3), years])];
  for (const year of yearTicks) {
    const label = year === 0 ? "Início" : year + (year === 1 ? " ano" : " anos");
    grid.append(chartElement("text", {
      x: x(year * 12), y: height - 7,
      "text-anchor": year === years ? "end" : year === 0 ? "start" : "middle"
    }, label));
  }

  const series = (key) => points.map((point) => x(point.month) + "," + y(point[key])).join(" ");
  const saldo = series("balance");
  const provided = series("contributed");
  const lastPoint = points.at(-1);
  chart.setAttribute("viewBox", "0 0 " + width + " " + height);
  chart.replaceChildren(title, grid,
    chartElement("polygon", { points: left + "," + bottom + " " + saldo + " " + right + "," + bottom, fill: "#def09f", opacity: ".12" }),
    chartElement("polyline", { points: saldo, fill: "none", stroke: "#def09f", "stroke-width": 3 }),
    chartElement("polyline", { points: provided, fill: "none", stroke: "#d4e3dc", "stroke-width": 2, "stroke-dasharray": "5 5" }),
    chartElement("circle", { cx: right, cy: y(lastPoint.balance), r: 4, fill: "#def09f" })
  );
}

function updateSimulation() {
  const [initial, monthly, years, annualRate] = inputs.map((input) => input.valueAsNumber);
  field("initial-out").value = wholeCurrency.format(initial);
  field("monthly-out").value = wholeCurrency.format(monthly);
  field("years-out").value = years + (years === 1 ? " ano" : " anos");
  field("rate-out").value = percent.format(annualRate / 100) + " a.a.";

  for (const button of scenarios) {
    button.setAttribute("aria-pressed", String(Number(button.dataset.rate) === annualRate));
  }

  const points = project({ initial, monthly, years, annualRate });
  const { balance, contributed } = points.at(-1);
  field("balance-out").textContent = currency.format(balance);
  field("provided-out").textContent = currency.format(contributed);
  field("gain-out").textContent = currency.format(balance - contributed);
  drawChart(points, years);
}

for (const input of inputs) input.addEventListener("input", updateSimulation);
for (const button of scenarios) {
  button.addEventListener("click", () => {
    field("rate").value = button.dataset.rate;
    updateSimulation();
  });
}

field("load-case").addEventListener("click", () => {
  field("initial").value = 10000;
  field("monthly").value = 0;
  field("years").value = 5;
  field("rate").value = 6;
  updateSimulation();
});

updateSimulation();
window.addEventListener("resize", updateSimulation);

const menu = document.querySelector(".menu");
const nav = field("site-nav");
function setMenu(open) {
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  nav.classList.toggle("open", open);
}
menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") !== "true"));
for (const link of nav.querySelectorAll("a")) {
  link.addEventListener("click", () => setMenu(false));
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && nav.classList.contains("open")) {
    setMenu(false);
    menu.focus();
  }
});

const presentation = document.querySelector(".presentation");
const presentationLabel = presentation.querySelector("span");
function setPresentation(active) {
  document.body.classList.toggle("presentation-active", active);
  presentationLabel.textContent = active ? "Sair do modo" : "Apresentar";
  presentation.setAttribute("aria-pressed", String(active));
}
presentation.addEventListener("click", async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  const active = !document.body.classList.contains("presentation-active");
  setPresentation(active);
  if (active && document.documentElement.requestFullscreen) {
    await document.documentElement.requestFullscreen().catch(() => {});
  }
});
document.addEventListener("fullscreenchange", () => setPresentation(Boolean(document.fullscreenElement)));
setPresentation(false);