// ====== KONFIGURASI JSONBIN ======
const BIN_ID = "68fde8f743b1c97be981dc38";
const API_KEY = "$2a$10$4UbVC59lWot/ifJrSz8Kget1iXAPeK2LGA3w0/jSF3iwYO2UleRla";
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// ====== ELEMENT HTML ======
const usernameEl = document.getElementById("username");
const useridEl = document.getElementById("userid");
const saldoEl = document.getElementById("saldoValue");
const bekuEl = document.getElementById("bekuValue");
const txList = document.getElementById("txList");
const modalRoot = document.getElementById("modalRoot");

// ====== UTILITY ======
async function getData() {
  const r = await fetch(BASE_URL, { headers: { "X-Master-Key": API_KEY } });
  const j = await r.json();
  return j.record;
}

async function updateData(payload) {
  await fetch(BASE_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": API_KEY,
    },
    body: JSON.stringify(payload),
  });
}

const fmt = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function modal({ title, html, onOk, ok = "OK", cancel = "Batal" }) {
  modalRoot.innerHTML = `
    <div class='modal-overlay'>
      <div class='modal'>
        <h3>${title}</h3>
        <div>${html}</div>
        <div class='modal-actions'>
          <button class='btn-cancel'>${cancel}</button>
          <button class='btn-primary'>${ok}</button>
        </div>
      </div>
    </div>`;
  const o = modalRoot.querySelector(".modal-overlay");
  o.querySelector(".btn-cancel").onclick = () => o.remove();
  o.querySelector(".btn-primary").onclick = () => onOk && onOk(o);
}

// ====== LOAD DASHBOARD ======
async function load() {
  const session = JSON.parse(localStorage.getItem("currentUser"));
  if (!session) {
    alert("Silakan login terlebih dahulu.");
    location.href = "index.html";
    return;
  }

  const data = await getData();
  const user = data.users.find((u) => u.id === session.id);
  if (!user) {
    alert("Data pengguna tidak ditemukan.");
    location.href = "index.html";
    return;
  }

  usernameEl.textContent = user.username || user.nama;
  useridEl.textContent = "ID: " + user.id;
  saldoEl.textContent = fmt(user.saldo);
  bekuEl.textContent = fmt(user.beku);

  const txs = (data.transactions || [])
    .filter((t) => t.userId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  renderTx(txs);
}

// ====== RENDER TRANSAKSI ======
function renderTx(list) {
  if (!list.length) {
    txList.innerHTML =
      "<div class='tx-item'><div class='tx-meta'>Belum ada transaksi.</div></div>";
    return;
  }
  txList.innerHTML = "";
  list.forEach((t) => {
    txList.innerHTML += `
      <div class='tx-item'>
        <div style='display:flex;align-items:center;gap:10px'>
          <div class='tx-type'>${t.type[0].toUpperCase()}</div>
          <div class='tx-meta'>
            <div>${t.type}</div>
            <div>${new Date(t.createdAt).toLocaleString()}</div>
            <div>Status: ${t.status}</div>
            ${
              t.rekening_tujuan
                ? `<div style='font-size:.8rem;color:#bbb;'>Rek: ${t.rekening_tujuan}</div>`
                : ""
            }
          </div>
        </div>
        <div class='tx-amount'>${fmt(t.amount)}</div>
      </div>`;
  });
}

// ====== FITUR ISI ULANG ======
document.getElementById("btn-topup").onclick = async () => {
  const data = await getData();
  const adm = data.admin?.rekening_admin;
  const session = JSON.parse(localStorage.getItem("currentUser"));
  const user = data.users.find((u) => u.id === session.id);

  if (!adm) {
    alert("Rekening admin belum diset oleh admin.");
    return;
  }

  // Langkah 1: Input nominal
  modal({
    title: "Isi Ulang Saldo",
    html: `
      <label>Masukkan jumlah isi ulang (Rp)</label>
      <input id='topupAmount' type='number' placeholder='50000'>
    `,
    ok: "Lanjutkan",
    onOk: (m1) => {
      const nominal = Number(document.getElementById("topupAmount").value);
      if (!nominal || nominal < 1000) {
        alert("Nominal isi ulang tidak valid.");
        return;
      }

      // Langkah 2: tampilkan rekening admin
      modal({
        title: "Transfer Pembayaran",
        html: `
          Silakan transfer sebesar <b>${fmt(nominal)}</b> ke rekening berikut:<br><br>
          <b>${adm.bank}</b><br>
          No: <b>${adm.nomor}</b><br>
          A/N: ${adm.atas_nama}<br><br>
          Setelah transfer, saldo akan masuk setelah diverifikasi admin.
        `,
        ok: "Saya Sudah Transfer",
        onOk: async (m2) => {
          const newTx = {
            id: "TX" + Date.now(),
            userId: user.id,
            type: "topup",
            amount: nominal,
            status: "pending",
            createdAt: new Date().toISOString(),
          };
          data.transactions.push(newTx);
          await updateData(data);
          alert("Permintaan isi ulang dikirim. Menunggu verifikasi admin.");
          m1.remove();
          m2.remove();
          load();
        },
      });
    },
  });
};

// ====== FITUR PENARIKAN ======
document.getElementById("btn-withdraw").onclick = async () => {
  const data = await getData();
  const session = JSON.parse(localStorage.getItem("currentUser"));
  const uidx = data.users.findIndex((u) => u.id === session.id);
  if (uidx === -1) return alert("User tidak ditemukan.");
  const u = data.users[uidx];

  modal({
    title: "Penarikan Dana",
    html: `
      <label>Nominal (Rp)</label>
      <input id='nom' type='number' placeholder='50000'>
      <label>Rekening Tujuan</label>
      <select id='opt'>
        <option value='terdaftar'>Gunakan Rekening Terdaftar (${u.bank} - ${u.rekening})</option>
        <option value='lain'>Gunakan Rekening Lain</option>
      </select>
      <div id='rekLain'></div>
    `,
    onOk: async (o) => {
      const n = Number(document.getElementById("nom").value);
      const opt = document.getElementById("opt").value;

      if (opt === "lain" && !document.getElementById("rekLainInput")) {
        const div = document.getElementById("rekLain");
        div.innerHTML = `
          <label>Masukkan Rekening Lain (misal: BRI - 123456 a/n Nama)</label>
          <input id='rekLainInput' type='text'>
        `;
        return;
      }

      if (!n || n < 1000) return alert("Nominal tidak valid.");
      if (u.saldo < n) return alert("Saldo tidak mencukupi.");

      let rekening_tujuan = `${u.bank} - ${u.rekening}`;
      if (opt === "lain") {
        const rekLain = document.getElementById("rekLainInput")?.value.trim();
        if (!rekLain) return alert("Mohon isi rekening tujuan lain.");
        rekening_tujuan = rekLain;
      }

      data.transactions.push({
        id: "TX" + Date.now(),
        userId: u.id,
        type: "withdraw",
        amount: n,
        rekening_tujuan,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      u.saldo -= n;
      u.beku += n;

      await updateData(data);
      alert("Permintaan penarikan berhasil dikirim dan sedang diproses.");
      o.remove();
      load();
    },
  });
};

// ====== FITUR TAMBAHAN ======
document.getElementById("svc-history").onclick = () =>
  window.scrollTo({ top: 500, behavior: "smooth" });

document.getElementById("svc-withdraws").onclick = async () => {
  const data = await getData();
  const s = JSON.parse(localStorage.getItem("currentUser"));
  const list = (data.transactions || []).filter(
    (t) => t.userId === s.id && t.type === "withdraw"
  );
  modal({
    title: "Catatan Penarikan",
    html: list.length
      ? list
          .map(
            (t) =>
              `<div>${fmt(t.amount)} - ${t.status}${
                t.rekening_tujuan
                  ? `<br><small>Rek: ${t.rekening_tujuan}</small>`
                  : ""
              }</div>`
          )
          .join("")
      : "Belum ada catatan penarikan.",
    onOk: (o) => o.remove(),
    ok: "Tutup",
  });
};

document.getElementById("svc-guide").onclick = () =>
  modal({
    title: "Panduan",
    html: `
      <b>Cara Isi Ulang:</b><br>
      1. Klik tombol Isi Ulang.<br>
      2. Masukkan jumlah top-up dan transfer ke rekening admin.<br>
      3. Tunggu verifikasi saldo oleh admin.<br><br>
      <b>Cara Penarikan:</b><br>
      1. Klik tombol Penarikan.<br>
      2. Masukkan nominal & rekening tujuan.<br>
      3. Permintaan akan diproses admin.<br><br>
      Gunakan fitur Sejarah untuk melihat semua transaksi.
    `,
    onOk: (o) => o.remove(),
    ok: "Tutup",
  });

document.getElementById("svc-invest").onclick = () =>
  modal({
    title: "Investasi",
    html: "Fitur ini <b>Coming Soon</b>.",
    onOk: (o) => o.remove(),
    ok: "Tutup",
  });

document.getElementById("svc-logout").onclick = () =>
  modal({
    title: "Logout",
    html: "Apakah Anda yakin ingin keluar?",
    onOk: (o) => {
      localStorage.removeItem("currentUser");
      location.href = "index.html";
    },
  });

// ====== INIT ======
window.addEventListener("DOMContentLoaded", load);
