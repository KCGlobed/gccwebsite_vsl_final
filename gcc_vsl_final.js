
var BASE_URL = "https://gcc-website-prod-932479078084.europe-west1.run.app";
// var BASE_URL = "https://kcglobed-gcc-website-932479078084.asia-south1.run.app";
var mode = "production";
var GCC_BACKEND_URL = "https://gccwebsite-admin-prod-backend-738131651355.asia-south1.run.app"
// var GCC_BACKEND_URL = "https://gccwebsite-admin-backend-738131651355.asia-south1.run.app"
// var mode = "sandbox"
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
  const degree = params.get("degree");
  const degree_stage = params.get("degree_stage");
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
  startPayment(name, email, phone, city, state, form_id, degree, degree_stage);
}

function showError(el, msg) {
  // el.textContent = msg;
  // el.style.display = "block";
}

async function startPayment(name, email, mobile, city, state, form_id, degree, degree_stage) {
  console.log("Starting payment initialization...", { name, email, mobile, city, state, form_id, degree, degree_stage });
  try {
    // ✅ Step 1: Create Form
    const formRes = await fetch(GCC_BACKEND_URL + "/api/career/createvslfinalform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: name,
        email,
        phone: mobile,
        city,
        state,
        degree,
        degree_stage
      }),
    });

    const formData = await formRes.json();
    console.log("createvslfinalform response:", formData);

    const latest_form_id = formData?.data?.id;
    console.log(latest_form_id,'--------')

    if (!latest_form_id) {
      throw new Error("Form ID not received");
    }

    // ✅ Step 2: Save Lead
    try {
      const leadRes = await fetch(BASE_URL + "/api/save-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          mobile,
          city,
          state,
          form_type: 2,
          form_id: latest_form_id,
          source: 13,
          action: "pay_now"
        }),
      });

      const leadData = await leadRes.json();
      console.log("save-lead response:", leadData);

    } catch (leadErr) {
      console.error("Error in save-lead:", leadErr);
      // optional: continue flow
    }

    // ✅ Step 3: Start Payment
    const paymentRes = await fetch(BASE_URL + "/api/start-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        mobile,
        city,
        state,
        form_type: 2,
        form_id: latest_form_id,
        source: 13
      }),
    });

    const paymentData = await paymentRes.json();
    console.log("start-payment response:", paymentData);

    if (!paymentData.success) {
      showStatusModal(false, paymentData.message || "Could not initiate payment. Please try again.", null);
      return;
    }

    // ✅ Step 4: Launch Payment Gateway
    if (paymentData.gateway === "cashfree") {
      console.log("Launching Cashfree modal...");

      setTimeout(function () {
        closeStatusModal();
        launchCashfree(paymentData, { name, email, mobile, city, state, latest_form_id });
      }, 2000);

    } else {
      showStatusModal(false, "Unexpected gateway response. Please contact support.", null);
    }

  } catch (err) {
    console.error("Critical error in startPayment:", err);
    showStatusModal(false, "Something went wrong. Please try again.", null);
  }
}


function launchCashfree(data, form) {
  console.log("Initializing Cashfree checkout (v3)...");
  if (typeof Cashfree === "undefined") {
    showStatusModal(false, "Payment gateway could not be loaded. Please refresh the page.", data.cf_order_id);
    return;
  }
  const cashfree = Cashfree({ mode: mode });

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
      completePayment(data.cf_order_id, form);
    } else if (result.redirect) {
      console.log("Cashfree checkout redirecting...");
    } else {
      console.log("Cashfree checkout finished without specific result. Verifying order status...");
      completePayment(data.cf_order_id, form);
    }
  });

  // Note: Older callbacks like onSuccess/onFailure are ignored in V3 checkout() options
  // but onClose might still be useful for manual closure detection if supported.
}


async function completePayment(cf_order_id, form) {
  console.log("Triggering /api/complete-payment for cf_order_id:", cf_order_id);
  showLoadingModal("Verifying your payment...");

  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const paymentRes = await fetch(BASE_URL + "/api/complete-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cf_order_id: cf_order_id,
        re_attempt_status: false,
      }),
    });

    const paymentData = await paymentRes.json();
    console.log("complete-payment response:", paymentData);

    if (paymentData.success) {
      console.log("Payment successful according to backend.");
      try {
        const studentRes = await fetch(GCC_BACKEND_URL + "/api/users/create_student/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: form.name,
            email: form.email,
            city: form.city,
            state: form.state,
            country: "India",
            phone1: form.mobile,
          }),
        });

        const studentData = await studentRes.json();
        console.log("Student created:", studentData);

      } catch (studentErr) {
        console.error("Student creation failed:", studentErr);
      }
      window.location.href = "/thank-you.html?cf_order_id=" + cf_order_id;

    } else {
      console.warn("Payment verification failed.", paymentData.message || "Unknown error");
      showStatusModal(false, paymentData.message || "Payment verification failed.", cf_order_id);
    }

  } catch (err) {
    console.error("complete-payment error:", err);
    showStatusModal(false, "Network error during verification.", cf_order_id);
  }
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
    form_id: current.get("form_id"),
    degree: current.get("degree") || "",
    degree_stage: current.get("degree_stage") || "",
  });

  console.log("Final Params →", params.toString());

  window.location.href = "/payment.html?" + params.toString();
});

window.addEventListener("DOMContentLoaded", function () {
  startLockCountdown();
  // Autoplay functionality - Attempt to play unmuted. If blocked, show placeholder.
  if (document.getElementById("videoPlayer")) {
    const video = document.getElementById("videoPlayer");
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        // Autoplay worked! Show embed.
        document.getElementById("videoPlaceholder").style.display = "none";
        document.getElementById("videoEmbed").style.display = "block";
        startVideoTimer();
      }).catch((e) => {
        // Autoplay blocked by browser. Leave placeholder visible.
        console.log("Autoplay with sound blocked. User must interact.", e);
        document.getElementById("videoPlaceholder").style.display = "block";
        document.getElementById("videoEmbed").style.display = "none";
      });
    }
  }
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


let lastVideoPlaybackSent = -1;

async function sendVideoPlaybackAPI(seconds) {
  if (seconds === lastVideoPlaybackSent) return;
  lastVideoPlaybackSent = seconds;

  const current = new URLSearchParams(window.location.search);
  const dossierId = current.get('form_id');

  const data = {
    dossier_id: Number(dossierId),
    video_playback: seconds
  };

  try {
    await fetch(`${GCC_BACKEND_URL}/api/career/createvsldetailform`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error("Error sending video playback:", err);
  }
}

function playVideo() {
  document.getElementById("videoPlaceholder").style.display = "none";
  document.getElementById("videoEmbed").style.display = "block";

  const video = document.getElementById("videoPlayer");

  // autoplay after user click
  video.play().catch(() => {
    console.log("Autoplay blocked (rare)");
  });

  startVideoTimer();

  if (!video.dataset.trackingAttached) {
    video.dataset.trackingAttached = "true";

    
    video.addEventListener("timeupdate", () => {
      const currentSec = Math.floor(video.currentTime);
      // Send every 10 seconds
      if (currentSec > 0 && currentSec % 10 === 0 && currentSec !== lastVideoPlaybackSent) {
        sendVideoPlaybackAPI(currentSec);
      }
    });

    video.addEventListener("pause", () => {
      sendVideoPlaybackAPI(Math.floor(video.currentTime));
    });
    
    video.addEventListener("ended", () => {
      sendVideoPlaybackAPI(Math.floor(video.currentTime));
    });
  }
}

async function handleSpecialistClick(e) {
  e.preventDefault();
  const current = new URLSearchParams(window.location.search);
  const dossierId = current.get('form_id')
  console.log(dossierId, 'dossierId')
  const data = {
    dossier_id: Number(dossierId),
    specialist_status: true
  };

  showLoadingModal("Processing your request...");

  try {
    const res = await fetch(`${GCC_BACKEND_URL}/api/career/addvsldetailform`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    console.log("API Response:", result);
    closeStatusModal();
    showStatusModal(true, "Our team will <span class=\"text-highlight\">reach out to you within 2 hours.</span><br>Please keep your phone accessible.", null);
  } catch (err) {
    console.error("Error tracking specialist click:", err);
    closeStatusModal();
    showStatusModal(true, "Our team will <span class=\"text-highlight\">reach out to you within 2 hours.</span><br>Please keep your phone accessible.", null);
  }
}