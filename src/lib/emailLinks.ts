// Links that open a pre-filled email in the customer's chosen email service (workshop enquiry form).
// Phones: the provider's app if it is installed, otherwise its website.
// Laptops: Gmail, Outlook.com and Yahoo open their website; "email app on this computer" uses a mailto: link.
// Nothing is sent by the website: the customer presses send in their email.

export type Mail = { to: string; subject: string; body: string };
export type Provider = "gmail" | "outlook" | "yahoo";
export type Device = "ios" | "android" | "desktop";

export const PROVIDERS: { id: Provider; label: string; hint: string }[] = [
  { id: "gmail", label: "Gmail", hint: "Gmail or Google Workspace" },
  { id: "outlook", label: "Outlook or Hotmail", hint: "Outlook.com, Hotmail or Live" },
  { id: "yahoo", label: "Yahoo Mail", hint: "Yahoo or Ymail" },
];

// iPads report a Mac user agent, so a touch screen on "Macintosh" counts as iOS.
export function deviceOf(userAgent: string, maxTouchPoints = 0): Device {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && maxTouchPoints > 1)) return "ios";
  return "desktop";
}

// Email links use CRLF line breaks (RFC 6068); Outlook on the web needs them to keep the lines apart.
const enc = (value: string) => encodeURIComponent(value.replace(/\r?\n/g, "\r\n"));

export function mailtoLink(mail: Mail) {
  return "mailto:" + mail.to + "?subject=" + enc(mail.subject) + "&body=" + enc(mail.body);
}

// The provider's website, opening a new message with everything filled in.
export function webLink(provider: Provider, mail: Mail) {
  const to = encodeURIComponent(mail.to);
  if (provider === "gmail")
    return "https://mail.google.com/mail/?view=cm&fs=1&to=" + to + "&su=" + enc(mail.subject) + "&body=" + enc(mail.body);
  if (provider === "outlook")
    return "https://outlook.live.com/mail/0/deeplink/compose?to=" + to + "&subject=" + enc(mail.subject) + "&body=" + enc(mail.body);
  return "https://compose.mail.yahoo.com/?to=" + to + "&subject=" + enc(mail.subject) + "&body=" + enc(mail.body);
}

const IOS_SCHEME: Record<Provider, string> = {
  gmail: "googlegmail://co?to=",
  outlook: "ms-outlook://compose?to=",
  yahoo: "ymail://mail/compose?to=",
};

const ANDROID_PACKAGE: Record<Provider, string> = {
  gmail: "com.google.android.gm",
  outlook: "com.microsoft.office.outlook",
  yahoo: "com.yahoo.mobile.client.android.mail",
};

// The provider's phone app. On Android the link names the app and carries the website as a fallback, so Chrome
// opens the website itself when the app isn't installed. iPhones have no such fallback; the page falls back
// to the website when the app doesn't open (see openInProvider).
export function appLink(provider: Provider, mail: Mail, device: Device) {
  if (device === "android") {
    return (
      "intent:" + mail.to + "?subject=" + enc(mail.subject) + "&body=" + enc(mail.body) +
      "#Intent;scheme=mailto;package=" + ANDROID_PACKAGE[provider] +
      ";S.browser_fallback_url=" + encodeURIComponent(webLink(provider, mail)) + ";end"
    );
  }
  if (device === "ios") {
    return IOS_SCHEME[provider] + encodeURIComponent(mail.to) + "&subject=" + enc(mail.subject) + "&body=" + enc(mail.body);
  }
  return webLink(provider, mail);
}

// Runs onNothing if the page is still in front after `wait` ms, which means no app took over.
function unlessAppOpens(wait: number, onNothing: () => void) {
  let left = false;
  const mark = () => {
    left = true;
  };
  const visibility = () => {
    if (document.visibilityState === "hidden") left = true;
  };
  window.addEventListener("blur", mark);
  window.addEventListener("pagehide", mark);
  document.addEventListener("visibilitychange", visibility);
  window.setTimeout(() => {
    window.removeEventListener("blur", mark);
    window.removeEventListener("pagehide", mark);
    document.removeEventListener("visibilitychange", visibility);
    if (!left && document.visibilityState === "visible") onNothing();
  }, wait);
}

// Opens the chosen provider: the app on a phone (website if the app isn't there), the website on a laptop.
export function openInProvider(provider: Provider, mail: Mail, device: Device) {
  if (device === "desktop") {
    // window.open with "noopener" always returns null, so the opener link is cut by hand instead.
    const tab = window.open(webLink(provider, mail), "_blank");
    if (tab) tab.opener = null;
    else window.location.href = webLink(provider, mail); // pop-up blocked: open it here instead
    return;
  }
  window.location.href = appLink(provider, mail, device);
  if (device === "ios") unlessAppOpens(1600, () => (window.location.href = webLink(provider, mail)));
}

// Opens the device's own email app. If nothing opens within 2 seconds (common on laptops with no mail app set up),
// onNoApp runs so the page can offer the email websites instead; otherwise onApp runs.
export function openMailApp(mail: Mail, onNoApp: () => void, onApp: () => void) {
  let none = false;
  window.location.href = mailtoLink(mail);
  unlessAppOpens(2000, () => {
    none = true;
    onNoApp();
  });
  window.setTimeout(() => {
    if (!none) onApp();
  }, 2050);
}
