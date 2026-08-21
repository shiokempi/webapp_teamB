// ========================================
// 初期設定
// ========================================

const FIXED_COST_STORAGE_KEY = "fixedCosts";

const fixedCostForm = document.getElementById("fixed-cost-form");
const nameInput = document.getElementById("fixed-cost-name");
const amountInput = document.getElementById("fixed-cost-amount");
const categoryInput = document.getElementById("fixed-cost-category");
const paymentDayInput = document.getElementById("fixed-cost-payment-day");
const submitButton = document.getElementById("fixed-cost-submit");
const errorMessage = document.getElementById("fixed-cost-error");
const fixedCostList = document.getElementById("fixed-cost-list");
const fixedCostTotal = document.getElementById("fixed-cost-total");

let fixedCosts = loadFixedCosts();
let editingFixedCostId = null;

// ========================================
// localStorageから固定費を取得
// ========================================

// 保存済みの固定費を配列として取得する
function loadFixedCosts() {
  const savedFixedCosts = localStorage.getItem(FIXED_COST_STORAGE_KEY);

  if (savedFixedCosts === null) {
    return [];
  }

  try {
    const parsedFixedCosts = JSON.parse(savedFixedCosts);
    return Array.isArray(parsedFixedCosts) ? parsedFixedCosts : [];
  } catch (error) {
    console.error("固定費データの読み込みに失敗しました。", error);
    return [];
  }
}

// ========================================
// localStorageへ固定費を保存
// ========================================

// 現在の固定費データを保存する
function saveFixedCosts() {
  localStorage.setItem(FIXED_COST_STORAGE_KEY, JSON.stringify(fixedCosts));
}

// ========================================
// 固定費の新規登録
// ========================================

// 既存のIDと重ならない新しいIDを作る
function createFixedCostId() {
  const ids = fixedCosts.map((fixedCost) => Number(fixedCost.id) || 0);
  return ids.length === 0 ? 1 : Math.max(...ids) + 1;
}

// 入力内容を新しい固定費として登録する
function addFixedCost(fixedCostData) {
  fixedCosts.push({
    id: createFixedCostId(),
    ...fixedCostData
  });

  saveFixedCosts();
  resetFixedCostForm();
  renderFixedCosts();
}

// ========================================
// 固定費を支払日順に並び替え
// ========================================

// 元の配列を変更せず、支払日の早い順にした配列を返す
function sortFixedCostsByPaymentDay(costs) {
  return [...costs].sort(
    (firstCost, secondCost) => Number(firstCost.paymentDay) - Number(secondCost.paymentDay)
  );
}

// ========================================
// 固定費一覧を表示
// ========================================

// 一覧内のボタンを作る
function createActionButton(label, className, fixedCostId, clickHandler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.dataset.fixedCostId = fixedCostId;
  button.addEventListener("click", clickHandler);
  return button;
}

// 登録されている固定費を画面に表示する
function renderFixedCosts() {
  fixedCostList.replaceChildren();

  if (fixedCosts.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "fixed-cost-empty";
    emptyMessage.textContent = "登録されている固定費はありません。";
    fixedCostList.appendChild(emptyMessage);
    calculateFixedCostTotal();
    return;
  }

  const sortedFixedCosts = sortFixedCostsByPaymentDay(fixedCosts);

  sortedFixedCosts.forEach((fixedCost) => {
    const item = document.createElement("article");
    item.className = "fixed-cost-item";

    const name = document.createElement("h3");
    name.className = "fixed-cost-name";
    name.textContent = fixedCost.name || "名前なし";

    const details = document.createElement("p");
    details.className = "fixed-cost-details";
    details.textContent = `${Number(fixedCost.amount).toLocaleString("ja-JP")}円 / ${fixedCost.category} / 毎月${fixedCost.paymentDay}日`;

    const actions = document.createElement("div");
    actions.className = "fixed-cost-actions";
    actions.append(
      createActionButton("編集", "fixed-cost-button fixed-cost-edit", fixedCost.id, startEditFixedCost),
      createActionButton("削除", "fixed-cost-button fixed-cost-delete", fixedCost.id, deleteFixedCost)
    );

    item.append(name, details, actions);
    fixedCostList.appendChild(item);
  });

  calculateFixedCostTotal();
}

// ========================================
// 固定費合計を計算
// ========================================

// 固定費の合計を計算して画面へ表示する
function calculateFixedCostTotal() {
  const total = fixedCosts.reduce(
    (sum, fixedCost) => sum + (Number(fixedCost.amount) || 0),
    0
  );

  fixedCostTotal.textContent = `${total.toLocaleString("ja-JP")}円`;
  return total;
}

// ========================================
// 固定費の編集
// ========================================

// 選択した固定費をフォームへ戻し、編集状態にする
function startEditFixedCost(event) {
  const fixedCostId = Number(event.currentTarget.dataset.fixedCostId);
  const fixedCost = fixedCosts.find((item) => Number(item.id) === fixedCostId);

  if (!fixedCost) {
    return;
  }

  editingFixedCostId = fixedCostId;
  nameInput.value = fixedCost.name || "";
  amountInput.value = fixedCost.amount;
  categoryInput.value = fixedCost.category;
  paymentDayInput.value = fixedCost.paymentDay;
  submitButton.textContent = "更新";
  errorMessage.textContent = "";
  nameInput.focus();
  fixedCostForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

// 編集中の固定費を入力内容で更新する
function updateFixedCost(fixedCostData) {
  const fixedCostIndex = fixedCosts.findIndex(
    (fixedCost) => Number(fixedCost.id) === editingFixedCostId
  );

  if (fixedCostIndex === -1) {
    resetFixedCostForm();
    return;
  }

  fixedCosts[fixedCostIndex] = {
    ...fixedCosts[fixedCostIndex],
    ...fixedCostData
  };

  saveFixedCosts();
  resetFixedCostForm();
  renderFixedCosts();
}

// フォームを新規登録の状態へ戻す
function resetFixedCostForm() {
  fixedCostForm.reset();
  editingFixedCostId = null;
  submitButton.textContent = "追加";
  errorMessage.textContent = "";
}

// ========================================
// 固定費の削除
// ========================================

// 選択した固定費を確認なしで削除する
function deleteFixedCost(event) {
  const fixedCostId = Number(event.currentTarget.dataset.fixedCostId);
  fixedCosts = fixedCosts.filter(
    (fixedCost) => Number(fixedCost.id) !== fixedCostId
  );

  if (editingFixedCostId === fixedCostId) {
    resetFixedCostForm();
  }

  saveFixedCosts();
  renderFixedCosts();
}

// ========================================
// 入力値チェック
// ========================================

// フォームの値を確認し、利用できるデータへ変換する
function validateFixedCost() {
  const name = nameInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value.trim();
  const paymentDay = Number(paymentDayInput.value);

  if (amountInput.value === "" || !Number.isInteger(amount) || amount < 1) {
    return { isValid: false, message: "金額は1円以上の整数で入力してください。" };
  }

  if (category === "") {
    return { isValid: false, message: "カテゴリを入力してください。" };
  }

  if (
    paymentDayInput.value === "" ||
    !Number.isInteger(paymentDay) ||
    paymentDay < 1 ||
    paymentDay > 31
  ) {
    return { isValid: false, message: "支払日は1〜31の整数で入力してください。" };
  }

  return {
    isValid: true,
    data: { name, amount, category, paymentDay }
  };
}

// 登録と更新で共通の送信処理
fixedCostForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const validationResult = validateFixedCost();

  if (!validationResult.isValid) {
    errorMessage.textContent = validationResult.message;
    return;
  }

  if (editingFixedCostId === null) {
    addFixedCost(validationResult.data);
  } else {
    updateFixedCost(validationResult.data);
  }
});

// ページを開いたときに保存済みの固定費を表示する
renderFixedCosts();
