// ========================================
// 家計簿データの共通localStorage操作
// ========================================

(function initializeFinanceStorage(global) {
  "use strict";

  const BUDGET_STORAGE_KEY = "monthlyBudgets";
  const FIXED_COST_STORAGE_KEY = "fixedCosts";
  const DEFAULT_FIXED_COST_FREQUENCY = "monthly";

  function readJson(key, fallbackValue) {
    const savedValue = localStorage.getItem(key);
    if (savedValue === null) {
      return fallbackValue;
    }

    try {
      return JSON.parse(savedValue);
    } catch (error) {
      console.error(`${key} の読み込みに失敗しました。`, error);
      return fallbackValue;
    }
  }

  function loadBudgets() {
    const budgets = readJson(BUDGET_STORAGE_KEY, {});
    return budgets && typeof budgets === "object" && !Array.isArray(budgets) ? budgets : {};
  }

  function saveBudget(month, amount) {
    const budgets = loadBudgets();
    budgets[month] = amount;
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
    return amount;
  }

  function loadBudget(month) {
    const amount = Number(loadBudgets()[month]);
    return Number.isSafeInteger(amount) && amount >= 0 ? amount : 0;
  }

  function normalizeFixedCost(fixedCost) {
    return {
      ...fixedCost,
      frequency: typeof fixedCost.frequency === "string"
        ? fixedCost.frequency
        : DEFAULT_FIXED_COST_FREQUENCY
    };
  }

  function loadFixedCosts() {
    const fixedCosts = readJson(FIXED_COST_STORAGE_KEY, []);
    if (!Array.isArray(fixedCosts)) {
      return [];
    }
    return fixedCosts
      .filter((item) => item && typeof item === "object")
      .map(normalizeFixedCost);
  }

  function saveFixedCosts(fixedCosts) {
    localStorage.setItem(FIXED_COST_STORAGE_KEY, JSON.stringify(fixedCosts));
    return fixedCosts;
  }

  function appendFixedCosts(fixedCostDataList) {
    const fixedCosts = loadFixedCosts();
    let nextId = fixedCosts.reduce(
      (largestId, item) => Math.max(largestId, Number(item.id) || 0),
      0
    ) + 1;
    const additions = fixedCostDataList.map((fixedCostData) => ({
      id: nextId++,
      ...fixedCostData
    }));
    return saveFixedCosts([...fixedCosts, ...additions]);
  }

  global.FinanceStorage = Object.freeze({
    loadBudget,
    saveBudget,
    loadFixedCosts,
    saveFixedCosts,
    appendFixedCosts
  });
}(window));
