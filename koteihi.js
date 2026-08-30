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

// ★連携追加: index.html 側から参照できるようにグローバル(window)へセット
window.fixedCosts = fixedCosts;

// ========================================
// カテゴリの取得と別ページからの編集方法
// ========================================

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
function renderFixedCostCategoryOptions(selectedCategory = categoryInput ? categoryInput.value : "") {
  if (!categoryInput) return;
  const categories = loadFixedCostCategories();
  const editingFixedCost = fixedCosts.find((item) => Number(item.id) === editingFixedCostId);

  // 選択肢から削除されたカテゴリも、その固定費の編集時だけは保持する。
  if (editingFixedCost && !categories.includes(editingFixedCost.category)) {
    categories.push(editingFixedCost.category);
  }

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
  if (!frequencyInput) return;
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
  try {
    const savedFixedCosts = localStorage.getItem(FIXED_COST_STORAGE_KEY);
    if (savedFixedCosts === null) {
      return [];
    }
    const parsedFixedCosts = JSON.parse(savedFixedCosts);
    if (!Array.isArray(parsedFixedCosts)) {
      return [];
    }

    return parsedFixedCosts.filter((item) => item && typeof item === "object").map((fixedCost) => ({
      ...fixedCost,
      frequency: getFixedCostFrequency(fixedCost).value
    }));
  } catch (error) {
    console.error("固定費データの読み込みに失敗しました。", error);
    return [];
  }
}

// ========================================
// localStorageへ固定費を保存
// ========================================

// 保存に成功してから画面用のデータを更新し、保存失敗時の食い違いを防ぐ
function saveFixedCosts(nextFixedCosts) {
  try {
    localStorage.setItem(FIXED_COST_STORAGE_KEY, JSON.stringify(nextFixedCosts));
    fixedCosts = nextFixedCosts;
    
    // ★連携追加: グローバル変数にも常に最新状態を反映させる
    window.fixedCosts = fixedCosts;

    // ★連携追加: index.html 側の再描画関数(グラフ・予算・カレンダー等)を実行
    if (typeof refreshAllViews === "function") {
      refreshAllViews();
    }

    return true;
  } catch (error) {
    if (errorMessage) {
      errorMessage.textContent = "保存できませんでした。ブラウザの保存設定や空き容量を確認してください。";
    }
    console.error("固定費データの保存に失敗しました。", error);
    return false;
  }
}

// ========================================
// 固定費の新規登録
// ========================================

function createFixedCostId() {
  return fixedCosts.reduce((largestId, item) => Math.max(largestId, Number(item.id) || 0), 0) + 1;
}

function addFixedCost(fixedCostData) {
  const newFixedCost = {
    id: createFixedCostId(),
    ...fixedCostData
  };

  if (!saveFixedCosts([...fixedCosts, newFixedCost])) {
    return;
  }

  resetFixedCostForm();
  renderFixedCosts();
}

// ========================================
// 固定費を頻度順に並び替え
// ========================================

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

function createActionButton(label, className, fixedCostId, clickHandler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.dataset.fixedCostId = fixedCostId;
  button.addEventListener("click", clickHandler);
  return button;
}

function renderFixedCosts() {
  if (!fixedCostList) return;
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

function calculateFixedCostTotal() {
  if (!fixedCostTotals) return;
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

function startEditFixedCost(event) {
  const fixedCostId = Number(event.currentTarget.dataset.fixedCostId);
  const fixedCost = fixedCosts.find((item) => Number(item.id) === fixedCostId);

  if (!fixedCost) return;

  editingFixedCostId = fixedCostId;
  if (amountInput) amountInput.value = fixedCost.amount;
  renderFixedCostCategoryOptions(fixedCost.category);
  if (frequencyInput) frequencyInput.value = getFixedCostFrequency(fixedCost).value;
  if (submitButton) submitButton.textContent = "更新";
  if (errorMessage) errorMessage.textContent = "";
  if (categoryInput) categoryInput.focus();
  if (fixedCostForm) fixedCostForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

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

function resetFixedCostForm() {
  if (fixedCostForm) fixedCostForm.reset();
  editingFixedCostId = null;
  renderFixedCostCategoryOptions("");
  if (frequencyInput) frequencyInput.value = DEFAULT_FIXED_COST_FREQUENCY;
  if (submitButton) submitButton.textContent = "追加";
  if (errorMessage) errorMessage.textContent = "";
}

// ========================================
// 固定費の削除
// ========================================

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

  if (errorMessage) errorMessage.textContent = "";
  renderFixedCosts();
}

// ========================================
// 入力値チェック
// ========================================

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

if (fixedCostForm) {
  fixedCostForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const validationResult = validateFixedCost();

    if (!validationResult.isValid) {
      if (errorMessage) errorMessage.textContent = validationResult.message;
      if (validationResult.input) validationResult.input.focus();
      return;
    }

    if (editingFixedCostId === null) {
      addFixedCost(validationResult.data);
    } else {
      updateFixedCost(validationResult.data);
    }
  });
}

window.addEventListener("pageshow", () => renderFixedCostCategoryOptions());
window.addEventListener("storage", (event) => {
  if (event.storageArea === localStorage && (event.key === FIXED_COST_CATEGORY_STORAGE_KEY || event.key === null)) {
    renderFixedCostCategoryOptions();
  }
});

renderFixedCostFrequencyOptions();
renderFixedCostCategoryOptions();
renderFixedCosts();

// 初回読み込み時にもメインの表示更新を実行
if (typeof refreshAllViews === "function") {
  refreshAllViews();
}