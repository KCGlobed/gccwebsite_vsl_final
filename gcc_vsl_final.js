
var BASE_URL = "https://gcc-website-prod-932479078084.europe-west1.run.app";
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

  showLoadingModal("Initializing secure checkout...");
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
        showStatusModal(false, data.message || "Could not initiate payment. Please try again.", null);
        return;
      }

      if (data.gateway === "cashfree") {
        console.log("Launching Cashfree modal...");
        // Ensure loader shows for at least 2 seconds
        setTimeout(function () {
          closeStatusModal();
          launchCashfree(data);
        }, 2000);
      } else {
        showStatusModal(false, "Unexpected gateway response. Please contact support.", null);
      }
    })
    .catch(function (err) {
      console.error("Critical error in start-payment:", err);
      showStatusModal(false, "Network error. Please check your connection and try again.", null);
    });
}


function launchCashfree(data) {
  console.log("Initializing Cashfree checkout (v3)...");
  if (typeof Cashfree === "undefined") {
    showStatusModal(false, "Payment gateway could not be loaded. Please refresh the page.", data.cf_order_id);
    return;
  }
  const cashfree = Cashfree({ mode: "production" });

  cashfree.checkout({
    paymentSessionId: data.payment_session_id,
    redirectTarget: "_modal",
  }).then((result) => {
    console.log("Cashfree checkout result object:", result);
    if (result.error) {
      console.warn("Cashfree checkout returned an error:", result.error);
      reportFailure(data.cf_order_id, null, result.error.message, result.error.code);
      showStatusModal(false, result.error.message, data.cf_order_id);
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
  showLoadingModal("Verifying your payment...");

  // Artificial delay to ensure loader is visible
  setTimeout(function () {
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

        if (data && data.success === true) {
          console.log("Payment successful according to backend.");
          showStatusModal(true, "", cf_order_id);
        } else {
          console.warn("Payment verification failed according to backend.", data.message || "Unknown error");
          showStatusModal(false, data.message || "Payment verification failed.", cf_order_id);
        }
      })
      .catch(function (err) {
        console.error("complete-payment network error:", err);
        showStatusModal(false, "Network error during verification.", cf_order_id);
      });
  }, 2000);
}

function showStatusModal(isSuccess, message, orderId) {
  var overlay = document.getElementById("statusModalOverlay");
  if (!overlay) return;

  var iconWrap = document.getElementById("statusIconWrap");
  var title = document.getElementById("statusTitle");
  var titleHighlight = document.getElementById("statusTitleHighlight");
  var desc = document.getElementById("statusDesc");
  var badge = document.getElementById("statusBadge");
  var dot = document.getElementById("statusDot");
  var leftText = document.getElementById("statusLeftText");
  var pid = document.getElementById("statusPaymentId");
  var retryBtn = document.getElementById("statusRetryBtn");
  var closeBtn = document.querySelector(".status-close-btn");

  overlay.classList.add("active");
  if (closeBtn) closeBtn.style.display = "flex";

  if (isSuccess) {
    iconWrap.className = "status-icon-wrap";
    iconWrap.innerHTML = '<div class="status-icon-outer"></div><div class="status-icon-middle"></div><div class="status-icon-inner"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>';
    badge.className = "status-badge";
    badge.textContent = "✦ CONFIRMED";
    title.childNodes[0].nodeValue = "Thank ";
    titleHighlight.textContent = "You!";
    titleHighlight.className = "text-yellow";
    desc.innerHTML = message ? message : 'Our team will <span class="text-highlight">reach out to you within 2 hours.</span><br>Please keep your phone accessible.';
    dot.className = "green-dot";
    leftText.textContent = "Team is online";
    retryBtn.style.display = "none";
  } else {
    iconWrap.className = "status-icon-wrap failed";
    iconWrap.innerHTML = '<div class="status-icon-outer"></div><div class="status-icon-middle"></div><div class="status-icon-inner"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>';
    badge.className = "status-badge failed";
    badge.textContent = "✦ FAILED";
    title.childNodes[0].nodeValue = "Payment ";
    titleHighlight.textContent = "Failed";
    titleHighlight.className = "text-red";
    desc.innerHTML = message || "Your payment could not be processed.";
    dot.className = "red-dot";
    leftText.textContent = "System Error";
    retryBtn.style.display = "block";
  }

  if (orderId) {
    pid.style.display = "block";
    pid.textContent = "Payment ID: " + orderId;
  } else {
    pid.style.display = "none";
  }
}

function showLoadingModal(message) {
  var overlay = document.getElementById("statusModalOverlay");
  if (!overlay) return;

  var iconWrap = document.getElementById("statusIconWrap");
  var title = document.getElementById("statusTitle");
  var titleHighlight = document.getElementById("statusTitleHighlight");
  var desc = document.getElementById("statusDesc");
  var badge = document.getElementById("statusBadge");
  var dot = document.getElementById("statusDot");
  var leftText = document.getElementById("statusLeftText");
  var pid = document.getElementById("statusPaymentId");
  var retryBtn = document.getElementById("statusRetryBtn");
  var closeBtn = document.querySelector(".status-close-btn");

  overlay.classList.add("active");
  if (closeBtn) closeBtn.style.display = "none";

  iconWrap.className = "status-icon-wrap loading";
  iconWrap.innerHTML = '<div class="status-icon-outer" style="animation: spin 3s linear infinite;"></div><div class="status-icon-middle" style="animation: spin 2s linear infinite reverse;"></div><div class="status-icon-inner"><svg viewBox="0 0 24 24"><path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M7.76 16.24l-2.83 2.83M19.07 19.07l-2.83-2.83M4.93 4.93l2.83 2.83" style="animation: spin 1.5s linear infinite; transform-origin: 12px 12px;"/></svg></div>';

  badge.className = "status-badge loading";
  badge.textContent = "✦ PROCESSING";

  title.childNodes[0].nodeValue = "Please ";
  titleHighlight.textContent = "Wait";
  titleHighlight.className = "text-yellow";

  desc.innerHTML = message || 'We are securely initializing your payment gateway.<br>Do not refresh or close this window.';

  dot.className = "green-dot";
  leftText.textContent = "Secure Connection";

  retryBtn.style.display = "none";
  pid.style.display = "none";
}

function closeStatusModal() {
  var overlay = document.getElementById("statusModalOverlay");
  if (overlay) overlay.classList.remove("active");
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

// State and City Dropdown Logic
let stateCityData = null;

function loadStateCityData() {
  fetch("./state-city.json")
    .then(res => res.json())
    .then(data => {
      stateCityData = data;
      const stateSelect = document.getElementById("gcc_state");
      if (stateSelect) {
        // Clear existing states
        while (stateSelect.options.length > 1) {
          stateSelect.remove(1);
        }

        // Add all states
        const states = Object.keys(data).sort();
        states.forEach(state => {
          const option = document.createElement("option");
          option.value = state;
          option.textContent = state;
          stateSelect.appendChild(option);
        });

        stateSelect.addEventListener("change", function () {
          updateCityDropdown(this.value);
        });

        // Just in case prefill has already set a value
        if (stateSelect.value) {
          updateCityDropdown(stateSelect.value);
        }
      }
    })
    .catch(err => console.error("Could not load state-city.json", err));
}

function updateCityDropdown(selectedState) {
  const citySelect = document.getElementById("gcc_city");
  if (!citySelect) return;

  // Reset options
  citySelect.innerHTML = '<option value="">Select city</option>';

  if (selectedState && stateCityData && stateCityData[selectedState]) {
    const cities = stateCityData[selectedState].sort();
    cities.forEach(city => {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = city;
      citySelect.appendChild(option);
    });
  }
}

document.addEventListener("DOMContentLoaded", loadStateCityData);


function playVideo() {
  document.getElementById("videoPlaceholder").style.display = "none";
  document.getElementById("videoEmbed").style.display = "block";

  const video = document.getElementById("videoPlayer");

  // ✅ autoplay after user click
  video.play().catch(() => {
    console.log("Autoplay blocked (rare)");
  });

  startVideoTimer(); // your existing function
}

async function handleBookFreeCall(e) {
  e.preventDefault();

  showLoadingModal("Processing your request...");

  const current = new URLSearchParams(window.location.search);
  const data = {
    full_name: current.get('full_name') || "",
    email: current.get('email') || "",
    phone: current.get('phone') || "",
    degree: current.get('degree') || "",
    degree_stage: current.get('degree_stage') || "",
    book_call: 1
  };

  try {
    const res = await fetch(`https://gccwebsite-admin-prod-backend-738131651355.asia-south1.run.app/api/career/createvslform`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    console.log("API Response:", result);

    // show success modal
    showStatusModal(true, 'You will <span class="text-highlight">receive the call within 2 hours</span> from our expert.<br>Please keep your phone accessible.', null);
  } catch (err) {
    console.error("Error booking call:", err);
    showStatusModal(false, "Network error. Please try again.", null);
  }
}