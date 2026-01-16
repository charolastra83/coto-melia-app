import { supabase } from "./supabaseClient.js";

const form = document.getElementById("registroForm");
const btnRegistro = document.getElementById("btnRegistro");
const btnBuscar = document.getElementById("btnBuscar");
const errorBox = document.getElementById("errorBox");
const tipoCasa = document.getElementById("tipoCasa");\r\nconst tenenciaSelect = document.getElementById("tenencia");
const interiorBox = document.getElementById("interiorBox");
const interiorInput = document.getElementById("interior");
const casaEncontradaBox = document.getElementById("casaEncontrada");
const formCompleto = document.getElementById("formCompleto");
const formCompletoFields = ["nombre", "apellido", "calle", "numero", "tipoCasa", "interior"];

const USUARIOS_MESA_KEY = "auth_user_id";
let casaEncontrada = null;

function setError(message) {
  errorBox.textContent = message || "";
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

function normalizarWhatsapp(valor){
  return (valor || "").replace(/\D/g, "");
}

async function getMesaUser(user) {
  const { data, error } = await supabase
    .from("usuarios_mesa")
    .select("id, vecino_id, perfil_vecino_completo")
    .eq(USUARIOS_MESA_KEY, user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function requireSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) {
    window.location.href = "./login.html";
    return null;
  }
  return data.session.user;
}

function toggleInterior() {
  const esDuplex = tipoCasa.value === "DUPLEX";
  interiorBox.classList.toggle("hidden", !esDuplex);
  if (!esDuplex) {
    interiorInput.value = "";
  }
}

tipoCasa.addEventListener("change", toggleInterior);

function setFormCompletoVisible(visible) {
  formCompleto.classList.toggle("hidden", !visible);
  for (const id of formCompletoFields) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (visible) {
      if (id !== "interior") {
        el.setAttribute("required", "required");
      }
      el.removeAttribute("disabled");
    } else {
      el.removeAttribute("required");
      el.setAttribute("disabled", "disabled");
    }
  }
}

function renderCasaEncontrada(casa) {
  if (!casa) {
    casaEncontradaBox.classList.add("hidden");
    casaEncontradaBox.textContent = "";
    return;
  }

  casaEncontradaBox.classList.remove("hidden");
  casaEncontradaBox.innerHTML = `
    <b>Casa encontrada</b><br>
    ID: ${casa.id_unico}<br>
    Nombre: ${casa.nombre || ""} ${casa.apellido || ""}<br>
    Dirección: ${casa.calle || ""} ${casa.numero || ""}${casa.interior ? " - " + casa.interior : ""}
  `;
}

btnBuscar.addEventListener("click", async () => {
  setError("");
  casaEncontrada = null;

  const whatsapp = normalizarWhatsapp(document.getElementById("whatsapp").value.trim());
  if (!whatsapp) {
    setError("Ingresa un WhatsApp válido.");
    return;
  }

  const { data, error } = await supabase
    .from("casas")
    .select("*")
    .eq("whatsapp", whatsapp)
    .maybeSingle();

  if (error) {
    setError("Error al buscar la casa.");
    return;
  }

  if (data) {
    casaEncontrada = data;
    renderCasaEncontrada(data);
    setFormCompletoVisible(false);
  } else {
    renderCasaEncontrada(null);
    setFormCompletoVisible(true);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");

  const whatsapp = normalizarWhatsapp(document.getElementById("whatsapp").value.trim());
  if (!whatsapp) {
    setError("Ingresa un WhatsApp válido.");
    return;
  }

  btnRegistro.disabled = true;

  try {
    const user = await requireSession();
    if (!user) return;

    const mesaUser = await getMesaUser(user);
    if (!mesaUser) {
      setError("Acceso denegado. Usuario no autorizado.");
      await supabase.auth.signOut();
      return;
    }

    if (mesaUser.perfil_vecino_completo) {
      window.location.href = "./home.html";
      return;
    }

    let casa = casaEncontrada;

    if (!casa) {
      const nombre = document.getElementById("nombre").value.trim();
      const apellido = document.getElementById("apellido").value.trim();
      const calle = document.getElementById("calle").value.trim();
      const numero = document.getElementById("numero").value.trim();
      const tipo = tipoCasa.value;
      const interior = interiorInput.value.trim();

      if (!nombre || !apellido || !calle || !numero || !tipo || !tenencia) {
        setError("Completa todos los campos obligatorios.");
        return;
      }

      if (tipo === "DUPLEX" && !interior) {
        setError("El interior es obligatorio para dúplex.");
        return;
      }

      if (tipo === "CASA" && interior) {
        setError("No debes capturar interior para casa.");
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

      const { data: nuevaCasa, error: insertError } = await supabase
        .from("casas")
        .insert({
          whatsapp,
          nombre,
          apellido,
          calle,
          numero,
          tipo_casa: tipo,
          interior: tipo === "DUPLEX" ? interior : null,
          id_unico: idUnico
        })
        .select("*")
        .single();

      if (insertError) {
        setError("Error al guardar el perfil de vecino.");
        return;
      }

      casa = nuevaCasa;
    }

    const { error: updateError } = await supabase
      .from("usuarios_mesa")
      .update({
        vecino_id: casa.id,
        perfil_vecino_completo: true
      })
      .eq(USUARIOS_MESA_KEY, user.id);

    if (updateError) {
      setError("Error al actualizar el usuario de mesa.");
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "./login.html";
  } catch (err) {
    setError("Error al guardar el perfil.");
  } finally {
    btnRegistro.disabled = false;
  }
});

(async () => {
  const user = await requireSession();
  if (!user) return;

  try {
    const mesaUser = await getMesaUser(user);
    if (!mesaUser) {
      setError("Acceso denegado. Usuario no autorizado.");
      await supabase.auth.signOut();
      return;
    }

    if (mesaUser.perfil_vecino_completo) {
      window.location.href = "./home.html";
    }
  } catch (err) {
    setError("Error al validar la sesión.");
  }
<<<<<<< HEAD
})();




=======
})();




>>>>>>> 6a39cf2383a1d0d4905c489df7f1c36aeb42b6ba
