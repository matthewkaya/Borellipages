function setFieldError(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, message: string) {
  const errorId = `${field.id}-error`;
  const error = document.getElementById(errorId);
  field.setAttribute("aria-invalid", "true");
  if (error) {
    error.textContent = message;
  }
}

function clearFieldError(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const errorId = `${field.id}-error`;
  const error = document.getElementById(errorId);
  field.removeAttribute("aria-invalid");
  if (error) {
    error.textContent = "";
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function initContactFormValidation(): void {
  const form = document.getElementById("consultation-form");
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const fields = Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input, select, textarea"
    )
  ).filter((field) => field.id);

  fields.forEach((field) => {
    field.addEventListener("input", () => clearFieldError(field));
  });

  form.addEventListener("submit", (event) => {
    let hasError = false;

    const name = form.querySelector<HTMLInputElement>("#full-name");
    const email = form.querySelector<HTMLInputElement>("#email");
    const phone = form.querySelector<HTMLInputElement>("#phone");
    const service = form.querySelector<HTMLSelectElement>("#service");
    const message = form.querySelector<HTMLTextAreaElement>("#project-details");

    if (name) {
      clearFieldError(name);
      if (!name.value.trim()) {
        setFieldError(name, "Please enter your name.");
        hasError = true;
      }
    }

    if (email) {
      clearFieldError(email);
      if (!email.value.trim()) {
        setFieldError(email, "Please enter your email.");
        hasError = true;
      } else if (!isValidEmail(email.value.trim())) {
        setFieldError(email, "Enter a valid email address.");
        hasError = true;
      }
    }

    if (phone) {
      clearFieldError(phone);
      const digits = phone.value.replace(/\D/g, "");
      if (!digits) {
        setFieldError(phone, "Please enter your phone number.");
        hasError = true;
      } else if (digits.length < 10) {
        setFieldError(phone, "Enter a valid phone number with area code.");
        hasError = true;
      }
    }

    if (service) {
      clearFieldError(service);
      if (!service.value) {
        setFieldError(service, "Choose a project type.");
        hasError = true;
      }
    }

    if (message) {
      clearFieldError(message);
      if (message.value.trim().length < 20) {
        setFieldError(message, "Please include a few details about your project (20+ characters).");
        hasError = true;
      }
    }

    if (hasError) {
      event.preventDefault();
      const firstErrorField = form.querySelector<HTMLElement>("[aria-invalid='true']");
      firstErrorField?.focus();
      return;
    }

    const submitButton = form.querySelector<HTMLButtonElement>("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }
  });
}
