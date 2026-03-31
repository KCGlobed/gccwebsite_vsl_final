
var BASE_URL = "https://kcglobed-gcc-website-932479078084.asia-south1.run.app";
var FORM_TYPE = "dossier";
var FORM_ID = "1";

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
        openPaymentModal();
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

function injectModal() {
  if (document.getElementById("gccPaymentModal")) return;

  var modal = document.createElement("div");
  modal.id = "gccPaymentModal";
  modal.innerHTML = `
    <div class="gcc-modal-overlay" id="gccModalOverlay">
      <div class="gcc-modal-box">
        <button class="gcc-modal-close" id="gccModalClose" aria-label="Close">✕</button>

        <!-- STEP 1: Details form -->
        <div id="gccStep1">
          <p class="gcc-modal-label">Almost there!</p>
          <h2 class="gcc-modal-title">Reserve Your NFET Slot</h2>
          <p class="gcc-modal-sub">Enter your details to proceed to secure payment.</p>

          <div class="gcc-field-group">
    <label>Full Name *</label>
    <input type="text" id="gcc_name" placeholder="e.g. Priya Sharma" />
  </div>

  <!-- Email + Phone -->
  <div class="gcc-row">
    <div class="gcc-field-group">
      <label>Email *</label>
      <input type="email" id="gcc_email" placeholder="e.g. priya@gmail.com" />
    </div>

    <div class="gcc-field-group">
      <label>Phone *</label>
      <input type="tel" id="gcc_phone" placeholder="10-digit mobile number" />
    </div>
  </div>

  <!-- State + City -->
  <div class="gcc-row">
    <div class="gcc-field-group">
      <label>State *</label>
      <input type="text" id="gcc_state" placeholder="e.g. Haryana" />
    </div>

    <div class="gcc-field-group">
      <label>City *</label>
      <input type="text" id="gcc_city" placeholder="e.g. Delhi" />
    </div>
  </div>

          <div id="gccFormError" class="gcc-error" style="display:none;"></div>

          <button class="gcc-pay-btn" id="gccPayBtn">
            🔒 Pay ₹2,950 Securely »
          </button>
          <p class="gcc-modal-note">Cashfree secured payment · Instant WhatsApp confirmation</p>
        </div>

        <!-- STEP 2: Processing -->
        <div id="gccStep2" style="display:none; text-align:center; padding:40px 0;">
          <div class="gcc-spinner"></div>
          <p style="margin-top:20px; font-size:15px; color:#ccc;">Setting up your payment session…</p>
        </div>

        <!-- STEP 3: Success -->
        <div id="gccStep3" style="display:none; text-align:center; padding:40px 20px;">
          <div style="font-size:56px;">🎉</div>
          <h2 style="color:#f5a623; margin:16px 0 8px;">Payment Successful!</h2>
          <p style="color:#ccc; font-size:15px;">Your NFET slot is reserved. Check WhatsApp for confirmation.</p>
          <button class="gcc-pay-btn" style="margin-top:24px;" onclick="closePaymentModal()">Close</button>
        </div>

        <!-- STEP 4: Failed -->
        <div id="gccStep4" style="display:none; text-align:center; padding:40px 20px;">
          <div style="font-size:56px;">⚠️</div>
          <h2 style="color:#e74c3c; margin:16px 0 8px;">Payment Failed</h2>
          <p style="color:#ccc; font-size:15px;" id="gccFailMsg">Something went wrong. Please try again.</p>
          <button class="gcc-pay-btn" style="margin-top:24px;" onclick="retryPayment()">Try Again</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Inject modal styles
  var style = document.createElement("style");
  style.textContent = `
    #gccPaymentModal { display:none; position:fixed; inset:0; z-index:9999; }
    .gcc-modal-overlay {
      position:fixed; inset:0;
      background:rgba(0,0,0,0.82);
      display:flex; align-items:center; justify-content:center;
      padding:16px;
      backdrop-filter:blur(4px);
    }
    .gcc-modal-box {
      background:#1a1a2e;
      border:1px solid rgba(245,166,35,0.25);
      border-radius:16px;
      padding:36px 32px;
      width:100%; max-width:440px;
      position:relative;
      max-height:90vh;
      overflow-y:auto;
    }
    .gcc-modal-close {
      position:absolute; top:14px; right:18px;
      background:none; border:none;
      color:rgba(255,255,255,0.45);
      font-size:20px; cursor:pointer; line-height:1;
    }
    .gcc-modal-close:hover { color:#fff; }
    .gcc-modal-label {
      font-size:11px; letter-spacing:2px; text-transform:uppercase;
      color:#f5a623; font-weight:700; margin:0 0 8px;
    }
    .gcc-modal-title {
      font-size:22px; font-weight:800; color:#fff; margin:0 0 8px;
      font-family:'Bebas Neue', sans-serif; letter-spacing:1px;
    }
    .gcc-modal-sub { font-size:13px; color:rgba(255,255,255,0.5); margin:0 0 24px; }
    .gcc-field-group { margin-bottom:16px; }
    .gcc-field-group label {
      display:block; font-size:12px; font-weight:600;
      color:rgba(255,255,255,0.7); margin-bottom:6px;
      font-family:'Manrope', sans-serif;
    }
    .gcc-req { color:#f5a623; }
    .gcc-field-group input {
      width:100%; padding:11px 14px;
      background:rgba(255,255,255,0.06);
      border:1px solid rgba(255,255,255,0.12);
      border-radius:8px; color:#fff; font-size:14px;
      font-family:'Manrope', sans-serif;
      box-sizing:border-box; transition:border 0.2s;
      outline:none;
    }
    .gcc-field-group input:focus { border-color:#f5a623; }
    .gcc-field-group input::placeholder { color:rgba(255,255,255,0.25); }
    .gcc-error {
      background:rgba(231,76,60,0.15); border:1px solid rgba(231,76,60,0.4);
      border-radius:8px; padding:10px 14px;
      color:#e74c3c; font-size:13px; margin-bottom:16px;
    }
    .gcc-pay-btn {
      width:100%; padding:15px;
      background:linear-gradient(135deg,#f5a623,#e8940f);
      border:none; border-radius:10px;
      color:#000; font-size:16px; font-weight:800;
      cursor:pointer; letter-spacing:0.5px;
      font-family:'Manrope', sans-serif;
      transition:opacity 0.2s, transform 0.1s;
    }
    .gcc-pay-btn:hover { opacity:0.92; transform:translateY(-1px); }
    .gcc-pay-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
    .gcc-modal-note {
      text-align:center; font-size:11px;
      color:rgba(255,255,255,0.3); margin-top:12px;
    }
    .gcc-spinner {
      width:44px; height:44px; margin:0 auto;
      border:3px solid rgba(245,166,35,0.2);
      border-top-color:#f5a623;
      border-radius:50%;
      animation:gcc-spin 0.8s linear infinite;
    }
    @keyframes gcc-spin { to { transform:rotate(360deg); } }
  `;
  document.head.appendChild(style);

  // Close on overlay click
  document.getElementById("gccModalOverlay").addEventListener("click", function (e) {
    if (e.target === this) closePaymentModal();
  });
  document.getElementById("gccModalClose").addEventListener("click", closePaymentModal);

  // Pay button click
  document.getElementById("gccPayBtn").addEventListener("click", handlePayClick);
}


function openPaymentModal() {
  injectModal();
  showStep(1);
  document.getElementById("gccPaymentModal").style.display = "block";
  document.body.style.overflow = "hidden";
}

function closePaymentModal() {
  var modal = document.getElementById("gccPaymentModal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
}

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

  errEl.style.display = "none";
  showStep(2);

  startPayment(name, email, phone, city, state);
}

function showError(el, msg) {
  el.textContent = msg;
  el.style.display = "block";
}

function startPayment(name, email, mobile, city, state) {
  console.log("Starting payment initialization...", { name, email, mobile, city, state });
  fetch(BASE_URL + "/api/start-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name,
      email: email,
      mobile: mobile,
      city: city,
      state: state,
      form_type: FORM_TYPE,
      form_id: FORM_ID,
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
  const cashfree = Cashfree({ mode: "sandbox" });

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


function wireCtaButtons() {
  var selectors = [".btn-gold", ".btn-cta-large", ".inline-cta a"];

  selectors.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        openPaymentModal();
      });
    });
  });
}


window.addEventListener("DOMContentLoaded", function () {
  startLockCountdown();
  wireCtaButtons();
  injectModal();
});