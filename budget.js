// ========================================
// 予算画面の初期設定
// ========================================

const sampleTransactions = [
  { id: 1, type: "expense", amount: 1200, category: "食費", date: "2026-08-17", memo: "昼食" },
  { id: 2, type: "income", amount: 50000, category: "給与", date: "2026-08-15", memo: "バイト" },
  { id: 3, type: "expense", amount: 45000, category: "家賃", date: "2026-08-01", memo: "8月分" },
  { id: 4, type: "expense", amount: 32000, category: "食費", date: "2026-07-28", memo: "先月分" }
];

const monthSelect = document.getElementById("month-select");
const budgetInput = document.getElementById("budget-input");
const budgetError = document.getElementById("budget-error");
const displayBudget = document.getElementById("display-budget");
const displayExpense = document.getElementById("display-expense");
const displayRemaining = document.getElementById("display-remaining");
const meterFill = document.getElementById("meter-fill");
const meterPercentage = document.getElementById("meter-percentage");

// ========================================
// 予算入力の検証・保存（通常画面とpopupで共用）
// ========================================

function validateBudgetValue(rawValue) {
  const amount = Number(rawValue);
  if (rawValue === "" || !Number.isSafeInteger(amount) || amount < 0) {
    return { isValid: false, message: "予算は0円以上の整数で入力してください。" };
  }
  return { isValid: true, amount };
}

function saveBudget(month, rawValue) {
  const validation = validateBudgetValue(rawValue);
  if (!validation.isValid) {
    return validation;
  }

  try {
    FinanceStorage.saveBudget(month, validation.amount);
    return validation;
  } catch (error) {
    console.error("予算を保存できませんでした。", error);
    return { isValid: false, message: "予算を保存できませんでした。ブラウザの保存設定を確認してください。" };
  }
}

window.BudgetService = Object.freeze({ validateBudgetValue, saveBudget });

// ========================================
// 予算メーターの表示更新
// ========================================

function updateDashboard() {
  const selectedMonth = monthSelect.value;
  const budget = Number(budgetInput.value) || 0;
  const totalExpense = sampleTransactions
    .filter((item) => item.type === "expense" && item.date.startsWith(selectedMonth))
    .reduce((sum, item) => sum + item.amount, 0);
  const remaining = budget - totalExpense;
  const usageRatio = budget > 0 ? (totalExpense / budget) * 100 : 0;

  displayBudget.textContent = `¥${budget.toLocaleString()}`;
  displayExpense.textContent = `¥${totalExpense.toLocaleString()}`;
  displayRemaining.textContent = `¥${remaining.toLocaleString()}`;
  displayRemaining.style.color = remaining < 0 ? "#e53e3e" : "#2b2b2b";
  meterFill.style.width = `${Math.min(usageRatio, 100)}%`;
  meterPercentage.textContent = `${Math.round(usageRatio)}%`;
  meterFill.classList.remove("warning", "danger");
  if (usageRatio >= 100) meterFill.classList.add("danger");
  else if (usageRatio >= 80) meterFill.classList.add("warning");
}

function loadSelectedMonthBudget() {
  budgetInput.value = FinanceStorage.loadBudget(monthSelect.value);
  budgetError.textContent = "";
  updateDashboard();
}

monthSelect.addEventListener("change", loadSelectedMonthBudget);
budgetInput.addEventListener("input", () => {
  updateDashboard();
  const result = saveBudget(monthSelect.value, budgetInput.value);
  budgetError.textContent = result.isValid ? "" : result.message;
});

loadSelectedMonthBudget();
