import { supabase } from "./supabaseClient.js";

const loginForm = document.getElementById("loginForm");
const registroForm = document.getElementById("registroForm");
const registroBox = document.getElementById("registroBox");
const btnLogin = document.getElementById("btnLogin");
const btnRegistro = document.getElementById("btnRegistro");
const errorBox = document.getElementById("errorBox");
const rolSelect = document.getElementById("rol");
const whatsappInput = document.getElementById("whatsapp");
const tipoCasa = document.getElementById("tipoCasa");
const tenenciaSelect = document.getElementById("tenencia");
const interiorBox = document.getElementById("interiorBox");
const interiorInput = document.getElementById("interior");

const MESA_SESSION_KEY = "mesa_session";

function setError(message) {
  errorBox.textContent = message || "";
}

function normalizarWhatsapp(valor){
  return (valor || "").replace(/\D/g, "");
}

function normalizarTexto(valor){
  return (valor || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function generarIdUnico(calle, numero, tipo, interior){
  const base = `${normalizarTexto(calle)}-${normalizarTexto(numero)}`;
  if (tipo === "DUPLEX") {
    return `${base}-${normalizarTexto(interior)}`;
  }
  return base;
}

function guardarSesion(rol, whatsapp) {
  localStorage.setItem(MESA_SESSION_KEY, JSON.stringify({ rol, whatsapp }));
}

function toggleInterior() {
  const esDuplex = tipoCasa.value === "DUPLEX";
  interiorBox.classList.toggle("hidden", !esDuplex);
  if (!esDuplex) {
    interiorInput.value = "";
  }
}

tipoCasa.addEventListener("change", toggleInterior);

function setRegistroVisible(visible) {
  registroBox.classList.toggle("hidden", !visible);
}

async function buscarCasaPorWhatsapp(whatsapp) {
  const { data, error } = await supabase
    .from("casas")
    .select("*")
    .eq("whatsapp", whatsapp)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function obtenerUsuarioMesa(rol, vecinoId) {
  const { data, error } = await supabase
    .from("usuarios_mesa")
    .select("id")
    .eq("rol", rol)
    .eq("vecino_id", vecinoId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function crearUsuarioMesa(rol, vecinoId) {
  const existente = await obtenerUsuarioMesa(rol, vecinoId);
  if (existente) return existente;

  const { data, error } = await supabase
    .from("usuarios_mesa")
    .insert({
      rol,
      vecino_id: vecinoId,
      perfil_vecino_completo: true
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");

  const rol = rolSelect.value;
  const whatsapp = normalizarWhatsapp(whatsappInput.value.trim());

  if (!rol) {
    setError("Selecciona un rol.");
    return;
  }

  if (!whatsapp) {
    setError("Ingresa un WhatsApp valido.");
    return;
  }

  btnLogin.disabled = true;

  try {
    const casa = await buscarCasaPorWhatsapp(whatsapp);
    if (casa) {
      const usuarioMesa = await obtenerUsuarioMesa(rol, casa.id);
      if (!usuarioMesa) {
        setError("Usuario no autorizado. Solicita alta al admin.");
        return;
      }
      guardarSesion(rol, whatsapp);
      window.location.href = "./home.html";
      return;
    }

    setRegistroVisible(true);
  } catch (err) {
    setError("Error al validar el WhatsApp.");
  } finally {
    btnLogin.disabled = false;
  }
});

registroForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");

  const rol = rolSelect.value;
  const whatsapp = normalizarWhatsapp(whatsappInput.value.trim());
  const nombre = document.getElementById("nombre").value.trim();
  const apellido = document.getElementById("apellido").value.trim();
  const calle = document.getElementById("calle").value.trim();
  const numero = document.getElementById("numero").value.trim();
  const tipo = tipoCasa.value;
  const tenencia = tenenciaSelect.value;
  const interior = interiorInput.value.trim();

  if (!rol) {
    setError("Selecciona un rol.");
    return;
  }

  if (!whatsapp) {
    setError("Ingresa un WhatsApp valido.");
    return;
  }

  if (!nombre || !apellido || !calle || !numero || !tipo || !tenencia) {
    setError("Completa todos los campos obligatorios.");
    return;
  }

  if (tipo === "DUPLEX" && !interior) {
    setError("El interior es obligatorio para duplex.");
    return;
  }

  if (tipo === "CASA" && interior) {
    setError("No debes capturar interior para casa.");
    return;
  }

  btnRegistro.disabled = true;

  try {
    const existente = await buscarCasaPorWhatsapp(whatsapp);
    if (existente) {
      const usuarioMesa = await obtenerUsuarioMesa(rol, existente.id);
      if (!usuarioMesa) {
        setError("Usuario no autorizado. Solicita alta al admin.");
        return;
      }
      guardarSesion(rol, whatsapp);
      window.location.href = "./home.html";
      return;
    }

    const idUnico = generarIdUnico(calle, numero, tipo, interior);

    const { data: existeId, error: errorId } = await supabase
      .from("casas")
      .select("id")
      .eq("id_unico", idUnico)
      .maybeSingle();

    if (errorId) {
      setError("Error al validar el domicilio.");
      return;
    }

    if (existeId) {
      setError("Ya existe una casa con ese domicilio.");
      return;
    }

    const { error: insertError } = await supabase
      .from("casas")
      .insert({
        whatsapp,
        nombre,
        apellido,
        calle,
        numero,
        tipo_casa: tipo,
        tenencia,
        interior: tipo === "DUPLEX" ? interior : null,
        id_unico: idUnico
      });

    if (insertError) {
      setError("Error al guardar el perfil de vecino.");
      return;
    }

    await crearUsuarioMesa(rol, nuevaCasa.id);
    guardarSesion(rol, whatsapp);
    window.location.href = "./home.html";
  } catch (err) {
    setError("Error al guardar el perfil.");
  } finally {
    btnRegistro.disabled = false;
  }
});

(() => {
  const raw = localStorage.getItem(MESA_SESSION_KEY);
  if (!raw) return;
  window.location.href = "./home.html";
})();
<<<<<<< HEAD

=======

>>>>>>> 6a39cf2383a1d0d4905c489df7f1c36aeb42b6ba
