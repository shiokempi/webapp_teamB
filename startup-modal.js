// ========================================
// 初回起動判定
// ========================================

(function initializeStartupModal() {
  "use strict";

  const INITIAL_SETUP_KEY = "initialSetupCompleted";
  const modal = document.getElementById("startup-modal");
  if (!modal || localStorage.getItem(INITIAL_SETUP_KEY) === "true") {
    return;
  }

  const budgetInput = document.getElementById("startup-budget");
  const budgetError = document.getElementById("startup-budget-error");
  const fixedCostForm = document.getElementById("startup-fixed-cost-form");
  const categoryInput = document.getElementById("startup-fixed-cost-category");
  const amountInput = document.getElementById("startup-fixed-cost-amount");
  const frequencyInput = document.getElementById("startup-fixed-cost-frequency");
  const fixedCostError = document.getElementById("startup-fixed-cost-error");
  const fixedCostList = document.getElementById("startup-fixed-cost-list");
  const completeButton = document.getElementById("startup-complete");
  const pendingFixedCosts = [];

  const frequencies = [
    { value: "daily", label: "毎日" },
    { value: "weekly", label: "毎週" },
    { value: "monthly", label: "毎月" },
    { value: "yearly", label: "毎年" }
  ];
  const defaultCategories = ["住居費", "水道光熱費", "通信費", "サブスク", "保険料", "その他"];

  // ========================================
  // 初期設定popupの表示・終了
  // ========================================

  function showModal() {
    const selectedMonth = document.getElementById("month-select").value;
    budgetInput.value = FinanceStorage.loadBudget(selectedMonth);
    modal.hidden = false;
    document.body.classList.add("startup-modal-open");
    budgetInput.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("startup-modal-open");
  }

  // ========================================
  // popup内の固定費一時登録
  // ========================================

  function loadCategories() {
    try {
      const saved = localStorage.getItem("fixedCostCategories");
      if (saved === null) return defaultCategories;
      const categories = JSON.parse(saved);
      return Array.isArray(categories)
        ? [...new Set(categories.filter((name) => typeof name === "string").map((name) => name.trim()).filter(Boolean))]
        : defaultCategories;
    } catch (error) {
      console.error("固定費カテゴリを読み込めませんでした。", error);
      return defaultCategories;
    }
  }

  function renderOptions() {
    loadCategories().forEach((category) => categoryInput.add(new Option(category, category)));
    frequencies.forEach((frequency) => frequencyInput.add(new Option(frequency.label, frequency.value)));
    frequencyInput.value = "monthly";
  }

  function renderPendingFixedCosts() {
    fixedCostList.replaceChildren();
    if (pendingFixedCosts.length === 0) {
      const empty = document.createElement("li");
      empty.className = "startup-fixed-cost-empty";
      empty.textContent = "固定費は未登録です（登録なしでも完了できます）";
      fixedCostList.appendChild(empty);
      return;
    }

    pendingFixedCosts.forEach((fixedCost, index) => {
      const item = document.createElement("li");
      const frequency = frequencies.find((entry) => entry.value === fixedCost.frequency);
      item.textContent = `${fixedCost.category}：${fixedCost.amount.toLocaleString("ja-JP")}円 / ${frequency.label}`;
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "削除";
      removeButton.addEventListener("click", () => {
        pendingFixedCosts.splice(index, 1);
        renderPendingFixedCosts();
      });
      item.appendChild(removeButton);
      fixedCostList.appendChild(item);
    });
  }

  fixedCostForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(amountInput.value);
    if (categoryInput.value === "") {
      fixedCostError.textContent = "カテゴリを選択してください。";
      categoryInput.focus();
      return;
    }
    if (!Number.isSafeInteger(amount) || amount < 1) {
      fixedCostError.textContent = "金額は1円以上の整数で入力してください。";
      amountInput.focus();
      return;
    }
    pendingFixedCosts.push({ category: categoryInput.value, amount, frequency: frequencyInput.value });
    fixedCostForm.reset();
    frequencyInput.value = "monthly";
    fixedCostError.textContent = "";
    renderPendingFixedCosts();
  });

  // ========================================
  // 初期設定完了処理
  // ========================================

  completeButton.addEventListener("click", () => {
    const selectedMonth = document.getElementById("month-select").value;
    const budgetResult = BudgetService.saveBudget(selectedMonth, budgetInput.value);
    if (!budgetResult.isValid) {
      budgetError.textContent = budgetResult.message;
      budgetInput.focus();
      return;
    }

    try {
      FinanceStorage.appendFixedCosts(pendingFixedCosts);
      localStorage.setItem(INITIAL_SETUP_KEY, "true");
    } catch (error) {
      fixedCostError.textContent = "設定を保存できませんでした。ブラウザの保存設定を確認してください。";
      console.error("初期設定を保存できませんでした。", error);
      return;
    }

    const normalBudgetInput = document.getElementById("budget-input");
    normalBudgetInput.value = budgetResult.amount;
    normalBudgetInput.dispatchEvent(new Event("input"));
    closeModal();
  });

  renderOptions();
  renderPendingFixedCosts();
  showModal();
}());
