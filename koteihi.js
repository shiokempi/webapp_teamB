// ========================================
// 初期設定
// ========================================

const FIXED_COST_STORAGE_KEY = "fixedCosts";
const FIXED_COST_CATEGORY_STORAGE_KEY = "fixedCostCategories";

// 【カテゴリの編集箇所】まだカテゴリを保存していない場合の初期選択肢。
// 別ページで編集した後は localStorage の fixedCostCategories が優先される。
const DEFAULT_FIXED_COST_CATEGORIES = [
  "住居費",
  "水道光熱費",
  "通信費",
  "サブスク",
  "保険料",
  "その他"
];

// value は保存用の値、label は画面の表示名。この順番で一覧も並べる。
const FIXED_COST_FREQUENCIES = [
  { value: "daily", label: "毎日" },
  { value: "weekly", label: "毎週" },
  { value: "monthly", label: "毎月" },
  { value: "yearly", label: "毎年" }
];
const DEFAULT_FIXED_COST_FREQUENCY = "monthly";

// 新しい固定費の保存例：
// { id: 1, category: "サブスク", amount: 980, frequency: "monthly" }
// frequency は設定として保存するだけで、通常の収支への自動反映は行わない。

const fixedCostForm = document.getElementById("fixed-cost-form");
const amountInput = document.getElementById("fixed-cost-amount");
const categoryInput = document.getElementById("fixed-cost-category");
const frequencyInput = document.getElementById("fixed-cost-frequency");
const submitButton = document.getElementById("fixed-cost-submit");
const errorMessage = document.getElementById("fixed-cost-error");
const fixedCostList = document.getElementById("fixed-cost-list");
const fixedCostTotals = document.getElementById("fixed-cost-totals");

let fixedCosts = loadFixedCosts();
let editingFixedCostId = null;

// ========================================
// カテゴリの取得と別ページからの編集方法
// ========================================

/*
【将来のカテゴリ編集ページとの連携】
編集する項目：カテゴリ名の配列（追加・名前変更・削除・並べ替え）。
保存キー："fixedCostCategories"
保存形式：["住居費", "通信費", "サブスク", "習い事"]

以下の関数をカテゴリ編集ページの JavaScript にコピーして使用できます。
koteihi.js はこの画面のDOMを使うため、別ページから直接読み込まないでください。

function saveEditedCategories(editedNames) {
  const categories = [...new Set(
    editedNames.map((name) => name.trim()).filter((name) => name !== "")
  )];
  localStorage.setItem("fixedCostCategories", JSON.stringify(categories));
}

// 編集ページで編集した全カテゴリを渡す（保存時の例）：
// const editedNames = ["住居費", "通信費", "サブスク"];
// editedNames.push("習い事"); // カテゴリの追加
// saveEditedCategories(editedNames);

初期一覧が必要なら DEFAULT_FIXED_COST_CATEGORIES を編集ページでも共有し、
JSON.parse(localStorage.getItem("fixedCostCategories")) が null のときに使います。
空配列 [] は「選択肢なし」として扱います。保存失敗時の案内は編集ページ側で行ってください。
この画面に戻るか、別タブで保存すると選択肢を再読込します。
同じ画面内に編集機能を組み込む場合は、保存後に renderFixedCostCategoryOptions() を呼びます。

注意：カテゴリ名は固定費にも文字列で保存されています。
選択肢の名前変更・削除だけでは、登録済み固定費のカテゴリは書き換えません。
登録済みのカテゴリは一覧に残し、固定費の編集時にも選べるようにしています。
*/

// 保存済みの選択肢を優先し、空白と重複を取り除く
function loadFixedCostCategories() {
  try {
    const savedCategories = localStorage.getItem(FIXED_COST_CATEGORY_STORAGE_KEY);
    if (savedCategories === null) {
      return [...DEFAULT_FIXED_COST_CATEGORIES];
    }

    const categories = JSON.parse(savedCategories);
    if (!Array.isArray(categories) || !categories.every((name) => typeof name === "string")) {
      return [...DEFAULT_FIXED_COST_CATEGORIES];
    }

    return [...new Set(categories.map((name) => name.trim()).filter(Boolean))];
  } catch (error) {
    console.error("カテゴリの読み込みに失敗しました。", error);
    return [...DEFAULT_FIXED_COST_CATEGORIES];
  }
}

// 選択中の値を保ちながら、カテゴリの選択肢を更新する
function renderFixedCostCategoryOptions(selectedCategory = categoryInput.value) {
  const categories = loadFixedCostCategories();
  const editingFixedCost = fixedCosts.find((item) => Number(item.id) === editingFixedCostId);

  // 選択肢から削除されたカテゴリも、その固定費の編集時だけは保持する。
  if (editingFixedCost && !categories.includes(editingFixedCost.category)) {
    categories.push(editingFixedCost.category);
  }
// 選択肢の順番は保存済みの順番を優先し、最後に追加されたカテゴリを末尾に置く。
  categoryInput.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = categories.length === 0 ? "カテゴリが未設定です" : "カテゴリ";
  categoryInput.appendChild(placeholder);

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryInput.appendChild(option);
  });

  categoryInput.value = categories.includes(selectedCategory) ? selectedCategory : "";
}

// ========================================
// 頻度の選択肢を設定
// ========================================

function renderFixedCostFrequencyOptions() {
  frequencyInput.replaceChildren();
  FIXED_COST_FREQUENCIES.forEach((frequency) => {
    const option = document.createElement("option");
    option.value = frequency.value;
    option.textContent = frequency.label;
    option.defaultSelected = frequency.value === DEFAULT_FIXED_COST_FREQUENCY;
    frequencyInput.appendChild(option);
  });
  frequencyInput.value = DEFAULT_FIXED_COST_FREQUENCY;
}

// 以前の固定費には frequency がないため、従来どおり「毎月」として扱う
function getFixedCostFrequency(fixedCost) {
  return FIXED_COST_FREQUENCIES.find((frequency) => frequency.value === fixedCost.frequency)
    || FIXED_COST_FREQUENCIES.find((frequency) => frequency.value === DEFAULT_FIXED_COST_FREQUENCY);
}

// ========================================
// localStorageから固定費を取得
// ========================================

// 保存済みの固定費を配列として取得する
function loadFixedCosts() {
  return FinanceStorage.loadFixedCosts().map((fixedCost) => ({
    ...fixedCost,
    frequency: getFixedCostFrequency(fixedCost).value
  }));
}

// ========================================
// localStorageへ固定費を保存
// ========================================

// 保存に成功してから画面用のデータを更新し、保存失敗時の食い違いを防ぐ
function saveFixedCosts(nextFixedCosts) {
  try {
    FinanceStorage.saveFixedCosts(nextFixedCosts);
    fixedCosts = nextFixedCosts;
    return true;
  } catch (error) {
    errorMessage.textContent = "保存できませんでした。ブラウザの保存設定や空き容量を確認してください。";
    console.error("固定費データの保存に失敗しました。", error);
    return false;
  }
}

// ========================================
// 固定費の新規登録
// ========================================

// 既存のIDと重ならない新しいIDを作る
function createFixedCostId() {
  return fixedCosts.reduce((largestId, item) => Math.max(largestId, Number(item.id) || 0), 0) + 1;
}

// 入力内容を新しい固定費として登録する
function addFixedCost(fixedCostData) {
  const newFixedCost = {
    id: createFixedCostId(),
    ...fixedCostData
  };

  // 同じカテゴリ・金額・頻度の登録も許可する。
  if (!saveFixedCosts([...fixedCosts, newFixedCost])) {
    return;
  }

  resetFixedCostForm();
  renderFixedCosts();
}

// ========================================
// 固定費を頻度順に並び替え
// ========================================

// 毎日 → 毎週 → 毎月 → 毎年。同じ頻度は元の登録順を保つ。
function sortFixedCostsByFrequency(costs) {
  const frequencyOrder = FIXED_COST_FREQUENCIES.map((frequency) => frequency.value);
  return [...costs].sort((firstCost, secondCost) => (
    frequencyOrder.indexOf(getFixedCostFrequency(firstCost).value)
    - frequencyOrder.indexOf(getFixedCostFrequency(secondCost).value)
  ));
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

  const sortedFixedCosts = sortFixedCostsByFrequency(fixedCosts);

  sortedFixedCosts.forEach((fixedCost) => {
    const item = document.createElement("article");
    item.className = "fixed-cost-item";

    const category = document.createElement("h3");
    category.className = "fixed-cost-category-name";
    category.textContent = fixedCost.category;

    const details = document.createElement("p");
    details.className = "fixed-cost-details";
    details.textContent = `${Number(fixedCost.amount).toLocaleString("ja-JP")}円 / ${getFixedCostFrequency(fixedCost).label}`;

    const actions = document.createElement("div");
    actions.className = "fixed-cost-actions";
    actions.append(
      createActionButton("編集", "fixed-cost-button fixed-cost-edit", fixedCost.id, startEditFixedCost),
      createActionButton("削除", "fixed-cost-button fixed-cost-delete", fixedCost.id, deleteFixedCost)
    );

    item.append(category, details, actions);
    fixedCostList.appendChild(item);
  });

  calculateFixedCostTotal();
}

// ========================================
// 固定費合計を頻度別に計算
// ========================================

// 頻度の違う金額は足し合わせず、月額・年額への換算もしない
function calculateFixedCostTotal() {
  const totals = Object.fromEntries(FIXED_COST_FREQUENCIES.map((frequency) => [frequency.value, 0]));
  fixedCosts.forEach((fixedCost) => {
    totals[getFixedCostFrequency(fixedCost).value] += Number(fixedCost.amount) || 0;
  });

  fixedCostTotals.replaceChildren();
  FIXED_COST_FREQUENCIES.forEach((frequency) => {
    const group = document.createElement("div");
    const label = document.createElement("dt");
    const amount = document.createElement("dd");
    label.textContent = frequency.label;
    amount.textContent = `${totals[frequency.value].toLocaleString("ja-JP")}円`;
    group.append(label, amount);
    fixedCostTotals.appendChild(group);
  });
  return totals;
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
  amountInput.value = fixedCost.amount;
  renderFixedCostCategoryOptions(fixedCost.category);
  frequencyInput.value = getFixedCostFrequency(fixedCost).value;
  submitButton.textContent = "更新";
  errorMessage.textContent = "";
  categoryInput.focus();
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

  const updatedFixedCosts = fixedCosts.map((fixedCost, index) => (
    index === fixedCostIndex ? { ...fixedCost, ...fixedCostData } : fixedCost
  ));

  if (!saveFixedCosts(updatedFixedCosts)) {
    return;
  }
  resetFixedCostForm();
  renderFixedCosts();
}

// フォームを新規登録の状態へ戻す
function resetFixedCostForm() {
  fixedCostForm.reset();
  editingFixedCostId = null;
  renderFixedCostCategoryOptions("");
  frequencyInput.value = DEFAULT_FIXED_COST_FREQUENCY;
  submitButton.textContent = "追加";
  errorMessage.textContent = "";
}

// ========================================
// 固定費の削除
// ========================================

// 選択した固定費を確認なしで削除する
function deleteFixedCost(event) {
  const fixedCostId = Number(event.currentTarget.dataset.fixedCostId);
  const remainingFixedCosts = fixedCosts.filter(
    (fixedCost) => Number(fixedCost.id) !== fixedCostId
  );

  if (!saveFixedCosts(remainingFixedCosts)) {
    return;
  }

  if (editingFixedCostId === fixedCostId) {
    resetFixedCostForm();
  }

  errorMessage.textContent = "";
  renderFixedCosts();
}

// ========================================
// 入力値チェック
// ========================================

// フォームの値を確認し、利用できるデータへ変換する
function validateFixedCost() {
  const amount = Number(amountInput.value);
  const category = categoryInput.value.trim();
  const frequency = frequencyInput.value;

  if (!FIXED_COST_FREQUENCIES.some((item) => item.value === frequency)) {
    return { isValid: false, message: "頻度を選択してください。", input: frequencyInput };
  }

  if (category === "") {
    return { isValid: false, message: "カテゴリを選択してください。", input: categoryInput };
  }

  if (amountInput.value === "" || !Number.isSafeInteger(amount) || amount < 1) {
    return { isValid: false, message: "金額は1円以上の整数で入力してください（大きすぎる金額は登録できません）。", input: amountInput };
  }

  return {
    isValid: true,
    data: { category, amount, frequency }
  };
}

// ========================================
// イベント設定と初回表示
// ========================================

// 登録と更新で共通の送信処理
fixedCostForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const validationResult = validateFixedCost();

  if (!validationResult.isValid) {
    errorMessage.textContent = validationResult.message;
    validationResult.input.focus();
    return;
  }

  if (editingFixedCostId === null) {
    addFixedCost(validationResult.data);
  } else {
    updateFixedCost(validationResult.data);
  }
});

// 別ページから戻ったとき・別タブでカテゴリを保存したときに選択肢を更新する
window.addEventListener("pageshow", () => renderFixedCostCategoryOptions());
window.addEventListener("storage", (event) => {
  if (event.storageArea === localStorage && (event.key === FIXED_COST_CATEGORY_STORAGE_KEY || event.key === null)) {
    renderFixedCostCategoryOptions();
  }
});

renderFixedCostFrequencyOptions();
renderFixedCostCategoryOptions();
renderFixedCosts();
