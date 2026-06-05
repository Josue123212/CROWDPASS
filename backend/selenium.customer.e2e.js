const { Builder, By, Key, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api";
const EVENT_ID = Number(process.env.EVENT_ID || "5");
const TICKET_TYPE_ID = Number(process.env.TICKET_TYPE_ID || "9");
const HEADLESS = process.env.HEADLESS !== "false";

function buildChromeOptions() {
  const options = new chrome.Options();
  if (HEADLESS) {
    options.addArguments("--headless=new");
  }
  options.addArguments("--window-size=1280,900");
  options.addArguments("--disable-dev-shm-usage");
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-gpu");
  options.addArguments("--no-first-run");
  options.addArguments("--no-default-browser-check");
  options.addArguments("--disable-background-networking");
  options.addArguments("--disable-sync");
  options.addArguments("--disable-default-apps");
  return options;
}

async function waitVisible(driver, locator, timeoutMs = 20000) {
  const element = await driver.wait(until.elementLocated(locator), timeoutMs);
  await driver.wait(until.elementIsVisible(element), timeoutMs);
  return element;
}

async function collectUiDiagnostics(driver) {
  try {
    return await driver.executeScript(`
      const invalidFields = Array.from(document.querySelectorAll("input:invalid, select:invalid, textarea:invalid")).map((el) => ({
        name: el.getAttribute("name") || el.getAttribute("id") || el.getAttribute("placeholder") || el.tagName,
        value: el.value || "",
        validationMessage: el.validationMessage || ""
      }));
      const errorMessages = Array.from(document.querySelectorAll(".field-assist-message.error, .inline-message.error, .confirm-password-message.mismatch"))
        .map((el) => (el.textContent || "").trim())
        .filter(Boolean)
        .slice(0, 8);
      const pickValue = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.value || "" : "";
      };
      const pickChecked = (selector) => {
        const el = document.querySelector(selector);
        return el ? Boolean(el.checked) : false;
      };
      const submitButton = Array.from(document.querySelectorAll("button")).find((btn) => (btn.textContent || "").trim() === "Registrarme");
      return {
        url: location.href,
        title: document.title,
        invalidFields,
        errorMessages,
        registerForm: {
          fullName: pickValue("input[name='fullName']"),
          email: pickValue("input[name='email']"),
          country: pickValue("input[name='country']"),
          city: pickValue("input[name='city']"),
          documentNumber: pickValue("input[name='documentNumber']"),
          phone: pickValue("input[name='phone']"),
          gender: pickValue("select[name='gender']"),
          acceptsTerms: pickChecked("input[name='acceptsTerms']"),
          acceptsMarketing: pickChecked("input[name='acceptsMarketing']"),
          submitDisabled: submitButton ? Boolean(submitButton.disabled) : null
        }
      };
    `);
  } catch {
    return null;
  }
}

async function clickByButtonText(driver, text, timeoutMs = 20000) {
  const locator = By.xpath(`//button[normalize-space(.)='${text}']`);
  const element = await waitVisible(driver, locator, timeoutMs);
  try {
    await driver.wait(until.elementIsEnabled(element), Math.min(timeoutMs, 8000));
    await element.click();
  } catch (error) {
    const currentUrl = await driver.getCurrentUrl().catch(() => "");
    const disabled = await element.getAttribute("disabled").catch(() => "");
    const uiDiagnostics = await collectUiDiagnostics(driver);
    throw new Error(
      `No se pudo hacer click en el boton "${text}". url=${currentUrl} disabled=${String(disabled)} error=${String(error?.message || error)} diagnostics=${JSON.stringify(
        uiDiagnostics
      )}`
    );
  }
}

async function setInputValue(driver, locator, value, timeoutMs = 20000) {
  const input = await waitVisible(driver, locator, timeoutMs);
  await input.click();
  await input.sendKeys(Key.chord(Key.CONTROL, "a"));
  await input.sendKeys(Key.BACK_SPACE);
  await input.sendKeys(String(value));
}

async function ensureCheckbox(driver, locator, desiredChecked) {
  const input = await waitVisible(driver, locator);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const checked = await input.isSelected().catch(() => false);
    if (Boolean(checked) === Boolean(desiredChecked)) {
      return;
    }

    await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", input).catch(() => {});

    try {
      await input.click();
    } catch {
      await driver.executeScript("arguments[0].click();", input).catch(() => {});
    }
  }

  const finalChecked = await input.isSelected().catch(() => false);
  if (Boolean(finalChecked) !== Boolean(desiredChecked)) {
    const uiDiagnostics = await collectUiDiagnostics(driver);
    throw new Error(
      `No se pudo configurar checkbox. desired=${String(desiredChecked)} actual=${String(finalChecked)} diagnostics=${JSON.stringify(
        uiDiagnostics
      )}`
    );
  }
}

async function createReservationFromBrowser(driver, token) {
  const requestKey = `selenium-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const payload = {
    eventId: EVENT_ID,
    ticketTypeId: TICKET_TYPE_ID,
    quantity: 1,
    paymentMethod: "credit_card",
    installmentCount: 1,
    isRefundablePurchase: false,
  };

  const script = `
    const token = arguments[0];
    const apiBase = arguments[1];
    const requestKey = arguments[2];
    const payload = arguments[3];
    const done = arguments[arguments.length - 1];
    fetch(apiBase + "/reservations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
        "Idempotency-Key": requestKey
      },
      body: JSON.stringify(payload)
    }).then(async (res) => {
      const json = await res.json().catch(() => null);
      done({ status: res.status, json });
    }).catch((err) => done({ status: 0, error: String(err && err.message ? err.message : err) }));
  `;

  const result = await driver.executeAsyncScript(script, token, API_BASE_URL, requestKey, payload);
  if (!result || result.status !== 201) {
    const details = result?.json ? JSON.stringify(result.json) : JSON.stringify(result);
    throw new Error(`No se pudo crear la reserva desde Selenium. Status=${result?.status}. Details=${details}`);
  }

  const reservationId = result.json?.data?.id;
  if (!reservationId) {
    throw new Error(`La API no devolvio reservationId. Details=${JSON.stringify(result.json)}`);
  }
  return Number(reservationId);
}

async function run() {
  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(buildChromeOptions())
    .build();

  try {
    const now = Date.now();
    const unique = `${now}-${Math.random().toString(16).slice(2, 8)}`;
    const email = `selenium-${unique}@crowdpass.test`;
    const password = "Selenium123!";
    const phoneDigits = String((now + Math.floor(Math.random() * 100000)) % 100000000).padStart(8, "0");
    const phone = `+519${phoneDigits}`;
    const documentNumber = `SEL${phoneDigits}`;

    await driver.get(`${FRONTEND_URL}/register`);
    try {
      await driver.wait(until.urlContains("/register"), 25000);
      await waitVisible(driver, By.css("input[name='fullName']"), 45000);
    } catch (error) {
      const currentUrl = await driver.getCurrentUrl().catch(() => "");
      const title = await driver.getTitle().catch(() => "");
      const readyState = await driver.executeScript("return document.readyState;").catch(() => "");
      const bodyText = await driver.executeScript("return (document.body && document.body.innerText) ? document.body.innerText.slice(0, 800) : '';").catch(
        () => ""
      );
      const pageSource = await driver.getPageSource().catch(() => "");
      throw new Error(
        `No cargo la pantalla de registro. url=${currentUrl} title=${title} readyState=${String(readyState)} bodyText=${JSON.stringify(
          bodyText
        )} pageSourceSnippet=${JSON.stringify(pageSource.slice(0, 1200))} original=${String(error?.message || error)}`
      );
    }
    await setInputValue(driver, By.css("input[name='fullName']"), "Selenium User");
    await setInputValue(driver, By.css("input[name='email']"), email);
    await setInputValue(driver, By.css("input[name='password']"), password);
    await setInputValue(driver, By.css("input[name='confirmPassword']"), password);
    await setInputValue(driver, By.css("input[name='country']"), "Peru");
    await setInputValue(driver, By.css("input[name='city']"), "Lima");
    await setInputValue(driver, By.css("input[name='documentNumber']"), documentNumber);
    await setInputValue(driver, By.css("input[name='phone']"), phone);
    await ensureCheckbox(driver, By.css("input[name='acceptsTerms']"), true);
    await ensureCheckbox(driver, By.css("input[name='acceptsMarketing']"), true);
    const submitButton = await waitVisible(driver, By.xpath("//button[normalize-space(.)='Registrarme']"), 25000);
    const isDisabled = await submitButton.getAttribute("disabled");
    if (isDisabled !== null) {
      const uiDiagnostics = await collectUiDiagnostics(driver);
      throw new Error(`El boton "Registrarme" sigue deshabilitado antes de hacer click. diagnostics=${JSON.stringify(uiDiagnostics)}`);
    }
    await clickByButtonText(driver, "Registrarme", 45000);

    let redirected = false;
    const redirectDeadline = Date.now() + 60000;
    while (Date.now() < redirectDeadline) {
      const currentUrl = await driver.getCurrentUrl().catch(() => "");
      if (currentUrl.includes("/my-tickets")) {
        redirected = true;
        break;
      }

      const token = await driver.executeScript("return localStorage.getItem('crowdpass_token') || '';");
      if (token) {
        await driver.get(`${FRONTEND_URL}/my-tickets`);
        await driver.wait(until.urlContains("/my-tickets"), 25000);
        redirected = true;
        break;
      }

      const uiDiagnostics = await collectUiDiagnostics(driver);
      const errorMessages = Array.isArray(uiDiagnostics?.errorMessages) ? uiDiagnostics.errorMessages : [];
      if (errorMessages.length) {
        throw new Error(`Registro no completo. url=${currentUrl} diagnostics=${JSON.stringify(uiDiagnostics)}`);
      }

      await driver.sleep(500);
    }

    if (!redirected) {
      const uiDiagnostics = await collectUiDiagnostics(driver);
      const currentUrl = await driver.getCurrentUrl().catch(() => "");
      throw new Error(`Timeout esperando post-registro. url=${currentUrl} diagnostics=${JSON.stringify(uiDiagnostics)}`);
    }

    await driver.get(`${FRONTEND_URL}/my-profile#tarjetas`);
    await waitVisible(driver, By.xpath("//h3[normalize-space(.)='Mis tarjetas']"));
    const numericInputs = await driver.findElements(By.css("#tarjetas form input[inputmode='numeric']"));
    if (numericInputs.length < 3) {
      throw new Error("No se encontraron los inputs de tarjeta (numero/mes/año) en /my-profile#tarjetas.");
    }
    await numericInputs[0].clear();
    await numericInputs[0].sendKeys("4111111111111111");
    await numericInputs[1].clear();
    await numericInputs[1].sendKeys("12");
    await numericInputs[2].clear();
    await numericInputs[2].sendKeys("2030");
    await setInputValue(
      driver,
      By.xpath("//section[@id='tarjetas']//form//label[.//text()[contains(.,'Titular')]]//input"),
      "Selenium User"
    );
    await clickByButtonText(driver, "Registrar tarjeta", 45000);
    await waitVisible(driver, By.css("#tarjetas .ticket-item-row"), 30000);

    const token = await driver.executeScript("return localStorage.getItem('crowdpass_token') || '';");
    if (!token) {
      throw new Error("No se encontro token en localStorage (crowdpass_token).");
    }

    const reservationId = await createReservationFromBrowser(driver, token);

    await driver.get(`${FRONTEND_URL}/checkout/${reservationId}`);
    await waitVisible(driver, By.xpath("//h2[normalize-space(.)='Pasarela de pagos simulada']"), 25000);
    await clickByButtonText(driver, "Confirmar pago", 45000);
    await driver.wait(until.urlContains("/my-tickets"), 25000);

    await waitVisible(driver, By.xpath("//button[contains(normalize-space(.), 'Confirmadas')]"), 25000).then((el) => el.click());
    await waitVisible(driver, By.xpath("//button[normalize-space(.)='Ver entrada']"), 25000).then((el) => el.click());
    await waitVisible(driver, By.xpath("//button[normalize-space(.)='Descargar PDF']"), 25000);

    await driver.get(`${FRONTEND_URL}/notifications`);
    await waitVisible(driver, By.xpath("//h2[normalize-space(.)='Notificaciones']"), 25000);
    await waitVisible(driver, By.css(".notification-card"), 25000);
    process.stdout.write("Selenium E2E (customer) completado OK.\n");
  } finally {
    await driver.quit();
  }
}

run().catch((error) => {
  process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
  process.exit(1);
});
