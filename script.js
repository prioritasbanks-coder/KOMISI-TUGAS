/* ==========================
   Konfigurasi JSONBin
========================== */
const BIN_ID = "68fde8f743b1c97be981dc38"; // BIN ID demo user data
const API_KEY = "$2a$10$4UbVC59lWot/ifJrSz8Kget1iXAPeK2LGA3w0/jSF3iwYO2UleRla";
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

/* ==========================
   Fungsi Bantu
========================== */
async function getData() {
  const res = await fetch(BIN_URL, {
    headers: { "X-Master-Key": API_KEY },
  });
  const json = await res.json();
  return json.record || { users: [], transactions: [], admin: {} };
}

async function updateData(newData) {
  await fetch(BIN_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": API_KEY,
    },
    body: JSON.stringify(newData),
  });
}

/* ==========================
   LOGIN & REGISTER
========================== */
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (!loginForm || !registerForm) return;

  // === REGISTER ===
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("regUsername").value.trim();
    const nama = document.getElementById("regNama").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const whatsapp = document.getElementById("regWhatsapp").value.trim();
    const bank = document.getElementById("regBank").value.trim();
    const rekening = document.getElementById("regRek").value.trim();
    const pass = document.getElementById("regPass").value.trim();
    const confirm = document.getElementById("regConfirm").value.trim();

    if (pass !== confirm) return alert("Kata sandi tidak cocok!");
    if (pass.length < 6) return alert("Kata sandi minimal 6 karakter!");

    try {
      const data = await getData();

      // cek username sudah ada
      if (data.users.some((u) => u.username === username)) {
        return alert("Username sudah terdaftar!");
      }

      const newUser = {
        id: "USR" + Date.now(),
        username,
        nama,
        email,
        whatsapp,
        bank,
        rekening,
        password: pass,
        saldo: 0,
        level: 1,
        registered: new Date().toISOString(),
      };

      data.users.push(newUser);
      await updateData(data);

      alert("Pendaftaran berhasil! Silakan login.");
      registerForm.reset();
      // tampilkan form login
      registerForm.classList.remove("active");
      registerForm.classList.add("hidden");
      loginForm.classList.remove("hidden");
      loginForm.classList.add("active");
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mendaftar.");
    }
  });

  // === LOGIN ===
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userInput = document.getElementById("loginUser").value.trim();
    const pass = document.getElementById("loginPass").value.trim();

    try {
      const data = await getData();
      const user = data.users.find(
        (u) =>
          (u.username === userInput ||
            u.email === userInput ||
            u.whatsapp === userInput) &&
          u.password === pass
      );

      if (!user) return alert("Username atau kata sandi salah!");

      // simpan sesi user ke localStorage
      localStorage.setItem("currentUser", JSON.stringify(user));

      alert(`Selamat datang, ${user.nama}!`);
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      alert("Gagal login. Coba lagi nanti.");
    }
  });
});
