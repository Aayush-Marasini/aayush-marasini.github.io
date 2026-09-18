const year = document.querySelector("#copyright-year");
if (year) year.textContent = String(new Date().getFullYear());

const form = document.querySelector(".contact-form");
const status = document.querySelector("#form-status");

if (form && status) {
  let submitting = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;

    const fields = new FormData(form);
    if (String(fields.get("_honey") || "").trim()) return;

    const name = String(fields.get("name") || "").trim();
    const message = String(fields.get("message") || "").trim();
    if (!name || message.length < 10) {
      status.dataset.state = "error";
      status.textContent =
        "Please add your name and a message of at least 10 characters.";
      status.focus({ preventScroll: true });
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    const label = button.querySelector(".button-label");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    submitting = true;
    button.disabled = true;
    label.textContent = "Sending…";
    form.setAttribute("aria-busy", "true");
    status.dataset.state = "pending";
    status.textContent = "Sending your message…";

    try {
      const endpoint = new URL(form.action);
      endpoint.pathname = `/ajax${endpoint.pathname}`;
      const payload = Object.fromEntries(fields.entries());
      payload.name = name;
      payload.message = message;
      payload.email = String(payload.email).trim();
      const response = await fetch(endpoint.href, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || ![true, "true"].includes(result.success)) {
        throw new Error("Submission was not accepted.");
      }
      if (/activat|confirm.*email|verif/i.test(String(result.message || ""))) {
        throw new Error("The form inbox needs activation.");
      }
      form.reset();
      status.dataset.state = "success";
      status.textContent =
        "Your message has been submitted. Thanks for reaching out!";
    } catch {
      status.dataset.state = "error";
      status.replaceChildren(
        document.createTextNode(
          "Your message could not be confirmed. Please try again, or ",
        ),
      );
      const fallback = document.createElement("a");
      fallback.href = "mailto:aayush.marasini@usm.edu";
      fallback.className = "text-link";
      fallback.textContent = "email me directly";
      status.append(
        fallback,
        document.createTextNode(". Your message is still here."),
      );
    } finally {
      window.clearTimeout(timeout);
      submitting = false;
      button.disabled = false;
      label.textContent = "Send message";
      form.removeAttribute("aria-busy");
      status.focus({ preventScroll: true });
    }
  });
}
