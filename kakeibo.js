// 他のメンバーが管理する想定のデータ
const sampleTransactions = [
  { id: 1, type: "expense", amount: 1200, category: "食費", date: "2026-08-17", memo: "昼食" },
  { id: 2, type: "income", amount: 50000, category: "給与", date: "2026-08-15", memo: "バイト" },
  { id: 3, type: "expense", amount: 45000, category: "家賃", date: "2026-08-01", memo: "8月分" },
  { id: 4, type: "expense", amount: 32000, category: "食費", date: "2026-07-28", memo: "先月分" } // 対象外の月
];

// DOM要素の取得
const monthSelect = document.getElementById("month-select");
const budgetInput = document.getElementById("budget-input");

const displayBudget = document.getElementById("display-budget");
const displayExpense = document.getElementById("display-expense");
const displayRemaining = document.getElementById("display-remaining");

const meterFill = document.getElementById("meter-fill");
const meterPercentage = document.getElementById("meter-percentage");

// --- メイン処理関数 ---
function updateDashboard() {
  const selectedMonth = monthSelect.value; // 例: "2026-08"
  const budget = Number(budgetInput.value) || 0;

  // 1. 選択された月の「支出(expense)」のみを合計
  const totalExpense = sampleTransactions
    .filter(item => item.type === "expense" && item.date.startsWith(selectedMonth))
    .reduce((sum, item) => sum + item.amount, 0);

  // 2. 残額計算
  const remaining = budget - totalExpense;

  // 3. 割合計算（0〜100%以上に制限なしで計算し、表示用に保持）
  const usageRatio = budget > 0 ? (totalExpense / budget) * 100 : 0;

  // --- 画面表示の更新 ---
  displayBudget.textContent = `¥${budget.toLocaleString()}`;
  displayExpense.textContent = `¥${totalExpense.toLocaleString()}`;
  displayRemaining.textContent = `¥${remaining.toLocaleString()}`;

  // 残額がマイナスなら赤字表示にする装飾調整
  displayRemaining.style.color = remaining < 0 ? "#e53e3e" : "#2b2b2b";

  // --- メーターの更新 ---
  // 幅は最大100%でストップ
  const fillWidth = Math.min(usageRatio, 100);
  meterFill.style.width = `${fillWidth}%`;
  meterPercentage.textContent = `${Math.round(usageRatio)}%`;

  // メーターの色を危険度に合わせて変更
  meterFill.classList.remove("warning", "danger");
  if (usageRatio >= 100) {
    meterFill.classList.add("danger");
  } else if (usageRatio >= 80) {
    meterFill.classList.add("warning");
  }
}

// イベントリスナー（月変更・予算入力時に即時反映）
monthSelect.addEventListener("change", updateDashboard);
budgetInput.addEventListener("input", updateDashboard);

// 初回実行
updateDashboard();