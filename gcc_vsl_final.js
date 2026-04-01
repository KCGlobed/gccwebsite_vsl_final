
var BASE_URL = "https://kcglobed-gcc-website-932479078084.asia-south1.run.app";
var FORM_TYPE = 2
var FORM_ID = 170532

function toggleFaq(el) {
  var item = el.parentElement;
  var isOpen = item.classList.contains("open");
  document.querySelectorAll(".faq-item").forEach(function (i) {
    i.classList.remove("open");
  });
  if (!isOpen) item.classList.add("open");
}

var LOCK_SECONDS = 10;
var lockRemaining = LOCK_SECONDS;
var lockInterval = null;

function startLockCountdown() {
  var countdownEl = document.getElementById("btnCountdown");
  var msgEl = document.getElementById("btnActivateMsg");
  var btn = document.getElementById("mainCtaBtn");
  if (btn) {
    btn.disabled = false;
  }
  lockInterval = setInterval(function () {
    lockRemaining--;
    if (lockRemaining > 0) {
      if (countdownEl) countdownEl.textContent = lockRemaining;
    } else {
      clearInterval(lockInterval);
      btn.disabled = false;
      btn.classList.remove("cta-btn-locked");
      btn.classList.add("cta-btn-active");
      if (msgEl) msgEl.style.display = "none";
      btn.onclick = function () {

        console.log("RAW search:", window.location.search); // 👈 IMPORTANT

        const current = new URLSearchParams(window.location.search);

        console.log("Current params size:", [...current.entries()]); // 👈 IMPORTANT

        const params = new URLSearchParams({
          name: current.get("full_name") || "",
          email: current.get("email") || "",
          mobile: current.get("phone") || "",
          city: current.get("city") || "",
          state: current.get("state") || "",
          form_id: current.get("form_id")
        });

        console.log("Final Params →", params.toString());

        window.location.href = "/payment.html?" + params.toString();
      };
    }
  }, 1000);
}


var TIMER_SECONDS = 300;

function startVideoTimer() {
  setTimeout(function () {
    var dc = document.getElementById("dualCta");
    if (dc) {
      dc.classList.add("visible");
      dc.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, TIMER_SECONDS * 1000);
}

window.addEventListener("scroll", function () {
  var scrollBottom = window.scrollY + window.innerHeight;
  var docHeight = document.documentElement.scrollHeight;
  if (scrollBottom > docHeight * 0.75) {
    var dc = document.getElementById("dualCta");
    if (dc && !dc.classList.contains("visible")) {
      dc.classList.add("visible");
    }
  }
});

function retryPayment() {
  showStep(1);
}

function showStep(n) {
  [1, 2, 3, 4].forEach(function (i) {
    var el = document.getElementById("gccStep" + i);
    if (el) el.style.display = i === n ? "block" : "none";
  });
}


function handlePayClick() {
  var name = document.getElementById("gcc_name").value.trim();
  var email = document.getElementById("gcc_email").value.trim();
  var phone = document.getElementById("gcc_phone").value.trim();
  var city = document.getElementById("gcc_city").value.trim();
  var state = document.getElementById("gcc_state").value.trim();
  const params = new URLSearchParams(window.location.search);
  const form_id = params.get("form_id");
  console.log("form_id", form_id);
  var errEl = document.getElementById("gccFormError");

  if (!name)
    return showError(errEl, "Please enter your full name.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return showError(errEl, "Please enter a valid email address.");
  if (!phone || !/^[6-9]\d{9}$/.test(phone))
    return showError(errEl, "Please enter a valid 10-digit mobile number.");
  if (!city)
    return showError(errEl, "Please enter your city.");
  if (!state)
    return showError(errEl, "Please enter your state.");

  startPayment(name, email, phone, city, state, form_id);
}

function showError(el, msg) {
  // el.textContent = msg;
  // el.style.display = "block";
}

function startPayment(name, email, mobile, city, state, form_id) {
  console.log("Starting payment initialization...", { name, email, mobile, city, state, form_id });
  fetch(BASE_URL + "/api/start-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name,
      email: email,
      mobile: mobile,
      city: city,
      state: state,
      form_type: 2,
      form_id: form_id,
      source: 13
    }),
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      console.log("start-payment response:", data);
      if (!data.success) {
        showStep(1);
        showError(
          document.getElementById("gccFormError"),
          data.message || "Could not initiate payment. Please try again."
        );
        return;
      }

      if (data.gateway === "cashfree") {
        console.log("Launching Cashfree modal...");
        launchCashfree(data);
      } else {
        showStep(1);
        showError(
          document.getElementById("gccFormError"),
          "Unexpected gateway response. Please contact support."
        );
      }
    })
    .catch(function (err) {
      console.error("Critical error in start-payment:", err);
      showStep(1);
      showError(
        document.getElementById("gccFormError"),
        "Network error. Please check your connection and try again."
      );
    });
}


function launchCashfree(data) {
  console.log("Initializing Cashfree checkout (v3)...");
  const cashfree = new Cashfree({ mode: "sandbox" });

  cashfree.checkout({
    paymentSessionId: data.payment_session_id,
    redirectTarget: "_modal",
  }).then((result) => {
    console.log("Cashfree checkout result object:", result);
    if (result.error) {
      console.warn("Cashfree checkout returned an error:", result.error);
      reportFailure(data.cf_order_id, null, result.error.message, result.error.code);
      showStep(4);
      document.getElementById("gccFailMsg").textContent = result.error.message;
    } else if (result.paymentDetails) {
      console.log("Cashfree checkout success (via result object):", result.paymentDetails);
      completePayment(data.cf_order_id);
    } else if (result.redirect) {
      console.log("Cashfree checkout redirecting...");
    } else {
      console.log("Cashfree checkout finished without specific result. Verifying order status...");
      completePayment(data.cf_order_id);
    }
  });

  // Note: Older callbacks like onSuccess/onFailure are ignored in V3 checkout() options
  // but onClose might still be useful for manual closure detection if supported.
}


function completePayment(cf_order_id) {
  console.log("Triggering /api/complete-payment for cf_order_id:", cf_order_id);
  showStep(2);

  fetch(BASE_URL + "/api/complete-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cf_order_id: cf_order_id,
      re_attempt_status: false,
    }),
  })
    .then(res => res.json())
    .then(function (data) {
      console.log("complete-payment response:", data);

      // ✅ ONLY success condition
      if (data && data.success === true) {
        console.log("Payment successful according to backend.");
        showStep(3); // 🎉 success UI
      } else {
        console.warn("Payment verification failed according to backend.", data.message || "Unknown error");
        showStep(4); // ❌ failure UI

        document.getElementById("gccFailMsg").textContent =
          data.message || "Payment verification failed.";
      }
    })
    .catch(function (err) {
      console.error("complete-payment network error:", err);

      // ✅ network failure = failure UI
      showStep(4);

      document.getElementById("gccFailMsg").textContent =
        "Network error during verification.";
    });
}

function reportFailure(cf_order_id, payment_id, description, code) {
  console.log("Reporting payment failure to backend...", { cf_order_id, payment_id, description, code });
  fetch(BASE_URL + "/api/report-payment-failure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cf_order_id: cf_order_id,
      cf_payment_id: payment_id || "",
      re_attempt_status: false,
      error_code: code || "",
      error_description: description || "",
    }),
  }).then(res => res.json()).then(data => {
    console.log("report-payment-failure response:", data);
  }).catch(function (e) {
    console.error("report-failure network error:", e);
  });
}

document.addEventListener("click", function (e) {
  const btn = e.target.closest(".btn-gold, .btn-cta-large, .inline-cta a");
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();
  console.log("RAW search:", window.location.search); // 👈 IMPORTANT

  const current = new URLSearchParams(window.location.search);

  console.log("Current params size:", [...current.entries()]); // 👈 IMPORTANT

  const params = new URLSearchParams({
    name: current.get("full_name") || "",
    email: current.get("email") || "",
    mobile: current.get("phone") || "",
    city: current.get("city") || "",
    state: current.get("state") || "",
    form_id: current.get("form_id")
  });

  console.log("Final Params →", params.toString());

  window.location.href = "/payment.html?" + params.toString();
});

window.addEventListener("DOMContentLoaded", function () {
  startLockCountdown();
  // wireCtaButtons();
  // injectModal();
});


function getParams() {
  const p = new URLSearchParams(window.location.search);

  return {
    name: p.get("name"),
    email: p.get("email"),
    mobile: p.get("mobile"),
    form_id: p.get("form_id"),
  };
}

function prefill() {
  const data = getParams();
  console.log("data", data);
  document.getElementById("gcc_name").value = data.name || "";
  document.getElementById("gcc_email").value = data.email || "";
  document.getElementById("gcc_phone").value = data.mobile || "";
}

window.onload = prefill;