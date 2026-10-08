const STORAGE_KEY = "hello-world-access";

const els = {
  gate: document.getElementById("gate"),
  site: document.getElementById("site"),
  form: document.getElementById("access-form"),
  status: document.getElementById("form-status"),
  submit: document.getElementById("submit-request"),
};

init();

async function init() {
  const params = new URLSearchParams(location.search);
  const fromLink = params.get("access");
  const stored = localStorage.getItem(STORAGE_KEY);
  const token = fromLink || stored;

  if (!token) {
    show("gate");
    return;
  }

  const result = await jsonp("validate", { access: token });
  if (result && result.ok) {
    localStorage.setItem(STORAGE_KEY, token);
    if (fromLink) {
      history.replaceState({}, "", location.pathname);
    }
    show("site");
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  show("gate");
}

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = els.form.name.value.trim();
  const email = els.form.email.value.trim();

  if (!window.ACCESS_CONFIG.scriptUrl) {
    const subject = encodeURIComponent("Access request for Hello World");
    const body = encodeURIComponent(`Please review my request to access the Hello World site.\n\nName: ${name}\nEmail: ${email}`);
    const mailto = `mailto:jordan.b.lane84@gmail.com?subject=${subject}&body=${body}`;

    els.status.replaceChildren();
    els.status.classList.remove("error");
    els.status.append("Your email app should open with a draft. Send it to complete your request. ");
    const link = document.createElement("a");
    link.href = mailto;
    link.textContent = "Open email draft";
    els.status.append(link);
    window.location.href = mailto;
    return;
  }

  els.submit.disabled = true;
  setStatus("Sending your request...");

  try {
    const result = await jsonp("request", { name, email });
    if (!result || !result.ok) {
      throw new Error((result && result.error) || "Could not send the request.");
    }
    els.form.reset();
    setStatus("Request sent. You will get an email if access is approved.");
  } catch (error) {
    setStatus(error.message || "Could not send the request.", true);
  } finally {
    els.submit.disabled = false;
  }
});

function show(which) {
  els.gate.hidden = which !== "gate";
  els.site.hidden = which !== "site";
}

function setStatus(message, isError) {
  els.status.textContent = message;
  els.status.classList.toggle("error", Boolean(isError));
}

function jsonp(action, fields) {
  const base = window.ACCESS_CONFIG.scriptUrl;
  if (!base) {
    return Promise.resolve({ ok: false, error: "Missing script URL." });
  }

  return new Promise((resolve, reject) => {
    const callback = "accessCb" + Math.random().toString(36).slice(2);
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("The request timed out."));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callback];
      script.remove();
    }

    window[callback] = (data) => {
      cleanup();
      resolve(data);
    };

    const params = new URLSearchParams({ action, callback, ...fields });
    const script = document.createElement("script");
    script.src = `${base}?${params.toString()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("Could not reach the access service."));
    };
    document.body.appendChild(script);
  });
}
