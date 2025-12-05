// Safe init: run after DOM loads (script is at page end but this is robust)
(function () {
  // ===== ELEMENTS =====
  const balanceEl = document.getElementById("balance");
  const moneyPlusEl = document.getElementById("money-plus");
  const moneyMinusEl = document.getElementById("money-minus");
  const transactionsList = document.getElementById("transactions");

  const form = document.getElementById("transaction-form");
  const textInput = document.getElementById("text");
  const amountInput = document.getElementById("amount");
  const clearBtn = document.getElementById("clear-btn");
  const exportBtn = document.getElementById("export-btn");
  const darkModeBtn = document.getElementById("dark-mode-toggle");

  if (!balanceEl || !moneyPlusEl || !moneyMinusEl || !transactionsList || !form) {
    console.error("One or more required elements are missing from the HTML.");
    return;
  }

  // ===== LOCAL STORAGE =====
  const STORAGE_KEY = "budget_transactions_v1";
  let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

  // ===== HELPERS =====
  function formatAmount(a) {
    return a >= 0 ? "R" + a.toFixed(2) : "-R" + Math.abs(a).toFixed(2);
  }

  // Expose removeTransaction globally so inline onclick="removeTransaction(...)" works
  window.removeTransaction = function removeTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveAndUpdate();
  };

  function saveAndUpdate() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    updateUI();
  }

  // ===== ADD TRANSACTION =====
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!text || Number.isNaN(amount)) {
      alert("Please enter a valid description and amount.");
      return;
    }

    const tx = { id: Date.now(), text, amount };
    transactions.push(tx);
    saveAndUpdate();

    textInput.value = "";
    amountInput.value = "";
  });

  // ===== RENDER TRANSACTIONS =====
  function renderTransactions() {
    transactionsList.innerHTML = "";

    if (transactions.length === 0) {
      const li = document.createElement("li");
      li.style.background = "transparent";
      li.style.padding = "8px 0";
      li.style.textAlign = "center";
      li.style.color = "#666";
      li.textContent = "No transactions yet";
      transactionsList.appendChild(li);
      return;
    }

    transactions.forEach(t => {
      const li = document.createElement("li");
      li.className = t.amount >= 0 ? "plus" : "minus";

      // Use template but avoid accidental HTML injection by using text nodes for description
      li.innerHTML = `
        <span class="tx-desc"></span>
        <div class="tx-right">
          <span class="tx-amount">${formatAmount(t.amount)}</span>
          <button class="delete-btn" data-id="${t.id}">x</button>
        </div>
      `;

      // set description safely
      li.querySelector(".tx-desc").textContent = t.text;

      // attach delete handler (safer than inline onclick)
      const btn = li.querySelector(".delete-btn");
      btn.addEventListener("click", () => window.removeTransaction(t.id));

      transactionsList.appendChild(li);
    });
  }

  // ===== UPDATE BALANCE, INCOME, EXPENSE =====
  function updateValues() {
    const amounts = transactions.map(t => t.amount);
    const income = amounts.filter(a => a > 0).reduce((s, v) => s + v, 0);
    const expense = amounts.filter(a => a < 0).reduce((s, v) => s + v, 0);
    const total = income + expense;

    balanceEl.textContent = "R" + total.toFixed(2);
    moneyPlusEl.textContent = "R" + income.toFixed(2);
    moneyMinusEl.textContent = "-R" + Math.abs(expense).toFixed(2);
  }

  // ===== FULL UI UPDATE =====
  function updateUI() {
    renderTransactions();
    updateValues();
  }

  // ===== CLEAR ALL =====
  clearBtn.addEventListener("click", () => {
    if (!confirm("Are you sure you want to clear all transactions?")) return;
    transactions = [];
    saveAndUpdate();
  });

  // ===== EXPORT TO EXCEL (.xlsx) using SheetJS =====
  exportBtn.addEventListener("click", () => {
    if (!window.XLSX) {
      alert("SheetJS (XLSX) library not found. Make sure the script is included in the HTML.");
      return;
    }
    if (transactions.length === 0) {
      alert("No transactions to export!");
      return;
    }

    const wsData = [["Description", "Amount"]];
    transactions.forEach(t => {
      wsData.push([t.text, t.amount >= 0 ? "R" + t.amount.toFixed(2) : "-R" + Math.abs(t.amount).toFixed(2)]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");

    // Optional: set column widths
    ws['!cols'] = [{ wch: 40 }, { wch: 15 }];

    XLSX.writeFile(wb, "BudgetTracker.xlsx");
  });

  // ===== DARK MODE =====
  if (darkModeBtn) {
    darkModeBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
    });
  }

  // ===== INITIALIZE PAGE =====
  updateUI();
})();
