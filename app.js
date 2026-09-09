const meals = [
  { date: "2026-09-09", type: "중식", time: "12:20 - 13:10", title: "건강한 한 끼", items: ["현미밥", "소고기미역국", "제육볶음", "상추쌈·쌈장", "배추김치"], kcal: "734 kcal", origin: "돼지고기 국내산" },
  { date: "2026-09-09", type: "석식", time: "17:30 - 18:20", title: "든든한 저녁", items: ["김치볶음밥", "우동국물", "치킨너겟", "콘샐러드", "깍두기"], kcal: "682 kcal", origin: "닭고기 국내산" },
  { date: "2026-09-10", type: "중식", time: "12:20 - 13:10", title: "목요일의 식탁", items: ["차조밥", "두부된장국", "오리주물럭", "부추무침", "깍두기"], kcal: "711 kcal", origin: "오리고기 국내산" },
];

const mealList = document.querySelector("#meal-list");
const dateTitle = document.querySelector("#selected-date");
const nutritionCalories = document.querySelector("#nutrition-calories");
const nutritionMealType = document.querySelector("#nutrition-meal-type");
const nutritionFields = {
  탄수화물: [document.querySelector("#nutrition-carbs"), document.querySelector("#nutrition-carbs-bar")],
  단백질: [document.querySelector("#nutrition-protein"), document.querySelector("#nutrition-protein-bar")],
  지방: [document.querySelector("#nutrition-fat"), document.querySelector("#nutrition-fat-bar")],
};
let selectedDate = "2026-09-09";
let selectedMeal = "all";

async function loadMeals() {
  try {
    const response = await fetch("/api/meals?from=20260907&to=20260911");
    const payload = await response.json();
    if (!response.ok) {
      console.warn(payload.error || "급식 데이터를 불러오지 못했습니다.");
      return;
    }
    if (Array.isArray(payload.meals)) {
      meals.splice(0, meals.length, ...payload.meals);
      renderMeals();
    }
  } catch {
    // 정적 파일로 열었거나 서버가 아직 실행되지 않은 경우 샘플 데이터를 유지합니다.
  }
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${new Intl.DateTimeFormat("ko-KR", { weekday: "long" }).format(date)}`;
}

function renderMeals() {
  const visibleMeals = meals.filter((meal) => meal.date === selectedDate && (selectedMeal === "all" || meal.type === selectedMeal));
  dateTitle.textContent = formatDate(selectedDate);
  renderNutrition();
  mealList.innerHTML = visibleMeals.length ? visibleMeals.map((meal) => `
    <article class="meal-card">
      <div class="meal-summary"><div class="meal-type">${meal.type}</div><div class="meal-time">${meal.time}</div><div class="dinner-note">오늘의 급식은 맛있나연</div></div>
      <div class="menu-section"><div class="card-label">메뉴</div><div class="menu-title">${meal.title}</div><div class="menu-items">${meal.items.map((item) => `<span>${item}</span>`).join("")}</div></div>
      <div class="food-info"><div class="card-label">식품정보</div><div class="food-info-row"><span>열량</span><strong>${meal.kcal}</strong></div><div class="food-info-row"><span>원산지</span><strong>${meal.origin}</strong></div></div>
    </article>`).join("") : `<div class="meal-card"><div class="meal-type">안내</div><div><div class="menu-title">등록된 식단이 없습니다</div><div class="menu-items"><span>다른 날짜를 선택해 보세요.</span></div></div></div>`;
}

function renderNutrition() {
  const lunch = meals.find((meal) => meal.date === selectedDate && meal.type === "중식");
  const nutrition = lunch?.nutrition || {};
  nutritionMealType.textContent = lunch ? "중식 기준" : "중식 정보 없음";
  nutritionCalories.textContent = lunch?.kcal?.replace(/[^0-9.]/g, "") || "-";
  for (const [label, [valueElement, barElement]] of Object.entries(nutritionFields)) {
    const value = nutrition[label] || "정보 없음";
    valueElement.textContent = value;
    const number = Number.parseFloat(value);
    barElement.style.width = Number.isFinite(number) ? `${Math.min(number, 100)}%` : "0%";
  }
}

document.querySelectorAll(".day").forEach((button) => button.addEventListener("click", () => {
  selectedDate = button.dataset.date;
  document.querySelectorAll(".day").forEach((item) => item.classList.remove("selected"));
  button.classList.add("selected");
  renderMeals();
}));
document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => {
  selectedMeal = button.dataset.meal;
  document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  renderMeals();
}));
renderMeals();
loadMeals();