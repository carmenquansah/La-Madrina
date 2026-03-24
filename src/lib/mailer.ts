import nodemailer from "nodemailer";

function getTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export type OrderEmailData = {
  orderRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderType: string;
  preferredDate?: string | null;
  notes?: string | null;
  totalCents: number;
  items: { name: string; quantity: number; unitPriceCents: number }[];
  momoNumber: string;
  momoName: string;
  momoNetwork: string;
  deliveryAddress?: string | null;
};

function formatGhs(cents: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(
    cents / 100
  );
}

function buildCustomerHtml(d: OrderEmailData): string {
  const itemRows = d.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 0;border-bottom:1px solid #f0e4e8">${i.name} ×${i.quantity}</td>
          <td style="padding:6px 0;border-bottom:1px solid #f0e4e8;text-align:right">${formatGhs(i.quantity * i.unitPriceCents)}</td>
        </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fdf6f8;font-family:Georgia,serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.07)">
    <div style="background:#190d14;padding:28px 32px;text-align:center">
      <p style="margin:0;color:#f07286;font-size:22px;letter-spacing:2px">LA MADRINA</p>
      <p style="margin:4px 0 0;color:#c9a4ae;font-size:13px">Mitchel Street, Tema</p>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 8px;color:#190d14;font-size:20px">Order received, ${d.customerName.split(" ")[0]}!</h2>
      <p style="margin:0 0 24px;color:#6b3a4a;font-size:15px">Here are the details for reference <strong>${d.orderRef}</strong>.</p>

      <table style="width:100%;border-collapse:collapse;font-size:15px;color:#3a1a26">
        ${itemRows}
        <tr>
          <td style="padding:12px 0 0;font-weight:bold;color:#190d14">Total</td>
          <td style="padding:12px 0 0;text-align:right;font-weight:bold;color:#190d14">${formatGhs(d.totalCents)}</td>
        </tr>
      </table>

      <div style="margin:28px 0;background:#fdf6f8;border-radius:8px;padding:20px;border-left:4px solid #f07286">
        <p style="margin:0 0 12px;font-weight:bold;color:#190d14;font-size:15px">How to pay</p>
        <p style="margin:0 0 6px;color:#3a1a26;font-size:14px">Send <strong>${formatGhs(d.totalCents)}</strong> via ${d.momoNetwork} MoMo to:</p>
        <p style="margin:0 0 4px;font-size:18px;font-weight:bold;color:#190d14;letter-spacing:1px">${d.momoNumber}</p>
        <p style="margin:0 0 16px;color:#6b3a4a;font-size:13px">${d.momoName}</p>
        <p style="margin:0;color:#6b3a4a;font-size:13px">After paying, WhatsApp us on <strong>${d.momoNumber}</strong> with your reference <strong>${d.orderRef}</strong> and your payment screenshot.</p>
      </div>

      <div style="font-size:14px;color:#6b3a4a;margin-bottom:24px">
        <p style="margin:0 0 4px"><strong>Order type:</strong> ${d.orderType === "pickup" ? "Pickup — Mitchel Street, Tema" : "Delivery via Yango / Uber / Bolt"}</p>
        ${d.deliveryAddress ? `<p style="margin:0 0 4px"><strong>Delivery address:</strong> ${d.deliveryAddress}</p>` : ""}
        ${d.preferredDate ? `<p style="margin:0 0 4px"><strong>Preferred date:</strong> ${d.preferredDate}</p>` : ""}
        ${d.notes ? `<p style="margin:0"><strong>Notes:</strong> ${d.notes}</p>` : ""}
      </div>

      <p style="margin:0;font-size:13px;color:#9b6a7a">You can track your order at <a href="https://lamadrina.com/track" style="color:#f07286">lamadrina.com/track</a> using your email and reference <strong>${d.orderRef}</strong>.</p>
    </div>
    <div style="padding:16px 32px;background:#fdf6f8;text-align:center">
      <p style="margin:0;font-size:12px;color:#9b6a7a">© La Madrina Bakery · Mitchel Street, Tema</p>
    </div>
  </div>
</body>
</html>`;
}

function buildOwnerHtml(d: OrderEmailData): string {
  const itemList = d.items
    .map((i) => `• ${i.name} ×${i.quantity} — ${formatGhs(i.quantity * i.unitPriceCents)}`)
    .join("<br>");

  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:480px;margin:24px auto">
  <h2 style="color:#190d14">New order — ${d.orderRef}</h2>
  <p><strong>Customer:</strong> ${d.customerName}<br>
  <strong>Email:</strong> ${d.customerEmail}<br>
  <strong>Phone:</strong> ${d.customerPhone}</p>
  <p><strong>Type:</strong> ${d.orderType === "pickup" ? "Pickup" : "Delivery (Yango / Uber / Bolt)"}<br>
  ${d.deliveryAddress ? `<strong>Delivery address:</strong> ${d.deliveryAddress}<br>` : ""}
  ${d.preferredDate ? `<strong>Preferred date:</strong> ${d.preferredDate}<br>` : ""}
  ${d.notes ? `<strong>Notes:</strong> ${d.notes}` : ""}</p>
  <p style="border-top:1px solid #eee;padding-top:12px">${itemList}</p>
  <p style="font-size:18px;font-weight:bold;color:#190d14">Total: ${formatGhs(d.totalCents)}</p>
  <p>Log in to confirm payment once you receive it:<br>
  <a href="${process.env.APP_URL ?? "http://localhost:3000"}/admin/orders">Admin → Orders</a></p>
</body>
</html>`;
}

export async function sendOrderEmails(data: OrderEmailData): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    console.info("[mailer] GMAIL_USER / GMAIL_APP_PASSWORD not set — skipping email");
    return;
  }

  const from = `"La Madrina Bakery" <${process.env.GMAIL_USER}>`;
  const notifyEmail = process.env.NOTIFY_EMAIL || process.env.GMAIL_USER!;

  await Promise.allSettled([
    transport.sendMail({
      from,
      to: data.customerEmail,
      subject: `Order received — ${data.orderRef} | La Madrina`,
      html: buildCustomerHtml(data),
    }),
    transport.sendMail({
      from,
      to: notifyEmail,
      subject: `New order ${data.orderRef} — ${data.customerName} (${data.orderType})`,
      html: buildOwnerHtml(data),
    }),
  ]);
}
