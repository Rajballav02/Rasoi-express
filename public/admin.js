/* ===========================================================
   Rasoi Express — Admin Panel Logic
   Talks to the CRUD REST API (/api/categories, /api/menu-items)
   =========================================================== */
(function () {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const API = "/api";

  let categories = [];
  let items = [];

  function showToast(msg) {
    $("#adminToastBody").textContent = msg;
    bootstrap.Toast.getOrCreateInstance($("#adminToast"), { delay: 2400 }).show();
  }

  async function apiGet(path) {
    const res = await fetch(`${API}${path}`);
    if (!res.ok) throw new Error((await res.json()).error || "Request failed");
    return res.json();
  }
  async function apiSend(path, method, body) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }
  async function apiDelete(path) {
    const res = await fetch(`${API}${path}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  /* ---------- Tabs ---------- */
  const TAB_NAMES = ["items", "categories", "orders", "messages", "subscribers", "coupons", "reviews"];

  function bindTabs() {
    $$("#adminTabs .nav-link").forEach((btn) => {
      btn.addEventListener("click", async () => {
        $$("#adminTabs .nav-link").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        TAB_NAMES.forEach((name) =>
          $(`#tab-${name}`).classList.toggle("d-none", btn.dataset.tab !== name)
        );
        if (btn.dataset.tab === "orders") await loadOrders();
        if (btn.dataset.tab === "messages") await loadMessages();
        if (btn.dataset.tab === "subscribers") await loadSubscribers();
        if (btn.dataset.tab === "coupons") await loadCoupons();
        if (btn.dataset.tab === "reviews") await loadReviews();
      });
    });
  }

  /* ---------- Categories ---------- */
  async function loadCategories() {
    categories = await apiGet("/categories");
    renderCategoryOptions();
    renderCategoriesTable();
  }

  function renderCategoryOptions() {
    $("#itemCategory").innerHTML = categories
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join("");
  }

  function renderCategoriesTable() {
    $("#categoriesTableBody").innerHTML = categories
      .map(
        (c) => `
      <tr>
        <td><code>${c.id}</code></td>
        <td>${c.name}</td>
        <td><i class="bi ${c.icon}"></i> ${c.icon}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary me-1" data-edit-cat="${c.id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-del-cat="${c.id}"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>`
      )
      .join("");

    $$("[data-edit-cat]").forEach((b) =>
      b.addEventListener("click", () => openCategoryModal(b.dataset.editCat))
    );
    $$("[data-del-cat]").forEach((b) =>
      b.addEventListener("click", () => deleteCategory(b.dataset.delCat))
    );
  }

  function openCategoryModal(id) {
    const cat = categories.find((c) => c.id === id);
    $("#categoryModalTitle").textContent = cat ? "Edit Category" : "Add Category";
    $("#categoryId").value = cat ? cat.id : "";
    $("#categoryId").disabled = !!cat;
    $("#categoryName").value = cat ? cat.name : "";
    $("#categoryIcon").value = cat ? cat.icon : "";
    bootstrap.Modal.getOrCreateInstance($("#categoryModal")).show();
  }

  async function deleteCategory(id) {
    if (!confirm(`Delete category "${id}"? This only works if no menu items use it.`)) return;
    try {
      await apiDelete(`/categories/${id}`);
      showToast("Category deleted.");
      await loadCategories();
    } catch (err) {
      showToast(err.message);
    }
  }

  function bindCategoryForm() {
    $("#btnNewCategory").addEventListener("click", () => openCategoryModal(null));
    $("#categoryForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = $("#categoryId").value.trim();
      const name = $("#categoryName").value.trim();
      const icon = $("#categoryIcon").value.trim();
      const isEdit = $("#categoryId").disabled;

      try {
        if (isEdit) {
          await apiSend(`/categories/${id}`, "PUT", { name, icon });
          showToast("Category updated.");
        } else {
          await apiSend("/categories", "POST", { id, name, icon });
          showToast("Category created.");
        }
        bootstrap.Modal.getInstance($("#categoryModal")).hide();
        await loadCategories();
      } catch (err) {
        showToast(err.message);
      }
    });
  }

  /* ---------- Menu Items ---------- */
  async function loadItems() {
    items = await apiGet("/menu-items");
    renderItemsTable();
  }

  function renderItemsTable() {
    $("#itemsEmptyMsg").classList.toggle("d-none", items.length !== 0);
    $("#itemsTableBody").innerHTML = items
      .map(
        (item) => `
      <tr>
        <td>${item.id}</td>
        <td>${item.name}</td>
        <td>${(categories.find((c) => c.id === item.category) || {}).name || item.category}</td>
        <td><span class="veg-badge ${item.veg ? "" : "nonveg-badge"}" title="${item.veg ? "Veg" : "Non-veg"}"></span></td>
        <td>₹${item.price}</td>
        <td><i class="bi bi-star-fill text-warning"></i> ${item.rating}</td>
        <td class="text-truncate" style="max-width:260px;">${item.desc}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary me-1" data-edit-item="${item.id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-del-item="${item.id}"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>`
      )
      .join("");

    $$("[data-edit-item]").forEach((b) =>
      b.addEventListener("click", () => openItemModal(parseInt(b.dataset.editItem)))
    );
    $$("[data-del-item]").forEach((b) =>
      b.addEventListener("click", () => deleteItem(parseInt(b.dataset.delItem)))
    );
  }

  function openItemModal(id) {
    const item = items.find((i) => i.id === id);
    $("#itemModalTitle").textContent = item ? "Edit Menu Item" : "Add Menu Item";
    $("#itemId").value = item ? item.id : "";
    $("#itemName").value = item ? item.name : "";
    $("#itemCategory").value = item ? item.category : (categories[0] || {}).id || "";
    $("#itemPrice").value = item ? item.price : "";
    $("#itemRating").value = item ? item.rating : 4.5;
    $("#itemVeg").checked = item ? item.veg : true;
    $("#itemDesc").value = item ? item.desc : "";
    bootstrap.Modal.getOrCreateInstance($("#itemModal")).show();
  }

  async function deleteItem(id) {
    const item = items.find((i) => i.id === id);
    if (!confirm(`Delete "${item?.name}"?`)) return;
    try {
      await apiDelete(`/menu-items/${id}`);
      showToast("Menu item deleted.");
      await loadItems();
    } catch (err) {
      showToast(err.message);
    }
  }

  function bindItemForm() {
    $("#btnNewItem").addEventListener("click", () => openItemModal(null));
    $("#itemForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = $("#itemId").value;
      const payload = {
        name: $("#itemName").value.trim(),
        category: $("#itemCategory").value,
        price: parseInt($("#itemPrice").value, 10),
        rating: parseFloat($("#itemRating").value) || 4.5,
        veg: $("#itemVeg").checked,
        desc: $("#itemDesc").value.trim(),
      };
      try {
        if (id) {
          await apiSend(`/menu-items/${id}`, "PUT", payload);
          showToast("Menu item updated.");
        } else {
          await apiSend("/menu-items", "POST", payload);
          showToast("Menu item created.");
        }
        bootstrap.Modal.getInstance($("#itemModal")).hide();
        await loadItems();
      } catch (err) {
        showToast(err.message);
      }
    });
  }

  /* ---------- Orders ---------- */
  let orders = [];
  const rupee = (n) => "₹" + Number(n).toLocaleString("en-IN");

  async function loadOrders() {
    const filter = $("#orderStatusFilter").value;
    orders = await apiGet(`/orders${filter ? `?status=${encodeURIComponent(filter)}` : ""}`);
    renderOrdersTable();
    const pending = orders.filter((o) => o.status === "Pending").length;
    $("#ordersBadge").textContent = pending || "";
  }

  function renderOrdersTable() {
    $("#ordersEmptyMsg").classList.toggle("d-none", orders.length !== 0);
    $("#ordersTableBody").innerHTML = orders
      .map(
        (o) => `
      <tr>
        <td>#${o.id}</td>
        <td>${o.customer_name}</td>
        <td>${o.phone}</td>
        <td>${o.items.reduce((s, i) => s + i.qty, 0)} item(s)</td>
        <td>${rupee(o.total)}</td>
        <td>${o.payment_method}</td>
        <td><span class="badge bg-secondary">${o.status}</span></td>
        <td class="small text-muted">${o.created_at}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary me-1" data-view-order="${o.id}"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-del-order="${o.id}"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>`
      )
      .join("");

    $$("[data-view-order]").forEach((b) =>
      b.addEventListener("click", () => openOrderDetail(parseInt(b.dataset.viewOrder)))
    );
    $$("[data-del-order]").forEach((b) =>
      b.addEventListener("click", () => deleteOrder(parseInt(b.dataset.delOrder)))
    );
  }

  function openOrderDetail(id) {
    const o = orders.find((x) => x.id === id);
    if (!o) return;
    $("#odOrderId").textContent = o.id;
    $("#odName").textContent = o.customer_name;
    $("#odPhone").textContent = o.phone;
    $("#odEmail").textContent = o.email ? ` · ${o.email}` : "";
    $("#odAddress").textContent = o.address;
    $("#odCity").textContent = o.city;
    $("#odPincode").textContent = o.pincode;
    $("#odItems").innerHTML = o.items
      .map(
        (i) => `<li class="list-group-item d-flex justify-content-between">
          <span>${i.name} × ${i.qty}</span><span>${rupee(i.price * i.qty)}</span>
        </li>`
      )
      .join("");
    $("#odSubtotal").textContent = rupee(o.subtotal);
    $("#odDelivery").textContent = o.delivery_fee ? rupee(o.delivery_fee) : "Free";
    $("#odTotal").textContent = rupee(o.total);
    $("#odStatusSelect").value = o.status;
    $("#btnSaveOrderStatus").dataset.orderId = o.id;
    bootstrap.Modal.getOrCreateInstance($("#orderDetailModal")).show();
  }

  async function deleteOrder(id) {
    if (!confirm(`Delete order #${id}? This cannot be undone.`)) return;
    try {
      await apiDelete(`/orders/${id}`);
      showToast("Order deleted.");
      await loadOrders();
    } catch (err) {
      showToast(err.message);
    }
  }

  function bindOrderControls() {
    $("#orderStatusFilter").addEventListener("change", loadOrders);
    $("#btnSaveOrderStatus").addEventListener("click", async (e) => {
      const id = e.target.dataset.orderId;
      const status = $("#odStatusSelect").value;
      try {
        await apiSend(`/orders/${id}`, "PUT", { status });
        showToast(`Order #${id} marked as "${status}".`);
        bootstrap.Modal.getInstance($("#orderDetailModal")).hide();
        await loadOrders();
      } catch (err) {
        showToast(err.message);
      }
    });
  }

  /* ---------- Contact Messages ---------- */
  let messages = [];

  async function loadMessages() {
    messages = await apiGet("/contact");
    renderMessagesTable();
    const unread = messages.filter((m) => !m.isRead).length;
    $("#messagesBadge").textContent = unread || "";
  }

  function renderMessagesTable() {
    $("#messagesEmptyMsg").classList.toggle("d-none", messages.length !== 0);
    $("#messagesTableBody").innerHTML = messages
      .map(
        (m) => `
      <tr class="${m.isRead ? "" : "fw-bold"}">
        <td>#${m.id}</td>
        <td>${m.name}</td>
        <td>${m.email}</td>
        <td>${m.subject}</td>
        <td class="text-truncate" style="max-width:220px;">${m.message}</td>
        <td class="small text-muted">${m.created_at}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary me-1" data-toggle-read="${m.id}" data-read="${m.isRead}">
            <i class="bi ${m.isRead ? "bi-envelope-open" : "bi-envelope"}"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" data-del-msg="${m.id}"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>`
      )
      .join("");

    $$("[data-toggle-read]").forEach((b) =>
      b.addEventListener("click", () => toggleMessageRead(parseInt(b.dataset.toggleRead), b.dataset.read !== "true"))
    );
    $$("[data-del-msg]").forEach((b) =>
      b.addEventListener("click", () => deleteMessage(parseInt(b.dataset.delMsg)))
    );
  }

  async function toggleMessageRead(id, isRead) {
    try {
      await apiSend(`/contact/${id}`, "PUT", { isRead });
      await loadMessages();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function deleteMessage(id) {
    if (!confirm("Delete this message?")) return;
    try {
      await apiDelete(`/contact/${id}`);
      showToast("Message deleted.");
      await loadMessages();
    } catch (err) {
      showToast(err.message);
    }
  }

  /* ---------- Newsletter Subscribers ---------- */
  let subscribers = [];

  async function loadSubscribers() {
    subscribers = await apiGet("/newsletter");
    renderSubscribersTable();
  }

  function renderSubscribersTable() {
    $("#subscribersEmptyMsg").classList.toggle("d-none", subscribers.length !== 0);
    $("#subscribersTableBody").innerHTML = subscribers
      .map(
        (s) => `
      <tr>
        <td>#${s.id}</td>
        <td>${s.email}</td>
        <td class="small text-muted">${s.created_at}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger" data-del-sub="${s.id}"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>`
      )
      .join("");

    $$("[data-del-sub]").forEach((b) =>
      b.addEventListener("click", () => deleteSubscriber(parseInt(b.dataset.delSub)))
    );
  }

  async function deleteSubscriber(id) {
    if (!confirm("Remove this subscriber?")) return;
    try {
      await apiDelete(`/newsletter/${id}`);
      showToast("Subscriber removed.");
      await loadSubscribers();
    } catch (err) {
      showToast(err.message);
    }
  }

  /* ---------- Coupons ---------- */
  let coupons = [];

  async function loadCoupons() {
    coupons = await apiGet("/coupons");
    renderCouponsTable();
  }

  function renderCouponsTable() {
    $("#couponsEmptyMsg").classList.toggle("d-none", coupons.length !== 0);
    $("#couponsTableBody").innerHTML = coupons
      .map(
        (c) => `
      <tr>
        <td><code>${c.code}</code></td>
        <td>${c.discount_percent}%</td>
        <td>${c.min_order ? rupee(c.min_order) : "—"}</td>
        <td><span class="badge ${c.active ? "bg-success" : "bg-secondary"}">${c.active ? "Active" : "Inactive"}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary me-1" data-edit-coupon="${c.code}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-del-coupon="${c.code}"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>`
      )
      .join("");

    $$("[data-edit-coupon]").forEach((b) =>
      b.addEventListener("click", () => openCouponModal(b.dataset.editCoupon))
    );
    $$("[data-del-coupon]").forEach((b) =>
      b.addEventListener("click", () => deleteCoupon(b.dataset.delCoupon))
    );
  }

  function openCouponModal(code) {
    const c = coupons.find((x) => x.code === code);
    $("#couponModalTitle").textContent = c ? "Edit Coupon" : "Add Coupon";
    $("#couponOriginalCode").value = c ? c.code : "";
    $("#couponCode").value = c ? c.code : "";
    $("#couponCode").disabled = !!c;
    $("#couponDiscount").value = c ? c.discount_percent : "";
    $("#couponMinOrder").value = c ? c.min_order : 0;
    $("#couponActive").checked = c ? !!c.active : true;
    bootstrap.Modal.getOrCreateInstance($("#couponModal")).show();
  }

  async function deleteCoupon(code) {
    if (!confirm(`Delete coupon "${code}"?`)) return;
    try {
      await apiDelete(`/coupons/${code}`);
      showToast("Coupon deleted.");
      await loadCoupons();
    } catch (err) {
      showToast(err.message);
    }
  }

  function bindCouponForm() {
    $("#btnNewCoupon").addEventListener("click", () => openCouponModal(null));
    $("#couponForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const originalCode = $("#couponOriginalCode").value;
      const payload = {
        code: $("#couponCode").value.trim().toUpperCase(),
        discountPercent: parseInt($("#couponDiscount").value, 10),
        minOrder: parseInt($("#couponMinOrder").value, 10) || 0,
        active: $("#couponActive").checked,
      };
      try {
        if (originalCode) {
          await apiSend(`/coupons/${originalCode}`, "PUT", payload);
          showToast("Coupon updated.");
        } else {
          await apiSend("/coupons", "POST", payload);
          showToast("Coupon created.");
        }
        bootstrap.Modal.getInstance($("#couponModal")).hide();
        await loadCoupons();
      } catch (err) {
        showToast(err.message);
      }
    });
  }

  /* ---------- Reviews (moderation) ---------- */
  let reviews = [];

  async function loadReviews() {
    const data = await apiGet("/reviews");
    reviews = data.reviews || [];
    renderReviewsTable();
  }

  function renderReviewsTable() {
    $("#reviewsEmptyMsg").classList.toggle("d-none", reviews.length !== 0);
    $("#reviewsTableBody").innerHTML = reviews
      .map((r) => {
        const item = items.find((i) => i.id === r.menu_item_id);
        return `
      <tr>
        <td>#${r.id}</td>
        <td>${item ? item.name : `Item #${r.menu_item_id}`}</td>
        <td>${r.customer_name}</td>
        <td><i class="bi bi-star-fill text-warning"></i> ${r.rating}</td>
        <td class="text-truncate" style="max-width:260px;">${r.comment || "—"}</td>
        <td class="small text-muted">${r.created_at}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger" data-del-review="${r.id}"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>`;
      })
      .join("");

    $$("[data-del-review]").forEach((b) =>
      b.addEventListener("click", () => deleteReview(parseInt(b.dataset.delReview)))
    );
  }

  async function deleteReview(id) {
    if (!confirm("Delete this review?")) return;
    try {
      await apiDelete(`/reviews/${id}`);
      showToast("Review deleted.");
      await loadReviews();
    } catch (err) {
      showToast(err.message);
    }
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    bindTabs();
    bindCategoryForm();
    bindItemForm();
    bindOrderControls();
    bindCouponForm();
    await loadCategories();
    await loadItems();
    await loadOrders(); // populate the pending-orders badge on load
  });
})();
