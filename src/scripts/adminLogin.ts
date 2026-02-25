import { isAuthenticated, login } from "@/scripts/adminAuth";

export function initAdminLogin(): void {
  if (isAuthenticated()) {
    window.location.assign("/admin");
    return;
  }

  const form = document.getElementById("admin-login-form");
  const error = document.getElementById("admin-login-error");

  if (!(form instanceof HTMLFormElement) || !(error instanceof HTMLElement)) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";

    const username = form.querySelector<HTMLInputElement>("#username")?.value ?? "";
    const password = form.querySelector<HTMLInputElement>("#password")?.value ?? "";

    const ok = await login(username, password);
    if (!ok) {
      error.textContent = "Invalid username or password.";
      return;
    }

    window.location.assign("/admin");
  });
}
