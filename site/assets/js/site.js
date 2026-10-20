/* The website's only script: the menu, the live preview in the hero, and a
 * contact form that actually sends.
 *
 * The old form waited one second, said "Message Sent!" and threw the message
 * away (audit/AUDIT.md). This one posts to /api/contact, and if that fails for
 * ANY reason it opens WhatsApp with the message already typed — the customer
 * is told which happened, and nothing is silently lost.
 */

const WA = "27789356433";

/* menu */
const btn = document.querySelector(".menu-btn"), nav = document.getElementById("nav");
btn?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  btn.setAttribute("aria-expanded", String(open));
});
nav?.addEventListener("click", (e) => { if (e.target.closest("a")) { nav.classList.remove("open"); btn?.setAttribute("aria-expanded", "false"); } });

/* hero: the Studio's own garment renderer, not a stock photo */
const stage = document.getElementById("heroProof");
if (stage) {
  const { garmentSvg } = await import("/studio/js/render/garment.js");
  const mark = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 320">
      <g transform="translate(190 118)"><circle r="84" fill="none" stroke="#COL" stroke-width="10"/>
        <circle cx="-26" cy="-22" r="22" fill="#00A0E3"/><circle cx="26" cy="-22" r="22" fill="#E5007E"/>
        <circle cx="-26" cy="26" r="22" fill="#FFE500"/><circle cx="26" cy="26" r="22" fill="#COL"/></g>
      <text x="190" y="290" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-weight="900" font-size="52" fill="#COL" letter-spacing="1">YOUR LOGO</text></svg>`);
  const colours = [["#1C2541", "Navy"], ["#FFFFFF", "White"], ["#111111", "Black"], ["#B3202A", "Red"], ["#1E5631", "Bottle green"], ["#F2B705", "Gold"]];
  const light = (hex) => parseInt(hex.slice(1, 3), 16) * 0.3 + parseInt(hex.slice(3, 5), 16) * 0.59 + parseInt(hex.slice(5, 7), 16) * 0.11 > 150;
  const draw = (hex) => {
    const ink = light(hex) ? "%2314161A" : "%23FFFFFF";
    stage.innerHTML = garmentSvg({
      fit: "polo", colour: hex, view: "front", widthMm: 520, id: "hero", seed: 31,
      areas: [{ surfaceId: "chest-left", wMm: 95, hMm: 80, tex: mark.replaceAll("%23COL", ink) }],
    });
  };
  const sw = document.getElementById("heroSwatches");
  sw.innerHTML = colours.map(([h, n], i) => `<button style="background:${h}" aria-label="${n}" title="${n}" aria-pressed="${i === 0}" data-c="${h}"></button>`).join("");
  sw.addEventListener("click", (e) => {
    const b = e.target.closest("[data-c]"); if (!b) return;
    sw.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    draw(b.dataset.c);
  });
  draw(colours[0][0]);
}

/* contact form */
const form = document.getElementById("enquiry");
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("formStatus");
  const say = (cls, html) => { status.className = "form-status " + cls; status.innerHTML = html; status.hidden = false; };
  const d = Object.fromEntries(new FormData(form));
  if (!d.name?.trim() || !d.phone?.trim() || !d.message?.trim()) return say("bad", "Please add your name, a number we can reach you on, and what you need.");

  const text = `Hi Eminence, this is ${d.name.trim()} (${d.phone.trim()}${d.email ? ", " + d.email.trim() : ""}).\n${d.topic}: ${d.message.trim()}`;
  const waUrl = `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
  const submit = form.querySelector("[type=submit]");
  submit.disabled = true; submit.textContent = "Sending…";
  // On failure we show a WhatsApp link rather than opening a window, because a
  // window opened after an await is blocked as a pop-up.
  let ok = false;
  try {
    const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
    ok = r.ok;
  } catch { ok = false; }
  submit.disabled = false; submit.textContent = "Send enquiry";
  if (ok) {
    form.reset();
    say("ok", "Thanks — your enquiry is in our inbox. We usually reply on WhatsApp.");
  } else {
    say("bad", `Our inbox didn't accept that just now, so nothing was sent. <a href="${waUrl}" target="_blank" rel="noopener"><b>Send it on WhatsApp instead</b></a> — your message is already typed.`);
  }
});
